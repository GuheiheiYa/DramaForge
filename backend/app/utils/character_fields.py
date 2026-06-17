"""角色字段规范化 — 兼容 Pipeline / LLM 写入的非标准值。"""

import re


def normalize_age(value) -> int:
    """将年龄规范为 >= 0 的整数。无法解析时返回 0。"""
    if value is None:
        return 0
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return max(0, value)
    if isinstance(value, float):
        return max(0, int(value))

    text = str(value).strip()
    if not text or text.upper() == "N/A":
        return 0

    match = re.search(r"\d+", text)
    if match:
        return max(0, int(match.group()))

    return 0
