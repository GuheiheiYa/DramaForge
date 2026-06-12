import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle,
  X,
  Trash2,
  Eye,
  Plus,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import ConfirmDialog from './ConfirmDialog';

type StageStatus = 'completed' | 'in_progress' | 'waiting' | 'failed';

interface Stage {
  id: string;
  name: string;
  status: StageStatus;
}

interface TaskItem {
  id: string;
  name: string;
  status: StageStatus;
  progress: number;
  detail?: string;
  elapsed?: string;
}

const defaultStages: Stage[] = [
  { id: 'script', name: '剧本', status: 'completed' },
  { id: 'character', name: '角色', status: 'completed' },
  { id: 'storyboard', name: '分镜', status: 'completed' },
  { id: 'video', name: '视频', status: 'in_progress' },
  { id: 'voice', name: '配音', status: 'waiting' },
  { id: 'bgm', name: 'BGM', status: 'waiting' },
  { id: 'compose', name: '合成', status: 'waiting' },
];

const defaultTasks: TaskItem[] = [
  { id: 't1', name: '分镜 01：开场场景', status: 'completed', progress: 100, elapsed: '18s' },
  { id: 't2', name: '分镜 02：角色登场', status: 'completed', progress: 100, elapsed: '22s' },
  { id: 't3', name: '分镜 03：对话场景', status: 'completed', progress: 100, elapsed: '15s' },
  { id: 't4', name: '分镜 04：回忆片段', status: 'completed', progress: 100, elapsed: '25s' },
  { id: 't5', name: '分镜 05：雨中相遇', status: 'in_progress', progress: 65, detail: '正在渲染画面细节...' },
  { id: 't6', name: '分镜 06：情感高潮', status: 'waiting', progress: 0 },
  { id: 't7', name: '分镜 07：冲突升级', status: 'waiting', progress: 0 },
];

export default function ProgressPanel() {
  const [expanded, setExpanded] = useState(false);
  const [visible] = useState(true);
  const [stages] = useState<Stage[]>(defaultStages);
  const [tasks, setTasks] = useState<TaskItem[]>(defaultTasks);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [cancelTaskName, setCancelTaskName] = useState('');

  const overallProgress = useCallback(() => {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(total / tasks.length);
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  const handleCancelTask = (taskId: string, taskName: string) => {
    setCancelTaskId(taskId);
    setCancelTaskName(taskName);
    setShowConfirm(true);
  };

  const confirmCancel = () => {
    if (cancelTaskId) {
      setTasks((prev) => prev.filter((t) => t.id !== cancelTaskId));
      toast.success(`已取消任务「${cancelTaskName}」`);
      setCancelTaskId(null);
    }
  };

  const handleViewDetails = (task: TaskItem) => {
    toast.info(`「${task.name}」- 进度: ${task.progress}%${task.detail ? ` | ${task.detail}` : ''}`);
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
    toast.success('已清除所有已完成的任务');
  };

  const handleSimulateTask = () => {
    const newTask: TaskItem = {
      id: `t${Date.now()}`,
      name: `分镜 ${String(tasks.length + 1).padStart(2, '0')}：新场景生成`,
      status: 'in_progress',
      progress: Math.floor(Math.random() * 40) + 10,
      detail: '正在生成画面内容...',
    };
    setTasks((prev) => [...prev, newTask]);
    toast.success('已添加新的生成任务');
  };

  const handleProgressClick = () => {
    toast.info(`总进度: ${overallProgress()}% | 已完成: ${completedCount} | 进行中: ${inProgressCount}`);
  };

  if (!visible) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          className="fixed bottom-5 right-5 z-progress-panel"
          style={{ width: expanded ? 400 : 280 }}
        >
          {expanded ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl border border-[#DEDBD8] overflow-hidden max-h-[520px] flex flex-col"
            >
              {/* Header */}
              <div
                className="h-14 px-5 border-b border-[#DEDBD8] flex items-center justify-between shrink-0 cursor-pointer hover:bg-[#F8F7F6] transition-colors"
                onClick={() => setExpanded(false)}
              >
                <div className="flex items-center gap-2.5">
                  {inProgressCount > 0 ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#5A7FA8] border-t-transparent animate-spinner" />
                  ) : (
                    <Check size={18} className="text-[#5B8C5A]" />
                  )}
                  <span className="text-small font-semibold text-[#383431]">生成进度</span>
                  <span className="px-2 py-0.5 bg-[#EFEDEB] text-[#8B847E] text-caption rounded-full">
                    {tasks.length}个任务
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProgressClick();
                    }}
                  >
                    <div className="w-[120px] h-1.5 bg-[#DEDBD8] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#C4A07F] to-[#8E6A48]"
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress()}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-caption font-mono font-semibold text-[#8E6A48]">
                      {overallProgress()}%
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(false);
                    }}
                    className="text-[#A8A39E] hover:text-[#6E6862] transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              {/* Stage Flow */}
              <div className="px-5 py-3 border-b border-[#EFEDEB] overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                  {stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-1">
                      <div className="flex flex-col items-center" style={{ width: 48 }}>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            stage.status === 'completed'
                              ? 'bg-[#5B8C5A]'
                              : stage.status === 'in_progress'
                                ? 'bg-[#5A7FA8] animate-pulse-glow'
                                : stage.status === 'failed'
                                  ? 'bg-[#B85C50]'
                                  : 'bg-[#DEDBD8]'
                          }`}
                        >
                          {stage.status === 'completed' ? (
                            <Check size={14} className="text-white" />
                          ) : stage.status === 'in_progress' ? (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          ) : stage.status === 'failed' ? (
                            <AlertCircle size={14} className="text-white" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#C5C1BC]" />
                          )}
                        </div>
                        <span
                          className={`text-[11px] mt-1 ${
                            stage.status === 'completed'
                              ? 'text-[#5B8C5A]'
                              : stage.status === 'in_progress'
                                ? 'text-[#5A7FA8] font-medium'
                                : stage.status === 'failed'
                                  ? 'text-[#B85C50]'
                                  : 'text-[#C5C1BC]'
                          }`}
                        >
                          {stage.name}
                        </span>
                      </div>
                      {idx < stages.length - 1 && (
                        <div
                          className={`w-4 h-0.5 ${
                            stage.status === 'completed'
                              ? 'bg-[#5B8C5A]'
                              : stage.status === 'in_progress'
                                ? 'bg-[#DEDBD8] border-dashed'
                                : 'bg-[#DEDBD8]'
                          }`}
                          style={
                            stage.status === 'in_progress'
                              ? { borderTop: '1px dashed #DEDBD8', background: 'transparent', height: '1px' }
                              : {}
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto py-2 min-h-0">
                {/* Section header */}
                <div className="sticky top-0 bg-white px-5 py-2 border-b border-[#EFEDEB] z-10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-small font-medium text-[#383431]">视频生成</h4>
                    <span className="text-caption text-[#A8A39E]">
                      {completedCount}/{tasks.length} 完成
                    </span>
                  </div>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-[#A8A39E] text-small">
                    暂无任务
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-5 py-2.5 border-b border-[#F8F7F6] hover:bg-[#F8F7F6] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-4">
                          {task.status === 'completed' ? (
                            <Check size={16} className="text-[#5B8C5A]" />
                          ) : task.status === 'in_progress' ? (
                            <div className="w-4 h-4 rounded-full border-2 border-[#5A7FA8] border-t-transparent animate-spinner" />
                          ) : task.status === 'failed' ? (
                            <AlertCircle size={16} className="text-[#B85C50]" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#C5C1BC] block" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-small truncate ${
                              task.status === 'completed'
                                ? 'text-[#6E6862]'
                                : task.status === 'in_progress'
                                  ? 'text-[#383431]'
                                  : 'text-[#A8A39E]'
                            }`}
                          >
                            {task.name}
                          </p>
                          {task.detail && (
                            <p className="text-caption text-[#5A7FA8] mt-0.5">{task.detail}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          {task.status === 'in_progress' ? (
                            <span className="text-caption font-mono text-[#5A7FA8]">{task.progress}%</span>
                          ) : task.elapsed ? (
                            <span className="text-caption font-mono text-[#A8A39E]">{task.elapsed}</span>
                          ) : null}

                          {/* Action buttons (show on hover) */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleViewDetails(task)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#A8A39E] hover:text-[#5A7FA8] transition-colors"
                              title="查看详情"
                            >
                              <Eye size={12} />
                            </button>
                            {task.status !== 'completed' && (
                              <button
                                onClick={() => handleCancelTask(task.id, task.name)}
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#FDF2F0] text-[#A8A39E] hover:text-[#B85C50] transition-colors"
                                title="取消任务"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {task.status === 'in_progress' && (
                        <div className="mt-2 w-full h-[3px] bg-[#F8F7F6] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[#8AB4D8]"
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                            transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3 border-t border-[#EFEDEB] flex items-center justify-between shrink-0">
                <button
                  onClick={handleSimulateTask}
                  className="h-8 px-3 rounded-lg border border-[#DEDBD8] text-caption text-[#524D48] hover:bg-[#F8F7F6] transition-colors flex items-center gap-1.5"
                >
                  <Plus size={12} /> 模拟新任务
                </button>
                {completedCount > 0 && (
                  <button
                    onClick={handleClearCompleted}
                    className="h-8 px-3 rounded-lg text-caption text-[#B85C50] hover:bg-[#FDF2F0] transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={12} /> 清除已完成
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            /* Collapsed View */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-lg border border-[#DEDBD8] overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setExpanded(true)}
            >
              <div className="h-14 px-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {inProgressCount > 0 ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#5A7FA8] border-t-transparent animate-spinner" />
                  ) : (
                    <Check size={18} className="text-[#5B8C5A]" />
                  )}
                  <span className="text-small font-semibold text-[#383431]">生成进度</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProgressClick();
                    }}
                  >
                    <div className="w-[100px] h-1.5 bg-[#DEDBD8] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#C4A07F] to-[#8E6A48]"
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress()}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-caption font-mono font-semibold text-[#8E6A48]">
                      {overallProgress()}%
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(true);
                    }}
                    className="text-[#A8A39E] hover:text-[#6E6862] transition-colors"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setCancelTaskId(null);
        }}
        onConfirm={confirmCancel}
        title="取消任务"
        description={`确定要取消「${cancelTaskName}」吗？此操作不可恢复。`}
        confirmText="确认取消"
        cancelText="继续执行"
        confirmVariant="danger"
      />
    </>
  );
}
