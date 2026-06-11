import { useState, useMemo } from 'react';
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
  Play,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';
import { Toaster } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';

type TaskType = '剧本' | '角色' | '分镜' | '视频' | '配音' | 'BGM' | '合成' | '全部';
type TaskStatus = '成功' | '失败' | '进行中' | '已取消';

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

const mockHistory: HistoryItem[] = [
  { id: 'h1', type: '剧本', status: '成功', progress: 100, projectName: '樱花下的约定', episodeName: '第1集', cost: '¥0.03', duration: '12s', createdAt: '10分钟前' },
  { id: 'h2', type: '角色', status: '成功', progress: 100, projectName: '樱花下的约定', episodeName: '第1集', cost: '¥1.00', duration: '45s', createdAt: '10分钟前' },
  { id: 'h3', type: '分镜', status: '成功', progress: 100, projectName: '樱花下的约定', episodeName: '第1集', cost: '¥1.50', duration: '1分20秒', createdAt: '8分钟前' },
  { id: 'h4', type: '视频', status: '进行中', progress: 65, projectName: '樱花下的约定', episodeName: '第1集', cost: '—', duration: '—', createdAt: '3分钟前', detail: '正在渲染分镜5/12...' },
  { id: 'h5', type: '配音', status: '等待中', progress: 0, projectName: '樱花下的约定', episodeName: '第1集', cost: '—', duration: '—', createdAt: '3分钟前' },
  { id: 'h6', type: 'BGM', status: '等待中', progress: 0, projectName: '樱花下的约定', episodeName: '第1集', cost: '—', duration: '—', createdAt: '3分钟前' },
  { id: 'h7', type: '合成', status: '失败', progress: 30, projectName: '樱花下的约定', episodeName: '第1集', cost: '—', duration: '—', createdAt: '2分钟前', detail: '视频片段拼接超时' },
  { id: 'h8', type: '剧本', status: '成功', progress: 100, projectName: '都市神医', episodeName: '第3集', cost: '¥0.04', duration: '15s', createdAt: '1小时前' },
  { id: 'h9', type: '视频', status: '成功', progress: 100, projectName: '都市神医', episodeName: '第2集', cost: '¥12.40', duration: '3分45秒', createdAt: '2小时前' },
  { id: 'h10', type: '合成', status: '已取消', progress: 0, projectName: '都市神医', episodeName: '第2集', cost: '—', duration: '—', createdAt: '2小时前' },
  { id: 'h11', type: '角色', status: '成功', progress: 100, projectName: '九霄仙途', episodeName: '第1集', cost: '¥1.00', duration: '50秒', createdAt: '昨天' },
  { id: 'h12', type: '剧本', status: '失败', progress: 0, projectName: '九霄仙途', episodeName: '第2集', cost: '—', duration: '—', createdAt: '昨天', detail: 'API调用超时，请重试' },
];

const taskTypeOptions: TaskType[] = ['全部', '剧本', '角色', '分镜', '视频', '配音', 'BGM', '合成'];

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; bg: string; text: string }> = {
  '成功': { icon: <CheckCircle size={14} />, bg: 'bg-[#F0F5F0]', text: 'text-[#5B8C5A]' },
  '失败': { icon: <AlertCircle size={14} />, bg: 'bg-[#FDF2F0]', text: 'text-[#B85C50]' },
  '进行中': { icon: <Loader2 size={14} className="animate-spin" />, bg: 'bg-[#F0F3F7]', text: 'text-[#5A7FA8]' },
  '已取消': { icon: <X size={14} />, bg: 'bg-[#EFEDEB]', text: 'text-[#8B847E]' },
};

export default function GenerationHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(mockHistory);
  const [filterType, setFilterType] = useState<TaskType>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = useMemo(() => {
    let result = [...history];
    if (filterType !== '全部') result = result.filter((h) => h.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((h) => h.projectName.toLowerCase().includes(q) || h.episodeName.toLowerCase().includes(q));
    }
    return result;
  }, [history, filterType, searchQuery]);

  const stats = useMemo(() => ({
    total: history.length,
    success: history.filter((h) => h.status === '成功').length,
    failed: history.filter((h) => h.status === '失败').length,
    inProgress: history.filter((h) => h.status === '进行中').length,
  }), [history]);

  const clearAll = () => {
    setHistory([]);
    setShowClearConfirm(false);
    toastSuccess('已清空所有生成记录');
  };

  const handleRetry = (id: string) => {
    toastInfo('正在重新提交任务...');
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((h) => h.id === id ? { ...h, status: '进行中' as TaskStatus, progress: 10, detail: '已重新提交' } : h)
      );
      toastSuccess('任务已重新提交');
    }, 1000);
  };

  return (
    <>
      <Toaster position="top-center" />
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
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索项目或剧集..." className="w-full h-10 pl-9 pr-8 bg-white border border-[#DEDBD8] rounded-lg text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] transition-all" />
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

        {/* History List */}
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
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="h-14 flex items-center px-4 border-b border-[#EFEDEB] hover:bg-[#FBF7F4] transition-colors group"
                  >
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
                      <p className="text-small text-[#383431] truncate">{item.projectName} <span className="text-[#A8A39E]">/ {item.episodeName}</span></p>
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
                      <button onClick={() => toastInfo(`查看「${item.projectName} ${item.episodeName}」的${item.type}详情`)} className="w-7 h-7 rounded flex items-center justify-center text-[#A8A39E] hover:text-[#5A7FA8] hover:bg-[#F0F3F7] transition-all opacity-0 group-hover:opacity-100" title="查看详情">
                        <Eye size={13} />
                      </button>
                    </div>
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

        <ConfirmDialog isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} onConfirm={clearAll} title="清空生成记录" description="确定要清空所有生成记录吗？此操作不可恢复。" confirmText="清空" cancelText="取消" confirmVariant="danger" />
      </div>
    </>
  );
}
