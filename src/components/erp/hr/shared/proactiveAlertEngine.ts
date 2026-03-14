/**
 * proactiveAlertEngine — V2-ES.8 Tramo 6 Paso 1
 * Motor base de alertas proactivas para integraciones oficiales.
 *
 * Evalúa señales de:
 * - Readiness por conector (caída o estancamiento)
 * - Plazos regulatorios (vencidos, urgentes, próximos)
 * - Certificados digitales (expiración)
 * - Dry-runs (fallidos o degradados)
 * - Approvals (pendientes, expirados)
 *
 * Principios:
 * - Pure functions — sin side effects ni fetch
 * - Deduplicación por clave compuesta (domain + category + entityRef)
 * - Severidad estricta: critical > high > warning > info
 * - alerta ≠ bloqueo, alerta ≠ envío real, recordatorio ≠ aprobación
 *
 * DISCLAIMER: Las alertas son orientativas para gestión interna.
 * NO sustituyen el criterio profesional ni constituyen asesoría legal.
 */

// ─── Alert Severity & Category ──────────────────────────────────────────────

export type ProactiveAlertSeverity = 'critical' | 'high' | 'warning' | 'info';

export type ProactiveAlertCategory =
  | 'readiness_drop'
  | 'deadline_overdue'
  | 'deadline_urgent'
  | 'deadline_upcoming'
  | 'certificate_expired'
  | 'certificate_expiring'
  | 'dryrun_failed'
  | 'dryrun_degraded'
  | 'approval_pending'
  | 'approval_expired';

export type ProactiveAlertDomain =
  | 'tgss_siltra'
  | 'contrata_sepe'
  | 'aeat'
  | 'certificates'
  | 'approvals'
  | 'general';

// ─── Core Alert Type ────────────────────────────────────────────────────────

export interface ProactiveAlert {
  /** Unique deduplication key: `${domain}::${category}::${entityRef}` */
  deduplicationKey: string;
  /** Alert domain */
  domain: ProactiveAlertDomain;
  /** Alert category */
  category: ProactiveAlertCategory;
  /** Severity level */
  severity: ProactiveAlertSeverity;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  message: string;
  /** Optional entity reference (connector ID, submission ID, etc.) */
  entityRef?: string;
  /** Priority (lower = higher priority, 1-100) */
  priority: number;
  /** Suggested action URL within the app */
  actionUrl?: string;
  /** Action button label */
  actionLabel?: string;
  /** Structured metadata for persistence */
  metadata: Record<string, unknown>;
  /** Source system identifier for notifications table */
  sourceSystem: 'hr_integrations';
  /** Event type for notifications table */
  eventType: string;
  /** Timestamp of evaluation */
  evaluatedAt: Date;
  /** Optional expiration (auto-dismiss) */
  expiresAt?: Date;
}

export interface ProactiveAlertSummary {
  alerts: ProactiveAlert[];
  criticalCount: number;
  highCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
  overallSeverity: ProactiveAlertSeverity | 'ok';
  /** Alerts grouped by domain */
  byDomain: Record<ProactiveAlertDomain, ProactiveAlert[]>;
  /** Deduplication keys for comparison with persisted alerts */
  deduplicationKeys: Set<string>;
}

// ─── Severity helpers ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<ProactiveAlertSeverity, number> = {
  critical: 0,
  high: 1,
  warning: 2,
  info: 3,
};

const SEVERITY_PRIORITY: Record<ProactiveAlertSeverity, number> = {
  critical: 10,
  high: 25,
  warning: 50,
  info: 75,
};

export function compareSeverity(a: ProactiveAlertSeverity, b: ProactiveAlertSeverity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

export function worstSeverity(
  severities: ProactiveAlertSeverity[],
): ProactiveAlertSeverity | 'ok' {
  if (severities.length === 0) return 'ok';
  return severities.reduce((worst, s) =>
    SEVERITY_ORDER[s] < SEVERITY_ORDER[worst] ? s : worst,
  );
}

// ─── Deduplication key builder ──────────────────────────────────────────────

export function buildDeduplicationKey(
  domain: ProactiveAlertDomain,
  category: ProactiveAlertCategory,
  entityRef?: string,
): string {
  return `${domain}::${category}::${entityRef ?? 'global'}`;
}

// ─── Alert factory ──────────────────────────────────────────────────────────

function createAlert(
  params: Omit<ProactiveAlert, 'deduplicationKey' | 'priority' | 'sourceSystem' | 'evaluatedAt'> & {
    priorityOverride?: number;
  },
): ProactiveAlert {
  return {
    ...params,
    deduplicationKey: buildDeduplicationKey(params.domain, params.category, params.entityRef),
    priority: params.priorityOverride ?? SEVERITY_PRIORITY[params.severity],
    sourceSystem: 'hr_integrations',
    evaluatedAt: new Date(),
  };
}

// ─── Input shapes (minimal, no heavy imports) ───────────────────────────────

export interface ReadinessSignal {
  connectorId: string;
  label: string;
  level: string; // ReadinessLevel
  percent: number;
  blockerCount: number;
  warningCount: number;
}

export interface DeadlineSignal {
  id: string;
  domain: string;
  label: string;
  urgency: string; // DeadlineUrgency
  daysRemaining: number;
  referencePeriod: string;
}

export interface CertificateSignal {
  id: string;
  name: string;
  expiresAt: Date | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
}

export interface DryRunSignal {
  id: string;
  domain: string;
  status: string; // PreparatorySubmissionStatus
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
  createdAt: Date;
}

export interface ApprovalSignal {
  id: string;
  domain: string;
  status: string; // ApprovalStatus
  requestedAt: Date;
  expiresAt: Date | null;
  isExpired: boolean;
}

// ─── Evaluators ─────────────────────────────────────────────────────────────

/**
 * Evaluate readiness signals → alerts for connectors that dropped or are blocked
 */
export function evaluateReadinessAlerts(signals: ReadinessSignal[]): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  for (const s of signals) {
    if (s.level === 'not_ready' && s.blockerCount > 0) {
      alerts.push(createAlert({
        domain: mapConnectorDomain(s.connectorId),
        category: 'readiness_drop',
        severity: 'high',
        title: `${s.label}: no preparado`,
        message: `El conector ${s.label} tiene ${s.blockerCount} bloqueante${s.blockerCount !== 1 ? 's' : ''} que impiden avanzar. Readiness: ${s.percent}%.`,
        entityRef: s.connectorId,
        eventType: 'readiness_not_ready',
        actionLabel: 'Ver readiness',
        metadata: { connectorId: s.connectorId, level: s.level, percent: s.percent, blockers: s.blockerCount },
      }));
    } else if (s.level === 'partial' && s.warningCount > 0) {
      alerts.push(createAlert({
        domain: mapConnectorDomain(s.connectorId),
        category: 'readiness_drop',
        severity: 'warning',
        title: `${s.label}: readiness parcial`,
        message: `El conector ${s.label} tiene ${s.warningCount} advertencia${s.warningCount !== 1 ? 's' : ''}. Readiness: ${s.percent}%.`,
        entityRef: s.connectorId,
        eventType: 'readiness_partial',
        actionLabel: 'Ver readiness',
        metadata: { connectorId: s.connectorId, level: s.level, percent: s.percent, warnings: s.warningCount },
      }));
    }
  }

  return alerts;
}

/**
 * Evaluate regulatory deadline signals → alerts
 */
export function evaluateDeadlineAlerts(signals: DeadlineSignal[]): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  for (const s of signals) {
    if (s.urgency === 'overdue') {
      alerts.push(createAlert({
        domain: mapDeadlineDomain(s.domain),
        category: 'deadline_overdue',
        severity: 'critical',
        title: `Plazo vencido: ${s.label}`,
        message: `El plazo regulatorio \"${s.label}\" (${s.referencePeriod}) ha vencido hace ${Math.abs(s.daysRemaining)} día${Math.abs(s.daysRemaining) !== 1 ? 's' : ''}. Este aviso es orientativo.`,
        entityRef: s.id,
        eventType: 'deadline_overdue',
        actionLabel: 'Ver calendario',
        metadata: { deadlineId: s.id, domain: s.domain, daysRemaining: s.daysRemaining, period: s.referencePeriod },
      }));
    } else if (s.urgency === 'urgent') {
      alerts.push(createAlert({
        domain: mapDeadlineDomain(s.domain),
        category: 'deadline_urgent',
        severity: 'high',
        title: `Plazo urgente: ${s.label}`,
        message: `Quedan ${s.daysRemaining} día${s.daysRemaining !== 1 ? 's' : ''} para el plazo \"${s.label}\" (${s.referencePeriod}).`,
        entityRef: s.id,
        eventType: 'deadline_urgent',
        actionLabel: 'Ver calendario',
        metadata: { deadlineId: s.id, domain: s.domain, daysRemaining: s.daysRemaining, period: s.referencePeriod },
      }));
    } else if (s.urgency === 'upcoming') {
      alerts.push(createAlert({
        domain: mapDeadlineDomain(s.domain),
        category: 'deadline_upcoming',
        severity: 'info',
        title: `Plazo próximo: ${s.label}`,
        message: `El plazo \"${s.label}\" (${s.referencePeriod}) vence en ${s.daysRemaining} días.`,
        entityRef: s.id,
        eventType: 'deadline_upcoming',
        actionLabel: 'Ver calendario',
        metadata: { deadlineId: s.id, domain: s.domain, daysRemaining: s.daysRemaining, period: s.referencePeriod },
      }));
    }
  }

  return alerts;
}

/**
 * Evaluate certificate signals → alerts for expiring/expired certs
 */
export function evaluateCertificateAlerts(signals: CertificateSignal[]): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  for (const s of signals) {
    if (s.isExpired) {
      alerts.push(createAlert({
        domain: 'certificates',
        category: 'certificate_expired',
        severity: 'critical',
        title: `Certificado expirado: ${s.name}`,
        message: `El certificado \"${s.name}\" ha expirado. Las operaciones que lo requieran no podrán ejecutarse.`,
        entityRef: s.id,
        eventType: 'certificate_expired',
        actionLabel: 'Ver certificados',
        metadata: { certId: s.id, name: s.name, expiresAt: s.expiresAt?.toISOString() },
      }));
    } else if (s.daysUntilExpiry !== null && s.daysUntilExpiry <= 30) {
      const severity: ProactiveAlertSeverity = s.daysUntilExpiry <= 7 ? 'high' : 'warning';
      alerts.push(createAlert({
        domain: 'certificates',
        category: 'certificate_expiring',
        severity,
        title: `Certificado por vencer: ${s.name}`,
        message: `El certificado \"${s.name}\" expira en ${s.daysUntilExpiry} día${s.daysUntilExpiry !== 1 ? 's' : ''}.`,
        entityRef: s.id,
        eventType: 'certificate_expiring',
        actionLabel: 'Ver certificados',
        metadata: { certId: s.id, name: s.name, daysUntilExpiry: s.daysUntilExpiry, expiresAt: s.expiresAt?.toISOString() },
      }));
    }
  }

  return alerts;
}

/**
 * Evaluate dry-run signals → alerts for failed or degraded runs
 */
export function evaluateDryRunAlerts(signals: DryRunSignal[]): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  // Only alert on recent dry-runs (last 7 days) to avoid noise
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  for (const s of signals) {
    if (s.createdAt < cutoff) continue;

    if (s.hasErrors && s.status !== 'superseded') {
      alerts.push(createAlert({
        domain: mapDeadlineDomain(s.domain),
        category: 'dryrun_failed',
        severity: 'warning',
        title: `Dry-run con errores (${s.domain})`,
        message: `El último dry-run tiene ${s.errorCount} error${s.errorCount !== 1 ? 'es' : ''}. Revise y corrija antes de solicitar aprobación.`,
        entityRef: s.id,
        eventType: 'dryrun_failed',
        actionLabel: 'Ver dry-run',
        metadata: { submissionId: s.id, domain: s.domain, errors: s.errorCount, warnings: s.warningCount },
      }));
    } else if (s.hasWarnings && !s.hasErrors && s.status !== 'superseded') {
      alerts.push(createAlert({
        domain: mapDeadlineDomain(s.domain),
        category: 'dryrun_degraded',
        severity: 'info',
        title: `Dry-run con advertencias (${s.domain})`,
        message: `El dry-run tiene ${s.warningCount} advertencia${s.warningCount !== 1 ? 's' : ''} que conviene revisar.`,
        entityRef: s.id,
        eventType: 'dryrun_degraded',
        actionLabel: 'Ver dry-run',
        metadata: { submissionId: s.id, domain: s.domain, warnings: s.warningCount },
      }));
    }
  }

  return alerts;
}

/**
 * Evaluate approval signals → alerts for pending/expired approvals
 */
export function evaluateApprovalAlerts(signals: ApprovalSignal[]): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  for (const s of signals) {
    if (s.isExpired && s.status === 'pending_approval') {
      alerts.push(createAlert({
        domain: 'approvals',
        category: 'approval_expired',
        severity: 'high',
        title: `Aprobación expirada (${s.domain})`,
        message: `La solicitud de aprobación ha expirado sin decisión. Se requiere nueva solicitud si se desea continuar.`,
        entityRef: s.id,
        eventType: 'approval_expired',
        actionLabel: 'Ver aprobaciones',
        metadata: { approvalId: s.id, domain: s.domain, requestedAt: s.requestedAt.toISOString() },
      }));
    } else if (s.status === 'pending_approval' && !s.isExpired) {
      // Calculate days pending
      const daysPending = Math.floor((Date.now() - s.requestedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPending >= 3) {
        alerts.push(createAlert({
          domain: 'approvals',
          category: 'approval_pending',
          severity: daysPending >= 5 ? 'warning' : 'info',
          title: `Aprobación pendiente ${daysPending}d (${s.domain})`,
          message: `Hay una solicitud de aprobación pendiente desde hace ${daysPending} días. Recordatorio informativo.`,
          entityRef: s.id,
          eventType: 'approval_pending_reminder',
          actionLabel: 'Ver aprobaciones',
          metadata: { approvalId: s.id, domain: s.domain, daysPending, requestedAt: s.requestedAt.toISOString() },
        }));
      }
    }
  }

  return alerts;
}

// ─── Consolidator ───────────────────────────────────────────────────────────

/**
 * Consolidate all signal evaluations into a single deduplicated summary.
 * This is the main entry point for computing proactive alerts.
 */
export function computeProactiveAlerts(inputs: {
  readiness?: ReadinessSignal[];
  deadlines?: DeadlineSignal[];
  certificates?: CertificateSignal[];
  dryRuns?: DryRunSignal[];
  approvals?: ApprovalSignal[];
}): ProactiveAlertSummary {
  const allAlerts: ProactiveAlert[] = [];

  if (inputs.readiness) allAlerts.push(...evaluateReadinessAlerts(inputs.readiness));
  if (inputs.deadlines) allAlerts.push(...evaluateDeadlineAlerts(inputs.deadlines));
  if (inputs.certificates) allAlerts.push(...evaluateCertificateAlerts(inputs.certificates));
  if (inputs.dryRuns) allAlerts.push(...evaluateDryRunAlerts(inputs.dryRuns));
  if (inputs.approvals) allAlerts.push(...evaluateApprovalAlerts(inputs.approvals));

  // Deduplicate by key (keep highest severity if dupes)
  const deduped = new Map<string, ProactiveAlert>();
  for (const alert of allAlerts) {
    const existing = deduped.get(alert.deduplicationKey);
    if (!existing || compareSeverity(alert.severity, existing.severity) < 0) {
      deduped.set(alert.deduplicationKey, alert);
    }
  }

  // Sort by priority (lower = more important)
  const alerts = Array.from(deduped.values()).sort((a, b) => a.priority - b.priority);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  const byDomain: Record<ProactiveAlertDomain, ProactiveAlert[]> = {
    tgss_siltra: [],
    contrata_sepe: [],
    aeat: [],
    certificates: [],
    approvals: [],
    general: [],
  };
  for (const a of alerts) {
    byDomain[a.domain].push(a);
  }

  return {
    alerts,
    criticalCount,
    highCount,
    warningCount,
    infoCount,
    totalCount: alerts.length,
    overallSeverity: worstSeverity(alerts.map(a => a.severity)),
    byDomain,
    deduplicationKeys: new Set(deduped.keys()),
  };
}

// ─── Notification table mapper ──────────────────────────────────────────────

/**
 * Map a ProactiveAlert to the shape expected by the `notifications` table.
 * Used for persistence and deduplication against existing rows.
 */
export function mapAlertToNotificationRow(
  alert: ProactiveAlert,
  userId?: string,
): {
  title: string;
  message: string;
  severity: string;
  source_system: string;
  event_type: string;
  priority: number;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, string | number | boolean | null>;
  user_id: string | null;
  expires_at: string | null;
} {
  return {
    title: alert.title,
    message: alert.message,
    severity: mapSeverityToNotificationSeverity(alert.severity),
    source_system: alert.sourceSystem,
    event_type: alert.eventType,
    priority: alert.priority,
    action_url: alert.actionUrl ?? null,
    action_label: alert.actionLabel ?? null,
    metadata: {
      deduplicationKey: alert.deduplicationKey,
      domain: alert.domain,
      category: alert.category,
      entityRef: alert.entityRef ?? null,
      ...Object.fromEntries(
        Object.entries(alert.metadata).filter(
          ([, v]) => v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
        ),
      ),
    } as Record<string, string | number | boolean | null>,
    user_id: userId ?? null,
    expires_at: alert.expiresAt?.toISOString() ?? null,
  };
}

/**
 * Filter out alerts that already exist in persisted notifications
 * (matched by deduplication key in metadata).
 */
export function filterNewAlerts(
  computed: ProactiveAlert[],
  existingKeys: Set<string>,
): ProactiveAlert[] {
  return computed.filter(a => !existingKeys.has(a.deduplicationKey));
}

// ─── Domain mappers ─────────────────────────────────────────────────────────

function mapConnectorDomain(connectorId: string): ProactiveAlertDomain {
  if (connectorId.startsWith('tgss')) return 'tgss_siltra';
  if (connectorId.startsWith('contrata')) return 'contrata_sepe';
  if (connectorId.startsWith('aeat')) return 'aeat';
  return 'general';
}

function mapDeadlineDomain(domain: string): ProactiveAlertDomain {
  if (domain === 'tgss_siltra') return 'tgss_siltra';
  if (domain === 'contrata_sepe') return 'contrata_sepe';
  if (domain === 'aeat') return 'aeat';
  return 'general';
}

function mapSeverityToNotificationSeverity(severity: ProactiveAlertSeverity): string {
  switch (severity) {
    case 'critical': return 'error';
    case 'high': return 'warning';
    case 'warning': return 'warning';
    case 'info': return 'info';
  }
}

// ─── Severity visual config (for UI consumption) ────────────────────────────

export const PROACTIVE_SEVERITY_CONFIG: Record<ProactiveAlertSeverity, {
  label: string;
  badgeVariant: 'destructive' | 'default' | 'secondary' | 'outline';
  dotClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = {
  critical: {
    label: 'Crítico',
    badgeVariant: 'destructive',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-500/5',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-700',
  },
  high: {
    label: 'Alto',
    badgeVariant: 'destructive',
    dotClass: 'bg-orange-500',
    bgClass: 'bg-orange-500/5',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-700',
  },
  warning: {
    label: 'Atención',
    badgeVariant: 'default',
    dotClass: 'bg-amber-500',
    bgClass: 'bg-amber-500/5',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-700',
  },
  info: {
    label: 'Info',
    badgeVariant: 'secondary',
    dotClass: 'bg-sky-400',
    bgClass: 'bg-sky-500/5',
    borderClass: 'border-sky-500/20',
    textClass: 'text-sky-700',
  },
};

// ─── Category labels (for UI) ───────────────────────────────────────────────

export const ALERT_CATEGORY_LABELS: Record<ProactiveAlertCategory, string> = {
  readiness_drop: 'Readiness',
  deadline_overdue: 'Plazo vencido',
  deadline_urgent: 'Plazo urgente',
  deadline_upcoming: 'Plazo próximo',
  certificate_expired: 'Certificado expirado',
  certificate_expiring: 'Certificado por vencer',
  dryrun_failed: 'Dry-run fallido',
  dryrun_degraded: 'Dry-run degradado',
  approval_pending: 'Aprobación pendiente',
  approval_expired: 'Aprobación expirada',
};

export const ALERT_DOMAIN_LABELS: Record<ProactiveAlertDomain, string> = {
  tgss_siltra: 'TGSS / SILTRA',
  contrata_sepe: 'Contrat@ / SEPE',
  aeat: 'AEAT',
  certificates: 'Certificados',
  approvals: 'Aprobaciones',
  general: 'General',
};
