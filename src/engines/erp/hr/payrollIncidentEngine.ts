/**
 * payrollIncidentEngine — V2-ES.7 Paso 1
 * Funciones puras para clasificación, validación y readiness de incidencias de nómina
 * No realiza fetch — opera sobre datos recibidos
 */

// ── Tipos ──

export type IncidentType =
  | 'variable'
  | 'absence'
  | 'overtime'
  | 'bonus'
  | 'commission'
  | 'allowance'
  | 'adjustment'
  | 'deduction'
  | 'it_cc'
  | 'it_at'
  | 'leave'
  | 'other';

export type IncidentStatus = 'pending' | 'validated' | 'applied' | 'cancelled';
export type IncidentSource = 'manual' | 'import' | 'admin_request' | 'workflow' | 'calculated';

export interface PayrollIncident {
  id: string;
  company_id: string;
  employee_id: string;
  period_id: string | null;
  concept_code: string;
  concept_id: string | null;
  incident_type: IncidentType;
  description: string | null;
  amount: number;
  units: number | null;
  unit_price: number | null;
  applies_from: string | null;
  applies_to: string | null;
  tributa_irpf: boolean;
  cotiza_ss: boolean;
  is_prorrateado: boolean;
  status: IncidentStatus;
  source: IncidentSource;
  admin_request_id: string | null;
  validated_by: string | null;
  validated_at: string | null;
  applied_to_record_id: string | null;
  applied_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const INCIDENT_TYPE_CONFIG: Record<IncidentType, {
  label: string;
  labelES: string;
  icon: string;
  defaultLineType: 'earning' | 'deduction' | 'employer_cost' | 'informative';
  requiresUnits: boolean;
  requiresDates: boolean;
}> = {
  variable: { label: 'Variable', labelES: 'Variable', icon: '📊', defaultLineType: 'earning', requiresUnits: false, requiresDates: false },
  absence: { label: 'Absence', labelES: 'Ausencia', icon: '🚫', defaultLineType: 'deduction', requiresUnits: true, requiresDates: true },
  overtime: { label: 'Overtime', labelES: 'Horas extra', icon: '⏰', defaultLineType: 'earning', requiresUnits: true, requiresDates: false },
  bonus: { label: 'Bonus', labelES: 'Bonus', icon: '🎯', defaultLineType: 'earning', requiresUnits: false, requiresDates: false },
  commission: { label: 'Commission', labelES: 'Comisión', icon: '💰', defaultLineType: 'earning', requiresUnits: false, requiresDates: false },
  allowance: { label: 'Allowance', labelES: 'Complemento/Dieta', icon: '🧾', defaultLineType: 'earning', requiresUnits: false, requiresDates: false },
  adjustment: { label: 'Adjustment', labelES: 'Ajuste/Regularización', icon: '🔧', defaultLineType: 'earning', requiresUnits: false, requiresDates: false },
  deduction: { label: 'Deduction', labelES: 'Deducción', icon: '➖', defaultLineType: 'deduction', requiresUnits: false, requiresDates: false },
  it_cc: { label: 'Sick Leave (CC)', labelES: 'IT Contingencia Común', icon: '🏥', defaultLineType: 'earning', requiresUnits: true, requiresDates: true },
  it_at: { label: 'Sick Leave (AT)', labelES: 'IT Accidente Trabajo', icon: '⚠️', defaultLineType: 'earning', requiresUnits: true, requiresDates: true },
  leave: { label: 'Paid Leave', labelES: 'Permiso retribuido', icon: '📅', defaultLineType: 'earning', requiresUnits: true, requiresDates: true },
  other: { label: 'Other', labelES: 'Otro', icon: '📋', defaultLineType: 'earning', requiresUnits: false, requiresDates: false },
};

export const INCIDENT_STATUS_CONFIG: Record<IncidentStatus, {
  label: string;
  labelES: string;
  color: string;
}> = {
  pending: { label: 'Pending', labelES: 'Pendiente', color: 'bg-amber-500/10 text-amber-700' },
  validated: { label: 'Validated', labelES: 'Validada', color: 'bg-emerald-500/10 text-emerald-700' },
  applied: { label: 'Applied', labelES: 'Aplicada', color: 'bg-blue-500/10 text-blue-700' },
  cancelled: { label: 'Cancelled', labelES: 'Cancelada', color: 'bg-muted text-muted-foreground' },
};

// ── Validación ──

export interface IncidentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateIncident(incident: Partial<PayrollIncident>): IncidentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!incident.concept_code) errors.push('Código de concepto requerido');
  if (!incident.employee_id) errors.push('Empleado requerido');
  if (!incident.incident_type) errors.push('Tipo de incidencia requerido');

  const typeConfig = incident.incident_type ? INCIDENT_TYPE_CONFIG[incident.incident_type] : null;

  if (typeConfig?.requiresUnits && (!incident.units || incident.units <= 0)) {
    errors.push(`${typeConfig.labelES} requiere indicar unidades (días/horas)`);
  }

  if (typeConfig?.requiresDates) {
    if (!incident.applies_from) errors.push(`${typeConfig?.labelES ?? 'Incidencia'} requiere fecha inicio`);
    if (!incident.applies_to) warnings.push('Fecha fin recomendada para mejor trazabilidad');
    if (incident.applies_from && incident.applies_to && incident.applies_from > incident.applies_to) {
      errors.push('Fecha inicio posterior a fecha fin');
    }
  }

  if ((incident.amount ?? 0) < 0 && incident.incident_type !== 'deduction' && incident.incident_type !== 'adjustment') {
    warnings.push('Importe negativo en tipo que normalmente es positivo');
  }

  if (incident.units && incident.unit_price && Math.abs((incident.units * incident.unit_price) - (incident.amount ?? 0)) > 0.01) {
    warnings.push('Importe no coincide con unidades × precio unitario');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Clasificación fiscal ──

export interface FiscalClassification {
  tributa_irpf: boolean;
  cotiza_ss: boolean;
  is_prorrateado: boolean;
  fiscalNote: string;
}

/**
 * Clasifica fiscalmente un concepto/incidencia basándose en el código ES
 * Referencia: legislación laboral-fiscal española vigente
 */
export function classifyFiscal(conceptCode: string): FiscalClassification {
  // Exentos IRPF + SS (retribución flexible dentro de límites)
  if (conceptCode.includes('RETRIB_FLEX') || conceptCode === 'ES_DIETAS' || conceptCode === 'ES_PLUS_TRANSPORTE') {
    return { tributa_irpf: false, cotiza_ss: false, is_prorrateado: false, fiscalNote: 'Exento IRPF y SS dentro de límites legales (RIRPF Art. 9 / LIRPF Art. 42.3)' };
  }
  // Prestaciones SS
  if (conceptCode === 'ES_NACIMIENTO') {
    return { tributa_irpf: false, cotiza_ss: false, is_prorrateado: false, fiscalNote: 'Prestación pública exenta (LGSS Art. 177-182)' };
  }
  // IT complemento empresa
  if (conceptCode === 'ES_IT_CC_EMPRESA' || conceptCode === 'ES_IT_AT_EMPRESA') {
    return { tributa_irpf: true, cotiza_ss: false, is_prorrateado: false, fiscalNote: 'Complemento IT empresa: tributa IRPF, no cotiza SS' };
  }
  // Horas extra
  if (conceptCode.includes('HORAS_EXTRA')) {
    return { tributa_irpf: true, cotiza_ss: true, is_prorrateado: false, fiscalNote: 'Horas extra: cotización AT/EP diferenciada (ET Art. 35)' };
  }
  // Pagas extra prorrateadas
  if (conceptCode === 'ES_PAGA_EXTRA') {
    return { tributa_irpf: true, cotiza_ss: true, is_prorrateado: true, fiscalNote: 'Paga extra: prorrateo en base CC si se paga mensualmente (ET Art. 31)' };
  }
  // Deducciones (IRPF, SS, anticipos, embargos)
  if (conceptCode.includes('IRPF') || conceptCode.includes('SS_') || conceptCode === 'ES_ANTICIPO' || conceptCode === 'ES_EMBARGO' || conceptCode === 'ES_PENSION_COMPENSATORIA' || conceptCode === 'ES_CUOTA_SINDICAL') {
    return { tributa_irpf: false, cotiza_ss: false, is_prorrateado: false, fiscalNote: 'Deducción/retención: no sujeta adicionalmente' };
  }
  // Costes empresa
  if (conceptCode.includes('_EMP') || conceptCode === 'ES_SS_FOGASA' || conceptCode === 'ES_SS_MEI' || conceptCode === 'ES_SS_AT_EP') {
    return { tributa_irpf: false, cotiza_ss: false, is_prorrateado: false, fiscalNote: 'Coste empresa: no repercute en nómina del trabajador' };
  }
  // Informativos
  if (conceptCode.startsWith('ES_BASE_') || conceptCode === 'ES_COSTE_EMPRESA_TOTAL') {
    return { tributa_irpf: false, cotiza_ss: false, is_prorrateado: false, fiscalNote: 'Línea informativa: sin efecto fiscal directo' };
  }
  // Default: devengo ordinario sujeto a todo
  return { tributa_irpf: true, cotiza_ss: true, is_prorrateado: false, fiscalNote: 'Devengo ordinario: sujeto a IRPF y cotización SS' };
}

// ── Readiness de período ──

export interface PeriodIncidentReadiness {
  totalIncidents: number;
  pending: number;
  validated: number;
  applied: number;
  cancelled: number;
  hasUnvalidated: boolean;
  allValidatedOrApplied: boolean;
  readinessLevel: 'empty' | 'has_pending' | 'all_validated' | 'all_applied';
  readinessLabel: string;
}

export function evaluatePeriodIncidentReadiness(incidents: PayrollIncident[]): PeriodIncidentReadiness {
  const active = incidents.filter(i => i.status !== 'cancelled');
  const pending = active.filter(i => i.status === 'pending').length;
  const validated = active.filter(i => i.status === 'validated').length;
  const applied = active.filter(i => i.status === 'applied').length;
  const cancelled = incidents.filter(i => i.status === 'cancelled').length;

  let readinessLevel: PeriodIncidentReadiness['readinessLevel'] = 'empty';
  let readinessLabel = 'Sin incidencias registradas';

  if (active.length === 0) {
    readinessLevel = 'empty';
    readinessLabel = 'Sin incidencias registradas';
  } else if (pending > 0) {
    readinessLevel = 'has_pending';
    readinessLabel = `${pending} incidencia(s) pendiente(s) de validar`;
  } else if (applied === active.length) {
    readinessLevel = 'all_applied';
    readinessLabel = 'Todas las incidencias aplicadas a nómina';
  } else {
    readinessLevel = 'all_validated';
    readinessLabel = 'Todas las incidencias validadas — listas para cálculo';
  }

  return {
    totalIncidents: active.length,
    pending,
    validated,
    applied,
    cancelled,
    hasUnvalidated: pending > 0,
    allValidatedOrApplied: active.length > 0 && pending === 0,
    readinessLevel,
    readinessLabel,
  };
}

// ── Helpers ──

/** Suggested concept codes for each incident type */
export function suggestConceptCodes(incidentType: IncidentType): string[] {
  switch (incidentType) {
    case 'overtime': return ['ES_HORAS_EXTRA', 'ES_HORAS_EXTRA_FEST', 'ES_HORAS_EXTRA_NOCT'];
    case 'bonus': return ['ES_BONUS'];
    case 'commission': return ['ES_COMISION'];
    case 'allowance': return ['ES_DIETAS', 'ES_PLUS_TRANSPORTE'];
    case 'it_cc': return ['ES_IT_CC_EMPRESA'];
    case 'it_at': return ['ES_IT_AT_EMPRESA'];
    case 'leave': return ['ES_VACACIONES', 'ES_NACIMIENTO'];
    case 'absence': return ['ES_PERMISO_NO_RETRIBUIDO'];
    case 'deduction': return ['ES_ANTICIPO', 'ES_EMBARGO', 'ES_PENSION_COMPENSATORIA', 'ES_CUOTA_SINDICAL'];
    case 'adjustment': return ['ES_REGULARIZACION'];
    default: return [];
  }
}

/** Generates a human-readable summary of incidents for audit */
export function generateIncidentsSummary(incidents: PayrollIncident[]): string {
  const active = incidents.filter(i => i.status !== 'cancelled');
  if (active.length === 0) return 'Sin incidencias';
  const byType = active.reduce((acc, i) => {
    acc[i.incident_type] = (acc[i.incident_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(byType)
    .map(([type, count]) => `${INCIDENT_TYPE_CONFIG[type as IncidentType]?.labelES ?? type}: ${count}`)
    .join(', ');
}
