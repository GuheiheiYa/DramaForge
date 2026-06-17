"""Pipeline 编排服务 — 串联 6 个步骤的完整创作流程。

步骤:
1. 剧本生成 — 调用 LLM 生成结构化剧本
2. 角色生成 — 从剧本提取角色 + 调用图像生成 API 生成立绘
3. 分镜生成 — LLM 生成分镜描述 + 图像生成 API 生成分镜图
4. 视频生成 — 调用 Agnes 视频生成 API
5. 配音生成 — TTS 配音 + BGM（预留接口）
6. 合成成片 — FFmpeg 合成（预留接口）
"""

import json
import logging
import re
from typing import Any

from app.services import llm_service, image_service, video_service
from app.utils.character_fields import normalize_age
from app.utils.video_prompt import build_video_prompt

logger = logging.getLogger(__name__)


def _parse_json_from_text(text: str) -> Any:
    """从 AI 回复文本中提取 JSON 结构。"""
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试提取 ```json ... ``` 代码块
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 尝试提取 { ... } 或 [ ... ]
    for pattern in [r"\{[\s\S]*\}", r"\[[\s\S]*\]"]:
        m = re.search(pattern, text)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass

    return None


async def run_step_script(pipeline_id: str, creative_input: str, skill_config: dict) -> dict:
    """步骤 1: 生成剧本。

    调用 LLM 生成结构化剧本，包含分集大纲、场景描述。
    """
    provider_name = skill_config.get("provider", "mimo")
    style_prompt = skill_config.get("prompt", "")

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

    try:
        logger.info("[Pipeline] %s 调用 LLM 生成剧本…", pipeline_id)
        result_text = await llm_service.generate_script(
            creative_input, skill_config, provider_name, max_tokens=32768
        )
        parsed = _parse_json_from_text(result_text)

        if parsed and isinstance(parsed, dict) and "episodes" in parsed:
            # 确保每个 episode 和 scene 有 id
            for i, ep in enumerate(parsed["episodes"]):
                ep.setdefault("id", f"ep_{i + 1}")
                ep.setdefault("number", i + 1)
                for j, sc in enumerate(ep.get("scenes", [])):
                    sc.setdefault("id", f"s_{i + 1}_{j + 1}")
            return parsed

        # JSON 解析失败，用文本构建基础结构
        logger.warning("[Pipeline] 剧本 JSON 解析失败，使用文本回退")
        return _build_script_from_text(result_text, creative_input)

    except Exception as e:
        logger.error("[Pipeline] 剧本生成失败: %s", e)
        # 回退：用创意输入构建基础剧本
        return _build_script_from_text(creative_input, creative_input)


def _build_script_from_text(text: str, title_hint: str) -> dict:
    """从纯文本构建基础剧本结构。"""
    # 尝试按段落分割场景
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    scenes = []
    for i, p in enumerate(paragraphs[:10]):  # 最多 10 个场景
        title = p[:20] if len(p) > 20 else p
        scenes.append({
            "id": f"s_1_{i + 1}",
            "title": title,
            "summary": p[:200],
            "location": "待定",
            "time_tag": "日间",
        })

    if not scenes:
        scenes = [{"id": "s_1_1", "title": "开场", "summary": text[:200], "location": "待定", "time_tag": "日间"}]

    return {
        "title": title_hint[:30] if title_hint else "未命名剧本",
        "episodes": [{"id": "ep_1", "number": 1, "title": "第一集", "scenes": scenes}],
    }


async def run_step_character(pipeline_id: str, script_data: dict, skill_config: dict) -> dict:
    """步骤 2: 生成角色。

    从剧本中提取角色信息，然后调用 LLM 生成详细角色描述，
    最后调用图像生成 API 为每个角色生成立绘。
    """
    provider_name = skill_config.get("provider", "mimo")
    style_prompt = skill_config.get("prompt", "")

    # 用 LLM 从剧本中提取角色
    episodes_text = ""
    for ep in script_data.get("episodes", []):
        for sc in ep.get("scenes", []):
            episodes_text += f"- {sc.get('title', '')}: {sc.get('summary', '')}\n"

    system_prompt = f"""你是一个专业的角色设计师。风格要求：{style_prompt}
请从以下剧本中提取所有角色，并生成详细的角色设定。
所有角色必须属于同一部作品的统一视觉风格（画风、时代感、渲染方式一致），仅外貌与服装不同。
appearance 和 costume 字段必须用英文撰写，便于 AI 图像生成。
请严格按照以下 JSON 格式回复，不要添加其他内容：
[
  {{
    "name": "角色名",
    "role": "主角/配角/龙套",
    "gender": "男/女",
    "age": 18,
    "description": "简短描述",
    "personality": "性格描述",
    "personality_traits": ["特征1", "特征2"],
    "appearance": "英文外貌描述，用于AI图像生成",
    "costume": "英文服装描述，用于AI图像生成",
    "background": "背景故事"
  }}
]"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"剧本内容：\n{episodes_text[:3000]}"},
    ]

    characters = []
    try:
        provider, default_model = llm_service.resolve_provider(provider_name)
        result_text = await provider.chat(
            messages, model=default_model, max_tokens=16384, deep_think=False
        )
        parsed = _parse_json_from_text(result_text)

        if parsed and isinstance(parsed, list):
            for i, char_data in enumerate(parsed):
                char_data.setdefault("name", f"角色{i + 1}")
                char_data.setdefault("role", "配角")
                char_data.setdefault("gender", "未知")
                char_data.setdefault("age", 20)
                char_data["age"] = normalize_age(char_data.get("age", 20))
                char_data.setdefault("description", "")
                char_data.setdefault("personality", "")
                char_data.setdefault("personality_traits", [])
                char_data.setdefault("appearance", "")
                char_data.setdefault("costume", "")
                char_data.setdefault("background", "")
                characters.append(char_data)
    except Exception as e:
        logger.error("[Pipeline] 角色提取失败: %s", e)

    # 如果 LLM 提取失败，从剧本文本中简单提取
    if not characters:
        characters = _extract_characters_from_text(episodes_text)

    for i, char in enumerate(characters):
        char["id"] = f"c_{i + 1}"
        char["status"] = "done"
        char["avatarColor"] = ["#A8835F", "#5A7FA8", "#5B8C5A", "#7A6B8A", "#C49A3C"][i % 5]

    # 为每个角色生成立绘（统一 SKILL 画风 + 首张图作为风格锚点）
    characters = await image_service.generate_character_portraits(characters, style_prompt)

    return {"characters": characters}


def _extract_characters_from_text(text: str) -> list[dict]:
    """从文本中简单提取角色名（回退方案）。"""
    # 尝试匹配常见中文角色名格式
    names = set()
    patterns = [
        r"「([^」]{2,6})」",  # 「角色名」
        r"《([^》]{2,6})》",  # 可能是书名但也许是角色
    ]
    for pattern in patterns:
        for m in re.finditer(pattern, text):
            name = m.group(1)
            if len(name) >= 2 and not any(kw in name for kw in ["场景", "镜头", "画面", "音乐"]):
                names.add(name)

    if not names:
        names = {"主角"}

    return [
        {
            "name": name,
            "role": "主角" if i == 0 else "配角",
            "gender": "未知",
            "age": 20,
            "description": f"（从剧本中提取的角色）",
            "personality": "",
            "personality_traits": [],
            "appearance": "",
            "costume": "",
            "background": "",
        }
        for i, name in enumerate(list(names)[:8])
    ]


async def run_step_storyboard(pipeline_id: str, script_data: dict, character_data: dict, skill_config: dict) -> dict:
    """步骤 3: 生成分镜。

    调用 LLM 根据剧本和角色生成分镜描述，
    然后调用图像生成 API 为每个分镜生成分镜图。
    """
    provider_name = skill_config.get("provider", "mimo")
    style_prompt = skill_config.get("prompt", "")

    # 构建剧本和角色概要
    episodes_text = ""
    for ep in script_data.get("episodes", []):
        episodes_text += f"第{ep.get('number', 1)}集：{ep.get('title', '')}\n"
        for sc in ep.get("scenes", []):
            episodes_text += f"  - {sc.get('title', '')}: {sc.get('summary', '')}\n"

    char_names = [c.get("name", "") for c in character_data.get("characters", [])]
    char_text = "、".join(char_names) if char_names else "未知角色"

    system_prompt = f"""你是一个专业的分镜师。风格要求：{style_prompt}
请根据剧本和角色信息生成分镜列表。
请严格按照以下 JSON 格式回复，不要添加其他内容：
[
  {{
    "shot_number": 1,
    "episode_number": 1,
    "scene_title": "对应场景标题",
    "description": "英文镜头描述，用于AI图像生成",
    "shot_type": "全景/中景/近景/特写",
    "duration": 5,
    "camera_movement": "固定/推/拉/摇/移",
    "composition": "中心构图/三分法/对称构图",
    "lighting": "自然光/逆光/侧光",
    "character_action": "角色动作描述",
    "dialogue": "台词（如有）",
    "characters": ["出场角色名"]
  }}
]"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"角色：{char_text}\n\n剧本：\n{episodes_text[:3000]}"},
    ]

    shots = []
    try:
        provider, default_model = llm_service.resolve_provider(provider_name)
        result_text = await provider.chat(
            messages, model=default_model, max_tokens=16384, deep_think=False
        )
        parsed = _parse_json_from_text(result_text)

        if parsed and isinstance(parsed, list):
            for i, shot_data in enumerate(parsed):
                shot_data.setdefault("shot_number", i + 1)
                shot_data.setdefault("episode_number", 1)
                shot_data.setdefault("scene_title", "")
                shot_data.setdefault("description", "")
                shot_data.setdefault("shot_type", "中景")
                shot_data.setdefault("duration", 5)
                shot_data.setdefault("camera_movement", "固定")
                shot_data.setdefault("composition", "中心构图")
                shot_data.setdefault("lighting", "自然光")
                shot_data.setdefault("character_action", "")
                shot_data.setdefault("dialogue", "")
                shot_data.setdefault("characters", [])
                shots.append(shot_data)
    except Exception as e:
        logger.error("[Pipeline] 分镜生成失败: %s", e)

    # 回退：从剧本场景自动生成分镜
    if not shots:
        shots = _generate_shots_from_script(script_data)

    # 为每个分镜设置 id 和状态
    for i, shot in enumerate(shots):
        shot["id"] = f"shot_{i + 1}"
        shot["status"] = "done"

    # 尝试为前几个分镜生成分镜图
    for shot in shots[:6]:  # 限制数量避免 API 过载
        try:
            prompt = shot.get("description", "")
            if not prompt:
                prompt = f"{shot.get('shot_type', '中景')} shot, {shot.get('scene_title', '')}, {shot.get('character_action', '')}, anime style"
            image_url = await image_service.generate_image(prompt, size="1152x768")
            shot["imageUrl"] = image_url
            logger.info("[Pipeline] 分镜 #%s 图片生成成功", shot.get("shot_number"))
        except Exception as e:
            logger.warning("[Pipeline] 分镜 #%s 图片生成失败: %s", shot.get("shot_number"), e)
            shot["imageUrl"] = ""

    return {"shots": shots}


def _generate_shots_from_script(script_data: dict) -> list[dict]:
    """从剧本场景自动生成分镜（回退方案）。"""
    shots = []
    shot_num = 1
    shot_types = ["全景", "中景", "近景", "特写"]

    for ep in script_data.get("episodes", []):
        for sc in ep.get("scenes", []):
            shots.append({
                "shot_number": shot_num,
                "episode_number": ep.get("number", 1),
                "scene_title": sc.get("title", ""),
                "description": f"{sc.get('summary', '')}, anime style illustration",
                "shot_type": shot_types[(shot_num - 1) % 4],
                "duration": 3 + (shot_num % 3),
                "camera_movement": "固定",
                "composition": "中心构图",
                "lighting": "自然光",
                "character_action": "",
                "dialogue": "",
                "characters": [],
            })
            shot_num += 1

    if not shots:
        shots = [{
            "shot_number": 1,
            "episode_number": 1,
            "scene_title": "开场",
            "description": "opening scene, anime style",
            "shot_type": "全景",
            "duration": 5,
            "camera_movement": "固定",
            "composition": "中心构图",
            "lighting": "自然光",
            "character_action": "",
            "dialogue": "",
            "characters": [],
        }]

    return shots


async def run_step_video(
    pipeline_id: str,
    storyboard_data: dict,
    skill_config: dict,
    character_data: dict | None = None,
    script_data: dict | None = None,
) -> dict:
    """步骤 4: 生成视频。

    调用 Agnes 视频生成 API，为每个分镜生成视频片段。
    每个镜头的 prompt 会融合 SKILL 风格、剧本、角色外貌与上一镜头连贯性。
    """
    shots = storyboard_data.get("shots", [])
    clips = []
    overall_progress = 0
    total = len(shots) if shots else 1

    for i, shot in enumerate(shots):
        clip_id = f"vid_{shot.get('id', f'shot_{i + 1}')}"
        clip = {
            "id": clip_id,
            "shotId": shot.get("id", f"shot_{i + 1}"),
            "name": f"镜头 {shot.get('shot_number', i + 1)} — {shot.get('scene_title', '')}",
            "duration": shot.get("duration", 5),
            "progress": 0,
            "status": "waiting",
            "videoUrl": None,
        }

        # 尝试调用视频生成 API
        try:
            prompt = build_video_prompt(
                shot,
                skill_config,
                character_data=character_data,
                script_data=script_data,
                shot_index=i,
                prev_shot=shots[i - 1] if i > 0 else None,
            )
            image_url = shot.get("imageUrl") or None
            result = await video_service.generate_video_with_policy_retry(
                prompt=prompt,
                image_url=image_url,
                width=1152,
                height=768,
                num_frames=121,
                frame_rate=24,
            )
            clip["videoUrl"] = result.get("video_url", "")
            clip["status"] = "done"
            clip["progress"] = 100
            logger.info("[Pipeline] 视频 %s 生成成功", clip["name"])
        except Exception as e:
            logger.warning("[Pipeline] 视频 %s 生成失败: %s", clip["name"], e)
            clip["status"] = "failed"
            clip["progress"] = 0

        clips.append(clip)
        overall_progress = int(((i + 1) / total) * 100)

    return {"clips": clips, "overallProgress": overall_progress}


async def run_step_audio(pipeline_id: str, script_data: dict, skill_config: dict) -> dict:
    """步骤 5: 生成配音和 BGM。

    TTS 配音和 BGM 生成目前为预留接口，返回基础结构。
    当 VOLC_TTS_APP_ID 配置后可接入火山引擎 TTS。
    """
    from app.config import settings

    voices = []
    bgm = {"style": "轻柔钢琴", "duration": 120, "status": "waiting"}

    # 如果配置了 TTS，尝试调用
    if settings.VOLC_TTS_APP_ID and settings.VOLC_TTS_ACCESS_TOKEN:
        # TODO: 接入火山引擎 TTS API
        logger.info("[Pipeline] TTS 已配置但尚未实现，跳过配音生成")
    else:
        logger.info("[Pipeline] TTS 未配置，跳过配音生成")

    # 为剧本中的角色生成默认配音信息
    episodes = script_data.get("episodes", [])
    for ep in episodes:
        for sc in ep.get("scenes", []):
            # 简单提取：如果场景概要中提到了角色名
            pass

    # 返回基础结构
    if not voices:
        voices = [{"characterId": "c_1", "characterName": "旁白", "voiceName": "默认旁白音", "status": "waiting"}]

    return {"voices": voices, "bgm": bgm}


async def run_step_compose(pipeline_id: str, video_data: dict, audio_data: dict, skill_config: dict) -> dict:
    """步骤 6: 合成成片。

    FFmpeg 合成目前为预留接口。
    当安装 FFmpeg 后可实现视频+音频+字幕的合成。
    """
    # 计算总时长
    clips = video_data.get("clips", [])
    total_duration = sum(c.get("duration", 0) for c in clips)

    # 检查是否有成功的视频片段
    has_video = any(c.get("status") == "done" and c.get("videoUrl") for c in clips)

    if has_video:
        # 有视频，标记为部分完成（音频可能缺失）
        return {
            "videoUrl": clips[0].get("videoUrl") if clips else None,
            "duration": total_duration,
            "resolution": "1920x1080",
            "status": "done",
        }

    # 没有视频，标记为等待
    return {
        "videoUrl": None,
        "duration": total_duration,
        "resolution": "1920x1080",
        "status": "waiting",
    }
