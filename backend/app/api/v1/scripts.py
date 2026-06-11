"""剧本管理路由。"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import ScriptResponse, EpisodeData, SceneData, MessageResponse

router = APIRouter()

# Mock 剧本数据
_mock_scripts: dict[str, dict] = {
    "proj_001": {
        "project_id": "proj_001",
        "episodes": [
            {
                "id": "ep_001_1",
                "number": 1,
                "title": "转学第一天",
                "scenes": [
                    {"id": "s_001_1_1", "title": "樱花走廊", "summary": "林小雨站在教室门口，深吸一口气推开门。樱花从窗外飘落，全班同学齐刷刷转头看向她。", "location": "学校走廊", "time_tag": "清晨"},
                    {"id": "s_001_1_2", "title": "记忆闪现", "summary": "小雨不小心碰到同桌陈明的手，眼前闪过一个模糊的画面——一间黑暗的房间里，有人在哭泣。", "location": "教室", "time_tag": "上午"},
                ],
            },
            {
                "id": "ep_001_2",
                "number": 2,
                "title": "神秘失踪",
                "scenes": [
                    {"id": "s_001_2_1", "title": "深夜校园", "summary": "小雨独自在校园里寻找线索，发现了一间被封禁的旧教室。", "location": "校园", "time_tag": "深夜"},
                ],
            },
        ],
    }
}


@router.get("/{project_id}", response_model=ScriptResponse)
async def get_script(project_id: str):
    """获取项目剧本。"""
    if project_id not in _mock_scripts:
        raise HTTPException(status_code=404, detail="剧本不存在")
    return _mock_scripts[project_id]


@router.put("/{project_id}/scenes/{scene_id}")
async def update_scene(project_id: str, scene_id: str, title: str | None = None, summary: str | None = None):
    """更新场景内容。"""
    if project_id not in _mock_scripts:
        raise HTTPException(status_code=404, detail="剧本不存在")
    script = _mock_scripts[project_id]
    for ep in script["episodes"]:
        for scene in ep["scenes"]:
            if scene["id"] == scene_id:
                if title is not None:
                    scene["title"] = title
                if summary is not None:
                    scene["summary"] = summary
                return {"message": "场景已更新", "scene": scene}
    raise HTTPException(status_code=404, detail="场景不存在")
