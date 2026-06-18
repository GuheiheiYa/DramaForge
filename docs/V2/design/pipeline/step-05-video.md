# [D-V2-P05] Step5 — video（图生视频）

**关联需求**: R-066, R-063  
**前置**: [step-04-keyframe.md](step-04-keyframe.md)

---

## 1. 职责

逐镜 **i2v**：`keyframe_url` + `build_video_prompt()` → `timeline_clips.media_url`。

**V2 自动路径终点**：clip 列表交付。

---

## 2. 输入 / 输出

| 输入 | 说明 |
|------|------|
| keyframe_url | Step4 必填 |
| visual_dna | 出场角色 prompt 片段 |
| skill_id | 视频风格 |
| 上一镜 clip 摘要 | 连贯性（可选） |

| 输出 | 存储 |
|------|------|
| timeline_clips | track_type=video, media_url, duration |
| steps_json[4].data.clips[] | overallProgress |
| generation_tasks | 任务记录 |

---

## 3. prompt 构建

`video_prompt.build_video_prompt()` 融合：

1. L1 SKILL 块  
2. L2 各出场角色 `visual_dna.prompt_block_en`  
3. 镜头 description / dialogue / 运镜  
4. 连贯性句（上一镜 outcome）

---

## 4. 内容审核重试

| 现象 | 处理 |
|------|------|
| content_policy_violation | `sanitize_video_prompt` 自动重试 1 次 |
| 仍失败 | step_failed；Chat error_card |

同 V1，见 V1 spec Step3 审核表。

---

## 5. SSE / UI

| 事件 | UI |
|------|-----|
| step_progress | 面板 VideoPreview + progress_update |
| step_failed | error_card + 面板重试 |
| pipeline_completed | pipeline_complete 消息 + **clip 列表** |

### clip 交付 UI（Chat）

- 按 shot_number 排列 video 气泡或面板列表
- 每条：播放、下载、跳转 storyboard/composer（可选）

---

## 6. 边界

| 场景 | 行为 |
|------|------|
| keyframe_url 缺失 | 跳过该镜或 fail（推荐 fail 该镜） |
| 单镜超时 300s | step_failed 该镜 |
| 用户 cancel Pipeline | pause + idle；已生成 clip 保留 |
| Storyboard 手动「生成视频」 | **必须** 同 API：keyframe_url + 同一 prompt  builder |

---

## 7. 与工作台统一（R-066）

`POST /videos/generate-shot` 必须：

- 读 `storyboard_shots.keyframe_url`
- 禁止纯 t2v（除非 keyframe 为空且用户确认降级）

---

## 8. 验收

- [ ] 每镜 clip media_url 可播放
- [ ] Composer 可读 timeline_clips（不必打开）
- [ ] Chat 显示 pipeline_complete + clip 列表
- [ ] 工作台与 Pipeline 同一 i2v 路径

---

## 9. 代码锚点

`pipeline_executor` 视频步；`video_service.generate_video_with_policy_retry`  
`app/src/lib/pipeline-stream.ts` handlePipelineChatMessage
