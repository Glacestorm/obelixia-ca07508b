/**
 * CASUISTICA-FECHAS-01 — Fase C3B3B-paso1
 * Feature flag tipado para la conexión futura de `effectiveCasuistica` al
 * motor de nómina.
 *
 * INVARIANTES C3B3B-paso1:
 *  - Default operativo: 'local_only'.
 *  - No se lee de env, BD ni configuración remota.
 *  - 'persisted_priority_apply' queda tipado pero NO debe activarse ni
 *    conectarse al motor en esta fase. La sustitución real del payload de
 *    `simulateES` se diseñará y construirá en C3B3B-paso2.
 *  - Esta fase es solo visual/diagnóstica. El cálculo de nómina sigue
 *    consumiendo exactamente la casuística local como antes.
 */

export type PayrollEffectiveCasuisticaMode =
  | 'local_only'
  | 'persisted_priority_preview'
  | 'persisted_priority_apply';

export const PAYROLL_EFFECTIVE_CASUISTICA_MODE: PayrollEffectiveCasuisticaMode =
  'local_only';

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