/**
 * B11.1C — Static guards for the "generic non-territorial" blocker.
 *
 * Verifies that:
 *   - the helper module exists and explicitly lists AGRO-NAC,
 *   - the helper does not contain DB writes, edge invokes, bridge /
 *     payroll engine / resolver imports, flag mutations or allow-list
 *     mutations,
 *   - the QA doc records the B11.1C decision and recommendation,
 *   - the registry shadow flag remains false.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../..');
const helperPath = resolve(
  repoRoot,
  'src/lib/hr/agreementGenericTerritorialBlocker.ts',
);
const docPath = resolve(
  repoRoot,
  'docs/qa/HR_COLLECTIVE_AGREEMENTS_B11_1_AGRO_NAC_OFFICIAL_VERIFICATION.md',
);
const shadowFlagPath = resolve(
  repoRoot,
  'src/engines/erp/hr/registryShadowFlag.ts',
);

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('B11.1C — generic non-territorial blocker static guards', () => {
  it('helper module exists and lists AGRO-NAC explicitly', () => {
    expect(existsSync(helperPath)).toBe(true);
    const src = read(helperPath);
    expect(src).toMatch(/GENERIC_NON_TERRITORIAL_INTERNAL_CODES/);
    expect(src).toMatch(/'AGRO-NAC'/);
    expect(src).toMatch(/REQUIERE_CONVENIO_TERRITORIAL/);
  });

  it('helper is read-only: no DB writes, no edge invokes, no service_role', () => {
    const src = read(helperPath);
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/supabase\.functions\.invoke/);
    expect(src).not.toMatch(/service_role/);
  });

  it('helper does not import bridge / payroll engines / resolvers / flags', () => {
    const src = read(helperPath);
    expect(src).not.toMatch(/useESPayrollBridge/);
    expect(src).not.toMatch(/payrollEngine|payslipEngine|salaryNormalizer|agreementSalaryResolver/);
    expect(src).not.toMatch(/HR_REGISTRY_PILOT_MODE/);
    expect(src).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL/);
    expect(src).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST/);
    // No reference to the operative table.
    expect(src).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('QA doc records the B11.1C decision and recommendation', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/B11\.1C/);
    expect(doc).toMatch(/no activable como convenio estatal genérico/i);
    expect(doc).toMatch(/REQUIERE_CONVENIO_TERRITORIAL/);
    expect(doc).toMatch(
      /Para usar el sector agrario en n[oó]mina debe seleccionarse un convenio territorial concreto/,
    );
  });

  it('registry shadow flag remains false (HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL)', () => {
    const src = read(shadowFlagPath);
    expect(src).toMatch(
      /export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });
});