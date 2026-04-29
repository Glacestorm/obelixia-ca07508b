/**
 * B10E.3 — Static guards for the runtime payroll data loader.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const loaderPath = resolve(
  __dirname,
  '../../engines/erp/hr/registryRuntimePayrollDataLoader.ts',
);
const raw = existsSync(loaderPath) ? readFileSync(loaderPath, 'utf8') : '';
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('B10E.3 — data loader static guards', () => {
  it('file exists', () => {
    expect(existsSync(loaderPath)).toBe(true);
  });

  it('contains .select( calls', () => {
    expect(src).toMatch(/\.select\(/);
  });

  it('does not contain write operations', () => {
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/\.rpc\(/);
  });

  it('does not reference service_role/admin client', () => {
    expect(src).not.toMatch(/service_role/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/createClient\s*\(/);
  });

  it('does not invoke edge functions', () => {
    expect(src).not.toMatch(/functions\.invoke/);
  });

  it('does not import bridge/payroll/resolver/normalizer/flag/safety gate', () => {
    expect(src).not.toMatch(/useESPayrollBridge/);
    expect(src).not.toMatch(/registryShadowFlag/);
    expect(src).not.toMatch(/agreementSalaryResolver/);
    expect(src).not.toMatch(/salaryNormalizer/);
    expect(src).not.toMatch(/payrollEngine/);
    expect(src).not.toMatch(/payslipEngine/);
    expect(src).not.toMatch(/agreementSafetyGate/);
  });

  it('does not reference operative table erp_hr_collective_agreements (non-registry)', () => {
    expect(src).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('does not write ready_for_payroll', () => {
    expect(src).not.toMatch(/ready_for_payroll\s*=/);
  });

  it('uses the supabase client received via input', () => {
    expect(src).toMatch(/input\.supabaseClient/);
  });
});