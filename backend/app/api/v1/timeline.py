"""合成室时间轴 API。"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import TimelineClip

router = APIRouter()


class TimelineClipCreate(BaseModel):
    project_id: str
    name: str
    track_type: str = "video"
    start_time: float = 0
    duration: float = 5
    media_url: str = ""
    shot_ref: str = ""
    color: str = "#E8F0E8"


class TimelineClipResponse(BaseModel):
    id: str
    project_id: str
    name: str
    track_type: str
    start_time: float
    duration: float
    status: str
    shot_ref: str
    color: str
    media_url: str


@router.get("", response_model=list[TimelineClipResponse])
async def list_timeline_clips(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """获取项目时间轴片段。"""
    result = await db.execute(
        select(TimelineClip)
        .where(TimelineClip.project_id == project_id)
        .order_by(TimelineClip.start_time)
    )
    clips = result.scalars().all()
    return [_to_response(c) for c in clips]


@router.post("", response_model=TimelineClipResponse)
async def create_timeline_clip(
    data: TimelineClipCreate,
    db: AsyncSession = Depends(get_db),
):
    """手动导入时间轴片段。"""
    clip = TimelineClip(
        id=str(uuid.uuid4()),
        project_id=data.project_id,
        name=data.name,
        track_type=data.track_type,
        start_time=data.start_time,
        duration=data.duration,
        status="ready",
        shot_ref=data.shot_ref,
        color=data.color,
        media_url=data.media_url,
    )
    db.add(clip)
    await db.commit()
    await db.refresh(clip)
    return _to_response(clip)


@router.delete("/{clip_id}")
async def delete_timeline_clip(clip_id: str, db: AsyncSession = Depends(get_db)):
    clip = await db.get(TimelineClip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="片段不存在")
    await db.delete(clip)
    await db.commit()
    return {"message": "已删除"}


def _to_response(clip: TimelineClip) -> TimelineClipResponse:
    return TimelineClipResponse(
        id=clip.id,
        project_id=clip.project_id,
        name=clip.name,
        track_type=clip.track_type,
        start_time=clip.start_time,
        duration=clip.duration,
        status=clip.status,
        shot_ref=clip.shot_ref or "",
        color=clip.color or "",
        media_url=getattr(clip, "media_url", "") or "",
    )
