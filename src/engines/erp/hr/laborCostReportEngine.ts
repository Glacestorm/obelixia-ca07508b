/**
 * laborCostReportEngine.ts — V2-RRHH C3
 *
 * Motor PURO de informe determinista de costes laborales por payslip/run.
 *
 * Características obligatorias:
 *   - Sin DB. Sin Supabase. Sin fetch. Sin React. Sin side effects.
 *   - Determinista: misma entrada → misma salida.
 *   - NO sustituye a `laborCostSimulatorEngine` (escenarios/proyecciones).
 *     Este motor produce un INFORME por payslip/run, no una capa de hipótesis.
 *   - Separa explícitamente `stockOptionsCost` y emite `reviewFlags` cuando
 *     el caso requiere validación humana.
 *
 * Reglas de coherencia:
 *   - costeEmpresa = totalDevengos + ssEmpresa + benefits      (tol. 0.02)
 *   - liquido      = totalDevengos − totalDeducciones         (tol. 0.02)
 *
 * NOTA legal: este informe es preparatorio y orientativo. No constituye
 * liquidación oficial ni autoriza presentación ante AEAT/TGSS/SEPE.
 */

import { getESConceptByCode } from './payrollConceptCatalog';
import type { PayslipData } from './payslipEngine';
import type { SSContributionBreakdown } from './ssContributionEngine';

// ── Tipos públicos ─────────────────────────────────────────────────────────

export interface LaborCostReportInput {
  payslip: PayslipData;
  ssContributions?: SSContributionBreakdown | null;
  /**
   * Impacto explícito de Stock Options. Se usa para enriquecer la
   * trazabilidad (review flag + reason) sin alterar los importes ya
   * presentes en el payslip.
   */
  stockOptionsImpact?: {
    amount: number;
    requiresReview: boolean;
    reviewReason?: string;
  };
  /** Beneficios sociales (no incluidos en payslip) — opcional. */
  benefitsAmount?: number;
}

export type LaborCostBucket =
  | 'salary'
  | 'overtime'
  | 'stock'
  | 'benefit'
  | 'absence'
  | 'settlement'
  | 'other';

export interface LaborCostConceptBreakdown {
  code: string;
  label: string;
  amount: number;
  bucket: LaborCostBucket;
}

export interface LaborCostReviewFlag {
  code: string;
  reason: string;
}

export interface LaborCostReport {
  totalDevengos: number;
  totalDeducciones: number;
  liquido: number;
  ssEmpresa: number;
  ssTrabajador: number;
  costeEmpresa: number;
  benefits: number;
  stockOptionsCost: number;
  breakdownByConcept: LaborCostConceptBreakdown[];
  warnings: string[];
  reviewFlags: LaborCostReviewFlag[];
  /** Marca explícita: este informe NO autoriza presentación oficial. */
  isPreparatory: true;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;

const STOCK_CODES = new Set<string>(['ES_STOCK_OPTIONS']);
const OVERTIME_CODES = new Set<string>([
  'ES_HORAS_EXTRA',
  'ES_HORAS_EXTRA_FEST',
  'ES_HORAS_EXTRA_NOCT',
]);
const BENEFIT_CODES = new Set<string>([
  'ES_RETRIB_FLEX_SEGURO',
  'ES_RETRIB_FLEX_SEGURO_EXCESO',
  'ES_RETRIB_FLEX_GUARDERIA',
  'ES_RETRIB_FLEX_FORMACION',
  'ES_RETRIB_FLEX_RESTAURANTE',
  'ES_RETRIB_FLEX_RESTAURANTE_EXCESO',
  'ES_DIETAS',
  'ES_PLUS_TRANSPORTE',
]);
const ABSENCE_CODES = new Set<string>([
  'ES_PERMISO_NO_RETRIBUIDO',
  'ES_IT_CC_EMPRESA',
  'ES_IT_AT_EMPRESA',
]);

function classifyBucket(code: string): LaborCostBucket {
  if (STOCK_CODES.has(code)) return 'stock';
  if (OVERTIME_CODES.has(code)) return 'overtime';
  if (BENEFIT_CODES.has(code)) return 'benefit';
  if (ABSENCE_CODES.has(code)) return 'absence';
  const def = getESConceptByCode(code);
  if (!def) return 'other';
  if (def.is_salary && def.concept_type === 'earning') return 'salary';
  return 'other';
}

// ── Motor principal ────────────────────────────────────────────────────────

export function buildLaborCostReport(input: LaborCostReportInput): LaborCostReport {
  const warnings: string[] = [];
  const reviewFlags: LaborCostReviewFlag[] = [];
  const breakdownByConcept: LaborCostConceptBreakdown[] = [];

  const payslip = input.payslip;
  if (!payslip) {
    throw new Error('laborCostReportEngine: payslip is required');
  }

  let stockOptionsCost = 0;

  for (const d of payslip.devengos ?? []) {
    const def = getESConceptByCode(d.codigo);
    const bucket = classifyBucket(d.codigo);
    breakdownByConcept.push({
      code: d.codigo,
      label: d.concepto,
      amount: r2(d.importe),
      bucket,
    });
    if (bucket === 'stock') {
      stockOptionsCost += d.importe;
    }
    // Review flag desde el catálogo (concepto sensible).
    if (def?.modelo190_review_required) {
      reviewFlags.push({
        code: d.codigo,
        reason:
          def.modelo190_review_reason ??
          `${d.codigo} requiere revisión fiscal antes de presentación oficial`,
      });
    }
  }

  // Review flag adicional explícito (p.ej. caso startup/RSU/phantom).
  if (input.stockOptionsImpact?.requiresReview) {
    reviewFlags.push({
      code: 'ES_STOCK_OPTIONS',
      reason:
        input.stockOptionsImpact.reviewReason ??
        'Stock Options requieren revisión humana (caso sensible: startup/RSU/phantom/expat).',
    });
  }

  // SS empresa / trabajador
  let ssEmpresa = 0;
  let ssTrabajador = 0;
  if (input.ssContributions) {
    ssEmpresa = r2(input.ssContributions.totalEmpresa);
    ssTrabajador = r2(input.ssContributions.totalTrabajador);
  } else {
    ssEmpresa = r2(payslip.bases?.totalCotizacionesEmpresa ?? 0);
    ssTrabajador = r2(payslip.bases?.totalCotizacionesTrabajador ?? 0);
  }

  if (ssEmpresa <= 0) {
    warnings.push('SS empresa = 0: revisar entrada (ssContributions / bases del payslip).');
  }

  const totalDevengos = r2(payslip.totalDevengos ?? 0);
  const totalDeducciones = r2(payslip.totalDeducciones ?? 0);
  const liquido = r2(payslip.liquidoTotal ?? totalDevengos - totalDeducciones);

  // Beneficios: usar suma explícita o detección por bucket.
  const benefitsFromBuckets = breakdownByConcept
    .filter((b) => b.bucket === 'benefit')
    .reduce((s, b) => s + b.amount, 0);
  const benefits = r2(input.benefitsAmount ?? benefitsFromBuckets);

  // Coherencia: liquido = devengos − deducciones (tol 0.02).
  if (Math.abs(liquido - (totalDevengos - totalDeducciones)) > 0.02) {
    warnings.push(
      `Coherencia payslip rota: liquido=${liquido}, devengos−deducciones=${r2(totalDevengos - totalDeducciones)}`,
    );
  }

  // Coste empresa = devengos + ssEmpresa + benefits (los benefits ya están en
  // devengos solo si aparecen como conceptos del payslip; si benefitsAmount
  // viene de fuera del payslip se considera coste adicional).
  // Para evitar doble-conteo, restamos los benefits ya incluidos en devengos.
  const benefitsAlreadyInDevengos = benefitsFromBuckets;
  const additionalBenefits = r2(Math.max(0, benefits - benefitsAlreadyInDevengos));
  const costeEmpresa = r2(totalDevengos + ssEmpresa + additionalBenefits);

  return {
    totalDevengos,
    totalDeducciones,
    liquido,
    ssEmpresa,
    ssTrabajador,
    costeEmpresa,
    benefits,
    stockOptionsCost: r2(stockOptionsCost),
    breakdownByConcept,
    warnings,
    reviewFlags,
    isPreparatory: true,
  };
}

/**
 * Helper: comprueba la regla de coherencia con tolerancia.
 * costeEmpresa ≈ totalDevengos + ssEmpresa + (benefits adicionales).
 */
export function isCostReportCoherent(report: LaborCostReport, tolerance = 0.02): boolean {
  const benefitsAlreadyInDevengos = report.breakdownByConcept
    .filter((b) => b.bucket === 'benefit')
    .reduce((s, b) => s + b.amount, 0);
  const additional = Math.max(0, report.benefits - benefitsAlreadyInDevengos);
  const expected = report.totalDevengos + report.ssEmpresa + additional;
  return Math.abs(report.costeEmpresa - expected) <= tolerance;
}