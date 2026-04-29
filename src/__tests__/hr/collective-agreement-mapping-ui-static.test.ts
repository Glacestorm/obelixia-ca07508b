/**
 * B10C.2B.2C — Static contract checks for the internal mapping UI.
 *
 * Verifies the source files in
 *   src/components/erp/hr/collective-agreements/mappings/
 * and the actions hook
 *   src/hooks/erp/hr/useCompanyAgreementRegistryMappingActions.ts
 * for forbidden imports, forbidden CTAs, no direct DB writes, no
 * service_role, no payroll touch points, and required banner text.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UI_DIR = path.join(
  ROOT,
  'src/components/erp/hr/collective-agreements/mappings',
);
const HOOK_FILE = path.join(
  ROOT,
  'src/hooks/erp/hr/useCompanyAgreementRegistryMappingActions.ts',
);
const PANEL_FILE = path.join(UI_DIR, 'CompanyAgreementRegistryMappingPanel.tsx');
const DIALOG_FILE = path.join(UI_DIR, 'MappingActionDialog.tsx');

function listFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => path.join(dir, f));
}

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

/**
 * Strip block comments (/** ... *\/ and /* ... *\/) and line comments
 * so doc-strings that mention forbidden identifiers as "do NOT use"
 * notes don't false-positive the static checks.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const FORBIDDEN_CTA_STRINGS = [
  'Aplicar en nómina',
  'Activar payroll',
  'Usar en nómina',
  'Cambiar nómina',
  'Activar flag',
  'Activar para nómina',
];

const FORBIDDEN_IDENTIFIERS = [
  'useESPayrollBridge',
  'registryShadowFlag',
  'agreementSalaryResolver',
  'salaryNormalizer',
  'payrollEngine',
  'payslipEngine',
  'agreementSafetyGate',
];

const FORBIDDEN_PAYLOAD_KEYS = [
  'approved_by',
  'approved_at',
  'is_current',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'persisted_priority_apply',
  'C3B3C2',
];

describe('B10C.2B.2C — Mapping UI static contract', () => {
  const uiFiles = listFiles(UI_DIR);
  const allFiles = [...uiFiles, HOOK_FILE];

  it('UI directory has expected components', () => {
    const names = uiFiles.map((f) => path.basename(f));
    expect(names).toContain('CompanyAgreementRegistryMappingPanel.tsx');
    expect(names).toContain('MappingStatusBadge.tsx');
    expect(names).toContain('MappingRationaleCard.tsx');
    expect(names).toContain('MappingCandidateSignalsTable.tsx');
    expect(names).toContain('MappingHistoryList.tsx');
    expect(names).toContain('MappingActionDialog.tsx');
  });

  it('Panel includes the mandatory internal-only banner text', () => {
    const src = read(PANEL_FILE);
    expect(src).toMatch(/Mapping interno — no activa nómina\./);
  });

  it.each(FORBIDDEN_CTA_STRINGS)('UI files do not contain forbidden CTA "%s"', (cta) => {
    for (const f of uiFiles) {
      const src = stripComments(read(f));
      // Allow the FORBIDDEN_CTA_STRINGS array literal in the panel itself
      // (it lists the forbidden strings as data, not as UI text).
      const filtered = src.replace(/FORBIDDEN_CTA_STRINGS[\s\S]*?\];/, '');
      expect(
        filtered.includes(cta),
        `${path.basename(f)} contains forbidden CTA "${cta}"`,
      ).toBe(false);
    }
  });

  it('UI/hook files do not import or reference payroll runtime identifiers', () => {
    for (const f of allFiles) {
      const src = stripComments(read(f));
      for (const id of FORBIDDEN_IDENTIFIERS) {
        expect(
          src.includes(id),
          `${path.basename(f)} references forbidden identifier "${id}"`,
        ).toBe(false);
      }
    }
  });

  it('UI/hook files do not reference HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL or ready_for_payroll as text', () => {
    for (const f of allFiles) {
      const src = stripComments(read(f));
      // The hook lists FORBIDDEN_PAYLOAD_KEYS — that's allowed as a guard, not as UI text.
      const filtered = src.replace(/FORBIDDEN_PAYLOAD_KEYS[\s\S]*?\] as const;/, '');
      const filtered2 = filtered.replace(/FORBIDDEN_CTA_STRINGS[\s\S]*?\] as const;/, '');
      expect(filtered2.includes('HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL')).toBe(false);
      expect(filtered2.includes('ready_for_payroll')).toBe(false);
    }
  });

  it('UI/hook files have no direct .from(...).insert/.update/.upsert/.delete calls', () => {
    const banned = [
      /\.from\([^)]+\)\s*\.insert\(/,
      /\.from\([^)]+\)\s*\.update\(/,
      /\.from\([^)]+\)\s*\.upsert\(/,
      /\.from\([^)]+\)\s*\.delete\(/,
    ];
    for (const f of allFiles) {
      const src = stripComments(read(f));
      for (const re of banned) {
        expect(re.test(src), `${path.basename(f)} matches ${re}`).toBe(false);
      }
    }
  });

  it('UI/hook do not reference operative table erp_hr_collective_agreements without _registry', () => {
    const operative = /erp_hr_collective_agreements(?!_registry|_registry_versions|_registry_sources|_registry_validations|_company_agreement_registry_mappings)/;
    for (const f of allFiles) {
      const src = stripComments(read(f));
      // The mapping table itself is erp_hr_company_agreement_registry_mappings — not affected.
      expect(
        operative.test(src),
        `${path.basename(f)} references operative agreement table`,
      ).toBe(false);
    }
  });

  it('UI/hook do not use service_role', () => {
    for (const f of allFiles) {
      const src = stripComments(read(f));
      expect(src.includes('service_role')).toBe(false);
      expect(src.includes('SERVICE_ROLE_KEY')).toBe(false);
    }
  });

  it('Hook routes all writes through the edge function', () => {
    const src = read(HOOK_FILE);
    expect(src).toMatch(/erp-hr-company-agreement-registry-mapping/);
    expect(src).toMatch(/supabase\.functions\.invoke/);
    // 6 actions
    for (const action of [
      'create_draft',
      'submit_for_review',
      'approve',
      'reject',
      'supersede',
      'list',
    ]) {
      expect(src).toMatch(new RegExp(`'${action}'`));
    }
  });

  it('Hook declares forbidden payload keys and sanitizes them', () => {
    const src = read(HOOK_FILE);
    for (const k of FORBIDDEN_PAYLOAD_KEYS) {
      expect(src.includes(`'${k}'`)).toBe(true);
    }
    expect(src).toMatch(/function sanitize/);
  });

  it('Dialog enforces reason >= 5 and human-confirm gate for cnae_suggestion', () => {
    const src = read(DIALOG_FILE);
    expect(src).toMatch(/reason\.trim\(\)\.length\s*>=\s*5/);
    expect(src).toMatch(/cnae_suggestion/);
    expect(src).toMatch(/humanConfirmed/);
  });

  it('Bridge and shadow flag files are intact (not modified by this Build)', () => {
    const bridge = read(path.join(ROOT, 'src/hooks/erp/hr/useESPayrollBridge.ts'));
    expect(bridge.length).toBeGreaterThan(0);
    const flag = read(path.join(ROOT, 'src/engines/erp/hr/registryShadowFlag.ts'));
    expect(flag).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });
});