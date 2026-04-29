/**
 * B10A — Tests for the registry-aware agreement resolver (preview-only).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveRegistryAgreementPreview,
  type ResolveRegistryAgreementPreviewInput,
  type RegistryAgreementSnapshot,
  type RegistryAgreementVersionSnapshot,
  type RegistryAgreementSourceSnapshot,
  type RegistrySalaryTableSnapshot,
  type RegistryRuleSnapshot,
} from '@/engines/erp/hr/registryAwareAgreementResolver';

const AG_ID = '00000000-0000-0000-0000-00000000a001';
const VER_ID = '00000000-0000-0000-0000-00000000b001';
const SRC_ID = '00000000-0000-0000-0000-00000000c001';

function makeAgreement(o: Partial<RegistryAgreementSnapshot> = {}): RegistryAgreementSnapshot {
  return {
    id: AG_ID,
    internal_code: 'CCN-TEST-001',
    status: 'vigente',
    ready_for_payroll: true,
    requires_human_review: false,
    data_completeness: 'human_validated',
    salary_tables_loaded: true,
    ...o,
  };
}
function makeVersion(o: Partial<RegistryAgreementVersionSnapshot> = {}): RegistryAgreementVersionSnapshot {
  return { id: VER_ID, agreement_id: AG_ID, is_current: true, source_hash: 'h', ...o };
}
function makeSource(o: Partial<RegistryAgreementSourceSnapshot> = {}): RegistryAgreementSourceSnapshot {
  return { id: SRC_ID, agreement_id: AG_ID, source_quality: 'official', document_hash: 'h', ...o };
}
function makeSalaryRow(o: Partial<RegistrySalaryTableSnapshot> = {}): RegistrySalaryTableSnapshot {
  return {
    id: 'st-1',
    agreement_id: AG_ID,
    version_id: VER_ID,
    year: 2026,
    professional_group: 'I',
    category: 'Oficial 1ª',
    level: 'A',
    salary_base_monthly: 1500,
    plus_convenio: 80,
    plus_transport: 0,
    row_confidence: 0.95,
    ...o,
  };
}
function makeRule(o: Partial<RegistryRuleSnapshot> = {}): RegistryRuleSnapshot {
  return {
    id: 'r-1',
    agreement_id: AG_ID,
    version_id: VER_ID,
    rule_kind: 'jornada_anual',
    rule_value_json: { hours: 1780 },
    ...o,
  };
}
function happyInput(): ResolveRegistryAgreementPreviewInput {
  return {
    agreement: makeAgreement(),
    version: makeVersion(),
    source: makeSource(),
    salaryTables: [makeSalaryRow()],
    rules: [makeRule()],
    targetYear: 2026,
  };
}

describe('B10A — eligibility blockers', () => {
  it('agreement null → agreement_missing', () => {
    const r = resolveRegistryAgreementPreview({ ...happyInput(), agreement: null });
    expect(r.canUseForPayroll).toBe(false);
    expect(r.source).toBe('operative');
    expect(r.blockers).toContain('agreement_missing');
  });
  it('version null → version_missing', () => {
    const r = resolveRegistryAgreementPreview({ ...happyInput(), version: null });
    expect(r.blockers).toContain('version_missing');
  });
  it('source null → source_missing', () => {
    const r = resolveRegistryAgreementPreview({ ...happyInput(), source: null });
    expect(r.blockers).toContain('source_missing');
  });
  it('not ready_for_payroll → not_ready_for_payroll', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      agreement: makeAgreement({ ready_for_payroll: false }),
    });
    expect(r.blockers).toContain('not_ready_for_payroll');
  });
  it('requires_human_review=true → requires_human_review', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      agreement: makeAgreement({ requires_human_review: true }),
    });
    expect(r.blockers).toContain('requires_human_review');
  });
  it('data_completeness != human_validated → not_human_validated', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      agreement: makeAgreement({ data_completeness: 'parsed_full' }),
    });
    expect(r.blockers).toContain('not_human_validated');
  });
  it('salary_tables_loaded=false → salary_tables_not_loaded', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      agreement: makeAgreement({ salary_tables_loaded: false }),
    });
    expect(r.blockers).toContain('salary_tables_not_loaded');
  });
  it('status denunciado_sin_ultra → agreement_status_not_valid', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      agreement: makeAgreement({ status: 'denunciado_sin_ultra' }),
    });
    expect(r.blockers).toContain('agreement_status_not_valid');
  });
  it('version not current → version_not_current', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      version: makeVersion({ is_current: false }),
    });
    expect(r.blockers).toContain('version_not_current');
  });
  it('source not official → source_not_official', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      source: makeSource({ source_quality: 'unofficial' }),
    });
    expect(r.blockers).toContain('source_not_official');
  });
  it('unresolved critical warnings > 0 → blocker', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      unresolvedCriticalWarningsCount: 2,
    });
    expect(r.blockers).toContain('unresolved_critical_warnings');
  });
  it('discarded critical rows unresolved > 0 → blocker', () => {
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      discardedCriticalRowsUnresolvedCount: 1,
    });
    expect(r.blockers).toContain('discarded_critical_rows_unresolved');
  });
  it('salary tables empty → no_salary_tables', () => {
    const r = resolveRegistryAgreementPreview({ ...happyInput(), salaryTables: [] });
    expect(r.blockers).toContain('no_salary_tables');
  });
  it('rules empty → no_rules', () => {
    const r = resolveRegistryAgreementPreview({ ...happyInput(), rules: [] });
    expect(r.blockers).toContain('no_rules');
  });
});

describe('B10A — happy path & matching', () => {
  it('happy path returns canUseForPayroll=true, source=registry, concepts>0', () => {
    const r = resolveRegistryAgreementPreview(happyInput());
    expect(r.canUseForPayroll).toBe(true);
    expect(r.source).toBe('registry');
    expect(r.registryAgreementId).toBe(AG_ID);
    expect(r.registryVersionId).toBe(VER_ID);
    expect(r.conceptsPreview.length).toBeGreaterThan(0);
    expect(r.blockers).toHaveLength(0);
  });
  it('emits REGISTRY_SALARY_BASE_MONTHLY and REGISTRY_PLUS_CONVENIO', () => {
    const r = resolveRegistryAgreementPreview(happyInput());
    const codes = r.conceptsPreview.map((c) => c.code);
    expect(codes).toContain('REGISTRY_SALARY_BASE_MONTHLY');
    expect(codes).toContain('REGISTRY_PLUS_CONVENIO');
  });
  it('exact match by group/category/level selects only that row', () => {
    const a = makeSalaryRow({ id: 'st-a', professional_group: 'I', category: 'Oficial 1ª', level: 'A' });
    const b = makeSalaryRow({ id: 'st-b', professional_group: 'II', category: 'Peón', level: 'B' });
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      salaryTables: [a, b],
      targetGroup: 'I',
      targetCategory: 'Oficial 1ª',
      targetLevel: 'A',
    });
    expect(r.salaryRowsMatched).toBe(1);
    expect(r.warnings).not.toContain('no_exact_salary_row_match');
  });
  it('no exact match falls back to all available rows with warning', () => {
    const a = makeSalaryRow({ id: 'st-a', professional_group: 'I' });
    const b = makeSalaryRow({ id: 'st-b', professional_group: 'II' });
    const r = resolveRegistryAgreementPreview({
      ...happyInput(),
      salaryTables: [a, b],
      targetGroup: 'IX',
    });
    expect(r.salaryRowsMatched).toBe(2);
    expect(r.warnings).toContain('no_exact_salary_row_match');
  });
  it('null/0/non-numeric amounts do not produce concepts', () => {
    const row = makeSalaryRow({
      salary_base_monthly: 0,
      plus_convenio: null,
      plus_transport: undefined as unknown as number,
      plus_antiguedad: Number.NaN,
      plus_responsabilidad: 200,
    });
    const r = resolveRegistryAgreementPreview({ ...happyInput(), salaryTables: [row] });
    const codes = r.conceptsPreview.map((c) => c.code);
    expect(codes).not.toContain('REGISTRY_SALARY_BASE_MONTHLY');
    expect(codes).not.toContain('REGISTRY_PLUS_CONVENIO');
    expect(codes).not.toContain('REGISTRY_PLUS_TRANSPORT');
    expect(codes).not.toContain('REGISTRY_PLUS_ANTIGUEDAD');
    expect(codes).toContain('REGISTRY_PLUS_RESPONSABILIDAD');
  });
  it('idempotent: same input → same output', () => {
    const i = happyInput();
    const a = resolveRegistryAgreementPreview(i);
    const b = resolveRegistryAgreementPreview(i);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('other_pluses_json produces REGISTRY_OTHER_PLUS:<key>', () => {
    const row = makeSalaryRow({
      other_pluses_json: { peligrosidad: 50, idiomas: 0, devalued: -5 },
    });
    const r = resolveRegistryAgreementPreview({ ...happyInput(), salaryTables: [row] });
    const codes = r.conceptsPreview.map((c) => c.code);
    expect(codes).toContain('REGISTRY_OTHER_PLUS:peligrosidad');
    expect(codes).not.toContain('REGISTRY_OTHER_PLUS:idiomas');
    expect(codes).not.toContain('REGISTRY_OTHER_PLUS:devalued');
  });
});

// ===================== Static contract =====================

const SRC_FILE = 'src/engines/erp/hr/registryAwareAgreementResolver.ts';
let SRC = '';
beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), SRC_FILE), 'utf-8');
});

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('B10A — static contract', () => {
  it('does not import Supabase / fetch / React / hooks', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(code).not.toMatch(/createClient/);
    expect(code).not.toMatch(/\bfetch\s*\(/);
    expect(code).not.toMatch(/from ['"]react['"]/);
    expect(code).not.toMatch(/\buseState\b|\buseEffect\b|\buseMemo\b|\buseCallback\b/);
  });
  it('does not mention payroll runtime / operative resolver / bridge', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/payrollEngine/);
    expect(code).not.toMatch(/payslipEngine/);
    expect(code).not.toMatch(/salaryNormalizer/);
    expect(code).not.toMatch(/agreementSalaryResolver/);
    expect(code).not.toMatch(/useESPayrollBridge/);
  });
  it('does not reference operational table erp_hr_collective_agreements (without _registry/_)', () => {
    const code = stripComments(SRC);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });
  it('does not perform DB writes/reads via supabase methods', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/\.from\(/);
    expect(code).not.toMatch(/\.insert\(/);
    expect(code).not.toMatch(/\.update\(/);
    expect(code).not.toMatch(/\.delete\(/);
  });
  it('does not mention persisted_priority_apply or C3B3C2', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/persisted_priority_apply/);
    expect(code).not.toMatch(/C3B3C2/);
  });
});
