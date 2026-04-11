/**
 * mobilityImpactResolver.ts — G2.1
 * Cross-module impact resolver for expatriate cases.
 * Derives actionable flags per module from assignment + pack + classification.
 */

import type { CorridorKnowledgePack } from './corridorKnowledgePacks';
import type { MobilityClassification } from './internationalMobilityEngine';
import type { InternationalTaxImpact } from './internationalTaxEngine';
import type { ExtendedReviewTrigger } from './reviewTriggerEngine';
import type { MobilityAssignment } from '@/hooks/erp/hr/useGlobalMobility';

// ── Types ──

export interface HRImpact {
  fieldsToUpdate: string[];
  checklistItems: string[];
  onboardingImpact: string;
}

export interface FiscalImpact {
  residencyReview: boolean;
  art7pReview: boolean;
  cdiApplicable: boolean;
  shadowPayroll: boolean;
  retentionAdjustment: boolean;
}

export interface LegalImpact {
  documentsRequired: string[];
  peAssessment: boolean;
  contractAnnex: boolean;
  dataProtection: boolean;
}

export interface AuditImpact {
  evidenceRequired: string[];
  packVersionUsed: string | null;
  classificationSnapshot: string;
}

export interface IACenterImpact {
  packFreshness: string;
  confidence: number;
  reviewGatesActive: number;
}

export interface PreflightImpact {
  corridorActive: boolean;
  supportLevel: string;
  reviewRequired: boolean;
  staleWarning: boolean;
  corridorLabel: string;
  confidenceScore: number;
}

export interface CrossModuleImpact {
  hr: HRImpact;
  fiscal: FiscalImpact;
  legal: LegalImpact;
  audit: AuditImpact;
  iaCenter: IACenterImpact;
  preflight: PreflightImpact;
}

// ── Resolver ──

export function resolveCrossModuleImpact(
  assignment: MobilityAssignment,
  classification: MobilityClassification,
  taxImpact: InternationalTaxImpact,
  corridorPack: CorridorKnowledgePack | null,
  triggers: ExtendedReviewTrigger[],
): CrossModuleImpact {
  const hasCritical = triggers.some(t => t.severity === 'critical_review_required');
  const hasReview = triggers.some(t => t.severity === 'review_required' || t.severity === 'critical_review_required');

  // HR Impact
  const hrFieldsToUpdate: string[] = ['host_country_code', 'assignment_type', 'ss_regime_country'];
  if (assignment.split_payroll) hrFieldsToUpdate.push('payroll_country_code');
  if (assignment.tax_residence_country !== assignment.home_country_code) hrFieldsToUpdate.push('tax_residence_country');

  const hrChecklist: string[] = [];
  if (corridorPack?.immigration.workPermitRequired) hrChecklist.push('Obtener permiso de trabajo');
  hrChecklist.push('Verificar cobertura sanitaria internacional');
  if (corridorPack?.ss.certType) hrChecklist.push(`Obtener ${corridorPack.ss.certType}`);

  const hr: HRImpact = {
    fieldsToUpdate: hrFieldsToUpdate,
    checklistItems: hrChecklist,
    onboardingImpact: corridorPack?.immigration.workPermitRequired
      ? 'Onboarding internacional con trámite migratorio'
      : 'Onboarding internacional estándar',
  };

  // Fiscal Impact
  const fiscal: FiscalImpact = {
    residencyReview: taxImpact.residency.classification !== 'resident' || taxImpact.residency.centerVitalInterests === 'indeterminate',
    art7pReview: taxImpact.art7p.eligibility !== 'not_eligible',
    cdiApplicable: taxImpact.cdiApplicable,
    shadowPayroll: assignment.shadow_payroll || (corridorPack?.payroll.shadowRecommended ?? false),
    retentionAdjustment: assignment.split_payroll || taxImpact.art7p.eligibility === 'eligible',
  };

  // Legal Impact
  const legalDocs = corridorPack?.requiredDocuments ?? classification.documentChecklist.filter(d => d.required).map(d => d.documentType);
  const legal: LegalImpact = {
    documentsRequired: legalDocs as string[],
    peAssessment: assignment.pe_risk_flag,
    contractAnnex: true, // always recommended for international
    dataProtection: true, // GDPR / international transfer always applicable
  };

  // Audit Impact
  const audit: AuditImpact = {
    evidenceRequired: triggers.filter(t => t.evidenceRequired).map(t => t.reason),
    packVersionUsed: corridorPack?.id ?? null,
    classificationSnapshot: `${classification.ssRegime} / ${classification.supportLevel} / risk=${classification.riskScore}`,
  };

  // IA Center Impact
  const iaCenter: IACenterImpact = {
    packFreshness: corridorPack?.status ?? 'no_pack',
    confidence: corridorPack?.confidenceScore ?? 0,
    reviewGatesActive: triggers.filter(t => t.severity === 'review_required' || t.severity === 'critical_review_required').length,
  };

  // Preflight Impact
  const preflight: PreflightImpact = {
    corridorActive: true,
    supportLevel: classification.supportLevel,
    reviewRequired: hasReview,
    staleWarning: corridorPack?.status === 'stale' || corridorPack?.status === 'review_required',
    corridorLabel: corridorPack ? `${corridorPack.origin}↔${corridorPack.destination}` : `${assignment.home_country_code}↔${assignment.host_country_code}`,
    confidenceScore: corridorPack?.confidenceScore ?? 0,
  };

  return { hr, fiscal, legal, audit, iaCenter, preflight };
}
