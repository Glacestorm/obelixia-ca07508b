/**
 * B8A — Human Validation Workflow — Schema/Migration static contract tests.
 *
 * These tests inspect the migration SQL file as text (no DB execution) to
 * guarantee the legal & security invariants of B8A are present and have not
 * been silently relaxed in future edits.
 *
 * Invariants validated:
 *  1. The 3 registry validation tables exist.
 *  2. RLS is ENABLED on the 3 tables.
 *  3. No write policies are permissive (no `USING (true)` / `WITH CHECK (true)`).
 *  4. INSERT policies on validations forbid creating rows directly as
 *     `approved_internal` (only draft/pending_review allowed).
 *  5. UPDATE policies on validations forbid transitioning directly to
 *     `approved_internal` from the client.
 *  6. Signatures are append-only (BEFORE UPDATE + BEFORE DELETE blockers).
 *  7. SHA-256 / signature_hash format is enforced.
 *  8. There is a uniqueness/trigger guarantee that prevents multiple
 *     `is_current = true` per (agreement_id, version_id).
 *  9. The migration does NOT touch the operational table
 *     `erp_hr_collective_agreements` (without `_registry`), payroll engines,
 *     or `ready_for_payroll` on the master registry table.
 * 10. The migration does NOT add write policies on legacy registry tables.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_FILE =
  'supabase/migrations/20260429075050_fb8e33d5-fce3-49b7-97ba-f208303101cc.sql';

let SQL = '';
let SQL_LC = '';
let SQL_NO_COMMENTS = '';

beforeAll(() => {
  const abs = path.resolve(process.cwd(), MIGRATION_FILE);
  SQL = fs.readFileSync(abs, 'utf-8');
  SQL_LC = SQL.toLowerCase();
  // Strip SQL line comments (-- ...) so the assertions inspect only executed SQL.
  SQL_NO_COMMENTS = SQL
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
});

const VALIDATIONS_TABLE =
  'erp_hr_collective_agreement_registry_validations';
const ITEMS_TABLE =
  'erp_hr_collective_agreement_registry_validation_items';
const SIGNATURES_TABLE =
  'erp_hr_collective_agreement_registry_validation_signatures';

describe('B8A — Migration: validation tables exist', () => {
  it('creates the validations table', () => {
    expect(SQL).toMatch(
      new RegExp(`create\\s+table\\s+public\\.${VALIDATIONS_TABLE}\\b`, 'i'),
    );
  });

  it('creates the validation_items table', () => {
    expect(SQL).toMatch(
      new RegExp(`create\\s+table\\s+public\\.${ITEMS_TABLE}\\b`, 'i'),
    );
  });

  it('creates the validation_signatures table', () => {
    expect(SQL).toMatch(
      new RegExp(`create\\s+table\\s+public\\.${SIGNATURES_TABLE}\\b`, 'i'),
    );
  });
});

describe('B8A — Migration: RLS enabled on all 3 tables', () => {
  for (const t of [VALIDATIONS_TABLE, ITEMS_TABLE, SIGNATURES_TABLE]) {
    it(`enables RLS on ${t}`, () => {
      expect(SQL).toMatch(
        new RegExp(
          `alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`,
          'i',
        ),
      );
    });
  }
});

describe('B8A — Migration: no permissive write policies', () => {
  it('does not declare USING (true)', () => {
    expect(SQL_LC).not.toMatch(/using\s*\(\s*true\s*\)/);
  });

  it('does not declare WITH CHECK (true)', () => {
    expect(SQL_LC).not.toMatch(/with\s+check\s*\(\s*true\s*\)/);
  });
});

describe('B8A — Migration: validations cannot be created directly as approved_internal', () => {
  it('INSERT policy restricts validation_status to draft/pending_review', () => {
    // The policy block must constrain validation_status IN ('draft','pending_review')
    // and NOT allow 'approved_internal' / 'rejected' on insert.
    const insertPolicyRegion = SQL.match(
      /CREATE\s+POLICY\s+"car_validations_insert_self_draft"[\s\S]*?;\s*\n/i,
    );
    expect(insertPolicyRegion, 'insert policy not found').toBeTruthy();
    const region = insertPolicyRegion![0];
    expect(region).toMatch(/validation_status\s+IN\s*\(\s*'draft'\s*,\s*'pending_review'\s*\)/i);
    expect(region).not.toMatch(/'approved_internal'/);
    expect(region).not.toMatch(/'rejected'/);
  });
});

describe('B8A — Migration: validations cannot be updated directly to approved_internal', () => {
  it('UPDATE policy restricts validation_status to draft/pending_review on USING and WITH CHECK', () => {
    const updatePolicyRegion = SQL.match(
      /CREATE\s+POLICY\s+"car_validations_update_self_draft"[\s\S]*?;\s*\n/i,
    );
    expect(updatePolicyRegion, 'update policy not found').toBeTruthy();
    const region = updatePolicyRegion![0];

    // Both USING and WITH CHECK clauses must restrict the status
    const occurrences = region.match(
      /validation_status\s+IN\s*\(\s*'draft'\s*,\s*'pending_review'\s*\)/gi,
    );
    expect(occurrences && occurrences.length >= 2).toBe(true);
    expect(region).not.toMatch(/'approved_internal'/);
  });
});

describe('B8A — Migration: signatures are append-only', () => {
  it('declares a BEFORE UPDATE blocker trigger on signatures', () => {
    expect(SQL).toMatch(
      /CREATE\s+TRIGGER\s+trg_car_validation_signatures_no_update[\s\S]*?BEFORE\s+UPDATE\s+ON\s+public\.erp_hr_collective_agreement_registry_validation_signatures/i,
    );
  });

  it('declares a BEFORE DELETE blocker trigger on signatures', () => {
    expect(SQL).toMatch(
      /CREATE\s+TRIGGER\s+trg_car_validation_signatures_no_delete[\s\S]*?BEFORE\s+DELETE\s+ON\s+public\.erp_hr_collective_agreement_registry_validation_signatures/i,
    );
  });

  it('blocker function raises an exception', () => {
    expect(SQL).toMatch(
      /car_validation_signatures_block_mutation[\s\S]*?RAISE\s+EXCEPTION\s+'CAR_VALIDATION_SIGNATURES_ARE_APPEND_ONLY'/i,
    );
  });

  it('does NOT declare any INSERT/UPDATE/DELETE policy on signatures', () => {
    // Only a SELECT policy is allowed; writes go through service_role / future edge.
    const sigPolicies = SQL.match(
      /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.erp_hr_collective_agreement_registry_validation_signatures[\s\S]*?;\s*\n/gi,
    ) ?? [];
    for (const p of sigPolicies) {
      expect(p).toMatch(/FOR\s+SELECT/i);
      expect(p).not.toMatch(/FOR\s+INSERT/i);
      expect(p).not.toMatch(/FOR\s+UPDATE/i);
      expect(p).not.toMatch(/FOR\s+DELETE/i);
    }
  });
});

describe('B8A — Migration: SHA-256 + signature_hash format enforced', () => {
  it('validations table has sha256_hash column NOT NULL', () => {
    expect(SQL).toMatch(/sha256_hash\s+text\s+NOT\s+NULL/i);
  });

  it('validations table has signature_hash column', () => {
    expect(SQL).toMatch(/signature_hash\s+text/i);
  });

  it('enforces sha256_hash format ^[a-f0-9]{64}$', () => {
    expect(SQL).toMatch(/sha256_hash\s+!~\s+'\^\[a-f0-9\]\{64\}\$'/);
  });

  it('enforces signature_hash format ^[a-f0-9]{64}$ when set', () => {
    expect(SQL).toMatch(/signature_hash\s+!~\s+'\^\[a-f0-9\]\{64\}\$'/);
  });

  it('requires signature_hash + validated_at when status is approved_internal/rejected', () => {
    expect(SQL).toMatch(/CAR_VALIDATIONS_SIGNATURE_REQUIRED/);
    expect(SQL).toMatch(/CAR_VALIDATIONS_VALIDATED_AT_REQUIRED/);
  });
});

describe('B8A — Migration: only one is_current per (agreement_id, version_id)', () => {
  it('declares a unique partial index on is_current', () => {
    expect(SQL).toMatch(
      /CREATE\s+UNIQUE\s+INDEX\s+uniq_car_validations_current[\s\S]*?\(\s*agreement_id\s*,\s*version_id\s*\)[\s\S]*?WHERE\s+is_current\s*=\s*true/i,
    );
  });

  it('also declares a supersede trigger that demotes previous current rows', () => {
    expect(SQL).toMatch(/car_validations_supersede_previous/);
    expect(SQL).toMatch(/SET\s+is_current\s*=\s*false/i);
  });
});

describe('B8A — Migration: does NOT touch operational / payroll surfaces', () => {
  it('does NOT reference the operational table erp_hr_collective_agreements (without _registry)', () => {
    // Search SQL (with comments stripped) for occurrences of the operational
    // table name not followed by `_` (which would continue into a
    // `_registry...` identifier).
    const matches = SQL_NO_COMMENTS.match(/erp_hr_collective_agreements(?!_)/g) ?? [];
    expect(matches.length).toBe(0);
  });

  it('does NOT reference any payroll engine / payslip table', () => {
    expect(SQL_LC).not.toMatch(/erp_hr_payroll/);
    expect(SQL_LC).not.toMatch(/erp_hr_payslip/);
  });

  it('does NOT mutate ready_for_payroll on master registry', () => {
    // No UPDATE on the master registry table at all, and no assignment to
    // ready_for_payroll inside this migration body.
    expect(SQL).not.toMatch(/UPDATE\s+public\.erp_hr_collective_agreements_registry\b/i);
    expect(SQL_LC).not.toMatch(/ready_for_payroll\s*=\s*true/);
  });
});

describe('B8A — Migration: does NOT add write policies on legacy registry tables', () => {
  const LEGACY_REGISTRY_TABLES = [
    'erp_hr_collective_agreements_registry',
    'erp_hr_collective_agreements_registry_sources',
    'erp_hr_collective_agreements_registry_versions',
    'erp_hr_collective_agreements_registry_salary_tables',
    'erp_hr_collective_agreements_registry_rules',
    'erp_hr_collective_agreements_registry_import_runs',
  ];

  for (const t of LEGACY_REGISTRY_TABLES) {
    it(`does not declare INSERT/UPDATE/DELETE policies on ${t}`, () => {
      const policiesOnT = SQL.match(
        new RegExp(
          `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+public\\.${t}\\b[\\s\\S]*?;\\s*\\n`,
          'gi',
        ),
      ) ?? [];
      for (const p of policiesOnT) {
        expect(p).not.toMatch(/FOR\s+INSERT/i);
        expect(p).not.toMatch(/FOR\s+UPDATE/i);
        expect(p).not.toMatch(/FOR\s+DELETE/i);
      }
    });
  }
});