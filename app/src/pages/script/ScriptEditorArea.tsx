import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  ChevronRight,
  Type,
  Film,
  MessageCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, MSG } from '@/hooks/useToast';
import type { ScriptBlock, ScriptBlockType, Episode } from './types';

interface ScriptEditorAreaProps {
  blocks: ScriptBlock[];
  title: string;
  episodeNumber: number;
  episodeTitle: string;
  onBlockSelect: (blockId: string) => void;
  selectedBlockId: string | null;
  onBlocksChange: (blocks: ScriptBlock[]) => void;
  currentEpisodeId: string;
  episodes: Episode[];
}

/** 渲染带语法高亮的剧本内容 */
function HighlightedContent({ content, type }: { content: string; type: string }) {
  if (type === 'scene' || content.startsWith('[场景：')) {
    return (
      <div className="flex items-center my-5">
        <div className="w-1 h-6 bg-[#5A7FA8] rounded-r-full mr-0 shrink-0" />
        <span className="bg-[#F0F3F7] text-[#5A7FA8] text-sm font-semibold px-3 py-1.5 rounded-md">
          {content}
        </span>
      </div>
    );
  }

  if (type === 'character' || content.startsWith('【角色：')) {
    return (
      <span className="bg-[#FBF7F4] text-[#8E6A48] text-[13px] font-medium px-2 py-0.5 rounded inline-block my-1">
        {content}
      </span>
    );
  }

  if (type === 'emotion' || content.startsWith('（情绪：')) {
    return (
      <span className="bg-[#EFECF3] text-[#7A6B8A] text-[13px] italic px-2 py-0.5 rounded inline-block my-1">
        {content}
      </span>
    );
  }

  if (type === 'action' || content.startsWith('<动作：')) {
    return (
      <span className="bg-[#F0F5F0] text-[#5B8C5A] text-[13px] italic px-2 py-0.5 rounded inline-block my-1">
        {content}
      </span>
    );
  }

  if (type === 'sound' || content.startsWith('「音效：')) {
    return (
      <span className="bg-[#FDF8F0] text-[#C49A3C] text-[13px] px-2 py-0.5 rounded inline-block my-1">
        {content}
      </span>
    );
  }

  if (type === 'transition' || content.includes('--- 转场 ---')) {
    return (
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 border-t border-dashed border-[#DEDBD8]" />
        <span className="text-[13px] text-[#A8A39E]">转场</span>
        <div className="flex-1 border-t border-dashed border-[#DEDBD8]" />
      </div>
    );
  }

  if (type === 'note' || content.startsWith('【')) {
    return (
      <span className="text-[13px] text-[#A8A39E] italic border-l-2 border-[#DEDBD8] pl-3 my-2 block">
        {content}
      </span>
    );
  }

  if (type === 'dialogue') {
    return <DialogueContent content={content} />;
  }

  return <NarrationContent content={content} />;
}

/** 对话内容 - 行内语法高亮 */
function DialogueContent({ content }: { content: string }) {
  const parts: Array<{ type: string; text: string }> = [];
  let lastIndex = 0;

  const allRegex = /(【角色：[^】]+】|（情绪：[^）]+）)/g;
  let match;

  while ((match = allRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    if (match[0].startsWith('【角色：')) {
      parts.push({ type: 'character', text: match[0] });
    } else if (match[0].startsWith('（情绪：')) {
      parts.push({ type: 'emotion', text: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: content });
  }

  return (
    <p className="text-sm text-[#383431] leading-relaxed my-1 pl-0">
      {parts.map((part, i) => {
        if (part.type === 'character') {
          return (
            <span key={i} className="bg-[#FBF7F4] text-[#8E6A48] text-[13px] font-medium px-1.5 py-0.5 rounded">
              {part.text}
            </span>
          );
        }
        if (part.type === 'emotion') {
          return (
            <span key={i} className="bg-[#EFECF3] text-[#7A6B8A] text-[13px] italic px-1.5 py-0.5 rounded">
              {part.text}
            </span>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </p>
  );
}

/** 叙事文本 - 行内高亮动作和音效标记 */
function NarrationContent({ content }: { content: string }) {
  const parts: Array<{ type: string; text: string }> = [];
  let lastIndex = 0;

  const allRegex = /(<动作：[^>]+>|「音效：[^」]+」|\[场景：[^\]]+\])/g;
  let match;

  while ((match = allRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    if (match[0].startsWith('<动作：')) {
      parts.push({ type: 'action', text: match[0] });
    } else if (match[0].startsWith('「音效：')) {
      parts.push({ type: 'sound', text: match[0] });
    } else if (match[0].startsWith('[场景：')) {
      parts.push({ type: 'scene', text: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: content });
  }

  return (
    <p className="text-sm text-[#524D48] leading-[1.8] my-1.5">
      {parts.map((part, i) => {
        if (part.type === 'action') {
          return (
            <span key={i} className="bg-[#F0F5F0] text-[#5B8C5A] text-[13px] italic px-1.5 py-0.5 rounded">
              {part.text}
            </span>
          );
        }
        if (part.type === 'sound') {
          return (
            <span key={i} className="bg-[#FDF8F0] text-[#C49A3C] text-[13px] px-1.5 py-0.5 rounded">
              {part.text}
            </span>
          );
        }
        if (part.type === 'scene') {
          return (
            <span key={i} className="bg-[#F0F3F7] text-[#5A7FA8] text-[13px] font-semibold px-1.5 py-0.5 rounded">
              {part.text}
            </span>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </p>
  );
}

const blockTypeOptions: { type: ScriptBlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'dialogue', label: '对话', icon: <MessageCircle size={14} /> },
  { type: 'action', label: '动作', icon: <Film size={14} /> },
  { type: 'scene', label: '场景', icon: <Type size={14} /> },
  { type: 'transition', label: '转场', icon: <ArrowRightLeft size={14} /> },
  { type: 'narration', label: '旁白', icon: <Type size={14} /> },
];

/** 单个块组件 */
function ScriptBlockItem({
  block,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onUpdateContent,
  onAddBlockAfter,
  isFirst,
  isLast,
}: {
  block: ScriptBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onUpdateContent: (content: string) => void;
  onAddBlockAfter: (type: ScriptBlockType) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.content);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const { success } = useToast();

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setEditValue(block.content);
  }, [block.content]);

  const handleStartEdit = () => {
    setEditing(true);
    setEditValue(block.content);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() !== block.content) {
      onUpdateContent(editValue.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      setEditValue(block.content);
      setEditing(false);
    }
  };

  const handleDelete = () => {
    onDelete();
    success(MSG.blockDeleted);
  };

  return (
    <div className="relative">
      {/* Add block button above */}
      <div
        className={cn(
          'absolute -top-3 left-4 right-4 h-6 flex items-center justify-center transition-opacity z-10',
          (hovered || isSelected) ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="relative">
          <button
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="w-6 h-6 rounded-full bg-[#A8835F] text-white flex items-center justify-center hover:bg-[#8E6A48] shadow-sm"
          >
            <Plus size={12} />
          </button>
          <AnimatePresence>
            {addMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-7 flex gap-1 bg-white rounded-lg shadow-lg border border-[#DEDBD8] px-2 py-1.5 z-20"
              >
                {blockTypeOptions.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      onAddBlockAfter(opt.type);
                      setAddMenuOpen(false);
                    }}
                    className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-[#F8F7F6] transition-colors min-w-[48px]"
                    title={opt.label}
                  >
                    <span className="text-[#8E6A48]">{opt.icon}</span>
                    <span className="text-[10px] text-[#524D48]">{opt.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        className={cn(
          'group relative pl-6 pr-2 py-1 rounded-md transition-colors cursor-text',
          isSelected && 'bg-[#FBF7F4] ring-1 ring-[#EAD8C8]'
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setAddMenuOpen(false);
        }}
        onClick={onSelect}
        layout
      >
        {/* Left indicator bar */}
        {isSelected && (
          <motion.div
            className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#C4A07F] rounded-full"
            layoutId="block-indicator"
            transition={{ duration: 0.2 }}
          />
        )}

        {/* Drag handle */}
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 transition-opacity cursor-grab',
            hovered || isSelected ? 'opacity-100' : 'opacity-0'
          )}
        >
          <GripVertical size={14} className="text-[#C5C1BC]" />
        </div>

        {/* Block toolbar (on selected block) */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-2 -top-8 bg-white rounded-lg shadow-md border border-[#DEDBD8] flex items-center z-10 overflow-hidden"
            >
              <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center hover:bg-[#FDF2F0] text-[#A8A39E] hover:text-[#B85C50]" title="删除">
                <Trash2 size={13} />
              </button>
              <button onClick={onDuplicate} className="w-7 h-7 flex items-center justify-center hover:bg-[#FBF7F4] text-[#A8A39E] hover:text-[#8E6A48]" title="复制">
                <Copy size={13} />
              </button>
              <div className="w-px h-4 bg-[#DEDBD8]" />
              <button onClick={onMoveUp} disabled={isFirst} className="w-7 h-7 flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#6E6862] disabled:opacity-30" title="上移">
                <ArrowUp size={13} />
              </button>
              <button onClick={onMoveDown} disabled={isLast} className="w-7 h-7 flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#6E6862] disabled:opacity-30" title="下移">
                <ArrowDown size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content - editable or display */}
        <div className="min-h-[28px]" onDoubleClick={handleStartEdit}>
          {editing ? (
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[60px] px-2 py-1 bg-white border border-[#D9BFA8] rounded text-sm text-[#383431] leading-relaxed outline-none resize-none"
            />
          ) : (
            <div className="hover:bg-[#F8F7F6]/50 rounded px-1 -mx-1 transition-colors">
              <HighlightedContent content={block.content} type={block.type} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ScriptEditorArea({
  blocks,
  title,
  episodeNumber,
  episodeTitle,
  onBlockSelect,
  selectedBlockId,
  onBlocksChange,
  episodes,
  currentEpisodeId,
}: ScriptEditorAreaProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [titleFocused, setTitleFocused] = useState(false);
  const { success } = useToast();

  // Find current episode/scene for breadcrumb
  const currentEpisode = episodes.find((ep) => ep.id === currentEpisodeId);
  const selectedScene = currentEpisode?.scenes.find((s) => {
    const block = blocks.find((b) => b.id === selectedBlockId);
    return block?.sceneId === s.id;
  });

  // Block operations
  const handleDeleteBlock = useCallback((index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onBlocksChange(newBlocks);
    if (selectedBlockId === blocks[index].id) {
      onBlockSelect('');
    }
  }, [blocks, onBlocksChange, selectedBlockId, onBlockSelect]);

  const handleMoveBlock = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(newIndex, 0, moved);
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange]);

  const handleDuplicateBlock = useCallback((index: number) => {
    const block = blocks[index];
    const newBlock: ScriptBlock = {
      ...block,
      id: `b${Date.now()}`,
      content: block.content + '（副本）',
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onBlocksChange(newBlocks);
    success(MSG.blockDuplicated);
  }, [blocks, onBlocksChange, success]);

  const handleUpdateContent = useCallback((index: number, content: string) => {
    const newBlocks = blocks.map((b, i) => i === index ? { ...b, content } : b);
    onBlocksChange(newBlocks);
  }, [blocks, onBlocksChange]);

  const handleAddBlockAfter = useCallback((index: number, type: ScriptBlockType) => {
    const block = blocks[index];
    const typeDefaults: Record<ScriptBlockType, string> = {
      scene: '[场景：新场景·时间]',
      character: '【角色：角色名】（情绪：情绪描述）',
      emotion: '（情绪：描述）',
      action: '<动作：动作描述>',
      sound: '「音效：声音描述」',
      transition: '--- 转场 ---',
      dialogue: '【角色：新角色】\n这是新对话内容...',
      narration: '在此处输入叙述文本...',
      note: '【注释：备注内容】',
    };

    const newBlock: ScriptBlock = {
      id: `b${Date.now()}`,
      type,
      content: typeDefaults[type] || '',
      sceneId: block?.sceneId,
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onBlocksChange(newBlocks);
    success(MSG.blockAdded);
  }, [blocks, onBlocksChange, success]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace on empty selected block
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        const idx = blocks.findIndex((b) => b.id === selectedBlockId);
        if (idx >= 0 && blocks[idx].content === '') {
          e.preventDefault();
          handleDeleteBlock(idx);
        }
      }
      // Enter to create new dialogue block
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && selectedBlockId) {
        // Only if not in an input/textarea
        if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          const idx = blocks.findIndex((b) => b.id === selectedBlockId);
          if (idx >= 0) {
            handleAddBlockAfter(idx, 'dialogue');
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, blocks, handleDeleteBlock, handleAddBlockAfter]);

  return (
    <div
      id="script-editor-scroll"
      className="flex-1 overflow-y-auto bg-white min-w-0"
    >
      {/* Editor content area */}
      <motion.div
        className="max-w-[720px] mx-auto px-12 py-10 pb-20"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3 text-[11px] text-[#A8A39E]">
          <span>{editTitle || '未命名剧本'}</span>
          <ChevronRight size={10} />
          <span>第{episodeNumber}集</span>
          {selectedScene && (
            <>
              <ChevronRight size={10} />
              <span className="text-[#A8835F]">场景{selectedScene.number}：{selectedScene.title}</span>
            </>
          )}
        </div>

        {/* Script Title */}
        <div className="mb-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            className={cn(
              'w-full text-[28px] font-semibold text-[#383431] bg-transparent border-b-2 outline-none transition-colors pb-2',
              titleFocused ? 'border-[#D9BFA8]' : 'border-[#DEDBD8]'
            )}
            placeholder="输入剧本标题..."
          />
        </div>

        {/* Info pills */}
        <div className="flex items-center gap-3 mb-8">
          <span className="h-6 px-2.5 bg-[#F0F3F7] text-[#5A7FA8] rounded-full text-caption flex items-center">
            第{episodeNumber}集：{episodeTitle}
          </span>
          <span className="h-6 px-2.5 bg-[#F0F5F0] text-[#5B8C5A] rounded-full text-caption flex items-center">
            漫剧
          </span>
          <span className="h-6 px-2.5 bg-[#F5EDE6] text-[#8E6A48] rounded-full text-caption flex items-center">
            约15分钟
          </span>
        </div>

        {/* Script Blocks */}
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <ScriptBlockItem
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onBlockSelect(block.id)}
              onDelete={() => handleDeleteBlock(index)}
              onMoveUp={() => handleMoveBlock(index, -1)}
              onMoveDown={() => handleMoveBlock(index, 1)}
              onDuplicate={() => handleDuplicateBlock(index)}
              onUpdateContent={(content) => handleUpdateContent(index, content)}
              onAddBlockAfter={(type) => handleAddBlockAfter(index, type)}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
            />
          ))}

          {/* Add block at the end */}
          <div className="flex items-center justify-center py-4">
            <div className="relative group">
              <button
                onClick={() => handleAddBlockAfter(blocks.length - 1, 'dialogue')}
                className="w-8 h-8 rounded-full bg-[#A8835F] text-white flex items-center justify-center hover:bg-[#8E6A48] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
