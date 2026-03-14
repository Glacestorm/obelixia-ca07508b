/**
 * SSExpedientPeriodBadge — Compact SS expedient status indicator
 * Designed to be embedded in HRPayrollPeriodManager's closed period summary.
 * Self-contained: fetches its own data from erp_hr_ss_contributions metadata.
 *
 * NOTA: "Finalizado (interno)" NO equivale a presentación oficial TGSS/SILTRA.
 */
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, CheckCircle, AlertTriangle, Clock, Lock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { SSExpedientStatus } from '@/engines/erp/hr/ssMonthlyExpedientEngine';
import { SS_EXPEDIENT_STATUS_CONFIG, getExpedientReadiness } from '@/engines/erp/hr/ssMonthlyExpedientEngine';

interface SSExpedientPeriodBadgeProps {
  companyId: string;
  periodYear: number;
  periodMonth: number;
  className?: string;
}

const STATUS_ICONS: Partial<Record<SSExpedientStatus, typeof Shield>> = {
  draft: Clock,
  consolidated: Shield,
  reconciled: CheckCircle,
  reviewed: CheckCircle,
  ready_internal: CheckCircle,
  finalized_internal: Lock,
  cancelled: Ban,
  error: AlertTriangle,
};

export function SSExpedientPeriodBadge({ companyId, periodYear, periodMonth, className }: SSExpedientPeriodBadgeProps) {
  const [status, setStatus] = useState<SSExpedientStatus | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('erp_hr_ss_contributions')
        .select('metadata')
        .eq('company_id', companyId)
        .eq('period_year', periodYear)
        .eq('period_month', periodMonth)
        .maybeSingle();

      if (data?.metadata) {
        const meta = data.metadata as any;
        let expStatus = (meta.expedient_status as SSExpedientStatus) || null;
        // Backward compat
        if (expStatus === 'ready' as any) expStatus = 'ready_internal';
        if (expStatus === 'submitted' as any) expStatus = 'finalized_internal';
        setStatus(expStatus);
        setScore(meta.reconciliation?.score ?? null);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [companyId, periodYear, periodMonth]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (loading || !status) return null;

  const config = SS_EXPEDIENT_STATUS_CONFIG[status];
  const readiness = getExpedientReadiness(status);
  const Icon = STATUS_ICONS[status] || Shield;

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
            SS: {config.label}
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
          <p className="font-medium">Expediente SS interno</p>
          <p className="text-muted-foreground">{config.description}</p>
          {score !== null && <p className="mt-0.5">Conciliación: {score}%</p>}
          <p className="mt-1 text-[10px] text-muted-foreground italic">
            No equivale a presentación oficial TGSS
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
