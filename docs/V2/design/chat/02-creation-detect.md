# [D-V2-C02] 创作检测

**关联需求**: R-057  
**前置**: [01-send-message.md](01-send-message.md)  
**后置**: [03-plan-stream.md](03-plan-stream.md) 或 普通对话

---

## 1. 职责

判断用户消息是否进入 **创作 Pipeline 前置流**（阶段 A）。

---

## 2. 规则

```typescript
CREATION_KEYWORDS = [
  '帮我做', '帮我生成', '帮我创作',
  '做一个', '生成一个', '创作一个',
  '制作', '漫剧', '短剧', '剧本',
]
isCreationReq = CREATION_KEYWORDS.some(kw => content.includes(kw))
```

扩展（V2 建议）：正则「帮我.*(漫剧|短剧|视频)」

---

## 3. 分流

| isCreationReq | 路径 |
|---------------|------|
| true | `runCreationPipeline()` → A3 |
| false | `fetchStreamResponse()` 普通 Chat |

---

## 4. 修改意见 vs 新创作

| 用户消息 | 判定 |
|----------|------|
| planPending 下「把女主改成…」 | 普通流式或带上下文 regenerate（无新 turn） |
| 「帮我重新做一个校园剧」 | 新 turn + 创作流 |
| 仅改 typo | 普通对话 |

---

## 5. 边界

| 场景 | 行为 |
|------|------|
| 关键词误判 | 用户可普通聊；或点「重新生成」 |
| 英文创意 | P2 扩展关键词 |

---

## 6. 验收

- [ ] 含「帮我做一个短剧」走创作流
- [ ] 「你好」走普通流

---

## 7. 代码锚点

`useChatStore.sendMessage` L247
