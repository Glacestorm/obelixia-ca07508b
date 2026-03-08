/**
 * DataSourceBadge — Visual indicator for data origin, freshness and coverage
 * Used across all premium HR panels to distinguish real vs demo data.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Cloud, FlaskConical, Calculator, Clock, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export type DataSource = 'real' | 'synced' | 'demo' | 'derived';

interface DataSourceBadgeProps {
  source: DataSource;
  /** Last refresh/sync timestamp */
  lastUpdated?: Date | string | null;
  /** 0-100 coverage percentage */
  coverage?: number;
  /** Compact mode — just the icon + label */
  compact?: boolean;
  className?: string;
}

const SOURCE_CONFIG: Record<DataSource, {
  label: string;
  description: string;
  icon: typeof Database;
  badgeClass: string;
}> = {
  real: {
    label: 'Real',
    description: 'Datos operativos reales del ERP',
    icon: Database,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  synced: {
    label: 'Sincronizado',
    description: 'Datos sincronizados desde módulo base',
    icon: Cloud,
    badgeClass: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
  },
  demo: {
    label: 'Demo',
    description: 'Datos de demostración / seed',
    icon: FlaskConical,
    badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
  derived: {
    label: 'Derivado',
    description: 'Calculado a partir de datos existentes',
    icon: Calculator,
    badgeClass: 'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-400',
  },
};

export function DataSourceBadge({ source, lastUpdated, coverage, compact, className }: DataSourceBadgeProps) {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;

  const parsedDate = lastUpdated
    ? typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated
    : null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5 py-0 h-5 font-medium', config.badgeClass, className)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[220px]">
            <p className="font-medium">{config.description}</p>
            {parsedDate && (
              <p className="text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDistanceToNow(parsedDate, { locale: es, addSuffix: true })}
              </p>
            )}
            {coverage !== undefined && (
              <p className="text-muted-foreground">
                <Signal className="h-3 w-3 inline mr-1" />
                Cobertura: {coverage}%
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5 py-0 h-5 font-medium', config.badgeClass)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {parsedDate && (
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(parsedDate, { locale: es, addSuffix: true })}
        </span>
      )}
      {coverage !== undefined && (
        <span className="text-muted-foreground flex items-center gap-1">
          <Signal className="h-3 w-3" />
          {coverage}%
        </span>
      )}
    </div>
  );
}

/** Helper to determine data source based on available data */
export function resolveDataSource(hasRealData: boolean, hasSyncedData?: boolean): DataSource {
  if (hasRealData) return 'real';
  if (hasSyncedData) return 'synced';
  return 'demo';
}

export default DataSourceBadge;
