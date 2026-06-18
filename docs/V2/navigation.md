# V2 文档导航

**版本**: 2.0  
**V1 归档**: [`docs/V1/`](../V1/)（只读参考，不再作为主规格）

---

## 阅读顺序（推荐）

1. [README.md](README.md) — 术语与范围
2. [design.md](design.md) — 全产品架构 1 页
3. [migration-from-v1.md](migration-from-v1.md) — V1→V2 差异
4. [requirements.md](requirements.md) — 需求 ID 索引
5. [implementation-priority.md](implementation-priority.md) — **代码实现优先级与 Sprint**
6. [design/pipeline/00-v2-flow.md](design/pipeline/00-v2-flow.md) — 五步自动路径
7. [design/skills/character-reference-pack-spec.md](design/skills/character-reference-pack-spec.md) — 角色设定包
8. [design/chat/00-state-machine.md](design/chat/00-state-machine.md) — Chat 状态机
9. 各页面 `design/pages/*` — 工作台边界
10. [testing/](testing/) — 验收清单

---

## 文档索引

### 总览

| 文件 | 说明 |
|------|------|
| [README.md](README.md) | V2 导读 |
| [design.md](design.md) | 设计总览 |
| [requirements.md](requirements.md) | 需求 R-057 ~ R-075 |
| [features.md](features.md) | 功能 F 映射 |
| [data-model.md](data-model.md) | V2 数据模型 delta |
| [issues.md](issues.md) | 问题追踪 |
| [changelog.md](changelog.md) | 变更日志 |
| [migration-from-v1.md](migration-from-v1.md) | 迁移说明 |
| [implementation-priority.md](implementation-priority.md) | 代码实现优先级 |

### Chat（[design/chat/](design/chat/)）

| ID | 文件 | 主题 |
|----|------|------|
| D-V2-C00 | [00-state-machine.md](design/chat/00-state-machine.md) | 创作轮次状态机 |
| D-V2-C01 | [01-send-message.md](design/chat/01-send-message.md) | 用户发消息 |
| D-V2-C02 | [02-creation-detect.md](design/chat/02-creation-detect.md) | 创作检测 |
| D-V2-C03 | [03-plan-stream.md](design/chat/03-plan-stream.md) | 方案流式 |
| D-V2-C04 | [04-plan-confirm.md](design/chat/04-plan-confirm.md) | 方案确认 |
| D-V2-C05 | [05-mode-select.md](design/chat/05-mode-select.md) | 制作计划卡 |
| D-V2-C06 | [06-project-bind.md](design/chat/06-project-bind.md) | 项目绑定 |
| D-V2-C07 | [07-pipeline-start.md](design/chat/07-pipeline-start.md) | 启动 Pipeline |
| D-V2-C08 | [08-during-pipeline.md](design/chat/08-during-pipeline.md) | 进行中交互 |
| D-V2-C09 | [09-error-retry-recovery.md](design/chat/09-error-retry-recovery.md) | 错误与重试 |
| D-V2-C10 | [10-ui-display-spec.md](design/chat/10-ui-display-spec.md) | UI 展示规范 |

### Pipeline（[design/pipeline/](design/pipeline/)）

| ID | 文件 | 主题 |
|----|------|------|
| D-V2-P00 | [00-v2-flow.md](design/pipeline/00-v2-flow.md) | 三路径总览 |
| D-V2-P01 | [step-01-script.md](design/pipeline/step-01-script.md) | Step1 剧本 |
| D-V2-P02 | [step-02-character-pack.md](design/pipeline/step-02-character-pack.md) | Step2 角色包 |
| D-V2-P03 | [step-03-shot-plan.md](design/pipeline/step-03-shot-plan.md) | Step3 分镜规划 |
| D-V2-P04 | [step-04-keyframe.md](design/pipeline/step-04-keyframe.md) | Step4 关键帧 |
| D-V2-P05 | [step-05-video.md](design/pipeline/step-05-video.md) | Step5 图生视频 |
| D-V2-P06 | [deferred-audio-compose.md](design/pipeline/deferred-audio-compose.md) | 配音/合成（后置） |
| D-V2-P07 | [cross-cutting.md](design/pipeline/cross-cutting.md) | SSE/持久化/切页 |

### 页面（[design/pages/](design/pages/)）

| 文件 | 页面 |
|------|------|
| [dashboard.md](design/pages/dashboard.md) | 项目工作台 |
| [chat-studio.md](design/pages/chat-studio.md) | Chat Studio |
| [script-editor.md](design/pages/script-editor.md) | 剧本编辑器 |
| [character-manager.md](design/pages/character-manager.md) | 角色管理台 |
| [storyboard-workbench.md](design/pages/storyboard-workbench.md) | 分镜工作台 |
| [composer-studio.md](design/pages/composer-studio.md) | 成片合成室 |
| [skill-market.md](design/pages/skill-market.md) | SKILL 市场 |
| [asset-library.md](design/pages/asset-library.md) | 素材库 |
| [generation-history.md](design/pages/generation-history.md) | 生成记录 |
| [cost-statistics.md](design/pages/cost-statistics.md) | 成本统计 |

### SKILL

| 文件 | 说明 |
|------|------|
| [character-reference-pack-spec.md](design/skills/character-reference-pack-spec.md) | 角色设定包 + 三层 SKILL |

### 测试（[testing/](testing/)）

| 文件 | 说明 |
|------|------|
| [chat-boundary-checklist.md](testing/chat-boundary-checklist.md) | Chat 边界 E2E |
| [pipeline-v2-checklist.md](testing/pipeline-v2-checklist.md) | Pipeline V2 E2E |
| [pages-smoke-checklist.md](testing/pages-smoke-checklist.md) | 各页面冒烟 |

---

## 需求 ↔ 设计 ↔ 测试 交叉引用

| 需求 | 设计 | 测试 |
|------|------|------|
| R-057~062 | chat/00~10 | chat-boundary |
| R-063~066 | pipeline/00~05 | pipeline-v2 |
| R-067~070 | skills/character-reference-pack | pipeline-v2 §Step2 |
| R-071~075 | pages/* | pages-smoke |
