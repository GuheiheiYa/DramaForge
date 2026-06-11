import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Download,
  Trash2,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import type { Project } from '@/store/useAppStore';
import type { StatusType } from './StatusBadge';
import StatusBadge from './StatusBadge';
import { toast } from '@/hooks/useToast';

interface ProjectCardProps {
  project: Project;
  index: number;
  viewMode: 'grid' | 'list';
  onNavigate: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (v: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

const statusCycle: StatusType[] = ['草稿', '进行中', '生成中', '待审核', '已完成', '失败'];

export default function ProjectCard({
  project,
  index,
  viewMode,
  onNavigate,
  onDelete,
  onRename,
  onDuplicate,
  onExport,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusType>(project.status);
  const [progressTooltip, setProgressTooltip] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const handleStatusCycle = () => {
    const idx = statusCycle.indexOf(currentStatus);
    const next = statusCycle[(idx + 1) % statusCycle.length];
    setCurrentStatus(next);
    toast.info(`状态已切换为「${next}」`);
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProgressTooltip(true);
    setTimeout(() => setProgressTooltip(false), 2000);
  };

  /* ═══ LIST VIEW ═══ */
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        className="h-14 flex items-center px-4 border-b border-[#EFEDEB] hover:bg-[#FBF7F4] transition-colors cursor-pointer group"
        onClick={() => {
          if (!menuOpen && !isRenaming) onNavigate();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-[#F5EDE6]">
            <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
          {isRenaming ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameRef}
                value={renameValue ?? ''}
                onChange={(e) => onRenameChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRenameSubmit?.();
                  if (e.key === 'Escape') onRenameCancel?.();
                }}
                onBlur={onRenameSubmit}
                className="h-7 px-2 bg-white border border-[#D9BFA8] rounded text-small text-[#383431] outline-none"
              />
            </div>
          ) : (
            <span className="text-small text-[#383431] truncate">{project.name}</span>
          )}
        </div>
        <span className="w-20 text-center">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-caption ${
              project.type === '漫剧'
                ? 'bg-[#FBF7F4] text-[#8E6A48]'
                : 'bg-[#F0F3F7] text-[#5A7FA8]'
            }`}
          >
            {project.type}
          </span>
        </span>
        <div className="w-24 flex justify-center">
          <StatusBadge status={currentStatus} onClick={handleStatusCycle} />
        </div>
        <div className="w-28 flex items-center gap-2">
          <div
            className="flex-1 h-1 bg-[#DEDBD8] rounded-full overflow-hidden cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-[#A8835F] rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
            <AnimatePresence>
              {progressTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#383431] text-white text-[11px] rounded-md whitespace-nowrap"
                >
                  {project.progress}%
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-caption font-mono text-[#6E6862]">{project.progress}%</span>
        </div>
        <span className="w-28 text-center text-caption text-[#A8A39E]">{project.lastEdited}</span>
        <div className="w-12 flex justify-center relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#A8A39E] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <ContextMenu
              onClose={() => setMenuOpen(false)}
              onRename={(e) => {
                e.stopPropagation();
                onRename();
                setMenuOpen(false);
              }}
              onDuplicate={(e) => {
                e.stopPropagation();
                onDuplicate();
                setMenuOpen(false);
              }}
              onExport={(e) => {
                e.stopPropagation();
                onExport();
                setMenuOpen(false);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                onDelete();
                setMenuOpen(false);
              }}
            />
          )}
        </div>
      </motion.div>
    );
  }

  /* ═══ GRID VIEW ═══ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-[#DEDBD8] shadow-md hover:shadow-lg hover:border-[#D9BFA8] transition-shadow cursor-pointer group overflow-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (!menuOpen && !isRenaming) onNavigate();
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-[#F5EDE6]">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate();
                }}
                className="px-5 py-2.5 bg-white rounded-xl text-small font-medium text-[#383431] shadow-lg hover:bg-[#FBF7F4] transition-colors flex items-center gap-2"
              >
                进入编辑 <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Type badge */}
        <span
          className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-caption font-medium ${
            project.type === '漫剧'
              ? 'bg-[#FBF7F4] text-[#8E6A48]'
              : 'bg-[#F0F3F7] text-[#5A7FA8]'
          }`}
        >
          {project.type}
        </span>

        {/* More actions */}
        <div className="absolute top-3 right-3" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-7 h-7 rounded-md bg-white/80 backdrop-blur flex items-center justify-center text-[#8B847E] hover:bg-white hover:text-[#383431] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <ContextMenu
              onClose={() => setMenuOpen(false)}
              onRename={(e) => {
                e.stopPropagation();
                onRename();
                setMenuOpen(false);
              }}
              onDuplicate={(e) => {
                e.stopPropagation();
                onDuplicate();
                setMenuOpen(false);
              }}
              onExport={(e) => {
                e.stopPropagation();
                onExport();
                setMenuOpen(false);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                onDelete();
                setMenuOpen(false);
              }}
            />
          )}
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-4">
        {isRenaming ? (
          <div className="mb-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={renameRef}
              value={renameValue ?? ''}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit?.();
                if (e.key === 'Escape') onRenameCancel?.();
              }}
              onBlur={onRenameSubmit}
              className="w-full h-8 px-2 bg-white border border-[#D9BFA8] rounded text-small text-[#383431] outline-none"
            />
          </div>
        ) : (
          <h4 className="text-[15px] font-medium text-[#383431] truncate mb-1">{project.name}</h4>
        )}
        <p className="text-caption text-[#A8A39E] mb-3">{project.lastEdited}</p>
        <div
          className="w-full h-1 bg-[#DEDBD8] rounded-full overflow-hidden mb-3 cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <motion.div
            className="h-full bg-[#A8835F] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.5, delay: index * 0.05 + 0.3 }}
          />
          <AnimatePresence>
            {progressTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#383431] text-white text-[11px] rounded-md whitespace-nowrap"
              >
                进度: {project.progress}%
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-4 py-3 border-t border-[#EFEDEB] flex items-center justify-between">
        <StatusBadge status={currentStatus} onClick={handleStatusCycle} />
        <span className="text-caption text-[#A8A39E]">
          第{project.currentEpisode}集 / 共{project.totalEpisodes}集
        </span>
      </div>
    </motion.div>
  );
}

/* ═══ Context Menu ═══ */
function ContextMenu({
  onClose,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  onClose: () => void;
  onRename: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1 z-floating"
    >
      <button
        onClick={onRename}
        className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
      >
        <Pencil size={14} /> 重命名
      </button>
      <button
        onClick={onDuplicate}
        className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
      >
        <Copy size={14} /> 复制项目
      </button>
      <button
        onClick={onExport}
        className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
      >
        <Download size={14} /> 导出数据
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          toast.info('已打开项目所在文件夹');
        }}
        className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
      >
        <FolderOpen size={14} /> 打开所在文件夹
      </button>
      <div className="h-px bg-[#EFEDEB] my-1" />
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-small text-[#B85C50] hover:bg-[#FDF2F0] flex items-center gap-2 transition-colors"
      >
        <Trash2 size={14} /> 删除项目
      </button>
    </motion.div>
  );
}
