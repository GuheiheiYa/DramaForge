# [D-V2-PG08] 生成记录

**关联需求**: R-075, R-008  
**路由**: `/history`  
**代码**: `app/src/pages/GenerationHistory.tsx`

---

## 1. 页面职责

generation_tasks 历史、状态、分页、重试入口。

---

## 2. V2 task_type 映射

| task_type | Pipeline Step |
|-----------|---------------|
| script_llm | Step1 |
| character_pack | Step2 |
| character_asset | 角色页单槽 |
| keyframe | Step4 |
| video_shot | Step5 |

---

## 3. 在 V2 路径中的位置

运维/排查；非创作必经。

---

## 4. 边界

| 场景 | 行为 |
|------|------|
| 失败任务 | 显示 error；链到 Chat error_card 同 step |
| 清空记录 | 不影响 DB 业务数据 |

---

## 5. 验收

- [ ] 视频步失败可在 history 看到
- [ ] project_id 筛选

---

## 6. V2 增强（P2）

- 从 history 一键「重试该镜」调 unified i2v API
