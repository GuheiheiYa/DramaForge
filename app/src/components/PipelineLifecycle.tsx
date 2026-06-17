import { usePipelineLifecycle } from '@/hooks/usePipelineLifecycle';

/** 挂载在 Layout，保持 Pipeline SSE 与轮询在路由切换时不中断 */
export default function PipelineLifecycle() {
  usePipelineLifecycle();
  return null;
}
