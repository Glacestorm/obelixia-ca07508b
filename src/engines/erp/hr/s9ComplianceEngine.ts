/**
 * S9 Compliance Engine — Pure functions, no side-effects
 * Motor de cumplimiento legal para LISMI, Registro Retributivo,
 * Desconexión Digital y Teletrabajo.
 */

import type {
  LISMIQuotaResult,
  LISMIAlert,
  AlternativeMeasureType,
  SalaryRegisterEntry,
  SalaryRegisterReport,
  SalaryRegisterAlert,
  DisconnectionViolation,
  DisconnectionMetrics,
  RemoteWorkValidation,
  RemoteWorkMandatoryPoint,
  REMOTE_WORK_MANDATORY_POINTS,
} from '@/types/s9-compliance';

// ─── LISMI / LGD ─────────────────────────────────────────────

const LISMI_THRESHOLD = 50;
const LISMI_QUOTA = 0.02;

export function computeLISMIQuota(
  totalEmployees: number,
  disabledEmployees: number,
): LISMIQuotaResult {
  const thresholdApplies = totalEmployees >= LISMI_THRESHOLD;
  const requiredRatio = thresholdApplies ? LISMI_QUOTA : 0;
  const currentRatio = totalEmployees > 0 ? disabledEmployees / totalEmployees : 0;
  const requiredCount = thresholdApplies ? Math.ceil(totalEmployees * LISMI_QUOTA) : 0;
  const deficit = Math.max(0, requiredCount - disabledEmployees);
  const isCompliant = !thresholdApplies || disabledEmployees >= requiredCount;

  const alerts: LISMIAlert[] = [];

  if (!thresholdApplies) {
    alerts.push({
      level: 'info',
      message: `Plantilla de ${totalEmployees} empleados: la cuota LISMI no aplica (umbral ≥${LISMI_THRESHOLD}).`,
      legalRef: 'LGDPD Art. 42',
    });
  } else if (!isCompliant) {
    alerts.push({
      level: 'critical',
      message: `Déficit de ${deficit} empleado(s) con discapacidad. Ratio actual: ${(currentRatio * 100).toFixed(1)}% vs 2% requerido.`,
      legalRef: 'LGDPD Art. 42 / RD 364/2005',
    });
  } else {
    alerts.push({
      level: 'info',
      message: `Cuota LISMI cumplida: ${disabledEmployees}/${requiredCount} (${(currentRatio * 100).toFixed(1)}%).`,
      legalRef: 'LGDPD Art. 42',
    });
  }

  return {
    totalEmployees,
    disabledEmployees,
    currentRatio,
    requiredRatio,
    isCompliant,
    deficit,
    thresholdApplies,
    alerts,
  };
}

export const ALTERNATIVE_MEASURE_LABELS: Record<AlternativeMeasureType, string> = {
  donation: 'Donación a entidad de utilidad pública',
  sponsorship: 'Patrocinio de actividades de inserción',
  service_contract: 'Contrato mercantil con Centro Especial de Empleo',
  enclave_laboral: 'Enclave laboral (RD 290/2004)',
};

// ─── SALARY REGISTER (RD 902/2020) ──────────────────────────

const SIGNIFICANT_GAP_THRESHOLD = 0.25;

interface PayrollRecord {
  employeeId: string;
  gender: 'M' | 'F' | string;
  groupOrCategory: string;
  concept: string;
  amount: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function generateSalaryRegisterData(
  records: PayrollRecord[],
  period: string,
  existingVersion = 0,
): SalaryRegisterReport {
  // Group by category × concept × gender
  const groups = new Map<string, { male: number[]; female: number[] }>();

  for (const r of records) {
    const key = `${r.groupOrCategory}|||${r.concept}`;
    if (!groups.has(key)) groups.set(key, { male: [], female: [] });
    const g = groups.get(key)!;
    if (r.gender === 'M') g.male.push(r.amount);
    else if (r.gender === 'F') g.female.push(r.amount);
  }

  const entries: SalaryRegisterEntry[] = [];
  const alerts: SalaryRegisterAlert[] = [];
  let totalMaleMean = 0;
  let totalFemaleMean = 0;
  let maleEntries = 0;
  let femaleEntries = 0;

  for (const [key, g] of groups) {
    const [groupOrCategory, concept] = key.split('|||');
    const maleMean = mean(g.male);
    const femaleMean = mean(g.female);
    const maleMedian = median(g.male);
    const femaleMedian = median(g.female);

    const reference = Math.max(maleMean, femaleMean);
    const gapPercent = reference > 0
      ? Math.abs(maleMean - femaleMean) / reference
      : 0;
    const hasSignificantGap = gapPercent >= SIGNIFICANT_GAP_THRESHOLD;

    entries.push({
      groupOrCategory,
      concept,
      maleCount: g.male.length,
      femaleCount: g.female.length,
      maleMean,
      femaleMean,
      maleMedian,
      femaleMedian,
      gapPercent,
      hasSignificantGap,
    });

    if (hasSignificantGap) {
      alerts.push({
        level: gapPercent >= 0.4 ? 'critical' : 'warning',
        message: `Brecha del ${(gapPercent * 100).toFixed(1)}% en ${groupOrCategory} — ${concept}`,
        group: groupOrCategory,
        concept,
        gapPercent,
      });
    }

    if (g.male.length > 0) { totalMaleMean += maleMean; maleEntries++; }
    if (g.female.length > 0) { totalFemaleMean += femaleMean; femaleEntries++; }
  }

  const avgMale = maleEntries > 0 ? totalMaleMean / maleEntries : 0;
  const avgFemale = femaleEntries > 0 ? totalFemaleMean / femaleEntries : 0;
  const globalRef = Math.max(avgMale, avgFemale);
  const globalGap = globalRef > 0 ? Math.abs(avgMale - avgFemale) / globalRef : 0;

  return {
    period,
    generatedAt: new Date().toISOString(),
    entries,
    globalGap,
    alerts,
    version: existingVersion + 1,
  };
}

// ─── DIGITAL DISCONNECTION ──────────────────────────────────

interface TimeEntry {
  employeeId: string;
  employeeName?: string;
  date: string;
  clockIn: string; // HH:mm
  clockOut: string; // HH:mm
}

interface DisconnectionPolicy {
  id: string;
  startTime: string; // HH:mm — start of disconnection window
  endTime: string;   // HH:mm — end of disconnection window
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function evaluateDisconnectionCompliance(
  policy: DisconnectionPolicy,
  entries: TimeEntry[],
): { violations: DisconnectionViolation[]; metrics: DisconnectionMetrics } {
  const violations: DisconnectionViolation[] = [];
  const policyStart = timeToMinutes(policy.startTime);
  const policyEnd = timeToMinutes(policy.endTime);

  for (const entry of entries) {
    const clockOut = timeToMinutes(entry.clockOut);
    // If clock out is after disconnection start
    if (clockOut > policyStart) {
      const minutesOutside = clockOut - policyStart;
      violations.push({
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        date: entry.date,
        startTime: policy.startTime,
        endTime: entry.clockOut,
        minutesOutside,
        policyId: policy.id,
      });
    }
    // Early morning: clock in before disconnection end
    const clockIn = timeToMinutes(entry.clockIn);
    if (policyEnd > policyStart && clockIn < policyEnd) {
      // This handles overnight disconnection windows — skip for now
    }
  }

  const employeesAffected = new Set(violations.map(v => v.employeeId)).size;
  const totalMinutes = violations.reduce((s, v) => s + v.minutesOutside, 0);
  const uniqueDays = new Set(violations.map(v => v.date));
  const totalEntries = entries.length;
  const entriesWithViolation = new Set(violations.map(v => `${v.employeeId}-${v.date}`)).size;

  return {
    violations,
    metrics: {
      totalViolations: violations.length,
      employeesAffected,
      averageMinutesOutside: violations.length > 0 ? totalMinutes / violations.length : 0,
      worstDay: violations.length > 0
        ? [...uniqueDays].sort((a, b) => {
            const countA = violations.filter(v => v.date === a).length;
            const countB = violations.filter(v => v.date === b).length;
            return countB - countA;
          })[0]
        : null,
      complianceRate: totalEntries > 0
        ? ((totalEntries - entriesWithViolation) / totalEntries) * 100
        : 100,
    },
  };
}

// ─── REMOTE WORK (Ley 10/2021) ──────────────────────────────

const ALL_MANDATORY_POINTS: RemoteWorkMandatoryPoint[] = [
  'equipment_inventory',
  'expense_list',
  'work_schedule',
  'availability_hours',
  'workplace_percentage',
  'work_center_reference',
  'work_location',
  'duration_and_notice',
  'reversibility_terms',
  'performance_monitoring',
  'disconnection_protocol',
  'data_protection',
  'risk_prevention',
];

export const MANDATORY_POINT_LABELS: Record<RemoteWorkMandatoryPoint, string> = {
  equipment_inventory: 'Inventario de medios y equipos',
  expense_list: 'Enumeración de gastos y compensación',
  work_schedule: 'Horario de trabajo',
  availability_hours: 'Horario de disponibilidad obligatoria',
  workplace_percentage: 'Porcentaje de presencialidad',
  work_center_reference: 'Centro de trabajo de referencia',
  work_location: 'Lugar de trabajo a distancia',
  duration_and_notice: 'Duración y preaviso de reversión',
  reversibility_terms: 'Condiciones de reversibilidad',
  performance_monitoring: 'Medios de control empresarial',
  disconnection_protocol: 'Protocolo de desconexión digital',
  data_protection: 'Protección de datos y seguridad',
  risk_prevention: 'Prevención de riesgos laborales',
};

export function validateRemoteWorkAgreement(
  agreementContent: Record<string, unknown>,
): RemoteWorkValidation {
  const completed: RemoteWorkMandatoryPoint[] = [];
  const missing: RemoteWorkMandatoryPoint[] = [];

  for (const point of ALL_MANDATORY_POINTS) {
    const value = agreementContent[point];
    const isFilled = value !== undefined && value !== null && value !== '' &&
      !(typeof value === 'object' && Object.keys(value as object).length === 0) &&
      !(Array.isArray(value) && value.length === 0);
    if (isFilled) completed.push(point);
    else missing.push(point);
  }

  return {
    isComplete: missing.length === 0,
    completedPoints: completed,
    missingPoints: missing,
    completionPercent: ALL_MANDATORY_POINTS.length > 0
      ? (completed.length / ALL_MANDATORY_POINTS.length) * 100
      : 100,
  };
}

export function computePresenciality(
  remotePercentage: number,
): { presencial: number; remote: number; label: string } {
  const presencial = 100 - remotePercentage;
  return {
    presencial,
    remote: remotePercentage,
    label: remotePercentage >= 30
      ? 'Trabajo a distancia (≥30%)'
      : 'Presencial con teletrabajo puntual',
  };
}
