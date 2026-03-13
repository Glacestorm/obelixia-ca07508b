/**
 * PayrollReviewBadge — Visual badge for review_status on payroll records
 */
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReviewStatus = 'pending' | 'approved' | 'flagged' | 'reviewed';

const CONFIG: Record<ReviewStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  approved: {
    label: 'Aprobada',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  flagged: {
    label: 'Marcada',
    icon: AlertTriangle,
    className: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
  reviewed: {
    label: 'Revisada',
    icon: Eye,
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400',
  },
};

interface Props {
  status: string | null | undefined;
  size?: 'sm' | 'default';
}

export function PayrollReviewBadge({ status, size = 'sm' }: Props) {
  const key = (status as ReviewStatus) || 'pending';
  const cfg = CONFIG[key] || CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        cfg.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0'
      )}
    >
      <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
      {cfg.label}
    </Badge>
  );
}
