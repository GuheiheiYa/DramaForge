import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  X,
  Check,
  Sparkles,
  ChevronDown,
  FolderOpen,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import { useAppStore, type ProjectType, type Project } from '@/store/useAppStore';
import { getProjects as apiGetProjects, createProject as apiCreateProject, deleteProject as apiDeleteProject } from '@/lib/api';
import ProjectCard from '@/components/ProjectCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/hooks/useToast';

/* ─── Filter Types ─── */
type FilterTab = '全部' | '漫剧' | '短剧' | '草稿' | '进行中';
type SortOption = '最近编辑' | '创建时间' | '进度';

/* ─── Stats Card ─── */
function StatCard({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="bg-[#F8F7F6] rounded-xl px-5 py-4 flex-1"
    >
      <p className="text-h2 font-mono text-[#8E6A48] mb-0.5">{value}</p>
      <p className="text-caption text-[#8B847E]">{label}</p>
    </motion.div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onClearFilters, onCreate }: { onClearFilters: () => void; onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 rounded-full bg-[#F5EDE6] flex items-center justify-center mb-4">
        <FolderOpen size={32} className="text-[#C4A07F]" />
      </div>
      <h3 className="text-h4 text-[#524D48] mb-2">没有找到项目</h3>
      <p className="text-small text-[#A8A39E] mb-6">试试调整筛选条件或搜索关键词</p>
      <div className="flex gap-3">
        <button
          onClick={onClearFilters}
          className="h-9 px-4 rounded-lg border border-[#DEDBD8] text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors"
        >
          清除筛选
        </button>
        <button
          onClick={onCreate}
          className="h-9 px-4 rounded-lg bg-[#A8835F] text-small text-white hover:bg-[#8E6A48] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> 创建第一个项目
        </button>
      </div>
    </motion.div>
  );
}

/* ─── New Project Modal (3-step wizard) ─── */
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const addProject = useAppStore((s) => s.addProject);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [type, setType] = useState<ProjectType>('漫剧');
  const [description, setDescription] = useState('');
  const [episodes, setEpisodes] = useState(8);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const skills = [
    { id: 'jp-school', name: '日式校园漫剧', cover: '/skill-cover-japanese.jpg', desc: '青春校园、恋爱、友情', type: '漫剧' as ProjectType },
    { id: 'urban', name: '都市逆袭短剧', cover: '/skill-cover-urban.jpg', desc: '职场、逆袭、爽文', type: '短剧' as ProjectType },
    { id: 'xianxia', name: '古风仙侠漫剧', cover: '/skill-cover-fantasy.jpg', desc: '修仙、江湖、情缘', type: '漫剧' as ProjectType },
  ];

  const filteredSkills = skills.filter((s) => s.type === type);

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setNameError('请输入项目名称');
        return;
      }
      setNameError('');
    }
    if (step === 2 && !selectedSkill) {
      toast.info('请选择一个SKILL');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setNameError('');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);

    try {
      const created = await apiCreateProject({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        episodes,
      });
      const newProject: Project = {
        id: created.id,
        name: created.name,
        type: (created.type as ProjectType) || type,
        status: '草稿',
        progress: 0,
        currentEpisode: 1,
        totalEpisodes: created.total_episodes || episodes,
        lastEdited: '刚刚',
        thumbnail: type === '漫剧' ? '/project-placeholder-1.jpg' : '/project-placeholder-2.jpg',
        skillName: skills.find((s) => s.id === selectedSkill)?.name,
      };
      addProject(newProject);
      toast.success(`项目「${newProject.name}」创建成功`);
      onClose();
    } catch (err) {
      toast.error('创建项目失败');
    } finally {
      setCreating(false);
    }
  };

  const selectedSkillData = skills.find((s) => s.id === selectedSkill);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-[560px] max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DEDBD8] flex items-center justify-between shrink-0">
          <h3 className="text-h3 text-[#383431]">新建项目</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-5 pb-2 shrink-0">
          <div className="flex items-center justify-center gap-0">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-small font-semibold transition-colors ${
                    s < step
                      ? 'bg-[#5B8C5A] text-white'
                      : s === step
                        ? 'bg-[#A8835F] text-white'
                        : 'bg-[#DEDBD8] text-[#A8A39E]'
                  }`}
                >
                  {s < step ? <Check size={16} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-1 ${
                      s < step ? 'bg-[#5B8C5A]' : 'bg-[#DEDBD8]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-0 mt-2">
            {['基本信息', '选择SKILL', '确认'].map((label, labelIdx) => (
              <span
                key={label}
                className={`text-caption text-center ${
                  labelIdx + 1 === step ? 'text-[#755235] font-medium' : 'text-[#A8A39E]'
                }`}
                style={{ width: labelIdx < 2 ? 108 : 32 }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-small font-medium text-[#524D48] mb-2">
                    项目名称 <span className="text-[#B85C50]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (e.target.value.trim()) setNameError('');
                    }}
                    placeholder="给你的项目起个名字"
                    className={`w-full h-10 px-3.5 bg-[#F8F7F6] border rounded-lg text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all ${
                      nameError ? 'border-[#B85C50]' : 'border-[#DEDBD8]'
                    }`}
                  />
                  {nameError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-caption text-[#B85C50] mt-1"
                    >
                      {nameError}
                    </motion.p>
                  )}
                </div>
                <div>
                  <label className="block text-small font-medium text-[#524D48] mb-2">项目类型</label>
                  <div className="flex gap-3">
                    {(['漫剧', '短剧'] as ProjectType[]).map((t) => (
                      <motion.button
                        key={t}
                        onClick={() => {
                          setType(t);
                          setSelectedSkill('');
                        }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex-1 h-10 rounded-lg border text-small font-medium transition-all ${
                          type === t
                            ? 'border-[#A8835F] bg-[#FBF7F4] text-[#755235]'
                            : 'border-[#DEDBD8] text-[#6E6862] hover:border-[#C5C1BC]'
                        }`}
                      >
                        {t}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-small font-medium text-[#524D48] mb-2">
                    项目描述 <span className="text-[#C5C1BC]">（可选）</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="简要描述项目内容..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-small font-medium text-[#524D48] mb-2">集数设定</label>
                  <input
                    type="number"
                    value={episodes}
                    onChange={(e) => setEpisodes(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-24 h-10 px-3.5 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-small text-[#383431] outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <p className="text-small text-[#6E6862]">
                  为「{name || '新项目'}」选择一个适合的SKILL：
                </p>
                <div className="grid gap-3">
                  {filteredSkills.map((skill) => (
                    <motion.button
                      key={skill.id}
                      onClick={() => setSelectedSkill(skill.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedSkill === skill.id
                          ? 'border-[#A8835F] bg-[#FBF7F4]'
                          : 'border-[#DEDBD8] hover:border-[#C5C1BC]'
                      }`}
                    >
                      <div className="w-20 h-12 rounded-lg bg-[#F5EDE6] flex items-center justify-center shrink-0">
                        <Sparkles size={20} className="text-[#C4A07F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-small font-medium text-[#383431]">{skill.name}</h4>
                        <p className="text-caption text-[#A8A39E] mt-0.5">{skill.desc}</p>
                      </div>
                      {selectedSkill === skill.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-[#A8835F] flex items-center justify-center shrink-0"
                        >
                          <Check size={14} className="text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                {filteredSkills.length === 0 && (
                  <div className="text-center py-10 text-[#A8A39E] text-small">
                    暂无可用的{type}SKILL
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="bg-[#F8F7F6] rounded-xl p-5 space-y-4">
                  <h4 className="text-small font-medium text-[#524D48] mb-3">项目信息确认</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-caption text-[#8B847E]">项目名称</span>
                      <span className="text-small text-[#383431] font-medium">{name}</span>
                    </div>
                    <div className="h-px bg-[#DEDBD8]" />
                    <div className="flex justify-between">
                      <span className="text-caption text-[#8B847E]">项目类型</span>
                      <span className="text-small text-[#383431]">{type}</span>
                    </div>
                    <div className="h-px bg-[#DEDBD8]" />
                    <div className="flex justify-between">
                      <span className="text-caption text-[#8B847E]">集数</span>
                      <span className="text-small text-[#383431]">共{episodes}集</span>
                    </div>
                    <div className="h-px bg-[#DEDBD8]" />
                    <div className="flex justify-between">
                      <span className="text-caption text-[#8B847E]">SKILL</span>
                      <span className="text-small text-[#383431]">{selectedSkillData?.name || '未选择'}</span>
                    </div>
                    {description && (
                      <>
                        <div className="h-px bg-[#DEDBD8]" />
                        <div className="flex justify-between">
                          <span className="text-caption text-[#8B847E]">描述</span>
                          <span className="text-small text-[#383431] max-w-[200px] text-right">{description}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#F0F5F0] rounded-xl p-4 flex items-start gap-3">
                  <Check size={18} className="text-[#5B8C5A] shrink-0 mt-0.5" />
                  <p className="text-caption text-[#5B8C5A]">
                    创建后，系统将自动为你初始化项目结构，并跳转到剧本编辑器。
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DEDBD8] flex justify-between shrink-0">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="h-10 px-5 rounded-lg border border-[#DEDBD8] text-small font-medium text-[#524D48] hover:bg-[#F8F7F6] transition-colors"
          >
            {step === 1 ? '取消' : '上一步'}
          </button>
          {step < 3 ? (
            <motion.button
              onClick={handleNext}
              whileTap={{ scale: 0.97 }}
              className="h-10 px-5 rounded-lg bg-[#A8835F] text-small font-medium text-white hover:bg-[#8E6A48] transition-colors"
            >
              下一步
            </motion.button>
          ) : (
            <motion.button
              onClick={handleCreate}
              disabled={creating}
              whileTap={{ scale: 0.97 }}
              className="h-10 px-5 rounded-lg bg-[#A8835F] text-small font-medium text-white hover:bg-[#8E6A48] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating ? '创建中...' : '创建项目'}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Sort Dropdown ─── */
function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: SortOption[] = ['最近编辑', '创建时间', '进度'];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-9 px-3 rounded-lg border border-[#DEDBD8] text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors flex items-center gap-2"
      >
        <ArrowUpDown size={14} />
        <span>{value}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-[#DEDBD8] py-1 z-floating"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-small transition-colors ${
                  opt === value
                    ? 'text-[#755235] bg-[#FBF7F4] font-medium'
                    : 'text-[#524D48] hover:bg-[#F8F7F6]'
                }`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════ */
export default function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const addProject = useAppStore((s) => s.addProject);
  const removeProject = useAppStore((s) => s.removeProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const navigate = useNavigate();

  const [filterTab, setFilterTab] = useState<FilterTab>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('最近编辑');
  const [showNewProject, setShowNewProject] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ─── 从后端 API 加载项目列表 ─── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGetProjects();
        if (cancelled) return;
        // 清空 store 中的 mock 数据，替换为 API 数据
        const apiProjects: Project[] = data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          type: ((p.type as string) || '漫剧') as ProjectType,
          status: '草稿',
          progress: 0,
          currentEpisode: 1,
          totalEpisodes: (p.episodes as number) || 8,
          lastEdited: p.updated_at
            ? new Date(p.updated_at as string).toLocaleDateString('zh-CN')
            : '未知',
          thumbnail: (p.type as string) === '短剧' ? '/project-placeholder-2.jpg' : '/project-placeholder-1.jpg',
        }));
        // 批量替换 store 中的 projects
        useAppStore.setState({ projects: apiProjects });
      } catch {
        // API 不可用时保留 mock 数据
        console.warn('加载项目列表失败，使用本地 mock 数据');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Confirm dialog state */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmProjectId, setConfirmProjectId] = useState<string | null>(null);
  const [confirmProjectName, setConfirmProjectName] = useState('');

  /* Rename state */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  /* ─── Computed Stats ─── */
  const stats = useMemo(() => ({
    total: projects.length,
    inProgress: projects.filter((p) => p.status === '进行中' || p.status === '生成中').length,
    completed: projects.filter((p) => p.status === '已完成').length,
  }), [projects]);

  /* ─── Filtered Projects ─── */
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Tab filter
    if (filterTab === '漫剧' || filterTab === '短剧') {
      result = result.filter((p) => p.type === filterTab);
    } else if (filterTab === '草稿') {
      result = result.filter((p) => p.status === '草稿');
    } else if (filterTab === '进行中') {
      result = result.filter((p) => p.status === '进行中' || p.status === '生成中');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.includes(q) ||
          (p.skillName && p.skillName.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortOption === '进度') {
      result.sort((a, b) => b.progress - a.progress);
    } else if (sortOption === '创建时间') {
      result.sort((a, b) => Number(b.id) - Number(a.id));
    }
    // '最近编辑' keeps default order

    return result;
  }, [projects, filterTab, searchQuery, sortOption]);

  /* ─── Keyboard Shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowNewProject(true);
      }

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ─── Handlers ─── */
  const handleDeleteProject = useCallback((id: string, name: string) => {
    setConfirmProjectId(id);
    setConfirmProjectName(name);
    setConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (confirmProjectId) {
      try {
        await apiDeleteProject(confirmProjectId);
        removeProject(confirmProjectId);
        toast.success('项目已删除');
      } catch {
        toast.error('删除项目失败');
      } finally {
        setConfirmProjectId(null);
      }
    }
  }, [confirmProjectId, removeProject]);

  const handleRename = useCallback((project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  }, []);

  const submitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      toast.success('项目名称已更新');
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue]);

  const clearFilters = useCallback(() => {
    setFilterTab('全部');
    setSearchQuery('');
  }, []);

  const tabs: FilterTab[] = ['全部', '漫剧', '短剧', '草稿', '进行中'];

  return (
    <div className="px-6 py-5 max-w-[1280px] mx-auto">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        className="mb-6"
      >
        <h1 className="text-h1 mb-1">项目工作台</h1>
        <p className="text-body text-[#6E6862]">管理和创作你的AI漫剧/短剧项目</p>
      </motion.div>

      {/* ─── Stats ─── */}
      <div className="flex gap-3 mb-6">
        <StatCard label="全部项目" value={stats.total} delay={0} />
        <StatCard label="进行中" value={stats.inProgress} delay={0.08} />
        <StatCard label="已完成" value={stats.completed} delay={0.16} />
      </div>

      {/* ─── Toolbar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        className="flex flex-col gap-4 mb-5"
      >
        {/* Top row: Search + New project */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[360px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A39E]" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目... (按 / 聚焦)"
              className="w-full h-10 pl-9 pr-8 bg-white border border-[#DEDBD8] rounded-lg text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A39E] hover:text-[#6E6862]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <SortDropdown value={sortOption} onChange={setSortOption} />

          <div className="flex items-center border border-[#DEDBD8] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-9 px-2.5 flex items-center justify-center transition-colors ${
                viewMode === 'grid' ? 'bg-[#FBF7F4] text-[#755235]' : 'text-[#A8A39E] hover:text-[#6E6862]'
              }`}
              title="网格视图"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-9 px-2.5 flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-[#FBF7F4] text-[#755235]' : 'text-[#A8A39E] hover:text-[#6E6862]'
              }`}
              title="列表视图"
            >
              <List size={16} />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewProject(true)}
            className="h-10 px-4 bg-[#A8835F] hover:bg-[#8E6A48] text-white rounded-lg text-small font-medium transition-colors flex items-center gap-2 ml-auto"
          >
            <Plus size={16} />
            新建项目
            <span className="hidden md:inline text-[11px] text-white/60 ml-1">(N)</span>
          </motion.button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const count =
              tab === '全部'
                ? projects.length
                : tab === '草稿'
                  ? projects.filter((p) => p.status === '草稿').length
                  : tab === '进行中'
                    ? projects.filter((p) => p.status === '进行中' || p.status === '生成中').length
                    : projects.filter((p) => p.type === tab).length;

            return (
              <motion.button
                key={tab}
                onClick={() => setFilterTab(tab)}
                whileTap={{ scale: 0.95 }}
                className={`relative h-9 px-4 rounded-lg text-small font-medium transition-all ${
                  filterTab === tab
                    ? 'text-[#755235]'
                    : 'text-[#6E6862] hover:text-[#383431] hover:bg-[#F8F7F6]'
                }`}
              >
                {filterTab === tab && (
                  <motion.div
                    layoutId="filter-tab-bg"
                    className="absolute inset-0 bg-[#FBF7F4] border border-[#EAD8C8] rounded-lg"
                    transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab}
                  <span
                    className={`text-caption ${
                      filterTab === tab ? 'text-[#A8835F]' : 'text-[#A8A39E]'
                    }`}
                  >
                    {count}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Project List ─── */}
      <AnimatePresence mode="wait">
        {filteredProjects.length > 0 ? (
          <motion.div
            key={`${viewMode}-${filterTab}-${searchQuery}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    viewMode={viewMode}
                    onNavigate={() => {
                      setSelectedProject(project.id);
                      navigate('/script');
                    }}
                    onDelete={() => handleDeleteProject(project.id, project.name)}
                    onRename={() => handleRename(project)}
                    onDuplicate={() => toast.success(`已复制项目「${project.name}」`)}
                    onExport={() => toast.info(`导出项目「${project.name}」`)}
                    isRenaming={renamingId === project.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={submitRename}
                    onRenameCancel={() => {
                      setRenamingId(null);
                      setRenameValue('');
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#DEDBD8] shadow-sm overflow-hidden">
                {/* List header */}
                <div className="h-10 flex items-center px-4 bg-[#F8F7F6] border-b border-[#EFEDEB] text-caption text-[#8B847E] font-medium">
                  <span className="flex-1 min-w-0">项目名称</span>
                  <span className="w-20 text-center">类型</span>
                  <span className="w-24 text-center">状态</span>
                  <span className="w-28 text-center">进度</span>
                  <span className="w-28 text-center">最后编辑</span>
                  <span className="w-12" />
                </div>
                {filteredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    viewMode={viewMode}
                    onNavigate={() => {
                      setSelectedProject(project.id);
                      navigate('/script');
                    }}
                    onDelete={() => handleDeleteProject(project.id, project.name)}
                    onRename={() => handleRename(project)}
                    onDuplicate={() => toast.success(`已复制项目「${project.name}」`)}
                    onExport={() => toast.info(`导出项目「${project.name}」`)}
                    isRenaming={renamingId === project.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={submitRename}
                    onRenameCancel={() => {
                      setRenamingId(null);
                      setRenameValue('');
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <EmptyState onClearFilters={clearFilters} onCreate={() => setShowNewProject(true)} />
        )}
      </AnimatePresence>

      {/* ─── New Project Modal ─── */}
      <AnimatePresence>
        {showNewProject && (
          <NewProjectModal onClose={() => setShowNewProject(false)} />
        )}
      </AnimatePresence>

      {/* ─── Confirm Delete Dialog ─── */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmProjectId(null);
        }}
        onConfirm={confirmDelete}
        title="删除项目"
        description={`确定要删除「${confirmProjectName}」吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        confirmVariant="danger"
      />
    </div>
  );
}
