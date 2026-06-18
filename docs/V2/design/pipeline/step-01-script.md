# [D-V2-P01] Step1 — script（剧本）

**关联需求**: R-063, R-071  
**前置**: Chat A6 启动 Pipeline  
**状态**: 规格已定（ largely 继承 V1 Step0）

---

## 1. 职责

根据 `creative_input` + `confirmed_plan` + SKILL 生成结构化多集剧本并落库。

---

## 2. 输入 / 输出

| 输入 | 来源 |
|------|------|
| creative_input | Chat 用户创意 |
| confirmed_plan | 方案 Markdown |
| skill_id | 项目/Chat |
| project_id | A5 |

| 输出 | 存储 |
|------|------|
| scripts, episodes, scenes, script_blocks | SQLite |
| steps_json[0].data | pipeline_runs |

---

## 3. 处理

- `pipeline_service.run_step_script()` → LLM JSON
- 解析失败 → `_build_script_from_text()` 文本回退

---

## 4. SSE / UI

| 事件 | UI |
|------|-----|
| step_progress | 面板 ScriptPreview + Chat progress_update |
| step_completed | step_complete 消息 |

---

## 5. 边界

| 场景 | 行为 |
|------|------|
| LLM 超时 | step_failed；可重试 |
| JSON  malformed | 文本回退，不失败 |
| 同 project 多次 Pipeline | INSERT 新剧本（V2 仍不覆盖；版本化 P2） |
| 用户在 ScriptEditor 改剧本 | 允许；不自动回滚 Pipeline 状态 |

---

## 6. 工作台

- **非必经**；Chat 面板可预览集/场景列表
- 精修：`/script?projectId=` → [script-editor.md](../pages/script-editor.md)

---

## 7. 验收

- [ ] Step1 完成后 ScriptEditor 可读 episodes/scenes
- [ ] confirm 模式 Step1 后暂停

---

## 8. 代码锚点

`pipeline_service.py` run_step_script；V1 spec § Step0
