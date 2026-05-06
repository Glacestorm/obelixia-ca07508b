/**
 * B13.7 — Per-edge hardening audit for B13 edge functions.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EDGES = [
  'erp-hr-agreement-source-watcher',
  'erp-hr-agreement-document-intake',
  'erp-hr-agreement-extraction-runner',
  'erp-hr-agreement-impact-engine',
];
const CFG = fs.readFileSync(path.resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

function stripComments(s: string) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

for (const name of EDGES) {
  describe('B13.7 edge hardening — ' + name, () => {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/' + name + '/index.ts'),
      'utf8',
    );
    const src = stripComments(raw);

    it('config.toml has verify_jwt = true', () => {
      expect(CFG).toMatch(new RegExp('\\[functions\\.' + name + '\\][\\s\\S]*?verify_jwt\\s*=\\s*true'));
    });
    it('uses Zod strict schemas', () => {
      expect(raw).toMatch(/from 'https:\/\/esm\.sh\/zod/);
      const schemas = raw.match(/z\s*\.\s*object\(\{[\s\S]*?\}\)\s*\.\s*strict\(\)/g) ?? [];
      expect(schemas.length).toBeGreaterThanOrEqual(2);
    });
    it('declares FORBIDDEN_PAYLOAD_KEYS', () => {
      expect(src).toContain('FORBIDDEN_PAYLOAD_KEYS');
    });
    it('uses mapError sanitized envelope', () => {
      expect(src).toMatch(/function (mapError|err)\s*\(/);
    });
    it('does not return raw error.message', () => {
      expect(src).not.toMatch(/return (mapError|err)\([^)]*\.message/);
      expect(src).not.toMatch(/error\.stack/);
    });
    it('does not allow .delete(', () => {
      expect(src).not.toMatch(/\.delete\(/);
    });
    it('does not import payroll/bridge', () => {
      for (const f of ['payrollEngine', 'payslipEngine', 'useESPayrollBridge', 'salaryNormalizer', 'agreementSalaryResolver']) {
        expect(src).not.toMatch(new RegExp('(import|from)[^\\n]*' + f));
      }
    });
    it('does not write ready_for_payroll/salary_tables_loaded=true/human_validated', () => {
      expect(src).not.toMatch(/ready_for_payroll\s*:\s*(true|false)/);
      expect(src).not.toMatch(/salary_tables_loaded\s*:\s*true/);
      expect(src).not.toMatch(/data_completeness\s*:\s*['"]human_validated['"]/);
    });
    it('does not generate CRA/SILTRA/SEPA/accounting', () => {
      expect(src).not.toMatch(/generateCRA|generateSILTRA|generateSEPA|generateAccountingEntr/i);
    });
  });
}
