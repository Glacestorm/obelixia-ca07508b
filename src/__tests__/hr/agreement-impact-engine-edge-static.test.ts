/**
 * B13.5B — Static safety contract for the impact engine edge function.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'supabase/functions/erp-hr-agreement-impact-engine/index.ts';
const CONFIG = 'supabase/config.toml';

let SRC = '';
let CFG = '';

beforeAll(() => {
  SRC = fs.readFileSync(path.resolve(process.cwd(), EDGE), 'utf-8');
  CFG = fs.readFileSync(path.resolve(process.cwd(), CONFIG), 'utf-8');
});

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('B13.5B — edge static contract', () => {
  it('config declares verify_jwt = true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-agreement-impact-engine\]\s*\nverify_jwt\s*=\s*true/,
    );
  });

  it('uses Zod with .strict()', () => {
    expect(SRC).toMatch(/from 'https:\/\/esm\.sh\/zod/);
    expect(SRC).toMatch(/\.strict\(\)/);
  });

  it('declares FORBIDDEN_PAYLOAD_KEYS including activation/operative artifacts', () => {
    expect(SRC).toContain('FORBIDDEN_PAYLOAD_KEYS');
    for (const k of [
      'ready_for_payroll',
      'salary_tables_loaded',
      'human_validated',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'apply_to_payroll',
      'cra_file',
      'siltra_file',
      'sepa_file',
      'accounting_entry',
      'service_role',
    ]) {
      expect(SRC).toContain(k);
    }
  });

  it('declares mapError and never echoes raw error messages or stacks', () => {
    expect(SRC).toContain('function mapError');
    const code = stripComments(SRC);
    expect(code).not.toMatch(/error\.stack/);
    expect(code).not.toMatch(/JSON\.stringify\(\s*err\b/);
  });

  it('does not import payroll/payslip/bridge/normalizer/resolver/safety gate', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/payrollEngine/);
    expect(code).not.toMatch(/payslipEngine/);
    expect(code).not.toMatch(/useESPayrollBridge/);
    expect(code).not.toMatch(/salaryNormalizer/);
    expect(code).not.toMatch(/agreementSalaryResolver/);
    expect(code).not.toMatch(/agreementSafetyGate/);
  });

  it('does not reference operational legacy table erp_hr_collective_agreements (without _registry)', () => {
    const code = stripComments(SRC);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });

  it('does not write activation flags', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    expect(code).not.toMatch(/salary_tables_loaded\s*[:=]\s*true/);
    expect(code).not.toMatch(/data_completeness\s*[:=]\s*['"]human_validated['"]/);
  });

  it('does not contain .delete( anywhere', () => {
    expect(stripComments(SRC)).not.toMatch(/\.delete\(/);
  });

  it('compute_scope handler does not invoke payroll/bridge/mapping/runtime apply', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/erp-hr-collective-agreement-activation-execute/);
    expect(code).not.toMatch(/erp-hr-company-agreement-runtime-apply/);
    expect(code).not.toMatch(/erp-hr-company-agreement-registry-mapping/);
  });

  it('uses SUPABASE_SERVICE_ROLE_KEY only via Deno.env.get and never returns it', () => {
    expect(SRC).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
    const code = stripComments(SRC);
    expect(code).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('declares all 5 known actions', () => {
    for (const a of ['compute_scope', 'compute_impact_preview', 'list_scopes', 'list_previews', 'mark_preview_stale']) {
      expect(SRC).toContain(a);
    }
  });

  it('mark_preview_stale does NOT delete preview rows', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/svcMarkStale[\s\S]{0,200}\.delete\(/);
    expect(code).toMatch(/stale_preview/);
  });
});
