import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Search, ChevronDown, Plus, Users } from 'lucide-react';
import CharacterCard from './CharacterCard';
import type { Character, CharacterRole } from './types';

interface CharacterGridProps {
  characters: Character[];
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onOpenDetail: (character: Character) => void;
  onNew: () => void;
  onGenerateImage: (character: Character) => void;
}

type ViewMode = 'grid' | 'list';
type FilterTab = '全部' | '主角' | '配角' | '反派' | '已生成形象' | '未生成';
type SortOption = '最近编辑' | '名称' | '创建时间';

const filterTabs: FilterTab[] = ['全部', '主角', '配角', '已生成形象', '未生成'];
const sortOptions: SortOption[] = ['最近编辑', '名称', '创建时间'];

export default function CharacterGrid({
  characters,
  onEdit,
  onDelete,
  onOpenDetail,
  onNew,
  onGenerateImage,
}: CharacterGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('全部');
  const [sortBy, setSortBy] = useState<SortOption>('最近编辑');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const filteredCharacters = useMemo(() => {
    let result = [...characters];

    // Search filter (real-time)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.personalityTraits.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Tab filter with animation support
    switch (filterTab) {
      case '主角':
        result = result.filter((c) => c.role === '主角');
        break;
      case '配角':
        result = result.filter((c) => c.role === '配角' || c.role === '龙套');
        break;
      case '已生成形象':
        result = result.filter((c) => c.hasGeneratedImage);
        break;
      case '未生成':
        result = result.filter((c) => !c.hasGeneratedImage);
        break;
    }

    // Sort
    switch (sortBy) {
      case '名称':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case '创建时间':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case '最近编辑':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return result;
  }, [characters, searchQuery, filterTab, sortBy]);

  return (
    <div>
      {/* Filter Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="sticky top-[52px] z-10 bg-[#FBF7F4] py-4 flex flex-wrap items-center gap-3 mb-4"
      >
        {/* Search */}
        <div className="relative w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A39E]" />
          <input
            type="text"
            placeholder="搜索角色名称、描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#F8F7F6] border border-[#DEDBD8] rounded-md text-small text-[#383431] placeholder:text-[#A8A39E] focus:outline-none focus:border-[#D9BFA8] focus:shadow-inner transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A39E] hover:text-[#6E6862]"
            >
              <span className="text-[11px]">清除</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 flex-1">
          <AnimatePresence mode="popLayout">
            {filterTabs.map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setFilterTab(tab)}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`px-3 py-1.5 rounded-full text-caption font-medium transition-all duration-200 ${
                  filterTab === tab
                    ? 'bg-[#A8835F] text-white'
                    : 'bg-[#F8F7F6] text-[#6E6862] hover:bg-[#F5EDE6]'
                }`}
              >
                {tab}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] text-[#6E6862] hover:bg-[#F8F7F6] transition-colors"
          >
            {sortBy}
            <ChevronDown size={14} className={`transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {sortDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-9 w-32 bg-white rounded-lg border border-[#DEDBD8] shadow-[0_4px_16px_rgba(30,28,26,0.08)] py-1 z-10"
              >
                {sortOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setSortDropdownOpen(false); }}
                    className={`w-full px-3 py-2 text-[13px] text-left transition-colors ${
                      sortBy === opt ? 'text-[#A8835F] bg-[#FBF7F4]' : 'text-[#524D48] hover:bg-[#F8F7F6]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Toggle + New */}
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode('grid')}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              viewMode === 'grid' ? 'bg-[#FBF7F4] text-[#A8835F]' : 'text-[#8B847E] hover:bg-[#F8F7F6]'
            }`}
            title="网格视图"
          >
            <LayoutGrid size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              viewMode === 'list' ? 'bg-[#FBF7F4] text-[#A8835F]' : 'text-[#8B847E] hover:bg-[#F8F7F6]'
            }`}
            title="列表视图"
          >
            <List size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onNew}
            className="ml-2 h-8 px-3 bg-[#A8835F] text-white rounded-md text-[13px] font-medium flex items-center gap-1 hover:bg-[#8E6A48] active:scale-[0.97] transition-all shadow-[0_1px_2px_rgba(30,28,26,0.04)]"
          >
            <Plus size={15} />
            新建角色
          </motion.button>
        </div>
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {filteredCharacters.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Users size={48} className="text-[#C5C1BC] mb-4" />
            <h3 className="text-h3 text-[#6E6862] mb-2">
              {searchQuery ? '没有找到匹配的角色' : '还没有角色'}
            </h3>
            <p className="text-body text-[#A8A39E] mb-6">
              {searchQuery ? '试试其他关键词' : '创建角色后，AI会自动为其生成形象并管理角色资产'}
            </p>
            {!searchQuery && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onNew}
                className="h-10 px-5 bg-[#A8835F] text-white rounded-lg text-[15px] font-medium flex items-center gap-2 hover:bg-[#8E6A48] transition-colors shadow-[0_1px_2px_rgba(30,28,26,0.04)]"
              >
                <Plus size={18} />
                创建角色
              </motion.button>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filteredCharacters.map((character, i) => (
              <CharacterCard
                key={character.id}
                character={character}
                index={i}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenDetail={onOpenDetail}
                onGenerateImage={onGenerateImage}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CharacterListView
              characters={filteredCharacters}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenDetail={onOpenDetail}
              onGenerateImage={onGenerateImage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- List View ---------- */
function CharacterListView({
  characters,
  onEdit,
  onDelete,
  onOpenDetail,
  onGenerateImage,
}: {
  characters: Character[];
  onEdit: (c: Character) => void;
  onDelete: (c: Character) => void;
  onOpenDetail: (c: Character) => void;
  onGenerateImage: (c: Character) => void;
}) {
  const roleColorMap: Record<CharacterRole, { bg: string; text: string }> = {
    '主角': { bg: '#FBF7F4', text: '#8E6A48' },
    '配角': { bg: '#F0F3F7', text: '#5A7FA8' },
    '龙套': { bg: '#EFEDEB', text: '#8B847E' },
  };

  return (
    <div className="bg-white rounded-xl border border-[#DEDBD8] overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[56px_1fr_80px_160px_100px_80px_60px] gap-2 px-4 py-3 bg-[#F8F7F6] border-b border-[#DEDBD8] text-[12px] text-[#A8A39E] font-medium">
        <div>形象</div>
        <div>名称</div>
        <div>类型</div>
        <div>性格</div>
        <div>形象状态</div>
        <div>资产数</div>
        <div>操作</div>
      </div>
      {/* Table Rows */}
      {characters.map((character, i) => {
        const roleStyle = roleColorMap[character.role];
        return (
          <motion.div
            key={character.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-[56px_1fr_80px_160px_100px_80px_60px] gap-2 px-4 py-3 border-b border-[#EFEDEB] hover:bg-[#F8F7F6] transition-colors items-center cursor-pointer"
            onClick={() => onOpenDetail(character)}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              {character.avatarUrl ? (
                <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#EFEDEB] flex items-center justify-center text-[#A8A39E] text-[14px]">
                  {character.name[0]}
                </div>
              )}
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#383431]">{character.name}</div>
              <div className="text-[12px] text-[#A8A39E] truncate">{character.description.slice(0, 40)}...</div>
            </div>
            <div>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
              >
                {character.role}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {character.personalityTraits.slice(0, 3).map((t) => (
                <span key={t} className="px-1.5 py-0.5 bg-[#FBF7F4] text-[#8E6A48] text-[11px] rounded">
                  {t}
                </span>
              ))}
            </div>
            <div>
              {character.hasGeneratedImage ? (
                <span className="text-[12px] text-[#5B8C5A]">已生成</span>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerateImage(character); }}
                  className="text-[12px] text-[#A8835F] hover:underline"
                >
                  未生成
                </button>
              )}
            </div>
            <div className="text-[13px] text-[#A8A39E]">{character.assets.length}个</div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(character); }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#EFEDEB] text-[#8B847E]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(character); }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#FDF2F0] text-[#B85C50]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
