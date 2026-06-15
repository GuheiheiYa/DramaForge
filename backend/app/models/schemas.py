"""Pydantic 数据模型 — 对齐前端 mock 数据结构，所有 ID 使用 UUID。"""

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


class PipelineMode(str, Enum):
    AUTO = "auto"
    CONFIRM = "confirm"
    PREVIEW = "preview"


# ─── 项目 ───

class ProjectCreate(BaseModel):
    """创建项目请求。"""
    name: str = Field(..., min_length=1, max_length=200, description="项目名称")
    type: str = Field(default="漫剧", description="项目类型: 漫剧/短剧")
    description: str = Field(default="", max_length=500, description="项目描述")
    episodes: int = Field(default=8, ge=1, le=100, description="总集数")
    skill_id: str = Field(default="", description="SKILL ID")
    skill_name: str = Field(default="", description="SKILL 名称")


class ProjectUpdate(BaseModel):
    """更新项目请求。"""
    name: str | None = None
    type: str | None = None
    status: str | None = None
    description: str | None = None
    episodes: int | None = None
    current_episode: int | None = None
    progress: int | None = None
    skill_id: str | None = None
    skill_name: str | None = None


class ProjectResponse(BaseModel):
    """项目响应。"""
    id: str
    name: str
    type: str
    status: str
    description: str
    episodes: int
    current_episode: int
    progress: int
    skill_id: str
    skill_name: str
    created_at: datetime
    updated_at: datetime


# ─── 剧本 ───

class ScriptBlockData(BaseModel):
    """剧本块数据 — 对齐前端 ScriptBlock 类型。"""
    id: str = ""
    type: str = Field(default="dialogue", description="块类型: scene/character/emotion/action/sound/transition/dialogue/narration/note")
    content: str = ""
    sort_order: int = 0


class SceneData(BaseModel):
    """场景数据 — 对齐前端 Scene 类型。"""
    id: str = ""
    number: int = 1
    title: str
    location: str = "未指定"
    time_tag: str = "日间"
    summary: str = ""
    blocks: list[ScriptBlockData] = Field(default_factory=list)


class EpisodeData(BaseModel):
    """分集数据 — 对齐前端 Episode 类型。"""
    id: str = ""
    number: int
    title: str
    scenes: list[SceneData] = Field(default_factory=list)


class ScriptCreate(BaseModel):
    """创建剧本请求。"""
    project_id: str = Field(default="default", description="所属项目 ID")
    title: str = Field(..., min_length=1, max_length=200)
    episodes: list[EpisodeData] = Field(default_factory=list)


class ScriptResponse(BaseModel):
    """剧本响应。"""
    id: str
    project_id: str
    title: str
    episodes: list[EpisodeData]
    created_at: datetime
    updated_at: datetime


# ─── 角色 ───

class CharacterAssetData(BaseModel):
    """角色资产数据。"""
    id: str = ""
    type: str = "立绘"
    name: str = ""
    thumbnail: str = ""


class CharacterRelationshipData(BaseModel):
    """角色关系数据。"""
    target_character_id: str = ""
    target_name: str = ""
    relation: str = ""


class CharacterCreate(BaseModel):
    """创建角色请求 — 对齐前端 Character 类型。"""
    project_id: str = Field(default="default", description="所属项目 ID")
    name: str = Field(..., min_length=1, max_length=50)
    role: str = Field(default="配角", description="主角/配角/龙套")
    gender: str = Field(default="", max_length=10)
    age: int = Field(default=0, ge=0)
    description: str = Field(default="", max_length=500)
    personality: str = Field(default="", max_length=300)
    personality_traits: list[str] = Field(default_factory=list, description="性格标签")
    appearance: str = Field(default="", max_length=300)
    costume: str = Field(default="", max_length=300)
    background: str = Field(default="", max_length=500)
    special_setting: str = Field(default="", max_length=300)
    avatar_color: str = Field(default="#A8835F", max_length=20)
    avatar_url: str = Field(default="", max_length=500)
    has_generated_image: bool = Field(default=False)
    assets: list[CharacterAssetData] = Field(default_factory=list)
    relationships: list[CharacterRelationshipData] = Field(default_factory=list)
    scenes: list[str] = Field(default_factory=list, description="出场场景列表")


class CharacterUpdate(BaseModel):
    """更新角色请求。"""
    name: str | None = None
    role: str | None = None
    gender: str | None = None
    age: int | None = None
    description: str | None = None
    personality: str | None = None
    personality_traits: list[str] | None = None
    appearance: str | None = None
    costume: str | None = None
    background: str | None = None
    special_setting: str | None = None
    avatar_color: str | None = None
    avatar_url: str | None = None
    has_generated_image: bool | None = None
    assets: list[CharacterAssetData] | None = None
    relationships: list[CharacterRelationshipData] | None = None
    scenes: list[str] | None = None


class CharacterResponse(BaseModel):
    """角色响应 — 对齐前端 Character 类型。"""
    id: str
    project_id: str
    name: str
    role: str
    gender: str
    age: int
    description: str
    personality: str
    personality_traits: list[str]
    appearance: str
    costume: str
    background: str
    special_setting: str
    avatar_color: str
    avatar_url: str
    has_generated_image: bool
    assets: list[CharacterAssetData]
    relationships: list[CharacterRelationshipData]
    scenes: list[str]
    created_at: datetime
    updated_at: datetime


# ─── 分镜 ───

class ShotCreate(BaseModel):
    """创建分镜请求 — 对齐前端 Shot 类型。"""
    project_id: str = Field(default="default", description="所属项目 ID")
    shot_number: int = Field(default=1, ge=1)
    shot_type: str = Field(default="中景", description="远景/全景/中景/近景/特写")
    duration: int = Field(default=5, ge=1, le=60)
    status: str = Field(default="等待中", description="等待中/生成中/已完成/失败/草稿")
    description: str = Field(default="")
    camera_movement: str = Field(default="固定")
    composition: str = Field(default="")
    lighting: str = Field(default="")
    character_action: str = Field(default="")
    dialogue: str = Field(default="")
    scene_ref: str = Field(default="")
    characters: list[str] = Field(default_factory=list)


class ShotUpdate(BaseModel):
    """更新分镜请求。"""
    shot_number: int | None = None
    shot_type: str | None = None
    duration: int | None = None
    status: str | None = None
    description: str | None = None
    camera_movement: str | None = None
    composition: str | None = None
    lighting: str | None = None
    character_action: str | None = None
    dialogue: str | None = None
    scene_ref: str | None = None
    characters: list[str] | None = None


class ShotResponse(BaseModel):
    """分镜响应 — 对齐前端 Shot 类型。"""
    id: str
    project_id: str
    shot_number: int
    shot_type: str
    duration: int
    status: str
    description: str
    camera_movement: str
    composition: str
    lighting: str
    character_action: str
    dialogue: str
    scene_ref: str
    characters: list[str]
    created_at: datetime
    updated_at: datetime


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

class GenerationTaskCreate(BaseModel):
    """创建生成任务请求。"""
    project_id: str = Field(..., description="项目 ID")
    stage: str = Field(..., description="任务阶段: script/character/storyboard/video/audio/compose")
    skill_id: str = Field(default="", description="使用的 SKILL ID")
    creative_input: str = Field(default="", description="创作描述")


class GenerationTaskResponse(BaseModel):
    """生成任务响应。"""
    task_id: str
    project_id: str
    stage: str
    skill_id: str = ""
    status: str
    progress: int
    detail: str = ""
    result: dict | None = None
    error_message: str = ""
    created_at: str | None = None
    started_at: str | None = None
    completed_at: str | None = None


class GenerationTaskListResponse(BaseModel):
    """生成任务列表响应。"""
    items: list[GenerationTaskResponse]
    total: int
    page: int
    page_size: int


# ─── SKILL ───

class SkillParameterData(BaseModel):
    """SKILL 参数数据。"""
    id: str = ""
    name: str
    type: str = "slider"
    value: str = ""
    min_val: float = 0
    max_val: float = 100
    step: float = 1
    options: list[str] = Field(default_factory=list)
    default_value: str = ""


class SkillReviewData(BaseModel):
    """SKILL 评价数据。"""
    id: str = ""
    user_name: str = ""
    avatar: str = ""
    rating: int = 5
    comment: str = ""
    date: str = ""


class SkillCreate(BaseModel):
    """创建 SKILL 请求。"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    detailed_description: str = Field(default="")
    category: str = Field(default="漫剧", description="漫剧/短剧")
    style: str = Field(default="日系", description="日系/古风/现代/悬疑/甜宠/科幻/喜剧")
    tags: list[str] = Field(default_factory=list)
    cover_image: str = Field(default="", max_length=500)
    version: str = Field(default="v1.0.0", max_length=20)
    author_name: str = Field(default="", max_length=50)
    author_avatar: str = Field(default="", max_length=500)
    is_official: bool = Field(default=False)
    usage_instructions: str = Field(default="")


class SkillUpdate(BaseModel):
    """更新 SKILL 请求。"""
    name: str | None = None
    description: str | None = None
    detailed_description: str | None = None
    category: str | None = None
    style: str | None = None
    tags: list[str] | None = None
    cover_image: str | None = None
    version: str | None = None
    author_name: str | None = None
    author_avatar: str | None = None
    is_official: bool | None = None
    usage_instructions: str | None = None


class SkillResponse(BaseModel):
    """SKILL 响应。"""
    id: str
    name: str
    description: str
    detailed_description: str = ""
    category: str = "漫剧"
    style: str = "日系"
    tags: list[str] = Field(default_factory=list)
    cover_image: str = ""
    version: str = "v1.0.0"
    author_name: str = ""
    author_avatar: str = ""
    download_count: int = 0
    rating: float = 0.0
    review_count: int = 0
    is_official: bool = False
    install_status: str = "not_installed"
    usage_instructions: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None
    parameters: list[SkillParameterData] = Field(default_factory=list)
    reviews: list[SkillReviewData] = Field(default_factory=list)


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


# ─── 素材 ───

class AssetResponse(BaseModel):
    """素材响应。"""
    id: str
    project_id: str
    name: str
    type: str
    file_path: str = ""
    file_size: int = 0
    size_str: str = ""
    mime_type: str = ""
    width: int = 0
    height: int = 0
    duration: float = 0
    duration_str: str = ""
    resolution: str = ""
    thumbnail_path: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssetListResponse(BaseModel):
    """素材列表响应。"""
    items: list[AssetResponse]
    total: int
    page: int
    page_size: int
