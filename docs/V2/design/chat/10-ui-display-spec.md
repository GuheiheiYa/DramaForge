# [D-V2-C10] Chat UI 展示规范

**关联需求**: R-062  
**继承**: [`docs/V1/design/ai-display-spec.md`](../../V1/design/ai-display-spec.md)

---

## 1. 消息类型总表

| type | 触发 | 展示 |
|------|------|------|
| text | 普通/流式 | Markdown + Thinking 折叠 |
| plan_confirm_card | A3 结束 | PlanConfirmCard |
| plan_card | 确认方案 | ModeSelectorCard（五步） |
| progress_update | SSE progress | 灰色居中一行；同 step 替换 |
| step_complete | SSE completed/waiting | 绿勾卡 + 可选确认按钮 |
| error_card | SSE failed | 红框 + 重试/跳过；resolved 隐藏 |
| pipeline_complete | SSE done | 完成卡 + clip 列表/跳转 |
| image / video | 单条生成 | 媒体预览 |

---

## 2. TypingIndicator

| pipelineStage | 文案 |
|---------------|------|
| analyzing | 正在分析创意… |
| replying | AI 正在回复… |

---

## 3. PlanConfirmCard

- 方案摘要 180 字 + 展开全文  
- 按钮：确认 / 继续修改 / 重新生成  
- planConfirmed 后：只读绿底「✓ 方案已确认」  
- superseded：灰底不可点  

---

## 4. ModeSelectorCard（V2）

- 标题：📋 制作计划  
- 五步图示（无配音合成为主步）  
- 三模式 grid  
- superseded / 非 activeTurn：**灰底「已被新方案替代」**  
- pipelineRunning：**disabled**

---

## 5. PipelinePanel

| status | 行为 |
|--------|------|
| idle | 隐藏 |
| running | 50/50；当前步高亮 |
| paused / failed | 错误态 + 重试 |
| completed | 保持；VideoPreview / clip 列表 |

顶栏：项目名、取消、关闭 panel。

---

## 6. pipeline_complete 卡（V2 新增）

```
✓ 《项目名》制作完成
共 N 个视频片段
[片段1 播放] [片段2 播放] …
[打开合成室精修] [查看分镜] （可选链接）
```

---

## 7. 滚动策略

- 新 user/assistant/plan/error 消息 → scrollIntoView smooth  
- supersede 不滚动到旧卡  

---

## 8. 颜色（继承 V1）

| 元素 | 色 |
|------|-----|
| 用户气泡 | 右对齐品牌色 |
| AI 气泡 | 白底 border |
| 错误 | #B85C50 / #FDF2F0 |
| 成功 | #5B8C5A / #F0F5F0 |
| superseded | #EFEDEB 灰 |

---

## 9. ProgressPanel（全局）

右下角迷你条 → 展开 → 「在 Chat 中打开制作面板」

---

## 10. 验收

- [ ] 各 type 渲染符合上表
- [ ] superseded 视觉区分
- [ ] pipeline_complete 含 clip 入口

---

## 11. 代码锚点

`Chat.tsx` MessageBubble, PipelinePanel, ProgressPanel
