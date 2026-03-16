/**
 * useHRContractProcess — Hook for employee contract/hiring process
 * V2-ES.6 Paso 1.1 + Paso 3: Data validation, readiness, closure
 *
 * Mirrors the pattern from useHRRegistrationProcess (alta/afiliación).
 * Single source of truth: erp_hr_contract_process_data linked to admin_request.
 * No real SEPE/Contrat@ integration yet — readiness-only.
 */
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useHRProcessDocRequirements, type EnrichedCompleteness } from './useHRProcessDocRequirements';
import { computeContractDeadlines, type ContractDeadlineSummary } from '@/engines/erp/hr/contractDeadlineEngine';
import { buildContrataPayload, type ContrataPayloadResult } from '@/components/erp/hr/shared/contrataPayloadBuilder';
import { type HolidayCalendar, EMPTY_CALENDAR } from '@/engines/erp/hr/calendarHelpers';
import { buildContractClosureSnapshot } from '@/components/erp/hr/shared/contractClosureEngine';
import { evaluateContrataPreIntegrationReadiness, type ContrataPreIntegrationContext } from '@/components/erp/hr/shared/contrataPreIntegrationReadiness';
import { useHRLedgerWriter } from './useHRLedgerWriter';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContractProcessStatus =
  | 'pending_data'
  | 'pending_documents'
  | 'ready_to_submit'
  | 'submitted'
  | 'confirmed';

export const CONTRACT_PROCESS_STATUS_CONFIG: Record<ContractProcessStatus, { label: string; labelES: string; color: string }> = {
  pending_data:       { label: 'Pending Data',      labelES: 'Pendiente datos',    color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  pending_documents:  { label: 'Pending Documents', labelES: 'Pendiente docs',     color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  ready_to_submit:    { label: 'Internally Ready',   labelES: 'Preparado internamente', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  submitted:          { label: 'Submitted (internal)', labelES: 'Comunicado (interno)',  color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30' },
  confirmed:          { label: 'Confirmed (internal)', labelES: 'Confirmado (interno)',  color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
};

export const CONTRACT_PROCESS_STATUS_TRANSITIONS: Record<ContractProcessStatus, ContractProcessStatus[]> = {
  pending_data:      ['pending_documents'],
  pending_documents: ['ready_to_submit', 'pending_data'],
  ready_to_submit:   ['submitted', 'pending_data', 'pending_documents'],
  submitted:         ['confirmed', 'ready_to_submit'],
  confirmed:         [],
};

export interface ContractProcessData {
  id: string;
  request_id: string;
  company_id: string;
  employee_id: string;
  contract_process_status: ContractProcessStatus;
  // Contract fields
  contract_type_code: string | null;
  contract_subtype: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_duration_type: string | null;
  working_hours_type: string | null;
  working_hours_percent: number | null;
  weekly_hours: number | null;
  trial_period_days: number | null;
  occupation_code: string | null;
  job_title: string | null;
  workplace_address: string | null;
  collective_agreement: string | null;
  salary_gross_annual: number | null;
  salary_base_monthly: number | null;
  num_extra_payments: number | null;
  // Employee identification
  dni_nie: string | null;
  naf: string | null;
  // Company identification
  ccc: string | null;
  legal_entity: string | null;
  // SEPE/Contrat@
  sepe_communication_date: string | null;
  contrata_code: string | null;
  previous_contract_id: string | null;
  is_conversion: boolean;
  conversion_from_type: string | null;
  // Tracking
  data_validated_at: string | null;
  data_validated_by: string | null;
  docs_validated_at: string | null;
  docs_validated_by: string | null;
  ready_at: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  confirmed_reference: string | null;
  validation_notes: string | null;
  // Deadline & payload (Paso 1.2)
  internal_deadline_at: string | null;
  deadline_urgency: string | null;
  is_overdue: boolean;
  payload_status: string | null;
  payload_ready: boolean;
  payload_missing_fields: string[] | null;
  payload_format_errors: string[] | null;
  payload_snapshot: Record<string, unknown> | null;
  last_payload_computed_at: string | null;
  deadline_computed_at: string | null;
  // Closure (Paso 1.4)
  closure_status: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  closure_snapshot: Record<string, unknown> | null;
  closure_blockers: Record<string, unknown>[] | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Fields required for Contrat@/SEPE readiness */
const CONTRATA_REQUIRED_FIELDS: (keyof ContractProcessData)[] = [
  'contract_type_code', 'contract_start_date', 'contract_duration_type',
  'working_hours_type', 'occupation_code', 'dni_nie', 'naf', 'ccc',
];

/** Recommended but not blocking */
const CONTRATA_RECOMMENDED_FIELDS: (keyof ContractProcessData)[] = [
  'contract_end_date', 'weekly_hours', 'working_hours_percent',
  'collective_agreement', 'job_title', 'workplace_address',
  'salary_gross_annual', 'trial_period_days', 'legal_entity',
];

export interface ContractDataReadiness {
  requiredFields: { key: string; label: string; filled: boolean }[];
  recommendedFields: { key: string; label: string; filled: boolean }[];
  requiredComplete: boolean;
  requiredCount: number;
  requiredFilled: number;
  recommendedCount: number;
  recommendedFilled: number;
  percentage: number;
}

export interface ContractReadiness {
  data: ContractDataReadiness;
  docs: EnrichedCompleteness | null;
  overallReady: boolean;
  status: ContractProcessStatus;
  nextActions: string[];
}

const FIELD_LABELS: Record<string, string> = {
  contract_type_code: 'Tipo de contrato',
  contract_subtype: 'Subtipo contrato',
  contract_start_date: 'Fecha inicio',
  contract_end_date: 'Fecha fin',
  contract_duration_type: 'Duración',
  working_hours_type: 'Tipo jornada',
  working_hours_percent: '% Jornada',
  weekly_hours: 'Horas semanales',
  trial_period_days: 'Período prueba (días)',
  occupation_code: 'Código CNO',
  job_title: 'Puesto de trabajo',
  workplace_address: 'Centro de trabajo',
  collective_agreement: 'Convenio colectivo',
  salary_gross_annual: 'Salario bruto anual',
  salary_base_monthly: 'Salario base mensual',
  num_extra_payments: 'Pagas extra',
  dni_nie: 'DNI/NIE',
  naf: 'NAF (Nº Afiliación SS)',
  ccc: 'CCC (Cuenta Cotización)',
  legal_entity: 'Entidad legal',
  sepe_communication_date: 'Fecha comunicación SEPE',
  contrata_code: 'Código Contrat@',
  previous_contract_id: 'Contrato anterior',
  conversion_from_type: 'Tipo anterior (conversión)',
};

// ─── Computation ─────────────────────────────────────────────────────────────

function computeContractDataReadiness(data: ContractProcessData | null): ContractDataReadiness {
  const checkField = (key: keyof ContractProcessData, label: string) => ({
    key: key as string,
    label,
    filled: data ? data[key] != null && String(data[key]).trim() !== '' : false,
  });

  const requiredFields = CONTRATA_REQUIRED_FIELDS.map(k => checkField(k, FIELD_LABELS[k] || k));
  const recommendedFields = CONTRATA_RECOMMENDED_FIELDS.map(k => checkField(k, FIELD_LABELS[k] || k));

  const requiredFilled = requiredFields.filter(f => f.filled).length;
  const recommendedFilled = recommendedFields.filter(f => f.filled).length;
  const total = requiredFields.length + recommendedFields.length;
  const filled = requiredFilled + recommendedFilled;

  return {
    requiredFields,
    recommendedFields,
    requiredComplete: requiredFilled === requiredFields.length,
    requiredCount: requiredFields.length,
    requiredFilled,
    recommendedCount: recommendedFields.length,
    recommendedFilled,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
  };
}

export function computeContractProcessStatus(
  data: ContractProcessData | null,
  dataReadiness: ContractDataReadiness,
  docCompleteness: EnrichedCompleteness | null,
): ContractProcessStatus {
  if (!data) return 'pending_data';
  if (data.contract_process_status === 'submitted' || data.contract_process_status === 'confirmed') {
    return data.contract_process_status;
  }
  if (!dataReadiness.requiredComplete) return 'pending_data';
  if (docCompleteness && !docCompleteness.mandatoryComplete) return 'pending_documents';
  return 'ready_to_submit';
}

// ─── Audit helper ────────────────────────────────────────────────────────────

async function logContractAudit(
  action: string,
  companyId: string,
  userId: string | undefined,
  recordId: string | null,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  severity: string = 'info',
  changedFields?: string[],
) {
  if (!userId) return;
  try {
    await supabase.from('erp_hr_audit_log').insert([{
      action,
      table_name: 'erp_hr_contract_process_data',
      record_id: recordId,
      company_id: companyId,
      user_id: userId,
      old_data: oldData as any,
      new_data: newData as any,
      category: 'contract',
      severity,
      changed_fields: changedFields ?? null,
      metadata: { process: 'contratacion_sepe', version: 'v2-es6-p1' } as any,
    }]);
  } catch (err) {
    console.error('[ContractAudit] log error:', err);
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRContractProcess(companyId: string) {
  const { user } = useAuth();
  const [contractData, setContractData] = useState<ContractProcessData | null>(null);
  const [loading, setLoading] = useState(false);
  const { getCompleteness } = useHRProcessDocRequirements();
  const { writeLedger, writeVersion } = useHRLedgerWriter(companyId, 'contracts');

  /** Fetch contract process data for a request */
  const fetchContractData = useCallback(async (requestId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_contract_process_data')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) throw error;
      setContractData(data as ContractProcessData | null);
      return data as ContractProcessData | null;
    } catch (err) {
      console.error('[useHRContractProcess] fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Create or update contract process data */
  const upsertContractData = useCallback(async (
    requestId: string,
    employeeId: string,
    updates: Partial<ContractProcessData>,
  ) => {
    if (!user?.id) { toast.error('Inicia sesión'); return null; }
    try {
      const existing = contractData?.request_id === requestId ? contractData : null;

      if (existing) {
        const { data, error } = await supabase
          .from('erp_hr_contract_process_data')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('request_id', requestId)
          .select()
          .single();

        if (error) throw error;
        const updated = data as ContractProcessData;
        setContractData(updated);
        const changedKeys = Object.keys(updates).filter(k => (existing as any)[k] !== (updates as any)[k]);
        logContractAudit('CONTRACT_DATA_UPDATE', companyId, user.id, requestId, { previous: existing }, { updated: updates }, 'info', changedKeys);
        // Ledger: contract updated
        if (changedKeys.length > 0) {
          writeLedger({
            eventType: 'contract_updated',
            entityType: 'contract_process',
            entityId: updated.id,
            beforeSnapshot: existing as Record<string, unknown>,
            afterSnapshot: updates as Record<string, unknown>,
            changedFields: changedKeys,
          });
        }
        return updated;
      } else {
        const { data, error } = await supabase
          .from('erp_hr_contract_process_data')
          .insert([{
            request_id: requestId,
            company_id: companyId,
            employee_id: employeeId,
            contract_process_status: 'pending_data',
            ...updates,
          }] as any)
          .select()
          .single();

        if (error) throw error;
        const created = data as ContractProcessData;
        setContractData(created);
        toast.success('Datos de contratación inicializados');
        logContractAudit('CONTRACT_INITIALIZED', companyId, user.id, requestId, null, { employee_id: employeeId, request_id: requestId }, 'info');
        // Ledger: contract created
        writeLedger({
          eventType: 'contract_created',
          entityType: 'contract_process',
          entityId: created.id,
          afterSnapshot: { employee_id: employeeId, request_id: requestId, status: 'pending_data' },
          metadata: { request_id: requestId },
        });
        // Version registry: initial version
        writeVersion({
          entityType: 'contract',
          entityId: created.id,
          state: 'draft',
          contentSnapshot: { employee_id: employeeId, contract_type: created.contract_type_code },
        });
        return created;
      }
    } catch (err) {
      console.error('[useHRContractProcess] upsert error:', err);
      toast.error('Error al guardar datos de contratación');
      return null;
    }
  }, [companyId, user, contractData]);

  /** Update contract process status with timestamps */
  const updateContractStatus = useCallback(async (
    requestId: string,
    newStatus: ContractProcessStatus,
  ) => {
    if (!user?.id) return false;
    try {
      const timestamps: Record<string, any> = {
        contract_process_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      switch (newStatus) {
        case 'pending_documents':
          timestamps.data_validated_at = new Date().toISOString();
          timestamps.data_validated_by = user.id;
          break;
        case 'ready_to_submit':
          timestamps.docs_validated_at = new Date().toISOString();
          timestamps.docs_validated_by = user.id;
          timestamps.ready_at = new Date().toISOString();
          break;
        case 'submitted':
          timestamps.submitted_at = new Date().toISOString();
          break;
        case 'confirmed':
          timestamps.confirmed_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('erp_hr_contract_process_data')
        .update(timestamps as any)
        .eq('request_id', requestId);

      if (error) throw error;

      const oldStatus = contractData?.contract_process_status || 'pending_data';
      setContractData(prev => prev ? { ...prev, ...timestamps } : null);
      toast.success(`Estado actualizado: ${CONTRACT_PROCESS_STATUS_CONFIG[newStatus].labelES}`);
      logContractAudit(
        'CONTRACT_STATUS_CHANGE',
        contractData?.company_id || companyId,
        user.id,
        requestId,
        { status: oldStatus },
        { status: newStatus },
        newStatus === 'confirmed' ? 'important' : 'info',
        ['contract_process_status'],
      );
      // Ledger: contract status change
      writeLedger({
        eventType: 'contract_updated',
        eventLabel: `Estado contrato: ${oldStatus} → ${newStatus}`,
        entityType: 'contract_process',
        entityId: contractData?.id || requestId,
        beforeSnapshot: { status: oldStatus },
        afterSnapshot: { status: newStatus },
        changedFields: ['contract_process_status'],
        complianceImpact: newStatus === 'confirmed' ? { confirmed: true } : undefined,
      });
      return true;
    } catch (err) {
      console.error('[useHRContractProcess] updateStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [user, contractData, companyId]);

  /** Compute full readiness including data + docs */
  const computeReadiness = useCallback((
    existingDocs: Array<{ document_type: string }>,
  ): ContractReadiness => {
    const dataReadiness = computeContractDataReadiness(contractData);
    const docCompleteness = getCompleteness('contract_registration', existingDocs);
    const status = computeContractProcessStatus(contractData, dataReadiness, docCompleteness);

    const nextActions: string[] = [];
    if (!dataReadiness.requiredComplete) {
      const missing = dataReadiness.requiredFields.filter(f => !f.filled).map(f => f.label);
      nextActions.push(`Completar datos obligatorios: ${missing.join(', ')}`);
    }
    if (docCompleteness && !docCompleteness.mandatoryComplete) {
      nextActions.push(`Adjuntar documentos obligatorios faltantes (${docCompleteness.mandatoryMissing.length})`);
    }
    if (dataReadiness.requiredComplete && (!docCompleteness || docCompleteness.mandatoryComplete)) {
      if (status === 'ready_to_submit') {
        nextActions.push('Expediente listo para comunicación a SEPE/Contrat@');
      }
    }

    return {
      data: dataReadiness,
      docs: docCompleteness,
      overallReady: dataReadiness.requiredComplete && (!docCompleteness || docCompleteness.mandatoryComplete),
      status,
      nextActions,
    };
  }, [contractData, getCompleteness]);

  /** Fetch contract data for an employee */
  const fetchByEmployee = useCallback(async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_contract_process_data')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ContractProcessData | null;
    } catch (err) {
      console.error('[useHRContractProcess] fetchByEmployee error:', err);
      return null;
    }
  }, [companyId]);

  /** Persist computed deadline + payload state to DB (fire-and-forget) */
  const persistDeadlineAndPayload = useCallback(async (
    requestId: string,
    holidays: HolidayCalendar = EMPTY_CALENDAR,
  ) => {
    if (!contractData || contractData.request_id !== requestId) return;

    const deadlines = computeContractDeadlines(contractData, holidays);
    const contrata = buildContrataPayload(contractData);

    const payloadStatus = contrata.isReady ? 'ready' : (contrata.formatErrors.length > 0 ? 'has_errors' : 'incomplete');

    // Compute internal deadline (SEPE 10 business days from start)
    let internalDeadlineAt: string | null = null;
    if (contractData.contract_start_date) {
      const startDate = new Date(contractData.contract_start_date);
      const { addBusinessDays } = await import('@/components/erp/hr/shared/calendarHelpers');
      const deadline = addBusinessDays(startDate, 10, holidays);
      internalDeadlineAt = deadline.toISOString();
    }

    const prevUrgency = contractData.deadline_urgency || 'ok';
    const prevPayloadReady = contractData.payload_ready ?? false;

    try {
      await supabase
        .from('erp_hr_contract_process_data')
        .update({
          internal_deadline_at: internalDeadlineAt,
          deadline_urgency: deadlines.worstUrgency,
          is_overdue: deadlines.worstUrgency === 'overdue',
          payload_status: payloadStatus,
          payload_ready: contrata.isReady,
          payload_missing_fields: contrata.missingFields.map(f => f.field),
          payload_format_errors: contrata.formatErrors.map(f => `${f.field}: ${f.error}`),
          payload_snapshot: contrata.payload as any,
          last_payload_computed_at: new Date().toISOString(),
          deadline_computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('request_id', requestId);

      // Audit significant changes
      const urgencyChanged = prevUrgency !== deadlines.worstUrgency;
      const payloadReadyChanged = prevPayloadReady !== contrata.isReady;

      if (urgencyChanged || payloadReadyChanged) {
        const changedFields: string[] = [];
        if (urgencyChanged) changedFields.push('deadline_urgency');
        if (payloadReadyChanged) changedFields.push('payload_ready');

        const severity = deadlines.worstUrgency === 'overdue' ? 'warning'
          : contrata.isReady && !prevPayloadReady ? 'important'
          : 'info';

        logContractAudit(
          'CONTRACT_DEADLINE_PAYLOAD_UPDATE',
          contractData.company_id,
          user?.id,
          requestId,
          { deadline_urgency: prevUrgency, payload_ready: prevPayloadReady },
          { deadline_urgency: deadlines.worstUrgency, payload_ready: contrata.isReady, payload_status: payloadStatus },
          severity,
          changedFields,
        );
      }

      // Audit consistency errors
      if (!contrata.consistency.isConsistent) {
        logContractAudit(
          'CONTRACT_CONSISTENCY_CHECK',
          contractData.company_id,
          user?.id,
          requestId,
          null,
          { errors: contrata.consistency.errors, warnings: contrata.consistency.warnings },
          'warning',
          ['consistency'],
        );
      }
    } catch (err) {
      console.error('[useHRContractProcess] persistDeadlineAndPayload error:', err);
    }
  }, [contractData, user]);

  /** Close the contract process internally with an immutable snapshot */
  const closeContractProcess = useCallback(async (
    requestId: string,
    closureContext?: ContrataPreIntegrationContext,
    notes?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'No autenticado' };
    if (!contractData || contractData.request_id !== requestId) {
      return { success: false, error: 'Datos no disponibles' };
    }

    const preIntegration = evaluateContrataPreIntegrationReadiness(contractData, closureContext);
    const snapshot = buildContractClosureSnapshot(preIntegration, contractData);

    try {
      const { error } = await supabase
        .from('erp_hr_contract_process_data')
        .update({
          closure_status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          closure_notes: notes || null,
          closure_snapshot: snapshot as any,
          closure_blockers: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('request_id', requestId);

      if (error) throw error;

      setContractData(prev => prev ? {
        ...prev,
        closure_status: 'closed',
        closed_at: snapshot.closed_at,
        closed_by: user.id,
        closure_notes: notes || null,
        closure_snapshot: snapshot as any,
        closure_blockers: null,
      } : null);

      toast.success('Contratación cerrada internamente');
      logContractAudit(
        'CONTRACT_INTERNALLY_CLOSED',
        companyId,
        user.id,
        requestId,
        null,
        { snapshot, notes },
        'important',
        ['closure_status'],
      );
      // Ledger: contract terminated/closed
      writeLedger({
        eventType: 'contract_terminated',
        entityType: 'contract_process',
        entityId: contractData.id,
        afterSnapshot: { closure_status: 'closed', notes },
        complianceImpact: { internally_closed: true },
      });
      return { success: true };
    } catch (err) {
      console.error('[useHRContractProcess] closeContractProcess error:', err);
      toast.error('Error al cerrar contratación');
      return { success: false, error: 'Error de base de datos' };
    }
  }, [user, contractData, companyId]);

  /** Reopen a previously closed contract process */
  const reopenContractProcess = useCallback(async (
    requestId: string,
    reason?: string,
  ): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const prevSnapshot = contractData?.closure_snapshot ?? null;

      const { error } = await supabase
        .from('erp_hr_contract_process_data')
        .update({
          closure_status: null,
          closed_at: null,
          closed_by: null,
          closure_notes: null,
          closure_snapshot: null,
          closure_blockers: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('request_id', requestId);

      if (error) throw error;

      setContractData(prev => prev ? {
        ...prev,
        closure_status: null,
        closed_at: null,
        closed_by: null,
        closure_notes: null,
        closure_snapshot: null,
        closure_blockers: null,
      } : null);

      toast.success('Proceso de contratación reabierto');
      logContractAudit(
        'CONTRACT_CLOSURE_REOPENED',
        companyId,
        user.id,
        requestId,
        { previous_snapshot: prevSnapshot },
        { reason },
        'warning',
        ['closure_status'],
      );
      // Ledger: contract reopened (if it was closed)
      writeLedger({
        eventType: 'contract_updated',
        eventLabel: 'Contrato reabierto',
        entityType: 'contract_process',
        entityId: contractData?.id || requestId,
        beforeSnapshot: { closure_status: 'closed' },
        afterSnapshot: { closure_status: null, reason },
        isReopening: true,
      });
      return true;
    } catch (err) {
      console.error('[useHRContractProcess] reopenContractProcess error:', err);
      toast.error('Error al reabrir proceso');
      return false;
    }
  }, [user, contractData, companyId]);

  return {
    contractData,
    loading,
    fetchContractData,
    upsertContractData,
    updateContractStatus,
    computeReadiness,
    computeDataReadiness: () => computeContractDataReadiness(contractData),
    fetchByEmployee,
    persistDeadlineAndPayload,
    closeContractProcess,
    reopenContractProcess,
    CONTRACT_PROCESS_STATUS_CONFIG,
  };
}
