import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileVideo, Download, AlertCircle, Loader2 } from 'lucide-react';
import type { ExportResolution, ExportFormat } from './types';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks/useToast';

interface ExportPanelProps {
  onClose: () => void;
  projectName?: string;
  totalDuration?: number;
  shotCount?: number;
}

const RESOLUTION_OPTIONS: { key: ExportResolution; label: string; pixels: string; desc: string }[] = [
  { key: '720p', label: '720p HD', pixels: '1280×720', desc: '适合快速预览' },
  { key: '1080p', label: '1080p Full HD', pixels: '1920×1080', desc: '推荐质量' },
  { key: '4K', label: '4K Ultra HD', pixels: '3840×2160', desc: '最高质量' },
];

const FORMAT_OPTIONS: { key: ExportFormat; label: string; ext: string }[] = [
  { key: 'MP4', label: 'MP4', ext: '.mp4' },
  { key: 'GIF', label: 'GIF动图', ext: '.gif' },
  { key: '连帧图', label: '连帧图序列', ext: '.png' },
];

const QUALITY_LABELS = [
  { threshold: 30, label: '低' },
  { threshold: 55, label: '中' },
  { threshold: 80, label: '高' },
  { threshold: 95, label: '最高' },
];

export default function ExportPanel({
  onClose,
  projectName = '《樱花下的约定》第1集',
  totalDuration = 36,
  shotCount = 8,
}: ExportPanelProps) {
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [format, setFormat] = useState<ExportFormat>('MP4');
  const [quality, setQuality] = useState(75);
  const [filename, setFilename] = useState('');
  const [subtitleBurn, setSubtitleBurn] = useState(true);
  const [exportAudio, setExportAudio] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const autoFilename = filename || `${projectName}_成片`;

  const estimatedSizeMB = (() => {
    const resMult = resolution === '720p' ? 1 : resolution === '1080p' ? 2.5 : 8;
    const qualMult = quality / 100;
    return Math.round(totalDuration * resMult * qualMult * 0.8);
  })();

  const qualityLabel = QUALITY_LABELS.reduce((acc, { threshold, label }) => {
    if (quality >= threshold) return label;
    return acc;
  }, '低');

  const handleExport = () => {
    setExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    setTimeout(() => {
      setExporting(false);
      toastSuccess('导出完成！', `文件已保存为 ${autoFilename}${FORMAT_OPTIONS.find(f => f.key === format)?.ext}`);
      onClose();
    }, 5000);
  };

  const handleCancel = () => {
    if (!exporting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={handleCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        className="relative bg-white rounded-xl shadow-xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEDEB]">
          <h2 className="text-lg font-semibold text-[#383431]">导出设置</h2>
          {!exporting && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F8F7F6] text-[#8B847E] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Export progress */}
          <AnimatePresence>
            {exporting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#F0F5F0] rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 size={18} className="text-[#5B8C5A] animate-spin" />
                  <span className="text-[13px] text-[#524D48] font-medium">正在导出...</span>
                  <span className="text-[12px] font-mono text-[#A8835F] ml-auto">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#DEDBD8] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#5B8C5A] rounded-full"
                    style={{ width: `${exportProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Project info */}
          <div className="bg-[#F8F7F6] rounded-lg p-4 space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <FileVideo size={16} className="text-[#A8835F]" />
              <span className="text-[13px] font-medium text-[#524D48]">{projectName}</span>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[#8B847E]">
              <span>总时长 {Math.floor(totalDuration / 60)}分{totalDuration % 60}秒</span>
              <span>·</span>
              <span>{shotCount}个片段</span>
              <span>·</span>
              <span className="text-[#A8835F]">约 {estimatedSizeMB}MB</span>
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-[13px] font-medium text-[#524D48] mb-2 block">分辨率</label>
            <div className="grid grid-cols-3 gap-2">
              {RESOLUTION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => !exporting && setResolution(opt.key)}
                  disabled={exporting}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                    resolution === opt.key
                      ? 'border-[#A8835F] bg-[#FBF7F4] shadow-sm'
                      : 'border-[#DEDBD8] hover:border-[#A8835F] bg-white',
                    exporting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className={cn(
                    'text-[14px] font-medium',
                    resolution === opt.key ? 'text-[#755235]' : 'text-[#524D48]'
                  )}>
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-[#A8A39E] font-mono">{opt.pixels}</span>
                  <span className="text-[10px] text-[#A8A39E]">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-[13px] font-medium text-[#524D48] mb-2 block">导出格式</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => !exporting && setFormat(opt.key)}
                  disabled={exporting}
                  className={cn(
                    'flex-1 h-10 rounded-lg border text-[13px] font-medium transition-all',
                    format === opt.key
                      ? 'border-[#A8835F] bg-[#FBF7F4] text-[#755235]'
                      : 'border-[#DEDBD8] text-[#524D48] hover:border-[#A8835F]',
                    exporting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium text-[#524D48]">质量</label>
              <span className="text-[12px] font-mono text-[#A8835F]">{quality}% ({qualityLabel})</span>
            </div>
            <input
              type="range"
              min={30}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              disabled={exporting}
              className="w-full accent-[#A8835F] disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-[#A8A39E] mt-0.5">
              <span>低（省空间）</span>
              <span>中</span>
              <span>高</span>
              <span>最高</span>
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="text-[13px] font-medium text-[#524D48] mb-2 block">文件名</label>
            <input
              type="text"
              value={autoFilename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={exporting}
              className="w-full h-10 bg-[#F8F7F6] border border-[#DEDBD8] rounded-lg px-3 text-[14px] text-[#524D48] outline-none focus:border-[#A8835F] focus:shadow-inner transition-all disabled:opacity-50"
            />
            <p className="text-[11px] text-[#A8A39E] mt-1">
              导出为 {autoFilename}{FORMAT_OPTIONS.find(f => f.key === format)?.ext}
            </p>
          </div>

          {/* Subtitle + Audio toggles */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#524D48] mb-1 block">选项</label>
            <label className={cn("flex items-center gap-2.5 cursor-pointer", exporting && "opacity-50")}>
              <input
                type="checkbox"
                checked={subtitleBurn}
                onChange={(e) => setSubtitleBurn(e.target.checked)}
                disabled={exporting}
                className="w-4 h-4 rounded border-[#DEDBD8] text-[#A8835F] accent-[#A8835F]"
              />
              <span className="text-[13px] text-[#524D48]">烧录字幕</span>
            </label>
            <label className={cn("flex items-center gap-2.5 cursor-pointer", exporting && "opacity-50")}>
              <input
                type="checkbox"
                checked={exportAudio}
                onChange={(e) => setExportAudio(e.target.checked)}
                disabled={exporting}
                className="w-4 h-4 rounded border-[#DEDBD8] text-[#A8835F] accent-[#A8835F]"
              />
              <span className="text-[13px] text-[#524D48]">导出音频（配音+BGM）</span>
            </label>
          </div>

          {/* Cost estimate */}
          <div className="flex items-start gap-2 bg-[#F0F3F7] rounded-lg p-3">
            <AlertCircle size={14} className="text-[#5A7FA8] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#5A7FA8] leading-relaxed">
              本次导出消耗约 ¥2-5元 API额度。导出完成后将自动触发下载。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#EFEDEB] bg-[#FAFAFA]">
          {!exporting ? (
            <>
              <button
                onClick={onClose}
                className="h-9 px-4 border border-[#DEDBD8] hover:border-[#A8835F] text-[#524D48] text-[13px] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                className="h-9 px-5 bg-[#A8835F] hover:bg-[#8E6A48] text-white text-[13px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download size={14} />
                开始导出
              </button>
            </>
          ) : (
            <button
              onClick={() => { setExporting(false); onClose(); }}
              className="h-9 px-4 border border-[#DEDBD8] hover:border-[#B85C50] text-[#B85C50] text-[13px] rounded-lg transition-colors"
            >
              取消导出
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
