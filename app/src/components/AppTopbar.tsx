import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, HelpCircle, PanelLeft, LayoutGrid, Users, Puzzle, X, Keyboard, MessageSquare, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toastSuccess, toastInfo, toastError } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationData,
} from '@/lib/api';

const pathNames: Record<string, string> = {
  '/': '项目工作台',
  '/chat': 'AI对话',
  '/script': '剧本编辑器',
  '/characters': '角色管理台',
  '/storyboard': '分镜工作台',
  '/composer': '成片合成室',
  '/skills': 'SKILL市场',
  '/assets': '素材库',
  '/history': '生成记录',
  '/cost': '成本统计',
};

/** 搜索关键词 → 路由映射 */
const searchRouteMap: Record<string, string> = {
  '剧本': '/script',
  '角色': '/characters',
  '分镜': '/storyboard',
  '合成': '/composer',
  '技能': '/skills',
  '素材': '/assets',
  '历史': '/history',
  '成本': '/cost',
};

// ─── Keyboard shortcuts reference ───
const shortcuts = [
  { key: 'N', desc: '新建项目' },
  { key: '/', desc: '聚焦搜索' },
  { key: '⌘S', desc: '保存当前编辑' },
  { key: '⌘Z', desc: '撤销' },
  { key: '⌘⇧Z / ⌘Y', desc: '重做' },
  { key: 'Space', desc: '播放/暂停预览' },
  { key: '← →', desc: '逐帧移动（合成室）' },
];

function HotkeyDialog({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-[#DEDBD8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[#A8835F]" />
            <h3 className="text-h3 text-[#383431]">快捷键参考</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-small text-[#524D48]">{s.desc}</span>
              <kbd className="px-2.5 py-1 bg-[#F8F7F6] border border-[#DEDBD8] rounded-md text-[11px] font-mono text-[#6E6862]">{s.key}</kbd>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-[#F8F7F6] border-t border-[#DEDBD8] flex items-center gap-2 text-caption text-[#A8A39E]">
          <BookOpen size={12} />
          更多详情请查看完整文档
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Notification Panel ───
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [detailNotification, setDetailNotification] = useState<NotificationData | null>(null);

  // 从后端加载通知
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ page_size: 20 });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('[Notification] 加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toastSuccess('已将所有通知标记为已读');
    } catch (err) {
      toastError('操作失败');
    }
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[Notification] 标记已读失败:', err);
      }
    }
    if (notification.link) {
      // 如果 link 是内部路由则导航，否则打开新窗口
      if (notification.link.startsWith('/')) {
        navigate(notification.link);
        onClose();
      } else {
        window.open(notification.link, '_blank', 'noopener');
      }
    } else {
      // 无链接时展示通知详情弹窗
      setDetailNotification(notification);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-2xl shadow-xl border border-[#DEDBD8] overflow-hidden z-floating"
    >
      <div className="px-5 py-4 border-b border-[#DEDBD8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#8B847E]" />
          <span className="text-small font-semibold text-[#383431]">通知</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[#B85C50] text-white text-[10px] rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-[12px] text-[#5A7FA8] hover:text-[#4A6F8A] transition-colors">
            全部已读
          </button>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-[#A8835F]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Bell size={32} className="text-[#C5C1BC] mb-2" />
            <p className="text-small text-[#A8A39E]">暂无通知</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'px-5 py-3 border-b border-[#F8F7F6] hover:bg-[#FBF7F4] transition-colors cursor-pointer',
                !n.is_read && 'bg-[#FDFBF9]'
              )}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                  n.type === 'success' ? 'bg-[#5B8C5A]' :
                  n.type === 'warning' ? 'bg-[#C49A3C]' :
                  n.type === 'error' ? 'bg-[#B85C50]' : 'bg-[#5A7FA8]'
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-small truncate', n.is_read ? 'text-[#6E6862]' : 'text-[#383431] font-medium')}>{n.title}</p>
                  <p className="text-caption text-[#A8A39E] mt-0.5 line-clamp-1">{n.description}</p>
                  <p className="text-[11px] text-[#C5C1BC] mt-1">{n.created_at_str}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => { loadNotifications(); }}
        className="w-full h-10 border-t border-[#DEDBD8] text-[12px] text-[#5A7FA8] hover:bg-[#F8F7F6] transition-colors flex items-center justify-center gap-1"
      >
        查看全部 <ChevronRight size={12} />
      </button>

      {/* Notification Detail Dialog */}
      <AnimatePresence>
        {detailNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setDetailNotification(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[#DEDBD8] flex items-center justify-between">
                <h3 className="text-h3 text-[#383431]">{detailNotification.title}</h3>
                <button onClick={() => setDetailNotification(null)} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5">
                <p className="text-body text-[#524D48]">{detailNotification.description}</p>
                <p className="text-caption text-[#C5C1BC] mt-4">{detailNotification.created_at_str}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AppTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const createRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // 加载未读通知数量
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await getUnreadCount();
        setUnreadCount(data.unread_count);
      } catch (err) {
        console.error('[AppTopbar] 加载未读数量失败:', err);
      }
    };
    loadUnreadCount();
    // 每 30 秒刷新一次
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const query = searchValue.trim();
      // 匹配搜索关键词映射
      const matchedRoute = searchRouteMap[query];
      if (matchedRoute) {
        navigate(matchedRoute);
      } else {
        // 尝试模糊匹配 pathNames 中的值
        const fuzzyMatch = Object.entries(pathNames).find(
          ([, name]) => name.includes(query)
        );
        if (fuzzyMatch) {
          navigate(fuzzyMatch[0]);
        } else {
          toastInfo(`未找到匹配内容: ${query}`);
        }
      }
    }
  };

  return (
    <header className="h-topbar bg-white border-b border-[#DEDBD8] flex items-center px-4 sticky top-0 z-fixed-nav">
      {/* Left: Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] transition-colors shrink-0"
        >
          <PanelLeft size={18} className="text-[#8B847E]" />
        </button>

        <nav className="flex items-center text-small">
          <button onClick={() => navigate('/')} className="text-[#A8A39E] hover:text-[#755235] transition-colors">首页</button>
          <span className="mx-2 text-[#C5C1BC]">/</span>
          <span className="text-[#6E6862]">{pathNames[location.pathname] || '页面'}</span>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center">
        <div className="w-80 h-9 bg-[#F8F7F6] rounded-full flex items-center px-3.5 border border-transparent hover:border-[#DEDBD8] focus-within:border-[#D9BFA8] focus-within:shadow-inner transition-all">
          <Search size={15} className="text-[#A8A39E] shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="搜索项目、剧本、角色..."
            className="flex-1 ml-2 bg-transparent text-small text-[#383431] placeholder:text-[#A8A39E] outline-none"
          />
          {searchValue ? (
            <button onClick={() => setSearchValue('')} className="text-[#A8A39E] hover:text-[#6E6862]">
              <X size={14} />
            </button>
          ) : (
            <span className="text-caption text-[#C5C1BC] ml-2 font-mono">⌘K</span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] transition-colors"
          >
            <Bell size={17} className="text-[#8B847E]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B85C50] animate-pulse" />
            )}
          </button>
          <AnimatePresence>
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* Create Button */}
        <div className="relative" ref={createRef}>
          <button
            onClick={() => setCreateOpen(!createOpen)}
            className="h-8 px-3 bg-[#A8835F] hover:bg-[#8E6A48] text-white rounded-md flex items-center gap-1.5 text-small font-medium transition-colors shadow-sm hover:shadow-md"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">新建</span>
          </button>
          <AnimatePresence>
            {createOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1 z-floating"
              >
                <button
                  onClick={() => { navigate('/'); setCreateOpen(false); }}
                  className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  <LayoutGrid size={14} /> 新建项目
                </button>
                <button
                  onClick={() => { navigate('/characters'); setCreateOpen(false); }}
                  className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  <Users size={14} /> 新建角色
                </button>
                <button
                  onClick={() => { navigate('/skills'); setCreateOpen(false); }}
                  className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  <Puzzle size={14} /> 新建SKILL
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] transition-colors"
          >
            <HelpCircle size={17} className="text-[#8B847E]" />
          </button>
          <AnimatePresence>
            {helpOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1 z-floating"
              >
                <button
                  onClick={() => { setHelpOpen(false); setShowShortcuts(true); }}
                  className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  <Keyboard size={14} /> 快捷键
                </button>
                <button
                  onClick={() => { setHelpOpen(false); toastInfo('正在打开使用文档...'); }}
                  className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  <BookOpen size={14} /> 使用文档
                </button>
                <button
                  onClick={() => { setHelpOpen(false); toastSuccess('感谢反馈！我们会尽快处理。'); }}
                  className="w-full px-4 py-2 text-left text-small text-[#524D48] hover:bg-[#F8F7F6] flex items-center gap-2 transition-colors"
                >
                  <MessageSquare size={14} /> 问题反馈
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <AnimatePresence>
        {showShortcuts && <HotkeyDialog onClose={() => setShowShortcuts(false)} />}
      </AnimatePresence>
    </header>
  );
}
