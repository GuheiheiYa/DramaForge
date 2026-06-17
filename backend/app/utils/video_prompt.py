"""视频生成 prompt 构建 — 保证分镜与剧本/角色/风格连贯。"""

from __future__ import annotations


def _character_lookup(character_data: dict | None) -> dict[str, dict]:
    if not character_data:
        return {}
    lookup: dict[str, dict] = {}
    for char in character_data.get("characters", []):
        name = (char.get("name") or "").strip()
        if name:
            lookup[name] = char
    return lookup


def _script_title(script_data: dict | None) -> str:
    if not script_data:
        return ""
    return (script_data.get("title") or script_data.get("name") or "").strip()


def build_video_prompt(
    shot: dict,
    skill_config: dict | None = None,
    *,
    character_data: dict | None = None,
    script_data: dict | None = None,
    shot_index: int = 0,
    prev_shot: dict | None = None,
) -> str:
    """把分镜、剧本、角色与 SKILL 风格合成一条连贯的视频 prompt。"""
    skill_config = skill_config or {}
    parts: list[str] = []

    style = (skill_config.get("prompt") or "").strip()
    if style:
        parts.append(f"Visual style: {style}")

    title = _script_title(script_data)
    if title:
        parts.append(f"Story: {title}")

    scene = (shot.get("scene_title") or shot.get("sceneTitle") or "").strip()
    if scene:
        parts.append(f"Scene: {scene}")

    if shot_index > 0 and prev_shot:
        prev_scene = (prev_shot.get("scene_title") or prev_shot.get("sceneTitle") or "").strip()
        if prev_scene and prev_scene != scene:
            parts.append(f"Continues story flow from previous scene '{prev_scene}' into '{scene or 'next moment'}'")
        else:
            parts.append("Continues seamlessly from the previous shot in the same scene")

    shot_type = (shot.get("shot_type") or shot.get("shotType") or "medium").strip()
    parts.append(f"Camera: {shot_type} shot")

    camera_move = (shot.get("camera_movement") or shot.get("cameraMovement") or "").strip()
    if camera_move:
        parts.append(f"Camera movement: {camera_move}")

    composition = (shot.get("composition") or "").strip()
    if composition:
        parts.append(f"Composition: {composition}")

    lighting = (shot.get("lighting") or "").strip()
    if lighting:
        parts.append(f"Lighting: {lighting}")

    description = (shot.get("description") or "").strip()
    if description:
        parts.append(description)

    action = (shot.get("character_action") or shot.get("characterAction") or "").strip()
    if action:
        parts.append(f"Character action: {action}")

    dialogue = (shot.get("dialogue") or "").strip()
    if dialogue:
        parts.append(f'Dialogue moment: "{dialogue}"')

    char_names = shot.get("characters") or []
    lookup = _character_lookup(character_data)
    for name in char_names:
        char = lookup.get(name)
        if not char:
            continue
        appearance = (char.get("appearance") or "").strip()
        costume = (char.get("costume") or "").strip()
        if appearance or costume:
            detail = ", ".join(filter(None, [appearance, costume and f"wearing {costume}"]))
            parts.append(f"Character {name}: {detail}")

    if not parts:
        parts.append(
            f"{shot_type} anime shot, consistent characters and environment, cinematic continuity"
        )

    parts.append(
        "Same art style, character designs, and color palette across all shots; "
        "no unrelated scenes or random subjects; "
        "family-friendly animated content, no violence, no explicit content"
    )

    return ". ".join(parts)


# 可能触发 Agnes 内容审核的表述（中英文）
_SENSITIVE_PATTERNS: list[tuple[str, str]] = [
    (r"(?i)\b(blood|gore|kill|murder|death|corpse|weapon|gun|knife|sword fight|nude|naked|sexual|sex)\b", "dramatic scene"),
    (r"(流血|杀戮|死亡|尸体|武器|枪|刀|裸体|色情|暴力)", "紧张剧情"),
]

_SAFE_SUFFIX = (
    "Safe for general audience, animated style, no violence, no gore, no explicit content"
)


def sanitize_video_prompt(prompt: str) -> str:
    """弱化可能触发 content_policy_violation 的表述，保留叙事与风格。"""
    import re

    sanitized = re.sub(
        r'Dialogue moment: "[^"]*"',
        "Characters having an emotional conversation",
        prompt,
    )
    for pattern, replacement in _SENSITIVE_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized)
    if _SAFE_SUFFIX not in sanitized:
        sanitized = f"{sanitized}. {_SAFE_SUFFIX}"
    return sanitized


def is_content_policy_error(error: Exception | str) -> bool:
    text = str(error)
    return "content_policy_violation" in text or "无法生成该内容" in text
