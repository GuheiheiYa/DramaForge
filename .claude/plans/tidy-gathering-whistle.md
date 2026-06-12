# 全量数据库重建 + 前后端 CRUD 对接计划

## Context

当前所有页面（CharacterManager、ScriptEditor、StoryboardWorkbench、Dashboard、SkillMarket、ComposerStudio 等）全部使用本地 mock 数据，后端 API 大部分用内存字典或 mock。需要：
1. 根据前端 mock 数据结构重建所有数据库表
2. 所有 ID 统一使用 UUID
3. 后端 API 全部改为数据库操作
4. 前端页面全部对接后端 API，实现真实 CRUD
5. 表之间建立正确的外键关联

## 第一步：重建数据库模型（db_models.py）

**文件**: `backend/app/models/db_models.py`

根据 mock 数据结构，重建以下表（所有 ID 用 UUID）：

| 表名 | 说明 | 核心字段 | 关联 |
|------|------|---------|------|
| `projects` | 项目 | id, name, type, status, description, episodes, skill_id | — |
| `scripts` | 剧本 | id, project_id(FK), title | → projects |
| `episodes` | 分集 | id, script_id(FK), number, title | → scripts |
| `scenes` | 场景 | id, episode_id(FK), number, title, location, time_tag | → episodes |
| `script_blocks` | 剧本块 | id, scene_id(FK), type, content, sort_order | → scenes |
| `characters` | 角色 | id, project_id(FK), name, role, gender, age, description, personality, personality_traits(JSON), appearance, costume, background, special_setting, avatar_color, avatar_url, assets_json, relationships_json, scenes_json | → projects |
| `storyboard_shots` | 分镜 | id, project_id(FK), shot_number, shot_type, duration, status, description, camera_movement, composition, lighting, character_action, dialogue, scene_ref, characters(JSON) | → projects |

## 第二步：更新 Pydantic Schema（schemas.py）

**文件**: `backend/app/models/schemas.py`

- 所有 Create/Response schema 对齐 mock 数据字段
- `id` 字段统一可选（创建时不传，数据库自动生成 UUID）
- 新增 Storyboard 相关 schema

## 第三步：后端 API 改造（数据库操作）

### 3.1 projects.py → 数据库 CRUD
- GET `/` — 查询项目列表（支持 type/status 筛选）
- POST `/` — 创建项目
- GET `/{id}` — 项目详情
- PUT `/{id}` — 更新项目
- DELETE `/{id}` — 删除项目

### 3.2 scripts.py → 补全 list 端点
- GET `/` — 查询所有剧本（支持 project_id 筛选）
- 保持现有 POST/GET/PUT/DELETE

### 3.3 characters.py → 已完成，无需改动

### 3.4 storyboards.py → 数据库 CRUD
- GET `/` — 查询分镜列表（支持 project_id 筛选）
- POST `/` — 创建分镜
- GET `/{id}` — 分镜详情
- PUT `/{id}` — 更新分镜
- DELETE `/{id}` — 删除分镜
- POST `/batch` — 批量创建分镜

### 3.5 pipeline.py → save 端点关联 project_id
- save-script 和 save-characters 关联到真实 project_id

## 第四步：前端 API 层补全（api.ts）

**文件**: `app/src/lib/api.ts`

新增：
- Projects API: `getProjects`, `createProject`, `getProject`, `updateProject`, `deleteProject`
- Scripts API: `getScripts` (list), 补全现有
- Storyboards API: `getShots`, `createShot`, `updateShot`, `deleteShot`

## 第五步：前端页面对接 API

### 5.1 CharacterManager.tsx
- `useState(mockCharacters)` → `useEffect` 加载 `getCharacters()`
- `handleSave` → 调用 `createCharacter()` / `updateCharacter()`
- `handleDelete` → 调用 `deleteCharacter()`

### 5.2 ScriptEditor.tsx
- `useState(episodes)` → `useEffect` 加载 `getScript(projectId)`
- `handleSave` → 调用 API 保存
- 场景/块增删改 → 调用对应 API

### 5.3 StoryboardWorkbench.tsx
- `useState(mockShots)` → `useEffect` 加载 `getShots(projectId)`
- `handleAddShot` → `createShot()`
- `handleUpdateShot` → `updateShot()`
- `handleDeleteShot` → `deleteShot()`

### 5.4 Dashboard.tsx
- 从 `useAppStore` 改为从 API 加载项目列表
- 创建/删除项目调用 API

## 第六步：seed.py 更新

**文件**: `backend/seed.py`

- 删除旧表，重建新表
- 灌入全部 mock 数据（项目 + 剧本 + 场景 + 块 + 角色 + 分镜）
- 所有 ID 使用 UUID 格式

## 第七步：验证

1. 启动后端 `python -m uvicorn app.main:app --port 7778`
2. 运行 `python seed.py` 灌入数据
3. 前端逐页面验证 CRUD：
   - Dashboard: 创建/删除项目
   - ScriptEditor: 加载/编辑/保存剧本
   - CharacterManager: 增删改查角色
   - StoryboardWorkbench: 增删改查分镜

## 关键文件清单

| 文件 | 操作 |
|------|------|
| `backend/app/models/db_models.py` | 重写 |
| `backend/app/models/schemas.py` | 重写 |
| `backend/app/api/v1/projects.py` | 改为数据库操作 |
| `backend/app/api/v1/scripts.py` | 补全 list 端点 |
| `backend/app/api/v1/storyboards.py` | 改为数据库操作 |
| `backend/app/api/v1/characters.py` | 微调 |
| `backend/app/api/v1/pipeline.py` | save 端点关联 project |
| `backend/seed.py` | 重写 |
| `app/src/lib/api.ts` | 补全 API 函数 |
| `app/src/pages/CharacterManager.tsx` | 对接 API |
| `app/src/pages/ScriptEditor.tsx` | 对接 API |
| `app/src/pages/StoryboardWorkbench.tsx` | 对接 API |
| `app/src/pages/Dashboard.tsx` | 对接 API |
