# [D-V2-C03] 方案流式生成

**关联需求**: R-057  
**前置**: [02-creation-detect.md](02-creation-detect.md)  
**后置**: [04-plan-confirm.md](04-plan-confirm.md)

---

## 1. 职责

单次 LLM 流式输出 **Markdown 创作方案**（非 JSON）。

---

## 2. API

`POST /api/v1/pipeline/chat/stream`

Body: `{ messages, model, deep_think, stream: true }`

---

## 3. 方案结构（prompt 要求）

1. 项目标题  
2. 故事梗概  
3. 分集规划  
4. 主要角色  
5. 视觉风格  
6. 关键场景  

---

## 4. Store 更新

| 字段 | 时机 |
|------|------|
| pipelineStage | 'replying' |
| creativePlanText | 流结束 strip `<pipeline_data>` |
| lastCreationUserMessage | 本轮用户创意 |

---

## 5. 消息产出

流结束后 append（100ms delay）：

```typescript
{
  type: 'plan_confirm_card',
  content: extractProjectTitle(plan) || '创作项目',
  creationTurnId: activeTurnId,
  superseded: false,
}
```

---

## 6. UI

- 流式 Markdown 气泡 + ThinkingPanel（若 deepThink）
- TypingIndicator: pipelineStage=replying → 「AI 正在回复…」

---

## 7. 边界

| 场景 | 行为 |
|------|------|
| API 4xx/5xx | setError 文本；**无** plan_confirm_card |
| 空内容 | 无 confirm 卡；toast 重试 |
| 用户 cancel | 见 01；无 confirm 卡 |
| AbortError | 静默 return |

---

## 8. 验收

- [ ] 流式 Markdown 非 JSON
- [ ] 结束出现 plan_confirm_card 且带 turnId

---

## 9. 代码锚点

`runCreationPipeline`, `fetchStreamResponse`, `finishStream`
