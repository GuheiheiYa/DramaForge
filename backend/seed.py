"""
数据库初始化脚本 — 删除旧表、创建新表、灌入 mock 数据。

使用方式：
    cd backend && python seed.py
"""

import asyncio
import json
import os

from app.database import engine, Base, async_session
from app.models.db_models import Project, Script, Episode, Scene, ScriptBlock, Character


# ─── Mock 数据：项目 ───

MOCK_PROJECTS = [
    {
        "id": "proj_sakura",
        "name": "《樱花下的约定》第1季",
        "type": "漫剧",
        "status": "进行中",
        "description": "青春校园漫剧，讲述转学生林晓在春野高中的成长故事",
        "episodes": 8,
        "skill_id": "jp-school",
    },
]


# ─── Mock 数据：剧本（第一季完整 3 集） ───

MOCK_SCRIPTS = [
    {
        "id": "scr_sakura",
        "project_id": "proj_sakura",
        "title": "《樱花下的约定》",
        "episodes": [
            {
                "id": "ep1",
                "number": 1,
                "title": "初遇的樱花",
                "scenes": [
                    {"id": "s1", "number": 1, "title": "教室·日", "summary": "林晓转学来到春野高中二年三班，紧张地做自我介绍。阳光透过窗户洒在课桌上，粉笔灰在光束中轻轻飘舞。", "location": "教室", "time_tag": "日内"},
                    {"id": "s2", "number": 2, "title": "走廊·日", "summary": "课后苏雨在走廊拦住林晓，傲慢地嘲讽她是从乡下转来的。林晓忍住委屈请求让路。", "location": "走廊", "time_tag": "日外"},
                    {"id": "s3", "number": 3, "title": "樱花树下·傍晚", "summary": "林晓独自站在樱花树下，江辰走近与她交谈。樱花花瓣在夕阳映照下泛着金色光芒。", "location": "樱花树下", "time_tag": "傍晚外"},
                    {"id": "s4", "number": 4, "title": "林晓家·夜", "summary": "林晓在卧室独白，感叹来到陌生城市的孤独。手机收到一条消息。", "location": "林晓家", "time_tag": "夜内"},
                ],
            },
            {
                "id": "ep2",
                "number": 2,
                "title": "暗涌的风暴",
                "scenes": [
                    {"id": "s5", "number": 1, "title": "教室·日", "summary": "陈老师宣布期中考试成绩，表扬林晓考了全班第五名。苏雨嫉妒地猛拍桌子。", "location": "教室", "time_tag": "日内"},
                    {"id": "s6", "number": 2, "title": "天台·日", "summary": "苏雨在天台威胁林晓离江辰远一点。林晓虽然害怕但坚定地说自己没有做错任何事。", "location": "天台", "time_tag": "日外"},
                    {"id": "s7", "number": 3, "title": "图书馆·午后", "summary": "江辰在图书馆鼓励林晓，说她比苏雨勇敢多了。两人相视而笑。", "location": "图书馆", "time_tag": "午后内"},
                    {"id": "s8", "number": 4, "title": "走廊·黄昏", "summary": "苏雨与江辰在走廊对峙，江辰严厉地让苏雨反省自己的行为。远处传来雷鸣。", "location": "走廊", "time_tag": "黄昏内"},
                ],
            },
            {
                "id": "ep3",
                "number": 3,
                "title": "绽放的勇气",
                "scenes": [
                    {"id": "s9", "number": 1, "title": "教室·日", "summary": "苏雨在班会课上当众羞辱林晓，编造她转学的谣言。全班安静下来。", "location": "教室", "time_tag": "日内"},
                    {"id": "s10", "number": 2, "title": "教室·日（连续）", "summary": "林晓勇敢反击，揭露苏雨是因为喜欢江辰才针对她。教室里响起雷鸣般的掌声。", "location": "教室", "time_tag": "日内"},
                    {"id": "s11", "number": 3, "title": "操场·傍晚", "summary": "江辰在操场向林晓表白，夕阳下两人相拥。", "location": "操场", "time_tag": "傍晚外"},
                    {"id": "s12", "number": 4, "title": "樱花大道·夜", "summary": "夜樱绽放，陈老师寄语同学们不要忘记此刻的勇气和真诚。烟花绽放。", "location": "樱花大道", "time_tag": "夜外"},
                ],
            },
        ],
    },
]


# ─── Mock 数据：剧本块（第一集完整内容） ───

MOCK_BLOCKS = [
    # 场景1：教室·日
    {"id": "b1", "scene_id": "s1", "type": "scene", "content": "[场景：晨光高中二年三班教室·春日午后]", "sort_order": 1},
    {"id": "b2", "scene_id": "s1", "type": "narration", "content": "阳光透过窗户洒在课桌上，粉笔灰在光束中轻轻飘舞。教室里的学生们三三两两聚在一起，笑声和聊天声交织成一片。", "sort_order": 2},
    {"id": "b3", "scene_id": "s1", "type": "character", "content": "【角色：林晓】（情绪：紧张不安）", "sort_order": 3},
    {"id": "b4", "scene_id": "s1", "type": "dialogue", "content": "大家好，我叫林晓，刚从梧桐市转来。希望……希望能和大家成为朋友。", "sort_order": 4},
    {"id": "b5", "scene_id": "s1", "type": "narration", "content": "她的声音很轻，手指紧紧攥着书包带子，目光低垂，不敢与任何人对视。", "sort_order": 5},
    {"id": "b6", "scene_id": "s1", "type": "sound", "content": "「音效：上课铃声响起，清脆悠扬」", "sort_order": 6},
    # 场景2：走廊·日
    {"id": "b7", "scene_id": None, "type": "transition", "content": "--- 转场 ---", "sort_order": 7},
    {"id": "b8", "scene_id": "s2", "type": "scene", "content": "[场景：教学楼走廊·课后]", "sort_order": 8},
    {"id": "b9", "scene_id": "s2", "type": "character", "content": "【角色：苏雨】（情绪：傲慢挑衅）", "sort_order": 9},
    {"id": "b10", "scene_id": "s2", "type": "dialogue", "content": "哟，这不是新来的转学生吗？梧桐市来的？听说那边都是乡下地方呢。", "sort_order": 10},
    {"id": "b11", "scene_id": "s2", "type": "action", "content": "<动作：苏雨双臂抱胸，挡在林晓面前，嘴角挂着轻蔑的笑容>", "sort_order": 11},
    {"id": "b12", "scene_id": "s2", "type": "character", "content": "【角色：林晓】（情绪：隐忍委屈）", "sort_order": 12},
    {"id": "b13", "scene_id": "s2", "type": "dialogue", "content": "对不起，请让一下，我要回教室……", "sort_order": 13},
    # 场景3：樱花树下
    {"id": "b14", "scene_id": None, "type": "transition", "content": "--- 转场 ---", "sort_order": 14},
    {"id": "b15", "scene_id": "s3", "type": "scene", "content": "[场景：校园樱花树下·傍晚黄昏]", "sort_order": 15},
    {"id": "b16", "scene_id": "s3", "type": "narration", "content": "粉色的樱花在夕阳映照下泛着金色的光芒，花瓣随着微风纷纷扬扬飘落。林晓独自站在树下，抬头望着满树繁花。", "sort_order": 16},
    {"id": "b17", "scene_id": "s3", "type": "character", "content": "【角色：江辰】（情绪：温和友善）", "sort_order": 17},
    {"id": "b18", "scene_id": "s3", "type": "dialogue", "content": "你喜欢樱花吗？每年这时候，我都会来这里。樱花开得最盛的时候，也就是最美的时刻，总是特别短暂。", "sort_order": 18},
    # 场景4：林晓家
    {"id": "b19", "scene_id": None, "type": "transition", "content": "--- 转场 ---", "sort_order": 19},
    {"id": "b20", "scene_id": "s4", "type": "scene", "content": "[场景：林晓家卧室·夜晚]", "sort_order": 20},
    {"id": "b21", "scene_id": "s4", "type": "character", "content": "【角色：林晓】（情绪：孤独迷茫）", "sort_order": 21},
    {"id": "b22", "scene_id": "s4", "type": "dialogue", "content": "（独白）来到这个陌生的城市，陌生的学校……真的能找到属于自己的位置吗？那个班长，好像和那些人不太一样……", "sort_order": 22},
    {"id": "b23", "scene_id": "s4", "type": "sound", "content": "「音效：手机消息提示音」", "sort_order": 23},
]


# ─── Mock 数据：角色（8 个完整角色） ───

MOCK_CHARACTERS = [
    {
        "id": "char_lin_xiao",
        "project_id": "proj_sakura",
        "name": "林晓",
        "role": "主角",
        "gender": "女",
        "age": 17,
        "description": "转学生，拥有能看到别人记忆的特殊能力。性格内向敏感，但内心善良温柔。因过去的某次事件而封闭了自己的内心，直到遇见陈雨泽才逐渐打开心扉。",
        "personality": "内向敏感，但内心善良温柔。不擅长与人建立深厚关系，但在关键时刻会展现出惊人的勇气。",
        "personality_traits": json.dumps(["内向", "敏感", "善良", "温柔"]),
        "appearance": "黑色及肩长发，刘海微微遮住左眼。眼睛是清澈的琥珀色。身材纤细，常微微低着头。校服穿得整整齐齐，但总是显得有些孤单。",
        "costume": "春野高中女生校服（白色衬衫+藏青色百褶裙+红色领结）。私服以浅色系连衣裙为主，喜欢戴一条银色星星项链。",
        "background": "因为父母工作调动频繁转学，导致不擅长与人建立深厚关系。小时候曾遭遇一次意外，从此获得了看到他人记忆的能力。",
        "special_setting": "看到他人记忆的能力会在情绪激动时不受控制地触发。每次使用能力后会有短暂的头痛。",
        "avatar_color": "#A8835F",
        "avatar_url": "/character-placeholder.jpg",
        "has_generated_image": 1,
        "assets_json": json.dumps([
            {"id": "a1", "type": "立绘", "name": "标准立绘", "thumbnail": "/character-placeholder.jpg"},
            {"id": "a2", "type": "表情", "name": "微笑表情", "thumbnail": "/character-placeholder.jpg"},
            {"id": "a3", "type": "表情", "name": "悲伤表情", "thumbnail": "/character-placeholder.jpg"},
        ]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_chen_yuze", "targetName": "陈雨泽", "relation": "同桌/逐渐萌生的感情"},
            {"targetCharacterId": "char_su_yao", "targetName": "苏瑶", "relation": "室友/朋友"},
        ]),
        "scenes_json": json.dumps(["教室初见", "天台对话", "樱花树下的约定"]),
    },
    {
        "id": "char_chen_yuze",
        "project_id": "proj_sakura",
        "name": "陈雨泽",
        "role": "主角",
        "gender": "男",
        "age": 17,
        "description": "春野高中的校草，篮球队队长。外表阳光开朗，实则内心细腻。对林晓一见钟情，用耐心和温暖逐渐融化了她的心防。",
        "personality": "阳光开朗，内心细腻。对林晓一见钟情，用耐心和温暖逐渐融化了她的心防。",
        "personality_traits": json.dumps(["阳光", "开朗", "细腻", "勇敢"]),
        "appearance": "高挑身材，约180cm。棕色短发，笑起来有好看的酒窝。眼睛是深邃的墨绿色。总是挺直腰板，给人可靠的感觉。",
        "costume": "春野高中男生校服（白色衬衫+藏青色长裤+红色领带）。篮球队服是7号。私服以休闲运动风为主。",
        "background": "家境优渥但父母忙于工作，从小独立自主。初中时是篮球队的核心球员，因膝盖受伤休养过一段时间。",
        "special_setting": "对林晓的记忆能力隐约有所察觉，但选择尊重她的秘密。擅长烹饪，经常做便当给林晓。",
        "avatar_color": "#5A7FA8",
        "avatar_url": "/character-placeholder.jpg",
        "has_generated_image": 1,
        "assets_json": json.dumps([
            {"id": "a4", "type": "立绘", "name": "标准立绘", "thumbnail": "/character-placeholder.jpg"},
            {"id": "a5", "type": "表情", "name": "阳光笑容", "thumbnail": "/character-placeholder.jpg"},
            {"id": "a6", "type": "动作", "name": "投篮姿势", "thumbnail": "/character-placeholder.jpg"},
        ]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_lin_xiao", "targetName": "林晓", "relation": "同桌/深爱的人"},
            {"targetCharacterId": "char_zhao_zixuan", "targetName": "赵子轩", "relation": "发小/篮球队友"},
        ]),
        "scenes_json": json.dumps(["教室初见", "篮球场比赛", "天台对话", "樱花树下的约定"]),
    },
    {
        "id": "char_su_yao",
        "project_id": "proj_sakura",
        "name": "苏瑶",
        "role": "配角",
        "gender": "女",
        "age": 17,
        "description": "林晓的室友，活泼开朗的元气少女。是班级里的开心果，也是林晓在学校交到的第一个朋友。暗恋赵子轩却不敢表白。",
        "personality": "活泼开朗，仗义迷糊。虽然看起来大大咧咧，其实很会察言观色。",
        "personality_traits": json.dumps(["活泼", "开朗", "仗义", "迷糊"]),
        "appearance": "齐肩卷发，染了淡淡的栗子色。眼睛大大的很有神。总是面带笑容，喜欢戴各种可爱的发饰。",
        "costume": "春野高中女生校服（裙子总是比规定短一点点）。私服是日系原宿风，色彩鲜艳。",
        "background": "家中有一个弟弟，从小学会了照顾人。梦想是成为一名婚礼策划师。",
        "special_setting": "虽然看起来大大咧咧，其实很会察言观色。是林晓和陈雨泽的爱情助攻。",
        "avatar_color": "#7A6B8A",
        "avatar_url": "/character-placeholder.jpg",
        "has_generated_image": 1,
        "assets_json": json.dumps([
            {"id": "a7", "type": "立绘", "name": "标准立绘", "thumbnail": "/character-placeholder.jpg"},
            {"id": "a8", "type": "表情", "name": "元气笑容", "thumbnail": "/character-placeholder.jpg"},
        ]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_lin_xiao", "targetName": "林晓", "relation": "室友/挚友"},
            {"targetCharacterId": "char_zhao_zixuan", "targetName": "赵子轩", "relation": "暗恋对象"},
        ]),
        "scenes_json": json.dumps(["宿舍初见", "食堂吃饭", "助攻计划"]),
    },
    {
        "id": "char_shen_wanqing",
        "project_id": "proj_sakura",
        "name": "沈婉清",
        "role": "配角",
        "gender": "女",
        "age": 35,
        "description": "春野高中的心理辅导老师，温柔知性。她是唯一知道林晓秘密的成年人，成为了林晓的精神支柱。",
        "personality": "温柔知性，善解人意，坚韧。曾是临床心理学医生，后转行成为学校心理老师。",
        "personality_traits": json.dumps(["温柔", "知性", "善解人意", "坚韧"]),
        "appearance": "黑色长发挽成优雅的发髻。戴着细框眼镜，眼神温和。身材匀称，穿着得体的职业装。",
        "costume": "米白色针织衫搭配深色长裙。办公室常备一条温暖的羊毛披肩。",
        "background": "曾是临床心理学医生，后转行成为学校心理老师。有过一段失败的婚姻，但始终保持对生活的热爱。",
        "special_setting": "办公室里永远有热茶和手工饼干。会弹奏古筝，有时会在放学后弹奏给学生听。",
        "avatar_color": "#5B8C5A",
        "avatar_url": "/character-placeholder.jpg",
        "has_generated_image": 1,
        "assets_json": json.dumps([
            {"id": "a9", "type": "立绘", "name": "标准立绘", "thumbnail": "/character-placeholder.jpg"},
        ]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_lin_xiao", "targetName": "林晓", "relation": "学生/被辅导者"},
        ]),
        "scenes_json": json.dumps(["心理咨询室", "古筝演奏"]),
    },
    {
        "id": "char_zhao_zixuan",
        "project_id": "proj_sakura",
        "name": "赵子轩",
        "role": "配角",
        "gender": "男",
        "age": 17,
        "description": "陈雨泽的青梅竹马，篮球队的副队长。外表冷酷话少，实际上是个热心肠。对苏瑶有好感但不知道怎么表达。",
        "personality": "冷酷话少，热心忠诚。父母离异，跟着奶奶长大。",
        "personality_traits": json.dumps(["冷酷", "话少", "热心", "忠诚"]),
        "appearance": "黑色短发，略带自然卷。单眼皮，眼神锐利。身高182cm，体型修长结实。左耳有一颗银色耳钉。",
        "costume": "春野高中男生校服（衬衫总是少扣一颗扣子）。篮球队服是11号。私服以黑色系街头风为主。",
        "background": "父母离异，跟着奶奶长大。篮球是他唯一的宣泄出口，通过篮球奖学金进入春野高中。",
        "special_setting": "左耳的耳钉是奶奶送的护身符。擅长弹吉他，但只在最亲近的人面前演奏。",
        "avatar_color": "#B85C50",
        "avatar_url": "/character-placeholder.jpg",
        "has_generated_image": 1,
        "assets_json": json.dumps([
            {"id": "a10", "type": "立绘", "name": "标准立绘", "thumbnail": "/character-placeholder.jpg"},
            {"id": "a11", "type": "服装", "name": "篮球服", "thumbnail": "/character-placeholder.jpg"},
        ]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_chen_yuze", "targetName": "陈雨泽", "relation": "发小/队友"},
            {"targetCharacterId": "char_su_yao", "targetName": "苏瑶", "relation": "暗恋对象"},
        ]),
        "scenes_json": json.dumps(["篮球训练", "吉他独奏", "便利店偶遇"]),
    },
    {
        "id": "char_wang_meiling",
        "project_id": "proj_sakura",
        "name": "王美玲",
        "role": "龙套",
        "gender": "女",
        "age": 17,
        "description": "班里的学习委员，有点八卦但本质不坏。经常传播校园里的各种消息。",
        "personality": "八卦好胜，热心。消息灵通，班里大小事都知道。",
        "personality_traits": json.dumps(["八卦", "好胜", "热心"]),
        "appearance": "扎着双马尾，戴着圆框眼镜。总是背着书包里装满参考资料。",
        "costume": "春野高中女生校服（总是佩戴学习委员袖章）。",
        "background": "父母都是教师，从小在学业上被严格要求。",
        "special_setting": "消息灵通，班里大小事都知道。",
        "avatar_color": "#C49A3C",
        "avatar_url": "",
        "has_generated_image": 0,
        "assets_json": json.dumps([]),
        "relationships_json": json.dumps([]),
        "scenes_json": json.dumps(["班级通知", "课间八卦"]),
    },
    {
        "id": "char_zhang_xiaoming",
        "project_id": "proj_sakura",
        "name": "张小明",
        "role": "龙套",
        "gender": "男",
        "age": 17,
        "description": "班里的搞笑担当，经常逗大家开心。陈雨泽的篮球队队友。",
        "personality": "搞笑乐观，贪吃。书包里永远有零食，人称移动小卖部。",
        "personality_traits": json.dumps(["搞笑", "乐观", "贪吃"]),
        "appearance": "微胖身材，圆圆的脸，总是笑眯眯的。头发有点自然卷。",
        "costume": "春野高中男生校服（领带总是歪的）。",
        "background": "家里开小吃店，从小对美食有研究。",
        "special_setting": "书包里永远有零食，人称移动小卖部。",
        "avatar_color": "#6E8B74",
        "avatar_url": "",
        "has_generated_image": 0,
        "assets_json": json.dumps([]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_chen_yuze", "targetName": "陈雨泽", "relation": "队友"},
        ]),
        "scenes_json": json.dumps(["课间搞笑", "篮球比赛"]),
    },
    {
        "id": "char_lin_mother",
        "project_id": "proj_sakura",
        "name": "林母",
        "role": "龙套",
        "gender": "女",
        "age": 42,
        "description": "林晓的母亲，温柔但有些疏忽。因工作忙碌而缺少对女儿的陪伴。",
        "personality": "温柔忙碌，内疚。公司中层管理人员，常年出差。",
        "personality_traits": json.dumps(["温柔", "忙碌", "内疚"]),
        "appearance": "和林晓相似的黑色长发，眼角有细纹。穿着朴素的职业装。",
        "costume": "素色职业套装，偶尔系一条林晓送的丝巾。",
        "background": "公司中层管理人员，常年出差。",
        "special_setting": "手机里存满了林晓的照片，却很少有机会一起看。",
        "avatar_color": "#8B6B8A",
        "avatar_url": "",
        "has_generated_image": 0,
        "assets_json": json.dumps([]),
        "relationships_json": json.dumps([
            {"targetCharacterId": "char_lin_xiao", "targetName": "林晓", "relation": "母女"},
        ]),
        "scenes_json": json.dumps(["家中对话", "机场送别"]),
    },
]


async def seed():
    """删除旧表、创建新表、灌入 mock 数据。"""

    # 1. 删除所有表（如果存在），然后重新创建
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[SEED] 已重建所有表：projects, scripts, episodes, scenes, script_blocks, characters")

    # 3. 灌入数据
    async with async_session() as session:
        # 项目
        for data in MOCK_PROJECTS:
            session.add(Project(**data))
        print(f"[SEED] 已插入 {len(MOCK_PROJECTS)} 个项目")

        # 剧本 + 分集 + 场景
        for script_data in MOCK_SCRIPTS:
            script_id = script_data["id"]
            episodes_data = script_data.pop("episodes")
            session.add(Script(**script_data))
            for ep_data in episodes_data:
                ep_id = ep_data["id"]
                scenes_data = ep_data.pop("scenes")
                session.add(Episode(id=ep_id, script_id=script_id, number=ep_data["number"], title=ep_data["title"]))
                for scene_data in scenes_data:
                    session.add(Scene(id=scene_data["id"], episode_id=ep_id, number=scene_data["number"], title=scene_data["title"], summary=scene_data.get("summary", ""), location=scene_data.get("location", "未指定"), time_tag=scene_data.get("time_tag", "日间")))
        print(f"[SEED] 已插入 {len(MOCK_SCRIPTS)} 个剧本（含分集和场景）")

        # 剧本块
        for block_data in MOCK_BLOCKS:
            session.add(ScriptBlock(
                id=block_data["id"],
                scene_id=block_data.get("scene_id"),
                type=block_data["type"],
                content=block_data["content"],
                sort_order=block_data["sort_order"],
            ))
        print(f"[SEED] 已插入 {len(MOCK_BLOCKS)} 个剧本块")

        # 角色
        for char_data in MOCK_CHARACTERS:
            session.add(Character(**char_data))
        print(f"[SEED] 已插入 {len(MOCK_CHARACTERS)} 个角色")

        await session.commit()

    print("\n[SEED] 数据库初始化完成！")


if __name__ == "__main__":
    asyncio.run(seed())
