"""图像生成路由 — 对接 Agnes 图像模型。"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import Character, Project
from app.services.image_service import (
    build_unified_style_block,
    generate_character_image,
    generate_image,
)
from app.services.pipeline_executor import resolve_skill_config

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── 通用文本生图 ───

class GenerateImageRequest(BaseModel):
    """通用图片生成请求 — 支持文生图和图生图。"""
    prompt: str
    size: str = "1024x1024"
    image_url: str | None = None   # 图生图：参考图片 URL


class GenerateImageResponse(BaseModel):
    """图片生成响应。"""
    image_url: str


@router.post("/generate", response_model=GenerateImageResponse)
async def api_generate_image(req: GenerateImageRequest):
    """生成图片（文生图 / 图生图）。

    - 仅 prompt → 文生图
    - prompt + image_url → 图生图（以参考图为基础修改）
    """
    try:
        image_url = await generate_image(prompt=req.prompt, size=req.size, image_url=req.image_url)
    except RuntimeError as e:
        logger.error("[Images] 生成失败: %s", str(e))
        raise HTTPException(status_code=500, detail=f"图像生成失败: {str(e)}")

    return GenerateImageResponse(image_url=image_url)


# ─── 角色形象生成 ───

class GenerateCharacterImageRequest(BaseModel):
    """生成角色形象请求。"""
    character_id: str


class GenerateCharacterImageResponse(BaseModel):
    """生成角色形象响应。"""
    image_url: str
    has_generated_image: bool


@router.post("/generate-character", response_model=GenerateCharacterImageResponse)
async def api_generate_character_image(
    req: GenerateCharacterImageRequest,
    db: AsyncSession = Depends(get_db),
):
    """根据角色信息生成立绘图片。

    从数据库读取角色的外貌、服装、性格等字段，
    调用 Agnes 图像模型生成角色立绘，更新 avatar_url。
    """
    # 查询角色
    result = await db.execute(
        select(Character).where(Character.id == req.character_id)
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="角色不存在")

    project = await db.get(Project, char.project_id)
    skill_config = resolve_skill_config(project.skill_id if project else "jp-school")
    unified_style = build_unified_style_block(skill_config.get("prompt", ""))

    ref_result = await db.execute(
        select(Character.avatar_url)
        .where(
            Character.project_id == char.project_id,
            Character.id != char.id,
            Character.avatar_url != "",
            Character.has_generated_image.is_(True),
        )
        .limit(1)
    )
    style_reference_url = ref_result.scalar_one_or_none()

    # 组装角色信息（全部字段参与 prompt 构建）
    character_info = {
        "name": char.name,
        "gender": char.gender or "",
        "age": char.age or 0,
        "role": char.role or "配角",
        "appearance": char.appearance or "",
        "costume": char.costume or "",
        "personality": char.personality or "",
        "personality_traits": char.personality_traits or [],
        "description": char.description or "",
        "background": char.background or "",
        "special_setting": char.special_setting or "",
        "style_prompt": unified_style,
        "style_reference_url": style_reference_url,
    }

    try:
        image_url = await generate_character_image(character_info)
    except RuntimeError as e:
        logger.error("[Images] 生成失败: %s", str(e))
        raise HTTPException(status_code=500, detail=f"图像生成失败: {str(e)}")

    # 更新角色形象与立绘资产
    char.avatar_url = image_url
    char.has_generated_image = True
    assets = list(char.assets_json or [])
    portrait_asset = {
        "id": f"portrait_{char.id[:8]}",
        "type": "立绘",
        "name": f"{char.name}立绘",
        "thumbnail": image_url,
    }
    assets = [a for a in assets if a.get("type") != "立绘"]
    assets.insert(0, portrait_asset)
    char.assets_json = assets
    char.updated_at = datetime.now()
    await db.flush()

    logger.info("[Images] 角色 %s (%s) 形象已更新", char.name, char.id)

    return GenerateCharacterImageResponse(
        image_url=image_url,
        has_generated_image=True,
    )
