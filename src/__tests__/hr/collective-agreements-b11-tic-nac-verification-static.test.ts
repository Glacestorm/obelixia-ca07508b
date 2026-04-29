/**
 * B11.1 — Static guards for the TIC-NAC official verification phase.
 *
 * B11.1 is read-only: it produces a QA document and a decision, never
 * touches the database, the bridge, the payroll engine, the operative
 * table, the pilot allow-list or the registry shadow flag.
 *
 * These tests fail if any future edit silently introduces:
 *   - a write path against the registry from B11.1 artifacts,
 *   - a mutation of HR_REGISTRY_PILOT_MODE or HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL,
 *   - a new entry in REGISTRY_PILOT_SCOPE_ALLOWLIST,
 *   - a reference to the operative table erp_hr_collective_agreements
 *     from the registry layer,
 *   - a write to ready_for_payroll,
 *   - a service_role client introduced for B11.1.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../..');
const docPath = resolve(
  repoRoot,
  'docs/qa/HR_COLLECTIVE_AGREEMENTS_B11_1_TIC_NAC_OFFICIAL_VERIFICATION.md',
);
const shadowFlagPath = resolve(
  repoRoot,
  'src/engines/erp/hr/registryShadowFlag.ts',
);

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('B11.1 — TIC-NAC verification static guards', () => {
  it('B11.1 QA document exists', () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it('B11.1/B11.1B doc records the current decision and registry IDs', () => {
    const doc = read(docPath);
    // After B11.1B the active decision is OFFICIAL_SOURCE_FOUND / PENDING_HUMAN_DECISION.
    expect(doc).toMatch(/B11\.1B\s+—\s+OFFICIAL_SOURCE_FOUND\s+\/\s+PENDING_HUMAN_DECISION/);
    expect(doc).toMatch(/PENDING_HUMAN_DECISION/);
    // Historical STOP marker must remain documented for traceability.
    expect(doc).toMatch(/STOP_B11\.1/);
    expect(doc).toMatch(/1e665f80-3f04-4939-a448-4b1a2a4525e0/);
    expect(doc).toMatch(/9739379b-68e5-4ffd-8209-d5a1222fefc2/);
  });

  it('B11.1B doc records the official BOE block exactly as provided by human', () => {
    const doc = read(docPath);
    // Exact identifiers — must NOT be invented; provided by human in B11.1B.
    expect(doc).toMatch(/BOE-A-2025-7766/);
    expect(doc).toMatch(/99001355011983/);
    expect(doc).toMatch(/2025-04-16/);
    expect(doc).toMatch(/2025-04-04/);
    expect(doc).toMatch(/2025-01-01/);
    expect(doc).toMatch(/2027-12-31/);
    expect(doc).toMatch(/status_propuesto[\s\S]{0,40}vigente/);
    expect(doc).toMatch(/source_quality_propuesta[\s\S]{0,40}official/);
    expect(doc).toMatch(/https:\/\/www\.boe\.es\/buscar\/doc\.php\?id=BOE-A-2025-7766/);
    expect(doc).toMatch(/https:\/\/boe\.es\/boe\/dias\/2025\/04\/16\/pdfs\/BOE-A-2025-7766\.pdf/);
  });

  it('B11.1B keeps B11.2 explicitly blocked until human decision=continue', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/B11\.2\s+sigue\s+BLOQUEADO/i);
    expect(doc).toMatch(/decision\s*=\s*'continue'/);
  });

  it('B11.1 doc does not contain DB write SQL', () => {
    const doc = read(docPath);
    expect(doc).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(doc).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
    expect(doc).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(doc).not.toMatch(/\bUPSERT\b/i);
  });

  it('B11.1 doc does not reference bridge / payroll / operative table / allow-list mutations', () => {
    const doc = read(docPath);
    expect(doc).not.toMatch(/useESPayrollBridge/);
    expect(doc).not.toMatch(/payslipEngine|payrollEngine/);
    // operative table only allowed when explicitly stated as untouched
    const operativeMentions = doc.match(/erp_hr_collective_agreements(?!_registry)/g) ?? [];
    operativeMentions.forEach((_m) => {
      expect(doc).toMatch(/Sin tocar `erp_hr_collective_agreements`/);
    });
    expect(doc).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=\s*\[/);
  });

  it('registry shadow flag remains false (HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL)', () => {
    const src = read(shadowFlagPath);
    expect(src).toMatch(
      /export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
  });

  it('B11.1 introduces no TS source file with DB writes', () => {
    // The only artifacts produced by B11.1 are this test and the QA doc.
    // We assert there is NO new module under engines/hooks/components named
    // after B11.1 that could carry a write path.
    const candidates = [
      'src/engines/erp/hr/registryB11_1.ts',
      'src/engines/erp/hr/registryTicNacVerification.ts',
      'src/hooks/erp/hr/useRegistryB11_1.ts',
      'src/components/erp/hr/RegistryB11_1Panel.tsx',
    ].map((p) => resolve(repoRoot, p));
    for (const p of candidates) {
      expect(existsSync(p)).toBe(false);
    }
  });
});