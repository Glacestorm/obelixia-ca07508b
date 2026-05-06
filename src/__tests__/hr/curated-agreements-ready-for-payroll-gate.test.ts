/**
 * B13.7 — ready_for_payroll gate audit. B13 may READ but never WRITE it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { computeImpactPreview } from '@/engines/erp/hr/agreementImpactEngine';

const ROOT = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.resolve(ROOT, rel), 'utf8');
}
function strip(src: string) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const FILES = [
  'src/hooks/erp/hr/useAgreementSourceWatch.ts',
  'src/hooks/erp/hr/useAgreementDocumentIntake.ts',
  'src/hooks/erp/hr/useAgreementExtractionRunner.ts',
  'src/hooks/erp/hr/useAgreementImpactPreviews.ts',
  'src/engines/erp/hr/agreementImpactEngine.ts',
  'src/engines/erp/hr/agreementFindingToStagingMapper.ts',
  'supabase/functions/erp-hr-agreement-source-watcher/index.ts',
  'supabase/functions/erp-hr-agreement-document-intake/index.ts',
  'supabase/functions/erp-hr-agreement-extraction-runner/index.ts',
  'supabase/functions/erp-hr-agreement-impact-engine/index.ts',
];

describe('B13.7 — ready_for_payroll gate', () => {
  it('no B13 file writes ready_for_payroll = true', () => {
    for (const f of FILES) {
      const src = strip(read(f));
      expect(src, f).not.toMatch(/ready_for_payroll\s*:\s*true/);
      expect(src, f).not.toMatch(/ready_for_payroll\s*=\s*true/);
    }
  });

  it('engine blocks impact preview when registry not ready_for_payroll', () => {
    const agreement: any = {
      id: 'a1', ready_for_payroll: false, requires_human_review: false,
      data_completeness: 'human_validated', salary_tables_loaded: true,
      internal_code: 'X', official_name: 'X', cnae_codes: [], jurisdiction_code: 'ES',
    };
    const res = computeImpactPreview({
      agreement,
      employee: { id: 'e', contract_id: 'c', current_monthly_gross: 1000, antiquity_years: 1, group_code: 'G1', work_center_id: 'w', company_id: 'co' } as any,
      salaryTable: [],
      mandatoryConcepts: [],
      now: new Date('2026-05-01'),
    });
    expect(res.blocked).toBe(true);
    expect(res.blockers).toContain('registry_not_ready_for_payroll');
  });

  it('engine does not mutate ready_for_payroll value of input', () => {
    const agreement: any = {
      id: 'a1', ready_for_payroll: true, requires_human_review: false,
      data_completeness: 'human_validated', salary_tables_loaded: true,
      internal_code: 'X', official_name: 'X', cnae_codes: [], jurisdiction_code: 'ES',
    };
    const before = agreement.ready_for_payroll;
    computeImpactPreview({
      agreement,
      employee: { id: 'e', contract_id: 'c', current_monthly_gross: 1000, antiquity_years: 1, group_code: 'G1', work_center_id: 'w', company_id: 'co' } as any,
      salaryTable: [],
      mandatoryConcepts: [],
      now: new Date('2026-05-01'),
    });
    expect(agreement.ready_for_payroll).toBe(before);
  });
});
