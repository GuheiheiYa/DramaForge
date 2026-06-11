import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export type StatusType = '草稿' | '进行中' | '生成中' | '待审核' | '已完成' | '失败';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  onClick?: () => void;
}

const statusConfig: Record<StatusType, { bg: string; text: string; icon: React.ReactNode | null }> = {
  '草稿': {
    bg: 'bg-[#EFEDEB]',
    text: 'text-[#6E6862]',
    icon: null,
  },
  '进行中': {
    bg: 'bg-[#F0F3F7]',
    text: 'text-[#5A7FA8]',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  '生成中': {
    bg: 'bg-[#F0F3F7]',
    text: 'text-[#5A7FA8]',
    icon: <span className="w-2 h-2 rounded-full bg-[#5A7FA8] animate-pulse-glow" />,
  },
  '待审核': {
    bg: 'bg-[#FDF8F0]',
    text: 'text-[#C49A3C]',
    icon: null,
  },
  '已完成': {
    bg: 'bg-[#F0F5F0]',
    text: 'text-[#5B8C5A]',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  '失败': {
    bg: 'bg-[#FDF2F0]',
    text: 'text-[#B85C50]',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

export default function StatusBadge({ status, className = '', onClick }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium ${config.bg} ${config.text} ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      title={onClick ? '点击切换状态' : undefined}
    >
      {config.icon}
      {status}
    </span>
  );
}
