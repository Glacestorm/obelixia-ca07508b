/**
 * B13.2 — Schema test for the Document Intake migration.
 *
 * Static check: read the latest migration file that creates the
 * `erp_hr_collective_agreement_document_intake` table and verify
 * that it contains the required structure and safety guarantees.
 * This avoids requiring a live DB connection in CI.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');

function loadMigrationContaining(needle: string): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => join(MIGRATIONS_DIR, f))
    .filter((p) => statSync(p).isFile());
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    if (content.includes(needle)) return content;
  }
  throw new Error(`No migration found containing: ${needle}`);
}

const SQL = loadMigrationContaining('erp_hr_collective_agreement_document_intake');

describe('B13.2 — Document Intake schema', () => {
  it('1. creates the intake table', () => {
    expect(SQL).toMatch(
      /CREATE TABLE[\s\S]*?public\.erp_hr_collective_agreement_document_intake/,
    );
  });

  it('2. has main columns', () => {
    for (const col of [
      'watch_queue_id',
      'source_type',
      'source_url',
      'document_url',
      'jurisdiction',
      'territorial_scope',
      'publication_date',
      'document_hash',
      'detected_agreement_name',
      'detected_regcon',
      'detected_cnae',
      'detected_sector',
      'confidence',
      'status',
      'classification',
      'candidate_registry_agreement_id',
      'candidate_registry_version_id',
      'duplicate_of',
      'human_reviewer',
      'claimed_at',
      'classified_by',
      'classified_at',
      'blocked_by',
      'blocked_at',
      'block_reason',
      'notes',
      'payload_json',
    ]) {
      expect(SQL).toContain(col);
    }
  });

  it('3. has status check with all required statuses', () => {
    for (const s of [
      'pending_review',
      'claimed_for_review',
      'classified',
      'duplicate',
      'blocked',
      'ready_for_extraction',
      'dismissed',
    ]) {
      expect(SQL).toContain(`'${s}'`);
    }
  });

  it('4. has classification check with all required values', () => {
    for (const c of [
      'new_agreement',
      'salary_revision',
      'errata',
      'paritaria_act',
      'scope_clarification',
      'unknown',
    ]) {
      expect(SQL).toContain(`'${c}'`);
    }
  });

  it('5. has document_hash index', () => {
    expect(SQL).toMatch(/idx_document_intake_document_hash/);
    expect(SQL).toMatch(/uq_document_intake_document_hash/);
  });

  it('6. enables RLS and FORCE RLS', () => {
    expect(SQL).toMatch(
      /ALTER TABLE public\.erp_hr_collective_agreement_document_intake ENABLE ROW LEVEL SECURITY/,
    );
    expect(SQL).toMatch(
      /ALTER TABLE public\.erp_hr_collective_agreement_document_intake FORCE ROW LEVEL SECURITY/,
    );
  });

  it('7. has no DELETE policy', () => {
    // No CREATE POLICY ... FOR DELETE on this table.
    const deletePolicy = /CREATE POLICY[\s\S]*?ON public\.erp_hr_collective_agreement_document_intake[\s\S]*?FOR DELETE/i;
    expect(deletePolicy.test(SQL)).toBe(false);
  });

  it('8. has updated_at trigger', () => {
    expect(SQL).toMatch(/trg_b13_2_document_intake_updated_at/);
    expect(SQL).toMatch(/b13_2_document_intake_set_updated_at/);
  });

  it('9. has anti-activation guard trigger', () => {
    expect(SQL).toMatch(/trg_b13_2_document_intake_anti_activation/);
    expect(SQL).toMatch(/b13_2_document_intake_anti_activation_guard/);
    // Anti-activation guard contains forbidden tokens
    for (const f of [
      'ready_for_payroll',
      'salary_tables_loaded',
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
      'HR_REGISTRY_PILOT_MODE',
      'REGISTRY_PILOT_SCOPE_ALLOWLIST',
      'use_registry_for_payroll',
      'activation_run_id',
      'runtime_setting',
    ]) {
      expect(SQL).toContain(f);
    }
  });

  it('10. does not touch real salary_tables', () => {
    // Migration body must not reference any operative salary_tables modifications.
    expect(SQL).not.toMatch(/CREATE TABLE[\s\S]*?salary_tables\b/);
    expect(SQL).not.toMatch(/ALTER TABLE public\.salary_tables/);
    expect(SQL).not.toMatch(/INSERT INTO public\.salary_tables/);
  });

  it('11. does not touch operative erp_hr_collective_agreements (without _registry)', () => {
    // Allow registry tables, forbid plain operative table.
    const dangerous = /erp_hr_collective_agreements(?!_registry|_document|_source|_registry_versions|_registry_activation|_status_audit)/g;
    const matches = SQL.match(dangerous) ?? [];
    expect(matches.length).toBe(0);
  });
});