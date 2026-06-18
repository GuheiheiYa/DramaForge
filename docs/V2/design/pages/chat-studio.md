# [D-V2-PG02] Chat Studio

**关联需求**: R-057 ~ R-062, R-063  
**路由**: `/chat`, `/chat?projectId=&sessionId=`  
**代码**: `app/src/pages/Chat.tsx`

---

## 1. 页面职责

V2 **指挥中心**：创作轮次、方案确认、五步制作计划、Pipeline 面板、clip 交付。

---

## 2. 权威规格

全部 Chat 行为以 [`design/chat/`](../chat/) 为准，本文仅索引：

| 文档 | 主题 |
|------|------|
| [00-state-machine](../chat/00-state-machine.md) | creationTurn |
| [01~08](../chat/01-send-message.md) | 发消息→启动 |
| [09](../chat/09-error-retry-recovery.md) | 重试 |
| [10](../chat/10-ui-display-spec.md) | UI |

---

## 3. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 自动路径 | **主界面** |
| 精修路径 | 完成后仍在此看 clip |
| 手动路径 | 可选 AI 助手 |

---

## 4. 布局

```
Chat 消息区 | 拖拽条 | Pipeline 面板（running 时）
输入栏      |        |
```

`react-resizable-panels`；idle 时面板隐藏。

---

## 5. 数据读写

| 存储 | 内容 |
|------|------|
| useChatStore | sessions, turns |
| usePipelineStore | 五步进度 |
| localStorage | chat + active_pipeline |

---

## 6. 边界

见 chat/*；重点 ISS-V2-001 plan 卡位置。

---

## 7. 验收

见 [testing/chat-boundary-checklist.md](../../testing/chat-boundary-checklist.md)
