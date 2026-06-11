export type TrackType = 'video' | 'audio' | 'bgm' | 'subtitle';

export type ClipStatus = 'ready' | 'generating' | 'error';

export interface TimelineClip {
  id: string;
  name: string;
  trackType: TrackType;
  startTime: number; // in seconds
  duration: number; // in seconds
  status?: ClipStatus;
  shotRef?: string; // e.g. "镜05"
  color?: string;
}

export interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number;
  duration: number;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  strokeColor: string;
  backgroundType: 'none' | 'semi-black' | 'solid';
  backgroundColor: string;
  position: 'bottom-center' | 'bottom-left' | 'bottom-right';
  animation: 'none' | 'fade' | 'slide-up';
}

export type PanelTab = 'timeline' | 'subtitle' | 'audio' | 'effects';

export type ExportResolution = '720p' | '1080p' | '4K';
export type ExportFormat = 'MP4' | 'GIF' | '连帧图';

export const TRACK_COLORS: Record<TrackType, { bg: string; border: string; text: string; wave: string }> = {
  video:   { bg: '#F0F5F0', border: '#D4E0D4', text: '#5B8C5A', wave: '#B8D4B8' },
  audio:   { bg: '#F0F3F7', border: '#D4DCE8', text: '#5A7FA8', wave: '#B8C8D8' },
  bgm:     { bg: '#F5EDE6', border: '#E8D8C8', text: '#8E6A48', wave: '#D8C4A8' },
  subtitle: { bg: '#F0F5F0', border: '#D4E0D4', text: '#5B8C5A', wave: '#B8D4B8' },
};

export const TRACK_LABELS: Record<TrackType, string> = {
  video: '视频',
  audio: '音频',
  bgm: '背景音乐',
  subtitle: '字幕',
};

export const FONT_OPTIONS = ['思源黑体', '微软雅黑', '方正楷体', '宋体', '仿宋', '站酷快乐体', '优设标题黑'];

export const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: 'timeline', label: '时间轴' },
  { key: 'subtitle', label: '字幕' },
  { key: 'audio', label: '音频' },
  { key: 'effects', label: '特效' },
];
