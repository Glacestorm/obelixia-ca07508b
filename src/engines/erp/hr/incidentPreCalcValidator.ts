/**
 * incidentPreCalcValidator.ts — P1.3
 * Pure batch validation engine for the full incident set before payroll calculation.
 * No side-effects, no fetch — deterministic functions only.
 */

import type { PayrollIncident, IncidentType } from './payrollIncidentEngine';
import { INCIDENT_TYPE_CONFIG } from './payrollIncidentEngine';

// ── Types ──

export interface BatchIncidentValidationResult {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  employeeResults: EmployeeIncidentValidation[];
  globalErrors: ValidationItem[];
  globalWarnings: ValidationItem[];
}

export interface EmployeeIncidentValidation {
  employeeId: string;
  errors: ValidationItem[];
  warnings: ValidationItem[];
  incidentCount: number;
}

export interface ValidationItem {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  incidentIds?: string[];
  employeeId?: string;
}

// ── Validator ──

export function validateBatchIncidents(
  incidents: PayrollIncident[],
): BatchIncidentValidationResult {
  const active = incidents.filter(i => i.status !== 'cancelled');
  const globalErrors: ValidationItem[] = [];
  const globalWarnings: ValidationItem[] = [];

  // Group by employee
  const byEmployee = new Map<string, PayrollIncident[]>();
  for (const inc of active) {
    const list = byEmployee.get(inc.employee_id) ?? [];
    list.push(inc);
    byEmployee.set(inc.employee_id, list);
  }

  // Check for unvalidated incidents (blocking)
  const unvalidated = active.filter(i => i.status === 'pending');
  if (unvalidated.length > 0) {
    globalErrors.push({
      code: 'UNVALIDATED_INCIDENTS',
      message: `${unvalidated.length} incidencia(s) pendiente(s) de validar — bloquean el cálculo`,
      severity: 'error',
      incidentIds: unvalidated.map(i => i.id),
    });
  }

  const employeeResults: EmployeeIncidentValidation[] = [];

  for (const [employeeId, empIncidents] of byEmployee) {
    const errors: ValidationItem[] = [];
    const warnings: ValidationItem[] = [];

    // 1. Duplicate concept codes
    checkDuplicateConcepts(empIncidents, errors);

    // 2. Overlapping date ranges for date-based types
    checkOverlappingDates(empIncidents, errors);

    // 3. Missing mandatory fields per type
    checkMandatoryFields(empIncidents, warnings);

    // 4. SS action without clarity
    checkSSActionRequirements(empIncidents, warnings);

    employeeResults.push({
      employeeId,
      errors,
      warnings,
      incidentCount: empIncidents.length,
    });
  }

  const totalErrors = globalErrors.length + employeeResults.reduce((s, e) => s + e.errors.length, 0);
  const totalWarnings = globalWarnings.length + employeeResults.reduce((s, e) => s + e.warnings.length, 0);

  return {
    isValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    employeeResults,
    globalErrors,
    globalWarnings,
  };
}

// ── Internal checks ──

function checkDuplicateConcepts(incidents: PayrollIncident[], errors: ValidationItem[]): void {
  const conceptMap = new Map<string, PayrollIncident[]>();
  for (const inc of incidents) {
    if (!inc.concept_code) continue;
    const list = conceptMap.get(inc.concept_code) ?? [];
    list.push(inc);
    conceptMap.set(inc.concept_code, list);
  }

  for (const [code, dups] of conceptMap) {
    if (dups.length > 1) {
      // Duplicates of the same concept on same employee — could be intentional for some types
      const nonAccumulable: IncidentType[] = ['it_cc', 'it_at', 'leave'];
      if (dups.some(d => nonAccumulable.includes(d.incident_type))) {
        errors.push({
          code: 'DUPLICATE_CONCEPT',
          message: `Concepto "${code}" duplicado (${dups.length} veces) — tipo no acumulable`,
          severity: 'error',
          incidentIds: dups.map(d => d.id),
          employeeId: dups[0].employee_id,
        });
      }
    }
  }
}

function checkOverlappingDates(incidents: PayrollIncident[], errors: ValidationItem[]): void {
  const dateBased = incidents.filter(i => {
    const cfg = INCIDENT_TYPE_CONFIG[i.incident_type];
    return cfg?.requiresDates && i.applies_from && i.applies_to;
  });

  for (let i = 0; i < dateBased.length; i++) {
    for (let j = i + 1; j < dateBased.length; j++) {
      const a = dateBased[i];
      const b = dateBased[j];
      if (a.incident_type !== b.incident_type) continue;

      const aFrom = new Date(a.applies_from!).getTime();
      const aTo = new Date(a.applies_to!).getTime();
      const bFrom = new Date(b.applies_from!).getTime();
      const bTo = new Date(b.applies_to!).getTime();

      if (aFrom <= bTo && bFrom <= aTo) {
        errors.push({
          code: 'OVERLAPPING_DATES',
          message: `Solapamiento de fechas en "${a.incident_type}": ${a.applies_from}–${a.applies_to} ↔ ${b.applies_from}–${b.applies_to}`,
          severity: 'error',
          incidentIds: [a.id, b.id],
          employeeId: a.employee_id,
        });
      }
    }
  }
}

function checkMandatoryFields(incidents: PayrollIncident[], warnings: ValidationItem[]): void {
  for (const inc of incidents) {
    const cfg = INCIDENT_TYPE_CONFIG[inc.incident_type];
    if (!cfg) continue;

    if (cfg.requiresUnits && (inc.units === null || inc.units === undefined)) {
      warnings.push({
        code: 'MISSING_UNITS',
        message: `Incidencia "${inc.incident_type}" sin unidades — puede afectar el cálculo`,
        severity: 'warning',
        incidentIds: [inc.id],
        employeeId: inc.employee_id,
      });
    }

    if (cfg.requiresDates && (!inc.applies_from || !inc.applies_to)) {
      warnings.push({
        code: 'MISSING_DATES',
        message: `Incidencia "${inc.incident_type}" sin rango de fechas`,
        severity: 'warning',
        incidentIds: [inc.id],
        employeeId: inc.employee_id,
      });
    }

    if (!inc.concept_code) {
      warnings.push({
        code: 'MISSING_CONCEPT_CODE',
        message: `Incidencia "${inc.incident_type}" sin código de concepto`,
        severity: 'warning',
        incidentIds: [inc.id],
        employeeId: inc.employee_id,
      });
    }
  }
}

function checkSSActionRequirements(incidents: PayrollIncident[], warnings: ValidationItem[]): void {
  const ssRequired = incidents.filter(i => i.requires_ss_action);
  if (ssRequired.length > 0) {
    warnings.push({
      code: 'SS_ACTION_REQUIRED',
      message: `${ssRequired.length} incidencia(s) requieren acción de Seguridad Social — verificar AFI asociado`,
      severity: 'warning',
      incidentIds: ssRequired.map(i => i.id),
      employeeId: ssRequired[0].employee_id,
    });
  }
}
