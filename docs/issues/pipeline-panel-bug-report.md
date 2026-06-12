# Bug 排查报告：Pipeline 面板不显示 + Markdown 不渲染

**排查时间**: 2026-06-03 01:35:00
**排查人**: Claude Code
**影响范围**: Chat 页面核心功能

---

## 问题描述

用户反馈：AI 回复后，右侧 Pipeline 面板没有出现，Markdown 文字没有转换为富文本。

---

## 根因定位

### 🔴 Bug A：前端-后端 API 契约不匹配（根本原因）

**文件**: `app/src/store/useChatStore.ts` 第 345-352 行 vs `backend/app/api/v1/pipeline.py` 第 24-29 行

**前端发送**:
```ts
fetch(`${API_BASE}/pipeline/chat/stream`, {
  method: 'POST',
  body: JSON.stringify({
    message: userContent,     // ← 单个字符串
    model: backendModel,
    stream: true,
    deep_think: state.deepThink,
  }),
})
```

**后端期望**:
```python
class ChatRequest(BaseModel):
    messages: list[ChatMessage]  # ← ChatMessage 数组 [{role, content}]
    model: str
    deep_think: bool
    stream: bool
```

**后果**: FastAPI 返回 **422 Unprocessable Entity**，前端 fetch 不抛异常（HTTP 错误不 throw），进入 SSE 解析逻辑，但 response body 不是合法 SSE 格式，`reader.read()` 循环可能死循环或立即结束但不触发 `finishStream`。

**连锁反应**:
- `finishStream` 永远不被调用
- `isGenerating` 永远为 `true`
- `plan_card` 永远不注入
- 用户看到的是错误消息（如果 response 不是 SSE 格式，解析后可能显示乱码或空内容）

### 🔴 Bug B：finishStream 不在所有退出路径被调用

**文件**: `app/src/store/useChatStore.ts` 第 355-375 行

```ts
// 422 错误时，response.ok = false，代码设置错误消息并 return
if (!response.ok) {
  // ... set error message ...
  return;  // ← 没有调用 finishStream！
}
// AbortError 时直接 return
if (error instanceof DOMException && error.name === 'AbortError') return;  // ← 没有调用 finishStream！
```

**后果**: `isGenerating` 卡在 `true`，用户无法发送新消息，UI 卡死。

### 🟡 Bug C：内容 div 渲染条件逻辑错误

**文件**: `app/src/pages/Chat.tsx` 第 207 行

```tsx
{(!isEmpty || !message.isStreaming) && ( ... )}
```

当 `isEmpty=true && isStreaming=true` 时：`false || false = false` → 内容 div 不渲染 → "思考中..." 永远不显示。

### 🟡 Bug D：sessionId=null 传递错误（首次使用场景）

**文件**: `app/src/store/useChatStore.ts` 第 155-156 行

```ts
let sessionId = state.currentSessionId;
if (!sessionId) {
  sessionId = state.createSession();  // ← sessionId 更新了
}
// ...
fetchStreamResponse(currentSessionId, aiMsgId);  // ← 用的是旧的 currentSessionId，不是 sessionId！
```

首次使用时 `currentSessionId = null`，但 `sessionId` 已被更新为新 ID。传给 `fetchStreamResponse` 的是 null。

---

## 数据流追踪

```
用户输入 "帮我做一个校园悬疑漫剧"
    ↓
sendMessage(content)
    ├── shouldShowPlan = true ✓（"帮我做" 匹配）
    ├── createSession() ✓
    ├── aiPlaceholder 创建 ✓
    └── fetchStreamResponse(currentSessionId, aiMsgId)
         ├── 构造 body: { message: "...", model: "mimo", stream: true, deep_think: false }
         ├── POST /api/v1/pipeline/chat/stream
         │    └── 后端期望 { messages: [...] }，收到 { message: "..." }
         │    └── FastAPI 返回 422 ❌
         ├── response.ok = false
         ├── 设置错误消息 + return（不调用 finishStream）❌
         └── isGenerating 永远为 true ❌

结果: 用户看到错误消息或空内容，plan_card 永不注入，PipelinePanel 永不展开
```

---

## 修复方案

### 修复 1：统一 API 契约（根本修复）

**方案 A（推荐）**：修改前端，构造正确的 `messages` 数组

```ts
// app/src/store/useChatStore.ts fetchStreamResponse
const messages = [
  { role: 'user', content: userContent },
];

fetch(`${API_BASE}/pipeline/chat/stream`, {
  body: JSON.stringify({
    messages,              // ← 数组
    model: backendModel,
    deep_think: state.deepThink,
    stream: true,
  }),
})
```

**方案 B**：修改后端，兼容 `message` 单字符串

```python
# backend/app/api/v1/pipeline.py
class ChatRequest(BaseModel):
    messages: list[ChatMessage] | None = None
    message: str | None = None  # 兼容前端
    model: str = "mimo"
    deep_think: bool = False
    stream: bool = False

    def get_messages(self) -> list[dict]:
        if self.messages:
            return [{"role": m.role, "content": m.content} for m in self.messages]
        if self.message:
            return [{"role": "user", "content": self.message}]
        raise ValueError("messages 或 message 至少提供一个")
```

**推荐方案 A**，因为前端应该遵循后端定义的 API 契约。

### 修复 2：确保 finishStream 总被调用

```ts
// fetchStreamResponse 中
if (!response.ok) {
  // ... set error ...
  get().finishStream(sessionId, aiMsgId);  // ← 加上
  return;
}

// catch 中
catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    get().finishStream(sessionId, aiMsgId);  // ← 加上
    return;
  }
  // ... set error ...
  get().finishStream(sessionId, aiMsgId);  // ← 加上
}
```

### 修复 3：修复内容 div 渲染条件

```tsx
// 将
{(!isEmpty || !message.isStreaming) && ( ... )}
// 改为
{true && ( ... )}
// 或直接删除外层条件
```

### 修复 4：修复 sessionId 传递

```ts
// 将
fetchStreamResponse(currentSessionId, aiMsgId);
// 改为
fetchStreamResponse(sessionId, aiMsgId);
```

---

## 验证步骤

1. 启动后端 `cd backend && python -m uvicorn app.main:app --port 7777`
2. 用 curl 测试 SSE 端点确认后端正常
3. 修复前端代码
4. 用户发送 "帮我做一个校园悬疑漫剧"
5. 验证：AI 回复正常显示（Markdown 渲染）→ plan_card 出现 → 点击模式 → PipelinePanel 展开

---

## 优先级

| # | Bug | 严重度 | 说明 |
|---|-----|--------|------|
| A | API 契约不匹配 | 🔴 P0 | 根本原因，所有功能不工作 |
| B | finishStream 不被调用 | 🔴 P0 | UI 卡死 |
| C | 内容 div 渲染条件 | 🟡 P1 | "思考中..." 不显示 |
| D | sessionId=null | 🟡 P1 | 首次使用时注入失败 |
