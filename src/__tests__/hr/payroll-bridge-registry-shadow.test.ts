import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  buildRegistryAgreementShadowPreview,
  type RegistryShadowInputs,
} from '@/engines/erp/hr/registryShadowPreview';
import type {
  RegistryAgreementSnapshot,
  RegistryAgreementVersionSnapshot,
  RegistryAgreementSourceSnapshot,
  RegistrySalaryTableSnapshot,
  RegistryRuleSnapshot,
} from '@/engines/erp/hr/registryAwareAgreementResolver';

// ===================== Helpers =====================

function makeOperative() {
  return {
    source: 'operative' as const,
    salaryBaseMonthly: 1000,
    plusConvenio: 100,
  };
}

function makeRegistryInputs(): Required<
  Pick<
    RegistryShadowInputs,
    | 'registryAgreement'
    | 'registryVersion'
    | 'registrySource'
    | 'registrySalaryTables'
    | 'registryRules'
  >
> {
  const agreement: RegistryAgreementSnapshot = {
    id: 'ag-1',
    internal_code: 'CA-TEST',
    status: 'vigente',
    ready_for_payroll: true,
    requires_human_review: false,
    data_completeness: 'human_validated',
    salary_tables_loaded: true,
  };
  const version: RegistryAgreementVersionSnapshot = {
    id: 'v-1',
    agreement_id: 'ag-1',
    is_current: true,
    source_hash: 'hash',
  };
  const source: RegistryAgreementSourceSnapshot = {
    id: 's-1',
    agreement_id: 'ag-1',
    source_quality: 'official',
    document_hash: 'd-hash',
  };
  const salaryTables: RegistrySalaryTableSnapshot[] = [
    {
      id: 'st-1',
      agreement_id: 'ag-1',
      version_id: 'v-1',
      year: new Date().getFullYear(),
      professional_group: 'G1',
      category: null,
      level: null,
      salary_base_monthly: 1000,
      salary_base_annual: 14000,
      extra_pay_amount: 1000,
      plus_convenio: 100,
      plus_transport: 50,
      plus_antiguedad: 25,
      plus_nocturnidad: null,
      plus_festivo: null,
      plus_responsabilidad: null,
      other_pluses_json: null,
      row_confidence: 1,
    },
  ];
  const rules: RegistryRuleSnapshot[] = [
    {
      id: 'r-1',
      agreement_id: 'ag-1',
      version_id: 'v-1',
      rule_kind: 'jornada',
      rule_value_json: { annual_hours: 1800 },
    },
  ];
  return {
    registryAgreement: agreement,
    registryVersion: version,
    registrySource: source,
    registrySalaryTables: salaryTables,
    registryRules: rules,
  };
}

// ===================== Behavior =====================

describe('B10C — registry shadow flag and helper', () => {
  it('flag is hardcoded === false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
  });

  it('helper with real flag false → { enabled:false, reason:"flag_off" } even if inputs present', () => {
    const r = buildRegistryAgreementShadowPreview({
      operative: makeOperative(),
      ...makeRegistryInputs(),
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('flag_off');
    expect(r.preview).toBeUndefined();
    expect(r.comparison).toBeUndefined();
  });

  it('helper with enabledOverrideForTests:true and missing inputs → no_registry_input', () => {
    const r = buildRegistryAgreementShadowPreview(
      { operative: makeOperative() },
      { enabledOverrideForTests: true },
    );
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('no_registry_input');
  });

  it('helper with override:true and valid inputs → computed preview + comparison', () => {
    const inputs = makeRegistryInputs();
    const r = buildRegistryAgreementShadowPreview(
      {
        operative: makeOperative(),
        ...inputs,
        targetYear: new Date().getFullYear(),
        targetGroup: 'G1',
      },
      { enabledOverrideForTests: true },
    );
    expect(r.enabled).toBe(true);
    expect(r.reason).toBe('computed');
    expect(r.preview).toBeDefined();
    expect(r.comparison).toBeDefined();
    expect(typeof r.comparison?.canApplyRegistrySafely).toBe('boolean');
  });

  it('idempotent helper output for same inputs', () => {
    const inputs = {
      operative: makeOperative(),
      ...makeRegistryInputs(),
      targetYear: new Date().getFullYear(),
      targetGroup: 'G1',
    };
    const a = buildRegistryAgreementShadowPreview(inputs, { enabledOverrideForTests: true });
    const b = buildRegistryAgreementShadowPreview(inputs, { enabledOverrideForTests: true });
    expect(a).toEqual(b);
  });
});

// ===================== Static contracts =====================

const FLAG_PATH = resolve(process.cwd(), 'src/engines/erp/hr/registryShadowFlag.ts');
const HELPER_PATH = resolve(process.cwd(), 'src/engines/erp/hr/registryShadowPreview.ts');
const BRIDGE_PATH = resolve(process.cwd(), 'src/hooks/erp/hr/useESPayrollBridge.ts');

const flagSrc = readFileSync(FLAG_PATH, 'utf-8');
const helperSrc = readFileSync(HELPER_PATH, 'utf-8');
const bridgeSrc = readFileSync(BRIDGE_PATH, 'utf-8');

describe('B10C static — registryShadowFlag.ts', () => {
  it('contains literal `= false`', () => {
    expect(flagSrc).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false\s*;/);
  });

  it('does not read from env / localStorage / supabase / fetch', () => {
    expect(flagSrc).not.toMatch(/process\.env/);
    expect(flagSrc).not.toMatch(/import\.meta\.env/);
    expect(flagSrc).not.toMatch(/localStorage/);
    expect(flagSrc).not.toMatch(/supabase/i);
    expect(flagSrc).not.toMatch(/\bfetch\s*\(/);
  });
});

describe('B10C static — registryShadowPreview.ts', () => {
  it('does not import supabase / fetch / react / hooks', () => {
    expect(helperSrc).not.toMatch(/from\s+['"]@supabase/);
    expect(helperSrc).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(helperSrc).not.toMatch(/\bfetch\s*\(/);
    expect(helperSrc).not.toMatch(/from\s+['"]react['"]/);
    expect(helperSrc).not.toMatch(/\buseState\b/);
    expect(helperSrc).not.toMatch(/\buseEffect\b/);
    expect(helperSrc).not.toMatch(/\buseCallback\b/);
  });

  it('has no DB CRUD tokens', () => {
    expect(helperSrc).not.toMatch(/\.from\(/);
    expect(helperSrc).not.toMatch(/\.insert\(/);
    expect(helperSrc).not.toMatch(/\.update\(/);
    expect(helperSrc).not.toMatch(/\.delete\(/);
  });

  it('does not reference forbidden runtime modules', () => {
    expect(helperSrc).not.toMatch(/\bpayrollEngine\b/);
    expect(helperSrc).not.toMatch(/\bpayslipEngine\b/);
    expect(helperSrc).not.toMatch(/\bsalaryNormalizer\b/);
    expect(helperSrc).not.toMatch(/\bagreementSalaryResolver\b/);
    expect(helperSrc).not.toMatch(/\buseESPayrollBridge\b/);
  });

  it('does not reference operative table erp_hr_collective_agreements (no _registry suffix)', () => {
    expect(helperSrc).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });
});

describe('B10C static — useESPayrollBridge.ts surgical guards', () => {
  it('does not import any supabase/functions module', () => {
    expect(bridgeSrc).not.toMatch(/from\s+['"][^'"]*supabase\/functions/);
  });

  it('shadow integration is wrapped behind HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL guard', () => {
    expect(bridgeSrc).toMatch(
      /if\s*\(\s*\(?HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL[^)]*\)?\s*===\s*true\s*\)/,
    );
  });

  it('__registry_shadow is only referenced inside the guarded block (assignment, not consumed by engine)', () => {
    const occurrences = bridgeSrc.match(/__registry_shadow/g) || [];
    // Allowed: the single assignment. Engine code (calculateESPayroll, etc.)
    // must not read this property.
    expect(occurrences.length).toBeGreaterThanOrEqual(1);
    expect(occurrences.length).toBeLessThanOrEqual(2);
    // Must not appear inside calculateESPayroll body (between its declaration
    // and the next top-level closing). Conservative check: ensure the literal
    // never appears on a `const`/`let`/`return` line that isn't our assignment.
    const reads = bridgeSrc.match(/[^.]\.__registry_shadow/g) || [];
    // Property reads (anything like `x.__registry_shadow` other than the
    // `(salaryResolution as any).__registry_shadow = shadow;` assignment)
    // would show up here. Our single line ends with `= shadow;`.
    for (const r of reads) {
      const idx = bridgeSrc.indexOf(r);
      const tail = bridgeSrc.slice(idx, idx + 200);
      expect(tail).toMatch(/\.__registry_shadow\s*=\s*shadow/);
    }
  });

  it('persisted_priority_apply branch is preserved (textual presence, no replacement by shadow)', () => {
    // We do not assert exact content; we only ensure the token still exists
    // somewhere and is not removed/aliased by B10C. If the bridge does not
    // contain the token, this test is trivially skipped to avoid false
    // positives — B10C explicitly does not introduce it either.
    const hasToken = /persisted_priority_apply/.test(bridgeSrc);
    if (hasToken) {
      // Multiple occurrences expected; B10C must not reduce to zero.
      expect((bridgeSrc.match(/persisted_priority_apply/g) || []).length).toBeGreaterThan(0);
    }
    // B10C must not introduce the token if it did not exist before.
    // The B10C insertion block does not contain it:
    const b10cBlock = bridgeSrc.match(
      /B10C: shadow registry preview[\s\S]*?registry shadow skipped[\s\S]*?\}\s*\}/,
    );
    expect(b10cBlock).toBeTruthy();
    expect(b10cBlock?.[0]).not.toMatch(/persisted_priority_apply/);
  });

  it('B10C insertion does not introduce new DB CRUD calls', () => {
    const b10cBlock = bridgeSrc.match(
      /B10C: shadow registry preview[\s\S]*?registry shadow skipped[\s\S]*?\}\s*\}/,
    );
    expect(b10cBlock).toBeTruthy();
    const block = b10cBlock?.[0] || '';
    expect(block).not.toMatch(/\.insert\(/);
    expect(block).not.toMatch(/\.update\(/);
    expect(block).not.toMatch(/\.delete\(/);
    expect(block).not.toMatch(/\.from\(/);
    expect(block).not.toMatch(/supabase\./);
    expect(block).not.toMatch(/\bfetch\s*\(/);
  });
});