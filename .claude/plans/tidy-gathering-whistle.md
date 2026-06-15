# 全流程打通计划

## 两条创建路线

### 路线 A：Agent 驱动（Chat 页面）

```
用户输入创意 → AI 生成剧本 → 自动创建项目 → 自动填充剧本/角色/分镜
→ 用户跳转各页面微调 → AI 辅助修改 → 最终合成
```

### 路线 B：手动创建（Dashboard）

```
用户创建项目 → 跳转剧本编辑器 → 手动/AI 写剧本
→ 跳转角色管理 → 手动/AI 设计角色
→ 跳转分镜工作台 → 手动/AI 做分镜
→ 跳转合成室 → 合成最终视频
```

---

## 完整步骤流程（7 步）

```
┌─────────────────────────────────────────────────────────────┐
│                    DramaForge 创作流程                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① 项目创建 ──→ ② 剧本 ──→ ③ 角色 ──→ ④ 分镜 ──→ ⑤ 视频   │
│      │            │          │          │          │        │
│      │         [AI入口]   [AI入口]   [AI入口]   [AI入口]    │
│      │            │          │          │          │        │
│      │            └──────────┴──────────┴──────────┘        │
│      │                       │                              │
│      │                    ⑥ 配音                            │
│      │                       │                              │
│      │                    ⑦ 合成导出                        │
│      │                                                      │
│      └──→ Chat 页面可随时介入，选择项目继续创作               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 每步涉及内容

### 步骤 ①：项目创建

**涉及数据**：projects 表
**涉及页面**：Dashboard、Chat
**两种入口**：
- Dashboard：「新建项目」按钮 → 填写名称/类型/集数/选择 SKILL → 创建项目
- Chat：用户说「帮我做一个校园悬疑漫剧」→ AI 生成后自动创建项目

**AI 入口**：Chat 页面选择「新建项目」后，AI 自动填充项目信息

### 步骤 ②：剧本创作

**涉及数据**：scripts → episodes → scenes → script_blocks（4 张表链式关联）
**涉及页面**：ScriptEditor、Chat
**两种入口**：
- ScriptEditor：手动添加集/场景/剧本块，或点击「AI 助手」按钮让 AI 生成
- Chat：AI 自动生成剧本并保存到项目

**AI 入口**：
- ScriptEditor 右侧面板已有 AIScriptPanel，可让 AI 生成/修改内容
- Chat 中对已有项目说「帮我修改第2集的剧情」→ AI 读取现有剧本并修改

### 步骤 ③：角色设计

**涉及数据**：characters 表（project_id 关联）
**涉及页面**：CharacterManager、Chat
**两种入口**：
- CharacterManager：手动创建角色，或点击「AI 生成」按钮
- Chat：AI 根据剧本自动生成角色

**AI 入口**：
- CharacterManager 已有「生成形象」按钮，可扩展为「AI 生成角色」
- Chat 中说「帮我设计主角」→ AI 根据剧本生成角色

### 步骤 ④：分镜制作

**涉及数据**：storyboard_shots 表（project_id 关联）
**涉及页面**：StoryboardWorkbench、Chat
**两种入口**：
- StoryboardWorkbench：手动添加分镜，或点击「AI 生成」按钮
- Chat：AI 根据剧本自动生成分镜

**AI 入口**：
- StoryboardWorkbench 可添加「AI 生成分镜」按钮
- Chat 中说「帮我做分镜」→ AI 根据剧本生成分镜

### 步骤 ⑤：视频生成（需要即梦AI API）

**涉及数据**：timeline_clips 表（project_id 关联）
**涉及页面**：ComposerStudio
**状态**：需要 R-023（即梦AI 接入）

### 步骤 ⑥：配音生成（需要火山引擎 TTS）

**涉及数据**：timeline_clips 表（track_type='audio'）
**涉及页面**：ComposerStudio
**状态**：需要 R-024（TTS 接入）

### 步骤 ⑦：合成导出

**涉及数据**：timeline_clips + subtitle_segments
**涉及页面**：ComposerStudio
**状态**：需要视频合成服务

---

## 项目上下文传递方案

### 方案：localStorage 持久化 + 全局 store

```
selectedProjectId
  ├── 写入时机：Dashboard 点击项目 / Chat 创建项目 / 用户手动选择
  ├── 持久化：同步写入 localStorage
  ├── 读取时机：各页面 useEffect 初始化时
  └── 用途：API 调用时过滤 project_id
```

**不采用 URL 动态路由的原因**：
- 当前所有路由是扁平的，改造成本高
- 侧边栏导航是静态路径，改 URL 需要改所有链接
- localStorage 方案更简单，够用

### 实现细节

1. **useAppStore 改造**：
   - `selectedProjectId` 初始化时从 localStorage 读取
   - `setSelectedProject` 写入时同步到 localStorage

2. **各页面读取**：
   - CharacterManager/ScriptEditor/StoryboardWorkbench 的 useEffect 中读取 `selectedProjectId`
   - 传入 API 调用：`apiGetCharacters(selectedProjectId)`

3. **Chat 页面项目选择器**：
   - 顶部添加项目下拉框
   - 选择项目后，Pipeline 保存时使用该项目 ID
   - 选择「新建」则先调 createProject API

4. **Dashboard 改造**：
   - 项目列表从 API 加载（替换 mock）
   - 创建项目调 API（替换本地 store）
   - 项目卡片点击跳转到对应页面（不只是 /script）

---

## Chat 页面项目选择器设计

```
┌─────────────────────────────────────────────┐
│ [MiMo ▾] [日式校园 ▾] [项目: 樱花下的约定 ▾] │
├─────────────────────────────────────────────┤
│                                             │
│  消息区域...                                 │
│                                             │
│  ┌─ Pipeline 面板 ──────────────────────┐   │
│  │ ① 剧本 ✅  ② 角色 ✅  ③ 分镜 🔄    │   │
│  │ ④ 视频 ⏳  ⑤ 配音 ⏳  ⑥ 合成 ⏳    │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [输入消息...]                              │
└─────────────────────────────────────────────┘
```

- 项目下拉框显示当前所有项目
- 选择「+ 新建项目」弹出创建对话框
- Pipeline 保存时自动关联到选中的项目

---

## 实施步骤

### 第一阶段：项目上下文贯穿（修复断裂点）

1. **useAppStore 改造**：selectedProjectId 持久化到 localStorage
2. **Dashboard 对接 API**：getProjects/createProject 替换 mock
3. **CharacterManager**：读取 selectedProjectId，传入 API 调用
4. **ScriptEditor**：读取 selectedProjectId，传入 API 调用
5. **StoryboardWorkbench**：读取 selectedProjectId，传入 API 调用
6. **Chat 项目选择器**：添加项目下拉框，Pipeline 保存使用真实 project_id

### 第二阶段：AI 入口完善

7. **ScriptEditor AI 面板**：接入真实 AI 生成（目前是 mock）
8. **CharacterManager AI 按钮**：添加「AI 生成角色」功能
9. **StoryboardWorkbench AI 按钮**：添加「AI 生成分镜」功能

### 第三阶段：外部 API 接入（后续）

10. 即梦AI 图像/视频生成
11. 火山引擎 TTS 配音
12. Celery 异步任务队列

---

## 关键文件清单

| 文件 | 改动 |
|------|------|
| `app/src/store/useAppStore.ts` | selectedProjectId 持久化到 localStorage |
| `app/src/pages/Dashboard.tsx` | 对接 getProjects/createProject API |
| `app/src/pages/CharacterManager.tsx` | 读取 selectedProjectId 传入 API |
| `app/src/pages/ScriptEditor.tsx` | 读取 selectedProjectId 传入 API |
| `app/src/pages/StoryboardWorkbench.tsx` | 读取 selectedProjectId 传入 API |
| `app/src/pages/Chat.tsx` | 添加项目选择器，Pipeline 保存用真实 project_id |
| `app/src/components/AppTopbar.tsx` | 可选：顶部显示当前项目名 |
