import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ChevronLeft,
  MoreHorizontal,
  MessageSquare,
  Footprints,
  Volume2,
  ArrowRight,
  ChevronsUpDown,
  Trash2,
  Edit3,
  GripVertical,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import type { Episode, Scene, ScriptBlock } from './types';

interface SceneTreeProps {
  episodes: Episode[];
  currentEpisodeId: string;
  selectedSceneId: string | null;
  onSelectEpisode: (id: string) => void;
  onSelectScene: (id: string) => void;
  onToggleSceneExpanded: (sceneId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddScene: (scene: { title: string; location: string; timeTag: string }) => void;
  onDeleteScene: (sceneId: string) => void;
  onRenameScene: (sceneId: string, newTitle: string) => void;
  onReorderScenes: (scenes: Scene[]) => void;
  editorBlocks: ScriptBlock[];
}

const elementTypeIcon = (type: string) => {
  switch (type) {
    case 'dialogue': return <MessageSquare size={14} className="text-[#5A7FA8]" />;
    case 'action': return <Footprints size={14} className="text-[#5B8C5A]" />;
    case 'sound': return <Volume2 size={14} className="text-[#C49A3C]" />;
    default: return <ArrowRight size={14} className="text-[#A8A39E]" />;
  }
};

export default function SceneTree({
  episodes,
  currentEpisodeId,
  selectedSceneId,
  onSelectEpisode,
  onSelectScene,
  onToggleSceneExpanded,
  collapsed,
  onToggleCollapse,
  onAddScene,
  onDeleteScene,
  onRenameScene,
  onReorderScenes,
  editorBlocks,
}: SceneTreeProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sceneMenuOpen, setSceneMenuOpen] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();

  const currentEpisode = episodes.find((ep) => ep.id === currentEpisodeId) || episodes[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSceneMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = useCallback((scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditTitle(scene.title);
    setSceneMenuOpen(null);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (editingSceneId && editTitle.trim()) {
      onRenameScene(editingSceneId, editTitle.trim());
      setEditingSceneId(null);
    }
  }, [editingSceneId, editTitle, onRenameScene]);

  const handleCancelRename = useCallback(() => {
    setEditingSceneId(null);
    setEditTitle('');
  }, []);

  // Floating expand button when collapsed
  if (collapsed) {
    return (
      <motion.div
        className="relative"
        initial={{ width: 0 }}
        animate={{ width: 40 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
      >
        <button
          onClick={onToggleCollapse}
          className="absolute top-4 left-2 w-7 h-7 rounded-md bg-white border border-[#DEDBD8] shadow-sm flex items-center justify-center hover:shadow-md transition-shadow z-10"
          title="展开场景面板"
        >
          <ChevronRight size={14} className="text-[#8B847E]" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-full flex flex-col bg-[#FBF7F4] border-r border-[#DEDBD8] shrink-0"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
    >
      {/* Panel Header */}
      <div className="h-12 px-3 border-b border-[#DEDBD8] flex items-center gap-2 shrink-0">
        {/* Episode Dropdown */}
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full h-9 px-3 bg-[#F8F7F6] rounded-md flex items-center gap-2 text-small text-[#524D48] hover:bg-[#EFEDEB] transition-colors"
          >
            <span className="flex-1 text-left truncate">
              第{currentEpisode.number}集：{currentEpisode.title}
            </span>
            <ChevronsUpDown size={14} className="text-[#A8A39E] shrink-0" />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0.95 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.95 }}
                transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                style={{ originY: 0 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#DEDBD8] z-50 overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto py-1">
                  {episodes.map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => {
                        onSelectEpisode(ep.id);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-small hover:bg-[#F8F7F6] transition-colors flex items-center gap-2',
                        ep.id === currentEpisodeId ? 'bg-[#FBF7F4] text-[#755235] font-medium' : 'text-[#524D48]'
                      )}
                    >
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono',
                        ep.id === currentEpisodeId ? 'bg-[#A8835F] text-white' : 'bg-[#EFEDEB] text-[#8B847E]'
                      )}>
                        {ep.number}
                      </span>
                      <span className="flex-1 truncate">{ep.title}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#EFEDEB] px-3 py-2 flex items-center justify-between">
                  <span className="text-caption text-[#A8A39E]">共 {episodes.length} 集</span>
                  <button
                    className="text-caption text-[#A8835F] hover:text-[#755235] font-medium"
                    onClick={() => success('添加新集功能即将上线')}
                  >
                    + 添加新集
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Scene Button */}
        <button
          onClick={() => setAddDialogOpen(true)}
          className="w-8 h-8 rounded-md flex items-center justify-center bg-[#F5EDE6] hover:bg-[#EAD8C8] transition-colors shrink-0"
          title="新建场景"
        >
          <Plus size={16} className="text-[#8E6A48]" />
        </button>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#EFEDEB] transition-colors shrink-0"
          title="收起面板"
        >
          <ChevronLeft size={14} className="text-[#A8A39E]" />
        </button>
      </div>

      {/* Scene Tree List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 min-h-0">
        <Reorder.Group
          axis="y"
          values={currentEpisode.scenes}
          onReorder={onReorderScenes}
          className="space-y-0.5"
        >
          <AnimatePresence mode="popLayout">
            {currentEpisode.scenes.map((scene, index) => (
              <Reorder.Item
                key={scene.id}
                value={scene}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, delay: index * 0.04, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
              >
                <SceneNode
                  scene={scene}
                  isSelected={selectedSceneId === scene.id}
                  isEditing={editingSceneId === scene.id}
                  editTitle={editTitle}
                  onEditTitleChange={setEditTitle}
                  onConfirmRename={handleConfirmRename}
                  onCancelRename={handleCancelRename}
                  onSelect={() => onSelectScene(scene.id)}
                  onToggleExpand={() => onToggleSceneExpanded(scene.id)}
                  onMenuOpen={(id) => setSceneMenuOpen(sceneMenuOpen === id ? null : id)}
                  menuOpen={sceneMenuOpen}
                  menuRef={menuRef}
                  onStartRename={handleStartRename}
                  onDelete={onDeleteScene}
                  isHovered={hoveredScene === scene.id}
                  onHover={setHoveredScene}
                  editorBlocks={editorBlocks}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Panel Footer */}
      <div className="shrink-0 border-t border-[#DEDBD8] px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption text-[#A8A39E]">
            第 {currentEpisode.number} 集 / 共 {episodes.length} 集
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={currentEpisode.number <= 1}
            onClick={() => {
              const prev = episodes.find((ep) => ep.number === currentEpisode.number - 1);
              if (prev) onSelectEpisode(prev.id);
            }}
            className="flex-1 h-7 rounded border border-[#DEDBD8] text-caption text-[#6E6862] hover:bg-[#EFEDEB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <ChevronLeft size={12} /> 上一集
          </button>
          <button
            disabled={currentEpisode.number >= episodes.length}
            onClick={() => {
              const next = episodes.find((ep) => ep.number === currentEpisode.number + 1);
              if (next) onSelectEpisode(next.id);
            }}
            className="flex-1 h-7 rounded border border-[#DEDBD8] text-caption text-[#6E6862] hover:bg-[#EFEDEB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            下一集 <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Add Scene Dialog */}
      <AddSceneDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={onAddScene}
      />
    </motion.div>
  );
}

/** 单个场景节点 */
function SceneNode({
  scene,
  isSelected,
  isEditing,
  editTitle,
  onEditTitleChange,
  onConfirmRename,
  onCancelRename,
  onSelect,
  onToggleExpand,
  onMenuOpen,
  menuOpen,
  menuRef,
  onStartRename,
  onDelete,
  isHovered,
  onHover,
  editorBlocks,
}: {
  scene: Scene;
  isSelected: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (t: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onToggleExpand: () => void;
  onMenuOpen: (id: string | null) => void;
  menuOpen: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onStartRename: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  editorBlocks: ScriptBlock[];
}) {
  const sceneBlockCount = editorBlocks.filter((b) => b.sceneId === scene.id).length;

  return (
    <div
      className="mb-0.5"
      onMouseEnter={() => onHover(scene.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Scene Title Row */}
      <div
        onClick={onSelect}
        onDoubleClick={() => onStartRename(scene)}
        className={cn(
          'group relative flex items-center gap-1.5 h-10 px-2 rounded-md cursor-pointer transition-all duration-150',
          isSelected ? 'bg-[#F5EDE6] text-[#755235]' : 'hover:bg-[#FBF7F4] text-[#524D48]'
        )}
      >
        {/* Active indicator bar */}
        {isSelected && (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#A8835F] rounded-r-full"
            layoutId="scene-active-indicator"
            transition={{ duration: 0.2 }}
          />
        )}

        {/* Drag handle */}
        <div
          className={cn(
            'shrink-0 transition-opacity cursor-grab active:cursor-grabbing',
            isHovered || isSelected ? 'opacity-100' : 'opacity-0'
          )}
        >
          <GripVertical size={14} className="text-[#C5C1BC]" />
        </div>

        {/* Expand/collapse arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFEDEB] transition-colors"
        >
          {scene.expanded ? (
            <ChevronDown size={12} className="text-[#A8A39E]" />
          ) : (
            <ChevronRight size={12} className="text-[#A8A39E]" />
          )}
        </button>

        {/* Scene number */}
        <span className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0',
          isSelected ? 'bg-[#A8835F] text-white' : 'bg-[#EFEDEB] text-[#8B847E]'
        )}>
          {scene.number}
        </span>

        {/* Scene title - editable or display */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirmRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              onBlur={onConfirmRename}
              autoFocus
              className="flex-1 h-7 px-1.5 bg-white border border-[#D9BFA8] rounded text-[13px] text-[#383431] outline-none"
            />
            <button onMouseDown={onConfirmRename} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#F0F5F0] text-[#5B8C5A]">
              <Check size={12} />
            </button>
            <button onMouseDown={onCancelRename} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#FDF2F0] text-[#B85C50]">
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-small truncate select-none">{scene.title}</span>
        )}

        {/* Block count */}
        {sceneBlockCount > 0 && (
          <span className="text-[10px] text-[#A8A39E] shrink-0">{sceneBlockCount}块</span>
        )}

        {/* Hover actions */}
        {!isEditing && (
          <div
            className={cn(
              'shrink-0 flex items-center gap-0.5 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onStartRename(scene); }}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#8E6A48]"
              title="重命名"
            >
              <Edit3 size={11} />
            </button>
            <div className="relative" ref={menuOpen === scene.id ? menuRef : null}>
              <button
                onClick={(e) => { e.stopPropagation(); onMenuOpen(scene.id); }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#B85C50]"
                title="更多操作"
              >
                <MoreHorizontal size={12} />
              </button>
              <AnimatePresence>
                {menuOpen === scene.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-7 w-36 bg-white rounded-lg shadow-lg border border-[#DEDBD8] z-50 py-1"
                  >
                    <button
                      onClick={() => { onMenuOpen(null); onStartRename(scene); }}
                      className="w-full px-3 py-1.5 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2"
                    >
                      <Edit3 size={12} /> 重命名
                    </button>
                    <button
                      onClick={() => {
                        onMenuOpen(null);
                        if (window.confirm(`确定要删除场景「${scene.title}」吗？`)) {
                          onDelete(scene.id);
                        }
                      }}
                      className="w-full px-3 py-1.5 text-left text-small text-[#B85C50] hover:bg-[#FDF2F0] flex items-center gap-2"
                    >
                      <Trash2 size={12} /> 删除场景
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Expanded elements */}
      <AnimatePresence>
        {scene.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 pl-3 border-l border-[#DEDBD8] py-1 space-y-0.5">
              {scene.elements.map((element) => (
                <div
                  key={element.id}
                  className="flex items-center gap-2 px-2 py-1 rounded text-caption text-[#8B847E] hover:bg-[#FBF7F4] hover:text-[#524D48] transition-colors cursor-pointer"
                >
                  {elementTypeIcon(element.type)}
                  <span className="truncate">{element.label}</span>
                </div>
              ))}
              {scene.elements.length === 0 && (
                <span className="text-[12px] text-[#C5C1BC] px-2">暂无内容</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Add Scene Dialog */
function AddSceneDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (scene: { title: string; location: string; timeTag: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [timeTag, setTimeTag] = useState('日内');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTitle('');
      setLocation('');
      setTimeTag('日内');
      setErrors({});
    }
  }, [open]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入场景名称';
    if (!location.trim()) newErrors.location = '请输入地点';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onAdd({ title: title.trim(), location: location.trim(), timeTag });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            className="relative w-80 bg-white rounded-xl shadow-[0_8px_32px_rgba(30,28,26,0.12)] p-5 z-10"
          >
            <h3 className="text-h3 text-[#383431] mb-4">添加新场景</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[#524D48] mb-1">
                  场景名称 <span className="text-[#B85C50]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="如：教室·日"
                  className={cn(
                    'w-full h-9 px-3 bg-[#F8F7F6] border rounded-md text-small text-[#383431] placeholder:text-[#A8A39E] outline-none focus:border-[#D9BFA8] transition-all',
                    errors.title ? 'border-[#B85C50]' : 'border-[#DEDBD8]'
                  )}
                />
                {errors.title && <span className="text-[11px] text-[#B85C50] mt-0.5">{errors.title}</span>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#524D48] mb-1">
                  地点 <span className="text-[#B85C50]">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="如：教室"
                  className={cn(
                    'w-full h-9 px-3 bg-[#F8F7F6] border rounded-md text-small text-[#383431] placeholder:text-[#A8A39E] outline-none focus:border-[#D9BFA8] transition-all',
                    errors.location ? 'border-[#B85C50]' : 'border-[#DEDBD8]'
                  )}
                />
                {errors.location && <span className="text-[11px] text-[#B85C50] mt-0.5">{errors.location}</span>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#524D48] mb-1">时间</label>
                <div className="flex gap-2">
                  {['日内', '日外', '夜内', '夜外', '傍晚外', '午后内'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeTag(t)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-md text-[12px] transition-colors',
                        timeTag === t
                          ? 'bg-[#FBF7F4] text-[#755235] border border-[#C4A07F]'
                          : 'bg-[#F8F7F6] text-[#524D48] border border-[#DEDBD8] hover:border-[#EAD8C8]'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={onClose}
                className="flex-1 h-8 rounded-md border border-[#DEDBD8] text-[13px] text-[#524D48] hover:bg-[#F8F7F6] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 h-8 rounded-md bg-[#A8835F] text-white text-[13px] font-medium hover:bg-[#8E6A48] transition-colors"
              >
                添加
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
