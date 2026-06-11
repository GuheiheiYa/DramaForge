import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Copy, Scissors, VolumeX } from 'lucide-react';
import type { TimelineClip } from './types';
import { TRACK_COLORS } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

interface ClipProps {
  clip: TimelineClip;
  isSelected: boolean;
  zoom: number;
  onSelect: () => void;
  onDoubleClick?: () => void;
  onDelete?: (id: string) => void;
  onCopy?: (id: string) => void;
  onSplit?: (id: string, splitTime: number) => void;
  onMute?: (id: string) => void;

}

export default function Clip({
  clip,
  isSelected,
  zoom,
  onSelect,
  onDoubleClick,
  onDelete,
  onCopy,
  onSplit,
  onMute,

}: ClipProps) {
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [_dragOffset, setDragOffset] = useState(0);
  const clipRef = useRef<HTMLDivElement>(null);
  const colors = TRACK_COLORS[clip.trackType];

  const left = clip.startTime * zoom;
  const width = Math.max(clip.duration * zoom, 20);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const rect = clipRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragOffset(e.clientX - rect.left);
    }
    onSelect();
  };

  useEffect(() => {
    const handleMouseMove = (_e: MouseEvent) => {
      if (!isDragging) return;
      // In a real implementation, this would calculate the new position
      // For now, we just track the drag state
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDelete = () => {
    onDelete?.(clip.id);
    setContextMenu(null);
    toastSuccess('片段已删除');
  };

  const handleCopy = () => {
    onCopy?.(clip.id);
    setContextMenu(null);
    toastSuccess('片段已复制');
  };

  const handleSplit = () => {
    onSplit?.(clip.id, clip.startTime + clip.duration / 2);
    setContextMenu(null);
    toastSuccess('片段已分割');
  };

  const handleMute = () => {
    onMute?.(clip.id);
    setContextMenu(null);
    toastInfo('片段已静音');
  };

  return (
    <>
      <div
        ref={clipRef}
        className={cn(
          'absolute top-1 rounded cursor-pointer transition-all duration-150 overflow-hidden group select-none',
          isSelected && 'ring-2 ring-[#A8835F] shadow-sm z-10',
          !isSelected && hovered && 'ring-1 ring-[#D9BFA8]',
          isDragging && 'opacity-80 z-20'
        )}
        style={{
          left: `${left}px`,
          width: `${width}px`,
          height: 'calc(100% - 8px)',
          backgroundColor: clip.color ?? colors.bg,
          border: `1px solid ${isSelected ? '#A8835F' : colors.border}`,
        }}
        onClick={onSelect}
        onDoubleClick={() => {
          onDoubleClick?.();
          toastInfo('打开片段编辑器');
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
      >
        {/* Waveform / content */}
        {clip.trackType === 'audio' || clip.trackType === 'bgm' ? (
          <div className="w-full h-full flex items-center px-1.5 gap-px overflow-hidden">
            {Array.from({ length: Math.min(Math.floor(width / 3), 30) }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: `${30 + Math.random() * 60}%`,
                  backgroundColor: colors.wave,
                  minWidth: '2px',
                }}
              />
            ))}
          </div>
        ) : clip.trackType === 'subtitle' ? (
          <div className="w-full h-full flex items-center px-2">
            <span className="text-[11px] truncate" style={{ color: colors.text }}>
              {clip.name}
            </span>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {/* Video thumbnail placeholder */}
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: clip.color ?? colors.bg }}
            >
              {clip.status === 'generating' ? (
                <span className="text-[10px] text-[#5A7FA8] animate-pulse">生成中</span>
              ) : (
                <span className="text-[10px] font-mono" style={{ color: colors.text }}>
                  {clip.shotRef ?? clip.name}
                </span>
              )}
            </div>
            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/10 flex items-center justify-between px-1 py-px">
              <span className="text-[9px] font-mono text-white/80">{clip.name}</span>
              <span className="text-[9px] font-mono text-white/80">{clip.duration}s</span>
            </div>
          </div>
        )}

        {/* Tooltip on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-9 left-0 bg-[#383431] text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none"
            >
              {clip.name} · {clip.duration}s · {clip.startTime}s起
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete button on hover when selected */}
        <AnimatePresence>
          {isSelected && hovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#B85C50] text-white flex items-center justify-center z-30 shadow-sm hover:bg-[#9A4A40] transition-colors"
            >
              <Trash2 size={10} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Resize handles */}
        {isSelected && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize bg-[#A8835F]/50 hover:bg-[#A8835F] z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize bg-[#A8835F]/50 hover:bg-[#A8835F] z-10" />
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg border border-[#DEDBD8] shadow-lg py-1 w-36"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleCopy}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
          >
            <Copy size={12} />
            复制片段
          </button>
          <button
            onClick={handleSplit}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
          >
            <Scissors size={12} />
            分割片段
          </button>
          {(clip.trackType === 'audio' || clip.trackType === 'bgm') && (
            <button
              onClick={handleMute}
              className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
            >
              <VolumeX size={12} />
              静音
            </button>
          )}
          <div className="h-px bg-[#EFEDEB] mx-2 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 flex items-center gap-2 text-[12px] text-[#B85C50] hover:bg-[#FDF2F0] transition-colors text-left"
          >
            <Trash2 size={12} />
            删除片段
          </button>
        </div>
      )}
    </>
  );
}
