/**
 * B12.2 — Static safety invariants for the Centro de Convenios hub/.
 *
 * Asserts that no file under the hub/ folder imports payroll bridge,
 * resolver, normalizer, payroll/payslip engines or the safety gate, and
 * never performs DB writes, never uses service_role and never mutates
 * the registry/pilot flags.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const HUB_DIR = resolve(process.cwd(), 'src/components/erp/hr/collective-agreements/hub');
const HUB_HOOK = resolve(process.cwd(), 'src/hooks/erp/hr/useAgreementUnifiedSearch.ts');

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = [...listFiles(HUB_DIR), HUB_HOOK];

function readAll(): { path: string; content: string }[] {
  return FILES.map((p) => ({ path: p, content: readFileSync(p, 'utf8') }));
}

describe('B12.2 — Hub static invariants', () => {
  const files = readAll();

  const FORBIDDEN_IMPORTS = [
    'useESPayrollBridge',
    'payrollEngine',
    'payslipEngine',
    'salaryNormalizer',
    'agreementSalaryResolver',
    'agreementSafetyGate',
  ];

  for (const needle of FORBIDDEN_IMPORTS) {
    it(`no file imports ${needle}`, () => {
      for (const f of files) {
        expect(f.content, `${f.path} contains ${needle}`).not.toMatch(new RegExp(needle));
      }
    });
  }

  const FORBIDDEN_WRITES = ['.insert(', '.update(', '.delete(', '.upsert(', '.rpc('];
  for (const op of FORBIDDEN_WRITES) {
    it(`no file uses ${op}`, () => {
      for (const f of files) {
        expect(f.content.includes(op), `${f.path} contains ${op}`).toBe(false);
      }
    });
  }

  it('no service_role usage', () => {
    for (const f of files) {
      expect(f.content).not.toMatch(/service_role/i);
      expect(f.content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  it('no write to ready_for_payroll', () => {
    for (const f of files) {
      expect(f.content).not.toMatch(/ready_for_payroll\s*[:=]\s*true/);
    }
  });

  it('does not modify the operative table erp_hr_collective_agreements via DDL/DML', () => {
    for (const f of files) {
      expect(f.content).not.toMatch(/ALTER\s+TABLE\s+erp_hr_collective_agreements/i);
      expect(f.content).not.toMatch(/DROP\s+TABLE\s+erp_hr_collective_agreements/i);
      expect(f.content).not.toMatch(/INSERT\s+INTO\s+erp_hr_collective_agreements/i);
      expect(f.content).not.toMatch(/UPDATE\s+erp_hr_collective_agreements/i);
      expect(f.content).not.toMatch(/DELETE\s+FROM\s+erp_hr_collective_agreements/i);
    }
  });

  it('does not mutate REGISTRY_PILOT_SCOPE_ALLOWLIST', () => {
    for (const f of files) {
      expect(f.content).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
      expect(f.content).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\.push/);
    }
  });

  it('does not mutate HR_REGISTRY_PILOT_MODE', () => {
    for (const f of files) {
      expect(f.content).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*true/);
    }
  });

  it('does not mutate HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL', () => {
    for (const f of files) {
      expect(f.content).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*true/);
    }
  });
});