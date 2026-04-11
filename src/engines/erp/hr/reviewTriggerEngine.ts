/**
 * reviewTriggerEngine.ts — G2.1
 * Extended review trigger engine with 4 severity levels.
 * Produces unified triggers from mobility classification, tax impact, and corridor pack.
 */

import type { MobilityClassification, ReviewTrigger } from './internationalMobilityEngine';
import type { InternationalTaxImpact } from './internationalTaxEngine';
import type { CorridorKnowledgePack, CorridorReviewTrigger } from './corridorKnowledgePacks';

// ── Types ──

export type ExtendedSeverity = 'info' | 'warning' | 'review_required' | 'critical_review_required';

export interface ExtendedReviewTrigger {
  id: string;
  severity: ExtendedSeverity;
  category: string;
  reason: string;
  affectedModule: string;
  suggestedAction: string;
  evidenceRequired: boolean;
  source: 'mobility_engine' | 'tax_engine' | 'corridor_pack' | 'supervisor';
}

// ── Severity mapping from existing engines ──

function mapMobilitySeverity(sev: ReviewTrigger['severity']): ExtendedSeverity {
  switch (sev) {
    case 'critical': return 'critical_review_required';
    case 'high': return 'review_required';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'info';
  }
}

// ── Core ──

export function buildExtendedReviewTriggers(
  mobilityClassification: MobilityClassification,
  taxImpact: InternationalTaxImpact,
  corridorPack: CorridorKnowledgePack | null,
  extraFlags?: {
    equityMobilityOverlap?: boolean;
    durationMonths?: number;
    splitPayroll?: boolean;
    peRiskFlag?: boolean;
  },
): ExtendedReviewTrigger[] {
  const triggers: ExtendedReviewTrigger[] = [];

  // 1. From mobility engine
  for (const t of mobilityClassification.reviewTriggers) {
    triggers.push({
      id: `mob-${t.id}`,
      severity: mapMobilitySeverity(t.severity),
      category: t.category,
      reason: t.label,
      affectedModule: t.category === 'tax' ? 'fiscal' : t.category === 'legal' ? 'legal' : 'hr',
      suggestedAction: t.requiredAction || t.description,
      evidenceRequired: t.severity === 'critical' || t.severity === 'high',
      source: 'mobility_engine',
    });
  }

  // 2. From tax engine
  for (const point of taxImpact.mandatoryReviewPoints) {
    triggers.push({
      id: `tax-${point.slice(0, 20).replace(/\s/g, '_')}`,
      severity: 'review_required',
      category: 'tax',
      reason: point,
      affectedModule: 'fiscal',
      suggestedAction: point,
      evidenceRequired: true,
      source: 'tax_engine',
    });
  }

  if (taxImpact.doubleTaxRisk === 'high') {
    triggers.push({
      id: 'tax-double-high',
      severity: 'critical_review_required',
      category: 'tax',
      reason: 'Riesgo alto de doble imposición',
      affectedModule: 'fiscal',
      suggestedAction: 'Derivar a especialista fiscal internacional para evaluación CDI',
      evidenceRequired: true,
      source: 'tax_engine',
    });
  }

  // 3. From corridor pack
  if (corridorPack) {
    for (const ct of corridorPack.reviewTriggers) {
      triggers.push({
        id: `cor-${ct.id}`,
        severity: ct.severity,
        category: ct.affectedModule,
        reason: ct.reason,
        affectedModule: ct.affectedModule,
        suggestedAction: ct.suggestedAction,
        evidenceRequired: ct.evidenceRequired,
        source: 'corridor_pack',
      });
    }

    if (corridorPack.status === 'stale' || corridorPack.status === 'review_required') {
      triggers.push({
        id: 'cor-pack-stale',
        severity: 'warning',
        category: 'compliance',
        reason: `Knowledge pack ${corridorPack.id} está ${corridorPack.status} — verificar vigencia`,
        affectedModule: 'ia_center',
        suggestedAction: 'Revisar y actualizar knowledge pack del corredor',
        evidenceRequired: false,
        source: 'corridor_pack',
      });
    }
  }

  // 4. Supervisor-level triggers
  if (extraFlags?.equityMobilityOverlap) {
    triggers.push({
      id: 'sup-equity-overlap',
      severity: 'review_required',
      category: 'tax',
      reason: 'Overlap movilidad + equity compensation — impacto fiscal/materialidad potencial',
      affectedModule: 'fiscal',
      suggestedAction: 'Evaluar impacto fiscal conjunto de equity + asignación internacional',
      evidenceRequired: true,
      source: 'supervisor',
    });
  }

  if (extraFlags?.durationMonths && extraFlags.durationMonths > 24) {
    triggers.push({
      id: 'sup-duration-24m',
      severity: 'review_required',
      category: 'ss',
      reason: `Duración >24 meses (${extraFlags.durationMonths}m) — posible cambio de cobertura SS`,
      affectedModule: 'hr',
      suggestedAction: 'Verificar extensión A1/certificado o transición a régimen local',
      evidenceRequired: true,
      source: 'supervisor',
    });
  }

  if (extraFlags?.splitPayroll) {
    triggers.push({
      id: 'sup-split-payroll',
      severity: 'warning',
      category: 'payroll',
      reason: 'Split payroll activo — requiere coordinación inter-jurisdicción',
      affectedModule: 'fiscal',
      suggestedAction: 'Verificar consistencia de retenciones entre jurisdicciones',
      evidenceRequired: false,
      source: 'supervisor',
    });
  }

  if (extraFlags?.peRiskFlag) {
    triggers.push({
      id: 'sup-pe-risk',
      severity: 'critical_review_required',
      category: 'legal',
      reason: 'PE risk flag activo — riesgo de establecimiento permanente',
      affectedModule: 'legal',
      suggestedAction: 'Derivar a asesor legal para evaluación de PE',
      evidenceRequired: true,
      source: 'supervisor',
    });
  }

  return triggers;
}

/**
 * Get the worst severity from a list of triggers.
 */
export function worstSeverity(triggers: ExtendedReviewTrigger[]): ExtendedSeverity {
  const order: ExtendedSeverity[] = ['critical_review_required', 'review_required', 'warning', 'info'];
  for (const sev of order) {
    if (triggers.some(t => t.severity === sev)) return sev;
  }
  return 'info';
}
