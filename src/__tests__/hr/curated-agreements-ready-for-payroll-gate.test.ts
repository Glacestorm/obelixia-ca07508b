/**
 * B13.7 — ready_for_payroll gate audit. B13 may READ but never WRITE it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { detectAgreementImpactRisks } from '@/engines/erp/hr/agreementImpactEngine';

const ROOT = process.cwd();
function read(rel: string) { return fs.readFileSync(path.resolve(ROOT, rel), 'utf8'); }
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
  it('no B13 file writes ready_for_payroll = true/false as assignment', () => {
    for (const f of FILES) {
      const src = strip(read(f));
      expect(src, f).not.toMatch(/ready_for_payroll\s*:\s*true/);
      expect(src, f).not.toMatch(/ready_for_payroll\s*=\s*true/);
    }
  });

  it('detectAgreementImpactRisks blocks when registry not ready_for_payroll', () => {
    const input: any = {
      agreement: {
        id: 'a1', ready_for_payroll: false, requires_human_review: false,
        data_completeness: 'human_validated', source_quality: 'official',
        salary_tables_loaded: true, internal_code: 'X', official_name: 'X',
        cnae_codes: [], jurisdiction_code: 'ES',
      },
      version: { agreement_id: 'a1', id: 'v1' },
      salaryTables: [], rules: [], options: { target_year: 2026 },
    };
    const r = detectAgreementImpactRisks(input);
    expect(r.eligible).toBe(false);
    expect(r.blockers).toContain('registry_not_ready_for_payroll');
  });

  it('detectAgreementImpactRisks does not mutate the input agreement', () => {
    const agreement: any = {
      id: 'a1', ready_for_payroll: true, requires_human_review: false,
      data_completeness: 'human_validated', source_quality: 'official',
      salary_tables_loaded: true, internal_code: 'X', official_name: 'X',
      cnae_codes: [], jurisdiction_code: 'ES',
    };
    const before = { ...agreement };
    detectAgreementImpactRisks({
      agreement,
      version: { agreement_id: 'a1', id: 'v1' } as any,
      salaryTables: [], rules: [], options: { target_year: 2026 } as any,
    } as any);
    expect(agreement).toEqual(before);
  });
});
