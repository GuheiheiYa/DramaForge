"""Agnes 视频生成服务 — 文生视频 / 图生视频 / 多图视频 / 关键帧动画。

Agnes 视频 API 是异步的：
1. POST /v1/videos → 返回 { task_id, status: "queued" }
2. GET  /v1/videos/{task_id} → 轮询直到 status: "completed"
3. 完成后视频 URL 在 remixed_from_video_id 字段
"""

import asyncio
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# 最大轮询次数（每次间隔 5 秒，最多等 5 分钟）
MAX_POLL_COUNT = 60
POLL_INTERVAL = 5


async def generate_video(
    prompt: str,
    image_url: str | None = None,
    image_urls: list[str] | None = None,
    mode: str | None = None,
    width: int = 1152,
    height: int = 768,
    num_frames: int = 121,
    frame_rate: int = 24,
) -> dict[str, Any]:
    """调用 Agnes 视频生成 API，提交任务并轮询等待完成，返回视频 URL。"""
    api_url = f"{settings.AGNES_BASE_URL}/v1/videos"
    headers = {
        "Authorization": f"Bearer {settings.AGNES_API_KEY}",
        "Content-Type": "application/json",
    }

    # ── 构建请求体 ──
    payload: dict[str, Any] = {
        "model": settings.AGNES_VIDEO_MODEL,
        "prompt": prompt,
        "num_frames": num_frames,
        "frame_rate": frame_rate,
    }

    if image_url and not image_urls:
        # 图生视频（单图）
        payload["image"] = image_url
        payload["width"] = width
        payload["height"] = height
    elif image_urls:
        # 多图 / 关键帧
        extra: dict[str, Any] = {"image": image_urls}
        if mode:
            extra["mode"] = mode
        payload["extra_body"] = extra
    else:
        # 文生视频
        payload["width"] = width
        payload["height"] = height

    # ── 提交任务 ──
    logger.info("[Agnes Video] 提交任务: prompt=%s...", prompt[:60])

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(api_url, headers=headers, json=payload)

        if resp.status_code != 200:
            error_text = resp.text
            logger.error("[Agnes Video] 提交失败 %d: %s", resp.status_code, error_text[:200])
            raise RuntimeError(f"Agnes Video API 错误 ({resp.status_code}): {error_text[:200]}")

        task_data = resp.json()

    task_id = task_data.get("task_id") or task_data.get("id", "")
    if not task_id:
        raise RuntimeError("Agnes Video API 未返回 task_id")

    logger.info("[Agnes Video] 任务已提交: %s，开始轮询...", task_id)

    # ── 轮询等待完成 ──
    async with httpx.AsyncClient(timeout=30) as client:
        for i in range(MAX_POLL_COUNT):
            await asyncio.sleep(POLL_INTERVAL)

            poll_url = f"{api_url}/{task_id}"
            poll_resp = await client.get(poll_url, headers=headers)

            if poll_resp.status_code != 200:
                logger.warning("[Agnes Video] 轮询失败 %d，重试...", poll_resp.status_code)
                continue

            status_data = poll_resp.json()
            status = status_data.get("status", "")
            progress = status_data.get("progress", 0)

            logger.info("[Agnes Video] 任务 %s: status=%s progress=%s", task_id, status, progress)

            if status == "completed":
                # 视频 URL 在 remixed_from_video_id 字段
                video_url = (
                    status_data.get("remixed_from_video_id")
                    or status_data.get("video_url")
                    or ""
                )
                if not video_url:
                    raise RuntimeError("Agnes Video 任务完成但未返回视频 URL")
                logger.info("[Agnes Video] 视频生成成功: %s", video_url[:80])
                return {"video_url": video_url}

            if status == "failed":
                error_msg = status_data.get("error", "未知错误")
                raise RuntimeError(f"Agnes Video 任务失败: {error_msg}")

    raise RuntimeError(f"Agnes Video 任务超时（等待 {MAX_POLL_COUNT * POLL_INTERVAL} 秒）")


async def generate_video_with_policy_retry(
    prompt: str,
    *,
    image_url: str | None = None,
    width: int = 1152,
    height: int = 768,
    num_frames: int = 121,
    frame_rate: int = 24,
) -> dict[str, Any]:
    """生成视频；若触发内容审核则自动弱化 prompt 重试一次。"""
    from app.utils.video_prompt import is_content_policy_error, sanitize_video_prompt

    try:
        return await generate_video(
            prompt=prompt,
            image_url=image_url,
            width=width,
            height=height,
            num_frames=num_frames,
            frame_rate=frame_rate,
        )
    except RuntimeError as exc:
        if not is_content_policy_error(exc):
            raise
        sanitized = sanitize_video_prompt(prompt)
        logger.warning("[Agnes Video] 内容审核拦截，使用弱化 prompt 重试")
        return await generate_video(
            prompt=sanitized,
            image_url=image_url,
            width=width,
            height=height,
            num_frames=num_frames,
            frame_rate=frame_rate,
        )
