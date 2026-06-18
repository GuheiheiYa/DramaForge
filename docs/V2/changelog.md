# V2 变更日志

---

## 2026-06-17 — V2 文档体系建立

### 文档

- 新建 `docs/V2/` 全产品规格体系
- V1 归档至 `docs/V1/`，不再作为主规格
- 核心变更：
  - Pipeline 六步 → **五步** + deferred audio/compose
  - 角色单立绘 → **设定包 + visual_dna**
  - 分镜/合成 → **可选精修**，自动路径 clip 列表即交付
  - Chat → **creationTurn + superseded + L1~L6 重试**

- 新增 [implementation-priority.md](implementation-priority.md) — Phase 0~6 与 Sprint 1/2/3

### 代码

- 无（文档先行阶段）

---

## 后续（实现）

详见 [implementation-priority.md](implementation-priority.md)。

| Sprint | 内容 |
|--------|------|
| Sprint 1 | Phase 0.1 + Phase 1.1 + Phase 2（角色设定包） |
| Sprint 2 | Phase 3 + Phase 4（关键帧 → i2v → MVP） |
| Sprint 3 | Phase 5 P1 + Phase 6 P2 |
