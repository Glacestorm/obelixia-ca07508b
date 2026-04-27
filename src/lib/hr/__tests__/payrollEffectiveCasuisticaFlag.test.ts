/**
 * CASUISTICA-FECHAS-01 — Fase C3B3B-paso1
 * Tests del feature flag `PAYROLL_EFFECTIVE_CASUISTICA_MODE`.
 */
import { describe, it, expect } from 'vitest';
import {
  PAYROLL_EFFECTIVE_CASUISTICA_MODE,
  isEffectiveCasuisticaApplyEnabled,
  isEffectiveCasuisticaPreviewEnabled,
} from '../payrollEffectiveCasuisticaFlag';

describe('payrollEffectiveCasuisticaFlag — C3B3B-paso1', () => {
  it('el modo por defecto es "local_only"', () => {
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).toBe('local_only');
  });

  it('isEffectiveCasuisticaApplyEnabled solo es true en apply', () => {
    expect(isEffectiveCasuisticaApplyEnabled('local_only')).toBe(false);
    expect(isEffectiveCasuisticaApplyEnabled('persisted_priority_preview')).toBe(false);
    expect(isEffectiveCasuisticaApplyEnabled('persisted_priority_apply')).toBe(true);
  });

  it('isEffectiveCasuisticaPreviewEnabled es true en preview y apply', () => {
    expect(isEffectiveCasuisticaPreviewEnabled('local_only')).toBe(false);
    expect(isEffectiveCasuisticaPreviewEnabled('persisted_priority_preview')).toBe(true);
    expect(isEffectiveCasuisticaPreviewEnabled('persisted_priority_apply')).toBe(true);
  });

  it('sin argumento usa el default (local_only)', () => {
    expect(isEffectiveCasuisticaApplyEnabled()).toBe(false);
    expect(isEffectiveCasuisticaPreviewEnabled()).toBe(false);
  });
});