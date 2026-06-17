import { create } from 'zustand';
import {
  extractProjectTitle,
} from '@/lib/pipeline-data-extractor';
import type { ScriptData, CharacterData } from '@/store/usePipelineStore';
import { generateVideo, generateImage } from '@/lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;       // AI 思考过程
  timestamp: string;
  model?: string;
  isStreaming?: boolean;    // 是否正在流式输出中
  type?: 'text' | 'plan_card' | 'image' | 'video';  // 消息类型
  imageUrl?: string;       // 图片 URL（type=image 时使用）
  videoUrl?: string;       // 视频 URL（type=video 时使用）
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  skill: string;
  createdAt: string;
  updatedAt: string;
}

export const modelOptions = [
  { id: 'mimo', label: 'MiMo', provider: 'Xiaomi', cost: '免费', desc: '小米 MiMo 大模型' },
  { id: 'deepseek-v3', label: 'DeepSeek-V3', provider: 'DeepSeek', cost: '¥2-4/百万Token', desc: '性价比最高，中文效果佳' },
  { id: 'claude-4', label: 'Claude 4', provider: 'Anthropic', cost: '¥25-30/百万Token', desc: '剧本冲突和对话打磨最强' },
  { id: 'gpt-5', label: 'GPT-5', provider: 'OpenAI', cost: '¥20-25/百万Token', desc: '综合能力均衡，IP改编' },
  { id: 'kimi', label: 'Kimi', provider: '月之暗面', cost: '¥5-10/百万Token', desc: '长文本处理最强' },
  { id: 'gemini', label: 'Gemini 2.5 Flash', provider: 'Google', cost: '¥10-15/百万Token', desc: '多模态分镜最佳' },
];

export const skillOptions = [
  { id: 'jp-school', label: '日式校园漫剧', type: '漫剧', desc: '青春校园、恋爱、友情' },
  { id: 'urban', label: '都市逆袭短剧', type: '短剧', desc: '职场、逆袭、爽文' },
  { id: 'xianxia', label: '古风仙侠漫剧', type: '漫剧', desc: '修仙、江湖、情缘' },
  { id: 'suspense', label: '悬疑惊悚短剧', type: '短剧', desc: '悬疑、推理、惊悚' },
  { id: 'sweet-romance', label: '甜宠恋爱漫剧', type: '漫剧', desc: '甜宠、恋爱、日常' },
  { id: 'scifi', label: '科幻冒险漫剧', type: '漫剧', desc: '科幻、冒险、未来' },
  { id: 'workplace', label: '职场励志短剧', type: '短剧', desc: '职场、励志、成长' },
];

function generateId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── API ───
const API_BASE = 'http://localhost:7779/api/v1';

const modelToProvider: Record<string, string> = {
  'mimo': 'mimo',
  'deepseek-v3': 'deepseek',
  'claude-4': 'deepseek',
  'gpt-5': 'deepseek',
  'kimi': 'deepseek',
  'gemini': 'deepseek',
};

const skillToConfig: Record<string, { prompt: string; type: string }> = {
  'jp-school': { prompt: '日式校园漫剧风格，对话简洁有力，情绪表达夸张，注重青春感和悬疑氛围', type: '漫剧' },
  'urban': { prompt: '都市逆袭短剧，节奏紧凑，反转密集，注重爽感', type: '短剧' },
  'xianxia': { prompt: '古风仙侠漫剧，意境深远，画面唯美，注重修仙体系和江湖情义', type: '漫剧' },
  'suspense': { prompt: '悬疑惊悚短剧，氛围压抑，节奏紧张，注重推理和反转', type: '短剧' },
  'sweet-romance': { prompt: '甜宠恋爱漫剧，温馨甜蜜，注重情感细腻描写', type: '漫剧' },
  'scifi': { prompt: '科幻冒险漫剧，世界观宏大，注重科技感和冒险精神', type: '漫剧' },
  'workplace': { prompt: '职场励志短剧，真实接地气，注重成长和逆袭', type: '短剧' },
};

// AbortController for cancelling requests
let currentAbortController: AbortController | null = null;

// ─── State ───
interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentModel: string;
  currentSkill: string;
  isGenerating: boolean;
  deepThink: boolean;
  pipelineStage: 'analyzing' | 'replying' | null;  // 两次调用的阶段
  // Pipeline 相关 — 从 AI 回复中提取的数据
  extractedScript: ScriptData | null;
  extractedCharacters: CharacterData | null;
  extractedTitle: string;

  createSession: () => string;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  cancelGeneration: () => void;
  setModel: (model: string) => void;
  setSkill: (skill: string) => void;
  setDeepThink: (v: boolean) => void;
  getCurrentSession: () => ChatSession | null;
  updateExtractedData: (data: { script?: ScriptData; characters?: CharacterData; title?: string }) => void;
  generateImageInChat: (prompt: string, imageUrl?: string) => void;
  generateVideoInChat: (prompt: string, imageUrl?: string) => void;
}

const defaultModel = 'mimo';
const defaultSkill = 'jp-school';

// Keywords that indicate a creation request
const CREATION_KEYWORDS = ['帮我做', '帮我生成', '帮我创作', '做一个', '生成一个', '创作一个', '制作', '漫剧', '短剧', '剧本'];

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  currentModel: defaultModel,
  currentSkill: defaultSkill,
  isGenerating: false,
  deepThink: false,
  pipelineStage: null,
  extractedScript: null,
  extractedCharacters: null,
  extractedTitle: '',

  createSession: () => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const state = get();
    const session: ChatSession = {
      id: generateId(),
      title: '新对话',
      messages: [],
      model: state.currentModel,
      skill: state.currentSkill,
      createdAt: timeStr,
      updatedAt: timeStr,
    };
    set((s) => ({
      sessions: [session, ...s.sessions],
      currentSessionId: session.id,
    }));
    return session.id;
  },

  deleteSession: (id) => {
    set((s) => {
      const filtered = s.sessions.filter((ss) => ss.id !== id);
      return {
        sessions: filtered,
        currentSessionId: s.currentSessionId === id
          ? (filtered[0]?.id ?? null)
          : s.currentSessionId,
      };
    });
  },

  selectSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (session) {
      set({
        currentSessionId: id,
        currentModel: session.model,
        currentSkill: session.skill,
      });
    }
  },

  sendMessage: (content) => {
    const state = get();
    if (!content.trim() || state.isGenerating) return;

    let sessionId = state.currentSessionId;
    if (!sessionId) {
      sessionId = state.createSession();
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: timeStr,
    };

    const session = get().sessions.find((s) => s.id === sessionId);
    const isFirstMessage = session && session.messages.length === 0;

    // Add user message + placeholder AI message (streaming)
    const aiMsgId = generateId();
    const aiPlaceholder: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      thinking: '',
      timestamp: timeStr,
      isStreaming: true,
    };

    set((s) => ({
      isGenerating: true,
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        return {
          ...ss,
          title: isFirstMessage ? content.trim().slice(0, 30) + (content.trim().length > 30 ? '...' : '') : ss.title,
          messages: [...ss.messages, userMsg, aiPlaceholder],
          updatedAt: timeStr,
          model: s.currentModel,
          skill: s.currentSkill,
        };
      }),
    }));

    // Start streaming
    const provider = modelToProvider[state.currentModel] || 'mimo';
    const skillConfig = skillToConfig[state.currentSkill] || skillToConfig['jp-school'];

    const systemPrompt = `你是一个专业的AI漫剧/短剧创作助手。当前风格：${skillConfig.prompt}。
你可以帮助用户：生成剧本创意、设计角色、规划分镜、优化对话、描写场景。
回复要详细、专业、有创意。`;

    const abortController = new AbortController();
    currentAbortController = abortController;

    // 判断是否为创作请求
    const isCreationReq = CREATION_KEYWORDS.some((kw) => content.trim().includes(kw));

    if (isCreationReq) {
      // ── 两次调用模式 ──
      runCreationPipeline(sessionId, aiMsgId, content.trim(), provider, state.deepThink, abortController.signal);
    } else {
      // ── 普通对话：单次流式调用 ──
      fetchStreamResponse(
        sessionId,
        aiMsgId,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content.trim() },
        ],
        provider,
        state.deepThink,
        abortController.signal,
      );
    }
  },

  cancelGeneration: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set((s) => {
      const sessionId = s.currentSessionId;
      if (!sessionId) return { isGenerating: false, pipelineStage: null };
      // 检查最后一条用户消息是否匹配创作关键词
      const session = s.sessions.find((ss) => ss.id === sessionId);
      const lastUser = session ? [...session.messages].reverse().find((m) => m.role === 'user') : null;
      const isCreation = lastUser ? CREATION_KEYWORDS.some((kw) => lastUser.content.includes(kw)) : false;
      if (isCreation) {
        setTimeout(() => {
          const planCardMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: lastUser?.content.slice(0, 20) || '创作',
            type: 'plan_card',
            timestamp: (() => {
              const n = new Date();
              return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
            })(),
          };
          useChatStore.setState((prev) => ({
            sessions: prev.sessions.map((ss) => {
              if (ss.id !== sessionId) return ss;
              return { ...ss, messages: [...ss.messages, planCardMsg] };
            }),
          }));
        }, 100);
      }
      return {
        isGenerating: false,
        pipelineStage: null,
        sessions: s.sessions.map((ss) => {
          if (ss.id !== sessionId) return ss;
          return {
            ...ss,
            messages: ss.messages.map((m) =>
              m.isStreaming ? { ...m, isStreaming: false, content: m.content || '（已取消）' } : m
            ),
          };
        }),
      };
    });
  },

  setModel: (model) => set({ currentModel: model }),
  setSkill: (skill) => set({ currentSkill: skill }),
  setDeepThink: (v) => set({ deepThink: v }),

  getCurrentSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.currentSessionId) ?? null;
  },

  updateExtractedData: (data) => {
    set((s) => ({
      extractedScript: data.script ?? s.extractedScript,
      extractedCharacters: data.characters ?? s.extractedCharacters,
      extractedTitle: data.title ?? s.extractedTitle,
    }));
  },

  // ─── 图片生成 ───
  generateImageInChat: (prompt, imageUrl) => {
    const state = get();
    let sessionId = state.currentSessionId;
    if (!sessionId) sessionId = state.createSession();

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const isImg2Img = !!imageUrl;

    // 用户消息
    const userMsg: ChatMessage = {
      id: generateId(), role: 'user',
      content: isImg2Img ? `🎨 修改图片：${prompt}` : `🎨 生成图片：${prompt}`,
      timestamp: timeStr,
    };

    // 加载中占位消息
    const loadingMsg: ChatMessage = {
      id: generateId(), role: 'assistant', content: '', timestamp: timeStr,
      type: 'image', imageUrl: '', isStreaming: true,
    };

    set((s) => ({
      isGenerating: true,
      sessions: s.sessions.map((ss) => ss.id !== sessionId ? ss : {
        ...ss, messages: [...ss.messages, userMsg, loadingMsg], updatedAt: timeStr,
      }),
    }));

    // 调用后端图片生成 API（文生图 or 图生图）
    generateImage(prompt, undefined, imageUrl)
      .then((data) => {
        set((s) => ({
          isGenerating: false,
          sessions: s.sessions.map((ss) => ss.id !== sessionId ? ss : {
            ...ss, messages: ss.messages.map((m) =>
              m.id === loadingMsg.id ? { ...m, isStreaming: false, imageUrl: data.image_url, content: data.image_url ? '' : '生成失败' } : m
            ),
          }),
        }));
      })
      .catch((err) => {
        console.error('[Chat] 图片生成失败:', err);
        set((s) => ({
          isGenerating: false,
          sessions: s.sessions.map((ss) => ss.id !== sessionId ? ss : {
            ...ss, messages: ss.messages.map((m) =>
              m.id === loadingMsg.id ? { ...m, isStreaming: false, content: `❌ 图片生成失败：${err.message}` } : m
            ),
          }),
        }));
      });
  },

  // ─── 视频生成 ───
  generateVideoInChat: (prompt, imageUrl) => {
    const state = get();
    let sessionId = state.currentSessionId;
    if (!sessionId) sessionId = state.createSession();

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: generateId(), role: 'user',
      content: imageUrl ? `🎬 图生视频：${prompt}` : `🎬 生成视频：${prompt}`,
      timestamp: timeStr,
    };

    const loadingMsg: ChatMessage = {
      id: generateId(), role: 'assistant', content: '', timestamp: timeStr,
      type: 'video', videoUrl: '', isStreaming: true,
    };

    set((s) => ({
      isGenerating: true,
      sessions: s.sessions.map((ss) => ss.id !== sessionId ? ss : {
        ...ss, messages: [...ss.messages, userMsg, loadingMsg], updatedAt: timeStr,
      }),
    }));

    generateVideo({
      prompt,
      image_url: imageUrl,
      width: 1152,
      height: 768,
      num_frames: 121,
      frame_rate: 24,
    })
      .then((data) => {
        set((s) => ({
          isGenerating: false,
          sessions: s.sessions.map((ss) => ss.id !== sessionId ? ss : {
            ...ss, messages: ss.messages.map((m) =>
              m.id === loadingMsg.id ? { ...m, isStreaming: false, videoUrl: data.video_url, content: data.video_url ? '' : '生成失败' } : m
            ),
          }),
        }));
      })
      .catch((err) => {
        console.error('[Chat] 视频生成失败:', err);
        set((s) => ({
          isGenerating: false,
          sessions: s.sessions.map((ss) => ss.id !== sessionId ? ss : {
            ...ss, messages: ss.messages.map((m) =>
              m.id === loadingMsg.id ? { ...m, isStreaming: false, content: `❌ 视频生成失败：${err.message}` } : m
            ),
          }),
        }));
      });
  },
}));

// ─── 两次调用：数据生成 + 用户回复 ───

const API_BASE = 'http://localhost:7779/api/v1';

/**
 * 创作请求的两次 LLM 调用流程：
 * 1. 第一次：非流式，只生成结构化 JSON 数据（剧本+角色+分镜）
 * 2. 第二次：流式，基于数据生成面向用户的回复
 */
async function runCreationPipeline(
  sessionId: string,
  aiMsgId: string,
  userMessage: string,
  provider: string,
  deepThink: boolean,
  signal: AbortSignal,
) {
  const state = useChatStore.getState();
  const skillConfig = skillToConfig[state.currentSkill] || skillToConfig['jp-school'];
  const projectTitle = extractProjectTitle(userMessage);

  // 更新加载状态
  useChatStore.setState({ pipelineStage: 'analyzing' });

  // 更新 AI 消息为加载状态
  const updateAIContent = (content: string) => {
    useChatStore.setState((s) => ({
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        return {
          ...ss,
          messages: ss.messages.map((m) =>
            m.id === aiMsgId ? { ...m, content } : m
          ),
        };
      }),
    }));
  };

  updateAIContent('');

  // ═══ 第一次调用：生成结构化数据（非流式） ═══
  const dataPrompt = `你是一个专业的漫剧/短剧编剧。风格要求：${skillConfig.prompt}

请根据以下创意，生成完整的结构化项目数据。只输出 JSON，不要其他内容。

JSON 格式：
{
  "title": "项目标题",
  "episodes": [
    {
      "number": 1,
      "title": "集标题",
      "scenes": [
        {
          "title": "场景名",
          "location": "地点",
          "time_tag": "时间（清晨/上午/下午/傍晚/夜晚等）",
          "summary": "场景摘要描述（2-3句话）"
        }
      ]
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/龙套",
      "gender": "男/女",
      "age": 18,
      "description": "角色简介",
      "personality": "性格描述",
      "personality_traits": ["特征1", "特征2"],
      "appearance": "外貌描述",
      "costume": "服装描述"
    }
  ],
  "storyboard": [
    {
      "shot_number": 1,
      "episode_number": 1,
      "scene_title": "对应场景名",
      "description": "英文镜头描述，用于AI图像生成",
      "shot_type": "全景/中景/近景/特写",
      "duration": 5,
      "camera_movement": "固定/推/拉/摇/移"
    }
  ]
}

要求：
- episodes 数量根据内容需要设定（通常 3-8 集）
- 每集 2-4 个场景
- characters 至少包含 2-3 个角色
- storyboard 至少 6-10 个镜头
- description 字段用英文（用于后续 AI 图像生成）
- 只输出 JSON，不要其他文字`;

  let structuredData: Record<string, unknown> | null = null;

  try {
    const resp = await fetch(`${API_BASE}/pipeline/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: dataPrompt },
          { role: 'user', content: userMessage },
        ],
        model: provider,
        deep_think: deepThink,
      }),
    });

    if (!resp.ok) throw new Error(`数据生成失败 (${resp.status})`);
    const data = await resp.json();
    const reply = data.reply || '';

    // 解析 JSON
    structuredData = parseJSONFromReply(reply);
    console.log('[Pipeline] 第一次调用完成, 数据:', structuredData ? '解析成功' : '解析失败');
  } catch (err) {
    console.error('[Pipeline] 第一次调用失败:', err);
    // 继续执行第二次调用，但不带数据
  }

  // 保存结构化数据到 store
  if (structuredData) {
    const scriptResult = jsonToScript(structuredData, projectTitle);
    const charResult = jsonToCharacters(structuredData);
    const shotsResult = jsonToStoryboard(structuredData);

    useChatStore.setState({
      extractedScript: { episodes: scriptResult },
      extractedCharacters: { characters: charResult },
      extractedTitle: structuredData.title as string || projectTitle,
    });

    console.log('[Pipeline] 数据已保存:', {
      episodes: scriptResult.length,
      characters: charResult.length,
      shots: shotsResult.length,
    });
  }

  // ═══ 第二次调用：生成用户可见回复（流式） ═══
  useChatStore.setState({ pipelineStage: 'replying' });

  let contextHint = '';
  if (structuredData) {
    const epCount = (structuredData.episodes as unknown[])?.length || 0;
    const charCount = (structuredData.characters as unknown[])?.length || 0;
    const shotCount = (structuredData.storyboard as unknown[])?.length || 0;
    contextHint = `\n\n[系统提示：你已经为用户生成了以下项目数据，${epCount} 集剧本、${charCount} 个角色、${shotCount} 个分镜镜头。请基于这些数据，给用户一段精炼、有感染力的项目概览回复。不要输出 JSON。]`;
  }

  const replySystemPrompt = `你是一个专业的AI漫剧/短剧创作助手。当前风格：${skillConfig.prompt}。
你可以帮助用户：生成剧本创意、设计角色、规划分镜、优化对话、描写场景。
回复要详细、专业、有创意。${contextHint}`;

  fetchStreamResponse(
    sessionId,
    aiMsgId,
    [
      { role: 'system', content: replySystemPrompt },
      { role: 'user', content: userMessage },
    ],
    provider,
    deepThink,
    signal,
    true,  // isCreationRequest = true
    projectTitle,
  );
}

// ─── JSON 解析辅助函数 ───

function parseJSONFromReply(text: string): Record<string, unknown> | null {
  // 尝试直接解析
  try { return JSON.parse(text); } catch { /* continue */ }
  // 提取 ```json ... ``` 代码块
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch { /* continue */ } }
  // 提取 { ... }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch { /* continue */ } }
  return null;
}

function jsonToScript(data: Record<string, unknown>, fallbackTitle: string) {
  const episodes = (data.episodes as unknown[]) || [];
  return episodes.map((ep: Record<string, unknown>, i: number) => ({
    id: `ep${ep.number || i + 1}`,
    number: (ep.number as number) || i + 1,
    title: (ep.title as string) || `第${i + 1}集`,
    scenes: ((ep.scenes as unknown[]) || []).map((s: Record<string, unknown>, j: number) => ({
      id: `s${j + 1}`,
      title: (s.title as string) || `场景${j + 1}`,
      summary: (s.summary as string) || '',
      location: (s.location as string) || '未指定',
      timeTag: (s.time_tag as string) || '日间',
    })),
  }));
}

function jsonToCharacters(data: Record<string, unknown>) {
  const characters = (data.characters as unknown[]) || [];
  const AVATAR_COLORS = ['#A8835F', '#5A7FA8', '#7A6B8A', '#5B8C5A', '#B85C50', '#C49A3C'];
  return characters.map((c: Record<string, unknown>, i: number) => ({
    id: `char_${i + 1}`,
    name: (c.name as string) || `角色${i + 1}`,
    role: (['主角', '配角', '龙套'].includes(c.role as string) ? c.role : i < 2 ? '主角' : '配角') as '主角' | '配角' | '龙套',
    description: (c.description as string) || '',
    gender: (c.gender as string) || '',
    age: (c.age as number) || 0,
    personality: (c.personality as string) || '',
    personalityTraits: (c.personality_traits as string[]) || [],
    appearance: (c.appearance as string) || '',
    costume: (c.costume as string) || '',
    status: 'done' as const,
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

function jsonToStoryboard(data: Record<string, unknown>) {
  const shots = (data.storyboard as unknown[]) || [];
  return shots.map((s: Record<string, unknown>, i: number) => ({
    id: `shot_${i + 1}`,
    shotNumber: (s.shot_number as number) || i + 1,
    episodeNumber: (s.episode_number as number) || 1,
    sceneTitle: (s.scene_title as string) || '',
    description: (s.description as string) || '',
    shotType: (s.shot_type as string) || '中景',
    duration: (s.duration as number) || 5,
    cameraMovement: (s.camera_movement as string) || '固定',
    status: 'done' as const,
  }));
}

// ─── Streaming fetch ───
async function fetchStreamResponse(
  sessionId: string,
  aiMsgId: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  deepThink: boolean,
  signal: AbortSignal,
  isCreationRequest: boolean = false,
  projectTitle: string = '',
) {
  const addChunk = (type: 'thinking' | 'content', data: string) => {
    useChatStore.setState((s) => ({
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        return {
          ...ss,
          messages: ss.messages.map((m) => {
            if (m.id !== aiMsgId) return m;
            if (type === 'thinking') {
              return { ...m, thinking: (m.thinking || '') + data };
            }
            return { ...m, content: m.content + data };
          }),
        };
      }),
    }));
  };

  const finishStream = () => {
    // First: mark streaming as done, 同时获取最终的 AI 回复内容
    let finalContent = '';
    useChatStore.setState((s) => {
      const session = s.sessions.find((ss) => ss.id === sessionId);
      const aiMsg = session?.messages.find((m) => m.id === aiMsgId);
      finalContent = aiMsg?.content || '';
      // 从显示内容中剥离 <pipeline_data> JSON 块
      const cleanedContent = finalContent.replace(/<pipeline_data>[\s\S]*?<\/pipeline_data>/, '').trim();
      return {
        isGenerating: false,
        pipelineStage: null,
        sessions: s.sessions.map((ss) => {
          if (ss.id !== sessionId) return ss;
          return {
            ...ss,
            messages: ss.messages.map((m) =>
              m.id === aiMsgId ? { ...m, isStreaming: false, content: cleanedContent || m.content } : m
            ),
          };
        }),
      };
    });
    currentAbortController = null;

    // Second: if creation request, inject plan card
    // 注意：结构化数据已在 runCreationPipeline 的第一次调用中提取，这里不再重复提取
    if (isCreationRequest) {
      const title = useChatStore.getState().extractedTitle || extractProjectTitle(projectTitle);

      setTimeout(() => {
        const planCardMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: title,
          type: 'plan_card',
          timestamp: (() => {
            const n = new Date();
            return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
          })(),
        };
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((ss) => {
            if (ss.id !== sessionId) return ss;
            return { ...ss, messages: [...ss.messages, planCardMsg] };
          }),
        }));
      }, 100);
    }
  };

  const setError = (errMsg: string) => {
    useChatStore.setState((s) => ({
      isGenerating: false,
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        return {
          ...ss,
          messages: ss.messages.map((m) => {
            if (m.id !== aiMsgId) return m;
            return { ...m, content: m.content || errMsg, isStreaming: false };
          }),
        };
      }),
    }));
    currentAbortController = null;
    // 出错时仍注入 plan_card（如果匹配创作请求），保证流程不中断
    if (isCreationRequest) {
      setTimeout(() => {
        const planCardMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: projectTitle,
          type: 'plan_card',
          timestamp: (() => {
            const n = new Date();
            return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
          })(),
        };
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((ss) => {
            if (ss.id !== sessionId) return ss;
            return { ...ss, messages: [...ss.messages, planCardMsg] };
          }),
        }));
      }, 100);
    }
  };

  try {
    const resp = await fetch(`${API_BASE}/pipeline/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, deep_think: deepThink, stream: true }),
      signal,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      setError(`API ${resp.status}: ${errText}`);
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      setError('无法读取响应流');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload) continue;

        try {
          const chunk = JSON.parse(payload);
          if (chunk.type === 'thinking') {
            addChunk('thinking', chunk.data);
          } else if (chunk.type === 'content') {
            addChunk('content', chunk.data);
          } else if (chunk.type === 'done') {
            // Stream complete
          } else if (chunk.type === 'error') {
            setError(chunk.data);
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    finishStream();
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === 'AbortError') {
      // 用户取消，cancelGeneration 已处理状态和 plan_card 注入
      return;
    }
    setError(`请求失败：${error.message}。请检查后端是否已启动（http://localhost:7779）`);
  }
}
