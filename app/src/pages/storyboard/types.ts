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
