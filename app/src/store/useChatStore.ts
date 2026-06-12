import { create } from 'zustand';
import {
  extractScriptFromReply,
  extractCharactersFromReply,
  extractProjectTitle,
} from '@/lib/pipeline-data-extractor';
import type { ScriptData, CharacterData } from '@/store/usePipelineStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;       // AI 思考过程
  timestamp: string;
  model?: string;
  isStreaming?: boolean;    // 是否正在流式输出中
  type?: 'text' | 'plan_card';  // 消息类型
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
const API_BASE = 'http://localhost:7778/api/v1';

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
回复要详细、专业、有创意。如果用户要求生成完整剧本或制作漫剧，请给出结构化的内容。`;

    const abortController = new AbortController();
    currentAbortController = abortController;

    // Pre-compute whether this is a creation request
    const isCreationReq = CREATION_KEYWORDS.some((kw) => content.trim().includes(kw));

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
      isCreationReq,
      content.trim().slice(0, 20),
    );
  },

  cancelGeneration: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set((s) => {
      const sessionId = s.currentSessionId;
      if (!sessionId) return { isGenerating: false };
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
}));

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
      return {
        isGenerating: false,
        sessions: s.sessions.map((ss) => {
          if (ss.id !== sessionId) return ss;
          return {
            ...ss,
            messages: ss.messages.map((m) =>
              m.id === aiMsgId ? { ...m, isStreaming: false } : m
            ),
          };
        }),
      };
    });
    currentAbortController = null;

    // Second: if creation request, inject plan card (separate setState to avoid race)
    if (isCreationRequest) {
      // 从 AI 回复中提取结构化数据
      const title = extractProjectTitle(projectTitle);
      const scriptData = extractScriptFromReply(finalContent, title);
      const charList = extractCharactersFromReply(finalContent);

      console.error('[Pipeline] Extracted data:', {
        title,
        contentLength: finalContent.length,
        episodesCount: scriptData.episodes.length,
        episodes: scriptData.episodes.map(ep => ({ num: ep.number, title: ep.title, scenes: ep.scenes.length })),
        charactersCount: charList.length,
        characters: charList.map(c => c.name),
      });

      // 更新 store 中的提取数据
      useChatStore.setState({
        extractedScript: { episodes: scriptData.episodes },
        extractedCharacters: { characters: charList },
        extractedTitle: title,
      });

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
    setError(`请求失败：${error.message}。请检查后端是否已启动（http://localhost:7778）`);
  }
}
