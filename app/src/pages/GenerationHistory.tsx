import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo, toastError } from '@/hooks/useToast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAppStore } from '@/store/useAppStore';
import {
  getGenerationTasks,
  cancelGenerationTask,
  clearGenerationTasks,
  submitGenerationTask,
  type GenerationTaskData,
} from '@/lib/api';

type TaskType = '剧本' | '角色' | '分镜' | '视频' | '配音' | 'BGM' | '合成' | '全部';
type TaskStatus = '成功' | '失败' | '进行中' | '已取消' | '等待中';

interface HistoryItem {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  projectName: string;
  episodeName: string;
  cost: string;
  duration: string;
  createdAt: string;
  detail?: string;
}

const stageToType: Record<string, string> = {
  script: '剧本',
  character: '角色',
  storyboard: '分镜',
  video: '视频',
  audio: '配音',
  compose: '合成',
};

const statusToDisplay: Record<string, TaskStatus> = {
  queued: '等待中',
  running: '进行中',
  completed: '成功',
  failed: '失败',
  cancelled: '已取消',
};

const taskTypeOptions: TaskType[] = ['全部', '剧本', '角色', '分镜', '视频', '配音', 'BGM', '合成'];

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; bg: string; text: string }> = {
  '成功': { icon: <CheckCircle size={14} />, bg: 'bg-[#F0F5F0]', text: 'text-[#5B8C5A]' },
  '失败': { icon: <AlertCircle size={14} />, bg: 'bg-[#FDF2F0]', text: 'text-[#B85C50]' },
  '进行中': { icon: <Loader2 size={14} className="animate-spin" />, bg: 'bg-[#F0F3F7]', text: 'text-[#5A7FA8]' },
  '等待中': { icon: <Clock size={14} />, bg: 'bg-[#F5EDE6]', text: 'text-[#8E6A48]' },
  '已取消': { icon: <X size={14} />, bg: 'bg-[#EFEDEB]', text: 'text-[#8B847E]' },
};

/** 后端 GenerationTaskData → 前端 HistoryItem 转换 */
function toHistoryItem(task: GenerationTaskData, projects: { id: string; name: string }[]): HistoryItem {
  const project = projects.find((p) => p.id === task.project_id);
  const status = statusToDisplay[task.status] || '等待中';

  // 计算耗时
  let duration = '—';
  if (task.started_at && task.completed_at) {
    const start = new Date(task.started_at).getTime();
    const end = new Date(task.completed_at).getTime();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) duration = `${seconds}s`;
    else duration = `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  } else if (task.started_at && task.status === 'running') {
    const start = new Date(task.started_at).getTime();
    const seconds = Math.round((Date.now() - start) / 1000);
    duration = `${seconds}s`;
  }

  // 格式化时间
  let createdAt = '未知';
  if (task.created_at) {
    const date = new Date(task.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) createdAt = '刚刚';
    else if (diffMin < 60) createdAt = `${diffMin}分钟前`;
    else if (diffHour < 24) createdAt = `${diffHour}小时前`;
    else if (diffDay < 7) createdAt = `${diffDay}天前`;
    else createdAt = date.toLocaleDateString('zh-CN');
  }

  return {
    id: task.task_id,
    type: stageToType[task.stage] || task.stage,
    status,
    progress: task.progress,
    projectName: project?.name || '未知项目',
    episodeName: '—',
    cost: '—',
    duration,
    createdAt,
    detail: task.error_message || task.detail,
  };
}

export default function GenerationHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rawTasks, setRawTasks] = useState<GenerationTaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TaskType>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const projects = useAppStore((s) => s.projects);

  // 从后端加载任务列表
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGenerationTasks({ page_size: 100 });
      setRawTasks(data.items);
      setHistory(data.items.map((t) => toHistoryItem(t, projects)));
    } catch (err) {
      console.error('[GenerationHistory] 加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filtered = useMemo(() => {
    let result = [...history];
    if (filterType !== '全部') result = result.filter((h) => h.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((h) => h.projectName.toLowerCase().includes(q));
    }
    return result;
  }, [history, filterType, searchQuery]);

  const stats = useMemo(() => ({
    total: history.length,
    success: history.filter((h) => h.status === '成功').length,
    failed: history.filter((h) => h.status === '失败').length,
    inProgress: history.filter((h) => h.status === '进行中' || h.status === '等待中').length,
  }), [history]);

  const clearAll = async () => {
    try {
      await clearGenerationTasks();
      setHistory([]);
      setShowClearConfirm(false);
      toastSuccess('已清空所有生成记录');
    } catch (err) {
      toastError('清空失败');
    }
  };

  const handleRetry = async (id: string) => {
    const task = rawTasks.find((t) => t.task_id === id);
    if (!task) {
      toastError('找不到原始任务信息');
      return;
    }
    try {
      toastInfo('正在重新提交任务...');
      await submitGenerationTask({
        project_id: task.project_id,
        stage: task.stage,
        skill_id: task.skill_id || undefined,
      });
      toastSuccess('任务已重新提交');
      await loadTasks();
    } catch (err) {
      toastError('重新提交失败');
    }
  };

  return (
    <>
      <div className="px-6 py-5 max-w-[1280px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-6">
          <h1 className="text-h1 mb-1">生成记录</h1>
          <p className="text-body text-[#6E6862]">查看所有AI生成任务的执行状态和历史</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="flex gap-3 mb-6">
          {[
            { label: '总任务数', value: stats.total, color: 'text-[#8E6A48]' },
            { label: '成功', value: stats.success, color: 'text-[#5B8C5A]' },
            { label: '失败', value: stats.failed, color: 'text-[#B85C50]' },
            { label: '进行中', value: stats.inProgress, color: 'text-[#5A7FA8]' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }} className="bg-[#F8F7F6] rounded-xl px-5 py-4 flex-1">
              <p className={cn('text-h2 font-mono mb-0.5', stat.color)}>{stat.value}</p>
              <p className="text-caption text-[#8B847E]">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="flex flex-col gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[360px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A39E]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索项目..." className="w-full h-10 pl-9 pr-8 bg-white border border-[#DEDBD8] rounded-lg text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] transition-all" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A39E]"><X size={14} /></button>}
            </div>
            {history.length > 0 && (
              <button onClick={() => setShowClearConfirm(true)} className="h-9 px-3 rounded-lg border border-[#DEDBD8] text-small text-[#B85C50] hover:bg-[#FDF2F0] transition-colors flex items-center gap-1.5">
                <Trash2 size={14} /> 清空记录
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {taskTypeOptions.map((t) => (
              <motion.button key={t} onClick={() => setFilterType(t)} whileTap={{ scale: 0.95 }}
                className={cn('relative h-9 px-4 rounded-lg text-small font-medium transition-all', filterType === t ? 'text-[#755235]' : 'text-[#6E6862] hover:text-[#383431] hover:bg-[#F8F7F6]')}
              >
                {filterType === t && (
                  <motion.div layoutId="history-filter-bg" className="absolute inset-0 bg-[#FBF7F4] border border-[#EAD8C8] rounded-lg" transition={{ duration: 0.25 }} />
                )}
                <span className="relative z-10">{t}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#A8835F]" />
            <span className="ml-3 text-[#A8A39E]">加载中...</span>
          </div>
        ) : (
          /* History List */
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div key={filterType} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-[#DEDBD8] shadow-sm overflow-hidden">
                <div className="h-10 flex items-center px-4 bg-[#F8F7F6] border-b border-[#EFEDEB] text-caption text-[#8B847E] font-medium">
                  <span className="w-16 text-center">类型</span>
                  <span className="w-20 text-center">状态</span>
                  <span className="flex-1">项目</span>
                  <span className="w-20 text-center">成本</span>
                  <span className="w-24 text-center">耗时</span>
                  <span className="w-24 text-center">时间</span>
                  <span className="w-20 text-center">操作</span>
                </div>
                {filtered.map((item, i) => {
                  const cfg = statusConfig[item.status] || statusConfig['成功'];
                  const rawTask = rawTasks.find((t) => t.task_id === item.id);
                  const isExpanded = expandedId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                    >
                      <div className="h-14 flex items-center px-4 border-b border-[#EFEDEB] hover:bg-[#FBF7F4] transition-colors group">
                        {/* Type */}
                        <span className="w-16 text-center">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded text-[11px] font-medium',
                            item.type === '剧本' ? 'bg-[#F5EDE6] text-[#8E6A48]' :
                            item.type === '角色' ? 'bg-[#F0F3F7] text-[#5A7FA8]' :
                            item.type === '分镜' ? 'bg-[#FDF8F0] text-[#C49A3C]' :
                            item.type === '视频' ? 'bg-[#F0F5F0] text-[#5B8C5A]' :
                            item.type === '配音' ? 'bg-[#FDF2F0] text-[#B85C50]' :
                            item.type === 'BGM' ? 'bg-[#F5EDE6] text-[#8E6A48]' :
                            'bg-[#EFEDEB] text-[#6E6862]'
                          )}>
                            {item.type}
                          </span>
                        </span>

                        {/* Status */}
                        <span className="w-20 flex justify-center">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', cfg.bg, cfg.text)}>
                            {cfg.icon}
                            {item.status}
                          </span>
                        </span>

                        {/* Project */}
                        <div className="flex-1 min-w-0">
                          <p className="text-small text-[#383431] truncate">{item.projectName}</p>
                          {item.detail && <p className="text-[11px] text-[#B85C50] mt-0.5">{item.detail}</p>}
                        </div>

                        {/* Cost */}
                        <span className="w-20 text-center text-caption font-mono text-[#6E6862]">{item.cost}</span>

                        {/* Duration */}
                        <span className="w-24 text-center text-caption text-[#A8A39E]">{item.duration}</span>

                        {/* Time */}
                        <span className="w-24 text-center text-caption text-[#A8A39E]">{item.createdAt}</span>

                        {/* Actions */}
                        <div className="w-20 flex justify-center items-center gap-1">
                          {item.status === '失败' && (
                            <button onClick={() => handleRetry(item.id)} className="w-7 h-7 rounded flex items-center justify-center text-[#A8A39E] hover:text-[#5A7FA8] hover:bg-[#F0F3F7] transition-all" title="重试">
                              <RefreshCw size={13} />
                            </button>
                          )}
                          <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className={cn('w-7 h-7 rounded flex items-center justify-center transition-all', isExpanded ? 'text-[#5A7FA8] bg-[#F0F3F7]' : 'text-[#A8A39E] hover:text-[#5A7FA8] hover:bg-[#F0F3F7] opacity-0 group-hover:opacity-100')} title="查看详情">
                            <Eye size={13} />
                          </button>
                        </div>
                      </div>
                      {/* Inline Detail Panel */}
                      <AnimatePresence>
                        {isExpanded && rawTask && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-b border-[#EFEDEB] bg-[#FAFAF9]"
                          >
                            <div className="px-4 py-3 space-y-2 text-[12px]">
                              {rawTask.detail && (
                                <div>
                                  <span className="text-[#8B847E] font-medium">详情：</span>
                                  <span className="text-[#383431]">{rawTask.detail}</span>
                                </div>
                              )}
                              {rawTask.error_message && (
                                <div>
                                  <span className="text-[#B85C50] font-medium">错误信息：</span>
                                  <span className="text-[#B85C50]">{rawTask.error_message}</span>
                                </div>
                              )}
                              {rawTask.result && Object.keys(rawTask.result).length > 0 && (
                                <div>
                                  <span className="text-[#8B847E] font-medium">结果：</span>
                                  <pre className="mt-1 p-2 bg-white rounded border border-[#DEDBD8] text-[11px] text-[#383431] overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawTask.result, null, 2)}</pre>
                                </div>
                              )}
                              {!rawTask.detail && !rawTask.error_message && (!rawTask.result || Object.keys(rawTask.result).length === 0) && (
                                <div className="text-[#A8A39E]">暂无详细信息</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-[#F5EDE6] flex items-center justify-center mb-4">
                  <Clock size={32} className="text-[#C4A07F]" />
                </div>
                <h3 className="text-h4 text-[#524D48] mb-2">暂无生成记录</h3>
                <p className="text-small text-[#A8A39E]">当你开始生成剧本、分镜或视频时，记录将显示在这里</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <ConfirmDialog isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} onConfirm={clearAll} title="清空生成记录" description="确定要清空所有生成记录吗？此操作不可恢复。" confirmText="清空" cancelText="取消" confirmVariant="danger" />
      </div>
    </>
  );
}
