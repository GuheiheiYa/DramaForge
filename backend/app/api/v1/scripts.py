"""剧本管理路由 — 数据库版本，支持完整 CRUD。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.db_models import Script, Episode, Scene, ScriptBlock
from app.models.schemas import (
    ScriptCreate, ScriptResponse, EpisodeData, SceneData, ScriptBlockData, MessageResponse,
)

router = APIRouter()


def _to_response(script: Script) -> ScriptResponse:
    """ORM 对象 → Pydantic 响应。"""
    episodes = []
    for ep in sorted(script.episodes, key=lambda e: e.number):
        scenes = []
        for s in sorted(ep.scenes, key=lambda s: s.number):
            blocks = [
                ScriptBlockData(
                    id=b.id, type=b.type, content=b.content or "", sort_order=b.sort_order or 0,
                )
                for b in sorted(s.blocks, key=lambda b: b.sort_order or 0)
            ]
            scenes.append(SceneData(
                id=s.id, number=s.number, title=s.title,
                location=s.location or "未指定", time_tag=s.time_tag or "日间",
                summary=s.summary or "", blocks=blocks,
            ))
        episodes.append(EpisodeData(id=ep.id, number=ep.number, title=ep.title, scenes=scenes))

    return ScriptResponse(
        id=script.id,
        project_id=script.project_id,
        title=script.title,
        episodes=episodes,
        created_at=script.created_at,
        updated_at=script.updated_at,
    )


@router.get("", response_model=list[ScriptResponse])
async def list_scripts(
    project_id: str | None = Query(None, description="按项目 ID 筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取剧本列表。"""
    stmt = select(Script).options(
        selectinload(Script.episodes).selectinload(Episode.scenes).selectinload(Scene.blocks)
    )
    if project_id:
        stmt = stmt.where(Script.project_id == project_id)
    result = await db.execute(stmt)
    return [_to_response(s) for s in result.scalars().all()]


@router.post("", response_model=ScriptResponse)
async def create_script(req: ScriptCreate, db: AsyncSession = Depends(get_db)):
    """创建剧本（含分集、场景、剧本块）。"""
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

        for scene_data in ep_data.scenes:
            scene = Scene(
                id=str(uuid.uuid4()),
                episode_id=episode.id,
                number=scene_data.number,
                title=scene_data.title,
                location=scene_data.location,
                time_tag=scene_data.time_tag,
                summary=scene_data.summary,
            )
            db.add(scene)

            for idx, block_data in enumerate(scene_data.blocks):
                block = ScriptBlock(
                    id=str(uuid.uuid4()),
                    scene_id=scene.id,
                    type=block_data.type,
                    content=block_data.content,
                    sort_order=block_data.sort_order if block_data.sort_order else idx,
                )
                db.add(block)

    await db.flush()
    return await _load_and_respond(db, script.id)


@router.get("/{script_id}", response_model=ScriptResponse)
async def get_script(script_id: str, db: AsyncSession = Depends(get_db)):
    """获取剧本详情（含分集、场景、剧本块）。"""
    return await _load_and_respond(db, script_id)


@router.put("/{script_id}", response_model=ScriptResponse)
async def update_script(script_id: str, req: ScriptCreate, db: AsyncSession = Depends(get_db)):
    """更新剧本（删除旧数据重建）。"""
    result = await db.execute(select(Script).where(Script.id == script_id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")

    script.title = req.title
    script.updated_at = datetime.now()

    # 删除旧的分集（级联删除场景和块）
    for ep in script.episodes:
        await db.delete(ep)

    # 重建分集、场景、块
    for ep_data in req.episodes:
        episode = Episode(
            id=str(uuid.uuid4()),
            script_id=script.id,
            number=ep_data.number,
            title=ep_data.title,
        )
        db.add(episode)

        for scene_data in ep_data.scenes:
            scene = Scene(
                id=str(uuid.uuid4()),
                episode_id=episode.id,
                number=scene_data.number,
                title=scene_data.title,
                location=scene_data.location,
                time_tag=scene_data.time_tag,
                summary=scene_data.summary,
            )
            db.add(scene)

            for idx, block_data in enumerate(scene_data.blocks):
                block = ScriptBlock(
                    id=str(uuid.uuid4()),
                    scene_id=scene.id,
                    type=block_data.type,
                    content=block_data.content,
                    sort_order=block_data.sort_order if block_data.sort_order else idx,
                )
                db.add(block)

    await db.flush()
    return await _load_and_respond(db, script.id)


@router.delete("/{script_id}", response_model=MessageResponse)
async def delete_script(script_id: str, db: AsyncSession = Depends(get_db)):
    """删除剧本。"""
    result = await db.execute(select(Script).where(Script.id == script_id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    await db.delete(script)
    await db.flush()
    return MessageResponse(message=f"剧本 {script_id} 已删除")


async def _load_and_respond(db: AsyncSession, script_id: str) -> ScriptResponse:
    """加载剧本完整关联数据并返回响应。"""
    result = await db.execute(
        select(Script).where(Script.id == script_id).options(
            selectinload(Script.episodes).selectinload(Episode.scenes).selectinload(Scene.blocks)
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    return _to_response(script)
