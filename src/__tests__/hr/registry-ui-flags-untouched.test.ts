/**
 * B12.1 — Confirms that exposing the Registry UI did NOT touch any of
 * the gating flags or the payroll bridge.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';

describe('B12.1 — Registry UI flags untouched', () => {
  it('HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL is still false', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
  });

  it('HR_REGISTRY_PILOT_MODE is still false', () => {
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
  });

  it('REGISTRY_PILOT_SCOPE_ALLOWLIST is still empty', () => {
    expect(Array.isArray(REGISTRY_PILOT_SCOPE_ALLOWLIST)).toBe(true);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });

  it('useESPayrollBridge file was NOT edited by B12 (no B12 marker)', () => {
    const bridge = readFileSync(
      resolve(process.cwd(), 'src/hooks/erp/hr/useESPayrollBridge.ts'),
      'utf8',
    );
    expect(bridge).not.toMatch(/B12/);
  });

  it('registry shadow flag module was NOT edited by B12 (no B12 marker)', () => {
    const flag = readFileSync(
      resolve(process.cwd(), 'src/engines/erp/hr/registryShadowFlag.ts'),
      'utf8',
    );
    expect(flag).not.toMatch(/B12/);
  });
});