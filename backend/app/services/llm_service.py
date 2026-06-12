"""LLM 服务封装 — DeepSeek / MiMo 统一调用接口（支持流式）。"""

from abc import ABC, abstractmethod
from typing import AsyncIterator

import httpx

from app.config import settings


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
        self.base_url = base_url
        self.api_key = api_key
        self.default_model = default_model

    async def chat(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096, deep_think: bool = False) -> str:
        model = model or self.default_model
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def chat_stream(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096, deep_think: bool = False) -> AsyncIterator[dict]:
        """SSE 流式调用，解析 thinking 和 content。"""
        model = model or self.default_model
        body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if deep_think:
            body["extra_body"] = {"enable_thinking": True}

        async with httpx.AsyncClient(timeout=httpx.Timeout(300, connect=10)) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            ) as resp:
                resp.raise_for_status()
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

                    delta = chunk.get("choices", [{}])[0].get("delta", {})

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
        api_key=settings.MIMO_API_KEY,
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


async def generate_script(creative_input: str, skill_config: dict, provider_name: str = "mimo") -> str:
    """生成剧本。"""
    provider, default_model = get_provider(provider_name)
    prompt = skill_config.get("prompt_template", "请根据以下创意生成剧本")
    messages = [
        {"role": "system", "content": f"你是一个专业的漫剧/短剧编剧。风格要求：{prompt}"},
        {"role": "user", "content": f"请根据以下创意生成完整的剧本：\n\n{creative_input}\n\n请包含：分集大纲、场景描述、角色对白、镜头提示。"},
    ]
    return await provider.chat(messages, model=default_model)
