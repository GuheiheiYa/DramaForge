import type { Episode, ScriptBlock } from './types';

export const projectTitle = '《樱花下的约定》';

export const episodes: Episode[] = [
  {
    id: 'ep1',
    number: 1,
    title: '初遇的樱花',
    scenes: [
      {
        id: 's1',
        number: 1,
        title: '教室·日',
        location: '教室',
        timeTag: '日内',
        expanded: true,
        elements: [
          { id: 'e1', type: 'action', label: '林晓走进教室', blockId: 'b1' },
          { id: 'e2', type: 'dialogue', label: '江辰：你是新来的转学生？', blockId: 'b3' },
          { id: 'e3', type: 'sound', label: '上课铃声', blockId: 'b6' },
        ],
      },
      {
        id: 's2',
        number: 2,
        title: '走廊·日',
        location: '走廊',
        timeTag: '日外',
        expanded: false,
        elements: [
          { id: 'e4', type: 'dialogue', label: '苏雨：你就是那个转学生？', blockId: 'b8' },
          { id: 'e5', type: 'action', label: '苏雨冷笑逼近', blockId: 'b10' },
        ],
      },
      {
        id: 's3',
        number: 3,
        title: '樱花树下·傍晚',
        location: '樱花树下',
        timeTag: '傍晚外',
        expanded: false,
        elements: [
          { id: 'e6', type: 'dialogue', label: '江辰：你喜欢樱花吗？', blockId: 'b14' },
          { id: 'e7', type: 'action', label: '樱花花瓣飘落', blockId: 'b17' },
        ],
      },
      {
        id: 's4',
        number: 4,
        title: '林晓家·夜',
        location: '林晓家',
        timeTag: '夜内',
        expanded: false,
        elements: [
          { id: 'e8', type: 'dialogue', label: '林晓独白', blockId: 'b19' },
        ],
      },
    ],
  },
  {
    id: 'ep2',
    number: 2,
    title: '暗涌的风暴',
    scenes: [
      {
        id: 's5',
        number: 1,
        title: '教室·日',
        location: '教室',
        timeTag: '日内',
        expanded: true,
        elements: [
          { id: 'e9', type: 'dialogue', label: '陈老师宣布考试成绩', blockId: 'b20' },
          { id: 'e10', type: 'action', label: '同学们议论纷纷', blockId: 'b22' },
        ],
      },
      {
        id: 's6',
        number: 2,
        title: '天台·日',
        location: '天台',
        timeTag: '日外',
        expanded: false,
        elements: [
          { id: 'e11', type: 'dialogue', label: '苏雨威胁林晓', blockId: 'b25' },
          { id: 'e12', type: 'action', label: '林晓攥紧拳头', blockId: 'b28' },
          { id: 'e13', type: 'sound', label: '风声呼啸', blockId: 'b30' },
        ],
      },
      {
        id: 's7',
        number: 3,
        title: '图书馆·午后',
        location: '图书馆',
        timeTag: '午后内',
        expanded: false,
        elements: [
          { id: 'e14', type: 'dialogue', label: '江辰鼓励林晓', blockId: 'b32' },
          { id: 'e15', type: 'action', label: '两人相视而笑', blockId: 'b35' },
        ],
      },
      {
        id: 's8',
        number: 4,
        title: '走廊·黄昏',
        location: '走廊',
        timeTag: '黄昏内',
        expanded: false,
        elements: [
          { id: 'e16', type: 'dialogue', label: '苏雨与江辰对峙', blockId: 'b37' },
          { id: 'e17', type: 'sound', label: '远处雷鸣', blockId: 'b40' },
        ],
      },
    ],
  },
  {
    id: 'ep3',
    number: 3,
    title: '绽放的勇气',
    scenes: [
      {
        id: 's9',
        number: 1,
        title: '教室·日',
        location: '教室',
        timeTag: '日内',
        expanded: true,
        elements: [
          { id: 'e18', type: 'dialogue', label: '苏雨当众羞辱林晓', blockId: 'b41' },
          { id: 'e19', type: 'action', label: '全班安静下来', blockId: 'b43' },
        ],
      },
      {
        id: 's10',
        number: 2,
        title: '教室·日（连续）',
        location: '教室',
        timeTag: '日内',
        expanded: false,
        elements: [
          { id: 'e20', type: 'dialogue', label: '林晓勇敢反击', blockId: 'b45' },
          { id: 'e21', type: 'sound', label: '掌声响起', blockId: 'b48' },
        ],
      },
      {
        id: 's11',
        number: 3,
        title: '操场·傍晚',
        location: '操场',
        timeTag: '傍晚外',
        expanded: false,
        elements: [
          { id: 'e22', type: 'dialogue', label: '江辰表白', blockId: 'b50' },
          { id: 'e23', type: 'action', label: '夕阳下的两人', blockId: 'b53' },
        ],
      },
      {
        id: 's12',
        number: 4,
        title: '樱花大道·夜',
        location: '樱花大道',
        timeTag: '夜外',
        expanded: false,
        elements: [
          { id: 'e24', type: 'action', label: '夜樱绽放', blockId: 'b55' },
          { id: 'e25', type: 'dialogue', label: '陈老师寄语', blockId: 'b57' },
        ],
      },
    ],
  },
];

/** 剧本块内容（第一集） */
export const episode1Blocks: ScriptBlock[] = [
  // 场景1
  {
    id: 'b1',
    type: 'scene',
    content: '[场景：晨光高中二年三班教室·春日午后]',
    sceneId: 's1',
  },
  {
    id: 'b2',
    type: 'narration',
    content: '阳光透过窗户洒在课桌上，粉笔灰在光束中轻轻飘舞。教室里的学生们三三两两聚在一起，笑声和聊天声交织成一片。',
    sceneId: 's1',
  },
  {
    id: 'b3',
    type: 'character',
    content: '【角色：林晓】（情绪：紧张不安）',
    sceneId: 's1',
  },
  {
    id: 'b4',
    type: 'dialogue',
    content: '大家好，我叫林晓，刚从梧桐市转来。希望……希望能和大家成为朋友。',
    sceneId: 's1',
  },
  {
    id: 'b5',
    type: 'narration',
    content: '她的声音很轻，手指紧紧攥着书包带子，目光低垂，不敢与任何人对视。',
    sceneId: 's1',
  },
  {
    id: 'b6',
    type: 'sound',
    content: '「音效：上课铃声响起，清脆悠扬」',
    sceneId: 's1',
  },
  // 场景2
  {
    id: 'b7',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b8',
    type: 'scene',
    content: '[场景：教学楼走廊·课后]',
    sceneId: 's2',
  },
  {
    id: 'b9',
    type: 'character',
    content: '【角色：苏雨】（情绪：傲慢挑衅）',
    sceneId: 's2',
  },
  {
    id: 'b10',
    type: 'dialogue',
    content: '哟，这不是新来的转学生吗？梧桐市来的？听说那边都是乡下地方呢。',
    sceneId: 's2',
  },
  {
    id: 'b11',
    type: 'action',
    content: '<动作：苏雨双臂抱胸，挡在林晓面前，嘴角挂着轻蔑的笑容>',
    sceneId: 's2',
  },
  {
    id: 'b12',
    type: 'character',
    content: '【角色：林晓】（情绪：隐忍委屈）',
    sceneId: 's2',
  },
  {
    id: 'b13',
    type: 'dialogue',
    content: '对不起，请让一下，我要回教室……',
    sceneId: 's2',
  },
  // 场景3
  {
    id: 'b14',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b15',
    type: 'scene',
    content: '[场景：校园樱花树下·傍晚黄昏]',
    sceneId: 's3',
  },
  {
    id: 'b16',
    type: 'narration',
    content: '粉色的樱花在夕阳映照下泛着金色的光芒，花瓣随着微风纷纷扬扬飘落。林晓独自站在树下，抬头望着满树繁花。',
    sceneId: 's3',
  },
  {
    id: 'b17',
    type: 'character',
    content: '【角色：江辰】（情绪：温和友善）',
    sceneId: 's3',
  },
  {
    id: 'b18',
    type: 'dialogue',
    content: '你喜欢樱花吗？每年这时候，我都会来这里。樱花开得最盛的时候，也就是最美的时刻，总是特别短暂。',
    sceneId: 's3',
  },
  // 场景4
  {
    id: 'b19',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b20',
    type: 'scene',
    content: '[场景：林晓家卧室·夜晚]',
    sceneId: 's4',
  },
  {
    id: 'b21',
    type: 'character',
    content: '【角色：林晓】（情绪：孤独迷茫）',
    sceneId: 's4',
  },
  {
    id: 'b22',
    type: 'dialogue',
    content: '（独白）来到这个陌生的城市，陌生的学校……真的能找到属于自己的位置吗？那个班长，好像和那些人不太一样……',
    sceneId: 's4',
  },
  {
    id: 'b23',
    type: 'sound',
    content: '「音效：手机消息提示音」',
    sceneId: 's4',
  },
];

/** 剧本块内容（第二集） */
export const episode2Blocks: ScriptBlock[] = [
  {
    id: 'b24',
    type: 'scene',
    content: '[场景：教室·期中考试后]',
    sceneId: 's5',
  },
  {
    id: 'b25',
    type: 'character',
    content: '【角色：陈老师】（情绪：严肃认真）',
    sceneId: 's5',
  },
  {
    id: 'b26',
    type: 'dialogue',
    content: '这次期中考试，我们班总体成绩不错。特别要表扬林晓同学，转学过来不到一个月，就考了全班第五名。',
    sceneId: 's5',
  },
  {
    id: 'b27',
    type: 'character',
    content: '【角色：苏雨】（情绪：嫉妒愤怒）',
    sceneId: 's5',
  },
  {
    id: 'b28',
    type: 'action',
    content: '<动作：苏雨猛地站起身，椅子与地面摩擦发出刺耳的声响，全班目光都投向她>',
    sceneId: 's5',
  },
  {
    id: 'b29',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b30',
    type: 'scene',
    content: '[场景：教学楼天台·大风]',
    sceneId: 's6',
  },
  {
    id: 'b31',
    type: 'character',
    content: '【角色：苏雨】（情绪：威胁恐吓）',
    sceneId: 's6',
  },
  {
    id: 'b32',
    type: 'dialogue',
    content: '林晓，我警告你。离江辰远一点，否则……你在这个学校的日子不会好过。',
    sceneId: 's6',
  },
  {
    id: 'b33',
    type: 'character',
    content: '【角色：林晓】（情绪：害怕但坚定）',
    sceneId: 's6',
  },
  {
    id: 'b34',
    type: 'dialogue',
    content: '我没有做错任何事。我和江辰只是普通同学。',
    sceneId: 's6',
  },
  {
    id: 'b35',
    type: 'sound',
    content: '「音效：狂风呼啸，天台门砰砰作响」',
    sceneId: 's6',
  },
  {
    id: 'b36',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b37',
    type: 'scene',
    content: '[场景：学校图书馆·午后阳光]',
    sceneId: 's7',
  },
  {
    id: 'b38',
    type: 'character',
    content: '【角色：江辰】（情绪：真诚鼓励）',
    sceneId: 's7',
  },
  {
    id: 'b39',
    type: 'dialogue',
    content: '林晓，我听说苏雨找你了。对不起，都是因为我……但你不要怕，有我在。你比她勇敢多了。',
    sceneId: 's7',
  },
  {
    id: 'b40',
    type: 'character',
    content: '【角色：林晓】（情绪：温暖感动）',
    sceneId: 's7',
  },
  {
    id: 'b41',
    type: 'dialogue',
    content: '谢谢你，江辰。你是我在这里第一个朋友。',
    sceneId: 's7',
  },
  {
    id: 'b42',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b43',
    type: 'scene',
    content: '[场景：教学楼走廊·黄昏]',
    sceneId: 's8',
  },
  {
    id: 'b44',
    type: 'character',
    content: '【角色：苏雨】（情绪：歇斯底里）',
    sceneId: 's8',
  },
  {
    id: 'b45',
    type: 'dialogue',
    content: '江辰！你为什么总是护着她？！我才是从小和你一起长大的人！',
    sceneId: 's8',
  },
  {
    id: 'b46',
    type: 'character',
    content: '【角色：江辰】（情绪：冷静坚决）',
    sceneId: 's8',
  },
  {
    id: 'b47',
    type: 'dialogue',
    content: '苏雨，够了。你的做法已经过分了。我希望你能反省一下。',
    sceneId: 's8',
  },
  {
    id: 'b48',
    type: 'sound',
    content: '「音效：远处雷鸣，天空渐暗」',
    sceneId: 's8',
  },
];

/** 剧本块内容（第三集） */
export const episode3Blocks: ScriptBlock[] = [
  {
    id: 'b49',
    type: 'scene',
    content: '[场景：教室·班会课]',
    sceneId: 's9',
  },
  {
    id: 'b50',
    type: 'character',
    content: '【角色：苏雨】（情绪：恶意中伤）',
    sceneId: 's9',
  },
  {
    id: 'b51',
    type: 'dialogue',
    content: '同学们，你们知道吗？林晓之所以转学，是因为在以前的学校闯了大祸！她这种人，根本不配待在我们班！',
    sceneId: 's9',
  },
  {
    id: 'b52',
    type: 'character',
    content: '【角色：林晓】（情绪：震惊受伤）',
    sceneId: 's9',
  },
  {
    id: 'b53',
    type: 'action',
    content: '<动作：林晓手中的笔掉在地上，脸色苍白，全班同学窃窃私语>',
    sceneId: 's9',
  },
  {
    id: 'b54',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b55',
    type: 'scene',
    content: '[场景：教室·同一地点]',
    sceneId: 's10',
  },
  {
    id: 'b56',
    type: 'character',
    content: '【角色：林晓】（情绪：坚定勇敢）',
    sceneId: 's10',
  },
  {
    id: 'b57',
    type: 'dialogue',
    content: '苏雨，你说得对，我确实是从梧桐市转来的。但那不是因为我闯祸，是因为我父母工作调动。你编造这些谣言，不就是因为害怕吗？',
    sceneId: 's10',
  },
  {
    id: 'b58',
    type: 'action',
    content: '<动作：林晓直视苏雨的眼睛，声音虽轻却字字清晰>',
    sceneId: 's10',
  },
  {
    id: 'b59',
    type: 'character',
    content: '【角色：林晓】（情绪：释然微笑）',
    sceneId: 's10',
  },
  {
    id: 'b60',
    type: 'dialogue',
    content: '我知道你一直针对我，是因为你喜欢江辰。但喜欢一个人，不应该用伤害别人的方式。',
    sceneId: 's10',
  },
  {
    id: 'b61',
    type: 'sound',
    content: '「音效：教室里响起雷鸣般的掌声」',
    sceneId: 's10',
  },
  {
    id: 'b62',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b63',
    type: 'scene',
    content: '[场景：操场·夕阳余晖]',
    sceneId: 's11',
  },
  {
    id: 'b64',
    type: 'character',
    content: '【角色：江辰】（情绪：深情真挚）',
    sceneId: 's11',
  },
  {
    id: 'b65',
    type: 'dialogue',
    content: '林晓，从第一次在学校走廊看见你，我就被你吸引了。你的坚强，你的温柔，你面对困难从不退缩的样子……我喜欢你。',
    sceneId: 's11',
  },
  {
    id: 'b66',
    type: 'character',
    content: '【角色：林晓】（情绪：欣喜含泪）',
    sceneId: 's11',
  },
  {
    id: 'b67',
    type: 'dialogue',
    content: '江辰……我也喜欢你。从樱花树下那一刻起，我就知道，你就是我一直在等的人。',
    sceneId: 's11',
  },
  {
    id: 'b68',
    type: 'transition',
    content: '--- 转场 ---',
  },
  {
    id: 'b69',
    type: 'scene',
    content: '[场景：校园樱花大道·夜空繁星]',
    sceneId: 's12',
  },
  {
    id: 'b70',
    type: 'character',
    content: '【角色：陈老师】（情绪：欣慰感慨）',
    sceneId: 's12',
  },
  {
    id: 'b71',
    type: 'dialogue',
    content: '同学们，青春就像樱花，短暂却灿烂。无论将来你们身在何方，都不要忘记此刻的这份勇气和真诚。',
    sceneId: 's12',
  },
  {
    id: 'b72',
    type: 'sound',
    content: '「音效：夜空烟花绽放，众人欢呼」',
    sceneId: 's12',
  },
  {
    id: 'b73',
    type: 'note',
    content: '【本季完】全剧终——在樱花盛开的季节，他们找到了属于自己的勇气和爱情。',
  },
];

/** 获取所有剧集的块 */
export function getBlocksForEpisode(episodeId: string): ScriptBlock[] {
  switch (episodeId) {
    case 'ep1': return episode1Blocks;
    case 'ep2': return episode2Blocks;
    case 'ep3': return episode3Blocks;
    default: return episode1Blocks;
  }
}

/** 图标映射 */
export const elementIconMap: Record<string, string> = {
  dialogue: '💬',
  action: '🏃',
  sound: '🔊',
  transition: '➡️',
};
