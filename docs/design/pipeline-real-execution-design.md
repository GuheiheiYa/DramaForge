# [D-003] Pipeline 真实执行设计方案

**创建时间**: 2026-06-16 19:45:00
**关联需求**: [R-029], [R-012]
**关联问题**: [ISS-012]

---

## 1. 问题现状

### 1.1 数据流断裂

```
AI 回复 → 正则提取(脆弱) → useChatStore.extractedScript/extractedCharacters
                                    ↓
用户选模式 → simulatePipeline() → setTimeout 模拟 6 步
                                    ↓
              PipelinePanel 渲染 ← usePipelineStore.steps[N].data
```

**断点**：
- 正则提取质量差：场景 location/timeTag 几乎全是默认值，角色描述固定为占位文本
- `simulatePipeline()` 用 setTimeout 跑 6 步，不调后端 pipeline_service
- 步骤 4-6（视频/配音/合成）全是硬编码 mock
- 三种执行模式（auto/confirm/preview）行为完全一样

### 1.2 后端已有但未接入

`pipeline_service.py` 已实现 6 步真实编排：
- `run_step_script` — 调 LLM 生成结构化 JSON 剧本
- `run_step_character` — 调 LLM 提取角色 + 调 Agnes 生成立绘
- `run_step_storyboard` — 调 LLM 生成分镜 + 调 Agnes 生成分镜图
- `run_step_video` — 调 Agnes 生成视频片段
- `run_step_audio` — TTS 配音（待实现）
- `run_step_compose` — 合成（待实现）

**但没有任何地方调用这些函数。**

---

## 2. 设计目标

| 目标 | 描述 |
|------|------|
| 真实执行 | Pipeline 6 步全部调用后端真实 API，不再 setTimeout 模拟 |
| 模式区分 | auto 全自动执行，confirm 每步暂停等确认，preview 只提取数据不生成 |
| 数据持久化 | 每步完成后数据写入数据库，刷新页面不丢失 |
| 进度可见 | SSE 实时推送每步进度到前端 PipelinePanel |
| 容错恢复 | 某步失败可重试，不影响已完成的步骤 |

---

## 3. 架构设计

### 3.1 整体流程

```
用户选模式
    ↓
前端 POST /pipeline/start { project_id, mode, creative_input }
    ↓
后端创建 Pipeline 记录 → 启动异步执行
    ↓
SSE GET /pipeline/{id}/stream → 实时推送进度
    ↓
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Step 1  │ Step 2  │ Step 3  │ Step 4  │ Step 5  │ Step 6  │
│ 剧本    │ 角色    │ 分镜    │ 视频    │ 配音    │ 合成    │
│ LLM     │ LLM+图像│ LLM+图像│ Agnes   │ (TTS)  │ (FFmpeg)│
└────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘
     ↓         ↓         ↓         ↓         ↓         ↓
  数据库     数据库     数据库    数据库    数据库    数据库
  scripts   characters storyboards timeline_clips subtitle_segments
```

### 3.2 前端改造

#### 3.2.1 移除 simulatePipeline()

替换为真实 API 调用：

```typescript
// 旧：setTimeout 模拟
setTimeout(() => { updateStepData(0, scriptData); }, 2000);

// 新：调用后端 Pipeline API
const pipeline = await startPipeline({ project_id, mode, creative_input });
// 监听 SSE 获取实时进度
listenPipelineStream(pipeline.id, (event) => {
  updateStepData(event.step, event.data);
  if (event.status === 'completed') completeStep(event.step, event.data);
});
```

#### 3.2.2 三种执行模式

| 模式 | 行为 | 前端交互 |
|------|------|---------|
| `auto` | 全自动执行 6 步，中间不暂停 | 进度条自动推进，完成后通知 |
| `confirm` | 每步完成后暂停，等用户确认再继续 | 步骤完成 → 显示预览 → 用户点「下一步」→ 继续 |
| `preview` | 只执行步骤 1-3（提取数据），不执行 4-6（生成） | 剧本/角色/分镜提取完成即停止，用户手动触发生成 |

#### 3.2.3 PipelinePanel 数据来源

从 SSE 事件实时更新，不再依赖 setTimeout：

```
SSE event: { step: 0, status: "running", progress: 30, data: null }
SSE event: { step: 0, status: "completed", progress: 100, data: { episodes: [...] } }
→ usePipelineStore.completeStep(0, event.data)
→ PipelinePanel 自动渲染 ScriptPreview
```

### 3.3 后端改造

#### 3.3.1 Pipeline 异步执行

方案：用 `asyncio.create_task` 替代 Celery（开发阶段简化）。

```python
# pipeline.py /start 端点
async def start_pipeline(req):
    pipeline_id = create_pipeline_record(req)
    asyncio.create_task(run_pipeline_async(pipeline_id, req))
    return { "pipeline_id": pipeline_id }

# 异步执行 6 步
async def run_pipeline_async(pipeline_id, req):
    for step_idx, step_fn in enumerate(STEP_FUNCTIONS):
        update_status(pipeline_id, step_idx, "running")
        try:
            result = await step_fn(pipeline_id, req)
            save_step_result(pipeline_id, step_idx, result)
            update_status(pipeline_id, step_idx, "completed")
            # 如果是 confirm 模式，等待用户确认
            if req.mode == "confirm":
                await wait_for_confirmation(pipeline_id, step_idx)
        except Exception as e:
            update_status(pipeline_id, step_idx, "failed", str(e))
            if req.mode == "auto":
                break  # auto 模式失败则停止
            # confirm/preview 模式可选择重试或跳过
```

#### 3.3.2 SSE 进度推送

用 `asyncio.Queue` 实现进程内事件广播：

```python
# 全局事件队列
_pipeline_queues: dict[str, asyncio.Queue] = {}

@router.get("/{pipeline_id}/stream")
async def stream_pipeline(pipeline_id: str):
    queue = asyncio.Queue()
    _pipeline_queues[pipeline_id] = queue

    async def event_generator():
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("status") == "completed" and event.get("step") == 5:
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

#### 3.3.3 confirm 模式等待机制

```python
# 每个步骤的确认事件
_confirmation_events: dict[str, dict[str, asyncio.Event]] = {}

async def wait_for_confirmation(pipeline_id, step_idx):
    event = asyncio.Event()
    _confirmation_events[pipeline_id][str(step_idx)] = event
    await event.wait()  # 阻塞直到前端调用 /confirm

@router.post("/{pipeline_id}/confirm/{step_idx}")
async def confirm_step(pipeline_id, step_idx):
    event = _confirmation_events[pipeline_id].get(str(step_idx))
    if event:
        event.set()
```

---

## 4. 数据提取改进

### 4.1 问题

当前正则提取 `extractScriptFromReply` / `extractCharactersFromReply` 质量差：
- 依赖 AI 回复的特定 Markdown 格式
- 场景 location/timeTag 几乎全是默认值
- 角色只有名字和角色类型，没有描述/性格/外貌

### 4.2 方案：让 AI 直接输出结构化 JSON

修改 System Prompt，要求 AI 以 JSON 格式输出：

```json
{
  "title": "樱花下的约定",
  "episodes": [
    {
      "number": 1,
      "title": "转学生",
      "scenes": [
        {
          "title": "校门口初遇",
          "location": "日本某高中校门口",
          "time_tag": "清晨",
          "summary": "女主角第一天转学到新学校..."
        }
      ]
    }
  ],
  "characters": [
    {
      "name": "樱井美咲",
      "role": "主角",
      "gender": "女",
      "age": 17,
      "description": "能看到别人记忆的转学生",
      "personality": "温柔但内心坚强",
      "personality_traits": ["温柔", "坚强", "好奇"],
      "appearance": "长发及腰，深棕色瞳孔，身材娇小",
      "costume": "白色校服衬衫，深蓝色百褶裙"
    }
  ]
}
```

### 4.3 两层提取策略

```
AI 回复
    ↓
优先：尝试 JSON.parse() 解析结构化数据
    ↓ 失败
回退：正则提取（现有逻辑）
    ↓ 失败
回退：生成最小默认数据
```

---

## 5. 改动清单

### 后端

| 文件 | 改动 | 说明 |
|------|------|------|
| `pipeline.py` | 重写 `/start` | 异步执行 6 步，SSE 推送进度 |
| `pipeline.py` | 新增 `/{id}/confirm/{step}` | confirm 模式步骤确认 |
| `pipeline.py` | 新增 `/{id}/retry/{step}` | 失败步骤重试 |
| `pipeline.py` | 新增 `/{id}/skip/{step}` | 跳过失败步骤 |
| `pipeline_service.py` | 接入 image_service/video_service | 步骤 2-4 生成真实图片/视频 |
| `pipeline_service.py` | 步骤 1 LLM Prompt 改为输出 JSON | 结构化输出 |

### 前端

| 文件 | 改动 | 说明 |
|------|------|------|
| `useChatStore.ts` | finishStream 改进 | AI 回复优先 JSON 解析 |
| `pipeline-data-extractor.ts` | 新增 JSON 提取 | 优先 JSON.parse，回退正则 |
| `usePipelineStore.ts` | SSE 事件处理 | 新增 onPipelineEvent 方法 |
| `Chat.tsx` | 移除 simulatePipeline | 替换为真实 API 调用 |
| `Chat.tsx` | PipelinePanel 改造 | confirm 模式显示确认按钮 |

---

## 6. 验证方式

1. Chat 输入「帮我做一个日式校园悬疑漫剧」→ AI 回复 → 自动提取结构化数据
2. 选择模式 → Pipeline 面板显示真实步骤进度
3. auto 模式：6 步自动执行，视频/配音步骤调用真实 API
4. confirm 模式：每步完成后暂停，显示预览，用户确认后继续
5. preview 模式：只提取剧本/角色/分镜，不生成视频
6. 刷新页面 → 数据库中的数据不丢失
