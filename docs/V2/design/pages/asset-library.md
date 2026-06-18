# [D-V2-PG07] 素材库

**关联需求**: R-075, R-007  
**路由**: `/assets`  
**代码**: `app/src/pages/AssetLibrary.tsx`

---

## 1. 页面职责

项目级图片/音频/视频素材浏览、上传、删除。

---

## 2. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 自动路径 | 非必经 |
| 归档 | Step2/4/5 产物 **可** 同步写入 assets 表（V2 规划） |

---

## 3. V2 资产类型扩展

| asset_type | 来源 |
|------------|------|
| character_reference | Step2 assets_json |
| keyframe | Step4 |
| video_clip | Step5 |
| user_upload | 手动 |

---

## 4. 数据读写

`GET/POST/DELETE /api/v1/assets`；project_id 过滤。

---

## 5. 边界

| 场景 | 行为 |
|------|------|
| Pipeline 自动写入未实现 | V2 文档定义；实现 P2 |
| 删素材 | 不删 characters 引用时需 warn |

---

## 6. 验收

- [ ] 按项目筛选
- [ ] （P2）Pipeline 完成后可见 keyframe/clip

---

## 7. 与角色预设

P2：角色「导出预设」存 asset_type=character_preset。
