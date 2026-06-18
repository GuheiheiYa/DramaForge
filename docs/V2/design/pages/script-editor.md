# [D-V2-PG03] 剧本编辑器

**关联需求**: R-071, R-002  
**路由**: `/script?projectId=`  
**代码**: `app/src/pages/ScriptEditor.tsx`

---

## 1. 页面职责

三栏：场景树、编辑区、AI 助手；剧本 CRUD、分集/场景管理。

---

## 2. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 自动路径 | **可跳过**；Step1 写入 DB 后面板可跳转精修 |
| 手动路径 | 主创作页 |
| 精修路径 | 改剧本、对白、场景 |

---

## 3. 必做 vs 可选

Pipeline 自动跑完 **不必** 打开本页。

---

## 4. 数据读写

| 表 | 操作 |
|----|------|
| scripts, episodes, scenes, script_blocks | GET/PUT |

project_id 来自 URL 或 selectedProjectId。

---

## 5. 与 Pipeline 同步

| 规则 | 说明 |
|------|------|
| Step1 写入 | 首次 INSERT |
| 用户保存修改 | **不** 自动回滚 Pipeline status |
| 改剧本后 | 建议提示「需重跑 Step3+」；不自动重跑 |
| Pipeline 运行中 | 可读；保存不阻塞 SSE |

---

## 6. 边界与错误

| 场景 | 行为 |
|------|------|
| 无 projectId | 引导选项目 |
| 加载空 | 空剧本或从 Pipeline 数据已存在 |
| 保存失败 | toast + 重试 |

---

## 7. 验收

- [ ] Pipeline Step1 后本页可见 episodes
- [ ] 保存不 crash Pipeline 面板

---

## 8. V2 建议（P2）

- 顶部徽章：「剧本已与 Pipeline 同步 / 本地有未同步修改」
