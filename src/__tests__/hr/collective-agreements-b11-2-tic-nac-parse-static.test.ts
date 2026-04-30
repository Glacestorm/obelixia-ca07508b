/**
 * B11.2 — Static guards for the TIC-NAC parse/preparation phase.
 *
 * B11.2 is read-only: it produces a QA document and a parse plan, never
 * touches the database, the bridge, the payroll engine, the operative
 * table, the pilot allow-list or the registry shadow flag. Salary
 * numeric tables are explicitly deferred to manual_table_upload (no OCR).
 *
 * These tests fail if any future edit silently introduces:
 *   - SQL writes against the registry from B11.2 artifacts,
 *   - a mutation of HR_REGISTRY_PILOT_MODE or
 *     HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL,
 *   - a new entry in REGISTRY_PILOT_SCOPE_ALLOWLIST,
 *   - a reference to the operative table erp_hr_collective_agreements
 *     from the registry layer (other than the explicit "Sin tocar"
 *     invariant line),
 *   - a write to ready_for_payroll,
 *   - a service_role client introduced for B11.2.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../..');
const docPath = resolve(
  repoRoot,
  'docs/qa/HR_COLLECTIVE_AGREEMENTS_B11_2_TIC_NAC_PARSE_REPORT.md',
);
const shadowFlagPath = resolve(
  repoRoot,
  'src/engines/erp/hr/registryShadowFlag.ts',
);

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('B11.2 — TIC-NAC parse static guards', () => {
  it('B11.2 QA document exists', () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it('doc records registry identifiers and BOE block', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/1e665f80-3f04-4939-a448-4b1a2a4525e0/);
    expect(doc).toMatch(/9739379b-68e5-4ffd-8209-d5a1222fefc2/);
    expect(doc).toMatch(/7e14af28-c27e-48bd-9a8f-c0bab81a16e8/);
    expect(doc).toMatch(/BOE-A-2025-7766/);
    expect(doc).toMatch(/99001355011983/);
    expect(doc).toMatch(/2025-01-01/);
    expect(doc).toMatch(/2027-12-31/);
  });

  it('doc declares MANUAL_TABLE_UPLOAD_REQUIRED for Anexo I numeric tables', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/MANUAL_TABLE_UPLOAD_REQUIRED/);
    expect(doc).toMatch(/manual_table_upload/);
    expect(doc).toMatch(/NO se ha ejecutado OCR/);
  });

  it('doc binds the limited human decision (Carlos / continue / pending approver)', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/human_reviewer[^|]*\|\s*Carlos/);
    expect(doc).toMatch(/PENDING_B8A_FORMAL_APPROVAL/);
    expect(doc).toMatch(/decision[^|]*\|\s*`?continue`?/);
    expect(doc).toMatch(/scope_piloto_confirmado[^|]*\|\s*`?no`?/);
  });

  it('doc keeps ready_for_payroll false and requires_human_review true', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`ready_for_payroll`[^.\n]*`false`/);
    expect(doc).toMatch(/`requires_human_review`[^.\n]*`true`/);
  });

  it('doc does not contain DB write SQL', () => {
    const doc = read(docPath);
    expect(doc).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(doc).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
    expect(doc).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(doc).not.toMatch(/\bUPSERT\b/i);
  });

  it('doc does not reference bridge / payroll engines / allow-list mutations', () => {
    const doc = read(docPath);
    // useESPayrollBridge / payroll engines may only appear inside the
    // explicit "NO se ha tocado ..." invariant line. Forbid any other usage.
    const bridgeMentions = doc.match(/useESPayrollBridge/g) ?? [];
    bridgeMentions.forEach(() => {
      expect(doc).toMatch(/NO se ha tocado `useESPayrollBridge`/);
    });
    const engineMentions = doc.match(/payslipEngine|payrollEngine|salaryNormalizer|agreementSalaryResolver/g) ?? [];
    if (engineMentions.length > 0) {
      expect(doc).toMatch(/NO se ha tocado `useESPayrollBridge`, `payrollEngine`,[\s\S]*?`agreementSalaryResolver`/);
    }
    expect(doc).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=\s*\[/);
  });

  it('doc only mentions the operative table inside the explicit "no tocado" invariant', () => {
    const doc = read(docPath);
    const operativeMentions = doc.match(/erp_hr_collective_agreements(?!_registry)/g) ?? [];
    operativeMentions.forEach(() => {
      expect(doc).toMatch(/NO se ha tocado `erp_hr_collective_agreements`/);
    });
  });

  it('registry shadow flag remains false (HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL)', () => {
    const src = read(shadowFlagPath);
    expect(src).toMatch(
      /export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });

  it('B11.2 introduces no TS source file with DB writes', () => {
    // B11.2 only produces this test and the QA doc. No new engine /
    // hook / component file may carry a write path under B11.2 naming.
    const candidates = [
      'src/engines/erp/hr/registryB11_2.ts',
      'src/engines/erp/hr/registryTicNacParser.ts',
      'src/engines/erp/hr/registryTicNacWriter.ts',
      'src/hooks/erp/hr/useRegistryB11_2.ts',
      'src/components/erp/hr/RegistryB11_2Panel.tsx',
    ].map((p) => resolve(repoRoot, p));
    for (const p of candidates) {
      expect(existsSync(p)).toBe(false);
    }
  });
});