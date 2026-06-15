"""项目管理路由 — 数据库版本。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import Project
from app.models.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, MessageResponse,
)

router = APIRouter()


def _to_response(p: Project) -> ProjectResponse:
    """ORM 对象 → Pydantic 响应。"""
    return ProjectResponse(
        id=p.id,
        name=p.name,
        type=p.type or "漫剧",
        status=p.status or "草稿",
        description=p.description or "",
        episodes=p.episodes or 8,
        current_episode=p.current_episode or 1,
        progress=p.progress or 0,
        skill_id=p.skill_id or "",
        skill_name=p.skill_name or "",
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    type: str | None = Query(None, description="项目类型筛选"),
    status: str | None = Query(None, description="状态筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取项目列表。"""
    stmt = select(Project)
    if type:
        stmt = stmt.where(Project.type == type)
    if status:
        stmt = stmt.where(Project.status == status)
    stmt = stmt.order_by(Project.updated_at.desc())
    result = await db.execute(stmt)
    return [_to_response(p) for p in result.scalars().all()]


@router.post("", response_model=ProjectResponse)
async def create_project(req: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """创建新项目。"""
    project = Project(
        id=str(uuid.uuid4()),
        name=req.name,
        type=req.type,
        status="草稿",
        description=req.description,
        episodes=req.episodes,
        skill_id=req.skill_id,
        skill_name=req.skill_name,
    )
    db.add(project)
    await db.flush()
    return _to_response(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目详情。"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return _to_response(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, req: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    """更新项目。"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    project.updated_at = datetime.now()
    await db.flush()
    return _to_response(project)


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """删除项目。"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await db.delete(project)
    await db.flush()
    return MessageResponse(message=f"项目 {project_id} 已删除")
