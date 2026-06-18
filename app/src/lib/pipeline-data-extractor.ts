/**
 * Pipeline 数据提取器
 * 从 AI 回复中提取结构化的剧本和角色数据，用于 Pipeline 面板展示。
 *
 * 两层提取策略：
 * 1. 优先：从 <pipeline_data> 标签中提取 JSON（AI 按 System Prompt 输出）
 * 2. 回退：正则解析 Markdown 格式（兼容旧版 AI 回复）
 * 3. 最终回退：生成最小默认数据
 */

import type { ScriptData, CharacterData } from '@/store/usePipelineStore';
import { normalizeProjectName } from '@/lib/text-sanitize';

// ─── 类型 ───

interface ExtractedScript {
  title: string;
  episodes: ScriptData['episodes'];
}

interface ExtractedCharacter {
  id: string;
  name: string;
  role: '主角' | '配角' | '龙套';
  description: string;
  gender: string;
  age: number;
  personality: string;
  personalityTraits: string[];
  appearance: string;
  costume: string;
  status: 'done';
  avatarColor: string;
}

// ─── JSON 提取（R-051 新增） ───

interface PipelineDataJSON {
  title?: string;
  episodes?: Array<{
    number?: number;
    title?: string;
    scenes?: Array<{
      title?: string;
      location?: string;
      time_tag?: string;
      summary?: string;
    }>;
  }>;
  characters?: Array<{
    name?: string;
    role?: string;
    gender?: string;
    age?: number;
    description?: string;
    personality?: string;
    personality_traits?: string[];
    appearance?: string;
    costume?: string;
  }>;
}

/**
 * 从 AI 回复中提取 <pipeline_data> JSON 块。
 * 返回 null 表示未找到或解析失败。
 */
function extractPipelineDataJSON(aiReply: string): PipelineDataJSON | null {
  // 匹配 <pipeline_data> ... </pipeline_data>
  const match = aiReply.match(/<pipeline_data>\s*([\s\S]*?)\s*<\/pipeline_data>/);
  if (!match) return null;

  let jsonStr = match[1].trim();
  // 去掉可能包裹的 ```json ... ```
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

  try {
    const data = JSON.parse(jsonStr) as PipelineDataJSON;
    // 验证基本结构
    if (data.episodes || data.characters) {
      return data;
    }
  } catch {
    console.warn('[PipelineExtractor] JSON 解析失败，回退正则提取');
  }
  return null;
}

/**
 * 将 PipelineDataJSON 转换为 ExtractedScript。
 */
function jsonToScriptData(json: PipelineDataJSON, fallbackTitle: string): ExtractedScript {
  const episodes: ScriptData['episodes'] = (json.episodes || []).map((ep) => ({
    id: `ep${ep.number || 1}`,
    number: ep.number || 1,
    title: ep.title || `第${ep.number || 1}集`,
    scenes: (ep.scenes || []).map((s, i) => ({
      id: `s${i + 1}`,
      title: s.title || `场景${i + 1}`,
      summary: s.summary || '',
      location: s.location || '未指定',
      timeTag: s.time_tag || '日间',
    })),
  }));

  return {
    title: json.title || fallbackTitle,
    episodes: episodes.length > 0 ? episodes : [{
      id: 'ep1', number: 1, title: fallbackTitle,
      scenes: [{ id: 's1', title: '开场', summary: '（等待填充）', location: '未指定', timeTag: '日间' }],
    }],
  };
}

/**
 * 将 PipelineDataJSON 转换为 ExtractedCharacter 数组。
 */
function jsonToCharacterData(json: PipelineDataJSON): ExtractedCharacter[] {
  return (json.characters || []).map((c, i) => ({
    id: `char_${i + 1}`,
    name: c.name || `角色${i + 1}`,
    role: (['主角', '配角', '龙套'].includes(c.role || '') ? c.role : i < 2 ? '主角' : '配角') as '主角' | '配角' | '龙套',
    description: c.description || '',
    gender: c.gender || '',
    age: c.age || 0,
    personality: c.personality || '',
    personalityTraits: c.personality_traits || [],
    appearance: c.appearance || '',
    costume: c.costume || '',
    status: 'done' as const,
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

// ─── 颜色池 ───
const AVATAR_COLORS = [
  '#A8835F', '#5A7FA8', '#7A6B8A', '#5B8C5A',
  '#B85C50', '#C49A3C', '#6E8B74', '#8B6B8A',
];

// ─── 中文数字映射 ───
const CN_NUM_MAP: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
};

function parseEpisodeNum(raw: string): number {
  // 先尝试阿拉伯数字
  const arabic = parseInt(raw, 10);
  if (!isNaN(arabic)) return arabic;
  // 再尝试中文数字
  return CN_NUM_MAP[raw] ?? 1;
}

// ─── 提取函数 ───

/**
 * 从用户输入或创作方案 Markdown 中提取项目标题。
 * 示例: "# 《最后一块拼图》创作方案" → "最后一块拼图"
 */
export function extractProjectTitle(userInput: string): string {
  return normalizeProjectName(userInput, 30);
}

/**
 * 从 AI 回复中提取剧本数据。
 * 支持格式：
 * - "第1集：标题" / "第一集《标题》" / "## 第一集《标题》"
 * - "第X集 标题" / "第X集：标题"
 */
export function extractScriptFromReply(aiReply: string, fallbackTitle: string = '剧本'): ExtractedScript {
  const episodes: ScriptData['episodes'] = [];

  // 匹配集数标题（支持中文数字 + 书名号/冒号/空格）
  // 格式1: ### 第一集《转学生的有色眼镜》
  // 格式2: 第1集：标题
  // 格式3: 第一集 标题
  const episodeRegex = /(?:^|\n)#{0,3}\s*第\s*([\d一二三四五六七八九十百]+)\s*集\s*[：:《]?\s*(.*?)(?:》|$)/gm;
  const episodeMatches = [...aiReply.matchAll(episodeRegex)];

  if (episodeMatches.length > 0) {
    for (let i = 0; i < episodeMatches.length; i++) {
      const match = episodeMatches[i];
      const number = parseEpisodeNum(match[1]);
      const title = match[2]?.trim() || `第${number}集`;

      // 提取该集范围内的场景
      const startIdx = (match.index ?? 0) + match[0].length;
      const endIdx = i + 1 < episodeMatches.length ? (episodeMatches[i + 1].index ?? aiReply.length) : aiReply.length;
      const episodeContent = aiReply.slice(startIdx, endIdx);

      const scenes = extractScenes(episodeContent);

      episodes.push({
        id: `ep${number}`,
        number,
        title: title || `第${number}集`,
        scenes: scenes.length > 0 ? scenes : generateDefaultScenes(number),
      });
    }
  } else {
    // 没有找到集数信息，尝试从整体回复中提取场景
    const scenes = extractScenes(aiReply);
    if (scenes.length > 0) {
      episodes.push({
        id: 'ep1',
        number: 1,
        title: fallbackTitle,
        scenes,
      });
    } else {
      // 最终回退：生成默认结构
      episodes.push({
        id: 'ep1',
        number: 1,
        title: fallbackTitle,
        scenes: generateDefaultScenes(1),
      });
    }
  }

  return { title: fallbackTitle, episodes };
}

/**
 * 从文本中提取场景列表。
 * 支持格式：
 * - **开场**：描述内容
 * - 场景1：xxx / [场景：xxx]
 */
function extractScenes(text: string): ScriptData['episodes'][0]['scenes'] {
  const scenes: ScriptData['episodes'][0]['scenes'] = [];

  // 格式1: **场景名**：描述内容（AI 常用格式）
  const boldSceneRegex = /(?:^|\n)\s*[-•]?\s*\*\*(.+?)\*\*[：:]\s*(.+)/gm;
  let match;
  while ((match = boldSceneRegex.exec(text)) !== null) {
    const title = match[1].trim();
    const summary = match[2].trim();
    // 排除非场景的粗体标签（只排除完全匹配的关键词，不排除以这些词开头的复合标签）
    if (title.match(/^(能力|风格|色彩|视觉|象征|隐藏|记忆特效|记忆真相|记忆拼图|记忆片段)$/)) continue;
    scenes.push({
      id: `s${scenes.length + 1}`,
      title,
      summary: summary.slice(0, 150) + (summary.length > 150 ? '...' : ''),
      location: extractLocation(summary) || '未指定',
      timeTag: extractTimeTag(summary) || '日间',
    });
  }

  if (scenes.length > 0) return scenes;

  // 格式2: 场景X：xxx / [场景：xxx]
  const sceneRegex = /(?:^|\n)\s*(?:场景\s*(\d+)[：:]\s*(.+)|\[场景[：:]\s*(.+?)\]|Scene\s*(\d+)[：:]\s*(.+))/gim;
  const sceneMatches = [...text.matchAll(sceneRegex)];

  for (let i = 0; i < sceneMatches.length; i++) {
    const m = sceneMatches[i];
    const id = `s${i + 1}`;
    const title = (m[2] || m[3] || m[5] || `场景${i + 1}`).trim();
    const startIdx = (m.index ?? 0) + m[0].length;
    const endIdx = i + 1 < sceneMatches.length ? (sceneMatches[i + 1].index ?? text.length) : text.length;
    const sceneContent = text.slice(startIdx, endIdx).trim();

    scenes.push({
      id,
      title,
      summary: sceneContent.slice(0, 150) + (sceneContent.length > 150 ? '...' : ''),
      location: extractLocation(sceneContent) || '未指定',
      timeTag: extractTimeTag(sceneContent) || '日间',
    });
  }

  return scenes;
}

function extractLocation(text: string): string | null {
  const locationPatterns = [
    /地点[：:]\s*(.+?)[\n。]/,
    /(?:在|位于)\s*(.+?)[\n。,，]/,
    /【(.+?)】/,
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractTimeTag(text: string): string | null {
  const timePatterns = [
    /时间[：:]\s*(.+?)[\n。]/,
    /(清晨|上午|中午|下午|傍晚|黄昏|夜晚|深夜|日间|午后)/,
  ];
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim();
  }
  return null;
}

function generateDefaultScenes(episodeNumber: number): ScriptData['episodes'][0]['scenes'] {
  return [
    {
      id: `ep${episodeNumber}_s1`,
      title: '开场',
      summary: '（AI 未提供详细场景描述）',
      location: '未指定',
      timeTag: '日间',
    },
  ];
}

/**
 * 从 AI 回复中提取角色信息。
 * 匹配格式：
 * - 【角色：xxx】
 * - **角色名（主角/配角/龙套）** — 只匹配明确标注角色类型的
 * - **角色名**（转学生）— 后面跟括号描述的（非场景标签）
 */
export function extractCharactersFromReply(aiReply: string): ExtractedCharacter[] {
  const characters: ExtractedCharacter[] = [];
  const seenNames = new Set<string>();

  // 场景标签关键词（排除列表）
  const SCENE_LABELS = /^(开篇|开场|结尾|冲突|线索|发现|事件|悬念|高潮|转折|推进|升级|揭露|真相|张力|选择|困境|觉醒|暴走|提案|时刻|爆发|抉择|象征|彩蛋|画面|镜头|主线|副线|暗线|关键|核心|设定|风格|能力|代价|外表|性格|秘密|口头禅|角色定位|转学原因)/;

  // 匹配【角色：xxx】格式
  const charRegex1 = /【角色[：:]\s*(.+?)】/g;
  let match;
  while ((match = charRegex1.exec(aiReply)) !== null) {
    const name = match[1].trim();
    if (!seenNames.has(name) && name.length <= 20) {
      seenNames.add(name);
      characters.push(createCharacter(name, characters.length));
    }
  }

  // 匹配 **角色名（主角/配角/龙套）** 格式 — 明确标注角色类型
  const charRegex2 = /\*\*(.+?)（(主角|配角|龙套)）\*\*/g;
  while ((match = charRegex2.exec(aiReply)) !== null) {
    const name = match[1].trim();
    const role = match[2] as '主角' | '配角' | '龙套';
    if (!seenNames.has(name) && name.length >= 2 && name.length <= 20) {
      seenNames.add(name);
      characters.push(createCharacter(name, characters.length, role));
    }
  }

  // 匹配 **角色名**（描述）格式 — 角色名后跟括号描述（非场景标签）
  // 例: **雾岛瞬**（转学生） / **朝仓阳**（同班同学）
  const charRegex3 = /\*\*(.+?)\*\*（(?!.*(?:画面|镜头|场景|记忆|石墙|保健|校长|图书馆)).{1,20}）/g;
  while ((match = charRegex3.exec(aiReply)) !== null) {
    const name = match[1].trim();
    if (
      !seenNames.has(name) &&
      name.length >= 2 &&
      name.length <= 15 &&
      !SCENE_LABELS.test(name)
    ) {
      seenNames.add(name);
      characters.push(createCharacter(name, characters.length));
    }
  }

  return characters;
}

function createCharacter(name: string, index: number, explicitRole?: '主角' | '配角' | '龙套'): ExtractedCharacter {
  return {
    id: `char_${index + 1}`,
    name,
    role: explicitRole ?? (index < 2 ? '主角' : '配角'),
    description: '（从 AI 回复中提取）',
    gender: '',
    age: 0,
    personality: '',
    personalityTraits: [],
    appearance: '',
    costume: '',
    status: 'done',
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

// ─── 统一提取入口（R-051） ───

export interface ExtractionResult {
  title: string;
  script: ExtractedScript;
  characters: ExtractedCharacter[];
  source: 'json' | 'regex' | 'default';
}

/**
 * 从 AI 回复中提取结构化数据 — 两层策略：
 * 1. 优先 JSON（<pipeline_data> 标签）
 * 2. 回退正则（Markdown 格式）
 */
export function extractFromAIReply(
  aiReply: string,
  fallbackTitle: string = '剧本',
): ExtractionResult {
  // 策略 1：尝试 JSON 提取
  const jsonData = extractPipelineDataJSON(aiReply);
  if (jsonData) {
    console.log('[PipelineExtractor] 使用 JSON 提取成功');
    return {
      title: jsonData.title || fallbackTitle,
      script: jsonToScriptData(jsonData, jsonData.title || fallbackTitle),
      characters: jsonToCharacterData(jsonData),
      source: 'json',
    };
  }

  // 策略 2：回退正则提取
  const script = extractScriptFromReply(aiReply, fallbackTitle);
  const characters = extractCharactersFromReply(aiReply);

  if (script.episodes.length > 0 && script.episodes[0].scenes.length > 0
      && script.episodes[0].scenes[0].title !== '开场'
      || characters.length > 0) {
    console.log('[PipelineExtractor] 使用正则提取');
    return { title: fallbackTitle, script, characters, source: 'regex' };
  }

  // 策略 3：默认数据
  console.log('[PipelineExtractor] 使用默认数据');
  return {
    title: fallbackTitle,
    script: { title: fallbackTitle, episodes: [{ id: 'ep1', number: 1, title: fallbackTitle, scenes: generateDefaultScenes(1) }] },
    characters: [],
    source: 'default',
  };
}
