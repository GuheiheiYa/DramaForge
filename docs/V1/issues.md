# 问题追踪

## Open（未解决）

### [ISS-012] Pipeline 执行全是前端模拟，数据未真实提取和执行
- **关联需求**: [R-029], [R-012]
- **关联功能**: [F-012] Chat Studio
- **问题描述**:
  1. `simulatePipeline()` 使用 setTimeout 模拟 6 步，不调用后端 pipeline_service
  2. AI 回复数据提取使用正则解析，质量差（场景 location/timeTag 全是默认值，角色只有名字）
  3. 步骤 4-6（视频/配音/合成）是硬编码 mock 数据
  4. 三种执行模式（auto/confirm/preview）行为完全一样
  5. 后端 pipeline_service.py 已实现 6 步编排但未被调用
- **设计方案**: [D-003] Pipeline 真实执行设计方案
- **状态**: open
- **记录时间**: 2026-06-16 19:45:00

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

### [ISS-015] Chat 会话刷新后丢失（无持久化）
- **关联需求**: [R-056], [R-012]
- **关联功能**: [F-012] Chat Studio
- **问题描述**: `useChatStore.sessions` 仅存内存，刷新页面后会话列表与消息历史全部丢失
- **解决方案**: 使用 zustand `persist` 将会话列表、当前会话 ID、模型/SKILL 选择写入 `localStorage`（`dramaforge-chat-store`）
- **状态**: closed
- **记录时间**: 2026-06-17 23:20:00
- **关闭时间**: 2026-06-17 23:23:00

### [ISS-014] 分镜工作台进入崩溃 `Cannot read properties of undefined (reading 'bg')`
- **关联需求**: [R-004], [R-036]
- **关联功能**: [F-004] 分镜工作台
- **问题描述**: Pipeline 写入的 `shot_type` 可能为英文或非枚举值（如 `medium shot`），`SHOT_TYPE_STYLES[shot.shotType]` 为 `undefined`，访问 `.bg` 导致页面白屏
- **解决方案**: 新增 `normalizeShotType` / `getShotTypeStyle` / `normalizeShotStatus`；StoryboardWorkbench 加载失败不再回退 mock
- **状态**: closed
- **记录时间**: 2026-06-17 23:20:00
- **关闭时间**: 2026-06-17 23:23:00

### [ISS-013] Pipeline 视频步 error_card 点击重试后气泡不消失
- **关联需求**: [R-055], [R-012]
- **关联功能**: [F-012] Chat Studio
- **问题描述**: `error_card` 消息无 `resolved` 标记，重试后旧错误气泡仍显示
- **解决方案**: 新增 `resolvePipelineErrorMessage()`，在 `retryFailedStep` / `skipFailedStep` 时标记对应 step 的 error_card 为已解决
- **状态**: closed
- **记录时间**: 2026-06-17 23:20:00
- **关闭时间**: 2026-06-17 23:23:00

### [ISS-011] 后端 4 个路由 await 运算符优先级 Bug 导致 500 + CORS 失败
- **关联需求**: [R-010], [R-009], [R-008]
- **关联功能**: [F-010], [F-009], [F-008]
- **问题描述**: `await db.execute(query).scalars().all()` 中 `await` 优先级低于 `.`，导致对未 await 的协程调用 `.scalars()`，抛出 `AttributeError: 'coroutine' object has no attribute 'scalars'`，端点返回 500 且无 CORS 头，浏览器报 CORS 错误
- **影响范围**: notifications.py（3 处）、costs.py（2 处）、assets.py（1 处）、generation.py（2 处），共 10 处
- **修复方案**: 全部改为 `(await db.execute(query)).scalars().all()`，添加括号确保先 await
- **状态**: closed
- **记录时间**: 2026-06-16 14:46:00
- **关闭时间**: 2026-06-16 14:50:00

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

### [ISS-007] 项目工作台无法跳转到对应剧本/角色
- **关联需求**: [R-001], [R-002], [R-003]
- **关联功能**: [F-001], [F-002], [F-003]
- **问题描述**: 从 Dashboard 点击项目卡片跳转到剧本编辑器/角色管理台时，虽然设置了 selectedProjectId，但数据库中的剧本/角色数据的 project_id 与项目 ID 不匹配，导致无法加载对应数据
- **解决方案**: 修复数据库中所有表的 project_id，将其更新为正确的项目 ID
- **状态**: closed
- **记录时间**: 2026-06-15 18:00:00
- **关闭时间**: 2026-06-15 18:10:00

### [ISS-008] 右上角工具栏弹窗被遮挡
- **关联需求**: [R-001]
- **关联功能**: [F-001] 项目 Dashboard
- **问题描述**: 顶部工具栏的通知面板、帮助菜单等弹窗被其他元素遮挡，z-index 层级不正确
- **状态**: open
- **记录时间**: 2026-06-15 18:00:00

### [ISS-009] 角色管理台/剧本编辑器/分镜工作台/成片合成室无法选择项目
- **关联需求**: [R-002], [R-003], [R-004], [R-005]
- **关联功能**: [F-002], [F-003], [F-004], [F-005]
- **问题描述**: 角色管理台、剧本编辑器、分镜工作台、成片合成室页面没有项目选择器，用户无法切换当前操作的项目
- **解决方案**: 创建通用 ProjectSelector 组件，在各页面中添加
- **状态**: closed
- **记录时间**: 2026-06-15 18:00:00
- **关闭时间**: 2026-06-15 18:10:00

### [ISS-010] skills 和 storyboards 接口请求无返回
- **关联需求**: [R-006], [R-004]
- **关联功能**: [F-006], [F-004]
- **问题描述**: skills 和 storyboards API 接口一直在请求，没有返回结果，可能是后端查询逻辑有问题
- **解决方案**: 后端使用异步会话 AsyncSession，但路由使用的是同步会话 Session，导致请求卡住。已全部改为异步调用
- **状态**: closed
- **记录时间**: 2026-06-15 18:00:00
- **关闭时间**: 2026-06-15 18:10:00
