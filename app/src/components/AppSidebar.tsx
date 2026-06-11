import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  FileText,
  Users,
  Film,
  Play,
  Puzzle,
  FolderOpen,
  Clock,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Plus,
  ChevronDown,
  Trash2,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks/useToast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: 'new' | 'unsaved' | 'progress';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '创作',
    items: [
      { label: '项目工作台', icon: <LayoutGrid size={18} />, path: '/' },
      { label: '剧本编辑器', icon: <FileText size={18} />, path: '/script', badge: 'unsaved' },
      { label: '角色管理台', icon: <Users size={18} />, path: '/characters' },
      { label: '分镜工作台', icon: <Film size={18} />, path: '/storyboard', badge: 'progress' },
      { label: '成片合成室', icon: <Play size={18} />, path: '/composer' },
    ],
  },
  {
    title: '资源',
    items: [
      { label: 'SKILL市场', icon: <Puzzle size={18} />, path: '/skills', badge: 'new' },
      { label: '素材库', icon: <FolderOpen size={18} />, path: '/assets' },
    ],
  },
  {
    title: '管理',
    items: [
      { label: '生成记录', icon: <Clock size={18} />, path: '/history' },
      { label: '成本统计', icon: <BarChart3 size={18} />, path: '/cost' },
    ],
  },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  // Chat store
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const selectSession = useChatStore((s) => s.selectSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleNewSession = () => {
    const id = createSession();
    navigate('/chat');
  };

  const handleHistoryToggle = () => {
    setHistoryExpanded(!historyExpanded);
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    navigate('/chat');
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (deletingId === sessionId) {
      deleteSession(sessionId);
      setDeletingId(null);
      toastSuccess('会话已删除');
    } else {
      setDeletingId(sessionId);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full bg-[#F8F7F6] border-r border-[#DEDBD8] z-fixed-nav flex flex-col overflow-hidden"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 border-b border-[#DEDBD8] shrink-0">
        <div className="w-8 h-8 rounded-md bg-[#A8835F] flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            className="ml-3 text-sm font-semibold text-[#383431] whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: 0.1 }}
          >
            AI漫剧Agent
          </motion.span>
        )}
      </div>

      {/* New Session Button */}
      <div className={cn('shrink-0', collapsed ? 'px-2 py-2' : 'px-3 py-2.5')}>
        <button
          onClick={handleNewSession}
          className={cn(
            'w-full flex items-center rounded-lg transition-all',
            collapsed
              ? 'justify-center h-10 bg-[#A8835F]/10 hover:bg-[#A8835F]/20 text-[#A8835F]'
              : 'px-3 h-9 bg-[#A8835F] hover:bg-[#8E6A48] text-white shadow-sm hover:shadow-md'
          )}
        >
          <Plus size={collapsed ? 18 : 16} />
          {!collapsed && (
            <motion.span
              className="ml-2 text-small font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              新建会话
            </motion.span>
          )}
        </button>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[116px] w-6 h-6 rounded-full bg-white border border-[#DEDBD8] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        {collapsed ? <ChevronRight size={12} className="text-[#8B847E]" /> : <ChevronLeft size={12} className="text-[#8B847E]" />}
      </button>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <motion.span
                className="px-3 mb-2 block text-caption text-[#A8A39E] uppercase tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {group.title}
              </motion.span>
            )}
            <ul className="space-y-1">
              {/* Standard nav items */}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full flex items-center relative h-10 rounded-md transition-colors duration-fast group',
                        collapsed ? 'justify-center px-0' : 'px-3',
                        isActive
                          ? 'bg-[#FBF7F4] text-[#755235]'
                          : 'text-[#524D48] hover:bg-[#F5EDE6] hover:text-[#755235]'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#A8835F] rounded-r-full"
                          layoutId="sidebar-active-indicator"
                          transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                        />
                      )}
                      <span className={cn('shrink-0', isActive ? 'text-[#A8835F]' : 'text-[#8B847E] group-hover:text-[#A8835F]')}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <motion.span
                          className="ml-3 text-small whitespace-nowrap flex-1 text-left"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15, delay: 0.05 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                      {!collapsed && item.badge === 'new' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-[#F5EDE6] text-[#A8835F] text-[10px] font-medium rounded-full">NEW</span>
                      )}
                      {!collapsed && item.badge === 'unsaved' && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-[#B85C50]" />
                      )}
                      {!collapsed && item.badge === 'progress' && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-[#5A7FA8] animate-pulse-glow" />
                      )}
                    </button>
                  </li>
                );
              })}

              {/* 管理分组底部追加 历史会话 (可折叠) */}
              {group.title === '管理' && !collapsed && (
                <li>
                  <button
                    onClick={handleHistoryToggle}
                    className={cn(
                      'w-full flex items-center h-10 rounded-md transition-colors px-3',
                      historyExpanded ? 'bg-[#F5EDE6] text-[#755235]' : 'text-[#524D48] hover:bg-[#F5EDE6] hover:text-[#755235]'
                    )}
                  >
                    <MessageSquare size={18} className="shrink-0 text-[#8B847E]" />
                    <span className="ml-3 text-small whitespace-nowrap flex-1 text-left">历史会话</span>
                    <motion.div animate={{ rotate: historyExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={14} className="text-[#A8A39E]" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {historyExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-0.5 pb-1 space-y-0.5">
                          {sessions.length === 0 ? (
                            <p className="px-4 py-3 text-caption text-[#A8A39E] text-center">暂无会话</p>
                          ) : (
                            sessions.slice(0, 10).map((session) => {
                              const isSActive = session.id === currentSessionId;
                              return (
                                <div key={session.id} className="relative group">
                                  <button
                                    onClick={() => handleSelectSession(session.id)}
                                    className={cn(
                                      'w-full flex items-center h-8 rounded-md transition-colors text-left',
                                      isSActive ? 'bg-[#FBF7F4] text-[#755235]' : 'text-[#524D48] hover:bg-[#EFEDEB]'
                                    )}
                                    style={{ paddingLeft: '36px', paddingRight: '28px' }}
                                  >
                                    <span className="text-[12px] truncate flex-1">{session.title}</span>
                                  </button>
                                  <button
                                  onClick={(e) => handleDeleteSession(e, session.id)}
                                  className={cn(
                                    'absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center transition-colors',
                                    deletingId === session.id
                                      ? 'text-[#B85C50] bg-[#FDF2F0]'
                                      : 'text-[#A8A39E] hover:text-[#B85C50] hover:bg-[#FDF2F0] opacity-0 group-hover:opacity-100'
                                  )}
                                  title={deletingId === session.id ? '确认删除' : '删除'}
                                >
                                  {deletingId === session.id ? <Check size={10} /> : <Trash2 size={10} />}
                                </button>
                              </div>
                            );
                          })
                        )}
                        {sessions.length > 10 && (
                          <button
                            onClick={() => navigate('/chat')}
                            className="w-full text-center py-1 text-[11px] text-[#5A7FA8] hover:text-[#4A6F8A] transition-colors"
                          >
                            查看全部 {sessions.length} 个会话 →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
              )}
            </ul>
          </div>
        ))}

        {/* When sidebar is collapsed, show mini management icons */}
        {collapsed && (
          <div>
            <ul className="space-y-1">
              {[
                { label: '历史会话', icon: <MessageSquare size={18} />, path: '/chat' },
                { label: '生成记录', icon: <Clock size={18} />, path: '/history' },
                { label: '成本统计', icon: <BarChart3 size={18} />, path: '/cost' },
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'w-full flex items-center justify-center h-10 rounded-md transition-colors',
                        isActive ? 'bg-[#FBF7F4] text-[#A8835F]' : 'text-[#8B847E] hover:bg-[#F5EDE6] hover:text-[#A8835F]'
                      )}
                      title={item.label}
                    >
                      {item.icon}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Bottom User Area */}
      <div className="shrink-0 border-t border-[#DEDBD8] p-3">
        <button className={cn(
          'w-full flex items-center rounded-md hover:bg-[#F5EDE6] transition-colors h-10',
          collapsed ? 'justify-center px-0' : 'px-3'
        )}>
          <div className="w-7 h-7 rounded-full bg-[#EAD8C8] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-medium text-[#8E6A48]">创</span>
          </div>
          {!collapsed && (
            <motion.div
              className="ml-2.5 text-left overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-small text-[#383431] truncate">创作者</p>
              <p className="text-caption text-[#A8A39E] truncate">个人版</p>
            </motion.div>
          )}
          {!collapsed && (
            <motion.div className="ml-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Settings size={14} className="text-[#A8A39E]" />
            </motion.div>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
