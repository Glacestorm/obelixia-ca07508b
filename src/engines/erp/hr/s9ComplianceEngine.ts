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
  VPTMethodology,
  VPTFactorScores,
  VPTFactor,
  VPTScoreBreakdown,
  VPTIncoherence,
  VPTValuation,
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

// ─── VPT (Valoración de Puestos de Trabajo) ────────────────

export const DEFAULT_VPT_METHODOLOGY: VPTMethodology = [
  {
    factor: 'qualifications',
    weight: 0.25,
    subfactors: [
      { subfactor: 'formal_education', weight: 0.4 },
      { subfactor: 'experience', weight: 0.4 },
      { subfactor: 'certifications', weight: 0.2 },
    ],
  },
  {
    factor: 'responsibility',
    weight: 0.30,
    subfactors: [
      { subfactor: 'people_decisions', weight: 0.35 },
      { subfactor: 'economic_decisions', weight: 0.35 },
      { subfactor: 'organizational_impact', weight: 0.30 },
    ],
  },
  {
    factor: 'effort',
    weight: 0.20,
    subfactors: [
      { subfactor: 'intellectual_complexity', weight: 0.40 },
      { subfactor: 'physical_effort', weight: 0.30 },
      { subfactor: 'emotional_load', weight: 0.30 },
    ],
  },
  {
    factor: 'conditions',
    weight: 0.25,
    subfactors: [
      { subfactor: 'hardship_danger', weight: 0.40 },
      { subfactor: 'atypical_schedules', weight: 0.30 },
      { subfactor: 'availability_travel', weight: 0.30 },
    ],
  },
];

export const VPT_SUBFACTOR_LABELS: Record<string, string> = {
  formal_education: 'Formación reglada',
  experience: 'Experiencia profesional',
  certifications: 'Certificaciones obligatorias',
  people_decisions: 'Decisiones sobre personas',
  economic_decisions: 'Decisiones económicas',
  organizational_impact: 'Impacto organizativo',
  intellectual_complexity: 'Complejidad intelectual',
  physical_effort: 'Esfuerzo físico',
  emotional_load: 'Carga emocional/psicosocial',
  hardship_danger: 'Penosidad/peligrosidad',
  atypical_schedules: 'Horarios atípicos',
  availability_travel: 'Disponibilidad/desplazamientos',
};

export const VPT_FACTOR_LABELS: Record<VPTFactor, string> = {
  qualifications: 'Cualificaciones',
  responsibility: 'Responsabilidad',
  effort: 'Esfuerzo',
  conditions: 'Condiciones de trabajo',
};

/**
 * Compute VPT score from factor scores and methodology.
 * Each subfactor is scored 1-5. Score is normalized to 0-100.
 */
export function computeVPTScore(
  factorScores: VPTFactorScores,
  methodology: VPTMethodology = DEFAULT_VPT_METHODOLOGY,
): VPTScoreBreakdown {
  const MAX_SUBFACTOR = 5;
  const MIN_SUBFACTOR = 1;
  const range = MAX_SUBFACTOR - MIN_SUBFACTOR;

  const perFactor: Record<string, number> = {};
  let totalScore = 0;

  for (const fc of methodology) {
    const scores = factorScores[fc.factor] ?? {};
    let factorWeightedSum = 0;
    let factorTotalWeight = 0;

    for (const sf of fc.subfactors) {
      const raw = scores[sf.subfactor] ?? MIN_SUBFACTOR;
      const clamped = Math.max(MIN_SUBFACTOR, Math.min(MAX_SUBFACTOR, raw));
      const normalized = (clamped - MIN_SUBFACTOR) / range; // 0-1
      factorWeightedSum += normalized * sf.weight;
      factorTotalWeight += sf.weight;
    }

    const factorScore = factorTotalWeight > 0
      ? (factorWeightedSum / factorTotalWeight) * 100
      : 0;
    perFactor[fc.factor] = Math.round(factorScore * 100) / 100;
    totalScore += factorScore * fc.weight;
  }

  return {
    factorScores: perFactor as Record<VPTFactor, number>,
    totalScore: Math.round(totalScore * 100) / 100,
  };
}

/**
 * Detect incoherences between VPT valuations and salary bands / levels.
 */
export function detectVPTIncoherences(
  valuations: Array<{
    id: string;
    positionId: string;
    positionName?: string;
    totalScore: number;
    salaryBandMin?: number;
    salaryBandMax?: number;
    jobLevel?: string;
  }>,
): VPTIncoherence[] {
  const incoherences: VPTIncoherence[] = [];

  // 1. Score vs salary band
  for (const v of valuations) {
    if (v.salaryBandMax != null && v.salaryBandMax > 0) {
      const scorePct = v.totalScore / 100;
      // If score is top quartile (>75) but band is bottom quartile of all bands
      const allMaxBands = valuations
        .map(x => x.salaryBandMax)
        .filter((x): x is number => x != null && x > 0);
      if (allMaxBands.length > 1) {
        const sorted = [...allMaxBands].sort((a, b) => a - b);
        const q25 = sorted[Math.floor(sorted.length * 0.25)];
        if (v.totalScore > 75 && v.salaryBandMax <= q25) {
          incoherences.push({
            type: 'score_vs_band',
            level: 'critical',
            message: `${v.positionName ?? v.positionId}: Score alto (${v.totalScore}) pero banda salarial baja (${v.salaryBandMax}€)`,
            positionIds: [v.positionId],
            details: { score: v.totalScore, bandMax: v.salaryBandMax },
          });
        }
      }
    }
  }

  // 2. Same level, divergent scores
  const byLevel = new Map<string, typeof valuations>();
  for (const v of valuations) {
    if (!v.jobLevel) continue;
    if (!byLevel.has(v.jobLevel)) byLevel.set(v.jobLevel, []);
    byLevel.get(v.jobLevel)!.push(v);
  }

  for (const [level, group] of byLevel) {
    if (group.length < 2) continue;
    const scores = group.map(g => g.totalScore);
    const maxS = Math.max(...scores);
    const minS = Math.min(...scores);
    if (maxS - minS > 30) {
      incoherences.push({
        type: 'level_divergence',
        level: 'warning',
        message: `Nivel ${level}: diferencia de ${(maxS - minS).toFixed(0)} puntos entre puestos del mismo nivel`,
        positionIds: group.map(g => g.positionId),
        details: { level, maxScore: maxS, minScore: minS },
      });
    }
  }

  return incoherences;
}

export const DEFAULT_METHODOLOGY_VERSION = 'v1.0';

/**
 * Suggest equivalent salary band based on VPT score and reference bands.
 * Strictly separated from the scoring formula — this is a derived recommendation.
 */
export function suggestEquivalentBand(
  totalScore: number,
  referenceBands: Array<{ score: number; bandMin: number; bandMax: number }>,
): { suggestedMin: number; suggestedMax: number; basis: string } | null {
  if (referenceBands.length < 2) return null;

  const sorted = [...referenceBands].sort((a, b) => a.score - b.score);

  // Find bracketing entries
  const lower = sorted.filter(r => r.score <= totalScore).pop();
  const upper = sorted.find(r => r.score >= totalScore);

  if (!lower && !upper) return null;
  if (!lower) return { suggestedMin: upper!.bandMin, suggestedMax: upper!.bandMax, basis: 'extrapolación inferior' };
  if (!upper) return { suggestedMin: lower.bandMin, suggestedMax: lower.bandMax, basis: 'extrapolación superior' };
  if (lower.score === upper.score) return { suggestedMin: lower.bandMin, suggestedMax: lower.bandMax, basis: 'coincidencia exacta' };

  // Linear interpolation
  const ratio = (totalScore - lower.score) / (upper.score - lower.score);
  const suggestedMin = Math.round(lower.bandMin + ratio * (upper.bandMin - lower.bandMin));
  const suggestedMax = Math.round(lower.bandMax + ratio * (upper.bandMax - lower.bandMax));

  return { suggestedMin, suggestedMax, basis: 'interpolación lineal' };
}

/**
 * Compare multiple VPT valuations side by side.
 * Returns normalized comparison data for UI rendering.
 */
export function compareVPTValuations(
  valuations: Array<{
    positionId: string;
    positionName: string;
    factorScores: VPTFactorScores;
    methodology: VPTMethodology;
    totalScore: number;
    salaryBandMax?: number;
    jobLevel?: string;
  }>,
): Array<{
  positionId: string;
  positionName: string;
  totalScore: number;
  factorBreakdown: Record<VPTFactor, number>;
  salaryBandMax?: number;
  jobLevel?: string;
}> {
  return valuations.map(v => {
    const bd = computeVPTScore(v.factorScores, v.methodology);
    return {
      positionId: v.positionId,
      positionName: v.positionName,
      totalScore: bd.totalScore,
      factorBreakdown: bd.factorScores,
      salaryBandMax: v.salaryBandMax,
      jobLevel: v.jobLevel,
    };
  });
}
