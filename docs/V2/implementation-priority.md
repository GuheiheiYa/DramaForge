# V2 代码实现优先级

**版本**: 2.0  
**状态**: 规格已定，供排期使用  
**关联**: [requirements.md](requirements.md)、[migration-from-v1.md](migration-from-v1.md)  
**验收**: [testing/pipeline-v2-checklist.md](testing/pipeline-v2-checklist.md)

---

## 1. 总原则

按 **「先 unblock 主路径 → 再一致性质量 → 最后精修与后置」** 实现。

```
P0 MVP 主线：
  数据模型 → Chat creationTurn → 角色设定包(Step2+角色页)
  → 分镜规划(Step3) → 关键帧(Step4) → i2v+clip交付(Step5+Chat UI)

P1 体验：
  分镜/剧本精修提示 → 角色 P1 槽位 → 合成室只读时间轴

P2 后置：
  配音 / 导出 / 成本 / 素材库 / 跨项目预设
```

**不建议先做**：合成室、配音、成本记账（不挡 MVP）。  
**不建议在角色包之前做**：关键帧 Step4（人物仍会飘）。

---

## 2. Phase 0 — 基础契约（约 1–2 天）

| 顺序 | 任务 | 需求 | 文档 | DoD |
|------|------|------|------|-----|
| 0.1 | 数据模型 delta | R-067~068 | [data-model.md](data-model.md) | 迁移可跑；`visual_dna`、`keyframe_url` 字段存在 |
| 0.2 | Pipeline 五步索引 | R-063 | [00-v2-flow.md](design/pipeline/00-v2-flow.md) | executor step 0~4 映射 script→video |
| 0.3 | `render_mode` + SKILL 贯通 | R-070 | [skill-market.md](design/pages/skill-market.md), [cross-cutting.md](design/pipeline/cross-cutting.md) | 各步日志可见 L1 prompt 块 |

**代码锚点**: `db_models.py`, `schemas.py`, `pipeline_executor.py`, `SKILL_CONFIGS` / `skills.parameters`

---

## 3. Phase 1 — Chat 边界（P0，约 2–3 天）

| 顺序 | 任务 | 需求 | 文档 | DoD |
|------|------|------|------|-----|
| 1.1 | `creationTurnId` + `superseded` | R-057, R-058 | [00-state-machine.md](design/chat/00-state-machine.md), [05-mode-select.md](design/chat/05-mode-select.md) | ISS-V2-001 通过 |
| 1.2 | 制作计划卡五步文案 | R-063 | [05](design/chat/05-mode-select.md), [10](design/chat/10-ui-display-spec.md) | ModeSelectorCard 显示五步 |
| 1.3 | 错误 L1~L6 对齐 | R-059 | [09-error-retry-recovery.md](design/chat/09-error-retry-recovery.md) | 重试后 error_card resolved |
| 1.4 | persist 补 turn / 方案恢复 | R-060 | [01-send-message.md](design/chat/01-send-message.md) | 刷新后会话+方案可恢复或降级提示 |

**代码锚点**: `useChatStore.ts`, `Chat.tsx` PlanConfirmCard / ModeSelectorCard / MessageBubble

**可与 Phase 0 并行**：1.1 不依赖生图 API。

---

## 4. Phase 2 — 角色设定包（P0 核心，约 3–5 天）

| 顺序 | 任务 | 需求 | 文档 | DoD |
|------|------|------|------|-----|
| 2.1 | `generate_character_reference_pack` | R-067 | [character-reference-pack-spec.md](design/skills/character-reference-pack-spec.md) | front t2i → side/back/3-4 i2i |
| 2.2 | `visual_dna` 生成与存储 | R-067 | [data-model.md](data-model.md), step-02 | DNA 非空 |
| 2.3 | API generate-pack / generate-asset | R-072 | [character-manager.md](design/pages/character-manager.md) §7 | 单槽与整包可调用 |
| 2.4 | 角色页 P0 UI（四宫格+进度） | R-072 | character-manager §3 P0 | 详情可见四视角 |
| 2.5 | Pipeline Step2 接入 pack | R-067 | [step-02-character-pack.md](design/pipeline/step-02-character-pack.md) | 不再只出单张立绘 |

**代码锚点**: `image_service.py`, `characters.py`, `pipeline_service.py`, `CharacterManager.tsx`

---

## 5. Phase 3 — 分镜规划 + 关键帧（P0，约 3–4 天）

| 顺序 | 任务 | 需求 | 文档 | DoD |
|------|------|------|------|-----|
| 3.1 | Step3 shot_plan（只 metadata） | R-063 | [step-03-shot-plan.md](design/pipeline/step-03-shot-plan.md) | storyboard_shots 有行、无 keyframe |
| 3.2 | Step4 keyframe（场景母图+DNA+ref） | R-065 | [step-04-keyframe.md](design/pipeline/step-04-keyframe.md) | 每镜 keyframe_url |
| 3.3 | 分镜页展示 keyframe | R-073 | [storyboard-workbench.md](design/pages/storyboard-workbench.md) | 帧编辑器有缩略图 |
| 3.4 | preview 模式 Step4 结束 | R-063 | [00-v2-flow.md](design/pipeline/00-v2-flow.md) | 无 video 任务 |

**依赖**: Phase 2 完成（角色 ref + DNA）。

**代码锚点**: 新 `run_step_keyframe`；`storyboard_shots.keyframe_url`；拆分 V1 `run_step_storyboard`

---

## 6. Phase 4 — 图生视频 + 交付（P0，约 2–3 天）

| 顺序 | 任务 | 需求 | 文档 | DoD |
|------|------|------|------|-----|
| 4.1 | Step5 统一 i2v | R-066 | [step-05-video.md](design/pipeline/step-05-video.md) | 必须 keyframe_url + DNA prompt |
| 4.2 | 工作台 generateShotVideo 同路径 | R-066 | storyboard-workbench | 禁止无 keyframe 的纯 t2v |
| 4.3 | Chat pipeline_complete + clip 列表 | R-064 | [10-ui-display-spec.md](design/chat/10-ui-display-spec.md) | Chat 内逐条播放 |
| 4.4 | content_policy 重试接入 Step5 | R-059 | step-05 | sanitize 后重试 1 次 |

**DoD（V2 MVP）**: auto 模式跑通 [pipeline-v2-checklist.md](testing/pipeline-v2-checklist.md)；**不必打开合成室**。

**代码锚点**: `pipeline_executor` 视频步, `video_prompt.py`, `videos.py`, `Chat.tsx`

---

## 7. Phase 5 — 工作台 polish（P1）

| 顺序 | 任务 | 需求 | 文档 |
|------|------|------|------|
| 5.1 | 剧本页同步/重跑提示 | R-071 | script-editor |
| 5.2 | 角色页 P1（表情/服装+DNA Tab） | R-072 | character-manager P1 |
| 5.3 | 合成室 clips 时间轴（导出仍 Deferred） | R-074 | composer-studio |
| 5.4 | Dashboard 项目卡 Pipeline/设定包状态 | — | dashboard P2 |

---

## 8. Phase 6 — Deferred / P2（不挡 MVP）

| 任务 | 文档 |
|------|------|
| 配音 TTS | [deferred-audio-compose.md](design/pipeline/deferred-audio-compose.md) |
| FFmpeg 合成 / MP4 导出 | deferred + composer-studio |
| cost_records 自动记账 | cost-statistics, cross-cutting §9 |
| assets 表归档 keyframe/clip | asset-library |
| 角色预设跨项目导入 | character-reference-pack §5.3 |
| Pipeline 重跑覆盖/版本化 | migration-from-v1 |

---

## 9. 建议 Sprint 划分

### Sprint 1（约 1 周）— 基础 + 角色

- Phase 0.1 + Phase 1.1（模型 + creationTurn）
- Phase 2.1 ~ 2.4（pack API + 角色页四宫格）
- Phase 2.5（Pipeline Step2）

**出口**: 角色设定包可用；Chat plan 卡问题修复。

### Sprint 2（约 1 周）— 主路径跑通

- Phase 3 全部
- Phase 4 全部

**出口**: pipeline-v2-checklist auto 模式通过；V2 MVP。

### Sprint 3（按需）— P1 + P2

- Phase 5 + Phase 6 按业务优先级选取

---

## 10. 需求 ↔ Phase 对照

| 需求 | Phase |
|------|-------|
| R-057~062 | 1 |
| R-063~066 | 0.2, 3, 4 |
| R-067~070 | 0.3, 2 |
| R-071~075 | 5, 6 |

---

## 11. 实现状态跟踪

| Phase | 状态 | 完成日期 |
|-------|------|----------|
| 文档 | 已完成 | 2026-06-17 |
| Phase 0 | 待实现 | — |
| Phase 1 | 待实现 | — |
| Phase 2 | 待实现 | — |
| Phase 3 | 待实现 | — |
| Phase 4 | 待实现 | — |
| Phase 5 | 待实现 | — |
| Phase 6 | 待实现 | — |

实现进展请更新本节与 [changelog.md](changelog.md)。
