import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ChevronRight,
  RefreshCw,
  Check,
  Copy,
  Sparkles,
  PenLine,
  MessageSquare,
  Clapperboard,
  Film,
  Search,
  CornerDownLeft,
  Loader2,
  Type,
  Languages,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, MSG } from '@/hooks/useToast';
import type { ScriptBlock, ScriptBlockType } from './types';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  suggestions?: string[];
  isContinuation?: boolean;
  rewriteMode?: string;
}

const quickActions = [
  { label: '续写', icon: <Sparkles size={14} />, description: '从光标位置继续生成' },
  { label: '改写', icon: <PenLine size={14} />, description: '重写选中段落' },
  { label: '生成对话', icon: <MessageSquare size={14} />, description: '为场景生成对话' },
  { label: '优化场景', icon: <Clapperboard size={14} />, description: '增强画面感和节奏' },
  { label: '补全分镜', icon: <Film size={14} />, description: '根据剧本生成分镜' },
  { label: '检查逻辑', icon: <Search size={14} />, description: '检查剧本逻辑一致性' },
];

const rewriteSubOptions = [
  { label: '改对话风格', icon: <Languages size={14} /> },
  { label: '改场景描述', icon: <Type size={14} /> },
  { label: '简化内容', icon: <Minimize2 size={14} /> },
  { label: '扩充内容', icon: <Maximize2 size={14} /> },
];

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'ai',
  content: '你好！我是你的AI剧本助手。我可以帮你：\n\n• ✦ 续写 — 从当前位置继续创作\n• ✎ 改写 — 优化选中段落的表达\n• 💬 生成对话 — 为场景添加角色对话\n• 🎬 优化场景 — 增强画面感和节奏\n\n随时选中编辑器中的文字，我会针对性地提供帮助。',
};

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: '帮我续写第三集结尾部分，林晓在全班面前勇敢反击苏雨之后的情节',
  },
  {
    id: '2',
    role: 'ai',
    content: '好的，我来帮你续写这个高潮场景。以下是林晓反击后的剧情发展：\n\n【角色：苏雨】（情绪：恼羞成怒）\n\n苏雨：你……你胡说！谁喜欢江辰了！\n\n<动作：苏雨的脸涨得通红，她用力拍了一下桌子，但眼神却不由自主地飘向江辰>\n\n「音效：教室里响起窃窃私语声」\n\n【角色：陈老师】（情绪：威严制止）\n\n陈老师：够了！苏雨，放学后到我办公室来一趟。林晓，你跟我来一下。\n\n<动作：陈老师转身走出教室，背影中透着一丝疲惫>\n\n「音效：下课铃声响起」\n\n--- 转场 ---',
    suggestions: ['建议增加林晓的内心独白', '可以加入同学对林晓态度的转变'],
  },
  {
    id: '3',
    role: 'user',
    content: '建议增加林晓的内心独白',
  },
  {
    id: '4',
    role: 'ai',
    content: '【角色：林晓】（情绪：释然但迷茫）\n\n林晓：（独白）终于说出口了……我以为我会很开心，但为什么心里还是空落落的？苏雨其实也很可怜，用那么强硬的方式去喜欢一个人。只是，她选错了方式。\n\n<动作：林晓轻轻叹了口气，望向窗外的樱花树，阳光透过花瓣洒在她的脸上>\n\n也许……勇敢不是不害怕，而是害怕的时候依然去做对的事。',
  },
];

interface AIScriptPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAIAction?: (action: string) => void;
  onBlocksChange?: (blocks: ScriptBlock[]) => void;
  blocks?: ScriptBlock[];
  selectedBlockId?: string | null;
}

export default function AIScriptPanel({
  collapsed,
  onToggleCollapse,
  onAIAction,
  onBlocksChange,
  blocks = [],
  selectedBlockId,
}: AIScriptPanelProps) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage, ...mockMessages]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, info } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const generateAIResponse = useCallback((userContent: string, mode?: string): Message => {
    const responses: Record<string, string> = {
      续写: `【角色：林晓】（情绪：释然但迷茫）

林晓：（独白）终于说出口了……我以为我会很开心，但为什么心里还是空落落的？

<动作：林晓轻轻叹了口气，望向窗外的樱花树>

「音效：远处传来鸟鸣声」

【角色：江辰】（情绪：温柔关心）

江辰：你还好吗？刚才真的很勇敢。

--- 转场 ---`,
      改写: `已为你改写选中段落，优化了对话节奏和画面描述：

【角色：苏雨】（情绪：恼羞成怒、语气尖锐）

苏雨：你……你少在这里装无辜！

<动作：苏雨猛地站起身，椅子被带倒在地，发出刺耳的声响>

「音效：教室瞬间安静下来，所有人的目光都聚焦过来」`,
      生成对话: `【角色：陈老师】（情绪：严肃但不失温和）

陈老师：林晓，你今天做得对。勇敢不是不害怕，而是害怕的时候依然选择做对的事。

【角色：林晓】（情绪：眼眶微红）

林晓：老师……谢谢您。我只是不想再沉默了。

【角色：陈老师】

陈老师：走吧，我送你出校门。今天的晚霞很美。`,
      优化场景: `优化后的场景描写：

<动作：夕阳的金色光芒穿透教室的玻璃窗，在地板上投下长长的影子。林晓站在讲台前，小小的身影被拉得很长很长，像一株在风中挺立的小树>

「音效：远处传来若有若无的钢琴声，悠扬而忧伤」

【角色：林晓】（情绪：平静中带着坚定）

林晓：（独白）这一刻，我突然明白。樱花之所以美丽，不是因为它永远不会凋零，而是在凋零之前，它曾经那样热烈地盛开过。`,
      补全分镜: `分镜建议：

1. 【全景】教室内部，夕阳从窗户斜射进来
2. 【中景】林晓站在讲台前，双手微微握拳
3. 【特写】林晓的眼睛，眼神从犹豫到坚定
4. 【近景】苏雨愤怒的表情
5. 【全景】全班同学的反应，有人惊讶有人鼓掌
6. 【特写】窗外的樱花树，花瓣飘落`,
      检查逻辑: `剧本逻辑检查结果：

✓ 林晓的性格转变有合理铺垫（从内向到勇敢）
✓ 苏雨的反派动机充分（嫉妒、占有欲）
✓ 时间线连贯

⚠ 建议改进：
• 第二集林晓和江辰的感情发展速度可以稍缓
• 可以增加苏雨 softer 的一面，让角色更立体`,
    };

    const content = responses[mode || '续写'] || `收到！我来帮你处理「${userContent}」。

根据当前剧本的情节走向和角色设定，我为你生成了以下内容。这些内容保持了角色性格的一致性，同时在情感表达上做了深化处理。

【角色：林晓】（情绪：温柔坚定）

林晓：我想……每个人心里都有一片樱花林。有的花开得早，有的花开得晚，但总有一天，所有的花都会开的。

<动作：林晓微微一笑，转身走向教室门口，阳光洒在她的背影上>

「音效：风铃轻轻作响」`;

    return {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content,
      suggestions: mode === '续写' ? ['增加环境描写', '深化角色互动'] : undefined,
    };
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    setTimeout(() => {
      const aiMsg = generateAIResponse(input);
      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
      // Generated blocks tracked
    }, 1500);
  }, [input, generateAIResponse]);

  const handleQuickAction = useCallback((label: string) => {
    if (label === '改写') {
      setShowRewriteMenu(!showRewriteMenu);
      return;
    }
    setShowRewriteMenu(false);
    if (onAIAction) onAIAction(label);

    const actionMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `【快捷操作】${label}`,
    };
    setMessages((prev) => [...prev, actionMsg]);
    setIsGenerating(true);

    setTimeout(() => {
      const aiMsg = generateAIResponse('', label);
      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
      // Generated blocks tracked
    }, 1200);
  }, [onAIAction, generateAIResponse, showRewriteMenu]);

  const handleRewriteSubAction = useCallback((subLabel: string) => {
    setShowRewriteMenu(false);
    if (onAIAction) onAIAction(`改写-${subLabel}`);

    const actionMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `【改写】${subLabel}`,
    };
    setMessages((prev) => [...prev, actionMsg]);
    setIsGenerating(true);

    setTimeout(() => {
      const aiMsg = generateAIResponse('', '改写');
      setMessages((prev) => [...prev, { ...aiMsg, rewriteMode: subLabel }]);
      setIsGenerating(false);
    }, 1000);
  }, [onAIAction, generateAIResponse]);

  const handleAccept = useCallback((msgContent: string) => {
    // Parse AI content into blocks and add to editor
    if (onBlocksChange && blocks) {
      const lines = msgContent.split('\n').filter((l) => l.trim());
      const newBlocks: ScriptBlock[] = [];
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let type: ScriptBlockType = 'narration';
        if (trimmed.startsWith('【角色：')) type = 'character';
        else if (trimmed.startsWith('（情绪：')) type = 'emotion';
        else if (trimmed.startsWith('<动作：')) type = 'action';
        else if (trimmed.startsWith('「音效：')) type = 'sound';
        else if (trimmed.startsWith('[场景：')) type = 'scene';
        else if (trimmed.includes('--- 转场 ---')) type = 'transition';
        else if (trimmed.match(/^.+：/)) type = 'dialogue';

        newBlocks.push({
          id: `ai-block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          content: trimmed,
          sceneId: selectedBlockId
            ? blocks.find((b) => b.id === selectedBlockId)?.sceneId
            : undefined,
        });
      });

      if (newBlocks.length > 0) {
        const updatedBlocks = [...blocks, ...newBlocks];
        onBlocksChange(updatedBlocks);
        success('AI生成内容已添加到编辑器');
      }
    }
  }, [onBlocksChange, blocks, selectedBlockId, success]);

  const handleRetry = useCallback((msgId: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      const newContent = generateAIResponse('重试');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content: newContent.content + '\n\n【已重新生成】' } : m
        )
      );
      setIsGenerating(false);
      info('已重新生成');
    }, 1200);
  }, [generateAIResponse, info]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
    success(MSG.copied);
  }, [success]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: suggestion,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `收到！关于「${suggestion}」，我来为你详细分析……\n\n建议在当前场景中增加一些细节描写，让冲突更加立体。比如可以在对话之间加入更多的动作和表情变化，让读者更容易代入情境。`,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 1200);
  }, []);

  // Floating expand button when collapsed
  if (collapsed) {
    return (
      <motion.div
        className="relative"
        initial={{ width: 0 }}
        animate={{ width: 40 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
      >
        <button
          onClick={onToggleCollapse}
          className="absolute top-4 right-2 w-8 h-8 rounded-full bg-[#A8835F] shadow-md flex items-center justify-center hover:bg-[#8E6a48] transition-colors z-10"
          title="展开AI助手"
        >
          <Bot size={15} className="text-white" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-full flex flex-col bg-[#F8F7F6] border-l border-[#DEDBD8] shrink-0"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
    >
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#DEDBD8] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#A8835F] flex items-center justify-center relative">
            <Bot size={16} className="text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#5B8C5A] border-2 border-[#F8F7F6]" />
          </div>
          <div>
            <span className="text-small font-medium text-[#383431]">AI助手</span>
            <span className="ml-2 text-[10px] text-[#5B8C5A]">在线</span>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#A8A39E] transition-colors"
          title="收起面板"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2.5 border-b border-[#DEDBD8] shrink-0">
        <span className="text-caption text-[#A8A39E] mb-2 block">快捷操作</span>
        <div className="grid grid-cols-2 gap-1.5">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleQuickAction(action.label)}
              className="h-11 bg-white rounded-lg border border-[#DEDBD8] flex flex-col items-center justify-center gap-0.5 hover:border-[#EAD8C8] hover:bg-[#FBF7F4] transition-colors relative"
            >
              <span className="text-[#8E6A48]">{action.icon}</span>
              <span className="text-[11px] text-[#524D48]">{action.label}</span>
              {action.label === '改写' && showRewriteMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-[#DEDBD8] p-1.5 grid grid-cols-2 gap-1 z-20"
                >
                  {rewriteSubOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={(e) => { e.stopPropagation(); handleRewriteSubAction(opt.label); }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[#F8F7F6] text-[11px] text-[#524D48]"
                    >
                      <span className="text-[#A8835F]">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: msg.role === 'ai' ? 8 : -8, x: msg.role === 'ai' ? -4 : 4 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[92%] whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-[#FBF7F4] text-[#383431] rounded-xl rounded-br-sm px-3.5 py-2.5 text-small'
                    : 'bg-white text-[#383431] rounded-xl rounded-bl-sm px-3.5 py-3 text-small shadow-sm border border-[#EFEDEB]'
                )}
              >
                {msg.role === 'ai' ? (
                  <AIResponseContent
                    content={msg.content}
                    suggestions={msg.suggestions}
                    onAccept={() => handleAccept(msg.content)}
                    onRetry={() => handleRetry(msg.id)}
                    onCopy={() => handleCopy(msg.content)}
                    onSuggestionClick={handleSuggestionClick}
                    isWelcome={msg.id === 'welcome'}
                  />
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-xl rounded-bl-sm px-4 py-3 shadow-sm border border-[#EFEDEB]">
              <div className="flex items-center gap-1.5">
                <Loader2 size={14} className="text-[#A8835F] animate-spin" />
                <div className="flex gap-1">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#C5C1BC]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#C5C1BC]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#C5C1BC]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <span className="text-[11px] text-[#A8A39E] ml-1">思考中...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-2.5 border-t border-[#DEDBD8] bg-white/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="输入指令或问题..."
            className="flex-1 h-9 px-3 bg-white border border-[#DEDBD8] rounded-lg text-small text-[#383431] placeholder:text-[#A8A39E] outline-none focus:border-[#D9BFA8] transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              input.trim() && !isGenerating
                ? 'bg-[#A8835F] text-white hover:bg-[#8E6A48]'
                : 'bg-[#EFEDEB] text-[#C5C1BC] cursor-not-allowed'
            )}
          >
            <CornerDownLeft size={15} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/** AI Response with action buttons */
function AIResponseContent({
  content,
  suggestions,
  onAccept,
  onRetry,
  onCopy,
  onSuggestionClick,
  isWelcome,
}: {
  content: string;
  suggestions?: string[];
  onAccept: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onSuggestionClick: (s: string) => void;
  isWelcome: boolean;
}) {
  return (
    <div>
      <div className="leading-relaxed">{content}</div>

      {/* Suggestion chips for AI messages */}
      {!isWelcome && suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-[#F8F7F6]">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-2 py-0.5 bg-[#F0F3F7] text-[#5A7FA8] text-[11px] rounded-full hover:bg-[#E8EFF6] transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!isWelcome && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F8F7F6]">
          <button
            onClick={onAccept}
            className="flex items-center gap-1 text-[11px] text-[#5B8C5A] hover:bg-[#F0F5F0] px-1.5 py-0.5 rounded transition-colors"
            title="接受并添加到编辑器"
          >
            <Check size={12} />
            接受
          </button>
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-[11px] text-[#A8835F] hover:bg-[#FBF7F4] px-1.5 py-0.5 rounded transition-colors"
            title="重新生成"
          >
            <RefreshCw size={12} />
            重试
          </button>
          <button
            onClick={onCopy}
            className="flex items-center gap-1 text-[11px] text-[#A8A39E] hover:bg-[#F8F7F6] px-1.5 py-0.5 rounded transition-colors"
            title="复制到剪贴板"
          >
            <Copy size={12} />
            复制
          </button>
        </div>
      )}
    </div>
  );
}
