"""分镜管理路由。"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import ShotCreate, ShotResponse, MessageResponse

router = APIRouter()

_mock_shots: list[dict] = [
    {"id": "shot_001", "shot_number": 1, "episode_number": 1, "scene_title": "樱花走廊", "description": "校园全景，樱花飘落，镜头缓缓推进到教学楼入口", "shot_type": "远景", "duration": 6, "camera_movement": "推进", "status": "done", "image_url": None, "video_url": None},
    {"id": "shot_002", "shot_number": 2, "episode_number": 1, "scene_title": "樱花走廊", "description": "林小雨站在教室门口，深吸一口气", "shot_type": "中景", "duration": 5, "camera_movement": "固定", "status": "done", "image_url": None, "video_url": None},
    {"id": "shot_003", "shot_number": 3, "episode_number": 1, "scene_title": "樱花走廊", "description": "小雨推开门，全班同学转头看向她", "shot_type": "过肩", "duration": 4, "camera_movement": "摇移", "status": "done", "image_url": None, "video_url": None},
    {"id": "shot_004", "shot_number": 4, "episode_number": 1, "scene_title": "记忆闪现", "description": "小雨碰到陈明的手，瞳孔特写，画面闪白", "shot_type": "特写", "duration": 3, "camera_movement": "固定", "status": "generating", "image_url": None, "video_url": None},
]


@router.get("", response_model=list[ShotResponse])
async def list_shots(project_id: str | None = None, episode: int | None = None):
    """获取分镜列表。"""
    results = _mock_shots
    if episode is not None:
        results = [s for s in results if s["episode_number"] == episode]
    return results


@router.post("", response_model=ShotResponse)
async def create_shot(req: ShotCreate):
    """创建分镜。"""
    shot_id = f"shot_{len(_mock_shots) + 1:03d}"
    shot = {
        "id": shot_id,
        "shot_number": len(_mock_shots) + 1,
        "episode_number": req.episode_number,
        "scene_title": req.scene_title,
        "description": req.description,
        "shot_type": req.shot_type,
        "duration": req.duration,
        "camera_movement": req.camera_movement,
        "status": "draft",
        "image_url": None,
        "video_url": None,
    }
    _mock_shots.append(shot)
    return shot


@router.delete("/{shot_id}", response_model=MessageResponse)
async def delete_shot(shot_id: str):
    """删除分镜。"""
    global _mock_shots
    before = len(_mock_shots)
    _mock_shots = [s for s in _mock_shots if s["id"] != shot_id]
    if len(_mock_shots) == before:
        raise HTTPException(status_code=404, detail="分镜不存在")
    return MessageResponse(message=f"分镜 {shot_id} 已删除")
