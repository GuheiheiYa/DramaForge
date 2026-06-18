# [D-V2-000] V2 设计总览

**版本**: 2.0  
**状态**: 规格已定，代码待实现  
**V1 参考**: [`docs/V1/design/pipeline-full-flow-spec.md`](../V1/design/pipeline-full-flow-spec.md)

---

## 1. 产品定位

DramaForge V2 是 **Chat 驱动的 AI 漫剧/短剧生产工具**。用户用自然语言描述创意，系统自动完成：

**剧本 → 角色设定包 → 分镜规划 → 关键帧 → 图生视频 → 交付分镜 clip 列表**

各工作台（剧本/角色/分镜/合成）为 **可选精修**，不阻塞自动路径。

---

## 2. 三条路径

| 路径 | 入口 | 终点 | 是否必经工作台 |
|------|------|------|----------------|
| **自动路径** | Chat 发创意 | Chat/面板 clip 列表 | 否 |
| **精修路径** | 自动路径完成后 | 各页面微调 | 用户主动 |
| **手动路径** | Dashboard 建项目 | 逐步手动/AI 各页 | 是 |

详见 [pipeline/00-v2-flow.md](design/pipeline/00-v2-flow.md)。

---

## 3. 架构分层

```
┌─────────────────────────────────────────────────────────┐
│  Chat Studio（指挥中心）                                  │
│  创作轮次 · 方案确认 · 制作计划 · Pipeline 面板 · clip 交付 │
└───────────────────────────┬─────────────────────────────┘
                            │ POST /pipeline/start + SSE
┌───────────────────────────▼─────────────────────────────┐
│  Pipeline Executor（五步 + 后置占位）                     │
│  script → character_pack → shot_plan → keyframe → video │
└───────────────────────────┬─────────────────────────────┘
                            │ 读写
┌───────────────────────────▼─────────────────────────────┐
│  SQLite + 工作台页面（可选精修）                          │
│  projects · characters · storyboard_shots · timeline_clips │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 核心设计决策（V2）

| 决策 | 选择 | 理由 |
|------|------|------|
| 成品定义 | 多分镜 clip 顺序组合 | 与合成室解耦；导出 MP4 为可选 |
| 分镜工作台 | 后台规划 + 可选精修 | 减少自动路径步骤感 |
| 合成室 | 可选后置 | 用户可直接图生视频交付 |
| 角色 | 设定包（多视角 + DNA） | 国漫一致性核心 |
| 生图单元 | 每镜关键帧（非纯场景图） | 一次合成场景+人物+构图 |
| Chat 方案卡 | creationTurn + superseded | 修复历史卡不跟随最新回复 |
| SKILL | L1 流派 + L2 角色 DNA + L3 镜头 | 见角色规范 |

---

## 5. 状态存储

| Store / 存储 | 职责 |
|--------------|------|
| `useChatStore` | 会话、消息、创作轮次、方案文本 |
| `usePipelineStore` | 五步进度、面板、SSE 绑定 |
| `useAppStore` | 项目列表、selectedProjectId |
| localStorage `dramaforge-chat-store` | Chat 会话持久化 |
| localStorage `dramaforge_active_pipeline` | Pipeline 恢复 |

---

## 6. 代码锚点（实现时）

| 层级 | 路径 |
|------|------|
| Chat UI | `app/src/pages/Chat.tsx` |
| Chat 状态 | `app/src/store/useChatStore.ts` |
| Pipeline 状态 | `app/src/store/usePipelineStore.ts` |
| Pipeline 执行 | `app/src/hooks/usePipelineExecution.ts` |
| SSE | `app/src/lib/pipeline-stream.ts` |
| 后端编排 | `backend/app/services/pipeline_executor.py` |
| 步骤实现 | `backend/app/services/pipeline_service.py` |
| 角色生图 | `backend/app/services/image_service.py` |
| 视频 | `backend/app/services/video_service.py` |

---

## 7. 文档地图

完整索引见 [navigation.md](navigation.md)。  
代码实现排期见 [implementation-priority.md](implementation-priority.md)。
