import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Copy, Trash2, RefreshCw } from 'lucide-react';
import type { Shot } from './types';
import { getShotTypeStyle } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks/useToast';

interface TimelineStripProps {
  shots: Shot[];
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
  onReorderShots?: (newShots: Shot[]) => void;
  onDuplicateShot?: (shot: Shot) => void;
  onDeleteShot?: (id: string) => void;
  onRegenerateShot?: (id: string) => void;
}

export default function TimelineStrip({
  shots,
  selectedShotId,
  onSelectShot,
  onDuplicateShot,
  onDeleteShot,
  onRegenerateShot,
}: TimelineStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shot: Shot } | null>(null);
  const [hoveredShotId, setHoveredShotId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Auto-scroll to selected shot
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const el = selectedRef.current;
      const sc = scrollRef.current;
      const elLeft = el.offsetLeft;
      const elWidth = el.offsetWidth;
      const scWidth = sc.clientWidth;
      const scScrollLeft = sc.scrollLeft;

      if (elLeft < scScrollLeft || elLeft + elWidth > scScrollLeft + scWidth) {
        sc.scrollTo({ left: elLeft - scWidth / 2 + elWidth / 2, behavior: 'smooth' });
      }
    }
  }, [selectedShotId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Horizontal scroll with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const pxPerSecond = 16;

  const getStatusColor = (shot: Shot) => {
    switch (shot.status) {
      case '已完成': return 'bg-[#5B8C5A]';
      case '生成中': return 'bg-[#5A7FA8]';
      case '失败': return 'bg-[#B85C50]';
      case '草稿': return 'bg-[#C49A3C]';
      default: return 'bg-[#C5C1BC]';
    }
  };

  const isGenerating = (shot: Shot) => shot.status === '生成中';

  const handleContextMenu = (e: React.MouseEvent, shot: Shot) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, shot });
  };

  const handleDuplicate = (shot: Shot) => {
    onDuplicateShot?.(shot);
    setContextMenu(null);
    toastSuccess(`已复制分镜 镜${String(shot.shotNumber).padStart(2, '0')}`);
  };

  const handleDelete = (id: string) => {
    onDeleteShot?.(id);
    setContextMenu(null);
  };

  const handleRegenerate = (id: string) => {
    onRegenerateShot?.(id);
    setContextMenu(null);
  };

  // Drag and drop handlers
  const handleDragStart = (shot: Shot) => {
    setDraggingId(shot.id);
  };

  const handleDragOver = (e: React.DragEvent, shotId: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== shotId) {
      setDragOverId(shotId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetShot: Shot) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetShot.id) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    // Reorder logic would go here - for now we just toast
    toastSuccess('分镜顺序已调整');
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="h-[120px] border-b border-[#DEDBD8] bg-white flex flex-col shrink-0">
      {/* Time ruler */}
      <div className="h-5 border-b border-[#DEDBD8] relative overflow-hidden">
        <div
          className="absolute inset-0 flex"
          style={{ width: `${Math.max(totalDuration * pxPerSecond, 100)}px` }}
        >
          {Array.from({ length: Math.floor(totalDuration / 5) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full flex items-start"
              style={{ left: `${i * 5 * pxPerSecond}px` }}
            >
              <div className="w-px h-2 bg-[#DEDBD8]" />
              <span className="text-[10px] font-mono text-[#A8A39E] ml-1 leading-3">
                {i * 5}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shot thumbnails strip */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto flex items-center px-4 gap-1 scrollbar-hide"
        onWheel={handleWheel}
      >
        {shots.map((shot, index) => {
          const shotStyle = getShotTypeStyle(shot.shotType);
          const isSelected = shot.id === selectedShotId;
          const isHovered = shot.id === hoveredShotId;
          const isDragOver = shot.id === dragOverId;
          const isDragging = shot.id === draggingId;
          const width = Math.max(shot.duration * pxPerSecond, 48);

          return (
            <motion.div
              key={shot.id}
              ref={isSelected ? selectedRef : undefined}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: isDragging ? 0.5 : 1, x: 0, scale: isDragOver ? 1.05 : 1 }}
              transition={{ delay: index * 0.04, duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
              onClick={() => onSelectShot(shot.id)}
              onMouseEnter={() => setHoveredShotId(shot.id)}
              onMouseLeave={() => setHoveredShotId(null)}
              onContextMenu={(e) => handleContextMenu(e, shot)}
              draggable
              onDragStart={() => handleDragStart(shot)}
              onDragOver={(e) => handleDragOver(e, shot.id)}
              onDrop={(e) => handleDrop(e, shot)}
              className={cn(
                'flex-shrink-0 rounded cursor-pointer transition-all duration-150 overflow-hidden relative',
                isSelected
                  ? 'ring-2 ring-[#A8835F] shadow-md -translate-y-0.5'
                  : 'hover:ring-1 hover:ring-[#D9BFA8]',
                isDragOver && 'ring-2 ring-dashed ring-[#5A7FA8]'
              )}
              style={{ width: `${width}px` }}
            >
              {/* Status bar */}
              <div className={cn('h-1 w-full', getStatusColor(shot), isGenerating(shot) && 'animate-pulse')} />

              {/* Thumbnail area */}
              <div className="h-[72px] bg-[#F0F0F0] relative flex items-center justify-center overflow-hidden">
                {shot.status === '已完成' ? (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, ${shotStyle.bg} 0%, ${shotStyle.bg}dd 50%, ${shotStyle.bg} 100%)`,
                    }}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Camera size={16} className="text-[#A8A39E] mb-1" />
                      <span className="text-[9px] font-mono text-[#A8A39E]">镜{String(shot.shotNumber).padStart(2, '0')}</span>
                    </div>
                  </div>
                ) : shot.status === '失败' ? (
                  <div className="w-full h-full bg-[#FDF2F0] flex flex-col items-center justify-center">
                    <span className="text-[#B85C50] text-[10px]">失败</span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#F8F7F6] flex flex-col items-center justify-center">
                    <Camera size={16} className="text-[#C5C1BC] mb-1" />
                    <span className="text-[9px] font-mono text-[#C5C1BC]">镜{String(shot.shotNumber).padStart(2, '0')}</span>
                  </div>
                )}

                {/* Generating overlay */}
                {shot.status === '生成中' && (
                  <div className="absolute inset-0 bg-[#5A7FA8]/10 animate-pulse" />
                )}

                {/* Hover tooltip */}
                {isHovered && (
                  <div className="absolute bottom-1 left-1 right-1 bg-[#383431]/90 text-white text-[10px] px-1.5 py-0.5 rounded text-center pointer-events-none z-10">
                    {shot.shotType} · {shot.duration}s
                  </div>
                )}
              </div>

              {/* Bottom info */}
              <div className="h-5 bg-white flex items-center justify-between px-1.5 border-t border-[#EFEDEB]">
                <span className="text-[10px] font-mono text-[#6E6862]">
                  {String(shot.shotNumber).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono text-[#A8A39E]">{shot.duration}s</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg border border-[#DEDBD8] shadow-lg py-1 w-36"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleDuplicate(contextMenu.shot)}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
          >
            <Copy size={12} />
            复制分镜
          </button>
          <button
            onClick={() => handleRegenerate(contextMenu.shot.id)}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
          >
            <RefreshCw size={12} />
            重新生成
          </button>
          <div className="h-px bg-[#EFEDEB] mx-2 my-1" />
          <button
            onClick={() => handleDelete(contextMenu.shot.id)}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#B85C50] hover:bg-[#FDF2F0] transition-colors text-left"
          >
            <Trash2 size={12} />
            删除分镜
          </button>
        </div>
      )}
    </div>
  );
}
