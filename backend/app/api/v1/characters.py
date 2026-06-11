"""角色管理路由。"""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.schemas import CharacterCreate, CharacterResponse, MessageResponse

router = APIRouter()

_mock_characters: dict[str, dict] = {
    "char_001": {"id": "char_001", "name": "林小雨", "role": "主角", "description": "能看到别人记忆的转学生", "personality": "内向但正义感强", "appearance": "黑色长发，大眼睛，身材娇小", "has_generated_image": True, "image_url": None, "created_at": datetime.now()},
    "char_002": {"id": "char_002", "name": "陈明", "role": "配角", "description": "表面阳光的学霸", "personality": "开朗但有秘密", "appearance": "短发，高个子，戴眼镜", "has_generated_image": True, "image_url": None, "created_at": datetime.now()},
    "char_003": {"id": "char_003", "name": "王雪", "role": "配角", "description": "小雨的室友", "personality": "温柔善良", "appearance": "马尾辫，圆脸", "has_generated_image": False, "image_url": None, "created_at": datetime.now()},
}


@router.get("", response_model=list[CharacterResponse])
async def list_characters(project_id: str | None = None):
    """获取角色列表。"""
    return list(_mock_characters.values())


@router.post("", response_model=CharacterResponse)
async def create_character(req: CharacterCreate):
    """创建角色。"""
    char_id = f"char_{len(_mock_characters) + 1:03d}"
    char = {
        "id": char_id,
        "name": req.name,
        "role": req.role,
        "description": req.description,
        "personality": req.personality,
        "appearance": req.appearance,
        "has_generated_image": False,
        "image_url": None,
        "created_at": datetime.now(),
    }
    _mock_characters[char_id] = char
    return char


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(character_id: str):
    """获取角色详情。"""
    if character_id not in _mock_characters:
        raise HTTPException(status_code=404, detail="角色不存在")
    return _mock_characters[character_id]


@router.delete("/{character_id}", response_model=MessageResponse)
async def delete_character(character_id: str):
    """删除角色。"""
    if character_id not in _mock_characters:
        raise HTTPException(status_code=404, detail="角色不存在")
    del _mock_characters[character_id]
    return MessageResponse(message=f"角色 {character_id} 已删除")
