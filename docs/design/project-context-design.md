# 项目上下文贯穿设计方案

**设计ID**: [D-002]
**关联需求**: [R-027], [R-031]~[R-036]
**创建时间**: 2026-06-15 12:00:00

---

## 问题本质

后端数据库设计了完整的 project_id 外键关系，但前端从未建立「当前项目」到「数据查询/写入」的传递链路。

---

## 断裂点清单

| 编号 | 位置 | 问题 | 严重度 |
|------|------|------|--------|
| **断点1** | Dashboard.tsx | 项目列表使用 mockProjects 硬编码，不从后端加载 | 严重 |
| **断点2** | Dashboard.tsx handleCreate | 创建项目只写入本地 store，不调用后端 API | 严重 |
| **断点3** | CharacterManager.tsx | `apiGetCharacters()` 不传 project_id，加载所有项目角色 | 严重 |
| **断点4** | ScriptEditor.tsx | `getScripts()` 不传 project_id，盲目取第一个剧本 | 严重 |
| **断点5** | StoryboardWorkbench.tsx | `apiGetShots()` 不传 project_id，加载所有项目分镜 | 严重 |
| **断点6** | Chat.tsx savePipelineScript | project_id 使用 `proj_${Date.now()}` 随机值，与 projects 表无关联 | 严重 |
| **断点7** | Chat.tsx savePipelineCharacters | project_id 硬编码为 `'default'` | 严重 |
| **断点8** | CharacterManager.tsx toApiChar | project_id 默认 `'default'`，调用处未传实际值 | 严重 |
| **断点9** | StoryboardWorkbench.tsx toApiShot | project_id 默认 `'default'`，调用处未传实际值 | 严重 |
| **断点10** | App.tsx 路由 | 所有路由是静态路径，刷新页面后 selectedProjectId 丢失 | 中等 |
| **断点11** | Dashboard.tsx NewProjectModal | 硬编码 3 个 skill 选项，未从后端加载 | 低 |

---

## 数据流断裂图

```
Dashboard (mock数据)
  |
  |-- [断点1] 项目列表不从后端加载
  |-- [断点2] 创建项目不写入后端
  v
setSelectedProject(project.id) --> useAppStore.selectedProjectId
  |
  |-- [断点10] 页面刷新后丢失
  v
各页面 useEffect 加载数据
  |
  |-- [断点3] CharacterManager: 无 project_id
  |-- [断点4] ScriptEditor: 无 project_id
  |-- [断点5] StoryboardWorkbench: 无 project_id
  v
各页面保存数据
  |
  |-- [断点8] CharacterManager: project_id='default'
  |-- [断点9] StoryboardWorkbench: project_id='default'
  v
Pipeline 保存
  |
  |-- [断点6] project_id=proj_${Date.now()}
  |-- [断点7] project_id='default'
  v
数据库孤儿记录（project_id 指向不存在的项目）
```

---

## 修复策略

将 `selectedProjectId` 贯穿整个数据流：

1. **持久化**: localStorage 存储，页面刷新不丢失
2. **读取**: 各页面 useEffect 从 store 读取 selectedProjectId
3. **传递**: 调用 API 时传入 project_id 参数
4. **关联**: Pipeline 保存前先创建真实项目

---

## 表关联总览

```
projects (1)
  ├── scripts (N) ─── episodes (N) ─── scenes (N) ─── script_blocks (N)
  ├── characters (N)
  ├── storyboard_shots (N)
  ├── timeline_clips (N)
  └── subtitle_segments (N)

skills (全局，不关联项目)
  ├── skill_parameters (N)
  └── skill_reviews (N)
```

---

## 实施步骤

### 阶段1：项目上下文贯穿

1. useAppStore selectedProjectId 持久化到 localStorage
2. Dashboard 对接 getProjects API
3. Dashboard 对接 createProject API
4. CharacterManager 读取 selectedProjectId 过滤数据
5. ScriptEditor 读取 selectedProjectId 过滤数据
6. StoryboardWorkbench 读取 selectedProjectId 过滤数据

### 阶段2：Chat 项目绑定

7. Chat 顶部添加项目下拉选择器
8. 选择「新建项目」弹出创建对话框
9. Pipeline savePipelineScript 使用真实 project_id
10. Pipeline savePipelineCharacters 使用真实 project_id

---

## 测试方案

### 单元测试

- useAppStore: selectedProjectId 读写 + localStorage 持久化
- 各页面 useEffect: 正确读取 selectedProjectId 并传入 API

### 集成测试

- Dashboard 创建项目 → 数据库有记录 → 各页面能加载该项目数据
- Chat 创建项目 → Dashboard 能看到 → 各页面能编辑

### 端到端测试

- 完整流程：Dashboard 创建项目 → 剧本编辑 → 角色管理 → 分镜工作台
- 刷新页面后 selectedProjectId 不丢失
- 切换项目后各页面数据正确切换
