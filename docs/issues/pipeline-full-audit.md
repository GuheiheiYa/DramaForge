# Pipeline 全流程排查报告

**排查时间**: 2026-06-12 15:30:00
**排查人**: Claude Code
**影响范围**: Chat 页面 → Pipeline 面板完整流程

---

## 排查结论

### ✅ 已修复的问题（来自 pipeline-panel-bug-report.md）

| Bug | 描述 | 状态 |
|-----|------|------|
| A | API 契约不匹配（message vs messages） | ✅ 已修复 — 前端已发送 messages 数组 |
| B | finishStream 不在所有退出路径被调用 | ✅ 已修复 — setError 和 cancelGeneration 都有 plan_card 注入 |
| C | 内容 div 渲染条件逻辑错误 | ✅ 已修复 — 条件渲染正确 |
| D | sessionId=null 传递错误 | ✅ 已修复 — fetchStreamResponse 参数正确 |

### 🔴 仍存在的核心问题

#### 问题 1：`simulatePipeline` 使用硬编码 mock 数据
**严重度**: P0 — 数据不一致

**文件**: `app/src/pages/Chat.tsx` 第 748-781 行

**问题描述**: `simulatePipeline` 函数中的剧本和角色数据完全是硬编码的：
- 剧本数据：硬编码了"转学第一天"、"神秘失踪"等场景
- 角色数据：硬编码了"林小雨"、"陈明"、"王雪"等角色
- 与 AI 回复的内容完全无关

**后果**: 用户看到 AI 生成了一个剧本，但 Pipeline 面板显示的是完全不同的内容。

#### 问题 2：`handleModeSelect` 使用硬编码标题
**严重度**: P1

**文件**: `app/src/pages/Chat.tsx` 第 741 行

```ts
const title = '记忆碎片'; // Mock title — 完全硬编码
```

应该从 AI 回复或用户输入中提取。

#### 问题 3：Chat.tsx 组件过大（866 行）
**严重度**: P2 — 代码质量

Chat.tsx 包含 12+ 个组件和函数，应拆分。

---

## 数据流追踪（修复后）

```
用户输入 "帮我做一个校园悬疑漫剧"
    ↓
sendMessage(content)
    ├── isCreationReq = true ✓（"帮我做" 匹配）
    ├── createSession() ✓
    ├── aiPlaceholder 创建 ✓
    └── fetchStreamResponse(sessionId, aiMsgId, messages, 'mimo', false, signal, true, '帮我做一个校园悬疑漫')
         ├── POST /api/v1/pipeline/chat/stream
         │    body: { messages: [{role:'system',...}, {role:'user',...}], model:'mimo', stream:true }
         │    └── 后端 get_provider("mimo") → (provider, "mimo-v2-pro") ✓
         │    └── SSE 返回 thinking + content ✓
         ├── addChunk('thinking', ...) → 更新 thinking ✓
         ├── addChunk('content', ...) → 更新 content ✓
         ├── finishStream()
         │    ├── isStreaming = false ✓
         │    └── plan_card 注入（延迟 100ms）✓
         └── 用户看到 AI 回复 + plan_card ✓

用户点击 "全自动" 模式
    ↓
handleModeSelect('auto')
    ├── startPipeline(title, 'auto') ✓
    ├── toastSuccess ✓
    └── simulatePipeline() ← 🔴 需要修复：使用硬编码数据

Pipeline 面板展开
    ├── StepBar 显示 6 个步骤 ✓
    ├── Step 1: 剧本 ← 🔴 硬编码数据
    ├── Step 2: 角色 ← 🔴 硬编码数据
    └── ...
```

---

## 修复计划

1. 创建 `pipeline-data-extractor.ts` — 从 AI 回复中提取结构化数据
2. 修改 `simulatePipeline` — 使用提取的数据而非硬编码
3. 提取硬编码常量到独立文件
4. 拆分 Chat.tsx 组件
5. 端到端测试验证
