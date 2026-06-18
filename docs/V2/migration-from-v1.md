# V1 → V2 迁移说明

**适用读者**: 开发、测试、产品  
**V1 规格**: [`docs/V1/`](../V1/)  
**V2 规格**: [`docs/V2/`](.)

---

## 1. Pipeline 步骤变化

| V1 Step | V1 名称 | V2 Step | V2 名称 | 变化 |
|---------|---------|---------|---------|------|
| 0 | script | 1 | script | 行为基本一致 |
| 1 | character（单立绘） | 2 | character_pack | **多视角设定包 + visual_dna** |
| 2 | storyboard（前6镜预览，图不落库） | 3 | shot_plan | 仅规划 metadata；预览图移到 Step4 |
| — | — | 4 | keyframe | **新增**：每镜关键帧落库 |
| 3 | video | 5 | video | 统一 i2v；prompt 注入 DNA |
| 4 | audio | — | deferred | 不阻塞 V2 交付 |
| 5 | compose | — | deferred | 不阻塞 V2 交付 |

**preview 模式（V2）**: Step 4（关键帧）完成后结束，不生成视频。

---

## 2. 用户可见行为变化

| 场景 | V1 | V2 |
|------|----|----|
| 自动路径终点 | 跑完六步（4/5 占位） | **Step5 clip 列表即交付** |
| 必须打开分镜页 | 常被引导 | **不必** |
| 必须打开合成室 | 设计上有 Step5 | **不必** |
| 角色页 | 一张立绘 | **设定包画廊** |
| 制作计划卡位置 | 历史 append，取消后可能留在上方 | **activeTurn 唯一有效卡** |
| 分镜预览图 | 仅 Pipeline 内存 | **keyframe_url 落库** |
| 工作台生视频 | 纯 t2v | **与 Pipeline 统一 i2v** |

---

## 3. 数据模型变化

见 [data-model.md](data-model.md)。摘要：

- `characters.visual_dna` JSON 新增
- `characters.assets_json[]` 扩展 view/expression/costume_id
- `storyboard_shots.keyframe_url` 新增（建议）
- `projects.render_mode` 或通过 skill 参数继承

---

## 4. API 变化（规划）

| 新增/变更 | 说明 |
|-----------|------|
| `POST /characters/{id}/generate-pack` | 生成设定包 |
| `POST /characters/{id}/generate-asset` | 单槽位生成 |
| `POST /images/generate-character` | 增加 view/expression/costume_id |
| Pipeline start 请求 | steps 语义按 V2 五步 |

V1 API **保持兼容**直至实现切换；文档以 V2 为准。

---

## 5. 已知 V1 问题在 V2 的处置

| V1 问题 | V2 处置 |
|---------|---------|
| plan_card 取消后不跟随最新回复 | R-058 / chat/05 |
| 分镜 imageUrl 不落库 | Step4 keyframe 落库 |
| 角色单立绘一致性差 | character_pack + DNA |
| SKILL 硬编码与 DB 割裂 | R-070 |
| error_card 重试后不消失 | V1 已修；V2 扩展为全链路 retry 规范 |
| 合成/配音占位挡 DoD | 移出 V2 DoD |

---

## 6. 实现迁移建议

1. **文档先行**（当前阶段）✅  
2. Chat creationTurn（不依赖 Pipeline 重构）  
3. 角色设定包 API + 角色页 P0 UI  
4. Pipeline Step2/4/5 重构  
5. 分镜/合成改为可选入口文案与路由  
6. deferred audio/compose  
