/**
 * Payslip Validator — Validaciones legales de nómina
 * Motor determinista puro.
 */

import { SS_BASE_MAX_2026, SS_GROUP_MIN_BASES_2026 } from '../rules/ss-contributions';
import { IRPF_MIN_RATE } from '../rules/irpf-withholding';

// ============================================
// TYPES
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
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
}

// ============================================
// VALIDATORS
// ============================================

export function validatePayslip(input: ValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  // V1: Net salary must be positive
  if (input.netSalary < 0) {
    issues.push({
      code: 'V001',
      severity: 'error',
      message: 'El salario neto es negativo',
      field: 'netSalary',
    });
  }

  // V2: Deductions cannot exceed gross
  if (input.totalDeductions > input.grossSalary * 1.01) {
    issues.push({
      code: 'V002',
      severity: 'error',
      message: 'Las deducciones superan el bruto',
      field: 'totalDeductions',
    });
  }

  // V3: SS base within limits
  const minBase = (SS_GROUP_MIN_BASES_2026[input.ssGroup] ?? 1221) * input.partTimeCoefficient;
  const maxBase = SS_BASE_MAX_2026 * input.partTimeCoefficient;

  if (input.ssBaseCC < minBase * 0.99) {
    issues.push({
      code: 'V003',
      severity: 'warning',
      message: `Base CC (${input.ssBaseCC.toFixed(2)}) inferior al mínimo grupo ${input.ssGroup} (${minBase.toFixed(2)})`,
      field: 'ssBaseCC',
    });
  }

  if (input.ssBaseCC > maxBase * 1.01) {
    issues.push({
      code: 'V004',
      severity: 'warning',
      message: `Base CC (${input.ssBaseCC.toFixed(2)}) superior al máximo (${maxBase.toFixed(2)})`,
      field: 'ssBaseCC',
    });
  }

  // V4: IRPF minimum
  if (input.irpfRate < IRPF_MIN_RATE) {
    issues.push({
      code: 'V005',
      severity: 'warning',
      message: `Tipo IRPF (${input.irpfRate}%) inferior al mínimo legal (${IRPF_MIN_RATE}%)`,
      field: 'irpfRate',
    });
  }

  // V5: Gross salary should be > 0
  if (input.grossSalary <= 0) {
    issues.push({
      code: 'V006',
      severity: 'error',
      message: 'El salario bruto debe ser positivo',
      field: 'grossSalary',
    });
  }

  // Score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 30 - warningCount * 10);

  return {
    valid: errorCount === 0,
    issues,
    score,
  };
}
