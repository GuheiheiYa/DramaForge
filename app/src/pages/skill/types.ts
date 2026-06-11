export type SkillCategory = '漫剧' | '短剧';
export type SkillStyle = '日系' | '古风' | '现代' | '悬疑' | '甜宠' | '科幻' | '喜剧';
export type InstallStatus = 'installed' | 'not_installed' | 'installing';

export interface SkillParameter {
  id: string;
  name: string;
  type: 'slider' | 'select' | 'toggle';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue: number | string | boolean;
}

export interface SkillReview {
  id: string;
  userName: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  category: SkillCategory;
  style: SkillStyle;
  tags: string[];
  coverImage: string;
  version: string;
  authorName: string;
  authorAvatar: string;
  downloadCount: number;
  rating: number;
  reviewCount: number;
  isOfficial: boolean;
  installStatus: InstallStatus;
  parameters: SkillParameter[];
  reviews: SkillReview[];
  usageInstructions: string;
}
