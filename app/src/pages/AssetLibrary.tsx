import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Image,
  Music,
  Video,
  Upload,
  Trash2,
  Download,
  Check,
  MoreHorizontal,
  Grid3X3,
  List,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastSuccess, toastInfo, toastError } from '@/hooks/useToast';
import { Toaster } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import {
  getAssets,
  uploadAsset,
  deleteAsset,
  batchDeleteAssets,
  type AssetData,
} from '@/lib/api';

type AssetType = 'all' | 'image' | 'audio' | 'video';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video';
  size: string;
  duration?: string;
  resolution?: string;
  createdAt: string;
  projectName: string;
  previewUrl: string;
  color: string;
}

/** 后端 AssetData → 前端 Asset 转换 */
function toFrontendAsset(a: AssetData, projects: { id: string; name: string }[]): Asset {
  const project = projects.find((p) => p.id === a.project_id);
  const colors: Record<string, string> = {
    image: '#F5EDE6',
    audio: '#F0F3F7',
    video: '#FDF8F0',
  };

  // 格式化时间
  let createdAt = '未知';
  if (a.created_at) {
    const date = new Date(a.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) createdAt = '刚刚';
    else if (diffMin < 60) createdAt = `${diffMin}分钟前`;
    else if (diffHour < 24) createdAt = `${diffHour}小时前`;
    else if (diffDay < 7) createdAt = `${diffDay}天前`;
    else createdAt = date.toLocaleDateString('zh-CN');
  }

  return {
    id: a.id,
    name: a.name,
    type: a.type as Asset['type'],
    size: a.size_str,
    duration: a.duration_str || undefined,
    resolution: a.resolution || undefined,
    createdAt,
    projectName: project?.name || '未知项目',
    previewUrl: a.file_path,
    color: colors[a.type] || '#F8F7F6',
  };
}

const typeIcons: Record<string, React.ReactNode> = {
  image: <Image size={16} className="text-[#A8835F]" />,
  audio: <Music size={16} className="text-[#5A7FA8]" />,
  video: <Video size={16} className="text-[#7A6B8A]" />,
};

const typeLabels: Record<string, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
};

function AssetPreview({ asset }: { asset: Asset }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center mb-4', asset.color)}>
        {asset.type === 'image' && <Image size={36} className="text-[#A8835F]/60" />}
        {asset.type === 'audio' && <Music size={36} className="text-[#5A7FA8]/60" />}
        {asset.type === 'video' && <Video size={36} className="text-[#7A6B8A]/60" />}
      </div>
      <p className="text-[13px] font-medium text-[#383431] mb-1">{asset.name}</p>
      <div className="flex items-center gap-2 text-[11px] text-[#A8A39E]">
        <span>{typeLabels[asset.type]}</span>
        <span>·</span>
        <span>{asset.size}</span>
        {asset.resolution && <><span>·</span><span>{asset.resolution}</span></>}
        {asset.duration && <><span>·</span><span>{asset.duration}</span></>}
      </div>
    </div>
  );
}

export default function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<AssetType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);

  // 从后端加载素材列表
  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssets({
        project_id: selectedProjectId || undefined,
        page_size: 200,
      });
      setAssets(data.items.map((a) => toFrontendAsset(a, projects)));
    } catch (err) {
      console.error('[AssetLibrary] 加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, projects]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const filteredAssets = useMemo(() => {
    let result = [...assets];
    if (filterType !== 'all') result = result.filter((a) => a.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || a.projectName.toLowerCase().includes(q));
    }
    return result;
  }, [assets, filterType, searchQuery]);

  const stats = useMemo(() => ({
    total: assets.length,
    images: assets.filter((a) => a.type === 'image').length,
    audios: assets.filter((a) => a.type === 'audio').length,
    videos: assets.filter((a) => a.type === 'video').length,
  }), [assets]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedProjectId) {
      toastError('请先选择一个项目');
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        await uploadAsset(selectedProjectId, file.name, file);
        successCount++;
      } catch (err) {
        console.error('[AssetLibrary] 上传失败:', err);
        toastError(`上传「${file.name}」失败`);
      }
    }

    if (successCount > 0) {
      toastSuccess(`成功上传 ${successCount} 个素材`);
      await loadAssets();
    }

    setUploading(false);
    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      await batchDeleteAssets(selectedIds);
      toastSuccess(`已删除 ${selectedIds.length} 个素材`);
      setSelectedIds([]);
      await loadAssets();
    } catch (err) {
      toastError('删除失败');
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="px-6 py-5 max-w-[1280px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <h1 className="text-h1 mb-1">素材库</h1>
          <p className="text-body text-[#6E6862]">管理项目中的所有图片、音频和视频素材</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex gap-3 mb-6"
        >
          {[
            { label: '素材总数', value: stats.total, color: 'text-[#8E6A48]' },
            { label: '图片', value: stats.images, color: 'text-[#A8835F]' },
            { label: '音频', value: stats.audios, color: 'text-[#5A7FA8]' },
            { label: '视频', value: stats.videos, color: 'text-[#7A6B8A]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="bg-[#F8F7F6] rounded-xl px-5 py-4 flex-1"
            >
              <p className={cn('text-h2 font-mono mb-0.5', stat.color)}>{stat.value}</p>
              <p className="text-caption text-[#8B847E]">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex flex-col gap-4 mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[360px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A39E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索素材名称..."
                className="w-full h-10 pl-9 pr-8 bg-white border border-[#DEDBD8] rounded-lg text-small text-[#383431] placeholder:text-[#C5C1BC] outline-none focus:border-[#D9BFA8] transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A39E]">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center border border-[#DEDBD8] rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={cn('h-9 px-2.5 flex items-center justify-center transition-colors', viewMode === 'grid' ? 'bg-[#FBF7F4] text-[#755235]' : 'text-[#A8A39E]')}>
                <Grid3X3 size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={cn('h-9 px-2.5 flex items-center justify-center transition-colors', viewMode === 'list' ? 'bg-[#FBF7F4] text-[#755235]' : 'text-[#A8A39E]')}>
                <List size={16} />
              </button>
            </div>

            {selectedIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleDeleteSelected}
                className="h-10 px-4 bg-[#B85C50] hover:bg-[#9A4A40] text-white rounded-lg text-small font-medium flex items-center gap-2"
              >
                <Trash2 size={14} />
                删除 ({selectedIds.length})
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              disabled={uploading}
              className="h-10 px-4 bg-[#A8835F] hover:bg-[#8E6A48] text-white rounded-lg text-small font-medium flex items-center gap-2 ml-auto disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  上传素材
                </>
              )}
            </motion.button>
          </div>

          <div className="flex items-center gap-1">
            {([
              { key: 'all' as AssetType, label: '全部' },
              { key: 'image' as AssetType, label: '图片' },
              { key: 'audio' as AssetType, label: '音频' },
              { key: 'video' as AssetType, label: '视频' },
            ]).map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'relative h-9 px-4 rounded-lg text-small font-medium transition-all',
                  filterType === tab.key ? 'text-[#755235]' : 'text-[#6E6862] hover:text-[#383431] hover:bg-[#F8F7F6]'
                )}
              >
                {filterType === tab.key && (
                  <motion.div layoutId="asset-filter-bg" className="absolute inset-0 bg-[#FBF7F4] border border-[#EAD8C8] rounded-lg" transition={{ duration: 0.25 }} />
                )}
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#A8835F]" />
            <span className="ml-3 text-[#A8A39E]">加载中...</span>
          </div>
        ) : (
          /* Asset Grid/List */
          <AnimatePresence mode="wait">
            {filteredAssets.length > 0 ? (
            <motion.div key={`${viewMode}-${filterType}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredAssets.map((asset, i) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className={cn(
                        'bg-white rounded-xl border border-[#DEDBD8] overflow-hidden hover:shadow-lg hover:border-[#D9BFA8] transition-all cursor-pointer group',
                        selectedIds.includes(asset.id) && 'ring-2 ring-[#A8835F]'
                      )}
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <div className={cn('aspect-video flex items-center justify-center relative', asset.color)}>
                        <div className="flex flex-col items-center">
                          {asset.type === 'image' && <Image size={32} className="text-[#A8835F]/40" />}
                          {asset.type === 'audio' && <Music size={32} className="text-[#5A7FA8]/40" />}
                          {asset.type === 'video' && <Video size={32} className="text-[#7A6B8A]/40" />}
                          <span className="text-[11px] text-[#A8A39E] mt-1">{asset.resolution || asset.duration}</span>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }}
                            className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                              selectedIds.includes(asset.id)
                                ? 'bg-[#A8835F] text-white'
                                : 'bg-white/80 text-[#8B847E] hover:bg-white'
                            )}
                          >
                            {selectedIds.includes(asset.id) ? <Check size={14} /> : <MoreHorizontal size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-[13px] font-medium text-[#383431] truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-[#A8A39E] mt-0.5">
                          <span>{typeLabels[asset.type]}</span>
                          <span>·</span>
                          <span>{asset.size}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#DEDBD8] shadow-sm overflow-hidden">
                  <div className="h-10 flex items-center px-4 bg-[#F8F7F6] border-b border-[#EFEDEB] text-caption text-[#8B847E] font-medium">
                    <span className="flex-1">素材名称</span>
                    <span className="w-16 text-center">类型</span>
                    <span className="w-24 text-center">大小</span>
                    <span className="w-28 text-center">分辨率/时长</span>
                    <span className="w-24 text-center">所属项目</span>
                    <span className="w-24 text-center">上传时间</span>
                    <span className="w-10" />
                  </div>
                  {filteredAssets.map((asset, i) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                      className="h-14 flex items-center px-4 border-b border-[#EFEDEB] hover:bg-[#FBF7F4] transition-colors cursor-pointer group"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn('w-8 h-8 rounded-md flex items-center justify-center shrink-0', asset.color)}>
                          {typeIcons[asset.type]}
                        </div>
                        <span className="text-small text-[#383431] truncate">{asset.name}</span>
                      </div>
                      <span className="w-16 text-center text-caption text-[#6E6862]">{typeLabels[asset.type]}</span>
                      <span className="w-24 text-center text-caption text-[#A8A39E]">{asset.size}</span>
                      <span className="w-28 text-center text-caption text-[#A8A39E]">{asset.resolution || asset.duration || '-'}</span>
                      <span className="w-24 text-center text-caption text-[#A8A39E]">{asset.projectName}</span>
                      <span className="w-24 text-center text-caption text-[#A8A39E]">{asset.createdAt}</span>
                      <div className="w-10 flex justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toastInfo(`下载「${asset.name}」`); }}
                          className="w-7 h-7 rounded flex items-center justify-center text-[#A8A39E] hover:text-[#5A7FA8] hover:bg-[#F0F3F7] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-[#F5EDE6] flex items-center justify-center mb-4">
                <Image size={32} className="text-[#C4A07F]" />
              </div>
              <h3 className="text-h4 text-[#524D48] mb-2">没有找到素材</h3>
              <p className="text-small text-[#A8A39E] mb-6">试试调整筛癣上传新素材</p>
              <button onClick={handleUpload} className="h-9 px-4 rounded-lg bg-[#A8835F] text-small text-white hover:bg-[#8E6A48] transition-colors flex items-center gap-2">
                <Upload size={14} /> 上传素材
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewAsset(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden"
            >
              <AssetPreview asset={previewAsset} />
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => { toastInfo(`下载「${previewAsset.name}」`); setPreviewAsset(null); }} className="flex-1 h-10 rounded-lg bg-[#A8835F] text-small font-medium text-white hover:bg-[#8E6A48] transition-colors flex items-center justify-center gap-2">
                  <Download size={14} /> 下载
                </button>
                <button onClick={async () => {
                  try {
                    await deleteAsset(previewAsset.id);
                    toastSuccess(`已删除「${previewAsset.name}」`);
                    setPreviewAsset(null);
                    await loadAssets();
                  } catch (err) {
                    toastError('删除失败');
                  }
                }} className="flex-1 h-10 rounded-lg border border-[#DEDBD8] text-small font-medium text-[#B85C50] hover:bg-[#FDF2F0] transition-colors flex items-center justify-center gap-2">
                  <Trash2 size={14} /> 删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
