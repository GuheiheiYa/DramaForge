# [D-V2-PG09] 成本统计

**关联需求**: R-075, R-009  
**路由**: `/cost`  
**代码**: `app/src/pages/CostStatistics.tsx`

---

## 1. 页面职责

按项目/服务统计 cost_records；饼图可视化。

---

## 2. V2 应记账点（规格；实现 P2）

| Step | 服务 | 说明 |
|------|------|------|
| Chat 方案 | LLM | tokens |
| Step1 | LLM | script |
| Step2 | LLM + Agnes | 提取 + N×视角图 |
| Step4 | Agnes | M×关键帧 |
| Step5 | Agnes | M×video |

---

## 3. 在 V2 路径中的位置

管理面；不阻塞创作。

---

## 4. 边界

| 场景 | V2 现状 |
|------|---------|
| Pipeline 未写 cost_records | 页面可能为空；文档标注已知 gap |

---

## 5. 验收

- [ ] API 可用不 500
- [ ] （P2）Step5 后 cost 有 video 项

---

## 6. 关联

[pipeline/cross-cutting.md](../pipeline/cross-cutting.md) §9
