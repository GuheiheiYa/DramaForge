import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Heading2,
  Quote,
  Sparkles,
  Download,
  Check,
  ChevronDown,
  FileText,
  Save,
  Type,
  User,
  Smile,
  Zap,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, MSG } from '@/hooks/useToast';
import ProjectSelector from '@/components/ProjectSelector';

interface ScriptToolbarProps {
  wordCount: number;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onAIAction: (action: string) => void;
  hasSelection: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function ScriptToolbar({
  wordCount,
  saveStatus,
  onAIAction,
  hasSelection,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ScriptToolbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const { success, info } = useToast();

  useEffect(() => {
    function handleScroll() {
      const editor = document.getElementById('script-editor-scroll');
      if (editor) {
        setScrolled(editor.scrollTop > 10);
      }
    }
    const editor = document.getElementById('script-editor-scroll');
    if (editor) {
      editor.addEventListener('scroll', handleScroll);
      return () => editor.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
        setFormatMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusConfig = {
    saved: { text: '已保存', icon: <Check size={12} />, color: 'text-[#5B8C5A]' },
    saving: { text: '保存中...', icon: null, color: 'text-[#5A7FA8]' },
    unsaved: { text: '未保存', icon: null, color: 'text-[#C49A3C]' },
  };
  const status = statusConfig[saveStatus];

  const handleExport = (format: string) => {
    setExportOpen(false);
    info(MSG.exportStarted + `（${format}）`);
    setTimeout(() => success(`导出${format}完成`), 2000);
  };

  const handleSaveClick = () => {
    onSave();
  };

  const handleUndoClick = () => {
    if (!canUndo) {
      info(MSG.noUndo);
      return;
    }
    onUndo();
  };

  const handleRedoClick = () => {
    if (!canRedo) {
      info(MSG.noRedo);
      return;
    }
    onRedo();
  };

  const handleBold = () => {
    setBoldActive(!boldActive);
    info(boldActive ? '已取消粗体' : '已应用粗体');
  };

  const handleItalic = () => {
    setItalicActive(!italicActive);
    info(italicActive ? '已取消斜体' : '已应用斜体');
  };

  const handleFormatAction = (type: string) => {
    setFormatMenuOpen(false);
    info(`已添加${type}标记`);
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-10 h-12 flex items-center justify-between px-4 bg-white transition-all duration-fast',
        scrolled ? 'border-b border-[#DEDBD8] shadow-sm' : 'border-b border-transparent'
      )}
    >
      {/* Left: Formatting */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleUndoClick}
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center hover:text-[#6E6862] hover:bg-[#F8F7F6] transition-colors',
            canUndo ? 'text-[#C5C1BC]' : 'text-[#E5E2DF] cursor-not-allowed'
          )}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={handleRedoClick}
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center hover:text-[#6E6862] hover:bg-[#F8F7F6] transition-colors',
            canRedo ? 'text-[#C5C1BC]' : 'text-[#E5E2DF] cursor-not-allowed'
          )}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-[#DEDBD8] mx-1.5" />

        <button
          onClick={handleBold}
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center transition-colors font-bold text-sm',
            boldActive
              ? 'bg-[#F0F3F7] text-[#5A7FA8]'
              : 'text-[#6E6862] hover:bg-[#F8F7F6]'
          )}
          title="粗体 (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          onClick={handleItalic}
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center transition-colors',
            italicActive
              ? 'bg-[#F0F3F7] text-[#5A7FA8]'
              : 'text-[#6E6862] hover:bg-[#F8F7F6]'
          )}
          title="斜体 (Ctrl+I)"
        >
          <Italic size={15} />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-[#6E6862] hover:bg-[#F8F7F6] transition-colors"
          title="标题"
        >
          <Heading2 size={15} />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-[#6E6862] hover:bg-[#F8F7F6] transition-colors"
          title="引用"
        >
          <Quote size={15} />
        </button>

        <div className="w-px h-6 bg-[#DEDBD8] mx-1.5" />

        {/* Format tags dropdown */}
        <div className="relative" ref={formatRef}>
          <button
            onClick={() => setFormatMenuOpen(!formatMenuOpen)}
            className="h-7 px-2 rounded border border-[#DEDBD8] text-caption text-[#6E6862] hover:bg-[#F8F7F6] transition-colors flex items-center gap-1"
          >
            <Type size={13} />
            标记
            <ChevronDown size={12} />
          </button>
          {formatMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-[#DEDBD8] z-50 py-1">
              {[
                { label: '场景标记', icon: <Type size={12} />, tag: '场景' },
                { label: '角色标记', icon: <User size={12} />, tag: '角色' },
                { label: '情绪标记', icon: <Smile size={12} />, tag: '情绪' },
                { label: '动作标记', icon: <Zap size={12} />, tag: '动作' },
                { label: '音效标记', icon: <Volume2 size={12} />, tag: '音效' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleFormatAction(item.tag)}
                  className="w-full px-3 py-1.5 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-[#DEDBD8] mx-1.5" />

        {/* AI Quick Actions */}
        <button
          onClick={() => onAIAction('续写')}
          className="h-7 px-2.5 rounded-full border border-[#EAD8C8] bg-[#FBF7F4] text-caption text-[#8E6A48] hover:bg-[#F5EDE6] transition-colors flex items-center gap-1"
        >
          <Sparkles size={12} />
          续写
        </button>
        <button
          onClick={() => onAIAction('改写')}
          className={cn(
            'h-7 px-2.5 rounded-full border text-caption transition-colors flex items-center gap-1',
            hasSelection
              ? 'border-[#EAD8C8] bg-[#FBF7F4] text-[#8E6A48] hover:bg-[#F5EDE6]'
              : 'border-[#DEDBD8] text-[#C5C1BC] cursor-not-allowed'
          )}
          disabled={!hasSelection}
        >
          <Sparkles size={12} />
          改写
        </button>
      </div>

      {/* Center: Word count */}
      <div className="hidden md:flex items-center">
        <span className="text-caption font-mono text-[#A8A39E]">
          {wordCount.toLocaleString()} 字
        </span>
      </div>

      {/* Right: Project Selector + Save status + Export + Save */}
      <div className="flex items-center gap-3">
        <ProjectSelector />
        <motion.span
          className={cn('text-caption flex items-center gap-1', status.color)}
          key={saveStatus}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {status.icon}
          {status.text}
        </motion.span>

        <button
          onClick={handleSaveClick}
          className="h-7 px-2.5 rounded border border-[#5B8C5A] text-caption text-[#5B8C5A] hover:bg-[#F0F5F0] transition-colors flex items-center gap-1"
        >
          <Save size={12} />
          保存
        </button>

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="h-7 px-2.5 rounded border border-[#DEDBD8] text-caption text-[#6E6862] hover:bg-[#F8F7F6] transition-colors flex items-center gap-1"
          >
            <Download size={13} />
            导出
            <ChevronDown size={12} />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-[#DEDBD8] z-50 py-1">
              {[
                { label: '导出为 PDF', icon: <FileText size={12} /> },
                { label: '导出为 Word', icon: <FileText size={12} /> },
                { label: '导出为 Markdown', icon: <FileText size={12} /> },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleExport(item.label.replace('导出为 ', ''))}
                  className="w-full px-3 py-1.5 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
