"""剧本管理路由 — 数据库版本。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.db_models import Script, Episode, Scene
from app.models.schemas import (
    ScriptCreate, ScriptResponse, EpisodeData, SceneData, MessageResponse,
)

router = APIRouter()


def _to_response(script: Script) -> ScriptResponse:
    """ORM 对象 → Pydantic 响应。"""
    episodes = []
    for ep in sorted(script.episodes, key=lambda e: e.number):
        scenes = [
            SceneData(
                id=s.id,
                title=s.title,
                summary=s.summary or "",
                location=s.location or "未指定",
                time_tag=s.time_tag or "日间",
            )
            for s in sorted(ep.scenes, key=lambda s: s.number)
        ]
        episodes.append(EpisodeData(id=ep.id, number=ep.number, title=ep.title, scenes=scenes))

    return ScriptResponse(
        id=script.id,
        project_id=script.project_id,
        title=script.title,
        episodes=episodes,
        created_at=script.created_at,
        updated_at=script.updated_at,
    )


@router.post("/", response_model=ScriptResponse)
async def create_script(req: ScriptCreate, db: AsyncSession = Depends(get_db)):
    """创建剧本（含集数和场景）。"""
    script = Script(
        id=f"scr_{uuid.uuid4().hex[:8]}",
        project_id=req.project_id,
        title=req.title,
    )
    db.add(script)

    for ep_data in req.episodes:
        episode = Episode(
            id=f"ep_{uuid.uuid4().hex[:8]}",
            script_id=script.id,
            number=ep_data.number,
            title=ep_data.title,
        )
        db.add(episode)

        for idx, scene_data in enumerate(ep_data.scenes):
            scene = Scene(
                id=f"sc_{uuid.uuid4().hex[:8]}",
                episode_id=episode.id,
                number=idx + 1,
                title=scene_data.title,
                summary=scene_data.summary,
                location=scene_data.location,
                time_tag=scene_data.time_tag,
            )
            db.add(scene)

    await db.flush()
    # 重新加载关联数据
    result = await db.execute(
        select(Script).where(Script.id == script.id).options(
            selectinload(Script.episodes).selectinload(Episode.scenes)
        )
    )
    return _to_response(result.scalar_one())


@router.get("/{project_id}", response_model=ScriptResponse)
async def get_script(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目剧本。"""
    result = await db.execute(
        select(Script).where(Script.project_id == project_id).options(
            selectinload(Script.episodes).selectinload(Episode.scenes)
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    return _to_response(script)


@router.put("/scenes/{scene_id}", response_model=MessageResponse)
async def update_scene(
    scene_id: str,
    title: str | None = None,
    summary: str | None = None,
    location: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """更新场景内容。"""
    result = await db.execute(select(Scene).where(Scene.id == scene_id))
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="场景不存在")

    if title is not None:
        scene.title = title
    if summary is not None:
        scene.summary = summary
    if location is not None:
        scene.location = location

    return MessageResponse(message="场景已更新")


@router.delete("/{script_id}", response_model=MessageResponse)
async def delete_script(script_id: str, db: AsyncSession = Depends(get_db)):
    """删除剧本。"""
    result = await db.execute(select(Script).where(Script.id == script_id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")

    await db.delete(script)
    return MessageResponse(message="剧本已删除")
