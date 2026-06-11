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

class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(req: ChatRequest):
    """通用 AI 对话接口，转发到 LLM Provider。"""
    try:
        provider = get_provider(req.model)
    except ValueError:
        provider = get_provider("mimo")

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    try:
        reply = await provider.chat(
            messages=messages,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM 调用失败: {str(e)}")

    return ChatResponse(reply=reply)

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
