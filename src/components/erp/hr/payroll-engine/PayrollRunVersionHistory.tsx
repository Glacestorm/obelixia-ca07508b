/**
 * PayrollRunVersionHistory — Timeline visual del historial de runs por período
 * Muestra la cadena de versiones: initial → recalculation → correction
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type PayrollRun,
  RUN_STATUS_CONFIG,
  RUN_TYPE_LABELS,
  formatRunLabel,
} from '@/engines/erp/hr/payrollRunEngine';
import { Clock, ArrowRight, CheckCircle, XCircle, Archive, ShieldCheck, Eye } from 'lucide-react';

interface Props {
  runs: PayrollRun[];
  activeRunId?: string | null;
  onSelectRun?: (run: PayrollRun) => void;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: Clock,
  running: Clock,
  calculated: CheckCircle,
  reviewed: Eye,
  approved: ShieldCheck,
  failed: XCircle,
  cancelled: XCircle,
  superseded: Archive,
};

export function PayrollRunVersionHistory({ runs, activeRunId, onSelectRun }: Props) {
  if (runs.length === 0) return null;

  // Sort by run_number ascending for timeline
  const sorted = [...runs].sort((a, b) => a.run_number - b.run_number);

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Historial de versiones
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {sorted.map((run, i) => {
          const statusCfg = RUN_STATUS_CONFIG[run.status];
          const Icon = STATUS_ICONS[run.status] || Clock;
          const isActive = run.id === activeRunId;
          const isCurrent = run.status === 'calculated' || run.status === 'reviewed' || run.status === 'approved';

          return (
            <div key={run.id} className="flex items-center gap-1">
              <button
                onClick={() => onSelectRun?.(run)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all",
                  "hover:bg-muted/50",
                  isActive && "ring-2 ring-primary/40",
                  run.status === 'superseded' && "opacity-50",
                  isCurrent && "border-emerald-500/30 bg-emerald-500/5"
                )}
              >
                <Icon className={cn("h-3 w-3", statusCfg.color.split(' ').pop())} />
                <span className="font-medium">v{run.version || run.run_number}</span>
                <Badge variant="outline" className="text-[8px] px-1 py-0">
                  {RUN_TYPE_LABELS[run.run_type]?.split(' ')[0]}
                </Badge>
              </button>
              {i < sorted.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PayrollRunVersionHistory;
