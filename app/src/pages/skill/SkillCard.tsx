import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  Download,
  Star,
  Settings,
  FileText,
  Bookmark,
  BookmarkCheck,
  Check,
  Loader2,
} from 'lucide-react';
import type { Skill } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

interface SkillCardProps {
  skill: Skill;
  index: number;
  onOpenDetail: (skill: Skill) => void;
  onToggleInstall: (skillId: string) => void;
  onToggleFavorite: (skillId: string) => void;
  onRateSkill?: (skillId: string, rating: number) => void;
  isFavorited: boolean;
}

export default function SkillCard({
  skill,
  index,
  onOpenDetail,
  onToggleInstall,
  onToggleFavorite,
  onRateSkill,
  isFavorited,
}: SkillCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoryColors = {
    '漫剧': { bg: '#F0F3F7', text: '#5A7FA8' },
    '短剧': { bg: '#F0F5F0', text: '#5B8C5A' },
  };
  const catStyle = categoryColors[skill.category];

  const isInstalling = skill.installStatus === 'installing';
  const isInstalled = skill.installStatus === 'installed';

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(skill.id);
    if (!isFavorited) {
      toastSuccess('已收藏到「我的收藏」');
    } else {
      toastInfo('已取消收藏');
    }
  };

  const handleRate = (rating: number) => {
    setUserRating(rating);
    onRateSkill?.(skill.id, rating);
    toastSuccess(`已评分 ${rating} 星`);
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
      whileHover={{ y: -3 }}
      className={cn(
        'bg-white rounded-xl border shadow-[0_1px_2px_rgba(30,28,26,0.04)] overflow-hidden group cursor-pointer transition-all duration-[250ms]',
        hovered
          ? 'shadow-[0_4px_16px_rgba(30,28,26,0.1)] border-[#EAD8C8]'
          : 'border-[#DEDBD8] hover:shadow-[0_2px_8px_rgba(30,28,26,0.06)] hover:border-[#EAD8C8]'
      )}
      onClick={() => onOpenDetail(skill)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setHoverRating(0); }}
    >
      {/* Cover Image Area */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={skill.coverImage}
          alt={skill.name}
          onLoad={() => setImageLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-all duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            hovered && 'scale-[1.05]'
          )}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#F8F7F6] animate-pulse" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center"
            >
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-white text-[13px] font-medium px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm"
              >
                查看详情
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category badge */}
        <span
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-caption font-medium"
          style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
        >
          {skill.category}
        </span>
        {/* Official badge */}
        {skill.isOfficial && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-caption font-medium bg-[#A8835F] text-white">
            官方
          </span>
        )}
        {/* Install status / Install button */}
        <div className="absolute bottom-3 right-3">
          {isInstalled ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium bg-[#5B8C5A] text-white">
              <Check size={12} />
              已安装
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleInstall(skill.id); }}
              disabled={isInstalling}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-caption font-medium transition-all',
                isInstalling
                  ? 'bg-[#F0F3F7] text-[#5A7FA8]'
                  : 'bg-[#A8835F] text-white hover:bg-[#8E6A48]'
              )}
            >
              {isInstalling ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  安装中
                </>
              ) : (
                '安装'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* Name Row */}
        <div className="flex items-center justify-between">
          <h4 className="text-[15px] font-medium text-[#383431]">{skill.name}</h4>
          <span className="text-[12px] text-[#A8A39E] font-mono">{skill.version}</span>
        </div>

        {/* Description */}
        <p className="mt-2 text-[13px] text-[#8B847E] line-clamp-2 leading-relaxed">
          {skill.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-caption bg-[#F8F7F6] text-[#6E6862]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-caption text-[#A8A39E]">
          <span className="flex items-center gap-1">
            <Download size={13} />
            {(skill.downloadCount / 1000).toFixed(1)}k
          </span>
          <span className="flex items-center gap-1">
            <Star size={13} className="text-[#C49A3C]" />
            {skill.rating}
          </span>
        </div>

        {/* Interactive Rating */}
        <div
          className="flex items-center gap-0.5 mt-2"
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="w-5 h-5 flex items-center justify-center transition-transform hover:scale-110"
            >
              <Star
                size={14}
                className={cn(
                  'transition-colors',
                  (hoverRating ? star <= hoverRating : star <= (userRating || Math.round(skill.rating)))
                    ? 'text-[#C49A3C] fill-[#C49A3C]'
                    : 'text-[#DEDBD8]'
                )}
              />
            </button>
          ))}
          <span className="text-[11px] text-[#A8A39E] ml-1">
            {hoverRating > 0 ? hoverRating : userRating || skill.rating}
          </span>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="px-4 py-2.5 border-t border-[#EFEDEB] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img
            src={skill.authorAvatar}
            alt={skill.authorName}
            className="w-5 h-5 rounded-full object-cover"
          />
          <span className="text-[12px] text-[#A8A39E] truncate max-w-[80px]">{skill.authorName}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
              isFavorited
                ? 'text-[#C49A3C] bg-[#FDF8F0]'
                : 'text-[#8B847E] hover:bg-[#F8F7F6] hover:text-[#C49A3C]'
            )}
            title={isFavorited ? '取消收藏' : '收藏'}
          >
            {isFavorited ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
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
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenDetail(skill); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                  >
                    <FileText size={14} /> 查看详情
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleFavorite(e); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                  >
                    {isFavorited ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    {isFavorited ? '取消收藏' : '收藏'}
                  </button>
                  {isInstalled && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); toastInfo('配置功能开发中'); }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                    >
                      <Settings size={14} /> 配置
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onToggleInstall(skill.id); }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-small text-[#524D48] hover:bg-[#F8F7F6] transition-colors text-left"
                  >
                    {isInstalled ? '卸载' : '安装'}
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
