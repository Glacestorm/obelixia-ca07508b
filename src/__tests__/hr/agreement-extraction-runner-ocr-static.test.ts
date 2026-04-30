/**
 * B13.3C — Static guards on the OCR/text extraction action of the runner edge.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = readFileSync(
  resolve(process.cwd(), 'supabase/functions/erp-hr-agreement-extraction-runner/index.ts'),
  'utf8',
);
const CFG = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

describe('B13.3C — run_ocr_or_text_extraction static guards', () => {
  it('action exists and is registered in KNOWN_ACTIONS', () => {
    expect(EDGE).toContain("'run_ocr_or_text_extraction'");
    expect(EDGE).toMatch(/action === 'run_ocr_or_text_extraction'/);
  });
  it('verify_jwt remains true', () => {
    expect(CFG).toMatch(/\[functions\.erp-hr-agreement-extraction-runner\][\s\S]*?verify_jwt\s*=\s*true/);
  });
  it('uses Zod discriminatedUnion for input modes', () => {
    expect(EDGE).toMatch(/RunOcrOrTextSchema/);
    expect(EDGE).toMatch(/discriminatedUnion\(\s*['"]extraction_input_type['"]/);
  });
  it('FORBIDDEN_PAYLOAD_KEYS includes approval keys', () => {
    for (const k of [
      'human_approved_single',
      'human_approved_first',
      'human_approved_second',
      'approved_by',
      'approved_at',
      'ready_for_payroll',
      'salary_tables_loaded',
      'data_completeness',
      'human_validated',
      'service_role',
    ]) {
      expect(EDGE).toContain(`'${k}'`);
    }
  });
  it('does not write ready_for_payroll / salary_tables_loaded=true / human_validated', () => {
    expect(EDGE).not.toMatch(/ready_for_payroll\s*:/);
    expect(EDGE).not.toMatch(/salary_tables_loaded\s*:\s*true/);
    expect(EDGE).not.toMatch(/data_completeness\s*:\s*['"]human_validated['"]/);
    // Should not be written as a column value (only listed as forbidden key).
    expect(EDGE).not.toMatch(/human_approved\w*\s*:/);
  });
  it('does not write to salary_tables real or operative legacy table', () => {
    expect(EDGE).not.toMatch(/\.from\(\s*['"]salary_tables['"]/);
    expect(EDGE).not.toMatch(/\.from\(\s*['"]erp_hr_collective_agreements['"]/);
  });
  it('does not import payroll engines / bridge / normalizer / resolver', () => {
    for (const f of [
      'payrollEngine',
      'payslipEngine',
      'useESPayrollBridge',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(EDGE).not.toMatch(new RegExp(`(import|from)[^\\n]*${f}`));
    }
  });
  it('never deletes', () => {
    expect(EDGE).not.toMatch(/\.delete\(/);
  });
  it('document_url branch validates against run/intake document_url', () => {
    const idx = EDGE.indexOf("action === 'run_ocr_or_text_extraction'");
    const next = EDGE.indexOf("action === 'mark_run_blocked'", idx);
    const branch = EDGE.slice(idx, next > 0 ? next : idx + 8000);
    expect(branch).toMatch(/document_url_mismatch/);
    expect(branch).toMatch(/document_hash_unverified|document_hash_missing_on_intake/);
  });
  it('intake must be ready_for_extraction', () => {
    const idx = EDGE.indexOf("action === 'run_ocr_or_text_extraction'");
    const branch = EDGE.slice(idx, idx + 8000);
    expect(branch).toMatch(/ready_for_extraction/);
  });
});