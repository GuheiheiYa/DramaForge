import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import CharacterGrid from './character/CharacterGrid';
import CharacterForm from './character/CharacterForm';
import CharacterDetailDrawer from './character/CharacterDetailDrawer';
import type { Character } from './character/types';
import { mockCharacters } from './character/mockData';
import { useToast, MSG } from '@/hooks/useToast';
import { useAppStore } from '@/store/useAppStore';
import ProjectSelector from '@/components/ProjectSelector';
import {
  getCharacters as apiGetCharacters,
  createCharacter as apiCreateCharacter,
  updateCharacter as apiUpdateCharacter,
  deleteCharacter as apiDeleteCharacter,
  chatStream,
  type CharacterData,
} from '@/lib/api';

/** 后端 CharacterData → 前端 Character 类型转换 */
function toFrontendChar(c: CharacterData): Character {
  return {
    id: c.id,
    name: c.name,
    role: c.role as Character['role'],
    gender: c.gender as Character['gender'],
    age: c.age,
    description: c.description,
    personalityTraits: c.personality_traits || [],
    appearance: c.appearance,
    costume: c.costume,
    background: c.background,
    specialSetting: c.special_setting,
    assets: c.assets.map((a) => ({ id: a.id || '', type: (a.type || '立绘') as Character['assets'][0]['type'], name: a.name || '', thumbnail: a.thumbnail || '' })),
    hasGeneratedImage: c.has_generated_image,
    avatarUrl: c.avatar_url || undefined,
    relationships: c.relationships.map((r) => ({ targetCharacterId: r.target_character_id || '', targetName: r.target_name || '', relation: r.relation || '' })),
    scenes: c.scenes || [],
    createdAt: c.created_at?.slice(0, 10) || '',
    updatedAt: c.updated_at?.slice(0, 10) || '',
  };
}

/** 前端 Character → 后端 API 请求体 */
function toApiChar(c: Character, projectId: string = 'default') {
  return {
    project_id: projectId,
    name: c.name,
    role: c.role,
    gender: c.gender,
    age: c.age,
    description: c.description,
    personality_traits: c.personalityTraits,
    appearance: c.appearance,
    costume: c.costume,
    background: c.background,
    special_setting: c.specialSetting,
    avatar_color: '#A8835F',
    avatar_url: c.avatarUrl || '',
    has_generated_image: c.hasGeneratedImage,
    assets: c.assets.map((a) => ({ id: a.id, type: a.type, name: a.name, thumbnail: a.thumbnail })),
    relationships: c.relationships.map((r) => ({ target_character_id: r.targetCharacterId, target_name: r.targetName, relation: r.relation })),
    scenes: c.scenes,
  };
}

export default function CharacterManager() {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null);
  const { success, info } = useToast();

  // 从后端加载角色列表（按项目过滤）
  useEffect(() => {
    apiGetCharacters(selectedProjectId || undefined)
      .then((data) => {
        setCharacters(data.map(toFrontendChar));
        setLoading(false);
      })
      .catch((err) => {
        console.error('[CharacterManager] 加载失败，使用 mock 数据:', err);
        setCharacters(mockCharacters);
        setLoading(false);
      });
  }, [selectedProjectId]);

  // Stats computed from character data
  const stats = useMemo(() => {
    const total = characters.length;
    const main = characters.filter((c) => c.role === '主角').length;
    const support = characters.filter((c) => c.role === '配角' || c.role === '龙套').length;
    const withImage = characters.filter((c) => c.hasGeneratedImage).length;
    const withoutImage = total - withImage;
    const totalAssets = characters.reduce((acc, c) => acc + c.assets.length, 0);
    return { total, main, support, withImage, withoutImage, totalAssets };
  }, [characters]);

  const handleNew = useCallback(() => {
    setEditingCharacter(null);
    setIsFormOpen(true);
  }, []);

  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAIGenerate = useCallback(async () => {
    setAiGenerating(true);
    try {
      let aiContent = '';
      await chatStream(
        [{ role: 'user', content: '你是一个专业的角色设计师。请生成一个有趣的角色，用以下JSON格式回复（只回复JSON，不要其他内容）：\n{"name":"姓名","role":"主角/配角/龙套","gender":"男/女","age":18,"description":"简短描述","personalityTraits":["特征1","特征2"],"appearance":"外貌描述","costume":"服装描述","background":"背景故事"}' }],
        (chunk) => {
          if (chunk.type === 'content') aiContent += chunk.data;
        },
        'mimo'
      );

      // 尝试解析 JSON
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const newChar: Character = {
          id: `ai_${Date.now()}`,
          name: data.name || 'AI角色',
          role: data.role || '配角',
          gender: data.gender || '男',
          age: data.age || 18,
          description: data.description || '',
          personalityTraits: data.personalityTraits || [],
          appearance: data.appearance || '',
          costume: data.costume || '',
          background: data.background || '',
          specialSetting: '',
          assets: [],
          hasGeneratedImage: false,
          relationships: [],
          scenes: [],
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        // 保存到后端
        const saved = await apiCreateCharacter(toApiChar(newChar, selectedProjectId || 'default'));
        setCharacters((prev) => [toFrontendChar(saved), ...prev]);
        success('AI 角色已生成并保存');
      }
    } catch (err) {
      console.error('[CharacterManager] AI 生成失败:', err);
      info('AI 生成失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  }, [selectedProjectId, success, info]);

  const handleEdit = useCallback((character: Character) => {
    setEditingCharacter(character);
    setIsFormOpen(true);
    setDetailCharacter(null);
  }, []);

  const handleDelete = useCallback((character: Character) => {
    if (window.confirm(`确定要删除角色「${character.name}」吗？此操作不可撤销。`)) {
      apiDeleteCharacter(character.id)
        .then(() => {
          setCharacters((prev) => prev.filter((c) => c.id !== character.id));
          if (detailCharacter?.id === character.id) setDetailCharacter(null);
          success(MSG.characterDeleted);
        })
        .catch((err) => {
          console.error('[CharacterManager] 删除失败:', err);
          // 乐观更新：本地也删除
          setCharacters((prev) => prev.filter((c) => c.id !== character.id));
          if (detailCharacter?.id === character.id) setDetailCharacter(null);
          success(MSG.characterDeleted);
        });
    }
  }, [detailCharacter, success]);

  const handleSave = useCallback((character: Character) => {
    const exists = characters.find((c) => c.id === character.id);
    const apiCall = exists
      ? apiUpdateCharacter(character.id, toApiChar(character, selectedProjectId || 'default'))
      : apiCreateCharacter(toApiChar(character, selectedProjectId || 'default'));

    apiCall
      .then((saved) => {
        const frontendChar = toFrontendChar(saved as CharacterData);
        setCharacters((prev) => {
          const idx = prev.findIndex((c) => c.id === frontendChar.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = frontendChar;
            return next;
          }
          return [frontendChar, ...prev];
        });
        success(editingCharacter ? MSG.updated : MSG.characterSaved);
      })
      .catch((err) => {
        console.error('[CharacterManager] 保存失败:', err);
        // 乐观更新：本地也保存
        setCharacters((prev) => {
          const idx = prev.findIndex((c) => c.id === character.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = character;
            return next;
          }
          return [character, ...prev];
        });
        success(editingCharacter ? MSG.updated : MSG.characterSaved);
      });
  }, [characters, editingCharacter, success, selectedProjectId]);

  const handleOpenDetail = useCallback((character: Character) => {
    setDetailCharacter(character);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailCharacter(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingCharacter(null);
  }, []);

  const handleGenerateImage = useCallback((character: Character) => {
    success(MSG.generateStarted + `「${character.name}」形象`);
    setTimeout(() => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === character.id ? { ...c, hasGeneratedImage: true } : c
        )
      );
      success(MSG.generateDone + `「${character.name}」形象生成完毕`);
    }, 2000);
  }, [success]);

  return (
    <>
      <Toaster position="top-center" />
      <div className="p-8 pt-0 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-h1 text-[#383431]">角色管理台</h1>
            <ProjectSelector />
          </div>
          <p className="text-body text-[#A8A39E] mt-2">
            管理项目中的所有角色，生成和编辑角色形象
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6"
        >
          {[
            { label: '角色总数', value: stats.total, color: 'text-[#8E6A48]' },
            { label: '主角', value: stats.main, color: 'text-[#A8835F]' },
            { label: '配角/龙套', value: stats.support, color: 'text-[#5A7FA8]' },
            { label: '已生成形象', value: stats.withImage, color: 'text-[#5B8C5A]' },
            { label: '未生成形象', value: stats.withoutImage, color: 'text-[#C49A3C]' },
            { label: '资产总数', value: stats.totalAssets, color: 'text-[#7A6B8A]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
              className="bg-[#F8F7F6] rounded-[10px] px-4 py-3"
            >
              <div className={`text-h3 ${stat.color} font-mono`}>{stat.value}</div>
              <div className="text-[13px] text-[#8B847E] mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* AI Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-4"
        >
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="h-10 px-5 rounded-lg bg-[#A8835F] text-white text-small font-medium hover:bg-[#8E6A48] transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {aiGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                AI 生成中...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                AI 生成角色
              </>
            )}
          </button>
        </motion.div>

        {/* Character Grid with Filters */}
        <div className="mt-6">
          <CharacterGrid
            characters={characters}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onOpenDetail={handleOpenDetail}
            onNew={handleNew}
            onGenerateImage={handleGenerateImage}
          />
        </div>

        {/* Character Form Modal */}
        <AnimatePresence>
          {isFormOpen && (
            <CharacterForm
              isOpen={isFormOpen}
              onClose={handleCloseForm}
              onSave={handleSave}
              editingCharacter={editingCharacter}
              allCharacters={characters}
            />
          )}
        </AnimatePresence>

        {/* Character Detail Drawer */}
        <AnimatePresence>
          {detailCharacter && (
            <CharacterDetailDrawer
              character={detailCharacter}
              onClose={handleCloseDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onGenerateImage={handleGenerateImage}
              allCharacters={characters}
              onNavigateCharacter={(c) => setDetailCharacter(c)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
