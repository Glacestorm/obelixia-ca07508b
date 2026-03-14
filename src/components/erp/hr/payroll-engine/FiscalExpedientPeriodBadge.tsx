/**
 * FiscalExpedientPeriodBadge — Compact fiscal expedient status indicator
 * Embedded in HRPayrollPeriodManager's closed period summary.
 * Self-contained: reads fiscal_expedient from period metadata.
 *
 * NOTA: "Finalizado (interno)" NO equivale a presentación oficial AEAT.
 */
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, CheckCircle, AlertTriangle, Clock, Lock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  FISCAL_EXPEDIENT_STATUS_CONFIG,
  getFiscalExpedientReadiness,
  type FiscalExpedientStatus,
} from '@/engines/erp/hr/fiscalMonthlyExpedientEngine';

interface FiscalExpedientPeriodBadgeProps {
  periodId: string;
  className?: string;
}

const STATUS_ICONS: Partial<Record<FiscalExpedientStatus, typeof Calculator>> = {
  draft: Clock,
  consolidated: Calculator,
  reconciled: CheckCircle,
  reviewed: CheckCircle,
  ready_internal: CheckCircle,
  finalized_internal: Lock,
  cancelled: Ban,
  error: AlertTriangle,
};

export function FiscalExpedientPeriodBadge({ periodId, className }: FiscalExpedientPeriodBadgeProps) {
  const [status, setStatus] = useState<FiscalExpedientStatus | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('hr_payroll_periods')
        .select('metadata')
        .eq('id', periodId)
        .single();

      if (data?.metadata) {
        const fe = (data.metadata as any)?.fiscal_expedient;
        if (fe?.status) {
          setStatus(fe.status as FiscalExpedientStatus);
          setScore(fe.reconciliation?.score ?? null);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (loading || !status) return null;

  const config = FISCAL_EXPEDIENT_STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status] || Calculator;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] px-1.5 py-0 gap-0.5 cursor-default font-normal',
              config.color,
              className,
            )}
          >
            <Icon className="h-2.5 w-2.5" />
            Fiscal: {config.label}
            {score !== null && (
              <span className={cn(
                'ml-0.5',
                score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-destructive'
              )}>
                {score}%
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[220px]">
          <p className="font-medium">Expediente fiscal interno</p>
          <p className="text-muted-foreground">{config.description}</p>
          {score !== null && <p className="mt-0.5">Conciliación: {score}%</p>}
          <p className="mt-1 text-[10px] text-muted-foreground italic">
            No equivale a presentación oficial AEAT
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}