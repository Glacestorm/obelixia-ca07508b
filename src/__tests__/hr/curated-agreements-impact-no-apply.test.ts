/**
 * B13.7 — Impact previews are informational and never apply.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function read(rel: string) { return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8'); }
function strip(s: string) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1'); }

const FILES = [
  'src/hooks/erp/hr/useAgreementImpactPreviews.ts',
  'src/engines/erp/hr/agreementImpactEngine.ts',
  'supabase/functions/erp-hr-agreement-impact-engine/index.ts',
];
const UI_DIR = 'src/components/erp/hr/collective-agreements/curated/impact';

function walk(d: string) {
  const abs = path.resolve(process.cwd(), d);
  const out: string[] = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const f = path.join(abs, e.name);
    if (e.isDirectory()) out.push(...walk(path.relative(process.cwd(), f)));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(f);
  }
  return out;
}

describe('B13.7 — impact previews never apply', () => {
  const all = [...FILES.map((f) => read(f)), ...walk(UI_DIR).map((f) => fs.readFileSync(f, 'utf8'))]
    .map(strip).join('\n');

  it('does not call B10C/B10D edges automatically', () => {
    expect(all).not.toMatch(/erp-hr-company-agreement-registry-mapping/);
    expect(all).not.toMatch(/erp-hr-company-agreement-runtime-apply/);
  });
  it('does not call payroll/payslip/bridge edges', () => {
    expect(all).not.toMatch(/erp-hr-payroll-(run|apply|execute)/);
    expect(all).not.toMatch(/payslipEngine|payrollEngine|useESPayrollBridge/);
  });
  it('does not generate CRA/SILTRA/SEPA/accounting', () => {
    expect(all).not.toMatch(/generateCRA|generateSILTRA|generateSEPA|generateAccountingEntr/i);
  });
  it('mark_preview_stale does not delete', () => {
    const edge = read('supabase/functions/erp-hr-agreement-impact-engine/index.ts');
    const idx = edge.indexOf("mark_preview_stale");
    if (idx > 0) {
      const branch = edge.slice(idx, idx + 3000);
      expect(branch).not.toMatch(/\.delete\(/);
    }
  });
  it('preview rows keep requires_human_review semantics (no auto-approval)', () => {
    expect(all).not.toMatch(/human_approved_single|human_approved_second/);
  });
});
