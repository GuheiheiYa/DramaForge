export type ShotType = '远景' | '全景' | '中景' | '近景' | '特写';

export type ShotStatus = '等待中' | '生成中' | '已完成' | '失败' | '草稿';

export interface Shot {
  id: string;
  shotNumber: number;
  shotType: ShotType;
  duration: number; // in seconds
  status: ShotStatus;
  description: string;
  cameraMovement: string;
  composition: string;
  lighting: string;
  characterAction: string;
  dialogue: string;
  sceneRef: string;
  characters: string[];
}

export type ShotFilter = '全部' | '已完成' | '待生成' | '失败';

export type ViewMode = '列表视图' | '故事板视图';

export interface ShotTypeStyle {
  bg: string;
  text: string;
}

export const SHOT_TYPE_STYLES: Record<ShotType, ShotTypeStyle> = {
  '远景': { bg: '#E8F0E8', text: '#5B8C5A' },
  '全景': { bg: '#E8EFF6', text: '#5A7FA8' },
  '中景': { bg: '#F5EDE6', text: '#8E6A48' },
  '近景': { bg: '#F0E8F0', text: '#8A5A8A' },
  '特写': { bg: '#FDF2F0', text: '#B85C50' },
};

export const SHOT_TYPE_OPTIONS: ShotType[] = ['远景', '全景', '中景', '近景', '特写'];

const SHOT_TYPE_ALIASES: Record<string, ShotType> = {
  'wide shot': '远景',
  'long shot': '远景',
  'full shot': '全景',
  'medium shot': '中景',
  'medium close-up': '近景',
  'close-up': '特写',
  'close up': '特写',
  'extreme close-up': '特写',
};

/** 将后端/LLM 返回的景别规范为前端枚举，避免 SHOT_TYPE_STYLES 取不到导致 .bg 报错 */
export function normalizeShotType(value: string | null | undefined): ShotType {
  const raw = (value || '').trim();
  if (!raw) return '中景';
  if (raw in SHOT_TYPE_STYLES) return raw as ShotType;
  const lower = raw.toLowerCase();
  if (lower in SHOT_TYPE_ALIASES) return SHOT_TYPE_ALIASES[lower];
  for (const [key, mapped] of Object.entries(SHOT_TYPE_ALIASES)) {
    if (lower.includes(key)) return mapped;
  }
  if (raw.includes('远')) return '远景';
  if (raw.includes('全')) return '全景';
  if (raw.includes('特')) return '特写';
  if (raw.includes('近')) return '近景';
  return '中景';
}

export function getShotTypeStyle(shotType: string | null | undefined): ShotTypeStyle {
  return SHOT_TYPE_STYLES[normalizeShotType(shotType)];
}

const STATUS_ALIASES: Record<string, ShotStatus> = {
  done: '已完成',
  ready: '已完成',
  completed: '已完成',
  failed: '失败',
  error: '失败',
  generating: '生成中',
  running: '生成中',
  waiting: '等待中',
  draft: '草稿',
};

export function normalizeShotStatus(value: string | null | undefined): ShotStatus {
  const raw = (value || '').trim();
  if (!raw) return '等待中';
  if (raw in STATUS_COLORS) return raw as ShotStatus;
  const mapped = STATUS_ALIASES[raw.toLowerCase()];
  return mapped || '等待中';
}

export const CAMERA_MOVEMENT_OPTIONS = ['固定', '推', '拉', '摇', '移', '跟', '升', '降', '甩', '晃'];
export const COMPOSITION_OPTIONS = ['中心构图', '三分法', '对称', '对角线', '框架', '引导线', '留白'];
export const LIGHTING_OPTIONS = ['自然光', '侧光', '逆光', '柔光', '硬光', '伦勃朗光', '顶光'];

export const STATUS_COLORS: Record<ShotStatus, { bg: string; text: string; border: string }> = {
  '等待中': { bg: '#F8F7F6', text: '#A8A39E', border: '#DEDBD8' },
  '生成中': { bg: '#F0F3F7', text: '#5A7FA8', border: '#5A7FA8' },
  '已完成': { bg: '#F0F5F0', text: '#5B8C5A', border: '#5B8C5A' },
  '失败': { bg: '#FDF2F0', text: '#B85C50', border: '#B85C50' },
  '草稿': { bg: '#FEFBF5', text: '#C49A3C', border: '#C49A3C' },
};
