/**
 * B13.7 — Staging writer boundary audit.
 *  - B13 only writes to staging with pending review status.
 *  - B11.3B writer (human_approved_*) is never invoked from B13.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function read(rel: string) {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}
function strip(s: string) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const B13_FILES = [
  'src/hooks/erp/hr/useAgreementSourceWatch.ts',
  'src/hooks/erp/hr/useAgreementDocumentIntake.ts',
  'src/hooks/erp/hr/useAgreementExtractionRunner.ts',
  'src/hooks/erp/hr/useAgreementImpactPreviews.ts',
  'src/engines/erp/hr/agreementFindingToStagingMapper.ts',
  'src/engines/erp/hr/agreementImpactEngine.ts',
  'supabase/functions/erp-hr-agreement-source-watcher/index.ts',
  'supabase/functions/erp-hr-agreement-document-intake/index.ts',
  'supabase/functions/erp-hr-agreement-extraction-runner/index.ts',
  'supabase/functions/erp-hr-agreement-impact-engine/index.ts',
];

describe('B13.7 — staging writer boundary', () => {
  it('no B13 file produces human_approved_single/second status', () => {
    for (const f of B13_FILES) {
      const s = strip(read(f));
      expect(s, f).not.toMatch(/human_approved_single/);
      expect(s, f).not.toMatch(/human_approved_second/);
    }
  });

  it('extraction-runner accept_finding_to_staging keeps requires_human_review and pending status', () => {
    const s = read('supabase/functions/erp-hr-agreement-extraction-runner/index.ts');
    expect(s).toMatch(/finding_status:\s*['"]accepted_to_staging['"]/);
    // staging row must remain pending review (manual or ocr)
    expect(s).toMatch(/(ocr_pending_review|manual_pending_review|requires_human_review)/);
  });

  it('B13 never writes registry salary tables', () => {
    for (const f of B13_FILES) {
      const s = strip(read(f));
      expect(s, f).not.toMatch(/erp_hr_collective_agreements_registry_salary_tables[\s\S]{0,40}\.(insert|update|upsert|delete)/);
    }
  });
});
