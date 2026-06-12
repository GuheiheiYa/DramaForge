"""角色管理路由 — 数据库版本，支持完整 CRUD。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import Character
from app.models.schemas import (
    CharacterCreate, CharacterUpdate, CharacterResponse,
    CharacterAssetData, CharacterRelationshipData, MessageResponse,
)

router = APIRouter()


def _to_response(c: Character) -> CharacterResponse:
    """ORM 对象 → Pydantic 响应。"""
    return CharacterResponse(
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
        assets=[CharacterAssetData(**a) for a in (c.assets_json or [])],
        relationships=[CharacterRelationshipData(**r) for r in (c.relationships_json or [])],
        scenes=c.scenes_json or [],
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("", response_model=list[CharacterResponse])
async def list_characters(
    project_id: str | None = Query(None, description="按项目 ID 筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取角色列表。"""
    stmt = select(Character)
    if project_id:
        stmt = stmt.where(Character.project_id == project_id)
    stmt = stmt.order_by(Character.updated_at.desc())
    result = await db.execute(stmt)
    return [_to_response(c) for c in result.scalars().all()]


@router.post("", response_model=CharacterResponse)
async def create_character(req: CharacterCreate, db: AsyncSession = Depends(get_db)):
    """创建角色。"""
    char = Character(
        id=f"char_{uuid.uuid4().hex[:12]}",
        project_id=req.project_id,
        name=req.name,
        role=req.role,
        gender=req.gender,
        age=req.age,
        description=req.description,
        personality=req.personality,
        personality_traits=req.personality_traits,
        appearance=req.appearance,
        costume=req.costume,
        background=req.background,
        special_setting=req.special_setting,
        avatar_color=req.avatar_color,
        avatar_url=req.avatar_url,
        has_generated_image=req.has_generated_image,
        assets_json=[a.model_dump() for a in req.assets],
        relationships_json=[r.model_dump() for r in req.relationships],
        scenes_json=req.scenes,
    )
    db.add(char)
    await db.flush()
    return _to_response(char)


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(character_id: str, db: AsyncSession = Depends(get_db)):
    """获取角色详情。"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="角色不存在")
    return _to_response(char)


@router.put("/{character_id}", response_model=CharacterResponse)
async def update_character(character_id: str, req: CharacterUpdate, db: AsyncSession = Depends(get_db)):
    """更新角色。"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="角色不存在")

    update_data = req.model_dump(exclude_unset=True)

    # JSON 字段需要特殊处理
    if "assets" in update_data:
        update_data["assets_json"] = [a.model_dump() if hasattr(a, "model_dump") else a for a in update_data.pop("assets")]
    if "relationships" in update_data:
        update_data["relationships_json"] = [r.model_dump() if hasattr(r, "model_dump") else r for r in update_data.pop("relationships")]
    if "scenes" in update_data:
        update_data["scenes_json"] = update_data.pop("scenes")

    for key, value in update_data.items():
        setattr(char, key, value)
    char.updated_at = datetime.now()
    await db.flush()
    return _to_response(char)


@router.delete("/{character_id}", response_model=MessageResponse)
async def delete_character(character_id: str, db: AsyncSession = Depends(get_db)):
    """删除角色。"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="角色不存在")
    await db.delete(char)
    await db.flush()
    return MessageResponse(message=f"角色 {character_id} 已删除")
