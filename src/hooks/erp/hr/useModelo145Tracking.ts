/**
 * useModelo145Tracking — Hook for Modelo 145 validation and change tracking
 * P1.5R: Validates employee fiscal data and records changes with ledger/evidence
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  validateModelo145,
  validateModelo145Bulk,
  detect145Changes,
  type Modelo145EmployeeData,
  type Modelo145ValidationResult,
  type Modelo145ChangeDetection,
} from '@/engines/erp/hr/modelo145ValidationEngine';
import { buildEvidenceRow } from '@/engines/erp/hr/evidenceEngine';
import { buildLedgerRow } from '@/engines/erp/hr/ledgerEngine';

export function useModelo145Tracking(companyId: string) {
  const { user } = useAuth();

  /** Validate a single employee's 145 data */
  const validate145ForEmployee = useCallback((
    employeeData: Modelo145EmployeeData,
  ): Modelo145ValidationResult => {
    return validateModelo145(employeeData);
  }, []);

  /** Validate all employees' 145 data in bulk */
  const get145CompletionStatus = useCallback((
    employees: Modelo145EmployeeData[],
  ) => {
    return validateModelo145Bulk(employees);
  }, []);

  /** Record a 145 change with ledger event + evidence */
  const record145Change = useCallback(async (
    employeeId: string,
    employeeName: string,
    previousData: Partial<Modelo145EmployeeData>,
    newData: Modelo145EmployeeData,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }

    const changes = detect145Changes(previousData, newData);
    if (!changes.hasIRPFImpact) {
      return { success: true }; // No relevant changes
    }

    try {
      // Create ledger event
      const ledgerRow = buildLedgerRow({
        companyId,
        eventType: 'employee_updated',
        eventLabel: `Modelo 145 actualizado: ${employeeName} (${changes.changedFields.length} campo(s))`,
        entityType: 'employee',
        entityId: employeeId,
        actorId: user.id,
        actorRole: 'hr_admin',
        beforeSnapshot: changes.previousValues,
        afterSnapshot: changes.newValues,
        changedFields: changes.changedFields,
        metadata: {
          process: 'modelo_145',
          change_type: 'fiscal_data_update',
        },
      });

      const { data: ledgerData } = await (supabase as any)
        .from('erp_hr_ledger')
        .insert(ledgerRow)
        .select('id')
        .single();

      // Create evidence
      const evidenceRow = buildEvidenceRow({
        companyId,
        ledgerEventId: ledgerData?.id,
        evidenceType: 'snapshot',
        evidenceLabel: `Snapshot Mod.145 — ${employeeName}`,
        refEntityType: 'employee',
        refEntityId: employeeId,
        evidenceSnapshot: {
          previousData: changes.previousValues,
          newData: changes.newValues,
          changedFields: changes.changedFields,
          timestamp: new Date().toISOString(),
        },
        capturedBy: user.id,
        metadata: {
          process: 'modelo_145',
        },
      });

      await (supabase as any)
        .from('erp_hr_evidence')
        .insert(evidenceRow);

      toast.success(`Modelo 145 de ${employeeName} actualizado con trazabilidad`);
      return { success: true };
    } catch (err) {
      console.error('[useModelo145Tracking] error:', err);
      return { success: false, error: 'Error al registrar cambio del 145' };
    }
  }, [companyId, user]);

  return {
    validate145ForEmployee,
    get145CompletionStatus,
    record145Change,
    detect145Changes,
  };
}
