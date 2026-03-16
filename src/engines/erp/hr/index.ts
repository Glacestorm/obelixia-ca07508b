/**
 * HR Engines — Barrel Export
 * Pure logic engines with no React/UI dependencies.
 * 
 * V2-RRHH-FASE-1 Sprint 3: Initial barrel with migrated engines from shared/
 */

// ── Calendar & Deadlines ──
export {
  toDateKey, isWeekend, isNonWorkingDay,
  addBusinessDays, addCalendarDays,
  endOfMonth, endOfNextMonth,
  countBusinessDaysBetween, nextBusinessDay, daysUntil,
  EMPTY_CALENDAR,
} from './calendarHelpers';
export type { HolidayCalendar } from './calendarHelpers';

export { computeContractDeadlines } from './contractDeadlineEngine';
export type { ContractDeadlineType, ContractDeadlineUrgency, ContractDeadline, ContractDeadlineSummary } from './contractDeadlineEngine';

export { computeRegistrationDeadlines } from './registrationDeadlineEngine';
export type { RegistrationDeadlineType, RegistrationDeadlineUrgency, RegistrationDeadline, RegistrationDeadlineSummary } from './registrationDeadlineEngine';

// ── Document Engines ──
export { getCatalogEntry, getOnboardingRequiredDocs, getRenewableDocs, getCatalogByCategory, DOCUMENT_CATALOG_ES } from './documentCatalogES';
export type { DocumentCatalogEntry } from './documentCatalogES';

export { normalizeDocType, EXPECTED_DOCS_BY_REQUEST_TYPE, getExpectedDocCatalogEntry, computeDocCompleteness } from './documentExpectedTypes';
export type { ExpectedDocType } from './documentExpectedTypes';

export { computeDocStatus, computeDocAlertSummary, getDocsNeedingAttention } from './documentStatusEngine';
export type { DocTrafficLight, DocOperationalStatus, DocStatusResult, DocAlertSummary } from './documentStatusEngine';

// ── Alert Engines ──
export {
  computeProactiveAlerts,
  evaluateReadinessAlerts, evaluateDeadlineAlerts,
  evaluateCertificateAlerts, evaluateDryRunAlerts, evaluateApprovalAlerts,
  compareSeverity, worstSeverity, canTransition, isTerminalStatus,
  buildDeduplicationKey, mapAlertToNotificationRow, filterNewAlerts,
  PROACTIVE_SEVERITY_CONFIG, PROACTIVE_STATUS_CONFIG,
  ALERT_CATEGORY_LABELS, ALERT_DOMAIN_LABELS,
} from './proactiveAlertEngine';
export type {
  ProactiveAlertSeverity, ProactiveAlertStatus, ProactiveAlertCategory, ProactiveAlertDomain,
  ProactiveAlert, ProactiveAlertSummary,
  ReadinessSignal, DeadlineSignal, CertificateSignal, DryRunSignal, ApprovalSignal,
} from './proactiveAlertEngine';

// ── Payroll Engines (pre-existing) ──
export { payrollRunEngine } from './payrollRunEngine';
export { payrollConceptCatalog } from './payrollConceptCatalog';
export { payrollIncidentEngine } from './payrollIncidentEngine';
