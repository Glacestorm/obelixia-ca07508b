/**
 * MonthlyClosingSummaryCard — V2-ES.7 Paso 6
 * Executive KPIs + period comparison + expedient readiness + auto-generation
 * Embedded in HRPayrollPeriodManager for closed/locked periods.
 *
 * ZERO-FETCH: All data derived from period props (metadata, totals).
 * Auto-generation writes are delegated to onAutoGenerate callback.
 */
import { useMemo, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users, Euro, TrendingUp, TrendingDown, Minus,
  Calculator, Loader2, Zap, CheckCircle, AlertTriangle, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  computeMonthlyKPIs,
  computePeriodComparison,
  computeExpedientReadiness,
  shouldAutoGenerateExpedients,
  type MonthlyKPIs,
  type MonthlyKPIDeltas,
  type ExpedientReadinessSummary,
  type AutoGenerationResult,
} from '@/engines/erp/hr/monthlyExecutiveReportEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';

interface MonthlyClosingSummaryCardProps {
  period: PayrollPeriod;
  previousPeriod?: PayrollPeriod | null;
  companyId: string;
  /** SS expedient data extracted by parent (zero-fetch) */
  ssExpedient?: { status: string; score: number } | null;
  className?: string;
}

const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

function DeltaBadge({ value, label }: { value: number | undefined; label?: string }) {
  if (value === undefined || value === null) return null;
  const isPositive = value > 0;
  const isZero = value === 0;
  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;
  const color = isZero
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium', color)}>
            <Icon className="h-2.5 w-2.5" />
            {fmtPct(value)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {label || 'vs mes anterior'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ReadinessIndicator({ readiness }: { readiness: ExpedientReadinessSummary }) {
  const configs: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    complete: { label: 'Completo', color: 'text-emerald-600 border-emerald-200 bg-emerald-500/5', icon: CheckCircle },
    partial: { label: 'Parcial', color: 'text-amber-600 border-amber-200 bg-amber-500/5', icon: AlertTriangle },
    pending: { label: 'Pendiente', color: 'text-blue-600 border-blue-200 bg-blue-500/5', icon: Info },
    none: { label: 'Sin expedientes', color: 'text-muted-foreground border-border bg-muted/30', icon: Info },
  };

  const cfg = configs[readiness.overall_readiness] || configs.none;
  const Icon = cfg.icon;

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-lg border text-xs', cfg.color)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">Expedientes internos: {cfg.label}</span>
        <div className="flex gap-3 mt-0.5 text-[10px]">
          {readiness.ss_status && (
            <span>SS: {readiness.ss_status}{readiness.ss_score !== null ? ` (${readiness.ss_score}%)` : ''}</span>
          )}
          {readiness.fiscal_status && (
            <span>Fiscal: {readiness.fiscal_status}{readiness.fiscal_score !== null ? ` (${readiness.fiscal_score}%)` : ''}</span>
          )}
        </div>
      </div>
      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 text-muted-foreground border-muted">
        Interno
      </Badge>
    </div>
  );
}

export function MonthlyClosingSummaryCard({
  period,
  previousPeriod,
  companyId,
  ssExpedient,
  className,
}: MonthlyClosingSummaryCardProps) {
  const [autoGenResult, setAutoGenResult] = useState<AutoGenerationResult | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // ── Zero-fetch KPI computation from props ──
  const kpis = useMemo<MonthlyKPIs>(() =>
    computeMonthlyKPIs(period.employee_count, period.total_gross, period.total_net, period.total_employer_cost),
    [period.employee_count, period.total_gross, period.total_net, period.total_employer_cost],
  );

  const deltas = useMemo<MonthlyKPIDeltas | null>(() => {
    if (!previousPeriod || previousPeriod.total_gross <= 0) return null;
    const prevKPIs = computeMonthlyKPIs(
      previousPeriod.employee_count, previousPeriod.total_gross,
      previousPeriod.total_net, previousPeriod.total_employer_cost,
    );
    return computePeriodComparison(kpis, prevKPIs).deltas;
  }, [kpis, previousPeriod]);

  // ── Readiness from metadata (zero-fetch) ──
  const readiness = useMemo<ExpedientReadinessSummary>(() => {
    const meta = period.metadata as any;
    const fiscalExp = meta?.fiscal_expedient;

    const fiscalData = fiscalExp?.status
      ? { status: fiscalExp.status, score: fiscalExp.reconciliation?.score ?? 0 }
      : null;

    return computeExpedientReadiness(ssExpedient ?? null, fiscalData);
  }, [period.metadata, ssExpedient]);

  // ── Existing auto-gen result from metadata ──
  const existingAutoGen = useMemo(() => {
    const meta = period.metadata as any;
    return meta?.auto_generation as AutoGenerationResult | null;
  }, [period.metadata]);

  const effectiveAutoGen = autoGenResult || existingAutoGen;

  // ── Auto-generate handler (writes to DB) ──
  const handleAutoGenerate = useCallback(async () => {
    setIsAutoGenerating(true);
    const result: AutoGenerationResult = {
      triggered_at: new Date().toISOString(),
      triggered_by: 'user',
      ss_generated: false,
      fiscal_generated: false,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'system';

      // SS expedient → consolidated
      try {
        const { data: ssData } = await supabase
          .from('erp_hr_ss_contributions')
          .select('id, metadata')
          .eq('company_id', companyId)
          .eq('period_year', period.fiscal_year)
          .eq('period_month', period.period_number)
          .maybeSingle();

        if (ssData) {
          const existingMeta = (ssData.metadata || {}) as any;
          if (!existingMeta.expedient_status || existingMeta.expedient_status === 'draft') {
            await supabase.from('erp_hr_ss_contributions').update({
              metadata: {
                ...existingMeta,
                expedient_status: 'consolidated',
                consolidated_at: new Date().toISOString(),
                consolidated_by: userId,
                auto_generated: true,
                trace: [
                  ...(existingMeta.trace || []),
                  {
                    action: 'auto_consolidate', status_from: existingMeta.expedient_status || 'draft',
                    status_to: 'consolidated', performed_by: userId,
                    performed_at: new Date().toISOString(), notes: 'Auto-generado al cerrar período',
                    period_id: period.id,
                  },
                ],
              },
            } as any).eq('id', ssData.id);
            result.ss_generated = true;
          }
        }
      } catch (e: any) {
        result.ss_error = e.message;
      }

      // Fiscal expedient → consolidated
      try {
        const meta = (period.metadata || {}) as any;
        const fiscalExp = meta.fiscal_expedient;
        if (!fiscalExp || !fiscalExp.status || fiscalExp.status === 'draft') {
          await supabase.from('hr_payroll_periods').update({
            metadata: {
              ...meta,
              fiscal_expedient: {
                ...(fiscalExp || {}),
                status: 'consolidated', consolidated_at: new Date().toISOString(),
                consolidated_by: userId, auto_generated: true,
                trace: [
                  ...(fiscalExp?.trace || []),
                  {
                    action: 'auto_consolidate', status_from: fiscalExp?.status || 'draft',
                    status_to: 'consolidated', performed_by: userId,
                    performed_at: new Date().toISOString(), notes: 'Auto-generado al cerrar período',
                    period_id: period.id,
                  },
                ],
              },
              auto_generation: result,
            },
          } as any).eq('id', period.id);
          result.fiscal_generated = true;
        }
      } catch (e: any) {
        result.fiscal_error = e.message;
      }

      // Audit trail
      await supabase.from('hr_payroll_audit_log').insert({
        company_id: companyId, action: 'expedients_auto_generated',
        entity_type: 'period', entity_id: period.id,
        actor_id: userId, actor_name: user?.email || 'system',
        new_value: result, period_id: period.id,
      } as any);

      setAutoGenResult(result);
    } catch (e) {
      console.error('[MonthlyClosingSummaryCard] autoGenerate error:', e);
    } finally {
      setIsAutoGenerating(false);
    }
  }, [period, companyId]);

  // ── Visibility guard ──
  const isClosed = period.status === 'closed' || period.status === 'locked';
  if (!isClosed) return null;

  const needsAutoGen = shouldAutoGenerateExpedients(
    period.status,
    readiness.ss_status ? { status: readiness.ss_status } : null,
    readiness.fiscal_status ? { status: readiness.fiscal_status } : null,
  );
  const showAutoGenButton = (needsAutoGen.ss || needsAutoGen.fiscal) && !effectiveAutoGen;

  return (
    <div className={cn('space-y-2', className)}>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-lg font-bold">{kpis.employee_count}</p>
          <p className="text-[10px] text-muted-foreground">Empleados</p>
          <DeltaBadge value={deltas?.employee_count_pct} />
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Euro className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
          <p className="text-sm font-bold">{fmt(kpis.total_gross)}</p>
          <p className="text-[10px] text-muted-foreground">Bruto</p>
          <DeltaBadge value={deltas?.total_gross_pct} />
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Euro className="h-3.5 w-3.5 mx-auto text-emerald-500 mb-0.5" />
          <p className="text-sm font-bold">{fmt(kpis.total_net)}</p>
          <p className="text-[10px] text-muted-foreground">Neto</p>
          <DeltaBadge value={deltas?.total_net_pct} />
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Euro className="h-3.5 w-3.5 mx-auto text-amber-500 mb-0.5" />
          <p className="text-sm font-bold">{fmt(kpis.total_employer_cost)}</p>
          <p className="text-[10px] text-muted-foreground">Coste emp.</p>
          <DeltaBadge value={deltas?.total_employer_cost_pct} />
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <Calculator className="h-3.5 w-3.5 mx-auto text-primary mb-0.5" />
          <p className="text-sm font-bold">{fmt(kpis.total_company_cost)}</p>
          <p className="text-[10px] text-muted-foreground">Coste total</p>
          <DeltaBadge value={deltas?.total_company_cost_pct} />
        </div>
      </div>

      {/* Ratios row */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span>Deducciones: {kpis.deductions_ratio.toFixed(1)}% del bruto</span>
        <span>·</span>
        <span>Coste empresa: {kpis.employer_cost_ratio.toFixed(1)}% sobre bruto</span>
        <span>·</span>
        <span>Bruto medio: {fmt(kpis.avg_gross_per_employee)}/emp</span>
        {deltas && (
          <>
            <span>·</span>
            <DeltaBadge value={deltas.avg_gross_pct} label="Bruto medio vs mes anterior" />
          </>
        )}
      </div>

      {/* Expedient Readiness */}
      <ReadinessIndicator readiness={readiness} />

      {/* Auto-generation button */}
      {showAutoGenButton && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={handleAutoGenerate}
          disabled={isAutoGenerating}
        >
          {isAutoGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          Generar expedientes internos automáticamente
          {needsAutoGen.ss && needsAutoGen.fiscal ? ' (SS + Fiscal)' :
           needsAutoGen.ss ? ' (SS)' : ' (Fiscal)'}
        </Button>
      )}

      {/* Auto-generation result */}
      {effectiveAutoGen && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
          <Zap className="h-3 w-3 text-primary" />
          <span>
            Auto-generado: {effectiveAutoGen.ss_generated ? '✓ SS' : ''} {effectiveAutoGen.fiscal_generated ? '✓ Fiscal' : ''}
            {effectiveAutoGen.ss_error && ` ⚠ SS: ${effectiveAutoGen.ss_error}`}
            {effectiveAutoGen.fiscal_error && ` ⚠ Fiscal: ${effectiveAutoGen.fiscal_error}`}
          </span>
        </div>
      )}
    </div>
  );
}
