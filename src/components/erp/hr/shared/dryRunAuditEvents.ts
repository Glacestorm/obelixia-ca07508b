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
  | 'dry_run_real_blocked';

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
