"""素材管理路由 — 对接数据库。"""

import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.db_models import Asset
from app.models.schemas import (
    AssetResponse,
    AssetListResponse,
    MessageResponse,
)

router = APIRouter()

# 素材存储目录
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.get("", response_model=AssetListResponse)
async def list_assets(
    project_id: str | None = None,
    type: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """获取素材列表，支持筛选和分页。"""
    query = select(Asset)

    if project_id:
        query = query.where(Asset.project_id == project_id)
    if type:
        query = query.where(Asset.type == type)

    # 统计总数
    count_query = select(Asset)
    if project_id:
        count_query = count_query.where(Asset.project_id == project_id)
    if type:
        count_query = count_query.where(Asset.type == type)
    total = len((await db.execute(count_query)).scalars().all())

    # 分页查询
    query = query.order_by(desc(Asset.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    assets = result.scalars().all()

    return {
        "items": [_asset_to_response(a) for a in assets],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    """获取素材详情。"""
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")
    return _asset_to_response(asset)


@router.post("/upload", response_model=AssetResponse)
async def upload_asset(
    project_id: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """上传素材文件。"""
    # 确定文件类型
    mime_type = file.content_type or ""
    if mime_type.startswith("image/"):
        asset_type = "image"
    elif mime_type.startswith("audio/"):
        asset_type = "audio"
    elif mime_type.startswith("video/"):
        asset_type = "video"
    else:
        raise HTTPException(status_code=400, detail="不支持的文件类型")

    # 生成唯一文件名
    ext = Path(file.filename or "").suffix or ".bin"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    # 保存文件
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 创建数据库记录
    asset = Asset(
        project_id=project_id,
        name=name,
        type=asset_type,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=mime_type,
    )
    await db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return _asset_to_response(asset)


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    name: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """更新素材信息（仅名称）。"""
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")

    if name:
        asset.name = name

    await db.commit()
    await db.refresh(asset)
    return _asset_to_response(asset)


@router.delete("/{asset_id}", response_model=MessageResponse)
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    """删除素材。"""
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="素材不存在")

    # 删除文件
    if asset.file_path and os.path.exists(asset.file_path):
        os.remove(asset.file_path)
    if asset.thumbnail_path and os.path.exists(asset.thumbnail_path):
        os.remove(asset.thumbnail_path)

    await db.delete(asset)
    await db.commit()
    return MessageResponse(message=f"素材「{asset.name}」已删除")


@router.delete("", response_model=MessageResponse)
async def batch_delete_assets(
    asset_ids: list[str],
    db: AsyncSession = Depends(get_db),
):
    """批量删除素材。"""
    deleted_count = 0
    for asset_id in asset_ids:
        asset = await db.get(Asset, asset_id)
        if asset:
            # 删除文件
            if asset.file_path and os.path.exists(asset.file_path):
                os.remove(asset.file_path)
            if asset.thumbnail_path and os.path.exists(asset.thumbnail_path):
                os.remove(asset.thumbnail_path)
            await db.delete(asset)
            deleted_count += 1

    await db.commit()
    return MessageResponse(message=f"已删除 {deleted_count} 个素材")


def _asset_to_response(asset: Asset) -> dict:
    """将数据库 Asset 对象转换为响应格式。"""
    # 格式化文件大小
    size_bytes = asset.file_size
    if size_bytes < 1024:
        size_str = f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        size_str = f"{size_bytes / 1024:.1f}KB"
    else:
        size_str = f"{size_bytes / (1024 * 1024):.1f}MB"

    # 格式化时长
    duration_str = ""
    if asset.duration > 0:
        minutes = int(asset.duration // 60)
        seconds = int(asset.duration % 60)
        duration_str = f"{minutes}:{seconds:02d}"

    # 分辨率
    resolution = ""
    if asset.width > 0 and asset.height > 0:
        resolution = f"{asset.width}×{asset.height}"

    return {
        "id": asset.id,
        "project_id": asset.project_id,
        "name": asset.name,
        "type": asset.type,
        "file_path": asset.file_path,
        "file_size": asset.file_size,
        "size_str": size_str,
        "mime_type": asset.mime_type,
        "width": asset.width,
        "height": asset.height,
        "duration": asset.duration,
        "duration_str": duration_str,
        "resolution": resolution,
        "thumbnail_path": asset.thumbnail_path,
        "created_at": asset.created_at.isoformat() if asset.created_at else None,
        "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
    }
