# [D-V2-PG05] 成片合成室

**关联需求**: R-074, R-064  
**路由**: `/composer?projectId=`  
**代码**: `app/src/pages/ComposerStudio.tsx`

---

## 1. 页面职责

多轨时间线、字幕、播放、导出；**clip 精修与 MP4 导出**。

---

## 2. 在 V2 路径中的位置

| 路径 | 角色 |
|------|------|
| 自动路径 | **非必经**；Step5 clip 列表即交付 |
| 精修路径 | 用户要字幕/BGM/导出时 **主动进入** |
| Deferred | FFmpeg 合成 Step 占位 |

---

## 3. 必做 vs 可选

**不在 V2 自动路径 DoD 内。**

---

## 4. 数据读写

| 来源 | 说明 |
|------|------|
| GET timeline_clips | Step5 media_url |
| usePipelineStore | 运行时预览 |
| mockData | 无项目时演示 |

---

## 5. 与 Pipeline 同步

| 规则 | 说明 |
|------|------|
| Step5 完成 | clips 自动进时间轴 |
| Pipeline 跳过 audio | 音频轨空或 mock；不阻塞 |
| 用户手动导入 | handleImportMedia 保留 |
| 导出 MP4 | V2 规格定义入口；实现 Deferred |

---

## 6. 边界

| 场景 | 行为 |
|------|------|
| 无 clips | 空时间线 + 引导「先 Chat 制作」 |
| 无 projectId | mock 或选项目 |
| 从 Chat 跳转 | `?projectId=` + hash 路由 |

---

## 7. 验收

- [ ] Step5 后 composer 可见 video 轨
- [ ] 不打开 composer 仍算 V2 完成

---

## 8. Chat 入口

pipeline_complete 卡可选「打开合成室精修」。
