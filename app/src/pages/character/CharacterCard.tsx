import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Wand2,
  Image,
  Sparkles,
} from 'lucide-react';
import type { Character } from './types';
import { useToast, MSG } from '@/hooks/useToast';

interface CharacterCardProps {
  character: Character;
  index: number;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onOpenDetail: (character: Character) => void;
  onGenerateImage: (character: Character) => void;
}

export default function CharacterCard({
  character,
  index,
  onEdit,
  onDelete,
  onOpenDetail,
  onGenerateImage,
}: CharacterCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageStatus, setImageStatus] = useState(character.hasGeneratedImage ? '已生成' : '未生成');
  const menuRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleColorMap = {
    '主角': { bg: '#FBF7F4', text: '#8E6A48' },
    '配角': { bg: '#F0F3F7', text: '#5A7FA8' },
    '龙套': { bg: '#EFEDEB', text: '#8B847E' },
  };

  const statusColorMap: Record<string, { bg: string; text: string }> = {
    '已生成': { bg: '#F0F5F0', text: '#5B8C5A' },
    '未生成': { bg: '#FDF8F0', text: '#C49A3C' },
    '生成中': { bg: '#F0F3F7', text: '#5A7FA8' },
  };

  const roleStyle = roleColorMap[character.role];

  const handleCopyCharacter = () => {
    setMenuOpen(false);
    success(MSG.copied);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageStatus === '未生成') {
      onGenerateImage(character);
      setImageStatus('生成中');
      setTimeout(() => setImageStatus('已生成'), 2000);
    } else if (imageStatus === '已生成') {
      setImageStatus('未生成');
    } else {
      setImageStatus('未生成');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0, 0, 0.2, 1] as [number, number, number, number],
      }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => { setIsHovered(false); setMenuOpen(false); }}
      className="bg-white rounded-xl border border-[#DEDBD8] shadow-[0_1px_2px_rgba(30,28,26,0.04)] hover:shadow-[0_4px_12px_rgba(30,28,26,0.08)] hover:border-[#EAD8C8] transition-all duration-[250ms] cursor-pointer overflow-hidden group"
      onClick={() => onOpenDetail(character)}
    >
      {/* Avatar Area */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={character.avatarUrl || '/character-placeholder.jpg'}
          alt={character.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
        {/* Golden border overlay */}
        <div className="absolute inset-0 border-[3px] border-[#C4A07F]/30 rounded-t-xl pointer-events-none" />

        {/* Role badge */}
        <span
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-caption font-medium"
          style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
        >
          {character.role}
        </span>

        {/* Status badge - clickable */}
        <button
          onClick={handleStatusClick}
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: statusColorMap[imageStatus]?.bg || '#EFEDEB',
            color: statusColorMap[imageStatus]?.text || '#8B847E',
          }}
        >
          {imageStatus === '生成中' ? (
            <span className="flex items-center gap-1">
              <Sparkles size={10} className="animate-pulse" />
              生成中
            </span>
          ) : imageStatus}
        </button>

        {/* Hover action overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2"
            >
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                onClick={(e) => { e.stopPropagation(); onEdit(character); }}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[#524D48] hover:bg-white transition-colors"
                title="编辑"
              >
                <Pencil size={16} />
              </motion.button>
              {!character.hasGeneratedImage && (
                <motion.button
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  onClick={(e) => { e.stopPropagation(); onGenerateImage(character); }}
                  className="w-10 h-10 rounded-full bg-[#A8835F]/90 flex items-center justify-center text-white hover:bg-[#A8835F] transition-colors"
                  title="生成形象"
                >
                  <Wand2 size={16} />
                </motion.button>
              )}
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                onClick={(e) => { e.stopPropagation(); if (window.confirm(`确定删除「${character.name}」？`)) onDelete(character); }}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[#B85C50] hover:bg-white transition-colors"
                title="删除"
              >
                <Trash2 size={16} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate overlay for non-generated images */}
        {!character.hasGeneratedImage && !isHovered && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Wand2 size={24} className="text-white mb-1" />
            <span className="text-white text-small font-medium">生成形象</span>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-4">
        {/* Name Row */}
        <div className="flex items-center justify-between">
          <h4 className="text-[15px] font-medium text-[#383431] truncate">{character.name}</h4>
          <span className="text-[13px] text-[#A8A39E] shrink-0 ml-2">
            {character.gender === '男' ? '♂' : character.gender === '女' ? '♀' : '○'}·{character.age}岁
          </span>
        </div>

        {/* Personality Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {character.personalityTraits.slice(0, 3).map((trait) => (
            <span
              key={trait}
              className="px-2.5 py-0.5 rounded-full text-caption bg-[#FBF7F4] text-[#8E6A48]"
            >
              {trait}
            </span>
          ))}
        </div>

        {/* Description Preview */}
        <p className="mt-2 text-[13px] text-[#A8A39E] line-clamp-2 leading-relaxed">
          {character.description}
        </p>

        {/* Asset tags */}
        {character.assets.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {character.assets.slice(0, 3).map((asset) => (
              <button
                key={asset.id}
                onClick={(e) => { e.stopPropagation(); success(`查看资产：${asset.name}`); }}
                className="px-2 py-0.5 bg-[#F0F3F7] text-[#5A7FA8] text-[10px] rounded hover:bg-[#E8EFF6] transition-colors"
              >
                {asset.type}
              </button>
            ))}
            {character.assets.length > 3 && (
              <span className="px-2 py-0.5 bg-[#F0F3F7] text-[#A8A39E] text-[10px] rounded">
                +{character.assets.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="px-4 py-2.5 border-t border-[#EFEDEB] flex items-center justify-between">
        <div className="flex items-center gap-1 text-[13px] text-[#A8A39E]">
          <Image size={14} />
          <span>{character.assets.length}个资产</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(character); }}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#8E6A48] transition-colors"
            title="编辑"
          >
            <Pencil size={15} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] hover:text-[#8E6A48] transition-colors"
              title="更多"
            >
              <MoreVertical size={15} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
                  className="absolute right-0 bottom-9 w-40 bg-white rounded-lg border border-[#DEDBD8] shadow-[0_4px_16px_rgba(30,28,26,0.08)] py-1 z-10"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(character); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                  >
                    <Pencil size={14} /> 编辑信息
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onGenerateImage(character); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                  >
                    <Wand2 size={14} /> 生成形象
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleCopyCharacter(); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                  >
                    <Copy size={14} /> 复制角色
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (window.confirm(`确定删除「${character.name}」？`)) onDelete(character); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#B85C50] hover:bg-[#FDF2F0] transition-colors text-left"
                  >
                    <Trash2 size={14} /> 删除
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
