"""数据库初始化脚本 — 清空所有表并灌入 mock 数据，ID 统一 UUID。"""

import asyncio
import uuid

from sqlalchemy import text
from app.database import engine, async_session, Base
from app.models.db_models import (
    Project, Script, Episode, Scene, ScriptBlock, Character,
    StoryboardShot, Skill, SkillParameter, SkillReview,
    TimelineClip, SubtitleSegment,
)


def uid(prefix: str = "") -> str:
    """生成 UUID 格式 ID。"""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


async def seed():
    """清空所有表并灌入 mock 数据。"""
    async with engine.begin() as conn:
        # 删除所有表（包括旧表）
        all_tables = [
            "subtitle_segments", "timeline_clips",
            "skill_reviews", "skill_parameters", "skills",
            "storyboard_shots", "characters",
            "script_blocks", "scenes", "episodes", "scripts", "projects",
            "role_assets", "role_relationships", "role_traits", "roles",
        ]
        for table in all_tables:
            await conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
        # 重建所有表
        await conn.run_sync(Base.metadata.create_all)

    print("所有表已清空并重建")

    async with async_session() as db:
        # ─── 1. 项目 ───
        project = Project(
            id="proj_sakura_001",
            name="《樱花下的约定》第1季",
            type="漫剧",
            status="进行中",
            description="日式校园悬疑漫剧，讲述能看到别人记忆的转学生的故事",
            episodes=8,
            current_episode=3,
            progress=35,
            skill_id="skill_jp_school",
            skill_name="日式校园漫剧SKILL",
        )
        db.add(project)

        # ─── 2. 剧本 ───
        script_id = uid("scr_")
        db.add(Script(id=script_id, project_id="proj_sakura_001", title="《樱花下的约定》"))

        # ─── 3. 分集 + 场景 + 剧本块 ───
        episodes_data = [
            {"number": 1, "title": "转学生的有色眼镜"},
            {"number": 2, "title": "暗涌的风暴"},
            {"number": 3, "title": "绽放的勇气"},
        ]
        ep_ids = []
        for ep in episodes_data:
            ep_id = uid("ep_")
            db.add(Episode(id=ep_id, script_id=script_id, number=ep["number"], title=ep["title"]))
            ep_ids.append(ep_id)

        scenes_data = [
            {"ep_idx": 0, "number": 1, "title": "樱花树下的初遇", "location": "学校樱花道", "time_tag": "清晨",
             "blocks": [
                 {"type": "scene", "content": "清晨的学校樱花道，花瓣随风飘落"},
                 {"type": "character", "content": "林晓（主角）"},
                 {"type": "dialogue", "content": "林晓：这里就是新学校吗..."},
             ]},
            {"ep_idx": 0, "number": 2, "title": "教室里的目光", "location": "教室", "time_tag": "上午",
             "blocks": [
                 {"type": "scene", "content": "教室里，同学们窃窃私语"},
                 {"type": "dialogue", "content": "陈雨泽：你就是那个转学生？"},
             ]},
            {"ep_idx": 0, "number": 3, "title": "神秘的能力", "location": "保健室", "time_tag": "午后",
             "blocks": [
                 {"type": "scene", "content": "保健室，林晓发现自己能看到别人的记忆"},
                 {"type": "narration", "content": "那一刻，林晓的世界彻底改变了"},
             ]},
            {"ep_idx": 0, "number": 4, "title": "选择的代价", "location": "天台", "time_tag": "傍晚",
             "blocks": [
                 {"type": "scene", "content": "夕阳下的天台"},
                 {"type": "dialogue", "content": "林晓：我必须做出选择..."},
             ]},
            {"ep_idx": 1, "number": 1, "title": "记忆碎片", "location": "图书馆", "time_tag": "午后",
             "blocks": [{"type": "scene", "content": "图书馆深处，尘封的记忆"}]},
            {"ep_idx": 1, "number": 2, "title": "信任危机", "location": "教室", "time_tag": "上午",
             "blocks": [{"type": "scene", "content": "同学们开始疏远林晓"}]},
            {"ep_idx": 2, "number": 1, "title": "真相大白", "location": "校长室", "time_tag": "上午",
             "blocks": [{"type": "scene", "content": "校长室里，真相浮出水面"}]},
        ]

        for sc in scenes_data:
            scene_id = uid("sc_")
            db.add(Scene(
                id=scene_id, episode_id=ep_ids[sc["ep_idx"]],
                number=sc["number"], title=sc["title"],
                location=sc["location"], time_tag=sc["time_tag"],
            ))
            for idx, blk in enumerate(sc.get("blocks", [])):
                db.add(ScriptBlock(
                    id=uid("blk_"), scene_id=scene_id,
                    type=blk["type"], content=blk["content"], sort_order=idx,
                ))

        # ─── 4. 角色 ───
        characters_data = [
            {"name": "林晓", "role": "主角", "gender": "女", "age": 17, "description": "能看到别人记忆的转学生", "personality": "温柔坚强", "traits": ["温柔", "坚强", "内向"], "appearance": "黑色长发，戴眼镜", "costume": "校服", "background": "从东京转学而来", "special": "能通过触碰看到他人记忆", "color": "#A8835F"},
            {"name": "陈雨泽", "role": "主角", "gender": "男", "age": 18, "description": "学校风云人物，篮球社主将", "personality": "外冷内热", "traits": ["外冷内热", "正义", "倔强"], "appearance": "短发，高个子", "costume": "校服+篮球服", "background": "校篮球队队长", "special": "", "color": "#5A7FA8"},
            {"name": "苏瑶", "role": "配角", "gender": "女", "age": 17, "description": "林晓的同桌，活泼开朗", "personality": "活泼开朗", "traits": ["活泼", "开朗", "话多"], "appearance": "双马尾", "costume": "校服", "background": "本地学生", "special": "", "color": "#7A6B8A"},
            {"name": "沈婉清", "role": "配角", "gender": "女", "age": 17, "description": "文艺委员，安静内敛", "personality": "安静内敛", "traits": ["安静", "细腻", "文艺"], "appearance": "长发披肩", "costume": "校服", "background": "文学世家", "special": "", "color": "#5B8C5A"},
            {"name": "赵子轩", "role": "配角", "gender": "男", "age": 18, "description": "学生会主席", "personality": "严谨认真", "traits": ["严谨", "认真", "责任感强"], "appearance": "戴眼镜", "costume": "校服", "background": "学霸", "special": "", "color": "#B85C50"},
            {"name": "王美玲", "role": "配角", "gender": "女", "age": 45, "description": "班主任", "personality": "严厉但关心学生", "traits": ["严厉", "负责"], "appearance": "短发", "costume": "职业装", "background": "资深教师", "special": "", "color": "#C49A3C"},
            {"name": "张小明", "role": "龙套", "gender": "男", "age": 17, "description": "班上的搞笑担当", "personality": "幽默搞笑", "traits": ["幽默", "搞笑"], "appearance": "圆脸", "costume": "校服", "background": "", "special": "", "color": "#6E8B74"},
            {"name": "林母", "role": "龙套", "gender": "女", "age": 42, "description": "林晓的母亲", "personality": "温柔体贴", "traits": ["温柔", "体贴"], "appearance": "优雅", "costume": "便装", "background": "单亲妈妈", "special": "", "color": "#8B6B8A"},
        ]

        for char in characters_data:
            db.add(Character(
                id=uid("char_"), project_id="proj_sakura_001",
                name=char["name"], role=char["role"], gender=char["gender"],
                age=char["age"], description=char["description"],
                personality=char["personality"], personality_traits=char["traits"],
                appearance=char["appearance"], costume=char["costume"],
                background=char["background"], special_setting=char["special"],
                avatar_color=char["color"],
            ))

        # ─── 5. 分镜 ───
        shots_data = [
            {"shot_number": 1, "shot_type": "远景", "duration": 5, "description": "樱花道全景，花瓣飘落", "camera_movement": "缓慢推进", "scene_ref": "樱花树下的初遇", "characters": ["林晓"]},
            {"shot_number": 2, "shot_type": "中景", "duration": 4, "description": "林晓站在樱花树下", "camera_movement": "固定", "scene_ref": "樱花树下的初遇", "characters": ["林晓"]},
            {"shot_number": 3, "shot_type": "近景", "duration": 3, "description": "林晓的表情特写", "camera_movement": "缓慢推进", "scene_ref": "樱花树下的初遇", "characters": ["林晓"]},
            {"shot_number": 4, "shot_type": "全景", "duration": 4, "description": "教室内景", "camera_movement": "固定", "scene_ref": "教室里的目光", "characters": ["林晓", "陈雨泽"]},
            {"shot_number": 5, "shot_type": "中景", "duration": 5, "description": "陈雨泽走向林晓", "camera_movement": "跟拍", "scene_ref": "教室里的目光", "characters": ["陈雨泽"]},
            {"shot_number": 6, "shot_type": "特写", "duration": 3, "description": "两人对视", "camera_movement": "固定", "scene_ref": "教室里的目光", "characters": ["林晓", "陈雨泽"]},
        ]

        for shot in shots_data:
            db.add(StoryboardShot(
                id=uid("shot_"), project_id="proj_sakura_001",
                shot_number=shot["shot_number"], shot_type=shot["shot_type"],
                duration=shot["duration"], status="已完成",
                description=shot["description"], camera_movement=shot["camera_movement"],
                scene_ref=shot["scene_ref"], characters=shot["characters"],
            ))

        # ─── 6. 技能包 ───
        skill_id = uid("skill_")
        db.add(Skill(
            id=skill_id, name="日式校园漫剧SKILL", category="漫剧", style="日系",
            description="日式校园漫剧风格，对话简洁有力，情绪表达夸张",
            detailed_description="专为日式校园题材设计的 SKILL，包含青春感、悬疑氛围、对话节奏等风格参数。",
            tags=["日系", "校园", "悬疑", "青春"],
            version="v1.2.0", author_name="DramaForge", is_official=True,
            download_count=12500, rating=4.8, review_count=320,
            install_status="installed",
            usage_instructions="选择此 SKILL 后，AI 将自动生成符合日式校园风格的剧本和分镜。",
        ))

        # 技能参数
        params = [
            {"name": "情感强度", "type": "slider", "value": "70", "min_val": 0, "max_val": 100, "step": 5, "default_value": "70"},
            {"name": "对话风格", "type": "select", "value": "简洁", "options": ["简洁", "文艺", "口语化"], "default_value": "简洁"},
            {"name": "悬疑氛围", "type": "slider", "value": "50", "min_val": 0, "max_val": 100, "step": 10, "default_value": "50"},
            {"name": "启用内心独白", "type": "toggle", "value": "true", "default_value": "true"},
        ]
        for p in params:
            db.add(SkillParameter(
                id=uid("param_"), skill_id=skill_id,
                name=p["name"], type=p["type"], value=p["value"],
                min_val=p.get("min_val", 0), max_val=p.get("max_val", 100),
                step=p.get("step", 1), options=p.get("options", []),
                default_value=p["default_value"],
            ))

        # 技能评价
        reviews = [
            {"user_name": "编剧小王", "rating": 5, "comment": "日式风格非常到位，生成的对话很有感觉！", "date": "2026-06-01"},
            {"user_name": "动漫爱好者", "rating": 4, "comment": "整体不错，但悬疑部分可以再加强。", "date": "2026-05-28"},
            {"user_name": "导演小李", "rating": 5, "comment": "省了很多时间，推荐！", "date": "2026-05-20"},
        ]
        for r in reviews:
            db.add(SkillReview(
                id=uid("rev_"), skill_id=skill_id,
                user_name=r["user_name"], rating=r["rating"],
                comment=r["comment"], date=r["date"],
            ))

        # ─── 7. 时间轴片段 ───
        clips = [
            {"name": "镜头1 — 樱花道全景", "track_type": "video", "start_time": 0, "duration": 5, "shot_ref": "镜01"},
            {"name": "镜头2 — 林晓站樱花树下", "track_type": "video", "start_time": 5, "duration": 4, "shot_ref": "镜02"},
            {"name": "镜头3 — 表情特写", "track_type": "video", "start_time": 9, "duration": 3, "shot_ref": "镜03"},
            {"name": "镜头4 — 教室内景", "track_type": "video", "start_time": 12, "duration": 4, "shot_ref": "镜04"},
            {"name": "林晓配音", "track_type": "audio", "start_time": 0, "duration": 12},
            {"name": "陈雨泽配音", "track_type": "audio", "start_time": 12, "duration": 7},
            {"name": "轻柔钢琴BGM", "track_type": "bgm", "start_time": 0, "duration": 30},
        ]
        for c in clips:
            db.add(TimelineClip(
                id=uid("clip_"), project_id="proj_sakura_001",
                name=c["name"], track_type=c["track_type"],
                start_time=c["start_time"], duration=c["duration"],
                shot_ref=c.get("shot_ref", ""),
            ))

        # ─── 8. 字幕段 ───
        subs = [
            {"text": "这里就是新学校吗...", "start_time": 0.5, "duration": 3},
            {"text": "好美的樱花道", "start_time": 4, "duration": 2.5},
            {"text": "你就是那个转学生？", "start_time": 12, "duration": 2},
            {"text": "是的，我叫林晓", "start_time": 14.5, "duration": 2},
        ]
        for s in subs:
            db.add(SubtitleSegment(
                id=uid("sub_"), project_id="proj_sakura_001",
                text=s["text"], start_time=s["start_time"], duration=s["duration"],
            ))

        await db.commit()

        # 统计
        counts = {
            "项目": 1, "剧本": 1, "分集": len(episodes_data),
            "场景": len(scenes_data), "剧本块": sum(len(s.get("blocks", [])) for s in scenes_data),
            "角色": len(characters_data), "分镜": len(shots_data),
            "技能包": 1, "技能参数": len(params), "技能评价": len(reviews),
            "时间轴片段": len(clips), "字幕段": len(subs),
        }
        print("Mock 数据已灌入:")
        for k, v in counts.items():
            print(f"  {k}: {v} 个")


if __name__ == "__main__":
    asyncio.run(seed())
