# [D-V2-P03] 角色管理台 — V2 功能与界面规格

**关联需求**: R-072, R-067 ~ R-070  
**关联规范**: [character-reference-pack-spec.md](../skills/character-reference-pack-spec.md)  
**现状代码**: `app/src/pages/CharacterManager.tsx`、`character/*`  
**状态**: 规格已定，**需大改 UI + 类型 + API**

---

## 1. 为什么要大改

| V1 现状 | V2 目标 |
|---------|---------|
| 卡片只展示 **1 张** `avatarUrl` | 展示 **设定包完整度**（四视角 + 表情 + 服装） |
| `assets` 仅 `{type, name, thumbnail}` 四枚举 | 扩展 `view / expression / costume_id / is_style_anchor` |
| 一个按钮「生成形象」→ 单张立绘 | 「生成设定包」+ 按槽位单独重生成 |
| Form 里资产上传 **未写入** `assets[]` | 每个槽位可上传 / AI 生成 / 预览 / 设锚点 |
| 无 `render_mode`、无 `visual_dna` | 项目继承 + 角色可覆盖；DNA 可编辑预览 |
| 详情抽屉 assets 平铺列表 | **分组画廊**：Turnaround / 表情 / 服装 |

**结论**：不是小修，是 **角色页从「单人卡片」升级为「设定包管理器」**；表单、卡片、抽屉、API 都要动。

---

## 2. 信息架构

```
角色管理台
├── 顶栏：项目选择 | render_mode 徽章 | 「批量生成设定包」
├── 筛选：全部 / 主角 / 配角 / 设定包完整 / 设定包缺失
├── 角色卡片（网格）
│   ├── 主图 = turnaround_front（无则占位）
│   ├── 进度条：4/4 视角 · 2/4 表情 · 1/3 服装
│   └── 快捷：生成设定包 | 编辑 | 详情
└── 角色详情（全屏 Drawer 或独立页 — 推荐 Drawer 加宽）
    ├── Tab：基本信息 | 设定图 | 角色 DNA | 关系 | 出场
    └── Tab「设定图」— 核心（见 §3）
```

---

## 3. 「设定图」Tab — 核心 UI（展示所有立绘）

### 3.1 布局：分组 + 槽位（Slot Grid）

**A. 转身参考 Turnaround（P0，必展示）**

```
┌────────────┬────────────┬────────────┬────────────┐
│   正面 ★   │  3/4 侧面  │   侧面     │   背面     │
│  [图/空]   │  [图/空]   │  [图/空]   │  [图/空]   │
│  锚点      │  生成/重试 │  生成/重试 │  生成/重试 │
└────────────┴────────────┴────────────┴────────────┘
★ = is_style_anchor，标注「风格锚点」
```

**B. 表情 Expression（P1，可折叠）**

| 槽位 | expression |
|------|------------|
| 中性 | neutral |
| 喜 | happy |
| 怒 | angry |
| 哀 | sad |
| 冷峻 | cold |

每格：缩略图 + 状态（已生成/生成中/失败）+ 悬停「放大 / 重新生成 / 下载」

**C. 服装 Costume（P1/P2，可折叠）**

| 槽位 | costume_id |
|------|------------|
| 默认 | default |
| 战斗 | battle |
| 正装 | formal |

切换服装时展示对应 turnaround_front 或全身图（若未生成则灰框 + 「从此服装生成四视角」）

### 3.2 空状态与进度

- **设定包完整度**：`completeCount / requiredCount`（P0 四视角为 required）
- 卡片与详情顶部统一展示：**「设定包 75% · 缺：背面、表情-怒」**
- Pipeline 生成中：对应槽位 spinner + 禁用重复点击

### 3.3 批量操作

| 按钮 | 行为 |
|------|------|
| 生成完整设定包 | 按 spec 顺序 t2i + i2i 填满 P0（可选勾选 P1） |
| 仅补全缺失 | 只生成空槽位 |
| 从此角色复制风格 | 到其他角色（同项目）— P2 |
| 导出角色预设 | 打包 visual_dna + assets — P2 |

---

## 4. 「角色 DNA」Tab

- 展示/编辑 `visual_dna.prompt_block_zh` / `prompt_block_en`
- `immutable_traits` 标签列表（发色、瞳色等不可变项）
- `render_mode`：继承项目 / 2D / 3D 覆盖
- 「从当前字段自动生成 DNA」按钮（LLM 或模板）
- 只读预览：**合并后的完整 prompt**（SKILL + DNA + 示例镜头）

---

## 5. 卡片层改动（CharacterCard）

| 元素 | V1 | V2 |
|------|----|----|
| 主图 | avatarUrl | `turnaround_front` 或 avatarUrl fallback |
| 角标 | 已生成/未生成 | **设定包进度** 如 `3/4 视角` |
| 底部条 | assets.length | 四视角小缩略图 strip（有则显示） |
| 菜单 | 生成形象 | 生成设定包 / 补全缺失 / 编辑 DNA |

筛选 Tab 新增：
- **设定包完整**：P0 四视角齐全
- **设定包缺失**：任一 P0 为空

---

## 6. 表单改动（CharacterForm）

保留现有 6 段基本信息；**重构「形象/资产」段**：

- 删除「单张形象拖拽」作为唯一入口
- 改为 **跳转详情「设定图」Tab** 或内嵌简化版四宫格
- `appearance` / `costume` 变更时提示：**「是否根据新描述更新 DNA 并重生成锚点？」**

---

## 7. API / 类型改动（前后端对齐）

### 7.1 前端 `CharacterAsset` 扩展

```typescript
export type AssetView = 'front' | 'side' | 'back' | 'three_quarter';
export type AssetExpression = 'neutral' | 'happy' | 'angry' | 'sad' | 'cold';
export type CostumeId = 'default' | 'battle' | 'formal';

export interface CharacterAsset {
  id: string;
  type: string;           // turnaround_front | expression_happy | costume_battle_front ...
  view?: AssetView;
  expression?: AssetExpression;
  costumeId?: CostumeId;
  renderMode?: '2d_cel' | '3d_cgi';
  thumbnail: string;
  isStyleAnchor?: boolean;
  status?: 'pending' | 'generating' | 'done' | 'failed';
}

export interface VisualDna {
  promptBlockEn?: string;
  promptBlockZh?: string;
  immutableTraits?: string[];
  renderMode?: '2d_cel' | '3d_cgi';
  skillPresetId?: string;
}
```

### 7.2 新 API（建议）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/characters/{id}/generate-pack` | 生成完整 P0 设定包 |
| POST | `/characters/{id}/generate-asset` | body: `{ slot: "turnaround_side" }` 单槽位 |
| GET | `/characters/{id}/pack-status` | 返回各槽位状态与完整度 |

现有 `POST /images/generate-character` 扩展 query/body：`view`, `expression`, `costume_id`。

---

## 8. 与 Pipeline / Chat 的关系

| 场景 | 角色页角色 |
|------|------------|
| Pipeline Step2 自动生成 | 用户可在 Chat 面板看缩略进度；**精修进角色页** |
| 自动路径不必打开 | 是；但若缺 P0 视角，Pipeline 应标记 warn 并可在角色页补 |
| 关键帧/视频失败因角色不一致 | 角色页高亮「建议重生成锚点或 DNA」 |

---

## 9. 验收标准

1. 打开任一已有 Pipeline 角色，详情「设定图」可见 **至少四宫格**，有图显示缩略图，无图显示空槽 + 生成按钮
2. 点击「生成设定包」后，四视角依次出现，且 side/back 明显与 front 同风格
3. 卡片列表可筛选「设定包缺失」，且进度数字与详情一致
4. 修改 DNA 后单槽「重新生成」使用新 prompt
5. 所有 asset URL 刷新页面后仍从 API 加载（持久化在 `assets_json`）

---

## 10. 实现分期（降低一次性大改风险）

| 阶段 | 范围 |
|------|------|
| **P0** | 类型扩展 + 详情四宫格 Turnaround + 生成设定包 API + 卡片进度 |
| **P1** | 表情/服装分组 + DNA Tab + 单槽重生成 |
| **P2** | 导出/导入预设 + 跨角色复制风格 + 素材库联动 |

**P0 即可支撑 V2 Pipeline**；表情/服装可 Pipeline 先用 default，页面后补。
