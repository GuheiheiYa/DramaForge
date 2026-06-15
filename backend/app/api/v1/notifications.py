"""通知管理路由 — 对接数据库。"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.database import get_db
from app.models.db_models import Notification
from app.models.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MessageResponse,
)

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user_id: str = "default",
    is_read: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """获取通知列表，支持筛选和分页。"""
    query = select(Notification).where(Notification.user_id == user_id)

    if is_read is not None:
        query = query.where(Notification.is_read == is_read)

    # 统计总数和未读数
    count_query = select(Notification).where(Notification.user_id == user_id)
    total = len(await db.execute(count_query).scalars().all())

    unread_query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False,
    )
    unread_count = len(await db.execute(unread_query).scalars().all())

    # 分页查询
    query = query.order_by(desc(Notification.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    notifications = result.scalars().all()

    return {
        "items": [_notification_to_response(n) for n in notifications],
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/unread-count")
async def get_unread_count(
    user_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """获取未读通知数量。"""
    query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False,
    )
    count = len(await db.execute(query).scalars().all())
    return {"unread_count": count}


@router.post("", response_model=NotificationResponse)
async def create_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建通知。"""
    notification = Notification(
        user_id=data.user_id or "default",
        title=data.title,
        description=data.description or "",
        type=data.type or "info",
        link=data.link or "",
    )
    await db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return _notification_to_response(notification)


@router.put("/{notification_id}/read", response_model=MessageResponse)
async def mark_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
):
    """标记通知为已读。"""
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="通知不存在")

    notification.is_read = True
    await db.commit()
    return MessageResponse(message="已标记为已读")


@router.put("/read-all", response_model=MessageResponse)
async def mark_all_as_read(
    user_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """标记所有通知为已读。"""
    query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False,
    )
    notifications = await db.execute(query).scalars().all()

    for notification in notifications:
        notification.is_read = True

    await db.commit()
    return MessageResponse(message=f"已标记 {len(notifications)} 条通知为已读")


@router.delete("/{notification_id}", response_model=MessageResponse)
async def delete_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
):
    """删除通知。"""
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="通知不存在")

    await db.delete(notification)
    await db.commit()
    return MessageResponse(message="通知已删除")


@router.delete("", response_model=MessageResponse)
async def clear_notifications(
    user_id: str = "default",
    is_read: bool | None = None,
    db: AsyncSession = Depends(get_db),
):
    """清空通知。"""
    query = select(Notification).where(Notification.user_id == user_id)
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)

    notifications = await db.execute(query).scalars().all()
    for notification in notifications:
        await db.delete(notification)

    await db.commit()
    return MessageResponse(message=f"已清空 {len(notifications)} 条通知")


def _notification_to_response(notification: Notification) -> dict:
    """将数据库 Notification 对象转换为响应格式。"""
    # 格式化时间
    created_at_str = ""
    if notification.created_at:
        date = notification.created_at
        now = datetime.now()
        diff_ms = (now - date).total_seconds() * 1000
        diff_min = int(diff_ms / 60000)
        diff_hour = int(diff_ms / 3600000)
        diff_day = int(diff_ms / 86400000)

        if diff_min < 1:
            created_at_str = "刚刚"
        elif diff_min < 60:
            created_at_str = f"{diff_min}分钟前"
        elif diff_hour < 24:
            created_at_str = f"{diff_hour}小时前"
        elif diff_day < 7:
            created_at_str = f"{diff_day}天前"
        else:
            created_at_str = date.strftime("%Y-%m-%d")

    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "title": notification.title,
        "description": notification.description,
        "type": notification.type,
        "is_read": notification.is_read,
        "link": notification.link,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "created_at_str": created_at_str,
    }
