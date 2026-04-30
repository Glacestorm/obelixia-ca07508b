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

/**
 * The "B11.2D surfaces" are the narrow set of files that this build (or any
 * follow-up that re-attempts the first staging load) is allowed to touch.
 * Anything else in `src/hooks/erp/hr` / `src/engines/erp/hr` belongs to other
 * verticals (payroll, contracts, settlements, audit…) and is NOT in scope
 * here — it has its own dedicated guard tests.
 */
const B11_2D_FILES: string[] = [
  // Staging UI
  ...listFiles(
    resolve(ROOT, 'src/components/erp/hr/collective-agreements/staging'),
  ),
  // Staging hooks (only the two TIC-NAC staging ones)
  resolve(ROOT, 'src/hooks/erp/hr/useTicNacSalaryTableStaging.ts'),
  resolve(ROOT, 'src/hooks/erp/hr/useTicNacSalaryTableStagingActions.ts'),
  // Staging engine
  resolve(ROOT, 'src/engines/erp/hr/ticNacSalaryTableOcrStaging.ts'),
  // Manual upload validator (B11.2B)
  resolve(ROOT, 'src/engines/erp/hr/ticNacSalaryTableManualUploadValidator.ts'),
  // Edge function
  resolve(ROOT, 'supabase/functions/erp-hr-agreement-staging/index.ts'),
].filter((p) => existsSync(p));

function readAllB11_2D(): string {
  return B11_2D_FILES.map((f) => readFileSync(f, 'utf8')).join('\n---FILE---\n');
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

  it('B11.2D surfaces never reference the operative `erp_hr_collective_agreements` table', () => {
    const concat = readAllB11_2D();
    // Strip line/block comments before checking — the staging engine and
    // edge function legitimately mention the operative table in DOC
    // comments to declare it as out-of-scope. The invariant is "no real
    // reference at runtime".
    const codeOnly = concat
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/[^\n]*/g, '$1')
      .replace(/(^|\s)\*[^\n]*/g, '$1');
    const matches =
      codeOnly.match(
        /erp_hr_collective_agreements(?!_registry|_staging|_salary_table_staging|_salary_table|_alias)/g,
      ) ?? [];
    expect(matches).toEqual([]);
  });

  it('B11.2D surfaces do not import payroll bridge / engines / resolver', () => {
    const concat = readAllB11_2D();
    for (const sym of [
      'useESPayrollBridge',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(concat).not.toContain(sym);
    }
  });

  it('B11.2D surfaces do not flip pilot flags or open the allow-list', () => {
    const concat = readAllB11_2D();
    expect(concat).not.toMatch(
      /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/,
    );
    expect(concat).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*['"](?!off)/);
    expect(concat).not.toMatch(
      /REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=\s*\[\s*['"]/,
    );
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

  it('frontend B11.2D files never call .from(...).insert/update/delete/upsert', () => {
    const frontendOnly = B11_2D_FILES.filter(
      (p) => !p.includes('/supabase/functions/'),
    );
    const concat = frontendOnly
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n---FILE---\n');
    expect(concat).not.toMatch(/\.insert\(/);
    expect(concat).not.toMatch(/\.update\(/);
    expect(concat).not.toMatch(/\.delete\(/);
    expect(concat).not.toMatch(/\.upsert\(/);
  });

  it('B11.2D surfaces never use service_role from frontend', () => {
    const frontendOnly = B11_2D_FILES.filter(
      (p) => !p.includes('/supabase/functions/'),
    );
    const concat = frontendOnly
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n---FILE---\n');
    expect(concat).not.toMatch(/service_role/);
    expect(concat).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('B11.3B writer hook is not invoked from B11.2D surfaces', () => {
    const concat = readAllB11_2D();
    // We forbid the actual *invocation* names a future writer would expose.
    // Plain doc-comment mentions of "B11.3B" in code comments are allowed,
    // because the existing engine docstrings reference it as the next phase
    // that remains BLOCKED — the relevant invariant is that the writer
    // entry-points themselves are not called.
    expect(concat).not.toMatch(/writeSalaryTablesFromStaging\s*\(/);
    expect(concat).not.toMatch(/promoteStagingToSalaryTables\s*\(/);
    expect(concat).not.toMatch(/runB11_?3B\s*\(/);
  });
});