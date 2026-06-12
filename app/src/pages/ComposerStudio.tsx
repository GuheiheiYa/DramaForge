import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Download, Monitor, Clock, Type, Music, Wand2 } from 'lucide-react';
import { Toaster } from 'sonner';
import MultiTrackTimeline from './composer/MultiTrackTimeline';
import SubtitleEditor from './composer/SubtitleEditor';
import PlaybackControls from './composer/PlaybackControls';
import ExportPanel from './composer/ExportPanel';
import {
  mockVideoClips,
  mockAudioClips,
  mockBgmClips,
  mockSubtitleSegments,
  defaultSubtitleStyle,
  getTotalTimelineDuration,
  formatTime,
} from './composer/mockData';
import type { PanelTab, SubtitleStyle, SubtitleSegment, TimelineClip } from './composer/types';
import { PANEL_TABS } from './composer/types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

export default function ComposerStudio() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>('timeline');
  const [showExport, setShowExport] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(defaultSubtitleStyle);
  const [hoverPreview, setHoverPreview] = useState(false);
  const [previewResolution, setPreviewResolution] = useState('720p');
  const [subtitleSegments, setSubtitleSegments] = useState<SubtitleSegment[]>(mockSubtitleSegments);
  const [videoClips, setVideoClips] = useState<TimelineClip[]>(mockVideoClips);
  const [audioClips] = useState<TimelineClip[]>(mockAudioClips);
  const [bgmClips] = useState<TimelineClip[]>(mockBgmClips);
  const [undoStack] = useState(0);
  const [redoStack] = useState(0);

  const totalDuration = getTotalTimelineDuration();
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Convert subtitle segments to timeline clips for the track
  const subtitleClips = subtitleSegments.map((sub) => ({
    id: sub.id,
    name: sub.text.slice(0, 12) + (sub.text.length > 12 ? '...' : ''),
    trackType: 'subtitle' as const,
    startTime: sub.startTime,
    duration: sub.duration,
    color: '#F0F5F0',
  }));

  // Playback
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalDuration]);

  const handleDeleteClip = useCallback((id: string) => {
    setVideoClips((prev) => prev.filter((c) => c.id !== id));
    setSelectedClipId((prev) => prev === id ? null : prev);
    toastSuccess('片段已删除');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTime((t) => Math.max(0, t - 0.5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentTime((t) => Math.min(totalDuration, t + 0.5));
          break;
        case 'Delete':
          if (selectedClipId) {
            handleDeleteClip(selectedClipId);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, totalDuration, selectedClipId, handleDeleteClip]);

  const handlePlayPause = useCallback(() => setIsPlaying((p) => !p), []);
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)));
  }, [totalDuration]);

  const handlePrevClip = useCallback(() => {
    const allClips = [...videoClips, ...audioClips];
    const sorted = allClips.sort((a, b) => a.startTime - b.startTime);
    const prev = sorted.reverse().find((c) => c.startTime < currentTime);
    if (prev) setCurrentTime(prev.startTime);
  }, [currentTime, videoClips, audioClips]);

  const handleNextClip = useCallback(() => {
    const allClips = [...videoClips, ...audioClips];
    const next = allClips.find((c) => c.startTime > currentTime);
    if (next) setCurrentTime(next.startTime);
  }, [currentTime, videoClips, audioClips]);

  const handleSkipBackward = useCallback(() => setCurrentTime((t) => Math.max(0, t - 5)), []);
  const handleSkipForward = useCallback(() => setCurrentTime((t) => Math.min(totalDuration, t + 5)), [totalDuration]);

  const handleCopyClip = useCallback(() => {
    toastInfo('片段已复制到剪贴板');
  }, []);

  const handleSplitClip = useCallback((id: string, splitTime: number) => {
    setVideoClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (!clip) return prev;
      const idx = prev.findIndex((c) => c.id === id);
      const firstPart = { ...clip, duration: splitTime - clip.startTime };
      const secondPart = { ...clip, id: `${id}_split`, startTime: splitTime, duration: clip.duration - (splitTime - clip.startTime) };
      const newClips = [...prev];
      newClips.splice(idx, 1, firstPart, secondPart);
      return newClips;
    });
    toastSuccess('片段已分割');
  }, []);

  const handleMuteClip = useCallback(() => {
    toastInfo('片段已静音');
  }, []);

  const handleSplitAtPlayhead = useCallback(() => {
    const clipAtPlayhead = videoClips.find(
      (c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration
    );
    if (clipAtPlayhead) {
      handleSplitClip(clipAtPlayhead.id, currentTime);
    } else {
      toastInfo('播放头未处于任何片段上');
    }
  }, [currentTime, videoClips, handleSplitClip]);

  // Find current subtitle for preview
  const currentSubtitle = subtitleSegments.find(
    (s) => currentTime >= s.startTime && currentTime < s.startTime + s.duration
  );

  const getSubtitlePreviewStyle = () => {
    const alignMap = {
      'bottom-center': 'center' as const,
      'bottom-left': 'left' as const,
      'bottom-right': 'right' as const,
    };
    return {
      color: subtitleStyle.textColor,
      fontSize: `${subtitleStyle.fontSize}px`,
      fontFamily: subtitleStyle.fontFamily,
      fontWeight: 500,
      textShadow: `0 1px 4px rgba(0,0,0,0.8), 0 0 2px ${subtitleStyle.strokeColor}`,
      textAlign: alignMap[subtitleStyle.position],
      backgroundColor: subtitleStyle.backgroundType === 'semi-black'
        ? 'rgba(0,0,0,0.5)'
        : subtitleStyle.backgroundType === 'solid'
          ? subtitleStyle.backgroundColor
          : 'transparent',
      padding: subtitleStyle.backgroundType !== 'none' ? '4px 12px' : '0',
      borderRadius: '4px',
    };
  };

  const tabIcons: Record<PanelTab, React.ReactNode> = {
    timeline: <Clock size={14} />,
    subtitle: <Type size={14} />,
    audio: <Music size={14} />,
    effects: <Wand2 size={14} />,
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <motion.div
        className="h-[calc(100dvh-52px)] flex flex-col bg-[#0A0A0A] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      >
        {/* Top info bar */}
        <div className="h-12 bg-white border-b border-[#DEDBD8] flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <nav className="flex items-center text-[13px]">
              <button onClick={() => navigate('/')} className="text-[#A8A39E] hover:text-[#6E6862] transition-colors">首页</button>
              <span className="mx-1.5 text-[#C5C1BC]">/</span>
              <button onClick={() => navigate('/')} className="text-[#6E6862] hover:text-[#524D48] transition-colors">《樱花下的约定》</button>
              <span className="mx-1.5 text-[#C5C1BC]">/</span>
              <span className="text-[#524D48] font-medium">成片合成室</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Monitor size={14} className="text-[#8B847E]" />
              <select
                value={previewResolution}
                onChange={(e) => setPreviewResolution(e.target.value)}
                className="text-[12px] bg-[#F8F7F6] border border-[#DEDBD8] rounded-md px-2 py-1 text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer"
              >
                <option>预览 720p</option>
                <option>预览 1080p</option>
                <option>预览 360p</option>
              </select>
            </div>
            <button
              onClick={() => setShowExport(true)}
              className="h-8 px-3 bg-[#A8835F] hover:bg-[#8E6A48] text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download size={13} />
              导出成片
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div
          className="shrink-0 flex items-center justify-center relative bg-[#0A0A0A] cursor-pointer"
          style={{ height: '240px' }}
          onMouseEnter={() => setHoverPreview(true)}
          onMouseLeave={() => setHoverPreview(false)}
          onClick={handlePlayPause}
        >
          <div
            className="relative rounded overflow-hidden"
            style={{
              maxWidth: '420px',
              width: '100%',
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
          >
            {/* Placeholder scene */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#A8835F]/20 flex items-center justify-center mx-auto mb-3">
                  {isPlaying ? (
                    <Pause size={28} className="text-[#A8835F]" />
                  ) : (
                    <Play size={28} className="text-[#A8835F] ml-1" />
                  )}
                </div>
                <p className="text-[14px] text-white/60 font-medium mb-1">
                  {videoClips.find(c => c.startTime <= currentTime && currentTime < c.startTime + c.duration)?.name ?? '空白'}
                </p>
                <p className="text-[12px] text-white/40 font-mono">{formatTime(currentTime)}</p>
              </div>
            </div>

            {/* Scene gradient overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-t from-pink-900/20 via-transparent to-blue-900/10" />
            </div>

            {/* Subtitle overlay */}
            <AnimatePresence>
              {currentSubtitle && (
                <motion.div
                  key={currentSubtitle.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                  className="absolute bottom-[10%] left-4 right-4 flex justify-center"
                >
                  <p style={getSubtitlePreviewStyle()}>
                    {currentSubtitle.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center play button on hover / when paused */}
            <AnimatePresence>
              {!isPlaying && !hoverPreview && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
                >
                  <Play size={24} className="text-white ml-1" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Hover control overlay */}
            <AnimatePresence>
              {hoverPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col justify-end pointer-events-none"
                >
                  {/* Bottom progress */}
                  <div
                    className="h-1 bg-white/20 mx-4 mb-2 rounded-full overflow-hidden pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      handleSeek(pct * totalDuration);
                    }}
                  >
                    <div
                      className="h-full bg-[#A8835F] rounded-full"
                      style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Timeline / Editor area */}
        <div className="flex-1 min-h-0 bg-white border-t border-[#DEDBD8]">
          {activeTab === 'timeline' && (
            <MultiTrackTimeline
              videoClips={videoClips}
              audioClips={audioClips}
              bgmClips={bgmClips}
              subtitleClips={subtitleClips}
              selectedClipId={selectedClipId}
              onSelectClip={setSelectedClipId}
              currentTime={currentTime}
              onSeek={handleSeek}
              totalDuration={totalDuration}
              onDeleteClip={handleDeleteClip}
              onCopyClip={handleCopyClip}
              onSplitClip={handleSplitClip}
              onMuteClip={handleMuteClip}
            />
          )}
          {activeTab === 'subtitle' && (
            <SubtitleEditor
              style={subtitleStyle}
              onStyleChange={setSubtitleStyle}
              segments={subtitleSegments}
              onSegmentsChange={setSubtitleSegments}
              currentTime={currentTime}
            />
          )}
          {activeTab === 'audio' && (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center">
                <Music size={48} className="text-[#C5C1BC] mx-auto mb-4" />
                <h3 className="text-[15px] font-medium text-[#524D48] mb-2">音频调整</h3>
                <p className="text-[13px] text-[#A8A39E]">音频编辑功能即将上线</p>
              </div>
            </div>
          )}
          {activeTab === 'effects' && (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center">
                <Wand2 size={48} className="text-[#C5C1BC] mx-auto mb-4" />
                <h3 className="text-[15px] font-medium text-[#524D48] mb-2">特效</h3>
                <p className="text-[13px] text-[#A8A39E]">特效功能即将上线</p>
              </div>
            </div>
          )}
        </div>

        {/* Playback controls */}
        <PlaybackControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          currentTime={currentTime}
          totalDuration={totalDuration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={setVolume}
          onPrevClip={handlePrevClip}
          onNextClip={handleNextClip}
          onSkipBackward={handleSkipBackward}
          onSkipForward={handleSkipForward}
          onSplit={handleSplitAtPlayhead}
          undoStack={undoStack}
          redoStack={redoStack}
        />

        {/* Tab switcher at bottom */}
        <div className="h-10 bg-white border-t border-[#DEDBD8] flex items-center px-4 gap-1 shrink-0">
          {PANEL_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'h-8 px-3 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors',
                activeTab === tab.key
                  ? 'bg-[#FBF7F4] text-[#755235]'
                  : 'text-[#8B847E] hover:bg-[#F8F7F6] hover:text-[#524D48]'
              )}
            >
              {tabIcons[tab.key]}
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#A8A39E]">{formatTime(currentTime)}</span>
            <span className="text-[11px] text-[#C5C1BC]">/</span>
            <span className="text-[11px] font-mono text-[#A8A39E]">{formatTime(totalDuration)}</span>
          </div>
        </div>
      </motion.div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <ExportPanel
            onClose={() => setShowExport(false)}
            totalDuration={totalDuration}
            shotCount={videoClips.length}
          />
        )}
      </AnimatePresence>
    </>
  );
}
