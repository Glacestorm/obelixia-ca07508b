/**
 * B11.3A — Writer parcial TIC-NAC (reglas + fuente oficial, sin tablas
 * salariales). Estos tests son guards estáticos + verificación
 * documental: confirman que el writer respeta el contrato de seguridad
 * y que el QA doc registra el estado final correcto.
 *
 * Verifica:
 *  1. source official actualizado (URL, hash documentado).
 *  2. source_url / document_url BOE presentes en el doc QA.
 *  3. version.source_hash = source.document_hash documentado.
 *  4. registry.data_completeness = 'parsed_partial'.
 *  5. registry.salary_tables_loaded = false.
 *  6. registry.requires_human_review = true.
 *  7. registry.ready_for_payroll = false.
 *  8. rules count documentado >= 14.
 *  9. no salary_tables insertadas (doc indica count = 0).
 * 10. no bridge tocado (doc lo afirma + sin imports en el writer).
 * 11. no payroll engine tocado.
 * 12. no tabla operativa tocada.
 * 13. HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL sigue false.
 * 14. HR_REGISTRY_PILOT_MODE sigue false.
 * 15. REGISTRY_PILOT_SCOPE_ALLOWLIST sigue [].
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

const repoRoot = resolve(__dirname, '../../..');
const docPath = resolve(
  repoRoot,
  'docs/qa/HR_COLLECTIVE_AGREEMENTS_B11_3A_TIC_NAC_PARTIAL_WRITER.md',
);
const bridgePath = resolve(repoRoot, 'src/hooks/erp/hr/useESPayrollBridge.ts');
const shadowFlagPath = resolve(
  repoRoot,
  'src/engines/erp/hr/registryShadowFlag.ts',
);
const pilotGatePath = resolve(
  repoRoot,
  'src/engines/erp/hr/registryPilotGate.ts',
);

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const DOC_HASH =
  '389eaf9c9ea65a348a42cfa0667a0dfd640bb2e556beaed88ccac48ec1f9585a';

describe('B11.3A — TIC-NAC partial writer guards', () => {
  it('QA doc B11.3A exists', () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it('1) source official: BOE source_type, source_url and document_url present', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`source_type`.*`OTHER`.*`BOE`/);
    expect(doc).toMatch(/`source_quality`.*`legacy_static`.*`official`/);
    expect(doc).toMatch(/https:\/\/www\.boe\.es\/buscar\/doc\.php\?id=BOE-A-2025-7766/);
    expect(doc).toMatch(/https:\/\/boe\.es\/boe\/dias\/2025\/04\/16\/pdfs\/BOE-A-2025-7766\.pdf/);
    expect(doc).toMatch(/`status`.*`pending`.*`verified`/);
  });

  it('2) BOE reference and REGCON code documented', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/BOE-A-2025-7766/);
    expect(doc).toMatch(/99001355011983/);
  });

  it('3) version.source_hash equals source.document_hash (real SHA-256)', () => {
    const doc = read(docPath);
    expect(doc).toContain(DOC_HASH);
    // Hash documented (full form once + truncated form referenced for sources/versions/registry rows).
    const truncatedRefs = doc.match(/389eaf9c…?85a/g) ?? [];
    expect(truncatedRefs.length).toBeGreaterThanOrEqual(3);
    // Doc explicitly states the three storage locations are identical.
    expect(doc).toMatch(/sources\.document_hash/);
    expect(doc).toMatch(/versions\.source_hash/);
    expect(doc).toMatch(/registry\.source_document_hash/);
    expect(doc).toMatch(/idénticos/);
    // SHA-256 hex shape: 64 lowercase hex chars.
    expect(/^[0-9a-f]{64}$/.test(DOC_HASH)).toBe(true);
  });

  it('4) registry.data_completeness = parsed_partial', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`data_completeness`.*`metadata_only`.*`parsed_partial`/);
    expect(doc).toMatch(/`parsed_partial`\s*\|\s*✅\s*`parsed_partial`/);
  });

  it('5) registry.salary_tables_loaded = false (and 0 salary rows)', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`salary_tables_loaded`\s*\|\s*`false`\s*\|\s*✅\s*`false`/);
    expect(doc).toMatch(/registry_salary_tables[^\n]*count\s*=\s*`?0`?/);
    expect(doc).toMatch(/MANUAL_TABLE_UPLOAD_REQUIRED/);
  });

  it('6) registry.requires_human_review = true', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`requires_human_review`\s*\|\s*`true`\s*\|\s*✅\s*`true`/);
  });

  it('7) registry.ready_for_payroll = false', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`ready_for_payroll`\s*\|\s*`false`\s*\|\s*✅\s*`false`/);
    expect(doc).toMatch(/enforce_ca_registry_ready_for_payroll/);
  });

  it('8) rules count >= 14 documented', () => {
    const doc = read(docPath);
    // Match a number >= 14 in the rules count expectation row.
    expect(doc).toMatch(/rules count\s*\|\s*`>=\s*14`\s*\|\s*✅\s*`(1[4-9]|[2-9][0-9]+)`/);
  });

  it('9) no salary_tables insertadas (doc afirma 0 antes y después)', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/count\s*=\s*`?0`?[\s\S]{0,40}antes y después/);
    expect(doc).not.toMatch(/INSERT INTO\s+[\w.]*registry_salary_tables/i);
  });

  it('10) no bridge touched: doc affirms it and bridge file has no B11.3A marker', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/`useESPayrollBridge`\s*\|\s*NO tocado/);
    const bridge = read(bridgePath);
    expect(bridge).not.toMatch(/B11\.3A/);
    expect(bridge).not.toMatch(/TIC-NAC/);
  });

  it('11) no payroll engines touched', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/payrollEngine[^\n]*payslipEngine[^\n]*salaryNormalizer[^\n]*agreementSalaryResolver[\s\S]{0,40}NO tocados/);
  });

  it('12) operative table erp_hr_collective_agreements NOT touched', () => {
    const doc = read(docPath);
    // The doc table row has the operative table name in backticks, then "(tabla operativa)", then "| NO tocada".
    expect(doc).toMatch(/`erp_hr_collective_agreements`[^|`]*\(tabla operativa\)[^|]*\|\s*NO tocada/);
  });

  it('13) HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL still false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    const src = read(shadowFlagPath);
    expect(src).toMatch(
      /export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/,
    );
    expect(src).not.toMatch(/B11\.3A/);
  });

  it('14) HR_REGISTRY_PILOT_MODE still false', () => {
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    const src = read(pilotGatePath);
    expect(src).toMatch(/export const HR_REGISTRY_PILOT_MODE\s*=\s*false/);
    expect(src).not.toMatch(/B11\.3A/);
  });

  it('15) REGISTRY_PILOT_SCOPE_ALLOWLIST still empty', () => {
    expect(Array.isArray(REGISTRY_PILOT_SCOPE_ALLOWLIST)).toBe(true);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });

  it('B11.3A introduces no new TS source file with payroll writes', () => {
    const candidates = [
      'src/engines/erp/hr/registryB11_3A.ts',
      'src/engines/erp/hr/registryTicNacWriter.ts',
      'src/hooks/erp/hr/useRegistryB11_3A.ts',
      'src/components/erp/hr/RegistryB11_3APanel.tsx',
    ].map((p) => resolve(repoRoot, p));
    for (const p of candidates) {
      expect(existsSync(p)).toBe(false);
    }
  });

  it('doc explicitly states no B8A/B8B/B9 executed', () => {
    const doc = read(docPath);
    expect(doc).toMatch(/NO\*?\*?\s*se ha ejecutado B8A,?\s*B8B\s*ni\s*B9/);
  });
});