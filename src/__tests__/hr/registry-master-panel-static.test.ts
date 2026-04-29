/**
 * B12.1 — Static safety checks for RegistryMasterPanel.
 * Verifies read-only invariants by inspecting the source text.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const PANEL_PATH = 'src/components/erp/hr/collective-agreements/registry-master/RegistryMasterPanel.tsx';

describe('B12.1 — RegistryMasterPanel static guarantees', () => {
  const fullPath = resolve(process.cwd(), PANEL_PATH);
  const exists = existsSync(fullPath);
  const src = exists ? readFileSync(fullPath, 'utf8') : '';

  it('panel file exists', () => {
    expect(exists).toBe(true);
  });

  it('contains read-only banner', () => {
    expect(src).toContain('Vista read-only del Registro Maestro');
    expect(src).toContain('No activa nómina');
  });

  it('does not import payroll bridge', () => {
    expect(src).not.toMatch(/useESPayrollBridge/);
  });

  it('does not import payrollEngine/payslipEngine', () => {
    expect(src).not.toMatch(/payrollEngine/);
    expect(src).not.toMatch(/payslipEngine/);
  });

  it('does not import salaryNormalizer', () => {
    expect(src).not.toMatch(/salaryNormalizer/);
  });

  it('does not import agreementSalaryResolver', () => {
    expect(src).not.toMatch(/agreementSalaryResolver/);
  });

  it('does not import agreementSafetyGate', () => {
    expect(src).not.toMatch(/agreementSafetyGate/);
  });

  it('contains no DB write calls', () => {
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/\.rpc\(/);
  });

  it('does not reference service_role', () => {
    expect(src).not.toMatch(/service_role/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('does not reference operative table erp_hr_collective_agreements without _registry suffix', () => {
    // Strip any registry-suffixed occurrences first, then assert the bare
    // operative-table identifier is absent.
    const stripped = src.replace(/erp_hr_collective_agreements_registry/g, '__REG__');
    expect(stripped).not.toMatch(/erp_hr_collective_agreements\b/);
  });

  it('does not write ready_for_payroll', () => {
    // Allowed: SELECT projection of ready_for_payroll for read-only display.
    expect(src).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    expect(src).not.toMatch(/update.*ready_for_payroll/i);
  });

  it('does not mutate global registry flags', () => {
    expect(src).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=/);
    expect(src).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=/);
    expect(src).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
  });
});