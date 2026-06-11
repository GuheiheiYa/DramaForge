import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  Trash2,
  X,
  LayoutList,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  CheckSquare,
  Download,
  Image,
  Film,
} from 'lucide-react';
import type { Shot, ViewMode } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

interface ToolbarProps {
  shots: Shot[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  batchMode: boolean;
  onToggleBatchMode: () => void;
  selectedIds: string[];
  onClearSelection: () => void;
  onBatchGenerate?: (ids: string[]) => void;
  onBatchDelete?: (ids: string[]) => void;
  onAddShot?: () => void;
  generating?: boolean;
  generationProgress?: number;
}

export default function Toolbar({
  shots,
  viewMode,
  onViewModeChange,
  batchMode,
  onToggleBatchMode,
  selectedIds,
  onClearSelection,
  onBatchGenerate,
  onBatchDelete,
  onAddShot,
  generating = false,
  generationProgress = 0,
}: ToolbarProps) {
  const completedCount = shots.filter((s) => s.status === '已完成').length;
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const [exportOpen, setExportOpen] = useState(false);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  const handleBatchGenerate = () => {
    if (selectedIds.length === 0) {
      toastInfo('请先选择分镜');
      return;
    }
    onBatchGenerate?.(selectedIds);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toastInfo('请先选择分镜');
      return;
    }
    if (window.confirm(`确定要删除选中的 ${selectedIds.length} 个分镜吗？`)) {
      onBatchDelete?.(selectedIds);
      toastSuccess(`已删除 ${selectedIds.length} 个分镜`);
    }
  };

  const handleExport = (type: 'storyboard' | 'clips' | 'full') => {
    setExportOpen(false);
    switch (type) {
      case 'storyboard':
        toastSuccess('正在导出分镜图...');
        break;
      case 'clips':
        toastSuccess('正在导出视频片段...');
        break;
      case 'full':
        toastSuccess('正在导出完整分镜...');
        break;
    }
  };

  return (
    <div className="h-12 bg-white border-t border-[#DEDBD8] flex items-center px-4 shrink-0 relative">
      <AnimatePresence mode="wait">
        {batchMode && selectedIds.length > 0 ? (
          <motion.div
            key="batch"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
            className="flex items-center justify-between w-full"
          >
            {/* Left: batch info */}
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#524D48]">
                已选 <span className="font-medium text-[#A8835F]">{selectedIds.length}</span> 个分镜
              </span>
              <button
                onClick={onClearSelection}
                className="h-7 px-2 border border-[#DEDBD8] hover:border-[#A8835F] rounded-md text-[12px] text-[#8B847E] hover:text-[#524D48] flex items-center gap-1 transition-colors"
              >
                <X size={12} />
                取消选择
              </button>
            </div>

            {/* Center: progress when generating */}
            {generating && (
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#5A7FA8]">批量生成中...</span>
                <div className="w-32 h-2 bg-[#EFEDEB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5A7FA8] rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-[#A8A39E]">{generationProgress}%</span>
              </div>
            )}

            {/* Right: batch actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchGenerate}
                disabled={generating}
                className="h-8 px-3 bg-[#A8835F] hover:bg-[#8E6A48] disabled:bg-[#DEDBD8] text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:cursor-not-allowed"
              >
                <Sparkles size={13} />
                批量生成
              </button>
              <button
                onClick={handleBatchDelete}
                className="h-8 px-3 border border-[#DEDBD8] hover:border-[#B85C50] hover:bg-[#FDF2F0] text-[#524D48] hover:text-[#B85C50] text-[12px] rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                批量删除
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="normal"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
            className="flex items-center justify-between w-full"
          >
            {/* Left: generation actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const waiting = shots.filter(s => s.status === '等待中' || s.status === '失败');
                  if (waiting.length > 0) {
                    toastSuccess(`开始批量生成 ${waiting.length} 个分镜...`);
                  } else {
                    toastInfo('没有待生成的分镜');
                  }
                }}
                className="h-8 px-3 bg-[#A8835F] hover:bg-[#8E6A48] text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles size={13} />
                全部分镜图
              </button>
              <button
                onClick={() => {
                  if (completedCount > 0) {
                    toastSuccess('开始生成视频...');
                  }
                }}
                className={cn(
                  'h-8 px-3 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors',
                  completedCount > 0
                    ? 'bg-[#A8835F] hover:bg-[#8E6A48] text-white shadow-sm'
                    : 'bg-[#F8F7F6] text-[#C5C1BC] cursor-not-allowed'
                )}
                disabled={completedCount === 0}
              >
                <Play size={13} />
                生成视频
              </button>
              <button
                onClick={onToggleBatchMode}
                className={cn(
                  'h-8 px-3 border text-[12px] rounded-lg flex items-center gap-1.5 transition-colors',
                  batchMode
                    ? 'border-[#A8835F] bg-[#FBF7F4] text-[#755235]'
                    : 'border-[#DEDBD8] hover:border-[#A8835F] text-[#524D48]'
                )}
              >
                <CheckSquare size={13} />
                批量选择
              </button>
            </div>

            {/* Center: progress info */}
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#8B847E]">
                <span className="font-medium text-[#524D48]">{completedCount}</span>/{shots.length} 已完成
              </span>
              <span className="text-[12px] text-[#A8A39E]">·</span>
              <span className="text-[12px] text-[#8B847E]">总时长 {formatDuration(totalDuration)}</span>
              <div className="w-24 h-1.5 bg-[#EFEDEB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#A8835F] rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / shots.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Right: view toggle + actions */}
            <div className="flex items-center gap-1.5">
              {/* View mode toggle */}
              <div className="flex items-center border border-[#DEDBD8] rounded-lg overflow-hidden mr-2">
                <button
                  onClick={() => onViewModeChange('列表视图')}
                  className={cn(
                    'h-7 px-2.5 flex items-center gap-1 text-[11px] transition-colors',
                    viewMode === '列表视图'
                      ? 'bg-[#FBF7F4] text-[#755235]'
                      : 'text-[#8B847E] hover:text-[#524D48]'
                  )}
                >
                  <LayoutList size={12} />
                  列表
                </button>
                <button
                  onClick={() => onViewModeChange('故事板视图')}
                  className={cn(
                    'h-7 px-2.5 flex items-center gap-1 text-[11px] transition-colors',
                    viewMode === '故事板视图'
                      ? 'bg-[#FBF7F4] text-[#755235]'
                      : 'text-[#8B847E] hover:text-[#524D48]'
                  )}
                >
                  <Grid3X3 size={12} />
                  故事板
                </button>
              </div>

              {/* Export dropdown */}
              <div className="relative mr-1">
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="h-7 px-2 border border-[#DEDBD8] hover:border-[#A8835F] rounded-lg text-[#524D48] hover:text-[#755235] flex items-center gap-1 transition-colors text-[11px]"
                >
                  <Download size={12} />
                  导出
                </button>
                <AnimatePresence>
                  {exportOpen && (
                    <>
                      <div className="fixed inset-0 z-[99]" onClick={() => setExportOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 bottom-9 w-44 bg-white rounded-lg border border-[#DEDBD8] shadow-lg py-1 z-[100]"
                      >
                        <button
                          onClick={() => handleExport('storyboard')}
                          className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                        >
                          <Image size={13} className="text-[#A8835F]" />
                          导出分镜图
                        </button>
                        <button
                          onClick={() => handleExport('clips')}
                          className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                        >
                          <Film size={13} className="text-[#5A7FA8]" />
                          导出视频片段
                        </button>
                        <button
                          onClick={() => handleExport('full')}
                          className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                        >
                          <Download size={13} className="text-[#5B8C5A]" />
                          导出完整分镜
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Undo/Redo */}
              <button
                onClick={() => toastInfo('撤销功能开发中')}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => toastInfo('重做功能开发中')}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
              >
                <ChevronRight size={16} />
              </button>

              {/* Add shot */}
              <button
                onClick={onAddShot}
                className="h-7 px-2 border border-[#DEDBD8] hover:border-[#A8835F] rounded-lg text-[#524D48] hover:text-[#755235] flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
              </button>

              {/* Settings */}
              <button
                onClick={() => toastInfo('设置功能开发中')}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#524D48] transition-colors"
              >
                <Settings size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
