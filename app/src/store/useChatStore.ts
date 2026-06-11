import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
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

// Mock AI responses for different message types
const mockAIResponses = [
  '好的，我来帮你生成这个创意。以下是一个基于你描述的故事框架：\n\n## 故事大纲\n在一个普通的高中校园里，转学生小雨拥有一个秘密——她可以通过触碰他人看到他们的记忆碎片。当她发现班上最受欢迎的男生背后隐藏着一个惊人的秘密时，她决定揭开真相...\n\n## 核心冲突\n- 主角的超能力与道德困境\n- 表面完美的校园生活 vs 隐藏的真相\n\n需要我继续细化某个部分吗？',
  '这是一个不错的创意方向！我来帮你扩展一下角色设定：\n\n## 主角：林小雨\n- 性格：内向但正义感强\n- 特长：绘画、记忆读取\n- 成长弧线：从逃避能力到接受并利用它帮助他人\n\n## 配角：陈明\n- 表面：阳光学霸\n- 秘密：家庭变故导致他不得不...\n\n要我继续生成完整剧本吗？',
  '我建议从以下几个角度来优化这段剧情：\n\n1. **增加悬念**：在开场加入一个小的神秘事件\n2. **丰富对话**：让角色间的对话更有层次感\n3. **视觉化描写**：用更具体的画面感语言替代抽象描述\n\n具体修改如下：\n\n> 「窗外的雨不停地下，教室里的气氛却比天气还要沉闷。黑板上密密麻麻的公式像是一道道锁链，将每个人的注意力牢牢禁锢。」',
  '根据你选择的「日式校园漫剧」SKILL，我推荐以下分镜方案：\n\n**第1幕：转学第一天**\n- 分镜1：校园全景，樱花飘落（远景）\n- 分镜2：主角站在教室门口（中景）\n- 分镜3：全班同学转头看向她（特写）\n- 分镜4：主角深呼吸，迈出第一步（近景）\n\n这样开篇可以快速建立氛围，你觉得如何？',
  '关于你提到的角色一致性，这里有几个实用技巧：\n\n1. **角色设定表**：在开始创作前，先完善角色的外貌、性格、习惯等细节\n2. **参考图管理**：为每个角色保存多角度参考图\n3. **提示词模板**：在每次生成时复用相同的人物描述\n\n目前即梦AI的「角色ID」功能可以很好地解决这个问题，你可以在角色管理台中先上传角色设计图。',
];

function generateId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function mockAIStream(content: string, sessionId: string, addMessage: (sessionId: string, msg: ChatMessage) => void, setGenerating: (v: boolean) => void) {
  setGenerating(true);
  const delay = 1500 + Math.random() * 2000;
  setTimeout(() => {
    const response = mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const aiMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: timeStr,
    };
    addMessage(sessionId, aiMsg);
    setGenerating(false);
  }, delay);
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentModel: string;
  currentSkill: string;
  isGenerating: boolean;

  createSession: () => string;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  setModel: (model: string) => void;
  setSkill: (skill: string) => void;
  getCurrentSession: () => ChatSession | null;
}

const defaultModel = 'mimo';
const defaultSkill = 'jp-school';

const API_BASE = 'http://localhost:8001/api/v1';

// Map frontend model IDs to backend provider names
const modelToProvider: Record<string, string> = {
  'mimo': 'mimo',
  'deepseek-v3': 'deepseek',
  'claude-4': 'deepseek',  // fallback
  'gpt-5': 'deepseek',     // fallback
  'kimi': 'deepseek',      // fallback
  'gemini': 'deepseek',    // fallback
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

async function fetchAIResponse(content: string, modelId: string, skillId: string): Promise<string> {
  const provider = modelToProvider[modelId] || 'mimo';
  const skillConfig = skillToConfig[skillId] || skillToConfig['jp-school'];

  const systemPrompt = `你是一个专业的AI漫剧/短剧创作助手。当前风格：${skillConfig.prompt}。
你可以帮助用户：生成剧本创意、设计角色、规划分镜、优化对话、描写场景。
回复要详细、专业、有创意。如果用户要求生成完整剧本或制作漫剧，请给出结构化的内容。`;

  const resp = await fetch(`${API_BASE}/pipeline/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      model: provider,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.reply || data.message || JSON.stringify(data);
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  currentModel: defaultModel,
  currentSkill: defaultSkill,
  isGenerating: false,

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
    // Auto-create session if none exists
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

    // Update session title from first message
    const session = get().sessions.find((s) => s.id === sessionId);
    const isFirstMessage = session && session.messages.length === 0;

    set((s) => ({
      sessions: s.sessions.map((ss) => {
        if (ss.id !== sessionId) return ss;
        return {
          ...ss,
          title: isFirstMessage ? content.trim().slice(0, 30) + (content.trim().length > 30 ? '...' : '') : ss.title,
          messages: [...ss.messages, userMsg],
          updatedAt: timeStr,
          model: s.currentModel,
          skill: s.currentSkill,
        };
      }),
    }));

    // Call real AI API
    set({ isGenerating: true });
    fetchAIResponse(content.trim(), state.currentModel, state.currentSkill)
      .then((response) => {
        const now2 = new Date();
        const timeStr2 = `${now2.getHours().toString().padStart(2, '0')}:${now2.getMinutes().toString().padStart(2, '0')}`;
        const aiMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response,
          timestamp: timeStr2,
        };
        set((s) => ({
          isGenerating: false,
          sessions: s.sessions.map((ss) => {
            if (ss.id !== sessionId) return ss;
            return { ...ss, messages: [...ss.messages, aiMsg] };
          }),
        }));
      })
      .catch((err) => {
        const now2 = new Date();
        const timeStr2 = `${now2.getHours().toString().padStart(2, '0')}:${now2.getMinutes().toString().padStart(2, '0')}`;
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `请求失败：${err.message}\n\n请检查后端是否已启动（http://localhost:8001）`,
          timestamp: timeStr2,
        };
        set((s) => ({
          isGenerating: false,
          sessions: s.sessions.map((ss) => {
            if (ss.id !== sessionId) return ss;
            return { ...ss, messages: [...ss.messages, errMsg] };
          }),
        }));
      });
  },

  setModel: (model) => set({ currentModel: model }),
  setSkill: (skill) => set({ currentSkill: skill }),

  getCurrentSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.currentSessionId) ?? null;
  },
}));
