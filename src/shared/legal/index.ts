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
