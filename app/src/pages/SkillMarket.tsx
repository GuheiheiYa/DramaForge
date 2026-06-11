import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import SkillGrid from './skill/SkillGrid';
import SkillDetailDrawer from './skill/SkillDetailDrawer';
import type { Skill } from './skill/types';
import { mockSkills } from './skill/mockData';

export default function SkillMarket() {
  const [skills, setSkills] = useState<Skill[]>(mockSkills);
  const [favoritedIds, setFavoritedIds] = useState<string[]>(['s1']);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);

  const handleToggleInstall = useCallback((skillId: string) => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id === skillId) {
          if (s.installStatus === 'not_installed') {
            // Simulate installation
            return { ...s, installStatus: 'installing' as const };
          } else if (s.installStatus === 'installed') {
            return { ...s, installStatus: 'not_installed' as const };
          }
        }
        return s;
      })
    );

    // Simulate completion after 1.5s if installing
    setTimeout(() => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id === skillId && s.installStatus === 'installing') {
            return { ...s, installStatus: 'installed' as const };
          }
          return s;
        })
      );
    }, 1500);
  }, []);

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

  const handleRateSkill = useCallback((skillId: string, rating: number) => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id === skillId) {
          const newReviewCount = s.reviewCount + 1;
          const newRating = ((s.rating * s.reviewCount) + rating) / newReviewCount;
          return { ...s, rating: Math.round(newRating * 10) / 10, reviewCount: newReviewCount };
        }
        return s;
      })
    );
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
      </div>
    </>
  );
}
