/**
 * B10D.3 — Edge function static contract tests for
 * `erp-hr-company-agreement-runtime-apply`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGE =
  'supabase/functions/erp-hr-company-agreement-runtime-apply/index.ts';
const CONFIG = 'supabase/config.toml';
const BRIDGE = 'src/hooks/erp/hr/useESPayrollBridge.ts';
const FLAG = 'src/engines/erp/hr/registryShadowFlag.ts';

let SRC = '';
let CFG = '';
let BRIDGE_SRC = '';
let FLAG_SRC = '';

beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), EDGE), 'utf-8');
  CFG = fs.readFileSync(path.resolve(process.cwd(), CONFIG), 'utf-8');
  BRIDGE_SRC = fs.readFileSync(path.resolve(process.cwd(), BRIDGE), 'utf-8');
  FLAG_SRC = fs.readFileSync(path.resolve(process.cwd(), FLAG), 'utf-8');
});

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('B10D.3 — runtime apply edge static checks', () => {
  it('config declares verify_jwt = true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-company-agreement-runtime-apply\]\s*\nverify_jwt\s*=\s*true/,
    );
  });

  it('edge file exists and is non-empty', () => {
    expect(SRC.length).toBeGreaterThan(500);
  });

  it('uses Deno.env for service role', () => {
    expect(SRC).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  });

  it('does not contain hardcoded JWT-shaped service-role key', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('does not reference operational table erp_hr_collective_agreements (without _registry)', () => {
    const code = stripComments(SRC);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });

  it('does not import bridge / shadow flag / resolver / normalizer / engines / safety gate', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/useESPayrollBridge/);
    expect(code).not.toMatch(/registryShadowFlag/);
    expect(code).not.toMatch(/agreementSalaryResolver/);
    expect(code).not.toMatch(/salaryNormalizer/);
    expect(code).not.toMatch(/payrollEngine/);
    expect(code).not.toMatch(/payslipEngine/);
    expect(code).not.toMatch(/agreementSafetyGate/);
  });

  it('does not contain .delete( anywhere', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/\.delete\(/);
  });

  it('never assigns ready_for_payroll = ...', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/ready_for_payroll\s*=\s*true/);
    expect(code).not.toMatch(/ready_for_payroll\s*:\s*true/);
  });

  it('declares FORBIDDEN_PAYLOAD_KEYS with full list', () => {
    expect(SRC).toMatch(/FORBIDDEN_PAYLOAD_KEYS/);
    const required = [
      'second_approved_by',
      'second_approved_at',
      'is_current',
      'activation_run_id',
      'rollback_run_id',
      'request_status',
      'use_registry_for_payroll',
      'ready_for_payroll',
      'requires_human_review',
      'data_completeness',
      'salary_tables_loaded',
      'source_quality',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'persisted_priority_apply',
      'C3B3C2',
      'signature_hash',
      'run_signature_hash',
      'executed_by',
      'executed_at',
      'activated_by',
      'activated_at',
      'requested_by',
      'requested_at',
      'comparison_critical_diffs_count',
    ];
    for (const k of required) {
      expect(SRC).toContain(`'${k}'`);
    }
  });

  it('uses zod .strict() in schemas', () => {
    const occurrences = SRC.match(/\.strict\(\)/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(7);
  });

  it('declares all seven known actions', () => {
    for (const a of [
      'create_request',
      'submit_for_second_approval',
      'second_approve',
      'reject',
      'activate',
      'rollback',
      'list',
    ]) {
      expect(SRC).toContain(`'${a}'`);
    }
  });

  it('has mapError function', () => {
    expect(SRC).toMatch(/function mapError/);
    expect(SRC).toMatch(/INTERNAL_ERROR/);
  });

  it('does not return raw error.message', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/error\.message/);
    expect(code).not.toMatch(/err\.message/);
  });

  it('does not return .stack', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/\.stack/);
  });

  it('mirrors service contract: validates registry readiness flags in second_approve', () => {
    expect(SRC).toMatch(/ready_for_payroll\s*===\s*true/);
    expect(SRC).toMatch(/requires_human_review\s*===\s*false/);
    expect(SRC).toMatch(/data_completeness\s*===\s*'human_validated'/);
    expect(SRC).toMatch(/source_quality\s*===\s*'official'/);
  });

  it('declares authorized roles without hr_manager', () => {
    expect(SRC).toMatch(/AUTHORIZED_ROLES/);
    expect(SRC).toMatch(/'superadmin'/);
    expect(SRC).toMatch(/'admin'/);
    expect(SRC).toMatch(/'legal_manager'/);
    expect(SRC).toMatch(/'payroll_supervisor'/);
    // hr_manager must not appear inside the AUTHORIZED_ROLES tuple
    const m = SRC.match(/AUTHORIZED_ROLES\s*=\s*\[([\s\S]*?)\]/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/hr_manager/);
  });

  it('declares the four required acknowledgements', () => {
    expect(SRC).toContain("'understands_runtime_enable'");
    expect(SRC).toContain("'reviewed_comparison_report'");
    expect(SRC).toContain("'reviewed_payroll_impact'");
    expect(SRC).toContain("'confirms_rollback_available'");
  });

  it('uses dual client (anon + service_role)', () => {
    expect(SRC).toMatch(/SUPABASE_ANON_KEY/);
    expect(SRC).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(SRC).toMatch(/Authorization:\s*authHeader/);
  });

  it('uses getClaims for token verification', () => {
    expect(SRC).toMatch(/auth\.getClaims/);
  });

  it('checks user_has_erp_company_access via RPC', () => {
    expect(SRC).toMatch(/user_has_erp_company_access/);
  });

  it('does not contain HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = true', () => {
    expect(SRC).not.toMatch(
      /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/,
    );
  });

  it('does not reference persisted_priority_apply or C3B3C2 outside FORBIDDEN list', () => {
    // Both tokens may appear ONLY inside the FORBIDDEN list. Count must
    // be exactly one occurrence each.
    const ppa = SRC.match(/persisted_priority_apply/g) ?? [];
    const c3 = SRC.match(/C3B3C2/g) ?? [];
    expect(ppa.length).toBe(1);
    expect(c3.length).toBe(1);
  });

  it('useESPayrollBridge.ts is intact (no edge import)', () => {
    expect(BRIDGE_SRC).not.toMatch(/erp-hr-company-agreement-runtime-apply/);
  });

  it('registryShadowFlag.ts still exports false', () => {
    expect(FLAG_SRC).toMatch(
      /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });

  it('mirrors pure service file existence (B10D.2)', () => {
    const svc = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'src/engines/erp/hr/collectiveAgreementRuntimeApplyService.ts',
      ),
      'utf-8',
    );
    expect(svc).toMatch(/RuntimeApplyAdapter/);
    expect(svc).toMatch(/evaluateRuntimeApplyInvariants/);
  });
});