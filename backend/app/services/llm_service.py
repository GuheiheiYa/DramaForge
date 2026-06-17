"""LLM 服务封装 — DeepSeek / MiMo 统一调用接口（支持流式）。"""

from abc import ABC, abstractmethod
import asyncio
import logging
from typing import AsyncIterator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

CHAT_TIMEOUT = httpx.Timeout(300, connect=15)
CHAT_RETRIES = 2


class LLMProvider(ABC):
    """LLM 提供者抽象基类。"""

    @abstractmethod
    async def chat(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096, deep_think: bool = False) -> str:
        """发送对话请求，返回 AI 回复文本。"""
        ...

    @abstractmethod
    async def chat_stream(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096, deep_think: bool = False) -> AsyncIterator[dict]:
        """流式对话，yield {type: "thinking"|"content"|"done", data: "..."}。"""
        ...


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI 兼容协议 Provider（适用于 DeepSeek / MiMo / GPT 等）。"""

    def __init__(self, base_url: str, api_key: str, default_model: str = "gpt-4"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.default_model = default_model

    def _build_body(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
        deep_think: bool,
        stream: bool,
    ) -> dict:
        body: dict = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if stream:
            body["stream"] = True
        if deep_think:
            body["extra_body"] = {"enable_thinking": True}
        return body

    async def _post_chat(self, body: dict) -> httpx.Response:
        last_exc: Exception | None = None
        for attempt in range(CHAT_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=CHAT_TIMEOUT) as client:
                    resp = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json=body,
                    )
                    resp.raise_for_status()
                    return resp
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text[:500]
                logger.warning("LLM HTTP error attempt %s: %s %s", attempt + 1, exc.response.status_code, detail)
                last_exc = exc
                if exc.response.status_code in {429, 500, 502, 503, 504} and attempt < CHAT_RETRIES:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                raise RuntimeError(f"LLM HTTP {exc.response.status_code}: {detail}") from exc
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                logger.warning("LLM transport error attempt %s: %s", attempt + 1, exc)
                last_exc = exc
                if attempt < CHAT_RETRIES:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                raise RuntimeError(f"LLM 网络错误: {exc}") from exc
        raise RuntimeError(f"LLM 调用失败: {last_exc}")

    async def chat(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096, deep_think: bool = False) -> str:
        model = model or self.default_model
        body = self._build_body(messages, model, temperature, max_tokens, deep_think, stream=False)
        resp = await self._post_chat(body)
        data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        return message.get("content") or ""

    async def chat_stream(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096, deep_think: bool = False) -> AsyncIterator[dict]:
        """SSE 流式调用，解析 thinking 和 content。"""
        model = model or self.default_model
        body = self._build_body(messages, model, temperature, max_tokens, deep_think, stream=True)

        async with httpx.AsyncClient(timeout=CHAT_TIMEOUT) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            ) as resp:
                try:
                    resp.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    detail = exc.response.text[:500]
                    raise RuntimeError(f"LLM HTTP {exc.response.status_code}: {detail}") from exc
                thinking_buf = ""
                content_buf = ""

                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:].strip()
                    if payload == "[DONE]":
                        yield {"type": "done", "data": ""}
                        break

                    import json
                    try:
                        chunk = json.loads(payload)
                    except json.JSONDecodeError:
                        continue

                    choices = chunk.get("choices")
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}

                    # Thinking content (MiMo / DeepSeek R1 style)
                    reasoning = delta.get("reasoning_content") or delta.get("thinking") or ""
                    if reasoning:
                        thinking_buf += reasoning
                        yield {"type": "thinking", "data": reasoning}

                    # Normal content
                    text = delta.get("content") or ""
                    if text:
                        content_buf += text
                        yield {"type": "content", "data": text}


# Provider 注册表
_providers: dict[str, LLMProvider] = {
    "mimo": OpenAICompatibleProvider(
        base_url=settings.MIMO_BASE_URL,
        api_key=settings.APP_MIMO_API_KEY,
        default_model="mimo-v2-pro",
    ),
    "deepseek": OpenAICompatibleProvider(
        base_url=settings.DEEPSEEK_BASE_URL,
        api_key=settings.DEEPSEEK_API_KEY,
        default_model="deepseek-chat",
    ),
}


def get_provider(name: str) -> tuple[LLMProvider, str]:
    """获取 LLM Provider 实例及默认模型名。
    返回 (provider, default_model)。"""
    if name in _providers:
        return _providers[name], _providers[name].default_model
    # 前端可能直接传模型名（如 mimo-v2-pro），尝试匹配
    for prov in _providers.values():
        if name == prov.default_model:
            return prov, name
    raise ValueError(f"未知的 LLM Provider: {name}")


def resolve_provider(name: str) -> tuple[LLMProvider, str]:
    """解析 Provider；若指定 provider 无 API Key，则回退到 MiMo。"""
    try:
        provider, default_model = get_provider(name)
    except ValueError:
        provider, default_model = get_provider("mimo")

    if provider.api_key:
        return provider, default_model

    if name != "mimo":
        fallback, fallback_model = get_provider("mimo")
        if fallback.api_key:
            logger.warning("Provider %s 未配置 API Key，回退到 mimo", name)
            return fallback, fallback_model

    return provider, default_model


async def generate_script(
    creative_input: str,
    skill_config: dict,
    provider_name: str = "mimo",
    max_tokens: int = 32768,
) -> str:
    """生成剧本。"""
    provider, default_model = resolve_provider(provider_name)
    style_prompt = skill_config.get("prompt") or skill_config.get("prompt_template", "请根据以下创意生成剧本")
    system_prompt = f"""你是一个专业的漫剧/短剧编剧。风格要求：{style_prompt}
请严格按照以下 JSON 格式回复，不要添加其他内容：
{{
  "title": "剧本标题",
  "episodes": [
    {{
      "number": 1,
      "title": "第1集标题",
      "scenes": [
        {{
          "title": "场景标题",
          "summary": "场景概要描述",
          "location": "场景地点",
          "time_tag": "日间/夜间/黄昏等"
        }}
      ]
    }}
  ]
}}"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请根据以下创意生成完整的剧本：\n\n{creative_input}"},
    ]
    return await provider.chat(
        messages,
        model=default_model,
        max_tokens=max_tokens,
        deep_think=False,
    )
