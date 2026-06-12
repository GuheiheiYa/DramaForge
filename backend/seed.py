"""数据库初始化脚本 — 重建所有表并灌入 mock 数据。"""

import asyncio
import uuid

from sqlalchemy import text
from app.database import engine, async_session, Base
from app.models.db_models import (
    Project, Script, Episode, Scene, ScriptBlock, Character, StoryboardShot
)


async def seed():
    """重建所有表并灌入 mock 数据。"""
    async with engine.begin() as conn:
        # 删除所有表
        await conn.run_sync(Base.metadata.drop_all)
        # 重建所有表
        await conn.run_sync(Base.metadata.create_all)

    print("表结构已重建")

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
            skill_id="jp-school",
            skill_name="日式校园漫剧SKILL",
        )
        db.add(project)

        # ─── 2. 剧本 ───
        script = Script(id="scr_sakura_001", project_id="proj_sakura_001", title="《樱花下的约定》")
        db.add(script)

        # ─── 3. 分集 ───
        episodes_data = [
            {"number": 1, "title": "转学生的有色眼镜"},
            {"number": 2, "title": "暗涌的风暴"},
            {"number": 3, "title": "绽放的勇气"},
        ]
        ep_ids = []
        for ep in episodes_data:
            ep_id = f"ep_{uuid.uuid4().hex[:12]}"
            db.add(Episode(id=ep_id, script_id="scr_sakura_001", number=ep["number"], title=ep["title"]))
            ep_ids.append(ep_id)

        # ─── 4. 场景 + 剧本块 ───
        scenes_data = [
            # 第1集场景
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
            # 第2集场景
            {"ep_idx": 1, "number": 1, "title": "记忆碎片", "location": "图书馆", "time_tag": "午后",
             "blocks": [
                 {"type": "scene", "content": "图书馆深处，尘封的记忆"},
             ]},
            {"ep_idx": 1, "number": 2, "title": "信任危机", "location": "教室", "time_tag": "上午",
             "blocks": [
                 {"type": "scene", "content": "同学们开始疏远林晓"},
             ]},
            # 第3集场景
            {"ep_idx": 2, "number": 1, "title": "真相大白", "location": "校长室", "time_tag": "上午",
             "blocks": [
                 {"type": "scene", "content": "校长室里，真相浮出水面"},
             ]},
        ]

        for sc in scenes_data:
            scene_id = f"sc_{uuid.uuid4().hex[:12]}"
            db.add(Scene(
                id=scene_id, episode_id=ep_ids[sc["ep_idx"]],
                number=sc["number"], title=sc["title"],
                location=sc["location"], time_tag=sc["time_tag"],
            ))
            for idx, blk in enumerate(sc.get("blocks", [])):
                db.add(ScriptBlock(
                    id=f"blk_{uuid.uuid4().hex[:12]}",
                    scene_id=scene_id, type=blk["type"],
                    content=blk["content"], sort_order=idx,
                ))

        # ─── 5. 角色 ───
        characters_data = [
            {"name": "林晓", "role": "主角", "gender": "女", "age": 17, "description": "能看到别人记忆的转学生", "personality": "温柔坚强", "personality_traits": ["温柔", "坚强", "内向"], "appearance": "黑色长发，戴眼镜", "costume": "校服", "background": "从东京转学而来", "special_setting": "能通过触碰看到他人记忆", "avatar_color": "#A8835F"},
            {"name": "陈雨泽", "role": "主角", "gender": "男", "age": 18, "description": "学校风云人物，篮球社主将", "personality": "外冷内热", "personality_traits": ["外冷内热", "正义", "倔强"], "appearance": "短发，高个子", "costume": "校服+篮球服", "background": "校篮球队队长", "special_setting": "", "avatar_color": "#5A7FA8"},
            {"name": "苏瑶", "role": "配角", "gender": "女", "age": 17, "description": "林晓的同桌，活泼开朗", "personality": "活泼开朗", "personality_traits": ["活泼", "开朗", "话多"], "appearance": "双马尾", "costume": "校服", "background": "本地学生", "special_setting": "", "avatar_color": "#7A6B8A"},
            {"name": "沈婉清", "role": "配角", "gender": "女", "age": 17, "description": "文艺委员，安静内敛", "personality": "安静内敛", "personality_traits": ["安静", "细腻", "文艺"], "appearance": "长发披肩", "costume": "校服", "background": "文学世家", "special_setting": "", "avatar_color": "#5B8C5A"},
            {"name": "赵子轩", "role": "配角", "gender": "男", "age": 18, "description": "学生会主席", "personality": "严谨认真", "personality_traits": ["严谨", "认真", "责任感强"], "appearance": "戴眼镜", "costume": "校服", "background": "学霸", "special_setting": "", "avatar_color": "#B85C50"},
            {"name": "王美玲", "role": "配角", "gender": "女", "age": 45, "description": "班主任", "personality": "严厉但关心学生", "personality_traits": ["严厉", "负责"], "appearance": "短发", "costume": "职业装", "background": "资深教师", "special_setting": "", "avatar_color": "#C49A3C"},
            {"name": "张小明", "role": "龙套", "gender": "男", "age": 17, "description": "班上的搞笑担当", "personality": "幽默搞笑", "personality_traits": ["幽默", "搞笑"], "appearance": "圆脸", "costume": "校服", "background": "", "special_setting": "", "avatar_color": "#6E8B74"},
            {"name": "林母", "role": "龙套", "gender": "女", "age": 42, "description": "林晓的母亲", "personality": "温柔体贴", "personality_traits": ["温柔", "体贴"], "appearance": "优雅", "costume": "便装", "background": "单亲妈妈", "special_setting": "", "avatar_color": "#8B6B8A"},
        ]

        for char in characters_data:
            db.add(Character(
                id=f"char_{uuid.uuid4().hex[:12]}",
                project_id="proj_sakura_001",
                name=char["name"], role=char["role"], gender=char["gender"],
                age=char["age"], description=char["description"],
                personality=char["personality"], personality_traits=char["personality_traits"],
                appearance=char["appearance"], costume=char["costume"],
                background=char["background"], special_setting=char["special_setting"],
                avatar_color=char["avatar_color"],
            ))

        # ─── 6. 分镜 ───
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
                id=f"shot_{uuid.uuid4().hex[:12]}",
                project_id="proj_sakura_001",
                shot_number=shot["shot_number"], shot_type=shot["shot_type"],
                duration=shot["duration"], status="已完成",
                description=shot["description"], camera_movement=shot["camera_movement"],
                scene_ref=shot["scene_ref"], characters=shot["characters"],
            ))

        await db.commit()
        print("Mock 数据已灌入:")
        print(f"  项目: 1 个")
        print(f"  剧本: 1 个")
        print(f"  分集: {len(episodes_data)} 集")
        print(f"  场景: {len(scenes_data)} 个")
        print(f"  剧本块: {sum(len(s.get('blocks', [])) for s in scenes_data)} 个")
        print(f"  角色: {len(characters_data)} 个")
        print(f"  分镜: {len(shots_data)} 个")


if __name__ == "__main__":
    asyncio.run(seed())
