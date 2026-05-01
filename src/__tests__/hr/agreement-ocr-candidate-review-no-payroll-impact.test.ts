/**
 * B13.4-VERIFY — Cross-file static guards proving the candidate review &
 * promotion gate has zero impact on payroll, registry shadow flag, pilot
 * gate, or the source watcher state machine.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL,
} from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const ENGINE = readFileSync(
  resolve(process.cwd(), 'src/engines/erp/hr/agreementOcrCandidateReviewStateMachine.ts'),
  'utf8',
);
const EDGE = readFileSync(
  resolve(
    process.cwd(),
    'supabase/functions/erp-hr-agreement-extraction-runner/index.ts',
  ),
  'utf8',
);

describe('B13.4-VERIFY — engine purity', () => {
  it('engine has no Supabase client / fetch / network', () => {
    expect(ENGINE).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(ENGINE).not.toMatch(/createClient\(/);
    expect(ENGINE).not.toMatch(/\bfetch\s*\(/);
    expect(ENGINE).not.toMatch(/XMLHttpRequest|WebSocket/);
  });

  it('engine has no DB writes / RPC', () => {
    expect(ENGINE).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  });

  it('engine does not import payroll / bridge / registry / pilot modules', () => {
    for (const f of [
      'payrollEngine',
      'payslipEngine',
      'useESPayrollBridge',
      'salaryNormalizer',
      'agreementSalaryResolver',
      'registryShadowFlag',
      'registryPilotGate',
    ]) {
      expect(ENGINE).not.toMatch(new RegExp(`(import|from)[^\\n]*${f}`));
    }
  });
});

describe('B13.4-VERIFY — registry/pilot flags untouched', () => {
  it('shadow flag still false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
  });
  it('pilot mode still false', () => {
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
  });
  it('pilot allow-list still empty', () => {
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST).toEqual([]);
  });
});

describe('B13.4-VERIFY — edge does not touch operative legal/payroll tables', () => {
  it('edge never writes salary_tables / agreements registry-final / payroll', () => {
    for (const t of [
      'salary_tables',
      'erp_hr_collective_agreements',
      'erp_hr_payroll',
      'erp_hr_payroll_records',
      'erp_hr_payslips',
      'erp_hr_payroll_incidents',
      'erp_hr_employee_payroll',
      'erp_hr_vpt_scores',
    ]) {
      expect(EDGE).not.toMatch(new RegExp(`\\.from\\(\\s*['"]${t}['"]`));
    }
  });

  it('edge does not mutate source watcher tables', () => {
    expect(EDGE).not.toMatch(
      /\.from\(\s*['"]erp_hr_collective_agreement_source_(watcher|hits|sources)['"]/,
    );
  });

  it('edge does not set legal_status approved/final/active anywhere', () => {
    expect(EDGE).not.toMatch(/legal_status\s*:\s*['"](approved|final|active)['"]/);
  });
});

describe('B13.4-VERIFY — hook surface does not reference payroll/registry', () => {
  const HOOK = readFileSync(
    resolve(process.cwd(), 'src/hooks/erp/hr/useAgreementExtractionRunner.ts'),
    'utf8',
  );
  const stripped = HOOK.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');

  it('hook does not expose payroll/registry mutations', () => {
    for (const k of [
      'apply_to_payroll',
      'ready_for_payroll',
      'salary_tables_loaded',
      'human_validated',
      'human_approved',
      'activate_version',
      'publish_version',
      'set_legal_status',
      'use_registry_for_payroll',
    ]) {
      expect(stripped).not.toContain(k);
    }
  });
});