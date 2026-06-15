import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import SkillGrid from './skill/SkillGrid';
import SkillDetailDrawer from './skill/SkillDetailDrawer';
import type { Skill, InstallStatus } from './skill/types';
import { getSkills, installSkill, uninstallSkill, rateSkill, type SkillData } from '@/lib/api';

/** 后端 SkillData → 前端 Skill 类型转换 */
function toFrontendSkill(s: SkillData): Skill {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    detailedDescription: s.detailed_description,
    category: s.category as Skill['category'],
    style: s.style as Skill['style'],
    tags: s.tags,
    coverImage: s.cover_image,
    version: s.version,
    authorName: s.author_name,
    authorAvatar: s.author_avatar,
    downloadCount: s.download_count,
    rating: s.rating,
    reviewCount: s.review_count,
    isOfficial: s.is_official,
    installStatus: s.install_status as InstallStatus,
    parameters: s.parameters.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type as 'slider' | 'select' | 'toggle',
      value: p.value,
      min: p.min_val,
      max: p.max_val,
      step: p.step,
      options: p.options,
      defaultValue: p.default_value,
    })),
    reviews: s.reviews.map((r) => ({
      id: r.id,
      userName: r.user_name,
      avatar: r.avatar,
      rating: r.rating,
      comment: r.comment,
      date: r.date,
    })),
    usageInstructions: s.usage_instructions,
  };
}

export default function SkillMarket() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritedIds, setFavoritedIds] = useState<string[]>([]);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);

  // 从后端加载 SKILL 列表
  useEffect(() => {
    getSkills()
      .then((data) => {
        setSkills(data.map(toFrontendSkill));
        setLoading(false);
      })
      .catch((err) => {
        console.error('[SkillMarket] 加载失败:', err);
        setLoading(false);
      });
  }, []);

  const handleToggleInstall = useCallback(async (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    // 乐观更新 UI
    if (skill.installStatus === 'not_installed') {
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, installStatus: 'installing' as const } : s))
      );
      try {
        await installSkill(skillId);
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, installStatus: 'installed' as const } : s))
        );
      } catch (err) {
        console.error('[SkillMarket] 安装失败:', err);
        // 回滚
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, installStatus: 'not_installed' as const } : s))
        );
      }
    } else if (skill.installStatus === 'installed') {
      try {
        await uninstallSkill(skillId);
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, installStatus: 'not_installed' as const } : s))
        );
      } catch (err) {
        console.error('[SkillMarket] 卸载失败:', err);
      }
    }
  }, [skills]);

  const handleToggleFavorite = useCallback((skillId: string) => {
    setFavoritedIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }, []);

  const handleOpenDetail = useCallback((skill: Skill) => {
    setDetailSkill(skill);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailSkill(null);
  }, []);

  const handleRateSkill = useCallback(async (skillId: string, rating: number) => {
    try {
      await rateSkill(skillId, rating);
      // 重新加载数据以获取最新评分
      const data = await getSkills();
      setSkills(data.map(toFrontendSkill));
    } catch (err) {
      console.error('[SkillMarket] 评价失败:', err);
    }
  }, []);

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="p-8 pt-0 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-h1 text-[#383431]">SKILL市场</h1>
          <p className="text-body text-[#A8A39E] mt-2">
            发现、安装和管理创作SKILL，解锁不同风格的漫剧/短剧制作能力
          </p>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#A8835F]" />
            <span className="ml-3 text-[#A8A39E]">加载中...</span>
          </div>
        ) : (
          <>
            {/* Skill Grid with Filters */}
            <div className="mt-6">
              <SkillGrid
                skills={skills}
                favoritedIds={favoritedIds}
                onToggleInstall={handleToggleInstall}
                onToggleFavorite={handleToggleFavorite}
                onOpenDetail={handleOpenDetail}
                onRateSkill={handleRateSkill}
              />
            </div>

            {/* Skill Detail Drawer */}
            <AnimatePresence>
              {detailSkill && (
                <SkillDetailDrawer
                  skill={detailSkill}
                  onClose={handleCloseDetail}
                  onToggleInstall={handleToggleInstall}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorited={favoritedIds.includes(detailSkill.id)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </>
  );
}
