/**
 * B13.5C — Static safety contract for the impact UI tree.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/components/erp/hr/collective-agreements/curated/impact';

function listFiles(dir: string): string[] {
  const abs = path.resolve(process.cwd(), dir);
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => path.join(abs, f));
}

let SRC = '';
beforeAll(() => {
  SRC = listFiles(DIR)
    .map((f) => fs.readFileSync(f, 'utf-8'))
    .join('\n\n/* ===file=== */\n\n');
});

describe('B13.5C — impact UI static contract', () => {
  const banned: Array<[string, RegExp]> = [
    ['useESPayrollBridge', /useESPayrollBridge/],
    ['payrollEngine', /payrollEngine/],
    ['payslipEngine', /payslipEngine/],
    ['salaryNormalizer', /salaryNormalizer/],
    ['agreementSalaryResolver', /agreementSalaryResolver/],
    ['agreementSafetyGate', /agreementSafetyGate/],
    ['legacy operative table', /erp_hr_collective_agreements(?!_)/],
    ['from().insert', /\.from\(['"][^'"]+['"]\)\s*\.insert\(/],
    ['from().update', /\.from\(['"][^'"]+['"]\)\s*\.update\(/],
    ['from().delete', /\.from\(['"][^'"]+['"]\)\s*\.delete\(/],
    ['from().upsert', /\.from\(['"][^'"]+['"]\)\s*\.upsert\(/],
    ['service_role', /service_role/],
    ['SUPABASE_SERVICE_ROLE_KEY', /SUPABASE_SERVICE_ROLE_KEY/],
    ['HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL mutation', /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=/],
    ['HR_REGISTRY_PILOT_MODE mutation', /HR_REGISTRY_PILOT_MODE\s*=/],
    ['REGISTRY_PILOT_SCOPE_ALLOWLIST mutation', /REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/],
    ['ready_for_payroll write', /ready_for_payroll\s*[:=]\s*true/],
    ['salary_tables_loaded=true', /salary_tables_loaded\s*[:=]\s*true/],
    ['data_completeness=human_validated', /data_completeness\s*[:=]\s*['"]human_validated['"]/],
    ['Aplicar nómina CTA', /Aplicar nómina/i],
    ['Activar convenio CTA', /Activar convenio/i],
    ['Generar CRA CTA', /Generar CRA/i],
    ['Generar SILTRA CTA', /Generar SILTRA/i],
    ['Generar SEPA CTA', /Generar SEPA/i],
    ['Generar asiento contable CTA', /Generar asiento contable/i],
    ['Marcar listo para nómina CTA', /Marcar listo para nómina/i],
    ['Usar en nómina CTA', /Usar en nómina/i],
    ['Saltar validación CTA', /Saltar validación/i],
  ];

  for (const [label, re] of banned) {
    it(`forbidden: ${label}`, () => {
      expect(SRC).not.toMatch(re);
    });
  }

  it('contains the no-apply banner copy', () => {
    expect(SRC).toMatch(/no aplican nómina, no crean mapping y no activan convenios/);
  });

  it('uses the auth-safe hook', () => {
    expect(SRC).toMatch(/useAgreementImpactPreviews/);
  });
});