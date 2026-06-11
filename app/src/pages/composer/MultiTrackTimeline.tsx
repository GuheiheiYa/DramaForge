import { useRef, useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Lock, Unlock } from 'lucide-react';
import type { TimelineClip, TrackType } from './types';
import { TRACK_LABELS } from './types';
import Clip from './Clip';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks/useToast';

interface MultiTrackTimelineProps {
  videoClips: TimelineClip[];
  audioClips: TimelineClip[];
  bgmClips: TimelineClip[];
  subtitleClips: TimelineClip[];
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  totalDuration: number;
  onDeleteClip?: (id: string) => void;
  onCopyClip?: (id: string) => void;
  onSplitClip?: (id: string, splitTime: number) => void;
  onMuteClip?: (id: string) => void;
}

const TRACK_HEIGHTS: Record<TrackType, number> = {
  video: 60,
  audio: 40,
  bgm: 40,
  subtitle: 36,
};

interface TrackState {
  visible: boolean;
  locked: boolean;
  muted: boolean;
}

export default function MultiTrackTimeline({
  videoClips,
  audioClips,
  bgmClips,
  subtitleClips,
  selectedClipId,
  onSelectClip,
  currentTime,
  onSeek,
  totalDuration,
  onDeleteClip,
  onCopyClip,
  onSplitClip,
  onMuteClip,
}: MultiTrackTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(30); // px per second
  const [trackStates, setTrackStates] = useState<Record<TrackType, TrackState>>({
    video: { visible: true, locked: false, muted: false },
    audio: { visible: true, locked: false, muted: false },
    bgm: { visible: true, locked: false, muted: false },
    subtitle: { visible: true, locked: false, muted: false },
  });
  const [isPlayheadDragging, setIsPlayheadDragging] = useState(false);

  const toggleTrack = (type: TrackType, key: 'visible' | 'locked' | 'muted') => {
    setTrackStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], [key]: !prev[type][key] },
    }));
  };

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, trackType: TrackType) => {
      if (trackStates[trackType].locked) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / zoom;
      if (time >= 0 && time <= totalDuration) {
        onSeek(time);
      }
    },
    [zoom, onSeek, totalDuration, trackStates]
  );

  // Playhead drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPlayheadDragging || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(totalDuration, x / zoom));
      onSeek(time);
    };

    const handleMouseUp = () => {
      setIsPlayheadDragging(false);
    };

    if (isPlayheadDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPlayheadDragging, zoom, totalDuration, onSeek]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' && selectedClipId) {
        onDeleteClip?.(selectedClipId);
        toastSuccess('片段已删除');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onDeleteClip]);

  const playheadLeft = Math.min(currentTime * zoom, totalDuration * zoom);

  const renderTrackRow = (type: TrackType, clips: TimelineClip[]) => {
    const state = trackStates[type];
    const height = TRACK_HEIGHTS[type];

    return (
      <div
        key={type}
        className="flex border-b border-[#EFEDEB]"
        style={{ height: `${height + 8}px` }}
      >
        {/* Track header */}
        <div
          className="w-40 shrink-0 border-r border-[#DEDBD8] bg-[#FAFAFA] flex flex-col justify-center px-3 gap-1"
          style={{ height: `${height + 8}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-[#524D48]">{TRACK_LABELS[type]}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => toggleTrack(type, 'visible')}
                className={cn(
                  'w-5 h-5 rounded flex items-center justify-center transition-colors',
                  state.visible ? 'text-[#5B8C5A]' : 'text-[#C5C1BC]'
                )}
                title={state.visible ? '隐藏轨道' : '显示轨道'}
              >
                {state.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                onClick={() => toggleTrack(type, 'muted')}
                className={cn(
                  'w-5 h-5 rounded flex items-center justify-center transition-colors',
                  state.muted ? 'text-[#B85C50]' : 'text-[#C5C1BC]'
                )}
                title={state.muted ? '取消静音' : '静音'}
              >
                {state.muted ? <VolumeX size={12} /> : (type === 'audio' || type === 'bgm') ? <Volume2 size={12} /> : <Lock size={12} />}
              </button>
              <button
                onClick={() => toggleTrack(type, 'locked')}
                className={cn(
                  'w-5 h-5 rounded flex items-center justify-center transition-colors',
                  state.locked ? 'text-[#C49A3C]' : 'text-[#C5C1BC]'
                )}
                title={state.locked ? '解锁轨道' : '锁定轨道'}
              >
                {state.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
          </div>
          {/* Volume indicator for audio tracks */}
          {(type === 'audio' || type === 'bgm') && state.visible && (
            <div className="flex items-center gap-1">
              <Volume2 size={10} className="text-[#A8A39E]" />
              <div className="flex-1 h-1 bg-[#EFEDEB] rounded-full overflow-hidden">
                <div className="h-full bg-[#A8835F] rounded-full" style={{ width: state.muted ? '0%' : '70%' }} />
              </div>
            </div>
          )}
        </div>

        {/* Track content area */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent ' + (zoom - 1) + 'px, #F4F4F4 ' + (zoom - 1) + 'px, #F4F4F4 ' + zoom + 'px)',
          }}
          onClick={(e) => handleTrackClick(e, type)}
        >
          {state.visible && (
            <div className="relative w-full h-full">
              {clips.map((clip) => (
                <Clip
                  key={clip.id}
                  clip={clip}
                  isSelected={clip.id === selectedClipId}
                  zoom={zoom}
                  onSelect={() => !state.locked && onSelectClip(clip.id)}
                  onDelete={onDeleteClip}
                  onCopy={onCopyClip}
                  onSplit={onSplitClip}
                  onMute={onMuteClip}
                />
              ))}
            </div>
          )}
          {!state.visible && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[11px] text-[#C5C1BC]">轨道已隐藏</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const timelineWidth = Math.max(totalDuration * zoom, 800);

  // Handle time ruler click
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(totalDuration, x / zoom));
    onSeek(time);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Zoom + time ruler row */}
      <div className="flex border-b border-[#DEDBD8]">
        {/* Corner cell */}
        <div className="w-40 shrink-0 border-r border-[#DEDBD8] bg-[#FAFAFA] flex items-center justify-between px-3">
          <span className="text-[11px] text-[#A8A39E]">轨道</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(10, z - 5))}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#8B847E] text-[11px] transition-colors"
              title="缩小"
            >
              −
            </button>
            <span className="text-[10px] text-[#A8A39E] w-8 text-center">{zoom}px</span>
            <button
              onClick={() => setZoom((z) => Math.min(100, z + 5))}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#8B847E] text-[11px] transition-colors"
              title="放大"
            >
              +
            </button>
          </div>
        </div>

        {/* Time ruler */}
        <div
          ref={rulerRef}
          className="flex-1 relative overflow-hidden cursor-pointer"
          style={{ minWidth: `${timelineWidth}px` }}
          onClick={handleRulerClick}
        >
          <div className="h-6 flex items-end relative">
            {Array.from({ length: Math.floor(totalDuration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                style={{ left: `${i * zoom}px`, transform: 'translateX(-50%)' }}
              >
                <span className="text-[9px] font-mono text-[#A8A39E] leading-3 mb-px">
                  {i}s
                </span>
                <div className={cn('bg-[#DEDBD8]', i % 5 === 0 ? 'w-px h-2' : 'w-px h-1')} />
              </div>
            ))}
          </div>

          {/* Playhead line (full height overlay) */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[#B85C50] z-30"
            style={{ left: `${playheadLeft}px`, cursor: 'ew-resize' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsPlayheadDragging(true);
            }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#B85C50]" />
          </div>
        </div>
      </div>

      {/* Track rows */}
      <div ref={trackRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: `${timelineWidth + 160}px` }}>
          {renderTrackRow('video', videoClips)}
          {renderTrackRow('audio', audioClips)}
          {renderTrackRow('bgm', bgmClips)}
          {renderTrackRow('subtitle', subtitleClips)}
        </div>
      </div>
    </div>
  );
}
