/**
 * usePreparatorySubmissions — V2-ES.8 Paso 2
 * Hook for managing preparatory official submissions lifecycle.
 *
 * Extends useOfficialIntegrationsHub with preparatory-specific logic:
 * - Domain-aware submission creation
 * - Payload snapshot generation
 * - Internal validation lifecycle
 * - Dry-run execution
 * - Readiness computation
 *
 * Reuses existing hr_official_submissions table with new columns.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type SubmissionDomain,
  type SubmissionMode,
  type PreparatorySubmissionStatus,
  type ReadinessStatus,
  type SubmissionValidationResult,
  type PayloadSnapshot,
  isValidTransition,
  getStatusMeta,
  getDomainMeta,
  computeReadinessStatus,
  createPayloadSnapshot,
  createEmptyValidationResult,
  isRealSubmissionBlocked,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PreparatorySubmission {
  id: string;
  company_id: string;
  submission_domain: SubmissionDomain;
  submission_type: string;
  submission_subtype: string | null;
  submission_mode: SubmissionMode;
  status: PreparatorySubmissionStatus;
  readiness_status: ReadinessStatus;
  payload: Record<string, unknown>;
  payload_snapshot: PayloadSnapshot | null;
  validation_result: SubmissionValidationResult | null;
  reference_period: string | null;
  employee_id: string | null;
  contract_id: string | null;
  payroll_record_id: string | null;
  related_run_id: string | null;
  adapter_id: string | null;
  priority: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePreparatorySubmissionInput {
  domain: SubmissionDomain;
  submissionType: string;
  submissionSubtype?: string;
  mode?: SubmissionMode;
  payload?: Record<string, unknown>;
  referencePeriod?: string;
  employeeId?: string;
  contractId?: string;
  payrollRecordId?: string;
  relatedRunId?: string;
  adapterId?: string;
  notes?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePreparatorySubmissions(companyId: string) {
  const [submissions, setSubmissions] = useState<PreparatorySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch preparatory submissions ──
  const fetchPreparatory = useCallback(async (filters?: {
    domain?: SubmissionDomain;
    status?: PreparatorySubmissionStatus;
    mode?: SubmissionMode;
  }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const q = supabase
        .from('hr_official_submissions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100) as any;

      if (filters?.domain) q.eq('submission_domain', filters.domain);
      if (filters?.status) q.eq('status', filters.status);
      if (filters?.mode) q.eq('submission_mode', filters.mode);

      const { data, error } = await q;
      if (error) throw error;

      setSubmissions((data || []) as unknown as PreparatorySubmission[]);
    } catch (err) {
      console.error('[usePreparatorySubmissions] fetchPreparatory error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Create preparatory submission ──
  const createPreparatory = useCallback(async (input: CreatePreparatorySubmissionInput): Promise<PreparatorySubmission | null> => {
    if (!companyId) return null;

    // Block real mode at creation
    const mode = input.mode === 'real' ? 'dry_run' : (input.mode || 'dry_run');

    try {
      const { data, error } = await supabase
        .from('hr_official_submissions')
        .insert([{
          company_id: companyId,
          country_code: 'ES',
          submission_type: input.submissionType,
          submission_subtype: input.submissionSubtype || null,
          submission_domain: input.domain,
          submission_mode: mode,
          status: 'draft',
          readiness_status: 'pending',
          payload: input.payload || {},
          reference_period: input.referencePeriod || null,
          employee_id: input.employeeId || null,
          contract_id: input.contractId || null,
          payroll_record_id: input.payrollRecordId || null,
          related_run_id: input.relatedRunId || null,
          adapter_id: input.adapterId || null,
          priority: 'normal',
          notes: input.notes || null,
          attempts: 0,
        } as any])
        .select()
        .single();

      if (error) throw error;

      const sub = data as unknown as PreparatorySubmission;
      setSubmissions(prev => [sub, ...prev]);
      toast.success(`Envío preparatorio ${getDomainMeta(input.domain).label} creado`);
      return sub;
    } catch (err) {
      console.error('[usePreparatorySubmissions] createPreparatory error:', err);
      toast.error('Error al crear envío preparatorio');
      return null;
    }
  }, [companyId]);

  // ── Transition status with validation ──
  const transitionStatus = useCallback(async (
    id: string,
    newStatus: PreparatorySubmissionStatus,
    extra?: Partial<Record<string, unknown>>,
  ): Promise<boolean> => {
    const sub = submissions.find(s => s.id === id);
    if (!sub) {
      toast.error('Envío no encontrado');
      return false;
    }

    // Validate transition
    if (!isValidTransition(sub.status as PreparatorySubmissionStatus, newStatus)) {
      toast.error(`Transición no válida: ${getStatusMeta(sub.status as PreparatorySubmissionStatus).label} → ${getStatusMeta(newStatus).label}`);
      return false;
    }

    // Block real submission
    if (newStatus === 'submitted_real' && isRealSubmissionBlocked(sub.submission_mode as SubmissionMode)) {
      toast.error('Envío real bloqueado en modo preparatorio (V2-ES.8)');
      return false;
    }

    // Block ready_for_real
    if (newStatus === 'ready_for_real' && isRealSubmissionBlocked(sub.submission_mode as SubmissionMode)) {
      toast.error('Envío real no disponible en esta fase');
      return false;
    }

    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...extra,
      };

      const { error } = await supabase
        .from('hr_official_submissions')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => prev.map(s =>
        s.id === id ? { ...s, ...updates } as PreparatorySubmission : s
      ));

      toast.success(`Estado actualizado: ${getStatusMeta(newStatus).label}`);
      return true;
    } catch (err) {
      console.error('[usePreparatorySubmissions] transitionStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [submissions]);

  // ── Generate payload snapshot ──
  const generatePayloadSnapshot = useCallback(async (
    id: string,
    domain: SubmissionDomain,
    payloadData: Record<string, unknown>,
    source: PayloadSnapshot['source'],
  ): Promise<boolean> => {
    const snapshot = createPayloadSnapshot(domain, payloadData, source);

    try {
      const { error } = await supabase
        .from('hr_official_submissions')
        .update({
          payload: payloadData,
          payload_snapshot: snapshot as any,
          status: 'payload_generated',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => prev.map(s =>
        s.id === id ? {
          ...s,
          payload: payloadData,
          payload_snapshot: snapshot,
          status: 'payload_generated' as PreparatorySubmissionStatus,
        } : s
      ));

      toast.success('Payload generado y snapshot capturado');
      return true;
    } catch (err) {
      console.error('[usePreparatorySubmissions] generatePayloadSnapshot error:', err);
      toast.error('Error al generar payload');
      return false;
    }
  }, []);

  // ── Record validation result ──
  const recordValidation = useCallback(async (
    id: string,
    validation: SubmissionValidationResult,
  ): Promise<boolean> => {
    const readiness = computeReadinessStatus(validation);
    const newStatus: PreparatorySubmissionStatus = validation.passed
      ? 'validated_internal'
      : 'payload_generated'; // stay if failed

    try {
      const { error } = await supabase
        .from('hr_official_submissions')
        .update({
          validation_result: validation as any,
          readiness_status: readiness,
          status: newStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => prev.map(s =>
        s.id === id ? {
          ...s,
          validation_result: validation,
          readiness_status: readiness,
          status: newStatus,
        } : s
      ));

      if (validation.passed) {
        toast.success(`Validación interna superada (${validation.score}%)`);
      } else {
        toast.warning(`Validación con ${validation.errorCount} error(es)`);
      }
      return true;
    } catch (err) {
      console.error('[usePreparatorySubmissions] recordValidation error:', err);
      toast.error('Error al registrar validación');
      return false;
    }
  }, []);

  // ── Execute dry-run (simulated) ──
  const executeDryRun = useCallback(async (id: string): Promise<boolean> => {
    const sub = submissions.find(s => s.id === id);
    if (!sub) return false;

    // Must be ready_for_dry_run
    if (sub.status !== 'ready_for_dry_run') {
      toast.error('El envío debe estar en estado "Listo para dry-run"');
      return false;
    }

    try {
      const dryRunResult = {
        executed_at: new Date().toISOString(),
        mode: 'dry_run',
        simulated: true,
        result: 'success',
        domain: sub.submission_domain,
        payload_size: JSON.stringify(sub.payload).length,
        note: 'Simulación completada — NO es un envío oficial',
      };

      const currentMeta = (sub.metadata || {}) as Record<string, unknown>;
      const updatedMeta = {
        ...currentMeta,
        dry_run_history: [
          ...((currentMeta.dry_run_history as any[]) || []),
          dryRunResult,
        ],
        last_dry_run: dryRunResult,
      };

      const { error } = await supabase
        .from('hr_official_submissions')
        .update({
          status: 'dry_run_executed',
          metadata: updatedMeta as any,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => prev.map(s =>
        s.id === id ? {
          ...s,
          status: 'dry_run_executed' as PreparatorySubmissionStatus,
          metadata: updatedMeta,
        } : s
      ));

      toast.success('Dry-run ejecutado con éxito (simulación)');
      return true;
    } catch (err) {
      console.error('[usePreparatorySubmissions] executeDryRun error:', err);
      toast.error('Error en dry-run');
      return false;
    }
  }, [submissions]);

  // ── Convenience: mark as ready for dry-run ──
  const markReadyForDryRun = useCallback((id: string) =>
    transitionStatus(id, 'ready_for_dry_run'),
  [transitionStatus]);

  // ── Convenience: reset to draft ──
  const resetToDraft = useCallback((id: string) =>
    transitionStatus(id, 'draft'),
  [transitionStatus]);

  // ── Convenience: cancel ──
  const cancel = useCallback((id: string) =>
    transitionStatus(id, 'cancelled'),
  [transitionStatus]);

  return {
    submissions,
    isLoading,
    fetchPreparatory,
    createPreparatory,
    transitionStatus,
    generatePayloadSnapshot,
    recordValidation,
    executeDryRun,
    markReadyForDryRun,
    resetToDraft,
    cancel,
  };
}
