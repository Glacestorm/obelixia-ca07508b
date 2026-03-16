/**
 * @migration Sprint 3 — Moved to src/engines/erp/hr/proactiveAlertEngine.ts
 * This file is a compatibility re-export. Import from '@/engines/erp/hr/proactiveAlertEngine' instead.
 */
export {
  computeProactiveAlerts,
  evaluateReadinessAlerts,
  evaluateDeadlineAlerts,
  evaluateCertificateAlerts,
  evaluateDryRunAlerts,
  evaluateApprovalAlerts,
  compareSeverity,
  worstSeverity,
  canTransition,
  isTerminalStatus,
  buildDeduplicationKey,
  mapAlertToNotificationRow,
  filterNewAlerts,
  PROACTIVE_SEVERITY_CONFIG,
  PROACTIVE_STATUS_CONFIG,
  ALERT_CATEGORY_LABELS,
  ALERT_DOMAIN_LABELS,
} from '@/engines/erp/hr/proactiveAlertEngine';
export type {
  ProactiveAlertSeverity,
  ProactiveAlertStatus,
  ProactiveAlertCategory,
  ProactiveAlertDomain,
  ProactiveAlert,
  ProactiveAlertSummary,
  ReadinessSignal,
  DeadlineSignal,
  CertificateSignal,
  DryRunSignal,
  ApprovalSignal,
} from '@/engines/erp/hr/proactiveAlertEngine';
