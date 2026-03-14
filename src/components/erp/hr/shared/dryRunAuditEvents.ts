/**
 * dryRunAuditEvents — V2-ES.8 Tramo 2
 * Granular audit event definitions for dry-run lifecycle.
 * Pure types and helper functions. No side effects.
 */
import { logAuditEvent, type AuditCategory, type AuditSeverity } from '@/lib/security/auditLogger';

// ─── Dry-run audit action types ─────────────────────────────────────────────

export type DryRunAuditAction =
  | 'dry_run_created'
  | 'dry_run_payload_generated'
  | 'dry_run_validated'
  | 'dry_run_validation_failed'
  | 'dry_run_ready'
  | 'dry_run_executed'
  | 'dry_run_persisted'
  | 'dry_run_evidence_linked'
  | 'dry_run_evidence_removed'
  | 'dry_run_reviewed'
  | 'dry_run_payload_inspected'
  | 'dry_run_cancelled'
  | 'dry_run_reset'
  | 'dry_run_real_blocked'
  // V2-ES.8 T4: Hardening events
  | 'dry_run_retried'
  | 'dry_run_superseded'
  | 'dry_run_payload_guard_blocked'
  | 'dry_run_concurrency_blocked'
  // V2-ES.8 T5: Pre-real approval events
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'approval_correction_requested'
  | 'approval_cancelled'
  // V2-ES.8 T5 P5: Security audit events
  | 'approval_ineligible_attempt'
  | 'approval_real_blocked';

const ACTION_SEVERITY: Record<DryRunAuditAction, AuditSeverity> = {
  dry_run_created: 'info',
  dry_run_payload_generated: 'info',
  dry_run_validated: 'info',
  dry_run_validation_failed: 'warning',
  dry_run_ready: 'info',
  dry_run_executed: 'info',
  dry_run_persisted: 'info',
  dry_run_evidence_linked: 'info',
  dry_run_evidence_removed: 'warning',
  dry_run_reviewed: 'info',
  dry_run_payload_inspected: 'info',
  dry_run_cancelled: 'warning',
  dry_run_reset: 'warning',
  dry_run_real_blocked: 'critical',
  // V2-ES.8 T4
  dry_run_retried: 'warning',
  dry_run_superseded: 'info',
  dry_run_payload_guard_blocked: 'warning',
  dry_run_concurrency_blocked: 'warning',
  // V2-ES.8 T5
  approval_requested: 'info',
  approval_granted: 'info',
  approval_rejected: 'warning',
  approval_correction_requested: 'warning',
  approval_cancelled: 'warning',
  // V2-ES.8 T5 P5
  approval_ineligible_attempt: 'warning',
  approval_real_blocked: 'critical',
};

const ACTION_LABELS: Record<DryRunAuditAction, string> = {
  dry_run_created: 'Envío preparatorio creado',
  dry_run_payload_generated: 'Payload generado',
  dry_run_validated: 'Validación interna superada',
  dry_run_validation_failed: 'Validación interna fallida',
  dry_run_ready: 'Listo para dry-run',
  dry_run_executed: 'Dry-run ejecutado (simulación)',
  dry_run_persisted: 'Resultado dry-run persistido',
  dry_run_evidence_linked: 'Evidencia vinculada a dry-run',
  dry_run_evidence_removed: 'Evidencia desvinculada de dry-run',
  dry_run_reviewed: 'Dry-run revisado por usuario',
  dry_run_payload_inspected: 'Payload inspeccionado',
  dry_run_cancelled: 'Envío preparatorio cancelado',
  dry_run_reset: 'Envío preparatorio reseteado a borrador',
  dry_run_real_blocked: 'Intento de envío real bloqueado',
  // V2-ES.8 T4
  dry_run_retried: 'Dry-run reintentado',
  dry_run_superseded: 'Dry-run anterior superado por nueva ejecución',
  dry_run_payload_guard_blocked: 'Ejecución bloqueada por payload ausente',
  dry_run_concurrency_blocked: 'Ejecución bloqueada por concurrencia',
  // V2-ES.8 T5
  approval_requested: 'Solicitud de aprobación pre-real enviada',
  approval_granted: 'Aprobación pre-real concedida',
  approval_rejected: 'Aprobación pre-real rechazada',
  approval_correction_requested: 'Correcciones solicitadas por aprobador',
  approval_cancelled: 'Solicitud de aprobación cancelada',
};

// ─── Public API ─────────────────────────────────────────────────────────────

export interface DryRunAuditContext {
  submissionId?: string;
  dryRunId?: string;
  domain?: string;
  submissionType?: string;
  executionNumber?: number;
  score?: number;
  status?: string;
  extra?: Record<string, unknown>;
}

/**
 * Log a granular dry-run audit event.
 */
export async function logDryRunEvent(
  action: DryRunAuditAction,
  ctx: DryRunAuditContext,
): Promise<void> {
  await logAuditEvent({
    action,
    tableName: 'erp_hr_dry_run_results',
    recordId: ctx.dryRunId || ctx.submissionId,
    category: 'compliance' as AuditCategory,
    severity: ACTION_SEVERITY[action],
    newData: {
      label: ACTION_LABELS[action],
      domain: ctx.domain,
      submission_type: ctx.submissionType,
      execution_number: ctx.executionNumber,
      score: ctx.score,
      status: ctx.status,
      timestamp: new Date().toISOString(),
      ...ctx.extra,
    },
  });
}

/**
 * Get human-readable label for a dry-run audit action.
 */
export function getDryRunAuditLabel(action: DryRunAuditAction): string {
  return ACTION_LABELS[action] || action;
}

/**
 * Get all dry-run audit action types (for filtering in audit trail).
 */
export function getDryRunAuditActions(): DryRunAuditAction[] {
  return Object.keys(ACTION_SEVERITY) as DryRunAuditAction[];
}
