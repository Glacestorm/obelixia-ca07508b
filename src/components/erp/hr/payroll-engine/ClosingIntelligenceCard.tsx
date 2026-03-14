/**
 * ClosingIntelligenceCard — V2-ES.7 Paso 7
 * Closing Intelligence Layer UI: confidence score, discrepancies,
 * narrative, reopen guard assessment.
 * ZERO-FETCH: All data derived from period props.
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain, ShieldAlert, ChevronDown, ChevronUp, Info,
  AlertTriangle, CheckCircle, XCircle, RotateCcw, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildClosingIntelligenceReport,
  type ClosingIntelligenceReport,
  type ClosingDiscrepancy,
} from '@/engines/erp/hr/closingIntelligenceEngine';
import {
  computeMonthlyKPIs,
  computePeriodComparison,
  computeExpedientReadiness,
} from '@/engines/erp/hr/monthlyExecutiveReportEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';
import type { PeriodClosureSnapshot } from '@/engines/erp/hr/payrollRunEngine';

interface ClosingIntelligenceCardProps {
  period: PayrollPeriod;
  previousPeriod?: PayrollPeriod | null;
  companyId: string;
  ssExpedient?: { status: string; score: number } | null;
  className?: string;
  /** Called when reopen guard warns — parent can show warning */
  onReopenGuardInfo?: (warnings: string[]) => void;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof CheckCircle; color: string }> = {
  error: { icon: XCircle, color: 'text-destructive' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  info: { icon: Info, color: 'text-blue-500' },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-emerald-600 bg-emerald-500/10 border-emerald-200',
  medium: 'text-amber-600 bg-amber-500/10 border-amber-200',
  low: 'text-destructive bg-destructive/10 border-destructive/20',
};

function ConfidenceGauge({ score, level, label }: { score: number; level: string; label: string }) {
  const colorClass = CONFIDENCE_COLORS[level] || CONFIDENCE_COLORS.medium;
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', colorClass)}>
      <Brain className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-sm font-bold">{score}%</span>
        </div>
        <div className="w-full h-1.5 bg-background/50 rounded-full mt-1 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all',
              level === 'high' ? 'bg-emerald-500' :
              level === 'medium' ? 'bg-amber-500' : 'bg-destructive'
            )}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DiscrepancyItem({ d }: { d: ClosingDiscrepancy }) {
  const cfg = SEVERITY_CONFIG[d.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', cfg.color)} />
      <div className="min-w-0">
        <span className="font-medium">{d.title}</span>
        <p className="text-muted-foreground">{d.explanation}</p>
        {d.recommendation && (
          <p className="text-muted-foreground italic mt-0.5">→ {d.recommendation}</p>
        )}
      </div>
    </div>
  );
}

export function ClosingIntelligenceCard({
  period,
  previousPeriod,
  companyId,
  ssExpedient,
  className,
  onReopenGuardInfo,
}: ClosingIntelligenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const report = useMemo<ClosingIntelligenceReport | null>(() => {
    const isClosed = period.status === 'closed' || period.status === 'locked';
    if (!isClosed) return null;

    const kpis = computeMonthlyKPIs(
      period.employee_count, period.total_gross, period.total_net, period.total_employer_cost,
    );

    let deltas = null;
    if (previousPeriod && previousPeriod.total_gross > 0) {
      const prevKPIs = computeMonthlyKPIs(
        previousPeriod.employee_count, previousPeriod.total_gross,
        previousPeriod.total_net, previousPeriod.total_employer_cost,
      );
      deltas = computePeriodComparison(kpis, prevKPIs).deltas;
    }

    const meta = period.metadata as any;
    const fiscalExp = meta?.fiscal_expedient;
    const fiscalData = fiscalExp?.status
      ? { status: fiscalExp.status, score: fiscalExp.reconciliation?.score ?? 0 }
      : null;
    const expedientReadiness = computeExpedientReadiness(ssExpedient ?? null, fiscalData);

    const snapshot = meta?.closure_snapshot as PeriodClosureSnapshot | null;

    return buildClosingIntelligenceReport({
      periodId: period.id,
      periodName: period.period_name,
      periodStatus: period.status,
      metadata: period.metadata || {},
      snapshot,
      kpis,
      deltas,
      expedientReadiness,
      paymentDate: period.payment_date || null,
    });
  }, [period, previousPeriod, ssExpedient]);

  if (!report) return null;

  const { confidence, discrepancies, narrative, reopen_guard, changes_vs_previous } = report;
  const warningCount = discrepancies.filter(d => d.severity === 'warning').length;
  const errorCount = discrepancies.filter(d => d.severity === 'error').length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header: Confidence + toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ConfidenceGauge score={confidence.overall} level={confidence.level} label={confidence.label} />
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0.5 cursor-help border-muted text-muted-foreground"
              >
                <Brain className="h-2.5 w-2.5 mr-0.5" />
                Inteligencia
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[260px]">
              Análisis automático de la calidad y completitud del cierre. Orientativo — no sustituye revisión profesional.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Menos' : 'Detalle'}
        </Button>
      </div>

      {/* Narrative summary (always visible) */}
      <p className="text-xs text-muted-foreground leading-relaxed px-1">
        {narrative.summary}
      </p>

      {/* Quick badges */}
      {(warningCount > 0 || errorCount > 0 || (changes_vs_previous?.notable_changes.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {errorCount} error{errorCount > 1 ? 'es' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
              {warningCount} advertencia{warningCount > 1 ? 's' : ''}
            </Badge>
          )}
          {changes_vs_previous?.notable_changes.map((c, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
              {c}
            </Badge>
          ))}
        </div>
      )}

      {/* Reopen guard warning */}
      {period.status === 'closed' && reopen_guard.warnings.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-lg border border-amber-200 bg-amber-500/5 text-xs">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium text-amber-700">Precaución antes de reabrir</span>
            <ul className="mt-0.5 space-y-0.5 text-muted-foreground list-disc list-inside">
              {reopen_guard.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Expanded: Details */}
      {expanded && (
        <div className="space-y-3 pt-1">
          {/* Score breakdown */}
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            {[
              { label: 'Validación', score: confidence.breakdown.validation_score, max: 25 },
              { label: 'Integridad', score: confidence.breakdown.run_integrity_score, max: 25 },
              { label: 'Expedientes', score: confidence.breakdown.expedient_score, max: 25 },
              { label: 'Datos', score: confidence.breakdown.data_completeness, max: 25 },
            ].map(item => (
              <div key={item.label} className="p-1.5 rounded bg-muted/30">
                <p className="font-medium">{item.score}/{item.max}</p>
                <p className="text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Discrepancies */}
          {discrepancies.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Observaciones</p>
              {discrepancies.map(d => (
                <DiscrepancyItem key={d.id} d={d} />
              ))}
            </div>
          )}

          {/* Narrative details */}
          {narrative.details.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Detalle del cierre</p>
              {narrative.details.map((d, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {d}</p>
              ))}
            </div>
          )}

          {/* Disclaimers */}
          <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70 italic px-1 pt-1 border-t border-border/30">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <div>
              {narrative.disclaimers.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
