"""
SQLAlchemy ORM 模型 — DramaForge 核心数据表。

表结构：
- projects     项目表（一个漫剧/短剧项目）
- scripts      剧本表（一个项目对应一个剧本）
- episodes     分集表（一个剧本包含多集）
- scenes       场景表（一集包含多个场景）
- script_blocks 剧本块表（编辑器中的段落单元）
- characters   角色表（一个项目包含多个角色）
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


# ─────────────────────────────────────────────
# 项目表
# ─────────────────────────────────────────────

class Project(Base):
    """
    项目表 — 一个漫剧/短剧项目。

    字段说明：
    - id:          项目唯一标识（如 proj_a1b2c3d4）
    - name:        项目名称（如 "《樱花下的约定》第1季"）
    - type:        项目类型（漫剧 / 短剧）
    - status:      项目状态（草稿 / 进行中 / 生成中 / 待审核 / 已完成 / 失败）
    - description: 项目描述
    - episodes:    总集数
    - skill_id:    使用的 SKILL ID
    - created_at:  创建时间
    - updated_at:  最后更新时间
    """
    __tablename__ = "projects"

    id = Column(String(32), primary_key=True, comment="项目唯一标识")
    name = Column(String(200), nullable=False, comment="项目名称")
    type = Column(String(20), default="漫剧", comment="项目类型：漫剧/短剧")
    status = Column(String(20), default="草稿", comment="项目状态")
    description = Column(Text, default="", comment="项目描述")
    episodes = Column(Integer, default=8, comment="总集数")
    skill_id = Column(String(50), default="", comment="使用的 SKILL ID")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="最后更新时间")

    script = relationship("Script", back_populates="project", uselist=False, cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# 剧本相关表
# ─────────────────────────────────────────────

class Script(Base):
    """
    剧本表 — 一个项目对应一个剧本。

    字段说明：
    - id:          剧本唯一标识（如 scr_a1b2c3d4）
    - project_id:  所属项目 ID（外键）
    - title:       剧本标题（如 "《樱花下的约定》"）
    - created_at:  创建时间
    - updated_at:  最后更新时间
    """
    __tablename__ = "scripts"

    id = Column(String(32), primary_key=True, comment="剧本唯一标识")
    project_id = Column(String(32), ForeignKey("projects.id"), index=True, nullable=False, comment="所属项目 ID")
    title = Column(String(200), nullable=False, comment="剧本标题")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="最后更新时间")

    project = relationship("Project", back_populates="script")
    episodes = relationship("Episode", back_populates="script", cascade="all, delete-orphan")


class Episode(Base):
    """
    分集表 — 一个剧本包含多集。

    字段说明：
    - id:         分集唯一标识（如 ep_a1b2c3d4）
    - script_id:  所属剧本 ID（外键）
    - number:     集数序号（1, 2, 3...）
    - title:      集标题（如 "初遇的樱花"）
    """
    __tablename__ = "episodes"

    id = Column(String(32), primary_key=True, comment="分集唯一标识")
    script_id = Column(String(32), ForeignKey("scripts.id"), nullable=False, comment="所属剧本 ID")
    number = Column(Integer, nullable=False, comment="集数序号")
    title = Column(String(200), nullable=False, comment="集标题")

    script = relationship("Script", back_populates="episodes")
    scenes = relationship("Scene", back_populates="episode", cascade="all, delete-orphan")


class Scene(Base):
    """
    场景表 — 一集包含多个场景。

    字段说明：
    - id:          场景唯一标识（如 sc_a1b2c3d4）
    - episode_id:  所属分集 ID（外键）
    - number:      场景序号（1, 2, 3...）
    - title:       场景标题（如 "教室·日"）
    - summary:     场景概要（简短描述场景内容）
    - location:    场景地点（如 "教室"、"走廊"、"樱花树下"）
    - time_tag:    时间标签（如 "日内"、"傍晚外"、"夜内"）
    """
    __tablename__ = "scenes"

    id = Column(String(32), primary_key=True, comment="场景唯一标识")
    episode_id = Column(String(32), ForeignKey("episodes.id"), nullable=False, comment="所属分集 ID")
    number = Column(Integer, nullable=False, comment="场景序号")
    title = Column(String(200), nullable=False, comment="场景标题")
    summary = Column(Text, default="", comment="场景概要")
    location = Column(String(100), default="未指定", comment="场景地点")
    time_tag = Column(String(50), default="日间", comment="时间标签")

    episode = relationship("Episode", back_populates="scenes")


class ScriptBlock(Base):
    """
    剧本块表 — 编辑器中的段落单元。

    字段说明：
    - id:          块唯一标识（如 blk_a1b2c3d4）
    - scene_id:    所属场景 ID（外键，可为空表示全局块）
    - type:        块类型（scene/character/emotion/action/sound/transition/dialogue/narration/note）
    - content:     块内容（富文本）
    - sort_order:  排序序号
    """
    __tablename__ = "script_blocks"

    id = Column(String(32), primary_key=True, comment="块唯一标识")
    scene_id = Column(String(32), ForeignKey("scenes.id"), nullable=True, comment="所属场景 ID")
    type = Column(String(20), nullable=False, comment="块类型")
    content = Column(Text, default="", comment="块内容")
    sort_order = Column(Integer, default=0, comment="排序序号")


# ─────────────────────────────────────────────
# 角色表
# ─────────────────────────────────────────────

class Character(Base):
    """
    角色表 — 一个项目包含多个角色。

    字段说明：
    - id:               角色唯一标识（如 char_a1b2c3d4）
    - project_id:       所属项目 ID（外键）
    - name:             角色名称（如 "林晓"）
    - role:             角色类型（主角 / 配角 / 龙套）
    - gender:           性别（男 / 女 / 其他）
    - age:              年龄
    - description:      角色描述（简短介绍）
    - personality:      性格描述
    - personality_traits: 性格标签（JSON 数组，如 ["内向","敏感","善良"]）
    - appearance:       外貌描述
    - costume:          服装描述
    - background:       背景故事
    - special_setting:  特殊设定
    - avatar_color:     头像颜色（十六进制，如 #A8835F）
    - avatar_url:       头像图片 URL
    - has_generated_image: 是否已生成立绘
    - assets_json:      素材列表（JSON，如 [{"id":"a1","type":"立绘","name":"标准立绘"}]）
    - relationships_json: 人物关系（JSON，如 [{"targetName":"陈雨泽","relation":"同桌"}]）
    - scenes_json:      出场场景（JSON 数组，如 ["教室初见","天台对话"]）
    - created_at:       创建时间
    - updated_at:       最后更新时间
    """
    __tablename__ = "characters"

    id = Column(String(32), primary_key=True, comment="角色唯一标识")
    project_id = Column(String(32), ForeignKey("projects.id"), index=True, nullable=False, comment="所属项目 ID")
    name = Column(String(50), nullable=False, comment="角色名称")
    role = Column(String(20), default="配角", comment="角色类型：主角/配角/龙套")
    gender = Column(String(10), default="", comment="性别：男/女/其他")
    age = Column(Integer, default=0, comment="年龄")
    description = Column(Text, default="", comment="角色描述")
    personality = Column(Text, default="", comment="性格描述")
    personality_traits = Column(Text, default="[]", comment='性格标签 JSON，如 ["内向","敏感"]')
    appearance = Column(Text, default="", comment="外貌描述")
    costume = Column(Text, default="", comment="服装描述")
    background = Column(Text, default="", comment="背景故事")
    special_setting = Column(Text, default="", comment="特殊设定")
    avatar_color = Column(String(20), default="#A8835F", comment="头像颜色（十六进制）")
    avatar_url = Column(String(500), default="", comment="头像图片 URL")
    has_generated_image = Column(Integer, default=0, comment="是否已生成立绘：0=否 1=是")
    assets_json = Column(Text, default="[]", comment='素材列表 JSON')
    relationships_json = Column(Text, default="[]", comment='人物关系 JSON')
    scenes_json = Column(Text, default="[]", comment='出场场景 JSON')
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="最后更新时间")

    project = relationship("Project", back_populates="characters")
