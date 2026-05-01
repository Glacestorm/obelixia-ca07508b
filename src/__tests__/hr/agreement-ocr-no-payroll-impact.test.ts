/**
 * B13.3C-VERIFY — Cross-file static guards proving the OCR/text extraction
 * path has zero impact on payroll, salary persistence, registry status,
 * version registry, source watcher state machine and UI flags.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HELPERS = [
  'src/engines/erp/hr/agreementOcrExtractor.ts',
  'src/engines/erp/hr/agreementSalaryTableCandidateExtractor.ts',
].map((p) => readFileSync(resolve(process.cwd(), p), 'utf8'));

const EDGE = readFileSync(
  resolve(
    process.cwd(),
    'supabase/functions/erp-hr-agreement-extraction-runner/index.ts',
  ),
  'utf8',
);
const HOOK = readFileSync(
  resolve(process.cwd(), 'src/hooks/erp/hr/useAgreementExtractionRunner.ts'),
  'utf8',
);

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');

const HOOK_CODE = stripComments(HOOK);

const ALL_OCR = HELPERS.join('\n');

describe('B13.3C-VERIFY — OCR/text extraction has zero payroll/registry impact', () => {
  it('helpers do not import supabase client (pure)', () => {
    expect(ALL_OCR).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(ALL_OCR).not.toMatch(/createClient\(/);
  });

  it('helpers do not import payroll engines / bridge / resolver / normalizer', () => {
    for (const f of [
      'payrollEngine',
      'payslipEngine',
      'useESPayrollBridge',
      'salaryNormalizer',
      'agreementSalaryResolver',
      'registryShadowFlag',
      'registryPilotGate',
    ]) {
      expect(ALL_OCR).not.toMatch(new RegExp(`(import|from)[^\\n]*${f}`));
    }
  });

  it('helpers do not perform DB writes / RPC / fetch / network', () => {
    expect(ALL_OCR).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
    expect(ALL_OCR).not.toMatch(/\.rpc\(/);
    expect(ALL_OCR).not.toMatch(/\bfetch\s*\(/);
    expect(ALL_OCR).not.toMatch(/XMLHttpRequest|WebSocket/);
  });

  it('edge does not touch payroll / VPT / legal-final tables or columns', () => {
    for (const t of [
      'erp_hr_payroll',
      'erp_hr_payroll_records',
      'erp_hr_payslips',
      'erp_hr_payroll_incidents',
      'erp_hr_employee_payroll',
      'erp_hr_vpt_scores',
      'erp_hr_collective_agreement_versions',
      'erp_hr_collective_agreements',
      'salary_tables',
    ]) {
      expect(EDGE).not.toMatch(new RegExp(`\\.from\\(\\s*['"]${t}['"]`));
    }
    expect(EDGE).not.toMatch(/legal_status\s*:\s*['"](approved|final|active)['"]/);
  });

  it('edge does not mutate source watcher state outside intake link', () => {
    expect(EDGE).not.toMatch(
      /\.from\(\s*['"]erp_hr_collective_agreement_source_(watcher|hits|sources)['"]/,
    );
  });

  it('hook does not expose any payroll/registry mutation', () => {
    for (const k of [
      'apply_to_payroll',
      'ready_for_payroll',
      'salary_tables_loaded',
      'human_validated',
      'human_approved',
      'activate_version',
      'publish_version',
      'set_legal_status',
    ]) {
      expect(HOOK_CODE).not.toContain(k);
    }
  });

  it('forbidden payload keys cover salary/score/registry/version/legal vectors', () => {
    for (const k of [
      'ready_for_payroll',
      'salary_tables_loaded',
      'data_completeness',
      'human_validated',
      'human_approved_single',
      'human_approved_first',
      'human_approved_second',
      'approved_by',
      'approved_at',
      'apply_to_payroll',
      'activation_run_id',
      'service_role',
      'use_registry_for_payroll',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
    ]) {
      expect(EDGE).toContain(`'${k}'`);
    }
  });
});