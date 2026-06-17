"""Pipeline 一站式创作路由。"""

import asyncio
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.db_models import (
    Script, Episode, Scene, ScriptBlock, Character, StoryboardShot, PipelineRun,
)
from app.models.schemas import (
    PipelineStartRequest, PipelineStatusResponse, PipelineMode, MessageResponse,
    ScriptCreate, CharacterCreate, ScriptResponse, CharacterResponse, EpisodeData, SceneData,
)
from app.services import pipeline_executor
from app.services.llm_service import get_provider, resolve_provider

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Chat 请求/响应 ───

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., description="对话消息列表")
    model: str = Field(default="mimo", description="Provider 名称")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4096, ge=1, le=32768)
    deep_think: bool = Field(default=False, description="是否开启深度思考")
    stream: bool = Field(default=False, description="是否流式输出")

class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(req: ChatRequest):
    """通用 AI 对话接口，非流式。"""
    provider, default_model = resolve_provider(req.model)

    if not provider.api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM API Key 未配置，请在 backend/.env 中设置 APP_MIMO_API_KEY 或 DEEPSEEK_API_KEY",
        )

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    try:
        reply = await provider.chat(
            messages=messages,
            model=default_model,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            deep_think=req.deep_think,
        )
    except Exception as e:
        logger.exception("pipeline/chat failed")
        raise HTTPException(status_code=502, detail=str(e))

    return ChatResponse(reply=reply)


@router.post("/chat/stream")
async def chat_with_ai_stream(req: ChatRequest):
    """流式 AI 对话接口（SSE）。返回 thinking + content 分块。"""
    import json as _json

    print(f"[STREAM] 收到请求: model={req.model}, messages={len(req.messages)}条")

    provider, default_model = resolve_provider(req.model)
    if not provider.api_key:
        async def error_generator():
            yield f"data: {_json.dumps({'type': 'error', 'data': 'LLM API Key 未配置'}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")

    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    print(f"[STREAM] 使用 provider: {provider.__class__.__name__}, model: {default_model}")

    async def event_generator():
        try:
            print("[STREAM] 开始调用 LLM...")
            chunk_count = 0
            async for chunk in provider.chat_stream(
                messages=messages,
                model=default_model,
                temperature=req.temperature,
                max_tokens=req.max_tokens,
                deep_think=req.deep_think,
            ):
                chunk_count += 1
                if chunk_count <= 3:
                    print(f"[STREAM] chunk #{chunk_count}: type={chunk.get('type')}, data={chunk.get('data', '')[:50]}")
                yield f"data: {_json.dumps(chunk, ensure_ascii=False)}\n\n"
            print(f"[STREAM] 完成，共 {chunk_count} 个 chunk")
        except Exception as e:
            print(f"[STREAM] 错误: {e}")
            yield f"data: {_json.dumps({'type': 'error', 'data': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

# Pipeline 运行时状态由 pipeline_executor 管理


@router.post("/start")
async def start_pipeline(req: PipelineStartRequest, db: AsyncSession = Depends(get_db)):
    """启动一站式创作 Pipeline。"""
    pipeline_id = f"pipe_{uuid.uuid4().hex[:8]}"
    steps = pipeline_executor._default_steps()

    creative_input = req.creative_input
    if req.confirmed_plan:
        creative_input = f"{req.creative_input}\n\n--- 已确认创作方案 ---\n{req.confirmed_plan}"

    run = PipelineRun(
        id=pipeline_id,
        project_id=req.project_id,
        mode=req.mode.value,
        status="running",
        current_step=0,
        creative_input=creative_input,
        structured_data=req.structured_data or {},
        skill_id=req.skill_id,
        steps_json=steps,
        waiting_confirmation=False,
    )
    db.add(run)
    await db.commit()

    await pipeline_executor.start_pipeline_execution(
        pipeline_id=pipeline_id,
        project_id=req.project_id,
        mode=req.mode.value,
        creative_input=creative_input,
        structured_data=req.structured_data,
        skill_id=req.skill_id,
    )

    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    response = _to_status_response(state or {
        "id": pipeline_id,
        "project_id": req.project_id,
        "mode": req.mode.value,
        "status": "running",
        "current_step": 0,
        "steps": steps,
        "error": None,
        "waiting_confirmation": False,
    })
    if not response.pipeline_id:
        response = response.model_copy(update={"pipeline_id": pipeline_id, "id": pipeline_id})
    elif not response.id:
        response = response.model_copy(update={"id": response.pipeline_id})

    payload = response.model_dump()
    payload["pipeline_id"] = pipeline_id
    payload["id"] = pipeline_id
    return JSONResponse(
        content=payload,
        headers={"X-Pipeline-Id": pipeline_id},
    )


@router.get("/runs/latest", response_model=PipelineStatusResponse)
async def get_latest_pipeline_run(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目最近一次 Pipeline 运行（用于 /start 响应异常时的恢复）。"""
    result = await db.execute(
        select(PipelineRun)
        .where(PipelineRun.project_id == project_id)
        .order_by(PipelineRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="未找到 Pipeline 运行记录")
    state = pipeline_executor.get_runtime_pipeline(run.id)
    if not state:
        state = await pipeline_executor.load_pipeline_from_db(run.id, db)
    if not state:
        state = {
            "id": run.id,
            "project_id": run.project_id,
            "mode": run.mode,
            "status": run.status,
            "current_step": run.current_step,
            "steps": run.steps_json or pipeline_executor._default_steps(),
            "error": run.error_json,
            "waiting_confirmation": run.waiting_confirmation,
        }
    return _to_status_response(state)


@router.get("/{pipeline_id}", response_model=PipelineStatusResponse)
async def get_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)):
    """获取 Pipeline 详情（支持页面刷新恢复）。"""
    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    if not state:
        state = await pipeline_executor.load_pipeline_from_db(pipeline_id, db)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    return _to_status_response(state)


@router.get("/{pipeline_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(pipeline_id: str, db: AsyncSession = Depends(get_db)):
    """查询 Pipeline 状态。"""
    return await get_pipeline(pipeline_id, db)


@router.post("/{pipeline_id}/pause", response_model=MessageResponse)
async def pause_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)):
    """暂停 Pipeline。"""
    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    if not state:
        state = await pipeline_executor.load_pipeline_from_db(pipeline_id, db)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    state["status"] = "paused"
    run = await db.get(PipelineRun, pipeline_id)
    if run:
        run.status = "paused"
        await db.commit()
    return MessageResponse(message="Pipeline 已暂停")


@router.post("/{pipeline_id}/resume", response_model=MessageResponse)
async def resume_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)):
    """恢复 Pipeline（confirm 模式确认后继续）。"""
    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    if not state:
        state = await pipeline_executor.load_pipeline_from_db(pipeline_id, db)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    await pipeline_executor.resume_pipeline_execution(pipeline_id)
    return MessageResponse(message="Pipeline 已恢复")


@router.post("/{pipeline_id}/retry/{step_index}", response_model=MessageResponse)
async def retry_step(pipeline_id: str, step_index: int):
    """重试指定步骤。"""
    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    await pipeline_executor.retry_pipeline_step(pipeline_id, step_index)
    return MessageResponse(message=f"步骤 {step_index} 已重新开始")


@router.post("/{pipeline_id}/skip/{step_index}", response_model=MessageResponse)
async def skip_step(pipeline_id: str, step_index: int):
    """跳过指定步骤。"""
    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    await pipeline_executor.skip_pipeline_step(pipeline_id, step_index)
    return MessageResponse(message=f"步骤 {step_index} 已跳过")


@router.get("/{pipeline_id}/stream")
async def stream_pipeline_progress(pipeline_id: str, db: AsyncSession = Depends(get_db)):
    """SSE 实时推送 Pipeline 进度。"""
    state = pipeline_executor.get_runtime_pipeline(pipeline_id)
    if not state:
        state = await pipeline_executor.load_pipeline_from_db(pipeline_id, db)
    if not state:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")

    queue = pipeline_executor.get_event_queue(pipeline_id)
    if not queue:
        pipeline_executor._pipeline_queues[pipeline_id] = asyncio.Queue()
        queue = pipeline_executor._pipeline_queues[pipeline_id]

    await pipeline_executor.ensure_pipeline_task_running(pipeline_id)

    async def event_generator():
        import json
        import asyncio as aio

        # 先推送当前快照
        current = pipeline_executor.get_runtime_pipeline(pipeline_id) or state
        yield f"data: {json.dumps({'type': 'snapshot', **_to_status_response(current).model_dump()}, ensure_ascii=False)}\n\n"

        while True:
            try:
                event = await aio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                if event.get("type") in ("pipeline_completed", "pipeline_failed"):
                    break
            except aio.TimeoutError:
                current = pipeline_executor.get_runtime_pipeline(pipeline_id)
                if not current:
                    break
                if current.get("status") in ("completed", "failed"):
                    yield f"data: {json.dumps({'type': 'snapshot', **_to_status_response(current).model_dump()}, ensure_ascii=False)}\n\n"
                    break
                yield f": keepalive\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _to_status_response(pipeline: dict) -> PipelineStatusResponse:
    """转换为状态响应格式。"""
    pid = pipeline.get("id") or pipeline.get("pipeline_id") or ""
    return PipelineStatusResponse(
        pipeline_id=pid,
        id=pid,
        project_id=pipeline["project_id"],
        status=pipeline["status"],
        current_step=pipeline["current_step"],
        steps=pipeline["steps"],
        mode=pipeline.get("mode", "auto"),
        error=pipeline.get("error"),
        waiting_confirmation=pipeline.get("waiting_confirmation", False),
    )


# ─── 数据保存端点 ───

@router.post("/save-script", response_model=ScriptResponse)
async def save_script(req: ScriptCreate, db: AsyncSession = Depends(get_db)):
    """保存 Pipeline 提取的剧本数据到数据库。"""
    script = Script(
        id=str(uuid.uuid4()),
        project_id=req.project_id,
        title=req.title,
    )
    db.add(script)

    for ep_data in req.episodes:
        episode = Episode(
            id=str(uuid.uuid4()),
            script_id=script.id,
            number=ep_data.number,
            title=ep_data.title,
        )
        db.add(episode)

        for idx, scene_data in enumerate(ep_data.scenes):
            scene = Scene(
                id=str(uuid.uuid4()),
                episode_id=episode.id,
                number=scene_data.number if scene_data.number else idx + 1,
                title=scene_data.title,
                summary=scene_data.summary,
                location=scene_data.location,
                time_tag=scene_data.time_tag,
            )
            db.add(scene)

            summary = scene_data.summary or ""
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

    # 重新加载关联数据
    result = await db.execute(
        select(Script).where(Script.id == script.id).options(
            selectinload(Script.episodes).selectinload(Episode.scenes)
        )
    )
    saved = result.scalar_one()

    episodes = []
    for ep in sorted(saved.episodes, key=lambda e: e.number):
        scenes = [
            SceneData(id=s.id, number=s.number, title=s.title, summary=s.summary or "", location=s.location or "", time_tag=s.time_tag or "")
            for s in sorted(ep.scenes, key=lambda s: s.number)
        ]
        episodes.append(EpisodeData(id=ep.id, number=ep.number, title=ep.title, scenes=scenes))

    return ScriptResponse(
        id=saved.id,
        project_id=saved.project_id,
        title=saved.title,
        episodes=episodes,
        created_at=saved.created_at,
        updated_at=saved.updated_at,
    )


class SaveCharactersRequest(BaseModel):
    """批量保存角色请求。"""
    project_id: str = "default"
    characters: list[CharacterCreate]


@router.post("/save-characters", response_model=list[CharacterResponse])
async def save_characters(req: SaveCharactersRequest, db: AsyncSession = Depends(get_db)):
    """保存 Pipeline 提取的角色数据到数据库。"""
    saved = []
    for char_data in req.characters:
        char = Character(
            id=str(uuid.uuid4()),
            project_id=req.project_id,
            name=char_data.name,
            role=char_data.role,
            gender=char_data.gender,
            age=char_data.age,
            description=char_data.description,
            personality=char_data.personality,
            personality_traits=char_data.personality_traits,
            appearance=char_data.appearance,
            costume=char_data.costume,
            background=char_data.background,
            special_setting=char_data.special_setting,
            avatar_color=char_data.avatar_color,
            avatar_url=char_data.avatar_url,
            has_generated_image=char_data.has_generated_image,
            assets_json=[a.model_dump() for a in char_data.assets],
            relationships_json=[r.model_dump() for r in char_data.relationships],
            scenes_json=char_data.scenes,
        )
        db.add(char)
        saved.append(char)

    await db.flush()

    return [
        CharacterResponse(
            id=c.id,
            project_id=c.project_id,
            name=c.name,
            role=c.role or "配角",
            gender=c.gender or "",
            age=c.age or 0,
            description=c.description or "",
            personality=c.personality or "",
            personality_traits=c.personality_traits or [],
            appearance=c.appearance or "",
            costume=c.costume or "",
            background=c.background or "",
            special_setting=c.special_setting or "",
            avatar_color=c.avatar_color or "#A8835F",
            avatar_url=c.avatar_url or "",
            has_generated_image=bool(c.avatar_url),
            assets=[],
            relationships=[],
            scenes=c.scenes_json or [],
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in saved
    ]


class SaveStoryboardRequest(BaseModel):
    """批量保存分镜请求。"""
    project_id: str = "default"
    shots: list[dict]  # Each shot: {shot_number, shot_type, duration, description, camera_movement, composition, lighting, character_action, dialogue, scene_ref, characters}


@router.post("/save-storyboard", response_model=list[dict])
async def save_storyboard(req: SaveStoryboardRequest, db: AsyncSession = Depends(get_db)):
    """保存 Pipeline 提取的分镜数据到数据库。"""
    saved = []
    for shot_data in req.shots:
        shot = StoryboardShot(
            id=str(uuid.uuid4()),
            project_id=req.project_id,
            shot_number=shot_data.get("shot_number", 1),
            shot_type=shot_data.get("shot_type", "全景"),
            duration=shot_data.get("duration", 3),
            status=shot_data.get("status", "等待中"),
            description=shot_data.get("description", ""),
            camera_movement=shot_data.get("camera_movement", ""),
            composition=shot_data.get("composition", ""),
            lighting=shot_data.get("lighting", ""),
            character_action=shot_data.get("character_action", ""),
            dialogue=shot_data.get("dialogue", ""),
            scene_ref=shot_data.get("scene_ref", ""),
            characters=shot_data.get("characters", []),
        )
        db.add(shot)
        saved.append(shot)

    await db.flush()

    return [
        {
            "id": s.id,
            "project_id": s.project_id,
            "shot_number": s.shot_number,
            "shot_type": s.shot_type,
            "duration": s.duration,
            "status": s.status,
            "description": s.description,
        }
        for s in saved
    ]
