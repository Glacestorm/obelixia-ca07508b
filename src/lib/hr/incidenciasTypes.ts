/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Tipos compartidos para el adapter y el hook de incidencias persistidas.
 *
 * Las filas vienen de las tablas canónicas existentes (ya bajo RLS):
 *  - erp_hr_payroll_incidents
 *  - erp_hr_it_processes
 *  - erp_hr_leave_requests
 *
 * NO se inventan campos. Se toman directamente de los tipos generados por
 * Supabase para garantizar contrato exacto con la BD.
 */

import type { Database } from '@/integrations/supabase/types';
import type { CasuisticaState, CasuisticaActiveFlags } from './casuisticaTypes';

export type PayrollIncidentRow =
  Database['public']['Tables']['erp_hr_payroll_incidents']['Row'];

export type ITProcessRow =
  Database['public']['Tables']['erp_hr_it_processes']['Row'];

export type LeaveRequestRow =
  Database['public']['Tables']['erp_hr_leave_requests']['Row'];

/** Parámetros de lectura para el hook read-only de incidencias. */
export interface IncidenciasFetchParams {
  companyId: string;
  employeeId: string;
  /** Año del periodo de nómina (ej. 2026). */
  periodYear: number;
  /** Mes 1..12. */
  periodMonth: number;
  /** Si true, incluye `pending`/`draft` en leave_requests. Default: false. */
  includePending?: boolean;
}

/** Traza auditable de una contribución del adapter al CasuisticaState legacy. */
export interface MappingTrace {
  source: 'payroll_incidents' | 'it_processes' | 'leave_requests';
  recordId: string;
  incidentType?: string | null;
  contributedDays?: number;
  contributedAmount?: number;
  legalReviewRequired?: boolean;
  notes?: string;
}

/**
 * Resultado del adapter:
 *  - `legacy`: subset del CasuisticaState que el motor ya entiende.
 *  - `flags`: flags de activación (no consumidos por el motor; informativos).
 *  - `traces`: filas que SÍ contribuyeron al legacy.
 *  - `unmapped`: filas reconocidas pero sin slot legacy (ej. desplazamiento
 *    temporal, suspensión empleo/sueldo). Se conservan para UI/CRUD futura.
 *  - `legalReviewRequired`: OR de cualquier traza/unmapped que lo requiera.
 */
export interface MappingResult {
  legacy: Partial<CasuisticaState>;
  flags: CasuisticaActiveFlags;
  traces: MappingTrace[];
  unmapped: MappingTrace[];
  legalReviewRequired: boolean;
}
