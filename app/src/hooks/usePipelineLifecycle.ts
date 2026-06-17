import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  cleanupPipelineStream,
  ensurePipelineStream,
  pollPipelineStatus,
  restorePipelineFromStorage,
} from '@/lib/pipeline-stream';
import { usePipelineStore } from '@/store/usePipelineStore';

const STALE_MS = 90_000;
const POLL_MS = 30_000;

/** 全局 Pipeline 生命周期：SSE 订阅、恢复、轮询（挂载在 Layout，跨页面保持） */
export function usePipelineLifecycle() {
  const location = useLocation();
  const pipelineRunId = usePipelineStore((s) => s.pipelineRunId);
  const pipelineStatus = usePipelineStore((s) => s.status);

  useEffect(() => {
    void restorePipelineFromStorage();
  }, [location.pathname]);

  useEffect(() => {
    if (pipelineRunId && (pipelineStatus === 'running' || pipelineStatus === 'paused')) {
      ensurePipelineStream(pipelineRunId);
    }
  }, [pipelineRunId, pipelineStatus]);

  useEffect(() => {
    if (pipelineStatus !== 'running') return;

    const interval = setInterval(() => {
      const { lastProgressAt, status } = usePipelineStore.getState();
      if (status !== 'running') return;
      const last = lastProgressAt ?? Date.now();
      if (Date.now() - last >= STALE_MS) {
        usePipelineStore.getState().markStale(true);
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [pipelineStatus]);

  useEffect(() => {
    const id = pipelineRunId;
    if (!id || (pipelineStatus !== 'running' && pipelineStatus !== 'paused')) return;

    const poll = () => {
      void pollPipelineStatus(id).catch(() => {/* ignore */});
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [pipelineRunId, pipelineStatus]);
}

export { cleanupPipelineStream };
