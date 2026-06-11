import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  Loader2,
  Camera,
} from 'lucide-react';
import type { Shot } from './types';
import {
  SHOT_TYPE_STYLES,
  CAMERA_MOVEMENT_OPTIONS,
  COMPOSITION_OPTIONS,
  LIGHTING_OPTIONS,
  SHOT_TYPE_OPTIONS,
} from './types';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks/useToast';

interface FrameEditorProps {
  shot: Shot | null;
  shots: Shot[];
  onNavigate: (direction: 'prev' | 'next') => void;
  onUpdateShot?: (id: string, updates: Partial<Shot>) => void;
  onDeleteShot?: (id: string) => void;
  onGenerateImage?: (id: string) => void;
  onGenerateVideo?: (id: string) => void;
}

export default function FrameEditor({
  shot,
  shots,
  onNavigate,
  onUpdateShot,
  onDeleteShot,
}: FrameEditorProps) {
  const [hoverPreview, setHoverPreview] = useState(false);
  const [zoomModal, setZoomModal] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [localDescription, setLocalDescription] = useState('');
  const [localDialogue, setLocalDialogue] = useState('');
  const [localAction, setLocalAction] = useState('');
  const [localDuration, setLocalDuration] = useState(0);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state when shot changes
  useEffect(() => {
    if (shot) {
      setLocalDescription(shot.description);
      setLocalDialogue(shot.dialogue);
      setLocalAction(shot.characterAction);
      setLocalDuration(shot.duration);
    }
  }, [shot?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shot) return;
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        if (e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('next');
          break;
        case 'Delete':
          if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            handleDelete();
          }
          break;
        case 'g':
        case 'G':
          if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            handleGenerateImage();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shot, onNavigate]);

  if (!shot) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FBF7F4]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#F5EDE6] flex items-center justify-center mx-auto mb-4">
            <Camera size={32} className="text-[#C4A07F]" />
          </div>
          <h3 className="text-lg font-medium text-[#524D48] mb-2">选择一个分镜</h3>
          <p className="text-[13px] text-[#A8A39E]">从时间轴或分镜列表中选择一个分镜开始编辑</p>
        </div>
      </div>
    );
  }

  const shotStyle = SHOT_TYPE_STYLES[shot.shotType];
  const currentIndex = shots.findIndex((s) => s.id === shot.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < shots.length - 1;

  const prevShot = hasPrev ? shots[currentIndex - 1] : null;
  const nextShot = hasNext ? shots[currentIndex + 1] : null;

  const handleGenerateImage = () => {
    if (generatingImage) return;
    setGeneratingImage(true);
    toastSuccess('开始生成图像...');
    setTimeout(() => {
      setGeneratingImage(false);
      onUpdateShot?.(shot.id, { status: '已完成' });
      toastSuccess('图像生成完成！', `分镜 镜${String(shot.shotNumber).padStart(2, '0')} 已更新`);
    }, 3000);
  };

  const handleGenerateVideo = () => {
    if (generatingVideo) return;
    setGeneratingVideo(true);
    toastSuccess('开始生成视频片段...');
    setTimeout(() => {
      setGeneratingVideo(false);
      toastSuccess('视频片段生成完成！');
    }, 5000);
  };

  const handleRegenerate = () => {
    setGeneratingImage(true);
    toastSuccess('正在重新生成...');
    setTimeout(() => {
      setGeneratingImage(false);
      onUpdateShot?.(shot.id, { status: '已完成' });
      toastSuccess('重新生成完成！');
    }, 3000);
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除分镜 镜${String(shot.shotNumber).padStart(2, '0')} 吗？`)) {
      onDeleteShot?.(shot.id);
      toastSuccess('分镜已删除');
    }
  };

  const handleShotTypeChange = (newType: Shot['shotType']) => {
    onUpdateShot?.(shot.id, { shotType: newType });
    toastSuccess(`景别已切换为${newType}`);
  };

  const handleCameraChange = (val: string) => {
    onUpdateShot?.(shot.id, { cameraMovement: val });
  };

  const handleDurationChange = (delta: number) => {
    const newVal = Math.max(1, Math.min(60, localDuration + delta));
    setLocalDuration(newVal);
    onUpdateShot?.(shot.id, { duration: newVal });
  };

  const handleDurationInput = (val: number) => {
    const clamped = Math.max(1, Math.min(60, val));
    setLocalDuration(clamped);
    onUpdateShot?.(shot.id, { duration: clamped });
  };

  const saveDescription = () => {
    onUpdateShot?.(shot.id, { description: localDescription });
  };

  const saveDialogue = () => {
    onUpdateShot?.(shot.id, { dialogue: localDialogue });
  };

  const saveAction = () => {
    onUpdateShot?.(shot.id, { characterAction: localAction });
  };

  const shotTypeColors = SHOT_TYPE_OPTIONS.map((t) => ({
    type: t,
    style: SHOT_TYPE_STYLES[t],
  }));

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[#FBF7F4]">
        <div className="max-w-[800px] mx-auto py-6 px-6">
          {/* Preview Area */}
          <div
            className="relative w-full rounded-xl overflow-hidden bg-[#EFEDEB] mb-6 cursor-pointer group"
            style={{ aspectRatio: '16/9' }}
            onMouseEnter={() => setHoverPreview(true)}
            onMouseLeave={() => setHoverPreview(false)}
            onClick={() => setZoomModal(true)}
          >
            <PreviewContent
              shot={shot}
              shotStyle={shotStyle}
              hoverPreview={hoverPreview}
              generatingImage={generatingImage}
              generatingVideo={generatingVideo}
            />
            {/* Zoom hint */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
                <ZoomIn size={16} className="text-white" />
              </div>
            </div>
          </div>

          {/* Shot Info */}
          <div className="space-y-4">
            {/* Shot number + type + duration */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] font-mono text-[#5A7FA8] bg-[#F0F3F7] rounded-full px-2.5 py-1">
                镜号 {String(shot.shotNumber).padStart(2, '0')}
              </span>

              {/* Shot type selector */}
              <div className="flex items-center gap-1">
                {shotTypeColors.map(({ type, style }) => (
                  <button
                    key={type}
                    onClick={() => handleShotTypeChange(type)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-full font-medium transition-all',
                      shot.shotType === type
                        ? 'ring-1 ring-offset-1'
                        : 'opacity-50 hover:opacity-80'
                    )}
                    style={{
                      backgroundColor: style.bg,
                      color: style.text,
                      outline: shot.shotType === type ? `2px solid ${style.text}` : '2px solid transparent',
                    }}
                    title={type}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Duration with +/- */}
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-[#8B847E]">时长</span>
                <button
                  onClick={() => handleDurationChange(-1)}
                  className="w-6 h-6 rounded bg-[#F8F7F6] border border-[#DEDBD8] flex items-center justify-center text-[#8B847E] hover:border-[#A8835F] hover:text-[#A8835F] transition-colors text-[12px]"
                >
                  −
                </button>
                <input
                  type="number"
                  value={localDuration}
                  min={1}
                  max={60}
                  onChange={(e) => handleDurationInput(Number(e.target.value))}
                  className="w-14 h-8 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[13px] text-[#383431] text-center font-mono outline-none focus:border-[#A8835F] focus:shadow-inner transition-all"
                />
                <button
                  onClick={() => handleDurationChange(1)}
                  className="w-6 h-6 rounded bg-[#F8F7F6] border border-[#DEDBD8] flex items-center justify-center text-[#8B847E] hover:border-[#A8835F] hover:text-[#A8835F] transition-colors text-[12px]"
                >
                  +
                </button>
                <span className="text-[12px] text-[#8B847E]">秒</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">画面描述</label>
              <textarea
                ref={descriptionRef}
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                onBlur={saveDescription}
                placeholder="描述画面内容..."
                rows={4}
                className="w-full bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-3.5 py-2.5 text-[14px] text-[#524D48] placeholder-[#A8A39E] outline-none focus:border-[#A8835F] focus:shadow-inner transition-all resize-none leading-relaxed"
              />
              <span className="text-[10px] text-[#A8A39E] mt-0.5 block">编辑完成后自动保存</span>
            </div>

            {/* Camera params */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">运镜</label>
                <select
                  value={shot.cameraMovement}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full h-9 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-2.5 text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer"
                >
                  {CAMERA_MOVEMENT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">构图</label>
                <select
                  value={shot.composition}
                  onChange={(e) => onUpdateShot?.(shot.id, { composition: e.target.value })}
                  className="w-full h-9 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-2.5 text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer"
                >
                  {COMPOSITION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">光影</label>
                <select
                  value={shot.lighting}
                  onChange={(e) => onUpdateShot?.(shot.id, { lighting: e.target.value })}
                  className="w-full h-9 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-2.5 text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer"
                >
                  {LIGHTING_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Character action */}
            <div>
              <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">角色动作</label>
              <input
                type="text"
                value={localAction}
                onChange={(e) => setLocalAction(e.target.value)}
                onBlur={saveAction}
                placeholder="描述角色的动作和表情..."
                className="w-full h-10 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-3.5 text-[14px] text-[#524D48] placeholder-[#A8A39E] outline-none focus:border-[#A8835F] focus:shadow-inner transition-all"
              />
            </div>

            {/* Dialogue */}
            <div>
              <label className="text-[12px] font-medium text-[#8B847E] mb-1.5 block">台词</label>
              <textarea
                value={localDialogue}
                onChange={(e) => setLocalDialogue(e.target.value)}
                onBlur={saveDialogue}
                placeholder="输入角色台词（如有）..."
                rows={2}
                className="w-full bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-3.5 py-2 text-[14px] text-[#524D48] placeholder-[#A8A39E] outline-none focus:border-[#A8835F] focus:shadow-inner transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              {shot.status === '等待中' || shot.status === '草稿' || shot.status === '失败' ? (
                <button
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className="h-9 px-4 bg-[#A8835F] hover:bg-[#8E6A48] disabled:bg-[#DEDBD8] text-white text-[13px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:cursor-not-allowed"
                >
                  {generatingImage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {generatingImage ? '生成中...' : '生成图像'}
                </button>
              ) : shot.status === '生成中' ? (
                <button className="h-9 px-4 bg-[#F0F3F7] text-[#5A7FA8] text-[13px] font-medium rounded-lg flex items-center gap-1.5 cursor-not-allowed">
                  <Loader2 size={14} className="animate-spin" />
                  生成中...
                </button>
              ) : shot.status === '已完成' ? (
                <>
                  <button
                    onClick={handleGenerateVideo}
                    disabled={generatingVideo}
                    className="h-9 px-4 bg-[#A8835F] hover:bg-[#8E6A48] disabled:bg-[#DEDBD8] text-white text-[13px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:cursor-not-allowed"
                  >
                    {generatingVideo ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} />
                    )}
                    {generatingVideo ? '生成中...' : '生成视频'}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={generatingImage}
                    className="h-9 px-3 border border-[#DEDBD8] hover:border-[#A8835F] hover:bg-[#FBF7F4] text-[#524D48] text-[13px] rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={generatingImage ? 'animate-spin' : ''} />
                    重新生成
                  </button>
                </>
              ) : null}
              <button
                onClick={handleDelete}
                className="h-9 px-3 border border-[#DEDBD8] hover:border-[#B85C50] hover:bg-[#FDF2F0] text-[#524D48] hover:text-[#B85C50] text-[13px] rounded-lg flex items-center gap-1.5 transition-colors ml-auto"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EFEDEB]">
              <button
                onClick={() => onNavigate('prev')}
                disabled={!hasPrev}
                className={cn(
                  'h-9 px-3 border rounded-lg text-[13px] flex items-center gap-1.5 transition-colors',
                  hasPrev
                    ? 'border-[#DEDBD8] hover:border-[#A8835F] hover:bg-[#FBF7F4] text-[#524D48]'
                    : 'border-[#EFEDEB] text-[#C5C1BC] cursor-not-allowed'
                )}
              >
                <ChevronLeft size={14} />
                上一分镜
                {prevShot && (
                  <span className="text-[11px] text-[#A8A39E] ml-1">
                    镜{String(prevShot.shotNumber).padStart(2, '0')} · {prevShot.shotType}
                  </span>
                )}
              </button>
              <span className="text-[12px] text-[#A8A39E] font-mono">
                {currentIndex + 1} / {shots.length}
              </span>
              <button
                onClick={() => onNavigate('next')}
                disabled={!hasNext}
                className={cn(
                  'h-9 px-3 border rounded-lg text-[13px] flex items-center gap-1.5 transition-colors',
                  hasNext
                    ? 'border-[#DEDBD8] hover:border-[#A8835F] hover:bg-[#FBF7F4] text-[#524D48]'
                    : 'border-[#EFEDEB] text-[#C5C1BC] cursor-not-allowed'
                )}
              >
                {nextShot && (
                  <span className="text-[11px] text-[#A8A39E] mr-1">
                    镜{String(nextShot.shotNumber).padStart(2, '0')} · {nextShot.shotType}
                  </span>
                )}
                下一分镜
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="flex items-center gap-3 text-[10px] text-[#A8A39E] pt-2">
              <span>快捷键：← → 切换分镜</span>
              <span>·</span>
              <span>Delete 删除</span>
              <span>·</span>
              <span>G 生成图像</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-8"
            onClick={() => setZoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
              className="relative max-w-[1000px] w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: '16/9' }}
              onClick={(e) => e.stopPropagation()}
            >
              <PreviewContent
                shot={shot}
                shotStyle={shotStyle}
                hoverPreview={false}
                generatingImage={generatingImage}
                generatingVideo={generatingVideo}
              />
              <button
                onClick={() => setZoomModal(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Preview sub-component
function PreviewContent({
  shot,
  shotStyle,
  hoverPreview,
  generatingImage,
  generatingVideo,
}: {
  shot: Shot;
  shotStyle: { bg: string; text: string };
  hoverPreview: boolean;
  generatingImage?: boolean;
  generatingVideo?: boolean;
}) {
  return (
    <div className="w-full h-full bg-[#EFEDEB] relative overflow-hidden">
      {shot.status === '已完成' ? (
        <div
          className="w-full h-full relative"
          style={{
            background: `linear-gradient(135deg, ${shotStyle.bg} 0%, ${shotStyle.bg}dd 50%, ${shotStyle.bg} 100%)`,
          }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Camera size={48} className="text-[#A8A39E] mb-3" />
            <span className="text-[14px] font-mono text-[#6E6862]">
              镜{String(shot.shotNumber).padStart(2, '0')} · {shot.shotType}
            </span>
            <p className="text-[12px] text-[#8B847E] mt-2 max-w-[60%] text-center leading-relaxed">
              {shot.description.slice(0, 60)}...
            </p>
          </div>

          {/* Hover actions */}
          <AnimatePresence>
            {hoverPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/10 flex items-center justify-center"
              >
                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[#524D48] hover:bg-white transition-colors shadow-sm">
                    <Play size={18} className="ml-0.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : shot.status === '失败' ? (
        <div className="w-full h-full bg-[#FDF2F0] flex flex-col items-center justify-center">
          <AlertTriangle size={32} className="text-[#B85C50] mb-2" />
          <span className="text-[#B85C50] text-[14px] font-medium">生成失败</span>
          <p className="text-[11px] text-[#B85C50]/60 mt-1">点击重新生成按钮重试</p>
        </div>
      ) : (
        <div className="w-full h-full bg-[#F8F7F6] flex flex-col items-center justify-center">
          <Camera size={48} className="text-[#C5C1BC] mb-3" />
          <span className="text-[14px] font-mono text-[#A8A39E]">
            镜{String(shot.shotNumber).padStart(2, '0')} · {shot.shotType}
          </span>
          <p className="text-[12px] text-[#C5C1BC] mt-2">等待生成</p>
        </div>
      )}

      {/* Generating overlay */}
      {(generatingImage || generatingVideo || shot.status === '生成中') && (
        <div className="absolute inset-0 bg-[#5A7FA8]/20 flex items-center justify-center z-10">
          <div className="bg-white/90 rounded-xl px-6 py-4 flex flex-col items-center shadow-lg">
            <Loader2 size={28} className="text-[#5A7FA8] animate-spin mb-2" />
            <span className="text-[13px] text-[#524D48] font-medium">
              {generatingVideo ? '生成视频中...' : '生成图像中...'}
            </span>
            <span className="text-[11px] text-[#A8A39E] mt-1">请稍候</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertTriangle({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
