/**
 * @migration Sprint 3 — Moved to src/engines/erp/hr/proactiveAlertEngine.ts
 * This file is a compatibility re-export. Import from '@/engines/erp/hr/proactiveAlertEngine' instead.
 */
export {
  evaluateProactiveAlerts,
  evaluateReadinessSignals,
  evaluateDeadlineSignals,
  evaluateCertificateSignals,
  evaluateDryRunSignals,
  evaluateApprovalSignals,
} from '@/engines/erp/hr/proactiveAlertEngine';
export type {
  ProactiveAlertLevel,
  ProactiveAlertCategory,
  ProactiveAlert,
  ProactiveAlertSummary,
  ReadinessSignal,
  DeadlineSignal,
  CertificateSignal,
  DryRunSignal,
  ApprovalSignal,
  ProactiveAlertContext,
} from '@/engines/erp/hr/proactiveAlertEngine';
