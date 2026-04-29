/**
 * B10F.5 — Static analysis tests for the read-only pilot monitor UI.
 *
 * Verifies:
 *  - no imports of payroll bridge / resolver / normalizer / engines / safety gate;
 *  - no DB writes or service-role usage;
 *  - no operative table reference;
 *  - no mutation of registryShadowFlag.ts or registryPilotGate.ts;
 *  - no forbidden CTA strings;
 *  - no log_decision usage in UI/hook code;
 *  - flag and pilot constants remain at OFF defaults.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const UI_DIR = join(
  process.cwd(),
  'src/components/erp/hr/collective-agreements/pilot-monitor',
);
const HOOK_PATH = join(
  process.cwd(),
  'src/hooks/erp/hr/useRegistryPilotMonitor.ts',
);
const SHADOW_FLAG_PATH = join(process.cwd(), 'src/engines/erp/hr/registryShadowFlag.ts');
const PILOT_GATE_PATH = join(process.cwd(), 'src/engines/erp/hr/registryPilotGate.ts');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function stripCommentsAndStrings(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  out = out.replace(/'(?:\\.|[^'\\])*'/g, "''");
  out = out.replace(/"(?:\\.|[^"\\])*"/g, '""');
  out = out.replace(/`(?:\\.|[^`\\])*`/g, '``');
  return out;
}

const FORBIDDEN_IMPORT_PATHS = [
  'useESPayrollBridge',
  'agreementSalaryResolver',
  'salaryNormalizer',
  'payrollEngine',
  'payslipEngine',
  'agreementSafetyGate',
];

const FORBIDDEN_CTAS = [
  'Activar piloto',
  'Activar nómina',
  'Ejecutar nómina',
  'Aplicar registry',
  'Activar flag',
  'Añadir scope',
  'Quitar scope',
  'Rollback ahora',
  'Log decision',
];

describe('B10F.5 — pilot monitor UI static analysis', () => {
  it('UI directory and hook file exist', () => {
    expect(existsSync(UI_DIR)).toBe(true);
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  const files = [HOOK_PATH, ...walk(UI_DIR)];

  for (const f of files) {
    const SRC = readFileSync(f, 'utf8');
    const CODE = stripCommentsAndStrings(SRC);

    it(`${f} — no forbidden imports`, () => {
      for (const id of FORBIDDEN_IMPORT_PATHS) {
        expect(CODE.includes(id), `${f} imports ${id}`).toBe(false);
      }
    });

    it(`${f} — no DB writes`, () => {
      expect(CODE).not.toMatch(/\.from\(/);
      expect(CODE).not.toMatch(/\.insert\(/);
      expect(CODE).not.toMatch(/\.update\(/);
      expect(CODE).not.toMatch(/\.upsert\(/);
      expect(CODE).not.toMatch(/\.delete\(/);
    });

    it(`${f} — no service_role / SUPABASE_SERVICE_ROLE_KEY`, () => {
      expect(CODE).not.toMatch(/service_role/);
      expect(CODE).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    });

    it(`${f} — no operative table erp_hr_collective_agreements`, () => {
      expect(CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
    });

    it(`${f} — does not write ready_for_payroll`, () => {
      expect(CODE).not.toMatch(/ready_for_payroll\s*=/);
    });

    it(`${f} — no log_decision action`, () => {
      expect(SRC).not.toMatch(/log_decision/);
    });

    it(`${f} — no forbidden CTA strings`, () => {
      for (const cta of FORBIDDEN_CTAS) {
        expect(SRC.includes(cta), `${f} contains forbidden CTA: ${cta}`).toBe(false);
      }
    });
  }

  it('registryShadowFlag.ts keeps HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false', () => {
    const src = readFileSync(SHADOW_FLAG_PATH, 'utf8');
    expect(src).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });

  it('registryPilotGate.ts keeps HR_REGISTRY_PILOT_MODE = false and empty allow-list', () => {
    const src = readFileSync(PILOT_GATE_PATH, 'utf8');
    expect(src).toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*false/);
    expect(src).toMatch(
      /REGISTRY_PILOT_SCOPE_ALLOWLIST[^=]*=\s*\[\]\s*as const/,
    );
  });
});