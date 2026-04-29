import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  runRegistryPilotParityPreflight,
  type RegistryPilotParityPreflightInput,
} from '@/engines/erp/hr/registryPilotParityPreflight';
import type { OperativeAgreementResolutionSnapshot } from '@/engines/erp/hr/agreementResolutionComparator';
import type {
  RegistryResolutionPreview,
  RegistryAgreementPreviewConcept,
} from '@/engines/erp/hr/registryAwareAgreementResolver';

const SOURCE_PATH = resolve(
  __dirname,
  '../../engines/erp/hr/registryPilotParityPreflight.ts',
);
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');

const FLAG_PATH = resolve(
  __dirname,
  '../../engines/erp/hr/registryShadowFlag.ts',
);
const PILOT_GATE_PATH = resolve(
  __dirname,
  '../../engines/erp/hr/registryPilotGate.ts',
);

function makeOperative(
  overrides: Partial<OperativeAgreementResolutionSnapshot> = {},
): OperativeAgreementResolutionSnapshot {
  return {
    source: 'operative',
    salaryBaseMonthly: 1500,
    salaryBaseAnnual: 21000,
    plusConvenio: 100,
    plusTransport: 50,
    plusAntiguedad: 0,
    extraPayAmount: 1500,
    ...overrides,
  };
}

function c(
  code: string,
  amount: number,
): RegistryAgreementPreviewConcept {
  return {
    code,
    label: code,
    amount,
    source: 'registry_salary_table',
  };
}

function makePreview(
  conceptsPreview: RegistryAgreementPreviewConcept[],
  overrides: Partial<RegistryResolutionPreview> = {},
): RegistryResolutionPreview {
  return {
    source: 'registry',
    canUseForPayroll: true,
    salaryRowsMatched: conceptsPreview.length,
    conceptsPreview,
    warnings: [],
    blockers: [],
    ...overrides,
  } as unknown as RegistryResolutionPreview;
}

const MATCHED_CONCEPTS: RegistryAgreementPreviewConcept[] = [
  c('REGISTRY_SALARY_BASE_MONTHLY', 1500),
  c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
  c('REGISTRY_PLUS_CONVENIO', 100),
  c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
  c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
];

describe('B10F.2 — registryPilotParityPreflight (logic)', () => {
  it('blocks when registry preview canUseForPayroll=false', () => {
    const input: RegistryPilotParityPreflightInput = {
      operative: makeOperative(),
      registryPreview: makePreview(MATCHED_CONCEPTS, {
        canUseForPayroll: false,
        blockers: ['not_ready_for_payroll', 'requires_human_review'],
      }),
    };
    const r = runRegistryPilotParityPreflight(input);
    expect(r.allowApply).toBe(false);
    expect(r.reason).toBe('registry_preview_blocked');
    expect(r.blockers).toContain('registry_preview_blocked');
    expect(r.blockers).toContain('not_ready_for_payroll');
    expect(r.blockers).toContain('requires_human_review');
  });

  it('blocks when there are critical diffs', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1800), // delta 300 -> critical (monthly > 5)
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 100),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: preview,
    });
    expect(r.summary.critical).toBeGreaterThan(0);
    expect(r.allowApply).toBe(false);
    expect(r.reason).toBe('critical_diffs');
    expect(r.blockers).toEqual(['critical_diffs']);
  });

  it('allows when there are no diffs', () => {
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: makePreview(MATCHED_CONCEPTS),
    });
    expect(r.summary.critical).toBe(0);
    // any non-critical noise allowed
    expect(r.allowApply).toBe(true);
    expect(r.reason).toBe('parity_ok');
    expect(r.blockers).toEqual([]);
  });

  it('allows warning diffs with default threshold (undefined)', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1502), // delta 2 -> warning
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 100),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: preview,
    });
    expect(r.summary.warning).toBeGreaterThan(0);
    expect(r.summary.critical).toBe(0);
    expect(r.allowApply).toBe(true);
    expect(r.reason).toBe('parity_ok');
  });

  it('blocks warning diffs with warningThreshold=0', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1502),
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 100),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: preview,
      warningThreshold: 0,
    });
    expect(r.summary.warning).toBeGreaterThan(0);
    expect(r.allowApply).toBe(false);
    expect(r.reason).toBe('warning_threshold_exceeded');
    expect(r.blockers).toEqual(['warning_threshold_exceeded']);
  });

  it('allows when warnings <= threshold (threshold=2, 1 warning)', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1502),
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 100),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: preview,
      warningThreshold: 5,
    });
    expect(r.summary.warning).toBeGreaterThan(0);
    expect(r.summary.warning).toBeLessThanOrEqual(5);
    expect(r.allowApply).toBe(true);
    expect(r.reason).toBe('parity_ok');
  });

  it('blocks when warnings > threshold (threshold=1, 2 warnings)', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1502),
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 102),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: preview,
      warningThreshold: 1,
    });
    expect(r.summary.warning).toBeGreaterThan(1);
    expect(r.allowApply).toBe(false);
    expect(r.reason).toBe('warning_threshold_exceeded');
  });

  it('preserves comparison summary in result', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1502),
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 100),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: preview,
    });
    expect(r.summary).toEqual({
      critical: r.comparison.summary.critical,
      warning: r.comparison.summary.warning,
      info: r.comparison.summary.info,
    });
  });

  it('propagates registryPreview blockers when preview is blocked', () => {
    const r = runRegistryPilotParityPreflight({
      operative: makeOperative(),
      registryPreview: makePreview(MATCHED_CONCEPTS, {
        canUseForPayroll: false,
        blockers: ['version_not_current', 'no_salary_tables'],
      }),
    });
    expect(r.blockers).toEqual(
      expect.arrayContaining([
        'registry_preview_blocked',
        'version_not_current',
        'no_salary_tables',
      ]),
    );
  });

  it('is deterministic for the same input', () => {
    const preview = makePreview([
      c('REGISTRY_SALARY_BASE_MONTHLY', 1502),
      c('REGISTRY_SALARY_BASE_ANNUAL', 21000),
      c('REGISTRY_PLUS_CONVENIO', 100),
      c('REGISTRY_PLUS_TRANSPORT', 50),
  c('REGISTRY_PLUS_ANTIGUEDAD', 0),
      c('REGISTRY_EXTRA_PAY_AMOUNT', 1500),
    ]);
    const input: RegistryPilotParityPreflightInput = {
      operative: makeOperative(),
      registryPreview: preview,
      warningThreshold: 1,
    };
    const a = runRegistryPilotParityPreflight(input);
    const b = runRegistryPilotParityPreflight(input);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

describe('B10F.2 — registryPilotParityPreflight (static guards)', () => {
  it('source does not contain supabase', () => {
    expect(SOURCE.toLowerCase()).not.toContain('supabase');
  });

  it('source does not contain fetch(', () => {
    expect(SOURCE).not.toMatch(/\bfetch\s*\(/);
  });

  it('source does not contain React or hooks', () => {
    expect(SOURCE).not.toMatch(/from ['"]react['"]/);
    expect(SOURCE).not.toMatch(
      /\buseState\b|\buseEffect\b|\buseCallback\b|\buseMemo\b|\buseRef\b/,
    );
  });

  it('source does not contain DB write/select APIs', () => {
    expect(SOURCE).not.toMatch(/\.from\(/);
    expect(SOURCE).not.toMatch(/\.insert\(/);
    expect(SOURCE).not.toMatch(/\.update\(/);
    expect(SOURCE).not.toMatch(/\.delete\(/);
    expect(SOURCE).not.toMatch(/\.upsert\(/);
  });

  it('source does not import bridge/flag/pilot gate', () => {
    expect(SOURCE).not.toMatch(/useESPayrollBridge/);
    expect(SOURCE).not.toMatch(/registryShadowFlag/);
    expect(SOURCE).not.toMatch(/registryPilotGate/);
  });

  it('source does not import operative payroll engines', () => {
    expect(SOURCE).not.toMatch(/agreementSalaryResolver/);
    expect(SOURCE).not.toMatch(/salaryNormalizer/);
    expect(SOURCE).not.toMatch(/payrollEngine/);
    expect(SOURCE).not.toMatch(/payslipEngine/);
    expect(SOURCE).not.toMatch(/agreementSafetyGate/);
  });

  it('source does not reference operative collective agreements table', () => {
    const operativeMatches = SOURCE.match(
      /erp_hr_collective_agreements(?!_registry)/g,
    );
    expect(operativeMatches).toBeNull();
  });

  it('source does not contain ready_for_payroll assignment', () => {
    expect(SOURCE).not.toMatch(/ready_for_payroll\s*=/);
  });

  it('registryShadowFlag.ts still has HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL=false', () => {
    const flagSrc = readFileSync(FLAG_PATH, 'utf8');
    expect(flagSrc).toMatch(
      /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });

  it('registryPilotGate.ts still has HR_REGISTRY_PILOT_MODE=false and empty allow-list', () => {
    const gateSrc = readFileSync(PILOT_GATE_PATH, 'utf8');
    expect(gateSrc).toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*false/);
    expect(gateSrc).toMatch(
      /REGISTRY_PILOT_SCOPE_ALLOWLIST[^=]*=\s*\[\s*\]/,
    );
  });
});
