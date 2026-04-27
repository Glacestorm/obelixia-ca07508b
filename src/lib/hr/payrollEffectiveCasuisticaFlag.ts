/**
 * CASUISTICA-FECHAS-01 — Fase C3B3C1
 * Feature flag tipado para la conexión futura de `effectiveCasuistica` al
 * motor de nómina.
 *
 * INVARIANTES C3B3C1:
 *  - Default operativo: 'persisted_priority_preview'.
 *    Esto activa solo VISIBILIDAD (banner + columna "Fuente aplicada al
 *    cálculo"). El payload real enviado a `simulateES` SIGUE siendo el local
 *    porque el wiring `casuisticaForEngine` solo sustituye en
 *    `persisted_priority_apply` (ver `HRPayrollEntryDialog.tsx` y
 *    `effectiveCasuistica.engineWiring.test.ts`).
 *  - No se lee de env, BD ni configuración remota.
 *  - 'persisted_priority_apply' sigue tipado pero NO debe activarse como
 *    default todavía. Su activación queda condicionada al checklist QA
 *    legal/manual de 12 puntos descrito en C3B3C2.
 *  - Esta fase es estrictamente visual/diagnóstica. El cálculo de nómina
 *    sigue consumiendo exactamente la casuística local como antes.
 *  - Rollback inmediato: cambiar el default a 'local_only' y desplegar.
 */

export type PayrollEffectiveCasuisticaMode =
  | 'local_only'
  | 'persisted_priority_preview'
  | 'persisted_priority_apply';

export const PAYROLL_EFFECTIVE_CASUISTICA_MODE: PayrollEffectiveCasuisticaMode =
  'persisted_priority_preview';

export function isEffectiveCasuisticaApplyEnabled(
  mode: PayrollEffectiveCasuisticaMode = PAYROLL_EFFECTIVE_CASUISTICA_MODE,
): boolean {
  return mode === 'persisted_priority_apply';
}

export function isEffectiveCasuisticaPreviewEnabled(
  mode: PayrollEffectiveCasuisticaMode = PAYROLL_EFFECTIVE_CASUISTICA_MODE,
): boolean {
  return (
    mode === 'persisted_priority_preview' ||
    mode === 'persisted_priority_apply'
  );
}