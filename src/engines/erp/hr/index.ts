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

// ── Document Reconciliation Rules (Sprint 4: extracted from UI) ──
export { isReconcilableDocType, getApplicableChannels, RECONCILIATION_CHANNEL_LABELS } from './docReconciliationRules';
export type { ReconciliationChannel } from './docReconciliationRules';

// ── Ledger & Evidence (V2-RRHH-FASE-2) ──
export {
  computeImmutableHash, buildLedgerRow, detectChangedFields,
  canTransitionVersion, getValidTransitions, isTerminalVersionState,
  LEDGER_EVENT_LABELS, VERSION_STATE_LABELS, VERSION_STATE_COLORS,
} from './ledgerEngine';
export type {
  LedgerEventType, VersionState, EvidenceType,
  LedgerEventInput, LedgerEventRow,
} from './ledgerEngine';

export {
  buildEvidenceRow, validateEvidenceChain, groupEvidenceByEntity, sortEvidenceChain,
  EVIDENCE_TYPE_LABELS, EVIDENCE_TYPE_ICONS,
} from './evidenceEngine';
export type { EvidenceInput, EvidenceRow, EvidenceChainItem } from './evidenceEngine';

// ── Payroll Engines (pre-existing, export selectively to avoid name clashes) ──
// Import directly from individual files: './payrollRunEngine', './payrollConceptCatalog', etc.
