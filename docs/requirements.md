# 需求文档

**最后更新**: 2026-06-15 11:00:00

---

## 核心数据流问题（优先级最高）

**问题本质**: 后端数据库设计了完整的 project_id 外键关系，但前端从未建立「当前项目」到「数据查询/写入」的传递链路。

### 断裂点清单

| 编号 | 位置 | 问题 | 严重度 |
|------|------|------|--------|
| **断点1** | Dashboard.tsx | 项目列表使用 mockProjects 硬编码，不从后端加载 | 严重 |
| **断点2** | Dashboard.tsx handleCreate | 创建项目只写入本地 store，不调用后端 API | 严重 |
| **断点3** | CharacterManager.tsx | `apiGetCharacters()` 不传 project_id，加载所有项目角色 | 严重 |
| **断点4** | ScriptEditor.tsx | `getScripts()` 不传 project_id，盲目取第一个剧本 | 严重 |
| **断点5** | StoryboardWorkbench.tsx | `apiGetShots()` 不传 project_id，加载所有项目分镜 | 严重 |
| **断点6** | Chat.tsx savePipelineScript | project_id 使用 `proj_${Date.now()}` 随机值，与 projects 表无关联 | 严重 |
| **断点7** | Chat.tsx savePipelineCharacters | project_id 硬编码为 `'default'` | 严重 |
| **断点8** | CharacterManager.tsx toApiChar | project_id 默认 `'default'`，调用处未传实际值 | 严重 |
| **断点9** | StoryboardWorkbench.tsx toApiShot | project_id 默认 `'default'`，调用处未传实际值 | 严重 |
| **断点10** | App.tsx 路由 | 所有路由是静态路径，刷新页面后 selectedProjectId 丢失 | 中等 |
| **断点11** | Dashboard.tsx NewProjectModal | 硬编码 3 个 skill 选项，未从后端加载 | 低 |

### 数据流断裂图

```
Dashboard (mock数据)
  |
  |-- [断点1] 项目列表不从后端加载
  |-- [断点2] 创建项目不写入后端
  v
setSelectedProject(project.id) --> useAppStore.selectedProjectId
  |
  |-- [断点10] 页面刷新后丢失
  v
各页面 useEffect 加载数据
  |
  |-- [断点3] CharacterManager: 无 project_id
  |-- [断点4] ScriptEditor: 无 project_id
  |-- [断点5] StoryboardWorkbench: 无 project_id
  v
各页面保存数据
  |
  |-- [断点8] CharacterManager: project_id='default'
  |-- [断点9] StoryboardWorkbench: project_id='default'
  v
Pipeline 保存
  |
  |-- [断点6] project_id=proj_${Date.now()}
  |-- [断点7] project_id='default'
  v
数据库孤儿记录（project_id 指向不存在的项目）
```

### 修复策略

将 `selectedProjectId` 贯穿整个数据流：
1. **持久化**: localStorage 存储，页面刷新不丢失
2. **读取**: 各页面 useEffect 从 store 读取 selectedProjectId
3. **传递**: 调用 API 时传入 project_id 参数
4. **关联**: Pipeline 保存前先创建真实项目

### 表关联总览

```
projects (1)
  ├── scripts (N) ─── episodes (N) ─── scenes (N) ─── script_blocks (N)
  ├── characters (N)
  ├── storyboard_shots (N)
  ├── timeline_clips (N)
  └── subtitle_segments (N)

skills (全局，不关联项目)
  ├── skill_parameters (N)
  └── skill_reviews (N)
```

---

## 项目基础 [R-001 ~ R-010]

| ID | 需求描述 | 优先级 | 状态 | 关联功能 | 备注 |
|----|---------|--------|------|---------|------|
| R-001 | 项目 Dashboard — 项目列表、创建、搜索、筛选、排序 | P0 | 🔄 | [F-001] | 后端 API 已就绪，前端未对接 |
| R-002 | 剧本编辑器 — 三栏布局、场景树、AI助手面板、撤销重做 | P0 | 🔄 | [F-002] | 加载已对接，保存部分对接 |
| R-003 | 角色管理台 — 角色卡片、创建表单、详情抽屉、形象生成 | P0 | 🔄 | [F-003] | 已对接 API，但 project_id 传递缺失（断点8） |
| R-004 | 分镜工作台 — 时间轴、分镜列表、帧编辑器、批量操作 | P0 | 🔄 | [F-004] | 已对接 API，但 project_id 传递缺失（断点9） |
| R-005 | 成片合成室 — 多轨时间轴、字幕编辑、播放控制、导出 | P0 | ⏳ | [F-005] | 前端纯 UI 演示，后端无 API |
| R-006 | SKILL 市场 — SKILL 浏览、安装、收藏、评分 | P0 | ⏳ | [F-006] | 前端纯 mock，后端也是 mock |
| R-007 | 素材库 — 图片/音频/视频素材管理、上传、预览 | P1 | ⏳ | [F-007] | 前端纯 UI 演示，后端无 API |
| R-008 | 生成记录 — 任务执行历史、状态追踪、重试 | P1 | ⏳ | [F-008] | 前端纯 UI 演示，后端内存字典 |
| R-009 | 成本统计 — 项目级/服务级费用分析、饼图可视化 | P1 | ⏳ | [F-009] | 前端纯 UI 演示，后端无 API |
| R-010 | 通知系统 — 顶部铃铛、通知面板、未读标记 | P1 | ⏳ | [F-010] | 前端纯 UI 演示，无后端推送 |

---

## AI 对话与创作 [R-011 ~ R-020]

| ID | 需求描述 | 优先级 | 状态 | 关联功能 | 备注 |
|----|---------|--------|------|---------|------|
| R-011 | AI 对话页面 — 多会话、模型切换、SKILL选择、消息气泡 | P0 | ✅ | [F-011] | 已对接 MiMo SSE 流式 |
| R-012 | Chat Studio — 一站式创作指挥中心，对话驱动全流程制作 | P0 | 🔄 | [F-012] | Pipeline 执行是前端模拟 |
| R-013 | 用户手动取消 AI 生成（取消按钮 + 中断请求） | P0 | ✅ | [F-013] | — |
| R-014 | 模型选择区新增「深度思考」开关（toggle） | P0 | ✅ | [F-013] | — |
| R-015 | 前端展示 AI 思考过程（默认折叠，点击展开，流式输出） | P0 | ✅ | [F-013] | — |
| R-016 | 全量采用 SSE 流式输出模式 | P0 | ✅ | [F-013] | — |

---

## 后端与集成 [R-021 ~ R-030]

| ID | 需求描述 | 优先级 | 状态 | 关联功能 | 备注 |
|----|---------|--------|------|---------|------|
| R-021 | FastAPI 后端框架搭建 | P0 | ✅ | [F-014] | SQLite + SQLAlchemy 已就绪 |
| R-022 | DeepSeek/Claude 剧本生成 API 接入 | P0 | ⏳ | — | llm_service 已封装，pipeline_service 未接入 |
| R-023 | 即梦AI 角色/分镜/视频生成 API 接入 | P0 | ⏳ | — | config 为空，无图像/视频生成代码 |
| R-024 | 火山引擎 TTS 配音 API 接入 | P1 | ⏳ | — | config 为空，无 TTS 封装 |
| R-025 | Celery + Redis 异步任务队列 | P0 | ⏳ | — | 骨架代码已有，未实际接入 |
| R-026 | SSE 实时进度推送 | P1 | ⏳ | — | 只 yield 一次快照，无轮询 |
| R-027 | 项目上下文传递（Dashboard → 各页面） | P1 | ⏳ | — | selectedProjectId 未被使用 |
| R-028 | 多模型配置（DeepSeek/Claude/GPT/Kimi/Gemini） | P2 | ⏳ | — | 实际只有 MiMo 可用 |
| R-029 | Pipeline 6 步真实执行（替代前端模拟） | P0 | ⏳ | — | 依赖 R-022~R-025 |
| R-030 | 数据库 12 张表全量 CRUD | P0 | 🔄 | — | 4 张表已对接，8 张表待对接 |

---

## 功能状态详情

### 已完成 ✅

| 功能 | 说明 |
|------|------|
| AI 对话 (SSE 流式) | MiMo 真实调用，thinking/content 分块 |
| 剧本编辑器 (加载) | 从后端加载剧本数据 |
| 角色管理台 (CRUD) | 创建/读取/更新/删除全部对接 API |
| 分镜工作台 (CRUD) | 创建/读取/更新/删除全部对接 API |
| 后端数据库 (12 张表) | projects/scripts/episodes/scenes/script_blocks/characters/storyboard_shots/skills/skill_parameters/skill_reviews/timeline_clips/subtitle_segments |
| Pipeline 数据提取 | 从 AI 回复中提取剧本/角色结构化数据 |

### 开发中 🔄

| 功能 | 缺失内容 |
|------|---------|
| Dashboard 对接 | 后端 API 就绪，前端 useAppStore 未改造 |
| 剧本编辑器保存 | handleSave 调用 API 逻辑不完整 |
| Pipeline 真实执行 | 前端 simulatePipeline() 是 setTimeout 模拟 |

### 待开发 ⏳

| 功能 | 依赖 |
|------|------|
| 即梦AI 图像/视频生成 | R-023 (需要 API Key) |
| 火山引擎 TTS 配音 | R-024 (需要 API Key) |
| Celery 异步任务队列 | R-025 (需要 Redis) |
| SSE 实时进度推送 | R-026 (需要 Celery) |
| 成片合成室后端 | R-005 (需要视频合成服务) |
| SKILL 市场后端 | R-006 (需要数据库模型) |
| 素材库后端 | R-007 (需要文件上传服务) |
| 生成记录持久化 | R-008 (需要 Celery 任务同步) |
| 成本统计后端 | R-009 (需要计费逻辑) |
| 通知系统后端 | R-010 (需要 WebSocket) |
| 项目上下文传递 | R-027 (需要路由改造) |
| 多模型配置 | R-028 (需要各 API Key) |

---

## 核心阻塞链

```
R-023 (即梦AI) ──┐
R-022 (DeepSeek) ─┼──→ R-029 (Pipeline 真实执行) ──→ R-012 (Chat Studio 完成)
R-024 (TTS) ──────┤
R-025 (Celery) ───┘
```

**当前只有 AI 对话部分能真实工作，Pipeline 其余 5 步（角色/分镜/视频/配音/合成）全部是空壳。**
