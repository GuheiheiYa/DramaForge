"""DramaForge 后端统一启动入口（端口见 app.config.settings.API_PORT）。"""

import uvicorn

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        # reload 会 spawn 子进程，异常退出时易留下僵尸 worker 占端口
        reload=False,
    )
