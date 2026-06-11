import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pencil,
  Wand2,
  Trash2,
  ChevronRight,
  Image,
  User,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character, CharacterRole } from './types';
import { useToast } from '@/hooks/useToast';

interface CharacterDetailDrawerProps {
  character: Character | null;
  onClose: () => void;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onGenerateImage: (character: Character) => void;
  allCharacters: Character[];
  onNavigateCharacter: (character: Character) => void;
}

const roleColorMap: Record<CharacterRole, { bg: string; text: string }> = {
  '主角': { bg: '#FBF7F4', text: '#8E6A48' },
  '配角': { bg: '#F0F3F7', text: '#5A7FA8' },
  '龙套': { bg: '#EFEDEB', text: '#8B847E' },
};

type DetailTab = 'basic' | 'assets' | 'relationships';

const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'basic', label: '基本信息', icon: <User size={14} /> },
  { id: 'assets', label: '资产', icon: <Image size={14} /> },
  { id: 'relationships', label: '关系', icon: <Users size={14} /> },
];

export default function CharacterDetailDrawer({
  character,
  onClose,
  onEdit,
  onDelete,
  onGenerateImage,
  allCharacters,
  onNavigateCharacter,
}: CharacterDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [isGenerating, setIsGenerating] = useState(false);
  const { success } = useToast();

  if (!character) return null;

  const roleStyle = roleColorMap[character.role];

  const sectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    }),
  };

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    onGenerateImage(character);
    setTimeout(() => setIsGenerating(false), 2000);
  }, [character, onGenerateImage]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`确定要删除角色「${character.name}」吗？此操作不可撤销。`)) {
      onDelete(character);
      onClose();
    }
  }, [character, onDelete, onClose]);

  const handleNavigateToRelated = useCallback((targetId: string) => {
    const target = allCharacters.find((c) => c.id === targetId);
    if (target) {
      onNavigateCharacter(target);
    }
  }, [allCharacters, onNavigateCharacter]);

  const handlePreviewAsset = useCallback((assetName: string) => {
    success(`预览资产：${assetName}`);
  }, [success]);

  return (
    <div className="fixed inset-0 z-[150]">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
        className="absolute right-0 top-0 h-full w-[480px] bg-white shadow-[0_4px_16px_rgba(30,28,26,0.08)] flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-[#DEDBD8]">
          {/* Close */}
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Avatar */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
            className="flex flex-col items-center"
          >
            <div className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-[3px] border-[#C4A07F]/30">
              <img
                src={character.avatarUrl || '/character-placeholder.jpg'}
                alt={character.name}
                className="w-full h-full object-cover"
              />
              {!character.hasGeneratedImage && (
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                  <Wand2 size={32} className="text-white mb-2" />
                  <span className="text-white text-[13px]">尚未生成形象</span>
                </div>
              )}
            </div>
            <h2 className="text-h2 text-[#383431] mt-3">{character.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-caption text-[#A8A39E]">
              <span
                className="px-2 py-0.5 rounded-full text-[12px] font-medium"
                style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
              >
                {character.role}
              </span>
              <span>·</span>
              <span>{character.gender === '男' ? '♂' : character.gender === '女' ? '♀' : '○'}</span>
              <span>·</span>
              <span>{character.age}岁</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => onEdit(character)}
                className="h-9 px-4 border border-[#DEDBD8] text-[#524D48] rounded-lg text-[13px] font-medium flex items-center gap-1.5 hover:bg-[#F8F7F6] transition-colors"
              >
                <Pencil size={14} />
                编辑
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={cn(
                  'h-9 px-4 border rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors',
                  isGenerating
                    ? 'border-[#DEDBD8] text-[#A8A39E] cursor-not-allowed'
                    : 'border-[#DEDBD8] text-[#524D48] hover:bg-[#F8F7F6]'
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#A8835F]" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    生成形象
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="h-9 px-4 border border-[#DEDBD8] text-[#B85C50] rounded-lg text-[13px] font-medium flex items-center gap-1.5 hover:bg-[#FDF2F0] transition-colors"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-[#DEDBD8]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 h-10 flex items-center justify-center gap-1.5 text-[13px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-[#A8835F] border-b-2 border-[#A8835F]'
                  : 'text-[#8B847E] hover:text-[#6E6862]'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'assets' && (
                <span className="text-[10px] bg-[#EFEDEB] text-[#8B847E] px-1.5 py-0 rounded-full">
                  {character.assets.length}
                </span>
              )}
              {tab.id === 'relationships' && (
                <span className="text-[10px] bg-[#EFEDEB] text-[#8B847E] px-1.5 py-0 rounded-full">
                  {character.relationships.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Description */}
                <motion.div custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
                  <h4 className="text-[15px] font-medium text-[#383431] mb-3">角色简介</h4>
                  <p className="text-[14px] text-[#524D48] leading-relaxed">{character.description || '暂无描述'}</p>
                </motion.div>

                {/* Personality Tags */}
                {character.personalityTraits.length > 0 && (
                  <motion.div custom={1} initial="hidden" animate="visible" variants={sectionVariants}>
                    <h4 className="text-[15px] font-medium text-[#383431] mb-3">性格标签</h4>
                    <div className="flex flex-wrap gap-2">
                      {character.personalityTraits.map((trait) => (
                        <span key={trait} className="px-3 py-1 rounded-full bg-[#FBF7F4] text-[#8E6A48] text-[13px]">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Appearance */}
                {character.appearance && (
                  <motion.div custom={2} initial="hidden" animate="visible" variants={sectionVariants}>
                    <h4 className="text-[15px] font-medium text-[#383431] mb-3">外貌特征</h4>
                    <p className="text-[14px] text-[#524D48] leading-relaxed">{character.appearance}</p>
                  </motion.div>
                )}

                {/* Costume */}
                {character.costume && (
                  <motion.div custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
                    <h4 className="text-[15px] font-medium text-[#383431] mb-3">服装设定</h4>
                    <p className="text-[14px] text-[#524D48] leading-relaxed">{character.costume}</p>
                  </motion.div>
                )}

                {/* Background */}
                {character.background && (
                  <motion.div custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
                    <h4 className="text-[15px] font-medium text-[#383431] mb-3">背景故事</h4>
                    <p className="text-[14px] text-[#524D48] leading-relaxed">{character.background}</p>
                  </motion.div>
                )}

                {/* Special Setting */}
                {character.specialSetting && (
                  <motion.div custom={5} initial="hidden" animate="visible" variants={sectionVariants}>
                    <h4 className="text-[15px] font-medium text-[#383431] mb-3">特殊设定</h4>
                    <p className="text-[14px] text-[#524D48] leading-relaxed">{character.specialSetting}</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Assets Tab */}
            {activeTab === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {character.assets.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                    {character.assets.map((asset) => (
                      <motion.div
                        key={asset.id}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => handlePreviewAsset(asset.name)}
                        className="shrink-0 group cursor-pointer"
                      >
                        <div className="w-[120px] h-[120px] rounded-lg overflow-hidden relative border border-[#DEDBD8]">
                          <img
                            src={asset.thumbnail}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                            <span className="text-[11px] text-white">{asset.type}</span>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                        <p className="text-[12px] text-[#6E6862] mt-1.5 text-center">{asset.name}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Image size={40} className="text-[#C5C1BC] mb-3" />
                    <p className="text-[14px] text-[#A8A39E]">暂无角色资产</p>
                    <button
                      onClick={handleGenerate}
                      className="mt-3 h-8 px-4 bg-[#A8835F] text-white rounded-md text-[13px] hover:bg-[#8E6A48] transition-colors flex items-center gap-1"
                    >
                      <Sparkles size={14} />
                      生成形象
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Relationships Tab */}
            {activeTab === 'relationships' && (
              <motion.div
                key="relationships"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {character.relationships.length > 0 ? (
                  character.relationships.map((rel, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleNavigateToRelated(rel.targetCharacterId)}
                      className="flex items-center gap-3 p-3 bg-[#F8F7F6] rounded-lg hover:bg-[#FBF7F4] hover:border-[#EAD8C8] border border-transparent transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#EAD8C8] flex items-center justify-center text-[14px] text-[#8E6A48] shrink-0">
                        {rel.targetName[0]}
                      </div>
                      <div className="flex-1">
                        <span className="text-[14px] font-medium text-[#383431]">{rel.targetName}</span>
                        <span className="text-[13px] text-[#A8A39E] mx-2">→</span>
                        <span className="text-[13px] text-[#6E6862]">{rel.relation}</span>
                      </div>
                      <ChevronRight size={14} className="text-[#C5C1BC] group-hover:text-[#A8835F] transition-colors" />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users size={40} className="text-[#C5C1BC] mb-3" />
                    <p className="text-[14px] text-[#A8A39E]">暂无角色关系</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
