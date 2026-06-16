"""视频生成路由 — 对接 Agnes 视频模型。"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import StoryboardShot
from app.services.video_service import generate_video

logger = logging.getLogger(__name__)

router = APIRouter()


class VideoGenerateRequest(BaseModel):
    """视频生成请求。"""
    prompt: str
    image_url: str | None = None          # 图生视频：单张参考图
    image_urls: list[str] | None = None   # 多图视频 / 关键帧
    mode: str | None = None               # "keyframes" 等
    width: int = 1152
    height: int = 768
    num_frames: int = 121
    frame_rate: int = 24


class VideoGenerateResponse(BaseModel):
    """视频生成响应。"""
    video_url: str


@router.post("/generate", response_model=VideoGenerateResponse)
async def api_generate_video(req: VideoGenerateRequest):
    """生成视频（文生视频 / 图生视频 / 多图视频 / 关键帧动画）。

    4 种模式由参数组合决定：
    - 仅 prompt → 文生视频
    - prompt + image_url → 图生视频
    - prompt + image_urls → 多图视频
    - prompt + image_urls + mode="keyframes" → 关键帧动画
    """
    try:
        result = await generate_video(
            prompt=req.prompt,
            image_url=req.image_url,
            image_urls=req.image_urls,
            mode=req.mode,
            width=req.width,
            height=req.height,
            num_frames=req.num_frames,
            frame_rate=req.frame_rate,
        )
    except RuntimeError as e:
        logger.error("[Videos] 生成失败: %s", str(e))
        raise HTTPException(status_code=500, detail=f"视频生成失败: {str(e)}")

    return VideoGenerateResponse(video_url=result["video_url"])


class ShotVideoRequest(BaseModel):
    """为分镜生成视频。"""
    shot_id: str


@router.post("/generate-shot", response_model=VideoGenerateResponse)
async def api_generate_shot_video(
    req: ShotVideoRequest,
    db: AsyncSession = Depends(get_db),
):
    """根据分镜描述生成对应视频。

    从 StoryboardShot 读取 description、camera_movement、characters 等字段，
    自动构建 prompt 调用 Agnes 视频 API。
    """
    result = await db.execute(
        select(StoryboardShot).where(StoryboardShot.id == req.shot_id)
    )
    shot = result.scalar_one_or_none()
    if not shot:
        raise HTTPException(status_code=404, detail="分镜不存在")

    # 构建视频 prompt
    parts = [shot.description or ""]
    if shot.camera_movement and shot.camera_movement != "固定":
        parts.append(f"Camera movement: {shot.camera_movement}")
    if shot.composition:
        parts.append(shot.composition)
    parts.append("cinematic, high quality, smooth motion")
    prompt = ", ".join(p for p in parts if p)

    try:
        video_result = await generate_video(prompt=prompt)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"视频生成失败: {str(e)}")

    return VideoGenerateResponse(video_url=video_result["video_url"])
