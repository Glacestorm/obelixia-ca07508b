/**
 * B13.4 — Static guards on the four new edge actions.
 * No network: source-text inspection only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = readFileSync(
  resolve(process.cwd(), 'supabase/functions/erp-hr-agreement-extraction-runner/index.ts'),
  'utf8',
);
const CFG = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

describe('B13.4 — edge static guards', () => {
  it('all four actions are registered in KNOWN_ACTIONS', () => {
    for (const a of [
      'review_ocr_candidate',
      'approve_ocr_candidate',
      'reject_ocr_candidate',
      'promote_ocr_candidate',
    ]) {
      expect(EDGE).toContain(`'${a}'`);
    }
  });

  it('verify_jwt remains true', () => {
    expect(CFG).toMatch(
      /\[functions\.erp-hr-agreement-extraction-runner\][\s\S]*?verify_jwt\s*=\s*true/,
    );
  });

  it('feature flag gate exists and defaults closed', () => {
    expect(EDGE).toContain('AGREEMENT_OCR_CANDIDATE_REVIEW_ENABLED');
    expect(EDGE).toContain("'FEATURE_DISABLED'");
    expect(EDGE).toMatch(/b13_4_isFlagEnabled\(\)/);
    expect(EDGE).toMatch(/b13_4_isReviewAction\(action\)/);
  });

  it('promotion is gated to approved_candidate only', () => {
    expect(EDGE).toContain("current !== 'approved_candidate'");
    expect(EDGE).toContain('promotion_requires_approved_candidate');
    expect(EDGE).toContain("'STATE_TRANSITION_BLOCKED'");
  });

  it('promotion completeness is enforced', () => {
    expect(EDGE).toContain('b13_4_isPromotableComplete');
    expect(EDGE).toContain("'CANDIDATE_INCOMPLETE'");
  });

  it('promoted_target is restricted to staging_review_only', () => {
    expect(EDGE).toMatch(/promoted_target:\s*z\.enum\(\['staging_review_only'\]\)/);
  });

  it('forbidden payload deep-scan covers payroll/registry/tenant vectors', () => {
    for (const k of [
      'payroll',
      'payroll_records',
      'payroll_calculation',
      'persisted_incidents',
      'employee_payroll',
      'employee_payroll_data',
      'vpt_scores',
      'legal_status',
      'registry_status',
      'version_status',
      'source_watcher_state',
      'service_role',
      'service_role_key',
      'company_id_override',
      'tenant_id_override',
      'apply_to_payroll',
      'ready_for_payroll',
      'salary_tables_loaded',
      'human_validated',
    ]) {
      expect(EDGE).toContain(`'${k}'`);
    }
  });

  it('B13.4 actions never call .delete', () => {
    expect(EDGE).not.toMatch(/\.delete\(/);
  });

  it('B13.4 does not import payroll engine / bridge / resolver / normalizer', () => {
    for (const f of [
      'payrollEngine',
      'payslipEngine',
      'useESPayrollBridge',
      'salaryNormalizer',
      'agreementSalaryResolver',
      'registryShadowFlag',
      'registryPilotGate',
    ]) {
      expect(EDGE).not.toMatch(new RegExp(`(import|from)[^\\n]*${f}`));
    }
  });

  it('B13.4 does not write to operational tables', () => {
    for (const t of [
      'erp_hr_collective_agreements',
      'salary_tables',
      'erp_hr_payroll',
      'erp_hr_payroll_records',
      'erp_hr_payslips',
      'erp_hr_employee_payroll',
      'erp_hr_vpt_scores',
    ]) {
      expect(EDGE).not.toMatch(new RegExp(`\\.from\\(\\s*['"]${t}['"]`));
    }
  });

  it('B13.4 actions only update payload_json (not finding_status)', () => {
    // The B13.4 transition writer must NOT include finding_status in the
    // .update() block. We assert the function body of persistReviewTransition
    // updates only payload_json.
    const start = EDGE.indexOf('async function persistReviewTransition');
    expect(start).toBeGreaterThan(0);
    const end = EDGE.indexOf('async function ', start + 50);
    const slice = EDGE.slice(start, end > 0 ? end : start + 4000);
    expect(slice).toContain('.update({ payload_json: newPayload })');
    expect(slice).not.toMatch(/finding_status\s*:/);
  });

  it('B13.4 inline state machine prevents extracted->promoted', () => {
    // approved_candidate is the only predecessor of `promoted` in transitions map.
    expect(EDGE).toMatch(
      /approved_candidate:\s*\[\s*'promoted'\s*,\s*'rejected'\s*,\s*'needs_review'\s*\]/,
    );
    expect(EDGE).toMatch(/extracted:\s*\['needs_review'\s*,\s*'rejected'\]/);
    expect(EDGE).toMatch(/needs_review:\s*\['approved_candidate'\s*,\s*'rejected'\]/);
    expect(EDGE).toMatch(/rejected:\s*\[\]/);
    expect(EDGE).toMatch(/promoted:\s*\[\]/);
  });

  it('B13.4 sanitises errors (no raw error.message exposure)', () => {
    expect(EDGE).toContain("'INTERNAL_ERROR', 'Internal error'");
    // mapError keeps a sanitised envelope; raw err is never returned.
    expect(EDGE).not.toMatch(/error:\s*err\.message/);
  });
});

describe('B13.4 — hook static guards', () => {
  const HOOK = readFileSync(
    resolve(process.cwd(), 'src/hooks/erp/hr/useAgreementExtractionRunner.ts'),
    'utf8',
  );

  it('exposes the four new actions and routes via authSafeInvoke', () => {
    for (const a of [
      'reviewOcrCandidate',
      'approveOcrCandidate',
      'rejectOcrCandidate',
      'promoteOcrCandidate',
    ]) {
      expect(HOOK).toContain(a);
    }
    expect(HOOK).toContain("action: 'review_ocr_candidate'");
    expect(HOOK).toContain("action: 'approve_ocr_candidate'");
    expect(HOOK).toContain("action: 'reject_ocr_candidate'");
    expect(HOOK).toContain("action: 'promote_ocr_candidate'");
  });

  it('hook never calls .insert/.update/.delete/.upsert', () => {
    expect(HOOK).not.toMatch(/\.insert\(/);
    expect(HOOK).not.toMatch(/\.update\(/);
    expect(HOOK).not.toMatch(/\.delete\(/);
    expect(HOOK).not.toMatch(/\.upsert\(/);
  });

  it('hook never references service_role', () => {
    expect(HOOK).not.toMatch(/service_role/);
    expect(HOOK).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('rejectOcrCandidate enforces min reason length client-side', () => {
    expect(HOOK).toContain("'Reason must be at least 5 characters'");
  });
});