import { describe, it, expect } from 'vitest';
import { SS_GROUP_MIN_BASES_2026, SS_BASE_MAX_2026 } from '@/lib/hr/payroll/rules/ss-contributions';

describe('ss-contributions — LGSS Art. 147', () => {
  it('grupos 4-11 base minima = 1381.20', () => {
    for (let g = 4; g <= 11; g++) {
      expect(SS_GROUP_MIN_BASES_2026[g]).toBe(1381.20);
    }
  });

  it('base maxima = 5101.20', () => {
    expect(SS_BASE_MAX_2026).toBe(5101.20);
  });

  it('grupos 1-3 tienen bases correctas (RDL 3/2026)', () => {
    expect(SS_GROUP_MIN_BASES_2026[1]).toBe(1929.00);
    expect(SS_GROUP_MIN_BASES_2026[2]).toBe(1599.60);
    expect(SS_GROUP_MIN_BASES_2026[3]).toBe(1391.70);
  });
});
