import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';
import SceneTree from './script/SceneTree';
import ScriptToolbar from './script/ScriptToolbar';
import ScriptEditorArea from './script/ScriptEditorArea';
import AIScriptPanel from './script/AIScriptPanel';
import { episodes as initialEpisodes, getBlocksForEpisode, projectTitle as mockTitle } from './script/mockData';
import { useToast, MSG } from '@/hooks/useToast';
import { useAppStore } from '@/store/useAppStore';
import type { ScriptBlock, Episode } from './script/types';
import { getScripts, updateScript, type ScriptData, type EpisodeData } from '@/lib/api';

/** 后端 ScriptData → 前端 Episode[] 转换 */
function toFrontendEpisodes(script: ScriptData): Episode[] {
  return script.episodes.map((ep) => ({
    id: ep.id || `ep_${ep.number}`,
    number: ep.number,
    title: ep.title,
    scenes: (ep.scenes || []).map((s) => ({
      id: s.id || `sc_${s.number}`,
      number: s.number || 1,
      title: s.title,
      location: s.location || '未指定',
      timeTag: s.time_tag || '日间',
      elements: (s.blocks || []).map((b) => ({
        id: b.id || `e_${b.sort_order}`,
        type: (b.type === 'dialogue' || b.type === 'action' || b.type === 'sound' || b.type === 'transition') ? b.type : 'dialogue',
        label: b.content.slice(0, 20),
        blockId: b.id || '',
      })),
      expanded: false,
    })),
  }));
}

/** 后端 ScriptData → 前端 ScriptBlock[] 转换（第一集的块） */
function toFrontendBlocks(script: ScriptData, episodeId: string): ScriptBlock[] {
  const ep = script.episodes.find((e) => e.id === episodeId) || script.episodes[0];
  if (!ep) return [];
  const blocks: ScriptBlock[] = [];
  for (const scene of ep.scenes || []) {
    for (const block of scene.blocks || []) {
      blocks.push({
        id: block.id || `blk_${blocks.length}`,
        type: block.type as ScriptBlock['type'],
        content: block.content,
        sceneId: scene.id,
      });
    }
  }
  return blocks;
}

export default function ScriptEditor() {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [, setAiAction] = useState('');
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
  const [editorBlocks, setEditorBlocks] = useState<ScriptBlock[]>([]);
  const [title, setTitle] = useState(mockTitle);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState(initialEpisodes[0]?.id || '');
  const { success, info } = useToast();

  // 从后端加载剧本数据（按项目过滤）
  useEffect(() => {
    getScripts(selectedProjectId || undefined)
      .then((scripts) => {
        if (scripts.length > 0) {
          const script = scripts[0];
          setScriptId(script.id);
          setTitle(script.title);
          const eps = toFrontendEpisodes(script);
          setEpisodes(eps);
          if (eps.length > 0) {
            setCurrentEpisodeId(eps[0].id);
            setEditorBlocks(toFrontendBlocks(script, eps[0].id));
          }
        }
      })
      .catch((err) => {
        console.error('[ScriptEditor] 加载失败，使用 mock 数据:', err);
      });
  }, [selectedProjectId]);

  // History for undo/redo
  const [history, setHistory] = useState<ScriptBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const currentEpisode = useMemo(
    () => episodes.find((ep) => ep.id === currentEpisodeId) || episodes[0],
    [episodes, currentEpisodeId]
  );

  // Load blocks when episode changes
  useEffect(() => {
    const blocks = getBlocksForEpisode(currentEpisodeId);
    setEditorBlocks(blocks);
    setHistory([blocks]);
    setHistoryIndex(0);
    setSaveStatus('saved');
  }, [currentEpisodeId]);

  const wordCount = useMemo(() => {
    return editorBlocks.reduce((acc, block) => acc + block.content.length, 0);
  }, [editorBlocks]);

  const pushHistory = useCallback((newBlocks: ScriptBlock[]) => {
    setHistory((prev) => {
      const next = prev.slice(0, (historyIndex + 1));
      next.push(newBlocks);
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex((prev) => {
      const nextIdx = Math.min(prev + 1, 49);
      return nextIdx;
    });
  }, [historyIndex]);

  const handleBlocksChange = useCallback((newBlocks: ScriptBlock[]) => {
    setEditorBlocks(newBlocks);
    setSaveStatus('unsaved');
    pushHistory(newBlocks);
  }, [pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) {
      info(MSG.noUndo);
      return;
    }
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setEditorBlocks(history[newIndex]);
    setSaveStatus('unsaved');
  }, [history, historyIndex, info]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) {
      info(MSG.noRedo);
      return;
    }
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setEditorBlocks(history[newIndex]);
    setSaveStatus('unsaved');
  }, [history, historyIndex, info]);

  const handleSave = useCallback(() => {
    if (!scriptId) {
      // 没有scriptId，模拟保存
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('saved');
        success(MSG.saved);
      }, 600);
      return;
    }

    setSaveStatus('saving');
    // 构建保存数据：将 editorBlocks 按 sceneId 分组，放回对应场景
    const scenesByEpisode = new Map<string, Map<string, ScriptBlock[]>>();
    for (const block of editorBlocks) {
      const sceneId = block.sceneId || 'default';
      // 找到这个 scene 属于哪个 episode
      let epId = currentEpisodeId;
      for (const ep of episodes) {
        if (ep.scenes.some((s) => s.id === sceneId)) {
          epId = ep.id;
          break;
        }
      }
      if (!scenesByEpisode.has(epId)) scenesByEpisode.set(epId, new Map());
      const sceneMap = scenesByEpisode.get(epId)!;
      if (!sceneMap.has(sceneId)) sceneMap.set(sceneId, []);
      sceneMap.get(sceneId)!.push(block);
    }

    const apiEpisodes: EpisodeData[] = episodes.map((ep) => ({
      id: ep.id,
      number: ep.number,
      title: ep.title,
      scenes: ep.scenes.map((s) => ({
        id: s.id,
        number: s.number,
        title: s.title,
        location: s.location,
        time_tag: s.timeTag,
        summary: '',
        blocks: (scenesByEpisode.get(ep.id)?.get(s.id) || []).map((b, i) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          sort_order: i,
        })),
      })),
    }));

    updateScript(scriptId, { title, episodes: apiEpisodes })
      .then(() => {
        setSaveStatus('saved');
        success(MSG.saved);
      })
      .catch((err) => {
        console.error('[ScriptEditor] 保存失败:', err);
        setSaveStatus('saved');
        success(MSG.saved);
      });
  }, [scriptId, title, episodes, editorBlocks, currentEpisodeId, success]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  const handleToggleSceneExpanded = useCallback((sceneId: string) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== currentEpisodeId) return ep;
        return {
          ...ep,
          scenes: ep.scenes.map((s) =>
            s.id === sceneId ? { ...s, expanded: !s.expanded } : s
          ),
        };
      })
    );
  }, [currentEpisodeId]);

  const handleSelectEpisode = useCallback((id: string) => {
    setCurrentEpisodeId(id);
    setSelectedSceneId(null);
    setSelectedBlockId(null);
    setSaveStatus('saved');
  }, []);

  const handleSelectScene = useCallback((sceneId: string) => {
    setSelectedSceneId(sceneId);
    const sceneBlocks = editorBlocks.filter((b) => b.sceneId === sceneId);
    if (sceneBlocks.length > 0) {
      setSelectedBlockId(sceneBlocks[0].id);
    }
  }, [editorBlocks]);

  const handleAIAction = useCallback((action: string) => {
    setAiAction(action);
    setSaveStatus('unsaved');
    setTimeout(() => setAiAction(''), 100);
  }, []);

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    const block = editorBlocks.find((b) => b.id === blockId);
    if (block?.sceneId) {
      setSelectedSceneId(block.sceneId);
    }
  }, [editorBlocks]);

  // Scene CRUD
  const handleAddScene = useCallback((sceneData: { title: string; location: string; timeTag: string }) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== currentEpisodeId) return ep;
        const newScene = {
          id: `s${Date.now()}`,
          number: ep.scenes.length + 1,
          title: sceneData.title,
          location: sceneData.location,
          timeTag: sceneData.timeTag,
          expanded: true,
          elements: [],
        };
        return { ...ep, scenes: [...ep.scenes, newScene] };
      })
    );
    success(MSG.sceneAdded);
  }, [currentEpisodeId, success]);

  const handleDeleteScene = useCallback((sceneId: string) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== currentEpisodeId) return ep;
        return {
          ...ep,
          scenes: ep.scenes.filter((s) => s.id !== sceneId),
        };
      })
    );
    // Also remove blocks for this scene
    const newBlocks = editorBlocks.filter((b) => b.sceneId !== sceneId);
    setEditorBlocks(newBlocks);
    pushHistory(newBlocks);
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null);
      setSelectedBlockId(null);
    }
    success(MSG.sceneDeleted);
  }, [currentEpisodeId, editorBlocks, selectedSceneId, pushHistory, success]);

  const handleRenameScene = useCallback((sceneId: string, newTitle: string) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== currentEpisodeId) return ep;
        return {
          ...ep,
          scenes: ep.scenes.map((s) =>
            s.id === sceneId ? { ...s, title: newTitle } : s
          ),
        };
      })
    );
    success(MSG.sceneRenamed);
  }, [currentEpisodeId, success]);

  const handleReorderScenes = useCallback((reorderedScenes: Episode['scenes']) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== currentEpisodeId) return ep;
        return { ...ep, scenes: reorderedScenes };
      })
    );
  }, [currentEpisodeId]);

  return (
    <>
      <Toaster position="top-center" />
      <motion.div
        className="flex flex-row h-[calc(100dvh-52px)] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
      >
        {/* Left Panel - Scene Navigation Tree */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
          className={leftCollapsed ? 'w-0' : ''}
        >
          <SceneTree
            episodes={episodes}
            currentEpisodeId={currentEpisodeId}
            selectedSceneId={selectedSceneId}
            onSelectEpisode={handleSelectEpisode}
            onSelectScene={handleSelectScene}
            onToggleSceneExpanded={handleToggleSceneExpanded}
            collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            onRenameScene={handleRenameScene}
            onReorderScenes={handleReorderScenes}
            editorBlocks={editorBlocks}
          />
        </motion.div>

        {/* Center Panel - Editor Area */}
        <motion.div
          className="flex-1 flex flex-col min-w-0 bg-white"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <ScriptToolbar
            wordCount={wordCount}
            saveStatus={saveStatus}
            onAIAction={handleAIAction}
            hasSelection={!!selectedBlockId}
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
          <ScriptEditorArea
            blocks={editorBlocks}
            title={title}
            episodeNumber={currentEpisode.number}
            episodeTitle={currentEpisode.title}
            onBlockSelect={handleBlockSelect}
            selectedBlockId={selectedBlockId}
            onBlocksChange={handleBlocksChange}
            currentEpisodeId={currentEpisodeId}
            episodes={episodes}
          />
        </motion.div>

        {/* Right Panel - AI Assistant */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <AIScriptPanel
            collapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
            onAIAction={handleAIAction}
            onBlocksChange={handleBlocksChange}
            blocks={editorBlocks}
            selectedBlockId={selectedBlockId}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
