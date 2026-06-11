import { create } from 'zustand';

export type ProjectStatus = '草稿' | '进行中' | '生成中' | '待审核' | '已完成' | '失败';
export type ProjectType = '漫剧' | '短剧';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  currentEpisode: number;
  totalEpisodes: number;
  lastEdited: string;
  thumbnail: string;
  skillName?: string;
}

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  progressPanelOpen: boolean;
  toggleProgressPanel: () => void;

  aiPanelOpen: boolean;
  toggleAIPanel: () => void;

  selectedProjectId: string | null;
  setSelectedProject: (id: string | null) => void;

  projects: Project[];
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: '《樱花下的约定》第1季',
    type: '漫剧',
    status: '进行中',
    progress: 65,
    currentEpisode: 3,
    totalEpisodes: 8,
    lastEdited: '2小时前',
    thumbnail: '/project-placeholder-1.jpg',
    skillName: '日式校园漫剧SKILL',
  },
  {
    id: '2',
    name: '《都市神医》短剧系列',
    type: '短剧',
    status: '生成中',
    progress: 42,
    currentEpisode: 2,
    totalEpisodes: 12,
    lastEdited: '15分钟前',
    thumbnail: '/project-placeholder-2.jpg',
    skillName: '都市逆袭短剧SKILL',
  },
  {
    id: '3',
    name: '《九霄仙途》古风仙侠',
    type: '漫剧',
    status: '草稿',
    progress: 10,
    currentEpisode: 1,
    totalEpisodes: 20,
    lastEdited: '昨天',
    thumbnail: '/project-placeholder-3.jpg',
    skillName: '古风仙侠漫剧SKILL',
  },
  {
    id: '4',
    name: '《午夜回声》悬疑惊悚',
    type: '短剧',
    status: '已完成',
    progress: 100,
    currentEpisode: 6,
    totalEpisodes: 6,
    lastEdited: '3天前',
    thumbnail: '/project-placeholder-2.jpg',
    skillName: '悬疑惊悚短剧SKILL',
  },
  {
    id: '5',
    name: '《甜蜜的误会》甜宠恋爱',
    type: '漫剧',
    status: '待审核',
    progress: 90,
    currentEpisode: 5,
    totalEpisodes: 5,
    lastEdited: '5小时前',
    thumbnail: '/project-placeholder-1.jpg',
    skillName: '甜宠恋爱漫剧SKILL',
  },
  {
    id: '6',
    name: '《破茧成蝶》职场励志',
    type: '短剧',
    status: '失败',
    progress: 30,
    currentEpisode: 1,
    totalEpisodes: 10,
    lastEdited: '1周前',
    thumbnail: '/project-placeholder-2.jpg',
    skillName: '职场励志短剧SKILL',
  },
  {
    id: '7',
    name: '《星际迷航》科幻冒险',
    type: '漫剧',
    status: '草稿',
    progress: 0,
    currentEpisode: 1,
    totalEpisodes: 15,
    lastEdited: '2周前',
    thumbnail: '/project-placeholder-3.jpg',
    skillName: '科幻冒险漫剧SKILL',
  },
  {
    id: '8',
    name: '《校园怪谈》恐怖悬疑',
    type: '漫剧',
    status: '进行中',
    progress: 55,
    currentEpisode: 4,
    totalEpisodes: 8,
    lastEdited: '1小时前',
    thumbnail: '/project-placeholder-1.jpg',
    skillName: '日式校园漫剧SKILL',
  },
  {
    id: '9',
    name: '《霸道总裁爱上我》都市言情',
    type: '短剧',
    status: '已完成',
    progress: 100,
    currentEpisode: 10,
    totalEpisodes: 10,
    lastEdited: '4天前',
    thumbnail: '/project-placeholder-2.jpg',
    skillName: '都市言情短剧SKILL',
  },
];

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  progressPanelOpen: false,
  toggleProgressPanel: () => set((s) => ({ progressPanelOpen: !s.progressPanelOpen })),

  aiPanelOpen: false,
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),

  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),

  projects: mockProjects,
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
}));
