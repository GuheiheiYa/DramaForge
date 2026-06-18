# [D-V2-P00] Pipeline V2 三路径总览

**关联需求**: R-063, R-064  
**状态**: 规格已定  
**V1 参考**: [`docs/V1/design/pipeline-full-flow-spec.md`](../../V1/design/pipeline-full-flow-spec.md)

---

## 1. 三条路径

```mermaid
flowchart TB
  subgraph auto [自动路径]
    Chat[Chat 创意] --> Plan[方案+模式]
    Plan --> S1[Step1 剧本]
    S1 --> S2[Step2 角色包]
    S2 --> S3[Step3 分镜规划]
    S3 --> S4[Step4 关键帧]
    S4 --> S5[Step5 图生视频]
    S5 --> Clips[clip 列表交付]
  end

  subgraph refine [精修路径-可选]
    Clips -.-> Script[/script]
    Clips -.-> Chars[/characters]
    Clips -.-> SB[/storyboard]
    Clips -.-> Comp[/composer]
  end

  subgraph deferred [Deferred]
    Audio[配音 TTS]
    Compose[多轨合成]
  end
```

---

## 2. 五步索引

| Index | id | 中文 | 文档 | 工作台必经 |
|-------|-----|------|------|------------|
| 0 | script | 剧本 | [step-01-script.md](step-01-script.md) | 否 |
| 1 | character_pack | 角色设定包 | [step-02-character-pack.md](step-02-character-pack.md) | 否 |
| 2 | shot_plan | 分镜规划 | [step-03-shot-plan.md](step-03-shot-plan.md) | 否 |
| 3 | keyframe | 关键帧 | [step-04-keyframe.md](step-04-keyframe.md) | 否 |
| 4 | video | 图生视频 | [step-05-video.md](step-05-video.md) | 否 |

---

## 3. 成品定义

**成品** = 多个分镜 video clip 按 `shot_number` 顺序组成的时间线逻辑序列。

| 交付形态 | 位置 | V2 DoD |
|----------|------|--------|
| clip 列表 | Chat 消息 + 右侧面板 | **是** |
| timeline_clips DB | 后端 | **是** |
| 单文件 MP4 导出 | 合成室 | **否**（Deferred） |
| 字幕/BGM | 合成室 | **否**（Deferred） |

---

## 4. 执行模式

| 模式 | V2 行为 |
|------|---------|
| auto | Step1→5 自动；失败暂停 |
| confirm | 每步后 `waiting_confirmation` |
| preview | **Step4 完成后结束**（有关键帧、无 video） |

---

## 5. 阶段 A（Chat 前置）

Chat 创作前置 **不跑 Pipeline**，见 [design/chat/](../chat/)。

| 节点 | 产出 |
|------|------|
| A1~A4 | 方案 Markdown、plan 卡 |
| A5 | project_id |
| A6 | POST /pipeline/start |

---

## 6. API 索引

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/pipeline/start` | 启动（V2 五步） |
| GET | `/api/v1/pipeline/{id}/stream` | SSE |
| POST | `/api/v1/pipeline/{id}/retry/{step}` | 重试 |
| POST | `/api/v1/pipeline/{id}/skip/{step}` | 跳过 |
| POST | `/api/v1/pipeline/{id}/pause` | 暂停 |
| POST | `/api/v1/pipeline/{id}/resume` | confirm 继续 |

横切： [cross-cutting.md](cross-cutting.md)

---

## 7. 代码锚点

| 模块 | 路径 |
|------|------|
| 编排 | `backend/app/services/pipeline_executor.py` |
| 步骤 | `backend/app/services/pipeline_service.py` |
| API | `backend/app/api/v1/pipeline.py` |
| 前端 SSE | `app/src/lib/pipeline-stream.ts` |
| 执行 Hook | `app/src/hooks/usePipelineExecution.ts` |
