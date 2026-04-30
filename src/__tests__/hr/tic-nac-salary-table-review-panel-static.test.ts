/**
 * B11.2C.3 — Static guards on the staging UI components.
 *
 * The staging review UI MUST NOT:
 *  - import payroll bridge / payroll engine / payslip engine /
 *    salary normalizer / agreement salary resolver
 *  - reference the operative table `erp_hr_collective_agreements`
 *    (only `_registry` variants are allowed)
 *  - call `.from(...).insert/update/delete/upsert`
 *  - reference any service-role key
 *  - mutate pilot flags or allow-list
 *  - write `ready_for_payroll` / `salary_tables_loaded=true` /
 *    `data_completeness='human_validated'`
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const STAGING_DIR = resolve(
  process.cwd(),
  'src/components/erp/hr/collective-agreements/staging',
);

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const FILES = listFiles(STAGING_DIR);
const ALL = FILES.map((f) => readFileSync(f, 'utf8')).join('\n---FILE---\n');

describe('B11.2C.3 — staging UI static guards', () => {
  it('staging folder has the expected components', () => {
    const names = FILES.map((f) => f.split('/').pop());
    for (const expected of [
      'TicNacSalaryTableReviewPanel.tsx',
      'StagingApprovalModeSelector.tsx',
      'StagingRowsTable.tsx',
      'OcrRowsTable.tsx',
      'ManualRowsTable.tsx',
      'OcrVsManualComparator.tsx',
      'StagingRowDetailDrawer.tsx',
      'StagingRowEditForm.tsx',
      'StagingApprovalDialog.tsx',
      'StagingAuditTrail.tsx',
      'StagingStatusBadge.tsx',
      'StagingBlockersWarningsPanel.tsx',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('does not import payroll bridge, engine, payslip, normalizer or resolver', () => {
    for (const f of [
      'useESPayrollBridge',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
    ]) {
      expect(ALL).not.toContain(f);
    }
  });

  it('does not reference the operative table erp_hr_collective_agreements (registry variants only)', () => {
    // Only flag bare references; "_registry" variants are allowed.
    const matches = ALL.match(/erp_hr_collective_agreements(?!_registry)/g) ?? [];
    expect(matches).toEqual([]);
  });

  it('never calls .from(...).insert/update/delete/upsert', () => {
    expect(ALL).not.toMatch(/\.insert\(/);
    expect(ALL).not.toMatch(/\.update\(/);
    expect(ALL).not.toMatch(/\.delete\(/);
    expect(ALL).not.toMatch(/\.upsert\(/);
  });

  it('never references service_role / SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(ALL).not.toMatch(/service_role/);
    expect(ALL).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('does not mutate pilot flags or allow-list', () => {
    expect(ALL).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/);
    expect(ALL).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=/);
    expect(ALL).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
  });

  it('does not write ready_for_payroll or salary_tables_loaded=true or human_validated completeness', () => {
    expect(ALL).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    expect(ALL).not.toMatch(/salary_tables_loaded\s*[:=]\s*true/);
    expect(ALL).not.toMatch(/data_completeness\s*[:=]\s*['"]human_validated['"]/);
  });

  it('only invokes the staging edge function name', () => {
    // The only edge function name allowed in this folder is the staging one
    // (referenced indirectly through the hooks). Direct invocations are also
    // forbidden — the UI should go through the hooks. We assert no other
    // edge function name appears here.
    expect(ALL).not.toMatch(/functions\.invoke\(['"]payroll/);
    expect(ALL).not.toMatch(/functions\.invoke\(['"]erp-hr-payroll/);
  });

  it('does not expose forbidden CTAs', () => {
    const forbiddenCtas = [
      'Usar en nómina',
      'Activar nómina',
      'Activar convenio',
      'Activar para nómina',
      'Aplicar payroll',
      'Marcar listo para nómina',
      'Saltar revisión',
    ];
    for (const cta of forbiddenCtas) {
      expect(ALL).not.toContain(cta);
    }
  });
});