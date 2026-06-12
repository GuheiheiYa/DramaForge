# 问题追踪

## Open（未解决）

### [ISS-001] 项目数据全部为 mock
- **关联需求**: [R-001]
- **关联功能**: [F-001] 项目 Dashboard
- **问题描述**: 所有页面数据均为前端硬编码 mock，未接入后端 API，无法持久化
- **状态**: open
- **记录时间**: 2026-06-11 00:00:00

### [ISS-002] 路由页面之间缺少项目上下文传递
- **关联需求**: [R-001]
- **关联功能**: [F-001] 项目 Dashboard
- **问题描述**: 从 Dashboard 点击项目卡片跳转到剧本编辑器时，未传递项目 ID，各页面无法感知当前操作的是哪个项目
- **状态**: open
- **记录时间**: 2026-06-11 00:00:00

### [ISS-003] 后端框架未搭建
- **关联需求**: [R-021]
- **问题描述**: FastAPI + Celery + Redis 后端框架尚未初始化，所有 AI 生成功能依赖此后端
- **状态**: open
- **记录时间**: 2026-06-11 00:00:00

### [ISS-004] AI 思考面板未实现
- **关联需求**: [R-014], [R-015], [R-016]
- **问题描述**: MiMo API 已接入并返回真实回复，但前端没有展示思考过程面板，也没有深度思考开关，输出不是流式而是等待完整回复后一次性显示
- **排查结果**: 1) useChatStore 的 fetchAIResponse 用的是普通 fetch 等待完整响应，未接入 SSE 流式；2) Chat.tsx 的 MessageBubble 只渲染纯文本，没有 thinking 面板组件；3) ModelSkillBar 没有深度思考 toggle
- **状态**: closed
- **记录时间**: 2026-06-11 23:30:00
- **关闭时间**: 2026-06-12 01:40:00

### [ISS-005] Pipeline 面板不显示 + Markdown 不渲染
- **关联需求**: [R-012], [R-016]
- **关联功能**: [F-012], [F-013]
- **问题描述**: AI 回复后，右侧 Pipeline 面板没有出现，Markdown 文字没有转换为富文本
- **排查结果**: 详见 `docs/issues/pipeline-panel-bug-report.md`
  - Bug A: 前端发送 `message`（字符串）vs 后端期望 `messages`（数组），FastAPI 返回 422
  - Bug B: `setError` 不调用 `finishStream`，出错时 plan_card 不注入
  - Bug C: 内容 div 渲染条件 `(!isEmpty || !message.isStreaming)` 逻辑错误，"思考中..." 永远不显示
  - Bug D: 后端 provider 名当 model 名传给 MiMo API，导致模型名错误
- **修复方案**: 1) 后端 `get_provider` 返回 (provider, default_model) 元组；2) `setError` 增加 plan_card 注入逻辑；3) 删除内容 div 外层条件；4) `cancelGeneration` 增加 plan_card 注入
- **状态**: closed
- **记录时间**: 2026-06-12 01:30:00
- **关闭时间**: 2026-06-12 01:40:00

## Closed（已解决）

### [ISS-004] AI 思考面板未实现
- 解决方案: SSE 流式接入 + ThinkingPanel 组件 + 深度思考 toggle + Markdown 渲染
- 解决时间: 2026-06-12 01:40:00

### [ISS-005] Pipeline 面板不显示 + Markdown 不渲染
- 解决方案: 修复 API 契约、错误处理、渲染条件、模型名映射
- 解决时间: 2026-06-12 01:40:00

### [ISS-006] simulatePipeline 使用硬编码 mock 数据
- **关联需求**: [R-012]
- **关联功能**: [F-012] Chat Studio
- **问题描述**: simulatePipeline 中的剧本和角色数据完全是硬编码的，与 AI 回复内容无关；handleModeSelect 标题硬编码为"记忆碎片"
- **解决方案**: 创建 pipeline-data-extractor.ts 从 AI 回复中提取结构化数据，finishStream 自动提取并存入 store，simulatePipeline 使用提取数据
- **状态**: closed
- **记录时间**: 2026-06-12 10:00:00
- **关闭时间**: 2026-06-12 10:30:00
