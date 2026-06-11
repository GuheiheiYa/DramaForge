import type { Skill } from './types';

export const mockSkills: Skill[] = [
  {
    id: 's1',
    name: '日式校园漫剧',
    description: '日系二次元画风，强调表情特写和速度线效果，适合校园题材的漫剧创作。提供丰富的表情模板和动态分镜预设。',
    detailedDescription: `日式校园漫剧SKILL是一款专为校园题材漫剧创作打造的专业技能包。采用正统日系二次元画风，强调角色的表情特写和速度线效果，能够呈现出充满青春活力的校园故事。

核心特性：
• 日系二次元画风，色彩清新明快
• 丰富的表情模板库（喜怒哀乐害羞等20+种）
• 动态速度线和集中线效果
• 校园场景预设（教室、操场、天台、图书馆等）
• 四季变化背景素材
• 符合日式分镜习惯的构图模板

适用题材：校园恋爱、青春成长、友情故事、轻喜剧`,
    category: '漫剧',
    style: '日系',
    tags: ['二次元', '校园', '情感', '日系'],
    coverImage: '/skill-cover-japanese.jpg',
    version: 'v2.1.3',
    authorName: 'AI漫剧官方',
    authorAvatar: '/character-placeholder.jpg',
    downloadCount: 3420,
    rating: 4.8,
    reviewCount: 256,
    isOfficial: true,
    installStatus: 'installed',
    parameters: [
      { id: 'p1', name: '剧本风格强度', type: 'slider', value: 70, min: 0, max: 100, step: 1, defaultValue: 70 },
      { id: 'p2', name: '角色一致性', type: 'slider', value: 80, min: 0, max: 100, step: 1, defaultValue: 80 },
      { id: 'p3', name: '视觉风格', type: 'select', value: '柔和', options: ['柔和', '强烈', '写实', '夸张'], defaultValue: '柔和' },
      { id: 'p4', name: '节奏偏好', type: 'slider', value: 60, min: 0, max: 100, step: 1, defaultValue: 60 },
    ],
    reviews: [
      { id: 'r1', userName: '漫剧创作者小A', avatar: '/character-placeholder.jpg', rating: 5, comment: '画风非常精致，表情模板很丰富，做校园恋爱漫剧效果特别好！', date: '2024-03-15' },
      { id: 'r2', userName: '漫画工作室B', avatar: '/character-placeholder.jpg', rating: 4, comment: '整体不错，速度线效果很出色。希望能增加更多教室场景的角度。', date: '2024-03-10' },
    ],
    usageInstructions: `使用日式校园漫剧SKILL，您可以快速创建校园题材的漫剧作品：

1. 在创建项目时选择此SKILL作为创作风格
2. 编写剧本时，系统会自动应用日系分镜构图
3. 角色生成时会自动采用二次元画风
4. 情感场景会自动添加速度线和集中线效果
5. 支持自定义配色方案（可在参数配置中调整）`,
  },
  {
    id: 's2',
    name: '真人都市短剧',
    description: '写实风格，适合都市情感、职场题材的短剧创作。提供真实感的场景和人物塑造能力。',
    detailedDescription: `真人都市短剧SKILL专为都市题材的真人短剧创作设计。采用写实风格的视觉表现，适合情感纠葛、职场奋斗、都市生活等题材的短剧制作。

核心特性：
• 写实风格画面，真实感强
• 都市场景库（写字楼、咖啡厅、公寓、街道等）
• 丰富的情感表达方式
• 适合短视频平台的节奏把控
• 专业的转场和剪辑预设
• 背景音乐智能匹配

适用题材：都市情感、职场故事、家庭伦理、社会话题`,
    category: '短剧',
    style: '现代',
    tags: ['写实', '都市', '情感', '职场'],
    coverImage: '/skill-cover-urban.jpg',
    version: 'v1.8.5',
    authorName: 'AI漫剧官方',
    authorAvatar: '/character-placeholder.jpg',
    downloadCount: 2850,
    rating: 4.6,
    reviewCount: 189,
    isOfficial: true,
    installStatus: 'not_installed',
    parameters: [
      { id: 'p1', name: '剧本风格强度', type: 'slider', value: 65, min: 0, max: 100, step: 1, defaultValue: 65 },
      { id: 'p2', name: '视频质量', type: 'select', value: '高清', options: ['标清', '高清', '超清'], defaultValue: '高清' },
      { id: 'p3', name: '生成模式', type: 'select', value: 'Pro', options: ['Fast', 'Pro'], defaultValue: 'Pro' },
      { id: 'p4', name: 'TTS音色', type: 'select', value: '女声甜美', options: ['女声甜美', '女声成熟', '男声阳光', '男声磁性'], defaultValue: '女声甜美' },
    ],
    reviews: [
      { id: 'r3', userName: '短剧达人C', avatar: '/character-placeholder.jpg', rating: 5, comment: '节奏把控很好，生成的短剧在抖音上播放量很高！', date: '2024-03-12' },
      { id: 'r4', userName: '影视爱好者D', avatar: '/character-placeholder.jpg', rating: 4, comment: '写实风格确实不错，场景切换很自然。', date: '2024-02-28' },
    ],
    usageInstructions: `使用真人都市短剧SKILL创作短剧：

1. 选择此SKILL后，系统会以写实风格生成画面
2. 剧本编写时建议使用对话驱动的方式
3. 场景会自动匹配都市背景素材
4. 支持一键发布到主流短视频平台
5. 可在参数配置中调整视频质量和生成速度`,
  },
  {
    id: 's3',
    name: '古风仙侠漫剧',
    description: '中国传统美学，水墨风格融合现代二次元，打造唯美仙侠世界。适合玄幻修仙题材的漫剧创作。',
    detailedDescription: `古风仙侠漫剧SKILL融合中国传统水墨美学与现代二次元表现手法，打造飘逸唯美的仙侠世界。适合修仙、武侠、神话等题材的漫剧创作。

核心特性：
• 水墨+二次元融合画风，仙气飘飘
• 古风场景库（仙山、竹林、古镇、宫殿等）
• 法术特效模板（剑气、符咒、仙光等）
• 古风服饰和发型素材
• 中国风BGM库
• 符合仙侠审美的色彩体系

适用题材：修仙玄幻、武侠江湖、神话传说、古风恋爱`,
    category: '漫剧',
    style: '古风',
    tags: ['古风', '仙侠', '玄幻', '水墨'],
    coverImage: '/skill-cover-fantasy.jpg',
    version: 'v1.5.2',
    authorName: 'AI漫剧官方',
    authorAvatar: '/character-placeholder.jpg',
    downloadCount: 2180,
    rating: 4.7,
    reviewCount: 167,
    isOfficial: true,
    installStatus: 'not_installed',
    parameters: [
      { id: 'p1', name: '剧本风格强度', type: 'slider', value: 75, min: 0, max: 100, step: 1, defaultValue: 75 },
      { id: 'p2', name: '水墨浓度', type: 'slider', value: 50, min: 0, max: 100, step: 1, defaultValue: 50 },
      { id: 'p3', name: '视觉风格', type: 'select', value: '柔和', options: ['柔和', '强烈', '水墨', '华丽'], defaultValue: '柔和' },
    ],
    reviews: [
      { id: 'r5', userName: '仙侠迷E', avatar: '/character-placeholder.jpg', rating: 5, comment: '水墨融合二次元的效果太美了，完全符合我对仙侠的想象！', date: '2024-03-08' },
    ],
    usageInstructions: `使用古风仙侠漫剧SKILL创作仙侠漫剧：

1. 选择此SKILL后，画面会自动应用古风美学
2. 角色设计时可以使用古风服饰和发型素材
3. 战斗场景会自动添加法术特效
4. 支持水墨浓淡程度调整
5. 可以自定义仙门门派配色方案`,
  },
  {
    id: 's4',
    name: '悬疑惊悚短剧',
    description: '暗色调、紧凑节奏，适合悬疑推理题材的短剧创作。通过光影和音效营造紧张刺激的氛围。',
    detailedDescription: `悬疑惊悚短剧SKILL专注于悬疑推理类短剧创作。采用暗色调视觉风格，通过精心设计的镜头语言和音效搭配，营造紧张刺激的观剧体验。

核心特性：
• 暗色调视觉风格，营造悬疑氛围
• 紧凑的节奏把控，每集设置悬念点
• 悬疑场景库（雨夜街道、废弃建筑、密室等）
• 恐怖音效和配乐素材
• 专业悬疑片镜头语言预设
• 光影对比强烈的画面风格

适用题材：悬疑推理、恐怖惊悚、犯罪心理、都市传说`,
    category: '短剧',
    style: '悬疑',
    tags: ['悬疑', '惊悚', '暗黑', '推理'],
    coverImage: '/skill-cover-horror.jpg',
    version: 'v1.3.0',
    authorName: 'AI漫剧官方',
    authorAvatar: '/character-placeholder.jpg',
    downloadCount: 1560,
    rating: 4.5,
    reviewCount: 134,
    isOfficial: true,
    installStatus: 'not_installed',
    parameters: [
      { id: 'p1', name: '剧本风格强度', type: 'slider', value: 80, min: 0, max: 100, step: 1, defaultValue: 80 },
      { id: 'p2', name: '悬疑密度', type: 'slider', value: 70, min: 0, max: 100, step: 1, defaultValue: 70 },
      { id: 'p3', name: '恐怖程度', type: 'select', value: '中等', options: ['轻微', '中等', '强烈'], defaultValue: '中等' },
    ],
    reviews: [
      { id: 'r6', userName: '推理迷F', avatar: '/character-placeholder.jpg', rating: 4, comment: '氛围营造很到位，音效配合画面真的有点吓人，效果很棒！', date: '2024-03-05' },
    ],
    usageInstructions: `使用悬疑惊悚短剧SKILL创作悬疑短剧：

1. 选择此SKILL后，画面会自动应用暗色调风格
2. 剧本编写时建议多使用悬念和反转
3. 系统会自动推荐适合悬疑片的镜头语言
4. 支持自定义恐怖程度和悬疑密度
5. 音效库包含多种恐怖和悬疑音效`,
  },
  {
    id: 's5',
    name: '甜宠浪漫漫剧',
    description: '温馨治愈风格，适合甜宠恋爱题材的漫剧创作。柔和的色调搭配甜蜜的故事节奏。',
    detailedDescription: `甜宠浪漫漫剧SKILL专为甜宠恋爱题材漫剧创作设计。采用温馨治愈的画风，柔和的色调搭配甜蜜的故事节奏，打造令人心动的恋爱故事。

核心特性：
• 温馨治愈画风，色调柔和甜美
• 恋爱场景库（樱花树下、咖啡厅约会、海边漫步等）
• 甜蜜特效模板（爱心、花瓣飘落、柔光等）
• 丰富的人物互动表情和动作
• 浪漫BGM库
• 多种结局走向预设

适用题材：甜宠恋爱、青春暗恋、婚后日常、浪漫喜剧`,
    category: '漫剧',
    style: '甜宠',
    tags: ['甜宠', '恋爱', '治愈', '浪漫'],
    coverImage: '/skill-cover-romance.jpg',
    version: 'v2.0.1',
    authorName: 'AI漫剧官方',
    authorAvatar: '/character-placeholder.jpg',
    downloadCount: 4210,
    rating: 4.9,
    reviewCount: 312,
    isOfficial: true,
    installStatus: 'not_installed',
    parameters: [
      { id: 'p1', name: '剧本风格强度', type: 'slider', value: 65, min: 0, max: 100, step: 1, defaultValue: 65 },
      { id: 'p2', name: '甜度等级', type: 'slider', value: 75, min: 0, max: 100, step: 1, defaultValue: 75 },
      { id: 'p3', name: '视觉风格', type: 'select', value: '柔和', options: ['柔和', '梦幻', '清新', '华丽'], defaultValue: '柔和' },
    ],
    reviews: [
      { id: 'r7', userName: '甜宠控G', avatar: '/character-placeholder.jpg', rating: 5, comment: '甜度超标！做恋爱漫剧用这个SKILL简直完美，每一帧都像壁纸！', date: '2024-03-18' },
      { id: 'r8', userName: '漫剧新手H', avatar: '/character-placeholder.jpg', rating: 5, comment: '新手友好，操作很简单，做出来的效果却很好看！', date: '2024-03-14' },
    ],
    usageInstructions: `使用甜宠浪漫漫剧SKILL创作恋爱漫剧：

1. 选择此SKILL后，画面会自动应用温馨甜美风格
2. 角色互动时会自动添加甜蜜特效
3. 恋爱场景有多种角度和构图可选
4. 支持自定义甜度等级和视觉风格
5. 提供多种结局走向模板`,
  },
];

export const categoryFilters = [
  '全部',
  '漫剧风格',
  '短剧风格',
  '日系',
  '古风',
  '现代',
  '悬疑惊悚',
  '甜宠浪漫',
  '科幻未来',
  '喜剧搞笑',
];

export const filterOptions = ['全部', '已安装', '未安装', '官方', '社区'];
export const sortOptions = ['推荐', '最新', '热门', '评分'];
