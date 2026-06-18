# Chat 边界 E2E 验收清单

**规格**: [design/chat/](../design/chat/)  
**关联**: R-057 ~ R-062, ISS-V2-001

---

## 1. 环境

- [ ] 后端 7790、前端 5174
- [ ] LLM API 可用

---

## 2. 创作轮次与 plan 卡（ISS-V2-001）

- [ ] 发创作消息 → 流式方案 → plan_confirm_card
- [ ] 确认 → plan_card 五步文案
- [ ] plan_card 在**消息流最新位置**
- [ ] 打开 StartDialog 后取消 → plan_card **仍在最新有效位置**可点
- [ ] 改剧本重发（新 turn）→ **新** confirm/plan 在底部；旧卡 superseded 灰显不可点
- [ ] 视口滚到最新有效卡

---

## 3. 方案操作

- [ ] 重新生成 → 新流式 + 新 confirm
- [ ] 继续修改 → 聚焦输入框
- [ ] 取消流式 → 无 plan_card

---

## 4. 启动与模式

- [ ] 未确认点模式 → toast
- [ ] auto 启动 → 面板 Step1
- [ ] confirm 步间暂停
- [ ] preview Step4 后结束无 video

---

## 5. 错误 L1~L6

- [ ] Chat API 失败 → 错误气泡，无 plan 卡
- [ ] Step 失败 → error_card + 面板重试
- [ ] 重试后 error_card resolved/隐藏
- [ ] cancel → panel idle
- [ ] stale 90s 横幅

---

## 6. 持久化 R-060

- [ ] 刷新后会话列表保留
- [ ] 方案/turn 恢复或降级提示

---

## 7. Pipeline 进行中 R-061

- [ ] progress 同 step 不重复多条
- [ ] 切页 SSE 仍更新
