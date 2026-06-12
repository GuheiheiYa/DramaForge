"""Pydantic 数据模型定义。"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


# ─── 枚举 ───

class ProjectStatus(str, Enum):
    DRAFT = "草稿"
    IN_PROGRESS = "进行中"
    GENERATING = "生成中"
    REVIEW = "待审核"
    COMPLETED = "已完成"
    FAILED = "失败"


class ProjectType(str, Enum):
    COMIC = "漫剧"
    SHORT = "短剧"


class PipelineStepId(str, Enum):
    SCRIPT = "script"
    CHARACTER = "character"
    STORYBOARD = "storyboard"
    VIDEO = "video"
    AUDIO = "audio"
    COMPOSE = "compose"


class StepStatus(str, Enum):
    WAITING = "waiting"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


class PipelineMode(str, Enum):
    AUTO = "auto"
    CONFIRM = "confirm"
    PREVIEW = "preview"


# ─── 项目 ───

class ProjectCreate(BaseModel):
    """创建项目请求。"""
    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    type: ProjectType = Field(default=ProjectType.COMIC, description="项目类型")
    description: str = Field(default="", max_length=500, description="项目描述")
    episodes: int = Field(default=8, ge=1, le=100, description="集数")
    skill_id: str = Field(default="", description="SKILL ID")


class ProjectResponse(BaseModel):
    """项目响应。"""
    id: str
    name: str
    type: ProjectType
    status: ProjectStatus
    progress: int
    current_episode: int
    total_episodes: int
    skill_name: str
    created_at: datetime
    updated_at: datetime


# ─── 剧本 ───

class SceneData(BaseModel):
    """场景数据。"""
    id: str = ""
    title: str
    summary: str = ""
    location: str = "未指定"
    time_tag: str = "日间"
    dialogue: str = ""


class EpisodeData(BaseModel):
    """分集数据。"""
    id: str = ""
    number: int
    title: str
    scenes: list[SceneData] = []


class ScriptResponse(BaseModel):
    """剧本响应。"""
    id: str
    project_id: str
    title: str
    episodes: list[EpisodeData]
    created_at: datetime
    updated_at: datetime


class ScriptCreate(BaseModel):
    """创建剧本请求。"""
    project_id: str = Field(default="default", description="所属项目 ID")
    title: str = Field(..., min_length=1, max_length=200)
    episodes: list[EpisodeData] = Field(default_factory=list)


# ─── 角色 ───

class CharacterCreate(BaseModel):
    """创建角色请求。"""
    project_id: str = Field(default="default", description="所属项目 ID")
    name: str = Field(..., min_length=1, max_length=50)
    role: str = Field(default="配角", description="主角/配角/龙套")
    gender: str = Field(default="", max_length=10)
    age: int = Field(default=0, ge=0)
    description: str = Field(default="", max_length=500)
    personality: str = Field(default="", max_length=300)
    appearance: str = Field(default="", max_length=300)
    costume: str = Field(default="", max_length=300)
    background: str = Field(default="", max_length=500)
    special_setting: str = Field(default="", max_length=300)
    avatar_color: str = Field(default="#A8835F", max_length=20)


class CharacterResponse(BaseModel):
    """角色响应。"""
    id: str
    project_id: str
    name: str
    role: str
    gender: str
    age: int
    description: str
    personality: str
    appearance: str
    costume: str
    background: str
    special_setting: str
    avatar_color: str
    avatar_url: str
    has_generated_image: bool
    created_at: datetime
    updated_at: datetime


# ─── 分镜 ───

class ShotCreate(BaseModel):
    """创建分镜请求。"""
    episode_number: int
    scene_title: str
    description: str
    shot_type: str = "中景"
    duration: int = Field(default=5, ge=1, le=30)
    camera_movement: str = "固定"
    characters: list[str] = []


class ShotResponse(BaseModel):
    """分镜响应。"""
    id: str
    shot_number: int
    episode_number: int
    scene_title: str
    description: str
    shot_type: str
    duration: int
    camera_movement: str
    status: str
    image_url: str | None = None
    video_url: str | None = None


# ─── Pipeline ───

class PipelineStartRequest(BaseModel):
    """启动 Pipeline 请求。"""
    project_id: str
    creative_input: str = Field(..., min_length=1, description="创作描述")
    mode: PipelineMode = Field(default=PipelineMode.AUTO)
    skill_id: str = Field(default="jp-school")


class PipelineStatusResponse(BaseModel):
    """Pipeline 状态响应。"""
    project_id: str
    status: str
    current_step: int
    steps: list[dict]
    error: dict | None = None


# ─── 生成任务 ───

class GenerationTaskResponse(BaseModel):
    """生成任务响应。"""
    task_id: str
    status: str
    stage: str
    progress: int
    detail: str = ""
    result: dict | None = None


# ─── SKILL ───

class SkillResponse(BaseModel):
    """SKILL 响应。"""
    id: str
    name: str
    type: str
    description: str
    rating: float
    review_count: int
    install_count: int
    config: dict


# ─── 通用 ───

class MessageResponse(BaseModel):
    """通用消息响应。"""
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    """分页响应。"""
    items: list
    total: int
    page: int
    page_size: int
