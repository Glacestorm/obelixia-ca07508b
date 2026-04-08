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

// ── Monthly Closing Orchestration (V2-RRHH-FASE-3) ──
export {
  canTransitionPhase, derivePhaseFromPeriodStatus,
  buildClosingChecklist, buildClosingOutputs, buildPhaseTimelineEvent,
  CLOSING_PHASE_CONFIG,
} from './monthlyClosingOrchestrationEngine';
export type {
  MonthlyClosingPhase, MonthlyClosingState, ClosingChecklist, ClosingCheckItem,
  CheckSeverity, ClosingPackage, ClosingOutput, ClosingTimelineEvent,
} from './monthlyClosingOrchestrationEngine';

// ── Official Readiness Matrix (V2-RRHH-FASE-4) ──
export {
  deriveOperationalStatus, buildReadinessMatrix, getSystemLimitsDeclaration,
  OPERATIONAL_STATUS_META, CIRCUIT_DEFINITIONS,
} from './officialReadinessMatrixEngine';
export type {
  OfficialOperationalStatus, CircuitId, CircuitDefinition, CircuitSystemLimit,
  CircuitReadinessItem, ReadinessMatrix, SystemLimitDeclaration,
} from './officialReadinessMatrixEngine';

// ── Payroll Engines (pre-existing, export selectively to avoid name clashes) ──
// Import directly from individual files: './payrollRunEngine', './payrollConceptCatalog', etc.

// ── SS Contribution Engine (V2-RRHH-P1B) ──
export {
  computeSSContributions, mapLinesToSSInput, isOvertimeConcept, isProrrateadoConcept,
  formatSSGroupLabel, deriveFiscalClass,
} from './ssContributionEngine';
export type {
  SSGroupLimits, SSPayrollLineInput, SSEmployeeContext, SSContributionBreakdown,
  SSDataQuality, SSCalculationTrace, SSFiscalClass,
} from './ssContributionEngine';

// ── IRPF Engine (V2-RRHH-P1B) ──
export {
  computeIRPF, buildIRPFInputFromLaborData, checkIRPFDataCompleteness,
  getSupportedCCAA, isCCAAForal,
} from './irpfEngine';
export type {
  IRPFEmployeeInput, IRPFDisabilityLevel, IRPFDescendant, IRPFTramo,
  IRPFCalculationResult, IRPFTramoAplicado, IRPFDataQuality, IRPFCalculationTrace,
  IRPFRegularizationContext, IRPFRegularizationDetail,
  IRPFIrregularIncome, IRPFIrregularIncomeResult,
  IRPFFamilyChange, IRPFFamilyChangeImpact,
  IRPFRegionalDeduction, IRPFRegionalDeductionResult,
} from './irpfEngine';

// ── Payslip Engine (V2-RRHH-P1B) ──
export {
  buildPayslip, validateLegalPreClose,
} from './payslipEngine';
export type {
  PayslipData, PayslipHeader, PayslipDevengo, PayslipDeduccion, PayslipBases,
  PayslipTraceability, PayslipLineInput, LegalPreCloseCheck, LegalPreCloseInput,
} from './payslipEngine';

// ── AFI Artifact Engine (V2-RRHH-P2) ──
export {
  buildAFIAlta, buildAFIBaja, buildAFIVariacion,
  promoteAFIStatus, serializeAFIForSnapshot,
  AFI_STATUS_META,
} from './afiArtifactEngine';
export type {
  AFIActionType, AFIAltaSubtype, AFIBajaSubtype, AFIVariacionSubtype,
  AFIWorkerData, AFIEmployerData, AFIContractData,
  AFIVariacionChange, AFIBajaDetails,
  AFIArtifact, AFIArtifactStatus, AFIFieldValidation,
} from './afiArtifactEngine';

// ── FAN Cotización Artifact Engine (V2-RRHH-P2) ──
export {
  buildFANEmployeeRecord, buildFANCotizacion,
  promoteFANStatus, serializeFANForSnapshot,
  FAN_STATUS_META,
} from './fanCotizacionArtifactEngine';
export type {
  FANEmployeeRecord, FANCotizacionArtifact, FANCotizacionTotals,
  FANValidation, FANArtifactStatus,
} from './fanCotizacionArtifactEngine';

// ── Official Artifact Validation Engine (V2-RRHH-P2 + P4B) ──
export {
  validateAFIPrerequisites, validateFANPrerequisites,
  validateRLCPrerequisites, validateRNTPrerequisites, validateCRAPrerequisites,
  validateModelo111Prerequisites, validateModelo190Prerequisites,
} from './officialArtifactValidationEngine';
export type {
  ArtifactPreValidation, ArtifactPreCheck, P4ArtifactType,
} from './officialArtifactValidationEngine';

// ── RLC / RNT / CRA Artifact Engine (V2-RRHH-P4) ──
export {
  buildRLC, buildRNT, buildCRA,
  promoteRLCRNTCRAStatus,
  serializeRLCForSnapshot, serializeRNTForSnapshot, serializeCRAForSnapshot,
  RLCRNTCRA_STATUS_META,
} from './rlcRntCraArtifactEngine';
export type {
  RLCArtifact, RNTArtifact, CRAArtifact,
  RNTWorkerLine, RLCConceptLine, CRASection,
  RLCRNTCRAArtifactStatus, ArtifactValidationItem,
} from './rlcRntCraArtifactEngine';

// ── AEAT Artifact Engine (V2-RRHH-P4) ──
export {
  buildModelo111, buildModelo190,
  promoteAEATStatus,
  serializeModelo111ForSnapshot, serializeModelo190ForSnapshot,
  AEAT_STATUS_META,
} from './aeatArtifactEngine';
export type {
  Modelo111Artifact, Modelo190Artifact,
  Modelo111MonthInput, Modelo190KeySummary,
  AEATArtifactStatus, AEATValidationItem,
} from './aeatArtifactEngine';

// ── Official Cross-Validation Engine (V2-RRHH-P4) ──
export {
  runCrossValidation,
  CATEGORY_LABELS as CROSS_VALIDATION_CATEGORY_LABELS,
} from './officialCrossValidationEngine';
export type {
  CrossValidationResult, CrossValidationCheck, CrossValidationInput,
  CrossValidationCategory, CrossValidationSeverity, CategorySummary,
} from './officialCrossValidationEngine';

// ── Monthly Official Package Engine (V2-RRHH-P4) ──
export {
  buildMonthlyOfficialPackage, serializePackageForSnapshot,
  PACKAGE_STATUS_META,
} from './monthlyOfficialPackageEngine';
export type {
  MonthlyOfficialPackage, MonthlyPackageInput, PackageStatus,
  ArtifactSummary, CircuitReadiness,
} from './monthlyOfficialPackageEngine';

// ── Institutional Submission Engine (V2-RRHH-PINST) ──
export {
  canTransitionInstitutional, getValidInstitutionalTransitions,
  validateTransitionContent, getAvailableTransitions,
  getInstitutionalChainStatus, checkSignatureReadiness,
  reconcileArtifactWithReceipt, mapReceiptToStatus,
  buildStatusTransition, INSTITUTIONAL_STATUS_CONFIG, ORGANISM_LABELS,
} from './institutionalSubmissionEngine';
export type {
  InstitutionalStatus, ReceiptType, ReconciliationStatus, TargetOrganism,
  InstitutionalStatusMeta, StatusTransitionEntry, TransitionGuardContext,
  TransitionGuardResult, ReconciliationCheckResult, SignatureReadiness,
  InstitutionalChainStatus,
} from './institutionalSubmissionEngine';

// ── Modelo 190 Pipeline Engine (V2-RRHH-PINST) ──
export {
  aggregatePerceptorsForModelo190, checkModelo190PipelineReadiness,
} from './modelo190PipelineEngine';
export type {
  Modelo190PerceptorInput, MonthlyPerceptorData, FamilySituationChange,
  IrregularIncomeEntry, RegionalDeductionEntry,
  Modelo190AggregationResult, Modelo190QualityReport,
  QuarterlyTotals, CrossCheckData, RegulatoryEdgeCaseSummary,
  Modelo190PipelineReadiness,
} from './modelo190PipelineEngine';

// ── Contract Expiry Alert Engine (Cycle-of-Life) ──
export {
  computeContractExpiryAlert, computeBatchExpiryAlerts,
  buildIndefiniteConversionPayload, getAlertSummary, isTemporaryContract,
  EXPIRY_ALERT_LEVELS,
} from './contractExpiryAlertEngine';
export type {
  ExpiryAlertLevel, ExpiryAlertConfig, ContractExpiryAlert,
  ContractExpiryInput, IndefiniteConversionPayload,
} from './contractExpiryAlertEngine';

// ── Artifact Generation Mode Engine ──
export {
  getGenerationModeConfig, setGenerationModeConfig, shouldAutoGenerate,
  DEFAULT_CONFIG as GENERATION_DEFAULT_CONFIG,
  GENERATION_MODE_LABELS,
} from './artifactGenerationModeEngine';
export type { GenerationMode, GenerationModeConfig } from './artifactGenerationModeEngine';

// ── FDI Artifact Engine (INSS IT/AT) ──
export { buildFDI, promoteFDIStatus, FDI_TYPE_LABELS } from './fdiArtifactEngine';
export type { FDIType, FDIContingency, FDIWorkerData, FDIEmployerData, FDIMedicalData, FDIArtifact } from './fdiArtifactEngine';

// ── Delt@ Accident Report Engine ──
export { buildDeltaPart, promoteDeltaStatus, ACCIDENT_SEVERITY_LABELS, ACCIDENT_TYPE_LABELS } from './deltaArtifactEngine';
export type { AccidentSeverity, AccidentType, DeltaWorkerData, DeltaEmployerData, DeltaAccidentData, DeltaArtifact } from './deltaArtifactEngine';

// ── Certific@2 SEPE Engine ──
export { buildCertifica, promoteCertificaStatus, CAUSA_BAJA_LABELS } from './certificaArtifactEngine';
export type { CausaBajaSEPE, CertificaWorkerData, CertificaEmployerData, CertificaContractData, CertificaSalaryData, CertificaArtifact } from './certificaArtifactEngine';

// ── AFI Inactivity Engine (PNR/Suspension) ──
export { buildAFIInactivityPair, promoteAFIInactivityStatus, INACTIVITY_TYPE_LABELS } from './afiInactivityEngine';
export type { InactivityType, AFIInactivityData, AFIInactivityArtifact, AFIInactivityPair } from './afiInactivityEngine';
  QuarterlyTotals, CrossCheckData, RegulatoryEdgeCaseSummary,
  Modelo190PipelineReadiness,
} from './modelo190PipelineEngine';
