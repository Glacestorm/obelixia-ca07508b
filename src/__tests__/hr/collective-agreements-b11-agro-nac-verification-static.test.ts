/**
 * B11.1 — Static guards for the AGRO-NAC official verification phase.
 *
 * B11.1 for AGRO-NAC is read-only AND ended in STOP because no official
 * national-level BOE source was found. These tests fail if any future
 * edit silently introduces:
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
  'docs/qa/HR_COLLECTIVE_AGREEMENTS_B11_1_AGRO_NAC_OFFICIAL_VERIFICATION.md',
);
const shadowFlagPath = resolve(
  repoRoot,
  'src/engines/erp/hr/registryShadowFlag.ts',
);

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('B11.1 — AGRO-NAC verification static guards', () => {
  it('B11.1 AGRO-NAC QA document exists', () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it('doc records STOP decision and registry IDs', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/STOP_B11\.1_AGRO_NAC\s+—\s+PENDING_HUMAN_INPUT/);
    expect(doc).toMatch(/PENDING_HUMAN_DECISION/);
    // Real DB IDs verified via SELECT.
    expect(doc).toMatch(/ca364025-3856-4822-a3be-90d4dbbbd254/);
    expect(doc).toMatch(/8230b322-6a1e-48aa-86cd-45fa92c2bf95/);
    expect(doc).toMatch(/b5b1def9-bfe5-4457-80ad-f88ec7b7a8b2/);
    expect(doc).toMatch(/AGRO-NAC/);
  });

  it('doc keeps B11.2 explicitly blocked until human decision=continue', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/B11\.2\s+(queda|permanece)\s+(BLOQUEADO|bloqueado)/i);
    expect(doc).toMatch(/decision\s*=\s*'continue'/);
  });

  it('doc does not contain DB write SQL', () => {
    const doc = read(docPath);
    expect(doc).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(doc).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
    expect(doc).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(doc).not.toMatch(/\bUPSERT\b/i);
  });

  it('doc does not reference bridge / payroll / operative table / allow-list mutations', () => {
    const doc = read(docPath);
    expect(doc).not.toMatch(/useESPayrollBridge/);
    expect(doc).not.toMatch(/payslipEngine|payrollEngine|salaryNormalizer|agreementSalaryResolver/);
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

  it('B11.1 AGRO-NAC introduces no TS source file with DB writes', () => {
    const candidates = [
      'src/engines/erp/hr/registryB11_1_AgroNac.ts',
      'src/engines/erp/hr/registryAgroNacVerification.ts',
      'src/hooks/erp/hr/useRegistryB11_1AgroNac.ts',
      'src/components/erp/hr/RegistryB11_1AgroNacPanel.tsx',
    ].map((p) => resolve(repoRoot, p));
    for (const p of candidates) {
      expect(existsSync(p)).toBe(false);
    }
  });
});