/**
 * B11.2C.1 — Schema/RLS contract tests for staging tables.
 * Read-only checks via psql against the live DB.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

function q(sql: string): string {
  try {
    return execSync(
      `psql -At -c ${JSON.stringify(sql)}`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  } catch {
    return '';
  }
}

function pgAvailable(): boolean {
  try {
    execSync('psql -At -c "SELECT 1"', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const STAGING = 'erp_hr_collective_agreement_salary_table_staging';
const AUDIT = 'erp_hr_collective_agreement_staging_audit';

describe.runIf(pgAvailable())('B11.2C.1 — staging schema contract', () => {
  it('staging table exists', () => {
    const r = q(
      `SELECT to_regclass('public.${STAGING}')`,
    );
    expect(r).toContain(STAGING);
  });

  it('audit table exists', () => {
    const r = q(`SELECT to_regclass('public.${AUDIT}')`);
    expect(r).toContain(AUDIT);
  });

  it('main columns exist on staging', () => {
    const cols = q(
      `SELECT string_agg(column_name, ',' ORDER BY column_name)
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='${STAGING}'`,
    );
    [
      'agreement_id', 'version_id', 'source_page', 'source_excerpt',
      'extraction_method', 'approval_mode', 'year', 'professional_group',
      'concept_literal_from_agreement', 'normalized_concept_key',
      'payroll_label', 'payslip_label', 'validation_status',
      'first_reviewed_by', 'second_reviewed_by', 'content_hash',
    ].forEach((c) => expect(cols).toContain(c));
  });

  it('CHECK approval_mode exists', () => {
    const r = q(
      `SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.${STAGING}'::regclass AND contype='c'`,
    );
    expect(r).toMatch(/approval_mode/);
    expect(r).toMatch(/ocr_single_human_approval/);
    expect(r).toMatch(/ocr_dual_human_approval/);
  });

  it('CHECK validation_status exists', () => {
    const r = q(
      `SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.${STAGING}'::regclass AND contype='c'`,
    );
    expect(r).toMatch(/validation_status/);
    expect(r).toMatch(/ocr_pending_review/);
    expect(r).toMatch(/human_approved_second/);
  });

  it('CHECK requires_human_review = true exists', () => {
    const r = q(
      `SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.${STAGING}'::regclass AND contype='c'`,
    );
    expect(r).toMatch(/requires_human_review\s*=\s*true/);
  });

  it('RLS enabled and forced on both tables', () => {
    const r = q(
      `SELECT relname || '|' || relrowsecurity || '|' || relforcerowsecurity
         FROM pg_class WHERE relname IN ('${STAGING}','${AUDIT}')
         ORDER BY relname`,
    );
    expect(r).toContain(`${AUDIT}|t|t`);
    expect(r).toContain(`${STAGING}|t|t`);
  });

  it('staging has no DELETE policy', () => {
    const r = q(
      `SELECT count(*) FROM pg_policies
        WHERE tablename='${STAGING}' AND cmd='DELETE'`,
    );
    expect(r).toBe('0');
  });

  it('audit has no UPDATE/DELETE policy', () => {
    const r = q(
      `SELECT count(*) FROM pg_policies
        WHERE tablename='${AUDIT}' AND cmd IN ('UPDATE','DELETE')`,
    );
    expect(r).toBe('0');
  });

  it('trigger enforce_staging_approval_rules exists', () => {
    const r = q(
      `SELECT tgname FROM pg_trigger
        WHERE tgrelid='public.${STAGING}'::regclass
          AND tgname='trg_tic_nac_staging_enforce_approval'`,
    );
    expect(r).toContain('trg_tic_nac_staging_enforce_approval');
  });

  it('updated_at trigger exists on staging', () => {
    const r = q(
      `SELECT tgname FROM pg_trigger
        WHERE tgrelid='public.${STAGING}'::regclass
          AND tgname='trg_tic_nac_staging_updated_at'`,
    );
    expect(r).toContain('trg_tic_nac_staging_updated_at');
  });

  it('audit no_update + no_delete triggers exist', () => {
    const r = q(
      `SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger
        WHERE tgrelid='public.${AUDIT}'::regclass
          AND tgname IN ('trg_tic_nac_staging_audit_no_update','trg_tic_nac_staging_audit_no_delete')`,
    );
    expect(r).toContain('trg_tic_nac_staging_audit_no_delete');
    expect(r).toContain('trg_tic_nac_staging_audit_no_update');
  });

  it('migration does not write ready_for_payroll or touch operative table', () => {
    // Search across all DB triggers/functions referencing this staging
    // for forbidden operative writes.
    const fns = q(
      `SELECT pg_get_functiondef(p.oid)
         FROM pg_proc p
        WHERE p.proname IN (
          'enforce_staging_approval_rules',
          'tic_nac_staging_set_updated_at',
          'tic_nac_staging_audit_block_mutations'
        )`,
    );
    expect(fns).not.toMatch(/ready_for_payroll\s*=\s*true/i);
    expect(fns).not.toMatch(/UPDATE\s+public\.erp_hr_collective_agreements\b/i);
    expect(fns).not.toMatch(/INSERT\s+INTO\s+public\.erp_hr_collective_agreements\b/i);
  });
});