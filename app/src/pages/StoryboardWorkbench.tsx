import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Film, Play, Sparkles, Download, Loader2 } from 'lucide-react';
import TimelineStrip from './storyboard/TimelineStrip';
import ShotList from './storyboard/ShotList';
import FrameEditor from './storyboard/FrameEditor';
import Toolbar from './storyboard/Toolbar';
import { getTotalDuration } from './storyboard/mockData';
import type { Shot, ShotFilter, ViewMode } from './storyboard/types';
import { normalizeShotStatus, normalizeShotType } from './storyboard/types';
import { toastSuccess, toastInfo } from '@/hooks/useToast';
import { useAppStore } from '@/store/useAppStore';
import ProjectSelector from '@/components/ProjectSelector';
import {
  getShots as apiGetShots,
  createShot as apiCreateShot,
  updateShot as apiUpdateShot,
  deleteShot as apiDeleteShot,
  chatStream,
  generateShotVideo,
  type ShotData,
} from '@/lib/api';

/** 后端 ShotData → 前端 Shot 转换 */
function toFrontendShot(s: ShotData): Shot {
  return {
    id: s.id,
    shotNumber: s.shot_number,
    shotType: normalizeShotType(s.shot_type),
    duration: s.duration,
    status: normalizeShotStatus(s.status),
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
  const [playDialogOpen, setPlayDialogOpen] = useState(false);

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
        console.error('[StoryboardWorkbench] 加载失败:', err);
        setShots([]);
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
        toastInfo('复制分镜失败，请重试');
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

  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAIGenerateShot = useCallback(async () => {
    setAiGenerating(true);
    try {
      let aiContent = '';
      await chatStream(
        [{ role: 'user', content: '你是一个专业的分镜师。请生成一组分镜（5-8个镜头），用以下JSON数组格式回复（只回复JSON）：\n[{"shot_number":1,"shot_type":"全景/中景/近景/特写","duration":5,"description":"镜头描述","camera_movement":"固定/推/拉/摇/移","composition":"中心构图/三分法/对称构图","lighting":"自然光/逆光/侧光","character_action":"角色动作","dialogue":"台词","characters":["角色名"]}]' }],
        (chunk) => {
          if (chunk.type === 'content') aiContent += chunk.data;
        },
        'mimo'
      );

      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        for (const item of data) {
          const newShotData = {
            project_id: selectedProjectId || 'default',
            shot_number: shots.length + 1,
            shot_type: item.shot_type || '中景',
            duration: item.duration || 5,
            status: '草稿',
            description: item.description || '',
            camera_movement: item.camera_movement || '固定',
            composition: item.composition || '中心构图',
            lighting: item.lighting || '自然光',
            character_action: item.character_action || '',
            dialogue: item.dialogue || '',
            scene_ref: '',
            characters: item.characters || [],
          };
          try {
            const saved = await apiCreateShot(newShotData);
            setShots((prev) => [...prev, toFrontendShot(saved)]);
          } catch {
            // 乐观添加
            setShots((prev) => [...prev, {
              id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              shotNumber: prev.length + 1,
              shotType: item.shot_type || '中景',
              duration: item.duration || 5,
              status: '草稿',
              description: item.description || '',
              cameraMovement: item.camera_movement || '固定',
              composition: item.composition || '中心构图',
              lighting: item.lighting || '自然光',
              characterAction: item.character_action || '',
              dialogue: item.dialogue || '',
              sceneRef: '',
              characters: item.characters || [],
            }]);
          }
        }
        toastSuccess(`AI 已生成 ${data.length} 个分镜`);
      }
    } catch (err) {
      console.error('[StoryboardWorkbench] AI 生成失败:', err);
      toastInfo('AI 生成失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  }, [selectedProjectId, shots.length]);

  const handleBatchGenerate = useCallback(async (ids: string[]) => {
    setGenerating(true);
    setGenerationProgress(0);

    let completed = 0;
    const total = ids.length;

    // 先将所有选中分镜状态设为「生成中」
    setShots((prev) =>
      prev.map((s) =>
        ids.includes(s.id) ? { ...s, status: '生成中' as const } : s
      )
    );

    for (const id of ids) {
      try {
        await generateShotVideo(id);
        setShots((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: '已完成' as const } : s))
        );
      } catch (err) {
        console.error('[StoryboardWorkbench] 生成失败:', err);
        setShots((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: '失败' as const } : s))
        );
      }
      completed++;
      setGenerationProgress(Math.round((completed / total) * 100));
    }

    setGenerating(false);
    setGenerationProgress(0);
    const successCount = ids.length;
    toastSuccess(`批量生成完成，共处理 ${successCount} 个分镜`);
    setSelectedIds([]);
    setBatchMode(false);
  }, []);

  const handleBatchDelete = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => apiDeleteShot(id)));
      setShots((prev) => {
        const filtered = prev.filter((s) => !ids.includes(s.id));
        return filtered.map((s, i) => ({ ...s, shotNumber: i + 1 }));
      });
      setSelectedIds([]);
      setBatchMode(false);
      toastSuccess(`已删除 ${ids.length} 个分镜`);
    } catch (err) {
      console.error('[StoryboardWorkbench] 批量删除失败:', err);
      toastInfo('批量删除失败');
    }
  }, []);

  const handleRegenerateShot = useCallback(async (id: string) => {
    handleUpdateShot(id, { status: '生成中' });
    try {
      await generateShotVideo(id);
      handleUpdateShot(id, { status: '已完成' });
      toastSuccess('重新生成完成');
    } catch (err) {
      console.error('[StoryboardWorkbench] 重新生成失败:', err);
      handleUpdateShot(id, { status: '失败' });
      toastInfo('重新生成失败，请重试');
    }
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
              <ProjectSelector />
              <span className="mx-1.5 text-[#C5C1BC]">/</span>
              <span className="text-[#524D48] font-medium">分镜工作台</span>
            </nav>
            <div className="flex items-center ml-2">
              <button
                onClick={() => toastInfo('请先在剧本编辑器中选择集数')}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#524D48] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => toastInfo('请先在剧本编辑器中选择集数')}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F8F7F6] text-[#A8A39E] hover:text-[#524D48] transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Right: header actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAIGenerateShot}
              disabled={aiGenerating}
              className="h-7 px-3 bg-[#A8835F] hover:bg-[#8E6A48] rounded-lg text-white text-[12px] flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              AI 生成分镜
            </button>
            <button
              onClick={() => setPlayDialogOpen(true)}
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
              onClick={() => {
                const data = JSON.stringify(shots, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `storyboard_${selectedProjectId || 'export'}_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toastSuccess('分镜数据已导出为 JSON 文件');
              }}
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

        {/* Play dialog */}
        {playDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPlayDialogOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-[420px] max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[15px] font-semibold text-[#524D48] mb-3">播放分镜预览</h3>
              {(() => {
                const pendingShots = shots.filter(s => s.status !== '已完成');
                if (pendingShots.length === 0) {
                  return (
                    <div className="text-[13px] text-[#8B847E] mb-4">
                      所有分镜已生成完毕，但视频播放功能尚未实现。敬请期待后续版本！
                    </div>
                  );
                }
                return (
                  <>
                    <div className="text-[13px] text-[#8B847E] mb-3">
                      以下分镜尚未完成生成，无法播放预览。请先生成所有分镜后再试：
                    </div>
                    <ul className="space-y-1 mb-4 max-h-[240px] overflow-auto">
                      {pendingShots.map(s => (
                        <li key={s.id} className="flex items-center justify-between text-[12px] px-3 py-1.5 rounded bg-[#F8F7F6]">
                          <span className="text-[#524D48]">镜头 {s.shotNumber}：{s.description?.slice(0, 30) || '无描述'}</span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded ${s.status === '生成中' ? 'bg-amber-100 text-amber-700' : s.status === '失败' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                );
              })()}
              <div className="flex justify-end">
                <button onClick={() => setPlayDialogOpen(false)} className="h-7 px-4 bg-[#A8835F] hover:bg-[#8E6A48] rounded-lg text-white text-[12px] transition-colors">知道了</button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
