"""Pipeline 异步执行器 — asyncio 驱动 6 步编排 + SSE 事件推送。"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import uuid
from datetime import datetime
from typing import Any, Callable, Awaitable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.models.db_models import (
    Character,
    Episode,
    GenerationTask,
    PipelineRun,
    Scene,
    Script,
    ScriptBlock,
    StoryboardShot,
    TimelineClip,
)
from app.services import pipeline_service, video_service
from app.utils.character_fields import normalize_age
from app.utils.video_prompt import build_video_prompt, is_content_policy_error

logger = logging.getLogger(__name__)

SKILL_CONFIGS: dict[str, dict] = {
    "jp-school": {
        "prompt": "日式校园漫剧风格，对话简洁有力，情绪表达夸张，注重青春感和悬疑氛围",
        "provider": "mimo",
    },
    "urban": {"prompt": "都市逆袭短剧，节奏紧凑，反转密集，注重爽感", "provider": "mimo"},
    "xianxia": {"prompt": "古风仙侠漫剧，意境深远，画面唯美", "provider": "mimo"},
    "suspense": {"prompt": "悬疑惊悚短剧，氛围压抑，节奏紧张", "provider": "mimo"},
    "sweet-romance": {"prompt": "甜宠恋爱漫剧，温馨甜蜜", "provider": "mimo"},
    "scifi": {"prompt": "科幻冒险漫剧，世界观宏大", "provider": "mimo"},
    "workplace": {"prompt": "职场励志短剧，真实接地气", "provider": "mimo"},
}

STEP_LABELS = ["剧本", "角色", "分镜", "视频", "配音", "合成"]

_pipeline_queues: dict[str, asyncio.Queue] = {}
_resume_events: dict[str, asyncio.Event] = {}
_active_tasks: dict[str, asyncio.Task] = {}
_runtime_state: dict[str, dict] = {}


def _default_steps() -> list[dict]:
    ids = ["script", "character", "storyboard", "video", "audio", "compose"]
    return [
        {"id": sid, "label": STEP_LABELS[i], "status": "waiting", "progress": 0, "data": None}
        for i, sid in enumerate(ids)
    ]


def get_runtime_pipeline(pipeline_id: str) -> dict | None:
    return _runtime_state.get(pipeline_id)


def get_event_queue(pipeline_id: str) -> asyncio.Queue | None:
    return _pipeline_queues.get(pipeline_id)


async def emit_event(pipeline_id: str, event: dict) -> None:
    event.setdefault("timestamp", datetime.now().isoformat())
    event.setdefault("pipeline_id", pipeline_id)
    if pipeline_id in _runtime_state:
        _runtime_state[pipeline_id]["last_event"] = event
    queue = _pipeline_queues.get(pipeline_id)
    if queue:
        await queue.put(event)


def _task_is_active(pipeline_id: str) -> bool:
    task = _active_tasks.get(pipeline_id)
    return task is not None and not task.done()


async def ensure_pipeline_task_running(pipeline_id: str) -> None:
    """后端重启或 SSE 重连后，恢复仍在 running 但无活跃 task 的 Pipeline。"""
    state = _runtime_state.get(pipeline_id)
    if not state:
        return
    if state.get("status") != "running" or state.get("waiting_confirmation"):
        return
    if _task_is_active(pipeline_id):
        return

    if pipeline_id not in _pipeline_queues:
        _pipeline_queues[pipeline_id] = asyncio.Queue()
    if pipeline_id not in _resume_events:
        _resume_events[pipeline_id] = asyncio.Event()
        _resume_events[pipeline_id].set()

    start_step = state.get("current_step", 0)
    steps = state.get("steps") or []
    if 0 <= start_step < len(steps) and steps[start_step].get("status") != "done":
        steps[start_step]["status"] = "running"

    logger.info("[Pipeline] 恢复执行任务 %s，从步骤 %s 继续", pipeline_id, start_step)
    task = asyncio.create_task(_execute_pipeline(pipeline_id, start_step=start_step))
    _active_tasks[pipeline_id] = task


async def _run_with_heartbeat(
    pipeline_id: str,
    step: int,
    label: str,
    coro_factory: Callable[[], Awaitable[Any]],
) -> Any:
    """长耗时步骤（LLM/生图）期间定期推送进度，避免 UI 长时间停在 0%。"""
    stop = asyncio.Event()

    async def heartbeat() -> None:
        progress = 8
        while not stop.is_set():
            await emit_event(
                pipeline_id,
                {
                    "type": "step_progress",
                    "step": step,
                    "progress": progress,
                    "message": f"{label}（AI 处理中…）",
                },
            )
            progress = min(progress + 4, 45)
            try:
                await asyncio.wait_for(stop.wait(), timeout=12.0)
                break
            except asyncio.TimeoutError:
                continue

    hb = asyncio.create_task(heartbeat())
    try:
        return await coro_factory()
    finally:
        stop.set()
        hb.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await hb


def resolve_skill_config(skill_id: str) -> dict:
    return SKILL_CONFIGS.get(skill_id, SKILL_CONFIGS["jp-school"])


async def start_pipeline_execution(
    pipeline_id: str,
    project_id: str,
    mode: str,
    creative_input: str,
    structured_data: dict | None,
    skill_id: str,
) -> None:
    """启动后台 Pipeline 任务。"""
    if pipeline_id in _active_tasks and not _active_tasks[pipeline_id].done():
        return

    _pipeline_queues[pipeline_id] = asyncio.Queue()
    _resume_events[pipeline_id] = asyncio.Event()
    _resume_events[pipeline_id].set()

    steps = _default_steps()
    _runtime_state[pipeline_id] = {
        "id": pipeline_id,
        "project_id": project_id,
        "mode": mode,
        "status": "running",
        "current_step": 0,
        "creative_input": creative_input,
        "structured_data": structured_data or {},
        "skill_id": skill_id,
        "steps": steps,
        "error": None,
        "waiting_confirmation": False,
        "created_at": datetime.now().isoformat(),
    }

    task = asyncio.create_task(_execute_pipeline(pipeline_id))
    _active_tasks[pipeline_id] = task


async def resume_pipeline_execution(pipeline_id: str) -> None:
    if pipeline_id in _resume_events:
        _runtime_state[pipeline_id]["waiting_confirmation"] = False
        _runtime_state[pipeline_id]["status"] = "running"
        _resume_events[pipeline_id].set()
    async with async_session() as db:
        run = await db.get(PipelineRun, pipeline_id)
        if run:
            run.waiting_confirmation = False
            run.status = "running"
            await db.commit()


async def retry_pipeline_step(pipeline_id: str, step_index: int) -> None:
    state = _runtime_state.get(pipeline_id)
    if not state:
        return
    state["error"] = None
    state["status"] = "running"
    state["current_step"] = step_index
    steps = state["steps"]
    if 0 <= step_index < len(steps):
        steps[step_index]["status"] = "running"
        steps[step_index]["progress"] = 0
        steps[step_index]["error"] = None
    if pipeline_id in _active_tasks and not _active_tasks[pipeline_id].done():
        return
    if pipeline_id not in _resume_events:
        _resume_events[pipeline_id] = asyncio.Event()
        _resume_events[pipeline_id].set()
    if pipeline_id not in _pipeline_queues:
        _pipeline_queues[pipeline_id] = asyncio.Queue()
    task = asyncio.create_task(_execute_pipeline(pipeline_id, start_step=step_index))
    _active_tasks[pipeline_id] = task


async def skip_pipeline_step(pipeline_id: str, step_index: int) -> None:
    state = _runtime_state.get(pipeline_id)
    if not state:
        return
    steps = state["steps"]
    if 0 <= step_index < len(steps):
        steps[step_index]["status"] = "skipped"
        steps[step_index]["progress"] = 100
    state["current_step"] = step_index + 1
    state["error"] = None
    state["status"] = "running"
    if pipeline_id in _resume_events:
        _resume_events[pipeline_id].set()
    await _persist_run(pipeline_id)
    if step_index >= 5:
        await _complete_pipeline(pipeline_id)
        return
    if pipeline_id in _active_tasks and not _active_tasks[pipeline_id].done():
        return
    task = asyncio.create_task(_execute_pipeline(pipeline_id, start_step=step_index + 1))
    _active_tasks[pipeline_id] = task


async def load_pipeline_from_db(pipeline_id: str, db: AsyncSession) -> dict | None:
    run = await db.get(PipelineRun, pipeline_id)
    if not run:
        return None
    state = {
        "id": run.id,
        "project_id": run.project_id,
        "mode": run.mode,
        "status": run.status,
        "current_step": run.current_step,
        "creative_input": run.creative_input or "",
        "structured_data": run.structured_data or {},
        "skill_id": run.skill_id or "jp-school",
        "steps": run.steps_json or _default_steps(),
        "error": run.error_json,
        "waiting_confirmation": run.waiting_confirmation,
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }
    _runtime_state[pipeline_id] = state
    if pipeline_id not in _pipeline_queues:
        _pipeline_queues[pipeline_id] = asyncio.Queue()
    return state


async def _persist_run(pipeline_id: str) -> None:
    state = _runtime_state.get(pipeline_id)
    if not state:
        return
    async with async_session() as db:
        run = await db.get(PipelineRun, pipeline_id)
        if not run:
            return
        run.status = state["status"]
        run.current_step = state["current_step"]
        run.steps_json = state["steps"]
        run.error_json = state["error"]
        run.waiting_confirmation = state.get("waiting_confirmation", False)
        run.updated_at = datetime.now()
        await db.commit()


async def _complete_pipeline(pipeline_id: str) -> None:
    state = _runtime_state[pipeline_id]
    state["status"] = "completed"
    await _persist_run(pipeline_id)
    await emit_event(pipeline_id, {"type": "pipeline_completed", "step": state["current_step"], "data": state["steps"]})


async def _fail_pipeline(pipeline_id: str, step: int, message: str, retryable: bool = True) -> None:
    state = _runtime_state[pipeline_id]
    state["status"] = "paused" if retryable else "failed"
    state["error"] = {"step": STEP_LABELS[step] if step < len(STEP_LABELS) else str(step), "message": message, "retryable": retryable}
    if 0 <= step < len(state["steps"]):
        state["steps"][step]["status"] = "failed"
        state["steps"][step]["error"] = message
    await _persist_run(pipeline_id)
    await emit_event(pipeline_id, {
        "type": "step_failed",
        "step": step,
        "error": state["error"],
    })


async def _wait_confirmation(pipeline_id: str, step: int) -> None:
    state = _runtime_state[pipeline_id]
    if state["mode"] != "confirm":
        return
    state["status"] = "paused"
    state["waiting_confirmation"] = True
    await _persist_run(pipeline_id)
    await emit_event(pipeline_id, {"type": "waiting_confirmation", "step": step, "data": state["steps"][step].get("data")})
    _resume_events[pipeline_id].clear()
    await _resume_events[pipeline_id].wait()


def _seed_script_from_structured(structured: dict) -> dict | None:
    episodes = structured.get("episodes")
    if not episodes:
        return None
    title = structured.get("title", "剧本")
    result = {"title": title, "episodes": []}
    for i, ep in enumerate(episodes):
        ep_obj = {
            "id": f"ep_{ep.get('number', i + 1)}",
            "number": ep.get("number", i + 1),
            "title": ep.get("title", f"第{i + 1}集"),
            "scenes": [],
        }
        for j, sc in enumerate(ep.get("scenes", [])):
            ep_obj["scenes"].append({
                "id": f"s_{i + 1}_{j + 1}",
                "title": sc.get("title", f"场景{j + 1}"),
                "summary": sc.get("summary", ""),
                "location": sc.get("location", "未指定"),
                "time_tag": sc.get("time_tag", sc.get("timeTag", "日间")),
            })
        result["episodes"].append(ep_obj)
    return result


def _seed_characters_from_structured(structured: dict) -> dict | None:
    chars = structured.get("characters")
    if not chars:
        return None
    colors = ["#A8835F", "#5A7FA8", "#7A6B8A", "#5B8C5A", "#B85C50"]
    result = []
    for i, c in enumerate(chars):
        result.append({
            "id": f"char_{i + 1}",
            "name": c.get("name", f"角色{i + 1}"),
            "role": c.get("role", "配角"),
            "gender": c.get("gender", ""),
            "age": c.get("age", 0),
            "description": c.get("description", ""),
            "personality": c.get("personality", ""),
            "personality_traits": c.get("personality_traits", []),
            "appearance": c.get("appearance", ""),
            "costume": c.get("costume", ""),
            "background": c.get("background", ""),
            "status": "done",
            "avatarColor": colors[i % len(colors)],
            "avatarUrl": "",
            "hasGeneratedImage": False,
        })
    return {"characters": result}


def _seed_storyboard_from_structured(structured: dict) -> dict | None:
    shots = structured.get("storyboard")
    if not shots:
        return None
    result = []
    for i, s in enumerate(shots):
        result.append({
            "id": f"shot_{i + 1}",
            "shot_number": s.get("shot_number", i + 1),
            "episode_number": s.get("episode_number", 1),
            "scene_title": s.get("scene_title", s.get("sceneTitle", "")),
            "description": s.get("description", ""),
            "shot_type": s.get("shot_type", s.get("shotType", "中景")),
            "duration": s.get("duration", 5),
            "camera_movement": s.get("camera_movement", "固定"),
            "status": "done",
            "imageUrl": "",
        })
    return {"shots": result}


async def _save_script(db: AsyncSession, project_id: str, script_data: dict) -> None:
    title = script_data.get("title", "剧本")
    script = Script(id=str(uuid.uuid4()), project_id=project_id, title=title)
    db.add(script)
    for ep_data in script_data.get("episodes", []):
        episode = Episode(
            id=str(uuid.uuid4()),
            script_id=script.id,
            number=ep_data.get("number", 1),
            title=ep_data.get("title", "第一集"),
        )
        db.add(episode)
        for idx, scene_data in enumerate(ep_data.get("scenes", [])):
            scene = Scene(
                id=str(uuid.uuid4()),
                episode_id=episode.id,
                number=idx + 1,
                title=scene_data.get("title", f"场景{idx + 1}"),
                summary=scene_data.get("summary", ""),
                location=scene_data.get("location", "未指定"),
                time_tag=scene_data.get("time_tag", scene_data.get("timeTag", "日间")),
            )
            db.add(scene)
            summary = scene_data.get("summary", "")
            if summary:
                block = ScriptBlock(
                    id=str(uuid.uuid4()),
                    scene_id=scene.id,
                    type="narration",
                    content=summary,
                    sort_order=0,
                )
                db.add(block)
    await db.flush()


async def _save_characters(db: AsyncSession, project_id: str, char_data: dict) -> None:
    for c in char_data.get("characters", []):
        avatar_url = c.get("avatarUrl", c.get("avatar_url", ""))
        has_image = bool(c.get("hasGeneratedImage") or c.get("has_generated_image") or avatar_url)
        raw_assets = c.get("assets") or []
        if not raw_assets and avatar_url:
            raw_assets = [{
                "id": f"portrait_{c.get('id', '')}",
                "type": "立绘",
                "name": f"{c.get('name', '角色')}立绘",
                "thumbnail": avatar_url,
            }]
        char = Character(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name=c.get("name", "角色"),
            role=c.get("role", "配角"),
            gender=c.get("gender", ""),
            age=normalize_age(c.get("age", 0)),
            description=c.get("description", ""),
            personality=c.get("personality", ""),
            personality_traits=c.get("personality_traits", c.get("personalityTraits", [])),
            appearance=c.get("appearance", ""),
            costume=c.get("costume", ""),
            background=c.get("background", ""),
            avatar_color=c.get("avatarColor", c.get("avatar_color", "#A8835F")),
            avatar_url=avatar_url,
            has_generated_image=has_image,
            assets_json=raw_assets,
        )
        db.add(char)
    await db.flush()


async def _save_storyboard(db: AsyncSession, project_id: str, storyboard_data: dict) -> None:
    for shot in storyboard_data.get("shots", []):
        s = StoryboardShot(
            id=str(uuid.uuid4()),
            project_id=project_id,
            shot_number=shot.get("shot_number", shot.get("shotNumber", 1)),
            shot_type=shot.get("shot_type", shot.get("shotType", "中景")),
            duration=shot.get("duration", 5),
            status="已完成",
            description=shot.get("description", ""),
            camera_movement=shot.get("camera_movement", shot.get("cameraMovement", "")),
            scene_ref=shot.get("scene_title", shot.get("sceneTitle", "")),
        )
        db.add(s)
    await db.flush()


async def _save_timeline_clips(db: AsyncSession, project_id: str, video_data: dict) -> None:
    offset = 0.0
    for clip in video_data.get("clips", []):
        if clip.get("status") != "done" or not clip.get("videoUrl"):
            continue
        tc = TimelineClip(
            id=str(uuid.uuid4()),
            project_id=project_id,
            name=clip.get("name", "视频片段"),
            track_type="video",
            start_time=offset,
            duration=float(clip.get("duration", 5)),
            status="ready",
            shot_ref=clip.get("shotId", ""),
            color="#E8F0E8",
            media_url=clip.get("videoUrl", ""),
        )
        db.add(tc)
        offset += float(clip.get("duration", 5))
    await db.flush()


async def _create_generation_task(
    db: AsyncSession,
    project_id: str,
    stage: str,
    skill_id: str,
    detail: str,
    status: str = "running",
    progress: int = 0,
) -> GenerationTask | None:
    if not project_id:
        logger.warning("[Pipeline] 跳过 generation_task：缺少 project_id")
        return None
    task = GenerationTask(
        id=uuid.uuid4().hex,
        project_id=project_id,
        stage=stage,
        skill_id=skill_id or "",
        status=status,
        progress=progress,
        detail=detail,
        started_at=datetime.now() if status == "running" else None,
    )
    db.add(task)
    await db.flush()
    return task


async def _execute_pipeline(pipeline_id: str, start_step: int = 0) -> None:
    state = _runtime_state.get(pipeline_id)
    if not state:
        return

    project_id = state["project_id"]
    mode = state["mode"]
    creative_input = state["creative_input"]
    skill_config = resolve_skill_config(state.get("skill_id", "jp-school"))
    skill_id = state.get("skill_id", "jp-school")

    script_data: dict | None = None
    character_data: dict | None = None
    storyboard_data: dict | None = None
    video_data: dict | None = None

    if start_step > 0:
        for i in range(start_step):
            data = state["steps"][i].get("data")
            if i == 0:
                script_data = data
            elif i == 1:
                character_data = data
            elif i == 2:
                storyboard_data = data
            elif i == 3:
                video_data = data

    end_step = 2 if mode == "preview" else 5

    try:
        for step in range(start_step, end_step + 1):
            state["current_step"] = step
            state["status"] = "running"
            steps = state["steps"]
            steps[step]["status"] = "running"
            steps[step]["progress"] = 0
            await _persist_run(pipeline_id)
            await emit_event(pipeline_id, {"type": "step_progress", "step": step, "progress": 0})

            try:
                if step == 0:
                    logger.info("[Pipeline] %s 开始生成剧本 (LLM)", pipeline_id)
                    script_data = await _run_with_heartbeat(
                        pipeline_id,
                        step,
                        "剧本生成",
                        lambda: pipeline_service.run_step_script(
                            pipeline_id, creative_input, skill_config
                        ),
                    )
                    steps[step]["progress"] = 50
                    await emit_event(pipeline_id, {"type": "step_progress", "step": step, "progress": 50})
                    async with async_session() as db:
                        await _save_script(db, project_id, script_data)
                        await db.commit()

                elif step == 1:
                    if not script_data:
                        raise RuntimeError("缺少剧本数据")
                    character_data = await _run_with_heartbeat(
                        pipeline_id,
                        step,
                        "角色生成",
                        lambda: pipeline_service.run_step_character(
                            pipeline_id, script_data, skill_config
                        ),
                    )
                    steps[step]["progress"] = 60
                    await emit_event(pipeline_id, {"type": "step_progress", "step": step, "progress": 60})
                    async with async_session() as db:
                        await _save_characters(db, project_id, character_data)
                        await db.commit()

                elif step == 2:
                    if not script_data:
                        raise RuntimeError("缺少剧本数据")
                    storyboard_data = await _run_with_heartbeat(
                        pipeline_id,
                        step,
                        "分镜生成",
                        lambda: pipeline_service.run_step_storyboard(
                            pipeline_id,
                            script_data,
                            character_data or {"characters": []},
                            skill_config,
                        ),
                    )
                    steps[step]["progress"] = 70
                    await emit_event(pipeline_id, {"type": "step_progress", "step": step, "progress": 70})
                    async with async_session() as db:
                        await _save_storyboard(db, project_id, storyboard_data)
                        await db.commit()

                elif step == 3:
                    if not storyboard_data:
                        raise RuntimeError("缺少分镜数据")
                    try:
                        async with async_session() as db:
                            await _create_generation_task(
                                db, project_id, "video", skill_id, "视频生成中", "running", 0
                            )
                            await db.commit()
                    except Exception as exc:
                        logger.warning("[Pipeline] 记录 generation_task 失败（不影响视频生成）: %s", exc)

                    shots = storyboard_data.get("shots", [])
                    clips = []
                    total = max(len(shots), 1)
                    for i, shot in enumerate(shots):
                        clip = {
                            "id": f"vid_{shot.get('id', f'shot_{i + 1}')}",
                            "shotId": shot.get("id", f"shot_{i + 1}"),
                            "name": f"镜头 {shot.get('shot_number', shot.get('shotNumber', i + 1))} — {shot.get('scene_title', shot.get('sceneTitle', ''))}",
                            "duration": shot.get("duration", 5),
                            "progress": 0,
                            "status": "generating",
                            "videoUrl": None,
                        }
                        clips.append(clip)
                        video_data = {"clips": clips, "overallProgress": int((i / total) * 100)}
                        steps[step]["data"] = video_data
                        steps[step]["progress"] = video_data["overallProgress"]
                        await emit_event(pipeline_id, {"type": "step_progress", "step": step, "progress": steps[step]["progress"], "data": video_data})

                        try:
                            prompt = build_video_prompt(
                                shot,
                                skill_config,
                                character_data=character_data,
                                script_data=script_data,
                                shot_index=i,
                                prev_shot=shots[i - 1] if i > 0 else None,
                            )
                            image_url = shot.get("imageUrl") or None
                            result = await video_service.generate_video_with_policy_retry(
                                prompt=prompt,
                                image_url=image_url,
                                width=1152,
                                height=768,
                                num_frames=49,
                                frame_rate=24,
                            )
                            clip["videoUrl"] = result.get("video_url", "")
                            clip["status"] = "done"
                            clip["progress"] = 100
                        except Exception as exc:
                            logger.warning("[Pipeline] 视频镜头 %s 失败: %s", i + 1, exc)
                            clip["status"] = "failed"
                            clip["progress"] = 0
                            if is_content_policy_error(exc):
                                msg = f"镜头 {i + 1} 视频被内容审核拦截，已尝试弱化 prompt，请调整分镜描述后重试"
                            else:
                                msg = f"镜头 {i + 1} 视频生成失败: {exc}"
                            await _fail_pipeline(pipeline_id, step, msg, retryable=True)
                            return

                    video_data = {"clips": clips, "overallProgress": 100}
                    async with async_session() as db:
                        await _save_timeline_clips(db, project_id, video_data)
                        await db.commit()

                elif step == 4:
                    audio_data = {
                        "status": "skipped",
                        "reason": "TTS 开发中",
                        "voices": (character_data or {}).get("characters", [])[:3],
                        "bgm": {"style": "待定", "duration": 0, "status": "waiting"},
                    }
                    for v in audio_data["voices"]:
                        if isinstance(v, dict):
                            v["voiceName"] = f"{v.get('name', '角色')} — 默认音色"
                            v["status"] = "waiting"
                    steps[step]["data"] = audio_data
                    steps[step]["status"] = "skipped"
                    steps[step]["progress"] = 100
                    await _persist_run(pipeline_id)
                    await emit_event(pipeline_id, {"type": "step_completed", "step": step, "data": audio_data})
                    if mode == "confirm":
                        await _wait_confirmation(pipeline_id, step)
                    continue

                elif step == 5:
                    compose_data = {
                        "videoUrl": None,
                        "duration": sum(c.get("duration", 0) for c in (video_data or {}).get("clips", [])),
                        "resolution": "1920x1080",
                        "status": "ready",
                        "clips": (video_data or {}).get("clips", []),
                        "message": "合成服务开发中，视频片段已导入合成室时间线",
                    }
                    steps[step]["data"] = compose_data
                    steps[step]["status"] = "done"
                    steps[step]["progress"] = 100
                    await emit_event(pipeline_id, {"type": "step_completed", "step": step, "data": compose_data})
                    await _complete_pipeline(pipeline_id)
                    return

                steps[step]["data"] = (
                    script_data if step == 0 else
                    character_data if step == 1 else
                    storyboard_data if step == 2 else
                    video_data if step == 3 else None
                )
                steps[step]["status"] = "done"
                steps[step]["progress"] = 100
                await _persist_run(pipeline_id)
                await emit_event(pipeline_id, {"type": "step_completed", "step": step, "data": steps[step]["data"]})
                await _wait_confirmation(pipeline_id, step)

            except Exception as exc:
                logger.exception("[Pipeline] 步骤 %s 失败", step)
                await _fail_pipeline(pipeline_id, step, str(exc))
                return

            if mode == "preview" and step == 2:
                await _complete_pipeline(pipeline_id)
                return

        if end_step < 5:
            await _complete_pipeline(pipeline_id)

    except asyncio.CancelledError:
        state["status"] = "paused"
        await _persist_run(pipeline_id)
        raise
