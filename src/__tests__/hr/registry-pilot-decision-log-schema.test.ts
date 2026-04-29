/**
 * B10F.4 — Schema + safety contract tests for the pilot decision log.
 *
 * Verifies:
 *  - dedicated table is created (NOT reusing apply_runs.outcome);
 *  - expected columns and CHECK on decision_outcome;
 *  - signature/validation trigger;
 *  - append-only (no UPDATE / no DELETE);
 *  - RLS enabled + forced;
 *  - SELECT policy with role + company gate;
 *  - no UPDATE/DELETE/INSERT policies;
 *  - no USING(true) / WITH CHECK(true);
 *  - no reference to operative table erp_hr_collective_agreements
 *    (without `_registry`);
 *  - migration does NOT modify apply_runs CHECK constraint;
 *  - bridge / shadow flag / pilot gate files unchanged in spirit.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const TABLE = 'erp_hr_company_agreement_registry_pilot_decision_logs';

function findMigrationSql(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (sql.includes(TABLE) && sql.includes('CREATE TABLE')) {
      return sql;
    }
  }
  throw new Error('B10F.4 migration not found');
}

const SQL = findMigrationSql();

describe('B10F.4 — pilot decision log table SQL contract', () => {
  it('creates the table', () => {
    expect(SQL).toMatch(new RegExp(`CREATE TABLE public\\.${TABLE}`));
  });

  it('has all expected columns', () => {
    for (const col of [
      'company_id uuid NOT NULL',
      'employee_id uuid NOT NULL',
      'contract_id uuid NOT NULL',
      'target_year integer NOT NULL',
      'runtime_setting_id uuid NULL',
      'mapping_id uuid NULL',
      'registry_agreement_id uuid NULL',
      'registry_version_id uuid NULL',
      'decision_outcome text NOT NULL',
      'decision_reason text NOT NULL',
      'comparison_summary_json jsonb NOT NULL',
      'blockers_json jsonb NOT NULL',
      'warnings_json jsonb NOT NULL',
      'trace_json jsonb NOT NULL',
      'decided_by uuid NULL',
      'decided_at timestamptz NOT NULL',
      'signature_hash text NOT NULL',
    ]) {
      expect(SQL.includes(col), `missing column: ${col}`).toBe(true);
    }
  });

  it('CHECK decision_outcome contains pilot_applied / pilot_blocked / pilot_fallback', () => {
    for (const v of ['pilot_applied', 'pilot_blocked', 'pilot_fallback']) {
      expect(SQL).toMatch(new RegExp(`'${v}'`));
    }
    expect(SQL).toMatch(/decision_outcome IN \('pilot_applied','pilot_blocked','pilot_fallback'\)/);
  });

  it('FKs point to registry tables (RESTRICT)', () => {
    expect(SQL).toMatch(/REFERENCES public\.erp_hr_company_agreement_registry_runtime_settings\(id\)\s*ON DELETE RESTRICT/);
    expect(SQL).toMatch(/REFERENCES public\.erp_hr_company_agreement_registry_mappings\(id\)\s*ON DELETE RESTRICT/);
    expect(SQL).toMatch(/REFERENCES public\.erp_hr_collective_agreements_registry\(id\)\s*ON DELETE RESTRICT/);
    expect(SQL).toMatch(/REFERENCES public\.erp_hr_collective_agreements_registry_versions\(id\)\s*ON DELETE RESTRICT/);
  });

  it('decided_by FK to auth.users', () => {
    expect(SQL).toMatch(/decided_by uuid NULL REFERENCES auth\.users\(id\)/);
  });

  it('signature_hash trigger validates SHA-256 format', () => {
    expect(SQL).toMatch(/signature_hash !~ '\^\[a-f0-9\]\{64\}\$'/);
    expect(SQL).toMatch(/pilot_decision_logs_invalid_signature_hash/);
    expect(SQL).toMatch(/tg_car_pilot_decision_logs_validate/);
  });

  it('validation trigger checks required fields and target_year', () => {
    for (const r of [
      'pilot_decision_logs_company_required',
      'pilot_decision_logs_employee_required',
      'pilot_decision_logs_contract_required',
      'pilot_decision_logs_invalid_target_year',
      'pilot_decision_logs_reason_required',
    ]) {
      expect(SQL).toMatch(new RegExp(r));
    }
  });

  it('append-only: no UPDATE and no DELETE allowed', () => {
    expect(SQL).toMatch(/trg_car_pilot_decision_logs_no_update[\s\S]*BEFORE UPDATE/);
    expect(SQL).toMatch(/trg_car_pilot_decision_logs_no_delete[\s\S]*BEFORE DELETE/);
    expect(SQL).toMatch(/pilot_decision_logs_append_only/);
  });
});

describe('B10F.4 — RLS and policies', () => {
  it('enables and FORCEs RLS', () => {
    expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${TABLE} ENABLE ROW LEVEL SECURITY`));
    expect(SQL).toMatch(new RegExp(`ALTER TABLE public\\.${TABLE} FORCE\\s+ROW LEVEL SECURITY`));
  });

  it('SELECT policy exists with role + company gate', () => {
    expect(SQL).toMatch(/car_pilot_decision_logs_select_authorized[\s\S]*FOR SELECT/);
    expect(SQL).toMatch(/user_has_erp_company_access\(company_id\)/);
    for (const role of [
      'superadmin',
      'admin',
      'hr_manager',
      'legal_manager',
      'payroll_supervisor',
      'auditor',
    ]) {
      expect(SQL).toMatch(new RegExp(`has_role\\(auth\\.uid\\(\\), '${role}'::app_role\\)`));
    }
  });

  it('no INSERT/UPDATE/DELETE policies on the table', () => {
    const writePolicy = new RegExp(
      `CREATE POLICY[\\s\\S]*?FOR (INSERT|UPDATE|DELETE)[\\s\\S]*?ON public\\.${TABLE}`,
    );
    expect(writePolicy.test(SQL)).toBe(false);
  });

  it('does not contain USING(true) / WITH CHECK(true)', () => {
    expect(/USING\s*\(\s*true\s*\)/i.test(SQL)).toBe(false);
    expect(/WITH CHECK\s*\(\s*true\s*\)/i.test(SQL)).toBe(false);
  });
});

describe('B10F.4 — Isolation contract', () => {
  it('migration does NOT reference operative table erp_hr_collective_agreements (without _registry)', () => {
    const operative = /erp_hr_collective_agreements(?!_registry|_registry_versions|_registry_sources|_registry_validations)/;
    expect(operative.test(SQL)).toBe(false);
  });

  it('migration does NOT modify apply_runs outcome CHECK', () => {
    expect(SQL).not.toMatch(/erp_hr_company_agreement_registry_apply_runs[\s\S]{0,200}outcome IN/);
    expect(SQL).not.toMatch(/ALTER TABLE[\s\S]*erp_hr_company_agreement_registry_apply_runs/);
  });

  it('migration does NOT write ready_for_payroll', () => {
    expect(SQL.includes('ready_for_payroll')).toBe(false);
  });

  const FORBIDDEN = [
    'useESPayrollBridge',
    'registryShadowFlag',
    'registryPilotGate',
    'agreementSalaryResolver',
    'salaryNormalizer',
    'payrollEngine',
    'payslipEngine',
    'agreementSafetyGate',
    'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
    'HR_REGISTRY_PILOT_MODE',
    'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    'persisted_priority_apply',
    'C3B3C2',
  ];

  it('migration does NOT reference forbidden runtime identifiers', () => {
    for (const id of FORBIDDEN) {
      expect(SQL.includes(id), `migration references ${id}`).toBe(false);
    }
  });

  it('useESPayrollBridge.ts is intact', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/hooks/erp/hr/useESPayrollBridge.ts'),
      'utf8',
    );
    expect(src.length).toBeGreaterThan(0);
  });

  it('registryShadowFlag still exports false', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/engines/erp/hr/registryShadowFlag.ts'),
      'utf8',
    );
    expect(src).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });

  it('registryPilotGate still exports HR_REGISTRY_PILOT_MODE = false and empty allow-list', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/engines/erp/hr/registryPilotGate.ts'),
      'utf8',
    );
    expect(src).toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*false/);
    expect(src).toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST[\s\S]{0,200}=\s*\[\s*\]/);
  });
});
