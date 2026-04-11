/**
 * useExpatriateCase — P1.7B-RA
 * Consolidation hook: merges mobility classification + international tax impact
 * for a given MobilityAssignment.
 */

import { useMemo } from 'react';
import {
  classifyMobilityCase,
  type MobilityClassification,
  type MobilityInput,
  type SupportLevel,
} from '@/engines/erp/hr/internationalMobilityEngine';
import {
  evaluateInternationalTaxImpact,
  type InternationalTaxImpact,
  type TaxImpactInput,
} from '@/engines/erp/hr/internationalTaxEngine';
import { evaluateExpatriateSupervisor, type SupervisorResult } from '@/engines/erp/hr/expatriateSupervisor';
import type { MobilityAssignment, MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';

// ── Types ──

export interface ExpatriateCase {
  mobilityClassification: MobilityClassification;
  taxImpact: InternationalTaxImpact;
  overallSupportLevel: SupportLevel;
  overallSupportLevelLabel: string;
  consolidatedRiskScore: number;
  allReviewTriggers: string[];
  documentCompleteness: {
    required: number;
    present: number;
    missing: string[];
    percentage: number;
  };
  /** G2.1: Supervisor result with corridor intelligence */
  supervisor: SupervisorResult | null;
}

// ── Support Level Labels ──

const SUPPORT_LABELS: Record<SupportLevel, string> = {
  supported_production: 'Soportado — Producción',
  supported_with_review: 'Soportado — Requiere revisión',
  out_of_scope: 'Fuera de alcance',
};

// ── Worst Support Level ──

function worstSupportLevel(a: SupportLevel, b: SupportLevel): SupportLevel {
  const order: SupportLevel[] = ['out_of_scope', 'supported_with_review', 'supported_production'];
  return order.indexOf(a) < order.indexOf(b) ? a : b;
}

// ── Hook ──

export function useExpatriateCase(
  assignment: MobilityAssignment | null,
  documents: MobilityDocument[] = [],
): ExpatriateCase | null {
  return useMemo(() => {
    if (!assignment) return null;

    // Compute duration in months
    const start = new Date(assignment.start_date);
    const end = assignment.end_date ? new Date(assignment.end_date) : new Date();
    const durationMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    // Days worked abroad (estimate from days_in_host or duration)
    const daysWorkedAbroad = assignment.days_in_host ?? Math.min(durationMonths * 22, 365); // ~22 working days/month
    const daysInSpain = Math.max(0, 365 - (assignment.days_in_host ?? durationMonths * 30));

    // 1. Mobility classification
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

    // 2. Tax impact
    const taxInput: TaxImpactInput = {
      hostCountryCode: assignment.host_country_code,
      annualGrossSalary: assignment.total_monthly_cost ? assignment.total_monthly_cost * 12 : 40000, // fallback
      daysWorkedAbroad,
      daysInSpain,
      workEffectivelyAbroad: true, // assume effective work abroad for international assignments
      beneficiaryIsNonResident: true, // host entity is typically non-ES resident
      spouseInSpain: true, // conservative default
      dependentChildrenInSpain: true,
      mainEconomicActivitiesInSpain: true,
    };
    const taxImpact = evaluateInternationalTaxImpact(taxInput);

    // 3. Overall support level (worst of mobility + tax)
    const overallSupportLevel = worstSupportLevel(
      mobilityClassification.supportLevel,
      taxImpact.supportLevel,
    );

    // 4. Consolidated risk
    const consolidatedRiskScore = Math.min(100, Math.round(
      mobilityClassification.riskScore * 0.6 + (taxImpact.doubleTaxRisk === 'high' ? 40 : taxImpact.doubleTaxRisk === 'medium' ? 20 : 5) * 0.4
    ));

    // 5. All review triggers
    const allReviewTriggers = [
      ...mobilityClassification.reviewTriggers.map(t => t.label),
      ...taxImpact.mandatoryReviewPoints,
    ];

    // 6. Document completeness
    const requiredDocs = mobilityClassification.documentChecklist.filter(d => d.required);
    const presentDocTypes = new Set(documents.map(d => d.document_type));
    const missing = requiredDocs.filter(d => !presentDocTypes.has(d.documentType as any)).map(d => d.label);

    // 7. G2.1: Supervisor evaluation
    let supervisor: SupervisorResult | null = null;
    try {
      supervisor = evaluateExpatriateSupervisor(assignment);
    } catch {
      // Supervisor is additive — don't break existing flow
    }

    return {
      mobilityClassification,
      taxImpact,
      overallSupportLevel: supervisor?.overallSupportLevel ?? overallSupportLevel,
      overallSupportLevelLabel: SUPPORT_LABELS[supervisor?.overallSupportLevel ?? overallSupportLevel],
      consolidatedRiskScore: supervisor?.consolidatedRiskScore ?? consolidatedRiskScore,
      allReviewTriggers: supervisor
        ? supervisor.reviewTriggers.map(t => t.reason)
        : allReviewTriggers,
      documentCompleteness: {
        required: requiredDocs.length,
        present: requiredDocs.length - missing.length,
        missing,
        percentage: requiredDocs.length > 0 ? Math.round(((requiredDocs.length - missing.length) / requiredDocs.length) * 100) : 100,
      },
      supervisor,
    };
  }, [assignment, documents]);
}
