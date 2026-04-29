import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  compareOperativeVsRegistryAgreementResolution,
  type OperativeAgreementResolutionSnapshot,
} from '@/engines/erp/hr/agreementResolutionComparator';
import type {
  RegistryResolutionPreview,
  RegistryAgreementPreviewConcept,
} from '@/engines/erp/hr/registryAwareAgreementResolver';

// ===================== Helpers =====================

function makeRegistryPreview(
  partial: Partial<RegistryResolutionPreview> = {},
): RegistryResolutionPreview {
  return {
    source: 'registry',
    canUseForPayroll: true,
    salaryRowsMatched: 1,
    conceptsPreview: [],
    warnings: [],
    blockers: [],
    ...partial,
  };
}

function concept(
  code: string,
  amount: number,
  label = code,
): RegistryAgreementPreviewConcept {
  return {
    code,
    label,
    amount,
    source: 'registry_salary_table',
    confidence: 1,
  };
}

function makeOperative(
  partial: Partial<OperativeAgreementResolutionSnapshot> = {},
): OperativeAgreementResolutionSnapshot {
  return { source: 'operative', ...partial };
}

// ===================== Behavior tests =====================

describe('B10B compareOperativeVsRegistryAgreementResolution — behavior', () => {
  it('1. registry blocked → critical diff and canApplyRegistrySafely=false, no amount diffs', () => {
    const reg = makeRegistryPreview({
      canUseForPayroll: false,
      blockers: ['not_ready_for_payroll', 'not_human_validated'],
    });
    const op = makeOperative({ salaryBaseMonthly: 1000, salaryBaseAnnual: 14000 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    expect(r.canApplyRegistrySafely).toBe(false);
    expect(r.hasCriticalDiffs).toBe(true);
    expect(r.diffs).toHaveLength(1);
    expect(r.diffs[0].field).toBe('registryPreview');
    expect(r.diffs[0].severity).toBe('critical');
    expect(r.diffs[0].detail).toContain('not_ready_for_payroll');
  });

  it('2. monthly base equal within tolerance → no critical', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_SALARY_BASE_MONTHLY', 1000.01)],
    });
    const op = makeOperative({ salaryBaseMonthly: 1000.0 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    expect(r.hasCriticalDiffs).toBe(false);
    expect(r.diffs.find((d) => d.field === 'salaryBaseMonthly')).toBeUndefined();
    expect(r.canApplyRegistrySafely).toBe(true);
  });

  it('3. monthly base Δ > 5€ → critical', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_SALARY_BASE_MONTHLY', 1000)],
    });
    const op = makeOperative({ salaryBaseMonthly: 1010 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    const diff = r.diffs.find((d) => d.field === 'salaryBaseMonthly');
    expect(diff?.severity).toBe('critical');
    expect(r.canApplyRegistrySafely).toBe(false);
  });

  it('4. monthly base small Δ (~2€) → warning', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_SALARY_BASE_MONTHLY', 1000)],
    });
    const op = makeOperative({ salaryBaseMonthly: 1002 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    const diff = r.diffs.find((d) => d.field === 'salaryBaseMonthly');
    expect(diff?.severity).toBe('warning');
    expect(r.canApplyRegistrySafely).toBe(true);
  });

  it('5. annual base Δ > 60€ → critical', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_SALARY_BASE_ANNUAL', 14000)],
    });
    const op = makeOperative({ salaryBaseAnnual: 14100 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    const diff = r.diffs.find((d) => d.field === 'salaryBaseAnnual');
    expect(diff?.severity).toBe('critical');
  });

  it('5b. annual base Δ ~30€ → warning', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_SALARY_BASE_ANNUAL', 14000)],
    });
    const op = makeOperative({ salaryBaseAnnual: 14030 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    const diff = r.diffs.find((d) => d.field === 'salaryBaseAnnual');
    expect(diff?.severity).toBe('warning');
  });

  it('6. plus_convenio mismatch — warning vs critical thresholds', () => {
    const regWarn = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_PLUS_CONVENIO', 100)],
    });
    const rWarn = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ plusConvenio: 102 }),
      registryPreview: regWarn,
    });
    expect(rWarn.diffs.find((d) => d.field === 'plusConvenio')?.severity).toBe('warning');

    const regCrit = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_PLUS_CONVENIO', 100)],
    });
    const rCrit = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ plusConvenio: 120 }),
      registryPreview: regCrit,
    });
    expect(rCrit.diffs.find((d) => d.field === 'plusConvenio')?.severity).toBe('critical');
  });

  it('7. plus_transport mismatch → diff', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_PLUS_TRANSPORT', 50)],
    });
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ plusTransport: 60 }),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'plusTransport');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('critical');
  });

  it('8. extra pay mismatch → diff', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_EXTRA_PAY_AMOUNT', 1000)],
    });
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ extraPayAmount: 1003 }),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'extraPayAmount');
    expect(d?.severity).toBe('warning');
  });

  it('9. operative field set, registry concept missing → warning', () => {
    const reg = makeRegistryPreview({ conceptsPreview: [] });
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ salaryBaseMonthly: 1000 }),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'missing_registry_concept:REGISTRY_SALARY_BASE_MONTHLY');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
  });

  it('10. registry extra concept without operative equivalent → info', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_PLUS_NOCTURNIDAD', 30)],
    });
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative(),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'extra_registry_concept:REGISTRY_PLUS_NOCTURNIDAD');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('info');
  });

  it('10b. registry mapped concept present, operative null → info on extra_registry_concept', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_PLUS_TRANSPORT', 50)],
    });
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ plusTransport: null }),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'extra_registry_concept:REGISTRY_PLUS_TRANSPORT');
    expect(d?.severity).toBe('info');
  });

  it('11. registry warnings included in report as info', () => {
    const reg = makeRegistryPreview({ warnings: ['no_exact_salary_row_match'] });
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative(),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'registry_warning');
    expect(d?.severity).toBe('info');
    expect(d?.detail).toContain('no_exact_salary_row_match');
  });

  it('12. operative warnings included in report as info', () => {
    const reg = makeRegistryPreview();
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ warnings: ['legacy_seniority_assumption'] }),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'operative_warning');
    expect(d?.severity).toBe('info');
    expect(d?.detail).toContain('legacy_seniority_assumption');
  });

  it('13. happy path with all matches → canApplyRegistrySafely=true', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [
        concept('REGISTRY_SALARY_BASE_MONTHLY', 1000),
        concept('REGISTRY_SALARY_BASE_ANNUAL', 14000),
        concept('REGISTRY_PLUS_CONVENIO', 100),
        concept('REGISTRY_PLUS_TRANSPORT', 50),
        concept('REGISTRY_PLUS_ANTIGUEDAD', 25),
        concept('REGISTRY_EXTRA_PAY_AMOUNT', 1000),
      ],
    });
    const op = makeOperative({
      salaryBaseMonthly: 1000,
      salaryBaseAnnual: 14000,
      plusConvenio: 100,
      plusTransport: 50,
      plusAntiguedad: 25,
      extraPayAmount: 1000,
    });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    expect(r.canApplyRegistrySafely).toBe(true);
    expect(r.hasCriticalDiffs).toBe(false);
    expect(r.summary.critical).toBe(0);
  });

  it('14. any critical → canApplyRegistrySafely=false', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [concept('REGISTRY_SALARY_BASE_MONTHLY', 1000)],
    });
    const op = makeOperative({ salaryBaseMonthly: 1100 });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    expect(r.hasCriticalDiffs).toBe(true);
    expect(r.canApplyRegistrySafely).toBe(false);
  });

  it('15. idempotency: two calls same input → deep-equal output', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [
        concept('REGISTRY_SALARY_BASE_MONTHLY', 1000),
        concept('REGISTRY_PLUS_CONVENIO', 100),
      ],
      warnings: ['no_exact_salary_row_match'],
    });
    const op = makeOperative({
      salaryBaseMonthly: 1002,
      plusConvenio: 110,
      warnings: ['x'],
    });
    const a = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    const b = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    expect(a).toEqual(b);
  });

  it('annual hours present → warning registry_annual_hours_not_comparable', () => {
    const reg = makeRegistryPreview();
    const r = compareOperativeVsRegistryAgreementResolution({
      operative: makeOperative({ annualHours: 1800 }),
      registryPreview: reg,
    });
    const d = r.diffs.find((x) => x.field === 'annualHours');
    expect(d?.severity).toBe('warning');
    expect(d?.detail).toContain('registry_annual_hours_not_comparable');
  });

  it('summary counts severities correctly', () => {
    const reg = makeRegistryPreview({
      conceptsPreview: [
        concept('REGISTRY_SALARY_BASE_MONTHLY', 1000), // crit
      ],
      warnings: ['w1', 'w2'], // 2 info
    });
    const op = makeOperative({
      salaryBaseMonthly: 1100, // critical
      plusConvenio: 100, // missing concept → warning
    });
    const r = compareOperativeVsRegistryAgreementResolution({ operative: op, registryPreview: reg });
    expect(r.summary.critical).toBeGreaterThanOrEqual(1);
    expect(r.summary.warning).toBeGreaterThanOrEqual(1);
    expect(r.summary.info).toBeGreaterThanOrEqual(2);
  });
});

// ===================== Static contract tests =====================

describe('B10B static contract — agreementResolutionComparator.ts', () => {
  const filePath = resolve(
    process.cwd(),
    'src/engines/erp/hr/agreementResolutionComparator.ts',
  );
  const source = readFileSync(filePath, 'utf-8');

  it('does not import @supabase or supabase client', () => {
    expect(source).not.toMatch(/from\s+['"]@supabase/);
    expect(source).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
  });

  it('does not call fetch', () => {
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });

  it('does not import react or hooks', () => {
    expect(source).not.toMatch(/from\s+['"]react['"]/);
    expect(source).not.toMatch(/\buseState\b/);
    expect(source).not.toMatch(/\buseEffect\b/);
    expect(source).not.toMatch(/\buseCallback\b/);
  });

  it('does not reference forbidden runtime modules', () => {
    expect(source).not.toMatch(/\bpayrollEngine\b/);
    expect(source).not.toMatch(/\bpayslipEngine\b/);
    expect(source).not.toMatch(/\bsalaryNormalizer\b/);
    expect(source).not.toMatch(/\bagreementSalaryResolver\b/);
    expect(source).not.toMatch(/\buseESPayrollBridge\b/);
  });

  it('does not reference operative table erp_hr_collective_agreements (without _registry suffix)', () => {
    // negative lookahead: erp_hr_collective_agreements NOT followed by _registry
    expect(source).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('contains no DB CRUD tokens', () => {
    expect(source).not.toMatch(/\.from\(/);
    expect(source).not.toMatch(/\.insert\(/);
    expect(source).not.toMatch(/\.update\(/);
    expect(source).not.toMatch(/\.delete\(/);
  });
});