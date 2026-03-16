/**
 * useHRDocumentExpedient — Hook unificado para expediente documental RRHH
 * CRUD documentos, versiones, access log, comentarios, consentimientos, retención
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHRLedgerWriter } from './useHRLedgerWriter';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentCategory = 'personal' | 'contract' | 'payroll' | 'compliance' | 'medical' | 'training' | 'legal' | 'mobility';
export type DocumentSource = 'upload' | 'generated' | 'auto_generated' | 'integration' | 'migration';
export type ConsentType = 'gdpr' | 'medical' | 'background_check' | 'data_processing' | 'image_rights' | 'training_commitment';
export type ConsentStatus = 'active' | 'revoked' | 'expired';
export type AccessAction = 'view' | 'download' | 'print' | 'share' | 'export' | 'file_upload' | 'file_replace' | 'file_download' | 'file_preview' | 'file_delete' | 'file_version_created' | 'doc_auto_generated';
export type RelatedEntityType = 'admin_request' | 'hr_task';

export interface EmployeeDocument {
  id: string;
  company_id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_url: string | null;
  file_hash: string | null;
  version: number;
  is_confidential: boolean;
  expiry_date: string | null;
  category: DocumentCategory;
  subcategory: string | null;
  source: DocumentSource;
  integrity_verified: boolean;
  integrity_verified_at: string | null;
  retention_policy_id: string | null;
  consent_id: string | null;
  related_entity_type: RelatedEntityType | null;
  related_entity_id: string | null;
  /** Estado operativo del documento (V2-ES.4). Legacy docs default to 'draft'. */
  document_status: string;
  /** Conciliación documental (V2-ES.4 subfase). Flags manuales. */
  reconciled_with_payroll: boolean;
  reconciled_with_social_security: boolean;
  reconciled_with_tax: boolean;
  reconciliation_notes: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  /** Storage fields (V2-ES.4 Paso 2) */
  storage_path: string | null;
  storage_bucket: string | null;
  storage_provider: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  checksum: string | null;
  external_reference: string | null;
  uploaded_at: string | null;
  last_action_at: string | null;
  escalation_level: number;
  /** Metadata JSON (V2-ES.4 Paso 5) — includes generation_mode for auto-generated docs */
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  company_id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_hash: string | null;
  file_size_bytes: number | null;
  change_summary: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentAccessLog {
  id: string;
  company_id: string;
  document_id: string;
  document_table: string;
  user_id: string | null;
  action: AccessAction;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentComment {
  id: string;
  company_id: string;
  document_id: string;
  document_table: string;
  user_id: string | null;
  comment_text: string;
  is_internal: boolean;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HRConsent {
  id: string;
  company_id: string;
  employee_id: string;
  consent_type: ConsentType;
  consent_text: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  granted_via: string;
  evidence_url: string | null;
  ip_address: string | null;
  valid_until: string | null;
  status: ConsentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RetentionPolicy {
  id: string;
  company_id: string;
  document_type: string;
  jurisdiction: string;
  retention_years: number;
  legal_basis: string | null;
  auto_archive: boolean;
  auto_delete: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DocumentFilters {
  category?: DocumentCategory;
  source?: DocumentSource;
  employeeId?: string;
  search?: string;
}

export interface ExpedientStats {
  total: number;
  byCategory: Record<string, number>;
  expiringSoon: number;
  unverified: number;
  activeConsents: number;
  revokedConsents: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRDocumentExpedient(companyId: string) {
  const qc = useQueryClient();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const { writeLedgerWithEvidence, writeLedger, writeVersion } = useHRLedgerWriter(companyId, 'document_expedient');

  // ── Documents ──────────────────────────────────────────────────────────────

  const documentsQuery = useQuery({
    queryKey: ['hr-documents', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_employee_documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeDocument[];
    },
    enabled: !!companyId,
  });

  const fetchDocumentsByEmployee = useCallback(async (employeeId: string) => {
    const { data, error } = await supabase
      .from('erp_hr_employee_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as EmployeeDocument[];
  }, [companyId]);

  const fetchDocumentsByEntity = useCallback(async (
    entityType: RelatedEntityType,
    entityId: string
  ) => {
    const { data, error } = await supabase
      .from('erp_hr_employee_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('related_entity_type', entityType as any)
      .eq('related_entity_id', entityId as any)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as EmployeeDocument[];
  }, [companyId]);

  const uploadDocument = useMutation({
    mutationFn: async (doc: {
      employee_id: string;
      document_type: string;
      document_name: string;
      file_url?: string;
      file_hash?: string;
      category?: DocumentCategory;
      subcategory?: string;
      source?: DocumentSource;
      is_confidential?: boolean;
      expiry_date?: string;
      related_entity_type?: RelatedEntityType;
      related_entity_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('erp_hr_employee_documents')
        .insert({
          company_id: companyId,
          employee_id: doc.employee_id,
          document_type: doc.document_type,
          document_name: doc.document_name,
          file_url: doc.file_url ?? null,
          file_hash: doc.file_hash ?? null,
          category: doc.category ?? 'personal',
          subcategory: doc.subcategory ?? null,
          source: doc.source ?? 'upload',
          is_confidential: doc.is_confidential ?? false,
          expiry_date: doc.expiry_date ?? null,
          version: 1,
          related_entity_type: doc.related_entity_type ?? null,
          related_entity_id: doc.related_entity_id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Create version 1
      await (supabase as any).from('erp_hr_document_versions').insert({
        company_id: companyId,
        document_id: (data as any).id,
        version_number: 1,
        file_url: doc.file_url ?? '',
        file_hash: doc.file_hash ?? null,
        change_summary: 'Versión inicial',
      } as any);

      return data;
    },
    onSuccess: (_data: any, variables: any) => {
      qc.invalidateQueries({ queryKey: ['hr-documents', companyId] });
      toast.success('Documento subido correctamente');
      // Ledger: document uploaded
      writeLedgerWithEvidence(
        {
          eventType: 'document_uploaded',
          entityType: 'employee_document',
          entityId: _data?.id || 'unknown',
          afterSnapshot: {
            document_type: variables.document_type,
            document_name: variables.document_name,
            employee_id: variables.employee_id,
            category: variables.category,
          },
        },
        variables.file_url ? [{
          evidenceType: 'document' as const,
          evidenceLabel: variables.document_name || 'Documento subido',
          refEntityType: 'employee_document',
          refEntityId: _data?.id || 'unknown',
          storagePath: variables.file_url,
          contentHash: variables.file_hash,
        }] : []
      );
      // Version registry: v1
      if (_data?.id) {
        writeVersion({
          entityType: 'document',
          entityId: _data.id,
          state: 'draft',
          contentSnapshot: { document_type: variables.document_type, version: 1 },
        });
      }
    },
    onError: (e: any) => toast.error('Error: ' + e.message),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('erp_hr_employee_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-documents', companyId] });
      toast.success('Documento eliminado');
    },
  });

  const verifyIntegrity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('erp_hr_employee_documents')
        .update({
          integrity_verified: true,
          integrity_verified_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-documents', companyId] });
      toast.success('Integridad verificada');
    },
  });

  // ── Versions ───────────────────────────────────────────────────────────────

  const fetchVersions = useCallback(async (documentId: string) => {
    const { data, error } = await (supabase as any)
      .from('erp_hr_document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DocumentVersion[];
  }, []);

  // ── Access Log ─────────────────────────────────────────────────────────────

  const logAccess = useMutation({
    mutationFn: async (params: { document_id: string; action: AccessAction; document_table?: string }) => {
      const { error } = await (supabase as any)
        .from('erp_hr_document_access_log')
        .insert({
          company_id: companyId,
          document_id: params.document_id,
          document_table: params.document_table ?? 'erp_hr_employee_documents',
          action: params.action,
          user_agent: navigator.userAgent,
        });
      if (error) throw error;
    },
  });

  const fetchAccessLog = useCallback(async (documentId?: string) => {
    let query = (supabase as any)
      .from('erp_hr_document_access_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (documentId) query = query.eq('document_id', documentId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as DocumentAccessLog[];
  }, [companyId]);

  // ── Comments ───────────────────────────────────────────────────────────────

  const addComment = useMutation({
    mutationFn: async (params: { document_id: string; comment_text: string; is_internal?: boolean; parent_comment_id?: string }) => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_document_comments')
        .insert({
          company_id: companyId,
          document_id: params.document_id,
          comment_text: params.comment_text,
          is_internal: params.is_internal ?? true,
          parent_comment_id: params.parent_comment_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Comentario añadido'),
  });

  const fetchComments = useCallback(async (documentId: string) => {
    const { data, error } = await (supabase as any)
      .from('erp_hr_document_comments')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DocumentComment[];
  }, []);

  // ── Consents ───────────────────────────────────────────────────────────────

  const consentsQuery = useQuery({
    queryKey: ['hr-consents', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_consents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HRConsent[];
    },
    enabled: !!companyId,
  });

  const registerConsent = useMutation({
    mutationFn: async (params: {
      employee_id: string;
      consent_type: ConsentType;
      consent_text?: string;
      granted_via?: string;
      evidence_url?: string;
      valid_until?: string;
    }) => {
      const { data, error } = await supabase
        .from('erp_hr_consents')
        .insert({
          company_id: companyId,
          employee_id: params.employee_id,
          consent_type: params.consent_type,
          consent_text: params.consent_text ?? null,
          granted_at: new Date().toISOString(),
          granted_via: params.granted_via ?? 'digital',
          evidence_url: params.evidence_url ?? null,
          valid_until: params.valid_until ?? null,
          status: 'active',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-consents', companyId] });
      toast.success('Consentimiento registrado');
    },
  });

  const revokeConsent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('erp_hr_consents')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-consents', companyId] });
      toast.success('Consentimiento revocado');
    },
  });

  // ── Retention Policies ─────────────────────────────────────────────────────

  const retentionQuery = useQuery({
    queryKey: ['hr-retention-policies', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_retention_policies')
        .select('*')
        .eq('company_id', companyId)
        .order('document_type');
      if (error) throw error;
      return (data ?? []) as unknown as RetentionPolicy[];
    },
    enabled: !!companyId,
  });

  const createRetentionPolicy = useMutation({
    mutationFn: async (params: {
      document_type: string;
      jurisdiction?: string;
      retention_years: number;
      legal_basis?: string;
      auto_archive?: boolean;
      auto_delete?: boolean;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('erp_hr_retention_policies')
        .insert({
          company_id: companyId,
          ...params,
          jurisdiction: params.jurisdiction ?? 'ES',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-retention-policies', companyId] });
      toast.success('Política de retención creada');
    },
  });

  const deleteRetentionPolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('erp_hr_retention_policies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-retention-policies', companyId] });
      toast.success('Política eliminada');
    },
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const getExpedientStats = useCallback((): ExpedientStats => {
    const docs = documentsQuery.data ?? [];
    const consents = consentsQuery.data ?? [];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);

    const byCategory: Record<string, number> = {};
    let expiringSoon = 0;
    let unverified = 0;

    for (const d of docs) {
      byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;
      if (d.expiry_date && new Date(d.expiry_date) <= in30) expiringSoon++;
      if (!d.integrity_verified) unverified++;
    }

    return {
      total: docs.length,
      byCategory,
      expiringSoon,
      unverified,
      activeConsents: consents.filter(c => c.status === 'active').length,
      revokedConsents: consents.filter(c => c.status === 'revoked').length,
    };
  }, [documentsQuery.data, consentsQuery.data]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // Documents
    documents: documentsQuery.data ?? [],
    isLoadingDocuments: documentsQuery.isLoading,
    fetchDocumentsByEmployee,
    fetchDocumentsByEntity,
    uploadDocument,
    deleteDocument,
    verifyIntegrity,

    // Versions
    fetchVersions,

    // Access log
    logAccess,
    fetchAccessLog,

    // Comments
    addComment,
    fetchComments,

    // Consents
    consents: consentsQuery.data ?? [],
    isLoadingConsents: consentsQuery.isLoading,
    registerConsent,
    revokeConsent,

    // Retention
    retentionPolicies: retentionQuery.data ?? [],
    isLoadingRetention: retentionQuery.isLoading,
    createRetentionPolicy,
    deleteRetentionPolicy,

    // Stats
    getExpedientStats,

    // UI state
    selectedDocumentId,
    setSelectedDocumentId,
  };
}
