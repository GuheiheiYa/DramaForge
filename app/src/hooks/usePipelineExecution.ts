import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startPipeline,
  resumePipeline,
  pausePipeline,
  retryPipelineStep,
  skipPipelineStep,
  resolvePipelineId,
  createProject as apiCreateProject,
  type PipelineMode,
} from '@/lib/api';
import {
  cleanupPipelineStream,
  ensurePipelineStream,
  subscribePipelineStream,
} from '@/lib/pipeline-stream';
import { saveStoredPipeline, clearStoredPipeline } from '@/lib/pipeline-storage';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { usePipelineStore, PIPELINE_STEPS } from '@/store/usePipelineStore';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

const STEP_MESSAGES = ['剧本', '角色', '分镜', '视频', '配音', '合成'];

function buildCreativeInput(userMessage: string) {
  return userMessage;
}

function getConfirmedPlan() {
  const chat = useChatStore.getState();
  return chat.planConfirmed && chat.creativePlanText ? chat.creativePlanText : null;
}

export type RunPipelineOptions = {
  /** 使用已有项目 ID */
  projectId?: string;
  /** 强制创建新项目（忽略全局 selectedProjectId） */
  createNew?: boolean;
};

export function usePipelineExecution() {
  const navigate = useNavigate();
  const currentSkill = useChatStore((s) => s.currentSkill);
  const extractedTitle = useChatStore((s) => s.extractedTitle);
  const creativePlanText = useChatStore((s) => s.creativePlanText);
  const planConfirmed = useChatStore((s) => s.planConfirmed);
  const pipelineRunId = usePipelineStore((s) => s.pipelineRunId);
  const waitingConfirmation = usePipelineStore((s) => s.waitingConfirmation);
  const currentStep = usePipelineStore((s) => s.currentStep);
  const stale = usePipelineStore((s) => s.stale);
  const pipelineError = usePipelineStore((s) => s.error);

  const runPipeline = useCallback(async (
    mode: PipelineMode,
    creativeInput: string,
    options?: RunPipelineOptions,
  ) => {
    if (!planConfirmed || !creativePlanText) {
      throw new Error('请先确认创作方案后再启动 Pipeline');
    }

    const title = extractedTitle || '创作项目';
    let projectId = options?.projectId;
    const chatSessionId = useChatStore.getState().currentSessionId;

    if (!projectId && options?.createNew) {
      const created = await apiCreateProject({
        name: title,
        type: '漫剧',
        description: 'AI 生成的项目',
        skill_id: currentSkill,
      });
      projectId = created.id;
      useAppStore.getState().setSelectedProject(projectId);
      useAppStore.getState().addProject({
        id: created.id,
        name: created.name,
        type: '漫剧',
        status: '草稿',
        progress: 0,
        currentEpisode: 1,
        totalEpisodes: created.episodes || 8,
        lastEdited: '刚刚',
        thumbnail: '/project-placeholder-1.jpg',
      });
    } else if (projectId) {
      useAppStore.getState().setSelectedProject(projectId);
    } else {
      throw new Error('请指定项目：创建新项目或选择已有项目');
    }

    try {
      const confirmed_plan = getConfirmedPlan();
      const run = await startPipeline({
        project_id: projectId,
        creative_input: buildCreativeInput(creativeInput || title),
        mode,
        skill_id: currentSkill,
        structured_data: null,
        confirmed_plan,
      });

      const pipelineId = resolvePipelineId(run);
      if (!pipelineId) {
        throw new Error('Pipeline 启动失败：后端未返回 pipeline_id');
      }

      usePipelineStore.getState().syncFromBackend({ ...run, pipeline_id: pipelineId });
      usePipelineStore.setState({
        projectTitle: title,
        mode,
        projectId,
        chatSessionId,
        lastProgressAt: Date.now(),
        stale: false,
        panelOpen: true,
      });
      usePipelineStore.getState().setPipelineRunId(pipelineId);
      saveStoredPipeline({
        pipelineId,
        projectId,
        chatSessionId: chatSessionId || '',
      });
      subscribePipelineStream(pipelineId);
      toastSuccess(`已启动「${mode === 'auto' ? '全自动' : mode === 'confirm' ? '每步确认' : '仅预览'}」模式`);
    } catch (err) {
      cleanupPipelineStream();
      usePipelineStore.getState().reset();
      clearStoredPipeline();
      throw err;
    }
  }, [currentSkill, extractedTitle, creativePlanText, planConfirmed]);

  const confirmAndResume = useCallback(async () => {
    const id = usePipelineStore.getState().pipelineRunId;
    if (!id) return;
    await resumePipeline(id);
    usePipelineStore.getState().resumePipeline();
    usePipelineStore.getState().touchProgress();
    ensurePipelineStream(id);
    toastInfo('已继续执行下一步');
  }, []);

  const retryFailedStep = useCallback(async (stepIndex: number) => {
    const id = usePipelineStore.getState().pipelineRunId;
    if (!id) return;
    const sessionId = usePipelineStore.getState().chatSessionId;
    if (sessionId) {
      useChatStore.getState().resolvePipelineErrorMessage(sessionId, stepIndex);
    }
    await retryPipelineStep(id, stepIndex);
    usePipelineStore.getState().retryStep(stepIndex);
    usePipelineStore.getState().touchProgress();
    subscribePipelineStream(id);
    toastInfo(`正在重试「${STEP_MESSAGES[stepIndex] || `步骤 ${stepIndex + 1}`}」`);
  }, []);

  const retryCurrentStep = useCallback(async () => {
    const step = usePipelineStore.getState().currentStep;
    await retryFailedStep(step);
  }, [retryFailedStep]);

  const skipFailedStep = useCallback(async (stepIndex: number) => {
    const id = usePipelineStore.getState().pipelineRunId;
    if (!id) return;
    const sessionId = usePipelineStore.getState().chatSessionId;
    if (sessionId) {
      useChatStore.getState().resolvePipelineErrorMessage(sessionId, stepIndex);
    }
    await skipPipelineStep(id, stepIndex);
    usePipelineStore.getState().skipStep(stepIndex);
    subscribePipelineStream(id);
  }, []);

  const cancelActivePipeline = useCallback(async () => {
    const id = usePipelineStore.getState().pipelineRunId;
    cleanupPipelineStream();
    if (id) {
      try {
        await pausePipeline(id);
      } catch {
        /* backend may already be stopped */
      }
    }
    usePipelineStore.getState().reset();
    clearStoredPipeline();
    toastInfo('已取消当前制作任务');
  }, []);

  const goToComposer = useCallback(() => {
    const projectId = usePipelineStore.getState().projectId || useAppStore.getState().selectedProjectId;
    navigate(projectId ? `/composer?projectId=${projectId}` : '/composer');
  }, [navigate]);

  return {
    runPipeline,
    confirmAndResume,
    retryFailedStep,
    retryCurrentStep,
    skipFailedStep,
    cancelActivePipeline,
    goToComposer,
    waitingConfirmation,
    pipelineRunId,
    currentStep,
    stale,
    pipelineError,
  };
}

export { PIPELINE_STEPS };
