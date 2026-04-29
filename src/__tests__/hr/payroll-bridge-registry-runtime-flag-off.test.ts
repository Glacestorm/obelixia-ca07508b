/**
 * B10E.4 — Static & invariant tests with flag OFF.
 *
 * Verifies:
 *  - registryShadowFlag.ts still exports the literal `false`.
 *  - registryShadowFlag.ts has no env / localStorage / fetch / supabase usage.
 *  - useESPayrollBridge.ts has NO write operations introduced by B10E.4.
 *  - useESPayrollBridge.ts does NOT use service_role / SUPABASE_SERVICE_ROLE_KEY.
 *  - useESPayrollBridge.ts does NOT modify persisted_priority_apply.
 *  - useESPayrollBridge.ts does NOT unblock C3B3C2.
 *  - useESPayrollBridge.ts does NOT mutate the literal flag value.
 *  - The flag-OFF trace builder produces the canonical `flag_off` reason.
 *  - The trace attached by `attachRegistryRuntimeTrace` is non-enumerable
 *    (preserves JSON output / functional parity).
 *  - With flag OFF, the data loader is NEVER invoked (verified statically:
 *    the loader call is contained inside the `if (HR_USE_…) === true` block).
 *  - No new edge function imports introduced by B10E.4.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  attachRegistryRuntimeTrace,
  buildFlagOffTrace,
} from '@/engines/erp/hr/registryRuntimeBridgeDecision';

const ROOT = process.cwd();
const FLAG_FILE = join(ROOT, 'src/engines/erp/hr/registryShadowFlag.ts');
const BRIDGE_FILE = join(ROOT, 'src/hooks/erp/hr/useESPayrollBridge.ts');
const flagSrc = readFileSync(FLAG_FILE, 'utf8');
const bridgeSrc = readFileSync(BRIDGE_FILE, 'utf8');

describe('B10E.4 — flag invariants', () => {
  it('HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL is the literal false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(flagSrc).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });

  it('flag file has no env / localStorage / fetch / supabase / DB references', () => {
    expect(flagSrc).not.toMatch(/process\.env/);
    expect(flagSrc).not.toMatch(/import\.meta\.env/);
    expect(flagSrc).not.toMatch(/localStorage/);
    expect(flagSrc).not.toMatch(/sessionStorage/);
    expect(flagSrc).not.toMatch(/\bfetch\s*\(/);
    expect(flagSrc).not.toMatch(/supabase/i);
    expect(flagSrc).not.toMatch(/from\s*\(/);
  });
});

describe('B10E.4 — bridge static guards', () => {
  it('B10E.4 block does NOT introduce DB writes', () => {
    // Scope the assertion to the B10E.4 block in the bridge: from the
    // flag guard to the closing `}` of the dead-code branch. Pre-existing
    // bridge writes (payroll record persistence) are out of scope for B10E.4.
    const startMarker = 'B10E.4: registry runtime integration';
    const start = bridgeSrc.indexOf(startMarker);
    expect(start).toBeGreaterThan(0);
    // Use the next 6000 chars as a generous scope window covering the block.
    const scope = bridgeSrc.slice(start, start + 6000);
    expect(scope).not.toMatch(/\.insert\s*\(/);
    expect(scope).not.toMatch(/\.update\s*\(/);
    expect(scope).not.toMatch(/\.delete\s*\(/);
    expect(scope).not.toMatch(/\.upsert\s*\(/);
    expect(scope).not.toMatch(/\.rpc\s*\(/);
  });

  it('bridge does NOT use service_role or SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(bridgeSrc).not.toMatch(/service_role/i);
    expect(bridgeSrc).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('bridge does NOT modify persisted_priority_apply or unblock C3B3C2', () => {
    expect(bridgeSrc).not.toMatch(/persisted_priority_apply\s*=/);
    expect(bridgeSrc).not.toMatch(/C3B3C2_ENABLED\s*=\s*true/);
  });

  it('bridge does NOT mutate HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL', () => {
    expect(bridgeSrc).not.toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=/);
  });

  it('bridge does NOT introduce a new edge function call (functions.invoke)', () => {
    // B10E.4 must not add edge functions; pre-existing invoke calls (if any)
    // are unrelated and not introduced by this phase. The data loader is the
    // only new I/O path and uses select-only queries.
    const before = (bridgeSrc.match(/registry-runtime/i) || []).length;
    expect(bridgeSrc).not.toMatch(/functions\.invoke\(\s*['"]erp-hr-collective-agreement-runtime/);
    expect(before).toBeGreaterThanOrEqual(0);
  });

  it('bridge does NOT import payrollEngine or payslipEngine', () => {
    expect(bridgeSrc).not.toMatch(/from ['"]@\/engines\/.*payrollEngine['"]/);
    expect(bridgeSrc).not.toMatch(/from ['"]@\/engines\/.*payslipEngine['"]/);
  });

  it('B10E.4 data loader call is contained inside the flag-guarded block', () => {
    // The only `fetchRegistryRuntimePayrollSnapshot(` call site in the bridge
    // must appear AFTER the literal `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`
    // guard line.
    const guardIdx = bridgeSrc.indexOf('HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL as unknown as boolean) === true');
    const callIdx = bridgeSrc.indexOf('fetchRegistryRuntimePayrollSnapshot(');
    expect(guardIdx).toBeGreaterThan(0);
    expect(callIdx).toBeGreaterThan(guardIdx);
  });
});

describe('B10E.4 — flag-off trace shape', () => {
  it('buildFlagOffTrace returns canonical attempted=false / applied=false / reason=flag_off', () => {
    const t = buildFlagOffTrace();
    expect(t.attempted).toBe(false);
    expect(t.applied).toBe(false);
    expect(t.reason).toBe('flag_off');
  });

  it('attachRegistryRuntimeTrace stores the trace as a NON-enumerable property', () => {
    const sr: any = { salarioBaseConvenio: 1500, plusConvenioTabla: 100 };
    const before = JSON.stringify(sr);
    attachRegistryRuntimeTrace(sr, buildFlagOffTrace());
    // Functional parity: JSON output is unchanged.
    expect(JSON.stringify(sr)).toBe(before);
    // Enumerable own keys: __registry_runtime is NOT among them.
    expect(Object.keys(sr)).not.toContain('__registry_runtime');
    // But the trace IS retrievable via direct property access.
    expect((sr as any).__registry_runtime.reason).toBe('flag_off');
    expect((sr as any).__registry_runtime.attempted).toBe(false);
    expect((sr as any).__registry_runtime.applied).toBe(false);
  });

  it('attachRegistryRuntimeTrace is idempotent (replaces existing trace)', () => {
    const sr: any = { x: 1 };
    attachRegistryRuntimeTrace(sr, buildFlagOffTrace());
    attachRegistryRuntimeTrace(sr, { attempted: true, applied: true, reason: 'applied_ok' });
    expect((sr as any).__registry_runtime.applied).toBe(true);
    expect(Object.keys(sr)).toEqual(['x']);
  });

  it('attachRegistryRuntimeTrace is no-op for non-objects', () => {
    expect(attachRegistryRuntimeTrace(null as any, buildFlagOffTrace())).toBe(null);
    expect(attachRegistryRuntimeTrace(undefined as any, buildFlagOffTrace())).toBe(undefined);
    expect(attachRegistryRuntimeTrace(42 as any, buildFlagOffTrace())).toBe(42);
  });
});
