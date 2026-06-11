"""Pipeline Celery 任务 — 异步执行完整的创作流程。"""

from app.core.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def run_pipeline(self, pipeline_id: str, creative_input: str, skill_id: str, mode: str):
    """
    执行完整的 6 步创作流程。

    流程：剧本 → 角色 → 分镜 → 视频 → 配音 → 合成
    每个步骤完成后更新进度状态，前端通过 SSE 轮询获取。
    """
    from app.services import pipeline_service
    import asyncio

    steps = [
        ("script", lambda: pipeline_service.run_step_script(pipeline_id, creative_input, {"prompt_template": ""})),
        ("character", lambda: pipeline_service.run_step_character(pipeline_id, {}, {})),
        ("storyboard", lambda: pipeline_service.run_step_storyboard(pipeline_id, {}, {}, {})),
        ("video", lambda: pipeline_service.run_step_video(pipeline_id, {}, {})),
        ("audio", lambda: pipeline_service.run_step_audio(pipeline_id, {}, {})),
        ("compose", lambda: pipeline_service.run_step_compose(pipeline_id, {}, {}, {})),
    ]

    results = {}
    for idx, (step_name, step_fn) in enumerate(steps):
        try:
            # 更新任务进度
            self.update_state(
                state="PROGRESS",
                meta={"pipeline_id": pipeline_id, "stage": step_name, "step_index": idx, "progress": 0},
            )

            # 执行步骤
            result = asyncio.get_event_loop().run_until_complete(step_fn())
            results[step_name] = result

            # 更新进度为完成
            self.update_state(
                state="PROGRESS",
                meta={"pipeline_id": pipeline_id, "stage": step_name, "step_index": idx, "progress": 100},
            )

        except Exception as exc:
            # 步骤失败，暂停 Pipeline
            self.update_state(
                state="FAILURE",
                meta={"pipeline_id": pipeline_id, "stage": step_name, "step_index": idx, "error": str(exc)},
            )
            raise self.retry(exc=exc)

    return {"pipeline_id": pipeline_id, "status": "completed", "results": results}
