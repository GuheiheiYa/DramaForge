# DramaForge 全流程改造设计文档（摘要）

**版本**: 2.0  
**日期**: 2026-06-17  
**状态**: 已实现（详见 D-004）

> **完整规格**请参阅 **[D-004 全流程规格书](pipeline-full-flow-spec.md)**。本文档仅保留改造动机与索引，避免与代码脱节。

## 概述

本次改造解决「后端 Pipeline 编排未接入」与「前端各页面数据流断裂」两大根因，以后端 `POST /pipeline/start` + SSE 为编排中枢，打通 6 步创作链。

**Chat 前置流程（Phase 3）**：单次流式 Markdown 创作方案 → `PlanConfirmCard` 确认 → 选模式 → 启动 Pipeline（**不再**使用隐藏 JSON 双次 LLM 或 `_seed_*` 短路）。

## 架构

```
用户创意 → 流式创作方案 → 确认 → 选模式 → 绑定项目
    → POST /pipeline/start
    → asyncio pipeline_executor（真实 LLM/生图/生视频）
    → GET /pipeline/{id}/stream (SSE)
    → 各步写入 DB → 工作台页面读取
```

## 六步节点（现状）

| 步骤 | 后端 | 持久化 | 状态 |
|------|------|--------|------|
| 0 剧本 | `run_step_script` | scripts/scenes/blocks | 已实现 |
| 1 角色 | `run_step_character` | characters | 已实现 |
| 2 分镜 | `run_step_storyboard` | storyboard_shots | 已实现 |
| 3 视频 | executor 内联 video_service | generation_tasks, timeline_clips | 已实现 |
| 4 配音 | skipped 占位 | — | TTS 开发中 |
| 5 合成 | 聚合占位 | pipeline_runs.status | FFmpeg 开发中 |

## 三种模式

- **auto**: 连续执行，失败暂停，可重试/跳过
- **confirm**: 每步 SSE `waiting_confirmation`，`POST /resume` 继续
- **preview**: 仅执行步骤 0–2

## 关键文件

| 层级 | 路径 |
|------|------|
| 后端编排 | `backend/app/services/pipeline_executor.py` |
| 步骤实现 | `backend/app/services/pipeline_service.py` |
| API | `backend/app/api/v1/pipeline.py` |
| SSE 全局 | `app/src/lib/pipeline-stream.ts`、`app/src/components/PipelineLifecycle.tsx` |
| 启动/重试 | `app/src/hooks/usePipelineExecution.ts` |
| 状态 | `app/src/store/usePipelineStore.ts`、`useChatStore.ts` |
| 可见性 | `app/src/lib/pipeline-storage.ts` |

## 数据表

- **pipeline_runs** — Pipeline 执行持久化与 steps_json
- **generation_tasks** — 视频步任务记录
- **timeline_clips.media_url** — Step 3 写入，Composer 读取
- 详见 [data-model.md](../data-model.md) 与 [D-004](pipeline-full-flow-spec.md)
