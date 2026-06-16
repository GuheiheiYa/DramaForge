"""Agnes 图像生成服务 — 角色立绘生成。"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


# ─── 角色特征 → 英文描述映射 ───

_GENDER_MAP = {"男": "male", "女": "female", "其他": "other"}
_ROLE_MAP = {"主角": "main character", "配角": "supporting character", "龙套": "minor character"}
_HAIR_STYLE = {
    "长发": "long hair",
    "短发": "short hair",
    "马尾": "ponytail",
    "双马尾": "twin tails",
    "披肩发": "shoulder-length hair",
    "盘发": "updo hairstyle",
}


def _build_prompt(character_info: dict) -> str:
    """根据角色信息构建英文图像生成 prompt。

    使用 Agnes 推荐格式：
    [修改要求] + [新风格/新场景] + [需要添加或移除的元素] + [需要保留的元素]
    """
    parts: list[str] = []

    # 基础人物描述
    gender = _GENDER_MAP.get(character_info.get("gender", ""), "person")
    age = character_info.get("age", 0)
    role = _ROLE_MAP.get(character_info.get("role", ""), "character")

    age_desc = f"{age}-year-old" if age > 0 else ""
    parts.append(f"Portrait of a {age_desc} {gender} {role}")

    # 外貌描述（保留的核心元素）
    appearance = character_info.get("appearance", "")
    if appearance:
        parts.append(appearance)

    # 服装描述（需要保留的元素）
    costume = character_info.get("costume", "")
    if costume:
        parts.append(f"wearing {costume}")

    # 性格描述（影响表情和姿态）
    personality = character_info.get("personality", "")
    if personality:
        parts.append(f"personality: {personality}")

    # 性格标签
    traits = character_info.get("personality_traits", [])
    if traits:
        trait_desc = ", ".join(traits[:3])
        parts.append(f"with {trait_desc} expression and demeanor")

    # 描述补充
    description = character_info.get("description", "")
    if description:
        parts.append(description)

    # 背景故事（影响氛围和场景）
    background = character_info.get("background", "")
    if background:
        parts.append(f"background atmosphere: {background}")

    # 特殊设定（如有，作为额外视觉元素）
    special_setting = character_info.get("special_setting", "")
    if special_setting:
        parts.append(f"special elements: {special_setting}")

    # 风格指令
    parts.append("anime illustration style, full body, detailed, high quality, soft lighting")

    prompt = ", ".join(parts)
    logger.info("[Agnes] 构建 prompt: %s", prompt[:100])
    return prompt


async def generate_image(prompt: str, size: str = "1024x1024", image_url: str | None = None) -> str:
    """通用图片生成 — 支持文生图和图生图。

    Args:
        prompt: 文本描述。
        size: 图片尺寸。
        image_url: 参考图片 URL（图生图模式），为 None 时为文生图。
    """
    url = f"{settings.AGNES_BASE_URL}/v1/images/generations"
    payload: dict = {
        "model": settings.AGNES_MODEL,
        "prompt": prompt,
        "size": size,
    }

    # 图生图：通过 extra_body.image 传入参考图
    if image_url:
        payload["extra_body"] = {"image": [image_url]}

    logger.info("[Agnes] 调用图像生成: %s (mode=%s, prompt=%s...)", url, "图生图" if image_url else "文生图", prompt[:60])

    async with httpx.AsyncClient(timeout=60) as client:
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
            logger.error("[Agnes] API 错误 %d: %s", resp.status_code, error_text[:200])
            raise RuntimeError(f"Agnes API 错误 ({resp.status_code}): {error_text[:200]}")

        data = resp.json()

    image_data = data.get("data", [])
    if not image_data:
        raise RuntimeError("Agnes API 返回空数据")

    image_url = image_data[0].get("url", "")
    if not image_url:
        b64 = image_data[0].get("b64_json", "")
        if b64:
            raise RuntimeError("Agnes API 返回 base64 数据，暂不支持")
        raise RuntimeError("Agnes API 返回的数据中无 url 字段")

    logger.info("[Agnes] 图像生成成功: %s", image_url[:80])
    return image_url


async def generate_character_image(character_info: dict) -> str:
    """根据角色信息生成形象图片 — 自动构建 prompt 后调用 generate_image。"""
    prompt = _build_prompt(character_info)
    return await generate_image(prompt)
