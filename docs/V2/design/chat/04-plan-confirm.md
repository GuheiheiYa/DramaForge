# [D-V2-C04] 方案确认

**关联需求**: R-057, R-058  
**前置**: [03-plan-stream.md](03-plan-stream.md)  
**后置**: [05-mode-select.md](05-mode-select.md)

---

## 1. 职责

用户审阅方案：确认 / 继续修改 / 重新生成。

---

## 2. PlanConfirmCard 按钮

| 按钮 | 行为 | 状态 | 消息 |
|------|------|------|------|
| 确认方案 | confirmPlan() | planConfirmed=true | append plan_card |
| 继续修改 | focus 输入框 | 无 | toast 提示 |
| 重新生成 | regeneratePlan() | planConfirmed=false, 新流式 | supersede 旧 confirm；新 confirm 链 |

---

## 3. confirmPlan 产出

```typescript
{
  type: 'plan_card',
  content: title,
  creationTurnId: activeTurnId,
  superseded: false,
}
```

同 turn 内旧 plan_confirm_card → 只读「✓ 方案已确认」。

---

## 4. regeneratePlan

- planConfirmed=false, creativePlanText=null  
- append 新 streaming 占位  
- `runCreationPipeline(..., resetContext=false)` 或 true 视实现  
- 旧 confirm 卡 superseded（同 turn 内仅保留最新 confirm）

---

## 5. 边界

| 场景 | 行为 |
|------|------|
| !creativePlanText | 确认按钮 disabled |
| pipelineRunning | 整卡 disabled |
| planConfirmed 再点确认 | 忽略 |
| 非 activeTurn 卡 | 只读 |

---

## 6. 验收

- [ ] 确认后出现 plan_card
- [ ] 重新生成后旧方案卡 superseded 或只读

---

## 7. 代码锚点

`Chat.tsx` PlanConfirmCard; `useChatStore.confirmPlan`, `regeneratePlan`
