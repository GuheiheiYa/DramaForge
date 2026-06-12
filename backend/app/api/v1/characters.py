"""角色管理路由 — 数据库版本。"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import Character
from app.models.schemas import CharacterCreate, CharacterResponse, MessageResponse

router = APIRouter()


def _to_response(char: Character) -> CharacterResponse:
    """ORM 对象 → Pydantic 响应。"""
    return CharacterResponse(
        id=char.id,
        project_id=char.project_id,
        name=char.name,
        role=char.role,
        gender=char.gender or "",
        age=char.age or 0,
        description=char.description or "",
        personality=char.personality or "",
        appearance=char.appearance or "",
        costume=char.costume or "",
        background=char.background or "",
        special_setting=char.special_setting or "",
        avatar_color=char.avatar_color or "#A8835F",
        avatar_url=char.avatar_url or "",
        has_generated_image=bool(char.avatar_url),
        created_at=char.created_at,
        updated_at=char.updated_at,
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
    result = await db.execute(stmt)
    return [_to_response(c) for c in result.scalars().all()]


@router.post("", response_model=CharacterResponse)
async def create_character(req: CharacterCreate, db: AsyncSession = Depends(get_db)):
    """创建角色。"""
    char = Character(
        id=f"char_{uuid.uuid4().hex[:8]}",
        project_id=req.project_id,
        name=req.name,
        role=req.role,
        gender=req.gender,
        age=req.age,
        description=req.description,
        personality=req.personality,
        appearance=req.appearance,
        costume=req.costume,
        background=req.background,
        special_setting=req.special_setting,
        avatar_color=req.avatar_color,
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
async def update_character(
    character_id: str,
    req: CharacterCreate,
    db: AsyncSession = Depends(get_db),
):
    """更新角色。"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="角色不存在")

    char.name = req.name
    char.role = req.role
    char.gender = req.gender
    char.age = req.age
    char.description = req.description
    char.personality = req.personality
    char.appearance = req.appearance
    char.costume = req.costume
    char.background = req.background
    char.special_setting = req.special_setting
    char.avatar_color = req.avatar_color
    char.updated_at = datetime.now()

    return _to_response(char)


@router.delete("/{character_id}", response_model=MessageResponse)
async def delete_character(character_id: str, db: AsyncSession = Depends(get_db)):
    """删除角色。"""
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="角色不存在")

    await db.delete(char)
    return MessageResponse(message=f"角色 {char.name} 已删除")
