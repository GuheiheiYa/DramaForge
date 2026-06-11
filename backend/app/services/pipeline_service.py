"""Pipeline 编排服务 — 串联 6 个步骤的完整创作流程。"""

from app.services import llm_service


async def run_step_script(pipeline_id: str, creative_input: str, skill_config: dict) -> dict:
    """步骤 1: 生成剧本。"""
    # TODO: 调用 LLM 生成结构化剧本
    result = await llm_service.generate_script(creative_input, skill_config)
    # 解析为结构化数据
    return {
        "episodes": [
            {
                "id": "ep_1",
                "number": 1,
                "title": "第一集",
                "scenes": [
                    {"id": "s_1", "title": "开场", "summary": result[:200], "location": "待定", "time_tag": "待定"},
                ],
            }
        ]
    }


async def run_step_character(pipeline_id: str, script_data: dict, skill_config: dict) -> dict:
    """步骤 2: 生成角色。"""
    # TODO: 从剧本提取角色 → 调用图像生成 API
    return {
        "characters": [
            {"id": "c_1", "name": "主角", "role": "主角", "description": "待生成", "status": "done", "avatarColor": "#A8835F"},
        ]
    }


async def run_step_storyboard(pipeline_id: str, script_data: dict, character_data: dict, skill_config: dict) -> dict:
    """步骤 3: 生成分镜。"""
    # TODO: LLM 生成分镜描述 → 图像生成 API
    return {"shots": []}


async def run_step_video(pipeline_id: str, storyboard_data: dict, skill_config: dict) -> dict:
    """步骤 4: 生成视频。"""
    # TODO: 调用 Seedance/Kling 视频生成 API
    return {"clips": [], "overallProgress": 0}


async def run_step_audio(pipeline_id: str, script_data: dict, skill_config: dict) -> dict:
    """步骤 5: 生成配音和 BGM。"""
    # TODO: 调用火山引擎 TTS + Suno/Mubert
    return {"voices": [], "bgm": {"style": "", "duration": 0, "status": "waiting"}}


async def run_step_compose(pipeline_id: str, video_data: dict, audio_data: dict, skill_config: dict) -> dict:
    """步骤 6: 合成成片。"""
    # TODO: FFmpeg 合成
    return {"videoUrl": None, "duration": 0, "resolution": "1080p", "status": "waiting"}
