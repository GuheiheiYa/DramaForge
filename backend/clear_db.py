"""清空数据库所有业务数据（保留表结构）。"""

import asyncio

from sqlalchemy import text

from app.database import engine, init_db


async def clear_all_data() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys=OFF"))
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        )
        tables = [row[0] for row in result.fetchall()]
        for table in reversed(tables):
            await conn.execute(text(f'DELETE FROM "{table}"'))


async def main() -> None:
    await init_db()
    await clear_all_data()
    print("数据库已清空（表结构保留）")


if __name__ == "__main__":
    asyncio.run(main())
