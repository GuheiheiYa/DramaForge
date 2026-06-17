# 需求文档

**最后更新**: 2026-06-17 23:23:00  
**全流程规格**: [D-004 pipeline-full-flow-spec.md](design/pipeline-full-flow-spec.md)

---

## 两条创建路线

### 路线 A：Agent 驱动（Chat 页面）

**阶段 A — Chat 创作前置**（不写业务表，除新建项目）

```
用户输入创意（含创作关键词）
  → 流式生成 Markdown 创作方案
  → PlanConfirmCard 确认
  → ModeSelectorCard 选择 auto / confirm / preview
  → 绑定或创建项目（projects）
  → POST /pipeline/start
```

**阶段 B — Pipeline 六步编排**

```
Step 0 剧本 → Step 1 角色 → Step 2 分镜 → Step 3 视频 → Step 4 配音(占位) → Step 5 合成(占位)
  → 每步写入 DB + SSE 推送
  → ScriptEditor / CharacterManager / StoryboardWorkbench / Composer 读取
  → 用户跳转各页面微调
```

### 路线 B：手动创建（Dashboard）

```
用户创建项目 → 跳转剧本编辑器 → 手动/AI 写剧本
→ 跳转角色管理 → 手动/AI 设计角色
→ 跳转分镜工作台 → 手动/AI 做分镜
→ 跳转合成室 → 合成最终视频
```

---

## 完整步骤流程（7 步 + Pipeline 映射）

| 步骤 | 名称 | Pipeline Step | 涉及表 | 涉及页面 | 状态 |
|------|------|---------------|--------|---------|------|
| ① | 项目创建 | 启动前 A5 | projects, pipeline_runs | Dashboard、Chat | 已实现 |
| ② | 剧本创作 | 0 script | scripts→episodes→scenes→script_blocks | ScriptEditor、Chat | 已实现 |
| ③ | 角色设计 | 1 character | characters | CharacterManager、Chat | 已实现 |
| ④ | 分镜制作 | 2 storyboard | storyboard_shots | StoryboardWorkbench、Chat | 已实现 |
| ⑤ | 视频生成 | 3 video | generation_tasks, timeline_clips | ComposerStudio、Chat | 已实现 |
| ⑥ | 配音生成 | 4 audio | （占位，未落库） | ComposerStudio | **占位** TTS |
| ⑦ | 合成导出 | 5 compose | pipeline_runs.status | ComposerStudio | **占位** FFmpeg |

**编排状态表**: `pipeline_runs`（steps_json、current_step、mode、waiting_confirmation）

---

## 核心数据流问题

**问题本质**: 后端数据库设计了完整的 project_id 外键关系，但前端从未建立「当前项目」到「数据查询/写入」的传递链路。

**详细分析**: 见 [D-002] 项目上下文贯穿设计方案 → `docs/design/project-context-design.md`

---

## 项目基础 [R-001 ~ R-010]

| ID | 需求描述 | 优先级 | 状态 | 关联功能 | 备注 |
|----|---------|--------|------|---------|------|
| R-001 | 项目 Dashboard — 项目列表、创建、搜索、筛选、排序 | P0 | 🔄 | [F-001] | 后端 API 已就绪，前端未对接 |
| R-002 | 剧本编辑器 — 三栏布局、场景树、AI助手面板、撤销重做 | P0 | 🔄 | [F-002] | 加载已对接，保存部分对接 |
| R-003 | 角色管理台 — 角色卡片、创建表单、详情抽屉、形象生成 | P0 | 🔄 | [F-003] | 已对接 API，但 project_id 传递缺失（断点8） |
| R-004 | 分镜工作台 — 时间轴、分镜列表、帧编辑器、批量操作 | P0 | 🔄 | [F-004] | 已对接 API，但 project_id 传递缺失（断点9） |
| R-005 | 成片合成室 — 多轨时间轴、字幕编辑、播放控制、导出 | P0 | ⏳ | [F-005] | 前端纯 UI 演示，后端无 API |
| R-006 | SKILL 市场 — SKILL 浏览、安装、收藏、评分 | P0 | ✅ | [F-006] | 已对接数据库，支持 CRUD + 安装/卸载/评分 |
| R-007 | 素材库 — 图片/音频/视频素材管理、上传、预览 | P1 | ✅ | [F-007] | 已对接数据库，支持上传/删除/批量删除 |
| R-008 | 生成记录 — 任务执行历史、状态追踪、重试 | P1 | ✅ | [F-008] | 已对接数据库，支持分页查询和清空 |
| R-009 | 成本统计 — 项目级/服务级费用分析、饼图可视化 | P1 | ✅ | [F-009] | 已对接数据库，支持按项目/服务统计 |
| R-010 | 通知系统 — 顶部铃铛、通知面板、未读标记 | P1 | ✅ | [F-010] | 已对接数据库，支持 CRUD + 标记已读 |

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
| R-023 | 即梦AI 角色/分镜/视频生成 API 接入 | P0 | 🔄 | [F-015] | 已接入 Agnes 图像+视频模型，分镜工作台待对接 |
| R-024 | 火山引擎 TTS 配音 API 接入 | P1 | ⏳ | — | config 为空，无 TTS 封装 |
| R-025 | Celery + Redis 异步任务队列 | P0 | ⏳ | — | 骨架代码已有，未实际接入 |
| R-026 | SSE 实时进度推送 | P1 | ⏳ | — | 只 yield 一次快照，无轮询 |
| R-027 | 项目上下文传递（Dashboard → 各页面） | P1 | ⏳ | — | selectedProjectId 未被使用 |
| R-028 | 多模型配置（DeepSeek/Claude/GPT/Kimi/Gemini） | P2 | ⏳ | — | 实际只有 MiMo 可用 |
| R-029 | Pipeline 6 步真实执行（替代前端模拟） | P0 | 🔄 | [D-003] | pipeline_service.py 已写好但未接入，前端 simulatePipeline 是 setTimeout 模拟 |
| R-030 | 数据库 12 张表全量 CRUD | P0 | 🔄 | — | 4 张表已对接，8 张表待对接 |

---

## 实施计划 [R-031 ~ R-050]

> 详细分析见 [D-002] 项目上下文贯穿设计方案

### 阶段1：项目上下文贯穿 [R-031 ~ R-036]

| ID | 需求描述 | 优先级 | 状态 | 依赖 |
|----|---------|--------|------|------|
| R-031 | selectedProjectId 持久化到 localStorage | P0 | ✅ | — |
| R-032 | Dashboard 对接 getProjects API | P0 | ✅ | — |
| R-033 | Dashboard 对接 createProject API | P0 | ✅ | R-032 |
| R-034 | CharacterManager 读取 selectedProjectId 过滤数据 | P0 | ✅ | R-031 |
| R-035 | ScriptEditor 读取 selectedProjectId 过滤数据 | P0 | ✅ | R-031 |
| R-036 | StoryboardWorkbench 读取 selectedProjectId 过滤数据 | P0 | ✅ | R-031 |
| R-037 | Chat 顶部添加项目下拉选择器 | P0 | ✅ | R-032 |
| R-038 | 选择「新建项目」弹出创建对话框 | P0 | ✅ | R-037 |
| R-039 | Pipeline savePipelineScript 使用真实 project_id | P0 | ✅ | R-037 |
| R-040 | Pipeline savePipelineCharacters 使用真实 project_id | P0 | ✅ | R-037 |

### 阶段2：Chat 项目绑定 [R-037 ~ R-040]

| ID | 需求描述 | 优先级 | 状态 | 依赖 |
|----|---------|--------|------|------|
| R-037 | Chat 顶部添加项目下拉选择器 | P0 | ✅ | R-032 |
| R-038 | 选择「新建项目」弹出创建对话框 | P0 | ✅ | R-037 |
| R-039 | Pipeline savePipelineScript 使用真实 project_id | P0 | ✅ | R-037 |
| R-040 | Pipeline savePipelineCharacters 使用真实 project_id | P0 | ✅ | R-037 |

### 阶段3：AI 入口 [R-041 ~ R-043]

| ID | 需求描述 | 优先级 | 状态 | 依赖 |
|----|---------|--------|------|------|
| R-041 | ScriptEditor AI 面板接入真实 AI 生成 | P0 | ✅ | R-035 |
| R-042 | CharacterManager 添加「AI 生成角色」按钮 | P0 | ✅ | R-034 |
| R-043 | StoryboardWorkbench 添加「AI 生成分镜」按钮 | P0 | ✅ | R-036 |

### 阶段4：外部 API [R-044 ~ R-046]

| ID | 需求描述 | 优先级 | 状态 | 依赖 |
|----|---------|--------|------|------|
| R-044 | 即梦AI 图像生成接入 | P0 | ✅ | [F-015] | 已接入 Agnes 图像模型，角色立绘可生成 |
| R-045 | 火山引擎 TTS 配音接入 | P1 | ⏳ | 需要 API Key |
| R-046 | Celery 异步任务队列 | P0 | ⏳ | 需要 Redis |

### Pipeline 真实执行 [R-051 ~ R-055]

| ID | 需求描述 | 优先级 | 状态 | 关联 | 备注 |
|----|---------|--------|------|------|------|
| R-051 | AI 回复结构化 JSON 提取（替代正则） | P0 | ✅ | [D-003] | 两次调用分离：第一次非流式生成 JSON 数据，第二次流式生成用户回复 |
| R-052 | 前端 Pipeline 真实 API 调用（替代 simulatePipeline） | P0 | ✅ | [D-003] | simulatePipeline 改为 async，步骤 1-3 保存数据库，步骤 4 调 Agnes 视频 API |
| R-053 | 后端 Pipeline 异步执行 + SSE 进度推送 | P0 | 🔄 | [D-003] | 前端已真实调用 API，后端 SSE 推送待后续实现 |
| R-054 | 三种执行模式区分（auto/confirm/preview） | P0 | ⏳ | [D-003] | auto 全自动，confirm 每步暂停等确认，preview 只提取不生成 |
| R-055 | Pipeline 失败重试 + 跳过机制 | P1 | 🔄 | [D-003] | error_card 重试/跳过已修复；单镜失败仍暂停 Pipeline |

### Chat 与会话 [R-056]

| ID | 需求描述 | 优先级 | 状态 | 关联 | 备注 |
|----|---------|--------|------|------|------|
| R-056 | Chat 会话列表与消息历史 localStorage 持久化 | P0 | ✅ | [F-012] | 刷新/重进页面保留会话；流式中状态不持久化 |

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
