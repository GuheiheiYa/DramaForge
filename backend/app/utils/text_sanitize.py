"""文本清理 — 去除无效 Unicode 代理对，避免 Pydantic/JSON 编码失败。"""

import re


def sanitize_unicode(value: str | None) -> str:
    """移除 lone surrogate，保证可 UTF-8 编码。"""
    if not value:
        return ""
    cleaned = "".join(ch for ch in value if not (0xD800 <= ord(ch) <= 0xDFFF))
    return cleaned.strip()


def normalize_project_name(value: str | None, *, max_len: int = 200) -> str:
    """从可能含 Markdown 的文本中提取简短项目名。"""
    text = sanitize_unicode(value)
    if not text:
        return "未命名项目"

    book = re.search(r"[《「【]([^》」】]{1,40})[》」】]", text)
    if book:
        name = book.group(1).strip()
        if name:
            return name[:max_len]

    heading = re.search(r"^#{1,3}\s*(.+?)(?:\r?\n|$)", text, re.MULTILINE)
    if heading:
        name = heading.group(1).strip()
        name = re.sub(r"创作方案$", "", name).strip(" 《》#")
        if name:
            return name[:max_len]

    text = re.sub(
        r"^(帮我|给我|请|麻烦)\s*(做|生成|创作|制作|写|设计)\s*(一个|一部)?\s*",
        "",
        text,
    ).strip()
    if text:
        first_line = text.splitlines()[0].strip()
        return first_line[:max_len] if first_line else text[:max_len]

    return "未命名项目"
