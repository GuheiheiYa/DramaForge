# 数据模型文档

**最后更新**: 2026-06-15 11:45:00
**数据库**: SQLite (aiosqlite)
**ORM**: SQLAlchemy 2.0 async
**ID 规范**: 全量 UUID v4（无前缀）

---

## 表关联总览

```
projects (中心表)
  │
  ├── scripts (1:N) ─── episodes (1:N) ─── scenes (1:N) ─── script_blocks (1:N)
  │
  ├── characters (1:N)
  │
  ├── storyboard_shots (1:N)
  │
  ├── timeline_clips (1:N)
  │
  └── subtitle_segments (1:N)

skills (全局资源，不关联项目)
  ├── skill_parameters (1:N)
  └── skill_reviews (1:N)
```

---

## 表详情

### 1. projects — 项目表

**职责**: 创作项目的顶层实体，所有创作内容通过 project_id 关联到此表。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| name | VARCHAR(200) | 是 | — | 项目名称 |
| type | VARCHAR(20) | 否 | '漫剧' | 项目类型：漫剧/短剧 |
| status | VARCHAR(20) | 否 | '草稿' | 状态：草稿/进行中/生成中/待审核/已完成/失败 |
| description | TEXT | 否 | '' | 项目描述 |
| episodes | INTEGER | 否 | 8 | 总集数 |
| current_episode | INTEGER | 否 | 1 | 当前进度集数 |
| skill_id | VARCHAR(50) | 否 | '' | 关联的 SKILL ID（引用 skills 表） |
| skill_name | VARCHAR(100) | 否 | '' | SKILL 名称（冗余，避免 JOIN） |
| progress | INTEGER | 否 | 0 | 整体进度 0-100 |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- 1:N → scripts（一个项目有多个剧本，通常 1 个）
- 1:N → characters
- 1:N → storyboard_shots
- 1:N → timeline_clips
- 1:N → subtitle_segments

---

### 2. scripts — 剧本表

**职责**: 一个项目对应一个剧本，包含标题和创建时间。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| project_id | VARCHAR(32) | FK | — | → projects.id (CASCADE) |
| title | VARCHAR(200) | 是 | — | 剧本标题 |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- N:1 → projects
- 1:N → episodes

---

### 3. episodes — 分集表

**职责**: 一个剧本包含多集。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| script_id | VARCHAR(32) | FK | — | → scripts.id (CASCADE) |
| number | INTEGER | 是 | — | 集数编号（1, 2, 3...） |
| title | VARCHAR(200) | 是 | — | 集标题 |

**关联**:
- N:1 → scripts
- 1:N → scenes

---

### 4. scenes — 场景表

**职责**: 一集包含多个场景。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| episode_id | VARCHAR(32) | FK | — | → episodes.id (CASCADE) |
| number | INTEGER | 是 | — | 场景序号 |
| title | VARCHAR(200) | 是 | — | 场景标题 |
| location | VARCHAR(100) | 否 | '未指定' | 地点 |
| time_tag | VARCHAR(50) | 否 | '日间' | 时间标签：日间/夜晚/清晨等 |
| summary | TEXT | 否 | '' | 场景摘要 |

**关联**:
- N:1 → episodes
- 1:N → script_blocks

---

### 5. script_blocks — 剧本块表

**职责**: 编辑器中的内容块（对话/动作/旁白等）。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| scene_id | VARCHAR(32) | FK | — | → scenes.id (CASCADE) |
| type | VARCHAR(20) | 是 | — | 块类型（见枚举） |
| content | TEXT | 否 | '' | 块内容 |
| sort_order | INTEGER | 否 | 0 | 排序序号 |

**块类型枚举**: scene / character / emotion / action / sound / transition / dialogue / narration / note

**关联**:
- N:1 → scenes

---

### 6. characters — 角色表

**职责**: 一个项目包含多个角色。字段对齐前端 character/types.ts。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| project_id | VARCHAR(32) | FK | — | → projects.id (CASCADE) |
| name | VARCHAR(50) | 是 | — | 角色名 |
| role | VARCHAR(10) | 否 | '配角' | 角色类型：主角/配角/龙套 |
| gender | VARCHAR(10) | 否 | '' | 性别：男/女/其他 |
| age | INTEGER | 否 | 0 | 年龄 |
| description | TEXT | 否 | '' | 角色描述 |
| personality | TEXT | 否 | '' | 性格描述 |
| personality_traits | JSON | 否 | [] | 性格标签列表 |
| appearance | TEXT | 否 | '' | 外貌描述 |
| costume | TEXT | 否 | '' | 服装描述 |
| background | TEXT | 否 | '' | 背景故事 |
| special_setting | TEXT | 否 | '' | 特殊设定 |
| avatar_color | VARCHAR(20) | 否 | '#A8835F' | 头像背景色 HEX |
| avatar_url | VARCHAR(500) | 否 | '' | 头像图片 URL |
| has_generated_image | BOOLEAN | 否 | False | 是否已生成立绘 |
| assets_json | JSON | 否 | [] | 资产列表：[{id, type, name, thumbnail}] |
| relationships_json | JSON | 否 | [] | 关系列表：[{targetCharacterId, targetName, relation}] |
| scenes_json | JSON | 否 | [] | 出场场景列表：['场景名1', '场景名2'] |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- N:1 → projects

---

### 7. storyboard_shots — 分镜表

**职责**: 一个项目包含多个分镜。字段对齐前端 storyboard/types.ts。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| project_id | VARCHAR(32) | FK | — | → projects.id (CASCADE) |
| shot_number | INTEGER | 是 | — | 镜头编号 |
| shot_type | VARCHAR(20) | 否 | '中景' | 镜头类型：远景/全景/中景/近景/特写 |
| duration | INTEGER | 否 | 5 | 时长（秒） |
| status | VARCHAR(20) | 否 | '等待中' | 状态：等待中/生成中/已完成/失败/草稿 |
| description | TEXT | 否 | '' | 镜头描述 |
| camera_movement | VARCHAR(50) | 否 | '固定' | 运镜：固定/推进/拉远/左移/右移/跟拍 |
| composition | VARCHAR(100) | 否 | '' | 构图说明 |
| lighting | VARCHAR(100) | 否 | '' | 灯光说明 |
| character_action | TEXT | 否 | '' | 角色动作 |
| dialogue | TEXT | 否 | '' | 对白 |
| scene_ref | VARCHAR(100) | 否 | '' | 关联场景名 |
| characters | JSON | 否 | [] | 出场角色名列表 |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- N:1 → projects

---

### 8. skills — 技能/风格包表（全局）

**职责**: 全局可复用的创作风格包，不属于任何项目。项目通过 skill_id 引用。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| name | VARCHAR(100) | 是 | — | 技能名称 |
| description | TEXT | 否 | '' | 简短描述 |
| detailed_description | TEXT | 否 | '' | 详细描述 |
| category | VARCHAR(20) | 否 | '漫剧' | 分类：漫剧/短剧 |
| style | VARCHAR(20) | 否 | '日系' | 风格：日系/古风/现代/悬疑/甜宠/科幻/喜剧 |
| tags | JSON | 否 | [] | 标签列表 |
| cover_image | VARCHAR(500) | 否 | '' | 封面图 URL |
| version | VARCHAR(20) | 否 | 'v1.0.0' | 版本号 |
| author_name | VARCHAR(50) | 否 | '' | 作者名 |
| author_avatar | VARCHAR(500) | 否 | '' | 作者头像 URL |
| download_count | INTEGER | 否 | 0 | 下载次数 |
| rating | FLOAT | 否 | 0.0 | 评分 0-5 |
| review_count | INTEGER | 否 | 0 | 评价数 |
| is_official | BOOLEAN | 否 | False | 是否官方 |
| install_status | VARCHAR(20) | 否 | 'not_installed' | 安装状态 |
| usage_instructions | TEXT | 否 | '' | 使用说明 |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- 1:N → skill_parameters
- 1:N → skill_reviews

---

### 9. skill_parameters — 技能参数表

**职责**: 技能的可调参数（滑块/选择器/开关）。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| skill_id | VARCHAR(32) | FK | — | → skills.id (CASCADE) |
| name | VARCHAR(100) | 是 | — | 参数名 |
| type | VARCHAR(20) | 否 | 'slider' | 类型：slider/select/toggle |
| value | VARCHAR(100) | 否 | '' | 当前值 |
| min_val | FLOAT | 否 | 0 | 最小值 |
| max_val | FLOAT | 否 | 100 | 最大值 |
| step | FLOAT | 否 | 1 | 步长 |
| options | JSON | 否 | [] | 选项列表（select 类型） |
| default_value | VARCHAR(100) | 否 | '' | 默认值 |

**关联**:
- N:1 → skills

---

### 10. skill_reviews — 技能评价表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| skill_id | VARCHAR(32) | FK | — | → skills.id (CASCADE) |
| user_name | VARCHAR(50) | 否 | '' | 用户名 |
| avatar | VARCHAR(500) | 否 | '' | 用户头像 URL |
| rating | INTEGER | 否 | 5 | 评分 1-5 |
| comment | TEXT | 否 | '' | 评价内容 |
| date | VARCHAR(20) | 否 | '' | 评价日期 YYYY-MM-DD |

**关联**:
- N:1 → skills

---

### 11. timeline_clips — 时间轴片段表

**职责**: 合成室的视频/音频/BGM 片段。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| project_id | VARCHAR(32) | FK | — | → projects.id (CASCADE) |
| name | VARCHAR(200) | 是 | — | 片段名称 |
| track_type | VARCHAR(20) | 否 | 'video' | 轨道类型：video/audio/bgm/subtitle |
| start_time | FLOAT | 否 | 0 | 开始时间（秒） |
| duration | FLOAT | 否 | 5 | 时长（秒） |
| status | VARCHAR(20) | 否 | 'ready' | 状态：ready/generating/error |
| shot_ref | VARCHAR(50) | 否 | '' | 关联分镜引用 |
| color | VARCHAR(20) | 否 | '' | 显示颜色 HEX |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- N:1 → projects

---

### 12. subtitle_segments — 字幕段表

**职责**: 合成室的字幕内容。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(32) | PK | UUID | 主键 |
| project_id | VARCHAR(32) | FK | — | → projects.id (CASCADE) |
| text | TEXT | 否 | '' | 字幕文本 |
| start_time | FLOAT | 否 | 0 | 开始时间（秒） |
| duration | FLOAT | 否 | 3 | 时长（秒） |
| created_at | DATETIME | 否 | now() | 创建时间 |
| updated_at | DATETIME | 否 | now() | 更新时间 |

**关联**:
- N:1 → projects

---

## 关联关系汇总

| 关系 | 类型 | 外键 | 级联 |
|------|------|------|------|
| projects → scripts | 1:N | scripts.project_id | CASCADE |
| scripts → episodes | 1:N | episodes.script_id | CASCADE |
| episodes → scenes | 1:N | scenes.episode_id | CASCADE |
| scenes → script_blocks | 1:N | script_blocks.scene_id | CASCADE |
| projects → characters | 1:N | characters.project_id | CASCADE |
| projects → storyboard_shots | 1:N | storyboard_shots.project_id | CASCADE |
| projects → timeline_clips | 1:N | timeline_clips.project_id | CASCADE |
| projects → subtitle_segments | 1:N | subtitle_segments.project_id | CASCADE |
| skills → skill_parameters | 1:N | skill_parameters.skill_id | CASCADE |
| skills → skill_reviews | 1:N | skill_reviews.skill_id | CASCADE |

**注意**: skills 是全局资源表，没有 project_id。项目通过 projects.skill_id 字段引用 skills.id（非外键约束，应用层维护）。
