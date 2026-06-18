# [D-V2-P06] Deferred — 配音与合成

**关联需求**: R-064（不阻塞 DoD）  
**状态**: V2 占位，规格预留

---

## 1. 定位

| Step | V1 | V2 |
|------|----|----|
| audio | executor 占位 skipped | **Deferred**，不在自动路径 DoD |
| compose | executor 占位 | **Deferred**，用户主动进合成室 |

自动路径在 **Step5 video** 完成后即视为 **MVP 交付**。

---

## 2. audio（未来）

- 输入：角色 DNA + 分镜 dialogue
- 火山 TTS → timeline_clips track_type=audio
- 文档预留：[`docs/V1/design/pipeline-full-flow-spec.md`](../../V1/design/pipeline-full-flow-spec.md) Step4

---

## 3. compose（未来）

- 输入：timeline_clips 视频轨 + 音频轨 + 字幕
- FFmpeg → assets 成片 URL
- 入口：[composer-studio.md](../pages/composer-studio.md)

---

## 4. 用户路径

```
Step5 完成 → clip 列表满意 → 结束
           → 要字幕/BGM/导出 → /composer（手动）
           → 要配音 → 未来 Pipeline Step6 或合成室内 TTS
```

---

## 5. pipeline_runs 映射

V2 `steps_json` 可保留 index 5/6 占位 `{ status: 'deferred' }`，避免 V1 前端硬编码崩溃。

---

## 6. 验收（V2 不测）

- audio/compose 不作为 V2 release blocker
