# [D-V2-P03] Step3 — shot_plan（分镜规划）

**关联需求**: R-063, R-064, R-073  
**前置**: [step-02-character-pack.md](step-02-character-pack.md)

---

## 1. 职责

根据剧本 + 角色列表生成 **分镜 metadata 列表** 并落库。**不生关键帧、不生视频。**

用户 **不必** 打开分镜工作台。

---

## 2. 输入 / 输出

| 输入 | 说明 |
|------|------|
| Step1 剧本 | episodes/scenes |
| Step2 角色 | 名字、DNA 摘要 |
| skill_id | 景别/运镜风格倾向 |

| 输出 | 存储 |
|------|------|
| storyboard_shots 行 | shot_number, description, shot_type, duration, characters[], scene_ref, camera_movement, dialogue… |
| steps_json[2].data.shots[] | 同上（无 keyframe_url） |

**V1 差异**: 不再在 Step3 生成前 6 镜 preview 图（移至 Step4）。

---

## 3. 处理

- `run_step_shot_plan()` LLM → shots JSON
- 失败 → `_generate_shots_from_script()` 规则回退
- `_save_storyboard()` INSERT（不含 keyframe_url）

---

## 4. 每镜规划字段（V2 扩展）

| 字段 | 说明 |
|------|------|
| recommended_view | 建议引用的角色视角，如 three_quarter |
| costume_id | default / battle |
| scene_ref | 关联剧本场景 → Step4 场景母图分组 |

---

## 5. SSE / UI

- progress 按镜头数 heartbeat
- 面板 StoryboardPreview：镜头列表文本（无图）
- preview 模式：**不在 Step3 结束**（V2 在 Step4 结束）

---

## 6. 边界

| 场景 | 行为 |
|------|------|
| shots 为空 | step_failed |
| 用户在 storyboard 页删镜 | DB 与 steps_json 可能不一致；精修以 DB 为准，Step4 读 DB |
| 用户在 storyboard 页加镜 | Step4/5 应包含新镜（手动触发 regenerate 或重跑 Step4） |

---

## 7. 工作台（可选）

[storyboard-workbench.md](../pages/storyboard-workbench.md) — 编辑 shot_plan 产物

---

## 8. 验收

- [ ] storyboard_shots 有行
- [ ] 不打开 /storyboard 仍可进入 Step4
- [ ] preview 模式仍继续到 Step4

---

## 9. 代码锚点

由 V1 `run_step_storyboard` 拆分：规划与生图分离
