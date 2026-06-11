import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;       // AI 思考过程
  timestamp: string;
  model?: string;
  isStreaming?: boolean;    // 是否正在流式输出中
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
const API_BASE = 'http://localhost:8001/api/v1';

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

  createSession: () => string;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  cancelGeneration: () => void;
  setModel: (model: string) => void;
  setSkill: (skill: string) => void;
  setDeepThink: (v: boolean) => void;
  getCurrentSession: () => ChatSession | null;
}

const defaultModel = 'mimo';
const defaultSkill = 'jp-school';

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  currentModel: defaultModel,
  currentSkill: defaultSkill,
  isGenerating: false,
  deepThink: false,

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
  },

  cancelGeneration: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set((s) => {
      const sessionId = s.currentSessionId;
      if (!sessionId) return { isGenerating: false };
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
}));

// ─── Streaming fetch ───
async function fetchStreamResponse(
  sessionId: string,
  aiMsgId: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  deepThink: boolean,
  signal: AbortSignal,
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
    useChatStore.setState((s) => ({
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
    }));
    currentAbortController = null;
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
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled, already handled by cancelGeneration
      return;
    }
    setError(`请求失败：${err.message}。请检查后端是否已启动（http://localhost:8001）`);
  }
}
