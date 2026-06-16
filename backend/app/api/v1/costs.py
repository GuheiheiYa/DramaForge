"""成本统计路由 — 对接数据库。"""

from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.db_models import CostRecord, Project
from app.models.schemas import (
    CostRecordCreate,
    CostRecordResponse,
    CostProjectSummary,
    CostServiceSummary,
    CostOverallSummary,
    MessageResponse,
)

router = APIRouter()

# 服务颜色映射
SERVICE_COLORS = {
    "deepseek": "#5A7FA8",
    "jimeng": "#A8835F",
    "seedance": "#7A6B8A",
    "kling": "#B85C50",
    "volc_tts": "#5B8C5A",
    "suno": "#C49A3C",
    "mubert": "#F0C05A",
    "other": "#8B847E",
}

# 服务中文名称
SERVICE_LABELS = {
    "deepseek": "DeepSeek LLM",
    "jimeng": "即梦AI（角色）",
    "seedance": "Seedance 视频",
    "kling": "可灵AI 视频",
    "volc_tts": "火山引擎 TTS",
    "suno": "Suno BGM",
    "mubert": "Mubert BGM",
    "other": "其他费用",
}


@router.get("/summary", response_model=CostOverallSummary)
async def get_cost_summary(
    project_id: str | None = None,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """获取成本统计摘要。"""
    # 时间范围
    since = datetime.now() - timedelta(days=days)

    # 基础查询
    query = select(CostRecord).where(CostRecord.created_at >= since)
    if project_id:
        query = query.where(CostRecord.project_id == project_id)

    records = (await db.execute(query)).scalars().all()

    # 总费用
    total_cost = sum(r.amount for r in records)

    # 按项目统计
    project_costs: dict[str, float] = {}
    for r in records:
        project_costs[r.project_id] = project_costs.get(r.project_id, 0) + r.amount

    # 按服务统计
    service_costs: dict[str, dict] = {}
    for r in records:
        if r.service not in service_costs:
            service_costs[r.service] = {
                "service": r.service,
                "label": SERVICE_LABELS.get(r.service, r.service),
                "amount": 0,
                "color": SERVICE_COLORS.get(r.service, "#8B847E"),
                "usage": "",
                "usage_values": [],
            }
        service_costs[r.service]["amount"] += r.amount
        if r.usage_value > 0:
            service_costs[r.service]["usage_values"].append(r.usage_value)

    # 格式化服务统计
    service_summaries = []
    for service, data in service_costs.items():
        total_usage = sum(data["usage_values"])
        unit = ""
        for r in records:
            if r.service == service and r.usage_unit:
                unit = r.usage_unit
                break

        usage_str = ""
        if total_usage > 0:
            if unit == "tokens":
                usage_str = f"{total_usage / 1000:.0f}K tokens"
            elif unit == "张":
                usage_str = f"{total_usage:.0f}张图"
            elif unit == "秒":
                usage_str = f"{total_usage:.0f}秒"
            elif unit == "字":
                usage_str = f"{total_usage:.0f}字"
            elif unit == "首":
                usage_str = f"{total_usage:.0f}首"
            else:
                usage_str = f"{total_usage:.0f}{unit}"

        service_summaries.append({
            "service": data["service"],
            "label": data["label"],
            "amount": data["amount"],
            "color": data["color"],
            "usage": usage_str,
        })

    # 按费用排序
    service_summaries.sort(key=lambda x: x["amount"], reverse=True)

    # 按项目统计详情
    project_summaries = []
    for pid, amount in project_costs.items():
        project = await db.get(Project, pid)
        project_records = [r for r in records if r.project_id == pid]
        episode_count = project.episodes if project else 1
        cost_per_episode = amount / episode_count if episode_count > 0 else amount

        # 项目的服务明细
        project_services = {}
        for r in project_records:
            if r.service not in project_services:
                project_services[r.service] = 0
            project_services[r.service] += r.amount

        breakdown = []
        for service, svc_amount in project_services.items():
            breakdown.append({
                "service": service,
                "label": SERVICE_LABELS.get(service, service),
                "amount": svc_amount,
                "color": SERVICE_COLORS.get(service, "#8B847E"),
                "usage": "",
            })

        project_summaries.append({
            "project_id": pid,
            "project_name": project.name if project else "未知项目",
            "total": amount,
            "episodes": episode_count,
            "cost_per_episode": cost_per_episode,
            "breakdown": breakdown,
        })

    # 按费用排序
    project_summaries.sort(key=lambda x: x["total"], reverse=True)

    return {
        "total_cost": total_cost,
        "project_count": len(project_costs),
        "service_summaries": service_summaries,
        "project_summaries": project_summaries,
    }


@router.post("", response_model=CostRecordResponse)
async def create_cost_record(
    data: CostRecordCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建成本记录（供内部调用）。"""
    record = CostRecord(
        project_id=data.project_id,
        service=data.service,
        task_id=data.task_id or "",
        amount=data.amount,
        usage=data.usage or "",
        usage_value=data.usage_value or 0,
        usage_unit=data.usage_unit or "",
    )
    await db.add(record)
    await db.commit()
    await db.refresh(record)
    return _cost_to_response(record)


@router.get("", response_model=list[CostRecordResponse])
async def list_cost_records(
    project_id: str | None = None,
    service: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """获取成本记录列表。"""
    query = select(CostRecord)

    if project_id:
        query = query.where(CostRecord.project_id == project_id)
    if service:
        query = query.where(CostRecord.service == service)

    query = query.order_by(desc(CostRecord.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    records = (await db.execute(query)).scalars().all()
    return [_cost_to_response(r) for r in records]


def _cost_to_response(record: CostRecord) -> dict:
    """将数据库 CostRecord 对象转换为响应格式。"""
    return {
        "id": record.id,
        "project_id": record.project_id,
        "service": record.service,
        "task_id": record.task_id,
        "amount": record.amount,
        "usage": record.usage,
        "usage_value": record.usage_value,
        "usage_unit": record.usage_unit,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }
