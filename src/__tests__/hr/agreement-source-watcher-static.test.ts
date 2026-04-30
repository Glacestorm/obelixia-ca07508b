/**
 * B13.1 — Static guards on the Source Watcher edge + hook.
 *
 * The Source Watcher MUST NOT:
 *  - import payroll bridge / payroll engine / payslip engine /
 *    salary normalizer / agreement salary resolver
 *  - reference the operative table `erp_hr_collective_agreements`
 *    (only the `_source_watch_queue` variant is allowed)
 *  - use `service_role` from the frontend
 *  - mutate pilot flags or allow-list
 *  - write `ready_for_payroll` / `salary_tables_loaded=true` /
 *    `data_completeness='human_validated'`
 *  - touch any other table than `erp_hr_collective_agreement_source_watch_queue`
 *    and `user_roles` (for role check)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = readFileSync(
  resolve(process.cwd(), 'supabase/functions/erp-hr-agreement-source-watcher/index.ts'),
  'utf8',
);
const HOOK = readFileSync(
  resolve(process.cwd(), 'src/hooks/erp/hr/useAgreementSourceWatch.ts'),
  'utf8',
);
const FRONT = HOOK; // only frontend file in this build
const ALL = `${EDGE}\n---\n${HOOK}`;

describe('B13.1 — Source Watcher static guards', () => {
  it('edge declares verify_jwt = true via config.toml', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');
    expect(cfg).toMatch(
      /\[functions\.erp-hr-agreement-source-watcher\][\s\S]*?verify_jwt\s*=\s*true/,
    );
  });

  it('edge + hook do not import payroll bridge / engines / normalizer / resolver', () => {
    for (const f of [
      'useESPayrollBridge',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(ALL).not.toContain(f);
    }
  });

  it('does not reference the operative table erp_hr_collective_agreements', () => {
    // Allow only `_source_watch_queue`. Anything else is forbidden.
    const matches =
      ALL.match(/erp_hr_collective_agreements?(?!_source_watch_queue)[a-z_]*/g) ?? [];
    // After filter, anything left is a violation.
    const violations = matches.filter(
      (m) => !m.startsWith('erp_hr_collective_agreement_source_watch_queue'),
    );
    expect(violations).toEqual([]);
  });

  it('frontend hook never references service_role / SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(FRONT).not.toMatch(/service_role/);
    expect(FRONT).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('frontend hook never calls .from(...).insert/update/delete/upsert', () => {
    expect(FRONT).not.toMatch(/\.insert\(/);
    expect(FRONT).not.toMatch(/\.update\(/);
    expect(FRONT).not.toMatch(/\.delete\(/);
    expect(FRONT).not.toMatch(/\.upsert\(/);
  });

  it('frontend hook calls only the source-watcher edge via authSafeInvoke', () => {
    expect(HOOK).toMatch(/authSafeInvoke/);
    expect(HOOK).toMatch(/erp-hr-agreement-source-watcher/);
    expect(HOOK).not.toMatch(/functions\.invoke\(['"]erp-hr-(?!agreement-source-watcher)/);
  });

  it('hook handles AUTH_REQUIRED without throwing', () => {
    expect(HOOK).toMatch(/authRequired/);
    expect(HOOK).toMatch(/isAuthRequiredResult/);
  });

  it('does not flip pilot flags or allow-list', () => {
    expect(ALL).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/);
    expect(ALL).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=/);
    expect(ALL).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
  });

  it('does not write ready_for_payroll / salary_tables_loaded=true / human_validated', () => {
    expect(ALL).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    expect(ALL).not.toMatch(/salary_tables_loaded\s*[:=]\s*true/);
    expect(ALL).not.toMatch(/data_completeness\s*[:=]\s*['"]human_validated['"]/);
  });

  it('edge enforces forbidden payload keys including activation flags', () => {
    expect(EDGE).toMatch(/FORBIDDEN_PAYLOAD_KEYS/);
    for (const k of [
      'ready_for_payroll',
      'salary_tables_loaded',
      'data_completeness',
      'requires_human_review',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
      'service_role',
    ]) {
      expect(EDGE).toContain(`'${k}'`);
    }
  });

  it('scan_now is a safe stub that writes nothing and returns WATCHER_ADAPTERS_PENDING', () => {
    expect(EDGE).toMatch(/WATCHER_ADAPTERS_PENDING/);
    // The scan_now branch must not contain insert/update against any table.
    const scanBlock = EDGE.split("if (action === 'scan_now')")[1]?.split(
      "if (action === 'list_hits')",
    )[0] ?? '';
    expect(scanBlock).not.toMatch(/\.insert\(/);
    expect(scanBlock).not.toMatch(/\.update\(/);
    expect(scanBlock).not.toMatch(/\.delete\(/);
    expect(scanBlock).not.toMatch(/\.upsert\(/);
  });

  it('edge only operates on the source-watch-queue table (plus user_roles for RBAC)', () => {
    const fromCalls = [...EDGE.matchAll(/\.from\(\s*['"]([a-zA-Z0-9_]+)['"]/g)].map((m) => m[1]);
    // T_QUEUE constant indirection
    const indirect = [...EDGE.matchAll(/\.from\(\s*([A-Z_]+)\s*\)/g)].map((m) => m[1]);
    const allowedDirect = new Set(['user_roles']);
    const allowedIndirect = new Set(['T_QUEUE']);
    for (const t of fromCalls) {
      expect(allowedDirect.has(t)).toBe(true);
    }
    for (const t of indirect) {
      expect(allowedIndirect.has(t)).toBe(true);
    }
  });

  it('edge declares verify_jwt = true in its docblock and uses getClaims()', () => {
    expect(EDGE).toMatch(/verify_jwt\s*=\s*true/);
    expect(EDGE).toMatch(/getClaims\(/);
  });

  it('dismiss_hit and add_manual_source require authorized roles only', () => {
    expect(EDGE).toMatch(/ALLOWED_ROLES/);
    for (const r of [
      'superadmin',
      'admin',
      'legal_manager',
      'hr_manager',
      'payroll_supervisor',
    ]) {
      expect(EDGE).toContain(`'${r}'`);
    }
  });
});