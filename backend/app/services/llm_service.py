"""LLM 服务封装 — DeepSeek / Claude / GPT 统一调用接口。"""

from abc import ABC, abstractmethod

import httpx

from app.config import settings


class LLMProvider(ABC):
    """LLM 提供者抽象基类。"""

    @abstractmethod
    async def chat(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096) -> str:
        """发送对话请求，返回 AI 回复文本。"""
        ...


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI 兼容协议 Provider（适用于 DeepSeek / MiMo / GPT 等）。"""

    def __init__(self, base_url: str, api_key: str, default_model: str = "gpt-4"):
        self.base_url = base_url
        self.api_key = api_key
        self.default_model = default_model

    async def chat(self, messages: list[dict], model: str = "", temperature: float = 0.7, max_tokens: int = 4096) -> str:
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


def get_provider(name: str) -> LLMProvider:
    """获取 LLM Provider 实例。"""
    if name not in _providers:
        raise ValueError(f"未知的 LLM Provider: {name}")
    return _providers[name]


async def generate_script(creative_input: str, skill_config: dict, provider_name: str = "mimo") -> str:
    """生成剧本。"""
    provider = get_provider(provider_name)
    prompt = skill_config.get("prompt_template", "请根据以下创意生成剧本")
    messages = [
        {"role": "system", "content": f"你是一个专业的漫剧/短剧编剧。风格要求：{prompt}"},
        {"role": "user", "content": f"请根据以下创意生成完整的剧本：\n\n{creative_input}\n\n请包含：分集大纲、场景描述、角色对白、镜头提示。"},
    ]
    return await provider.chat(messages)
