# DramaForge V2 文档

**版本**: 2.0  
**状态**: 规格已定（文档完整）；代码待实现  
**V1 归档**: [`docs/V1/`](../V1/)

---

## 范围

V2 定义 Chat 创作轮次、**五步 Pipeline**、角色设定包、各页面边界；自动路径以 **clip 列表** 交付，分镜/合成可选。

---

## 阅读顺序

1. [design.md](design.md) — 架构 1 页  
2. [migration-from-v1.md](migration-from-v1.md) — 与 V1 差异  
3. [requirements.md](requirements.md) — 需求索引  
4. [implementation-priority.md](implementation-priority.md) — **代码实现优先级（排期用）**  
5. [design/pipeline/00-v2-flow.md](design/pipeline/00-v2-flow.md) — 五步流程  
5. [design/skills/character-reference-pack-spec.md](design/skills/character-reference-pack-spec.md) — 角色设定包  
6. [design/chat/00-state-machine.md](design/chat/00-state-machine.md) — Chat 状态机  
7. [design/pages/](design/pages/) — 各页面边界  
8. [testing/](testing/) — 验收清单  

完整索引：[navigation.md](navigation.md)

---

## 术语

| 术语 | 含义 |
|------|------|
| 成品 | 多分镜 video clip 按顺序组成的序列；导出 MP4 为可选 |
| 角色设定包 | 多视角参考图 + visual_dna + render_mode |
| creationTurn | 一轮创作：创意 → 方案 → 计划卡 →（可选）Pipeline |
| superseded | 已被新轮次替代的历史消息/卡片 |
| Deferred | 配音/合成：不阻塞 V2 DoD |

---

## 文档清单（35 篇）

### 总览（8）

- README.md, navigation.md, design.md, requirements.md, features.md, data-model.md, issues.md, changelog.md, migration-from-v1.md

### Chat（11）

- design/chat/00 ~ 10

### Pipeline（8）

- design/pipeline/00-v2-flow, step-01~05, deferred-audio-compose, cross-cutting

### 页面（10）

- design/pages/*（含 character-manager）

### SKILL（1）

- design/skills/character-reference-pack-spec.md

### 测试（3）

- testing/chat-boundary, pipeline-v2, pages-smoke

---

## 代码

文档先行；实现顺序见 **[implementation-priority.md](implementation-priority.md)**（Phase 0~6 + Sprint 划分）。
