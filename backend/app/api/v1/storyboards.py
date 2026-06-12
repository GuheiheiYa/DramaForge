"""分镜管理路由 — 数据库版本，支持完整 CRUD。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import StoryboardShot
from app.models.schemas import (
    ShotCreate, ShotUpdate, ShotResponse, MessageResponse,
)

router = APIRouter()


def _to_response(s: StoryboardShot) -> ShotResponse:
    """ORM 对象 → Pydantic 响应。"""
    return ShotResponse(
        id=s.id,
        project_id=s.project_id,
        shot_number=s.shot_number,
        shot_type=s.shot_type or "中景",
        duration=s.duration or 5,
        status=s.status or "等待中",
        description=s.description or "",
        camera_movement=s.camera_movement or "固定",
        composition=s.composition or "",
        lighting=s.lighting or "",
        character_action=s.character_action or "",
        dialogue=s.dialogue or "",
        scene_ref=s.scene_ref or "",
        characters=s.characters or [],
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("", response_model=list[ShotResponse])
async def list_shots(
    project_id: str | None = Query(None, description="按项目 ID 筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取分镜列表。"""
    stmt = select(StoryboardShot)
    if project_id:
        stmt = stmt.where(StoryboardShot.project_id == project_id)
    stmt = stmt.order_by(StoryboardShot.shot_number)
    result = await db.execute(stmt)
    return [_to_response(s) for s in result.scalars().all()]


@router.post("", response_model=ShotResponse)
async def create_shot(req: ShotCreate, db: AsyncSession = Depends(get_db)):
    """创建分镜。"""
    shot = StoryboardShot(
        id=f"shot_{uuid.uuid4().hex[:12]}",
        project_id=req.project_id,
        shot_number=req.shot_number,
        shot_type=req.shot_type,
        duration=req.duration,
        status=req.status,
        description=req.description,
        camera_movement=req.camera_movement,
        composition=req.composition,
        lighting=req.lighting,
        character_action=req.character_action,
        dialogue=req.dialogue,
        scene_ref=req.scene_ref,
        characters=req.characters,
    )
    db.add(shot)
    await db.flush()
    return _to_response(shot)


@router.post("/batch", response_model=list[ShotResponse])
async def create_shots_batch(req: list[ShotCreate], db: AsyncSession = Depends(get_db)):
    """批量创建分镜。"""
    shots = []
    for item in req:
        shot = StoryboardShot(
            id=f"shot_{uuid.uuid4().hex[:12]}",
            project_id=item.project_id,
            shot_number=item.shot_number,
            shot_type=item.shot_type,
            duration=item.duration,
            status=item.status,
            description=item.description,
            camera_movement=item.camera_movement,
            composition=item.composition,
            lighting=item.lighting,
            character_action=item.character_action,
            dialogue=item.dialogue,
            scene_ref=item.scene_ref,
            characters=item.characters,
        )
        db.add(shot)
        shots.append(shot)
    await db.flush()
    return [_to_response(s) for s in shots]


@router.get("/{shot_id}", response_model=ShotResponse)
async def get_shot(shot_id: str, db: AsyncSession = Depends(get_db)):
    """获取分镜详情。"""
    result = await db.execute(select(StoryboardShot).where(StoryboardShot.id == shot_id))
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="分镜不存在")
    return _to_response(shot)


@router.put("/{shot_id}", response_model=ShotResponse)
async def update_shot(shot_id: str, req: ShotUpdate, db: AsyncSession = Depends(get_db)):
    """更新分镜。"""
    result = await db.execute(select(StoryboardShot).where(StoryboardShot.id == shot_id))
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="分镜不存在")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(shot, key, value)
    shot.updated_at = datetime.now()
    await db.flush()
    return _to_response(shot)


@router.delete("/{shot_id}", response_model=MessageResponse)
async def delete_shot(shot_id: str, db: AsyncSession = Depends(get_db)):
    """删除分镜。"""
    result = await db.execute(select(StoryboardShot).where(StoryboardShot.id == shot_id))
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="分镜不存在")
    await db.delete(shot)
    await db.flush()
    return MessageResponse(message=f"分镜 {shot_id} 已删除")
