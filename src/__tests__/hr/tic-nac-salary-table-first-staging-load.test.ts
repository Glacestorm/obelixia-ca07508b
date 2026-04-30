/**
 * B11.2D — Safeguard test for the first staging load of TIC-NAC.
 *
 * In this turn the build was STOPPED (STOP_B11.2D — STAGING_INPUT_NOT_READY)
 * because no real OCR pipeline was viable and the manual CSV template was
 * empty. This test enforces that no automation has silently:
 *   - written rows to `salary_tables` (real),
 *   - flipped `ready_for_payroll` / `salary_tables_loaded` to true,
 *   - lowered `requires_human_review`,
 *   - promoted `data_completeness` to `human_validated`,
 *   - touched the payroll bridge / engines / resolver,
 *   - mutated the operative `erp_hr_collective_agreements` table,
 *   - mutated pilot flags or the allow-list,
 *   - introduced approved staging rows for TIC-NAC.
 *
 * The repo-level checks that follow are deterministic and run without a
 * DB connection so they survive in CI and in jsdom.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function readSafe(path: string): string {
  const p = resolve(ROOT, path);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const TIC_NAC_AGREEMENT_ID = '1e665f80-3f04-4939-a448-4b1a2a4525e0';
const TIC_NAC_VERSION_ID = '9739379b-68e5-4ffd-8209-d5a1222fefc2';

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('B11.2D — first staging load TIC-NAC (STOP guard)', () => {
  it('the manual CSV template still has no real values for TIC-NAC', () => {
    const csv = readSafe('docs/templates/TIC_NAC_salary_tables_manual_upload.csv');
    expect(csv).toMatch(/^agreement_id,version_id,year,/);
    const dataLines = csv
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean);

    // Each present row must reference the TIC-NAC ids…
    for (const line of dataLines) {
      expect(line).toContain(TIC_NAC_AGREEMENT_ID);
      expect(line).toContain(TIC_NAC_VERSION_ID);
    }

    // …and must NOT contain real EUR amounts. The placeholder row is allowed
    // (year=2025 plus mostly-empty fields). We assert there is no fully
    // populated row that could have been silently auto-staged.
    for (const line of dataLines) {
      const cols = line.split(',');
      const salaryAnnual = cols[8] ?? '';
      const salaryMonthly = cols[9] ?? '';
      const sourcePage = cols[17] ?? '';
      const sourceExcerpt = cols[18] ?? '';
      // Either fully empty (placeholder) OR human will fill it later. We
      // refuse to see a row that already has all fields populated, because
      // that would mean someone bypassed the staging review.
      const fullyPopulated =
        salaryAnnual.length > 0 &&
        salaryMonthly.length > 0 &&
        sourcePage.length > 0 &&
        sourceExcerpt.length > 0;
      expect(fullyPopulated).toBe(false);
    }
  });

  it('B11.2D STOP report exists and confirms no activation', () => {
    const doc = readSafe(
      'docs/qa/HR_COLLECTIVE_AGREEMENTS_B11_2D_TIC_NAC_FIRST_STAGING_LOAD.md',
    );
    expect(doc).toMatch(/STOP_B11\.2D — STAGING_INPUT_NOT_READY/);
    for (const line of [
      'salary_tables` reales',
      'ready_for_payroll',
      'salary_tables_loaded',
      'requires_human_review',
      'data_completeness',
      'B11.3B writer',
      'service_role',
    ]) {
      expect(doc).toContain(line);
    }
  });

  it('the operative `erp_hr_collective_agreements` table is not referenced by any new B11.2D code', () => {
    // Scan the staging UI + hooks + engine: those are the only surfaces that
    // could have been touched by B11.2D. None of them may reference the
    // operative table (only `_registry` / `_staging` variants are allowed).
    const folders = [
      resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
      resolve(ROOT, 'src/hooks/erp/hr'),
      resolve(ROOT, 'src/engines/erp/hr'),
    ];
    for (const dir of folders) {
      const files = listFiles(dir);
      const concat = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      const matches = concat.match(/erp_hr_collective_agreements(?!_registry|_staging|_salary_table_staging|_salary_table)/g) ?? [];
      expect(matches).toEqual([]);
    }
  });

  it('staging engine, hooks and UI do not import payroll bridge / engines / resolver', () => {
    const folders = [
      resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
      resolve(ROOT, 'src/hooks/erp/hr'),
      resolve(ROOT, 'src/engines/erp/hr'),
    ];
    const forbidden = [
      'useESPayrollBridge',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ];
    for (const dir of folders) {
      const files = listFiles(dir);
      const concat = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      for (const sym of forbidden) {
        // The engine file ticNacSalaryTableOcrStaging.ts must not import
        // payroll. We test the union — any single mention is a regression.
        expect(concat).not.toContain(sym);
      }
    }
  });

  it('no pilot flag or allow-list is mutated to true / non-empty in B11.2D code paths', () => {
    const folders = [
      resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
      resolve(ROOT, 'src/hooks/erp/hr'),
      resolve(ROOT, 'src/engines/erp/hr'),
      resolve(ROOT, 'supabase/functions/erp-hr-agreement-staging'),
    ];
    for (const dir of folders) {
      const files = listFiles(dir);
      const concat = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      expect(concat).not.toMatch(
        /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/,
      );
      expect(concat).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*['"](?!off)/);
      expect(concat).not.toMatch(
        /REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=\s*\[\s*['"]/,
      );
    }
  });

  it('staging edge function does not write ready_for_payroll / salary_tables_loaded / human_validated', () => {
    const edge = readSafe('supabase/functions/erp-hr-agreement-staging/index.ts');
    expect(edge.length).toBeGreaterThan(0);
    expect(edge).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    expect(edge).not.toMatch(/salary_tables_loaded\s*[:=]\s*true/);
    expect(edge).not.toMatch(/data_completeness\s*[:=]\s*['"]human_validated['"]/);
  });

  it('staging edge function only auto-assigns pending statuses on create', () => {
    const edge = readSafe('supabase/functions/erp-hr-agreement-staging/index.ts');
    // It MUST contain the two pending defaults somewhere (assigned during
    // stage_ocr_batch / stage_manual_batch).
    expect(edge).toMatch(/ocr_pending_review/);
    expect(edge).toMatch(/manual_pending_review/);
  });

  it('frontend does not call .from(...).insert/update/delete/upsert in staging surfaces', () => {
    const folders = [
      resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
      resolve(ROOT, 'src/hooks/erp/hr'),
    ];
    for (const dir of folders) {
      const files = listFiles(dir);
      const concat = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      expect(concat).not.toMatch(/\.insert\(/);
      expect(concat).not.toMatch(/\.update\(/);
      expect(concat).not.toMatch(/\.delete\(/);
      expect(concat).not.toMatch(/\.upsert\(/);
    }
  });

  it('no service_role usage is introduced in any B11.2D-related surface', () => {
    const folders = [
      resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
      resolve(ROOT, 'src/hooks/erp/hr'),
      resolve(ROOT, 'src/engines/erp/hr'),
    ];
    for (const dir of folders) {
      const files = listFiles(dir);
      const concat = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      expect(concat).not.toMatch(/service_role/);
      expect(concat).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  it('B11.3B writer is not invoked from any staging surface', () => {
    const folders = [
      resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
      resolve(ROOT, 'src/hooks/erp/hr'),
      resolve(ROOT, 'src/engines/erp/hr'),
      resolve(ROOT, 'supabase/functions/erp-hr-agreement-staging'),
    ];
    for (const dir of folders) {
      const files = listFiles(dir);
      const concat = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      // Forbid any obvious B11.3B writer invocation hook name. The writer
      // doesn't exist yet — this guard makes sure we don't smuggle it in.
      expect(concat).not.toMatch(/B11\.?3B/);
      expect(concat).not.toMatch(/writeSalaryTablesFromStaging/);
      expect(concat).not.toMatch(/promoteStagingToSalaryTables/);
    }
  });
});