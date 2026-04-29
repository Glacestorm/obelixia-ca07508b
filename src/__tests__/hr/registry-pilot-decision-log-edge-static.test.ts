/**
 * B10F.4 — Static analysis tests for the pilot decision log edge function.
 *
 * Verifies hardening invariants without executing the function:
 *  - file exists at the expected path;
 *  - config.toml has verify_jwt = true;
 *  - SERVICE_ROLE_KEY is read from Deno.env.get and never hardcoded;
 *  - Zod .strict() schemas;
 *  - FORBIDDEN_PAYLOAD_KEYS list is complete;
 *  - sanitized errors via mapError, no error.message leaks, no .stack;
 *  - no `.delete(`;
 *  - no imports from src/ (bridge / shadow flag / pilot gate /
 *    payroll / resolver / normalizer);
 *  - no reference to operative table erp_hr_collective_agreements
 *    (without `_registry`);
 *  - no writes of `ready_for_payroll`;
 *  - actions log_decision and list_decisions declared;
 *  - signature is computed server-side;
 *  - list limit max 100.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EDGE_PATH = join(
  process.cwd(),
  'supabase/functions/erp-hr-pilot-runtime-decision-log/index.ts',
);
const CONFIG_PATH = join(process.cwd(), 'supabase/config.toml');

describe('B10F.4 — pilot decision log edge function (static)', () => {
  it('edge function file exists', () => {
    expect(existsSync(EDGE_PATH)).toBe(true);
  });

  const SRC = readFileSync(EDGE_PATH, 'utf8');
  const CONFIG = readFileSync(CONFIG_PATH, 'utf8');

  it('config.toml has verify_jwt = true', () => {
    expect(CONFIG).toMatch(
      /\[functions\.erp-hr-pilot-runtime-decision-log\]\s*\nverify_jwt = true/,
    );
  });

  it('SUPABASE_SERVICE_ROLE_KEY is read from Deno.env.get', () => {
    expect(SRC).toMatch(/Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  });

  it('does NOT hardcode service-role key', () => {
    expect(SRC).not.toMatch(/eyJ[A-Za-z0-9_\-]{30,}/);
  });

  it('uses Zod .strict() schemas', () => {
    // 2 .strict() blocks — at least
    const matches = SRC.match(/\.strict\(\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('FORBIDDEN_PAYLOAD_KEYS contains the complete required set', () => {
    for (const k of [
      'signature_hash',
      'decided_by',
      'decided_at',
      'created_at',
      'ready_for_payroll',
      'requires_human_review',
      'data_completeness',
      'salary_tables_loaded',
      'source_quality',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
      'persisted_priority_apply',
      'C3B3C2',
      'service_role',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]) {
      expect(SRC.includes(`'${k}'`), `missing forbidden key: ${k}`).toBe(true);
    }
  });

  it('uses mapError for sanitized error responses', () => {
    expect(SRC).toMatch(/function mapError/);
    expect(SRC).toMatch(/return mapError\(/);
  });

  it('does NOT leak raw error.message', () => {
    // No `error.message` substring anywhere (we only build static strings).
    expect(SRC).not.toMatch(/\.message\b/);
  });

  it('does NOT leak .stack', () => {
    expect(SRC).not.toMatch(/\.stack\b/);
  });

  it('contains no `.delete(` call (append-only)', () => {
    expect(SRC).not.toMatch(/\.delete\(/);
  });

  it('does NOT import any src/ identifier (bridge / flag / pilot gate / payroll)', () => {
    const FORBIDDEN_IMPORTS = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'registryPilotGate',
      'registryPilotParityPreflight',
      'registryPilotBridgeDecision',
      'registryRuntimeBridgeDecision',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    ];
    for (const id of FORBIDDEN_IMPORTS) {
      // The forbidden key list itself contains some of these as STRING
      // literals in single-quotes. Allow that, but NOT bare references
      // (imports / function calls / type usage).
      const bareRegex = new RegExp(`(?<!')\\b${id}\\b(?!')`);
      expect(bareRegex.test(SRC), `bare reference to ${id}`).toBe(false);
    }
  });

  it('does NOT reference operative table erp_hr_collective_agreements (without _registry)', () => {
    const operative = /erp_hr_collective_agreements(?!_registry)/;
    expect(operative.test(SRC)).toBe(false);
  });

  it('does NOT write ready_for_payroll', () => {
    expect(SRC).not.toMatch(/ready_for_payroll/);
  });

  it('declares actions log_decision and list_decisions', () => {
    expect(SRC).toMatch(/'log_decision'/);
    expect(SRC).toMatch(/'list_decisions'/);
    expect(SRC).toMatch(/KNOWN_ACTIONS\s*=\s*\['log_decision',\s*'list_decisions'\]/);
  });

  it('computes signature server-side from canonical payload', () => {
    expect(SRC).toMatch(/computeDecisionSignatureHash/);
    expect(SRC).toMatch(/sha256Hex/);
    expect(SRC).toMatch(/stableStringify/);
    // server uses identity user id, not client-supplied
    expect(SRC).toMatch(/decided_by:\s*userId/);
  });

  it('list limit is capped to 100', () => {
    expect(SRC).toMatch(/\.max\(100\)/);
    expect(SRC).toMatch(/Math\.min\(p\.limit\s*\?\?\s*\d+,\s*100\)/);
  });

  it('inserts into the dedicated pilot decision log table only', () => {
    expect(SRC).toMatch(/'erp_hr_company_agreement_registry_pilot_decision_logs'/);
    expect(SRC).not.toMatch(/'erp_hr_company_agreement_registry_apply_runs'/);
  });

  it('verifies company access via RPC user_has_erp_company_access', () => {
    expect(SRC).toMatch(/userClient\.rpc\(\s*'user_has_erp_company_access'/);
  });

  it('requires JWT and validates token via userClient.auth.getUser', () => {
    expect(SRC).toMatch(/userClient\.auth\.getUser/);
    expect(SRC).toMatch(/Bearer /);
  });
});
