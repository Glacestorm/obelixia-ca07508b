/**
 * institutionalSubmissionEngine.ts — V2-RRHH-PINST
 * Pure logic engine for institutional submission lifecycle.
 * Manages the state machine: generated → signed → submitted → accepted/rejected → reconciled
 *
 * No side effects. Deterministic functions only.
 */

// ── Types ──

export type InstitutionalStatus =
  | 'generated'
  | 'validated_internal'
  | 'pending_signature'
  | 'signed'
  | 'queued_for_submission'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'partially_accepted'
  | 'reconciled'
  | 'requires_correction'
  | 'cancelled';

export type ReceiptType =
  | 'acknowledgment'
  | 'acceptance'
  | 'rejection'
  | 'partial_acceptance'
  | 'processing'
  | 'error'
  | 'correction_request';

export type ReconciliationStatus = 'pending' | 'matched' | 'discrepancy' | 'corrected';

export type TargetOrganism = 'tgss' | 'aeat' | 'sepe' | 'contrata';

export interface InstitutionalStatusMeta {
  label: string;
  color: string;
  description: string;
  isTerminal: boolean;
  requiresAction: boolean;
}

export interface StatusTransitionEntry {
  from: InstitutionalStatus;
  to: InstitutionalStatus;
  action: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
  receiptRef?: string;
}

// ── State Machine ──

const INSTITUTIONAL_TRANSITIONS: Record<InstitutionalStatus, InstitutionalStatus[]> = {
  generated:            ['validated_internal', 'cancelled'],
  validated_internal:   ['pending_signature', 'cancelled'],
  pending_signature:    ['signed', 'cancelled'],
  signed:               ['queued_for_submission', 'cancelled'],
  queued_for_submission:['submitted', 'cancelled'],
  submitted:            ['accepted', 'rejected', 'partially_accepted', 'requires_correction'],
  accepted:             ['reconciled'],
  rejected:             ['requires_correction', 'generated'],
  partially_accepted:   ['requires_correction', 'reconciled'],
  reconciled:           [], // Terminal
  requires_correction:  ['generated', 'validated_internal'],
  cancelled:            ['generated'],
};

export function canTransitionInstitutional(from: InstitutionalStatus, to: InstitutionalStatus): boolean {
  return INSTITUTIONAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidInstitutionalTransitions(from: InstitutionalStatus): InstitutionalStatus[] {
  return INSTITUTIONAL_TRANSITIONS[from] || [];
}

// ── Status Configuration ──

export const INSTITUTIONAL_STATUS_CONFIG: Record<InstitutionalStatus, InstitutionalStatusMeta> = {
  generated: {
    label: 'Generado',
    color: 'bg-muted text-muted-foreground',
    description: 'Artefacto generado internamente',
    isTerminal: false,
    requiresAction: true,
  },
  validated_internal: {
    label: 'Validado internamente',
    color: 'bg-blue-500/10 text-blue-700',
    description: 'Validaciones internas superadas',
    isTerminal: false,
    requiresAction: true,
  },
  pending_signature: {
    label: 'Pendiente de firma',
    color: 'bg-amber-500/10 text-amber-700',
    description: 'Requiere firma digital con certificado válido',
    isTerminal: false,
    requiresAction: true,
  },
  signed: {
    label: 'Firmado',
    color: 'bg-indigo-500/10 text-indigo-700',
    description: 'Firmado digitalmente — listo para envío',
    isTerminal: false,
    requiresAction: true,
  },
  queued_for_submission: {
    label: 'En cola de envío',
    color: 'bg-purple-500/10 text-purple-700',
    description: 'Encolado para envío al organismo',
    isTerminal: false,
    requiresAction: false,
  },
  submitted: {
    label: 'Enviado',
    color: 'bg-cyan-500/10 text-cyan-700',
    description: 'Enviado al organismo — pendiente de respuesta',
    isTerminal: false,
    requiresAction: false,
  },
  accepted: {
    label: 'Aceptado',
    color: 'bg-emerald-500/10 text-emerald-700',
    description: 'Aceptado por el organismo oficial',
    isTerminal: false,
    requiresAction: false,
  },
  rejected: {
    label: 'Rechazado',
    color: 'bg-destructive/10 text-destructive',
    description: 'Rechazado por el organismo — requiere corrección',
    isTerminal: false,
    requiresAction: true,
  },
  partially_accepted: {
    label: 'Parcialmente aceptado',
    color: 'bg-amber-500/10 text-amber-700',
    description: 'Aceptado parcialmente — algunos registros con errores',
    isTerminal: false,
    requiresAction: true,
  },
  reconciled: {
    label: 'Reconciliado',
    color: 'bg-emerald-600/10 text-emerald-800',
    description: 'Artefacto reconciliado con respuesta oficial',
    isTerminal: true,
    requiresAction: false,
  },
  requires_correction: {
    label: 'Requiere corrección',
    color: 'bg-orange-500/10 text-orange-700',
    description: 'Requiere corrección antes de re-envío',
    isTerminal: false,
    requiresAction: true,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-muted text-muted-foreground line-through',
    description: 'Proceso institucional cancelado',
    isTerminal: true,
    requiresAction: false,
  },
};

// ── Receipt → Status mapping ──

export function mapReceiptToStatus(receiptType: ReceiptType): InstitutionalStatus | null {
  const mapping: Record<ReceiptType, InstitutionalStatus> = {
    acknowledgment: 'submitted',
    acceptance: 'accepted',
    rejection: 'rejected',
    partial_acceptance: 'partially_accepted',
    processing: 'submitted',
    error: 'requires_correction',
    correction_request: 'requires_correction',
  };
  return mapping[receiptType] ?? null;
}

// ── Organism labels ──

export const ORGANISM_LABELS: Record<string, string> = {
  tgss: 'Tesorería General de la Seguridad Social',
  aeat: 'Agencia Estatal de Administración Tributaria',
  sepe: 'Servicio Público de Empleo Estatal',
  contrata: 'Servicio Contrat@',
};

// ── Build status transition entry ──

export function buildStatusTransition(
  from: InstitutionalStatus,
  to: InstitutionalStatus,
  action: string,
  userId: string,
  extra?: { notes?: string; receiptRef?: string },
): StatusTransitionEntry {
  return {
    from,
    to,
    action,
    performedBy: userId,
    performedAt: new Date().toISOString(),
    ...extra,
  };
}

// ── Reconciliation check ──

export interface ReconciliationCheckResult {
  status: ReconciliationStatus;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    artifactValue: unknown;
    receiptValue: unknown;
    detail: string;
  }>;
  score: number;
  computedAt: string;
}

export function reconcileArtifactWithReceipt(
  artifactPayload: Record<string, unknown>,
  receiptPayload: Record<string, unknown> | null,
): ReconciliationCheckResult {
  const checks: ReconciliationCheckResult['checks'] = [];

  if (!receiptPayload) {
    return {
      status: 'pending',
      checks: [],
      score: 0,
      computedAt: new Date().toISOString(),
    };
  }

  // Check reference matching
  const artifactRef = artifactPayload.id ?? artifactPayload.artifact_id;
  const receiptRef = receiptPayload.reference_code ?? receiptPayload.artifactRef;
  checks.push({
    id: 'reference_match',
    label: 'Referencia coincidente',
    passed: !!artifactRef && !!receiptRef,
    artifactValue: artifactRef,
    receiptValue: receiptRef,
    detail: artifactRef && receiptRef ? 'Referencias encontradas' : 'Sin referencia cruzada',
  });

  // Check amounts if available
  const artifactAmount = Number(artifactPayload.totalRetenciones ?? artifactPayload.totalLiquidacion ?? 0);
  const receiptAmount = Number(receiptPayload.confirmedAmount ?? receiptPayload.amount ?? 0);
  if (artifactAmount > 0 || receiptAmount > 0) {
    const diff = Math.abs(artifactAmount - receiptAmount);
    checks.push({
      id: 'amount_match',
      label: 'Importe coincidente',
      passed: diff < 1,
      artifactValue: artifactAmount,
      receiptValue: receiptAmount,
      detail: `Artefacto: ${artifactAmount.toFixed(2)}€, Acuse: ${receiptAmount.toFixed(2)}€ (dif: ${diff.toFixed(2)}€)`,
    });
  }

  const passed = checks.filter(c => c.passed).length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;
  const hasFailures = checks.some(c => !c.passed);

  return {
    status: hasFailures ? 'discrepancy' : 'matched',
    checks,
    score,
    computedAt: new Date().toISOString(),
  };
}

// ── Signature readiness check ──

export interface SignatureReadiness {
  ready: boolean;
  certificateAvailable: boolean;
  certificateValid: boolean;
  artifactValidated: boolean;
  blockers: string[];
}

export function checkSignatureReadiness(params: {
  hasCertificate: boolean;
  certificateExpired: boolean;
  artifactIsValid: boolean;
  artifactStatus: string;
}): SignatureReadiness {
  const blockers: string[] = [];

  if (!params.hasCertificate) blockers.push('No hay certificado digital activo');
  if (params.certificateExpired) blockers.push('El certificado digital ha expirado');
  if (!params.artifactIsValid) blockers.push('El artefacto tiene errores de validación');
  if (params.artifactStatus !== 'validated_internal' && params.artifactStatus !== 'generated') {
    blockers.push(`Estado actual (${params.artifactStatus}) no permite firma`);
  }

  return {
    ready: blockers.length === 0,
    certificateAvailable: params.hasCertificate,
    certificateValid: params.hasCertificate && !params.certificateExpired,
    artifactValidated: params.artifactIsValid,
    blockers,
  };
}

// ── Get chain completeness ──

export interface InstitutionalChainStatus {
  generated: boolean;
  validated: boolean;
  signed: boolean;
  submitted: boolean;
  responded: boolean;
  reconciled: boolean;
  completeness: number;
  currentPhase: string;
}

export function getInstitutionalChainStatus(status: InstitutionalStatus): InstitutionalChainStatus {
  const phases = ['generated', 'validated_internal', 'signed', 'submitted', 'accepted', 'reconciled'];
  const currentIdx = phases.indexOf(status);
  const effectiveIdx = currentIdx >= 0 ? currentIdx : 0;

  return {
    generated: effectiveIdx >= 0,
    validated: effectiveIdx >= 1,
    signed: effectiveIdx >= 2,
    submitted: effectiveIdx >= 3,
    responded: effectiveIdx >= 4,
    reconciled: effectiveIdx >= 5,
    completeness: Math.round(((effectiveIdx + 1) / phases.length) * 100),
    currentPhase: INSTITUTIONAL_STATUS_CONFIG[status]?.label ?? status,
  };
}
