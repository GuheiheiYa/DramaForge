"""项目管理路由。"""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ProjectCreate, ProjectResponse, ProjectStatus, ProjectType, MessageResponse
)

router = APIRouter()

# Mock 数据（后续替换为数据库）
_mock_projects: dict[str, dict] = {}


def _init_mock():
    """初始化 mock 数据。"""
    if _mock_projects:
        return
    samples = [
        {"id": "proj_001", "name": "《樱花下的约定》第1季", "type": ProjectType.COMIC, "status": ProjectStatus.IN_PROGRESS, "progress": 65, "current_episode": 3, "total_episodes": 8, "skill_name": "日式校园漫剧SKILL"},
        {"id": "proj_002", "name": "《都市神医》短剧系列", "type": ProjectType.SHORT, "status": ProjectStatus.GENERATING, "progress": 42, "current_episode": 2, "total_episodes": 12, "skill_name": "都市逆袭短剧SKILL"},
        {"id": "proj_003", "name": "《九霄仙途》古风仙侠", "type": ProjectType.COMIC, "status": ProjectStatus.DRAFT, "progress": 10, "current_episode": 1, "total_episodes": 20, "skill_name": "古风仙侠漫剧SKILL"},
    ]
    for s in samples:
        _mock_projects[s["id"]] = {**s, "created_at": datetime.now(), "updated_at": datetime.now()}


_init_mock()


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    type: str | None = None,
    status: str | None = None,
):
    """获取项目列表。"""
    results = list(_mock_projects.values())
    if type:
        results = [p for p in results if p["type"].value == type]
    if status:
        results = [p for p in results if p["status"].value == status]
    return results


@router.post("", response_model=ProjectResponse)
async def create_project(req: ProjectCreate):
    """创建新项目。"""
    project_id = f"proj_{len(_mock_projects) + 1:03d}"
    now = datetime.now()
    project = {
        "id": project_id,
        "name": req.name,
        "type": req.type,
        "status": ProjectStatus.DRAFT,
        "progress": 0,
        "current_episode": 1,
        "total_episodes": req.episodes,
        "skill_name": req.skill_id,
        "created_at": now,
        "updated_at": now,
    }
    _mock_projects[project_id] = project
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """获取项目详情。"""
    if project_id not in _mock_projects:
        raise HTTPException(status_code=404, detail="项目不存在")
    return _mock_projects[project_id]


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(project_id: str):
    """删除项目。"""
    if project_id not in _mock_projects:
        raise HTTPException(status_code=404, detail="项目不存在")
    del _mock_projects[project_id]
    return MessageResponse(message=f"项目 {project_id} 已删除")
