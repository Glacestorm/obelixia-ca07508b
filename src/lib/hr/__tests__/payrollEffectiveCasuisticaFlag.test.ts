/**
 * CASUISTICA-FECHAS-01 — Fase C3B3C1
 * Tests del feature flag `PAYROLL_EFFECTIVE_CASUISTICA_MODE`.
 */
import { describe, it, expect } from 'vitest';
import {
  PAYROLL_EFFECTIVE_CASUISTICA_MODE,
  isEffectiveCasuisticaApplyEnabled,
  isEffectiveCasuisticaPreviewEnabled,
} from '../payrollEffectiveCasuisticaFlag';

describe('payrollEffectiveCasuisticaFlag — C3B3C1', () => {
  it('el modo por defecto es "persisted_priority_preview" (C3B3C1)', () => {
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).toBe('persisted_priority_preview');
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

  it('sin argumento usa el default (preview): apply=false, preview=true', () => {
    expect(isEffectiveCasuisticaApplyEnabled()).toBe(false);
    expect(isEffectiveCasuisticaPreviewEnabled()).toBe(true);
  });

  it('garantía C3B3C1: el default NO es apply (cálculo no debe cambiar)', () => {
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).not.toBe('persisted_priority_apply');
    expect(isEffectiveCasuisticaApplyEnabled(PAYROLL_EFFECTIVE_CASUISTICA_MODE)).toBe(false);
  });
});