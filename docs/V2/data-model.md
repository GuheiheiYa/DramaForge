# V2 数据模型 Delta

**完整基线**: [`docs/V1/data-model.md`](../V1/data-model.md)  
**迁移说明**: [migration-from-v1.md](migration-from-v1.md)

---

## 1. projects 表（建议扩展）

| 字段 | 类型 | 说明 |
|------|------|------|
| render_mode | VARCHAR(20) | `2d_cel` / `3d_cgi`，默认继承 SKILL |
| visual_style_preset | VARCHAR(50) | 如 `xuanhuan-2d-v1` |

或通过 `skill_id` + `skills.parameters` 表达，二选一实现。

---

## 2. characters 表

### 2.1 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| visual_dna | JSON | `{ prompt_block_en, prompt_block_zh, immutable_traits[], render_mode, skill_preset_id }` |
| style_anchor_asset_id | VARCHAR(32) | 指向 assets_json 中 turnaround_front |

### 2.2 assets_json 单条结构（V2）

```json
{
  "id": "asset_xxx",
  "type": "turnaround_front",
  "view": "front",
  "expression": "neutral",
  "costume_id": "default",
  "render_mode": "3d_cgi",
  "name": "小医仙-正面",
  "thumbnail": "https://...",
  "is_style_anchor": true,
  "status": "done",
  "prompt_snapshot": "...",
  "generation_task_id": "task_xxx"
}
```

**type 枚举（P0）**: `turnaround_front`, `turnaround_side`, `turnaround_back`, `turnaround_three_quarter`  
**P1**: `expression_*`, `costume_*`

---

## 3. storyboard_shots 表

| 字段 | 类型 | 说明 |
|------|------|------|
| keyframe_url | VARCHAR(500) | Step4 关键帧 URL，Step5 i2v 输入 |
| scene_mood_ref | VARCHAR(500) | 可选，同场景母图 URL（内存或冗余存储） |
| recommended_character_views | JSON | 如 `{"小医仙":"three_quarter"}` |

V1 字段 `description`, `shot_type`, `characters` 等保留。

---

## 4. timeline_clips 表

| 字段 | 说明 |
|------|------|
| media_url | Step5 视频 URL（已有） |
| source_shot_id | 关联 storyboard_shots.id（建议） |
| keyframe_url | 冗余存生成来源（可选） |

---

## 5. pipeline_runs.steps_json（V2 五步索引）

| Index | id | 说明 |
|-------|-----|------|
| 0 | script | 同 V1 |
| 1 | character_pack | 含 characters[] + pack 完整度 |
| 2 | shot_plan | shots[] metadata |
| 3 | keyframe | shots[] + keyframe_url |
| 4 | video | clips[] |

audio / compose 不在 V2 主路径 steps_json 必填。

---

## 6. ChatMessage（前端，非 DB）

| 字段 | 类型 | 说明 |
|------|------|------|
| creationTurnId | string | 创作轮次 ID |
| superseded | boolean | 是否已被新轮次替代 |

持久化于 `dramaforge-chat-store` partialize 扩展（实现时）。

---

## 7. assets 表（素材库）

V2 建议 `asset_type` 扩展：

| type | 来源 Step |
|------|-----------|
| character_reference | Step2 |
| keyframe | Step4 |
| video_clip | Step5 |
| character_preset | 导出预设 P2 |

---

## 8. generation_tasks

| task_type（建议） | 触发 |
|-------------------|------|
| character_pack | Step2 / 角色页 generate-pack |
| character_asset | 单槽位 |
| keyframe | Step4 |
| video_shot | Step5 |
