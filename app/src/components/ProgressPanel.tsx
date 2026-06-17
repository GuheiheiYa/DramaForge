import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { usePipelineStore, PIPELINE_STEPS, type VideoData } from '@/store/usePipelineStore';

type StageStatus = 'completed' | 'in_progress' | 'waiting' | 'failed' | 'skipped';

export default function ProgressPanel() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const status = usePipelineStore((s) => s.status);
  const steps = usePipelineStore((s) => s.steps);
  const currentStep = usePipelineStore((s) => s.currentStep);
  const projectTitle = usePipelineStore((s) => s.projectTitle);
  const projectId = usePipelineStore((s) => s.projectId);
  const chatSessionId = usePipelineStore((s) => s.chatSessionId);
  const setPanelOpen = usePipelineStore((s) => s.setPanelOpen);

  const visible = status !== 'idle';

  const stages = useMemo(() =>
    PIPELINE_STEPS.map((cfg, i) => {
      const step = steps[i];
      let st: StageStatus = 'waiting';
      if (step?.status === 'done') st = 'completed';
      else if (step?.status === 'running') st = 'in_progress';
      else if (step?.status === 'failed') st = 'failed';
      else if (step?.status === 'skipped') st = 'skipped';
      return { id: cfg.id, name: cfg.label, status: st };
    }),
  [steps]);

  const videoData = steps[3]?.data as VideoData | null;
  const tasks = useMemo(() => {
    if (!videoData?.clips?.length) return [];
    return videoData.clips.map((clip) => ({
      id: clip.id,
      name: clip.name,
      status: clip.status === 'done' ? 'completed' as const : clip.status === 'generating' ? 'in_progress' as const : clip.status === 'failed' ? 'failed' as const : 'waiting' as const,
      progress: clip.progress,
    }));
  }, [videoData]);

  const overallProgress = useCallback(() => {
    if (status === 'completed') return 100;
    const total = steps.reduce((sum, s) => sum + (s.progress || 0), 0);
    return Math.round(total / Math.max(steps.length, 1));
  }, [steps, status]);

  const inProgressCount = stages.filter((s) => s.status === 'in_progress').length;

  const openChatPanel = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPanelOpen(true);
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (chatSessionId) params.set('sessionId', chatSessionId);
    const qs = params.toString();
    navigate(qs ? `/chat?${qs}` : '/chat');
  }, [navigate, projectId, chatSessionId, setPanelOpen]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-5 right-5 z-progress-panel"
        style={{ width: expanded ? 400 : 280 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-[#DEDBD8] overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="h-14 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {inProgressCount > 0 || status === 'running' ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#5A7FA8] border-t-transparent animate-spin" />
              ) : status === 'completed' ? (
                <Check size={18} className="text-[#5B8C5A]" />
              ) : (
                <AlertCircle size={18} className="text-[#A8835F]" />
              )}
              <span className="text-small font-semibold text-[#383431] truncate">
                {projectTitle || '生成进度'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-caption font-mono font-semibold text-[#8E6A48]">{overallProgress()}%</span>
              {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
          </div>

          {expanded && (
            <div className="border-t border-[#EFEDEB] px-5 py-3 max-h-[360px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-wrap gap-2 mb-3">
                {stages.map((stage) => (
                  <span
                    key={stage.id}
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      stage.status === 'completed' ? 'bg-[#F0F5F0] text-[#5B8C5A]' :
                      stage.status === 'in_progress' ? 'bg-[#E8EFF6] text-[#5A7FA8]' :
                      stage.status === 'failed' ? 'bg-[#FDF2F0] text-[#B85C50]' :
                      'bg-[#EFEDEB] text-[#A8A39E]'
                    }`}
                  >
                    {stage.name}
                  </span>
                ))}
              </div>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="py-2 border-b border-[#F8F7F6] last:border-0">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#524D48] truncate flex-1">{task.name}</span>
                      <span className="text-[#A8A39E] ml-2">{task.progress}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-[#A8A39E] py-2">
                  当前步骤：{PIPELINE_STEPS[currentStep]?.label || '—'}
                </p>
              )}
              <button
                type="button"
                onClick={openChatPanel}
                className="mt-3 w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#5A7FA8] hover:bg-[#4A6F8A] text-white text-[12px] font-medium transition-colors"
              >
                <ExternalLink size={14} />
                在 Chat 中打开制作面板
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
