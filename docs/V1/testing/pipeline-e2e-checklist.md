# Pipeline 端到端验收 Checklist

**规格依据**: [D-004 全流程规格书](../design/pipeline-full-flow-spec.md)  
**最后更新**: 2026-06-17

---

## 1. 环境与准备

- [ ] 后端：`cd backend && python run.py`（端口 7790）
- [ ] 前端：`cd app && npm run dev`（端口 5174）
- [ ] `.env` 已配置 LLM / Agnes API Key

---

## 2. 阶段 A — Chat 创作前置

- [ ] Dashboard 创建项目（含 SKILL）→ 可选跳转 Chat `?projectId=`
- [ ] Chat 输入含创作关键词的创意（如「帮我做一个校园悬疑漫剧」）
- [ ] 流式显示 Markdown 创作方案（非 JSON）
- [ ] 出现 `plan_confirm_card`：可「确认方案」「重新生成」「继续修改」
- [ ] 确认后出现 `plan_card` + 模式选择（auto / confirm / preview）
- [ ] 无 URL projectId 时弹出项目选择（新建 / 已有）
- [ ] 启动后右侧制作面板展开，Step 0 开始 progress

---

## 3. 阶段 B — 三种模式（各测一条）

### preview 模式

- [ ] Step 0–2 完成（剧本、角色、分镜）
- [ ] Step 2 后 `pipeline_completed`，**不**生成视频
- [ ] ScriptEditor / CharacterManager / StoryboardWorkbench 可见 Pipeline 写入数据

### confirm 模式

- [ ] 每步完成后 SSE `waiting_confirmation`，面板显示「继续」
- [ ] 点击继续 → `POST /resume` → 下一步开始
- [ ] 至少验证 Step 0→1 的暂停/继续

### auto 模式

- [ ] Step 0–3 自动推进（Step 3 可能较久）
- [ ] Step 4–5 显示占位/跳过（TTS/合成开发中）
- [ ] 完成后 Chat 出现 `pipeline_complete` 消息

---

## 4. 失败与恢复

- [ ] 视频步单镜失败 → `step_failed` / Chat `error_card`
- [ ] 面板「重试」→ `POST /retry/{step}` 重新执行
- [ ] 面板「取消」→ 暂停 + 清 localStorage + 状态 idle
- [ ] 90s 无进度 → stale 提示 + 可重试

---

## 5. 切页与恢复

- [ ] Pipeline running 时切到 Dashboard / Storyboard
- [ ] 右下角 ProgressPanel 仍显示进度
- [ ] 展开 ProgressPanel →「在 Chat 中打开制作面板」跳回 Chat
- [ ] 回 Chat 后面板自动恢复（或顶栏「打开制作面板」）
- [ ] SSE 切页后仍更新（Layout PipelineLifecycle）

---

## 6. 持久化与清理

- [ ] 刷新页面 → `dramaforge_active_pipeline` 恢复 running/paused
- [ ] Composer 加载 `timeline_clips`（Step 3 成功后）
- [ ] Dashboard 删除项目 → 成功，无 CORS/500
- [ ] 删除后 `pipeline_runs` 及子表级联清除

---

## 7. 已知限制（验收时预期行为）

- Step 4 配音、Step 5 合成为占位，非 bug
- 同项目多次 Pipeline 会 INSERT 新剧本/角色/分镜，不覆盖
- Chat 会话刷新后丢失（Pipeline 仍可通过 localStorage 恢复）
