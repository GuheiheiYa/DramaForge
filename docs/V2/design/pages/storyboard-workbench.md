# [D-V2-PG04] 分镜工作台

**关联需求**: R-064, R-073, R-066  
**路由**: `/storyboard?projectId=`  
**代码**: `app/src/pages/StoryboardWorkbench.tsx`

---

## 1. 页面职责

分镜列表、帧编辑、时间轴条；编辑 **shot_plan** 产物；手动补 keyframe/video。

---

## 2. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 自动路径 | **非必经**；Step3 后台落库即可 |
| 精修路径 | 改镜号、描述、删镜 |
| 手动路径 | 主创作 |

---

## 3. 必做 vs 可选

用户 **不打开** 此页也可完成 V2 DoD。

---

## 4. 数据读写

| 字段 | V2 |
|------|-----|
| storyboard_shots.* | 文本 metadata |
| keyframe_url | **新增**；Step4 写入 |
| GET/PUT shots | api |

前端 `Shot` 类型需增加 `keyframeUrl`。

---

## 5. 与 Pipeline 同步

| 操作 | 规则 |
|------|------|
| Step3 后 | 列表从 DB 加载 |
| Step4 后 | 帧编辑器显示 keyframe 缩略图 |
| 用户改 description | 标记该镜 keyframe 过期 |
| 「生成视频」 | **必须 i2v**（keyframe_url + 统一 prompt） |
| FrameEditor 模拟生图 | V2 移除 mock，接真实 API |

---

## 6. 边界

| 场景 | 行为 |
|------|------|
| 无 keyframe 点生成视频 | toast 请先生成关键帧 |
| normalizeShotType | 兼容 Pipeline 非标准景别（V1 已修） |
| 批量操作 | 不阻塞 Pipeline SSE |

---

## 7. 验收

- [ ] 自动路径完成后打开可见 shots + keyframe
- [ ] 手动生成视频走 i2v

---

## 8. 代码锚点

`StoryboardWorkbench`, `FrameEditor`, `generateShotVideo` API
