"""Agnes 视频生成服务 — 文生视频 / 图生视频 / 多图视频 / 关键帧动画。"""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


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
    """调用 Agnes 视频生成 API，返回结果 dict。

    支持 4 种模式：
    - 文生视频：仅传 prompt
    - 图生视频：传 prompt + image_url（单图）
    - 多图视频：传 prompt + image_urls（多图）
    - 关键帧动画：传 prompt + image_urls + mode="keyframes"
    """
    url = f"{settings.AGNES_BASE_URL}/v1/videos"

    payload: dict[str, Any] = {
        "model": settings.AGNES_VIDEO_MODEL,
        "prompt": prompt,
        "num_frames": num_frames,
        "frame_rate": frame_rate,
    }

    # 图生视频（单图）
    if image_url and not image_urls:
        payload["image"] = image_url
        if width:
            payload["width"] = width
        if height:
            payload["height"] = height

    # 多图 / 关键帧（通过 extra_body.image 数组）
    elif image_urls:
        extra: dict[str, Any] = {"image": image_urls}
        if mode:
            extra["mode"] = mode
        payload["extra_body"] = extra
    else:
        # 文生视频
        if width:
            payload["width"] = width
        if height:
            payload["height"] = height

    logger.info("[Agnes Video] 调用: %s (prompt=%s...)", url, prompt[:60])

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.AGNES_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if resp.status_code != 200:
            error_text = resp.text
            logger.error("[Agnes Video] API 错误 %d: %s", resp.status_code, error_text[:200])
            raise RuntimeError(f"Agnes Video API 错误 ({resp.status_code}): {error_text[:200]}")

        data = resp.json()

    # 解析响应（OpenAI 格式：data[0].url 或 data[0].b64_json）
    video_data = data.get("data", [])
    if not video_data:
        raise RuntimeError("Agnes Video API 返回空数据")

    video_url = video_data[0].get("url", "")
    if not video_url:
        b64 = video_data[0].get("b64_json", "")
        if b64:
            raise RuntimeError("Agnes Video API 返回 base64 数据，暂不支持")
        raise RuntimeError("Agnes Video API 返回的数据中无 url 字段")

    logger.info("[Agnes Video] 视频生成成功: %s", video_url[:80])
    return {"video_url": video_url}
