/**
 * B13.5B — Schema contract tests for impact preview tables.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function findMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (
      sql.includes('erp_hr_collective_agreement_affected_scopes') &&
      sql.includes('erp_hr_collective_agreement_impact_previews') &&
      sql.includes('CREATE TABLE')
    ) {
      return sql;
    }
  }
  throw new Error('B13.5B migration not found');
}

const SQL = findMigration();

describe('B13.5B — affected_scopes & impact_previews schema', () => {
  it('creates affected_scopes table', () => {
    expect(SQL).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.erp_hr_collective_agreement_affected_scopes/i);
  });
  it('creates impact_previews table', () => {
    expect(SQL).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.erp_hr_collective_agreement_impact_previews/i);
  });

  it('declares core columns', () => {
    for (const col of ['agreement_id', 'version_id', 'company_id', 'employee_id', 'risk_flags', 'blockers_json', 'warnings_json', 'source_trace']) {
      expect(SQL).toContain(col);
    }
  });

  it('declares requires_human_review CHECK constraint', () => {
    expect(SQL).toMatch(/requires_human_review\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+true\s*\n?\s*CHECK\s*\(\s*requires_human_review\s*=\s*true\s*\)/i);
  });

  it('enables and forces RLS on both tables', () => {
    expect((SQL.match(/ENABLE ROW LEVEL SECURITY/gi) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((SQL.match(/FORCE ROW LEVEL SECURITY/gi) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('SELECT policy uses user_has_erp_company_access', () => {
    expect(SQL).toMatch(/agr_affected_scopes_select_authorized[\s\S]*user_has_erp_company_access/);
    expect(SQL).toMatch(/agr_impact_previews_select_authorized[\s\S]*user_has_erp_company_access/);
  });

  it('INSERT/UPDATE policies require role + company access', () => {
    for (const role of ['superadmin', 'admin', 'legal_manager', 'hr_manager', 'payroll_supervisor']) {
      expect(SQL).toContain(role);
    }
    expect(SQL).toMatch(/agr_impact_previews_insert_authorized/);
    expect(SQL).toMatch(/agr_impact_previews_update_authorized/);
  });

  it('does NOT define DELETE policy', () => {
    expect(SQL).not.toMatch(/CREATE POLICY[^;]*FOR DELETE[^;]*erp_hr_collective_agreement_(affected_scopes|impact_previews)/i);
  });

  it('declares updated_at triggers', () => {
    expect(SQL).toContain('trg_agr_affected_scopes_updated_at');
    expect(SQL).toContain('trg_agr_impact_previews_updated_at');
  });

  it('declares anti-activation guard triggers', () => {
    expect(SQL).toContain('trg_agr_affected_scopes_block_activation');
    expect(SQL).toContain('trg_agr_impact_previews_guard');
  });

  it('does not write ready_for_payroll / salary_tables_loaded / human_validated', () => {
    expect(SQL).not.toMatch(/UPDATE\s+public\.erp_hr_collective_agreements_registry\s+SET\s+ready_for_payroll/i);
    expect(SQL).not.toMatch(/SET\s+salary_tables_loaded\s*=\s*true/i);
    expect(SQL).not.toMatch(/SET\s+data_completeness\s*=\s*'human_validated'/i);
  });

  it('does not reference operational legacy table erp_hr_collective_agreements (without _registry)', () => {
    expect(SQL.match(/erp_hr_collective_agreements(?!_)/g) ?? []).toHaveLength(0);
  });

  it('declares required indexes', () => {
    for (const idx of [
      'idx_agreement_affected_scopes_agreement_version',
      'idx_agreement_affected_scopes_company',
      'idx_agreement_affected_scopes_computed_at',
      'idx_agreement_impact_previews_agreement_version',
      'idx_agreement_impact_previews_company',
      'idx_agreement_impact_previews_employee',
      'idx_agreement_impact_previews_contract',
      'idx_agreement_impact_previews_scope',
      'idx_agreement_impact_previews_computed_at',
    ]) {
      expect(SQL).toContain(idx);
    }
  });
});
