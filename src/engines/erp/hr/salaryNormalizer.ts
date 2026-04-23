/**
 * salaryNormalizer — S9.21o
 *
 * Normaliza el salario pactado a una base mensual equivalente con jerarquía
 * estricta de fuentes y modo seguro obligatorio cuando la unidad o el divisor
 * no son determinables con confianza ≥ MEDIA.
 *
 * Prohibido reinterpretar automáticamente un salario ambiguo.
 * Cualquier ambigüedad → safeMode = true, mejoraVoluntaria = 0, traza persistida.
 *
 * Casuística cubierta (tests manuales C1-C9 en docs S9.21o):
 *   C1: base=2000, annual=null, agreement.extra=2 → mensual, div=14, ALTA
 *   C2: annual=42000, base=null, agreement.extra=2 → anual, div=14, ALTA
 *   C3: annual=42000, base=3500 (coherente div=12) → mensual, ALTA
 *   C4: pactado < mínimo convenio → mensual, ALTA, mejora=0 (engine)
 *   C5: sin tabla salarial → mensual, MEDIA, no_agreement
 *   C6: C2 + factor prorrateo 0,5 → ALTA
 *   C7: base=42000, annual=null, sin convenio → safeMode (B4)
 *   C8: base=42000, annual=42000 (incoherentes) → safeMode (A4)
 *   C9: base=null, annual=null → safeMode (A5)
 *
 * S9.21p — Paso 0: source of truth contractual.
 *   Antes de la jerarquía A/B se evalúa `diagnoseContractParametrization`.
 *   - Si status='complete' → NIVEL 1 contract_explicit (sin heurística).
 *   - Si status='incoherent' && severity='structural' → safeMode obligatorio
 *     con resolutionPath='incoherent_structural_safeMode'. NO degrada a legacy.
 *   - Si status='pending' o 'incoherent' soft → NIVEL 3 legacy (flujo A/B
 *     original con A3 heurístico como red de seguridad).
 */

import {
  diagnoseContractParametrization,
  type ParametrizationDiagnostic,
} from './contractSalaryParametrization';

export type SalaryUnit = 'mensual' | 'anual' | 'ambigua' | 'no_informada';
export type SalaryConfidence = 'alta' | 'media' | 'baja';
export type DivisorSource = 'agreement_field' | 'table_total' | 'table_annual' | 'none';
export type AgreementResolutionStatus = 'computed' | 'manual_review_required' | 'no_agreement';

/**
 * S9.21p — Camino de resolución usado por el normalizer.
 *   - contract_explicit: NIVEL 1, datos contractuales completos y coherentes.
 *   - contract_partial_agreement_aided: NIVEL 2, contrato parcial completado por convenio.
 *   - legacy_resolution: NIVEL 3, flujo A/B histórico (incluye A3 heurístico).
 *   - incoherent_structural_safeMode: incoherencia estructural detectada → safeMode.
 */
export type ResolutionPath =
  | 'contract_explicit'
  | 'contract_partial_agreement_aided'
  | 'legacy_resolution'
  | 'incoherent_structural_safeMode';

export interface NormalizerContractInput {
  base_salary?: number | null;
  annual_salary?: number | null;
  /** S9.21p — unidad salarial explícita pactada en contrato. */
  salary_amount_unit?: 'monthly' | 'annual' | null;
  /** S9.21p — número de pagas anuales pactadas en contrato. */
  salary_periods_per_year?: number | null;
  /** S9.21p — true si las pagas extra están prorrateadas en mensualidad. */
  extra_payments_prorated?: boolean | null;
}

export interface NormalizerAgreementInput {
  extra_payments?: number | null;
}

export interface NormalizerSalaryTableInput {
  base_salary_monthly?: number | null;
  base_salary_annual?: number | null;
  total_annual_compensation?: number | null;
}

export interface NormalizeArgs {
  contract: NormalizerContractInput | null | undefined;
  agreement?: NormalizerAgreementInput | null;
  salaryTable?: NormalizerSalaryTableInput | null;
  factorProrrateo?: number;
  /** Mínimo convenio mensual ya prorrateado (informativo, no se usa para A/B). */
  totalMinimoConvenioMensual?: number;
}

export interface NormalizeResult {
  /** Salario mensual equivalente (sin prorratear). 0 si safeMode. */
  mensualEquivalente: number;
  /** Mensual equivalente × factorProrrateo. 0 si safeMode. */
  mensualEquivalentePeriodo: number;
  /** Divisor utilizado (nº pagas anuales). null si no aplica / no determinable. */
  divisor: number | null;
  divisorSource: DivisorSource;
  unidadDetectada: SalaryUnit;
  confianza: SalaryConfidence;
  safeMode: boolean;
  safeModeReason?: string;
  agreementResolutionStatus: AgreementResolutionStatus;
  /** Pasos legibles para auditoría (paso A, paso B, decisiones). */
  trace: string[];
  /** S9.21p — camino de resolución elegido por la jerarquía. */
  resolutionPath: ResolutionPath;
  /** S9.21p — diagnóstico contractual usado en Paso 0. */
  parametrizationDiagnostic: ParametrizationDiagnostic;
}

const MIN_DIVISOR = 12;
const MAX_DIVISOR = 16;
const COHERENCE_TOLERANCE = 0.05; // 5% para regla A2
/**
 * S9.21o-H2 — WORKAROUND HEURÍSTICO TEMPORAL (deuda técnica registrada).
 *
 * Umbral anti-misinterpretación para la regla A3 (base>0 y annual=null/0
 * sin convenio resoluble). Sin un campo explícito de unidad/periodicidad
 * salarial en el contrato, no es posible distinguir formalmente entre:
 *   - una mensualidad alta legítima (caso raro pero válido), y
 *   - un anual mal etiquetado como base_salary (caso C7: 42.000€).
 *
 * Este umbral aplica EXCLUSIVAMENTE cuando se cumplen las tres condiciones:
 *   (1) base_salary > A3_MONTHLY_PLAUSIBILITY_MAX
 *   (2) annual_salary null o 0
 *   (3) divisor NO determinable por convenio ni tabla salarial
 * En ese caso se activa safeMode → manual_review_required, sin reinterpretar.
 *
 * LIMITACIÓN FUNCIONAL CONOCIDA:
 *   Mensualidades reales superiores a 15.000€ sin convenio cargado (alta
 *   dirección, expatriados sin tabla) caerán a revisión manual aunque sean
 *   correctas. Es el comportamiento deseado mientras no exista campo de
 *   unidad explícita: preferimos falso positivo (revisión) a falso negativo
 *   (cálculo erróneo de mejora voluntaria sobre un anual leído como mensual).
 *
 * DEUDA TÉCNICA — futura formalización (fuera de S9.21o):
 *   Añadir a `hr_es_employee_contracts` un campo
 *     base_salary_unit: enum('monthly','annual','daily','hourly')
 *   y opcionalmente `base_salary_periodicity` (nº pagas pactadas a nivel
 *   contrato, prevalente sobre convenio). Con eso se elimina este umbral
 *   y A3 deja de necesitar heurística: la unidad pasa a ser explícita.
 *
 * Mientras tanto, este valor se mantiene como umbral conservador y debe
 * revisarse junto con cualquier cambio en la regla A3.
 */
const A3_MONTHLY_PLAUSIBILITY_MAX = 15000;

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampDivisor(d: number): number | null {
  if (!Number.isFinite(d)) return null;
  const r = Math.round(d);
  if (r < MIN_DIVISOR || r > MAX_DIVISOR) return null;
  return r;
}

/**
 * Paso B — Determina divisor a partir de las fuentes disponibles.
 * Devuelve null si no es determinable.
 */
function resolveDivisor(
  agreement: NormalizerAgreementInput | null | undefined,
  table: NormalizerSalaryTableInput | null | undefined,
  trace: string[],
): { divisor: number | null; source: DivisorSource } {
  // B1 — agreement.extra_payments
  if (agreement && agreement.extra_payments !== null && agreement.extra_payments !== undefined) {
    const extra = num(agreement.extra_payments);
    if (extra >= 0 && extra <= 4) {
      const d = 12 + extra;
      trace.push(`[B1] agreement.extra_payments=${extra} → divisor=${d}`);
      return { divisor: d, source: 'agreement_field' };
    }
  }

  // B2 — total_annual_compensation / base_salary_monthly
  const total = num(table?.total_annual_compensation);
  const monthly = num(table?.base_salary_monthly);
  if (total > 0 && monthly > 0) {
    const raw = total / monthly;
    const d = clampDivisor(raw);
    if (d) {
      trace.push(`[B2] table.total/monthly=${raw.toFixed(2)} → divisor=${d}`);
      return { divisor: d, source: 'table_total' };
    }
  }

  // B3 — base_salary_annual / base_salary_monthly
  const annual = num(table?.base_salary_annual);
  if (annual > 0 && monthly > 0) {
    const raw = annual / monthly;
    const d = clampDivisor(raw);
    if (d) {
      trace.push(`[B3] table.annual/monthly=${raw.toFixed(2)} → divisor=${d}`);
      return { divisor: d, source: 'table_annual' };
    }
  }

  trace.push('[B*] divisor no determinable desde convenio ni tabla');
  return { divisor: null, source: 'none' };
}

/**
 * Determina si base × divisor coincide con annual dentro de la tolerancia (A2).
 */
function isCoherent(base: number, annual: number, divisor: number): boolean {
  if (annual <= 0) return false;
  const diff = Math.abs(base * divisor - annual) / annual;
  return diff <= COHERENCE_TOLERANCE;
}

function safe(
  reason: string,
  unidad: SalaryUnit,
  divisor: number | null,
  divisorSource: DivisorSource,
  trace: string[],
  diag: ParametrizationDiagnostic,
  resolutionPath: ResolutionPath = 'legacy_resolution',
  status: AgreementResolutionStatus = 'manual_review_required',
): NormalizeResult {
  trace.push(`[SAFE] ${reason}`);
  return {
    mensualEquivalente: 0,
    mensualEquivalentePeriodo: 0,
    divisor,
    divisorSource,
    unidadDetectada: unidad,
    confianza: 'baja',
    safeMode: true,
    safeModeReason: reason,
    agreementResolutionStatus: status,
    trace,
    resolutionPath,
    parametrizationDiagnostic: diag,
  };
}

/**
 * Normaliza el salario pactado a mensual equivalente con jerarquía estricta.
 * Ver JSDoc del módulo para casuística C1-C9.
 */
export function normalizeSalarioPactadoToMonthly(args: NormalizeArgs): NormalizeResult {
  const factorProrrateo = args.factorProrrateo ?? 1;
  const trace: string[] = [];
  const contract = args.contract ?? {};
  const base = num(contract.base_salary);
  const annual = num(contract.annual_salary);
  const hasBase = base > 0;
  const hasAnnual = annual > 0;
  const hasAgreement = !!args.agreement || !!args.salaryTable;

  trace.push(
    `[INPUT] base_salary=${hasBase ? base : 'null/0'}, annual_salary=${hasAnnual ? annual : 'null/0'}, hasAgreement=${hasAgreement}, factor=${factorProrrateo}`,
  );

  // ── S9.21p · Paso 0 — Source of truth contractual ──
  const diag = diagnoseContractParametrization({
    salary_amount_unit: contract.salary_amount_unit ?? null,
    salary_periods_per_year: contract.salary_periods_per_year ?? null,
    extra_payments_prorated: contract.extra_payments_prorated ?? null,
    base_salary: contract.base_salary ?? null,
    annual_salary: contract.annual_salary ?? null,
  });
  trace.push(`[S0] diagnostic.status=${diag.status}${diag.incoherenceSeverity ? ` severity=${diag.incoherenceSeverity}` : ''}`);

  // ── Paso B (preliminar) — necesitamos divisor antes para A1/A2 ──
  const { divisor, source: divisorSource } = resolveDivisor(args.agreement, args.salaryTable, trace);

  // ── NIVEL 1 — contract_explicit ──
  if (diag.status === 'complete' && contract.salary_amount_unit) {
    const unit = contract.salary_amount_unit;
    const periods = contract.salary_periods_per_year ?? null;

    if (unit === 'monthly' && hasBase) {
      const effectivePeriods = periods ?? divisor ?? 12;
      const mensualEqPeriodo = base * factorProrrateo;
      trace.push(`[N1] contract_explicit unit=monthly base=${base} periods=${effectivePeriods}`);
      return {
        mensualEquivalente: base,
        mensualEquivalentePeriodo: mensualEqPeriodo,
        divisor: effectivePeriods,
        divisorSource: periods ? 'agreement_field' : divisorSource,
        unidadDetectada: 'mensual',
        confianza: 'alta',
        safeMode: false,
        agreementResolutionStatus: hasAgreement ? 'computed' : 'no_agreement',
        trace,
        resolutionPath: 'contract_explicit',
        parametrizationDiagnostic: diag,
      };
    }

    if (unit === 'annual' && hasAnnual && periods != null) {
      const mensualEq = annual / periods;
      const mensualEqPeriodo = mensualEq * factorProrrateo;
      trace.push(`[N1] contract_explicit unit=annual annual=${annual}/periods=${periods}=${mensualEq.toFixed(2)}`);
      return {
        mensualEquivalente: mensualEq,
        mensualEquivalentePeriodo: mensualEqPeriodo,
        divisor: periods,
        divisorSource: 'agreement_field',
        unidadDetectada: 'anual',
        confianza: 'alta',
        safeMode: false,
        agreementResolutionStatus: hasAgreement ? 'computed' : 'no_agreement',
        trace,
        resolutionPath: 'contract_explicit',
        parametrizationDiagnostic: diag,
      };
    }
    trace.push('[N1] contract_explicit no aplicable; sigue a NIVEL 2/3');
  }

  // ── NIVEL 2 — contract_partial_agreement_aided ──
  if (
    diag.status === 'pending' &&
    contract.salary_amount_unit === 'annual' &&
    hasAnnual &&
    !contract.salary_periods_per_year &&
    divisor
  ) {
    const mensualEq = annual / divisor;
    const mensualEqPeriodo = mensualEq * factorProrrateo;
    trace.push(`[N2] contract_partial_agreement_aided annual=${annual}/divisor=${divisor}=${mensualEq.toFixed(2)}`);
    return {
      mensualEquivalente: mensualEq,
      mensualEquivalentePeriodo: mensualEqPeriodo,
      divisor,
      divisorSource,
      unidadDetectada: 'anual',
      confianza: 'alta',
      safeMode: false,
      agreementResolutionStatus: 'computed',
      trace,
      resolutionPath: 'contract_partial_agreement_aided',
      parametrizationDiagnostic: diag,
    };
  }

  // ── PRIORIZACIÓN — Incoherencia structural escala a safeMode ──
  if (diag.status === 'incoherent' && diag.incoherenceSeverity === 'structural') {
    const reason =
      `Parametrización contractual incoherente estructuralmente: ${diag.reasons.join('; ')}. ` +
      `Cálculo automático bloqueado hasta corrección explícita por usuario.`;
    return safe(
      reason,
      'ambigua',
      divisor,
      divisorSource,
      trace,
      diag,
      'incoherent_structural_safeMode',
      'manual_review_required',
    );
  }

  // ── NIVEL 3 — legacy_resolution (pending o incoherent soft) ──
  trace.push('[N3] legacy_resolution (flujo A/B histórico)');

  // ── Paso A — Unidad ──

  // A5 — Ambos null/0
  if (!hasBase && !hasAnnual) {
    return safe(
      'Sin salario informado en contrato (annual_salary y base_salary nulos o cero).',
      'no_informada',
      divisor,
      divisorSource,
      trace,
      diag,
    );
  }

  // A1 — annual > 0 y base null/0 → unidad anual
  if (hasAnnual && !hasBase) {
    trace.push('[A1] annual_salary>0 y base_salary null/0 → unidad=anual, confianza=ALTA');
    if (!divisor) {
      // B4 — sin convenio resuelto y unidad anual
      return safe(
        'Salario anual informado pero el divisor (nº pagas) no es determinable: configura extra_payments en el convenio o aporta tabla salarial.',
        'anual',
        null,
        divisorSource,
        trace,
        diag,
      );
    }
    const mensualEq = annual / divisor;
    const mensualEqPeriodo = mensualEq * factorProrrateo;
    trace.push(
      `[C] mensualEq=annual/divisor=${annual}/${divisor}=${mensualEq.toFixed(2)} ; ×factor(${factorProrrateo})=${mensualEqPeriodo.toFixed(2)}`,
    );
    return {
      mensualEquivalente: mensualEq,
      mensualEquivalentePeriodo: mensualEqPeriodo,
      divisor,
      divisorSource,
      unidadDetectada: 'anual',
      confianza: 'alta',
      safeMode: false,
      agreementResolutionStatus: hasAgreement ? 'computed' : 'no_agreement',
      trace,
      resolutionPath: 'legacy_resolution',
      parametrizationDiagnostic: diag,
    };
  }

  // A2 / A4 — Ambos > 0
  if (hasBase && hasAnnual) {
    // A2 — coherentes con divisor disponible
    if (divisor && isCoherent(base, annual, divisor)) {
      trace.push(
        `[A2] base×divisor=${(base * divisor).toFixed(2)} coherente con annual=${annual} (tol ${COHERENCE_TOLERANCE * 100}%) → unidad=mensual, ALTA`,
      );
      const mensualEqPeriodo = base * factorProrrateo;
      trace.push(`[C] mensualEq=base=${base} ; ×factor(${factorProrrateo})=${mensualEqPeriodo.toFixed(2)}`);
      return {
        mensualEquivalente: base,
        mensualEquivalentePeriodo: mensualEqPeriodo,
        divisor,
        divisorSource,
        unidadDetectada: 'mensual',
        confianza: 'alta',
        safeMode: false,
        agreementResolutionStatus: 'computed',
        trace,
        resolutionPath: 'legacy_resolution',
        parametrizationDiagnostic: diag,
      };
    }

    // A4 — incoherentes
    const reason = divisor
      ? `Salario base (${base}) y anual (${annual}) no coherentes con divisor ${divisor} (tolerancia ${COHERENCE_TOLERANCE * 100}%) — revisión manual requerida.`
      : `Salario base (${base}) y anual (${annual}) ambos informados pero el divisor no es determinable y los valores no son coherentes con ningún divisor [${MIN_DIVISOR},${MAX_DIVISOR}].`;
    trace.push('[A4] incoherentes con divisor disponible o no determinable');
    return safe(reason, 'ambigua', divisor, divisorSource, trace, diag);
  }

  // A3 — base > 0 y annual null/0 → mensual (convención), MEDIA
  if (hasBase && !hasAnnual) {
    // S9.21o-H2 — WORKAROUND HEURÍSTICO TEMPORAL (ver constante
    // A3_MONTHLY_PLAUSIBILITY_MAX arriba para justificación, limitación
    // funcional y deuda técnica registrada).
    //
    // Sin campo explícito `base_salary_unit` en contrato, esta guardia es
    // hoy la única forma de cubrir C7 (base=42.000, annual=null, sin
    // convenio) sin reinterpretar un anual como mensual. Reemplazar por
    // chequeo de unidad explícita cuando se introduzca el schema.
    if (base > A3_MONTHLY_PLAUSIBILITY_MAX && !divisor) {
      return safe(
        `Salario base (${base}) declarado sin annual_salary y sin divisor resoluble por convenio. ` +
          `Importe implausible como mensualidad (> ${A3_MONTHLY_PLAUSIBILITY_MAX}€/mes): ` +
          `revisión manual requerida para confirmar unidad (mensual vs anual) o configurar el convenio.`,
        'ambigua',
        null,
        divisorSource,
        trace,
        diag,
      );
    }
    trace.push('[A3] base_salary>0 y annual_salary null/0 → unidad=mensual (convención), confianza=MEDIA');
    const mensualEqPeriodo = base * factorProrrateo;
    trace.push(`[C] mensualEq=base=${base} ; ×factor(${factorProrrateo})=${mensualEqPeriodo.toFixed(2)}`);
    return {
      mensualEquivalente: base,
      mensualEquivalentePeriodo: mensualEqPeriodo,
      divisor: divisor ?? null,
      divisorSource,
      unidadDetectada: 'mensual',
      confianza: 'media',
      safeMode: false,
      agreementResolutionStatus: hasAgreement ? 'computed' : 'no_agreement',
      trace,
      resolutionPath: 'legacy_resolution',
      parametrizationDiagnostic: diag,
    };
  }

  // Fallback defensivo
  return safe('Configuración salarial no reconocida.', 'ambigua', divisor, divisorSource, trace, diag);
}
