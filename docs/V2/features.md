# V2 功能文档

**版本**: 2.0  
**关联需求**: [requirements.md](requirements.md)  
**V1 功能**: [`docs/V1/features.md`](../V1/features.md)

---

## V2 增量功能

### [F-012-V2] Chat Studio — 创作轮次与五步计划卡

**状态**: 📋 规格已定  
**关联需求**: R-057 ~ R-062, R-063  
**设计**: [design/chat/](design/chat/)

**V2 变化**:
- `creationTurnId` + `superseded` 消息模型
- 制作计划卡展示 **五步**（非 V1 六步）
- 全链路错误 L1~L6 与 UI 规范
- clip 交付区（Pipeline 完成后）

**关联文件**: `app/src/pages/Chat.tsx`, `app/src/store/useChatStore.ts`

---

### [F-013-V2] Pipeline 五步编排

**状态**: 📋 规格已定  
**关联需求**: R-063 ~ R-066  
**设计**: [design/pipeline/](design/pipeline/)

| Step | 功能 |
|------|------|
| 1 script | 结构化剧本落库 |
| 2 character_pack | 多视角设定包 + visual_dna |
| 3 shot_plan | 分镜 metadata 落库 |
| 4 keyframe | 每镜关键帧 + 场景母图 |
| 5 video | i2v → timeline_clips |

**后置占位**: audio / compose → [deferred-audio-compose.md](design/pipeline/deferred-audio-compose.md)

**关联文件**: `backend/app/services/pipeline_executor.py`, `pipeline_service.py`

---

### [F-003-V2] 角色管理台 — 设定包管理器

**状态**: 📋 规格已定  
**关联需求**: R-067, R-072  
**设计**: [character-manager.md](design/pages/character-manager.md)

**V2 变化**: 四宫格 Turnaround、设定包进度、DNA Tab、generate-pack API

---

### [F-004-V2] 分镜工作台 — 可选精修

**状态**: 📋 规格已定  
**关联需求**: R-064, R-073  
**设计**: [storyboard-workbench.md](design/pages/storyboard-workbench.md)

**V2 定位**: 非自动路径必经；展示 keyframe_url；统一 i2v

---

### [F-005-V2] 成片合成室 — 可选后置

**状态**: 📋 规格已定  
**关联需求**: R-064, R-074  
**设计**: [composer-studio.md](design/pages/composer-studio.md)

**V2 定位**: clip 精修/导出；不阻塞自动路径 DoD

---

### [F-006-V2] SKILL 市场 — Pipeline 贯通

**状态**: 📋 规格已定  
**关联需求**: R-069, R-070  
**设计**: [skill-market.md](design/pages/skill-market.md)

**V2 变化**: render_mode、visual_style_preset 写入 Pipeline prompt

---

## V1 功能继承（无 V2 规格变更时引用 V1）

| ID | 功能 | V1 文档 |
|----|------|---------|
| F-001 | 项目 Dashboard | V1 features §F-001 |
| F-002 | 剧本编辑器 | V1 + [script-editor.md](design/pages/script-editor.md) delta |
| F-007 | 素材库 | [asset-library.md](design/pages/asset-library.md) |
| F-008 | 生成记录 | [generation-history.md](design/pages/generation-history.md) |
| F-009 | 成本统计 | [cost-statistics.md](design/pages/cost-statistics.md) |
