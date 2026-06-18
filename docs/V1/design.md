# 设计概览

**最后更新**: 2026-06-17

## 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | React 19 + TypeScript | 组合式组件开发 |
| 构建工具 | Vite 7 | 快速 HMR，生产构建 |
| UI 框架 | shadcn/ui + Tailwind CSS 3 | Radix UI 原语 + 原子化样式 |
| 状态管理 | Zustand 5 | 轻量级全局状态 |
| 路由 | React Router 7 | SPA 路由 |
| 动画 | Framer Motion 12 | 页面过渡、微交互 |
| 图标 | Lucide React | 统一图标库 |
| 后端 | Python + FastAPI | REST + SSE API（端口 7790） |
| 数据库 | SQLite + SQLAlchemy 2 async | 业务数据持久化 |
| Pipeline 编排 | asyncio + pipeline_executor | 六步真实 LLM/生图/生视频 |
| 任务队列（规划） | Celery + Redis | 备用路径，主流程未启用 |

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React + Vite)                  │
│  Chat Studio ──► useChatStore / usePipelineStore         │
│  ProgressPanel + PipelineLifecycle (Layout 全局)         │
│  Dashboard / ScriptEditor / Character / Storyboard / Composer │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP + SSE
┌───────────────────────────▼─────────────────────────────┐
│                   后端 (FastAPI)                          │
│  pipeline.py ──► pipeline_executor ──► pipeline_service   │
│  LLM (MiMo/DeepSeek) │ Agnes 图像/视频 │ TTS/FFmpeg(占位) │
└───────────────────────────┬─────────────────────────────┘
                            │
                     SQLite (projects, pipeline_runs, …)
```

**全流程规格**: [D-004 pipeline-full-flow-spec.md](design/pipeline-full-flow-spec.md)

## 设计文档索引

| ID | 文档 | 关联需求 | 说明 |
|----|------|---------|------|
| [D-001] | [Chat Studio 一站式创作指挥中心](design/chat-studio-design.md) | [R-012] | UI/交互设计（已实现） |
| [D-002] | [项目上下文贯穿设计](design/project-context-design.md) | — | projectId 传递 |
| [D-003] | [Pipeline 真实执行设计](design/pipeline-real-execution-design.md) | [R-029] | **历史背景**，见 D-004 |
| [D-004] | **[全流程规格书](design/pipeline-full-flow-spec.md)** | [R-012][R-029] | **权威规格** |
| — | [全流程改造摘要](design/pipeline-overhaul-design.md) | — | 改造动机与索引 |
| — | [AI 展示规范](design/ai-display-spec.md) | — | Chat 消息类型 |
| — | [数据模型](../data-model.md) | — | 表结构与 Pipeline 映射 |
