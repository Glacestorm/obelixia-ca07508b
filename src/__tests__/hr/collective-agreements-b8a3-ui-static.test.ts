/**
 * B8A.3 — Static lint tests for the validation UI.
 *
 * Inspects every .tsx component in
 *   src/components/erp/hr/collective-agreements/
 * and the two new hooks in src/hooks/erp/hr/ to enforce hard safety
 * invariants without rendering them.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const COMPONENT_DIRS = [
  'src/components/erp/hr/collective-agreements',
  'src/components/erp/hr/collective-agreements/internal',
];
const HOOK_FILES = [
  'src/hooks/erp/hr/useCollectiveAgreementValidation.ts',
  'src/hooks/erp/hr/useCollectiveAgreementValidationActions.ts',
];

const FORBIDDEN_STRINGS = [
  'ready_for_payroll',
  'data_completeness',
  'salary_tables_loaded',
  'requires_human_review',
  'official_submission_blocked',
  'Activar para nómina',
  'Validación oficial',
  'Marcar como oficial',
  'Enviar a administración',
  'Usar en nómina',
  'payroll ready',
];

const FORBIDDEN_IMPORT_FRAGMENTS = [
  'payslip',
  'salaryNormalizer',
  'agreementSalaryResolver',
  'useESPayrollBridge',
];

const FORBIDDEN_CALLS = [
  ".from('erp_hr_collective_agreement_registry_validations').update(",
  ".from('erp_hr_collective_agreement_registry_validations').insert(",
  ".from('erp_hr_collective_agreement_registry_validation_items').upsert(",
  ".from('erp_hr_collective_agreement_registry_validation_items').insert(",
  ".from('erp_hr_collective_agreement_registry_validation_signatures').insert(",
];

function readAll(): Array<{ file: string; src: string }> {
  const files: string[] = [];
  for (const dir of COMPONENT_DIRS) {
    const full = path.resolve(dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.tsx') || f.endsWith('.ts')) files.push(path.join(dir, f));
    }
  }
  for (const h of HOOK_FILES) files.push(h);
  return files.map((file) => ({ file, src: fs.readFileSync(file, 'utf-8') }));
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('B8A.3 UI static contract', () => {
  const all = readAll();

  it('contains the expected number of files', () => {
    expect(all.length).toBeGreaterThanOrEqual(13);
  });

  it('no forbidden strings appear in any UI/hook file', () => {
    for (const { file, src } of all) {
      const code = stripComments(src);
      for (const bad of FORBIDDEN_STRINGS) {
        expect(code.includes(bad), `${file} must not contain "${bad}"`).toBe(false);
      }
    }
  });

  it('no reference to operational table without _registry', () => {
    for (const { file, src } of all) {
      const code = stripComments(src);
      const matches = code.match(/erp_hr_collective_agreements(?!_registry)/g) ?? [];
      expect(matches.length, `${file} must not reference operational table`).toBe(0);
    }
  });

  it('no service_role / SERVICE_ROLE_KEY usage in UI/hooks', () => {
    for (const { file, src } of all) {
      const code = stripComments(src);
      expect(code.includes('service_role')).toBe(false);
      expect(code.includes('SUPABASE_SERVICE_ROLE_KEY')).toBe(false);
    }
  });

  it('no forbidden payroll/engine imports', () => {
    for (const { file, src } of all) {
      const code = stripComments(src);
      for (const bad of FORBIDDEN_IMPORT_FRAGMENTS) {
        expect(code.toLowerCase().includes(bad.toLowerCase()), `${file} must not import ${bad}`).toBe(false);
      }
    }
  });

  it('no direct write on validation tables', () => {
    for (const { file, src } of all) {
      const code = stripComments(src).replace(/\s+/g, '');
      for (const bad of FORBIDDEN_CALLS) {
        const needle = bad.replace(/\s+/g, '');
        expect(code.includes(needle), `${file} must not call ${bad}`).toBe(false);
      }
    }
  });

  it('actions hook routes writes through edge function', () => {
    const actions = fs.readFileSync(
      'src/hooks/erp/hr/useCollectiveAgreementValidationActions.ts',
      'utf-8',
    );
    expect(
      actions.includes('erp-hr-collective-agreement-validation') &&
        actions.includes('authSafeInvoke'),
    ).toBe(true);
  });

  it('NotOfficialBanner contains the canonical text', () => {
    const banner = fs.readFileSync(
      'src/components/erp/hr/collective-agreements/internal/NotOfficialBanner.tsx',
      'utf-8',
    );
    expect(banner.includes('Validación interna')).toBe(true);
    expect(banner.includes('no oficial')).toBe(true);
    expect(banner.includes('No activa el uso en nómina')).toBe(true);
  });
});
