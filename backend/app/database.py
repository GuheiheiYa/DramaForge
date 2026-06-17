"""SQLite 数据库引擎和会话管理。"""

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 异步引擎（WAL + busy_timeout 避免 Pipeline 长任务阻塞其他 API 读请求）
engine = create_async_engine(
    settings.SQLITE_URL,
    echo=settings.DEBUG,
    connect_args={"timeout": 30, "check_same_thread": False},
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# 异步会话工厂
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """ORM 声明基类。"""
    pass


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：获取数据库会话。"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """创建所有表（仅首次运行时生效），并应用轻量 schema 补丁。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA busy_timeout=30000"))
        await _apply_schema_patches(conn)


async def _apply_schema_patches(conn) -> None:
    """SQLite create_all 不会 ALTER 已有表，在此补齐新增列。"""
    result = await conn.execute(text("PRAGMA table_info(timeline_clips)"))
    timeline_cols = {row[1] for row in result.fetchall()}
    if timeline_cols and "media_url" not in timeline_cols:
        await conn.execute(
            text("ALTER TABLE timeline_clips ADD COLUMN media_url VARCHAR(500) DEFAULT ''")
        )
