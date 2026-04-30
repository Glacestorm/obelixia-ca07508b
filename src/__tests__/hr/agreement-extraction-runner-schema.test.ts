/**
 * B13.3A — Schema/migration static guards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIG_DIR = resolve(process.cwd(), 'supabase/migrations');
const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql'));
const SQL = files
  .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
  .join('\n-- FILE BREAK --\n');

describe('B13.3A — Extraction runner schema', () => {
  it('1. extraction_runs table exists', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.erp_hr_collective_agreement_extraction_runs/);
  });
  it('2. extraction_findings table exists', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.erp_hr_collective_agreement_extraction_findings/);
  });
  it('3. run_status check constraints exist', () => {
    expect(SQL).toMatch(/b13_3a_run_status_chk[\s\S]{0,400}queued[\s\S]{0,400}completed_with_warnings/);
  });
  it('4. extraction_mode check constraints exist', () => {
    expect(SQL).toMatch(/b13_3a_extraction_mode_chk[\s\S]{0,300}html_text[\s\S]{0,300}metadata_only/);
  });
  it('5. finding_type check constraints exist', () => {
    expect(SQL).toMatch(/b13_3a_finding_type_chk[\s\S]{0,500}salary_table_candidate[\s\S]{0,500}ocr_required/);
  });
  it('6. finding_status check constraints exist', () => {
    expect(SQL).toMatch(/b13_3a_finding_status_chk[\s\S]{0,400}pending_review[\s\S]{0,400}rejected/);
  });
  it('7. requires_human_review must be true (CHECK)', () => {
    expect(SQL).toMatch(/b13_3a_finding_requires_review_chk\s+CHECK\s*\(\s*requires_human_review\s*=\s*true\s*\)/);
  });
  it('8. RLS enabled + forced on both tables', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.erp_hr_collective_agreement_extraction_runs ENABLE ROW LEVEL SECURITY/);
    expect(SQL).toMatch(/ALTER TABLE public\.erp_hr_collective_agreement_extraction_runs FORCE ROW LEVEL SECURITY/);
    expect(SQL).toMatch(/ALTER TABLE public\.erp_hr_collective_agreement_extraction_findings ENABLE ROW LEVEL SECURITY/);
    expect(SQL).toMatch(/ALTER TABLE public\.erp_hr_collective_agreement_extraction_findings FORCE ROW LEVEL SECURITY/);
  });
  it('9. no DELETE policy for either table (B13.3A migration)', () => {
    const b13mig = readFileSync(
      resolve(MIG_DIR, files.find((f) => /-/.test(f) && readFileSync(resolve(MIG_DIR, f), 'utf8').includes('B13.3A'))!),
      'utf8',
    );
    expect(b13mig).not.toMatch(/FOR DELETE/i);
  });
  it('10. anti-activation triggers exist for runs and findings', () => {
    expect(SQL).toMatch(/trg_b13_3a_runs_anti_activation/);
    expect(SQL).toMatch(/trg_b13_3a_findings_anti_activation/);
    expect(SQL).toMatch(/B13_3A_FINDING_HUMAN_REVIEW_REQUIRED/);
    expect(SQL).toMatch(/B13_3A_FORBIDDEN_ACTIVATION_TOKEN/);
  });
  it('11. B13.3A migration does not write into salary_tables (real)', () => {
    const b13mig = files
      .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
      .filter((c) => c.includes('B13.3A'))
      .join('\n');
    expect(b13mig).not.toMatch(/INSERT\s+INTO\s+public\.salary_tables\b/i);
    expect(b13mig).not.toMatch(/UPDATE\s+public\.salary_tables\b/i);
  });
  it('12. B13.3A migration does not touch operative legacy table erp_hr_collective_agreements', () => {
    const b13mig = files
      .map((f) => readFileSync(resolve(MIG_DIR, f), 'utf8'))
      .filter((c) => c.includes('B13.3A'))
      .join('\n');
    expect(b13mig).not.toMatch(/\bpublic\.erp_hr_collective_agreements\b(?!_)/);
  });
});