"""FastAPI 应用入口。"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import projects, scripts, characters, storyboards, generation, skills, pipeline, assets
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理。"""
    # 启动时
    print(f"[START] {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    print("[DB] SQLite 数据库已初始化")
    yield
    # 关闭时
    print(f"[STOP] {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI漫剧/短剧一站式生成平台 API",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(projects.router, prefix="/api/v1/projects", tags=["项目管理"])
app.include_router(scripts.router, prefix="/api/v1/scripts", tags=["剧本管理"])
app.include_router(characters.router, prefix="/api/v1/characters", tags=["角色管理"])
app.include_router(storyboards.router, prefix="/api/v1/storyboards", tags=["分镜管理"])
app.include_router(generation.router, prefix="/api/v1/generation", tags=["生成任务"])
app.include_router(skills.router, prefix="/api/v1/skills", tags=["SKILL管理"])
app.include_router(pipeline.router, prefix="/api/v1/pipeline", tags=["Pipeline"])
app.include_router(assets.router, prefix="/api/v1/assets", tags=["素材管理"])


@app.get("/", tags=["健康检查"])
async def root():
    """健康检查接口。"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["健康检查"])
async def health():
    """详细健康状态。"""
    return {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "up",  # TODO: 实际检查
            "redis": "up",     # TODO: 实际检查
        },
    }
