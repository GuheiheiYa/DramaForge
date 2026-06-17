import { create } from 'zustand';
import { resolvePipelineId } from '@/lib/api';

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
  pipelineRunId: string | null;
  projectTitle: string;
  steps: PipelineStep[];
  queuedMessages: string[];
  error: PipelineError | null;
  autoRetried: number;        // 当前步骤已自动重试次数
  waitingConfirmation: boolean;
  chatSessionId: string | null;
  lastProgressAt: number | null;
  stale: boolean;

  // Actions
  startPipeline: (title: string, mode: PipelineMode, projectId?: string | null) => void;
  setPipelineRunId: (id: string | null) => void;
  syncFromBackend: (status: import('@/lib/api').PipelineRunStatus) => void;
  applyPipelineEvent: (event: import('@/lib/api').PipelineSSEEvent) => void;
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
  setChatSessionId: (id: string | null) => void;
  markStale: (stale: boolean) => void;
  touchProgress: () => void;
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
  pipelineRunId: null,
  projectTitle: '',
  steps: createInitialSteps(),
  queuedMessages: [],
  error: null,
  autoRetried: 0,
  waitingConfirmation: false,
  chatSessionId: null,
  lastProgressAt: null,
  stale: false,

  startPipeline: (title, mode, projectId = null) => {
    set({
      status: 'running',
      mode,
      currentStep: 0,
      panelOpen: true,
      projectTitle: title,
      projectId: projectId ?? get().projectId,
      pipelineRunId: null,
      steps: createInitialSteps(),
      queuedMessages: [],
      error: null,
      autoRetried: 0,
      waitingConfirmation: false,
    });
    // Mark first step as running
    const steps = [...get().steps];
    steps[0] = { ...steps[0], status: 'running', startedAt: now() };
    set({ steps });
  },

  setPipelineRunId: (id) => set({ pipelineRunId: id }),

  syncFromBackend: (status) => {
    const mappedSteps: PipelineStep[] = (status.steps || []).map((s, i) => ({
      id: PIPELINE_STEPS[i]?.id || (s.id as StepId),
      status: mapBackendStepStatus(s.status),
      progress: s.progress ?? 0,
      data: (s.data as StepData) ?? null,
      error: null,
      startedAt: null,
      completedAt: s.status === 'done' || s.status === 'skipped' ? now() : null,
    }));
    set({
      pipelineRunId: resolvePipelineId(status) || status.pipeline_id || null,
      projectId: status.project_id,
      status: mapBackendPipelineStatus(status.status),
      currentStep: status.current_step,
      mode: status.mode,
      steps: mappedSteps.length ? mappedSteps : get().steps,
      waitingConfirmation: status.waiting_confirmation,
      error: status.error
        ? { step: PIPELINE_STEPS[status.current_step]?.id || 'script', message: status.error.message, retryable: status.error.retryable ?? true }
        : null,
      panelOpen: status.status !== 'idle',
      lastProgressAt: status.status === 'running' ? Date.now() : get().lastProgressAt,
      stale: false,
    });
  },

  applyPipelineEvent: (event) => {
    const state = get();
    if (event.type === 'snapshot') {
      get().syncFromBackend({
        pipeline_id: event.pipeline_id || state.pipelineRunId || '',
        project_id: event.project_id || state.projectId || '',
        status: event.status || state.status,
        current_step: event.current_step ?? state.currentStep,
        steps: event.steps,
        mode: event.mode || state.mode,
        error: event.error || null,
        waiting_confirmation: event.waiting_confirmation ?? false,
      });
      return;
    }

    if (event.step !== undefined && event.progress !== undefined) {
      get().updateStepProgress(event.step, event.progress);
    }
    if (event.step !== undefined && event.data !== undefined) {
      get().updateStepData(event.step, event.data as StepData);
    }

    switch (event.type) {
      case 'step_progress':
        if (event.step !== undefined) {
          set({ currentStep: event.step, status: 'running', lastProgressAt: Date.now(), stale: false });
        }
        break;
      case 'step_completed':
        if (event.step !== undefined) {
          get().completeStep(event.step, (event.data as StepData) ?? state.steps[event.step]?.data);
          if (event.step < PIPELINE_STEPS.length - 1) {
            set({ currentStep: event.step + 1 });
          }
        }
        break;
      case 'step_failed':
        if (event.step !== undefined && event.error) {
          get().failStep(event.step, event.error.message);
        }
        break;
      case 'waiting_confirmation':
        set({ status: 'paused', waitingConfirmation: true, panelOpen: true });
        break;
      case 'pipeline_completed':
        get().completePipeline();
        set({ waitingConfirmation: false });
        break;
      case 'pipeline_failed':
        set({ status: 'failed', waitingConfirmation: false });
        break;
    }
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
      pipelineRunId: null,
      projectId: null,
      projectTitle: '',
      chatSessionId: null,
      lastProgressAt: null,
      stale: false,
      steps: createInitialSteps(),
      error: null,
      queuedMessages: [],
      waitingConfirmation: false,
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
    set({ steps, lastProgressAt: Date.now(), stale: false });
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
    projectId: null,
    pipelineRunId: null,
    chatSessionId: null,
    lastProgressAt: null,
    stale: false,
    steps: createInitialSteps(),
    queuedMessages: [],
    error: null,
    autoRetried: 0,
    waitingConfirmation: false,
  }),

  setChatSessionId: (id) => set({ chatSessionId: id }),

  markStale: (stale) => set({ stale }),

  touchProgress: () => set({ lastProgressAt: Date.now(), stale: false }),
}));

function mapBackendStepStatus(status: string): StepStatus {
  if (status === 'completed' || status === 'done') return 'done';
  if (status === 'running') return 'running';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  return 'waiting';
}

function mapBackendPipelineStatus(status: string): PipelineStatus {
  if (status === 'completed') return 'completed';
  if (status === 'paused') return 'paused';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'running';
  return 'idle';
}
