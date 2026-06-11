import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, RefreshCw, Check, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp?: number;
}

const quickActions = [
  { label: '续写', prompt: '请帮我续写当前段落' },
  { label: '改写', prompt: '请帮我改写以下内容' },
  { label: '生成对话', prompt: '为场景生成角色对话' },
  { label: '优化场景', prompt: '优化当前场景描述' },
];

const mockAIResponses: Record<string, string> = {
  '续写': '【续写内容】\n\n她站在窗前，望着远处渐渐消失的背影。秋风卷起落叶，在空中打着旋儿，像是离别时那句没说出口的话。\n\n「也许，下一次见面...」她喃喃自语，声音轻得几乎被风吹散。\n\n手机突然震动，屏幕上跳出一条消息：「等我回来。」\n\n她的嘴角不自觉地上扬，眼眶却红了。',
  '改写': '【改写后】\n\n夕阳西下，将整个校园染成温暖的橘红色。两个身影并肩走在银杏大道上，落叶在脚下发出细碎的声响。\n\n「其实...我有话想对你说。"男生停下脚步，深吸一口气，"从开学第一天起，我就注意到你了。"\n\n女生微微一怔，随后轻轻笑了：「笨蛋，你终于说出来了。」',
  '生成对话': '【角色对话】\n\n小明：（紧张地挠头）"那个...你今天晚上有空吗？"\n\n小红：（疑惑）"怎么了？有事吗？"\n\n小明：（鼓起勇气）"学校后门的樱花开了，我想...想请你去看看。"\n\n小红：（轻笑）"就这？我还以为你要说什么呢。"\n\n小明：（失落）"啊...你要是不想去也没关系的..."\n\n小红：（转身）"笨蛋，走吧。再不去天都要黑了。"',
  '优化场景': '【优化后场景】\n\n【场景：废弃医院·雨夜·内景】\n\n闪电划破漆黑的夜空，瞬间照亮了走廊尽头那个模糊的身影。雷声轰隆而至，震得窗玻璃嗡嗡作响。\n\n水滴从天花板的裂缝中落下，在积水的地面上敲出诡异的节奏。墙上剥落的油漆像一张张扭曲的人脸，在忽明忽暗的应急灯下若隐若现。\n\n主角握紧手中的手电筒，光束在黑暗中颤抖着扫过那些紧闭的病房门。每一扇门后，似乎都藏着不可告人的秘密...',
};

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: '你好！我是你的AI创作助手。我可以帮你续写剧本、改写对话、生成场景描述等。有什么我可以帮你的吗？',
    timestamp: Date.now() - 3600000,
  },
  {
    id: '2',
    role: 'user',
    content: '帮我续写第三集结尾部分，主角在雨中告白的场景',
    timestamp: Date.now() - 3000000,
  },
  {
    id: '3',
    role: 'ai',
    content: '好的，我来帮你续写这个场景。以下是第三集结尾——雨中告白的续写内容：\n\n【场景：校园操场·雨夜】\n\n小明站在雨中，任由雨水打湿校服。他深吸一口气，望着面前的小红。\n\n小明：（颤抖着声音）"小红，我有话想对你说。从第一次见到你的那天起，我的心就..."\n\n一道闪电划破夜空，小明的声音被雷鸣淹没。但小红却听得清清楚楚，她的眼眶渐渐湿润。',
    timestamp: Date.now() - 2400000,
  },
];

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addUserMessage = useCallback((content: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
  }, []);

  const addAIMessage = useCallback((content: string) => {
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, aiMsg]);
  }, []);

  const simulateAIResponse = useCallback(
    (actionLabel?: string) => {
      setIsTyping(true);
      const delay = 1500 + Math.random() * 1000;

      setTimeout(() => {
        setIsTyping(false);
        let response = '';
        if (actionLabel && mockAIResponses[actionLabel]) {
          response = mockAIResponses[actionLabel];
        } else {
          response =
            '收到！我已经处理了你的请求。这是一段基于上下文的AI生成内容，你可以点击「接受」将其应用到剧本中，或点击「重试」获取不同版本。';
        }
        addAIMessage(response);
      }, delay);
    },
    [addAIMessage]
  );

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const content = input.trim();
    addUserMessage(content);
    setInput('');
    simulateAIResponse();
  }, [input, addUserMessage, simulateAIResponse]);

  const handleQuickAction = useCallback(
    (action: (typeof quickActions)[0]) => {
      if (isTyping || activeAction) return;
      setActiveAction(action.label);
      addUserMessage(action.prompt);

      // Simulate loading then AI response
      setTimeout(() => {
        setIsTyping(true);
      }, 300);

      setTimeout(() => {
        setIsTyping(false);
        setActiveAction(null);
        addAIMessage(mockAIResponses[action.label]);
      }, 2000);
    },
    [isTyping, activeAction, addUserMessage, addAIMessage]
  );

  const handleAccept = useCallback((_msgId: string) => {
    toast.success('已接受AI建议，内容已应用到剧本');
  }, []);

  const handleRetry = useCallback(
    (_msgId: string) => {
      toast.loading('正在重新生成...');
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        toast.success('已生成新版本');
        addAIMessage('【重新生成版本】\n\n这是根据你的反馈重新生成的内容。相比上一版，这段内容在情感表达和场景描写上做了调整，希望能更符合你的创作意图。\n\n你可以继续调整或告诉我更多具体要求。');
      }, 1500);
    },
    [addAIMessage]
  );

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  }, []);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-80 h-full bg-[#F8F7F6] border-l border-[#DEDBD8] flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#DEDBD8] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#A8835F] flex items-center justify-center">
            <Bot size={15} className="text-white" />
          </div>
          <span className="text-small font-medium text-[#383431]">AI助手</span>
          {isTyping && (
            <span className="px-1.5 py-0.5 bg-[#F0F3F7] text-[#5A7FA8] text-[10px] rounded-full animate-pulse">
              思考中
            </span>
          )}
        </div>
        <button
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#A8A39E] transition-colors"
          onClick={() => toast.info('AI助手已最小化')}
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2.5 border-b border-[#DEDBD8] shrink-0">
        <div className="grid grid-cols-2 gap-1.5">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              onClick={() => handleQuickAction(action)}
              disabled={isTyping || !!activeAction}
              whileTap={{ scale: 0.95 }}
              className={`px-2.5 py-1.5 rounded-md border text-caption text-[#6E6862] transition-all text-left relative overflow-hidden ${
                activeAction === action.label
                  ? 'border-[#5A7FA8] bg-[#F0F3F7] text-[#5A7FA8]'
                  : 'border-[#EAD8C8] hover:bg-[#F5EDE6] hover:text-[#755235]'
              } ${isTyping || activeAction ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {activeAction === action.label && (
                <motion.div
                  className="absolute inset-0 bg-[#5A7FA8]/10"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              )}
              <span className="relative z-10">
                {activeAction === action.label ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" />
                    {action.label}中...
                  </span>
                ) : (
                  action.label
                )}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[90%] px-3.5 py-2.5 rounded-xl text-small whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-[#FBF7F4] text-[#383431] rounded-br-sm'
                  : 'bg-white text-[#383431] rounded-bl-sm shadow-sm border border-[#EFEDEB]'
              )}
            >
              <p>{msg.content}</p>
              {msg.timestamp && (
                <p className="text-[10px] text-[#A8A39E] mt-1.5 text-right">
                  {formatTime(msg.timestamp)}
                </p>
              )}
              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F8F7F6]">
                  <button
                    onClick={() => handleAccept(msg.id)}
                    className="flex items-center gap-1 text-[#A8A39E] hover:text-[#5B8C5A] transition-colors text-[11px] px-1.5 py-0.5 rounded hover:bg-[#F0F5F0]"
                    title="接受"
                  >
                    <Check size={12} /> 接受
                  </button>
                  <button
                    onClick={() => handleRetry(msg.id)}
                    className="flex items-center gap-1 text-[#A8A39E] hover:text-[#A8835F] transition-colors text-[11px] px-1.5 py-0.5 rounded hover:bg-[#FBF7F4]"
                    title="重试"
                  >
                    <RefreshCw size={12} /> 重试
                  </button>
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="flex items-center gap-1 text-[#A8A39E] hover:text-[#5A7FA8] transition-colors text-[11px] px-1.5 py-0.5 rounded hover:bg-[#F0F3F7]"
                    title="复制"
                  >
                    <Copy size={12} /> 复制
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-xl rounded-bl-sm shadow-sm border border-[#EFEDEB] px-3.5 py-3">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#A8835F]"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut', delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#A8835F]"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut', delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#A8835F]"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut', delay: 0.4 }}
                  />
                  <span className="text-[11px] text-[#A8A39E] ml-1">AI思考中...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#DEDBD8] shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入指令..."
            rows={2}
            disabled={isTyping}
            className="flex-1 resize-none bg-white rounded-lg border border-[#DEDBD8] px-3 py-2 text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all disabled:opacity-50"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg bg-[#A8835F] hover:bg-[#8E6A48] disabled:bg-[#DEDBD8] disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {isTyping ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Send size={14} className="text-white" />
            )}
          </motion.button>
        </div>
        <p className="text-[11px] text-[#A8A39E] mt-1.5 text-center">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
