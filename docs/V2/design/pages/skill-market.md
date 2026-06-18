# [D-V2-PG06] SKILL 市场

**关联需求**: R-069, R-070, R-006  
**路由**: `/skills`  
**代码**: `app/src/pages/SkillMarket.tsx`, `backend/app/api/v1/skills.py`

---

## 1. 页面职责

浏览、安装、参数配置 SKILL；影响 **L1 流派**（render_mode、visual_style）。

---

## 2. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 创建项目 / Chat | 选 skill_id |
| Pipeline | resolve_skill_config 注入各步 prompt |

---

## 3. L1 SKILL 参数（V2 必接入 Pipeline）

| 参数 | 类型 | 影响 |
|------|------|------|
| render_mode | 2d_cel / 3d_cgi | Step2/4/5 生图生视频 |
| genre_tone | 玄幻/仙侠/… | 剧本/服装倾向 |
| line_weight | 2D 专用 | 线稿 |
| color_saturation | slider | 上色 |

**标注**：SkillMarket mock 中未接入项需标「仅展示」。

---

## 4. 预设示例（非法 IP 名）

| preset id | 名称 | render_mode |
|-----------|------|-------------|
| xuanhuan-2d-v1 | 玄幻国漫 2D | 2d_cel |
| xuanhuan-3d-v1 | 玄幻国漫 3D | 3d_cgi |
| jp-school | 日式校园 | 2d_cel |

详见 [character-reference-pack-spec.md](../skills/character-reference-pack-spec.md) §10。

---

## 5. 与角色 DNA 关系

- SKILL = L1 画风  
- 角色 visual_dna = L2  
- **不在** SKILL 市场卖具体角色

---

## 6. 边界

| 场景 | 行为 |
|------|------|
| 改 SKILL 后 Pipeline 中 | 不 retroactive；重跑 Step2+ 生效 |
| DB seed 仅 1 条 | 前端 skillOptions 7 条需迁移统一 |

---

## 7. 验收

- [ ] 创建项目选 SKILL 写入 project.skill_id
- [ ] Pipeline 日志可见 SKILL prompt 块

---

## 8. ISS-V2-005

硬编码 SKILL_CONFIGS 与 DB 割裂 → V2 以 DB parameters 为权威。
