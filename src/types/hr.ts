/**
 * HR Domain Types — Bounded context para RRHH
 * Fase A: Auditoría, Compliance, Ficheros generados
 */

// ============================================
// AUDIT FINDINGS
// ============================================
export type AuditFindingSeverity = 'observation' | 'minor' | 'major' | 'critical';
export type AuditFindingStatus = 'open' | 'in_progress' | 'corrective_action' | 'verified' | 'closed';

export interface HRAuditFinding {
  id: string;
  company_id: string;
  finding_code: string;
  title: string;
  description: string | null;
  iso_standard: string;
  iso_clause: string | null;
  severity: AuditFindingSeverity;
  status: AuditFindingStatus;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  responsible_user_id: string | null;
  due_date: string | null;
  verified_at: string | null;
  verified_by: string | null;
  evidence_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// AUDIT REPORTS
// ============================================
export type AuditReportType = 'internal' | 'external' | 'certification' | 'surveillance' | 'follow_up';
export type AuditReportStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'published';

export interface HRAuditReport {
  id: string;
  company_id: string;
  report_code: string;
  title: string;
  report_type: AuditReportType;
  iso_standards: string[];
  scope: string | null;
  period_start: string | null;
  period_end: string | null;
  auditor_name: string | null;
  auditor_organization: string | null;
  status: AuditReportStatus;
  findings_count: number;
  summary: string | null;
  conclusions: string | null;
  file_url: string | null;
  file_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// ISO EVIDENCE
// ============================================
export type ISOComplianceStatus = 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'pending';

export interface HRISOEvidence {
  id: string;
  company_id: string;
  iso_standard: string;
  clause_number: string;
  clause_title: string | null;
  compliance_status: ISOComplianceStatus;
  evidence_description: string | null;
  document_url: string | null;
  document_hash: string | null;
  finding_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// RETENTION POLICY
// ============================================
export type RetentionAction = 'archive' | 'delete' | 'anonymize' | 'review';

export interface HRRetentionPolicy {
  id: string;
  company_id: string;
  document_type: string;
  category: string;
  retention_months: number;
  legal_basis: string | null;
  action_on_expiry: RetentionAction;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// ACCESS LOG
// ============================================
export type AccessType = 'view' | 'export' | 'print' | 'download' | 'api_access';

export interface HRAuditAccessLog {
  id: string;
  company_id: string;
  user_id: string;
  accessed_table: string;
  accessed_record_id: string | null;
  access_type: AccessType;
  justification: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// DOCUMENT EXPORTS
// ============================================
export type ExportPackageType = 'full' | 'findings_only' | 'evidence_only' | 'custom';
export type ExportStatus = 'pending' | 'generating' | 'ready' | 'downloaded' | 'expired';

export interface HRAuditDocumentExport {
  id: string;
  company_id: string;
  export_code: string;
  package_type: ExportPackageType;
  iso_standards: string[];
  period_start: string | null;
  period_end: string | null;
  file_url: string | null;
  file_hash: string | null;
  file_size_bytes: number | null;
  contents_summary: Record<string, unknown>;
  requested_by: string;
  status: ExportStatus;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// GENERATED FILES (TGSS/AEAT)
// ============================================
export type GeneratedFileType = 'FAN' | 'FDI' | 'AFI' | 'RLC' | 'RNT' | 'SILTRA' | 'DELTA' | 'MODELO_111' | 'MODELO_190' | 'CERTIFICADO_RETENCIONES' | 'SEPA_PAIN001' | 'OTHER';
export type GeneratedFileStatus = 'generated' | 'validated' | 'sent' | 'accepted' | 'rejected' | 'cancelled';

export interface HRGeneratedFile {
  id: string;
  company_id: string;
  file_type: GeneratedFileType;
  file_name: string;
  file_url: string | null;
  file_hash: string | null;
  file_size_bytes: number | null;
  period_month: number | null;
  period_year: number | null;
  status: GeneratedFileStatus;
  rejection_reason: string | null;
  sent_at: string | null;
  response_at: string | null;
  generated_by_agent: string | null;
  payroll_run_id: string | null;
  records_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// HR AUDIT DASHBOARD KPIs
// ============================================
export interface HRAuditKPIs {
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  complianceRate: number;
  totalReports: number;
  pendingExports: number;
  generatedFiles: number;
  pendingFiles: number;
  rejectedFiles: number;
}

// ============================================
// ISO STANDARDS CATALOG
// ============================================
export const ISO_STANDARDS = [
  { code: 'ISO_9001', label: 'ISO 9001:2015', description: 'Gestión de Calidad' },
  { code: 'ISO_27001', label: 'ISO 27001:2022', description: 'Seguridad de la Información' },
  { code: 'ISO_45001', label: 'ISO 45001:2018', description: 'Seguridad y Salud en el Trabajo' },
] as const;
