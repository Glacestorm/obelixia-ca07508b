/**
 * useCotizacionReconciliation — Hook for cost reconciliation
 * V2-RRHH-P1.4: Pre-confirmation gate for SILTRA artifacts
 *
 * Gathers payroll + FAN + RLC + RNT + CRA totals and runs reconciliation engine.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  reconcileCotizacion,
  type ReconciliationTotals,
  type CotizacionReconciliationResult,
} from '@/engines/erp/hr/cotizacionReconciliationEngine';
import { buildEvidenceRow } from '@/engines/erp/hr/evidenceEngine';
import { buildLedgerRow } from '@/engines/erp/hr/ledgerEngine';

export function useCotizacionReconciliation(companyId: string) {
  const { user } = useAuth();
  const [result, setResult] = useState<CotizacionReconciliationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Run reconciliation with provided totals.
   * Caller assembles totals from existing artifact data (no extra DB queries here).
   */
  const runReconciliation = useCallback(async (
    totals: ReconciliationTotals,
    periodContext: { periodYear: number; periodMonth: number; periodId?: string },
  ): Promise<CotizacionReconciliationResult> => {
    setIsLoading(true);

    try {
      const reconciliationResult = reconcileCotizacion(totals);
      setResult(reconciliationResult);

      // Persist as evidence + ledger if user is authenticated
      if (user?.id) {
        const evidenceRow = buildEvidenceRow({
          companyId,
          evidenceType: 'validation_result',
          evidenceLabel: `Reconciliación cotización ${String(periodContext.periodMonth).padStart(2, '0')}/${periodContext.periodYear} — Score: ${reconciliationResult.score}%`,
          refEntityType: 'payroll_period',
          refEntityId: periodContext.periodId ?? `${periodContext.periodYear}-${periodContext.periodMonth}`,
          evidenceSnapshot: {
            score: reconciliationResult.score,
            passedCount: reconciliationResult.passedCount,
            totalCount: reconciliationResult.totalCount,
            canConfirm: reconciliationResult.canConfirm,
            checks: reconciliationResult.checks,
          },
          capturedBy: user.id,
          metadata: {
            process: 'siltra_cotizacion_reconciliation',
            period_year: periodContext.periodYear,
            period_month: periodContext.periodMonth,
          },
        });

        await (supabase as any)
          .from('erp_hr_evidence')
          .insert(evidenceRow);

        const ledgerRow = buildLedgerRow({
          companyId,
          eventType: 'expedient_action',
          eventLabel: `Reconciliación cotización ejecutada — Score: ${reconciliationResult.score}% (${reconciliationResult.canConfirm ? 'Apto para confirmación' : 'No apto'})`,
          entityType: 'payroll_period',
          entityId: periodContext.periodId ?? `${periodContext.periodYear}-${periodContext.periodMonth}`,
          actorId: user.id,
          actorRole: 'hr_admin',
          afterSnapshot: {
            score: reconciliationResult.score,
            canConfirm: reconciliationResult.canConfirm,
            passedCount: reconciliationResult.passedCount,
            totalCount: reconciliationResult.totalCount,
          },
          metadata: {
            process: 'siltra_cotizacion_reconciliation',
            version: 'p1.4',
          },
        });

        await (supabase as any)
          .from('erp_hr_ledger')
          .insert(ledgerRow);
      }

      if (reconciliationResult.canConfirm) {
        toast.success(`Reconciliación OK — Score: ${reconciliationResult.score}%`);
      } else {
        toast.warning(`Reconciliación con errores — Score: ${reconciliationResult.score}%`);
      }

      return reconciliationResult;
    } catch (err) {
      console.error('[useCotizacionReconciliation] error:', err);
      toast.error('Error al ejecutar reconciliación');
      const fallback: CotizacionReconciliationResult = {
        checks: [],
        passedCount: 0,
        totalCount: 0,
        score: 0,
        canConfirm: false,
        timestamp: new Date().toISOString(),
      };
      setResult(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user]);

  return {
    result,
    isLoading,
    runReconciliation,
  };
}
