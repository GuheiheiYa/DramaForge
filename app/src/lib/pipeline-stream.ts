import {
  getPipelineRun,
  listenPipelineStream,
  resolvePipelineId,
  type PipelineSSEEvent,
} from '@/lib/api';
import { clearStoredPipeline, loadStoredPipeline, shouldRestorePipeline } from '@/lib/pipeline-storage';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { usePipelineStore } from '@/store/usePipelineStore';
import { toastSuccess } from '@/hooks/useToast';

const STEP_MESSAGES = ['剧本', '角色', '分镜', '视频', '配音', '合成'];

let unsubscribe: (() => void) | null = null;
let activePipelineId: string | null = null;

function handlePipelineChatMessage(sessionId: string | null, event: PipelineSSEEvent) {
  if (!sessionId) return;
  const step = event.step ?? 0;
  const stepLabel = STEP_MESSAGES[step] || `步骤 ${step + 1}`;

  switch (event.type) {
    case 'step_progress':
      useChatStore.getState().updatePipelineProgressMessage(
        sessionId,
        step,
        `正在执行${stepLabel}… ${event.progress ?? 0}%`,
      );
      break;
    case 'step_completed':
      useChatStore.getState().addPipelineMessage(sessionId, {
        role: 'assistant',
        type: 'step_complete',
        content: `${stepLabel}已完成`,
        pipelineStep: step,
      });
      break;
    case 'step_failed':
      useChatStore.getState().addPipelineMessage(sessionId, {
        role: 'assistant',
        type: 'error_card',
        content: event.error?.message || `${stepLabel}失败`,
        pipelineStep: step,
        pipelineError: event.error || { message: '未知错误', retryable: true },
      });
      break;
    case 'waiting_confirmation':
      useChatStore.getState().addPipelineMessage(sessionId, {
        role: 'assistant',
        type: 'step_complete',
        content: `${stepLabel}已完成，请确认后继续下一步`,
        pipelineStep: step,
      });
      break;
    case 'pipeline_completed':
      useChatStore.getState().addPipelineMessage(sessionId, {
        role: 'assistant',
        type: 'pipeline_complete',
        content: usePipelineStore.getState().projectTitle || '项目',
      });
      toastSuccess('Pipeline 全部完成！');
      break;
  }
}

export function cleanupPipelineStream() {
  unsubscribe?.();
  unsubscribe = null;
  activePipelineId = null;
}

/** 删除项目或项目不存在时，清除 Pipeline 进度面板与 localStorage */
export function dismissPipelineForProject(projectId: string) {
  const stored = loadStoredPipeline();
  const state = usePipelineStore.getState();
  const matchesStored = stored?.projectId === projectId;
  const matchesActive = state.projectId === projectId;

  if (!matchesStored && !matchesActive) return;

  cleanupPipelineStream();
  clearStoredPipeline();
  usePipelineStore.getState().reset();
}

export function subscribePipelineStream(pipelineId: string) {
  const id = resolvePipelineId({ pipeline_id: pipelineId });
  if (!id) {
    console.error('[Pipeline] 无法订阅 SSE：无效的 pipeline id', pipelineId);
    return;
  }
  if (activePipelineId === id && unsubscribe) return;

  cleanupPipelineStream();
  activePipelineId = id;
  unsubscribe = listenPipelineStream(
    id,
    (event) => {
      usePipelineStore.getState().applyPipelineEvent(event);
      handlePipelineChatMessage(usePipelineStore.getState().chatSessionId, event);
    },
    (err) => console.error('[Pipeline SSE]', err),
  );
}

export function ensurePipelineStream(pipelineId: string | null | undefined) {
  if (!pipelineId) return;
  subscribePipelineStream(pipelineId);
}

export async function restorePipelineFromStorage() {
  if (usePipelineStore.getState().pipelineRunId) {
    ensurePipelineStream(usePipelineStore.getState().pipelineRunId);
    return;
  }

  const stored = loadStoredPipeline();
  if (!stored) return;

  const selectedProjectId = useAppStore.getState().selectedProjectId;
  if (!shouldRestorePipeline(stored, { projectId: selectedProjectId })) return;

  const projectExists = useAppStore.getState().projects.some((p) => p.id === stored.projectId);
  if (!projectExists) {
    dismissPipelineForProject(stored.projectId);
    return;
  }

  const id = resolvePipelineId({ pipeline_id: stored.pipelineId });
  if (!id) {
    clearStoredPipeline();
    return;
  }

  try {
    const status = await getPipelineRun(id);
    if (status.status === 'running' || status.status === 'paused') {
      usePipelineStore.getState().syncFromBackend(status);
      usePipelineStore.setState({
        chatSessionId: useChatStore.getState().currentSessionId || stored.chatSessionId || null,
        panelOpen: true,
      });
      subscribePipelineStream(resolvePipelineId(status) || id);
    } else {
      clearStoredPipeline();
      usePipelineStore.getState().reset();
    }
  } catch {
    clearStoredPipeline();
  }
}

export async function pollPipelineStatus(pipelineId: string) {
  const status = await getPipelineRun(pipelineId);
  usePipelineStore.getState().syncFromBackend(status);
  if (status.status === 'running' || status.status === 'paused') {
    ensurePipelineStream(pipelineId);
  } else {
    cleanupPipelineStream();
    clearStoredPipeline();
  }
}
