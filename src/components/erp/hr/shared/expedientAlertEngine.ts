/**
 * expedientAlertEngine — Motor de alertas y severidad consolidada por expediente
 * V2-ES.4 Paso 2.2: Combina todas las señales documentales en alertas tipadas
 *
 * Señales evaluadas:
 * - Vencimientos (expired / expiring)
 * - Estado documental (rejected / pending_submission / draft)
 * - Checklist (obligatorios faltantes)
 * - Conciliación pendiente
 *
 * Niveles de severidad: critical > warning > info
 * No duplica lógica — reutiliza computeDocStatus y isReconcilableDocType.
 */

import { computeDocStatus } from './documentStatusEngine';
import { isReconcilableDocType } from './DocReconciliationBadge';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface ExpedientAlert {
  id: string;
  severity: AlertSeverity;
  category: 'expiry' | 'status' | 'checklist' | 'reconciliation';
  title: string;
  description: string;
  count: number;
  /** Related doc IDs (for future linking) */
  documentIds: string[];
}

export interface ExpedientAlertSummary {
  /** Overall severity (worst of all alerts) */
  overallSeverity: AlertSeverity | 'ok';
  /** All alerts sorted by severity */
  alerts: ExpedientAlert[];
  /** Counts */
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalAlerts: number;
  /** Quick flags */
  hasBlockers: boolean;
  needsAttention: boolean;
}

// ─── Minimal doc shape (avoid importing full EmployeeDocument) ──────────────

interface DocForAlerts {
  id: string;
  document_type: string;
  document_status?: string | null;
  expiry_date?: string | null;
  reconciled_with_payroll?: boolean;
  reconciled_with_social_security?: boolean;
  reconciled_with_tax?: boolean;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

/**
 * Computes all alerts for a set of documents + optional checklist context.
 * Pure function — no side effects, no fetch.
 */
export function computeExpedientAlerts(
  docs: DocForAlerts[],
  mandatoryMissing?: string[],
): ExpedientAlertSummary {
  const alerts: ExpedientAlert[] = [];
  const now = new Date();

  // ── 1. Expiry alerts ──────────────────────────────────────────────────────
  const expiredDocs: string[] = [];
  const expiringDocs: string[] = [];

  for (const doc of docs) {
    if (!doc.expiry_date) continue;
    const result = computeDocStatus(doc.document_type, doc.expiry_date, now);
    if (result.status === 'expired') expiredDocs.push(doc.id);
    else if (result.status === 'expiring') expiringDocs.push(doc.id);
  }

  if (expiredDocs.length > 0) {
    alerts.push({
      id: 'expired-docs',
      severity: 'critical',
      category: 'expiry',
      title: `${expiredDocs.length} documento${expiredDocs.length !== 1 ? 's' : ''} vencido${expiredDocs.length !== 1 ? 's' : ''}`,
      description: 'Documentos con fecha de vigencia expirada que requieren renovación inmediata.',
      count: expiredDocs.length,
      documentIds: expiredDocs,
    });
  }

  if (expiringDocs.length > 0) {
    alerts.push({
      id: 'expiring-docs',
      severity: 'warning',
      category: 'expiry',
      title: `${expiringDocs.length} documento${expiringDocs.length !== 1 ? 's' : ''} próximo${expiringDocs.length !== 1 ? 's' : ''} a vencer`,
      description: 'Documentos que vencerán pronto y deben renovarse antes de la fecha límite.',
      count: expiringDocs.length,
      documentIds: expiringDocs,
    });
  }

  // ── 2. Status alerts ──────────────────────────────────────────────────────
  const rejectedDocs = docs.filter(d => (d.document_status ?? 'draft') === 'rejected');
  const pendingSubmission = docs.filter(d => (d.document_status ?? 'draft') === 'pending_submission');
  const draftDocs = docs.filter(d => (d.document_status ?? 'draft') === 'draft');

  if (rejectedDocs.length > 0) {
    alerts.push({
      id: 'rejected-docs',
      severity: 'critical',
      category: 'status',
      title: `${rejectedDocs.length} documento${rejectedDocs.length !== 1 ? 's' : ''} rechazado${rejectedDocs.length !== 1 ? 's' : ''}`,
      description: 'Documentos que han sido rechazados y requieren corrección y reenvío urgente.',
      count: rejectedDocs.length,
      documentIds: rejectedDocs.map(d => d.id),
    });
  }

  if (pendingSubmission.length > 0) {
    alerts.push({
      id: 'pending-submission-docs',
      severity: 'warning',
      category: 'status',
      title: `${pendingSubmission.length} pendiente${pendingSubmission.length !== 1 ? 's' : ''} de envío`,
      description: 'Documentos listos para presentación oficial que aún no se han enviado.',
      count: pendingSubmission.length,
      documentIds: pendingSubmission.map(d => d.id),
    });
  }

  if (draftDocs.length > 0) {
    alerts.push({
      id: 'draft-docs',
      severity: 'info',
      category: 'status',
      title: `${draftDocs.length} borrador${draftDocs.length !== 1 ? 'es' : ''}`,
      description: 'Documentos en fase de borrador pendientes de revisión y finalización.',
      count: draftDocs.length,
      documentIds: draftDocs.map(d => d.id),
    });
  }

  // ── 3. Checklist alerts ───────────────────────────────────────────────────
  if (mandatoryMissing && mandatoryMissing.length > 0) {
    alerts.push({
      id: 'mandatory-missing',
      severity: 'critical',
      category: 'checklist',
      title: `${mandatoryMissing.length} obligatorio${mandatoryMissing.length !== 1 ? 's' : ''} faltante${mandatoryMissing.length !== 1 ? 's' : ''}`,
      description: `Documentos requeridos no presentes en el expediente: ${mandatoryMissing.slice(0, 3).join(', ')}${mandatoryMissing.length > 3 ? '...' : ''}.`,
      count: mandatoryMissing.length,
      documentIds: [],
    });
  }

  // ── 4. Reconciliation alerts ──────────────────────────────────────────────
  const unreconciled = docs.filter(d => {
    const status = d.document_status ?? 'draft';
    if (status !== 'accepted' && status !== 'closed') return false;
    if (!isReconcilableDocType(d.document_type)) return false;
    return !(d.reconciled_with_payroll || d.reconciled_with_social_security || d.reconciled_with_tax);
  });

  if (unreconciled.length > 0) {
    alerts.push({
      id: 'unreconciled-docs',
      severity: 'info',
      category: 'reconciliation',
      title: `${unreconciled.length} sin conciliar`,
      description: 'Documentos aceptados de tipo contable que no han sido conciliados con nómina, seguridad social o fiscal.',
      count: unreconciled.length,
      documentIds: unreconciled.map(d => d.id),
    });
  }

  // ── Sort: critical → warning → info ───────────────────────────────────────
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  const overallSeverity: AlertSeverity | 'ok' =
    criticalCount > 0 ? 'critical' :
    warningCount > 0 ? 'warning' :
    infoCount > 0 ? 'info' : 'ok';

  return {
    overallSeverity,
    alerts,
    criticalCount,
    warningCount,
    infoCount,
    totalAlerts: alerts.length,
    hasBlockers: criticalCount > 0,
    needsAttention: criticalCount > 0 || warningCount > 0,
  };
}
