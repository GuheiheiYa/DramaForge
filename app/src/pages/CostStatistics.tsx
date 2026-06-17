import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastInfo, toastError } from '@/hooks/useToast';
import {
  getCostSummary,
  type CostOverallSummaryData,
  type CostServiceSummaryData,
  type CostProjectSummaryData,
  type CostProjectBreakdownData,
} from '@/lib/api';

type CostBreakdown = CostServiceSummaryData | CostProjectBreakdownData;

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full h-2 bg-[#EFEDEB] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function CostPieChart({ data }: { data: CostBreakdown[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const segments = data.reduce<Array<CostBreakdown & { pct: number; startPct: number; endPct: number }>>((acc, d) => {
    const pct = d.amount / total;
    const startPct = acc.length > 0 ? acc[acc.length - 1].endPct : 0;
    acc.push({ ...d, pct, startPct, endPct: startPct + pct });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-6">
      {/* Pie */}
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
        <circle cx="70" cy="70" r="60" fill="#EFEDEB" />
        {segments.map((seg) => {
          const angleStart = seg.startPct * 360 - 90;
          const angleEnd = seg.endPct * 360 - 90;
          const x1 = 70 + 60 * Math.cos((angleStart * Math.PI) / 180);
          const y1 = 70 + 60 * Math.sin((angleStart * Math.PI) / 180);
          const x2 = 70 + 60 * Math.cos((angleEnd * Math.PI) / 180);
          const y2 = 70 + 60 * Math.sin((angleEnd * Math.PI) / 180);
          const largeArc = seg.pct > 0.5 ? 1 : 0;
          return (
            <motion.path
              key={seg.service}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              d={`M 70 70 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={seg.color}
              stroke="white"
              strokeWidth="1"
            />
          );
        })}
        <circle cx="70" cy="70" r="35" fill="white" />
        <text x="70" y="65" textAnchor="middle" fontSize="16" fontWeight="700" fill="#383431">¥{total.toFixed(1)}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#8B847E">总计</text>
      </svg>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {segments.sort((a, b) => b.amount - a.amount).map((seg) => (
          <div key={seg.service} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[#524D48] flex-1">{seg.label}</span>
            <span className="text-[#8B847E]">¥{seg.amount.toFixed(2)}</span>
            <span className="text-[#C5C1BC] w-10 text-right">{(seg.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CostStatistics() {
  const [costData, setCostData] = useState<CostOverallSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  // 从后端加载成本统计
  const loadCostData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCostSummary({ days: 30 });
      setCostData(data);
    } catch (err) {
      console.error('[CostStatistics] 加载失败:', err);
      toastError('加载成本数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCostData();
  }, [loadCostData]);

  const totalCost = costData?.total_cost || 0;
  const projectCount = costData?.project_count || 0;
  const projectSummaries = costData?.project_summaries || [];
  const serviceSummaries = costData?.service_summaries || [];

  const totalEpisodes = useMemo(() =>
    projectSummaries.reduce((s, p) => s + p.episodes, 0),
    [projectSummaries]
  );
  const avgCostPerEpisode = totalEpisodes > 0 ? totalCost / totalEpisodes : 0;

  const displayBreakdown = useMemo(() => {
    if (selectedProject === 'all') return serviceSummaries;
    const proj = projectSummaries.find((p) => p.project_name === selectedProject);
    return proj?.breakdown || [];
  }, [selectedProject, serviceSummaries, projectSummaries]);

  return (
    <>
      <div className="px-6 py-5 max-w-[1280px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-6">
          <h1 className="text-h1 mb-1">成本统计</h1>
          <p className="text-body text-[#6E6862]">查看和分析AI生成服务的成本消耗</p>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#A8835F]" />
            <span className="ml-3 text-[#A8A39E]">加载中...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: '总消耗', value: `¥${totalCost.toFixed(2)}`, sub: `${projectCount} 个项目`, color: 'text-[#8E6A48]', icon: <DollarSign size={20} />, trend: 'up' },
                { label: '平均单集成本', value: `¥${avgCostPerEpisode.toFixed(2)}`, sub: `${totalEpisodes} 集`, color: 'text-[#5A7FA8]', icon: <BarChart3 size={20} />, trend: null },
                { label: '最高成本项目', value: projectSummaries[0]?.project_name || '-', sub: `¥${projectSummaries[0]?.total.toFixed(2) || '0'}`, color: 'text-[#7A6B8A]', icon: <TrendingUp size={20} />, trend: 'up' },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }} className="bg-white rounded-xl border border-[#DEDBD8] p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-caption text-[#8B847E]">{stat.label}</span>
                    <span className={cn('', stat.color)}>{stat.icon}</span>
                  </div>
                  <p className={cn('text-h2 font-mono mb-0.5', stat.color)}>{stat.value}</p>
                  <p className="text-caption text-[#A8A39E]">{stat.sub}</p>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Project Costs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="col-span-1"
          >
            <h3 className="text-[15px] font-semibold text-[#383431] mb-4">项目消耗</h3>
            <div className="space-y-3">
              {projectSummaries.map((proj, i) => (
                <motion.div
                  key={proj.project_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                  className={cn(
                    'bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md',
                    selectedProject === proj.project_name ? 'border-[#A8835F] shadow-sm' : 'border-[#DEDBD8]'
                  )}
                  onClick={() => setSelectedProject(proj.project_name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-small font-medium text-[#383431]">{proj.project_name}</h4>
                    <span className="text-small font-mono font-semibold text-[#8E6A48]">¥{proj.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#A8A39E] mb-2">
                    <span>{proj.episodes} 集</span>
                    <span>¥{proj.cost_per_episode.toFixed(2)}/集</span>
                  </div>
                  <MiniBar value={proj.total} max={projectSummaries.reduce((s, p) => Math.max(s, p.total), 1)} color="#A8835F" />
                </motion.div>
              ))}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={loadCostData}
                className="w-full h-9 rounded-lg border border-[#DEDBD8] text-caption text-[#8B847E] hover:bg-[#F8F7F6] transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} /> 刷新数据
              </motion.button>
            </div>
          </motion.div>

          {/* Right: Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="col-span-2"
          >
            {/* Project selector */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-[#383431]">费用构成</h3>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="h-8 px-3 bg-white border border-[#DEDBD8] rounded-lg text-[12px] text-[#524D48] outline-none focus:border-[#A8835F] cursor-pointer"
              >
                <option value="all">全部项目</option>
                {projectSummaries.map((p) => (
                  <option key={p.project_id} value={p.project_name}>{p.project_name}</option>
                ))}
              </select>
            </div>

            {/* Pie Chart */}
            <motion.div
              key={selectedProject}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl border border-[#DEDBD8] p-5 shadow-sm mb-4"
            >
              <CostPieChart data={displayBreakdown} />
            </motion.div>

            {/* Detailed breakdown table */}
            <div className="bg-white rounded-xl border border-[#DEDBD8] shadow-sm overflow-hidden">
              <div className="h-10 flex items-center px-4 bg-[#F8F7F6] border-b border-[#EFEDEB] text-caption text-[#8B847E] font-medium">
                <span className="flex-1">服务</span>
                <span className="w-24 text-center">用量</span>
                <span className="w-24 text-center">费用</span>
                <span className="w-20 text-center">占比</span>
              </div>
              {displayBreakdown.map((item, i) => {
                const total = displayBreakdown.reduce((s, d) => s + d.amount, 0);
                const pct = total > 0 ? (item.amount / total) * 100 : 0;
                return (
                  <motion.div
                    key={item.service}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="h-12 flex items-center px-4 border-b border-[#EFEDEB] hover:bg-[#FBF7F4] transition-colors"
                  >
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-small text-[#383431]">{item.label}</span>
                    </div>
                    <span className="w-24 text-center text-caption text-[#A8A39E]">{item.usage}</span>
                    <span className="w-24 text-center text-small font-mono font-semibold text-[#524D48]">¥{item.amount.toFixed(2)}</span>
                    <span className="w-20 text-center text-caption text-[#A8A39E]">{pct.toFixed(1)}%</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
