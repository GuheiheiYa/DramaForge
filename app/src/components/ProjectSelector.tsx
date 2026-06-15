import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type Project, type ProjectType } from '@/store/useAppStore';
import { getProjects as apiGetProjects, createProject as apiCreateProject } from '@/lib/api';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

/**
 * 项目选择器组件 — 可在多个页面复用。
 * 显示当前选中项目，支持切换和新建。
 */
export default function ProjectSelector({ className }: { className?: string }) {
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const addProject = useAppStore((s) => s.addProject);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 加载项目列表
  useEffect(() => {
    apiGetProjects()
      .then((data) => {
        const apiProjects: Project[] = data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          type: ((p.type as string) || '漫剧') as ProjectType,
          status: '草稿',
          progress: 0,
          currentEpisode: 1,
          totalEpisodes: (p.episodes as number) || 8,
          lastEdited: '未知',
          thumbnail: '/project-placeholder-1.jpg',
        }));
        useAppStore.setState({ projects: apiProjects });
      })
      .catch(() => {/* 保留现有数据 */});
  }, []);

  const handleSelect = (id: string) => {
    setSelectedProject(id);
    setOpen(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const created = await apiCreateProject({ name: `新项目 ${projects.length + 1}`, type: '漫剧' });
      const newProject: Project = {
        id: created.id,
        name: created.name,
        type: '漫剧',
        status: '草稿',
        progress: 0,
        currentEpisode: 1,
        totalEpisodes: 8,
        lastEdited: '刚刚',
        thumbnail: '/project-placeholder-1.jpg',
      };
      addProject(newProject);
      setSelectedProject(created.id);
      setOpen(false);
      toastSuccess(`项目「${newProject.name}」已创建`);
    } catch {
      toastInfo('创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-3 rounded-lg border border-[#DEDBD8] hover:border-[#D9BFA8] text-small text-[#524D48] flex items-center gap-2 transition-colors bg-white"
      >
        <FolderOpen size={14} className="text-[#A8835F]" />
        <span className="max-w-[160px] truncate">
          {selectedProject ? selectedProject.name : '选择项目'}
        </span>
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1.5 z-[200]"
          >
            <p className="px-3 py-1.5 text-[10px] text-[#A8A39E] uppercase tracking-wider font-medium">
              当前项目
            </p>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#F8F7F6]',
                  p.id === selectedProjectId && 'bg-[#FBF7F4]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'font-medium truncate',
                      p.id === selectedProjectId ? 'text-[#755235]' : 'text-[#383431]'
                    )}
                  >
                    {p.name}
                  </span>
                  <span className="text-[10px] text-[#A8A39E]">{p.type}</span>
                </div>
              </button>
            ))}
            <div className="h-px bg-[#DEDBD8] my-1" />
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-[12px] text-[#5A7FA8] hover:bg-[#F8F7F6] transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              新建项目
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
