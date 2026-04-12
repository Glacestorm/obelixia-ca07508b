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
  VPTBandLabel,
  VPTEnrichedSalaryEntry,
  VPTEnrichedSalaryReport,
  VPTBandGroupSummary,
  RetributiveAuditEntry,
  RetributiveAuditAlert,
  RetributiveAuditReport,
  EquityVPTContext,
  FairnessVPTSummary,
  FairnessVPTAlert,
  RetributiveExecutiveSummary,
} from '@/types/s9-compliance';
import {
  RETRIBUTIVE_AUDIT_DISCLAIMER,
  VPT_CONTEXT_DISCLAIMER,
  EXECUTIVE_SUMMARY_DISCLAIMER,
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

// ─── VPT-Enriched Salary Register (S9.4) ───────────────────

export interface VPTEnrichmentMap {
  /** positionId → approved VPT totalScore */
  [positionId: string]: number;
}

function scoreToVPTBand(score: number): VPTBandLabel {
  if (score < 25) return 'Q1 (0-25)';
  if (score < 50) return 'Q2 (25-50)';
  if (score < 75) return 'Q3 (50-75)';
  return 'Q4 (75-100)';
}

export interface EnrichedPayrollRecord {
  employeeId: string;
  gender: 'M' | 'F' | string;
  groupOrCategory: string;
  concept: string;
  amount: number;
  positionId?: string | null;
}

/**
 * Enriches a standard salary register report with VPT scores per employee position.
 * Graceful fallback: employees without approved VPT get null scores.
 */
export function generateVPTEnrichedRegister(
  records: EnrichedPayrollRecord[],
  period: string,
  vptMap: VPTEnrichmentMap,
  existingVersion = 0,
): VPTEnrichedSalaryReport {
  // Build base register first
  const baseReport = generateSalaryRegisterData(
    records.map(r => ({
      employeeId: r.employeeId,
      gender: r.gender,
      groupOrCategory: r.groupOrCategory,
      concept: r.concept,
      amount: r.amount,
    })),
    period,
    existingVersion,
  );

  // Build employee → positionId map
  const empPositionMap = new Map<string, string>();
  for (const r of records) {
    if (r.positionId) empPositionMap.set(r.employeeId, r.positionId);
  }

  // Build group → employees map for VPT score lookup
  const groupEmployees = new Map<string, Set<string>>();
  for (const r of records) {
    const key = `${r.groupOrCategory}|||${r.concept}`;
    if (!groupEmployees.has(key)) groupEmployees.set(key, new Set());
    groupEmployees.get(key)!.add(r.employeeId);
  }

  // Enrich entries with average VPT score for the group
  const enrichedEntries: VPTEnrichedSalaryEntry[] = baseReport.entries.map(entry => {
    const key = `${entry.groupOrCategory}|||${entry.concept}`;
    const employees = groupEmployees.get(key);
    const scores: number[] = [];
    if (employees) {
      for (const empId of employees) {
        const posId = empPositionMap.get(empId);
        if (posId && vptMap[posId] != null) {
          scores.push(vptMap[posId]);
        }
      }
    }
    const avgScore = scores.length > 0
      ? scores.reduce((s, v) => s + v, 0) / scores.length
      : null;

    return {
      ...entry,
      vptScore: avgScore != null ? Math.round(avgScore * 100) / 100 : null,
      vptBandLabel: avgScore != null ? scoreToVPTBand(avgScore) : null,
    };
  });

  // Aggregate by VPT band
  const bandAgg = new Map<VPTBandLabel, { maleAmounts: number[]; femaleAmounts: number[] }>();
  for (const r of records) {
    const posId = r.positionId ? r.positionId : undefined;
    if (!posId || vptMap[posId] == null) continue;
    const band = scoreToVPTBand(vptMap[posId]);
    if (!bandAgg.has(band)) bandAgg.set(band, { maleAmounts: [], femaleAmounts: [] });
    const agg = bandAgg.get(band)!;
    if (r.gender === 'M') agg.maleAmounts.push(r.amount);
    else if (r.gender === 'F') agg.femaleAmounts.push(r.amount);
  }

  const byVPTBand: VPTBandGroupSummary[] = (['Q1 (0-25)', 'Q2 (25-50)', 'Q3 (50-75)', 'Q4 (75-100)'] as VPTBandLabel[])
    .map(band => {
      const agg = bandAgg.get(band);
      const maleMean = agg && agg.maleAmounts.length > 0
        ? agg.maleAmounts.reduce((s, v) => s + v, 0) / agg.maleAmounts.length : 0;
      const femaleMean = agg && agg.femaleAmounts.length > 0
        ? agg.femaleAmounts.reduce((s, v) => s + v, 0) / agg.femaleAmounts.length : 0;
      const ref = Math.max(maleMean, femaleMean);
      return {
        band,
        maleCount: agg?.maleAmounts.length ?? 0,
        femaleCount: agg?.femaleAmounts.length ?? 0,
        maleMeanSalary: maleMean,
        femaleMeanSalary: femaleMean,
        gapPercent: ref > 0 ? Math.abs(maleMean - femaleMean) / ref : 0,
      };
    })
    .filter(b => b.maleCount > 0 || b.femaleCount > 0);

  return {
    ...baseReport,
    entries: enrichedEntries,
    byVPTBand,
  };
}

// ─── Retributive Audit (S9.4) ──────────────────────────────

/** Maximum portion of a gap that can be "contextualized" by VPT. Prevents false objectivity. */
const VPT_CONTEXT_CAP = 0.80;

/** Threshold for VPT score difference to be considered "significant" */
const VPT_SCORE_DIVERGENCE_THRESHOLD = 15;

export interface AuditEmployeeRecord {
  employeeId: string;
  gender: 'M' | 'F' | string;
  groupOrCategory: string;
  salary: number;
  positionId?: string | null;
}

/**
 * Computes a retributive audit report that contextualizes salary gaps using VPT scores.
 * 
 * Methodology:
 * - Groups employees by professional category
 * - For each group, computes M/F salary gap
 * - If VPT scores differ significantly between M/F average positions,
 *   a portion of the gap is marked as "partially contextualized"
 * - The contextualized portion NEVER exceeds 80% (VPT_CONTEXT_CAP)
 * - VPT contextualizes, it never justifies
 */
export function computeRetributiveAudit(
  employees: AuditEmployeeRecord[],
  vptMap: VPTEnrichmentMap,
  period: string,
  existingVersion = 0,
): RetributiveAuditReport {
  // Group by category
  const groups = new Map<string, { males: Array<{ salary: number; vpt: number | null }>; females: Array<{ salary: number; vpt: number | null }> }>();

  for (const emp of employees) {
    const gender = emp.gender === 'F' ? 'F' : 'M';
    const vpt = emp.positionId && vptMap[emp.positionId] != null ? vptMap[emp.positionId] : null;
    if (!groups.has(emp.groupOrCategory)) groups.set(emp.groupOrCategory, { males: [], females: [] });
    const g = groups.get(emp.groupOrCategory)!;
    const entry = { salary: emp.salary, vpt };
    if (gender === 'M') g.males.push(entry);
    else g.females.push(entry);
  }

  const entries: RetributiveAuditEntry[] = [];
  let totalWeightedGap = 0;
  let totalWeightedContextualized = 0;
  let totalWeightedUnexplained = 0;
  let totalEmployees = 0;
  let groupsWithAlert = 0;

  for (const [groupKey, g] of groups) {
    if (g.males.length === 0 || g.females.length === 0) {
      // Single-gender group: no gap calculable
      entries.push({
        groupKey,
        groupLabel: groupKey,
        maleCount: g.males.length,
        femaleCount: g.females.length,
        maleMeanSalary: g.males.length > 0 ? g.males.reduce((s, e) => s + e.salary, 0) / g.males.length : 0,
        femaleMeanSalary: g.females.length > 0 ? g.females.reduce((s, e) => s + e.salary, 0) / g.females.length : 0,
        totalGapPercent: 0,
        maleAvgVPT: avgVPT(g.males.map(e => e.vpt)),
        femaleAvgVPT: avgVPT(g.females.map(e => e.vpt)),
        gapContextualizedByVPT: 0,
        gapUnexplained: 0,
        alerts: [],
      });
      continue;
    }

    const maleMean = g.males.reduce((s, e) => s + e.salary, 0) / g.males.length;
    const femaleMean = g.females.reduce((s, e) => s + e.salary, 0) / g.females.length;
    const ref = Math.max(maleMean, femaleMean);
    const totalGap = ref > 0 ? Math.abs(maleMean - femaleMean) / ref : 0;

    const maleVPT = avgVPT(g.males.map(e => e.vpt));
    const femaleVPT = avgVPT(g.females.map(e => e.vpt));

    // Compute contextualization
    let contextualized = 0;
    if (maleVPT != null && femaleVPT != null && totalGap > 0) {
      const vptDiff = Math.abs(maleVPT - femaleVPT);
      if (vptDiff >= VPT_SCORE_DIVERGENCE_THRESHOLD) {
        // VPT scores diverge significantly — partial contextualization proportional to divergence
        // Scale: 15pts diff → ~30% contextualization, 50pts → ~80% (capped)
        const rawContextPortion = Math.min(vptDiff / 60, VPT_CONTEXT_CAP);
        contextualized = totalGap * rawContextPortion;
      }
      // If VPT scores are similar (< threshold), the gap is NOT explained by position differences
    }

    // Enforce cap
    contextualized = Math.min(contextualized, totalGap * VPT_CONTEXT_CAP);
    const unexplained = totalGap - contextualized;

    const alerts: RetributiveAuditAlert[] = [];
    if (totalGap >= 0.25) {
      groupsWithAlert++;
      alerts.push({
        level: totalGap >= 0.40 ? 'critical' : 'warning',
        message: `Brecha del ${(totalGap * 100).toFixed(1)}% en ${groupKey}` +
          (contextualized > 0
            ? ` (${(contextualized / totalGap * 100).toFixed(0)}% parcialmente contextualizada por VPT)`
            : ' (sin contextualización VPT disponible)'),
      });
    }

    const groupSize = g.males.length + g.females.length;
    totalWeightedGap += totalGap * groupSize;
    totalWeightedContextualized += contextualized * groupSize;
    totalWeightedUnexplained += unexplained * groupSize;
    totalEmployees += groupSize;

    entries.push({
      groupKey,
      groupLabel: groupKey,
      maleCount: g.males.length,
      femaleCount: g.females.length,
      maleMeanSalary: maleMean,
      femaleMeanSalary: femaleMean,
      totalGapPercent: totalGap,
      maleAvgVPT: maleVPT,
      femaleAvgVPT: femaleVPT,
      gapContextualizedByVPT: contextualized,
      gapUnexplained: unexplained,
      alerts,
    });
  }

  const globalGap = totalEmployees > 0 ? totalWeightedGap / totalEmployees : 0;
  const globalContextualized = totalEmployees > 0 ? totalWeightedContextualized / totalEmployees : 0;
  const globalUnexplained = totalEmployees > 0 ? totalWeightedUnexplained / totalEmployees : 0;

  return {
    period,
    generatedAt: new Date().toISOString(),
    entries,
    globalGapPercent: globalGap,
    globalContextualizedPercent: globalContextualized,
    globalUnexplainedPercent: globalUnexplained,
    groupsWithAlert,
    disclaimer: RETRIBUTIVE_AUDIT_DISCLAIMER,
    version: existingVersion + 1,
  };
}

function avgVPT(scores: Array<number | null>): number | null {
  const valid = scores.filter((s): s is number => s != null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 100) / 100;
}

// ─── Equity VPT Context (S9.5) ─────────────────────────────

export interface EquityVPTInput {
  employeeId: string;
  gender: 'M' | 'F' | string;
  positionId?: string | null;
}

/**
 * Computes descriptive VPT context for equity analysis.
 * This NEVER modifies the pay gap — it only provides complementary position valuation info.
 * VPT is a contextual variable, not a justificative one.
 */
export function computeEquityVPTContext(
  employees: EquityVPTInput[],
  vptMap: VPTEnrichmentMap,
): EquityVPTContext {
  const uniquePositions = new Set(employees.map(e => e.positionId).filter(Boolean));
  const totalPositions = uniquePositions.size;
  const positionsValued = [...uniquePositions].filter(p => p != null && vptMap[p] != null).length;

  if (totalPositions === 0 || positionsValued === 0) {
    return {
      vptContextAvailable: false,
      vptCoverage: 0,
      positionsValued: 0,
      totalPositions,
      avgScoreMale: null,
      avgScoreFemale: null,
      scoreDifference: null,
      divergenceRelevant: false,
      insight: null,
      disclaimer: VPT_CONTEXT_DISCLAIMER,
    };
  }

  const employeesWithVPT = employees.filter(e => e.positionId && vptMap[e.positionId] != null);
  const vptCoverage = employees.length > 0 ? employeesWithVPT.length / employees.length : 0;

  const maleScores = employeesWithVPT
    .filter(e => e.gender === 'M' || e.gender === 'male')
    .map(e => vptMap[e.positionId!]);
  const femaleScores = employeesWithVPT
    .filter(e => e.gender === 'F' || e.gender === 'female')
    .map(e => vptMap[e.positionId!]);

  const avgMale = maleScores.length > 0
    ? Math.round((maleScores.reduce((s, v) => s + v, 0) / maleScores.length) * 100) / 100
    : null;
  const avgFemale = femaleScores.length > 0
    ? Math.round((femaleScores.reduce((s, v) => s + v, 0) / femaleScores.length) * 100) / 100
    : null;

  const scoreDiff = avgMale != null && avgFemale != null
    ? Math.round(Math.abs(avgMale - avgFemale) * 100) / 100
    : null;
  const divergenceRelevant = scoreDiff != null && scoreDiff >= VPT_SCORE_DIVERGENCE_THRESHOLD;

  let insight: string | null = null;
  if (avgMale != null && avgFemale != null) {
    if (divergenceRelevant) {
      const higher = avgMale > avgFemale ? 'masculino' : 'femenino';
      insight = `Los puestos ocupados por el grupo ${higher} tienen un score VPT medio ${scoreDiff!.toFixed(1)} puntos superior. ` +
        `Esta diferencia podría ser relevante como contexto complementario, pero no constituye explicación de brechas salariales.`;
    } else {
      insight = `Los scores VPT medios entre grupos de género son similares (diferencia de ${scoreDiff!.toFixed(1)} puntos). ` +
        `Esto indica que las diferencias salariales observadas no están asociadas a diferencias en la valoración de puestos.`;
    }
  }

  return {
    vptContextAvailable: true,
    vptCoverage: Math.round(vptCoverage * 10000) / 10000,
    positionsValued,
    totalPositions,
    avgScoreMale: avgMale,
    avgScoreFemale: avgFemale,
    scoreDifference: scoreDiff,
    divergenceRelevant,
    insight,
    disclaimer: VPT_CONTEXT_DISCLAIMER,
  };
}

// ─── Fairness VPT Summary (S9.5) ───────────────────────────

/**
 * Computes a complementary VPT summary for the Fairness Engine.
 * Purely informational — does not alter any fairness analysis or AI output.
 */
export function computeFairnessVPTSummary(
  employees: EquityVPTInput[],
  vptMap: VPTEnrichmentMap,
  /** Optional: current gender pay gap percentage (for alert contextualization) */
  currentGapPercent?: number,
): FairnessVPTSummary {
  const uniquePositions = new Set(employees.map(e => e.positionId).filter(Boolean));
  const totalPositions = uniquePositions.size;
  const positionsValued = [...uniquePositions].filter(p => p != null && vptMap[p] != null).length;

  if (totalPositions === 0 || positionsValued === 0) {
    return {
      available: false,
      coverageRatio: 0,
      positionsValued: 0,
      totalPositions,
      avgScoreMale: null,
      avgScoreFemale: null,
      scoreDifference: null,
      divergenceAlert: null,
      disclaimer: VPT_CONTEXT_DISCLAIMER,
    };
  }

  const employeesWithVPT = employees.filter(e => e.positionId && vptMap[e.positionId] != null);
  const coverageRatio = employees.length > 0 ? employeesWithVPT.length / employees.length : 0;

  const maleScores = employeesWithVPT
    .filter(e => e.gender === 'M' || e.gender === 'male')
    .map(e => vptMap[e.positionId!]);
  const femaleScores = employeesWithVPT
    .filter(e => e.gender === 'F' || e.gender === 'female')
    .map(e => vptMap[e.positionId!]);

  const avgMale = maleScores.length > 0
    ? Math.round((maleScores.reduce((s, v) => s + v, 0) / maleScores.length) * 100) / 100
    : null;
  const avgFemale = femaleScores.length > 0
    ? Math.round((femaleScores.reduce((s, v) => s + v, 0) / femaleScores.length) * 100) / 100
    : null;

  const scoreDiff = avgMale != null && avgFemale != null
    ? Math.round(Math.abs(avgMale - avgFemale) * 100) / 100
    : null;

  let divergenceAlert: FairnessVPTAlert | null = null;
  if (scoreDiff != null && scoreDiff >= VPT_SCORE_DIVERGENCE_THRESHOLD) {
    const hasGap = currentGapPercent != null && Math.abs(currentGapPercent) > 5;
    if (hasGap) {
      divergenceAlert = {
        level: 'warning',
        message: `Divergencia relevante de ${scoreDiff.toFixed(1)} puntos en scores VPT entre grupos de género, ` +
          `coincidente con una brecha salarial del ${Math.abs(currentGapPercent!).toFixed(1)}%. ` +
          `Requiere análisis individualizado — la diferencia de VPT no constituye explicación automática.`,
      };
    } else {
      divergenceAlert = {
        level: 'info',
        message: `Diferencia de ${scoreDiff.toFixed(1)} puntos en scores VPT entre grupos de género, ` +
          `sin brecha salarial significativa asociada.`,
      };
    }
  }

  return {
    available: true,
    coverageRatio: Math.round(coverageRatio * 10000) / 10000,
    positionsValued,
    totalPositions,
    avgScoreMale: avgMale,
    avgScoreFemale: avgFemale,
    scoreDifference: scoreDiff,
    divergenceAlert,
    disclaimer: VPT_CONTEXT_DISCLAIMER,
  };
}

// ─── Retributive Executive Summary (S9.6) ──────────────────

/**
 * Generates a deterministic executive summary from a retributive audit report.
 * NO AI involved — pure template-based text generation.
 * Language is strictly observational, never conclusive or justificative.
 */
export function generateRetributiveExecutiveSummary(
  report: RetributiveAuditReport,
): RetributiveExecutiveSummary {
  const sentences: string[] = [];

  // 1. Period and scope
  sentences.push(
    `En el período ${report.period}, se observa una brecha retributiva global del ${(report.globalGapPercent * 100).toFixed(1)}% ` +
    `sobre ${report.entries.length} grupo(s) profesional(es) analizados.`
  );

  // 2. VPT contextualization
  if (report.globalGapPercent > 0 && report.globalContextualizedPercent > 0) {
    const ctxPct = (report.globalContextualizedPercent / report.globalGapPercent * 100).toFixed(0);
    sentences.push(
      `Un ${ctxPct}% de esta brecha está parcialmente contextualizada por diferencias en la valoración de puestos de trabajo.`
    );
  } else if (report.globalGapPercent > 0) {
    sentences.push(
      `No se dispone de datos de valoración de puestos suficientes para contextualizar la brecha observada.`
    );
  }

  // 3. Unexplained portion
  if (report.globalUnexplainedPercent > 0) {
    sentences.push(
      `El ${(report.globalUnexplainedPercent * 100).toFixed(1)}% de brecha no contextualizada requiere análisis individualizado conforme al RD 902/2020.`
    );
  }

  // 4. Alert groups
  if (report.groupsWithAlert > 0) {
    sentences.push(
      `Se identifican ${report.groupsWithAlert} grupo(s) con brechas superiores al 25%, que requieren atención prioritaria.`
    );
  } else if (report.entries.length > 0) {
    sentences.push(
      `Ningún grupo profesional presenta brechas superiores al umbral de alerta del 25%.`
    );
  }

  return {
    sentences,
    disclaimer: EXECUTIVE_SUMMARY_DISCLAIMER,
    period: report.period,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Executive Summary Data (S9.9) ─────────────────────────

import type { S9ExecutiveSummaryData } from '@/types/s9-compliance';
import { S9_EXECUTIVE_DISCLAIMER } from '@/types/s9-compliance';

export interface ExecutiveSummaryInput {
  period: string;
  /** From useS9RetributiveAudit */
  audit: {
    globalGapPercent: number | null;
    groupsWithAlert: number;
    entries: number;
  } | null;
  /** From useS9VPT analytics */
  vpt: {
    positionsValued: number;
    totalPositions: number;
    incoherenceCount: number;
    latestApproval: string | null;
  } | null;
  /** From useS9SalaryRegister */
  salaryRegister: {
    employeeCount: number;
    hasVPTData: boolean;
  } | null;
}

/**
 * Composes executive summary data from existing hook outputs.
 * Pure, deterministic, no AI. Observational language only.
 */
export function generateExecutivePDFData(input: ExecutiveSummaryInput): S9ExecutiveSummaryData {
  const { period, audit, vpt, salaryRegister } = input;

  const valued = vpt?.positionsValued ?? 0;
  const total = vpt?.totalPositions ?? 0;
  const ratio = total > 0 ? valued / total : 0;

  const globalGap = audit?.globalGapPercent ?? null;
  const incoherenceCount = vpt?.incoherenceCount ?? 0;
  const srCoverage = salaryRegister?.employeeCount ?? 0;
  const latestApproval = vpt?.latestApproval ?? null;

  // Determine readiness
  const hasAudit = audit != null && audit.entries > 0;
  const hasVPT = valued > 0;
  const hasSR = srCoverage > 0;
  let readiness: 'internal_ready' | 'preparatory' | 'partial_controlled' = 'preparatory';
  if (hasAudit && hasVPT && hasSR) readiness = 'internal_ready';
  else if (hasAudit || hasVPT || hasSR) readiness = 'partial_controlled';

  // Build deterministic sentences
  const sentences: string[] = [];

  sentences.push(
    `Periodo analizado: ${period}. ` +
    `Cobertura VPT: ${valued} de ${total} posiciones valoradas (${(ratio * 100).toFixed(0)}%).`
  );

  if (globalGap != null) {
    sentences.push(
      `Brecha retributiva bruta global observada: ${(globalGap * 100).toFixed(1)}%.`
    );
  } else {
    sentences.push('No se dispone de datos suficientes para calcular la brecha retributiva global.');
  }

  if (incoherenceCount > 0) {
    sentences.push(`Se detectan ${incoherenceCount} incoherencia(s) en la valoracion de puestos.`);
  }

  if (srCoverage > 0) {
    sentences.push(`Registro retributivo: ${srCoverage} empleados cubiertos en el periodo.`);
  }

  if (audit?.groupsWithAlert && audit.groupsWithAlert > 0) {
    sentences.push(
      `${audit.groupsWithAlert} grupo(s) profesional(es) con brecha superior al 25% requieren atencion prioritaria.`
    );
  }

  return {
    period,
    generatedAt: new Date().toISOString(),
    vptCoverage: { valued, total, ratio },
    globalGapPercent: globalGap,
    vptIncoherenceCount: incoherenceCount,
    salaryRegisterCoverage: srCoverage,
    latestVPTApproval: latestApproval,
    readiness,
    disclaimer: S9_EXECUTIVE_DISCLAIMER,
    sentences,
  };
}

// ─── CSV Export (S9.6) ─────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports a retributive audit report to CSV string.
 * Faithful serialization — no interpretation or recomputation.
 */
export function exportRetributiveAuditCSV(
  report: RetributiveAuditReport,
): string {
  const lines: string[] = [];

  // Disclaimer header
  lines.push(escapeCSV(`# ${EXECUTIVE_SUMMARY_DISCLAIMER}`));
  lines.push(escapeCSV(`# Período: ${report.period} | Generado: ${report.generatedAt}`));
  lines.push('');

  // Column headers
  lines.push([
    'Grupo', 'H', 'M', 'Media H (€)', 'Media M (€)', 'Brecha (%)',
    'VPT H', 'VPT M', 'Contextualizada (%)', 'No explicada (%)',
  ].map(escapeCSV).join(','));

  // Data rows
  for (const e of report.entries) {
    lines.push([
      e.groupLabel,
      e.maleCount,
      e.femaleCount,
      e.maleMeanSalary.toFixed(2),
      e.femaleMeanSalary.toFixed(2),
      (e.totalGapPercent * 100).toFixed(1),
      e.maleAvgVPT != null ? e.maleAvgVPT.toFixed(1) : '',
      e.femaleAvgVPT != null ? e.femaleAvgVPT.toFixed(1) : '',
      (e.gapContextualizedByVPT * 100).toFixed(1),
      (e.gapUnexplained * 100).toFixed(1),
    ].map(escapeCSV).join(','));
  }

  // Global totals
  lines.push('');
  lines.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    (report.globalGapPercent * 100).toFixed(1),
    '',
    '',
    (report.globalContextualizedPercent * 100).toFixed(1),
    (report.globalUnexplainedPercent * 100).toFixed(1),
  ].map(escapeCSV).join(','));

  return lines.join('\n');
}

/**
 * Exports VPT-enriched salary register to CSV string.
 */
export function exportSalaryRegisterVPTCSV(
  report: VPTEnrichedSalaryReport,
): string {
  const lines: string[] = [];

  // Disclaimer
  lines.push(escapeCSV(`# ${EXECUTIVE_SUMMARY_DISCLAIMER}`));
  lines.push(escapeCSV(`# Período: ${report.period} | Generado: ${report.generatedAt}`));
  lines.push('');

  // Headers
  lines.push([
    'Grupo', 'Concepto', 'H', 'M', 'Media H (€)', 'Media M (€)',
    'Mediana H (€)', 'Mediana M (€)', 'Brecha (%)', 'VPT Score', 'Banda VPT',
  ].map(escapeCSV).join(','));

  // Data
  for (const e of report.entries) {
    lines.push([
      e.groupOrCategory,
      e.concept,
      e.maleCount,
      e.femaleCount,
      e.maleMean.toFixed(2),
      e.femaleMean.toFixed(2),
      e.maleMedian.toFixed(2),
      e.femaleMedian.toFixed(2),
      (e.gapPercent * 100).toFixed(1),
      e.vptScore != null ? e.vptScore.toFixed(1) : '',
      e.vptBandLabel ?? '',
    ].map(escapeCSV).join(','));
  }

  // Band summary
  if (report.byVPTBand.length > 0) {
    lines.push('');
    lines.push('# Resumen por Banda VPT');
    lines.push(['Banda', 'H', 'M', 'Media H (€)', 'Media M (€)', 'Brecha (%)'].map(escapeCSV).join(','));
    for (const b of report.byVPTBand) {
      lines.push([
        b.band,
        b.maleCount,
        b.femaleCount,
        b.maleMeanSalary.toFixed(2),
        b.femaleMeanSalary.toFixed(2),
        (b.gapPercent * 100).toFixed(1),
      ].map(escapeCSV).join(','));
    }
  }

  return lines.join('\n');
}
