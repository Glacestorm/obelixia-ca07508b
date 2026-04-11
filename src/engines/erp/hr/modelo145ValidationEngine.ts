/**
 * modelo145ValidationEngine — Pure validator for Modelo 145 field completeness
 * P1.5R: Validates employee fiscal data before IRPF calculation
 *
 * Art. 88 RIRPF: Comunicación de datos al pagador
 * Art. 85 RIRPF: Situación familiar del perceptor
 *
 * NO Supabase, NO React — pure functions only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Modelo145EmployeeData {
  employeeId: string;
  employeeName?: string;
  nif?: string;
  situacionFamiliar?: 1 | 2 | 3;
  discapacidadGrado?: number;
  discapacidadMovilidadReducida?: boolean;
  movilidadGeografica?: boolean;
  prolongacionActividad?: boolean;
  /** Descendants */
  descendientes?: Modelo145Descendiente[];
  /** Ascendants */
  ascendientes?: Modelo145Ascendiente[];
  /** Pension compensatoria */
  pensionCompensatoria?: number;
  /** Anualidades por alimentos */
  anualidadesAlimentos?: number;
  /** Deducción vivienda habitual (pre-2013) */
  deduccionVivienda?: boolean;
  /** Tipo voluntario solicitado (Art. 88.5 RIRPF) */
  tipoVoluntarioSolicitado?: number;
  /** Rendimientos irregulares comunicados */
  rendimientosIrregulares?: boolean;
  /** Date of last 145 update */
  lastUpdated?: string;
}

export interface Modelo145Descendiente {
  orden: number;
  fechaNacimiento?: string;
  discapacidadGrado?: number;
  discapacidadMovilidadReducida?: boolean;
  computoPorEntero?: boolean;
}

export interface Modelo145Ascendiente {
  edad?: number;
  convive?: boolean;
  discapacidadGrado?: number;
  discapacidadMovilidadReducida?: boolean;
}

export interface Modelo145FieldIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface Modelo145ValidationResult {
  employeeId: string;
  employeeName: string;
  isComplete: boolean;
  completenessScore: number;
  issues: Modelo145FieldIssue[];
  errorCount: number;
  warningCount: number;
}

export interface Modelo145ChangeDetection {
  employeeId: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  hasIRPFImpact: boolean;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const TOTAL_FIELDS = 8; // Fields that contribute to completeness

export function validateModelo145(data: Modelo145EmployeeData): Modelo145ValidationResult {
  const issues: Modelo145FieldIssue[] = [];
  let fieldsComplete = 0;

  // 1. Situación familiar (mandatory)
  if (!data.situacionFamiliar || ![1, 2, 3].includes(data.situacionFamiliar)) {
    issues.push({ field: 'situacionFamiliar', severity: 'error', message: 'Situación familiar no informada (obligatorio Art. 85 RIRPF)' });
  } else {
    fieldsComplete++;
  }

  // 2. NIF
  if (!data.nif?.trim()) {
    issues.push({ field: 'nif', severity: 'error', message: 'NIF/DNI del perceptor no informado' });
  } else {
    fieldsComplete++;
  }

  // 3. Discapacidad coherence
  if (data.discapacidadGrado !== undefined) {
    if (data.discapacidadGrado < 0 || data.discapacidadGrado > 100) {
      issues.push({ field: 'discapacidadGrado', severity: 'error', message: 'Grado de discapacidad fuera de rango (0-100)' });
    } else {
      fieldsComplete++;
      if (data.discapacidadMovilidadReducida && (!data.discapacidadGrado || data.discapacidadGrado < 33)) {
        issues.push({ field: 'discapacidadMovilidadReducida', severity: 'warning', message: 'Movilidad reducida marcada pero grado < 33%' });
      }
    }
  } else {
    fieldsComplete++; // Not mandatory, default = 0
  }

  // 4. Descendants validation
  if (data.descendientes && data.descendientes.length > 0) {
    fieldsComplete++;
    for (const desc of data.descendientes) {
      if (!desc.fechaNacimiento) {
        issues.push({ field: `descendiente_${desc.orden}_fechaNacimiento`, severity: 'warning', message: `Descendiente ${desc.orden}: fecha de nacimiento no informada (necesaria para menor de 3 años)` });
      }
      if (desc.discapacidadGrado !== undefined && (desc.discapacidadGrado < 0 || desc.discapacidadGrado > 100)) {
        issues.push({ field: `descendiente_${desc.orden}_discapacidad`, severity: 'error', message: `Descendiente ${desc.orden}: grado discapacidad fuera de rango` });
      }
    }
  } else {
    fieldsComplete++; // No descendants is valid
  }

  // 5. Ascendants validation
  if (data.ascendientes && data.ascendientes.length > 0) {
    fieldsComplete++;
    for (let i = 0; i < data.ascendientes.length; i++) {
      const asc = data.ascendientes[i];
      if (!asc.edad || asc.edad < 0) {
        issues.push({ field: `ascendiente_${i}_edad`, severity: 'warning', message: `Ascendiente ${i + 1}: edad no informada (necesaria para mínimo >65/>75)` });
      }
      if (asc.discapacidadGrado !== undefined && (asc.discapacidadGrado < 0 || asc.discapacidadGrado > 100)) {
        issues.push({ field: `ascendiente_${i}_discapacidad`, severity: 'error', message: `Ascendiente ${i + 1}: grado discapacidad fuera de rango` });
      }
    }
  } else {
    fieldsComplete++; // No ascendants is valid
  }

  // 6. Pension compensatoria
  if (data.pensionCompensatoria !== undefined && data.pensionCompensatoria < 0) {
    issues.push({ field: 'pensionCompensatoria', severity: 'error', message: 'Pensión compensatoria no puede ser negativa' });
  } else {
    fieldsComplete++;
  }

  // 7. Anualidades por alimentos
  if (data.anualidadesAlimentos !== undefined && data.anualidadesAlimentos < 0) {
    issues.push({ field: 'anualidadesAlimentos', severity: 'error', message: 'Anualidades por alimentos no puede ser negativa' });
  } else {
    fieldsComplete++;
  }

  // 8. Tipo voluntario Art. 88.5
  if (data.tipoVoluntarioSolicitado !== undefined) {
    if (data.tipoVoluntarioSolicitado < 0 || data.tipoVoluntarioSolicitado > 100) {
      issues.push({ field: 'tipoVoluntarioSolicitado', severity: 'error', message: 'Tipo voluntario fuera de rango (0-100%)' });
    }
    fieldsComplete++;
  } else {
    fieldsComplete++; // Optional
  }

  // Situación 2 specific: cónyuge check
  if (data.situacionFamiliar === 2) {
    issues.push({ field: 'conyuge', severity: 'info', message: 'Situación 2: verificar que rentas cónyuge ≤ 1.500€/año (Art. 85 RIRPF)' });
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const completenessScore = Math.round((fieldsComplete / TOTAL_FIELDS) * 100);

  return {
    employeeId: data.employeeId,
    employeeName: data.employeeName ?? data.employeeId,
    isComplete: errorCount === 0 && completenessScore >= 75,
    completenessScore,
    issues,
    errorCount,
    warningCount,
  };
}

// ─── Bulk validation ─────────────────────────────────────────────────────────

export function validateModelo145Bulk(employees: Modelo145EmployeeData[]): {
  results: Modelo145ValidationResult[];
  totalComplete: number;
  totalIncomplete: number;
  overallScore: number;
} {
  const results = employees.map(validateModelo145);
  const totalComplete = results.filter(r => r.isComplete).length;
  const totalIncomplete = results.length - totalComplete;
  const overallScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.completenessScore, 0) / results.length)
    : 0;
  return { results, totalComplete, totalIncomplete, overallScore };
}

// ─── Change detection ────────────────────────────────────────────────────────

const IRPF_IMPACT_FIELDS = [
  'situacionFamiliar', 'discapacidadGrado', 'discapacidadMovilidadReducida',
  'movilidadGeografica', 'descendientes', 'ascendientes',
  'pensionCompensatoria', 'anualidadesAlimentos', 'deduccionVivienda',
  'tipoVoluntarioSolicitado', 'rendimientosIrregulares',
];

export function detect145Changes(
  previous: Partial<Modelo145EmployeeData>,
  current: Modelo145EmployeeData,
): Modelo145ChangeDetection {
  const changedFields: string[] = [];
  const previousValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  for (const field of IRPF_IMPACT_FIELDS) {
    const prev = (previous as Record<string, unknown>)[field];
    const curr = (current as Record<string, unknown>)[field];
    if (JSON.stringify(prev) !== JSON.stringify(curr)) {
      changedFields.push(field);
      previousValues[field] = prev;
      newValues[field] = curr;
    }
  }

  return {
    employeeId: current.employeeId,
    changedFields,
    previousValues,
    newValues,
    hasIRPFImpact: changedFields.length > 0,
  };
}
