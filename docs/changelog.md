# 更新日志

## 2026-06-15 15:30:00 — 生成记录持久化到数据库

**需求**: [R-008]
**修改文件**:
- `backend/app/models/db_models.py` — 新增 GenerationTask 表
- `backend/app/api/v1/generation.py` — 对接数据库，支持 CRUD + 分页
- `backend/app/models/schemas.py` — 新增 GenerationTaskCreate/Response/ListResponse schema
- `app/src/lib/api.ts` — 新增 Generation API 函数（getGenerationTasks/clearGenerationTasks）
- `app/src/pages/GenerationHistory.tsx` — 对接后端 API，移除 mock 数据

**变更摘要**:
- 后端新增 GenerationTask 数据库表，记录任务执行历史
- generation.py 从内存字典改为数据库操作，支持分页和筛选
- 前端 GenerationHistory.tsx 使用 `useEffect` 从后端加载数据
- 清空记录功能调用后端 API，支持按项目/状态筛选清空
- 统计卡片从后端数据计算，支持实时更新

## 2026-06-15 15:00:00 — SKILL 市场对接数据库

**需求**: [R-006]
**修改文件**:
- `backend/app/api/v1/skills.py` — 对接数据库，支持 CRUD + 安装/卸载/评分
- `backend/app/models/schemas.py` — 新增 SkillCreate/SkillUpdate/SkillResponse schema
- `app/src/lib/api.ts` — 新增 SKILL API 函数（getSkills/installSkill/uninstallSkill/rateSkill）
- `app/src/pages/SkillMarket.tsx` — 对接后端 API，移除 mock 数据

**变更摘要**:
- 后端 skills.py 从 mock 数据改为数据库操作，支持完整 CRUD
- 新增安装/卸载接口，增加下载次数统计
- 新增评分接口，自动计算平均评分
- 前端 SkillMarket.tsx 使用 `useEffect` 从后端加载数据，移除 mock 依赖
- 安装/卸载/评分操作调用后端 API，支持乐观更新 UI

## 2026-06-15 14:30:00 — 项目创建流程修复

**需求**: [R-031]~[R-040]
**修改文件**:
- `app/src/pages/Dashboard.tsx` — 创建项目后自动选中新项目并跳转到剧本编辑器
- `app/src/pages/Chat.tsx` — Pipeline 启动时自动创建项目（如果未选中项目）
- `docs/requirements.md` — 修复阶段2需求状态不一致（统一标记为 ✅）

**变更摘要**:
- 路线 B（Dashboard）：创建项目后自动调用 `setSelectedProject` 选中新项目，并跳转到 `/script` 剧本编辑器
- 路线 A（Chat）：启动 Pipeline 时检查 `selectedProjectId`，如果为 null 则自动创建新项目
- 修复 requirements.md 中阶段2（R-037~R-040）状态不一致问题

## 2026-06-15 13:00:00 — AI 入口接入真实生成

**需求**: [R-041]~[R-043]
**修改文件**:
- `app/src/pages/script/AIScriptPanel.tsx` — handleSend/handleQuickAction 改为调用 SSE 流式接口
- `app/src/pages/CharacterManager.tsx` — 新增 handleAIGenerate + AI 生成角色按钮
- `app/src/pages/StoryboardWorkbench.tsx` — 新增 handleAIGenerateShot + AI 生成分镜按钮

**变更摘要**:
- AIScriptPanel 发送消息时调用 `/pipeline/chat/stream` SSE 接口，实时显示 AI 回复
- CharacterManager 点击"AI 生成角色"→ AI 返回 JSON → 解析并保存到数据库
- StoryboardWorkbench 点击"AI 生成分镜"→ AI 返回 JSON 数组 → 批量创建分镜

## 2026-06-15 12:35:00 — 项目上下文贯穿 + Chat 项目绑定

**需求**: [R-031]~[R-040]
**修改文件**:
- `app/src/pages/Dashboard.tsx` — 对接后端 getProjects/createProject/deleteProject API
- `app/src/pages/CharacterManager.tsx` — 读取 selectedProjectId，API 调用带 project_id 过滤
- `app/src/pages/ScriptEditor.tsx` — 读取 selectedProjectId，getScripts 带 project_id 过滤
- `app/src/pages/StoryboardWorkbench.tsx` — 读取 selectedProjectId，API 调用带 project_id 过滤
- `app/src/pages/Chat.tsx` — 新增 ProjectSelector 组件，Pipeline 使用真实 selectedProjectId
- `docs/requirements.md` — R-031~R-040 标记 ✅
- `docs/features.md` — 更新 F-001 实现方式

**变更摘要**:
- 阶段1（R-031~R-036）：项目上下文贯穿 — Dashboard 对接 API，三大页面按 selectedProjectId 过滤数据
- 阶段2（R-037~R-040）：Chat 项目绑定 — 顶部项目选择器，Pipeline 保存使用真实 project_id

## 2026-06-12 17:50:00 — 补全 12 张表 + 全量 UUID + seed 重建

**需求**: [R-012], [R-021]
**修改文件**:
- `backend/app/models/db_models.py` — 新增 5 张表：skills/skill_parameters/skill_reviews/timeline_clips/subtitle_segments
- `backend/seed.py` — 清空所有 16 张旧表，重建 12 张表，所有 ID 改为 UUID

**变更摘要**:
- 数据库从 7 张表扩展到 12 张表
- 新增：skills（技能包）、skill_parameters（技能参数）、skill_reviews（技能评价）、timeline_clips（时间轴片段）、subtitle_segments（字幕段）
- 清除旧表：roles/role_assets/role_relationships/role_traits
- 所有表 ID 统一 UUID 格式（如 `char_a1b2c3d4e5f6`）
- seed.py 灌入完整 mock 数据：1 项目 + 1 剧本 + 3 集 + 7 场景 + 12 块 + 8 角色 + 6 分镜 + 1 技能包 + 4 参数 + 3 评价 + 7 时间轴 + 4 字幕

---

## 2026-06-12 17:15:00 — 全量数据库重建 + 前后端 CRUD 对接

**需求**: [R-012], [R-021]
**修改文件**:
- `backend/app/models/db_models.py` — 重建 7 张表（projects/scripts/episodes/scenes/script_blocks/characters/storyboard_shots）
- `backend/app/models/schemas.py` — 全部 schema 对齐前端 mock 数据结构
- `backend/app/api/v1/projects.py` — 改为数据库操作，新增 UPDATE 端点
- `backend/app/api/v1/scripts.py` — 补全 list 端点，支持剧本块 CRUD
- `backend/app/api/v1/characters.py` — 支持 personality_traits/assets/relationships/scenes JSON 字段
- `backend/app/api/v1/storyboards.py` — 改为数据库操作，新增 batch 端点
- `backend/app/api/v1/pipeline.py` — save 端点适配新 schema
- `backend/seed.py` — 重建并灌入完整 mock 数据
- `app/src/lib/api.ts` — 补全 Projects/Scripts/Characters/Storyboards API 函数

**变更摘要**:
- 所有表 ID 统一使用 UUID 格式（如 `proj_a1b2c3d4e5f6`）
- 7 张表通过外键关联：projects → scripts → episodes → scenes → script_blocks
- projects → characters（一对多）
- projects → storyboard_shots（一对多）
- 角色表新增 personality_traits(JSON)、assets_json、relationships_json、scenes_json
- 分镜表对齐前端 Shot 类型全部字段
- 前端 API 层覆盖 Projects/Scripts/Characters/Storyboards 四大资源

---

## 2026-06-12 16:00:00 — Pipeline 全流程修复 + 端口迁移 + 调试日志

**问题**: [ISS-005]
**修改文件**:
- `app/src/pages/Chat.tsx` — 补全 Pipeline Step 3-6（分镜/视频/配音/合成），添加调试日志
- `app/src/store/useChatStore.ts` — API 端口 7777→7778，错误提示更新
- `app/src/lib/api.ts` — API 端口 7777→7778
- `backend/app/api/v1/pipeline.py` — 流式端点添加调试日志

**变更摘要**:
- Pipeline 6 步全部走通：剧本→角色→分镜→视频→配音→合成
- 每步完成后自动 advanceToNextStep，最终 completePipeline
- 端到端流程 12 秒内完成（模拟）
- 每个步骤添加 console.log 调试日志
- 后端流式端点添加请求/响应日志
- 端口从 7777 迁移到 7778（7777 有僵尸进程）

---

## 2026-06-12 11:00:00 — SQLite 数据库 + 剧本/角色持久化

**需求**: [R-012], [R-021]
**修改文件**:
- `backend/app/database.py` — 新建，SQLite 引擎和会话管理
- `backend/app/models/db_models.py` — 新建，ORM 模型（Script/Episode/Scene/Character）
- `backend/app/config.py` — 添加 SQLITE_URL 配置
- `backend/requirements.txt` — 添加 aiosqlite 依赖
- `backend/app/main.py` — lifespan 中初始化数据库
- `backend/app/api/v1/scripts.py` — 改为数据库操作
- `backend/app/api/v1/characters.py` — 改为数据库操作
- `backend/app/api/v1/pipeline.py` — 添加 save-script/save-characters 端点
- `backend/app/models/schemas.py` — 扩展字段，id 改为可选
- `app/src/lib/api.ts` — 新建，前端 API 服务层
- `app/src/pages/Chat.tsx` — Pipeline 完成后自动保存到数据库

**变更摘要**:
- 引入 SQLite 数据库，零配置即用
- 剧本和角色数据持久化存储
- Pipeline 完成后自动保存剧本和角色到数据库
- 前端 API 服务层统一管理后端请求
- 剧本 API：创建/查询/更新/删除
- 角色 API：创建/查询/更新/删除

---

## 2026-06-12 10:30:00 — Pipeline 数据提取器 + 消除硬编码

**需求**: [R-012], [R-016]
**修改文件**:
- `app/src/lib/pipeline-data-extractor.ts` — 新建，从 AI 回复中提取结构化剧本和角色数据
- `app/src/store/useChatStore.ts` — 添加 extractedScript/extractedCharacters 状态，finishStream 自动提取数据
- `app/src/pages/Chat.tsx` — simulatePipeline 使用提取数据替代硬编码 mock

**变更摘要**:
- 创建 `pipeline-data-extractor.ts`，支持从 AI 回复中提取集数、场景、角色信息
- 支持中文数字集数（第一集～第二十集）和阿拉伯数字（第1集～第20集）
- 支持 `**角色名（主角/配角/龙套）**` 格式的角色提取
- 支持 `**场景名**：描述` 格式的场景提取
- finishStream 完成后自动从 AI 回复中提取数据并存入 store
- simulatePipeline 使用提取的数据填充 Pipeline 面板，不再使用硬编码 mock
- handleModeSelect 标题从用户输入提取，不再硬编码"记忆碎片"
- 修复场景标签过滤器过度排除（`关键发现` 被误过滤）

**变更原因**:
- 原方案 simulatePipeline 使用完全硬编码的 mock 数据，Pipeline 面板显示的剧本和角色与 AI 回复内容完全无关
- 新方案从 AI 回复中实时提取数据，保证 Pipeline 面板内容与 AI 生成内容一致

---

## 2026-06-12 01:40:00 — Bug 修复：Pipeline 面板 + Markdown 渲染 + API 契约统一

**需求**: [R-012], [R-013], [R-014], [R-015], [R-016], [R-021]
**问题**: [ISS-004]（已解决）, [ISS-005]（已解决）
**修改文件**:
- `app/src/store/useChatStore.ts` — 修复 cancelGeneration 注入 plan_card、setError 注入 plan_card、修正端口引用
- `app/src/pages/Chat.tsx` — 修复内容 div 渲染条件（删除 `!isEmpty || !isStreaming` 外层判断）
- `backend/app/services/llm_service.py` — get_provider 返回 (provider, default_model) 元组，修复模型名映射
- `backend/app/api/v1/pipeline.py` — 适配 get_provider 新返回类型，传入 default_model

**变更摘要**:
- 修复前端-后端 API 契约不匹配（provider 名 vs 模型名）
- 修复取消/错误场景下 plan_card 不注入的问题
- 修复"思考中..."状态不显示的渲染条件 bug
- 关闭 ISS-004（SSE 流式 + 思考面板）、ISS-005（Pipeline 面板 + Markdown）

---

## 2026-06-11 23:30:00 — Chat Studio 前端实现 + Python 后端骨架 + MiMo 接入

**需求**: [R-012], [R-021]
**设计**: [D-001]
**修改文件**:
- `app/src/store/usePipelineStore.ts` — 新增 Pipeline 状态管理
- `app/src/pages/Chat.tsx` — 改造为 Chat Studio 分屏布局
- `app/src/store/useChatStore.ts` — 接入真实 AI API（MiMo）
- `backend/app/main.py` — FastAPI 应用入口
- `backend/app/config.py` — 配置管理（含 MiMo API Key）
- `backend/app/api/v1/*.py` — 7 个路由模块（projects/scripts/characters/storyboards/generation/skills/pipeline）
- `backend/app/models/schemas.py` — Pydantic 数据模型
- `backend/app/services/llm_service.py` — LLM 服务封装（MiMo/DeepSeek）
- `backend/app/services/pipeline_service.py` — Pipeline 编排服务
- `backend/app/core/celery_app.py` — Celery 配置
- `backend/app/tasks/pipeline_runner.py` — Pipeline 异步任务
- `backend/requirements.txt` — Python 依赖
- `backend/.env.example` — 环境变量模板

**变更摘要**:
- Chat Studio 前端：可调节分屏、PipelinePanel、StepBar、6 个步骤预览组件、模式选择卡片、完成卡片、错误卡片、消息排队
- Python 后端骨架：FastAPI + 7 个 API 路由模块 + LLM 服务 + Pipeline 编排
- MiMo API 接入：前端聊天调用真实 MiMo API（OpenAI 协议）
- 文档体系初始化：需求/功能/问题/设计/导航/日志/提交索引

---

## 2026-06-11 00:00:00 — Chat Studio 设计方案 + 文档体系初始化

**需求**: [R-012]
**设计**: [D-001]
**修改文件**:
- `docs/requirements.md` — 新建需求文档
- `docs/features.md` — 新建功能文档
- `docs/issues.md` — 新建问题追踪
- `docs/design.md` — 新建设计概览
- `docs/design/chat-studio-design.md` — 新建 Chat Studio 设计方案
- `docs/navigation.md` — 新建项目导航
- `docs/changelog.md` — 新建更新日志
- `docs/git-commits.md` — 新建 Git 提交索引
- `app/public/mockup.html` — Chat Studio 布局 mockup

**变更摘要**:
- 初始化完整文档体系（需求/功能/问题/设计/导航/日志/提交索引）
- 完成 Chat Studio 一站式创作指挥中心的设计方案
- 创建可视化 mockup 用于方案讨论

---

## 2026-06-11 00:00:00 — AI 对话页面 + 三个新页面 + 全局功能补全

**需求**: [R-007], [R-008], [R-009], [R-010], [R-011]
**功能**: [F-007], [F-008], [F-009], [F-010], [F-011]
**修改文件**:
- `src/pages/AssetLibrary.tsx` — 新增素材库页面
- `src/pages/GenerationHistory.tsx` — 新增生成记录页面
- `src/pages/CostStatistics.tsx` — 新增成本统计页面
- `src/pages/Chat.tsx` — 新增 AI 对话页面（多轮重写）
- `src/store/useChatStore.ts` — 新增聊天状态管理
- `src/App.tsx` — 新增路由 `/chat` `/assets` `/history` `/cost`
- `src/components/AppSidebar.tsx` — 新增 AI 对话入口、新建会话按钮、历史会话折叠、管理分组重组
- `src/components/AppTopbar.tsx` — 新增通知面板、快捷键弹窗、搜索交互、新建菜单导航
- `src/pages/Dashboard.tsx` — 项目卡片点击跳转到剧本编辑器
- `src/pages/StoryboardWorkbench.tsx` — 面包屑可点击导航
- `src/pages/ComposerStudio.tsx` — 面包屑可点击导航

**变更摘要**:
- 新增 3 个页面：素材库、生成记录、成本统计
- 新增 AI 对话页面：悬浮输入框、模型/SKILL 选择、多会话管理、快捷填充
- 侧边栏新增「新建会话」按钮 + 历史会话可折叠展开
- 顶部栏通知面板、快捷键弹窗、搜索功能全部打通
- Dashboard 项目卡片实现真实跳转
- 所有面包屑导航可点击
