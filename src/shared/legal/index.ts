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
