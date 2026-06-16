"""生成任务路由 — 对接数据库。"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.db_models import GenerationTask
from app.models.schemas import (
    GenerationTaskResponse,
    GenerationTaskCreate,
    GenerationTaskListResponse,
    MessageResponse,
)

router = APIRouter()


@router.post("/submit", response_model=GenerationTaskResponse)
async def submit_task(
    data: GenerationTaskCreate,
    db: AsyncSession = Depends(get_db),
):
    """提交生成任务。"""
    task = GenerationTask(
        project_id=data.project_id,
        stage=data.stage,
        skill_id=data.skill_id or "",
        status="queued",
        progress=0,
        detail="任务已提交，正在排队处理",
    )
    await db.add(task)
    await db.commit()
    await db.refresh(task)

    # TODO: 实际提交到 Celery 任务队列
    return _task_to_response(task)


@router.get("", response_model=GenerationTaskListResponse)
async def list_tasks(
    project_id: str | None = None,
    stage: str | None = None,
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取生成任务列表，支持筛选和分页。"""
    query = select(GenerationTask)

    if project_id:
        query = query.where(GenerationTask.project_id == project_id)
    if stage:
        query = query.where(GenerationTask.stage == stage)
    if status:
        query = query.where(GenerationTask.status == status)

    # 统计总数
    count_query = select(GenerationTask)
    if project_id:
        count_query = count_query.where(GenerationTask.project_id == project_id)
    if stage:
        count_query = count_query.where(GenerationTask.stage == stage)
    if status:
        count_query = count_query.where(GenerationTask.status == status)
    total = len((await db.execute(count_query)).scalars().all())

    # 分页查询
    query = query.order_by(desc(GenerationTask.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    tasks = result.scalars().all()

    return {
        "items": [_task_to_response(t) for t in tasks],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{task_id}", response_model=GenerationTaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """查询任务状态。"""
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return _task_to_response(task)


@router.put("/{task_id}", response_model=GenerationTaskResponse)
async def update_task(
    task_id: str,
    status: str | None = None,
    progress: int | None = None,
    detail: str | None = None,
    error_message: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """更新任务状态（供内部调用）。"""
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if status:
        task.status = status
        if status == "running" and not task.started_at:
            task.started_at = datetime.now()
        elif status in ("completed", "failed", "cancelled"):
            task.completed_at = datetime.now()
    if progress is not None:
        task.progress = progress
    if detail:
        task.detail = detail
    if error_message:
        task.error_message = error_message

    await db.commit()
    await db.refresh(task)
    return _task_to_response(task)


@router.delete("/{task_id}", response_model=MessageResponse)
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """取消任务。"""
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"任务已{task.status}，无法取消")

    task.status = "cancelled"
    task.completed_at = datetime.now()
    task.detail = "用户手动取消"
    await db.commit()
    return MessageResponse(message=f"任务已取消")


@router.delete("", response_model=MessageResponse)
async def clear_tasks(
    project_id: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """清空任务记录。"""
    query = select(GenerationTask)
    if project_id:
        query = query.where(GenerationTask.project_id == project_id)
    if status:
        query = query.where(GenerationTask.status == status)

    tasks = (await db.execute(query)).scalars().all()
    for task in tasks:
        await db.delete(task)
    await db.commit()

    return MessageResponse(message=f"已清空 {len(tasks)} 条任务记录")


def _task_to_response(task: GenerationTask) -> dict:
    """将数据库 GenerationTask 对象转换为响应格式。"""
    return {
        "task_id": task.id,
        "project_id": task.project_id,
        "stage": task.stage,
        "skill_id": task.skill_id,
        "status": task.status,
        "progress": task.progress,
        "detail": task.detail,
        "result": task.result_json,
        "error_message": task.error_message,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }
