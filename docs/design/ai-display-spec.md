# AI 回复展示规范

## 消息类型

| type | 触发 | 展示 |
|------|------|------|
| text | 普通/流式回复 | Markdown 气泡 + 思考折叠面板 |
| plan_card | 创作请求结束 | 三模式选择卡片（Pipeline 运行后 disabled） |
| progress_update | SSE step_progress | 灰色内联状态文字，同步骤替换 |
| step_complete | SSE step_completed | 绿色勾卡片 + confirm 模式「确认继续」 |
| error_card | SSE step_failed | 红框 + 重试/跳过 |
| pipeline_complete | SSE pipeline_completed | 完成大卡 + 跳转按钮 |
| image / video | 单条生成 | 媒体预览 + Loader |

## TypingIndicator

| pipelineStage | 文案 |
|---------------|------|
| analyzing | 正在分析创意，生成项目结构… |
| replying | AI 正在回复… |

## PipelinePanel

| status | 行为 |
|--------|------|
| idle | 隐藏 |
| running | 50/50 分屏，当前步高亮 |
| paused | 显示确认/错误态 |
| completed | 保持打开，ComposePreview |
