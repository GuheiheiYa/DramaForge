import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Film, Play, Sparkles, Download } from 'lucide-react';
import { Toaster } from 'sonner';
import TimelineStrip from './storyboard/TimelineStrip';
import ShotList from './storyboard/ShotList';
import FrameEditor from './storyboard/FrameEditor';
import Toolbar from './storyboard/Toolbar';
import { mockShots, getTotalDuration } from './storyboard/mockData';
import type { Shot, ShotFilter, ViewMode } from './storyboard/types';
import { toastSuccess, toastInfo } from '@/hooks/useToast';
import { useAppStore } from '@/store/useAppStore';
import {
  getShots as apiGetShots,
  createShot as apiCreateShot,
  updateShot as apiUpdateShot,
  deleteShot as apiDeleteShot,
  type ShotData,
} from '@/lib/api';

/** 后端 ShotData → 前端 Shot 转换 */
function toFrontendShot(s: ShotData): Shot {
  return {
    id: s.id,
    shotNumber: s.shot_number,
    shotType: s.shot_type as Shot['shotType'],
    duration: s.duration,
    status: s.status as Shot['status'],
    description: s.description,
    cameraMovement: s.camera_movement,
    composition: s.composition,
    lighting: s.lighting,
    characterAction: s.character_action,
    dialogue: s.dialogue,
    sceneRef: s.scene_ref,
    characters: s.characters,
  };
}

/** 前端 Shot → 后端 API 请求体 */
function toApiShot(s: Shot, projectId: string = 'default') {
  return {
    project_id: projectId,
    shot_number: s.shotNumber,
    shot_type: s.shotType,
    duration: s.duration,
    status: s.status,
    description: s.description,
    camera_movement: s.cameraMovement,
    composition: s.composition,
    lighting: s.lighting,
    character_action: s.characterAction,
    dialogue: s.dialogue,
    scene_ref: s.sceneRef,
    characters: s.characters,
  };
}

export default function StoryboardWorkbench() {
  const navigate = useNavigate();
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShotFilter>('全部');
  const [viewMode, setViewMode] = useState<ViewMode>('列表视图');
  const [shotListCollapsed, setShotListCollapsed] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // 从后端加载分镜数据（按项目过滤）
  useEffect(() => {
    apiGetShots(selectedProjectId || undefined)
      .then((data) => {
        const frontendShots = data.map(toFrontendShot);
        setShots(frontendShots);
        if (frontendShots.length > 0) setSelectedShotId(frontendShots[0].id);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[StoryboardWorkbench] 加载失败，使用 mock 数据:', err);
        setShots(mockShots);
        if (mockShots.length > 0) setSelectedShotId(mockShots[0].id);
        setLoading(false);
      });
  }, [selectedProjectId]);

  const selectedShot = useMemo(
    () => shots.find((s) => s.id === selectedShotId) ?? null,
    [shots, selectedShotId]
  );

  const totalDuration = useMemo(() => getTotalDuration(shots), [shots]);

  const handleSelectShot = useCallback((id: string) => {
    if (batchMode) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
      );
    } else {
      setSelectedShotId(id);
    }
  }, [batchMode]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedShotId) return;
    const idx = shots.findIndex((s) => s.id === selectedShotId);
    if (direction === 'prev' && idx > 0) {
      setSelectedShotId(shots[idx - 1].id);
    } else if (direction === 'next' && idx < shots.length - 1) {
      setSelectedShotId(shots[idx + 1].id);
    }
  }, [selectedShotId, shots]);

  const handleUpdateShot = useCallback((id: string, updates: Partial<Shot>) => {
    // 乐观更新
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    // 同步到后端
    const apiUpdates: Record<string, unknown> = {};
    if (updates.shotNumber !== undefined) apiUpdates.shot_number = updates.shotNumber;
    if (updates.shotType !== undefined) apiUpdates.shot_type = updates.shotType;
    if (updates.duration !== undefined) apiUpdates.duration = updates.duration;
    if (updates.status !== undefined) apiUpdates.status = updates.status;
    if (updates.description !== undefined) apiUpdates.description = updates.description;
    if (updates.cameraMovement !== undefined) apiUpdates.camera_movement = updates.cameraMovement;
    if (updates.composition !== undefined) apiUpdates.composition = updates.composition;
    if (updates.lighting !== undefined) apiUpdates.lighting = updates.lighting;
    if (updates.characterAction !== undefined) apiUpdates.character_action = updates.characterAction;
    if (updates.dialogue !== undefined) apiUpdates.dialogue = updates.dialogue;
    if (updates.sceneRef !== undefined) apiUpdates.scene_ref = updates.sceneRef;
    if (updates.characters !== undefined) apiUpdates.characters = updates.characters;
    apiUpdateShot(id, apiUpdates).catch((err) =>
      console.error('[StoryboardWorkbench] 更新失败:', err)
    );
  }, []);

  const handleDeleteShot = useCallback((id: string) => {
    apiDeleteShot(id).catch((err) =>
      console.error('[StoryboardWorkbench] 删除失败:', err)
    );
    setShots((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (selectedShotId === id && filtered.length > 0) {
        const deletedIndex = prev.findIndex((s) => s.id === id);
        const nextIndex = Math.min(deletedIndex, filtered.length - 1);
        setSelectedShotId(filtered[nextIndex]?.id ?? null);
      }
      return filtered.map((s, i) => ({ ...s, shotNumber: i + 1 }));
    });
  }, [selectedShotId]);

  const handleDuplicateShot = useCallback((shot: Shot) => {
    const newShotData = {
      ...toApiShot(shot, selectedProjectId || 'default'),
      shot_number: shot.shotNumber + 1,
      status: '草稿',
    };
    apiCreateShot(newShotData)
      .then((saved) => {
        const frontendShot = toFrontendShot(saved);
        setShots((prev) => {
          const index = prev.findIndex((s) => s.id === shot.id);
          const newShots = [...prev];
          newShots.splice(index + 1, 0, frontendShot);
          return newShots.map((s, i) => ({ ...s, shotNumber: i + 1 }));
        });
        toastSuccess('分镜已复制');
      })
      .catch((err) => {
        console.error('[StoryboardWorkbench] 复制失败:', err);
        // 乐观更新
        setShots((prev) => {
          const index = prev.findIndex((s) => s.id === shot.id);
          const newShot: Shot = { ...shot, id: `dup_${Date.now()}`, shotNumber: shot.shotNumber + 1, status: '草稿' };
          const newShots = [...prev];
          newShots.splice(index + 1, 0, newShot);
          return newShots.map((s, i) => ({ ...s, shotNumber: i + 1 }));
        });
        toastSuccess('分镜已复制');
      });
  }, [selectedProjectId]);

  const handleAddShot = useCallback(() => {
    const newShotData = {
      project_id: selectedProjectId || 'default',
      shot_number: shots.length + 1,
      shot_type: '中景',
      duration: 5,
      status: '草稿',
      description: '新分镜，请添加描述...',
      camera_movement: '固定',
      composition: '中心构图',
      lighting: '自然光',
      character_action: '',
      dialogue: '',
      scene_ref: '',
      characters: [],
    };
    apiCreateShot(newShotData)
      .then((saved) => {
        const frontendShot = toFrontendShot(saved);
        setShots((prev) => [...prev, frontendShot]);
        setSelectedShotId(frontendShot.id);
        toastSuccess('新分镜已添加');
      })
      .catch((err) => {
        console.error('[StoryboardWorkbench] 添加失败:', err);
        // 乐观更新
        const fallbackShot: Shot = {
          id: `new_${Date.now()}`,
          shotNumber: shots.length + 1,
          shotType: '中景',
          duration: 5,
          status: '草稿',
          description: '新分镜，请添加描述...',
          cameraMovement: '固定',
          composition: '中心构图',
          lighting: '自然光',
          characterAction: '',
          dialogue: '',
          sceneRef: '',
          characters: [],
        };
        setShots((prev) => [...prev, fallbackShot]);
        setSelectedShotId(fallbackShot.id);
        toastSuccess('新分镜已添加');
      });
  }, [shots.length, selectedProjectId]);

  const handleBatchGenerate = useCallback((ids: string[]) => {
    setGenerating(true);
    setGenerationProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setGenerationProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setGenerating(false);
        setGenerationProgress(0);
        // Update all selected shots to completed
        setShots((prev) =>
          prev.map((s) =>
            ids.includes(s.id) ? { ...s, status: '已完成' as const } : s
          )
        );
        toastSuccess(`已完成 ${ids.length} 个分镜的批量生成`);
        setSelectedIds([]);
        setBatchMode(false);
      }
    }, 300);
  }, []);

  const handleBatchDelete = useCallback((ids: string[]) => {
    setShots((prev) => {
      const filtered = prev.filter((s) => !ids.includes(s.id));
      return filtered.map((s, i) => ({ ...s, shotNumber: i + 1 }));
    });
    setSelectedIds([]);
    setBatchMode(false);
  }, []);

  const handleRegenerateShot = useCallback((id: string) => {
    handleUpdateShot(id, { status: '生成中' });
    setTimeout(() => {
      handleUpdateShot(id, { status: '已完成' });
      toastSuccess('重新生成完成');
    }, 3000);
  }, [handleUpdateShot]);

  const handleToggleBatchMode = useCallback(() => {
    setBatchMode((m) => {
      if (m) setSelectedIds([]); // clear selection when exiting
      return !m;
    });
  }, []);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <motion.div
        className="h-[calc(100dvh-52px)] flex flex-col bg-[#FBF7F4] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      >
        {/* Top info bar */}
        <div className="h-12 bg-white border-b border-[#DEDBD8] flex items-center justify-between px-4 shrink-0">
          {/* Breadcrumb + episode nav */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center text-[13px]">
              <button onClick={() => navigate('/')} className="text-[#A8A39E] hover:text-[#6E6862] transition-colors">首页</button>
              <span className="mx-1.5 text-[#C5C1BC]">/</span>
              <button onClick={() => navigate('/')} className="text-[#6E6862] hover:text-[#524D48] transition-colors">《樱花下的约定》</button>
              <span className="mx-1.5 text-[#C5C1BC]">/</span>
              <span className="text-[#524D48] font-medium">分镜工作台</span>
            </nav>
            <div className="flex items-center ml-2">
              <button
                onClick={() => toastInfo('切换到上一集')}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#524D48] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => toastInfo('切换到下一集')}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#524D48] transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Right: header actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => toastSuccess('开始播放分镜预览...')}
              className="h-7 px-3 border border-[#DEDBD8] hover:border-[#A8835F] rounded-lg text-[#524D48] hover:text-[#755235] text-[12px] flex items-center gap-1.5 transition-colors"
            >
              <Play size={13} />
              播放分镜
            </button>
            <button
              onClick={() => {
                const waiting = shots.filter(s => s.status === '等待中' || s.status === '失败');
                if (waiting.length > 0) {
                  toastSuccess(`开始批量生成 ${waiting.length} 个分镜...`);
                } else {
                  toastInfo('所有分镜已生成完毕');
                }
              }}
              className="h-7 px-3 border border-[#DEDBD8] hover:border-[#A8835F] rounded-lg text-[#524D48] hover:text-[#755235] text-[12px] flex items-center gap-1.5 transition-colors"
            >
              <Sparkles size={13} />
              批量生成
            </button>
            <button
              onClick={() => toastSuccess('正在导出分镜图...')}
              className="h-7 px-3 border border-[#DEDBD8] hover:border-[#A8835F] rounded-lg text-[#524D48] hover:text-[#755235] text-[12px] flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} />
              导出分镜图
            </button>
            <div className="w-px h-5 bg-[#DEDBD8] mx-1" />
            <div className="flex items-center gap-1.5">
              <Film size={14} className="text-[#A8835F]" />
              <span className="text-[12px] text-[#8B847E]">
                {shots.length}个分镜 · {formatDuration(totalDuration)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline strip */}
        <TimelineStrip
          shots={shots}
          selectedShotId={selectedShotId}
          onSelectShot={handleSelectShot}
          onDuplicateShot={handleDuplicateShot}
          onDeleteShot={handleDeleteShot}
          onRegenerateShot={handleRegenerateShot}
        />

        {/* Main workspace */}
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
          {/* Left: Shot list */}
          <ShotList
            shots={shots}
            selectedShotId={selectedShotId}
            onSelectShot={handleSelectShot}
            filter={filter}
            onFilterChange={setFilter}
            collapsed={shotListCollapsed}
            onToggleCollapse={() => setShotListCollapsed((c) => !c)}
            onDeleteShot={handleDeleteShot}
            onDuplicateShot={handleDuplicateShot}
            onAddShot={handleAddShot}
            onUpdateShot={handleUpdateShot}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={(id) => {
              setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
              );
            }}
          />

          {/* Center: Frame editor */}
          <FrameEditor
            shot={selectedShot}
            shots={shots}
            onNavigate={handleNavigate}
            onUpdateShot={handleUpdateShot}
            onDeleteShot={handleDeleteShot}
          />
        </div>

        {/* Bottom toolbar */}
        <Toolbar
          shots={shots}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          batchMode={batchMode}
          onToggleBatchMode={handleToggleBatchMode}
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
          onBatchGenerate={handleBatchGenerate}
          onBatchDelete={handleBatchDelete}
          onAddShot={handleAddShot}
          generating={generating}
          generationProgress={generationProgress}
        />
      </motion.div>
    </>
  );
}
