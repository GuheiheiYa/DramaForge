# [D-V2-C09] 错误与重试（全链路）

**关联需求**: R-059  
**状态**: 权威规格

---

## 1. 错误分层

| 层级 | 场景 | 触发 | Chat UI | 面板 UI | API / 动作 | 状态清理 |
|------|------|------|---------|---------|------------|----------|
| **L1** | Chat 流式失败 | network/4xx | 错误文本气泡 | — | 用户重发 | isGenerating=false |
| **L2** | 方案空 | LLM 无输出 | 无 confirm 卡 | — | 重新生成 | creativePlanText=null |
| **L3** | Pipeline 单步失败 | step_failed | error_card | 重试/跳过 | POST retry/skip | resolvePipelineErrorMessage |
| **L4** | SSE stale | 90s 无 progress | — | 横幅+重试 | retry + resubscribe | stale=false |
| **L5** | start 失败 | start 4xx/500 | toast | — | 无 run | pipeline idle |
| **L6** | 用户取消 | 点取消 | — | 取消按钮 | POST pause | reset pipeline store |

---

## 2. error_card 规范

```typescript
{
  type: 'error_card',
  content: string,
  pipelineStep: number,
  pipelineError: { message: string; retryable: boolean },
  resolved?: boolean,
}
```

| retryable | 按钮 |
|-----------|------|
| true | 重试 + 跳过 |
| false | 跳过 或 「前往工作台」链接 |

---

## 3. 重试后 UI（L3）

`retryFailedStep(step)`:

1. `resolvePipelineErrorMessage(sessionId, step)` → resolved=true，气泡折叠或隐藏
2. POST retry
3. retryStep + subscribePipelineStream
4. toast 正在重试

**同 step 多次失败**：新 error_card append；旧 mark resolved（与 V1 一致）。

---

## 4. skip

`skipFailedStep` → resolved + POST skip → 继续后续步（若 backend 支持）

---

## 5. cancelActivePipeline（L6）

1. cleanupPipelineStream  
2. POST pause  
3. reset usePipelineStore  
4. clearStoredPipeline  
5. toast 已取消  

**Chat plan 卡**：未 start 则仍有效；已 start 后 cancel → 文档建议不自动 supersede，用户可继续用同方案 restart；若 **新创作** 则 supersede（见 C05）。

---

## 6. 视频 content_policy

自动 sanitize 重试 1 次；仍失败 → L3 error_card。

---

## 7. 非 retryable 示例

| 错误 | 处理 |
|------|------|
| 项目不存在 | toast；clear storage |
| 鉴权失败 | toast 检查 API Key |

---

## 8. 验收

- [ ] 重试后 error_card resolved
- [ ] stale 可重试
- [ ] cancel 后 panel idle

---

## 9. 代码锚点

`usePipelineExecution`, `resolvePipelineErrorMessage`, `MessageBubble` error_card 分支
