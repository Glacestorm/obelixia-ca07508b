/**
 * B11.2C.2 — Static guards on the edge function
 * `erp-hr-agreement-staging` (file-level, no runtime calls).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE_PATH = resolve(
  process.cwd(),
  'supabase/functions/erp-hr-agreement-staging/index.ts',
);
const CONFIG_PATH = resolve(process.cwd(), 'supabase/config.toml');

describe('B11.2C.2 — edge static guards', () => {
  it('edge file exists', () => {
    expect(existsSync(EDGE_PATH)).toBe(true);
  });

  const src = readFileSync(EDGE_PATH, 'utf8');
  const cfg = readFileSync(CONFIG_PATH, 'utf8');

  it('config.toml registers verify_jwt=true for the edge', () => {
    const block =
      /\[functions\.erp-hr-agreement-staging\]\s*\nverify_jwt\s*=\s*true/;
    expect(block.test(cfg)).toBe(true);
  });

  it('uses Zod for payload validation (strict objects)', () => {
    expect(src).toMatch(/from\s+['"]https:\/\/esm\.sh\/zod@/);
    expect(src).toMatch(/\.strict\(\)/);
    // At least the well-known schemas
    expect(src).toMatch(/StageOcrSchema/);
    expect(src).toMatch(/StageManualSchema/);
    expect(src).toMatch(/ApproveSecondSchema/);
    expect(src).toMatch(/RejectSchema/);
  });

  it('declares FORBIDDEN_PAYLOAD_KEYS including all required entries', () => {
    expect(src).toMatch(/FORBIDDEN_PAYLOAD_KEYS\s*=\s*\[/);
    for (const k of [
      'ready_for_payroll',
      'salary_tables_loaded',
      'data_completeness',
      'requires_human_review',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
      'service_role',
      'created_at',
      'updated_at',
      'first_reviewed_by',
      'first_reviewed_at',
      'second_reviewed_by',
      'second_reviewed_at',
      'approval_hash',
    ]) {
      expect(src).toContain(`'${k}'`);
    }
  });

  it('does not return raw error.message or stack traces', () => {
    // Must not propagate raw error.message in JSON responses
    expect(src).not.toMatch(/message:\s*error\.message/);
    expect(src).not.toMatch(/message:\s*err\.message/);
    expect(src).not.toMatch(/\.stack/);
    expect(src).not.toMatch(/error\.toString\(\)/);
  });

  it('never writes ready_for_payroll', () => {
    expect(src).not.toMatch(/ready_for_payroll\s*:/);
    expect(src).not.toMatch(/ready_for_payroll['"]?\s*:/);
  });

  it('never writes salary_tables_loaded=true', () => {
    expect(src).not.toMatch(/salary_tables_loaded\s*:\s*true/);
    expect(src).not.toMatch(/salary_tables_loaded['"]?\s*:\s*true/);
  });

  it("never writes data_completeness='human_validated'", () => {
    expect(src).not.toMatch(/data_completeness\s*:\s*['"]human_validated['"]/);
  });

  it('does not touch the operative table erp_hr_collective_agreements (no _registry suffix)', () => {
    // Allow only references that explicitly carry an underscore continuation.
    expect(src).not.toMatch(/['"]erp_hr_collective_agreements['"]/);
    // Sanity: it should reference staging tables instead.
    expect(src).toMatch(/erp_hr_collective_agreement_salary_table_staging/);
    expect(src).toMatch(/erp_hr_collective_agreement_staging_audit/);
  });

  it('does not import payroll/bridge/payslip/normalizer/resolver', () => {
    expect(src).not.toMatch(/useESPayrollBridge/);
    expect(src).not.toMatch(/payrollEngine/);
    expect(src).not.toMatch(/payslipEngine/);
    expect(src).not.toMatch(/salaryNormalizer/);
    expect(src).not.toMatch(/agreementSalaryResolver/);
  });

  it('approve_second blocks same reviewer explicitly', () => {
    expect(src).toMatch(/SAME_REVIEWER_NOT_ALLOWED/);
    expect(src).toMatch(/first_reviewed_by\s*===\s*userId/);
  });

  it('writes audit insert per action', () => {
    // Each handler should call writeAudit at least once.
    const writeAuditCalls = src.match(/writeAudit\s*\(/g) ?? [];
    // create (ocr + manual), edit, approve_single, approve_first,
    // approve_second, reject, needs_correction => >= 7
    expect(writeAuditCalls.length).toBeGreaterThanOrEqual(7);
  });

  it('never deletes from staging or audit', () => {
    expect(src).not.toMatch(/from\(T_STAGING\)[\s\S]{0,80}\.delete\(/);
    expect(src).not.toMatch(/from\(T_AUDIT\)[\s\S]{0,80}\.delete\(/);
    expect(src).not.toMatch(/from\(T_AUDIT\)[\s\S]{0,80}\.update\(/);
  });

  it('does not flip pilot allow-list flags', () => {
    expect(src).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=/);
    expect(src).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=/);
    expect(src).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
  });

  it('never auto-approves OCR rows', () => {
    // Inserted OCR rows must enter as ocr_pending_review, not approved.
    expect(src).toMatch(/ocr_pending_review/);
    // No code path sets validation_status to an approved state at INSERT time.
    expect(src).not.toMatch(
      /insert\([\s\S]{0,400}validation_status[\s\S]{0,40}human_approved/,
    );
  });
});