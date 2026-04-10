/**
 * PayrollCycleTrackingCard — P1.3
 * 6-step visual stepper: Incidencias → Cálculo → Validación → Cierre → Pago → Archivado
 */

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, Calculator, CheckCircle, Lock, Euro, Archive,
  AlertTriangle, ChevronRight, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildCycleSummary,
  CYCLE_PHASE_META,
  type PayrollCycleInput,
  type PayrollCyclePhase,
} from '@/engines/erp/hr/payrollCycleStatusEngine';
import { usePaymentTracking, type PeriodPaymentStatus } from '@/hooks/erp/hr/usePaymentTracking';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';

interface Props {
  period: PayrollPeriod;
  companyId: string;
  incidentCounts?: { total: number; pending: number; validated: number; applied: number; cancelled: number };
  latestRunStatus?: string | null;
  preCloseBlockers?: number;
  preCloseWarnings?: number;
  onRegisterPayment?: () => void;
}

const STEPS: { key: string; label: string; icon: React.ElementType; phases: PayrollCyclePhase[] }[] = [
  { key: 'incidents',   label: 'Incidencias',  icon: ClipboardList, phases: ['collecting_inputs', 'ready_to_calculate'] },
  { key: 'calculation', label: 'Cálculo',      icon: Calculator,    phases: ['calculated'] },
  { key: 'validation',  label: 'Validación',   icon: CheckCircle,   phases: ['validated', 'ready_to_close'] },
  { key: 'closing',     label: 'Cierre',       icon: Lock,          phases: ['closed'] },
  { key: 'payment',     label: 'Pago',         icon: Euro,          phases: ['paid'] },
  { key: 'archive',     label: 'Archivado',    icon: Archive,       phases: ['archived'] },
];

export function PayrollCycleTrackingCard({
  period,
  companyId,
  incidentCounts = { total: 0, pending: 0, validated: 0, applied: 0, cancelled: 0 },
  latestRunStatus = null,
  preCloseBlockers = 0,
  preCloseWarnings = 0,
  onRegisterPayment,
}: Props) {
  const { getPaymentStatus } = usePaymentTracking(companyId);
  const [paymentStatus, setPaymentStatus] = useState<PeriodPaymentStatus | null>(null);

  useEffect(() => {
    if (period.status === 'closed' || period.status === 'locked') {
      getPaymentStatus(period.id).then(setPaymentStatus);
    }
  }, [period.id, period.status, getPaymentStatus]);

  const summary = useMemo(() => {
    const input: PayrollCycleInput = {
      periodStatus: period.status,
      incidentCounts,
      latestRunStatus,
      preCloseBlockers,
      preCloseWarnings,
      paymentStatus: paymentStatus?.phase ?? 'pending',
    };
    return buildCycleSummary(input);
  }, [period.status, incidentCounts, latestRunStatus, preCloseBlockers, preCloseWarnings, paymentStatus]);

  const currentStepIndex = CYCLE_PHASE_META[summary.phase]?.stepIndex ?? 0;

  return (
    <Card className="border-border/50">
      <CardContent className="py-3 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Ciclo de Nómina</span>
            <Badge className={cn('text-[10px] px-1.5 py-0', summary.phaseColor)}>
              {summary.phaseLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {summary.caseCoverage.supported}/{summary.caseCoverage.total} casos
            </Badge>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-3">
          {STEPS.map((step, i) => {
            const isActive = step.phases.includes(summary.phase);
            const isCompleted = i < currentStepIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors w-full justify-center',
                  isActive ? 'bg-primary/15 text-primary border border-primary/30' :
                  isCompleted ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                  'bg-muted/50 text-muted-foreground border border-transparent'
                )}>
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate hidden sm:inline">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className={cn(
                    'h-3 w-3 shrink-0 mx-0.5',
                    isCompleted ? 'text-emerald-500' : 'text-muted-foreground/30'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          {/* Incidents */}
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            {incidentCounts.pending > 0 ? (
              <span className="text-amber-600 font-medium">{incidentCounts.pending} pendientes</span>
            ) : incidentCounts.total > 0 ? (
              <span className="text-emerald-600">{incidentCounts.validated + incidentCounts.applied} listas</span>
            ) : (
              <span>Sin incidencias</span>
            )}
          </span>

          {/* Blockers */}
          {summary.blockers.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {summary.blockers.length} bloqueador(es)
            </span>
          )}

          {/* Payment */}
          {(period.status === 'closed' || period.status === 'locked') && (
            <span className="flex items-center gap-1">
              <Euro className="h-3 w-3" />
              {paymentStatus?.phase === 'paid' ? (
                <span className="text-emerald-600">Pagado ({paymentStatus.paymentDate})</span>
              ) : paymentStatus?.phase === 'partial' ? (
                <span className="text-amber-600">Parcial ({paymentStatus.paidRecords}/{paymentStatus.totalRecords})</span>
              ) : (
                <>
                  <span className="text-muted-foreground">Pendiente de pago</span>
                  {onRegisterPayment && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 ml-1" onClick={onRegisterPayment}>
                      Registrar
                    </Button>
                  )}
                </>
              )}
            </span>
          )}

          {/* SEPA gap */}
          <span className="flex items-center gap-1 ml-auto">
            <Info className="h-3 w-3" />
            <span>SEPA pendiente</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
