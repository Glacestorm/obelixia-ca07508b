/**
 * contractSalaryParametrization — S9.21p
 *
 * ÚNICA FUENTE DE VERDAD FUNCIONAL del estado de parametrización salarial
 * de un contrato (`erp_hr_contracts`). Consumido por:
 *   - badge en HRContractsPanel
 *   - filtro toggle "Solo pendientes/incoherentes" (runtime sobre cada fila)
 *   - normalizer (gating de Nivel 1 contract_explicit)
 *   - tira informativa en HRPayrollEntryDialog
 *   - validaciones inline + diálogo de confirmación en HRContractFormDialog
 *
 * INVARIANTE DE INMUTABILIDAD:
 *   Cuando este helper devuelve `status === 'incoherent'`, los tres campos
 *   `salary_amount_unit`, `salary_periods_per_year`, `extra_payments_prorated`
 *   son INMUTABLES ante procesos automáticos (backfill, jobs, edge functions,
 *   triggers, normalizer, bridge). La corrección requiere acción explícita
 *   del usuario en HRContractFormDialog con confirmación tipada.
 *
 * El índice parcial idx_hr_contracts_param_pending de BD es OPTIMIZACIÓN de
 * pre-filtrado (sólo cubre NULL evidentes). NO sustituye este helper: los
 * casos `incoherent` (datos presentes pero contradictorios) sólo son
 * detectables por reglas en runtime.
 */

export type ParametrizationStatus = 'complete' | 'pending' | 'incoherent';
export type IncoherenceSeverity = 'structural' | 'soft';

export type ParametrizationField =
  | 'salary_amount_unit'
  | 'salary_periods_per_year'
  | 'extra_payments_prorated'
  | 'base_salary'
  | 'annual_salary';

export interface ParametrizationDiagnostic {
  status: ParametrizationStatus;
  reasons: string[];
  warnings: string[];
  incoherenceSeverity?: IncoherenceSeverity;
  affectedFields?: ParametrizationField[];
}

export interface ContractParametrizationInput {
  salary_amount_unit?: 'monthly' | 'annual' | null;
  salary_periods_per_year?: number | null;
  extra_payments_prorated?: boolean | null;
  base_salary?: number | null;
  annual_salary?: number | null;
}

/** Tolerancia de coherencia entre base × periods y annual (5 %). */
export const PARAM_STRUCTURAL_TOLERANCE = 0.05;
/** Rango defensivo de periods admitido. */
export const PARAM_PERIODS_MIN = 12;
export const PARAM_PERIODS_MAX = 16;

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Diagnostica el estado de parametrización salarial del contrato.
 * NO realiza side-effects, NO escribe en BD, NO loguea: pura función de regla.
 */
export function diagnoseContractParametrization(
  contract: ContractParametrizationInput | null | undefined,
): ParametrizationDiagnostic {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const affected: ParametrizationField[] = [];

  if (!contract) {
    return {
      status: 'pending',
      reasons: ['Contrato no disponible'],
      warnings: [],
    };
  }

  const unit = contract.salary_amount_unit ?? null;
  const periods = contract.salary_periods_per_year ?? null;
  const prorated = contract.extra_payments_prorated ?? null;
  const base = num(contract.base_salary);
  const annual = num(contract.annual_salary);

  // ── PENDING: campos requeridos ausentes ──
  if (unit == null) {
    reasons.push('Falta unidad salarial (salary_amount_unit)');
    affected.push('salary_amount_unit');
    return { status: 'pending', reasons, warnings };
  }

  if (unit === 'annual') {
    if (periods == null) {
      reasons.push('Falta número de pagas anuales (salary_periods_per_year)');
      affected.push('salary_periods_per_year');
    }
    if (annual <= 0) {
      reasons.push('Falta importe anual (annual_salary)');
      affected.push('annual_salary');
    }
    if (reasons.length > 0) return { status: 'pending', reasons, warnings, affectedFields: affected };
  }

  if (unit === 'monthly') {
    if (base <= 0) {
      reasons.push('Falta importe mensual (base_salary)');
      affected.push('base_salary');
      return { status: 'pending', reasons, warnings, affectedFields: affected };
    }
  }

  // ── INCOHERENT STRUCTURAL ──
  // periods fuera de rango (defensivo)
  if (periods != null && (periods < PARAM_PERIODS_MIN || periods > PARAM_PERIODS_MAX)) {
    reasons.push(`Número de pagas fuera de rango [${PARAM_PERIODS_MIN}-${PARAM_PERIODS_MAX}]: ${periods}`);
    affected.push('salary_periods_per_year');
    return {
      status: 'incoherent',
      reasons,
      warnings,
      incoherenceSeverity: 'structural',
      affectedFields: affected,
    };
  }

  const effectivePeriods = periods ?? 12;

  // unit=monthly + annual informado → contraste estructural
  if (unit === 'monthly' && base > 0 && annual > 0) {
    const diff = Math.abs(base * effectivePeriods - annual) / annual;
    if (diff > PARAM_STRUCTURAL_TOLERANCE) {
      reasons.push(
        `Salario anual declarado (${annual.toFixed(2)}€) no coincide con base × ${effectivePeriods} = ${(base * effectivePeriods).toFixed(2)}€ (desviación ${(diff * 100).toFixed(1)}% > ${PARAM_STRUCTURAL_TOLERANCE * 100}%)`,
      );
      affected.push('base_salary', 'annual_salary');
      if (periods != null) affected.push('salary_periods_per_year');
      return {
        status: 'incoherent',
        reasons,
        warnings,
        incoherenceSeverity: 'structural',
        affectedFields: affected,
      };
    }
  }

  // unit=annual + base informado → contraste estructural
  if (unit === 'annual' && base > 0 && annual > 0 && periods != null) {
    const diff = Math.abs(base * periods - annual) / annual;
    if (diff > PARAM_STRUCTURAL_TOLERANCE) {
      reasons.push(
        `Salario base declarado (${base.toFixed(2)}€) × ${periods} = ${(base * periods).toFixed(2)}€ no coincide con anual ${annual.toFixed(2)}€ (desviación ${(diff * 100).toFixed(1)}% > ${PARAM_STRUCTURAL_TOLERANCE * 100}%)`,
      );
      affected.push('base_salary', 'annual_salary', 'salary_periods_per_year');
      return {
        status: 'incoherent',
        reasons,
        warnings,
        incoherenceSeverity: 'structural',
        affectedFields: affected,
      };
    }
  }

  // ── INCOHERENT SOFT (sólo prorated/periods) ──
  if (effectivePeriods === 12 && prorated === false) {
    reasons.push('12 pagas con extra_payments_prorated=false es atípico');
    affected.push('extra_payments_prorated', 'salary_periods_per_year');
    return {
      status: 'incoherent',
      reasons,
      warnings,
      incoherenceSeverity: 'soft',
      affectedFields: affected,
    };
  }

  if (effectivePeriods > 12 && prorated === true) {
    reasons.push(`${effectivePeriods} pagas con extra_payments_prorated=true es contradictorio`);
    affected.push('extra_payments_prorated', 'salary_periods_per_year');
    return {
      status: 'incoherent',
      reasons,
      warnings,
      incoherenceSeverity: 'soft',
      affectedFields: affected,
    };
  }

  // ── COMPLETE ──
  // Warnings opcionales no bloqueantes
  if (prorated == null) {
    warnings.push('extra_payments_prorated no especificado; se asumirá según periods');
  }

  return { status: 'complete', reasons: [], warnings };
}

/**
 * Helper de conveniencia: ¿este contrato necesita revisión?
 * (true para 'pending' o cualquier 'incoherent').
 */
export function contractRequiresParametrizationReview(
  contract: ContractParametrizationInput | null | undefined,
): boolean {
  return diagnoseContractParametrization(contract).status !== 'complete';
}
