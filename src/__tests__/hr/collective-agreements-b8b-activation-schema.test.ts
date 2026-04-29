/**
 * B8B — Activation schema/migration static contract tests.
 *
 * Inspects the B8B migration files directly (no DB), verifying the
 * legal/security invariants of the activation proposal layer.
 *
 * Invariantes verificadas (B8B):
 *   1. 3 tablas creadas (requests, approvals, runs).
 *   2. RLS habilitado en las 3.
 *   3. No policies permisivas (USING (true) / WITH CHECK (true)).
 *   4. approvals append-only (triggers + sin policies UPDATE/DELETE).
 *   5. runs append-only (triggers + sin policies UPDATE/DELETE).
 *   6. approver_id != requested_by (trigger guard).
 *   7. Índice único parcial de live request por agreement_id.
 *   8. Inmutabilidad post-decision (readiness_report_json,
 *      request_signature_hash).
 *   9. No toca flags del registry (ready_for_payroll, ...).
 *  10. No referencia tabla operativa erp_hr_collective_agreements.
 *  11. No referencia payroll/payslip/salaryNormalizer/resolver/bridge.
 *  12. payroll_supervisor se añade de forma no destructiva.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROLE_MIGRATION = 'supabase/migrations/20260429084052_79133117-0789-48ad-8f4e-b801d754072a.sql';
const TABLES_MIGRATION = 'supabase/migrations/20260429084259_fca38dea-94a2-45da-9af4-31443353c71f.sql';

let ROLE_SQL = '';
let SQL = '';
let FULL = '';

beforeAll(() => {
  ROLE_SQL = fs.readFileSync(path.resolve(process.cwd(), ROLE_MIGRATION), 'utf-8');
  SQL = fs.readFileSync(path.resolve(process.cwd(), TABLES_MIGRATION), 'utf-8');
  FULL = ROLE_SQL + '\n' + SQL;
});

const T_REQ = 'erp_hr_collective_agreement_registry_activation_requests';
const T_APPR = 'erp_hr_collective_agreement_registry_activation_approvals';
const T_RUNS = 'erp_hr_collective_agreement_registry_activation_runs';

describe('B8B — schema/migration static contract', () => {
  it('1) creates the three activation tables', () => {
    expect(SQL).toMatch(new RegExp(`CREATE TABLE\\s+public\\.${T_REQ}\\b`));
    expect(SQL).toMatch(new RegExp(`CREATE TABLE\\s+public\\.${T_APPR}\\b`));
    expect(SQL).toMatch(new RegExp(`CREATE TABLE\\s+public\\.${T_RUNS}\\b`));
  });

  it('2) enables RLS on the three tables', () => {
    expect(SQL).toMatch(new RegExp(`ALTER TABLE\\s+public\\.${T_REQ}\\s+ENABLE ROW LEVEL SECURITY`));
    expect(SQL).toMatch(new RegExp(`ALTER TABLE\\s+public\\.${T_APPR}\\s+ENABLE ROW LEVEL SECURITY`));
    expect(SQL).toMatch(new RegExp(`ALTER TABLE\\s+public\\.${T_RUNS}\\s+ENABLE ROW LEVEL SECURITY`));
  });

  it('3) declares no permissive policies (USING (true) / WITH CHECK (true))', () => {
    expect(SQL).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(SQL).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it('4) approvals is append-only: anti-UPDATE and anti-DELETE triggers, no UPDATE/DELETE policies', () => {
    expect(SQL).toMatch(/trg_b8b_approvals_no_update[\s\S]*BEFORE UPDATE ON public\.erp_hr_collective_agreement_registry_activation_approvals/);
    expect(SQL).toMatch(/trg_b8b_approvals_no_delete[\s\S]*BEFORE DELETE ON public\.erp_hr_collective_agreement_registry_activation_approvals/);
    // no UPDATE/DELETE policies on approvals
    const apprPolicyBlock = SQL.match(/CREATE POLICY [^\n]*\n[^;]*activation_approvals[^;]*;/gi) ?? [];
    for (const p of apprPolicyBlock) {
      expect(p).not.toMatch(/FOR\s+UPDATE/i);
      expect(p).not.toMatch(/FOR\s+DELETE/i);
      expect(p).not.toMatch(/FOR\s+INSERT/i);
    }
  });

  it('5) runs is append-only: anti-UPDATE and anti-DELETE triggers, no UPDATE/DELETE policies', () => {
    expect(SQL).toMatch(/trg_b8b_runs_no_update[\s\S]*BEFORE UPDATE ON public\.erp_hr_collective_agreement_registry_activation_runs/);
    expect(SQL).toMatch(/trg_b8b_runs_no_delete[\s\S]*BEFORE DELETE ON public\.erp_hr_collective_agreement_registry_activation_runs/);
    const runsPolicyBlock = SQL.match(/CREATE POLICY [^\n]*\n[^;]*activation_runs[^;]*;/gi) ?? [];
    for (const p of runsPolicyBlock) {
      expect(p).not.toMatch(/FOR\s+UPDATE/i);
      expect(p).not.toMatch(/FOR\s+DELETE/i);
      expect(p).not.toMatch(/FOR\s+INSERT/i);
    }
  });

  it('6) enforces approver_id != requested_by via trigger', () => {
    expect(SQL).toMatch(/tg_b8b_approvals_insert_guard/);
    expect(SQL).toMatch(/approver_id.*must differ from requested_by|approver_id \(%\) must differ from requested_by/);
    expect(SQL).toMatch(/BEFORE INSERT ON public\.erp_hr_collective_agreement_registry_activation_approvals/);
  });

  it('7) declares unique partial index for live request per agreement_id', () => {
    expect(SQL).toMatch(
      /CREATE UNIQUE INDEX\s+\w+\s+ON\s+public\.erp_hr_collective_agreement_registry_activation_requests\s*\(\s*agreement_id\s*\)\s*WHERE\s+activation_status\s+IN\s*\(\s*'draft'\s*,\s*'pending_second_approval'\s*,\s*'approved_for_activation'\s*\)/i,
    );
  });

  it('8) enforces post-decision immutability (readiness_report_json, request_signature_hash)', () => {
    expect(SQL).toMatch(/tg_b8b_requests_decided_immutable/);
    expect(SQL).toMatch(/readiness_report_json is immutable after decision/);
    expect(SQL).toMatch(/request_signature_hash is immutable after decision/);
    expect(SQL).toMatch(/BEFORE UPDATE ON public\.erp_hr_collective_agreement_registry_activation_requests/);
  });

  it('9) does not modify registry safety flags', () => {
    // The migration must not flip ready_for_payroll / data_completeness etc.
    expect(SQL).not.toMatch(/ready_for_payroll\s*(?:=|:)\s*true/i);
    expect(SQL).not.toMatch(/UPDATE\s+public\.erp_hr_collective_agreements_registry\b/i);
    expect(SQL).not.toMatch(/ALTER TABLE\s+public\.erp_hr_collective_agreements_registry\b/i);
    // No assignments to safety flags anywhere
    expect(SQL).not.toMatch(/\bdata_completeness\s*=\s*'human_validated'/i);
    expect(SQL).not.toMatch(/\brequires_human_review\s*=\s*false/i);
    expect(SQL).not.toMatch(/\bofficial_submission_blocked\s*=\s*false/i);
    expect(SQL).not.toMatch(/\bsalary_tables_loaded\s*=\s*true/i);
  });

  it('10) does not reference operational table erp_hr_collective_agreements (without _registry)', () => {
    const matches = SQL.match(/erp_hr_collective_agreements(?!_)/g) ?? [];
    expect(matches).toHaveLength(0);
  });

  it('11) does not reference payroll/payslip/salaryNormalizer/resolver/bridge', () => {
    expect(SQL).not.toMatch(/payslipEngine/i);
    expect(SQL).not.toMatch(/payrollEngine/i);
    expect(SQL).not.toMatch(/salaryNormalizer/i);
    expect(SQL).not.toMatch(/agreementSalaryResolver/i);
    expect(SQL).not.toMatch(/useESPayrollBridge/i);
  });

  it('12) adds payroll_supervisor role non-destructively (ADD VALUE IF NOT EXISTS)', () => {
    expect(ROLE_SQL).toMatch(
      /ALTER TYPE\s+public\.app_role\s+ADD VALUE\s+IF NOT EXISTS\s+'payroll_supervisor'/i,
    );
    // Must not drop or recreate the enum
    expect(ROLE_SQL).not.toMatch(/DROP TYPE\s+public\.app_role/i);
    expect(ROLE_SQL).not.toMatch(/CREATE TYPE\s+public\.app_role/i);
  });

  it('sanity: full migration text is non-empty', () => {
    expect(FULL.length).toBeGreaterThan(500);
  });
});