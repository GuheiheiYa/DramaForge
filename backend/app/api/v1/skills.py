"""SKILL 管理路由 — 对接数据库。"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.db_models import Skill, SkillParameter, SkillReview
from app.models.schemas import SkillResponse, SkillCreate, SkillUpdate, MessageResponse

router = APIRouter()


@router.get("", response_model=list[SkillResponse])
async def list_skills(
    category: str | None = None,
    style: str | None = None,
    db: Session = Depends(get_db),
):
    """获取 SKILL 列表，支持按分类和风格筛选。"""
    query = select(Skill)
    if category:
        query = query.where(Skill.category == category)
    if style:
        query = query.where(Skill.style == style)
    query = query.order_by(Skill.download_count.desc())
    result = db.execute(query)
    skills = result.scalars().all()
    return [_skill_to_response(s) for s in skills]


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(skill_id: str, db: Session = Depends(get_db)):
    """获取 SKILL 详情。"""
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="SKILL 不存在")
    return _skill_to_response(skill)


@router.post("", response_model=SkillResponse)
async def create_skill(data: SkillCreate, db: Session = Depends(get_db)):
    """创建新 SKILL。"""
    skill = Skill(
        name=data.name,
        description=data.description,
        detailed_description=data.detailed_description or "",
        category=data.category or "漫剧",
        style=data.style or "日系",
        tags=data.tags or [],
        cover_image=data.cover_image or "",
        version=data.version or "v1.0.0",
        author_name=data.author_name or "",
        author_avatar=data.author_avatar or "",
        is_official=data.is_official or False,
        usage_instructions=data.usage_instructions or "",
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return _skill_to_response(skill)


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str,
    data: SkillUpdate,
    db: Session = Depends(get_db),
):
    """更新 SKILL 信息。"""
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="SKILL 不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(skill, key, value)

    db.commit()
    db.refresh(skill)
    return _skill_to_response(skill)


@router.delete("/{skill_id}", response_model=MessageResponse)
async def delete_skill(skill_id: str, db: Session = Depends(get_db)):
    """删除 SKILL。"""
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="SKILL 不存在")

    db.delete(skill)
    db.commit()
    return MessageResponse(message=f"SKILL「{skill.name}」已删除")


@router.post("/{skill_id}/install", response_model=MessageResponse)
async def install_skill(skill_id: str, db: Session = Depends(get_db)):
    """安装 SKILL（增加下载次数）。"""
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="SKILL 不存在")

    skill.download_count += 1
    skill.install_status = "installed"
    db.commit()
    return MessageResponse(message=f"SKILL「{skill.name}」安装成功")


@router.post("/{skill_id}/uninstall", response_model=MessageResponse)
async def uninstall_skill(skill_id: str, db: Session = Depends(get_db)):
    """卸载 SKILL。"""
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="SKILL 不存在")

    skill.install_status = "not_installed"
    db.commit()
    return MessageResponse(message=f"SKILL「{skill.name}」已卸载")


@router.post("/{skill_id}/rate", response_model=MessageResponse)
async def rate_skill(
    skill_id: str,
    rating: int,
    comment: str = "",
    user_name: str = "匿名用户",
    db: Session = Depends(get_db),
):
    """评价 SKILL。"""
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="SKILL 不存在")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="评分范围为 1-5")

    # 创建评价记录
    review = SkillReview(
        skill_id=skill_id,
        user_name=user_name,
        rating=rating,
        comment=comment,
    )
    db.add(review)

    # 更新 SKILL 平均评分
    skill.review_count += 1
    skill.rating = ((skill.rating * (skill.review_count - 1)) + rating) / skill.review_count

    db.commit()
    return MessageResponse(message=f"评价成功，当前评分 {skill.rating:.1f}")


def _skill_to_response(skill: Skill) -> dict:
    """将数据库 Skill 对象转换为响应格式。"""
    return {
        "id": skill.id,
        "name": skill.name,
        "description": skill.description,
        "detailed_description": skill.detailed_description,
        "category": skill.category,
        "style": skill.style,
        "tags": skill.tags or [],
        "cover_image": skill.cover_image,
        "version": skill.version,
        "author_name": skill.author_name,
        "author_avatar": skill.author_avatar,
        "download_count": skill.download_count,
        "rating": skill.rating,
        "review_count": skill.review_count,
        "is_official": skill.is_official,
        "install_status": skill.install_status,
        "usage_instructions": skill.usage_instructions,
        "created_at": skill.created_at.isoformat() if skill.created_at else None,
        "updated_at": skill.updated_at.isoformat() if skill.updated_at else None,
        "parameters": [
            {
                "id": p.id,
                "name": p.name,
                "type": p.type,
                "value": p.value,
                "min_val": p.min_val,
                "max_val": p.max_val,
                "step": p.step,
                "options": p.options or [],
                "default_value": p.default_value,
            }
            for p in (skill.parameters or [])
        ],
        "reviews": [
            {
                "id": r.id,
                "user_name": r.user_name,
                "avatar": r.avatar,
                "rating": r.rating,
                "comment": r.comment,
                "date": r.date,
            }
            for r in (skill.reviews or [])
        ],
    }
