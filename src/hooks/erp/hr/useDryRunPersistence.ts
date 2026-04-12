/**
 * useDryRunPersistence — V2-ES.8 Tramo 2
 * Hook for persisting dry-run results and linking documentary evidence.
 * 
 * Provides CRUD operations on erp_hr_dry_run_results and erp_hr_dry_run_evidence.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent, type AuditSeverity } from '@/lib/security/auditLogger';
import type {
  SubmissionDomain,
  SubmissionValidationResult,
  PayloadSnapshot,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DryRunResult {
  id: string;
  company_id: string;
  submission_id: string | null;
  submission_domain: string;
  submission_type: string;
  execution_number: number;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  payload_snapshot: PayloadSnapshot | null;
  validation_result: SubmissionValidationResult | null;
  dry_run_output: Record<string, unknown> | null;
  readiness_score: number;
  duration_ms: number | null;
  executed_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  // V2-ES.8 T2 extended fields
  related_period_id: string | null;
  related_process_id: string | null;
  related_run_id: string | null;
  execution_mode: string;
  simulated_result: string;
  readiness_status: string;
  submission_status: string;
  created_at: string;
  updated_at: string;
}

export interface DryRunEvidence {
  id: string;
  dry_run_id: string;
  evidence_type: 'payload_snapshot' | 'validation_report' | 'simulation_log' | 'linked_document';
  document_id: string | null;
  label: string;
  description: string | null;
  file_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateDryRunInput {
  submissionId?: string;
  domain: SubmissionDomain;
  submissionType: string;
  payloadSnapshot?: PayloadSnapshot | null;
  validationResult?: SubmissionValidationResult | null;
  dryRunOutput?: Record<string, unknown>;
  readinessScore?: number;
  durationMs?: number;
  notes?: string;
  status?: 'success' | 'partial' | 'failed' | 'skipped';
  // Extended traceability
  relatedPeriodId?: string;
  relatedProcessId?: string;
  relatedRunId?: string;
  executionMode?: string;
  simulatedResult?: string;
  readinessStatus?: string;
  submissionStatus?: string;
}

export interface CreateEvidenceInput {
  dryRunId: string;
  evidenceType: DryRunEvidence['evidence_type'];
  documentId?: string;
  label: string;
  description?: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDryRunPersistence(companyId: string) {
  const [results, setResults] = useState<DryRunResult[]>([]);
  const [evidence, setEvidence] = useState<DryRunEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch dry-run results ──
  const fetchResults = useCallback(async (filters?: {
    domain?: SubmissionDomain;
    submissionId?: string;
    limit?: number;
  }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let q = supabase
        .from('erp_hr_dry_run_results')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (filters?.domain) q = q.eq('submission_domain', filters.domain);
      if (filters?.submissionId) q = q.eq('submission_id', filters.submissionId);

      const { data, error } = await q;
      if (error) throw error;
      setResults((data || []) as unknown as DryRunResult[]);
    } catch (err) {
      console.error('[useDryRunPersistence] fetchResults error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Persist a dry-run result ──
  const persistDryRun = useCallback(async (input: CreateDryRunInput): Promise<DryRunResult | null> => {
    if (!companyId) return null;
    const startTime = Date.now();

    try {
      // Get execution number
      const { count } = await supabase
        .from('erp_hr_dry_run_results')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('submission_domain', input.domain)
        .eq('submission_type', input.submissionType);

      const execNumber = (count || 0) + 1;

      const { data: userData } = await supabase.auth.getUser();

      const record = {
        company_id: companyId,
        submission_id: input.submissionId || null,
        submission_domain: input.domain,
        submission_type: input.submissionType,
        execution_number: execNumber,
        status: input.status || 'success',
        payload_snapshot: input.payloadSnapshot || null,
        validation_result: input.validationResult || null,
        dry_run_output: input.dryRunOutput || {
          simulated: true,
          mode: 'dry_run',
          note: 'Simulación interna — NO es un envío oficial',
        },
        readiness_score: input.readinessScore || 0,
        duration_ms: input.durationMs || (Date.now() - startTime),
        executed_by: userData?.user?.id || null,
        notes: input.notes || null,
        metadata: { version: '1.0', phase: 'V2-ES.8-T2' },
        // Extended traceability fields
        related_period_id: input.relatedPeriodId || null,
        related_process_id: input.relatedProcessId || null,
        related_run_id: input.relatedRunId || null,
        execution_mode: input.executionMode || 'dry_run',
        simulated_result: input.simulatedResult || 'success',
        readiness_status: input.readinessStatus || 'pending',
        submission_status: input.submissionStatus || 'draft',
      };

      const { data, error } = await supabase
        .from('erp_hr_dry_run_results')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      const result = data as unknown as DryRunResult;
      setResults(prev => [result, ...prev]);

      // Audit log
      await logDryRunAudit('dry_run_persisted', input.domain, {
        dry_run_id: result.id,
        submission_id: input.submissionId,
        execution_number: execNumber,
        status: input.status || 'success',
        readiness_score: input.readinessScore,
      });

      toast.success(`Dry-run #${execNumber} persistido (${input.domain})`);
      return result;
    } catch (err) {
      console.error('[useDryRunPersistence] persistDryRun error:', err);
      toast.error('Error al persistir resultado dry-run');
      return null;
    }
  }, [companyId]);

  // ── Fetch evidence for a dry-run ──
  const fetchEvidence = useCallback(async (dryRunId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_dry_run_evidence')
        .select('*')
        .eq('dry_run_id', dryRunId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvidence((data || []) as unknown as DryRunEvidence[]);
      return (data || []) as unknown as DryRunEvidence[];
    } catch (err) {
      console.error('[useDryRunPersistence] fetchEvidence error:', err);
      return [];
    }
  }, []);

  // ── Link evidence to a dry-run ──
  const linkEvidence = useCallback(async (input: CreateEvidenceInput): Promise<DryRunEvidence | null> => {
    try {
      const record = {
        dry_run_id: input.dryRunId,
        evidence_type: input.evidenceType,
        document_id: input.documentId || null,
        label: input.label,
        description: input.description || null,
        file_path: input.filePath || null,
        metadata: input.metadata || {},
      };

      const { data, error } = await supabase
        .from('erp_hr_dry_run_evidence')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      const ev = data as unknown as DryRunEvidence;
      setEvidence(prev => [...prev, ev]);

      // Audit
      await logDryRunAudit('dry_run_evidence_linked', 'generic', {
        dry_run_id: input.dryRunId,
        evidence_type: input.evidenceType,
        document_id: input.documentId,
        label: input.label,
      });

      toast.success('Evidencia vinculada al dry-run');
      return ev;
    } catch (err) {
      console.error('[useDryRunPersistence] linkEvidence error:', err);
      toast.error('Error al vincular evidencia');
      return null;
    }
  }, []);

  // ── Auto-generate evidence records from a dry-run ──
  const autoGenerateEvidence = useCallback(async (
    dryRunId: string,
    payloadSnapshot?: PayloadSnapshot | null,
    validationResult?: SubmissionValidationResult | null,
    options?: {
      readinessScore?: number;
      readinessStatus?: string;
      domain?: string;
      submissionType?: string;
    },
  ): Promise<DryRunEvidence[]> => {
    const created: DryRunEvidence[] = [];
    const disclaimer = 'Evidencia interna preparatoria — NO constituye justificante oficial ni acuse de organismo';

    if (payloadSnapshot) {
      const ev = await linkEvidence({
        dryRunId,
        evidenceType: 'payload_snapshot',
        label: `Snapshot payload ${payloadSnapshot.domain}`,
        description: `Captura inmutable del payload generado (${payloadSnapshot.version}). ${disclaimer}`,
        metadata: {
          domain: payloadSnapshot.domain,
          snapshotAt: payloadSnapshot.snapshotAt,
          internal_disclaimer: disclaimer,
        },
      });
      if (ev) created.push(ev);
    }

    if (validationResult) {
      const ev = await linkEvidence({
        dryRunId,
        evidenceType: 'validation_report',
        label: `Informe de validación (${validationResult.score}%)`,
        description: `${validationResult.errorCount} errores, ${validationResult.warningCount} avisos. ${disclaimer}`,
        metadata: {
          score: validationResult.score,
          passed: validationResult.passed,
          errorCount: validationResult.errorCount,
          warningCount: validationResult.warningCount,
          internal_disclaimer: disclaimer,
        },
      });
      if (ev) created.push(ev);
    }

    // Readiness report evidence (new for Prompt 3)
    if (options?.readinessScore !== undefined) {
      const ev = await linkEvidence({
        dryRunId,
        evidenceType: 'validation_report',
        label: `Readiness report (${options.readinessScore}%)`,
        description: `Estado: ${options.readinessStatus || 'N/A'} · Dominio: ${options.domain || 'N/A'}. ${disclaimer}`,
        metadata: {
          readinessScore: options.readinessScore,
          readinessStatus: options.readinessStatus,
          domain: options.domain,
          submissionType: options.submissionType,
          evidence_subtype: 'readiness_report',
          internal_disclaimer: disclaimer,
        },
      });
      if (ev) created.push(ev);
    }

    // Simulation log evidence
    const simEv = await linkEvidence({
      dryRunId,
      evidenceType: 'simulation_log',
      label: 'Log de simulación dry-run',
      description: `Registro de la ejecución simulada — sin efectos externos. ${disclaimer}`,
      metadata: {
        timestamp: new Date().toISOString(),
        simulated: true,
        internal_disclaimer: disclaimer,
      },
    });
    if (simEv) created.push(simEv);

    return created;
  }, [linkEvidence]);

  // ── Generate evidence on demand (Prompt 3: optional generation) ──
  const generateEvidenceOnDemand = useCallback(async (
    dryRunId: string,
    evidenceType: DryRunEvidence['evidence_type'],
    label: string,
    description?: string,
    extraMetadata?: Record<string, unknown>,
  ): Promise<DryRunEvidence | null> => {
    const disclaimer = 'Evidencia interna preparatoria — NO constituye justificante oficial';
    return linkEvidence({
      dryRunId,
      evidenceType,
      label,
      description: `${description || label}. ${disclaimer}`,
      metadata: {
        ...extraMetadata,
        generated_on_demand: true,
        internal_disclaimer: disclaimer,
        generated_at: new Date().toISOString(),
      },
    });
  }, [linkEvidence]);

  return {
    results,
    evidence,
    isLoading,
    fetchResults,
    persistDryRun,
    fetchEvidence,
    linkEvidence,
    autoGenerateEvidence,
    generateEvidenceOnDemand,
  };
}

// ─── Audit helper ──────────────────────────────────────────────────────────

async function logDryRunAudit(
  action: string,
  domain: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const severityMap: Record<string, AuditSeverity> = {
    dry_run_persisted: 'info',
    dry_run_evidence_linked: 'info',
    dry_run_reviewed: 'info',
    dry_run_payload_inspected: 'info',
  };

  await logAuditEvent({
    action,
    tableName: 'erp_hr_dry_run_results',
    category: 'compliance',
    severity: severityMap[action] || 'info',
    newData: { ...metadata, domain, timestamp: new Date().toISOString() },
  });
}
