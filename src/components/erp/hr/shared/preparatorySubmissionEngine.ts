/**
 * preparatorySubmissionEngine — V2-ES.8 Paso 2
 * Lifecycle engine for official preparatory submissions (dry-run mode).
 *
 * Defines states, valid transitions, validation, and payload lifecycle.
 * Pure functions — no side effects.
 */

// ─── Domains ────────────────────────────────────────────────────────────────

export type SubmissionDomain =
  | 'TGSS'
  | 'CONTRATA'
  | 'AEAT_111'
  | 'AEAT_190'
  | 'CERTIFICA2'
  | 'DELTA'
  | 'generic';

export type SubmissionMode = 'manual' | 'dry_run' | 'real';

export type ReadinessStatus = 'pending' | 'partial' | 'ready' | 'blocked';

// ─── Extended lifecycle states ──────────────────────────────────────────────

export type PreparatorySubmissionStatus =
  | 'draft'
  | 'payload_generated'
  | 'validated_internal'
  | 'ready_for_dry_run'
  | 'dry_run_executed'
  | 'ready_for_real'
  | 'submitted_real'
  | 'acknowledged'
  | 'accepted'
  | 'rejected'
  | 'correction_required'
  | 'corrected'
  | 'failed'
  | 'cancelled';

// ─── Transition map ─────────────────────────────────────────────────────────

const PREPARATORY_TRANSITIONS: Record<PreparatorySubmissionStatus, PreparatorySubmissionStatus[]> = {
  draft:                ['payload_generated', 'cancelled'],
  payload_generated:    ['validated_internal', 'draft', 'cancelled'],
  validated_internal:   ['ready_for_dry_run', 'draft', 'cancelled'],
  ready_for_dry_run:    ['dry_run_executed', 'cancelled'],
  dry_run_executed:     ['ready_for_real', 'draft', 'cancelled'],
  ready_for_real:       ['submitted_real', 'cancelled'],   // BLOCKED by default in code
  submitted_real:       ['acknowledged', 'rejected', 'failed', 'cancelled'],
  acknowledged:         ['accepted', 'rejected', 'correction_required'],
  accepted:             [],  // terminal
  rejected:             ['corrected', 'cancelled'],
  correction_required:  ['corrected', 'cancelled'],
  corrected:            ['payload_generated'],
  failed:               ['draft'],
  cancelled:            [],  // terminal
};

// ─── Status metadata ────────────────────────────────────────────────────────

export interface StatusMeta {
  label: string;
  description: string;
  phase: 'preparatory' | 'official' | 'terminal';
  isOfficial: boolean;
  color: 'muted' | 'blue' | 'amber' | 'green' | 'red' | 'purple';
}

const STATUS_META: Record<PreparatorySubmissionStatus, StatusMeta> = {
  draft: {
    label: 'Borrador',
    description: 'Envío creado, sin payload generado',
    phase: 'preparatory', isOfficial: false, color: 'muted',
  },
  payload_generated: {
    label: 'Payload generado',
    description: 'Datos del ERP transformados a payload del organismo',
    phase: 'preparatory', isOfficial: false, color: 'blue',
  },
  validated_internal: {
    label: 'Validado internamente',
    description: 'Validación interna superada (formato, consistencia)',
    phase: 'preparatory', isOfficial: false, color: 'blue',
  },
  ready_for_dry_run: {
    label: 'Listo para dry-run',
    description: 'Preparado para simulación sin envío oficial',
    phase: 'preparatory', isOfficial: false, color: 'amber',
  },
  dry_run_executed: {
    label: 'Dry-run ejecutado',
    description: 'Simulación completada — NO es un envío oficial',
    phase: 'preparatory', isOfficial: false, color: 'green',
  },
  ready_for_real: {
    label: 'Listo para envío real',
    description: 'Marcado para envío oficial — requiere autorización explícita',
    phase: 'official', isOfficial: false, color: 'purple',
  },
  submitted_real: {
    label: 'Enviado (oficial)',
    description: 'Transmitido al organismo oficial',
    phase: 'official', isOfficial: true, color: 'green',
  },
  acknowledged: {
    label: 'Acuse recibido',
    description: 'Organismo acusó recibo del envío',
    phase: 'official', isOfficial: true, color: 'green',
  },
  accepted: {
    label: 'Aceptado',
    description: 'Envío aceptado por el organismo oficial',
    phase: 'terminal', isOfficial: true, color: 'green',
  },
  rejected: {
    label: 'Rechazado',
    description: 'Envío rechazado por el organismo',
    phase: 'terminal', isOfficial: true, color: 'red',
  },
  correction_required: {
    label: 'Corrección requerida',
    description: 'El organismo solicita correcciones',
    phase: 'official', isOfficial: true, color: 'amber',
  },
  corrected: {
    label: 'Corregido',
    description: 'Corrección aplicada, pendiente de regenerar payload',
    phase: 'preparatory', isOfficial: false, color: 'blue',
  },
  failed: {
    label: 'Fallido',
    description: 'Error técnico en el envío',
    phase: 'terminal', isOfficial: false, color: 'red',
  },
  cancelled: {
    label: 'Cancelado',
    description: 'Envío cancelado por el usuario',
    phase: 'terminal', isOfficial: false, color: 'muted',
  },
};

// ─── Domain metadata ────────────────────────────────────────────────────────

export interface DomainMeta {
  label: string;
  organism: string;
  description: string;
  icon: string;
  payloadFormat: string;
  requiresCertificate: boolean;
}

const DOMAIN_META: Record<SubmissionDomain, DomainMeta> = {
  TGSS: {
    label: 'TGSS / SILTRA',
    organism: 'Tesorería General de la Seguridad Social',
    description: 'Altas, bajas, variaciones, cotización',
    icon: 'Shield',
    payloadFormat: 'AFI/FAN',
    requiresCertificate: true,
  },
  CONTRATA: {
    label: 'Contrat@ / SEPE',
    organism: 'Servicio Público de Empleo Estatal',
    description: 'Comunicación de contratos',
    icon: 'FileText',
    payloadFormat: 'XML',
    requiresCertificate: true,
  },
  AEAT_111: {
    label: 'AEAT Modelo 111',
    organism: 'Agencia Estatal de Administración Tributaria',
    description: 'Retenciones e ingresos a cuenta trimestrales',
    icon: 'Calculator',
    payloadFormat: 'XML BOE',
    requiresCertificate: true,
  },
  AEAT_190: {
    label: 'AEAT Modelo 190',
    organism: 'Agencia Estatal de Administración Tributaria',
    description: 'Resumen anual de retenciones',
    icon: 'Calculator',
    payloadFormat: 'XML BOE',
    requiresCertificate: true,
  },
  CERTIFICA2: {
    label: 'Certific@2',
    organism: 'SEPE',
    description: 'Certificados de empresa',
    icon: 'Award',
    payloadFormat: 'XML',
    requiresCertificate: true,
  },
  DELTA: {
    label: 'Delt@',
    organism: 'MITES',
    description: 'Comunicación de accidentes de trabajo',
    icon: 'AlertTriangle',
    payloadFormat: 'XML',
    requiresCertificate: true,
  },
  generic: {
    label: 'Genérico',
    organism: 'N/A',
    description: 'Envío genérico sin dominio específico',
    icon: 'Send',
    payloadFormat: 'JSON',
    requiresCertificate: false,
  },
};

// ─── Validation result structure ────────────────────────────────────────────

export interface ValidationCheck {
  checkId: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface SubmissionValidationResult {
  /** Version for future compat */
  version: string;
  /** Domain-specific checks */
  checks: ValidationCheck[];
  /** Summary counts */
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** Overall pass/fail */
  passed: boolean;
  /** Readiness score 0-100 */
  score: number;
  /** Timestamp of validation */
  validatedAt: string;
}

// ─── Payload snapshot structure ─────────────────────────────────────────────

export interface PayloadSnapshot {
  /** Version for future compat */
  version: string;
  /** Domain */
  domain: SubmissionDomain;
  /** The actual payload data */
  data: Record<string, unknown>;
  /** SHA-like hash for integrity (optional, future) */
  hash?: string;
  /** Source info */
  source: {
    employeeId?: string;
    contractId?: string;
    periodId?: string;
    runId?: string;
  };
  /** Snapshot timestamp */
  snapshotAt: string;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Check if a status transition is valid */
export function isValidTransition(
  from: PreparatorySubmissionStatus,
  to: PreparatorySubmissionStatus,
): boolean {
  return PREPARATORY_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get valid next statuses from current */
export function getValidNextStatuses(current: PreparatorySubmissionStatus): PreparatorySubmissionStatus[] {
  return PREPARATORY_TRANSITIONS[current] || [];
}

/** Get status metadata */
export function getStatusMeta(status: PreparatorySubmissionStatus): StatusMeta {
  return STATUS_META[status] || STATUS_META.draft;
}

/** Get all status metadata */
export function getAllStatusMeta(): Record<PreparatorySubmissionStatus, StatusMeta> {
  return { ...STATUS_META };
}

/** Get domain metadata */
export function getDomainMeta(domain: SubmissionDomain): DomainMeta {
  return DOMAIN_META[domain] || DOMAIN_META.generic;
}

/** Get all domain metadata */
export function getAllDomainMeta(): Record<SubmissionDomain, DomainMeta> {
  return { ...DOMAIN_META };
}

/** Check if a status is in the preparatory phase (not official) */
export function isPreparatoryStatus(status: PreparatorySubmissionStatus): boolean {
  return STATUS_META[status]?.phase === 'preparatory';
}

/** Check if a status represents an official submission */
export function isOfficialStatus(status: PreparatorySubmissionStatus): boolean {
  return STATUS_META[status]?.isOfficial === true;
}

/** Check if transition to real submission is blocked (default: always blocked) */
export function isRealSubmissionBlocked(
  _mode: SubmissionMode,
  _options?: { adminOverride?: boolean },
): boolean {
  // V2-ES.8: Real submissions are ALWAYS blocked.
  // Future phases may check adminOverride, certificates, etc.
  return true;
}

/** Build an empty validation result */
export function createEmptyValidationResult(domain: SubmissionDomain): SubmissionValidationResult {
  return {
    version: '1.0',
    checks: [],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    passed: false,
    score: 0,
    validatedAt: new Date().toISOString(),
  };
}

/** Build a payload snapshot */
export function createPayloadSnapshot(
  domain: SubmissionDomain,
  data: Record<string, unknown>,
  source: PayloadSnapshot['source'],
): PayloadSnapshot {
  return {
    version: '1.0',
    domain,
    data,
    source,
    snapshotAt: new Date().toISOString(),
  };
}

/** Compute readiness status from validation result */
export function computeReadinessStatus(validation: SubmissionValidationResult | null): ReadinessStatus {
  if (!validation) return 'pending';
  if (validation.errorCount > 0) return 'blocked';
  if (validation.score < 70) return 'partial';
  if (validation.passed) return 'ready';
  return 'partial';
}

/** Get all submission domains (for dropdowns, filters) */
export function getSubmissionDomains(): SubmissionDomain[] {
  return ['TGSS', 'CONTRATA', 'AEAT_111', 'AEAT_190', 'CERTIFICA2', 'DELTA'];
}

/** Get all submission modes */
export function getSubmissionModes(): SubmissionMode[] {
  return ['manual', 'dry_run'];
  // 'real' intentionally excluded from default list
}
