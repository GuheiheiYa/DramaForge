"""生成任务路由。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.schemas import GenerationTaskResponse, MessageResponse

router = APIRouter()

# 任务存储（后续替换为 Redis）
_tasks: dict[str, dict] = {}


@router.post("/submit", response_model=GenerationTaskResponse)
async def submit_task(
    project_id: str,
    stage: str,
    skill_id: str = "",
    creative_input: str = "",
):
    """提交生成任务。"""
    task_id = f"task_{uuid.uuid4().hex[:8]}"
    task = {
        "task_id": task_id,
        "status": "queued",
        "stage": stage,
        "progress": 0,
        "detail": "任务已提交，正在排队处理",
        "result": None,
        "created_at": datetime.now(),
    }
    _tasks[task_id] = task
    # TODO: 实际提交到 Celery 任务队列
    return task


@router.get("/{task_id}", response_model=GenerationTaskResponse)
async def get_task_status(task_id: str):
    """查询任务状态。"""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    return _tasks[task_id]


@router.delete("/{task_id}", response_model=MessageResponse)
async def cancel_task(task_id: str):
    """取消任务。"""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    _tasks[task_id]["status"] = "cancelled"
    return MessageResponse(message=f"任务 {task_id} 已取消")
