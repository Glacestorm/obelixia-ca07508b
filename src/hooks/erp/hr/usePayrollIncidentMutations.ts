/**
 * CASUISTICA-FECHAS-01 — Fase C3B1
 * Hook de mutaciones para incidencias persistentes (`erp_hr_payroll_incidents`).
 *
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Añadidas operaciones seguras de edición y cancelación (soft-delete).
 *
 * INVARIANTES:
 *  - INSERT (alta) + UPDATE (edición y soft-delete). NUNCA `.delete()` físico.
 *  - NUNCA `.upsert()`. Las mutaciones se acotan vía `.eq('id', id)` y
 *    guardrails `.is('deleted_at', null).is('applied_at', null)`.
 *  - Filtro defensivo de claves prohibidas (company_id, employee_id,
 *    incident_type, concept_code, applied_at, applied_to_record_id, version,
 *    period_year, period_month, deleted_at, deleted_by, created_*).
 *  - Usa el cliente Supabase autenticado (RLS multi-tenant). Sin service_role.
 *  - No marca `applied_at` ni `applied_to_record_id`.
 *  - No genera comunicaciones oficiales (FDI/AFI/DELTA/INSS/TGSS/SEPE).
 *  - No modifica el payload del motor de nómina.
 *  - Tras éxito invalida la query del hook read-only para refresco automático.
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type PayrollIncidentCreatableType =
  | 'pnr'
  | 'reduccion_jornada_guarda_legal'
  | 'atrasos_regularizacion'
  | 'desplazamiento_temporal'
  | 'suspension_empleo_sueldo'
  | 'otra';

export type OfficialCommunicationType =
  | 'FDI'
  | 'AFI'
  | 'DELTA'
  | 'INSS'
  | 'TGSS'
  | 'SEPE'
  | null;

export interface NewPayrollIncidentInput {
  incident_type: PayrollIncidentCreatableType;
  applies_from: string; // YYYY-MM-DD
  applies_to: string;   // YYYY-MM-DD
  units?: number | null;
  amount?: number | null;
  percent?: number | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  requires_ss_action?: boolean;
  requires_tax_adjustment?: boolean;
  requires_external_filing?: boolean;
  legal_review_required?: boolean;
  official_communication_type?: OfficialCommunicationType;
  /** Opcional. Si no se informa, se deriva del incident_type. */
  concept_code?: string;
}

/**
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Patch admitido en `updatePayrollIncident`. Cualquier clave fuera de esta
 * interfaz se filtra defensivamente antes de enviar a Supabase.
 */
export interface UpdatePayrollIncidentPatch {
  applies_from?: string;
  applies_to?: string;
  units?: number | null;
  amount?: number | null;
  percent?: number | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  requires_ss_action?: boolean;
  requires_tax_adjustment?: boolean;
  requires_external_filing?: boolean;
  legal_review_required?: boolean;
  official_communication_type?: OfficialCommunicationType | null;
}

/**
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Lista negra de claves que NUNCA pueden viajar en un UPDATE desde la UI.
 * Filtrado defensivo en cliente; los triggers C1 son la red de seguridad.
 */
export const FORBIDDEN_UPDATE_KEYS = [
  'id',
  'company_id',
  'employee_id',
  'created_by',
  'created_at',
  'applied_at',
  'applied_to_record_id',
  'deleted_at',
  'deleted_by',
  'incident_type',
  'concept_code',
  'period_year',
  'period_month',
  'version',
  'cancellation_reason',
  'status',
] as const;

const ALLOWED_UPDATE_KEYS: ReadonlyArray<keyof UpdatePayrollIncidentPatch> = [
  'applies_from',
  'applies_to',
  'units',
  'amount',
  'percent',
  'notes',
  'metadata',
  'requires_ss_action',
  'requires_tax_adjustment',
  'requires_external_filing',
  'legal_review_required',
  'official_communication_type',
];

function sanitizeUpdatePatch(
  patch: UpdatePayrollIncidentPatch,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_UPDATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      out[k] = (patch as Record<string, unknown>)[k];
    }
  }
  return out;
}

export interface UsePayrollIncidentMutationsParams {
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  onSuccess?: (id: string) => void;
}

/**
 * `concept_code` es NOT NULL en BD. Mapeamos un valor por tipo coherente con
 * la nomenclatura ya presente (ES_ATRASOS, ES_REDUCCION_JORNADA, …).
 * Si el caller informa `concept_code`, se respeta.
 */
export function defaultConceptCodeFor(type: PayrollIncidentCreatableType): string {
  switch (type) {
    case 'pnr':
      return 'ES_PNR';
    case 'reduccion_jornada_guarda_legal':
      return 'ES_REDUCCION_JORNADA';
    case 'atrasos_regularizacion':
      return 'ES_ATRASOS';
    case 'desplazamiento_temporal':
      return 'ES_DESPLAZAMIENTO_TEMPORAL';
    case 'suspension_empleo_sueldo':
      return 'ES_SUSPENSION_EMPLEO_SUELDO';
    case 'otra':
    default:
      return 'ES_OTRA';
  }
}

export function safeIncidentErrorMessage(err: unknown): string {
  if (!err) return 'Error desconocido al crear la incidencia.';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return 'Error desconocido al crear la incidencia.';
}

export function usePayrollIncidentMutations(params: UsePayrollIncidentMutationsParams) {
  const { companyId, employeeId, periodYear, periodMonth, onSuccess } = params;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const createPayrollIncident = useCallback(
    async (input: NewPayrollIncidentInput): Promise<{ id: string } | null> => {
      if (!companyId || !employeeId || !periodYear || !periodMonth) {
        toast.error('Falta contexto (empresa/empleado/periodo).');
        return null;
      }
      setIsCreating(true);
      try {
        const payload = {
          company_id: companyId,
          employee_id: employeeId,
          period_year: periodYear,
          period_month: periodMonth,
          incident_type: input.incident_type,
          concept_code: input.concept_code ?? defaultConceptCodeFor(input.incident_type),
          applies_from: input.applies_from,
          applies_to: input.applies_to,
          units: input.units ?? null,
          amount: input.amount ?? null,
          percent: input.percent ?? null,
          status: 'pending' as const,
          source: 'payroll_dialog' as const,
          notes: input.notes ?? null,
          metadata: (input.metadata ?? {}) as unknown as never,
          requires_ss_action: input.requires_ss_action ?? false,
          requires_tax_adjustment: input.requires_tax_adjustment ?? false,
          requires_external_filing: input.requires_external_filing ?? false,
          legal_review_required: input.legal_review_required ?? false,
          official_communication_type: input.official_communication_type ?? null,
          created_by: user?.id ?? null,
          version: 1,
        };

        const { data, error } = await supabase
          .from('erp_hr_payroll_incidents')
          .insert([payload])
          .select('id')
          .single();

        if (error) {
          toast.error(`No se pudo crear la incidencia: ${safeIncidentErrorMessage(error)}`);
          return null;
        }

        const id = (data as { id: string }).id;

        await queryClient.invalidateQueries({
          queryKey: ['hr-payroll-incidents', companyId, employeeId, periodYear, periodMonth],
        });

        toast.success('Incidencia creada (pendiente de revisión).');
        onSuccess?.(id);
        return { id };
      } catch (err) {
        toast.error(`No se pudo crear la incidencia: ${safeIncidentErrorMessage(err)}`);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [companyId, employeeId, periodYear, periodMonth, queryClient, user?.id, onSuccess],
  );

  /**
   * CASUISTICA-FECHAS-01 — Fase C3C
   * UPDATE seguro. Guardrails:
   *  - .eq('id', id)
   *  - .is('deleted_at', null)  ← no edita canceladas
   *  - .is('applied_at', null)  ← no edita aplicadas
   * Filtra claves prohibidas. Nunca `.upsert()` ni `.delete()`.
   */
  const updatePayrollIncident = useCallback(
    async (
      id: string,
      patch: UpdatePayrollIncidentPatch,
    ): Promise<{ id: string } | null> => {
      if (!id) {
        toast.error('Falta identificador de incidencia.');
        return null;
      }
      if (!companyId || !employeeId || !periodYear || !periodMonth) {
        toast.error('Falta contexto (empresa/empleado/periodo).');
        return null;
      }
      const safePatch = sanitizeUpdatePatch(patch);
      if (Object.keys(safePatch).length === 0) {
        toast.error('Sin cambios admitidos para guardar.');
        return null;
      }
      setIsUpdating(true);
      try {
        const { data, error } = await supabase
          .from('erp_hr_payroll_incidents')
          .update(safePatch as never)
          .eq('id', id)
          .is('deleted_at', null)
          .is('applied_at', null)
          .select('id')
          .single();

        if (error) {
          toast.error(`No se pudo actualizar la incidencia: ${safeIncidentErrorMessage(error)}`);
          return null;
        }
        const updatedId = (data as { id: string }).id;

        await queryClient.invalidateQueries({
          queryKey: ['hr-payroll-incidents', companyId, employeeId, periodYear, periodMonth],
        });
        toast.success('Incidencia actualizada.');
        return { id: updatedId };
      } catch (err) {
        toast.error(`No se pudo actualizar la incidencia: ${safeIncidentErrorMessage(err)}`);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [companyId, employeeId, periodYear, periodMonth, queryClient],
  );

  /**
   * CASUISTICA-FECHAS-01 — Fase C3C
   * Cancelación = soft-delete con `cancellation_reason` obligatorio (≥5 chars).
   * NUNCA `.delete()`. NUNCA toca `applied_at` / `applied_to_record_id`.
   * Bloqueada si la incidencia ya está aplicada o ya cancelada (guardrails).
   */
  const cancelPayrollIncident = useCallback(
    async (id: string, reason: string): Promise<{ id: string } | null> => {
      if (!id) {
        toast.error('Falta identificador de incidencia.');
        return null;
      }
      if (!user?.id) {
        toast.error('Sesión no válida para cancelar.');
        return null;
      }
      const trimmed = (reason ?? '').trim();
      if (trimmed.length < 5) {
        toast.error('Indica un motivo de cancelación (mínimo 5 caracteres).');
        return null;
      }
      if (!companyId || !employeeId || !periodYear || !periodMonth) {
        toast.error('Falta contexto (empresa/empleado/periodo).');
        return null;
      }
      setIsCancelling(true);
      try {
        const { data, error } = await supabase
          .from('erp_hr_payroll_incidents')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
            cancellation_reason: trimmed,
            status: 'cancelled',
          } as never)
          .eq('id', id)
          .is('deleted_at', null)
          .is('applied_at', null)
          .select('id')
          .single();

        if (error) {
          toast.error(`No se pudo cancelar la incidencia: ${safeIncidentErrorMessage(error)}`);
          return null;
        }
        const cancelledId = (data as { id: string }).id;

        await queryClient.invalidateQueries({
          queryKey: ['hr-payroll-incidents', companyId, employeeId, periodYear, periodMonth],
        });
        toast.success('Incidencia cancelada (soft-delete).');
        return { id: cancelledId };
      } catch (err) {
        toast.error(`No se pudo cancelar la incidencia: ${safeIncidentErrorMessage(err)}`);
        return null;
      } finally {
        setIsCancelling(false);
      }
    },
    [companyId, employeeId, periodYear, periodMonth, queryClient, user?.id],
  );

  return {
    createPayrollIncident,
    updatePayrollIncident,
    cancelPayrollIncident,
    isCreating,
    isUpdating,
    isCancelling,
  };
}

export default usePayrollIncidentMutations;