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
