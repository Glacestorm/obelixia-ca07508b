/**
 * B11.2C.1 — Static guards on the OCR/manual staging engine.
 * Verifies the engine module remains a pure helper isolated from
 * payroll/bridge and never auto-writes any forbidden flag.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ENGINE_PATH = resolve(
  process.cwd(),
  'src/engines/erp/hr/ticNacSalaryTableOcrStaging.ts',
);

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');

function findMigrationSql(): string {
  if (!existsSync(MIGRATIONS_DIR)) return '';
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files.slice().reverse()) {
    const content = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (content.includes('erp_hr_collective_agreement_salary_table_staging')) {
      return content;
    }
  }
  return '';
}

describe('B11.2C.1 — static guards (engine + migration)', () => {
  const src = readFileSync(ENGINE_PATH, 'utf8');
  const sql = findMigrationSql();

  it('engine does not import bridge / payroll / payslip / normalizer / resolver', () => {
    expect(src).not.toMatch(/useESPayrollBridge/);
    expect(src).not.toMatch(/payrollEngine/);
    expect(src).not.toMatch(/payslipEngine/);
    expect(src).not.toMatch(/salaryNormalizer/);
    expect(src).not.toMatch(/agreementSalaryResolver/);
  });

  it('engine has no DB write methods', () => {
    expect(src).not.toMatch(/\.insert\s*\(/);
    expect(src).not.toMatch(/\.update\s*\(/);
    expect(src).not.toMatch(/\.delete\s*\(/);
    expect(src).not.toMatch(/\.upsert\s*\(/);
  });

  it('engine never references service_role', () => {
    expect(src).not.toMatch(/service_role/);
  });

  it('engine does not reference pilot flags or allow-list', () => {
    expect(src).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL/);
    expect(src).not.toMatch(/HR_REGISTRY_PILOT_MODE/);
    expect(src).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST/);
  });

  it('engine does not assign forbidden flags', () => {
    expect(src).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    expect(src).not.toMatch(/salary_tables_loaded\s*[:=]\s*true/);
    expect(src).not.toMatch(/data_completeness\s*[:=]\s*['"]human_validated['"]/);
  });

  it('migration only touches staging/audit, never operative table', () => {
    expect(sql.length).toBeGreaterThan(0);
    // Should not write the operative table (the bare one without _registry suffix).
    expect(sql).not.toMatch(/UPDATE\s+public\.erp_hr_collective_agreements\b(?!_)/i);
    expect(sql).not.toMatch(/INSERT\s+INTO\s+public\.erp_hr_collective_agreements\b(?!_)/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.erp_hr_collective_agreements\b(?!_)/i);
  });

  it('migration does not flip ready_for_payroll or salary_tables_loaded', () => {
    expect(sql).not.toMatch(/ready_for_payroll\s*=\s*true/i);
    expect(sql).not.toMatch(/salary_tables_loaded\s*=\s*true/i);
    expect(sql).not.toMatch(/data_completeness\s*=\s*'human_validated'/i);
  });
});