# [D-V2-PG01] 项目工作台 Dashboard

**关联需求**: R-001, R-064  
**路由**: `/`  
**代码**: `app/src/pages/Dashboard.tsx`

---

## 1. 页面职责

项目列表、创建、搜索、删除；**手动创作路线**入口。

---

## 2. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 自动路径 | 可选：建项目后跳 Chat `?projectId=` |
| 手动路径 | **主入口** |
| 精修路径 | 项目管理、删除后清理 Pipeline |

---

## 3. 必做 vs 可选

| 操作 | 自动路径必经 |
|------|--------------|
| 创建项目 | 否（Chat 内也可建） |
| 打开 Chat | 否 |
| 删除项目 | 否 |

---

## 4. 数据读写

| 表/API | 操作 |
|--------|------|
| projects | CRUD |
| 级联 | pipeline_runs, characters, shots, clips… |

删除项目 → 调用 `dismissPipelineForProject(projectId)`。

---

## 5. 与 Pipeline 同步

- 无直接 Pipeline UI
- 删除项目必须清 localStorage `dramaforge_active_pipeline`

---

## 6. 边界与错误

| 场景 | 行为 |
|------|------|
| 删除确认 | ConfirmDialog |
| API 500 | toast；V1 CORS/await 已修 |
| 空列表 | 引导「去 Chat 创作」 |

---

## 7. 验收

- [ ] 创建项目可选 SKILL（影响 render_mode）
- [ ] 删除后 Pipeline 面板消失

---

## 8. V2 建议增强（P2）

- 项目卡片显示：Pipeline 状态、clip 数量、设定包完整度
