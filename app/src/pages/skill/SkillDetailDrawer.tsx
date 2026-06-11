import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Star,
  Check,
  Loader2,
  User,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  Share2,
} from 'lucide-react';
import type { Skill } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo } from '@/hooks/useToast';

interface SkillDetailDrawerProps {
  skill: Skill | null;
  onClose: () => void;
  onToggleInstall: (skillId: string) => void;
  onToggleFavorite?: (skillId: string) => void;
  isFavorited?: boolean;
}

export default function SkillDetailDrawer({ skill, onClose, onToggleInstall, onToggleFavorite, isFavorited = false }: SkillDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'params' | 'reviews'>('overview');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localParams, setLocalParams] = useState<Record<string, number | string | boolean>>({});
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [_showConfigPanel, setShowConfigPanel] = useState(false);

  if (!skill) return null;

  // Initialize local params from skill
  const params = skill.parameters.map((p) => ({
    ...p,
    value: localParams[p.id] ?? p.value,
  }));

  const handleParamChange = (id: string, value: number | string | boolean) => {
    setLocalParams((prev) => ({ ...prev, [id]: value }));
  };

  const isInstalling = skill.installStatus === 'installing';
  const isInstalled = skill.installStatus === 'installed';

  const categoryColors = {
    '漫剧': { bg: '#F0F3F7', text: '#5A7FA8' },
    '短剧': { bg: '#F0F5F0', text: '#5B8C5A' },
  };
  const catStyle = categoryColors[skill.category];

  const handleFavorite = () => {
    onToggleFavorite?.(skill.id);
    if (!isFavorited) {
      toastSuccess('已收藏到「我的收藏」');
    } else {
      toastInfo('已取消收藏');
    }
  };

  const handleInstall = () => {
    if (!isInstalled) {
      onToggleInstall(skill.id);
      setShowConfigPanel(true);
    }
  };

  const handleUseSkill = () => {
    toastSuccess('SKILL已应用', `${skill.name} 已成功应用到当前项目`);
    onClose();
  };

  const handleSaveConfig = () => {
    toastSuccess('配置已保存', '参数设置已保存成功');
  };

  const handleShare = () => {
    toastSuccess('分享链接已复制到剪贴板');
  };

  const tabs = [
    { key: 'overview' as const, label: '概览' },
    { key: 'params' as const, label: '参数' },
    { key: 'reviews' as const, label: `评价 (${skill.reviewCount})` },
  ];

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
        className="absolute right-0 top-0 h-full w-[560px] bg-white shadow-[0_4px_16px_rgba(30,28,26,0.08)] flex flex-col overflow-hidden"
      >
        {/* Cover Header */}
        <div className="relative h-[200px] shrink-0 overflow-hidden">
          <motion.img
            src={skill.coverImage}
            alt={skill.name}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#8B847E] hover:bg-white transition-colors shadow-sm"
          >
            <X size={16} />
          </button>
          {/* Category badge */}
          <span
            className="absolute bottom-4 left-4 px-2.5 py-0.5 rounded-full text-[12px] font-medium"
            style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
          >
            {skill.category}
          </span>
          {/* Top right actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleFavorite}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm',
                isFavorited
                  ? 'bg-[#C49A3C] text-white'
                  : 'bg-white/90 text-[#8B847E] hover:bg-white hover:text-[#C49A3C]'
              )}
            >
              {isFavorited ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#8B847E] hover:bg-white hover:text-[#524D48] transition-colors shadow-sm"
            >
              <Share2 size={14} />
            </button>
          </div>
          {/* Install button */}
          <div className="absolute bottom-4 right-4">
            {isInstalled ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUseSkill}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-[14px] font-medium bg-[#A8835F] text-white hover:bg-[#8E6A48] transition-colors shadow-sm"
                >
                  <Sparkles size={16} />
                  使用此SKILL
                </button>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-medium bg-[#5B8C5A] text-white">
                  <Check size={16} />
                  已安装
                </span>
              </div>
            ) : (
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className={cn(
                  'inline-flex items-center gap-1.5 h-10 px-5 rounded-lg text-[14px] font-medium transition-all',
                  isInstalling
                    ? 'bg-[#F0F3F7] text-[#5A7FA8]'
                    : 'bg-[#A8835F] text-white hover:bg-[#8E6A48] shadow-[0_1px_2px_rgba(30,28,26,0.04)]'
                )}
              >
                {isInstalling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    安装中
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    安装此SKILL
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EFEDEB] shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 h-10 text-[13px] font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'text-[#755235] border-[#A8835F]'
                  : 'text-[#8B847E] border-transparent hover:text-[#524D48] hover:border-[#DEDBD8]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Name + Version */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-h2 text-[#383431]">{skill.name}</h2>
                    <span className="text-caption text-[#A8A39E] font-mono">{skill.version}</span>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-full bg-[#EAD8C8] flex items-center justify-center">
                      <User size={12} className="text-[#8E6A48]" />
                    </div>
                    <span className="text-[13px] text-[#6E6862]">{skill.authorName}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-2 text-[13px]">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= Math.round(skill.rating) ? 'text-[#C49A3C] fill-[#C49A3C]' : 'text-[#DEDBD8]'}
                        />
                      ))}
                    </div>
                    <span className="text-[#383431] font-medium">{skill.rating}</span>
                    <span className="text-[#A8A39E]">· {skill.reviewCount}条评价</span>
                    <span className="text-[#A8A39E]">·</span>
                    <span className="text-[#A8A39E] flex items-center gap-1">
                      <Download size={12} />
                      {(skill.downloadCount / 1000).toFixed(1)}k
                    </span>
                  </div>
                </motion.div>

                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                >
                  <p className="text-[14px] text-[#6E6862] leading-relaxed whitespace-pre-line">
                    {skill.detailedDescription}
                  </p>
                </motion.div>

                {/* Tags */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, duration: 0.3 }}
                >
                  <h3 className="text-[13px] font-medium text-[#524D48] mb-2">标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-[13px] bg-[#F8F7F6] text-[#6E6862]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Usage Instructions */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="border-t border-[#EFEDEB] pt-4"
                >
                  <h3 className="text-[13px] font-medium text-[#524D48] mb-2">使用说明</h3>
                  <p className="text-[13px] text-[#6E6862] leading-relaxed whitespace-pre-line">
                    {skill.usageInstructions}
                  </p>
                </motion.div>
              </>
            )}

            {/* Parameters Tab */}
            {activeTab === 'params' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-h3 text-[#383431] mb-4">SKILL参数</h3>
                <div className="space-y-5">
                  {params.map((param) => (
                    <div key={param.id}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[14px] font-medium text-[#524D48]">{param.name}</label>
                        <span className="text-[13px] text-[#A8A39E]">
                          {typeof param.value === 'boolean'
                            ? param.value ? '开' : '关'
                            : param.value}
                        </span>
                      </div>
                      {param.type === 'slider' && (
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={param.value as number}
                          onChange={(e) => handleParamChange(param.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-[#EFEDEB] rounded-full appearance-none cursor-pointer accent-[#A8835F]"
                        />
                      )}
                      {param.type === 'select' && param.options && (
                        <select
                          value={param.value as string}
                          onChange={(e) => handleParamChange(param.id, e.target.value)}
                          className="w-full h-10 px-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[14px] text-[#383431] focus:outline-none focus:border-[#D9BFA8] transition-all cursor-pointer"
                        >
                          {param.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {param.type === 'toggle' && (
                        <button
                          onClick={() => handleParamChange(param.id, !(param.value as boolean))}
                          className={cn(
                            'w-12 h-6 rounded-full transition-colors relative',
                            param.value ? 'bg-[#A8835F]' : 'bg-[#DEDBD8]'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform',
                              param.value ? 'left-[26px]' : 'left-0.5'
                            )}
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 mt-5 text-[13px] text-[#A8835F] hover:text-[#8E6A48] transition-colors"
                >
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  高级配置
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-3">
                        <div>
                          <label className="text-[12px] font-medium text-[#8B847E] mb-1 block">AI 模型</label>
                          <select className="w-full h-9 px-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer">
                            <option>GPT-4o</option>
                            <option>GPT-4o-mini</option>
                            <option>Claude 3.5 Sonnet</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-[#8B847E] mb-1 block">图像模型</label>
                          <select className="w-full h-9 px-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer">
                            <option>DALL-E 3</option>
                            <option>Midjourney V6</option>
                            <option>Stable Diffusion XL</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[12px] font-medium text-[#8B847E] mb-1 block">视频模型</label>
                          <select className="w-full h-9 px-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg text-[13px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer">
                            <option>Sora</option>
                            <option>Runway Gen-3</option>
                            <option>Pika 1.5</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save config button */}
                <button
                  onClick={handleSaveConfig}
                  className="mt-6 h-9 px-4 bg-[#A8835F] hover:bg-[#8E6A48] text-white text-[13px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Save size={14} />
                  保存配置
                </button>
              </motion.div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-h3 text-[#383431]">用户评价</h3>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-[#C49A3C] fill-[#C49A3C]" />
                    <span className="text-[13px] font-medium text-[#383431]">{skill.rating}</span>
                    <span className="text-[12px] text-[#A8A39E]">({skill.reviewCount})</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {skill.reviews.slice(0, reviewsExpanded ? undefined : 2).map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="bg-[#F8F7F6] rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#EAD8C8] flex items-center justify-center">
                          <User size={14} className="text-[#8E6A48]" />
                        </div>
                        <div>
                          <span className="text-[13px] font-medium text-[#524D48]">{review.userName}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={10}
                                className={star <= review.rating ? 'text-[#C49A3C] fill-[#C49A3C]' : 'text-[#DEDBD8]'}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-[11px] text-[#A8A39E]">{review.date}</span>
                      </div>
                      <p className="text-[13px] text-[#6E6862] leading-relaxed">{review.comment}</p>
                    </motion.div>
                  ))}
                </div>

                {skill.reviews.length > 2 && (
                  <button
                    onClick={() => setReviewsExpanded(!reviewsExpanded)}
                    className="mt-3 text-[13px] text-[#A8835F] hover:text-[#8E6A48] transition-colors flex items-center gap-1"
                  >
                    {reviewsExpanded ? '收起评价' : `查看全部 ${skill.reviewCount} 条评价`}
                    <ChevronDown size={14} className={cn('transition-transform', reviewsExpanded && 'rotate-180')} />
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
