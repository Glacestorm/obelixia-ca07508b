/**
 * modelo190PipelineEngine.ts — V2-RRHH-PINST
 * Pure logic engine for Model 190 annual perceptor aggregation.
 *
 * Aggregates payroll data across 12 months to build perceptor lines
 * with NIF, claves de percepción, and quarterly breakdown.
 *
 * No side effects. Deterministic functions only.
 */

import type { Modelo190LineItem } from './fiscalMonthlyExpedientEngine';
import { getESConceptByCode } from './payrollConceptCatalog';

// ── Types ──

export interface Modelo190PerceptorInput {
  employeeId: string;
  employeeName: string;
  nif: string;
  monthlyData: MonthlyPerceptorData[];
  familySituationChanges?: FamilySituationChange[];
  irregularIncome?: IrregularIncomeEntry[];
  regionalDeductions?: RegionalDeductionEntry[];
  // ── C3 · Trazabilidad por concepto (no destructivo) ──
  /**
   * Desglose anual por concepto retributivo. Permite identificar conceptos
   * sensibles (Stock Options, RSU, etc.) que requieren revisión fiscal antes
   * de presentación oficial.
   */
  conceptBreakdown?: ConceptBreakdownEntry[];
}

export interface ConceptBreakdownEntry {
  /** Código del catálogo (p.ej. ES_STOCK_OPTIONS). */
  conceptCode: string;
  /** Importe anual agregado de este concepto. */
  amount: number;
  /** Importe sujeto a IRPF de este concepto (opcional). */
  taxableAmount?: number;
}

export interface MonthlyPerceptorData {
  month: number; // 1-12
  grossSalary: number;
  baseIRPF: number;
  retencionIRPF: number;
  tipoIRPF: number;
  irpfAvailable: boolean;
  payrollClosed: boolean;
  perceptionsInKind: number;
  paymentsOnAccount: number;
}

export interface FamilySituationChange {
  effectiveMonth: number;
  previousSituation: number;
  newSituation: number;
  reason: string;
  documented: boolean;
}

export interface IrregularIncomeEntry {
  month: number;
  amount: number;
  generationYears: number;
  rule30Applied: boolean;
  exemptAmount: number;
  description: string;
}

export interface RegionalDeductionEntry {
  comunidadAutonoma: string;
  deductionCode: string;
  deductionLabel: string;
  amount: number;
  documented: boolean;
}

export interface Modelo190AggregationResult {
  perceptorLines: Modelo190LineItem[];
  qualityReport: Modelo190QualityReport;
  quarterlyTotals: QuarterlyTotals;
  crossCheckData: CrossCheckData;
  regulatoryEdgeCases: RegulatoryEdgeCaseSummary;
}

export interface Modelo190QualityReport {
  totalPerceptors: number;
  perceptorsWithNIF: number;
  perceptorsWithFullData: number;
  perceptorsWithEstimation: number;
  perceptorsWithZeroRetention: number;
  zeroRetentionJustified: number;
  dataQualityScore: number; // 0-100
  issues: Array<{
    employeeId: string;
    employeeName: string;
    issue: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

export interface QuarterlyTotals {
  q1: { percepciones: number; retenciones: number };
  q2: { percepciones: number; retenciones: number };
  q3: { percepciones: number; retenciones: number };
  q4: { percepciones: number; retenciones: number };
}

export interface CrossCheckData {
  totalPercepciones190: number;
  totalRetenciones190: number;
  sumRetenciones111: number;
  difference: number;
  isConsistent: boolean;
}

export interface RegulatoryEdgeCaseSummary {
  familySituationChanges: number;
  irregularIncomeEntries: number;
  regionalDeductions: number;
  zeroRetentionCases: number;
  allDocumented: boolean;
  undocumentedItems: string[];
}

// ── Constants ──

const r2 = (n: number) => Math.round(n * 100) / 100;

const CLAVE_LABELS: Record<string, string> = {
  A: 'Rendimientos del trabajo: empleados por cuenta ajena',
  B: 'Rendimientos del trabajo: pensionistas',
  G: 'Rendimientos de actividades profesionales',
};

// ── Core Aggregation ──

export function aggregatePerceptorsForModelo190(
  inputs: Modelo190PerceptorInput[],
  modelo111Retentions?: number[],
): Modelo190AggregationResult {
  const issues: Modelo190QualityReport['issues'] = [];
  const perceptorLines: Modelo190LineItem[] = [];
  const quarterlyTotals: QuarterlyTotals = {
    q1: { percepciones: 0, retenciones: 0 },
    q2: { percepciones: 0, retenciones: 0 },
    q3: { percepciones: 0, retenciones: 0 },
    q4: { percepciones: 0, retenciones: 0 },
  };

  let perceptorsWithNIF = 0;
  let perceptorsWithFullData = 0;
  let perceptorsWithEstimation = 0;
  let perceptorsWithZeroRetention = 0;
  let zeroRetentionJustified = 0;
  let totalFamilyChanges = 0;
  let totalIrregularIncome = 0;
  let totalRegionalDeductions = 0;
  const undocumentedItems: string[] = [];

  for (const input of inputs) {
    const hasNIF = !!input.nif && input.nif.trim().length > 0;
    if (hasNIF) perceptorsWithNIF++;

    if (!hasNIF) {
      issues.push({
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        issue: 'NIF no disponible — obligatorio para Modelo 190',
        severity: 'error',
      });
    }

    // Aggregate annual figures
    let totalPercepciones = 0;
    let totalRetenciones = 0;
    let totalEspecie = 0;
    let totalIngresosCuenta = 0;
    let hasEstimation = false;
    let allMonthsAvailable = true;

    const q = { q1: { p: 0, r: 0 }, q2: { p: 0, r: 0 }, q3: { p: 0, r: 0 }, q4: { p: 0, r: 0 } };

    for (const m of input.monthlyData) {
      if (!m.irpfAvailable) {
        hasEstimation = true;
        allMonthsAvailable = false;
      }

      const percepciones = m.baseIRPF > 0 ? m.baseIRPF : m.grossSalary;
      totalPercepciones += percepciones;
      totalRetenciones += m.retencionIRPF;
      totalEspecie += m.perceptionsInKind;
      totalIngresosCuenta += m.paymentsOnAccount;

      const quarter = Math.ceil(m.month / 3) as 1 | 2 | 3 | 4;
      const qKey = `q${quarter}` as keyof typeof q;
      q[qKey].p += percepciones;
      q[qKey].r += m.retencionIRPF;
    }

    // Quality flags
    if (allMonthsAvailable && input.monthlyData.length === 12) perceptorsWithFullData++;
    if (hasEstimation) perceptorsWithEstimation++;

    // Zero retention check
    if (totalRetenciones === 0) {
      perceptorsWithZeroRetention++;
      const hasJustification = input.monthlyData.length > 0 && input.monthlyData.some(m => m.grossSalary > 0);
      if (hasJustification) {
        // Check if likely below threshold
        const annualGross = input.monthlyData.reduce((s, m) => s + m.grossSalary, 0);
        if (annualGross < 15000) {
          zeroRetentionJustified++;
        } else {
          issues.push({
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            issue: `Retención 0% con bruto anual ${r2(annualGross)}€ — revisar justificación`,
            severity: 'warning',
          });
        }
      }
    }

    // Family situation changes
    if (input.familySituationChanges && input.familySituationChanges.length > 0) {
      totalFamilyChanges += input.familySituationChanges.length;
      for (const change of input.familySituationChanges) {
        if (!change.documented) {
          undocumentedItems.push(`${input.employeeName}: cambio situación familiar mes ${change.effectiveMonth}`);
        }
        issues.push({
          employeeId: input.employeeId,
          employeeName: input.employeeName,
          issue: `Cambio situación familiar en mes ${change.effectiveMonth}: ${change.previousSituation} → ${change.newSituation}`,
          severity: change.documented ? 'info' : 'warning',
        });
      }
    }

    // Irregular income (rule 30%)
    if (input.irregularIncome && input.irregularIncome.length > 0) {
      totalIrregularIncome += input.irregularIncome.length;
      for (const entry of input.irregularIncome) {
        if (entry.rule30Applied) {
          totalPercepciones -= entry.exemptAmount; // Adjust percepciones for exempt part
          issues.push({
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            issue: `Renta irregular mes ${entry.month}: ${r2(entry.amount)}€, exenta ${r2(entry.exemptAmount)}€ (regla 30%)`,
            severity: 'info',
          });
        }
      }
    }

    // Regional deductions
    if (input.regionalDeductions && input.regionalDeductions.length > 0) {
      totalRegionalDeductions += input.regionalDeductions.length;
      for (const ded of input.regionalDeductions) {
        if (!ded.documented) {
          undocumentedItems.push(`${input.employeeName}: deducción autonómica ${ded.deductionLabel}`);
        }
      }
    }

    // ── C3 · Determinar clave/subclave con resolución honesta ──
    // Reglas:
    //  1. Si hay un único concepto en breakdown con clave/subclave resuelta en
    //     el catálogo, se usa esa.
    //  2. Si cualquier concepto del breakdown está marcado
    //     `modelo190_review_required` o `pending_review`, la línea queda
    //     marcada para revisión humana y bloqueada para envío oficial.
    //  3. En ausencia de información: A/01 como FALLBACK técnico, pero
    //     SIEMPRE marcado como `clave_is_fallback` (no silencioso).
    const breakdown = input.conceptBreakdown ?? [];
    let clave = 'A';
    let subclave = '01';
    let claveIsFallback = true;
    let requiresHumanReview = false;
    const reviewReasons: string[] = [];
    let fiscalStatus: 'resolved' | 'pending_review' | 'out_of_scope' = 'pending_review';
    const conceptCodes: string[] = [];

    for (const entry of breakdown) {
      conceptCodes.push(entry.conceptCode);
      const def = getESConceptByCode(entry.conceptCode);
      if (!def) continue;
      if (def.modelo190_review_required) {
        requiresHumanReview = true;
        if (def.modelo190_review_reason) {
          reviewReasons.push(`${entry.conceptCode}: ${def.modelo190_review_reason}`);
        }
      }
      if (def.fiscal_classification_status === 'out_of_scope') {
        fiscalStatus = 'out_of_scope';
        requiresHumanReview = true;
      }
      if (def.modelo190_clave && def.modelo190_subclave && !def.modelo190_review_required) {
        // Solo se considera resuelta si el concepto trae clave/subclave Y NO
        // exige revisión.
        clave = def.modelo190_clave;
        subclave = def.modelo190_subclave;
        claveIsFallback = false;
        if (fiscalStatus !== 'out_of_scope') {
          fiscalStatus = 'resolved';
        }
      }
    }

    // Si no hay breakdown alguno, A/01 sigue siendo fallback (no resuelto).
    if (breakdown.length === 0) {
      claveIsFallback = true;
      fiscalStatus = 'pending_review';
    }

    // Si hay revisión exigida, sobreescribe estado y bloquea envío oficial.
    const officialSubmissionBlocked = requiresHumanReview || claveIsFallback || fiscalStatus !== 'resolved';
    if (requiresHumanReview) {
      fiscalStatus = 'pending_review';
    }

    if (requiresHumanReview) {
      // Cuenta como estimación a efectos de calidad.
      perceptorsWithEstimation++;
      issues.push({
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        issue: `Modelo 190: requiere revisión fiscal humana — ${reviewReasons.join(' | ') || 'concepto sensible detectado'}`,
        severity: 'warning',
      });
    } else if (claveIsFallback && breakdown.length > 0) {
      issues.push({
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        issue: 'Modelo 190: clave/subclave A/01 usada como fallback técnico — no presentar oficialmente sin validar.',
        severity: 'warning',
      });
    }

    // Quarterly aggregation
    quarterlyTotals.q1.percepciones += r2(q.q1.p);
    quarterlyTotals.q1.retenciones += r2(q.q1.r);
    quarterlyTotals.q2.percepciones += r2(q.q2.p);
    quarterlyTotals.q2.retenciones += r2(q.q2.r);
    quarterlyTotals.q3.percepciones += r2(q.q3.p);
    quarterlyTotals.q3.retenciones += r2(q.q3.r);
    quarterlyTotals.q4.percepciones += r2(q.q4.p);
    quarterlyTotals.q4.retenciones += r2(q.q4.r);

    perceptorLines.push({
      employee_id: input.employeeId,
      employee_name: input.employeeName,
      nif: input.nif,
      clave_percepcion: clave,
      subclave,
      percepciones_integras: r2(totalPercepciones),
      retenciones_practicadas: r2(totalRetenciones),
      percepciones_en_especie: r2(totalEspecie),
      ingresos_a_cuenta: r2(totalIngresosCuenta),
      // C3
      requires_human_review: requiresHumanReview,
      review_reason: reviewReasons.length > 0 ? reviewReasons.join(' | ') : undefined,
      concept_codes: conceptCodes.length > 0 ? conceptCodes : undefined,
      fiscal_classification_status: fiscalStatus,
      official_submission_blocked: officialSubmissionBlocked,
      clave_is_fallback: claveIsFallback,
    });
  }

  // Cross-check with 111s
  const totalRetenciones190 = r2(perceptorLines.reduce((s, l) => s + l.retenciones_practicadas, 0));
  const totalPercepciones190 = r2(perceptorLines.reduce((s, l) => s + l.percepciones_integras, 0));
  const sum111 = modelo111Retentions
    ? r2(modelo111Retentions.reduce((s, r) => s + r, 0))
    : 0;
  const diff = r2(Math.abs(totalRetenciones190 - sum111));

  const crossCheckData: CrossCheckData = {
    totalPercepciones190,
    totalRetenciones190,
    sumRetenciones111: sum111,
    difference: diff,
    isConsistent: modelo111Retentions ? diff < 1 : false,
  };

  // Quality score
  const totalCount = inputs.length;
  const nifScore = totalCount > 0 ? (perceptorsWithNIF / totalCount) * 40 : 0;
  const fullDataScore = totalCount > 0 ? (perceptorsWithFullData / totalCount) * 30 : 0;
  const estimationPenalty = totalCount > 0 ? (perceptorsWithEstimation / totalCount) * 20 : 0;
  const crossCheckScore = crossCheckData.isConsistent ? 10 : 0;
  const dataQualityScore = Math.round(nifScore + fullDataScore - estimationPenalty + crossCheckScore);

  return {
    perceptorLines,
    qualityReport: {
      totalPerceptors: totalCount,
      perceptorsWithNIF,
      perceptorsWithFullData,
      perceptorsWithEstimation,
      perceptorsWithZeroRetention,
      zeroRetentionJustified,
      dataQualityScore: Math.max(0, Math.min(100, dataQualityScore)),
      issues,
    },
    quarterlyTotals,
    crossCheckData,
    regulatoryEdgeCases: {
      familySituationChanges: totalFamilyChanges,
      irregularIncomeEntries: totalIrregularIncome,
      regionalDeductions: totalRegionalDeductions,
      zeroRetentionCases: perceptorsWithZeroRetention,
      allDocumented: undocumentedItems.length === 0,
      undocumentedItems,
    },
  };
}

// ── Validation for 190 pipeline readiness ──

export interface Modelo190PipelineReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  perceptorCount: number;
  allHaveNIF: boolean;
  quarterly111Count: number;
  monthsCovered: number;
  dataQualityScore: number;
}

export function checkModelo190PipelineReadiness(params: {
  perceptorCount: number;
  allHaveNIF: boolean;
  quarterly111Count: number;
  monthsCovered: number;
  dataQualityScore: number;
}): Modelo190PipelineReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (params.perceptorCount === 0) blockers.push('No hay perceptores disponibles');
  if (!params.allHaveNIF) blockers.push('Hay perceptores sin NIF');
  if (params.quarterly111Count < 4) warnings.push(`Solo ${params.quarterly111Count} de 4 Modelos 111 trimestrales`);
  if (params.monthsCovered < 12) warnings.push(`Solo ${params.monthsCovered} de 12 meses con datos`);
  if (params.dataQualityScore < 50) warnings.push(`Calidad de datos baja: ${params.dataQualityScore}%`);

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    ...params,
  };
}
