# [D-001] Chat Studio — 一站式创作指挥中心 设计方案

**关联需求**: [R-012]  
**设计时间**: 2026-06-11  
**最后更新**: 2026-06-17  
**状态**: **已实现（持续迭代）** — 完整流程见 **[D-004 全流程规格书](pipeline-full-flow-spec.md)**

---

## 0. 实现说明（2026-06-17）

与初版设计相比，当前实现的关键变化：

| 原设计 | 现实现 |
|--------|--------|
| 隐藏 JSON 双次 LLM | **单次流式 Markdown 创作方案** |
| `extractedScript` 主路径 | `creativePlanText` + `planConfirmed` |
| `simulatePipeline` / setTimeout | `POST /pipeline/start` + SSE |
| 面板 SSE 仅 Chat 页 | **Layout 级 `PipelineLifecycle`**，切页不断流 |
| 无全局进度入口 | 右下角 **ProgressPanel** 可跳回 Chat |

**Chat 创作前置状态**（`useChatStore`）：

- `creativePlanText` — 方案全文  
- `planConfirmed` — 是否已确认  
- `lastCreationUserMessage` — 重生成用  
- 消息类型：`plan_confirm_card` → `plan_card` → Pipeline 相关消息  

**面板绑定**（`usePipelineStore` + `pipeline-storage.ts`）：

- `chatSessionId` — 绑定启动 Pipeline 的会话  
- `projectId` — 绑定项目  
- `isPipelineBoundToChat` / `isPipelineVisibleForChat` — 可见性规则  

---

## 1. 概述

将现有的 AI 对话页面（`/chat`）升级为「Chat Studio」——一个对话驱动的全流程创作指挥中心。用户只需在聊天框中用自然语言描述创作意图，AI 即可自动编排执行「剧本 → 角色 → 分镜 → 视频 → 配音 → 合成」的完整流程。执行过程中，右侧滑出可调节宽度的进度面板，实时展示每个步骤的轻量预览。

### 核心价值

- **一句话出成品**：用户无需手动操作 6 个独立页面，对话即创作
- **实时可见**：右侧面板让用户随时看到 AI 在做什么、做得怎么样
- **数据一致**：面板中的预览与各专属页面共享同一份数据，跳转即可微调
- **可控节奏**：支持全自动/每步确认/仅预览三种模式，适配不同用户习惯

### 设计决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 触发方式 | 用户可选模式（全自动/每步确认/仅预览） | 不同用户习惯不同，给予选择权 |
| 工作中发消息 | 排队，当前步骤完成后处理 | 体验平滑，实现不复杂 |
| 步骤切换 | 自由切换，已完成只读，当前可交互 | 用户需要对照查看各步骤 |
| 失败处理 | 暂停，用户决定重试或跳过 | 视频失败后继续合成无意义 |
| 面板交互 | 轻量预览+小修，复杂编辑跳转 | 各页面各司其职 |

---

## 2. 架构设计

### 2.1 状态管理

新增 `usePipelineStore`，与 `useChatStore` 和未来的 `useProjectStore` 协同：

```
usePipelineStore
├── status: 'idle' | 'planning' | 'running' | 'paused' | 'completed' | 'failed'
├── mode: 'auto' | 'confirm' | 'preview'
├── currentStep: 0-5
├── panelOpen: boolean
├── panelRatio: number (0.3-0.7)
├── projectId: string | null
├── steps: Step[]
│   ├── [0] script:   { status, data: { episodes, scenes[] } }
│   ├── [1] character: { status, data: { characters[] } }
│   ├── [2] storyboard: { status, data: { shots[] } }
│   ├── [3] video:     { status, data: { clips[], progress } }
│   ├── [4] audio:     { status, data: { voices[], bgm } }
│   └── [5] compose:   { status, data: { videoUrl, duration } }
├── queuedMessages: Message[]
├── error: { step, message, retryable } | null
└── actions:
    ├── startPipeline创意, mode)
    ├── pausePipeline()
    ├── resumePipeline()
    ├── retryStep(stepIndex)
    ├── skipStep(stepIndex)
    ├── switchStep(stepIndex)
    ├── queueMessage(msg)
    ├── processQueue()
    └── completePipeline()
```

### 2.2 数据共享

各步骤的数据结构与对应页面的 store 共享：

| 步骤 | Pipeline 数据源 | 对应页面 Store |
|------|----------------|---------------|
| 剧本 | `steps[0].data` | `useScriptStore`（待建） |
| 角色 | `steps[1].data` | `useCharacterStore`（待建） |
| 分镜 | `steps[2].data` | `useStoryboardStore`（待建） |
| 视频 | `steps[3].data` | 复用分镜 store 的视频字段 |
| 配音 | `steps[4].data` | `useAudioStore`（待建） |
| 合成 | `steps[5].data` | `useComposeStore`（待建） |

Pipeline 写入数据 → 对应 store 同步更新 → 专属页面读取同一份数据。

### 2.3 布局结构

```
┌──────────────────────────┬───┬──────────────────────────┐
│                          │ ⋮ │                          │
│     Chat Panel           │ ⋮ │    Progress Panel        │
│     (消息列表)            │ ⋮ │    ┌──────────────┐      │
│                          │ ⋮ │    │ 步骤条 ①②③④⑤⑥│      │
│                          │ ⋮ │    ├──────────────┤      │
│                          │ ⋮ │    │              │      │
│                          │ ⋮ │    │ 当前步骤预览  │      │
│                          │ ⋮ │    │ (轻量级)      │      │
│                          │ ⋮ │    │              │      │
│                          │ ⋮ │    └──────────────┘      │
├──────────────────────────┤ ⋮ ├──────────────────────────┤
│     Chat Input           │ ⋮ │                          │
└──────────────────────────┴───┴──────────────────────────┘
         ↑                        ↑
    用户对话区               AI 工作展示区
    (原有功能不变)           (Pipeline idle 时隐藏)
```

- 使用 `react-resizable-panels`（已在依赖中）实现可拖拽分隔条
- Pipeline `idle` 时面板隐藏，聊天区占满宽度
- Pipeline `running` / `paused` / `failed` 时面板自动滑出，默认 50/50
- 用户可拖拽调节，最小 30%，最大 70%
- 面板可关闭（✕），关闭后 Pipeline 继续后台运行，步骤条变为聊天区底部的迷你进度条

### 2.4 模式选择

Pipeline 启动前，AI 回复中展示模式选择卡片：

```
┌─────────────────────────────────┐
│ 📋 制作计划                      │
│                                 │
│ ① 剧本 → ② 角色 → ③ 分镜       │
│ → ④ 视频 → ⑤ 配音 → ⑥ 合成     │
│                                 │
│ 预计耗时 15-20 分钟              │
│                                 │
│ 选择执行模式：                    │
│ [🚀 全自动] [✋ 每步确认] [👁 仅预览] │
└─────────────────────────────────┘
```

| 模式 | 行为 |
|------|------|
| 🚀 全自动 | 一口气执行完所有步骤，用户全程不用确认 |
| ✋ 每步确认 | 每完成一步暂停，AI 询问"确认后继续下一步？" |
| 👁 仅预览 | 只生成预览内容（大纲、角色卡片、分镜草图），不调用视频/配音等昂贵 API |

---

## 3. 组件设计

### 3.1 页面组件结构

```
src/pages/Chat.tsx (改造)
├── ChatTopBar          — 标题 + 模型/SKILL 选择
├── ChatMessages        — 消息列表（新增 Pipeline 相关消息类型）
├── ChatInput           — 悬浮输入框（不变）
├── PipelinePanel       — 右侧进度面板（新增）
│   ├── StepBar         — 步骤条 ①②③④⑤⑥
│   └── StepContent     — 当前步骤内容，根据 currentStep 切换
│       ├── ScriptPreview
│       ├── CharacterPreview
│       ├── StoryboardPreview
│       ├── VideoPreview
│       ├── AudioPreview
│       └── ComposePreview
└── ResizablePanel      — 可拖拽分隔条
```

### 3.2 步骤预览组件

每个步骤一个轻量预览组件，只展示核心信息，不做复杂编辑：

#### ScriptPreview（剧本预览）
- 分集列表（标题 + 场景数）
- 当前集的场景标题列表
- 点击场景展开摘要（2-3 句话）
- 交互：编辑场景标题

#### CharacterPreview（角色预览）
- 角色卡片网格（头像 + 名称 + 类型标签）
- 生成状态标记（等待中/生成中/已完成）
- 交互：删除角色、重新生成单个角色

#### StoryboardPreview（分镜预览）
- 缩略图网格（镜号 + 景别标签 + 时长）
- 当前正在生成的分镜高亮
- 交互：删除分镜、重新生成单个分镜

#### VideoPreview（视频预览）
- 视频片段列表（缩略图 + 时长 + 进度条）
- 整体进度百分比
- 交互：暂停/继续生成

#### AudioPreview（配音预览）
- 角色音色列表（角色名 + 音色名称 + 试听按钮）
- BGM 信息（风格 + 时长）
- 交互：切换音色

#### ComposePreview（合成预览）
- 最终视频预览播放器
- 导出按钮（跳转到成片合成室）
- 交互：导出成片

### 3.3 新增消息类型

聊天消息需要支持新的类型：

```typescript
// useChatStore 中的消息类型扩展
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  // 新增
  type?: 'text' | 'plan_card' | 'progress_update' | 'step_complete' | 'pipeline_complete' | 'error_card';
  pipelineData?: any; // 关联的 Pipeline 数据
}
```

新增的消息类型：

| type | 说明 | 展示形式 |
|------|------|---------|
| `plan_card` | AI 回复的制作计划 + 模式选择 | 带按钮的卡片 |
| `progress_update` | 步骤进度更新 | 内联状态文字 |
| `step_complete` | 单步骤完成通知 | 带"查看"按钮的小卡片 |
| `pipeline_complete` | 全流程完成 | 完成卡片（查看成片/编辑剧本/调整分镜） |
| `error_card` | 步骤失败 | 错误卡片（重试/跳过按钮） |

### 3.4 完成卡片

```
┌─────────────────────────────────┐
│ ✓ 《记忆碎片》制作完成！         │
│   共 8 集 · 耗时 18 分钟         │
│                                 │
│ ✅剧本 ✅角色 ✅分镜 ✅视频 ✅配音 │
│                                 │
│ [🎬 查看成片] [📝 编辑剧本] [调整分镜] │
└─────────────────────────────────┘
```

- 主按钮「查看成片」→ 跳转 `/composer`
- 次按钮「编辑剧本」→ 跳转 `/script`
- 次按钮「调整分镜」→ 跳转 `/storyboard`

---

## 4. 消息排队机制

```
用户发消息
  │
  ├─ Pipeline idle / completed → 正常发送，AI 正常回复
  │
  ├─ Pipeline running → 加入 queuedMessages，显示"消息已排队，当前步骤完成后处理"
  │
  └─ Pipeline paused / failed → 正常发送（用户可能在调整指令）
```

当前步骤完成后：
1. 检查 `queuedMessages`
2. 如果有排队消息，AI 先处理这些消息（可能修改后续步骤的参数）
3. 处理完毕后继续下一步

---

## 5. 错误处理

```
步骤执行失败
  │
  ├─ Pipeline.status → 'paused'
  ├─ Pipeline.error → { step, message, retryable }
  ├─ 聊天中插入 error_card 消息
  └─ 右侧面板显示错误状态
       │
       ├─ 用户点击「重试」→ retryStep(stepIndex)，重新执行当前步骤
       │
       └─ 用户点击「跳过」→ skipStep(stepIndex)，标记为 skipped，继续下一步
```

自动重试策略：API 超时等临时性错误，先自动重试 2 次（间隔 5s / 15s），仍然失败再交给用户决定。

---

## 6. 实现路线

### Phase 1：状态与布局（核心骨架）
- 新建 `usePipelineStore`
- 改造 `Chat.tsx` 布局，集成 `react-resizable-panels`
- 实现 `PipelinePanel` + `StepBar` 骨架
- 实现模式选择卡片

### Phase 2：步骤预览组件
- 实现 6 个 `StepPreview` 组件（先用 mock 数据）
- 实现步骤切换逻辑
- 实现轻量交互（删除、重新生成等）

### Phase 3：消息类型扩展
- 扩展 `ChatMessage` 类型
- 实现 `plan_card` / `progress_update` / `step_complete` / `pipeline_complete` / `error_card` 消息渲染
- 实现完成卡片的跳转逻辑

### Phase 4：排队与错误处理
- 实现消息排队机制
- 实现错误暂停 + 重试/跳过逻辑
- 实现自动重试策略

### Phase 5：数据打通
- 将 Pipeline 各步骤的数据与对应页面的 store 打通
- 实现面板预览与专属页面的数据同步
- 端到端测试

---

## 7. 文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/store/usePipelineStore.ts` | Pipeline 状态管理 |
| `src/components/pipeline/PipelinePanel.tsx` | 右侧进度面板容器 |
| `src/components/pipeline/StepBar.tsx` | 步骤条 |
| `src/components/pipeline/StepContent.tsx` | 步骤内容切换器 |
| `src/components/pipeline/ScriptPreview.tsx` | 剧本预览 |
| `src/components/pipeline/CharacterPreview.tsx` | 角色预览 |
| `src/components/pipeline/StoryboardPreview.tsx` | 分镜预览 |
| `src/components/pipeline/VideoPreview.tsx` | 视频预览 |
| `src/components/pipeline/AudioPreview.tsx` | 配音预览 |
| `src/components/pipeline/ComposePreview.tsx` | 合成预览 |
| `src/components/pipeline/PlanCard.tsx` | 制作计划卡片 |
| `src/components/pipeline/CompleteCard.tsx` | 完成卡片 |
| `src/components/pipeline/ErrorCard.tsx` | 错误卡片 |
| `src/components/pipeline/ModeSelector.tsx` | 模式选择器 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/pages/Chat.tsx` | 集成分屏布局、Pipeline 面板、新消息类型 |
| `src/store/useChatStore.ts` | 扩展消息类型、排队机制 |
| `src/components/AppSidebar.tsx` | 可能需要 Pipeline 迷你进度条 |
| `package.json` | 确认 `react-resizable-panels` 已安装（已存在） |
