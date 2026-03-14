/**
 * useHRRegistrationProcess — Hook for employee registration/affiliation process
 * V2-ES.5 Paso 1: Data validation, readiness, TGSS-oriented structure
 *
 * RULES:
 * - Reuses existing doc checklist (useHRProcessDocRequirements)
 * - Registration-specific states: pending_data → pending_documents → ready_to_submit → submitted → confirmed
 * - No real TGSS integration yet — readiness-only
 * - Single source of truth: erp_hr_registration_data linked to admin_request
 */
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useHRProcessDocRequirements, type EnrichedCompleteness } from './useHRProcessDocRequirements';
import { computeRegistrationDeadlines, type RegistrationDeadlineSummary } from '@/components/erp/hr/shared/registrationDeadlineEngine';
import { buildTGSSPayload, type TGSSPayloadResult } from '@/components/erp/hr/shared/tgssPayloadBuilder';
import { evaluatePreIntegrationReadiness } from '@/components/erp/hr/shared/tgssPreIntegrationReadiness';
import {
  evaluateClosureReadiness,
  buildClosureSnapshot,
  type ClosureReadinessResult,
} from '@/components/erp/hr/shared/registrationClosureEngine';
import { addBusinessDays, type HolidayCalendar, EMPTY_CALENDAR } from '@/components/erp/hr/shared/calendarHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RegistrationStatus =
  | 'pending_data'
  | 'pending_documents'
  | 'ready_to_submit'
  | 'submitted'
  | 'confirmed';

export const REGISTRATION_STATUS_CONFIG: Record<RegistrationStatus, { label: string; labelES: string; color: string }> = {
  pending_data:       { label: 'Pending Data',      labelES: 'Pendiente datos',    color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  pending_documents:  { label: 'Pending Documents', labelES: 'Pendiente docs',     color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  ready_to_submit:    { label: 'Ready to Submit',   labelES: 'Listo para envío',   color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  submitted:          { label: 'Submitted',          labelES: 'Enviado',            color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30' },
  confirmed:          { label: 'Confirmed',          labelES: 'Confirmado',         color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
};

export const REGISTRATION_STATUS_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  pending_data:      ['pending_documents'],
  pending_documents: ['ready_to_submit', 'pending_data'],
  ready_to_submit:   ['submitted', 'pending_data', 'pending_documents'],
  submitted:         ['confirmed', 'ready_to_submit'],
  confirmed:         [],
};

export interface RegistrationData {
  id: string;
  request_id: string;
  company_id: string;
  employee_id: string;
  registration_status: RegistrationStatus;
  // TGSS fields
  naf: string | null;
  registration_date: string | null;
  ccc: string | null;
  contract_type_code: string | null;
  contribution_group: string | null;
  regime: string | null;
  work_center: string | null;
  legal_entity: string | null;
  working_coefficient: number | null;
  dni_nie: string | null;
  occupation_code: string | null;
  collective_agreement: string | null;
  trial_period_days: number | null;
  contract_end_date: string | null;
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
  // V2-ES.5 Paso 4: Operational closure
  closure_status: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  closure_snapshot: Record<string, unknown> | null;
  closure_blockers: Record<string, unknown>[] | null;
  // V2-ES.5 Paso 2: Deadline & payload tracking
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
  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Fields required for TGSS readiness */
const TGSS_REQUIRED_FIELDS: (keyof RegistrationData)[] = [
  'naf', 'registration_date', 'ccc', 'contract_type_code',
  'contribution_group', 'regime', 'dni_nie',
];

/** Fields recommended but not blocking */
const TGSS_RECOMMENDED_FIELDS: (keyof RegistrationData)[] = [
  'work_center', 'legal_entity', 'working_coefficient',
  'occupation_code', 'collective_agreement',
];

export interface DataReadiness {
  requiredFields: { key: string; label: string; filled: boolean }[];
  recommendedFields: { key: string; label: string; filled: boolean }[];
  requiredComplete: boolean;
  requiredCount: number;
  requiredFilled: number;
  recommendedCount: number;
  recommendedFilled: number;
  percentage: number;
}

export interface RegistrationReadiness {
  data: DataReadiness;
  docs: EnrichedCompleteness | null;
  overallReady: boolean;
  status: RegistrationStatus;
  nextActions: string[];
}

const FIELD_LABELS: Record<string, string> = {
  naf: 'NAF (Nº Afiliación SS)',
  registration_date: 'Fecha de alta',
  ccc: 'CCC (Cuenta Cotización)',
  contract_type_code: 'Tipo de contrato',
  contribution_group: 'Grupo de cotización',
  regime: 'Régimen',
  dni_nie: 'DNI/NIE',
  work_center: 'Centro de trabajo',
  legal_entity: 'Entidad legal',
  working_coefficient: 'Coef. jornada',
  occupation_code: 'Código CNO',
  collective_agreement: 'Convenio colectivo',
};

// ─── Computation ─────────────────────────────────────────────────────────────

function computeDataReadiness(data: RegistrationData | null): DataReadiness {
  const checkField = (key: keyof RegistrationData, label: string) => ({
    key: key as string,
    label,
    filled: data ? data[key] != null && String(data[key]).trim() !== '' : false,
  });

  const requiredFields = TGSS_REQUIRED_FIELDS.map(k => checkField(k, FIELD_LABELS[k] || k));
  const recommendedFields = TGSS_RECOMMENDED_FIELDS.map(k => checkField(k, FIELD_LABELS[k] || k));

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

export function computeRegistrationStatus(
  data: RegistrationData | null,
  dataReadiness: DataReadiness,
  docCompleteness: EnrichedCompleteness | null,
): RegistrationStatus {
  if (!data) return 'pending_data';
  
  // If already submitted or confirmed, respect it
  if (data.registration_status === 'submitted' || data.registration_status === 'confirmed') {
    return data.registration_status;
  }

  // Check data completeness
  if (!dataReadiness.requiredComplete) return 'pending_data';

  // Check doc completeness (mandatory docs)
  if (docCompleteness && !docCompleteness.mandatoryComplete) return 'pending_documents';

  return 'ready_to_submit';
}

// ─── Audit helper ────────────────────────────────────────────────────────────

async function logRegistrationAudit(
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
      table_name: 'erp_hr_registration_data',
      record_id: recordId,
      company_id: companyId,
      user_id: userId,
      old_data: oldData as any,
      new_data: newData as any,
      category: 'registration',
      severity,
      changed_fields: changedFields ?? null,
      metadata: { process: 'alta_afiliacion', version: 'v2-es5-p1' } as any,
    }]);
  } catch (err) {
    console.error('[RegistrationAudit] log error:', err);
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRRegistrationProcess(companyId: string) {
  const { user } = useAuth();
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(false);
  const { getCompleteness } = useHRProcessDocRequirements();

  /** Fetch registration data for a request */
  const fetchRegistrationData = useCallback(async (requestId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_registration_data')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) throw error;
      setRegistrationData(data as RegistrationData | null);
      return data as RegistrationData | null;
    } catch (err) {
      console.error('[useHRRegistrationProcess] fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Create or update registration data */
  const upsertRegistrationData = useCallback(async (
    requestId: string,
    employeeId: string,
    updates: Partial<RegistrationData>,
  ) => {
    if (!user?.id) { toast.error('Inicia sesión'); return null; }
    try {
      const existing = registrationData?.request_id === requestId ? registrationData : null;

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('erp_hr_registration_data')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('request_id', requestId)
          .select()
          .single();

        if (error) throw error;
        const updated = data as RegistrationData;
        setRegistrationData(updated);
        // Audit: data update
        const changedKeys = Object.keys(updates).filter(k => (existing as any)[k] !== (updates as any)[k]);
        logRegistrationAudit('REGISTRATION_DATA_UPDATE', companyId, user.id, requestId, { previous: existing }, { updated: updates }, 'info', changedKeys);
        return updated;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('erp_hr_registration_data')
          .insert([{
            request_id: requestId,
            company_id: companyId,
            employee_id: employeeId,
            registration_status: 'pending_data',
            ...updates,
          }] as any)
          .select()
          .single();

        if (error) throw error;
        const created = data as RegistrationData;
        setRegistrationData(created);
        toast.success('Datos de alta inicializados');
        // Audit: process initialized
        logRegistrationAudit('REGISTRATION_INITIALIZED', companyId, user.id, requestId, null, { employee_id: employeeId, request_id: requestId }, 'info');
        return created;
      }
    } catch (err) {
      console.error('[useHRRegistrationProcess] upsert error:', err);
      toast.error('Error al guardar datos de alta');
      return null;
    }
  }, [companyId, user, registrationData]);

  /** Update registration status with timestamps */
  const updateRegistrationStatus = useCallback(async (
    requestId: string,
    newStatus: RegistrationStatus,
  ) => {
    if (!user?.id) return false;
    try {
      const timestamps: Record<string, any> = {
        registration_status: newStatus,
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
        .from('erp_hr_registration_data')
        .update(timestamps as any)
        .eq('request_id', requestId);

      if (error) throw error;

      const oldStatus = registrationData?.registration_status || 'pending_data';
      setRegistrationData(prev => prev ? { ...prev, ...timestamps } : null);
      toast.success(`Estado actualizado: ${REGISTRATION_STATUS_CONFIG[newStatus].labelES}`);
      // Audit: status transition
      logRegistrationAudit(
        'REGISTRATION_STATUS_CHANGE',
        registrationData?.company_id || '',
        user.id,
        requestId,
        { status: oldStatus },
        { status: newStatus },
        newStatus === 'confirmed' ? 'important' : 'info',
        ['registration_status'],
      );
      return true;
    } catch (err) {
      console.error('[useHRRegistrationProcess] updateStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [user]);

  /** Compute full readiness including data + docs */
  const computeReadiness = useCallback((
    existingDocs: Array<{ document_type: string }>,
  ): RegistrationReadiness => {
    const dataReadiness = computeDataReadiness(registrationData);
    const docCompleteness = getCompleteness('employee_registration', existingDocs);
    const status = computeRegistrationStatus(registrationData, dataReadiness, docCompleteness);

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
        nextActions.push('Expediente listo para tramitación ante TGSS');
      }
    }

    return {
      data: dataReadiness,
      docs: docCompleteness,
      overallReady: dataReadiness.requiredComplete && (!docCompleteness || docCompleteness.mandatoryComplete),
      status,
      nextActions,
    };
  }, [registrationData, getCompleteness]);

  /** Fetch registration data for an employee (across requests) */
  const fetchByEmployee = useCallback(async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_registration_data')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as RegistrationData | null;
    } catch (err) {
      console.error('[useHRRegistrationProcess] fetchByEmployee error:', err);
      return null;
    }
  }, [companyId]);

  /** Persist computed deadline + payload state to DB (fire-and-forget) */
  const persistDeadlineAndPayload = useCallback(async (
    requestId: string,
    holidays: HolidayCalendar = EMPTY_CALENDAR,
  ) => {
    if (!registrationData || registrationData.request_id !== requestId) return;

    const deadlines = computeRegistrationDeadlines(registrationData, holidays);
    const tgss = buildTGSSPayload(registrationData);

    // Compute internal_deadline_at (pre-alta deadline date)
    let internalDeadlineAt: string | null = null;
    if (registrationData.registration_date) {
      const regDate = new Date(registrationData.registration_date);
      const preDeadline = addBusinessDays(regDate, -3, holidays);
      internalDeadlineAt = preDeadline.toISOString();
    }

    const payloadStatus = tgss.isReady ? 'ready' : (tgss.formatErrors.length > 0 ? 'has_errors' : 'incomplete');
    const preIntegration = evaluatePreIntegrationReadiness(registrationData);
    const prevUrgency = registrationData.deadline_urgency || 'ok';
    const prevPayloadReady = registrationData.payload_ready ?? false;

    try {
      await supabase
        .from('erp_hr_registration_data')
        .update({
          internal_deadline_at: internalDeadlineAt,
          deadline_urgency: deadlines.worstUrgency,
          is_overdue: deadlines.worstUrgency === 'overdue',
          payload_status: payloadStatus,
          payload_ready: tgss.isReady,
          payload_missing_fields: tgss.missingFields.map(f => f.field),
          payload_format_errors: tgss.formatErrors.map(f => `${f.field}: ${f.error}`),
          payload_snapshot: tgss.payload as any,
          last_payload_computed_at: new Date().toISOString(),
          deadline_computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('request_id', requestId);

      // Audit: log significant state changes only
      const urgencyChanged = prevUrgency !== deadlines.worstUrgency;
      const payloadReadyChanged = prevPayloadReady !== tgss.isReady;
      const hasConsistencyErrors = !preIntegration.consistency.consistent;

      if (urgencyChanged || payloadReadyChanged) {
        const changedFields: string[] = [];
        if (urgencyChanged) changedFields.push('deadline_urgency');
        if (payloadReadyChanged) changedFields.push('payload_ready');

        const severity = deadlines.worstUrgency === 'overdue' ? 'warning'
          : tgss.isReady && !prevPayloadReady ? 'important'
          : 'info';

        logRegistrationAudit(
          'REGISTRATION_DEADLINE_PAYLOAD_UPDATE',
          registrationData.company_id,
          user?.id,
          requestId,
          { deadline_urgency: prevUrgency, payload_ready: prevPayloadReady },
          {
            deadline_urgency: deadlines.worstUrgency,
            payload_ready: tgss.isReady,
            payload_status: payloadStatus,
            pre_integration_status: preIntegration.status,
            consistency_errors: preIntegration.consistency.errorCount,
            consistency_warnings: preIntegration.consistency.warningCount,
          },
          severity,
          changedFields,
        );
      }

      // Audit consistency blockers separately (only when there are errors)
      if (hasConsistencyErrors) {
        logRegistrationAudit(
          'REGISTRATION_CONSISTENCY_CHECK',
          registrationData.company_id,
          user?.id,
          requestId,
          null,
          {
            status: preIntegration.status,
            errors: preIntegration.consistency.errors,
            warnings: preIntegration.consistency.warnings,
          },
          'warning',
          ['consistency'],
        );
      }
    } catch (err) {
      console.error('[useHRRegistrationProcess] persistDeadlineAndPayload error:', err);
    }
  }, [registrationData, user]);

  return {
    registrationData,
    loading,
    fetchRegistrationData,
    upsertRegistrationData,
    updateRegistrationStatus,
    computeReadiness,
    computeDataReadiness: () => computeDataReadiness(registrationData),
    fetchByEmployee,
    persistDeadlineAndPayload,
    REGISTRATION_STATUS_CONFIG,
  };
}
