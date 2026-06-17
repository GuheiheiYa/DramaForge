import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Download, Monitor, Clock, Type, Music, Wand2 } from 'lucide-react';
import MultiTrackTimeline from './composer/MultiTrackTimeline';
import SubtitleEditor from './composer/SubtitleEditor';
import PlaybackControls from './composer/PlaybackControls';
import ExportPanel from './composer/ExportPanel';
import ProjectSelector from '@/components/ProjectSelector';
import {
  mockVideoClips,
  mockAudioClips,
  mockBgmClips,
  mockSubtitleSegments,
  defaultSubtitleStyle,
  formatTime,
} from './composer/mockData';
import type { PanelTab, SubtitleStyle, SubtitleSegment, TimelineClip } from './composer/types';
import { PANEL_TABS } from './composer/types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';
import { usePipelineStore } from '@/store/usePipelineStore';
import { useAppStore } from '@/store/useAppStore';
import { getTimelineClips, createTimelineClip } from '@/lib/api';
import type { VideoData, AudioData, ComposeData } from '@/store/usePipelineStore';

export default function ComposerStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const projectId = searchParams.get('projectId') || selectedProjectId || '';
  const pipelineSteps = usePipelineStore((s) => s.steps);
  const pipelineProjectTitle = usePipelineStore((s) => s.projectTitle);

  // Extract pipeline data
  const videoData = pipelineSteps.find((s) => s.id === 'video')?.data as VideoData | null;
  const audioData = pipelineSteps.find((s) => s.id === 'audio')?.data as AudioData | null;
  const composeData = pipelineSteps.find((s) => s.id === 'compose')?.data as ComposeData | null;

  // Convert pipeline video clips to TimelineClip[], fallback to mock
  const pipelineVideoClips: TimelineClip[] = useMemo(() => {
    if (!videoData?.clips?.length) return [];
    let offset = 0;
    return videoData.clips.map((vc) => {
      const clip: TimelineClip = {
        id: vc.id,
        name: vc.name,
        trackType: 'video',
        startTime: offset,
        duration: vc.duration,
        status: vc.status === 'done' ? 'ready' : vc.status === 'failed' ? 'error' : 'generating',
        shotRef: vc.name,
        color: '#E8F0E8',
        volume: 100,
        videoUrl: (vc as { videoUrl?: string }).videoUrl,
      };
      offset += vc.duration;
      return clip;
    });
  }, [videoData]);

  // Convert pipeline audio data to TimelineClip[], fallback to mock
  const pipelineAudioClips: TimelineClip[] = useMemo(() => {
    if (!audioData?.voices?.length) return [];
    let offset = 0;
    return audioData.voices.map((v, i) => {
      const clip: TimelineClip = {
        id: `pipe_audio_${i}`,
        name: v.characterName,
        trackType: 'audio',
        startTime: offset,
        duration: 5,
        color: '#E8EFF6',
        volume: 100,
      };
      offset += 5;
      return clip;
    });
  }, [audioData]);

  // Convert pipeline BGM data to TimelineClip[], fallback to mock
  const pipelineBgmClips: TimelineClip[] = useMemo(() => {
    if (!audioData?.bgm) return [];
    return [{
      id: 'pipe_bgm_1',
      name: `BGM - ${audioData.bgm.style}`,
      trackType: 'bgm',
      startTime: 0,
      duration: audioData.bgm.duration,
      color: '#F5EDE6',
      volume: 100,
    }];
  }, [audioData]);

  // Use pipeline/API data when available; mock only for demo without project
  const useDemoMock = !projectId;
  const initialVideoClips = pipelineVideoClips.length > 0 ? pipelineVideoClips : (useDemoMock ? mockVideoClips : []);
  const initialAudioClips = pipelineAudioClips.length > 0 ? pipelineAudioClips : (useDemoMock ? mockAudioClips : []);
  const initialBgmClips = pipelineBgmClips.length > 0 ? pipelineBgmClips : (useDemoMock ? mockBgmClips : []);

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
  const [videoClips, setVideoClips] = useState<TimelineClip[]>(initialVideoClips);
  const [audioClips, setAudioClips] = useState<TimelineClip[]>(initialAudioClips);
  const [bgmClips, setBgmClips] = useState<TimelineClip[]>(initialBgmClips);

  useEffect(() => {
    if (!projectId) return;
    getTimelineClips(projectId)
      .then((clips) => {
        if (clips.length === 0) return;
        const videos: TimelineClip[] = [];
        const audios: TimelineClip[] = [];
        const bgms: TimelineClip[] = [];
        for (const c of clips) {
          const item: TimelineClip = {
            id: c.id,
            name: c.name,
            trackType: c.track_type as TimelineClip['trackType'],
            startTime: c.start_time,
            duration: c.duration,
            status: c.status === 'ready' ? 'ready' : c.status === 'error' ? 'error' : 'generating',
            shotRef: c.shot_ref,
            color: c.color || '#E8F0E8',
            volume: 100,
            videoUrl: c.media_url || undefined,
          };
          if (c.track_type === 'video') videos.push(item);
          else if (c.track_type === 'audio') audios.push(item);
          else if (c.track_type === 'bgm') bgms.push(item);
        }
        if (videos.length) setVideoClips(videos);
        if (audios.length) setAudioClips(audios);
        if (bgms.length) setBgmClips(bgms);
      })
      .catch((err) => console.warn('[Composer] 加载时间轴失败:', err));
  }, [projectId]);

  const handleImportMedia = useCallback(async () => {
    if (!projectId) {
      toastInfo('请先选择项目');
      return;
    }
    const url = window.prompt('请输入视频或音频 URL（支持 http/https）');
    if (!url?.trim()) return;
    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('video');
    const trackType = isVideo ? 'video' : 'audio';
    const lastEnd = videoClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    try {
      const created = await createTimelineClip({
        project_id: projectId,
        name: trackType === 'video' ? `导入视频 ${videoClips.length + 1}` : `导入音频 ${audioClips.length + 1}`,
        track_type: trackType,
        start_time: lastEnd,
        duration: 5,
        media_url: url.trim(),
      });
      const clip: TimelineClip = {
        id: created.id,
        name: created.name,
        trackType: created.track_type as TimelineClip['trackType'],
        startTime: created.start_time,
        duration: created.duration,
        status: 'ready',
        color: trackType === 'video' ? '#E8F0E8' : '#E8EFF6',
        volume: 100,
        videoUrl: created.media_url || url.trim(),
      };
      if (trackType === 'video') setVideoClips((prev) => [...prev, clip]);
      else setAudioClips((prev) => [...prev, clip]);
      toastSuccess('素材已导入时间线');
    } catch (err) {
      console.error(err);
      toastInfo('导入失败');
    }
  }, [projectId, videoClips, audioClips.length]);

  // Undo/redo stacks: store snapshots of videoClips
  const [undoStack, setUndoStack] = useState<TimelineClip[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineClip[][]>([]);

  // Push current state to undo stack before a change
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), videoClips]);
    setRedoStack([]); // clear redo on new action
  }, [videoClips]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, videoClips]);
      setVideoClips(last);
      return prev.slice(0, -1);
    });
  }, [videoClips]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, videoClips]);
      setVideoClips(last);
      return prev.slice(0, -1);
    });
  }, [videoClips]);

  // Compute total duration from all clips
  const totalDuration = useMemo(() => {
    const allClips = [...videoClips, ...audioClips, ...bgmClips];
    if (allClips.length === 0) return 36;
    return Math.max(...allClips.map((c) => c.startTime + c.duration), 1);
  }, [videoClips, audioClips, bgmClips]);

  // Compose video URL from pipeline
  const composeVideoUrl = composeData?.videoUrl ?? null;

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    pushUndo();
    setVideoClips((prev) => prev.filter((c) => c.id !== id));
    setSelectedClipId((prev) => prev === id ? null : prev);
    toastSuccess('片段已删除');
  }, [pushUndo]);

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

  const handleCopyClip = useCallback((id: string) => {
    pushUndo();
    setVideoClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (!clip) return prev;
      const newId = `${id}_copy_${Date.now()}`;
      const newClip: TimelineClip = {
        ...clip,
        id: newId,
        name: `${clip.name} 副本`,
        startTime: clip.startTime + clip.duration,
      };
      return [...prev, newClip];
    });
    toastSuccess('片段已复制');
  }, [pushUndo]);

  const handleSplitClip = useCallback((id: string, splitTime: number) => {
    pushUndo();
    setVideoClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (!clip) return prev;
      const idx = prev.findIndex((c) => c.id === id);
      const firstPart = { ...clip, duration: splitTime - clip.startTime };
      const secondPart = { ...clip, id: `${id}_split_${Date.now()}`, startTime: splitTime, duration: clip.duration - (splitTime - clip.startTime) };
      const newClips = [...prev];
      newClips.splice(idx, 1, firstPart, secondPart);
      return newClips;
    });
    toastSuccess('片段已分割');
  }, [pushUndo]);

  const handleMuteClip = useCallback((id: string) => {
    pushUndo();
    setVideoClips((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const currentVol = c.volume ?? 100;
        return { ...c, volume: currentVol === 0 ? 100 : 0 };
      })
    );
    const clip = videoClips.find((c) => c.id === id);
    const isMuted = (clip?.volume ?? 100) === 0;
    toastInfo(isMuted ? '片段已取消静音' : '片段已静音');
  }, [pushUndo, videoClips]);

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
              <ProjectSelector />
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
              onClick={handleImportMedia}
              className="h-8 px-3 border border-[#DEDBD8] text-[#524D48] text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors hover:bg-[#F8F7F6]"
            >
              <Wand2 size={13} />
              导入素材
            </button>
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
          onClick={!composeVideoUrl ? handlePlayPause : undefined}
        >
          <div
            className="relative rounded overflow-hidden"
            style={{
              maxWidth: '420px',
              width: '100%',
              aspectRatio: '16/9',
              background: composeVideoUrl ? '#000' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
          >
            {/* Real video player when compose video URL is available */}
            {composeVideoUrl && (
              <video
                ref={videoRef}
                src={composeVideoUrl}
                className="absolute inset-0 w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    if (videoRef.current.paused) {
                      videoRef.current.play();
                    } else {
                      videoRef.current.pause();
                    }
                  }
                }}
              />
            )}

            {/* Placeholder scene when no video URL */}
            {!composeVideoUrl && (
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
            )}

            {/* Scene gradient overlay (only for placeholder) */}
            {!composeVideoUrl && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full bg-gradient-to-t from-pink-900/20 via-transparent to-blue-900/10" />
              </div>
            )}

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
          undoStack={undoStack.length}
          redoStack={redoStack.length}
          onUndo={handleUndo}
          onRedo={handleRedo}
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
            projectName={pipelineProjectTitle || undefined}
            totalDuration={totalDuration}
            shotCount={videoClips.length}
            videoUrl={composeVideoUrl}
          />
        )}
      </AnimatePresence>
    </>
  );
}
