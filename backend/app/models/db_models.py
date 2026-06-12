"""数据库 ORM 模型 — 基于前端 mock 数据结构重建，所有 ID 使用 UUID。"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Text, Boolean, DateTime, ForeignKey, JSON, Float
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid(prefix: str = "") -> str:
    """生成 UUID 格式 ID，可选前缀。"""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class Project(Base):
    """项目表 — 一个项目包含剧本、角色、分镜等所有数据。"""
    __tablename__ = "projects"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("proj_"))
    name = Column(String(200), nullable=False, comment="项目名称")
    type = Column(String(20), default="漫剧", comment="项目类型: 漫剧/短剧")
    status = Column(String(20), default="草稿", comment="状态: 草稿/进行中/生成中/待审核/已完成/失败")
    description = Column(Text, default="", comment="项目描述")
    episodes = Column(Integer, default=8, comment="总集数")
    current_episode = Column(Integer, default=1, comment="当前进度集数")
    skill_id = Column(String(50), default="", comment="关联的 SKILL ID")
    skill_name = Column(String(100), default="", comment="SKILL 名称")
    progress = Column(Integer, default=0, comment="整体进度 0-100")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    # 关联
    scripts = relationship("Script", back_populates="project", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")
    shots = relationship("StoryboardShot", back_populates="project", cascade="all, delete-orphan")


class Script(Base):
    """剧本表 — 一个项目对应一个剧本。"""
    __tablename__ = "scripts"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("scr_"))
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False, comment="剧本标题")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    project = relationship("Project", back_populates="scripts")
    episodes = relationship("Episode", back_populates="script", cascade="all, delete-orphan")


class Episode(Base):
    """分集表 — 一个剧本包含多集。"""
    __tablename__ = "episodes"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("ep_"))
    script_id = Column(String(32), ForeignKey("scripts.id", ondelete="CASCADE"), nullable=False)
    number = Column(Integer, nullable=False, comment="集数编号")
    title = Column(String(200), nullable=False, comment="集标题")

    script = relationship("Script", back_populates="episodes")
    scenes = relationship("Scene", back_populates="episode", cascade="all, delete-orphan")


class Scene(Base):
    """场景表 — 一集包含多个场景。"""
    __tablename__ = "scenes"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("sc_"))
    episode_id = Column(String(32), ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)
    number = Column(Integer, nullable=False, comment="场景序号")
    title = Column(String(200), nullable=False, comment="场景标题")
    location = Column(String(100), default="未指定", comment="地点")
    time_tag = Column(String(50), default="日间", comment="时间标签: 日间/夜晚/清晨等")
    summary = Column(Text, default="", comment="场景摘要")

    episode = relationship("Episode", back_populates="scenes")
    blocks = relationship("ScriptBlock", back_populates="scene", cascade="all, delete-orphan")


class ScriptBlock(Base):
    """剧本块表 — 编辑器中的内容块（对话/动作/旁白等）。"""
    __tablename__ = "script_blocks"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("blk_"))
    scene_id = Column(String(32), ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False, comment="块类型: scene/character/emotion/action/sound/transition/dialogue/narration/note")
    content = Column(Text, default="", comment="块内容")
    sort_order = Column(Integer, default=0, comment="排序序号")

    scene = relationship("Scene", back_populates="blocks")


class Character(Base):
    """角色表 — 一个项目包含多个角色。字段对齐前端 character/types.ts。"""
    __tablename__ = "characters"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("char_"))
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False, comment="角色名")
    role = Column(String(10), default="配角", comment="角色类型: 主角/配角/龙套")
    gender = Column(String(10), default="", comment="性别: 男/女/其他")
    age = Column(Integer, default=0, comment="年龄")
    description = Column(Text, default="", comment="角色描述")
    personality = Column(Text, default="", comment="性格描述")
    personality_traits = Column(JSON, default=list, comment="性格标签列表, 如 ['温柔','坚强']")
    appearance = Column(Text, default="", comment="外貌描述")
    costume = Column(Text, default="", comment="服装描述")
    background = Column(Text, default="", comment="背景故事")
    special_setting = Column(Text, default="", comment="特殊设定")
    avatar_color = Column(String(20), default="#A8835F", comment="头像背景色 HEX")
    avatar_url = Column(String(500), default="", comment="头像图片 URL")
    has_generated_image = Column(Boolean, default=False, comment="是否已生成立绘")
    assets_json = Column(JSON, default=list, comment="资产列表 JSON: [{id, type, name, thumbnail}]")
    relationships_json = Column(JSON, default=list, comment="关系列表 JSON: [{targetCharacterId, targetName, relation}]")
    scenes_json = Column(JSON, default=list, comment="出场场景列表 JSON: ['场景名1', '场景名2']")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    project = relationship("Project", back_populates="characters")


class StoryboardShot(Base):
    """分镜表 — 一个项目包含多个分镜。字段对齐前端 storyboard/types.ts。"""
    __tablename__ = "storyboard_shots"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("shot_"))
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    shot_number = Column(Integer, nullable=False, comment="镜头编号")
    shot_type = Column(String(20), default="中景", comment="镜头类型: 远景/全景/中景/近景/特写")
    duration = Column(Integer, default=5, comment="时长(秒)")
    status = Column(String(20), default="等待中", comment="状态: 等待中/生成中/已完成/失败/草稿")
    description = Column(Text, default="", comment="镜头描述")
    camera_movement = Column(String(50), default="固定", comment="运镜: 固定/推进/拉远/左移/右移/跟拍")
    composition = Column(String(100), default="", comment="构图说明")
    lighting = Column(String(100), default="", comment="灯光说明")
    character_action = Column(Text, default="", comment="角色动作")
    dialogue = Column(Text, default="", comment="对白")
    scene_ref = Column(String(100), default="", comment="关联场景名")
    characters = Column(JSON, default=list, comment="出场角色名列表 JSON")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    project = relationship("Project", back_populates="shots")


class Skill(Base):
    """技能/风格包表 — 对齐前端 skill/types.ts。"""
    __tablename__ = "skills"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("skill_"))
    name = Column(String(100), nullable=False, comment="技能名称")
    description = Column(Text, default="", comment="简短描述")
    detailed_description = Column(Text, default="", comment="详细描述")
    category = Column(String(20), default="漫剧", comment="分类: 漫剧/短剧")
    style = Column(String(20), default="日系", comment="风格: 日系/古风/现代/悬疑/甜宠/科幻/喜剧")
    tags = Column(JSON, default=list, comment="标签列表 JSON")
    cover_image = Column(String(500), default="", comment="封面图 URL")
    version = Column(String(20), default="v1.0.0", comment="版本号")
    author_name = Column(String(50), default="", comment="作者名")
    author_avatar = Column(String(500), default="", comment="作者头像 URL")
    download_count = Column(Integer, default=0, comment="下载次数")
    rating = Column(Float, default=0.0, comment="评分 0-5")
    review_count = Column(Integer, default=0, comment="评价数")
    is_official = Column(Boolean, default=False, comment="是否官方")
    install_status = Column(String(20), default="not_installed", comment="安装状态: installed/not_installed/installing")
    usage_instructions = Column(Text, default="", comment="使用说明")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    parameters = relationship("SkillParameter", back_populates="skill", cascade="all, delete-orphan")
    reviews = relationship("SkillReview", back_populates="skill", cascade="all, delete-orphan")


class SkillParameter(Base):
    """技能参数表 — 可调参数（滑块/选择器/开关）。"""
    __tablename__ = "skill_parameters"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("param_"))
    skill_id = Column(String(32), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False, comment="参数名")
    type = Column(String(20), default="slider", comment="类型: slider/select/toggle")
    value = Column(String(100), default="", comment="当前值")
    min_val = Column(Float, default=0, comment="最小值")
    max_val = Column(Float, default=100, comment="最大值")
    step = Column(Float, default=1, comment="步长")
    options = Column(JSON, default=list, comment="选项列表 JSON（select 类型）")
    default_value = Column(String(100), default="", comment="默认值")

    skill = relationship("Skill", back_populates="parameters")


class SkillReview(Base):
    """技能评价表。"""
    __tablename__ = "skill_reviews"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("rev_"))
    skill_id = Column(String(32), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String(50), default="", comment="用户名")
    avatar = Column(String(500), default="", comment="用户头像 URL")
    rating = Column(Integer, default=5, comment="评分 1-5")
    comment = Column(Text, default="", comment="评价内容")
    date = Column(String(20), default="", comment="评价日期 YYYY-MM-DD")

    skill = relationship("Skill", back_populates="reviews")


class TimelineClip(Base):
    """时间轴片段表 — 合成室的视频/音频/BGM 片段。"""
    __tablename__ = "timeline_clips"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("clip_"))
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False, comment="片段名称")
    track_type = Column(String(20), default="video", comment="轨道类型: video/audio/bgm/subtitle")
    start_time = Column(Float, default=0, comment="开始时间(秒)")
    duration = Column(Float, default=5, comment="时长(秒)")
    status = Column(String(20), default="ready", comment="状态: ready/generating/error")
    shot_ref = Column(String(50), default="", comment="关联分镜引用")
    color = Column(String(20), default="", comment="显示颜色 HEX")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class SubtitleSegment(Base):
    """字幕段表 — 合成室的字幕内容。"""
    __tablename__ = "subtitle_segments"

    id = Column(String(32), primary_key=True, default=lambda: gen_uuid("sub_"))
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, default="", comment="字幕文本")
    start_time = Column(Float, default=0, comment="开始时间(秒)")
    duration = Column(Float, default=3, comment="时长(秒)")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
