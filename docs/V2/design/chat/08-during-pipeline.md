# [D-V2-C08] Pipeline 进行中交互

**关联需求**: R-061  
**前置**: [07-pipeline-start.md](07-pipeline-start.md)

---

## 1. 职责

定义 Pipeline running/paused 期间 Chat 输入、消息、面板的行为。

---

## 2. Chat 消息类型（Pipeline 阶段）

| type | 来源 | 行为 |
|------|------|------|
| progress_update | SSE step_progress | **同 step 替换** content |
| step_complete | step_completed / waiting_confirmation | append；confirm 模式带按钮 |
| error_card | step_failed | append；retryable |
| pipeline_complete | pipeline_completed | append 大卡 + clip 列表 |

---

## 3. progress_update 替换规则

`updatePipelineProgressMessage(sessionId, step, content)`:

- 找 `type=progress_update && pipelineStep===step`
- 有则 update；无则 append

避免同一步刷屏。

---

## 4. 用户发消息（R-061）

| 策略 | V2 规格 |
|------|---------|
| 推荐 | **排队**：isGenerating 或 pipelineRunning 时输入 disabled 或 toast「制作进行中，请完成后发送」 |
| 备选 | 允许发送但不触发新创作流，仅 append user 消息待处理 |

当前实现：部分 disabled；文档以 **排队 + toast** 为准。

---

## 5. 面板交互

- 可关闭 panel（panelOpen=false）；SSE 继续
- ProgressPanel 全局可见
- 切页 Layout 不断流
- stale 90s → 横幅 + 重试

---

## 6. confirm 模式

`step_complete` + `waitingConfirmation` → 「确认继续」→ POST resume

---

## 7. 边界

| 场景 | 行为 |
|------|------|
| 切 session | 不显示其他 session 的 Pipeline 面板（isPipelineBoundToChat） |
| 删除项目 | dismissPipelineForProject |
| 刷新 | restorePipelineFromStorage |

---

## 8. 验收

- [ ] progress 同 step 不重复多条
- [ ] 切页 SSE 仍更新
- [ ] confirm 暂停可 resume

---

## 9. 代码锚点

`pipeline-stream.ts`, `useChatStore.updatePipelineProgressMessage`, `PipelinePanel`
