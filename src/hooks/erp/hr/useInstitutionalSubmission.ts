/**
 * useInstitutionalSubmission — V2-RRHH-PINST
 * Hook for managing the institutional submission lifecycle.
 * Handles: submission queue, signature operations, receipts, reconciliation.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  canTransitionInstitutional,
  buildStatusTransition,
  reconcileArtifactWithReceipt,
  validateTransitionContent,
  type InstitutionalStatus,
  type ReceiptType,
  type StatusTransitionEntry,
  type TransitionGuardContext,
} from '@/engines/erp/hr/institutionalSubmissionEngine';
import { buildLedgerRow, type LedgerEventInput } from '@/engines/erp/hr/ledgerEngine';
import { buildEvidenceRow, type EvidenceInput } from '@/engines/erp/hr/evidenceEngine';

// ── Types ──

export interface InstitutionalSubmissionRow {
  id: string;
  company_id: string;
  artifact_id: string;
  artifact_type: string;
  circuit_id: string;
  target_organism: string;
  institutional_status: InstitutionalStatus;
  signature_id: string | null;
  certificate_id: string | null;
  signed_at: string | null;
  signature_method: string | null;
  submission_payload: Record<string, unknown> | null;
  submitted_at: string | null;
  submission_reference: string | null;
  receipt_id: string | null;
  receipt_data: Record<string, unknown> | null;
  receipt_received_at: string | null;
  reconciliation_status: string | null;
  reconciliation_data: Record<string, unknown> | null;
  reconciled_at: string | null;
  ledger_event_id: string | null;
  evidence_id: string | null;
  status_history: StatusTransitionEntry[];
  period_year: number | null;
  period_month: number | null;
  fiscal_year: number | null;
  trimester: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfficialReceiptRow {
  id: string;
  company_id: string;
  submission_id: string;
  receipt_type: ReceiptType;
  organism: string;
  reference_code: string | null;
  receipt_payload: Record<string, unknown> | null;
  receipt_message: string | null;
  error_codes: unknown[] | null;
  received_at: string;
  created_at: string;
}

// ── Hook ──

export function useInstitutionalSubmission(companyId: string) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const sb = supabase as unknown as { from: (t: string) => any };

  // ── Fetch submissions ──
  const { data: submissions = [], isLoading, refetch } = useQuery({
    queryKey: ['institutional-submissions', companyId],
    queryFn: async (): Promise<InstitutionalSubmissionRow[]> => {
      const { data, error } = await sb
        .from('erp_hr_institutional_submissions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) { console.error('[useInstitutionalSubmission] fetch error:', error); return []; }
      return (data ?? []) as InstitutionalSubmissionRow[];
    },
    enabled: !!companyId,
  });

  // ── Fetch receipts for a submission ──
  const fetchReceipts = useCallback(async (submissionId: string): Promise<OfficialReceiptRow[]> => {
    const { data, error } = await sb
      .from('erp_hr_official_receipts')
      .select('*')
      .eq('submission_id', submissionId)
      .order('received_at', { ascending: false });
    if (error) { console.error('[useInstitutionalSubmission] receipts error:', error); return []; }
    return (data ?? []) as OfficialReceiptRow[];
  }, []);

  // ── Create institutional submission from artifact ──
  const createSubmission = useCallback(async (params: {
    artifactId: string;
    artifactType: string;
    circuitId: string;
    targetOrganism: string;
    periodYear?: number;
    periodMonth?: number;
    fiscalYear?: number;
    trimester?: number;
    metadata?: Record<string, unknown>;
  }): Promise<string | null> => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from('erp_hr_institutional_submissions')
        .insert({
          company_id: companyId,
          artifact_id: params.artifactId,
          artifact_type: params.artifactType,
          circuit_id: params.circuitId,
          target_organism: params.targetOrganism,
          institutional_status: 'generated',
          period_year: params.periodYear ?? null,
          period_month: params.periodMonth ?? null,
          fiscal_year: params.fiscalYear ?? null,
          trimester: params.trimester ?? null,
          created_by: user?.id ?? null,
          status_history: [buildStatusTransition('generated', 'generated', 'created', user?.id ?? 'system')],
          metadata: params.metadata ?? {},
        })
        .select('id')
        .single();

      if (error) throw error;

      // Ledger event
      const ledgerInput: LedgerEventInput = {
        companyId,
        eventType: 'official_export_prepared',
        eventLabel: `Envío institucional creado: ${params.artifactType} → ${params.targetOrganism}`,
        entityType: 'institutional_submission',
        entityId: data.id,
        sourceModule: 'hr_institutional_pinst',
        afterSnapshot: { ...params, submissionId: data.id },
      };
      const ledgerRow = await buildLedgerRow(ledgerInput);
      await sb.from('erp_hr_ledger').insert(ledgerRow);

      queryClient.invalidateQueries({ queryKey: ['institutional-submissions', companyId] });
      toast.success('Envío institucional creado');
      return data.id;
    } catch (err) {
      console.error('[useInstitutionalSubmission] create error:', err);
      toast.error('Error al crear envío institucional');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, queryClient]);

  // ── PINST-B1: Build guard context from submission row ──
  const buildGuardContext = useCallback(async (submissionId: string): Promise<TransitionGuardContext> => {
    const row = submissions.find(s => s.id === submissionId);
    // Check for certificate
    const { data: certs } = await sb
      .from('erp_hr_domain_certificates')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(1);

    return {
      hasPayload: !!row?.submission_payload,
      hasSignature: !!row?.signature_id || !!row?.signed_at,
      hasReceipt: !!row?.receipt_id || !!row?.receipt_received_at,
      hasReconciliationData: !!row?.reconciliation_data,
      artifactIsValid: (row?.metadata as Record<string, unknown>)?.isValid !== false,
      hasCertificate: ((certs ?? []) as unknown[]).length > 0,
    };
  }, [submissions, companyId]);

  // ── Transition status (PINST-B1: with content validation) ──
  const transitionStatus = useCallback(async (
    submissionId: string,
    currentStatus: InstitutionalStatus,
    targetStatus: InstitutionalStatus,
    action: string,
    notes?: string,
  ): Promise<boolean> => {
    if (!canTransitionInstitutional(currentStatus, targetStatus)) {
      toast.error(`Transición no permitida: ${currentStatus} → ${targetStatus}`);
      return false;
    }

    // PINST-B1: Content validation guard
    const guardContext = await buildGuardContext(submissionId);
    const guard = validateTransitionContent(currentStatus, targetStatus, guardContext);
    if (!guard.allowed) {
      toast.error('Transición bloqueada', {
        description: guard.blockers[0],
        duration: 6000,
      });
      return false;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const transition = buildStatusTransition(currentStatus, targetStatus, action, user?.id ?? 'system', { notes });

      // Fetch current history
      const { data: current } = await sb
        .from('erp_hr_institutional_submissions')
        .select('status_history')
        .eq('id', submissionId)
        .single();

      const history = [...((current?.status_history as StatusTransitionEntry[]) ?? []), transition];

      const updates: Record<string, unknown> = {
        institutional_status: targetStatus,
        status_history: history,
        updated_at: new Date().toISOString(),
      };

      if (targetStatus === 'signed') updates.signed_at = new Date().toISOString();
      if (targetStatus === 'submitted') updates.submitted_at = new Date().toISOString();

      const { error } = await sb
        .from('erp_hr_institutional_submissions')
        .update(updates)
        .eq('id', submissionId);

      if (error) throw error;

      // Ledger
      const ledgerInput: LedgerEventInput = {
        companyId,
        eventType: 'official_export_prepared',
        eventLabel: `Transición institucional: ${currentStatus} → ${targetStatus}`,
        entityType: 'institutional_submission',
        entityId: submissionId,
        sourceModule: 'hr_institutional_pinst',
        beforeSnapshot: { status: currentStatus },
        afterSnapshot: { status: targetStatus, action, notes },
      };
      const ledgerRow = await buildLedgerRow(ledgerInput);
      await sb.from('erp_hr_ledger').insert(ledgerRow);

      queryClient.invalidateQueries({ queryKey: ['institutional-submissions', companyId] });
      toast.success(`Estado actualizado: ${targetStatus}`);
      return true;
    } catch (err) {
      console.error('[useInstitutionalSubmission] transition error:', err);
      toast.error('Error en transición de estado');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, queryClient, buildGuardContext]);

  // ── Register receipt ──
  const registerReceipt = useCallback(async (params: {
    submissionId: string;
    receiptType: ReceiptType;
    organism: string;
    referenceCode?: string;
    receiptPayload?: Record<string, unknown>;
    receiptMessage?: string;
    errorCodes?: unknown[];
  }): Promise<string | null> => {
    setIsProcessing(true);
    try {
      const { data, error } = await sb
        .from('erp_hr_official_receipts')
        .insert({
          company_id: companyId,
          submission_id: params.submissionId,
          receipt_type: params.receiptType,
          organism: params.organism,
          reference_code: params.referenceCode ?? null,
          receipt_payload: params.receiptPayload ?? null,
          receipt_message: params.receiptMessage ?? null,
          error_codes: params.errorCodes ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update submission with receipt
      await sb
        .from('erp_hr_institutional_submissions')
        .update({
          receipt_id: data.id,
          receipt_data: params.receiptPayload ?? null,
          receipt_received_at: new Date().toISOString(),
        })
        .eq('id', params.submissionId);

      // Evidence
      const evidenceRow = buildEvidenceRow({
        companyId,
        ledgerEventId: undefined,
        evidenceType: 'export_package',
        evidenceLabel: `Acuse oficial: ${params.receiptType} de ${params.organism}`,
        refEntityType: 'official_receipt',
        refEntityId: data.id,
        evidenceSnapshot: params.receiptPayload ?? {},
        metadata: { submissionId: params.submissionId, receiptType: params.receiptType },
      });
      await sb.from('erp_hr_evidence').insert(evidenceRow);

      queryClient.invalidateQueries({ queryKey: ['institutional-submissions', companyId] });
      toast.success(`Acuse registrado: ${params.receiptType}`);
      return data.id;
    } catch (err) {
      console.error('[useInstitutionalSubmission] receipt error:', err);
      toast.error('Error al registrar acuse');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, queryClient]);

  // ── Reconcile ──
  const reconcileSubmission = useCallback(async (
    submissionId: string,
    artifactPayload: Record<string, unknown>,
    receiptPayload: Record<string, unknown> | null,
  ): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const result = reconcileArtifactWithReceipt(artifactPayload, receiptPayload);

      await sb
        .from('erp_hr_institutional_submissions')
        .update({
          reconciliation_status: result.status,
          reconciliation_data: result as unknown as Record<string, unknown>,
          reconciled_at: new Date().toISOString(),
          institutional_status: result.status === 'matched' ? 'reconciled' : 'requires_correction',
        })
        .eq('id', submissionId);

      queryClient.invalidateQueries({ queryKey: ['institutional-submissions', companyId] });
      toast.success(result.status === 'matched' ? 'Reconciliación exitosa' : 'Discrepancias detectadas');
      return true;
    } catch (err) {
      console.error('[useInstitutionalSubmission] reconcile error:', err);
      toast.error('Error en reconciliación');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, queryClient]);

  // ── Register signature operation ──
  const registerSignature = useCallback(async (params: {
    submissionId: string;
    artifactId: string;
    certificateId?: string;
    signerName: string;
    documentHash: string;
    eidasLevel?: 'AdES' | 'QES';
  }): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from('erp_hr_signature_operations')
        .insert({
          company_id: companyId,
          operation_type: 'sign_artifact',
          artifact_id: params.artifactId,
          submission_id: params.submissionId,
          certificate_id: params.certificateId ?? null,
          signer_id: user?.id ?? null,
          signer_name: params.signerName,
          document_hash: params.documentHash,
          signature_status: 'signed',
          eidas_level: params.eidasLevel ?? 'AdES',
          signed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update submission
      await sb
        .from('erp_hr_institutional_submissions')
        .update({
          signature_id: data.id,
          certificate_id: params.certificateId ?? null,
          signed_at: new Date().toISOString(),
          signature_method: params.eidasLevel ?? 'AdES',
        })
        .eq('id', params.submissionId);

      queryClient.invalidateQueries({ queryKey: ['institutional-submissions', companyId] });
      toast.success('Firma registrada');
      return true;
    } catch (err) {
      console.error('[useInstitutionalSubmission] signature error:', err);
      toast.error('Error al registrar firma');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, queryClient]);

  return {
    submissions,
    isLoading,
    isProcessing,
    refetch,
    createSubmission,
    transitionStatus,
    registerReceipt,
    reconcileSubmission,
    registerSignature,
    fetchReceipts,
  };
}
