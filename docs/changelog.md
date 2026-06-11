# 更新日志

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
