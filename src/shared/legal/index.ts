/**
 * Shared Legal Core — Barrel Export
 * @shared-legal-core
 */
export type {
  LegalRiskLevel,
  LegalValidationStatus,
  LegalModuleType,
  LegalJurisdictionInfo,
  LegalReference,
  LegalContext,
  LegalValidationResult,
  LegalValidationIssue,
} from './types';

// Knowledge — Reference Resolver
export { resolveLegalReference, linkifyLegalReferences } from './knowledge/referenceResolver';
export type { LegalLinkResult } from './knowledge/referenceResolver';

// Compliance — Validation State Machine
export {
  transition,
  canTransition,
  getAvailableEvents,
  tryTransition,
  mapLegacyStatus,
  toLegacyStatus,
  isTerminalState,
  requiresAction,
  ALL_STATES,
  ALL_EVENTS,
} from './compliance/validationStateMachine';
export type {
  LegalValidationState,
  LegalValidationEvent,
  TransitionResult,
} from './compliance/validationStateMachine';

// Compliance — Obligation Engine
export {
  computeDeadlineUrgency,
  evaluateSanctionRisk,
  filterObligationsByScope,
  sortDeadlinesByUrgency,
} from './compliance/obligationEngine';
export type {
  ObligationRule,
  ObligationDeadlineInfo,
  SanctionRule,
  ComputedDeadline,
  DeadlineUrgency,
  SanctionRiskResult,
} from './compliance/obligationEngine';

// Compliance — Rules & Constants
export {
  ALERT_THRESHOLDS,
  CLASSIFICATION_SEVERITY,
  OBLIGATION_PERIODICITIES,
  OBLIGATION_TYPES,
} from './compliance/complianceRules';
export type {
  AlertThresholdLevel,
  ObligationPeriodicity,
  ObligationType,
} from './compliance/complianceRules';

// Rules — SS 2026
export {
  SS_BASE_MAX_MENSUAL_2026,
  SS_BASE_MAX_DIARIA_2026,
  SS_GROUP_BASES_2026,
  SS_GROUP_MIN_BASES_MENSUAL_2026,
  SS_CONTRIBUTION_RATES_2026,
  SS_SOLIDARITY_SURCHARGE_2026,
  SS_OVERTIME_RATES_2026,
} from './rules/ssRules2026';
export type {
  SSGroupBase,
  SSContributionRate,
  SolidaritySurchargeTramo,
} from './rules/ssRules2026';

// Rules — IRPF
export {
  IRPF_MINIMUM_RATE_SHORT_CONTRACT,
  IRPF_MINIMUM_RATE_INTERNSHIP,
  IRPF_MINIMUM_RATE_NEW_RESIDENT,
  computeEffectiveIRPF,
  applyShortContractMinimum,
} from './rules/irpfRules';

// Rules — SMI 2026
export {
  SMI_MENSUAL_2026,
  SMI_ANUAL_2026,
  SMI_PRORRATEADO_2026,
  SMI_DIARIO_2026,
  getSMIMensual,
  getSMIAnual,
  getSMIProrrateadoMensual,
} from './rules/smiRules';
