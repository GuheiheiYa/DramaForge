"""Pipeline 一站式创作路由。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.models.schemas import (
    PipelineStartRequest, PipelineStatusResponse, PipelineMode, MessageResponse
)
from app.services.llm_service import get_provider

router = APIRouter()


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
    try:
        provider, default_model = get_provider(req.model)
    except ValueError:
        provider, default_model = get_provider("mimo")

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
        raise HTTPException(status_code=502, detail=f"LLM 调用失败: {str(e)}")

    return ChatResponse(reply=reply)


@router.post("/chat/stream")
async def chat_with_ai_stream(req: ChatRequest):
    """流式 AI 对话接口（SSE）。返回 thinking + content 分块。"""
    import json as _json

    print(f"[STREAM] 收到请求: model={req.model}, messages={len(req.messages)}条")

    try:
        provider, default_model = get_provider(req.model)
    except ValueError:
        provider, default_model = get_provider("mimo")

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

# Pipeline 实例存储（后续替换为 Redis）
_pipelines: dict[str, dict] = {}


@router.post("/start", response_model=PipelineStatusResponse)
async def start_pipeline(req: PipelineStartRequest):
    """启动一站式创作 Pipeline。"""
    pipeline_id = f"pipe_{uuid.uuid4().hex[:8]}"

    steps = [
        {"id": "script", "label": "剧本", "status": "waiting", "progress": 0, "data": None},
        {"id": "character", "label": "角色", "status": "waiting", "progress": 0, "data": None},
        {"id": "storyboard", "label": "分镜", "status": "waiting", "progress": 0, "data": None},
        {"id": "video", "label": "视频", "status": "waiting", "progress": 0, "data": None},
        {"id": "audio", "label": "配音", "status": "waiting", "progress": 0, "data": None},
        {"id": "compose", "label": "合成", "status": "waiting", "progress": 0, "data": None},
    ]

    pipeline = {
        "id": pipeline_id,
        "project_id": req.project_id,
        "creative_input": req.creative_input,
        "mode": req.mode.value,
        "skill_id": req.skill_id,
        "status": "running",
        "current_step": 0,
        "steps": steps,
        "error": None,
        "created_at": datetime.now(),
    }
    _pipelines[pipeline_id] = pipeline

    # TODO: 实际提交到 Celery 异步执行 Pipeline
    # celery_app.send_task("app.tasks.pipeline_runner.run_pipeline", args=[pipeline_id])

    return _to_status_response(pipeline)


@router.get("/{pipeline_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(pipeline_id: str):
    """查询 Pipeline 状态。"""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    return _to_status_response(_pipelines[pipeline_id])


@router.post("/{pipeline_id}/pause", response_model=MessageResponse)
async def pause_pipeline(pipeline_id: str):
    """暂停 Pipeline。"""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    _pipelines[pipeline_id]["status"] = "paused"
    return MessageResponse(message="Pipeline 已暂停")


@router.post("/{pipeline_id}/resume", response_model=MessageResponse)
async def resume_pipeline(pipeline_id: str):
    """恢复 Pipeline。"""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    _pipelines[pipeline_id]["status"] = "running"
    return MessageResponse(message="Pipeline 已恢复")


@router.post("/{pipeline_id}/retry/{step_index}", response_model=MessageResponse)
async def retry_step(pipeline_id: str, step_index: int):
    """重试指定步骤。"""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    pipeline = _pipelines[pipeline_id]
    if step_index < 0 or step_index >= len(pipeline["steps"]):
        raise HTTPException(status_code=400, detail="无效的步骤索引")
    pipeline["steps"][step_index]["status"] = "running"
    pipeline["steps"][step_index]["progress"] = 0
    pipeline["status"] = "running"
    pipeline["error"] = None
    return MessageResponse(message=f"步骤 {step_index} 已重新开始")


@router.post("/{pipeline_id}/skip/{step_index}", response_model=MessageResponse)
async def skip_step(pipeline_id: str, step_index: int):
    """跳过指定步骤。"""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")
    pipeline = _pipelines[pipeline_id]
    if step_index < 0 or step_index >= len(pipeline["steps"]):
        raise HTTPException(status_code=400, detail="无效的步骤索引")
    pipeline["steps"][step_index]["status"] = "skipped"
    pipeline["status"] = "running"
    pipeline["error"] = None
    return MessageResponse(message=f"步骤 {step_index} 已跳过")


@router.get("/{pipeline_id}/stream")
async def stream_pipeline_progress(pipeline_id: str):
    """SSE 实时推送 Pipeline 进度。"""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline 不存在")

    async def event_generator():
        """SSE 事件生成器。"""
        # TODO: 实际接入 Celery 任务状态轮询
        import json
        pipeline = _pipelines[pipeline_id]
        yield f"data: {json.dumps(_to_status_response(pipeline).model_dump())}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


def _to_status_response(pipeline: dict) -> PipelineStatusResponse:
    """转换为状态响应格式。"""
    return PipelineStatusResponse(
        project_id=pipeline["project_id"],
        status=pipeline["status"],
        current_step=pipeline["current_step"],
        steps=pipeline["steps"],
        error=pipeline["error"],
    )


# ─── 数据保存端点 ───

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.db_models import Script, Episode, Scene, ScriptBlock, Character
from app.models.schemas import ScriptCreate, CharacterCreate, ScriptResponse, CharacterResponse, EpisodeData, SceneData


@router.post("/save-script", response_model=ScriptResponse)
async def save_script(req: ScriptCreate, db: AsyncSession = Depends(get_db)):
    """保存 Pipeline 提取的剧本数据到数据库。"""
    script = Script(
        id=f"scr_{uuid.uuid4().hex[:12]}",
        project_id=req.project_id,
        title=req.title,
    )
    db.add(script)

    for ep_data in req.episodes:
        episode = Episode(
            id=f"ep_{uuid.uuid4().hex[:12]}",
            script_id=script.id,
            number=ep_data.number,
            title=ep_data.title,
        )
        db.add(episode)

        for idx, scene_data in enumerate(ep_data.scenes):
            scene = Scene(
                id=f"sc_{uuid.uuid4().hex[:12]}",
                episode_id=episode.id,
                number=scene_data.number if scene_data.number else idx + 1,
                title=scene_data.title,
                summary=scene_data.summary,
                location=scene_data.location,
                time_tag=scene_data.time_tag,
            )
            db.add(scene)

    await db.flush()

    # 重新加载关联数据
    from sqlalchemy.orm import selectinload
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
            id=f"char_{uuid.uuid4().hex[:12]}",
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
