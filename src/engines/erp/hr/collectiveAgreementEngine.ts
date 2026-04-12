/**
 * collectiveAgreementEngine.ts — Motor de Convenios Colectivos (C1)
 * 
 * Interpreta y aplica convenios colectivos a nivel operativo:
 *   - Salario base y pluses por grupo/nivel
 *   - Jornada máxima semanal/anual
 *   - Vacaciones y permisos adicionales
 *   - Pagas extraordinarias
 *   - Complementos de antigüedad
 *   - Plus nocturnidad / turnicidad
 *   - Obligaciones sindicales
 * 
 * Toda resolución lleva trazabilidad de artículo/tabla y nivel de confianza.
 * 
 * DISCLAIMER: Este motor NO sustituye la lectura directa del convenio
 * publicado en el BOE/BOPA. Los resultados de IA son sugerencias pendientes
 * de validación humana.
 */

// ── Confidence Levels ──

export type DataConfidence = 'confirmed' | 'ai_suggested' | 'pending_validation';

export interface TraceEntry {
  field: string;
  value: string | number;
  source: string;          // e.g. "Art. 32 Convenio Metal Estatal"
  sourceType: 'agreement_table' | 'agreement_field' | 'ai_interpretation' | 'legal_default' | 'user_override';
  confidence: DataConfidence;
  notes?: string;
  timestamp: string;
}

// ── Agreement Rule Types ──

export interface AgreementWorkingConditions {
  weeklyHours: number | null;
  annualHours: number | null;
  vacationDays: number;
  extraPayments: number;
  trialPeriodDays: Record<string, number>;
  nightShiftBonus: NightShiftConfig | null;
  seniorityRules: SeniorityConfig | null;
  additionalPermits: AdditionalPermit[];
  unionObligations: string[];
}

export interface NightShiftConfig {
  percentageIncrease: number;
  startHour: number;
  endHour: number;
  source: string;
}

export interface SeniorityConfig {
  type: 'trienios' | 'quinquenios' | 'fixed' | 'percentage';
  amountPerPeriod: number;
  maxPeriods: number | null;
  isPercentage: boolean;
  source: string;
}

export interface AdditionalPermit {
  name: string;
  days: number;
  isPaid: boolean;
  conditions: string;
  source: string;
}

export interface SalaryTableRow {
  professionalGroup: string;
  groupDescription: string | null;
  level: string;
  baseSalaryMonthly: number;
  baseSalaryAnnual: number | null;
  plusConvenioMonthly: number;
  extraPayAmount: number | null;
  totalAnnual: number | null;
}

// ── Conflict Detection ──

export interface AgreementConflict {
  id: string;
  area: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  currentValue: string;
  agreementValue: string;
  recommendation: string;
  legalReference: string;
}

// ── Full Resolution Result ──

export interface AgreementResolution {
  agreementId: string;
  agreementCode: string;
  agreementName: string;
  effectiveDate: string;
  expirationDate: string | null;
  isExpired: boolean;
  workingConditions: AgreementWorkingConditions;
  salaryTable: SalaryTableRow[];
  conflicts: AgreementConflict[];
  trace: TraceEntry[];
  overallConfidence: DataConfidence;
  resolvedAt: string;
  disclaimer: string;
}

// ── Raw DB shapes ──

export interface RawCollectiveAgreement {
  id: string;
  code: string;
  name: string;
  effective_date: string;
  expiration_date: string | null;
  is_active: boolean | null;
  working_hours_week: number | null;
  vacation_days: number | null;
  extra_payments: number | null;
  seniority_rules: Record<string, unknown> | null;
  night_shift_bonus: Record<string, unknown> | null;
  other_concepts: Record<string, unknown> | null;
  union_obligations: Record<string, unknown> | null;
  salary_tables: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  source_url: string | null;
}

export interface RawSalaryTableEntry {
  professional_group: string;
  professional_group_description: string | null;
  level: string;
  base_salary_monthly: number;
  base_salary_annual: number | null;
  plus_convenio_monthly: number | null;
  extra_pay_amount: number | null;
  total_annual_compensation: number | null;
}

// ── Constants ──

const LEGAL_DEFAULTS = {
  weeklyHours: 40,
  vacationDays: 30,       // Art. 38.1 ET — 30 días naturales
  extraPayments: 2,       // Art. 31 ET — mínimo dos gratificaciones extraordinarias
  trialPeriodTecnico: 180, // Art. 14 ET — máx 6 meses para técnicos titulados
  trialPeriodOtros: 60,    // Art. 14 ET — máx 2 meses resto
};

export const AGREEMENT_DISCLAIMER =
  'Este análisis es orientativo y NO sustituye la lectura directa del convenio colectivo ' +
  'publicado en el BOE o boletín oficial correspondiente. Las interpretaciones marcadas como ' +
  '"sugerido por IA" requieren validación humana antes de su aplicación operativa. ' +
  'Consulte con su asesor laboral para decisiones vinculantes.';

// ── Engine Functions ──

function ts(): string {
  return new Date().toISOString();
}

/**
 * Parse seniority rules from raw JSON
 */
export function parseSeniorityRules(raw: Record<string, unknown> | null): SeniorityConfig | null {
  if (!raw) return null;
  const type = (raw.type as string) || 'trienios';
  return {
    type: type as SeniorityConfig['type'],
    amountPerPeriod: Number(raw.amount_per_period || raw.amountPerPeriod || 0),
    maxPeriods: raw.max_periods != null ? Number(raw.max_periods) : null,
    isPercentage: Boolean(raw.is_percentage || raw.isPercentage),
    source: (raw.source as string) || 'Convenio colectivo',
  };
}

/**
 * Parse night shift bonus config
 */
export function parseNightShiftBonus(raw: Record<string, unknown> | null): NightShiftConfig | null {
  if (!raw) return null;
  return {
    percentageIncrease: Number(raw.percentage || raw.percentageIncrease || 25),
    startHour: Number(raw.start_hour || raw.startHour || 22),
    endHour: Number(raw.end_hour || raw.endHour || 6),
    source: (raw.source as string) || 'Convenio colectivo',
  };
}

/**
 * Parse additional permits from other_concepts
 */
export function parseAdditionalPermits(raw: Record<string, unknown> | null): AdditionalPermit[] {
  if (!raw) return [];
  const permits = raw.permits || raw.permisos;
  if (!Array.isArray(permits)) return [];
  return permits.map((p: Record<string, unknown>) => ({
    name: String(p.name || p.nombre || ''),
    days: Number(p.days || p.dias || 0),
    isPaid: p.paid !== false && p.retribuido !== false,
    conditions: String(p.conditions || p.condiciones || ''),
    source: String(p.source || p.fuente || 'Convenio colectivo'),
  }));
}

/**
 * Parse union obligations
 */
export function parseUnionObligations(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [];
  const obligations = raw.obligations || raw.obligaciones;
  if (Array.isArray(obligations)) return obligations.map(String);
  return [];
}

/**
 * Resolve working conditions from raw agreement
 */
export function resolveWorkingConditions(
  agreement: RawCollectiveAgreement
): { conditions: AgreementWorkingConditions; trace: TraceEntry[] } {
  const trace: TraceEntry[] = [];
  const now = ts();

  // Weekly hours
  const weeklyHours = agreement.working_hours_week;
  trace.push({
    field: 'jornada_semanal',
    value: weeklyHours ?? LEGAL_DEFAULTS.weeklyHours,
    source: weeklyHours ? `Convenio ${agreement.code}` : 'ET Art. 34.1 — Máximo legal',
    sourceType: weeklyHours ? 'agreement_field' : 'legal_default',
    confidence: weeklyHours ? 'confirmed' : 'pending_validation',
    timestamp: now,
  });

  // Annual hours (derived if not explicit)
  const annualHours = weeklyHours ? Math.round(weeklyHours * 52 - (weeklyHours / 5 * (agreement.vacation_days || 22))) : null;

  // Vacation days
  const vacationDays = agreement.vacation_days ?? LEGAL_DEFAULTS.vacationDays;
  trace.push({
    field: 'vacaciones_dias',
    value: vacationDays,
    source: agreement.vacation_days ? `Convenio ${agreement.code}` : 'ET Art. 38.1 — 30 días naturales',
    sourceType: agreement.vacation_days ? 'agreement_field' : 'legal_default',
    confidence: agreement.vacation_days ? 'confirmed' : 'confirmed', // legal default is also confirmed
    timestamp: now,
  });

  // Extra payments
  const extraPayments = agreement.extra_payments ?? LEGAL_DEFAULTS.extraPayments;
  trace.push({
    field: 'pagas_extraordinarias',
    value: extraPayments,
    source: agreement.extra_payments ? `Convenio ${agreement.code}` : 'ET Art. 31 — Mínimo 2',
    sourceType: agreement.extra_payments ? 'agreement_field' : 'legal_default',
    confidence: 'confirmed',
    timestamp: now,
  });

  // Seniority
  const seniorityRules = parseSeniorityRules(agreement.seniority_rules);
  if (seniorityRules) {
    trace.push({
      field: 'antigüedad',
      value: `${seniorityRules.type} — ${seniorityRules.amountPerPeriod}${seniorityRules.isPercentage ? '%' : '€'}`,
      source: seniorityRules.source,
      sourceType: 'agreement_field',
      confidence: 'confirmed',
      timestamp: now,
    });
  }

  // Night shift
  const nightShiftBonus = parseNightShiftBonus(agreement.night_shift_bonus);
  if (nightShiftBonus) {
    trace.push({
      field: 'plus_nocturnidad',
      value: `${nightShiftBonus.percentageIncrease}% (${nightShiftBonus.startHour}h-${nightShiftBonus.endHour}h)`,
      source: nightShiftBonus.source,
      sourceType: 'agreement_field',
      confidence: 'confirmed',
      timestamp: now,
    });
  }

  // Permits
  const additionalPermits = parseAdditionalPermits(agreement.other_concepts);

  // Union
  const unionObligations = parseUnionObligations(agreement.union_obligations);

  // Trial periods — legal defaults unless overridden in metadata
  const meta = agreement.metadata || {};
  const trialPeriodDays: Record<string, number> = {
    tecnico_titulado: Number((meta as any).trial_period_tecnico || LEGAL_DEFAULTS.trialPeriodTecnico),
    otros: Number((meta as any).trial_period_otros || LEGAL_DEFAULTS.trialPeriodOtros),
  };

  return {
    conditions: {
      weeklyHours: weeklyHours ?? LEGAL_DEFAULTS.weeklyHours,
      annualHours,
      vacationDays,
      extraPayments,
      trialPeriodDays,
      nightShiftBonus,
      seniorityRules,
      additionalPermits,
      unionObligations,
    },
    trace,
  };
}

/**
 * Convert raw salary table entries to structured rows
 */
export function normalizeSalaryTable(rows: RawSalaryTableEntry[]): SalaryTableRow[] {
  return rows.map(r => ({
    professionalGroup: r.professional_group,
    groupDescription: r.professional_group_description,
    level: r.level || '',
    baseSalaryMonthly: Number(r.base_salary_monthly),
    baseSalaryAnnual: r.base_salary_annual ? Number(r.base_salary_annual) : null,
    plusConvenioMonthly: Number(r.plus_convenio_monthly || 0),
    extraPayAmount: r.extra_pay_amount ? Number(r.extra_pay_amount) : null,
    totalAnnual: r.total_annual_compensation ? Number(r.total_annual_compensation) : null,
  }));
}

/**
 * Detect conflicts between agreement rules and employee/company data
 */
export function detectConflicts(
  conditions: AgreementWorkingConditions,
  employeeData: {
    weeklyHours?: number;
    vacationDays?: number;
    baseSalaryMonthly?: number;
    professionalGroup?: string;
  },
  salaryTable: SalaryTableRow[],
): AgreementConflict[] {
  const conflicts: AgreementConflict[] = [];
  let idx = 0;

  // Hours conflict
  if (employeeData.weeklyHours && conditions.weeklyHours) {
    if (employeeData.weeklyHours > conditions.weeklyHours) {
      conflicts.push({
        id: `conflict-${idx++}`,
        area: 'Jornada laboral',
        description: 'La jornada del empleado supera el máximo del convenio.',
        severity: 'critical',
        currentValue: `${employeeData.weeklyHours}h/semana`,
        agreementValue: `${conditions.weeklyHours}h/semana`,
        recommendation: 'Revisar jornada pactada y ajustar al límite del convenio.',
        legalReference: 'ET Art. 34 — Jornada máxima',
      });
    }
  }

  // Vacation conflict
  if (employeeData.vacationDays != null && employeeData.vacationDays < conditions.vacationDays) {
    conflicts.push({
      id: `conflict-${idx++}`,
      area: 'Vacaciones',
      description: 'Los días de vacaciones del empleado son inferiores al mínimo del convenio.',
      severity: 'critical',
      currentValue: `${employeeData.vacationDays} días`,
      agreementValue: `${conditions.vacationDays} días`,
      recommendation: 'Ajustar los días de vacaciones al mínimo establecido.',
      legalReference: 'ET Art. 38 — Vacaciones anuales',
    });
  }

  // Salary below convention minimum
  if (employeeData.baseSalaryMonthly && employeeData.professionalGroup) {
    const row = salaryTable.find(r => r.professionalGroup === employeeData.professionalGroup);
    if (row && employeeData.baseSalaryMonthly < row.baseSalaryMonthly) {
      conflicts.push({
        id: `conflict-${idx++}`,
        area: 'Salario base',
        description: 'El salario base es inferior al mínimo de convenio para su grupo profesional.',
        severity: 'critical',
        currentValue: `${employeeData.baseSalaryMonthly.toFixed(2)}€/mes`,
        agreementValue: `${row.baseSalaryMonthly.toFixed(2)}€/mes`,
        recommendation: 'Incrementar salario base al mínimo del convenio. Riesgo de sanción por Inspección.',
        legalReference: 'ET Art. 26.5 — Estructura del salario',
      });
    }
  }

  return conflicts;
}

/**
 * Full resolution: takes raw agreement + salary rows + optional employee data
 * and produces a complete AgreementResolution with traceability.
 */
export function resolveAgreement(
  agreement: RawCollectiveAgreement,
  rawSalaryRows: RawSalaryTableEntry[],
  employeeData?: {
    weeklyHours?: number;
    vacationDays?: number;
    baseSalaryMonthly?: number;
    professionalGroup?: string;
  },
): AgreementResolution {
  const { conditions, trace } = resolveWorkingConditions(agreement);
  const salaryTable = normalizeSalaryTable(rawSalaryRows);

  // Add salary trace
  if (salaryTable.length > 0) {
    trace.push({
      field: 'tablas_salariales',
      value: `${salaryTable.length} grupos profesionales`,
      source: `Tablas salariales convenio ${agreement.code}`,
      sourceType: 'agreement_table',
      confidence: 'confirmed',
      timestamp: ts(),
    });
  }

  const conflicts = employeeData ? detectConflicts(conditions, employeeData, salaryTable) : [];
  const isExpired = agreement.expiration_date ? new Date(agreement.expiration_date) < new Date() : false;

  if (isExpired) {
    trace.push({
      field: 'vigencia',
      value: 'EXPIRADO',
      source: `Fecha de expiración: ${agreement.expiration_date}`,
      sourceType: 'agreement_field',
      confidence: 'confirmed',
      notes: 'Convenio ultraactividad — sigue aplicándose hasta renovación (ET Art. 86.3)',
      timestamp: ts(),
    });
  }

  // Determine overall confidence
  const hasAISuggested = trace.some(t => t.confidence === 'ai_suggested');
  const hasPending = trace.some(t => t.confidence === 'pending_validation');
  const overallConfidence: DataConfidence = hasAISuggested ? 'ai_suggested' : hasPending ? 'pending_validation' : 'confirmed';

  return {
    agreementId: agreement.id,
    agreementCode: agreement.code,
    agreementName: agreement.name,
    effectiveDate: agreement.effective_date,
    expirationDate: agreement.expiration_date,
    isExpired,
    workingConditions: conditions,
    salaryTable,
    conflicts,
    trace,
    overallConfidence,
    resolvedAt: ts(),
    disclaimer: AGREEMENT_DISCLAIMER,
  };
}

/**
 * Compute a readiness score (0-100) for how complete the agreement data is.
 */
export function computeAgreementCompleteness(agreement: RawCollectiveAgreement): {
  score: number;
  missing: string[];
  present: string[];
} {
  const checks: { field: string; present: boolean }[] = [
    { field: 'Jornada semanal', present: agreement.working_hours_week != null },
    { field: 'Vacaciones', present: agreement.vacation_days != null },
    { field: 'Pagas extra', present: agreement.extra_payments != null },
    { field: 'Antigüedad', present: agreement.seniority_rules != null },
    { field: 'Nocturnidad', present: agreement.night_shift_bonus != null },
    { field: 'Otros conceptos', present: agreement.other_concepts != null },
    { field: 'Tablas salariales (JSON)', present: agreement.salary_tables != null },
    { field: 'Obligaciones sindicales', present: agreement.union_obligations != null },
    { field: 'URL fuente oficial', present: !!agreement.source_url },
  ];

  const present = checks.filter(c => c.present).map(c => c.field);
  const missing = checks.filter(c => !c.present).map(c => c.field);
  const score = Math.round((present.length / checks.length) * 100);

  return { score, missing, present };
}
