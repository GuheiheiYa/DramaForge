# [D-V2-C06] 项目绑定

**关联需求**: R-063  
**前置**: [05-mode-select.md](05-mode-select.md)  
**后置**: [07-pipeline-start.md](07-pipeline-start.md)

---

## 1. 职责

确定 Pipeline 归属 `project_id`：URL 已有 / 弹窗新建 / 选择已有。

---

## 2. 路径

| 条件 | 行为 |
|------|------|
| URL `?projectId=` | 直接 `executePipeline(mode, { projectId })` |
| 无 projectId | 打开 `PipelineStartDialog` |
| createNew | POST /projects → setSelectedProject |
| 选已有 | 从 projects 列表选 |

---

## 3. 创建项目

- name: `extractedTitle` 或 `normalizeProjectTitle`
- type: 漫剧
- skill_id: currentSkill
- description: AI 生成项目

---

## 4. Store

- `useAppStore.selectedProjectId`
- 顶栏项目徽章更新

---

## 5. 边界

| 场景 | 行为 |
|------|------|
| 创建 422 Unicode | normalizeProjectName（V1 已修） |
| 用户关 Dialog 未选 | 不 start；plan_card 仍有效 |
| project 被删 | start 前校验存在 |

---

## 6. 验收

- [ ] 无 projectId 弹窗
- [ ] 有 projectId 直接启动

---

## 7. 代码锚点

`Chat.tsx` StartDialog, handleStartConfirm; `usePipelineExecution.runPipeline`
