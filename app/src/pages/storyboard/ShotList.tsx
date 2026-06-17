import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  AlertTriangle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Plus,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { Shot, ShotFilter } from './types';
import { getShotTypeStyle, SHOT_TYPE_OPTIONS } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

interface ShotListProps {
  shots: Shot[];
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
  filter: ShotFilter;
  onFilterChange: (filter: ShotFilter) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDeleteShot?: (id: string) => void;
  onDuplicateShot?: (shot: Shot) => void;
  onAddShot?: () => void;
  onUpdateShot?: (id: string, updates: Partial<Shot>) => void;
  batchMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

const filterOptions: ShotFilter[] = ['全部', '已完成', '待生成', '失败'];

const STATUS_CYCLE: Shot['status'][] = ['等待中', '生成中', '已完成', '失败', '草稿'];

export default function ShotList({
  shots,
  selectedShotId,
  onSelectShot,
  filter,
  onFilterChange,
  collapsed,
  onToggleCollapse,
  onDeleteShot,
  onDuplicateShot,
  onAddShot,
  onUpdateShot,
  batchMode = false,
  selectedIds = [],
  onToggleSelect,
}: ShotListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [durationValue, setDurationValue] = useState<number>(0);
  const durationInputRef = useRef<HTMLInputElement>(null);

  const filteredShots = shots.filter((s) => {
    if (filter === '全部') return true;
    if (filter === '已完成') return s.status === '已完成';
    if (filter === '待生成') return s.status === '等待中' || s.status === '生成中';
    if (filter === '失败') return s.status === '失败';
    return true;
  });

  useEffect(() => {
    if (editingDuration && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.select();
    }
  }, [editingDuration]);

  const getStatusIcon = (status: Shot['status']) => {
    switch (status) {
      case '已完成': return <Check size={14} className="text-[#5B8C5A]" />;
      case '生成中': return <Loader2 size={14} className="text-[#5A7FA8] animate-spin" />;
      case '失败': return <AlertTriangle size={14} className="text-[#B85C50]" />;
      case '草稿': return <Pencil size={14} className="text-[#C49A3C]" />;
      default: return <Circle size={14} className="text-[#C5C1BC]" />;
    }
  };

  const cycleShotType = (shot: Shot) => {
    const currentIndex = SHOT_TYPE_OPTIONS.indexOf(shot.shotType);
    const nextIndex = (currentIndex + 1) % SHOT_TYPE_OPTIONS.length;
    const nextType = SHOT_TYPE_OPTIONS[nextIndex];
    onUpdateShot?.(shot.id, { shotType: nextType });
    toastInfo(`分镜类型已切换为${nextType}`);
  };

  const cycleStatus = (shot: Shot) => {
    const currentIndex = STATUS_CYCLE.indexOf(shot.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    onUpdateShot?.(shot.id, { status: nextStatus });
    toastInfo(`状态已更新为${nextStatus}`);
  };

  const handleDelete = (shot: Shot) => {
    if (window.confirm(`确定要删除分镜 镜${String(shot.shotNumber).padStart(2, '0')} 吗？`)) {
      onDeleteShot?.(shot.id);
      toastSuccess(`已删除分镜 镜${String(shot.shotNumber).padStart(2, '0')}`);
    }
  };

  const handleDuplicate = (shot: Shot) => {
    onDuplicateShot?.(shot);
  };

  const startEditDuration = (shot: Shot) => {
    setEditingDuration(shot.id);
    setDurationValue(shot.duration);
  };

  const commitDuration = (shotId: string) => {
    if (durationValue >= 1 && durationValue <= 60) {
      onUpdateShot?.(shotId, { duration: durationValue });
      toastSuccess('时长已更新');
    }
    setEditingDuration(null);
  };

  const handleAddShot = () => {
    onAddShot?.();
    toastSuccess('已添加新分镜');
  };

  return (
    <motion.div
      className="h-full bg-white border-r border-[#DEDBD8] flex flex-col shrink-0 overflow-hidden relative"
      animate={{ width: collapsed ? 40 : 280 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
    >
      {/* Collapse toggle button (visible when collapsed) */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute left-0 top-2 z-10 w-6 h-8 bg-white border border-[#DEDBD8] rounded-r-md flex items-center justify-center shadow-sm hover:bg-[#F8F7F6]"
        >
          <ChevronRight size={14} className="text-[#8B847E]" />
        </button>
      )}

      {!collapsed && (
        <>
          {/* Panel header */}
          <div className="h-11 flex items-center justify-between px-3 border-b border-[#DEDBD8] shrink-0">
            <h3 className="text-[15px] font-medium text-[#524D48]">分镜列表</h3>
            <div className="flex items-center gap-1.5">
              {/* Filter dropdown */}
              <select
                value={filter}
                onChange={(e) => onFilterChange(e.target.value as ShotFilter)}
                className="text-[11px] bg-[#F8F7F6] border border-[#DEDBD8] rounded px-1.5 py-0.5 text-[#6E6862] outline-none focus:border-[#A8835F] cursor-pointer"
              >
                {filterOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <button
                onClick={handleAddShot}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#A8835F] transition-colors"
                title="添加分镜"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={onToggleCollapse}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] transition-colors"
              >
                <ChevronLeft size={14} className="text-[#8B847E]" />
              </button>
            </div>
          </div>

          {/* Shot cards */}
          <div className="flex-1 overflow-y-auto">
            {filteredShots.map((shot, index) => {
              const shotStyle = getShotTypeStyle(shot.shotType);
              const isSelected = shot.id === selectedShotId;
              const isHovered = shot.id === hoveredId;
              const isChecked = selectedIds.includes(shot.id);

              return (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                  onClick={() => onSelectShot(shot.id)}
                  onMouseEnter={() => setHoveredId(shot.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'flex items-center h-20 px-3 border-b border-[#EFEDEB] cursor-pointer transition-colors duration-150 group',
                    isSelected ? 'bg-[#FBF7F4]' : 'hover:bg-[#FBF7F4]/60'
                  )}
                >
                  {/* Checkbox in batch mode */}
                  {batchMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect?.(shot.id);
                      }}
                      className="mr-2 text-[#A8835F]"
                    >
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-[#C5C1BC]" />}
                    </button>
                  )}

                  {/* Left status bar */}
                  <div
                    className={cn(
                      'w-1 self-stretch rounded-full mr-3 transition-all duration-200',
                      isSelected ? 'bg-[#A8835F]' : 'bg-transparent'
                    )}
                  />

                  {/* Thumbnail */}
                  <div
                    className="w-14 h-10 rounded flex-shrink-0 mr-3 flex items-center justify-center"
                    style={{ backgroundColor: shot.status === '已完成' ? shotStyle.bg : '#F8F7F6' }}
                  >
                    <span className="text-[10px] font-mono text-[#A8A39E]">
                      {String(shot.shotNumber).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-[#8B847E]">
                        镜{String(shot.shotNumber).padStart(2, '0')}
                      </span>
                      {/* Shot type badge - clickable to cycle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); cycleShotType(shot); }}
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: shotStyle.bg, color: shotStyle.text }}
                        title="点击切换景别"
                      >
                        {shot.shotType}
                      </button>
                      {/* Duration - editable */}
                      {editingDuration === shot.id ? (
                        <input
                          ref={durationInputRef}
                          type="number"
                          min={1}
                          max={60}
                          value={durationValue}
                          onChange={(e) => setDurationValue(Number(e.target.value))}
                          onBlur={() => commitDuration(shot.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitDuration(shot.id);
                            if (e.key === 'Escape') setEditingDuration(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-12 h-5 text-[11px] font-mono bg-white border border-[#A8835F] rounded px-1 text-center outline-none"
                        />
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditDuration(shot); }}
                          className="text-[11px] font-mono text-[#A8A39E] hover:text-[#A8835F] cursor-pointer"
                          title="点击编辑时长"
                        >
                          {shot.duration}s
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-[#8B847E] truncate leading-4">
                      {shot.description.slice(0, 20)}...
                    </p>
                  </div>

                  {/* Right side: status + actions on hover */}
                  <div className="ml-2 flex-shrink-0 flex items-center gap-1">
                    {/* Status badge - clickable to cycle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleStatus(shot); }}
                      className="hover:opacity-80 transition-opacity"
                      title="点击切换状态"
                    >
                      {getStatusIcon(shot.status)}
                    </button>

                    {/* Hover action buttons */}
                    <AnimatePresence>
                      {isHovered && !batchMode && (
                        <motion.div
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 5 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center gap-0.5 ml-1"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(shot); }}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#A8835F] transition-colors"
                            title="复制"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(shot); }}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#FDF2F0] text-[#8B847E] hover:text-[#B85C50] transition-colors"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom: add shot button */}
          <div className="h-10 border-t border-[#DEDBD8] flex items-center justify-center">
            <button
              onClick={handleAddShot}
              className="flex items-center gap-1.5 text-[12px] text-[#8B847E] hover:text-[#A8835F] transition-colors"
            >
              <Plus size={14} />
              添加分镜
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
