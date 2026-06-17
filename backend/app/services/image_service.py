"""Agnes 图像生成服务 — 角色立绘生成。"""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


# ─── 角色特征 → 英文描述映射 ───

_GENDER_MAP = {"男": "male", "女": "female", "其他": "other"}
_ROLE_MAP = {"主角": "main character", "配角": "supporting character", "龙套": "minor character"}

# 同一项目所有角色立绘共用的画面规格（保证构图与画风基底一致）
_PORTRAIT_FORMAT = (
    "character portrait, full body standing pose, facing viewer, "
    "plain neutral background, no scenery, no text, no watermark"
)

_CONSISTENCY_SUFFIX = (
    "consistent series art style, unified line art weight, unified color palette, "
    "same illustration technique across all characters in this project"
)


def build_unified_style_block(skill_prompt: str = "") -> str:
    """把 SKILL 风格与统一立绘规格合并为所有角色共用的风格块。"""
    parts: list[str] = []
    if skill_prompt.strip():
        parts.append(f"Art direction: {skill_prompt.strip()}")
    parts.append(_PORTRAIT_FORMAT)
    parts.append(_CONSISTENCY_SUFFIX)
    return ". ".join(parts)


def _build_prompt(character_info: dict) -> str:
    """根据角色信息构建英文图像生成 prompt。"""
    parts: list[str] = []

    if character_info.get("style_reference_url"):
        parts.append(
            "Create a NEW character in the EXACT same art style, line weight, "
            "coloring technique and visual aesthetic as the reference image"
        )

    name = (character_info.get("name") or "").strip()
    if name:
        parts.append(f"Character name: {name}")

    gender = _GENDER_MAP.get(character_info.get("gender", ""), "person")
    age = character_info.get("age", 0)
    role = _ROLE_MAP.get(character_info.get("role", ""), "character")
    age_desc = f"{age}-year-old" if isinstance(age, int) and age > 0 else ""
    parts.append(f"Portrait of a {age_desc} {gender} {role}".strip())

    appearance = character_info.get("appearance", "")
    if appearance:
        parts.append(appearance)

    costume = character_info.get("costume", "")
    if costume:
        parts.append(f"wearing {costume}")

    personality = character_info.get("personality", "")
    if personality:
        parts.append(f"personality: {personality}")

    traits = character_info.get("personality_traits", [])
    if traits:
        trait_desc = ", ".join(traits[:3])
        parts.append(f"with {trait_desc} expression and demeanor")

    description = character_info.get("description", "")
    if description:
        parts.append(description)

    background = character_info.get("background", "")
    if background:
        parts.append(f"background atmosphere: {background}")

    special_setting = character_info.get("special_setting", "")
    if special_setting:
        parts.append(f"special elements: {special_setting}")

    style_prompt = character_info.get("style_prompt", "").strip()
    if style_prompt:
        parts.append(style_prompt)
    else:
        parts.append("anime illustration style, detailed, high quality, soft lighting")

    prompt = ", ".join(parts)
    logger.info("[Agnes] 构建 prompt: %s", prompt[:120])
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
    style_ref = character_info.get("style_reference_url")
    return await generate_image(prompt, size="1024x1024", image_url=style_ref)


async def generate_character_portraits(
    characters: list[dict[str, Any]],
    style_prompt: str = "",
) -> list[dict[str, Any]]:
    """批量生成立绘：共用 SKILL 风格块，并以首张成功立绘作为后续角色的风格参考。"""
    if not characters:
        return characters

    unified_style = build_unified_style_block(style_prompt)
    style_reference_url: str | None = None

    for index, char in enumerate(characters):
        char_name = char.get("name") or f"角色{index + 1}"
        char_info = {
            **char,
            "style_prompt": unified_style,
            "style_reference_url": style_reference_url,
        }
        try:
            used_style_ref = style_reference_url is not None
            image_url = await generate_character_image(char_info)
            char["avatarUrl"] = image_url
            char["avatar_url"] = image_url
            char["hasGeneratedImage"] = True
            char["has_generated_image"] = True
            char["assets"] = [{
                "id": f"portrait_{index + 1}",
                "type": "立绘",
                "name": f"{char_name}立绘",
                "thumbnail": image_url,
            }]
            if style_reference_url is None:
                style_reference_url = image_url
            logger.info(
                "[Agnes] 角色 %s 立绘生成成功（图生图风格参考=%s）",
                char_name,
                used_style_ref,
            )
        except Exception as exc:
            logger.warning("[Agnes] 角色 %s 立绘生成失败: %s", char_name, exc)
            char["avatarUrl"] = ""
            char["avatar_url"] = ""
            char["hasGeneratedImage"] = False
            char["has_generated_image"] = False
            char.setdefault("assets", [])

    return characters
