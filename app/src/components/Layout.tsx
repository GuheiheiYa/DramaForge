import { Component, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import ProgressPanel from './ProgressPanel';
import PipelineLifecycle from './PipelineLifecycle';
import ToastProvider from './ToastProvider';
import { useAppStore } from '@/store/useAppStore';

// ─── Error Boundary ───
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-16 h-16 rounded-full bg-[#B85C50]/10 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B85C50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-h3 text-[#383431] mb-2">页面出了点问题</h2>
          <p className="text-body text-[#A8A39E] mb-6 max-w-md">
            抱歉，当前页面发生了错误。请尝试刷新页面，如果问题持续存在，请联系技术支持。
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-[#A8835F] hover:bg-[#8E6A48] text-white rounded-lg text-small font-medium transition-colors"
            >
              重试
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#F8F7F6] hover:bg-[#EDEBE8] text-[#524D48] rounded-lg text-small font-medium transition-colors border border-[#DEDBD8]"
            >
              刷新页面
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-left w-full max-w-lg">
              <summary className="text-caption text-[#A8A39E] cursor-pointer hover:text-[#6E6862]">
                错误详情
              </summary>
              <pre className="mt-2 p-3 bg-[#F8F7F6] rounded-lg text-[12px] text-[#B85C50] overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Layout() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-[100dvh] flex bg-[#FBF7F4]">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <motion.main
        className="flex-1 flex flex-col min-w-0"
        animate={{
          marginLeft: sidebarCollapsed ? 64 : 240,
        }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
      >
        <AppTopbar />
        <div className="flex-1 overflow-auto">
          <ErrorBoundary>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
            >
              <Outlet />
            </motion.div>
          </ErrorBoundary>
        </div>
      </motion.main>
      <ProgressPanel />
      <PipelineLifecycle />
      <ToastProvider />
    </div>
  );
}
