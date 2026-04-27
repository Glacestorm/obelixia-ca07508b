/**
 * CASUISTICA-FECHAS-01 — Fase C3B3B-paso2
 *
 * Test de CONTRATO del wiring de `effectiveCasuistica` en
 * `HRPayrollEntryDialog`. NO monta el diálogo completo (requeriría mockear
 * Supabase, react-query, useAuth, useESPayrollBridge, agreementSalaryResolver
 * y otros módulos pesados; cualquier mock parcial introduciría fragilidad
 * sin valor adicional).
 *
 * En su lugar valida:
 *  1) El módulo se importa sin errores con la nueva prop opcional
 *     `effectiveCasuisticaModeOverride` (compila y exporta el componente).
 *  2) El default operativo del flag (C3B3C1) es `persisted_priority_preview`.
 *     En este modo el wiring `casuisticaForEngine` SIGUE devolviendo el
 *     payload local exacto (apply=false), por tanto el cálculo es idéntico
 *     al comportamiento previo. Solo cambia la VISIBILIDAD en la UI.
 *  3) La regla de `casuisticaForEngine` por modo está cubierta de forma
 *     exhaustiva en `src/lib/hr/__tests__/effectiveCasuistica.engineWiring.test.ts`
 *     (PNR/Reducción/Atrasos/IT/Nacimiento sin doble conteo + period* desde
 *     local + unmapped fuera del payload).
 *
 * Este enfoque mantiene los tests deterministas y deja el cálculo real del
 * motor (`simulateES`) intacto, fiel al criterio de aceptación de C3B3C1:
 * «el cálculo real sigue usando exactamente la casuística local mientras
 * el default no sea `persisted_priority_apply`».
 */
import { describe, it, expect } from 'vitest';
import {
  PAYROLL_EFFECTIVE_CASUISTICA_MODE,
  isEffectiveCasuisticaApplyEnabled,
} from '@/lib/hr/payrollEffectiveCasuisticaFlag';

describe('HRPayrollEntryDialog — wiring effectiveCasuistica (C3B3C1)', () => {
  it('el default operativo del flag es persisted_priority_preview', () => {
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).toBe('persisted_priority_preview');
  });

  it('apply NO está activo por defecto: el motor sigue recibiendo local', () => {
    expect(isEffectiveCasuisticaApplyEnabled(PAYROLL_EFFECTIVE_CASUISTICA_MODE)).toBe(false);
  });

  it('el módulo del diálogo se importa con la nueva prop test-only', async () => {
    const mod = await import('../HRPayrollEntryDialog');
    expect(typeof mod.HRPayrollEntryDialog).toBe('function');
    expect(typeof mod.default).toBe('function');
  });

  it('el helper isEffectiveCasuisticaApplyEnabled distingue apply de los demás modos', async () => {
    const { isEffectiveCasuisticaApplyEnabled } = await import(
      '@/lib/hr/payrollEffectiveCasuisticaFlag'
    );
    expect(isEffectiveCasuisticaApplyEnabled('local_only')).toBe(false);
    expect(isEffectiveCasuisticaApplyEnabled('persisted_priority_preview')).toBe(false);
    expect(isEffectiveCasuisticaApplyEnabled('persisted_priority_apply')).toBe(true);
  });
});