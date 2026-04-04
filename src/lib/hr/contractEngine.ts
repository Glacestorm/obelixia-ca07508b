/**
 * Contract Engine — Lógica determinista de contratos avanzados
 * Prórrogas, bonificaciones TGSS, parcialidad, conversiones
 */

// ============================================
// TYPES
// ============================================

export type ContractStatus = 'draft' | 'active' | 'extended' | 'suspended' | 'terminated';

export type ObservationType =
  | 'ta2_movement'
  | 'vacation_pending'
  | 'salary_pending'
  | 'dismissal'
  | 'recall'
  | 'ss_arrears'
  | 'maternity_reserve'
  | 'bonus_applied'
  | 'conversion'
  | 'other';

export const OBSERVATION_LABELS: Record<ObservationType, string> = {
  ta2_movement: 'Movimiento TA.2',
  vacation_pending: 'Vacaciones no disfrutadas',
  salary_pending: 'Salarios de tramitación',
  dismissal: 'Procedencia despido',
  recall: 'Llamamiento actividad',
  ss_arrears: 'Atrasos cotización',
  maternity_reserve: 'Reserva maternidad',
  bonus_applied: 'Bonificación/Reducción TGSS',
  conversion: 'Conversión contrato',
  other: 'Otra observación',
};

// ============================================
// TA.2 MOVEMENT CODES
// ============================================

export interface TA2MovementCode {
  code: string;
  label: string;
  description: string;
}

export const TA2_CODES: TA2MovementCode[] = [
  { code: 'A01', label: 'Alta inicial', description: 'Primera alta del trabajador en la empresa' },
  { code: 'A02', label: 'Alta sucesiva', description: 'Alta de trabajador que ya estuvo en la empresa' },
  { code: 'A03', label: 'Alta por traslado', description: 'Alta por cambio de CCC dentro de la misma empresa' },
  { code: 'B01', label: 'Baja definitiva', description: 'Cese definitivo del trabajador' },
  { code: 'B02', label: 'Baja por traslado', description: 'Baja por cambio de CCC dentro de la misma empresa' },
  { code: 'V01', label: 'Variación de datos', description: 'Modificación de datos laborales sin cambio de relación' },
  { code: 'V02', label: 'Variación grupo cotización', description: 'Cambio de grupo de cotización' },
  { code: 'V03', label: 'Variación contrato', description: 'Cambio de tipo de contrato (conversión)' },
  { code: 'V04', label: 'Variación jornada', description: 'Cambio de coeficiente de parcialidad' },
];

// ============================================
// SS BONUS CODES
// ============================================

export interface SSBonusCode {
  code: string;
  label: string;
  percentage: number;
  maxMonths: number | null;
  description: string;
}

export const SS_BONUS_CATALOG: SSBonusCode[] = [
  { code: 'BON-001', label: 'Bonificación indefinido joven', percentage: 50, maxMonths: 36, description: 'Menores 30 años desempleados' },
  { code: 'BON-002', label: 'Bonificación discapacidad', percentage: 100, maxMonths: null, description: 'Trabajadores con discapacidad ≥33%' },
  { code: 'BON-003', label: 'Reducción < 500 trabajadores', percentage: 25, maxMonths: 24, description: 'Empresas con menos de 500 empleados' },
  { code: 'BON-004', label: 'Bonificación reincorporación maternidad', percentage: 100, maxMonths: 24, description: 'Reincorporación tras maternidad/paternidad' },
  { code: 'RED-001', label: 'Reducción ERE fuerza mayor', percentage: 75, maxMonths: 12, description: 'Reducción en ERE por fuerza mayor temporal' },
];

// ============================================
// ENGINE FUNCTIONS
// ============================================

/**
 * Calcula el coeficiente de parcialidad a partir de horas semanales.
 */
export function calculatePartTimeCoefficient(
  weeklyHours: number,
  fullTimeHours: number = 40,
): number {
  if (fullTimeHours <= 0) return 1;
  const coeff = weeklyHours / fullTimeHours;
  return Math.round(Math.min(Math.max(coeff, 0), 1) * 10000) / 10000;
}

/**
 * Determina si un contrato puede ser prorrogado.
 * Los indefinidos no se prorrogan; los temporales tienen límite de 24 meses.
 */
export function canExtendContract(
  contractType: string,
  currentExtensions: number,
  startDate: string,
  currentEndDate: string | null,
): { allowed: boolean; reason: string } {
  const isIndefinite = contractType.startsWith('1'); // Códigos RD: 100, 109, 130, etc.

  if (isIndefinite) {
    return { allowed: false, reason: 'Los contratos indefinidos no requieren prórroga' };
  }

  if (currentExtensions >= 2) {
    return { allowed: false, reason: 'Máximo 2 prórrogas alcanzado (encadenamiento)' };
  }

  if (currentEndDate) {
    const start = new Date(startDate);
    const end = new Date(currentEndDate);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (monthsDiff >= 24) {
      return { allowed: false, reason: 'Duración máxima de 24 meses alcanzada' };
    }
  }

  return { allowed: true, reason: 'Prórroga permitida' };
}

/**
 * Calcula la fecha de fin de reserva de puesto por maternidad/paternidad.
 */
export function calculateMaternityReserve(leaveEndDate: string): string {
  const date = new Date(leaveEndDate);
  // Reserva de puesto: hasta 12 meses tras fin del permiso
  date.setMonth(date.getMonth() + 12);
  return date.toISOString().split('T')[0];
}

/**
 * Valida si una conversión de contrato es válida.
 */
export function validateConversion(
  fromType: string,
  toType: string,
): { valid: boolean; ta2Code: string; notes: string } {
  const fromIsTemp = !fromType.startsWith('1');
  const toIsIndef = toType.startsWith('1');

  if (fromIsTemp && toIsIndef) {
    return {
      valid: true,
      ta2Code: 'V03',
      notes: `Conversión temporal (${fromType}) → indefinido (${toType}). Genera movimiento TA.2 V03.`,
    };
  }

  if (!fromIsTemp && toIsIndef) {
    return {
      valid: false,
      ta2Code: '',
      notes: 'El contrato origen ya es indefinido. No procede conversión.',
    };
  }

  return {
    valid: true,
    ta2Code: 'V03',
    notes: `Cambio de tipo de contrato: ${fromType} → ${toType}`,
  };
}
