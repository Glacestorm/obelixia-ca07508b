/**
 * expatriateSupervisor.ts — G2.1
 * Core supervisor engine for expatriate case management.
 * Flow: detect triggers → resolve corridor → load pack → classify → compute impacts → review gates
 */

import type { MobilityAssignment } from '@/hooks/erp/hr/useGlobalMobility';
import { classifyMobilityCase, type MobilityClassification, type MobilityInput } from './internationalMobilityEngine';
import { evaluateInternationalTaxImpact, type InternationalTaxImpact, type TaxImpactInput } from './internationalTaxEngine';
import { getCorridorPack, type CorridorKnowledgePack } from './corridorKnowledgePacks';
import { buildExtendedReviewTriggers, worstSeverity, type ExtendedReviewTrigger, type ExtendedSeverity } from './reviewTriggerEngine';
import { resolveCrossModuleImpact, type CrossModuleImpact } from './mobilityImpactResolver';
import type { SupportLevel } from './internationalMobilityEngine';

// ── Types ──

export interface ActivationTrigger {
  id: string;
  signal: string;
  detected: boolean;
  value?: string;
}

export interface SupervisorResult {
  /** Whether expatriate supervision was activated */
  activated: boolean;
  /** Triggers that caused activation */
  activationTriggers: ActivationTrigger[];
  /** Resolved corridor pack (null if no pack available) */
  corridorPack: CorridorKnowledgePack | null;
  /** Corridor label */
  corridorLabel: string;
  /** Whether a pack was found for this corridor */
  hasCorridorPack: boolean;
  /** Mobility classification from existing engine */
  mobilityClassification: MobilityClassification;
  /** Tax impact from existing engine */
  taxImpact: InternationalTaxImpact;
  /** Extended review triggers */
  reviewTriggers: ExtendedReviewTrigger[];
  /** Worst severity across all triggers */
  worstTriggerSeverity: ExtendedSeverity;
  /** Overall support level */
  overallSupportLevel: SupportLevel;
  /** Cross-module impact flags */
  crossModuleImpact: CrossModuleImpact;
  /** Consolidated risk score 0-100 */
  consolidatedRiskScore: number;
  /** Human-readable summary */
  summary: string;
  /** Timestamp of evaluation */
  evaluatedAt: string;
}

// ── Activation Detection ──

function detectActivationTriggers(a: MobilityAssignment): ActivationTrigger[] {
  const triggers: ActivationTrigger[] = [];

  triggers.push({
    id: 'country_mismatch',
    signal: 'home_country != host_country',
    detected: a.home_country_code !== a.host_country_code,
    value: `${a.home_country_code} → ${a.host_country_code}`,
  });

  const internationalTypes = new Set(['long_term', 'short_term', 'commuter', 'permanent_transfer', 'rotational']);
  triggers.push({
    id: 'assignment_type_international',
    signal: 'assignment_type in international types',
    detected: internationalTypes.has(a.assignment_type),
    value: a.assignment_type,
  });

  triggers.push({
    id: 'split_payroll',
    signal: 'split_payroll === true',
    detected: a.split_payroll,
  });

  triggers.push({
    id: 'shadow_payroll',
    signal: 'shadow_payroll === true',
    detected: a.shadow_payroll,
  });

  triggers.push({
    id: 'tax_residence_mismatch',
    signal: 'tax_residence_country != home_country',
    detected: a.tax_residence_country !== a.home_country_code,
    value: `tax=${a.tax_residence_country} vs home=${a.home_country_code}`,
  });

  triggers.push({
    id: 'ss_regime_mismatch',
    signal: 'ss_regime_country != home_country',
    detected: a.ss_regime_country !== a.home_country_code,
    value: `ss=${a.ss_regime_country} vs home=${a.home_country_code}`,
  });

  triggers.push({
    id: 'pe_risk',
    signal: 'pe_risk_flag === true',
    detected: a.pe_risk_flag,
  });

  triggers.push({
    id: 'days_in_host_significant',
    signal: 'days_in_host > 30',
    detected: (a.days_in_host ?? 0) > 30,
    value: a.days_in_host ? `${a.days_in_host} días` : undefined,
  });

  // Work permit signals from metadata
  const hasWorkPermitSignal = !!(a.metadata as any)?.work_permit_required || !!(a.metadata as any)?.immigration_status;
  triggers.push({
    id: 'work_permit_signal',
    signal: 'work_permit or immigration signals in metadata',
    detected: hasWorkPermitSignal,
  });

  // Equity + mobility overlap
  const hasEquityOverlap = !!(a.metadata as any)?.equity_grants_active || !!(a.metadata as any)?.stock_options_active;
  triggers.push({
    id: 'equity_mobility_overlap',
    signal: 'equity compensation + mobility overlap',
    detected: hasEquityOverlap,
  });

  return triggers;
}

// ── Support Level Derivation ──

function deriveOverallSupportLevel(
  mobLevel: SupportLevel,
  taxLevel: SupportLevel,
  hasCorridorPack: boolean,
  worstSev: ExtendedSeverity,
): SupportLevel {
  const order: SupportLevel[] = ['out_of_scope', 'supported_with_review', 'supported_production'];
  const worst = (a: SupportLevel, b: SupportLevel): SupportLevel =>
    order.indexOf(a) < order.indexOf(b) ? a : b;

  let level = worst(mobLevel, taxLevel);

  // No pack → at least review
  if (!hasCorridorPack && level === 'supported_production') {
    level = 'supported_with_review';
  }

  // Critical triggers → at least review
  if (worstSev === 'critical_review_required' && level === 'supported_production') {
    level = 'supported_with_review';
  }

  return level;
}

// ── Main Supervisor ──

export function evaluateExpatriateSupervisor(
  assignment: MobilityAssignment,
  packOverride?: CorridorKnowledgePack | null,
): SupervisorResult {
  // 1. Detect activation triggers
  const activationTriggers = detectActivationTriggers(assignment);
  const activated = activationTriggers.some(t => t.detected);

  // 2. Resolve corridor pack — use override if provided, otherwise fall back to TS constants
  const corridorPack = packOverride !== undefined
    ? packOverride
    : getCorridorPack(assignment.home_country_code, assignment.host_country_code);
  const corridorLabel = `${assignment.home_country_code}↔${assignment.host_country_code}`;
  const hasCorridorPack = corridorPack !== null;

  // 3. Compute duration
  const start = new Date(assignment.start_date);
  const end = assignment.end_date ? new Date(assignment.end_date) : new Date();
  const durationMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const daysWorkedAbroad = assignment.days_in_host ?? Math.min(durationMonths * 22, 365);
  const daysInSpain = Math.max(0, 365 - (assignment.days_in_host ?? durationMonths * 30));

  // 4. Run existing mobility classification
  const mobilityInput: MobilityInput = {
    hostCountryCode: assignment.host_country_code,
    homeCountryCode: assignment.home_country_code,
    assignmentType: assignment.assignment_type,
    durationMonths,
    splitPayroll: assignment.split_payroll,
    shadowPayroll: assignment.shadow_payroll,
    peRiskFlag: assignment.pe_risk_flag,
    compensationApproach: assignment.compensation_approach,
    daysInHost: assignment.days_in_host ?? undefined,
  };
  const mobilityClassification = classifyMobilityCase(mobilityInput);

  // 5. Run existing tax impact
  const taxInput: TaxImpactInput = {
    hostCountryCode: assignment.host_country_code,
    annualGrossSalary: assignment.total_monthly_cost ? assignment.total_monthly_cost * 12 : 40000,
    daysWorkedAbroad,
    daysInSpain,
    workEffectivelyAbroad: true,
    beneficiaryIsNonResident: true,
    spouseInSpain: true,
    dependentChildrenInSpain: true,
    mainEconomicActivitiesInSpain: true,
  };
  const taxImpact = evaluateInternationalTaxImpact(taxInput);

  // 6. Build extended review triggers
  const equityMobilityOverlap = activationTriggers.find(t => t.id === 'equity_mobility_overlap')?.detected ?? false;
  const reviewTriggers = buildExtendedReviewTriggers(
    mobilityClassification,
    taxImpact,
    corridorPack,
    {
      equityMobilityOverlap,
      durationMonths,
      splitPayroll: assignment.split_payroll,
      peRiskFlag: assignment.pe_risk_flag,
    },
  );
  const worstTriggerSev = worstSeverity(reviewTriggers);

  // 7. Derive overall support level
  const overallSupportLevel = deriveOverallSupportLevel(
    mobilityClassification.supportLevel,
    taxImpact.supportLevel,
    hasCorridorPack,
    worstTriggerSev,
  );

  // 8. Cross-module impact
  const crossModuleImpact = resolveCrossModuleImpact(
    assignment,
    mobilityClassification,
    taxImpact,
    corridorPack,
    reviewTriggers,
  );

  // 9. Consolidated risk score
  const taxRiskBonus = taxImpact.doubleTaxRisk === 'high' ? 30 : taxImpact.doubleTaxRisk === 'medium' ? 15 : 0;
  const packPenalty = !hasCorridorPack ? 10 : corridorPack!.status !== 'current' ? 5 : 0;
  const consolidatedRiskScore = Math.min(100, Math.round(mobilityClassification.riskScore * 0.5 + taxRiskBonus + packPenalty + (equityMobilityOverlap ? 10 : 0)));

  // 10. Summary
  const supportLabels: Record<SupportLevel, string> = {
    supported_production: 'Soportado — Producción',
    supported_with_review: 'Soportado — Requiere revisión',
    out_of_scope: 'Fuera de alcance',
  };
  const summary = [
    `Corredor ${corridorLabel}`,
    hasCorridorPack ? `Pack v${corridorPack!.version} (${corridorPack!.status})` : 'Sin pack disponible',
    supportLabels[overallSupportLevel],
    `Risk: ${consolidatedRiskScore}/100`,
    `${reviewTriggers.length} trigger(s)`,
  ].join(' · ');

  return {
    activated,
    activationTriggers,
    corridorPack,
    corridorLabel,
    hasCorridorPack,
    mobilityClassification,
    taxImpact,
    reviewTriggers,
    worstTriggerSeverity: worstTriggerSev,
    overallSupportLevel,
    crossModuleImpact,
    consolidatedRiskScore,
    summary,
    evaluatedAt: new Date().toISOString(),
  };
}
