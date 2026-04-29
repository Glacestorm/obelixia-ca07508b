/**
 * B10C.2B.2B — Edge function static contract tests for
 * `erp-hr-company-agreement-registry-mapping`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGE =
  'supabase/functions/erp-hr-company-agreement-registry-mapping/index.ts';
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

describe('B10C.2B.2B — edge static checks', () => {
  it('config declares verify_jwt = true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-company-agreement-registry-mapping\]\s*\nverify_jwt\s*=\s*true/,
    );
  });

  it('edge file exists and is non-empty', () => {
    expect(SRC.length).toBeGreaterThan(500);
  });

  it('uses Deno.env for service role', () => {
    expect(SRC).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  });

  it('does not contain hardcoded service-role key', () => {
    const code = stripComments(SRC);
    // No literal JWT-shaped string starting with eyJ
    expect(code).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('does not reference operational table erp_hr_collective_agreements (without _registry)', () => {
    const code = stripComments(SRC);
    expect(code.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(
      0,
    );
  });

  it('does not import bridge / shadow flag / resolver / normalizer / engines', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/useESPayrollBridge/);
    expect(code).not.toMatch(/registryShadowFlag/);
    expect(code).not.toMatch(/agreementSalaryResolver/);
    expect(code).not.toMatch(/salaryNormalizer/);
    expect(code).not.toMatch(/payrollEngine/);
    expect(code).not.toMatch(/payslipEngine/);
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
      'approved_by',
      'approved_at',
      'is_current',
      'ready_for_payroll',
      'requires_human_review',
      'data_completeness',
      'salary_tables_loaded',
      'source_quality',
      'validation_status',
      'signature_hash',
      'validated_at',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'persisted_priority_apply',
      'C3B3C2',
    ];
    for (const k of required) {
      expect(SRC).toContain(`'${k}'`);
    }
  });

  it('uses zod .strict() in schemas', () => {
    const occurrences = SRC.match(/\.strict\(\)/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(6);
  });

  it('declares all six known actions', () => {
    for (const a of [
      'create_draft',
      'submit_for_review',
      'approve',
      'reject',
      'supersede',
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
    // No occurrences of error.message used as a returned value/string concat.
    expect(code).not.toMatch(/error\.message/);
    expect(code).not.toMatch(/err\.message/);
  });

  it('does not return .stack', () => {
    const code = stripComments(SRC);
    expect(code).not.toMatch(/\.stack/);
  });

  it('mirrors service contract: validates registry readiness flags', () => {
    // Server-side gate must check all four registry readiness flags.
    expect(SRC).toMatch(/ready_for_payroll\s*===\s*true/);
    expect(SRC).toMatch(/requires_human_review\s*===\s*false/);
    expect(SRC).toMatch(/data_completeness\s*===\s*'human_validated'/);
    expect(SRC).toMatch(/source_quality\s*===\s*'official'/);
  });

  it('cnae_suggestion requires humanConfirmed=true in approve path', () => {
    expect(SRC).toMatch(
      /source_type\s*===\s*'cnae_suggestion'[\s\S]{0,120}humanConfirmed\s*!==\s*true/,
    );
  });

  it('useESPayrollBridge.ts is intact (no edge import)', () => {
    expect(BRIDGE_SRC).not.toMatch(/erp-hr-company-agreement-registry-mapping/);
  });

  it('registryShadowFlag.ts still exports false', () => {
    expect(FLAG_SRC).toMatch(
      /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });

  it('uses dual client (anon + service_role)', () => {
    expect(SRC).toMatch(/SUPABASE_ANON_KEY/);
    expect(SRC).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    // userClient receives Authorization header forward
    expect(SRC).toMatch(/Authorization:\s*authHeader/);
  });

  it('uses getClaims for token verification', () => {
    expect(SRC).toMatch(/auth\.getClaims/);
  });

  it('checks user_has_erp_company_access via RPC', () => {
    expect(SRC).toMatch(/user_has_erp_company_access/);
  });
});
