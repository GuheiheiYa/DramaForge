# V2 问题追踪

**最后更新**: 2026-06-17  
**V1 问题**: [`docs/V1/issues.md`](../V1/issues.md)

---

## Open

### [ISS-V2-001] 制作计划卡取消/重发后不跟随最新回复

- **关联需求**: R-058, R-057
- **设计**: [chat/05-mode-select.md](design/chat/05-mode-select.md)
- **现象**: 用户确认方案后出现 `plan_card`，取消 Pipeline 或改剧本重发后，旧卡留在历史位置，需上滚查找
- **根因**: `plan_card` 仅 append；无 `creationTurnId` / `superseded`；全局 `planConfirmed` 与消息脱节
- **方案**: 每轮创作 supersede 旧卡；仅 `activeTurnId` 对应卡可交互；新卡 append 后 scrollIntoView
- **状态**: open（规格已定，待实现）

### [ISS-V2-002] 角色仅单张立绘，无法支撑国漫一致性

- **关联需求**: R-067 ~ R-069
- **设计**: [character-reference-pack-spec.md](design/skills/character-reference-pack-spec.md)
- **现象**: Pipeline Step1 只生成一张 front 立绘；无多视角、无 DNA
- **方案**: character_pack + visual_dna + 设定包 API
- **状态**: open

### [ISS-V2-003] 分镜预览图不落库，工作台与 Pipeline 脱节

- **关联需求**: R-065, R-073
- **设计**: [step-04-keyframe.md](design/pipeline/step-04-keyframe.md)
- **现象**: V1 Step2 前 6 镜 imageUrl 仅内存；StoryboardWorkbench 无 keyframe 字段
- **方案**: Step4 keyframe_url 落库 `storyboard_shots`
- **状态**: open

### [ISS-V2-004] 工作台生视频与 Pipeline i2v 不一致

- **关联需求**: R-066
- **设计**: [step-05-video.md](design/pipeline/step-05-video.md), [storyboard-workbench.md](design/pages/storyboard-workbench.md)
- **现象**: Pipeline 用 imageUrl i2v；工作台 `generateShotVideo` 纯 t2v
- **方案**: 统一要求 keyframe_url + build_video_prompt + DNA
- **状态**: open

### [ISS-V2-005] SKILL 硬编码与 DB 参数未贯通 Pipeline

- **关联需求**: R-070
- **设计**: [skill-market.md](design/pages/skill-market.md)
- **状态**: open

---

## Closed（V1 已修，V2 规范继承）

| ID | 说明 | V2 文档 |
|----|------|---------|
| ISS-V2-013 | error_card 重试后不消失 | chat/09 |
| ISS-V2-015 | Chat 会话无持久化 | chat/01（V1 已 persist） |

---

## 验收用例索引

| Issue | 测试 |
|-------|------|
| ISS-V2-001 | [chat-boundary-checklist.md](testing/chat-boundary-checklist.md) §2 |
| ISS-V2-002~004 | [pipeline-v2-checklist.md](testing/pipeline-v2-checklist.md) |
