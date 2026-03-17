/**
 * institutionalSubmissionEngine.ts — V2-RRHH-PINST + PINST-B1
 * Pure logic engine for institutional submission lifecycle.
 * Manages the state machine: generated → signed → submitted → accepted/rejected → reconciled
 *
 * PINST-B1: Added transition guards with content validation.
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
  /** PINST-B1: Whether this status can be reached manually or requires automated backing */
  manualAllowed: boolean;
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

// ── PINST-B1: Transition Content Guards ──

export interface TransitionGuardContext {
  hasPayload: boolean;
  hasSignature: boolean;
  hasReceipt: boolean;
  hasReconciliationData: boolean;
  artifactIsValid: boolean;
  hasCertificate: boolean;
}

export interface TransitionGuardResult {
  allowed: boolean;
  blockers: string[];
}

/**
 * PINST-B1: Validates that a transition has the required content/evidence.
 * States beyond 'validated_internal' require progressively stronger backing.
 */
export function validateTransitionContent(
  from: InstitutionalStatus,
  to: InstitutionalStatus,
  context: TransitionGuardContext,
): TransitionGuardResult {
  const blockers: string[] = [];

  // Basic state machine check
  if (!canTransitionInstitutional(from, to)) {
    return { allowed: false, blockers: [`Transición ${from} → ${to} no permitida por máquina de estados`] };
  }

  // Content guards by target state
  switch (to) {
    case 'validated_internal':
      if (!context.artifactIsValid) {
        blockers.push('El artefacto tiene errores de validación — no puede marcarse como validado internamente');
      }
      break;

    case 'pending_signature':
      if (!context.artifactIsValid) {
        blockers.push('El artefacto debe estar validado antes de solicitar firma');
      }
      if (!context.hasCertificate) {
        blockers.push('No hay certificado digital configurado — no se puede solicitar firma');
      }
      break;

    case 'signed':
      if (!context.hasSignature) {
        blockers.push('No hay operación de firma registrada — no se puede marcar como firmado');
      }
      break;

    case 'queued_for_submission':
      if (!context.hasSignature) {
        blockers.push('El artefacto debe estar firmado antes de encolar para envío');
      }
      if (!context.hasPayload) {
        blockers.push('No hay payload de envío preparado');
      }
      break;

    case 'submitted':
      // PINST-B1: This is a strong state — requires real submission action
      // Currently blocked since no real connector exists
      blockers.push('El envío real requiere conector activo con el organismo oficial — funcionalidad no disponible');
      break;

    case 'accepted':
    case 'rejected':
    case 'partially_accepted':
      if (!context.hasReceipt) {
        blockers.push(`Estado "${to}" requiere acuse/respuesta oficial registrado`);
      }
      break;

    case 'reconciled':
      if (!context.hasReconciliationData) {
        blockers.push('La reconciliación requiere datos de comparación artefacto vs respuesta oficial');
      }
      if (!context.hasReceipt) {
        blockers.push('No se puede reconciliar sin acuse/respuesta oficial');
      }
      break;

    case 'cancelled':
    case 'generated':
    case 'requires_correction':
      // Always allowed if state machine allows
      break;
  }

  return { allowed: blockers.length === 0, blockers };
}

/**
 * PINST-B1: Returns which transitions are actually available given current content.
 * Filters out transitions that would be blocked by content guards.
 */
export function getAvailableTransitions(
  currentStatus: InstitutionalStatus,
  context: TransitionGuardContext,
): Array<{ target: InstitutionalStatus; allowed: boolean; blockers: string[] }> {
  const possibleTargets = getValidInstitutionalTransitions(currentStatus);
  return possibleTargets.map(target => {
    const guard = validateTransitionContent(currentStatus, target, context);
    return { target, allowed: guard.allowed, blockers: guard.blockers };
  });
}

// ── Status Configuration ──

export const INSTITUTIONAL_STATUS_CONFIG: Record<InstitutionalStatus, InstitutionalStatusMeta> = {
  generated: {
    label: 'Generado',
    color: 'bg-muted text-muted-foreground',
    description: 'Artefacto generado internamente',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: true,
  },
  validated_internal: {
    label: 'Validado internamente',
    color: 'bg-blue-500/10 text-blue-700',
    description: 'Validaciones internas superadas',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: true,
  },
  pending_signature: {
    label: 'Pendiente de firma',
    color: 'bg-amber-500/10 text-amber-700',
    description: 'Requiere firma digital con certificado válido',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: true,
  },
  signed: {
    label: 'Firmado',
    color: 'bg-indigo-500/10 text-indigo-700',
    description: 'Firmado digitalmente — listo para envío',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: false, // Requires signature operation
  },
  queued_for_submission: {
    label: 'En cola de envío',
    color: 'bg-purple-500/10 text-purple-700',
    description: 'Encolado para envío al organismo',
    isTerminal: false,
    requiresAction: false,
    manualAllowed: false, // Requires payload
  },
  submitted: {
    label: 'Enviado',
    color: 'bg-cyan-500/10 text-cyan-700',
    description: 'Enviado al organismo — pendiente de respuesta',
    isTerminal: false,
    requiresAction: false,
    manualAllowed: false, // Requires real connector
  },
  accepted: {
    label: 'Aceptado',
    color: 'bg-emerald-500/10 text-emerald-700',
    description: 'Aceptado por el organismo oficial',
    isTerminal: false,
    requiresAction: false,
    manualAllowed: false, // Requires receipt
  },
  rejected: {
    label: 'Rechazado',
    color: 'bg-destructive/10 text-destructive',
    description: 'Rechazado por el organismo — requiere corrección',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: false, // Requires receipt
  },
  partially_accepted: {
    label: 'Parcialmente aceptado',
    color: 'bg-amber-500/10 text-amber-700',
    description: 'Aceptado parcialmente — algunos registros con errores',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: false, // Requires receipt
  },
  reconciled: {
    label: 'Reconciliado',
    color: 'bg-emerald-600/10 text-emerald-800',
    description: 'Artefacto reconciliado con respuesta oficial',
    isTerminal: true,
    requiresAction: false,
    manualAllowed: false, // Requires reconciliation data
  },
  requires_correction: {
    label: 'Requiere corrección',
    color: 'bg-orange-500/10 text-orange-700',
    description: 'Requiere corrección antes de re-envío',
    isTerminal: false,
    requiresAction: true,
    manualAllowed: true,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-muted text-muted-foreground line-through',
    description: 'Proceso institucional cancelado',
    isTerminal: true,
    requiresAction: false,
    manualAllowed: true,
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
