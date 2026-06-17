import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Sparkles, Bot, User, Copy, RefreshCw, Check,
  Image as ImageIcon, FileVideo, Paperclip, ChevronDown, Mic,
  X, Eye, Rocket, Hand, EyeOff,
  Brain, StopCircle, Loader2, FolderOpen, Wand2, Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore, modelOptions, skillOptions, type ChatMessage } from '@/store/useChatStore';
import {
  usePipelineStore, PIPELINE_STEPS,
  type PipelineMode,
  type ScriptData, type CharacterData, type StoryboardData,
  type VideoData, type AudioData, type ComposeData,
} from '@/store/usePipelineStore';
import { useAppStore, type Project, type ProjectType } from '@/store/useAppStore';
import { toastSuccess, toastInfo } from '@/hooks/useToast';
import { usePipelineExecution, type RunPipelineOptions } from '@/hooks/usePipelineExecution';
import ReactMarkdown from 'react-markdown';
import { getProjects as apiGetProjects } from '@/lib/api';
import { isPipelineBoundToChat, isPipelineVisibleForChat } from '@/lib/pipeline-storage';

// ═══════════════════════════════════════════════════
// Quick fill hints
// ═══════════════════════════════════════════════════
const quickHints = [
  { label: '校园悬疑', text: '帮我做一个日式校园悬疑漫剧，8集，主角是一个能看到别人记忆的转学生' },
  { label: '都市逆袭', text: '帮我做一个都市逆袭短剧，10集，主角是一个被公司开除后逆袭成功的程序员' },
  { label: '古风仙侠', text: '帮我做一个古风仙侠漫剧，12集，主角是一个被废掉修为的天才弟子重新修炼' },
  { label: '甜宠恋爱', text: '帮我做一个甜宠恋爱漫剧，6集，青梅竹马重逢的校园恋爱故事' },
  { label: '悬疑推理', text: '帮我做一个悬疑推理短剧，8集，一个密室杀人案的真相揭露' },
  { label: '科幻冒险', text: '帮我做一个科幻冒险漫剧，10集，2077年一个AI觉醒后的冒险旅程' },
];

// ═══════════════════════════════════════════════════
// Project context (read-only badge)
// ═══════════════════════════════════════════════════
function ProjectContextBadge({ projectId }: { projectId: string | null }) {
  const projects = useAppStore((s) => s.projects);
  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-[#DEDBD8] bg-white/80 text-[11px] text-[#524D48] max-w-[200px]">
      <FolderOpen size={13} className={cn('shrink-0', project ? 'text-[#A8835F]' : 'text-[#A8A39E]')} />
      <span className="truncate">
        {project ? `当前项目：${project.name}` : projectId ? '加载项目中…' : '启动后将创建新项目'}
      </span>
    </div>
  );
}

const MODE_LABELS: Record<PipelineMode, string> = {
  auto: '全自动',
  confirm: '每步确认',
  preview: '仅预览',
};

// ═══════════════════════════════════════════════════
// Pipeline start dialog (new vs existing project)
// ═══════════════════════════════════════════════════
function PipelineStartDialog({
  open,
  mode,
  title,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: PipelineMode;
  title: string;
  onClose: () => void;
  onConfirm: (options: RunPipelineOptions) => void;
}) {
  const projects = useAppStore((s) => s.projects);
  const [target, setTarget] = useState<'new' | 'existing'>('new');
  const [selectedId, setSelectedId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget('new');
    setSelectedId('');
    setLoadingProjects(true);
    apiGetProjects()
      .then((data) => {
        const apiProjects: Project[] = data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          type: ((p.type as string) || '漫剧') as ProjectType,
          status: '草稿',
          progress: 0,
          currentEpisode: 1,
          totalEpisodes: (p.episodes as number) || 8,
          lastEdited: '未知',
          thumbnail: '/project-placeholder-1.jpg',
        }));
        useAppStore.setState({ projects: apiProjects });
      })
      .catch(() => {/* 保留现有数据 */})
      .finally(() => setLoadingProjects(false));
  }, [open]);

  const handleConfirm = () => {
    if (target === 'existing' && !selectedId) {
      toastInfo('请选择一个已有项目');
      return;
    }
    onConfirm(target === 'new' ? { createNew: true } : { projectId: selectedId });
  };

  if (!open) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-[440px] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#EFEDEB] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#383431]">选择项目归属</h3>
            <p className="text-[11px] text-[#A8A39E] mt-0.5">
              「{title}」· {MODE_LABELS[mode]}模式
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#A8A39E] hover:bg-[#F8F7F6]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            type="button"
            onClick={() => setTarget('new')}
            className={cn(
              'w-full p-4 rounded-xl border text-left transition-all',
              target === 'new'
                ? 'border-[#A8835F] bg-[#FBF7F4]'
                : 'border-[#DEDBD8] hover:border-[#D9BFA8]',
            )}
          >
            <p className="text-[13px] font-semibold text-[#383431]">创建新项目</p>
            <p className="text-[11px] text-[#A8A39E] mt-1">根据当前创意自动创建并启动 Pipeline</p>
          </button>

          <button
            type="button"
            onClick={() => setTarget('existing')}
            className={cn(
              'w-full p-4 rounded-xl border text-left transition-all',
              target === 'existing'
                ? 'border-[#A8835F] bg-[#FBF7F4]'
                : 'border-[#DEDBD8] hover:border-[#D9BFA8]',
            )}
          >
            <p className="text-[13px] font-semibold text-[#383431]">加入已有项目</p>
            <p className="text-[11px] text-[#A8A39E] mt-1">将生成结果写入选中的项目</p>
          </button>

          {target === 'existing' && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[#EFEDEB] divide-y divide-[#EFEDEB]">
              {loadingProjects ? (
                <div className="py-6 flex items-center justify-center text-[#A8A39E]">
                  <Loader2 size={16} className="animate-spin mr-2" />
                  加载项目…
                </div>
              ) : projects.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[#A8A39E]">暂无已有项目，请先创建</p>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-[#F8F7F6]',
                      selectedId === p.id && 'bg-[#FBF7F4]',
                    )}
                  >
                    <span className={cn('font-medium', selectedId === p.id ? 'text-[#755235]' : 'text-[#383431]')}>
                      {p.name}
                    </span>
                    <span className="ml-2 text-[10px] text-[#A8A39E]">{p.type}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#EFEDEB] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#DEDBD8] text-[12px] text-[#524D48] hover:bg-[#F8F7F6]"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="h-9 px-4 rounded-lg bg-[#A8835F] text-[12px] text-white hover:bg-[#8E6A48]"
          >
            开始执行
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ═══════════════════════════════════════════════════
// Model & Skill Selector (top bar)
// ═══════════════════════════════════════════════════
function ModelSkillBar() {
  const currentModel = useChatStore((s) => s.currentModel);
  const currentSkill = useChatStore((s) => s.currentSkill);
  const deepThink = useChatStore((s) => s.deepThink);
  const setModel = useChatStore((s) => s.setModel);
  const setSkill = useChatStore((s) => s.setSkill);
  const setDeepThink = useChatStore((s) => s.setDeepThink);
  const [modelOpen, setModelOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModel = modelOptions.find((m) => m.id === currentModel) ?? modelOptions[0];
  const selectedSkill = skillOptions.find((s) => s.id === currentSkill) ?? skillOptions[0];

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={modelRef}>
        <button onClick={() => { setModelOpen(!modelOpen); setSkillOpen(false); }}
          className="h-7 px-2.5 rounded-md border border-[#DEDBD8] hover:border-[#D9BFA8] text-[11px] text-[#524D48] flex items-center gap-1.5 transition-colors bg-white/80">
          <Bot size={13} className="text-[#5A7FA8]" />
          <span className="hidden sm:inline">{selectedModel.label}</span>
          <ChevronDown size={10} className={cn('transition-transform', modelOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>{modelOpen && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1.5 z-floating">
            <p className="px-3 py-1.5 text-[10px] text-[#A8A39E] uppercase tracking-wider font-medium">选择模型</p>
            {modelOptions.map((m) => (
              <button key={m.id} onClick={() => { setModel(m.id); setModelOpen(false); }}
                className={cn('w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#F8F7F6]', m.id === currentModel && 'bg-[#FBF7F4]')}>
                <div className="flex items-center justify-between">
                  <span className={cn('font-medium', m.id === currentModel ? 'text-[#755235]' : 'text-[#383431]')}>{m.label}</span>
                  <span className="text-[10px] text-[#5B8C5A]">{m.cost}</span>
                </div>
                <p className="text-[10px] text-[#A8A39E] mt-0.5">{m.desc}</p>
              </button>
            ))}
          </motion.div>
        )}</AnimatePresence>
      </div>
      <div className="relative" ref={skillRef}>
        <button onClick={() => { setSkillOpen(!skillOpen); setModelOpen(false); }}
          className="h-7 px-2.5 rounded-md border border-[#DEDBD8] hover:border-[#D9BFA8] text-[11px] text-[#524D48] flex items-center gap-1.5 transition-colors bg-white/80">
          <Sparkles size={13} className="text-[#A8835F]" />
          <span className="hidden sm:inline">{selectedSkill.label}</span>
          <ChevronDown size={10} className={cn('transition-transform', skillOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>{skillOpen && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1.5 z-floating">
            <p className="px-3 py-1.5 text-[10px] text-[#A8A39E] uppercase tracking-wider font-medium">选择SKILL</p>
            {skillOptions.map((s) => (
              <button key={s.id} onClick={() => { setSkill(s.id); setSkillOpen(false); }}
                className={cn('w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#F8F7F6]', s.id === currentSkill && 'bg-[#FBF7F4]')}>
                <div className="flex items-center justify-between">
                  <span className={cn('font-medium', s.id === currentSkill ? 'text-[#755235]' : 'text-[#383431]')}>{s.label}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded', s.type === '漫剧' ? 'bg-[#FBF7F4] text-[#8E6A48]' : 'bg-[#F0F3F7] text-[#5A7FA8]')}>{s.type}</span>
                </div>
                <p className="text-[10px] text-[#A8A39E] mt-0.5">{s.desc}</p>
              </button>
            ))}
          </motion.div>
        )}</AnimatePresence>
      </div>

      {/* Deep Think Toggle */}
      <button
        onClick={() => setDeepThink(!deepThink)}
        className={cn(
          'h-7 px-2.5 rounded-md border text-[11px] flex items-center gap-1.5 transition-all',
          deepThink
            ? 'border-[#7A6B8A] bg-[#F5F0FA] text-[#7A6B8A]'
            : 'border-[#DEDBD8] text-[#A8A39E] hover:border-[#C5C1BC] hover:text-[#6E6862]'
        )}
        title={deepThink ? '深度思考已开启' : '深度思考已关闭'}
      >
        <Brain size={13} />
        <span className="hidden sm:inline">深度思考</span>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Message Bubble
// ═══════════════════════════════════════════════════
function ThinkingPanel({ thinking, isStreaming }: { thinking: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!thinking) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-[#7A6B8A] hover:text-[#5A4D6B] transition-colors px-2 py-1 rounded-md hover:bg-[#F5F0FA]"
      >
        <Brain size={12} />
        <span>思考过程</span>
        {isStreaming && <Loader2 size={10} className="animate-spin" />}
        <ChevronDown size={10} className={cn('transition-transform', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-1 px-3 py-2.5 bg-[#F8F5FA] rounded-lg border border-[#E8E0F0] text-[12px] text-[#6E6862] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {thinking}
              {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-[#7A6B8A] ml-0.5 animate-pulse" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({
  message,
  onModeSelect,
  pipelineRunning,
  onConfirmStep,
  onRetryStep,
  onSkipStep,
  onGoComposer,
}: {
  message: ChatMessage;
  onModeSelect?: (mode: PipelineMode) => void;
  pipelineRunning?: boolean;
  onConfirmStep?: () => void;
  onRetryStep?: (step: number) => void;
  onSkipStep?: (step: number) => void;
  onGoComposer?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toastSuccess('已复制到剪贴板'); }).catch(() => toastInfo('复制失败'));
  };

  const isUser = message.role === 'user';
  const hasThinking = !!message.thinking;
  const isPlanConfirmCard = message.type === 'plan_confirm_card';
  const isPlanCard = message.type === 'plan_card';

  if (isPlanConfirmCard) {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8835F] to-[#8E6A48] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Bot size={18} className="text-white" />
        </div>
        <PlanConfirmCard title={message.content || '创作方案'} disabled={pipelineRunning} />
      </div>
    );
  }

  // Plan card — render ModeSelectorCard (only after user confirms plan)
  if (isPlanCard) {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8835F] to-[#8E6A48] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Bot size={18} className="text-white" />
        </div>
        <ModeSelectorCard title={message.content || 'AI 创作'} onSelect={onModeSelect} disabled={pipelineRunning} />
      </div>
    );
  }

  if (message.type === 'progress_update') {
    return (
      <div className="flex justify-center">
        <p className="text-[12px] text-[#A8A39E] px-3 py-1">{message.content}</p>
      </div>
    );
  }

  if (message.type === 'step_complete') {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-[#5B8C5A] flex items-center justify-center shrink-0 mt-0.5">
          <Check size={16} className="text-white" />
        </div>
        <div className="bg-[#F0F5F0] border border-[#D4E8D4] rounded-xl px-4 py-3 max-w-[420px]">
          <p className="text-[13px] text-[#383431]">{message.content}</p>
          {onConfirmStep && usePipelineStore.getState().waitingConfirmation && (
            <button onClick={onConfirmStep} className="mt-2 h-8 px-3 rounded-lg bg-[#A8835F] text-white text-[12px]">确认继续</button>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'error_card' && !message.resolved) {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-[#B85C50] flex items-center justify-center shrink-0 mt-0.5">
          <X size={16} className="text-white" />
        </div>
        <div className="bg-[#FDF2F0] border border-[#E8C4BC] rounded-xl px-4 py-3 max-w-[420px]">
          <p className="text-[13px] text-[#B85C50]">{message.content}</p>
          <div className="flex gap-2 mt-2">
            {message.pipelineError?.retryable && (
              <button onClick={() => onRetryStep?.(message.pipelineStep ?? 0)} className="h-8 px-3 rounded-lg bg-[#A8835F] text-white text-[12px]">重试</button>
            )}
            <button onClick={() => onSkipStep?.(message.pipelineStep ?? 0)} className="h-8 px-3 rounded-lg border border-[#DEDBD8] text-[12px]">跳过</button>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'pipeline_complete') {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-[#5B8C5A] flex items-center justify-center shrink-0 mt-0.5">
          <Film size={16} className="text-white" />
        </div>
        <div className="bg-white border border-[#DEDBD8] rounded-2xl px-5 py-4 max-w-[440px] shadow-sm">
          <p className="text-[14px] font-semibold text-[#383431] mb-1">✓ 《{message.content}》制作完成</p>
          <p className="text-[12px] text-[#A8A39E] mb-3">剧本/角色/分镜已保存，视频片段已导入合成室</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onGoComposer} className="h-8 px-3 rounded-lg bg-[#A8835F] text-white text-[12px]">查看成片</button>
            <button onClick={() => window.location.hash = '#/script'} className="h-8 px-3 rounded-lg border border-[#DEDBD8] text-[12px]">编辑剧本</button>
            <button onClick={() => window.location.hash = '#/storyboard'} className="h-8 px-3 rounded-lg border border-[#DEDBD8] text-[12px]">调整分镜</button>
          </div>
        </div>
      </div>
    );
  }

  // Image message — render generated image
  if (message.type === 'image') {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8835F] to-[#8E6A48] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Bot size={18} className="text-white" />
        </div>
        <div className="max-w-[75%]">
          {message.isStreaming ? (
            <div className="px-5 py-4 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-[#EFEDEB]">
              <div className="flex items-center gap-2 text-[13px] text-[#A8A39E]">
                <Loader2 size={14} className="animate-spin text-[#A8835F]" />
                图片生成中...
              </div>
            </div>
          ) : message.imageUrl ? (
            <div className="rounded-2xl rounded-bl-sm overflow-hidden shadow-sm border border-[#EFEDEB] bg-white">
              <img src={message.imageUrl} alt="AI 生成图片" className="max-w-full max-h-[400px] object-contain" />
              <div className="px-4 py-2 text-[12px] text-[#A8A39E] border-t border-[#EFEDEB] flex items-center justify-between">
                <span>{message.content || 'AI 生成的图片'}</span>
                <button
                  onClick={() => {
                    const url = message.imageUrl || '';
                    if (url) {
                      const fill = (window as Record<string, unknown>).__chatFillInput as ((t: string) => void) | undefined;
                      fill?.(`/image @${url} `);
                    }
                  }}
                  className="text-[11px] text-[#A8835F] hover:text-[#8E6A48] font-medium flex items-center gap-1 transition-colors"
                >
                  <Wand2 size={11} /> 以此图修改
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-[#EFEDEB] text-[13px] text-[#B85C50]">
              {message.content || '图片生成失败'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Video message — render generated video
  if (message.type === 'video') {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8835F] to-[#8E6A48] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Bot size={18} className="text-white" />
        </div>
        <div className="max-w-[75%]">
          {message.isStreaming ? (
            <div className="px-5 py-4 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-[#EFEDEB]">
              <div className="flex items-center gap-2 text-[13px] text-[#A8A39E]">
                <Loader2 size={14} className="animate-spin text-[#A8835F]" />
                视频生成中...
              </div>
            </div>
          ) : message.videoUrl ? (
            <div className="rounded-2xl rounded-bl-sm overflow-hidden shadow-sm border border-[#EFEDEB] bg-white">
              <video src={message.videoUrl} controls className="w-full max-h-[400px]" />
              <div className="px-4 py-2 text-[12px] text-[#A8A39E] border-t border-[#EFEDEB]">
                {message.content || 'AI 生成的视频'}
              </div>
            </div>
          ) : (
            <div className="px-5 py-3 rounded-2xl rounded-bl-sm bg-white shadow-sm border border-[#EFEDEB] text-[13px] text-[#B85C50]">
              {message.content || '视频生成失败'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className={cn('flex gap-3 group', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A8835F] to-[#8E6A48] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Bot size={18} className="text-white" />
        </div>
      )}
      <div className={cn('max-w-[75%] min-w-0', isUser && 'order-1')}>
        {/* Thinking panel (only for assistant) */}
        {!isUser && hasThinking && (
          <ThinkingPanel thinking={message.thinking!} isStreaming={message.isStreaming} />
        )}

        {/* Message content — 始终渲染，内部逻辑决定显示什么 */}
        {(
          <div className={cn('px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed',
            isUser ? 'bg-[#FBF7F4] text-[#383431] rounded-br-sm border border-[#F0E8DE]' : 'bg-white text-[#383431] rounded-bl-sm shadow-sm border border-[#EFEDEB]',
            '[&_h1]:text-[18px] [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
            '[&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2',
            '[&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
            '[&_p]:mb-2 [&_p]:leading-relaxed',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
            '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
            '[&_li]:mb-0.5',
            '[&_strong]:font-semibold',
            '[&_em]:italic',
            '[&_blockquote]:border-l-3 [&_blockquote]:border-[#A8835F] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[#6E6862] [&_blockquote]:my-2',
            '[&_code]:bg-[#F8F7F6] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_code]:font-mono',
            '[&_pre]:bg-[#F8F7F6] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-2',
            '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
            '[&_hr]:border-[#DEDBD8] [&_hr]:my-3',
            '[&_table]:w-full [&_table]:my-2',
            '[&_th]:bg-[#F8F7F6] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:border [&_th]:border-[#DEDBD8]',
            '[&_td]:px-2 [&_td]:py-1 [&_td]:text-[12px] [&_td]:border [&_td]:border-[#DEDBD8]'
          )}>
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : message.isStreaming && !hasThinking ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-[#A8A39E]">
                <Loader2 size={12} className="animate-spin" />
              </span>
            ) : (
              <span className="whitespace-pre-wrap">{message.content}</span>
            )}
            {message.isStreaming && message.content && (
              <span className="inline-block w-1.5 h-3.5 bg-[#A8835F] ml-0.5 animate-pulse" />
            )}
          </div>
        )}

        {/* Footer */}
        <div className={cn('flex items-center mt-1.5', isUser ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-[#C5C1BC]">{message.timestamp}</span>
          {!isUser && !message.isStreaming && message.content && (
            <div className="hidden group-hover:flex items-center gap-0.5 ml-2 bg-white rounded-lg border border-[#EFEDEB] p-0.5 shadow-sm">
              <button onClick={() => toastSuccess('已采纳')} className="p-1 rounded hover:bg-[#F0F5F0] text-[#A8A39E] hover:text-[#5B8C5A] transition-colors"><Check size={12} /></button>
              <button onClick={() => toastInfo('已重新生成')} className="p-1 rounded hover:bg-[#FBF7F4] text-[#A8A39E] hover:text-[#A8835F] transition-colors"><RefreshCw size={12} /></button>
              <button onClick={handleCopy} className="p-1 rounded hover:bg-[#F0F3F7] text-[#A8A39E] hover:text-[#5A7FA8] transition-colors">
                {copied ? <Check size={12} className="text-[#5B8C5A]" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EAD8C8] to-[#D9BFA8] flex items-center justify-center shrink-0 mt-0.5 shadow-sm order-2">
          <User size={18} className="text-[#8E6A48]" />
        </div>
      )}
    </motion.div>
  );
}

function TypingIndicator({ stage }: { stage?: 'analyzing' | 'replying' | null }) {
  const label = stage === 'replying' ? '正在生成创作方案...' : 'AI思考中...';
  return (
    <div className="flex gap-3 pl-12">
      <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm border border-[#EFEDEB] px-5 py-4">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#A8835F] to-[#8E6A48]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut', delay: i * 0.2 }} />
          ))}
          <span className="text-[11px] text-[#A8A39E] ml-2">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Upload Menu (portal)
// ═══════════════════════════════════════════════════
function UploadMenu({ anchorRef, onSelect, onClose }: { anchorRef: React.RefObject<HTMLButtonElement | null>; onSelect: (type: string) => void; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => { const btn = anchorRef.current; if (!btn) return; const rect = btn.getBoundingClientRect(); setPos({ top: rect.top - 8, left: rect.left }); }, [anchorRef]);
  useEffect(() => { function handle(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose(); } document.addEventListener('mousedown', handle); return () => document.removeEventListener('mousedown', handle); }, [onClose, anchorRef]);
  const items = [
    { label: '图片', icon: <ImageIcon size={14} className="text-[#A8835F]" />, type: 'image' },
    { label: '视频', icon: <FileVideo size={14} className="text-[#5A7FA8]" />, type: 'video' },
    { label: '音频', icon: <Mic size={14} className="text-[#5B8C5A]" />, type: 'audio' },
    { label: '文件', icon: <Paperclip size={14} className="text-[#7A6B8A]" />, type: 'file' },
  ];
  return createPortal(
    <motion.div ref={menuRef} initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }} transition={{ duration: 0.15 }}
      className="fixed bg-white rounded-xl shadow-xl border border-[#DEDBD8] py-1.5 w-40 z-[9999]" style={{ bottom: window.innerHeight - pos.top, left: pos.left }}>
      <p className="px-3 py-1 text-[10px] text-[#A8A39E] uppercase tracking-wider font-medium">上传</p>
      {items.map((item) => (
        <button key={item.type} onClick={() => onSelect(item.type)} className="w-full px-3 py-2 text-left text-[12px] text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2.5 transition-colors">
          {item.icon} {item.label}
        </button>
      ))}
    </motion.div>, document.body
  );
}

// ═══════════════════════════════════════════════════
// Chat Input
// ═══════════════════════════════════════════════════
function ChatInput({ onQuickFill }: { onQuickFill?: (text: string) => void }) {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const cancelGeneration = useChatStore((s) => s.cancelGeneration);
  const createSession = useChatStore((s) => s.createSession);
  const currentModel = useChatStore((s) => s.currentModel);
  const currentSkill = useChatStore((s) => s.currentSkill);
  const generateImageInChat = useChatStore((s) => s.generateImageInChat);
  const generateVideoInChat = useChatStore((s) => s.generateVideoInChat);
  const pipelineStatus = usePipelineStore((s) => s.status);

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const uploadBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chatFocusInput = () => {
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    if (onQuickFill) {
      (window as unknown as Record<string, unknown>).__chatFillInput = (text: string) => {
        setInput(text);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
            inputRef.current.focus();
          }
        }, 0);
      };
    }
  }, [onQuickFill]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isGenerating) return;
    if (!currentSessionId) createSession();
    // If pipeline is running, queue the message
    if (pipelineStatus === 'running') {
      usePipelineStore.getState().queueMessage(input.trim());
      toastInfo('消息已排队，当前步骤完成后处理');
      setInput('');
      return;
    }

    const text = input.trim();

    // /image 命令 — 文生图 or 图生图
    if (text.startsWith('/image ')) {
      const rest = text.slice(7).trim();
      // 解析 /image @url 描述 — 图生图
      const imgMatch = rest.match(/^@(\S+)\s+(.+)$/);
      if (imgMatch) {
        generateImageInChat(imgMatch[2], imgMatch[1]);
      } else if (rest) {
        generateImageInChat(rest);
      }
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      return;
    }

    // /video 命令 — 直接生成视频
    if (text.startsWith('/video ')) {
      const rest = text.slice(7).trim();
      const vidMatch = rest.match(/^@(\S+)\s+(.+)$/);
      if (vidMatch) {
        generateVideoInChat(vidMatch[2], vidMatch[1]);
      } else if (rest) {
        generateVideoInChat(rest);
      }
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      return;
    }

    sendMessage(text);
    setInput('');
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }, [input, isGenerating, currentSessionId, sendMessage, createSession, pipelineStatus, generateImageInChat, generateVideoInChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleUploadSelect = (type: string) => { toastInfo(`${type}上传功能（模拟）`); setAttachments((prev) => [...prev, `${type}-${Date.now()}`]); setShowUpload(false); };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; };

  const selectedModel = modelOptions.find(m => m.id === currentModel);
  const selectedSkill = skillOptions.find(s => s.id === currentSkill);

  return (
    <div className="shrink-0 px-4 md:px-6 pb-4 pt-2">
      {attachments.length > 0 && (
        <div className="max-w-[880px] mx-auto mb-2 flex items-center gap-2">
          {attachments.map((att) => (
            <div key={att} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur rounded-lg border border-[#DEDBD8] text-[11px] text-[#524D48] shadow-sm">
              <Paperclip size={12} className="text-[#A8835F]" /><span>{att.split('-')[0]}</span>
              <button onClick={() => setAttachments((prev) => prev.filter((a) => a !== att))} className="text-[#A8A39E] hover:text-[#B85C50] ml-1"><Check size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="max-w-[880px] mx-auto">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-shadow">
          <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
            placeholder={pipelineStatus === 'running' ? 'AI 正在工作中，消息将排队...' : '输入你的创作想法，或者向 AI 提问...'}
            rows={3} disabled={isGenerating}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[14px] text-[#383431] placeholder:text-[#C5C1BC] outline-none disabled:opacity-50 leading-relaxed rounded-t-2xl"
            style={{ minHeight: 88, maxHeight: 200 }} />
          <div className="mx-4 border-t border-dashed border-[#DEDBD8]" />
          <div className="flex items-center justify-between px-2 py-2.5">
            <div className="flex items-center gap-1">
              <button ref={uploadBtnRef} onClick={() => setShowUpload(!showUpload)} disabled={isGenerating}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A39E] hover:text-[#A8835F] hover:bg-[#F5EDE6] transition-all disabled:opacity-50"><Plus size={18} /></button>
              <button
                onClick={() => { setInput('/image '); inputRef.current?.focus(); }}
                disabled={isGenerating}
                title="生成图片 — /image + 描述"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A39E] hover:text-[#A8835F] hover:bg-[#F5EDE6] transition-all disabled:opacity-50"
              >
                <Wand2 size={15} />
              </button>
              <button
                onClick={() => { setInput('/video '); inputRef.current?.focus(); }}
                disabled={isGenerating}
                title="生成视频 — /video + 描述"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A39E] hover:text-[#5A7FA8] hover:bg-[#F0F3F7] transition-all disabled:opacity-50"
              >
                <Film size={15} />
              </button>
              <button disabled={isGenerating} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A39E] hover:text-[#5A7FA8] hover:bg-[#F0F3F7] transition-all disabled:opacity-50"><Mic size={16} /></button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#C5C1BC]">
              <span>{selectedModel?.label}</span><span>·</span><span>{selectedSkill?.label}</span>
            </div>
            {isGenerating ? (
              <motion.button onClick={cancelGeneration} whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-xl bg-[#B85C50] hover:bg-[#A34E43] flex items-center justify-center transition-all shadow-sm"
                title="停止生成">
                <StopCircle size={16} className="text-white" />
              </motion.button>
            ) : (
              <motion.button onClick={handleSend} disabled={!input.trim()} whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A8835F] to-[#8E6A48] hover:from-[#9A7350] hover:to-[#7D5A3A] disabled:from-[#DEDBD8] disabled:to-[#DEDBD8] disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm">
                <Send size={15} className="text-white" />
              </motion.button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-[#C5C1BC] text-center mt-2">Enter 发送 · Shift+Enter 换行</p>
      </div>
      <AnimatePresence>{showUpload && <UploadMenu anchorRef={uploadBtnRef} onSelect={handleUploadSelect} onClose={() => setShowUpload(false)} />}</AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Step Bar
// ═══════════════════════════════════════════════════
function StepBar() {
  const steps = usePipelineStore((s) => s.steps);
  const currentStep = usePipelineStore((s) => s.currentStep);
  const switchStep = usePipelineStore((s) => s.switchStep);

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-[#EFEDEB] overflow-x-auto">
      {PIPELINE_STEPS.map((config, idx) => {
        const step = steps[idx];
        const isActive = idx === currentStep;
        const isDone = step.status === 'done';
        const isFailed = step.status === 'failed';
        const isSkipped = step.status === 'skipped';
        const isRunning = step.status === 'running';
        const isAccessible = isDone || isFailed || isSkipped || isActive;

        return (
          <button key={config.id} onClick={() => isAccessible && switchStep(idx)}
            className={cn('flex flex-col items-center px-2 py-1.5 rounded-lg transition-all min-w-[52px]',
              isActive ? 'bg-[#F0F3F7]' : isDone ? 'hover:bg-[#F0F5F0]' : 'cursor-default',
              !isAccessible && 'opacity-50')}>
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-0.5 transition-all',
              isDone ? 'bg-[#5B8C5A] text-white' :
              isRunning ? 'bg-[#5A7FA8] text-white animate-pulse' :
              isFailed ? 'bg-[#B85C50] text-white' :
              isSkipped ? 'bg-[#C5C1BC] text-white' :
              isActive ? 'bg-[#5A7FA8] text-white' :
              'bg-[#DEDBD8] text-[#A8A39E]')}>
              {isDone ? '✓' : isFailed ? '!' : isSkipped ? '—' : idx + 1}
            </div>
            <span className={cn('text-[10px]',
              isDone ? 'text-[#5B8C5A]' :
              isRunning ? 'text-[#5A7FA8] font-semibold' :
              isFailed ? 'text-[#B85C50]' :
              'text-[#C5C1BC]')}>
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Step Previews (lightweight)
// ═══════════════════════════════════════════════════
function ScriptPreview() {
  const data = usePipelineStore((s) => s.steps[0].data) as ScriptData | null;
  const stepStatus = usePipelineStore((s) => s.steps[0].status);
  const progress = usePipelineStore((s) => s.steps[0].progress);
  if (!data) {
    const hint =
      stepStatus === 'running'
        ? progress > 0
          ? `AI 正在生成剧本… ${progress}%（后台调用，浏览器无新请求属正常）`
          : 'AI 正在生成剧本… 约 1–3 分钟（后台调用 MiMo，请稍候）'
        : '等待剧本生成…';
    return <EmptyStep message={hint} />;
  }
  return (
    <div className="space-y-3">
      {data.episodes.map((ep) => (
        <div key={ep.id} className="bg-[#F8F7F6] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#383431]">第{ep.number}集：{ep.title}</span>
            <span className="text-[10px] text-[#A8A39E]">{ep.scenes.length} 个场景</span>
          </div>
          {ep.scenes.map((scene) => (
            <div key={scene.id} className="pl-3 py-1.5 border-l-2 border-[#A8835F] mb-1">
              <p className="text-[12px] font-medium text-[#524D48]">{scene.title}</p>
              <p className="text-[11px] text-[#A8A39E] line-clamp-2">{scene.summary}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CharacterPreview() {
  const data = usePipelineStore((s) => s.steps[1].data) as CharacterData | null;
  if (!data) return <EmptyStep message="等待角色生成..." />;
  return (
    <div className="grid grid-cols-2 gap-2">
      {data.characters.map((char) => (
        <div key={char.id} className="bg-[#F8F7F6] rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0" style={{ backgroundColor: char.avatarColor }}>
            {char.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#383431] truncate">{char.name}</p>
            <p className="text-[10px] text-[#A8A39E]">{char.role}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {char.status === 'done' && <span className="text-[9px] text-[#5B8C5A]">✓ 已生成</span>}
              {char.status === 'generating' && <span className="text-[9px] text-[#5A7FA8] animate-pulse">生成中...</span>}
              {char.status === 'waiting' && <span className="text-[9px] text-[#C5C1BC]">等待中</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StoryboardPreview() {
  const data = usePipelineStore((s) => s.steps[2].data) as StoryboardData | null;
  if (!data) return <EmptyStep message="等待分镜生成..." />;
  return (
    <div className="grid grid-cols-3 gap-2">
      {data.shots.slice(0, 12).map((shot) => (
        <div key={shot.id} className={cn('bg-[#F8F7F6] rounded-lg overflow-hidden border-2 transition-all',
          shot.status === 'generating' ? 'border-[#5A7FA8]' : shot.status === 'done' ? 'border-transparent' : 'border-transparent')}>
          <div className="aspect-video bg-gradient-to-br from-[#EFEDEB] to-[#DEDBD8] flex items-center justify-center">
            <span className="text-[18px]">{shot.shotType === '远景' ? '🏔️' : shot.shotType === '特写' ? '👁️' : '🎬'}</span>
          </div>
          <div className="p-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[#383431]">#{shot.shotNumber}</span>
              <span className="text-[9px] text-[#A8A39E]">{shot.duration}s</span>
            </div>
            <p className="text-[9px] text-[#A8A39E] truncate">{shot.shotType}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoPreview() {
  const data = usePipelineStore((s) => s.steps[3].data) as VideoData | null;
  if (!data) return <EmptyStep message="等待视频生成..." />;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-[#383431]">总进度</span>
        <span className="text-[12px] font-mono font-semibold text-[#5A7FA8]">{data.overallProgress}%</span>
      </div>
      <div className="w-full h-2 bg-[#EFEDEB] rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-[#5A7FA8] to-[#7A9FC8] rounded-full transition-all" style={{ width: `${data.overallProgress}%` }} />
      </div>
      {data.clips.slice(0, 6).map((clip) => (
        <div key={clip.id} className="flex items-center gap-3 bg-[#F8F7F6] rounded-lg p-2.5">
          <div className="w-16 h-10 rounded bg-[#EFEDEB] flex items-center justify-center shrink-0">
            <span className="text-[14px]">🎥</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[#383431] truncate">{clip.name}</p>
            <p className="text-[10px] text-[#A8A39E]">{clip.duration}s</p>
            {clip.status === 'generating' && (
              <div className="w-full h-1 bg-[#EFEDEB] rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#5A7FA8] rounded-full" style={{ width: `${clip.progress}%` }} />
              </div>
            )}
          </div>
          <span className={cn('text-[10px] shrink-0',
            clip.status === 'done' ? 'text-[#5B8C5A]' : clip.status === 'generating' ? 'text-[#5A7FA8]' : clip.status === 'failed' ? 'text-[#B85C50]' : 'text-[#C5C1BC]')}>
            {clip.status === 'done' ? '✓' : clip.status === 'generating' ? `${clip.progress}%` : clip.status === 'failed' ? '失败' : '等待'}
          </span>
        </div>
      ))}
    </div>
  );
}

function AudioPreview() {
  const data = usePipelineStore((s) => s.steps[4].data) as (AudioData & { status?: string; reason?: string }) | null;
  if (!data) return <EmptyStep message="等待配音生成..." />;
  if (data.status === 'skipped') {
    return (
      <div className="space-y-3">
        <div className="bg-[#FFF8E6] border border-[#F0E0B0] rounded-lg p-3 text-[12px] text-[#8A7340]">
          配音功能开发中 · 可跳过或稍后在合成室手动添加音频
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h4 className="text-[12px] font-semibold text-[#383431]">角色配音</h4>
      {data.voices.map((v) => (
        <div key={v.characterId} className="flex items-center justify-between bg-[#F8F7F6] rounded-lg p-2.5">
          <div>
            <p className="text-[12px] font-medium text-[#383431]">{v.characterName}</p>
            <p className="text-[10px] text-[#A8A39E]">{v.voiceName}</p>
          </div>
          <span className={cn('text-[10px]', v.status === 'done' ? 'text-[#5B8C5A]' : v.status === 'generating' ? 'text-[#5A7FA8] animate-pulse' : 'text-[#C5C1BC]')}>
            {v.status === 'done' ? '✓ 完成' : v.status === 'generating' ? '生成中...' : '等待'}
          </span>
        </div>
      ))}
      <h4 className="text-[12px] font-semibold text-[#383431] pt-2">背景音乐</h4>
      <div className="flex items-center justify-between bg-[#F8F7F6] rounded-lg p-2.5">
        <div>
          <p className="text-[12px] font-medium text-[#383431]">{data.bgm.style}</p>
          <p className="text-[10px] text-[#A8A39E]">{data.bgm.duration}s</p>
        </div>
        <span className={cn('text-[10px]', data.bgm.status === 'done' ? 'text-[#5B8C5A]' : data.bgm.status === 'generating' ? 'text-[#5A7FA8] animate-pulse' : 'text-[#C5C1BC]')}>
          {data.bgm.status === 'done' ? '✓ 完成' : data.bgm.status === 'generating' ? '生成中...' : '等待'}
        </span>
      </div>
    </div>
  );
}

function ComposePreview() {
  const data = usePipelineStore((s) => s.steps[5].data) as (ComposeData & { message?: string; clips?: unknown[] }) | null;
  const projectId = usePipelineStore((s) => s.projectId);
  if (!data) return <EmptyStep message="等待合成..." />;
  return (
    <div className="space-y-4">
      {data.message && (
        <div className="bg-[#F0F3F7] border border-[#D8E0F0] rounded-lg p-3 text-[12px] text-[#5A7FA8]">
          {data.message}
        </div>
      )}
      <div className="aspect-video bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] rounded-xl flex items-center justify-center">
        {data.status === 'done' ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2"><Eye size={24} className="text-white" /></div>
            <p className="text-[12px] text-white/60">点击预览成片</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 animate-pulse"><Sparkles size={24} className="text-white/40" /></div>
            <p className="text-[12px] text-white/40">合成中...</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#A8A39E]">时长</span><span className="text-[#383431] font-medium">{Math.floor(data.duration / 60)}:{(data.duration % 60).toString().padStart(2, '0')}</span>
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#A8A39E]">分辨率</span><span className="text-[#383431] font-medium">{data.resolution}</span>
      </div>
      <button
        onClick={() => { window.location.hash = projectId ? `#/composer?projectId=${projectId}` : '#/composer'; }}
        className="w-full h-9 rounded-lg bg-[#A8835F] text-white text-[12px] font-medium"
      >
        前往合成室编辑
      </button>
    </div>
  );
}

function EmptyStep({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Sparkles size={28} className="text-[#C5C1BC] mb-2" />
      <p className="text-[12px] text-[#A8A39E]">{message}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Plan Confirm Card
// ═══════════════════════════════════════════════════
function PlanConfirmCard({ title, disabled }: { title: string; disabled?: boolean }) {
  const creativePlanText = useChatStore((s) => s.creativePlanText);
  const planConfirmed = useChatStore((s) => s.planConfirmed);
  const confirmPlan = useChatStore((s) => s.confirmPlan);
  const regeneratePlan = useChatStore((s) => s.regeneratePlan);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const [expanded, setExpanded] = useState(false);

  const preview = creativePlanText || '';
  const summary = preview.slice(0, 180) + (preview.length > 180 ? '…' : '');

  const handleModify = () => {
    toastInfo('请在下方输入修改意见，发送后 AI 将根据你的反馈调整方案');
    const fn = (window as unknown as Record<string, unknown>).__chatFocusInput;
    if (typeof fn === 'function') fn();
  };

  if (planConfirmed) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#F0F5F0] border border-[#D4E8D4] rounded-2xl p-4 max-w-[480px]">
        <p className="text-[13px] font-semibold text-[#383431]">✓ 方案已确认</p>
        <p className="text-[11px] text-[#6E6862] mt-1">「{title}」— 请在下方选择执行模式开始制作</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-[#EFEDEB] shadow-sm p-5 max-w-[480px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#FBF7F4] flex items-center justify-center">
          <Wand2 size={16} className="text-[#A8835F]" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#383431]">请确认创作方案</p>
          <p className="text-[10px] text-[#A8A39E]">「{title}」</p>
        </div>
      </div>
      <div className="bg-[#F8F7F6] rounded-lg p-3 mb-4 text-[12px] text-[#524D48] leading-relaxed max-h-[200px] overflow-y-auto">
        {expanded ? (
          <div className="whitespace-pre-wrap">{preview || '暂无方案内容'}</div>
        ) : (
          <p>{summary || '暂无方案内容'}</p>
        )}
        {preview.length > 180 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-[#A8835F] mt-2 hover:underline"
          >
            {expanded ? '收起' : '展开全文'}
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#6E6862] mb-3">确认后将进入制作流程（剧本 → 角色 → 分镜 → 视频 → 合成）</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || isGenerating || !preview.trim()}
          onClick={() => confirmPlan()}
          className={cn(
            'h-9 px-4 rounded-lg text-[12px] font-medium transition-colors',
            disabled || isGenerating || !preview.trim()
              ? 'bg-[#EFEDEB] text-[#A8A39E] cursor-not-allowed'
              : 'bg-[#A8835F] text-white hover:bg-[#8E6A48]',
          )}
        >
          确认方案
        </button>
        <button
          type="button"
          disabled={disabled || isGenerating}
          onClick={handleModify}
          className="h-9 px-4 rounded-lg border border-[#DEDBD8] text-[12px] text-[#524D48] hover:bg-[#F8F7F6] disabled:opacity-50"
        >
          继续修改
        </button>
        <button
          type="button"
          disabled={disabled || isGenerating}
          onClick={() => regeneratePlan()}
          className="h-9 px-4 rounded-lg border border-[#DEDBD8] text-[12px] text-[#524D48] hover:bg-[#F8F7F6] disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw size={12} />
          重新生成
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Mode Selector Card
// ═══════════════════════════════════════════════════
function ModeSelectorCard({ title, onSelect, disabled }: { title: string; onSelect?: (mode: PipelineMode) => void; disabled?: boolean }) {
  const modes: Array<{ key: PipelineMode; icon: React.ReactNode; label: string; desc: string }> = [
    { key: 'auto', icon: <Rocket size={16} />, label: '全自动', desc: '一口气执行完所有步骤' },
    { key: 'confirm', icon: <Hand size={16} />, label: '每步确认', desc: '每完成一步暂停确认' },
    { key: 'preview', icon: <EyeOff size={16} />, label: '仅预览', desc: '只生成预览，不调用昂贵API' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-[#EFEDEB] shadow-sm p-5 max-w-[480px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#F0F3F7] flex items-center justify-center"><Bot size={16} className="text-[#5A7FA8]" /></div>
        <div>
          <p className="text-[13px] font-semibold text-[#383431]">📋 制作计划</p>
          <p className="text-[10px] text-[#A8A39E]">「{title}」</p>
        </div>
      </div>
      <div className="bg-[#F8F7F6] rounded-lg p-3 mb-4 text-[12px] text-[#524D48] leading-relaxed">
        ① 剧本 → ② 角色 → ③ 分镜 → ④ 视频 → ⑤ 配音 → ⑥ 合成<br />
        <span className="text-[#A8A39E]">预计耗时 15-20 分钟，你可以在右侧面板实时查看进度。</span>
      </div>
      <p className="text-[11px] text-[#6E6862] mb-2 font-medium">选择执行模式：</p>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button key={m.key} disabled={disabled} onClick={() => !disabled && onSelect?.(m.key)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
              disabled ? 'border-[#EFEDEB] opacity-50 cursor-not-allowed' : 'border-[#DEDBD8] hover:border-[#A8835F] hover:bg-[#FBF7F4]',
            )}>
            <span className="text-[#A8835F]">{m.icon}</span>
            <span className="text-[11px] font-semibold text-[#383431]">{m.label}</span>
            <span className="text-[9px] text-[#A8A39E] text-center">{m.desc}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Pipeline Panel (right side)
// ═══════════════════════════════════════════════════
function PipelinePanel() {
  const currentStep = usePipelineStore((s) => s.currentStep);
  const status = usePipelineStore((s) => s.status);
  const projectTitle = usePipelineStore((s) => s.projectTitle);
  const projectId = usePipelineStore((s) => s.projectId);
  const stale = usePipelineStore((s) => s.stale);
  const pipelineError = usePipelineStore((s) => s.error);
  const waitingConfirmation = usePipelineStore((s) => s.waitingConfirmation);
  const setPanelOpen = usePipelineStore((s) => s.setPanelOpen);
  const projects = useAppStore((s) => s.projects);

  const {
    confirmAndResume,
    retryCurrentStep,
    cancelActivePipeline,
  } = usePipelineExecution();

  const boundProjectName = useMemo(() => {
    if (!projectId) return projectTitle || '未绑定项目';
    return projects.find((p) => p.id === projectId)?.name || projectTitle || '当前项目';
  }, [projectId, projectTitle, projects]);

  const showRetry =
    status === 'failed'
    || !!pipelineError
    || stale
    || status === 'running';

  const stepComponents = [ScriptPreview, CharacterPreview, StoryboardPreview, VideoPreview, AudioPreview, ComposePreview];
  const CurrentStepComponent = stepComponents[currentStep] || EmptyStep;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#EFEDEB] shrink-0 bg-[#F8F7F6]">
        <div className="flex items-center gap-2 min-w-0">
          {status === 'running' && <span className="w-2 h-2 rounded-full bg-[#5A7FA8] animate-pulse shrink-0" />}
          {status === 'paused' && <span className="w-2 h-2 rounded-full bg-[#C49A3C] shrink-0" />}
          {status === 'completed' && <span className="w-2 h-2 rounded-full bg-[#5B8C5A] shrink-0" />}
          {status === 'failed' && <span className="w-2 h-2 rounded-full bg-[#B85C50] shrink-0" />}
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-[#383431]">制作进度</span>
            <p className="text-[10px] text-[#A8A39E] truncate" title={boundProjectName}>
              项目：{boundProjectName}
            </p>
          </div>
          {waitingConfirmation && status === 'paused' && (
            <button
              onClick={() => { void confirmAndResume(); }}
              className="ml-1 px-2 py-0.5 rounded text-[10px] bg-[#5A7FA8] text-white hover:bg-[#4A6F8A] transition-colors shrink-0"
            >
              继续
            </button>
          )}
          {showRetry && (
            <button
              onClick={() => { void retryCurrentStep(); }}
              className="ml-1 px-2 py-0.5 rounded text-[10px] border border-[#DEDBD8] text-[#524D48] hover:border-[#A8835F] hover:bg-[#FBF7F4] transition-colors shrink-0 flex items-center gap-1"
            >
              <RefreshCw size={10} />
              重试
            </button>
          )}
          {status !== 'idle' && status !== 'completed' && (
            <button
              onClick={() => { void cancelActivePipeline(); }}
              className="ml-1 px-2 py-0.5 rounded text-[10px] border border-[#E8D4D0] text-[#B85C50] hover:bg-[#FBF4F3] transition-colors shrink-0"
            >
              取消
            </button>
          )}
        </div>
        <button onClick={() => setPanelOpen(false)} className="w-6 h-6 rounded flex items-center justify-center text-[#A8A39E] hover:text-[#6E6862] hover:bg-[#EFEDEB] transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>

      {(stale || pipelineError) && (
        <div className="px-4 py-2 bg-[#FBF4F3] border-b border-[#EFEDEB] text-[11px] text-[#B85C50]">
          {pipelineError?.message || '进度长时间未更新，可能已卡住。可点击「重试」或「取消」后重新启动。'}
        </div>
      )}

      {/* Step bar */}
      <StepBar />

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <CurrentStepComponent />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN CHAT PAGE
// ═══════════════════════════════════════════════════
export default function Chat() {
  const [searchParams] = useSearchParams();
  const boundProjectId = searchParams.get('projectId');
  const boundSessionId = searchParams.get('sessionId');

  const currentSession = useChatStore((s) => s.getCurrentSession());
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const pipelineStage = useChatStore((s) => s.pipelineStage);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const createSession = useChatStore((s) => s.createSession);

  const pipelineStatus = usePipelineStore((s) => s.status);
  const panelOpen = usePipelineStore((s) => s.panelOpen);
  const setPanelOpen = usePipelineStore((s) => s.setPanelOpen);
  const pipelineProjectId = usePipelineStore((s) => s.projectId);
  const pipelineChatSessionId = usePipelineStore((s) => s.chatSessionId);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectSession = useChatStore((s) => s.selectSession);
  const sessions = useChatStore((s) => s.sessions);

  const extractedTitle = useChatStore((s) => s.extractedTitle);
  const lastCreationUserMessage = useChatStore((s) => s.lastCreationUserMessage);
  const planConfirmed = useChatStore((s) => s.planConfirmed);
  const projects = useAppStore((s) => s.projects);

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<PipelineMode>('auto');
  const [startingPipeline, setStartingPipeline] = useState(false);

  useEffect(() => {
    if (!boundProjectId) return;
    useAppStore.getState().setSelectedProject(boundProjectId);
    if (projects.some((p) => p.id === boundProjectId)) return;
    apiGetProjects()
      .then((data) => {
        const apiProjects: Project[] = data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          type: ((p.type as string) || '漫剧') as ProjectType,
          status: '草稿',
          progress: 0,
          currentEpisode: 1,
          totalEpisodes: (p.episodes as number) || 8,
          lastEdited: '未知',
          thumbnail: '/project-placeholder-1.jpg',
        }));
        useAppStore.setState({ projects: apiProjects });
      })
      .catch(() => {/* 忽略 */});
  }, [boundProjectId, projects]);

  useEffect(() => {
    if (!boundSessionId) return;
    if (sessions.some((s) => s.id === boundSessionId)) {
      selectSession(boundSessionId);
    }
  }, [boundSessionId, sessions, selectSession]);

  const messages = useMemo(() => currentSession?.messages ?? [], [currentSession?.messages]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isGenerating]);

  const handleQuickFill = (text: string) => {
    if (!currentSessionId) createSession();
    const fn = (window as unknown as Record<string, unknown>).__chatFillInput;
    if (typeof fn === 'function') fn(text);
    else setTimeout(() => sendMessage(text), 100);
  };

  const {
    runPipeline,
    confirmAndResume,
    retryFailedStep,
    skipFailedStep,
    goToComposer,
  } = usePipelineExecution();

  const lastUserMessage = useMemo(() => {
    if (lastCreationUserMessage) return lastCreationUserMessage;
    const userMsgs = messages.filter((m) => m.role === 'user');
    return userMsgs[userMsgs.length - 1]?.content || extractedTitle || '创作项目';
  }, [messages, extractedTitle, lastCreationUserMessage]);

  const planTitle = extractedTitle || lastUserMessage.slice(0, 24) || '创作项目';

  const executePipeline = useCallback(async (mode: PipelineMode, options: RunPipelineOptions) => {
    setStartingPipeline(true);
    try {
      await runPipeline(mode, lastUserMessage, options);
      setStartDialogOpen(false);
    } catch (err) {
      console.error('[Pipeline] 启动失败:', err);
      toastInfo('Pipeline 启动失败，请检查后端服务');
    } finally {
      setStartingPipeline(false);
    }
  }, [runPipeline, lastUserMessage]);

  const handleModeSelect = async (mode: PipelineMode) => {
    if (pipelineStatus === 'running' || startingPipeline) return;
    if (!planConfirmed) {
      toastInfo('请先确认上方的创作方案');
      return;
    }
    if (boundProjectId) {
      await executePipeline(mode, { projectId: boundProjectId });
      return;
    }
    setPendingMode(mode);
    setStartDialogOpen(true);
  };

  const handleStartConfirm = (options: RunPipelineOptions) => {
    void executePipeline(pendingMode, options);
  };

  const bubbleProps = {
    onModeSelect: handleModeSelect,
    pipelineRunning: pipelineStatus === 'running' || pipelineStatus === 'paused' || startingPipeline,
    onConfirmStep: confirmAndResume,
    onRetryStep: retryFailedStep,
    onSkipStep: skipFailedStep,
    onGoComposer: goToComposer,
  };

  // Build chat messages including pipeline-related ones
  const allMessages = [...messages];
  if (pipelineStatus === 'idle' && !currentSessionId) {
    // Show empty state
  }

  const pipelineCtx = useMemo(() => ({
    status: pipelineStatus,
    pipelineProjectId,
    pipelineChatSessionId,
    currentSessionId,
    boundProjectId,
    selectedProjectId,
  }), [pipelineStatus, pipelineProjectId, pipelineChatSessionId, currentSessionId, boundProjectId, selectedProjectId]);

  const pipelineBound = isPipelineBoundToChat(pipelineCtx);
  const showPanel = isPipelineVisibleForChat({ ...pipelineCtx, panelOpen });

  useEffect(() => {
    if (!pipelineBound || pipelineStatus === 'idle') return;

    if (pipelineChatSessionId && currentSessionId !== pipelineChatSessionId) {
      const session = sessions.find((s) => s.id === pipelineChatSessionId);
      if (session) selectSession(pipelineChatSessionId);
    }

    if (!usePipelineStore.getState().panelOpen) {
      setPanelOpen(true);
    }
  }, [pipelineBound, pipelineStatus, pipelineChatSessionId, currentSessionId, sessions, selectSession, setPanelOpen]);

  return (
    <div className="h-[calc(100dvh-52px)] flex flex-col bg-gradient-to-b from-[#FBF7F4] to-[#F5EDE6] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/40 backdrop-blur-md border-b border-[#DEDBD8]/50">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h2 className="text-[14px] font-semibold text-[#383431] truncate">
              {currentSession?.title || 'AI 创作助手'}
            </h2>
            {currentSession && <p className="text-[10px] text-[#A8A39E]">{currentSession.messages.length} 条消息</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pipelineBound && !showPanel && (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#DEDBD8] bg-white/90 text-[11px] font-medium text-[#5A7FA8] hover:border-[#5A7FA8] hover:bg-[#F0F3F7] transition-colors"
            >
              <Film size={14} />
              打开制作面板
            </button>
          )}
          <ProjectContextBadge projectId={boundProjectId} />
          <ModelSkillBar />
        </div>
      </div>

      <AnimatePresence>
        {startDialogOpen && (
          <PipelineStartDialog
            open={startDialogOpen}
            mode={pendingMode}
            title={planTitle}
            onClose={() => !startingPipeline && setStartDialogOpen(false)}
            onConfirm={handleStartConfirm}
          />
        )}
      </AnimatePresence>

      {/* Main content: chat + optional panel */}
      <div className="flex-1 min-h-0">
        {showPanel ? (
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={50} minSize={30} maxSize={70}>
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="max-w-[880px] mx-auto px-4 md:px-6 py-6 space-y-6">
                    {allMessages.map((msg) => <MessageBubble key={msg.id} message={msg} {...bubbleProps} />)}
                    {isGenerating && <TypingIndicator stage={pipelineStage} />}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <ChatInput onQuickFill={handleQuickFill} />
              </div>
            </Panel>
            <PanelResizeHandle className="w-[3px] bg-[#DEDBD8] hover:bg-[#A8835F] transition-colors cursor-col-resize" />
            <Panel defaultSize={50} minSize={30} maxSize={70}>
              <PipelinePanel />
            </Panel>
          </PanelGroup>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto min-h-0">
              {currentSessionId && messages.length > 0 ? (
                <div className="max-w-[880px] mx-auto px-4 md:px-6 py-6 space-y-6">
                  {messages.map((msg) => <MessageBubble key={msg.id} message={msg} {...bubbleProps} />)}
                  {isGenerating && <TypingIndicator stage={pipelineStage} />}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center max-w-[720px] px-6">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#F5EDE6] to-[#EAD8C8] flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Sparkles size={44} className="text-[#A8835F]" />
                    </div>
                    <h2 className="text-[26px] font-semibold text-[#383431] mb-2">AI 创作助手</h2>
                    <p className="text-[14px] text-[#6E6862] mb-8 leading-relaxed">选择一个话题开始，或在下方输入你的创意想法</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {quickHints.map((hint, i) => (
                        <button key={i} onClick={() => handleQuickFill(hint.text)}
                          className="px-4 py-3 rounded-xl border border-[#DEDBD8] hover:border-[#D9BFA8] hover:bg-[#FBF7F4] text-left text-[13px] text-[#524D48] transition-all hover:shadow-sm leading-relaxed">
                          {hint.label}
                          <span className="block text-[11px] text-[#A8A39E] mt-0.5 line-clamp-1">{hint.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <ChatInput onQuickFill={handleQuickFill} />
          </div>
        )}
      </div>
    </div>
  );
}
