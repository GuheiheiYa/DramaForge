"""应用配置管理。"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置项。"""

    # 基础配置
    APP_NAME: str = "DramaForge API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dramaforge"
    SQLITE_URL: str = "sqlite+aiosqlite:///./dramaforge.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # AI API Keys（通过 .env 文件配置，键名加 APP_ 前缀避免系统环境变量冲突）
    APP_MIMO_API_KEY: str = ""
    MIMO_BASE_URL: str = "https://token-plan-cn.xiaomimimo.com/v1"

    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"

    CLAUDE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # 即梦AI
    JIMENG_API_KEY: str = ""
    JIMENG_BASE_URL: str = ""

    # 可灵AI
    KLING_API_KEY: str = ""

    # Agnes 图像生成（通过 .env 文件配置）
    AGNES_API_KEY: str = ""
    AGNES_BASE_URL: str = "https://apihub.agnes-ai.com"
    AGNES_MODEL: str = "agnes-image-2.1-flash"

    # Agnes 视频生成
    AGNES_VIDEO_MODEL: str = "agnes-video-v2.0"

    # 火山引擎TTS
    VOLC_TTS_APP_ID: str = ""
    VOLC_TTS_ACCESS_TOKEN: str = ""

    # 文件存储
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
