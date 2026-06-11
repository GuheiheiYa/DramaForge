"""SKILL 管理路由。"""

from fastapi import APIRouter

from app.models.schemas import SkillResponse

router = APIRouter()

_mock_skills: list[dict] = [
    {"id": "jp-school", "name": "日式校园漫剧", "type": "漫剧", "description": "青春校园、恋爱、友情", "rating": 4.8, "review_count": 128, "install_count": 1560, "config": {"prompt_template": "日式校园漫剧风格，对话简洁有力，情绪表达夸张", "video_model": "seedance", "visual_style": "anime"}},
    {"id": "urban", "name": "都市逆袭短剧", "type": "短剧", "description": "职场、逆袭、爽文", "rating": 4.6, "review_count": 89, "install_count": 980, "config": {"prompt_template": "都市逆袭短剧，节奏紧凑，反转密集", "video_model": "kling", "visual_style": "realistic"}},
    {"id": "xianxia", "name": "古风仙侠漫剧", "type": "漫剧", "description": "修仙、江湖、情缘", "rating": 4.7, "review_count": 156, "install_count": 1230, "config": {"prompt_template": "古风仙侠漫剧，意境深远，画面唯美", "video_model": "seedance", "visual_style": "chinese_fantasy"}},
    {"id": "suspense", "name": "悬疑惊悚短剧", "type": "短剧", "description": "悬疑、推理、惊悚", "rating": 4.5, "review_count": 67, "install_count": 750, "config": {"prompt_template": "悬疑惊悚短剧，氛围压抑，节奏紧张", "video_model": "kling", "visual_style": "dark"}},
]


@router.get("", response_model=list[SkillResponse])
async def list_skills(type: str | None = None):
    """获取 SKILL 列表。"""
    results = _mock_skills
    if type:
        results = [s for s in results if s["type"] == type]
    return results


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(skill_id: str):
    """获取 SKILL 详情。"""
    for s in _mock_skills:
        if s["id"] == skill_id:
            return s
    return {"detail": "SKILL 不存在"}
