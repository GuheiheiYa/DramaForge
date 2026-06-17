import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  extractProjectTitle,
} from '@/lib/pipeline-data-extractor';
import type { ScriptData, CharacterData, StoryboardData } from '@/store/usePipelineStore';
import { generateVideo, generateImage } from '@/lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;       // AI 思考过程
  timestamp: string;
  model?: string;
  isStreaming?: boolean;    // 是否正在流式输出中
  type?: 'text' | 'plan_confirm_card' | 'plan_card' | 'image' | 'video' | 'progress_update' | 'step_complete' | 'error_card' | 'pipeline_complete';
  imageUrl?: string;       // 图片 URL（type=image 时使用）
  videoUrl?: string;       // 视频 URL（type=video 时使用）
  pipelineStep?: number;
  pipelineError?: { message: string; retryable: boolean };
  resolved?: boolean;
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
import { API_BASE } from '@/lib/config';

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
  pipelineStage: 'analyzing' | 'replying' | null;
  creativePlanText: string | null;
  planConfirmed: boolean;
  lastCreationUserMessage: string;
  // Pipeline 相关 — 保留字段供其他页面兼容
  extractedScript: ScriptData | null;
  extractedCharacters: CharacterData | null;
  extractedStoryboard: StoryboardData | null;
  extractedTitle: string;

  createSession: () => string;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  cancelGeneration: () => void;
  setModel: (model: string) => void;
  setSkill: (skill: string) => void;
  setDeepThink: (v: boolean) => void;
  confirmPlan: () => void;
  regeneratePlan: () => void;
  getCurrentSession: () => ChatSession | null;
  updateExtractedData: (data: { script?: ScriptData; characters?: CharacterData; storyboard?: StoryboardData; title?: string }) => void;
  addPipelineMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updatePipelineProgressMessage: (sessionId: string, step: number, content: string) => void;
  resolvePipelineErrorMessage: (sessionId: string, step: number) => void;
  generateImageInChat: (prompt: string, imageUrl?: string) => void;
  generateVideoInChat: (prompt: string, imageUrl?: string) => void;
}

const defaultModel = 'mimo';
const defaultSkill = 'jp-school';

// Keywords that indicate a creation request
const CREATION_KEYWORDS = ['帮我做', '帮我生成', '帮我创作', '做一个', '生成一个', '创作一个', '制作', '漫剧', '短剧', '剧本'];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  sessions: [],
  currentSessionId: null,
  currentModel: defaultModel,
  currentSkill: defaultSkill,
  isGenerating: false,
  deepThink: false,
  pipelineStage: null,
  creativePlanText: null,
  planConfirmed: false,
  lastCreationUserMessage: '',
  extractedScript: null,
  extractedCharacters: null,
  extractedStoryboard: null,
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
      runCreationPipeline(sessionId, aiMsgId, content.trim(), provider, state.deepThink, abortController.signal);
    } else {
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

  confirmPlan: () => {
    const state = get();
    if (!state.creativePlanText || !state.currentSessionId || state.planConfirmed) return;

    const title =
      extractProjectTitle(state.creativePlanText) ||
      extractProjectTitle(state.lastCreationUserMessage) ||
      '创作项目';

    const sessionId = state.currentSessionId;
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

    set({
      planConfirmed: true,
      extractedTitle: title,
      sessions: get().sessions.map((ss) =>
        ss.id === sessionId ? { ...ss, messages: [...ss.messages, planCardMsg] } : ss
      ),
    });
  },

  regeneratePlan: () => {
    const state = get();
    if (!state.lastCreationUserMessage || !state.currentSessionId || state.isGenerating) return;

    const sessionId = state.currentSessionId;
    const provider = modelToProvider[state.currentModel] || 'mimo';
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const aiMsgId = generateId();

    const aiPlaceholder: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      thinking: '',
      timestamp: timeStr,
      isStreaming: true,
    };

    const abortController = new AbortController();
    currentAbortController = abortController;

    set({
      isGenerating: true,
      planConfirmed: false,
      creativePlanText: null,
      pipelineStage: 'replying',
      sessions: state.sessions.map((ss) =>
        ss.id === sessionId
          ? { ...ss, messages: [...ss.messages, aiPlaceholder], updatedAt: timeStr }
          : ss
      ),
    });

    runCreationPipeline(
      sessionId,
      aiMsgId,
      state.lastCreationUserMessage,
      provider,
      state.deepThink,
      abortController.signal,
      false,
    );
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
      extractedStoryboard: data.storyboard ?? s.extractedStoryboard,
      extractedTitle: data.title ?? s.extractedTitle,
    }));
  },

  addPipelineMessage: (sessionId, message) => {
    const timeStr = (() => {
      const n = new Date();
      return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
    })();
    const msg: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: timeStr,
      role: message.role ?? 'assistant',
      content: message.content ?? '',
    };
    set((s) => ({
      sessions: s.sessions.map((ss) =>
        ss.id === sessionId ? { ...ss, messages: [...ss.messages, msg] } : ss
      ),
    }));
  },

  updatePipelineProgressMessage: (sessionId, step, content) => {
    set((s) => ({
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        const existingIdx = ss.messages.findIndex(
          (m) => m.type === 'progress_update' && m.pipelineStep === step
        );
        if (existingIdx >= 0) {
          const messages = [...ss.messages];
          messages[existingIdx] = { ...messages[existingIdx], content };
          return { ...ss, messages };
        }
        const msg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'progress_update',
          pipelineStep: step,
          content,
          timestamp: (() => {
            const n = new Date();
            return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
          })(),
        };
        return { ...ss, messages: [...ss.messages, msg] };
      }),
    }));
  },

  // ─── 图片生成 ───
  resolvePipelineErrorMessage: (sessionId, step) => {
    if (!sessionId) return;
    set((s) => ({
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        return {
          ...ss,
          messages: ss.messages.map((m) =>
            m.type === 'error_card' && m.pipelineStep === step && !m.resolved
              ? { ...m, resolved: true }
              : m
          ),
        };
      }),
    }));
  },

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
    }),
    {
      name: 'dramaforge-chat-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.map((session) => ({
          ...session,
          messages: session.messages.map((message) => ({
            ...message,
            isStreaming: false,
          })),
        })),
        currentSessionId: state.currentSessionId,
        currentModel: state.currentModel,
        currentSkill: state.currentSkill,
      }),
    },
  ),
);

// ─── 创作方案流式生成 ───

/**
 * 创作请求：单次流式生成人类可读创作方案，用户确认后再启动 Pipeline 详细生成。
 */
async function runCreationPipeline(
  sessionId: string,
  aiMsgId: string,
  userMessage: string,
  provider: string,
  deepThink: boolean,
  signal: AbortSignal,
  resetContext = true,
) {
  const state = useChatStore.getState();
  const skillConfig = skillToConfig[state.currentSkill] || skillToConfig['jp-school'];
  const projectTitle = extractProjectTitle(userMessage);

  if (resetContext) {
    useChatStore.setState({
      pipelineStage: 'replying',
      lastCreationUserMessage: userMessage,
      planConfirmed: false,
      creativePlanText: null,
      extractedScript: null,
      extractedCharacters: null,
      extractedStoryboard: null,
      extractedTitle: '',
    });
  } else {
    useChatStore.setState({ pipelineStage: 'replying' });
  }

  const planSystemPrompt = `你是一个专业的AI漫剧/短剧创作助手。当前风格：${skillConfig.prompt}。

请根据用户的创意，输出一份**人类可读的创作方案**（使用 Markdown 格式），包含：
1. **项目标题**
2. **故事梗概**（2-4 段）
3. **分集规划**（每集 1-2 句概要，通常 3-8 集）
4. **主要角色**（每个角色：姓名、身份、性格特点）
5. **视觉风格**（画面基调、色调、参考风格）
6. **关键场景**（3-5 个代表性场景描述）

要求：
- 内容要有创意、专业、有感染力
- **不要输出 JSON**，不要使用代码块包裹整份方案
- 这是供用户审阅确认的方向性方案，详细剧本/分镜将在用户确认后由制作流程生成`;

  fetchStreamResponse(
    sessionId,
    aiMsgId,
    [
      { role: 'system', content: planSystemPrompt },
      { role: 'user', content: userMessage },
    ],
    provider,
    deepThink,
    signal,
    true,
    projectTitle,
  );
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
      finalContent = cleanedContent;
      return {
        isGenerating: false,
        pipelineStage: null,
        creativePlanText: cleanedContent || null,
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

    // 创作请求完成后注入方案确认卡片
    if (isCreationRequest && finalContent.trim()) {
      const title =
        extractProjectTitle(finalContent) ||
        extractProjectTitle(projectTitle) ||
        '创作项目';

      setTimeout(() => {
        const confirmCardMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: title,
          type: 'plan_confirm_card',
          timestamp: (() => {
            const n = new Date();
            return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
          })(),
        };
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((ss) => {
            if (ss.id !== sessionId) return ss;
            return { ...ss, messages: [...ss.messages, confirmCardMsg] };
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
  };

  try {
    const resp = await fetch(`${API_BASE}/pipeline/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, deep_think: deepThink, max_tokens: 8192, stream: true }),
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
    setError(`请求失败：${error.message}。请检查后端是否已启动（${API_BASE.replace('/api/v1', '')}）`);
  }
}
