import { create } from 'zustand';

// ─── Step types ───
export type StepId = 'script' | 'character' | 'storyboard' | 'video' | 'audio' | 'compose';
export type StepStatus = 'waiting' | 'running' | 'done' | 'failed' | 'skipped';
export type PipelineStatus = 'idle' | 'planning' | 'running' | 'paused' | 'completed' | 'failed';
export type PipelineMode = 'auto' | 'confirm' | 'preview';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
}

export const PIPELINE_STEPS: StepConfig[] = [
  { id: 'script',     label: '剧本', icon: '📝' },
  { id: 'character',  label: '角色', icon: '👤' },
  { id: 'storyboard', label: '分镜', icon: '🎬' },
  { id: 'video',      label: '视频', icon: '🎥' },
  { id: 'audio',      label: '配音', icon: '🎵' },
  { id: 'compose',    label: '合成', icon: '🎞️' },
];

// ─── Step data types ───
export interface ScriptData {
  episodes: Array<{
    id: string;
    number: number;
    title: string;
    scenes: Array<{
      id: string;
      title: string;
      summary: string;
      location: string;
      timeTag: string;
    }>;
  }>;
}

export interface CharacterData {
  characters: Array<{
    id: string;
    name: string;
    role: '主角' | '配角' | '龙套';
    description: string;
    gender?: string;
    age?: number;
    personality?: string;
    personalityTraits?: string[];
    appearance?: string;
    costume?: string;
    status: 'waiting' | 'generating' | 'done';
    avatarColor: string;
  }>;
}

export interface StoryboardData {
  shots: Array<{
    id: string;
    shotNumber: number;
    episodeNumber: number;
    sceneTitle: string;
    description: string;
    shotType: string;
    duration: number;
    status: 'waiting' | 'generating' | 'done';
  }>;
}

export interface VideoData {
  clips: Array<{
    id: string;
    shotId: string;
    name: string;
    duration: number;
    progress: number;
    status: 'waiting' | 'generating' | 'done' | 'failed';
  }>;
  overallProgress: number;
}

export interface AudioData {
  voices: Array<{
    characterId: string;
    characterName: string;
    voiceName: string;
    status: 'waiting' | 'generating' | 'done';
  }>;
  bgm: {
    style: string;
    duration: number;
    status: 'waiting' | 'generating' | 'done';
  };
}

export interface ComposeData {
  videoUrl: string | null;
  duration: number;
  resolution: string;
  status: 'waiting' | 'composing' | 'done';
}

export type StepData = ScriptData | CharacterData | StoryboardData | VideoData | AudioData | ComposeData | null;

export interface PipelineStep {
  id: StepId;
  status: StepStatus;
  progress: number;       // 0-100
  data: StepData;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PipelineError {
  step: StepId;
  message: string;
  retryable: boolean;
}

// ─── State ───
interface PipelineState {
  status: PipelineStatus;
  mode: PipelineMode;
  currentStep: number;        // 0-5
  panelOpen: boolean;
  panelRatio: number;         // 0.3-0.7
  projectId: string | null;
  projectTitle: string;
  steps: PipelineStep[];
  queuedMessages: string[];
  error: PipelineError | null;
  autoRetried: number;        // 当前步骤已自动重试次数

  // Actions
  startPipeline: (title: string, mode: PipelineMode) => void;
  pausePipeline: () => void;
  resumePipeline: () => void;
  cancelPipeline: () => void;
  retryStep: (stepIndex: number) => void;
  skipStep: (stepIndex: number) => void;
  switchStep: (stepIndex: number) => void;
  completeStep: (stepIndex: number, data: StepData) => void;
  failStep: (stepIndex: number, message: string) => void;
  updateStepProgress: (stepIndex: number, progress: number) => void;
  updateStepData: (stepIndex: number, data: StepData) => void;
  advanceToNextStep: () => void;
  completePipeline: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelRatio: (ratio: number) => void;
  queueMessage: (msg: string) => void;
  processQueue: () => string | null;
  reset: () => void;
}

function createInitialSteps(): PipelineStep[] {
  return PIPELINE_STEPS.map((s) => ({
    id: s.id,
    status: 'waiting',
    progress: 0,
    data: null,
    error: null,
    startedAt: null,
    completedAt: null,
  }));
}

function now(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  status: 'idle',
  mode: 'auto',
  currentStep: 0,
  panelOpen: false,
  panelRatio: 0.5,
  projectId: null,
  projectTitle: '',
  steps: createInitialSteps(),
  queuedMessages: [],
  error: null,
  autoRetried: 0,

  startPipeline: (title, mode) => {
    set({
      status: mode === 'auto' ? 'running' : 'running',
      mode,
      currentStep: 0,
      panelOpen: true,
      projectTitle: title,
      steps: createInitialSteps(),
      queuedMessages: [],
      error: null,
      autoRetried: 0,
    });
    // Mark first step as running
    const steps = [...get().steps];
    steps[0] = { ...steps[0], status: 'running', startedAt: now() };
    set({ steps });
  },

  pausePipeline: () => set({ status: 'paused' }),

  resumePipeline: () => {
    const state = get();
    set({ status: 'running', error: null });
    // Re-mark current step as running if it was failed
    const steps = [...state.steps];
    const current = steps[state.currentStep];
    if (current.status === 'failed') {
      steps[state.currentStep] = { ...current, status: 'running', error: null };
      set({ steps });
    }
  },

  cancelPipeline: () => {
    set({
      status: 'idle',
      panelOpen: false,
      steps: createInitialSteps(),
      error: null,
      queuedMessages: [],
    });
  },

  retryStep: (stepIndex) => {
    const steps = [...get().steps];
    steps[stepIndex] = { ...steps[stepIndex], status: 'running', error: null, progress: 0, startedAt: now() };
    set({ steps, status: 'running', error: null, autoRetried: 0 });
  },

  skipStep: (stepIndex) => {
    const steps = [...get().steps];
    steps[stepIndex] = { ...steps[stepIndex], status: 'skipped', completedAt: now() };
    set({ steps, error: null });
    get().advanceToNextStep();
  },

  switchStep: (stepIndex) => {
    set({ currentStep: stepIndex });
  },

  completeStep: (stepIndex, data) => {
    const steps = [...get().steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      status: 'done',
      progress: 100,
      data,
      completedAt: now(),
    };
    set({ steps, autoRetried: 0 });
  },

  failStep: (stepIndex, message) => {
    const state = get();
    const steps = [...state.steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      status: 'failed',
      error: message,
      completedAt: now(),
    };
    set({
      steps,
      status: 'paused',
      error: { step: PIPELINE_STEPS[stepIndex].id, message, retryable: true },
    });
  },

  updateStepProgress: (stepIndex, progress) => {
    const steps = [...get().steps];
    steps[stepIndex] = { ...steps[stepIndex], progress: Math.min(100, Math.max(0, progress)) };
    set({ steps });
  },

  updateStepData: (stepIndex, data) => {
    const steps = [...get().steps];
    steps[stepIndex] = { ...steps[stepIndex], data };
    set({ steps });
  },

  advanceToNextStep: () => {
    const state = get();
    const nextIdx = state.currentStep + 1;
    if (nextIdx >= PIPELINE_STEPS.length) {
      get().completePipeline();
      return;
    }
    const steps = [...state.steps];
    steps[nextIdx] = { ...steps[nextIdx], status: 'running', startedAt: now() };
    set({ steps, currentStep: nextIdx });
  },

  completePipeline: () => {
    set({ status: 'completed' });
  },

  setPanelOpen: (open) => set({ panelOpen: open }),
  setPanelRatio: (ratio) => set({ panelRatio: Math.max(0.3, Math.min(0.7, ratio)) }),

  queueMessage: (msg) => {
    set((s) => ({ queuedMessages: [...s.queuedMessages, msg] }));
  },

  processQueue: () => {
    const state = get();
    if (state.queuedMessages.length === 0) return null;
    const [next, ...rest] = state.queuedMessages;
    set({ queuedMessages: rest });
    return next;
  },

  reset: () => set({
    status: 'idle',
    mode: 'auto',
    currentStep: 0,
    panelOpen: false,
    projectTitle: '',
    steps: createInitialSteps(),
    queuedMessages: [],
    error: null,
    autoRetried: 0,
  }),
}));
