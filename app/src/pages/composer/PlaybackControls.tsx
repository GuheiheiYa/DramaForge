import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Scissors,
  Undo2,
  Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastInfo } from '@/hooks/useToast';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  onPrevClip: () => void;
  onNextClip: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onSplit: () => void;
  undoStack?: number;
  redoStack?: number;
}

export default function PlaybackControls({
  isPlaying,
  onPlayPause,
  currentTime,
  totalDuration,
  onSeek,
  volume,
  onVolumeChange,
  onPrevClip,
  onNextClip,
  onSkipBackward,
  onSkipForward,
  onSplit,
  undoStack = 0,
  redoStack = 0,
}: PlaybackControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekHover, setSeekHover] = useState(false);
  const [_volumeHover, setVolumeHover] = useState(false);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const isMuted = volume === 0;

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(pct * totalDuration);
  }, [onSeek, totalDuration]);

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onVolumeChange(Math.max(0, Math.min(100, Math.round(pct * 100))));
  }, [onVolumeChange]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        toastInfo('全屏模式');
      }
      return next;
    });
  };

  const canUndo = undoStack > 0;
  const canRedo = redoStack > 0;

  return (
    <div className="h-10 bg-white border-t border-[#DEDBD8] flex items-center px-4 gap-3">
      {/* Left: edit actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => canUndo ? toastInfo('撤销') : null}
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center transition-colors',
            canUndo ? 'hover:bg-[#F8F7F6] text-[#524D48]' : 'text-[#C5C1BC] cursor-not-allowed'
          )}
          title="撤销"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => canRedo ? toastInfo('重做') : null}
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center transition-colors',
            canRedo ? 'hover:bg-[#F8F7F6] text-[#524D48]' : 'text-[#C5C1BC] cursor-not-allowed'
          )}
          title="重做"
        >
          <Redo2 size={14} />
        </button>
        <button
          onClick={onSplit}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#524D48] transition-colors"
          title="在播放头处分割"
        >
          <Scissors size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#DEDBD8]" />

      {/* Center: playback controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevClip}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#524D48] transition-colors"
          title="上一个片段"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={onSkipBackward}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#524D48] transition-colors"
          title="后退5秒"
        >
          <Rewind size={14} />
        </button>
        <motion.button
          onClick={onPlayPause}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-full bg-[#A8835F] hover:bg-[#8E6A48] text-white flex items-center justify-center transition-all shadow-sm hover:scale-105"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </motion.button>
        <button
          onClick={onSkipForward}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#524D48] transition-colors"
          title="前进5秒"
        >
          <FastForward size={14} />
        </button>
        <button
          onClick={onNextClip}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#524D48] transition-colors"
          title="下一个片段"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#DEDBD8]" />

      {/* Time display */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-mono text-[#524D48] w-14 text-right">
          {formatTime(currentTime)}
        </span>
        {/* Progress bar */}
        <div
          className="w-32 h-1.5 bg-[#EFEDEB] rounded-full overflow-hidden relative group cursor-pointer"
          onClick={handleSeek}
          onMouseEnter={() => setSeekHover(true)}
          onMouseLeave={() => setSeekHover(false)}
        >
          <motion.div
            className="h-full bg-[#A8835F] rounded-full"
            style={{ width: `${progress}%` }}
            layout
          />
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#A8835F] shadow-sm transition-opacity',
              seekHover || isPlaying ? 'opacity-100' : 'opacity-0'
            )}
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        </div>
        <span className="text-[12px] font-mono text-[#A8A39E] w-14">
          {formatTime(totalDuration)}
        </span>
      </div>

      {/* Right: volume + fullscreen */}
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onVolumeChange(isMuted ? 70 : 0)}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <div
          className="w-14 h-1 bg-[#EFEDEB] rounded-full overflow-hidden cursor-pointer"
          onClick={handleVolumeChange}
          onMouseEnter={() => setVolumeHover(true)}
          onMouseLeave={() => setVolumeHover(false)}
        >
          <motion.div
            className="h-full bg-[#A8835F] rounded-full"
            style={{ width: `${volume}%` }}
            layout
          />
        </div>
        <button
          onClick={toggleFullscreen}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#524D48] transition-colors ml-1"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </div>
  );
}
