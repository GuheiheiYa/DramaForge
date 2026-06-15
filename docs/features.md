# 功能文档

## [F-001] 项目 Dashboard ← [R-001]

**状态**: 已完成  **实现时间**: 2026-06-09 00:00:00  **最后更新**: 2026-06-15 12:30:00

**实现方式**:
- `Dashboard.tsx` 主页面，包含项目卡片列表、搜索筛选、排序、新建项目向导
- `ProjectCard.tsx` 支持网格/列表两种视图，右键菜单（重命名、复制、导出、删除）
- `useAppStore` 管理项目状态
- **已对接后端 API**：`useEffect` 调用 `apiGetProjects()` 加载项目列表，`NewProjectModal` 调用 `apiCreateProject()` 创建项目，`confirmDelete` 调用 `apiDeleteProject()` 删除项目

**关联文件**:
- `src/pages/Dashboard.tsx`
- `src/components/ProjectCard.tsx`
- `src/store/useAppStore.ts`
- `src/lib/api.ts`（getProjects / createProject / deleteProject）

**数据来源**:
- 后端 `/api/v1/projects` API（失败时 fallback 到 mock 数据）

---

## [F-002] 剧本编辑器 ← [R-002]

**状态**: 已完成  **实现时间**: 2026-06-09 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 三栏布局：左侧场景导航树、中间编辑区、右侧AI助手面板
- 支持分集管理、场景 CRUD、拖拽排序
- 撤销/重做（50步历史栈）、快捷键（Ctrl+S/Z/Y）
- AI 面板支持续写、改写、生成对话、优化场景

**关联文件**:
- `src/pages/ScriptEditor.tsx`
- `src/pages/script/SceneTree.tsx`
- `src/pages/script/ScriptEditorArea.tsx`
- `src/pages/script/AIScriptPanel.tsx`
- `src/pages/script/ScriptToolbar.tsx`

---

## [F-003] 角色管理台 ← [R-003]

**状态**: 已完成  **实现时间**: 2026-06-09 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 角色卡片网格展示，支持筛选（主角/配角/龙套）
- 创建/编辑表单（名称、描述、性格、外貌等）
- 详情抽屉（角色信息、资产列表、关联场景）
- 形象生成模拟

**关联文件**:
- `src/pages/CharacterManager.tsx`
- `src/pages/character/CharacterGrid.tsx`
- `src/pages/character/CharacterForm.tsx`
- `src/pages/character/CharacterDetailDrawer.tsx`

---

## [F-004] 分镜工作台 ← [R-004]

**状态**: 已完成  **实现时间**: 2026-06-09 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 横向时间轴 + 分镜列表 + 帧编辑器三栏布局
- 分镜 CRUD、批量生成、批量删除
- 帧编辑器支持描述编辑、景别/运镜参数调整

**关联文件**:
- `src/pages/StoryboardWorkbench.tsx`
- `src/pages/storyboard/TimelineStrip.tsx`
- `src/pages/storyboard/ShotList.tsx`
- `src/pages/storyboard/FrameEditor.tsx`
- `src/pages/storyboard/Toolbar.tsx`

---

## [F-005] 成片合成室 ← [R-005]

**状态**: 已完成  **实现时间**: 2026-06-09 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 多轨时间轴（视频/音频/BGM/字幕四轨）
- 预览播放器 + 字幕覆盖层
- 播放控制（播放/暂停、逐帧、分割、音量）
- 字幕编辑器（样式、位置、字体）
- 导出面板（格式、分辨率、质量）

**关联文件**:
- `src/pages/ComposerStudio.tsx`
- `src/pages/composer/MultiTrackTimeline.tsx`
- `src/pages/composer/SubtitleEditor.tsx`
- `src/pages/composer/PlaybackControls.tsx`
- `src/pages/composer/ExportPanel.tsx`

---

## [F-006] SKILL 市场 ← [R-006]

**状态**: 已完成  **实现时间**: 2026-06-09 00:00:00  **最后更新**: 2026-06-15 15:00:00

**实现方式**:
- SKILL 卡片网格，支持分类筛选、搜索
- 安装/卸载、收藏、评分
- 详情抽屉展示 SKILL 配置参数
- **已对接后端 API**：`getSkills()` 从数据库加载，`installSkill()` / `uninstallSkill()` / `rateSkill()` 调用后端接口

**关联文件**:
- `app/src/pages/SkillMarket.tsx` — 对接后端 API，移除 mock 数据
- `app/src/pages/skill/SkillGrid.tsx`
- `app/src/pages/skill/SkillDetailDrawer.tsx`
- `app/src/lib/api.ts` — 新增 SKILL API 函数
- `backend/app/api/v1/skills.py` — 对接数据库，支持 CRUD + 安装/卸载/评分
- `backend/app/models/schemas.py` — 新增 SkillCreate/SkillUpdate/SkillResponse schema

**数据来源**:
- 后端 `/api/v1/skills` API（SQLite 数据库）

**已知问题**:
- 筛选功能需要前端组件适配新的参数格式（category/style）

---

## [F-007] 素材库 ← [R-007]

**状态**: 已完成  **实现时间**: 2026-06-11 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 图片/音频/视频分类展示，网格/列表视图
- 搜索、类型筛癣统计卡片
- 预览弹窗（下载、删除）

**关联文件**:
- `src/pages/AssetLibrary.tsx`

---

## [F-008] 生成记录 ← [R-008]

**状态**: 已完成  **实现时间**: 2026-06-11 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 任务列表，按类型/状态筛选
- 统计卡片（总数/成功/失败/进行中）
- 失败任务支持重试，支持清空记录

**关联文件**:
- `src/pages/GenerationHistory.tsx`

---

## [F-009] 成本统计 ← [R-009]

**状态**: 已完成  **实现时间**: 2026-06-11 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 项目级费用卡片 + 服务级费用构成饼图
- 按项目切换查看费用明细
- 用量和占比表格

**关联文件**:
- `src/pages/CostStatistics.tsx`

---

## [F-010] 通知系统 ← [R-010]

**状态**: 已完成  **实现时间**: 2026-06-11 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 顶部铃铛按钮 + 通知面板下拉
- 未读标记、全部已读、通知列表

**关联文件**:
- `src/components/AppTopbar.tsx`（NotificationPanel 内嵌）

---

## [F-011] AI 对话页面 ← [R-011]

**状态**: 已完成  **实现时间**: 2026-06-11 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 悬浮输入框（毛玻璃效果、虚线分隔工具栏）
- 模型切换（DeepSeek/Claude/GPT/Kimi/Gemini）+ SKILL 选择
- 多会话管理（侧边栏历史会话折叠展开）
- + 号上传菜单（Portal 渲染，不被裁剪）
- 空状态引导（6 个快捷填充选项）

**关联文件**:
- `src/pages/Chat.tsx`
- `src/store/useChatStore.ts`
- `src/components/AppSidebar.tsx`

---

## [F-012] Chat Studio — 一站式创作指挥中心 ← [R-012]

**状态**: 开发中  **实现时间**: 2026-06-11 00:00:00  **最后更新**: 2026-06-11 00:00:00

**实现方式**:
- 在 AI 对话页面基础上扩展，新增可调节分屏布局
- 右侧进度面板：步骤条 + 当前步骤轻量预览
- Pipeline 状态管理（`usePipelineStore`）
- 6 个步骤预览组件（ScriptPreview / CharacterPreview / StoryboardPreview / VideoPreview / AudioPreview / ComposePreview）
- 消息排队机制、模式选择（全自动/每步确认/仅预览）
- 完成卡片（查看成片/编辑剧本/调整分镜）

**设计方案**: [D-001] Chat Studio 一站式创作指挥中心设计方案

**关联文件**:
- `src/pages/Chat.tsx`（改造）
- `src/store/usePipelineStore.ts`（新增）
- `src/components/pipeline/`（新增目录）

**注意事项**:
- 面板内只做轻量交互，复杂编辑跳转专属页面
- 6 个步骤的数据与对应页面共享同一份 store
- 失败时暂停流程，用户决定重试或跳过

---

## [F-013] SSE 流式输出 + 思考面板 + 深度思考 + 取消生成 ← [R-013], [R-014], [R-015], [R-016]

**状态**: 已完成  **实现时间**: 2026-06-12 01:40:00  **最后更新**: 2026-06-12 01:40:00

**实现方式**:
- **SSE 流式**: `fetchStreamResponse` 通过 `fetch` + `ReadableStream` 解析 SSE 分块（thinking/content/done）
- **思考面板**: `ThinkingPanel` 组件，紫色主题，可折叠，默认折叠，流式光标
- **深度思考**: `ModelSkillBar` 中的 toggle 按钮，紫色高亮，发送 `deep_think: true` 到后端
- **取消生成**: `cancelGeneration` 中止 `AbortController`，标记消息为"（已取消）"
- **Markdown 渲染**: `ReactMarkdown` + Tailwind typography classes（h1/h2/h3/p/ul/ol/code/pre/table/blockquote）
- **后端 Provider 映射**: `get_provider` 返回 `(provider, default_model)` 元组，前端传 provider 名，后端自动用正确的模型名

**关联文件**:
- `src/store/useChatStore.ts` — fetchStreamResponse、cancelGeneration、CREATION_KEYWORDS
- `src/pages/Chat.tsx` — ThinkingPanel、ReactMarkdown、取消按钮
- `backend/app/services/llm_service.py` — OpenAICompatibleProvider.chat_stream、get_provider
- `backend/app/api/v1/pipeline.py` — /chat/stream SSE 端点

**已知问题**:
- Pipeline 步骤仍使用 mock 数据（simulatePipeline），需接入真实后端 Pipeline API

---

## [F-014] FastAPI 后端框架 ← [R-021]

**状态**: 已完成  **实现时间**: 2026-06-11 23:30:00  **最后更新**: 2026-06-12 01:40:00

**实现方式**:
- FastAPI 应用入口 (`main.py`) + CORS 中间件
- 7 个路由模块: projects, scripts, characters, storyboards, generation, skills, pipeline
- LLM 服务封装: MiMo / DeepSeek 统一调用（OpenAI 兼容协议）
- SSE 流式输出: `StreamingResponse` + `event_generator`
- Pipeline 状态管理: 内存存储（后续替换为 Redis）

**关联文件**:
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/api/v1/*.py`
- `backend/app/services/llm_service.py`
- `backend/app/models/schemas.py`
