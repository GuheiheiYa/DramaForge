# [D-V2-P02] Step2 — character_pack（角色设定包）

**关联需求**: R-067 ~ R-070, R-072  
**前置**: [step-01-script.md](step-01-script.md)  
**权威规范**: [character-reference-pack-spec.md](../skills/character-reference-pack-spec.md)

---

## 1. 职责

从剧本提取角色 → 生成 **P0 四视角参考图** → 写入 `visual_dna` → 落库 `characters`。

---

## 2. 输入 / 输出

| 输入 | 说明 |
|------|------|
| Step1 剧本 data | 场景、对白、角色名 |
| skill prompt + render_mode | L1 流派 |
| 项目首张主角 front（可选） | 跨角色风格锚 |

| 输出 | 说明 |
|------|------|
| characters[] + assets_json | 每角色 ≥4 视角 |
| visual_dna | 固化 prompt |
| steps_json[1].data | pack 完整度 % |

---

## 3. 处理流程

```
LLM 提取角色 JSON
→ 为每角色生成 visual_dna（模板或 LLM）
→ turnaround_front (t2i)
→ side / three_quarter / back (i2i, ref=front)
→ _save_characters
```

生成顺序与 prompt 见 [character-reference-pack-spec.md](../skills/character-reference-pack-spec.md) §3~4。

---

## 4. SSE / UI

| progress | 说明 |
|----------|------|
| 20~40 | 提取角色 |
| 40~90 | 逐角色/逐视角生图 |
| 100 | step_completed |

Chat 面板：CharacterPreview 展示四宫格缩略（实现时）  
精修：[/characters](../pages/character-manager.md)

---

## 5. 边界

| 场景 | 行为 |
|------|------|
| 某视角生成失败 | 该槽位 failed；整步可 retry；完整度 <100% warn |
| 0 个角色 | step_failed |
| 仅主角需 P0 | 配角可降级为 front only（配置项 P2） |
| 用户已在角色页改过 DNA | retry Step2 应询问是否覆盖 |

---

## 6. 重试

- `POST /retry/1`：从 LLM 提取重跑或仅补缺失视角（实现二选一，推荐仅补缺失）

---

## 7. 验收

- [ ] 每主角 4 视角 URL 在 assets_json
- [ ] visual_dna 非空
- [ ] 角色页可见四宫格

---

## 8. API（规划）

- `POST /characters/{id}/generate-pack`
- `POST /characters/{id}/generate-asset`

---

## 9. 代码锚点

`pipeline_service.run_step_character` → 改为 `run_step_character_pack`  
`image_service.generate_character_portraits` → `generate_character_reference_pack`
