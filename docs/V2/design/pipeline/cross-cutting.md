# [D-V2-P07] Pipeline 横切能力

**关联需求**: R-059, R-063, R-070  
**V1 参考**: V1 spec §5

---

## 1. 三种执行模式

| 模式 | 行为 |
|------|------|
| auto | Step1~5 连续；失败 pause |
| confirm | 每步 `waiting_confirmation` → POST resume |
| preview | Step4 后 `pipeline_completed` |

---

## 2. SSE 事件

| type | 说明 |
|------|------|
| snapshot | 连接建立 |
| step_progress | 进度 heartbeat |
| step_completed | 步成功 |
| step_failed | 步失败 + error |
| waiting_confirmation | confirm 暂停 |
| pipeline_completed | 全部完成或 preview 提前结束 |

端点：`GET /api/v1/pipeline/{id}/stream`

---

## 3. 失败恢复 API

| API | 作用 |
|-----|------|
| POST `/retry/{step}` | 从 step 重跑 |
| POST `/skip/{step}` | 跳过 |
| POST `/pause` | 取消/暂停 |
| POST `/resume` | confirm 继续 |

前端：`usePipelineExecution`；Chat `error_card` 与面板共用。

---

## 4. 持久化

| Key | 内容 |
|-----|------|
| `dramaforge_active_pipeline` | pipelineId, projectId, chatSessionId |
| `pipeline_runs` | status, steps_json, current_step |

恢复：`PipelineLifecycle` + `restorePipelineFromStorage`

---

## 5. 面板可见性

`pipeline-storage.ts`:

- `isPipelineBoundToChat`：会话/项目匹配
- `isPipelineVisibleForChat`：bound && panelOpen
- 切页：Layout 级 SSE 不断流；ProgressPanel 全局

---

## 6. 项目删除

`DELETE /projects/{id}` → FK 级联 pipeline_runs、clips、characters…  
前端：`dismissPipelineForProject`

---

## 7. SKILL 贯通（R-070）

`resolve_skill_config(skill_id)` 在以下步骤注入 **同一套** parameters：

- Step1 剧本 tone  
- Step2 角色 render_mode + 风格块  
- Step4 关键帧  
- Step5 视频  

DB `skills.parameters` 为权威；废弃仅硬编码 `SKILL_CONFIGS`（迁移期可 fallback）。

---

## 8. 重复运行

同 project_id 多次 start：**仍 INSERT 新记录**（与 V1 同）。  
V2 文档标注 P2：覆盖/版本化策略。

---

## 9. 成本记账（P2）

应对每个 LLM/生图/生视频写 `cost_records` — V2 文档定义点位，实现 Deferred。

---

## 10. 代码锚点

| 文件 | 职责 |
|------|------|
| `pipeline-stream.ts` | SSE → Chat 消息 |
| `pipeline-storage.ts` | 可见性/恢复 |
| `usePipelineStore.ts` | 五步 state |
| `ProgressPanel.tsx` | 全局浮窗 |
