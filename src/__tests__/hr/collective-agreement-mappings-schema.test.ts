/**
 * B10C.2B.1 — erp_hr_company_agreement_registry_mappings
 *
 * Schema + safety contract tests. We combine two strategies:
 *   1. Type-level checks against generated Supabase types for the table contract.
 *   2. Source-level inspection of the migration SQL file to validate RLS,
 *      triggers, checks, indexes and append-only invariants.
 *
 * We also assert that B10C.2B.1 did NOT touch payroll runtime: the bridge,
 * the shadow flag, the resolver, the salary normalizer or the operative
 * agreements table.
 *
 * No DB roundtrips are made here — these are static contract tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Database } from '@/integrations/supabase/types';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function findMigrationSql(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (sql.includes('erp_hr_company_agreement_registry_mappings')
      && sql.includes('CREATE TABLE') ) {
      return sql;
    }
  }
  throw new Error('B10C.2B.1 migration not found');
}

const MIGRATION_SQL = findMigrationSql();

// =============================================================================
// 1. Type-level contract
// =============================================================================

describe('Schema Contract: erp_hr_company_agreement_registry_mappings (types)', () => {
  type Row = TableRow<'erp_hr_company_agreement_registry_mappings'>;
  type Ins = TableInsert<'erp_hr_company_agreement_registry_mappings'>;

  const CRITICAL_COLUMNS: (keyof Row)[] = [
    'id',
    'company_id',
    'employee_id',
    'contract_id',
    'registry_agreement_id',
    'registry_version_id',
    'source_type',
    'mapping_status',
    'confidence_score',
    'rationale_json',
    'evidence_urls',
    'is_current',
    'created_by',
    'approved_by',
    'approved_at',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as Row;
    expect(_typeCheck).toBeDefined();
    expect(CRITICAL_COLUMNS).toHaveLength(17);
  });

  it('company_id, registry_agreement_id, registry_version_id, source_type are required on insert', () => {
    type Check = Ins extends {
      company_id: string;
      registry_agreement_id: string;
      registry_version_id: string;
      source_type: string;
    } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('employee_id and contract_id are nullable scope fields', () => {
    type Row2 = Row;
    type Check = Row2 extends { employee_id: string | null; contract_id: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================================
// 2. SQL contract — table, columns, defaults, checks, indexes
// =============================================================================

describe('Schema Contract: migration SQL — table & constraints', () => {
  it('creates the table public.erp_hr_company_agreement_registry_mappings', () => {
    expect(MIGRATION_SQL).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.erp_hr_company_agreement_registry_mappings/i,
    );
  });

  it('declares mandatory columns with correct nullability', () => {
    expect(MIGRATION_SQL).toMatch(/company_id\s+uuid\s+NOT\s+NULL/i);
    expect(MIGRATION_SQL).toMatch(/employee_id\s+uuid\s+NULL/i);
    expect(MIGRATION_SQL).toMatch(/contract_id\s+uuid\s+NULL/i);
    expect(MIGRATION_SQL).toMatch(/registry_agreement_id\s+uuid\s+NOT\s+NULL/i);
    expect(MIGRATION_SQL).toMatch(/registry_version_id\s+uuid\s+NOT\s+NULL/i);
    expect(MIGRATION_SQL).toMatch(/rationale_json\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'\{\}'::jsonb/i);
    expect(MIGRATION_SQL).toMatch(/evidence_urls\s+text\[\]\s+NOT\s+NULL\s+DEFAULT\s+'\{\}'::text\[\]/i);
    expect(MIGRATION_SQL).toMatch(/is_current\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+false/i);
    expect(MIGRATION_SQL).toMatch(/created_by\s+uuid\s+NOT\s+NULL\s+DEFAULT\s+auth\.uid\(\)/i);
  });

  it('declares FK to registry agreement with ON DELETE RESTRICT', () => {
    expect(MIGRATION_SQL).toMatch(
      /REFERENCES\s+public\.erp_hr_collective_agreements_registry\(id\)\s+ON\s+DELETE\s+RESTRICT/i,
    );
  });

  it('declares FK to registry versions with ON DELETE RESTRICT', () => {
    expect(MIGRATION_SQL).toMatch(
      /REFERENCES\s+public\.erp_hr_collective_agreements_registry_versions\(id\)\s+ON\s+DELETE\s+RESTRICT/i,
    );
  });

  it('CHECK source_type whitelist is present', () => {
    expect(MIGRATION_SQL).toMatch(/source_type\s+IN\s*\(\s*'manual_selection'/i);
    expect(MIGRATION_SQL).toContain("'cnae_suggestion'");
    expect(MIGRATION_SQL).toContain("'legacy_operational_match'");
    expect(MIGRATION_SQL).toContain("'imported_mapping'");
  });

  it('CHECK mapping_status whitelist is present', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_status\s+IN\s*\(\s*'draft'/i);
    expect(MIGRATION_SQL).toContain("'pending_review'");
    expect(MIGRATION_SQL).toContain("'approved_internal'");
    expect(MIGRATION_SQL).toContain("'rejected'");
    expect(MIGRATION_SQL).toContain("'superseded'");
  });

  it('CHECK confidence_score 0..100 is present', () => {
    expect(MIGRATION_SQL).toMatch(/confidence_score\s*>=\s*0/i);
    expect(MIGRATION_SQL).toMatch(/confidence_score\s*<=\s*100/i);
  });

  it('creates expected indexes (company_id, registry_agreement_id, mapping_status)', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+INDEX[^;]+idx_car_mappings_company_id/i);
    expect(MIGRATION_SQL).toMatch(/CREATE\s+INDEX[^;]+idx_car_mappings_registry_agreement_id/i);
    expect(MIGRATION_SQL).toMatch(/CREATE\s+INDEX[^;]+idx_car_mappings_mapping_status/i);
  });

  it('creates UNIQUE partial index for current mapping per scope with COALESCE sentinels', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+UNIQUE\s+INDEX[^;]+uniq_car_mappings_current_per_scope/i);
    expect(MIGRATION_SQL).toMatch(/COALESCE\(\s*employee_id\s*,\s*'00000000-0000-0000-0000-000000000000'::uuid\s*\)/i);
    expect(MIGRATION_SQL).toMatch(/COALESCE\(\s*contract_id\s*,\s*'00000000-0000-0000-0000-000000000000'::uuid\s*\)/i);
    expect(MIGRATION_SQL).toMatch(/WHERE\s+is_current\s*=\s*true/i);
  });
});

// =============================================================================
// 3. RLS contract
// =============================================================================

describe('Schema Contract: migration SQL — RLS', () => {
  it('enables and forces RLS', () => {
    expect(MIGRATION_SQL).toMatch(
      /ALTER\s+TABLE\s+public\.erp_hr_company_agreement_registry_mappings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(MIGRATION_SQL).toMatch(
      /ALTER\s+TABLE\s+public\.erp_hr_company_agreement_registry_mappings\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
  });

  it('declares SELECT, INSERT and UPDATE policies', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+POLICY\s+"car_mappings_select_authorized"[\s\S]+FOR\s+SELECT/i);
    expect(MIGRATION_SQL).toMatch(/CREATE\s+POLICY\s+"car_mappings_insert_authorized"[\s\S]+FOR\s+INSERT/i);
    expect(MIGRATION_SQL).toMatch(/CREATE\s+POLICY\s+"car_mappings_update_authorized"[\s\S]+FOR\s+UPDATE/i);
  });

  it('does NOT declare any DELETE policy', () => {
    expect(MIGRATION_SQL).not.toMatch(/CREATE\s+POLICY[^;]+FOR\s+DELETE/i);
  });

  it('does not use USING (true) or WITH CHECK (true)', () => {
    expect(MIGRATION_SQL).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(MIGRATION_SQL).not.toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
  });

  it('UPDATE policy WITH CHECK includes role authorization (not only company access)', () => {
    // Extract the update policy block
    const m = MIGRATION_SQL.match(
      /CREATE\s+POLICY\s+"car_mappings_update_authorized"[\s\S]+?;\s*\n/i,
    );
    expect(m).not.toBeNull();
    const block = m![0];
    // Both clauses present
    expect(block).toMatch(/USING\s*\(/i);
    expect(block).toMatch(/WITH\s+CHECK\s*\(/i);
    // Both reference user_has_erp_company_access AND has_role
    const withCheck = block.split(/WITH\s+CHECK/i)[1];
    expect(withCheck).toBeDefined();
    expect(withCheck).toMatch(/user_has_erp_company_access/);
    expect(withCheck).toMatch(/has_role\(auth\.uid\(\),\s*'(superadmin|admin|hr_manager|legal_manager|payroll_supervisor)'::public\.app_role\)/);
  });

  it('uses the verified RLS helpers user_has_erp_company_access and has_role', () => {
    expect(MIGRATION_SQL).toMatch(/public\.user_has_erp_company_access\(/);
    expect(MIGRATION_SQL).toMatch(/public\.has_role\(auth\.uid\(\),\s*'admin'::public\.app_role\)/);
    expect(MIGRATION_SQL).toMatch(/'hr_manager'::public\.app_role/);
    expect(MIGRATION_SQL).toMatch(/'legal_manager'::public\.app_role/);
    expect(MIGRATION_SQL).toMatch(/'payroll_supervisor'::public\.app_role/);
    expect(MIGRATION_SQL).toMatch(/'superadmin'::public\.app_role/);
  });
});

// =============================================================================
// 4. Triggers contract
// =============================================================================

describe('Schema Contract: migration SQL — triggers', () => {
  it('creates updated_at trigger', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+TRIGGER\s+trg_car_mappings_updated_at/i);
    expect(MIGRATION_SQL).toMatch(/tg_car_mappings_set_updated_at/);
  });

  it('creates enforce_approval_invariants trigger (BEFORE INSERT OR UPDATE)', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+TRIGGER\s+trg_car_mappings_enforce_approval/i);
    expect(MIGRATION_SQL).toMatch(/BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+public\.erp_hr_company_agreement_registry_mappings[\s\S]+tg_car_mappings_enforce_approval_invariants/i);
  });

  it('creates supersede_previous_current trigger (AFTER INSERT OR UPDATE)', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+TRIGGER\s+trg_car_mappings_supersede_previous/i);
    expect(MIGRATION_SQL).toMatch(/AFTER\s+INSERT\s+OR\s+UPDATE[\s\S]+tg_car_mappings_supersede_previous_current/i);
  });

  it('creates block_destructive_changes trigger (BEFORE UPDATE)', () => {
    expect(MIGRATION_SQL).toMatch(/CREATE\s+TRIGGER\s+trg_car_mappings_block_destructive/i);
    expect(MIGRATION_SQL).toMatch(/BEFORE\s+UPDATE[\s\S]+tg_car_mappings_block_destructive_changes/i);
  });

  // Approval invariants — every blocker is wired into the trigger body
  it('approval invariant: requires approved_by and approved_at', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*approved_by is required/i);
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*approved_at is required/i);
  });

  it('approval invariant: approver must hold an authorized role', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*approved_by lacks an authorized role/i);
  });

  it('approval invariant: registry agreement must be ready_for_payroll', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*registry agreement is not ready_for_payroll/i);
  });

  it('approval invariant: registry agreement must not require human review', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*registry agreement requires_human_review/i);
  });

  it('approval invariant: data_completeness must be human_validated', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*registry agreement data_completeness must be human_validated/i);
  });

  it('approval invariant: source_quality must be official', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*registry agreement source_quality must be official/i);
  });

  it('approval invariant: registry version must be current', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*registry version is not current/i);
  });

  it('approval invariant: cnae_suggestion requires authorized human approver', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_approval_blocked:\s*cnae_suggestion requires authorized human approver/i);
  });

  it('immutability: registry_agreement_id cannot be changed post-creation', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_immutable_field:\s*registry_agreement_id cannot be changed/i);
  });

  it('immutability: registry_version_id cannot be changed post-creation', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_immutable_field:\s*registry_version_id cannot be changed/i);
  });

  it('immutability: company_id, employee_id, contract_id cannot be changed post-creation', () => {
    expect(MIGRATION_SQL).toMatch(/mapping_immutable_field:\s*company_id cannot be changed/i);
    expect(MIGRATION_SQL).toMatch(/mapping_immutable_field:\s*employee_id cannot be changed/i);
    expect(MIGRATION_SQL).toMatch(/mapping_immutable_field:\s*contract_id cannot be changed/i);
  });

  it('supersede trigger sets is_current=false and mapping_status=superseded (no DELETE)', () => {
    const m = MIGRATION_SQL.match(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.tg_car_mappings_supersede_previous_current[\s\S]+?\$\$;/i,
    );
    expect(m).not.toBeNull();
    const body = m![0];
    expect(body).toMatch(/is_current\s*=\s*false/i);
    expect(body).toMatch(/mapping_status\s*=\s*'superseded'/i);
    expect(body).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

// =============================================================================
// 5. Migration scope — does not touch payroll runtime / operative table
// =============================================================================

describe('Migration scope: B10C.2B.1 does not touch payroll runtime', () => {
  it('does not reference the operative table erp_hr_collective_agreements (without _registry)', () => {
    // Strip every "_registry"-suffixed reference, then search for the bare token.
    const stripped = MIGRATION_SQL.replace(/erp_hr_collective_agreements_registry\w*/g, '');
    expect(stripped).not.toMatch(/erp_hr_collective_agreements\b/);
  });

  it('does not reference payroll/payslip/salaryNormalizer/agreementSalaryResolver/useESPayrollBridge', () => {
    expect(MIGRATION_SQL).not.toMatch(/payroll_engine/i);
    expect(MIGRATION_SQL).not.toMatch(/payslip/i);
    expect(MIGRATION_SQL).not.toMatch(/salaryNormalizer/i);
    expect(MIGRATION_SQL).not.toMatch(/agreementSalaryResolver/i);
    expect(MIGRATION_SQL).not.toMatch(/useESPayrollBridge/i);
  });

  it('does not write to ready_for_payroll', () => {
    expect(MIGRATION_SQL).not.toMatch(/ready_for_payroll\s*=/);
  });
});

// =============================================================================
// 6. Static safety — bridge, flag, payroll engines untouched
// =============================================================================

describe('Static safety: bridge / flag / payroll engines untouched by B10C.2B.1', () => {
  it('registryShadowFlag still exports HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false', () => {
    const flag = readFileSync('src/engines/erp/hr/registryShadowFlag.ts', 'utf8');
    expect(flag).toMatch(/export\s+const\s+HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false\s*;/);
  });

  it('useESPayrollBridge.ts does not reference the new mapping table', () => {
    const bridge = readFileSync('src/hooks/erp/hr/useESPayrollBridge.ts', 'utf8');
    expect(bridge).not.toMatch(/erp_hr_company_agreement_registry_mappings/);
  });

  it('no payroll/bridge/resolver/normalizer source file references the new mapping table', () => {
    const forbiddenFiles = [
      'src/hooks/erp/hr/useESPayrollBridge.ts',
      'src/engines/erp/hr/registryShadowFlag.ts',
      'src/engines/erp/hr/registryShadowPreview.ts',
      'src/engines/erp/hr/agreementResolutionComparator.ts',
      'src/engines/erp/hr/agreementSafetyGate.ts',
    ];
    for (const f of forbiddenFiles) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} must not reference the mapping table in B10C.2B.1`).not.toMatch(
        /erp_hr_company_agreement_registry_mappings/,
      );
    }
  });
});