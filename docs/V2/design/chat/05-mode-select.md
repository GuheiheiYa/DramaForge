# [D-V2-C05] 制作计划卡（模式选择）

**关联需求**: R-058, R-063  
**前置**: [04-plan-confirm.md](04-plan-confirm.md)  
**后置**: [06-project-bind.md](06-project-bind.md)

---

## 1. 职责

展示 **V2 五步** 制作计划，用户选择 auto / confirm / preview。

---

## 2. ModeSelectorCard 内容（V2）

```
① 剧本 → ② 角色设定包 → ③ 分镜规划 → ④ 关键帧 → ⑤ 图生视频
预计 15–20 分钟（不含配音/合成）
```

**不** 展示配音/合成为主步骤（Deferred 脚注可选）。

---

## 3. 有效卡规则（ISS-V2-001）

仅 **activeTurnId + !superseded + type=plan_card** 的 **最后一张** 可点击模式。

| 触发 supersede | 说明 |
|----------------|------|
| 新 creationTurn | 用户重新创作 |
| cancel Pipeline 后新消息 | 新 turn 或同 turn 重新 confirm |
| Pipeline start 成功 | 可选：mode 卡只读「已开始制作」 |

取消 Pipeline **未** start：保持 planConfirmed，**同 turn plan_card 仍有效**；若用户再发 **修改剧本** 消息 → 新 turn → 新 confirm 链 → **新 plan_card 在底部**。

---

## 4. 模式选择 handler

```typescript
handleModeSelect(mode):
  if !planConfirmed → toast 请先确认
  if pipelineRunning → return
  if boundProjectId → executePipeline(mode, { projectId })
  else → StartDialog
```

---

## 5. disabled 条件

- pipelineStatus === 'running'
- startingPipeline
- message.superseded
- message.creationTurnId !== activeTurnId

---

## 6. UI：superseded 卡

```
灰底边框 · 文案「已被新方案替代」· 三模式按钮 disabled
```

---

## 7. 验收（ISS-V2-001）

```
Given plan_card 已显示
When  cancel 或 改剧本重发
Then  最新流末尾有新的 confirm/plan 卡
And   旧 plan_card superseded
And   scrollIntoView 到新卡
```

---

## 8. 代码锚点

`Chat.tsx` ModeSelectorCard, handleModeSelect
