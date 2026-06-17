const STORAGE_KEY = 'dramaforge_active_pipeline';
const LEGACY_KEY = 'dramaforge_active_pipeline_id';

export interface StoredPipeline {
  pipelineId: string;
  projectId: string;
  chatSessionId: string;
}

export function loadStoredPipeline(): StoredPipeline | null {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    localStorage.removeItem(LEGACY_KEY);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPipeline>;
    if (!parsed.pipelineId || !parsed.projectId) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      pipelineId: parsed.pipelineId,
      projectId: parsed.projectId,
      chatSessionId: parsed.chatSessionId || '',
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredPipeline(data: StoredPipeline): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredPipeline(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

/** 是否应从后端恢复 Pipeline（按项目匹配，不按会话阻塞刷新恢复） */
export function shouldRestorePipeline(
  stored: StoredPipeline,
  ctx: { projectId: string | null },
): boolean {
  if (!stored.pipelineId || !stored.projectId) return false;
  if (ctx.projectId && stored.projectId !== ctx.projectId) return false;
  return true;
}

/** 当前 Chat 页是否有可关联的 Pipeline 任务（不要求面板已展开） */
export function isPipelineBoundToChat(ctx: {
  status: string;
  pipelineProjectId: string | null;
  pipelineChatSessionId: string | null;
  currentSessionId: string | null;
  boundProjectId: string | null;
  selectedProjectId: string | null;
}): boolean {
  if (ctx.status === 'idle') return false;

  const effectiveProjectId = ctx.boundProjectId || ctx.selectedProjectId || ctx.pipelineProjectId;
  if (ctx.pipelineProjectId && effectiveProjectId && ctx.pipelineProjectId !== effectiveProjectId) {
    return false;
  }

  // 仅当用户明确切到其他会话时隐藏；currentSessionId 为空时不拦截（避免路由切换瞬间误判）
  if (ctx.pipelineChatSessionId && ctx.currentSessionId && ctx.pipelineChatSessionId !== ctx.currentSessionId) {
    return false;
  }

  return true;
}

/** 当前 Chat 页是否应展示 Pipeline 面板 */
export function isPipelineVisibleForChat(ctx: {
  panelOpen: boolean;
  status: string;
  pipelineProjectId: string | null;
  pipelineChatSessionId: string | null;
  currentSessionId: string | null;
  boundProjectId: string | null;
  selectedProjectId: string | null;
}): boolean {
  return isPipelineBoundToChat(ctx) && ctx.panelOpen;
}
