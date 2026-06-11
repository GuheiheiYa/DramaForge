import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import CharacterGrid from './character/CharacterGrid';
import CharacterForm from './character/CharacterForm';
import CharacterDetailDrawer from './character/CharacterDetailDrawer';
import type { Character } from './character/types';
import { mockCharacters } from './character/mockData';
import { useToast, MSG } from '@/hooks/useToast';

export default function CharacterManager() {
  const [characters, setCharacters] = useState<Character[]>(mockCharacters);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null);
  const { success } = useToast();

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

  const handleEdit = useCallback((character: Character) => {
    setEditingCharacter(character);
    setIsFormOpen(true);
    setDetailCharacter(null);
  }, []);

  const handleDelete = useCallback((character: Character) => {
    if (window.confirm(`确定要删除角色「${character.name}」吗？此操作不可撤销。`)) {
      setCharacters((prev) => prev.filter((c) => c.id !== character.id));
      if (detailCharacter?.id === character.id) {
        setDetailCharacter(null);
      }
      success(MSG.characterDeleted);
    }
  }, [detailCharacter, success]);

  const handleSave = useCallback((character: Character) => {
    setCharacters((prev) => {
      const exists = prev.find((c) => c.id === character.id);
      if (exists) {
        return prev.map((c) => (c.id === character.id ? character : c));
      }
      return [character, ...prev];
    });
    success(editingCharacter ? MSG.updated : MSG.characterSaved);
  }, [editingCharacter, success]);

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
          <h1 className="text-h1 text-[#383431]">角色管理台</h1>
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
