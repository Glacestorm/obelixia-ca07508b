/**
 * B10F.3 — Static & invariant tests with both gates OFF.
 *
 * Verifies:
 *  - HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL is the literal `false`.
 *  - HR_REGISTRY_PILOT_MODE is the literal `false`.
 *  - REGISTRY_PILOT_SCOPE_ALLOWLIST is empty.
 *  - The bridge contains a mutually exclusive pilot branch (`else if`).
 *  - With both gates OFF, the trace builders produce `flag_off` and
 *    `pilot_disabled` canonical shapes.
 *  - The bridge introduces no DB writes, no service_role, no
 *    persisted_priority_apply mutation, no C3B3C2 unblock.
 *  - The pilot helper file contains no forbidden imports.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
  isPilotEnabledForScope,
} from '@/engines/erp/hr/registryPilotGate';
import { buildRegistryPilotBridgeDecision } from '@/engines/erp/hr/registryPilotBridgeDecision';
import {
  attachRegistryRuntimeTrace,
  buildFlagOffTrace,
} from '@/engines/erp/hr/registryRuntimeBridgeDecision';

const ROOT = process.cwd();
const BRIDGE_FILE = join(ROOT, 'src/hooks/erp/hr/useESPayrollBridge.ts');
const HELPER_FILE = join(ROOT, 'src/engines/erp/hr/registryPilotBridgeDecision.ts');
const bridgeSrc = readFileSync(BRIDGE_FILE, 'utf8');
const helperSrc = readFileSync(HELPER_FILE, 'utf8');

/**
 * Strip comments and string literals so static guards do not trip on
 * doc-comments that legitimately mention forbidden tokens.
 */
function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/`[^`]*`/g, '``')
    .replace(/'[^'\n]*'/g, "''")
    .replace(/"[^"\n]*"/g, '""');
}

const bridgeCode = stripCommentsAndStrings(bridgeSrc);
const helperCode = stripCommentsAndStrings(helperSrc);

describe('B10F.3 — flag invariants', () => {
  it('HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL is the literal false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
  });

  it('HR_REGISTRY_PILOT_MODE is the literal false', () => {
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
  });

  it('REGISTRY_PILOT_SCOPE_ALLOWLIST is empty', () => {
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });

  it('Pilot gate file literals are not modified', () => {
    const gateSrc = readFileSync(
      join(ROOT, 'src/engines/erp/hr/registryPilotGate.ts'),
      'utf8',
    );
    expect(gateSrc).toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*false/);
    expect(gateSrc).toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST[^=]*=\s*\[\s*\]/);
  });
});

describe('B10F.3 — bridge static guards', () => {
  it('bridge contains the pilot else-if branch (mutually exclusive)', () => {
    expect(bridgeSrc).toMatch(
      /HR_REGISTRY_PILOT_MODE as unknown as boolean\)\s*===\s*true/,
    );
    expect(bridgeSrc).toMatch(/B10F\.3:\s*pilot branch/);
  });

  it('pilot branch sits AFTER the global flag branch (else if)', () => {
    const globalIdx = bridgeSrc.indexOf(
      'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL as unknown as boolean) === true',
    );
    const pilotIdx = bridgeSrc.indexOf(
      'HR_REGISTRY_PILOT_MODE as unknown as boolean) === true',
    );
    expect(globalIdx).toBeGreaterThan(0);
    expect(pilotIdx).toBeGreaterThan(globalIdx);
    // Verify it is an else-if (the slice between the two contains "} else if (")
    const between = bridgeSrc.slice(globalIdx, pilotIdx);
    expect(between).toMatch(/}\s*else if\s*\(/);
  });

  it('pilot branch in bridge contains no DB writes', () => {
    const startMarker = 'B10F.3: pilot branch';
    const start = bridgeSrc.indexOf(startMarker);
    expect(start).toBeGreaterThan(0);
    const scope = bridgeSrc.slice(start, start + 5000);
    expect(scope).not.toMatch(/\.insert\s*\(/);
    expect(scope).not.toMatch(/\.update\s*\(/);
    expect(scope).not.toMatch(/\.delete\s*\(/);
    expect(scope).not.toMatch(/\.upsert\s*\(/);
    expect(scope).not.toMatch(/\.rpc\s*\(/);
  });

  it('pilot branch does NOT touch the operative table erp_hr_collective_agreements', () => {
    const startMarker = 'B10F.3: pilot branch';
    const start = bridgeSrc.indexOf(startMarker);
    const scope = bridgeSrc.slice(start, start + 5000);
    // Operative table must not appear without the _registry suffix in pilot block.
    expect(scope).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('pilot branch does NOT write ready_for_payroll', () => {
    const startMarker = 'B10F.3: pilot branch';
    const start = bridgeSrc.indexOf(startMarker);
    const scope = bridgeSrc.slice(start, start + 5000);
    expect(scope).not.toMatch(/ready_for_payroll\s*=/);
  });

  it('pilot branch does NOT mention persisted_priority_apply or C3B3C2', () => {
    const startMarker = 'B10F.3: pilot branch';
    const start = bridgeSrc.indexOf(startMarker);
    const scope = bridgeSrc.slice(start, start + 5000);
    expect(scope).not.toMatch(/persisted_priority_apply/);
    expect(scope).not.toMatch(/C3B3C2/);
  });

  it('bridge does NOT use service_role / SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(bridgeSrc).not.toMatch(/service_role/i);
    expect(bridgeSrc).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('bridge does NOT mutate HR_REGISTRY_PILOT_MODE', () => {
    expect(bridgeCode).not.toMatch(/HR_REGISTRY_PILOT_MODE\s*=\s*(true|false)/);
  });

  it('bridge does NOT mutate REGISTRY_PILOT_SCOPE_ALLOWLIST', () => {
    expect(bridgeCode).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=/);
    expect(bridgeCode).not.toMatch(/REGISTRY_PILOT_SCOPE_ALLOWLIST\.push\s*\(/);
  });
});

describe('B10F.3 — pilot helper static guards', () => {
  it('helper does not import supabase / fetch / Deno / react', () => {
    expect(helperCode).not.toMatch(/from\s*\(\s*\)/); // sanity
    expect(helperSrc).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(helperSrc).not.toMatch(/import\s+.*from\s+['"]react['"]/);
    expect(helperCode).not.toMatch(/Deno\./);
    expect(helperCode).not.toMatch(/\bfetch\s*\(/);
  });

  it('helper has no DB write operations', () => {
    expect(helperCode).not.toMatch(/\.insert\s*\(/);
    expect(helperCode).not.toMatch(/\.update\s*\(/);
    expect(helperCode).not.toMatch(/\.delete\s*\(/);
    expect(helperCode).not.toMatch(/\.upsert\s*\(/);
    expect(helperCode).not.toMatch(/\.rpc\s*\(/);
    expect(helperCode).not.toMatch(/\.from\s*\(/);
  });

  it('helper has no service_role / SUPABASE_SERVICE_ROLE_KEY references', () => {
    expect(helperCode).not.toMatch(/service_role/i);
    expect(helperCode).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('helper does not import the bridge or operative resolver/normalizer/engine files', () => {
    // Imports/calls (after stripping doc comments) must not reference
    // the forbidden modules. Doc-comments may legitimately mention them.
    expect(helperCode).not.toMatch(/useESPayrollBridge/);
    expect(helperCode).not.toMatch(/agreementSalaryResolver/);
    expect(helperCode).not.toMatch(/salaryNormalizer/);
    expect(helperCode).not.toMatch(/payrollEngine/);
    expect(helperCode).not.toMatch(/payslipEngine/);
    expect(helperCode).not.toMatch(/agreementSafetyGate/);
  });

  it('helper does not reference the operative table erp_hr_collective_agreements', () => {
    expect(helperCode).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });
});

describe('B10F.3 — pilot trace shape with both gates OFF', () => {
  it('pilot gate returns pilot_disabled when HR_REGISTRY_PILOT_MODE is false', () => {
    const r = isPilotEnabledForScope({
      companyId: 'c1',
      employeeId: 'e1',
      contractId: 'k1',
      targetYear: 2026,
    });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('pilot_disabled');
  });

  it('attached flag_off trace preserves JSON output (functional parity)', () => {
    const sr: any = { salarioBaseConvenio: 1500, plusConvenioTabla: 100 };
    const before = JSON.stringify(sr);
    attachRegistryRuntimeTrace(sr, buildFlagOffTrace());
    expect(JSON.stringify(sr)).toBe(before);
    expect(Object.keys(sr)).not.toContain('__registry_runtime');
  });

  it('pilot helper with pilotMode=false returns pilot_disabled trace and no apply', () => {
    const decision = buildRegistryPilotBridgeDecision({
      globalFlag: false,
      pilotMode: false,
      scope: { companyId: 'c1', employeeId: 'e1', contractId: 'k1', targetYear: 2026 },
      operativeSalaryResolution: { salarioBaseConvenio: 1500, plusConvenioTabla: 100 },
      snapshotResult: null,
      isPilotEnabledForScope,
      resolveRegistryRuntimeSetting: () => {
        throw new Error('must not be called when pilot is disabled');
      },
      buildRegistryPayrollResolution: () => {
        throw new Error('must not be called when pilot is disabled');
      },
      runRegistryPilotParityPreflight: () => {
        throw new Error('must not be called when pilot is disabled');
      },
    });
    expect(decision.applyRegistry).toBe(false);
    expect(decision.trace.pilot_mode).toBe(true);
    expect(decision.trace.outcome).toBe('pilot_disabled');
    expect(decision.trace.reason).toBe('pilot_disabled');
    expect(decision.trace.attempted).toBe(false);
    expect(decision.trace.applied).toBe(false);
  });
});
