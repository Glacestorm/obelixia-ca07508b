/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Tipo compartido `CasuisticaState` y extensión de fechas (Fase B).
 *
 * Este tipo refleja EXACTAMENTE el contrato actual que el motor de nómina
 * (HRPayrollEntryDialog → simulateES → salaryNormalizer) consume. NO se
 * cambia el contrato del motor: el motor sigue recibiendo días, %, importes
 * y periodos como números/strings.
 *
 * Pure TypeScript. Sin imports de runtime, sin side-effects.
 */

/** Tipos de la casuística entre fechas (S9.21g) — modelo numérico legacy. */
export type CasuisticaState = {
  enabled: boolean;
  pnrDias: number;
  itAtDias: number;
  reduccionJornadaPct: number;
  atrasosITImporte: number;
  /** YYYY-MM (periodo de origen del atraso). */
  atrasosITPeriodo: string;
  nacimientoTipo:
    | 'maternidad'
    | 'paternidad'
    | 'corresponsabilidad'
    | 'lactancia';
  nacimientoDias: number;
  nacimientoImporte: number;
  /** YYYY-MM-DD */
  periodFechaDesde: string;
  /** YYYY-MM-DD */
  periodFechaHasta: string;
  periodDiasNaturales: number;
  periodDiasEfectivos: number;
  periodMotivo:
    | 'mes_completo'
    | 'alta_intramensual'
    | 'baja_intramensual'
    | 'cambio_contractual'
    | 'cambio_salarial'
    | 'suspension_parcial'
    | 'excedencia'
    | 'otro';
};

/**
 * CASUISTICA-FECHAS-01 Fase B — Extensión opcional de fechas inicio/fin por
 * proceso. Mantiene compatibilidad con el modelo numérico legacy (los días
 * derivados se calculan en UI; el motor sigue recibiendo `pnrDias`, etc.).
 *
 * Todos los campos son strings YYYY-MM-DD opcionales (vacíos por defecto).
 */
export type CasuisticaDatesExtension = {
  pnrFechaDesde: string;
  pnrFechaHasta: string;
  itAtFechaDesde: string;
  itAtFechaHasta: string;
  itAtTipo:
    | ''
    | 'enfermedad_comun'
    | 'accidente_no_laboral'
    | 'accidente_trabajo'
    | 'enfermedad_profesional';
  reduccionFechaDesde: string;
  reduccionFechaHasta: string;
  atrasosFechaDesde: string;
  atrasosFechaHasta: string;
  nacimientoFechaInicio: string;
  nacimientoFechaFin: string;
  nacimientoFechaHechoCausante: string;
};

/**
 * Tipo "estado activo" usado por el adapter C2 para devolver flags de
 * activación además del modelo numérico. El motor legacy ignora estos flags;
 * sólo se usan para UI (C3) y trazabilidad.
 */
export type CasuisticaActiveFlags = {
  pnrActiva?: boolean;
  itAtActiva?: boolean;
  itAtTipo?: CasuisticaDatesExtension['itAtTipo'];
  /** YYYY-MM-DD */
  nacimientoFechaInicio?: string;
  /** YYYY-MM-DD */
  nacimientoFechaFin?: string;
  /** YYYY-MM-DD */
  nacimientoFechaHechoCausante?: string;
};
