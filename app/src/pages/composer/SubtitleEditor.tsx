import { useState } from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight, Monitor, Plus, Check, Trash2 } from 'lucide-react';
import type { SubtitleStyle, SubtitleSegment } from './types';
import { FONT_OPTIONS } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks/useToast';

interface SubtitleEditorProps {
  style: SubtitleStyle;
  onStyleChange: (style: SubtitleStyle) => void;
  segments?: SubtitleSegment[];
  onSegmentsChange?: (segments: SubtitleSegment[]) => void;
  currentTime?: number;
}

export default function SubtitleEditor({
  style,
  onStyleChange,
  segments: propSegments,
  onSegmentsChange,
  currentTime = 0,
}: SubtitleEditorProps) {
  const [localStyle, setLocalStyle] = useState<SubtitleStyle>(style);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const update = (patch: Partial<SubtitleStyle>) => {
    const next = { ...localStyle, ...patch };
    setLocalStyle(next);
    onStyleChange(next);
  };

  const defaultSegments: SubtitleSegment[] = [
    { id: 'sub01', text: '春风拂过，樱花如雪般飘落。', startTime: 0, duration: 5 },
    { id: 'sub02', text: '林晓：一年后的今天，我会在樱花树下等你。', startTime: 5, duration: 4 },
    { id: 'sub03', text: '回忆如潮水般涌来...', startTime: 9, duration: 6 },
    { id: 'sub04', text: '泪水滴落信笺。', startTime: 15, duration: 3 },
    { id: 'sub05', text: '林晓：我...我一定会去的。', startTime: 18, duration: 5 },
    { id: 'sub06', text: '陈默：林晓——！', startTime: 23, duration: 4 },
    { id: 'sub07', text: '陈默：笨蛋，我等了你整整一年...', startTime: 27, duration: 5 },
    { id: 'sub08', text: '以后的每一年，我们都一起来看樱花吧。', startTime: 32, duration: 4 },
  ];

  const segments = propSegments ?? defaultSegments;

  const alignButtons = [
    { key: 'bottom-left' as const, icon: AlignLeft, label: '左对齐' },
    { key: 'bottom-center' as const, icon: AlignCenter, label: '居中' },
    { key: 'bottom-right' as const, icon: AlignRight, label: '右对齐' },
  ];

  const bgOptions: { key: SubtitleStyle['backgroundType']; label: string }[] = [
    { key: 'none', label: '无' },
    { key: 'semi-black', label: '半透明黑' },
    { key: 'solid', label: '纯色底' },
  ];

  const animOptions: { key: SubtitleStyle['animation']; label: string }[] = [
    { key: 'none', label: '无' },
    { key: 'fade', label: '淡入' },
    { key: 'slide-up', label: '从下划入' },
  ];

  const colorPresets = ['#FFFFFF', '#FFEB3B', '#FF9800', '#F44336', '#E91E63', '#9C27B0', '#2196F3', '#4CAF50'];

  const getPreviewBg = () => {
    switch (localStyle.backgroundType) {
      case 'semi-black': return 'rgba(0,0,0,0.5)';
      case 'solid': return localStyle.backgroundColor;
      default: return 'transparent';
    }
  };

  const getPreviewAlign = () => {
    switch (localStyle.position) {
      case 'bottom-left': return 'left' as const;
      case 'bottom-right': return 'right' as const;
      default: return 'center' as const;
    }
  };

  const handleSelectSegment = (seg: SubtitleSegment) => {
    setSelectedSegmentId(seg.id);
    setEditingText(seg.text);
  };

  const handleUpdateSegmentText = (id: string, newText: string) => {
    const updated = segments.map((s) => s.id === id ? { ...s, text: newText } : s);
    onSegmentsChange?.(updated);
  };

  const handleDeleteSegment = (id: string) => {
    const updated = segments.filter((s) => s.id !== id);
    onSegmentsChange?.(updated);
    setSelectedSegmentId(null);
    toastSuccess('字幕已删除');
  };

  const handleAddSegment = () => {
    const newSeg: SubtitleSegment = {
      id: `sub_${Date.now()}`,
      text: '新字幕...',
      startTime: currentTime,
      duration: 3,
    };
    onSegmentsChange?.([...segments, newSeg]);
    setSelectedSegmentId(newSeg.id);
    setEditingText(newSeg.text);
    toastSuccess('已添加新字幕');
  };

  const handleApplyToAll = () => {
    toastSuccess('字幕样式已应用到全部字幕');
  };

  const getAnimationClass = () => {
    switch (localStyle.animation) {
      case 'fade': return 'animate-[fadeIn_0.5s_ease-out]';
      case 'slide-up': return 'animate-[slideUp_0.5s_ease-out]';
      default: return '';
    }
  };

  return (
    <div className="h-full flex">
      {/* Editor controls */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-[15px] font-medium text-[#524D48] mb-5 flex items-center gap-2">
          <Type size={16} className="text-[#A8835F]" />
          字幕样式
        </h3>

        <div className="space-y-5 max-w-[480px]">
          {/* Font selector */}
          <div>
            <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">字体</label>
            <select
              value={localStyle.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full h-9 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-3 text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-medium text-[#8B847E]">字号</label>
              <span className="text-[12px] font-mono text-[#524D48]">{localStyle.fontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={72}
              value={localStyle.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full accent-[#A8835F]"
            />
            <div className="flex justify-between text-[10px] text-[#A8A39E] mt-0.5">
              <span>12px</span>
              <span>72px</span>
            </div>
          </div>

          {/* Text color */}
          <div>
            <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">文字颜色</label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded border border-[#DEDBD8] cursor-pointer shadow-sm transition-transform hover:scale-105"
                  style={{ backgroundColor: localStyle.textColor }}
                />
                {showColorPicker && (
                  <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setShowColorPicker(false)} />
                    <div className="absolute top-10 left-0 bg-white rounded-lg border border-[#DEDBD8] shadow-lg p-2 z-[100] grid grid-cols-4 gap-1">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          onClick={() => { update({ textColor: color }); setShowColorPicker(false); }}
                          className={cn(
                            'w-6 h-6 rounded-full border transition-all hover:scale-110',
                            localStyle.textColor === color ? 'border-[#A8835F] ring-1 ring-[#A8835F]' : 'border-[#DEDBD8]'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <span className="text-[12px] font-mono text-[#524D48]">{localStyle.textColor}</span>
            </div>
          </div>

          {/* Background style */}
          <div>
            <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">背景样式</label>
            <div className="flex gap-2">
              {bgOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => update({ backgroundType: opt.key })}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[12px] border transition-colors',
                    localStyle.backgroundType === opt.key
                      ? 'border-[#A8835F] bg-[#FBF7F4] text-[#755235]'
                      : 'border-[#DEDBD8] text-[#524D48] hover:border-[#A8835F]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">位置</label>
            <div className="flex gap-2">
              {alignButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => update({ position: btn.key })}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[12px] border flex items-center gap-1 transition-colors',
                    localStyle.position === btn.key
                      ? 'border-[#A8835F] bg-[#FBF7F4] text-[#755235]'
                      : 'border-[#DEDBD8] text-[#524D48] hover:border-[#A8835F]'
                  )}
                >
                  <btn.icon size={13} />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation */}
          <div>
            <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">动画样式</label>
            <div className="flex gap-2">
              {animOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => update({ animation: opt.key })}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[12px] border transition-colors',
                    localStyle.animation === opt.key
                      ? 'border-[#A8835F] bg-[#FBF7F4] text-[#755235]'
                      : 'border-[#DEDBD8] text-[#524D48] hover:border-[#A8835F]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply to all button */}
          <button
            onClick={handleApplyToAll}
            className="h-8 px-4 bg-[#A8835F] hover:bg-[#8E6A48] text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check size={13} />
            应用到全部字幕
          </button>
        </div>

        {/* Subtitle list */}
        <div className="mt-8 border-t border-[#EFEDEB] pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[13px] font-medium text-[#524D48] flex items-center gap-2">
              字幕列表
              <span className="text-[11px] text-[#A8A39E] font-mono">({segments.length})</span>
            </h4>
            <button
              onClick={handleAddSegment}
              className="h-7 px-2.5 bg-[#A8835F] hover:bg-[#8E6A48] text-white text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus size={12} />
              添加字幕
            </button>
          </div>
          <div className="space-y-1.5 max-w-[480px]">
            {segments.map((seg) => {
              const isSelected = seg.id === selectedSegmentId;
              return (
                <div
                  key={seg.id}
                  onClick={() => handleSelectSegment(seg)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group',
                    isSelected ? 'bg-[#FBF7F4] border border-[#D9BFA8]' : 'hover:bg-[#F8F7F6] border border-transparent'
                  )}
                >
                  <span className="text-[10px] font-mono text-[#A8A39E] w-12 shrink-0">
                    {seg.startTime.toFixed(1)}s
                  </span>
                  {isSelected ? (
                    <input
                      value={editingText}
                      onChange={(e) => {
                        setEditingText(e.target.value);
                        handleUpdateSegmentText(seg.id, e.target.value);
                      }}
                      onBlur={() => setSelectedSegmentId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedSegmentId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-[13px] bg-white border border-[#A8835F] rounded px-2 py-0.5 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-[13px] text-[#524D48] truncate">{seg.text}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSegment(seg.id); }}
                    className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#FDF2F0] text-[#C5C1BC] hover:text-[#B85C50] transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview area */}
      <div className="w-80 border-l border-[#DEDBD8] bg-[#FAFAFA] flex flex-col">
        <div className="h-10 flex items-center px-4 border-b border-[#DEDBD8]">
          <Monitor size={14} className="text-[#8B847E] mr-2" />
          <span className="text-[12px] font-medium text-[#8B847E]">预览</span>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div
            className="w-full rounded-lg overflow-hidden relative flex items-end justify-center"
            style={{
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
          >
            {/* Fake scene hint */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-gradient-to-t from-pink-900/40 via-transparent to-blue-900/20" />
            </div>

            {/* Subtitle text */}
            <div
              className={cn("px-4 py-2 mb-4 mx-4 rounded", getAnimationClass())}
              style={{
                backgroundColor: getPreviewBg(),
                textAlign: getPreviewAlign(),
              }}
            >
              <p
                style={{
                  fontFamily: localStyle.fontFamily,
                  fontSize: `${Math.max(localStyle.fontSize * 0.6, 12)}px`,
                  color: localStyle.textColor,
                  fontWeight: 500,
                  textShadow: `0 1px 4px rgba(0,0,0,0.8), 0 0 2px ${localStyle.strokeColor}`,
                  lineHeight: 1.4,
                }}
              >
                春风拂过，樱花如雪般飘落
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
