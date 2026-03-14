/**
 * ActiveRunIndicator — Micro-componente que muestra el estado del último run
 * Reutilizable en PeriodManager, RecordsList, y cualquier panel que necesite contexto de run
 */
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Play, Clock, CheckCircle, XCircle, Archive, ShieldCheck, Eye, Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import type { PayrollRunStatus, PayrollRunType } from '@/engines/erp/hr/payrollRunEngine';

interface RunSummary {
  id: string;
  run_number: number;
  run_type: PayrollRunType;
  version: number;
  status: PayrollRunStatus;
  total_runs: number;
  superseded_count: number;
  has_recalculation: boolean;
}

interface Props {
  companyId: string;
  periodId: string;
  /** compact = single badge, full = mini card */
  variant?: 'compact' | 'full';
  className?: string;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: Clock,
  running: Loader2,
  calculated: CheckCircle,
  reviewed: Eye,
  approved: ShieldCheck,
  failed: XCircle,
  cancelled: XCircle,
  superseded: Archive,
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  running: 'Calculando',
  calculated: 'Calculado',
  reviewed: 'Revisado',
  approved: 'Aprobado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  superseded: 'Sustituido',
};

const TYPE_SHORT: Record<string, string> = {
  initial: 'Inicial',
  recalculation: 'Recálculo',
  correction: 'Corrección',
  simulation: 'Simulación',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted-foreground',
  running: 'text-blue-600 animate-spin',
  calculated: 'text-emerald-600',
  reviewed: 'text-blue-600',
  approved: 'text-green-600',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
  superseded: 'text-muted-foreground/60',
};

export function ActiveRunIndicator({ companyId, periodId, variant = 'compact', className }: Props) {
  const [summary, setSummary] = useState<RunSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Fetch latest non-superseded run + count
        const { data, error } = await supabase
          .from('erp_hr_payroll_runs')
          .select('id, run_number, run_type, version, status')
          .eq('company_id', companyId)
          .eq('period_id', periodId)
          .order('run_number', { ascending: false })
          .limit(10);

        if (error || !data || cancelled) return;

        const allRuns = data as Array<{ id: string; run_number: number; run_type: string; version: number; status: string }>;
        if (allRuns.length === 0) { setSummary(null); return; }

        const active = allRuns.find(r => r.status !== 'superseded' && r.status !== 'cancelled') || allRuns[0];
        const supersededCount = allRuns.filter(r => r.status === 'superseded').length;
        const hasRecalc = allRuns.some(r => r.run_type === 'recalculation' || r.run_type === 'correction');

        setSummary({
          id: active.id,
          run_number: active.run_number,
          run_type: active.run_type as PayrollRunType,
          version: active.version,
          status: active.status as PayrollRunStatus,
          total_runs: allRuns.length,
          superseded_count: supersededCount,
          has_recalculation: hasRecalc,
        });
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, [companyId, periodId]);

  if (!summary) return null;

  const Icon = STATUS_ICONS[summary.status] || Clock;
  const colorClass = STATUS_COLORS[summary.status] || 'text-muted-foreground';

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Icon className={cn("h-3 w-3", colorClass)} />
        <span className="text-[10px] font-medium text-muted-foreground">
          Run v{summary.version}
        </span>
        <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
          {STATUS_LABELS[summary.status]}
        </Badge>
        {summary.has_recalculation && (
          <RefreshCw className="h-2.5 w-2.5 text-amber-500" />
        )}
        {summary.total_runs > 1 && (
          <span className="text-[9px] text-muted-foreground/60">
            ({summary.total_runs} runs)
          </span>
        )}
      </div>
    );
  }

  // Full variant — mini card
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg border bg-muted/20 text-xs",
      className
    )}>
      <div className={cn("p-1.5 rounded-md", 
        summary.status === 'failed' ? 'bg-destructive/10' :
        summary.status === 'approved' ? 'bg-green-500/10' :
        summary.status === 'calculated' || summary.status === 'reviewed' ? 'bg-emerald-500/10' :
        'bg-muted'
      )}>
        <Icon className={cn("h-4 w-4", colorClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">Run #{summary.run_number}</span>
          <Badge variant="outline" className="text-[8px] px-1 py-0">
            {TYPE_SHORT[summary.run_type]}
          </Badge>
          <Badge variant={summary.status === 'failed' ? 'destructive' : summary.status === 'approved' ? 'default' : 'secondary'} className="text-[8px] px-1 py-0">
            {STATUS_LABELS[summary.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
          <span>v{summary.version}</span>
          {summary.superseded_count > 0 && (
            <span className="flex items-center gap-0.5">
              <Archive className="h-2.5 w-2.5" />
              {summary.superseded_count} sustituidos
            </span>
          )}
          {summary.has_recalculation && (
            <span className="flex items-center gap-0.5 text-amber-600">
              <RefreshCw className="h-2.5 w-2.5" />
              Recalculado
            </span>
          )}
          {summary.status === 'failed' && (
            <span className="flex items-center gap-0.5 text-destructive">
              <AlertTriangle className="h-2.5 w-2.5" />
              Requiere atención
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActiveRunIndicator;
