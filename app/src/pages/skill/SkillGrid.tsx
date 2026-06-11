import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronDown, Bookmark, X } from 'lucide-react';
import SkillCard from './SkillCard';
import type { Skill } from './types';
import { categoryFilters, filterOptions, sortOptions } from './mockData';
import { cn } from '@/lib/utils';

interface SkillGridProps {
  skills: Skill[];
  favoritedIds: string[];
  onToggleInstall: (skillId: string) => void;
  onToggleFavorite: (skillId: string) => void;
  onOpenDetail: (skill: Skill) => void;
  onRateSkill?: (skillId: string, rating: number) => void;
}

export default function SkillGrid({
  skills,
  favoritedIds,
  onToggleInstall,
  onToggleFavorite,
  onOpenDetail,
  onRateSkill,
}: SkillGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [filterBy, setFilterBy] = useState('全部');
  const [sortBy, setSortBy] = useState('推荐');
  const [showMyFavorites, setShowMyFavorites] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const filteredSkills = useMemo(() => {
    let result = [...skills];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (activeCategory !== '全部') {
      if (activeCategory === '漫剧风格') {
        result = result.filter((s) => s.category === '漫剧');
      } else if (activeCategory === '短剧风格') {
        result = result.filter((s) => s.category === '短剧');
      } else if (activeCategory === '日系') {
        result = result.filter((s) => s.style === '日系');
      } else if (activeCategory === '古风') {
        result = result.filter((s) => s.style === '古风');
      } else if (activeCategory === '现代') {
        result = result.filter((s) => s.style === '现代');
      } else if (activeCategory === '悬疑惊悚') {
        result = result.filter((s) => s.style === '悬疑');
      } else if (activeCategory === '甜宠浪漫') {
        result = result.filter((s) => s.style === '甜宠');
      } else {
        result = result.filter((s) => s.tags.some((t) => t.includes(activeCategory)));
      }
    }

    // Filter dropdown
    switch (filterBy) {
      case '已安装':
        result = result.filter((s) => s.installStatus === 'installed');
        break;
      case '未安装':
        result = result.filter((s) => s.installStatus !== 'installed');
        break;
      case '官方':
        result = result.filter((s) => s.isOfficial);
        break;
      case '社区':
        result = result.filter((s) => !s.isOfficial);
        break;
    }

    // My favorites
    if (showMyFavorites) {
      result = result.filter((s) => favoritedIds.includes(s.id));
    }

    // Sort
    switch (sortBy) {
      case '热门':
        result.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case '最新':
        result.sort((a, b) => b.version.localeCompare(a.version));
        break;
      case '评分':
        result.sort((a, b) => b.rating - a.rating);
        break;
      default: // 推荐 - keep default order
        break;
    }

    return result;
  }, [skills, searchQuery, activeCategory, filterBy, sortBy, showMyFavorites, favoritedIds]);

  // Stats
  const totalCount = skills.length;
  const installedCount = skills.filter((s) => s.installStatus === 'installed').length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveCategory('全部');
    setFilterBy('全部');
    setShowMyFavorites(false);
  };

  return (
    <div>
      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="flex gap-3 mb-6"
      >
        {[
          { label: '全部SKILL', value: totalCount },
          { label: '已安装', value: installedCount },
          { label: '我的收藏', value: favoritedIds.length },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
            className="bg-[#F8F7F6] rounded-[10px] px-[18px] py-[14px] min-w-[100px]"
          >
            <div className="text-h3 text-[#8E6A48] font-mono">{stat.value}</div>
            <div className="text-[13px] text-[#8B847E] mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Market Header with Category Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[#F8F7F6] border-b border-[#DEDBD8] -mx-8 px-8 py-5 mb-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A39E]" />
            <input
              type="text"
              placeholder="搜索SKILL名称、风格、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[38px] pl-9 pr-8 bg-white border border-[#DEDBD8] rounded-full text-[14px] text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5C1BC] hover:text-[#8B847E] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Tags - horizontal scroll */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0 scrollbar-hide">
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setShowMyFavorites(false); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-caption font-medium whitespace-nowrap transition-all duration-200',
                  activeCategory === cat
                    ? 'bg-[#A8835F] text-white'
                    : 'bg-white text-[#6E6862] hover:bg-[#F5EDE6]'
                )}
              >
                {cat}
              </button>
            ))}
            {/* My Favorites tab */}
            <button
              onClick={() => setShowMyFavorites(!showMyFavorites)}
              className={cn(
                'px-3 py-1.5 rounded-full text-caption font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1',
                showMyFavorites
                  ? 'bg-[#C49A3C] text-white'
                  : 'bg-white text-[#6E6862] hover:bg-[#FDF8F0]'
              )}
            >
              <Bookmark size={12} />
              我的收藏
            </button>
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setFilterDropdownOpen(!filterDropdownOpen); setSortDropdownOpen(false); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] text-[#6E6862] bg-white border border-[#DEDBD8] hover:border-[#D9BFA8] transition-colors"
            >
              {filterBy}
              <ChevronDown size={14} />
            </button>
            {filterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setFilterDropdownOpen(false)} />
                <div className="absolute right-0 top-9 w-32 bg-white rounded-lg border border-[#DEDBD8] shadow-[0_4px_16px_rgba(30,28,26,0.08)] py-1 z-[100]">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setFilterBy(opt); setFilterDropdownOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-[13px] text-left transition-colors',
                        filterBy === opt ? 'text-[#A8835F] bg-[#FBF7F4]' : 'text-[#524D48] hover:bg-[#F8F7F6]'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setFilterDropdownOpen(false); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] text-[#6E6862] bg-white border border-[#DEDBD8] hover:border-[#D9BFA8] transition-colors"
            >
              {sortBy}
              <ChevronDown size={14} />
            </button>
            {sortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setSortDropdownOpen(false)} />
                <div className="absolute right-0 top-9 w-32 bg-white rounded-lg border border-[#DEDBD8] shadow-[0_4px_16px_rgba(30,28,26,0.08)] py-1 z-[100]">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setSortDropdownOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-[13px] text-left transition-colors',
                        sortBy === opt ? 'text-[#A8835F] bg-[#FBF7F4]' : 'text-[#524D48] hover:bg-[#F8F7F6]'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      {filteredSkills.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <Search size={48} className="text-[#C5C1BC] mb-4" />
          <h3 className="text-h3 text-[#6E6862] mb-2">
            {showMyFavorites ? '还没有收藏的SKILL' : '没有找到匹配的SKILL'}
          </h3>
          <p className="text-body text-[#A8A39E] mb-6">
            {showMyFavorites ? '浏览市场并收藏感兴趣的SKILL' : '试试其他关键词或筛选条件'}
          </p>
          {(searchQuery || showMyFavorites || activeCategory !== '全部' || filterBy !== '全部') && (
            <button
              onClick={clearAllFilters}
              className="h-10 px-5 bg-[#A8835F] text-white rounded-lg text-[14px] font-medium hover:bg-[#8E6A48] transition-colors"
            >
              清除筛选
            </button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Installed Section */}
          {skills.some((s) => s.installStatus === 'installed') && !showMyFavorites && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[15px] font-medium text-[#524D48]">已安装</h3>
                <span className="text-[12px] font-mono text-[#A8A39E]">
                  {skills.filter((s) => s.installStatus === 'installed').length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {skills
                  .filter((s) => s.installStatus === 'installed')
                  .map((skill, index) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      index={index}
                      onOpenDetail={onOpenDetail}
                      onToggleInstall={onToggleInstall}
                      onToggleFavorite={onToggleFavorite}
                      onRateSkill={onRateSkill}
                      isFavorited={favoritedIds.includes(skill.id)}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {/* Available Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-[15px] font-medium text-[#524D48]">
                {showMyFavorites ? '我的收藏' : '全部SKILL'}
              </h3>
              <span className="text-[12px] font-mono text-[#A8A39E]">{filteredSkills.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredSkills.map((skill, index) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  index={index}
                  onOpenDetail={onOpenDetail}
                  onToggleInstall={onToggleInstall}
                  onToggleFavorite={onToggleFavorite}
                  onRateSkill={onRateSkill}
                  isFavorited={favoritedIds.includes(skill.id)}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
