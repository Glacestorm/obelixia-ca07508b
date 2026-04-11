/**
 * S9ReadinessBadge — Badge visual para estado de readiness de módulos S9
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, Lock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { S9ModuleReadiness } from '@/types/s9-compliance';

const config: Record<S9ModuleReadiness, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  ready: {
    label: 'Operativo',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  internal_ready: {
    label: 'Interno',
    icon: Settings,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  preparatory: {
    label: 'Preparatorio',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  pending_external: {
    label: 'Pendiente ext.',
    icon: Lock,
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  partial_controlled: {
    label: 'Parcial',
    icon: AlertTriangle,
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  },
};

interface S9ReadinessBadgeProps {
  readiness: S9ModuleReadiness;
  className?: string;
}

export const S9ReadinessBadge = memo(function S9ReadinessBadge({ readiness, className }: S9ReadinessBadgeProps) {
  const c = config[readiness];
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 text-[10px] font-normal border', c.className, className)}>
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </Badge>
  );
});
