/**
 * B12.3 — Static safety invariants for the incorporation wizard.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function listWizardFiles(): string[] {
  const dir = path.join(ROOT, 'src/components/erp/hr/collective-agreements/hub/wizard');
  return fs.readdirSync(dir).map((f) => path.join('src/components/erp/hr/collective-agreements/hub/wizard', f));
}

const TARGETS: string[] = [
  ...listWizardFiles(),
  'src/hooks/erp/hr/useAgreementIncorporationActions.ts',
  'src/lib/hr/agreementIncorporationFlow.ts',
  'src/components/erp/hr/collective-agreements/hub/AgreementUnifiedDetailDrawer.tsx',
  'src/components/erp/hr/collective-agreements/hub/AgreementHubPanel.tsx',
];

const FORBIDDEN_IMPORTS = [
  'useESPayrollBridge',
  'payrollEngine',
  'payslipEngine',
  'salaryNormalizer',
  'agreementSalaryResolver',
  'agreementSafetyGate',
];

const FORBIDDEN_TOKENS = [
  '.insert(',
  '.update(',
  '.delete(',
  '.upsert(',
  'supabase.functions.invoke',
  'service_role',
  'SUPABASE_SERVICE_ROLE_KEY',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL =',
  'HR_REGISTRY_PILOT_MODE =',
  'REGISTRY_PILOT_SCOPE_ALLOWLIST =',
];

// Patterns that indicate assignment/mutation (not comparison).
const FORBIDDEN_ASSIGNMENTS = [
  /ready_for_payroll\s*=\s*(?!=)/,
  /verify_jwt\s*=\s*false/,
];

const FORBIDDEN_CTA = [
  /usar en n[oó]mina/i,
  /activar para n[oó]mina/i,
  /activar n[oó]mina/i,
  /aplicar en payroll/i,
  /cambiar n[oó]mina/i,
  /activar flag/i,
  /activar payroll/i,
  /usar convenio en n[oó]mina/i,
];

describe('B12.3 — wizard static safety invariants', () => {
  for (const file of TARGETS) {
    it(`${file} has no forbidden imports`, () => {
      const src = read(file);
      for (const imp of FORBIDDEN_IMPORTS) {
        expect(src).not.toContain(imp);
      }
    });
    it(`${file} has no forbidden tokens`, () => {
      const src = read(file);
      for (const t of FORBIDDEN_TOKENS) {
        expect(src).not.toContain(t);
      }
      for (const re of FORBIDDEN_ASSIGNMENTS) {
        expect(src).not.toMatch(re);
      }
    });
    it(`${file} has no forbidden CTAs`, () => {
      const src = read(file);
      for (const re of FORBIDDEN_CTA) {
        expect(src).not.toMatch(re);
      }
    });
  }

  it('supabase/config.toml does not disable verify_jwt for HR collective agreement functions', () => {
    const cfg = read('supabase/config.toml');
    // Match each [functions.<name>] block individually; only HR collective
    // agreement function blocks must keep verify_jwt enabled.
    const blocks = cfg.split(/\n(?=\[functions\.)/g);
    for (const block of blocks) {
      const header = block.match(/^\[functions\.([^\]]+)\]/);
      if (!header) continue;
      const name = header[1];
      if (!/erp-hr.*(collective-agreement|agreement-registry|agreement-runtime|pilot)/i.test(name)) continue;
      expect(block, `function ${name} must keep verify_jwt enabled`).not.toMatch(/verify_jwt\s*=\s*false/);
    }
  });
});
