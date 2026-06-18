# [D-V2-C07] 启动 Pipeline

**关联需求**: R-063, R-059  
**前置**: [06-project-bind.md](06-project-bind.md)  
**后置**: [08-during-pipeline.md](08-during-pipeline.md)

---

## 1. 职责

POST `/pipeline/start`，订阅 SSE，展开右侧制作面板。

---

## 2. 请求体

```json
{
  "project_id": "<uuid>",
  "creative_input": "<用户创意>",
  "mode": "auto|confirm|preview",
  "skill_id": "<skill>",
  "structured_data": null,
  "confirmed_plan": "<Markdown 方案全文>"
}
```

---

## 3. 成功后的 Store

| Store | 字段 |
|-------|------|
| usePipelineStore | pipelineRunId, projectId, chatSessionId, panelOpen=true, mode, status=running |
| localStorage | dramaforge_active_pipeline |

---

## 4. UI

- 右侧面板滑出 Step1
- toast：已启动 auto/confirm/preview
- plan_card disabled（Pipeline 运行中）

---

## 5. 失败（L5）

| 错误 | UI |
|------|-----|
| !planConfirmed | throw；toast |
| 网络/500 | toast；pipeline reset；**保持 modePending** |
| 无 pipeline_id | toast 启动失败 |

**不** supersede plan_card，用户可重选模式。

---

## 6. 边界

| 场景 | 行为 |
|------|------|
| 重复点击模式 | startingPipeline 防抖 |
| 已有 running Pipeline | 应先 cancel 或 block |

---

## 7. 验收

- [ ] 面板 Step1 progress
- [ ] localStorage 写入
- [ ] SSE 连接

---

## 8. 代码锚点

`usePipelineExecution.runPipeline`, `subscribePipelineStream`
