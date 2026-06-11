import type { TimelineClip, SubtitleSegment, SubtitleStyle } from './types';

export const mockVideoClips: TimelineClip[] = [
  { id: 'vc01', name: '镜01',   trackType: 'video', startTime: 0,   duration: 5,  status: 'ready', shotRef: '镜01', color: '#E8F0E8' },
  { id: 'vc02', name: '镜02',   trackType: 'video', startTime: 5,   duration: 4,  status: 'ready', shotRef: '镜02', color: '#E8EFF6' },
  { id: 'vc03', name: '镜03',   trackType: 'video', startTime: 9,   duration: 6,  status: 'ready', shotRef: '镜03', color: '#F5EDE6' },
  { id: 'vc04', name: '镜04',   trackType: 'video', startTime: 15,  duration: 3,  status: 'ready', shotRef: '镜04', color: '#FDF2F0' },
  { id: 'vc05', name: '镜05',   trackType: 'video', startTime: 18,  duration: 5,  status: 'ready', shotRef: '镜05', color: '#F0E8F0' },
  { id: 'vc06', name: '镜06',   trackType: 'video', startTime: 23,  duration: 4,  status: 'ready', shotRef: '镜06', color: '#E8F0E8' },
  { id: 'vc07', name: '镜07',   trackType: 'video', startTime: 27,  duration: 5,  status: 'generating', shotRef: '镜07', color: '#F0F3F7' },
  { id: 'vc08', name: '镜08',   trackType: 'video', startTime: 32,  duration: 4,  status: 'ready', shotRef: '镜08', color: '#F5EDE6' },
];

export const mockAudioClips: TimelineClip[] = [
  { id: 'ac01', name: '旁白-开场', trackType: 'audio', startTime: 0,   duration: 5,  color: '#E8EFF6' },
  { id: 'ac02', name: '林晓台词',  trackType: 'audio', startTime: 5,   duration: 4,  color: '#E8EFF6' },
  { id: 'ac03', name: '旁白-回忆', trackType: 'audio', startTime: 9,   duration: 6,  color: '#E8EFF6' },
  { id: 'ac04', name: '林晓台词2', trackType: 'audio', startTime: 15,  duration: 3,  color: '#E8EFF6' },
  { id: 'ac05', name: '陈默台词',  trackType: 'audio', startTime: 23,  duration: 4,  color: '#E8EFF6' },
  { id: 'ac06', name: '旁白-结尾', trackType: 'audio', startTime: 32,  duration: 4,  color: '#E8EFF6' },
];

export const mockBgmClips: TimelineClip[] = [
  { id: 'bgm01', name: '樱花BGM - 温暖钢琴', trackType: 'bgm', startTime: 0, duration: 36, color: '#F5EDE6' },
];

export const mockSubtitleSegments: SubtitleSegment[] = [
  { id: 'sub01', text: '春风拂过，樱花如雪般飘落。', startTime: 0,  duration: 5 },
  { id: 'sub02', text: '林晓：一年后的今天，我会在樱花树下等你。', startTime: 5,  duration: 4 },
  { id: 'sub03', text: '回忆如潮水般涌来...', startTime: 9,  duration: 6 },
  { id: 'sub04', text: '泪水滴落信笺。', startTime: 15, duration: 3 },
  { id: 'sub05', text: '林晓：我...我一定会去的。', startTime: 18, duration: 5 },
  { id: 'sub06', text: '陈默：林晓——！', startTime: 23, duration: 4 },
  { id: 'sub07', text: '陈默：笨蛋，我等了你整整一年...', startTime: 27, duration: 5 },
  { id: 'sub08', text: '以后的每一年，我们都一起来看樱花吧。', startTime: 32, duration: 4 },
];

export const defaultSubtitleStyle: SubtitleStyle = {
  fontFamily: '思源黑体',
  fontSize: 18,
  textColor: '#FFFFFF',
  strokeColor: '#000000',
  backgroundType: 'semi-black',
  backgroundColor: 'rgba(0,0,0,0.5)',
  position: 'bottom-center',
  animation: 'fade',
};

export const getTotalTimelineDuration = (): number => {
  const allClips = [...mockVideoClips, ...mockAudioClips, ...mockBgmClips];
  return Math.max(...allClips.map((c) => c.startTime + c.duration), 36);
};

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

export const formatTimeSimple = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
