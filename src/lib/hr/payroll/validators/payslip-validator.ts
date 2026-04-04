/**
 * Payslip Validator — Validaciones legales de nómina
 * Motor determinista puro.
 * 
 * Validaciones:
 * - V001: Neto negativo
 * - V002: Deducciones > bruto
 * - V003/V004: Bases SS fuera de límites
 * - V005: IRPF mínimo
 * - V006: Bruto <= 0
 * - V007: SMI bloqueante (ET Art. 27)
 * - V008: Horas extras >80h/año (ET Art. 35)
 * - V009: Base mínima grupo SS incumplida
 * - V010: Base máxima SS superada sin solidaridad
 */

import { SS_BASE_MAX_2026, SS_GROUP_MIN_BASES_2026 } from '../rules/ss-contributions';
import { IRPF_MIN_RATE } from '../rules/irpf-withholding';

// ============================================
// CONSTANTS
// ============================================

/** SMI 2026 mensual (14 pagas) — BOE RD */
export const SMI_MONTHLY_2026 = 1184.00;
/** SMI 2026 anual */
export const SMI_ANNUAL_2026 = 16576.00;
/** Máximo horas extras anuales (ET Art. 35.2) */
export const MAX_OVERTIME_HOURS_YEAR = 80;

// ============================================
// TYPES
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
  /** Legal reference */
  norm?: string;
  /** Whether this issue blocks payroll approval */
  blocking?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
  /** Count of blocking issues that prevent approval */
  blockingCount: number;
}

export interface ValidationInput {
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  ssBaseCC: number;
  ssBaseCP: number;
  ssGroup: number;
  partTimeCoefficient: number;
  contractType: string;
  irpfRate: number;
  /** Monthly overtime hours in current period */
  overtimeHoursMonth?: number;
  /** Accumulated overtime hours YTD */
  overtimeHoursYTD?: number;
  /** Number of extra pays per year (12 = prorrateadas, 14 = standard) */
  extraPaysPerYear?: number;
  /** Is this an extra pay period? */
  isExtraPayPeriod?: boolean;
}

// ============================================
// VALIDATORS
// ============================================

export function validatePayslip(input: ValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  // V1: Net salary must be positive
  if (input.netSalary < 0) {
    issues.push({
      code: 'V001', severity: 'error', blocking: true,
      message: 'El salario neto es negativo',
      field: 'netSalary', norm: 'ET Art. 29',
    });
  }

  // V2: Deductions cannot exceed gross
  if (input.totalDeductions > input.grossSalary * 1.01) {
    issues.push({
      code: 'V002', severity: 'error', blocking: true,
      message: 'Las deducciones superan el bruto',
      field: 'totalDeductions', norm: 'ET Art. 26.4',
    });
  }

  // V3/V4: SS base within limits
  const minBase = (SS_GROUP_MIN_BASES_2026[input.ssGroup] ?? 1221) * input.partTimeCoefficient;
  const maxBase = SS_BASE_MAX_2026 * input.partTimeCoefficient;

  if (input.ssBaseCC < minBase * 0.99) {
    issues.push({
      code: 'V003', severity: 'warning',
      message: `Base CC (${input.ssBaseCC.toFixed(2)}) inferior al mínimo grupo ${input.ssGroup} (${minBase.toFixed(2)})`,
      field: 'ssBaseCC', norm: 'LGSS Art. 147',
    });
  }

  if (input.ssBaseCC > maxBase * 1.01) {
    issues.push({
      code: 'V004', severity: 'warning',
      message: `Base CC (${input.ssBaseCC.toFixed(2)}) superior al máximo (${maxBase.toFixed(2)})`,
      field: 'ssBaseCC', norm: 'LGSS Art. 147',
    });
  }

  // V5: IRPF minimum
  if (input.irpfRate < IRPF_MIN_RATE) {
    issues.push({
      code: 'V005', severity: 'warning',
      message: `Tipo IRPF (${input.irpfRate}%) inferior al mínimo legal (${IRPF_MIN_RATE}%)`,
      field: 'irpfRate', norm: 'RIRPF Art. 86',
    });
  }

  // V6: Gross salary should be > 0
  if (input.grossSalary <= 0) {
    issues.push({
      code: 'V006', severity: 'error', blocking: true,
      message: 'El salario bruto debe ser positivo',
      field: 'grossSalary',
    });
  }

  // ================================================
  // V7: SMI BLOQUEANTE — ET Art. 27
  // El salario mensual bruto (jornada completa equivalente) no puede
  // ser inferior al SMI vigente. En jornada parcial se prorratea.
  // ================================================
  if (!input.isExtraPayPeriod && input.grossSalary > 0) {
    const smiApplicable = SMI_MONTHLY_2026 * input.partTimeCoefficient;
    if (input.grossSalary < smiApplicable * 0.99) {
      issues.push({
        code: 'V007', severity: 'error', blocking: true,
        message: `Bruto mensual (${input.grossSalary.toFixed(2)}€) inferior al SMI proporcional (${smiApplicable.toFixed(2)}€). Nómina bloqueada.`,
        field: 'grossSalary',
        norm: 'ET Art. 27 — Salario Mínimo Interprofesional',
      });
    }
  }

  // ================================================
  // V8: HORAS EXTRAS >80h/AÑO — ET Art. 35.2
  // El límite anual de horas extraordinarias es de 80 horas.
  // Se excluyen las compensadas con descanso dentro de los 4
  // meses siguientes y las de fuerza mayor.
  // ================================================
  if (input.overtimeHoursYTD !== undefined && input.overtimeHoursYTD > MAX_OVERTIME_HOURS_YEAR) {
    issues.push({
      code: 'V008', severity: 'error', blocking: true,
      message: `Horas extras acumuladas (${input.overtimeHoursYTD}h) superan el máximo legal de ${MAX_OVERTIME_HOURS_YEAR}h/año. Infracción grave.`,
      field: 'overtimeHoursYTD',
      norm: 'ET Art. 35.2 — Límite horas extraordinarias',
    });
  } else if (input.overtimeHoursYTD !== undefined && input.overtimeHoursYTD > MAX_OVERTIME_HOURS_YEAR * 0.9) {
    issues.push({
      code: 'V008W', severity: 'warning',
      message: `Horas extras acumuladas (${input.overtimeHoursYTD}h) próximas al límite legal de ${MAX_OVERTIME_HOURS_YEAR}h/año (${(MAX_OVERTIME_HOURS_YEAR - input.overtimeHoursYTD).toFixed(0)}h restantes).`,
      field: 'overtimeHoursYTD',
      norm: 'ET Art. 35.2',
    });
  }

  // ================================================
  // V9: BASE MÍNIMA GRUPO SS — Corrección automática
  // La base de cotización CC no puede ser inferior a la base
  // mínima del grupo de cotización del trabajador.
  // ================================================
  if (input.ssBaseCC > 0 && input.ssBaseCC < minBase) {
    issues.push({
      code: 'V009', severity: 'error', blocking: true,
      message: `Base CC (${input.ssBaseCC.toFixed(2)}€) incumple base mínima grupo ${input.ssGroup} (${minBase.toFixed(2)}€). Debe corregirse antes de aprobar.`,
      field: 'ssBaseCC',
      norm: 'LGSS Art. 147 / Orden TES anual',
    });
  }

  // ================================================
  // V10: BASE MÁXIMA SS — Información solidaridad
  // Si la base supera el tope máximo, informar que se aplica
  // la cotización de solidaridad (RDL 3/2026)
  // ================================================
  if (input.ssBaseCC > SS_BASE_MAX_2026) {
    issues.push({
      code: 'V010', severity: 'info',
      message: `Base CC (${input.ssBaseCC.toFixed(2)}€) supera tope máximo (${SS_BASE_MAX_2026.toFixed(2)}€). Se aplica cotización de solidaridad adicional.`,
      field: 'ssBaseCC',
      norm: 'LGSS DA 54ª / RDL 3/2026',
    });
  }

  // Score calculation
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const blockingCount = issues.filter(i => i.blocking).length;
  const score = Math.max(0, 100 - errorCount * 30 - warningCount * 10);

  return {
    valid: errorCount === 0,
    issues,
    score,
    blockingCount,
  };
}
