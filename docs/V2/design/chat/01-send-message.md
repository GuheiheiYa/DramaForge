# [D-V2-C01] 用户发消息

**关联需求**: R-057, R-060, R-061  
**前置**: —  
**后置**: [02-creation-detect.md](02-creation-detect.md)

---

## 1. 职责

接收用户输入，创建 user 消息 + assistant 流式占位，触发后续分流。

---

## 2. 输入 / 输出

| 输入 | 约束 |
|------|------|
| content | 非空 trim |
| isGenerating | true 时拒绝 |

| 输出 | 说明 |
|------|------|
| user ChatMessage | role=user |
| assistant placeholder | isStreaming=true |
| 新 creationTurnId | 若判定为新创作轮 |

---

## 3. 前置条件

- 无 session → `createSession()`
- 更新 session.title（首条消息前 30 字）

---

## 4. 新创作轮判定

满足任一 → **新 turn** + supersede 旧 plan 卡：

- 消息含 `CREATION_KEYWORDS`
- 消息含「重新做」「换个故事」「重新生成项目」等
- 当前无进行中的 Pipeline 且用户意图为全新项目

否则 → 保持 activeTurnId（修改意见 / 普通对话）。

---

## 5. cancelGeneration

- AbortController.abort()
- 流式消息 content → 「（已取消）」或保留 partial
- **不** 注入 plan_card（V2）
- pipelineStage → null

---

## 6. 持久化（R-060）

| 已 persist | 未 persist（实现缺口） |
|------------|------------------------|
| sessions, messages | creativePlanText, activeTurnId, planConfirmed |

**恢复策略**：

1. 找最后一条 assistant Markdown + 最后 creationTurnId 消息
2. 或 toast「请重新确认方案」

---

## 7. 边界

| 场景 | 行为 |
|------|------|
| 空消息 | 忽略 |
| 生成中连点发送 | 忽略 |
| 切换 session | 加载该 session messages；activeTurnId 随 session |
| 删除 session | 若绑定 Pipeline → dismiss 或 warn |

---

## 8. 验收

- [ ] 首条消息创建 session
- [ ] 刷新后会话列表仍在
- [ ] 新创作轮 supersede 旧卡

---

## 9. 代码锚点

`useChatStore.sendMessage`, `cancelGeneration`
