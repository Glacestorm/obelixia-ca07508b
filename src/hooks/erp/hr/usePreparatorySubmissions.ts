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
import { logDryRunEvent } from '@/components/erp/hr/shared/dryRunAuditEvents';
import {
  hasPayloadForExecution,
  isConcurrentExecution,
  executionLockMetadata,
  buildSupersedeMetadata,
} from '@/components/erp/hr/shared/connectorHardeningEngine';

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

      // Granular audit: creation
      await logDryRunEvent('dry_run_created', {
        submissionId: sub.id,
        domain: input.domain,
        submissionType: input.submissionType,
        status: 'draft',
      });

      toast.success(`Envío preparatorio ${getDomainMeta(input.domain).label} creado`);
      return sub;
    } catch (err) {
      console.error('[usePreparatorySubmissions] createPreparatory error:', err);
      toast.error('Error al crear envío preparatorio');
      return null;
    }
  }, [companyId]);

  // ── Transition status with validation + audit ──
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
      await logDryRunEvent('dry_run_real_blocked', {
        submissionId: id,
        domain: sub.submission_domain,
        submissionType: sub.submission_type,
        status: sub.status,
        extra: { attempted_transition: 'submitted_real' },
      });
      toast.error('Envío real bloqueado en modo preparatorio (V2-ES.8)');
      return false;
    }

    // Block ready_for_real
    if (newStatus === 'ready_for_real' && isRealSubmissionBlocked(sub.submission_mode as SubmissionMode)) {
      await logDryRunEvent('dry_run_real_blocked', {
        submissionId: id,
        domain: sub.submission_domain,
        submissionType: sub.submission_type,
        status: sub.status,
        extra: { attempted_transition: 'ready_for_real' },
      });
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

      // Granular audit for specific transitions
      const auditActionMap: Partial<Record<PreparatorySubmissionStatus, import('@/components/erp/hr/shared/dryRunAuditEvents').DryRunAuditAction>> = {
        ready_for_dry_run: 'dry_run_ready',
        cancelled: 'dry_run_cancelled',
        draft: 'dry_run_reset',
      };
      const auditAction = auditActionMap[newStatus];
      if (auditAction) {
        await logDryRunEvent(auditAction, {
          submissionId: id,
          domain: sub.submission_domain,
          submissionType: sub.submission_type,
          status: newStatus,
        });
      }

      toast.success(`Estado actualizado: ${getStatusMeta(newStatus).label}`);
      return true;
    } catch (err) {
      console.error('[usePreparatorySubmissions] transitionStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [submissions]);

  // ── Generate payload snapshot + audit ──
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

      await logDryRunEvent('dry_run_payload_generated', {
        submissionId: id,
        domain,
        extra: { payload_size: JSON.stringify(payloadData).length, source },
      });

      toast.success('Payload generado y snapshot capturado');
      return true;
    } catch (err) {
      console.error('[usePreparatorySubmissions] generatePayloadSnapshot error:', err);
      toast.error('Error al generar payload');
      return false;
    }
  }, []);

  // ── Record validation result + audit ──
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

      const sub = submissions.find(s => s.id === id);

      setSubmissions(prev => prev.map(s =>
        s.id === id ? {
          ...s,
          validation_result: validation,
          readiness_status: readiness,
          status: newStatus,
        } : s
      ));

      // Audit: validated or validation_failed
      await logDryRunEvent(
        validation.passed ? 'dry_run_validated' : 'dry_run_validation_failed',
        {
          submissionId: id,
          domain: sub?.submission_domain,
          submissionType: sub?.submission_type,
          score: validation.score,
          status: newStatus,
          extra: {
            errorCount: validation.errorCount,
            warningCount: validation.warningCount,
            readiness,
          },
        },
      );

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
  }, [submissions]);

  // ── Execute dry-run (simulated) with persistence + hardening guards ──
  const executeDryRun = useCallback(async (id: string): Promise<boolean> => {
    const sub = submissions.find(s => s.id === id);
    if (!sub) return false;

    // V2-ES.8 T4: Lifecycle state guard
    if (sub.status !== 'ready_for_dry_run' && sub.status !== 'dry_run_executed') {
      toast.error('El envío debe estar en estado "Listo para dry-run"');
      return false;
    }

    // V2-ES.8 T4: Payload guard — block execution without payload
    const payloadCheck = hasPayloadForExecution(sub.payload_snapshot, sub.payload);
    if (!payloadCheck.allowed) {
      await logDryRunEvent('dry_run_payload_guard_blocked', {
        submissionId: id,
        domain: sub.submission_domain,
        submissionType: sub.submission_type,
        status: sub.status,
        extra: { reason: payloadCheck.reason },
      });
      toast.error(payloadCheck.reason);
      return false;
    }

    // V2-ES.8 T4: Concurrency guard — block double execution
    const concurrencyCheck = isConcurrentExecution(sub.metadata);
    if (concurrencyCheck.blocked) {
      await logDryRunEvent('dry_run_concurrency_blocked', {
        submissionId: id,
        domain: sub.submission_domain,
        submissionType: sub.submission_type,
        status: sub.status,
        extra: { reason: concurrencyCheck.reason },
      });
      toast.error(concurrencyCheck.reason);
      return false;
    }

    const startTime = Date.now();
    const currentMeta = (sub.metadata || {}) as Record<string, unknown>;

    // V2-ES.8 T4: Set execution lock
    const lockMeta = { ...currentMeta, ...executionLockMetadata(true) };

    try {
      // Mark as in-progress via metadata
      await supabase
        .from('hr_official_submissions')
        .update({ metadata: lockMeta as any, updated_at: new Date().toISOString() } as any)
        .eq('id', id);

      const isRetry = sub.status === 'dry_run_executed';
      const dryRunHistory = ((currentMeta.dry_run_history as any[]) || []);
      const execNumber = dryRunHistory.length + 1;

      const dryRunResult = {
        executed_at: new Date().toISOString(),
        mode: 'dry_run',
        simulated: true,
        result: 'success',
        domain: sub.submission_domain,
        payload_size: JSON.stringify(sub.payload).length,
        execution_number: execNumber,
        is_retry: isRetry,
        note: 'Simulación completada — NO es un envío oficial',
      };

      const updatedMeta = {
        ...currentMeta,
        ...executionLockMetadata(false),
        dry_run_history: [...dryRunHistory, dryRunResult],
        last_dry_run: dryRunResult,
        retry_count: isRetry ? ((currentMeta.retry_count as number) || 0) + 1 : 0,
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

      // Persist dry-run result to dedicated table
      const durationMs = Date.now() - startTime;
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from('erp_hr_dry_run_results' as any)
        .insert([{
          company_id: sub.company_id,
          submission_id: id,
          submission_domain: sub.submission_domain,
          submission_type: sub.submission_type,
          execution_number: execNumber,
          status: 'success',
          payload_snapshot: sub.payload_snapshot,
          validation_result: sub.validation_result,
          dry_run_output: dryRunResult,
          readiness_score: sub.validation_result?.score || 0,
          duration_ms: durationMs,
          executed_by: userData?.user?.id || null,
          notes: isRetry ? `Reintento #${(currentMeta.retry_count as number || 0) + 1}` : 'Simulación automática desde panel preparatorio',
          metadata: {
            version: '1.0',
            phase: 'V2-ES.8-T4',
            is_retry: isRetry,
            configHash: (currentMeta.configHash as string) || null,
          },
          related_period_id: (sub as any).reference_period_id || null,
          related_process_id: (sub as any).related_process_id || null,
          related_run_id: sub.related_run_id || null,
          execution_mode: 'dry_run',
          simulated_result: 'success',
          readiness_status: sub.readiness_status || 'ready',
          submission_status: 'dry_run_executed',
        }]);

      // V2-ES.8 T4: Mark previous runs as superseded (metadata only, never delete)
      const { data: prevRuns } = await supabase
        .from('erp_hr_dry_run_results' as any)
        .select('id, execution_number, metadata')
        .eq('submission_id', id)
        .eq('submission_domain', sub.submission_domain)
        .neq('execution_number', execNumber)
        .eq('status', 'success')
        .order('execution_number', { ascending: false })
        .limit(5);

      if (prevRuns && prevRuns.length > 0) {
        for (const prev of prevRuns as any[]) {
          if (!(prev.metadata as any)?.superseded) {
            const supersedeMeta = {
              ...(prev.metadata || {}),
              ...buildSupersedeMetadata('newer_execution', id),
            };
            await supabase
              .from('erp_hr_dry_run_results' as any)
              .update({ metadata: supersedeMeta } as any)
              .eq('id', prev.id);
          }
        }

        await logDryRunEvent('dry_run_superseded', {
          submissionId: id,
          domain: sub.submission_domain,
          extra: { superseded_count: prevRuns.length, new_execution_number: execNumber },
        });
      }

      // Auto-generate evidence records
      const { data: dryRunRecord } = await supabase
        .from('erp_hr_dry_run_results' as any)
        .select('id')
        .eq('submission_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dryRunRecord) {
        const disclaimer = 'Evidencia interna preparatoria — NO constituye justificante oficial ni acuse de organismo';
        const evidenceRecords = [];
        if (sub.payload_snapshot) {
          evidenceRecords.push({
            dry_run_id: (dryRunRecord as any).id,
            evidence_type: 'payload_snapshot',
            label: `Snapshot payload ${sub.submission_domain}`,
            description: `Captura inmutable del payload generado. ${disclaimer}`,
            metadata: { domain: sub.submission_domain, internal_disclaimer: disclaimer },
          });
        }
        if (sub.validation_result) {
          evidenceRecords.push({
            dry_run_id: (dryRunRecord as any).id,
            evidence_type: 'validation_report',
            label: `Validación (${sub.validation_result.score}%)`,
            description: `${sub.validation_result.errorCount} errores, ${sub.validation_result.warningCount} avisos. ${disclaimer}`,
            metadata: { score: sub.validation_result.score, passed: sub.validation_result.passed, internal_disclaimer: disclaimer },
          });
        }
        evidenceRecords.push({
          dry_run_id: (dryRunRecord as any).id,
          evidence_type: 'validation_report',
          label: `Readiness report (${sub.validation_result?.score || 0}%)`,
          description: `Estado: ${sub.readiness_status || 'N/A'} · Dominio: ${sub.submission_domain}. ${disclaimer}`,
          metadata: {
            evidence_subtype: 'readiness_report',
            readinessScore: sub.validation_result?.score || 0,
            readinessStatus: sub.readiness_status,
            domain: sub.submission_domain,
            internal_disclaimer: disclaimer,
          },
        });
        evidenceRecords.push({
          dry_run_id: (dryRunRecord as any).id,
          evidence_type: 'simulation_log',
          label: 'Log de simulación',
          description: `Registro de ejecución simulada — sin efectos externos. ${disclaimer}`,
          metadata: { timestamp: new Date().toISOString(), simulated: true, is_retry: isRetry, internal_disclaimer: disclaimer },
        });

        if (evidenceRecords.length > 0) {
          await supabase.from('erp_hr_dry_run_evidence' as any).insert(evidenceRecords);
        }
      }

      // Granular audit — different event for retry vs first execution
      if (isRetry) {
        await logDryRunEvent('dry_run_retried', {
          submissionId: id,
          dryRunId: (dryRunRecord as any)?.id,
          domain: sub.submission_domain,
          submissionType: sub.submission_type,
          executionNumber: execNumber,
          score: sub.validation_result?.score,
          status: 'success',
          extra: { retry_number: (currentMeta.retry_count as number || 0) + 1 },
        });
      } else {
        await logDryRunEvent('dry_run_executed', {
          submissionId: id,
          dryRunId: (dryRunRecord as any)?.id,
          domain: sub.submission_domain,
          submissionType: sub.submission_type,
          executionNumber: execNumber,
          score: sub.validation_result?.score,
          status: 'success',
        });
      }

      setSubmissions(prev => prev.map(s =>
        s.id === id ? {
          ...s,
          status: 'dry_run_executed' as PreparatorySubmissionStatus,
          metadata: updatedMeta,
        } : s
      ));

      toast.success(isRetry
        ? `Dry-run reintentado (#${execNumber}) y persistido`
        : 'Dry-run ejecutado y persistido (simulación)');
      return true;
    } catch (err) {
      // V2-ES.8 T4: Release execution lock on error
      const unlockMeta = { ...currentMeta, ...executionLockMetadata(false) };
      await supabase
        .from('hr_official_submissions')
        .update({ metadata: unlockMeta as any } as any)
        .eq('id', id);

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
