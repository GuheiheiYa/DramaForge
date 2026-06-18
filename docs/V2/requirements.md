# V2 需求文档

**版本**: 2.0  
**最后更新**: 2026-06-17  
**V1 归档**: [`docs/V1/requirements.md`](../V1/requirements.md)  
**设计总览**: [design.md](design.md)

---

## 范围说明

V2 在 V1 需求基础上增量定义。**R-001 ~ R-056** 仍以 V1 为准；**R-057 ~ R-075** 为 V2 新增或修订。  
实现状态列：📋 规格已定 / ⏳ 待实现 / 🔄 部分实现（V1 遗留）。

---

## V2 核心需求

### Chat / 创作轮次（P0）

| ID | 需求描述 | 优先级 | 状态 | 设计 | 测试 |
|----|---------|--------|------|------|------|
| R-057 | 创作轮次 `creationTurnId`：每轮唯一有效 plan 卡，历史卡 `superseded` | P0 | 📋 | [chat/00](design/chat/00-state-machine.md) | [chat-boundary](testing/chat-boundary-checklist.md) |
| R-058 | 取消/重发/改剧本后，制作计划卡始终出现在最新回复流末尾 | P0 | 📋 | [chat/05](design/chat/05-mode-select.md) | chat-boundary §ISS-V2-001 |
| R-059 | Chat 全链路错误分层（L1~L6）与重试 UI 一致 | P0 | 📋 | [chat/09](design/chat/09-error-retry-recovery.md) | chat-boundary |
| R-060 | 刷新后会话恢复；方案状态从消息重建或明确降级提示 | P1 | 📋 | [chat/01](design/chat/01-send-message.md) | chat-boundary |
| R-061 | Pipeline 进行中用户消息排队策略（文档化 + 实现核对） | P1 | 📋 | [chat/08](design/chat/08-during-pipeline.md) | chat-boundary |
| R-062 | superseded 历史卡只读展示（灰底、不可点） | P1 | 📋 | [chat/10](design/chat/10-ui-display-spec.md) | chat-boundary |

### Pipeline V2 五步（P0）

| ID | 需求描述 | 优先级 | 状态 | 设计 | 测试 |
|----|---------|--------|------|------|------|
| R-063 | 五步自动路径：剧本→角色包→分镜规划→关键帧→图生视频 | P0 | 📋 | [pipeline/00](design/pipeline/00-v2-flow.md) | [pipeline-v2](testing/pipeline-v2-checklist.md) |
| R-064 | 自动路径不强制分镜工作台/合成室 | P0 | 📋 | pipeline/00, pages/storyboard, pages/composer | pipeline-v2 |
| R-065 | 关键帧为唯一生图单元；场景母图为 Step4 内部策略 | P0 | 📋 | [step-04](design/pipeline/step-04-keyframe.md) | pipeline-v2 |
| R-066 | Pipeline 与工作台统一 i2v（keyframe_url + video_prompt + DNA） | P0 | 📋 | [step-05](design/pipeline/step-05-video.md), pages/storyboard | pipeline-v2 |

### 角色 / SKILL（P0）

| ID | 需求描述 | 优先级 | 状态 | 设计 | 测试 |
|----|---------|--------|------|------|------|
| R-067 | 角色设定包：至少 front/side/back/three_quarter 四视角 | P0 | 📋 | [character-reference-pack](design/skills/character-reference-pack-spec.md) | pipeline-v2 §Step2 |
| R-068 | 项目级 `render_mode`：2d_cel / 3d_cgi | P0 | 📋 | character-reference-pack §3.1 | pipeline-v2 |
| R-069 | 国漫玄幻 SKILL preset（技法层级，非 IP 复制） | P0 | 📋 | character-reference-pack §10 | pages/skill-market |
| R-070 | SKILL 参数与 Pipeline prompt 贯通 | P0 | 📋 | pages/skill-market, pipeline cross-cutting | pipeline-v2 |

### 各页面（P1）

| ID | 需求描述 | 优先级 | 状态 | 设计 | 测试 |
|----|---------|--------|------|------|------|
| R-071 | 剧本编辑器：Pipeline Step1 写入后可编辑，保存不重置 Pipeline | P1 | 📋 | [script-editor](design/pages/script-editor.md) | pages-smoke |
| R-072 | 角色管理台：设定包画廊 + 单槽重生成 + DNA Tab | P1 | 📋 | [character-manager](design/pages/character-manager.md) | pages-smoke |
| R-073 | 分镜工作台：可选精修；展示 keyframe_url；统一 i2v | P1 | 📋 | [storyboard-workbench](design/pages/storyboard-workbench.md) | pages-smoke |
| R-074 | 合成室：导入 clips + 导出；非自动路径 DoD | P1 | 📋 | [composer-studio](design/pages/composer-studio.md) | pages-smoke |
| R-075 | 素材库/生成记录/成本与 V2 各步产物挂钩 | P1 | 📋 | asset-library, generation-history, cost-statistics | pages-smoke |

---

## 两条创建路线（V2 修订）

### 路线 A：Agent 驱动（Chat）

```
用户创意 → 方案确认 → 选模式 → 创建/绑定项目
→ Step1 剧本 → Step2 角色包 → Step3 分镜规划 → Step4 关键帧 → Step5 图生视频
→ Chat/面板交付 clip 列表
→ （可选）剧本/角色/分镜/合成精修
```

### 路线 B：手动创建（Dashboard）

```
Dashboard 建项目 → 剧本 → 角色 → 分镜 → 手动生成关键帧/视频 → （可选）合成
```

---

## V2 Definition of Done（自动路径）

1. Chat：创意 → 方案 → 确认 → 选模式 → 启动 → 五步完成 → clip 列表可播放
2. 不必打开 `/storyboard` 或 `/composer`
3. 角色至少 P0 四视角落库
4. 每镜 keyframe_url + video clip 落库
5. 失败可重试/跳过；error_card 可 resolved
6. preview 模式：Step4 后结束，无 video

详见 [testing/pipeline-v2-checklist.md](testing/pipeline-v2-checklist.md)。
