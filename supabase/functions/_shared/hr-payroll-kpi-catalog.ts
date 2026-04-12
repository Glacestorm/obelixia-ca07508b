/**
 * HR/Payroll KPI Canonical Catalog — Single Source of Truth
 * G1.2: Prompt Refresh & KPI Alignment
 *
 * Consumed by edge functions (erp-hr-ai-agent, erp-fiscal-ai-agent,
 * erp-hr-analytics-agent, hr-labor-copilot).
 *
 * Rules:
 * - When deterministic engine exists, AI MUST defer to engine value.
 * - KPIs with provenance 'not_available' MUST return value: null.
 * - KPIs with value: null MUST NOT be included in aggregates, ratios or semaphores.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type KpiValueKind = 'currency' | 'percentage' | 'count' | 'ratio' | 'score' | 'days' | 'text';
export type KpiProvenance = 'deterministic_engine' | 'db_query' | 'ai_estimation' | 'not_available';
export type KpiOfficiality = 'internal' | 'preparatory' | 'official_pending';

export interface KpiDefinition {
  canonical_code: string;
  canonical_label: string;
  value_kind: KpiValueKind;
  provenance: KpiProvenance;
  officiality: KpiOfficiality;
  source_engine_or_table: string | null;
  notes_for_agents: string;
  consumers: string[];
  default_value: null;
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export const HR_PAYROLL_KPI_CATALOG: KpiDefinition[] = [
  // === Payroll Core ===
  {
    canonical_code: 'total_gross',
    canonical_label: 'Bruto total nómina',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'monthlyExecutiveReportEngine.computeMonthlyKPIs',
    notes_for_agents: 'Defer to engine. Do not estimate.',
    consumers: ['erp-hr-ai-agent', 'hr-reporting-engine', 'hr-board-pack'],
    default_value: null,
  },
  {
    canonical_code: 'total_net',
    canonical_label: 'Neto total nómina',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'monthlyExecutiveReportEngine.computeMonthlyKPIs',
    notes_for_agents: 'Defer to engine. Do not estimate.',
    consumers: ['erp-hr-ai-agent', 'hr-reporting-engine'],
    default_value: null,
  },
  {
    canonical_code: 'ss_employer_total',
    canonical_label: 'SS empresa total',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'ssRules2026.ts + ss-contributions.ts',
    notes_for_agents: 'Use canonical rates: CC 23.60%, Desempleo 5.50%/6.70%, FOGASA 0.20%, FP 0.60%, MEI 0.75%, AT/EP ~1.50%. Never approximate as 30%.',
    consumers: ['erp-hr-ai-agent', 'erp-fiscal-ai-agent'],
    default_value: null,
  },
  {
    canonical_code: 'ss_employee_total',
    canonical_label: 'SS trabajador total',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'ssRules2026.ts + ss-contributions.ts',
    notes_for_agents: 'Use canonical rates: CC 4.70%, Desempleo 1.55%/1.60%, FP 0.10%, MEI 0.15%. Never approximate.',
    consumers: ['erp-hr-ai-agent'],
    default_value: null,
  },
  {
    canonical_code: 'total_company_cost',
    canonical_label: 'Coste total nómina (empresa)',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'monthlyExecutiveReportEngine.computeMonthlyKPIs',
    notes_for_agents: 'Includes gross + employer SS + FOGASA + FP + MEI + AT/EP.',
    consumers: ['erp-hr-ai-agent', 'hr-board-pack'],
    default_value: null,
  },
  {
    canonical_code: 'irpf_retention',
    canonical_label: 'Retención IRPF',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'irpfEngine.ts',
    notes_for_agents: 'Defer to irpfEngine. Rate depends on personal/family situation.',
    consumers: ['erp-hr-ai-agent', 'erp-fiscal-ai-agent'],
    default_value: null,
  },
  {
    canonical_code: 'irpf_base',
    canonical_label: 'Base sujeta IRPF',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'irpfEngine.ts',
    notes_for_agents: 'Gross minus exempt concepts. Defer to engine.',
    consumers: ['erp-fiscal-ai-agent'],
    default_value: null,
  },

  // === Fiscal Reconciliation ===
  {
    canonical_code: 'modelo_111_acumulado',
    canonical_label: 'Acumulado Modelo 111',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'preparatory',
    source_engine_or_table: 'fiscalReconciliationEngine.reconcileQuarterly111',
    notes_for_agents: 'Preparatory only. Official filing requires AEAT signature. Compare against payroll IRPF totals.',
    consumers: ['erp-fiscal-ai-agent', 'fiscalSupervisorEngine'],
    default_value: null,
  },
  {
    canonical_code: 'modelo_190_resumen',
    canonical_label: 'Resumen Modelo 190',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'preparatory',
    source_engine_or_table: 'fiscalReconciliationEngine.reconcileAnnual190',
    notes_for_agents: 'Annual summary. Preparatory. Must equal sum of quarterly 111s.',
    consumers: ['erp-fiscal-ai-agent', 'fiscalSupervisorEngine'],
    default_value: null,
  },
  {
    canonical_code: 'cra_conceptos',
    canonical_label: 'Conceptos CRA',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'preparatory',
    source_engine_or_table: 'cotizacionReconciliationEngine.reconcileCotizacion',
    notes_for_agents: 'SS reconciliation against FAN/RLC/RNT/CRA. Preparatory.',
    consumers: ['erp-fiscal-ai-agent', 'fiscalSupervisorEngine'],
    default_value: null,
  },

  // === Fiscal Supervisor ===
  {
    canonical_code: 'fiscal_consistency_status',
    canonical_label: 'Estado de consistencia fiscal',
    value_kind: 'text',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'fiscalSupervisorEngine',
    notes_for_agents: '7 domains: IRPF, Mod111, Mod190, Mod145, SS/CRA, International/7p, Incidents. States: ok, missing_evidence, preparatory_pending, warning, critical. AI must not contradict this.',
    consumers: ['HRFiscalSupervisorPanel', 'erp-fiscal-ai-agent'],
    default_value: null,
  },
  {
    canonical_code: 'fiscal_alerts_open',
    canonical_label: 'Alertas fiscales abiertas',
    value_kind: 'count',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'fiscalSupervisorEngine.alerts',
    notes_for_agents: 'Count of open fiscal alerts from deterministic supervisor.',
    consumers: ['HRFiscalSupervisorPanel', 'erp-fiscal-ai-agent'],
    default_value: null,
  },

  // === International ===
  {
    canonical_code: 'cases_7p_expat',
    canonical_label: 'Casos potenciales 7p / expat',
    value_kind: 'count',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'internationalTaxEngine',
    notes_for_agents: 'Auto-detected candidates for Art. 7p exemption or IRNR Mod. 216. Do not fabricate cases.',
    consumers: ['fiscalSupervisorEngine', 'erp-fiscal-ai-agent'],
    default_value: null,
  },

  // === Incidents & Absences ===
  {
    canonical_code: 'dias_it_at',
    canonical_label: 'Días IT / AT acumulados',
    value_kind: 'days',
    provenance: 'db_query',
    officiality: 'internal',
    source_engine_or_table: 'erp_hr_it_processes',
    notes_for_agents: 'Real data from IT/AT process table. Includes PNR and suspension days.',
    consumers: ['erp-hr-ai-agent', 'fiscalSupervisorEngine'],
    default_value: null,
  },
  {
    canonical_code: 'incidencias_impacto_economico',
    canonical_label: 'Incidencias con impacto económico',
    value_kind: 'count',
    provenance: 'db_query',
    officiality: 'internal',
    source_engine_or_table: 'erp_hr_payroll_incidents + erp_hr_it_processes',
    notes_for_agents: 'Merged from payroll incidents (tributa_irpf/cotiza_ss) and IT processes.',
    consumers: ['fiscalSupervisorEngine', 'erp-hr-ai-agent'],
    default_value: null,
  },

  // === People Analytics (AI-estimated or not available) ===
  {
    canonical_code: 'turnover_rate',
    canonical_label: 'Rotación anual',
    value_kind: 'percentage',
    provenance: 'db_query',
    officiality: 'internal',
    source_engine_or_table: 'erp_hr_employees (terminated count / total)',
    notes_for_agents: 'Semi-real: computed from terminated vs active employees. Acceptable for dashboards.',
    consumers: ['erp-hr-ai-agent', 'erp-hr-analytics-agent'],
    default_value: null,
  },
  {
    canonical_code: 'absentismo',
    canonical_label: 'Absentismo',
    value_kind: 'percentage',
    provenance: 'not_available',
    officiality: 'internal',
    source_engine_or_table: null,
    notes_for_agents: 'No deterministic source configured. Return value: null with provenance not_available. Do NOT hardcode or estimate. Exclude from aggregates and semaphores.',
    consumers: ['erp-hr-ai-agent'],
    default_value: null,
  },
  {
    canonical_code: 'satisfaccion',
    canonical_label: 'Satisfacción empleados',
    value_kind: 'score',
    provenance: 'not_available',
    officiality: 'internal',
    source_engine_or_table: null,
    notes_for_agents: 'No survey engine configured. Return value: null with provenance not_available. Do NOT hardcode or estimate. Exclude from aggregates and semaphores.',
    consumers: ['erp-hr-ai-agent'],
    default_value: null,
  },
  {
    canonical_code: 'formacion_h_emp',
    canonical_label: 'Formación horas/empleado',
    value_kind: 'ratio',
    provenance: 'not_available',
    officiality: 'internal',
    source_engine_or_table: null,
    notes_for_agents: 'No training tracking engine configured. Return value: null with provenance not_available. Do NOT hardcode or estimate. Exclude from aggregates and semaphores.',
    consumers: ['erp-hr-ai-agent'],
    default_value: null,
  },

  // === Executive / Reporting ===
  {
    canonical_code: 'avg_gross_per_employee',
    canonical_label: 'Bruto medio por empleado',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'monthlyExecutiveReportEngine.computeMonthlyKPIs',
    notes_for_agents: 'Defer to engine.',
    consumers: ['hr-board-pack', 'hr-reporting-engine'],
    default_value: null,
  },
  {
    canonical_code: 'deductions_ratio',
    canonical_label: 'Ratio deducciones sobre bruto',
    value_kind: 'percentage',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'monthlyExecutiveReportEngine.computeMonthlyKPIs',
    notes_for_agents: 'Defer to engine.',
    consumers: ['hr-reporting-engine'],
    default_value: null,
  },
  {
    canonical_code: 'employer_cost_ratio',
    canonical_label: 'Ratio coste empresa sobre bruto',
    value_kind: 'percentage',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'monthlyExecutiveReportEngine.computeMonthlyKPIs',
    notes_for_agents: 'Defer to engine.',
    consumers: ['hr-reporting-engine'],
    default_value: null,
  },

  // === SS Prestaciones ===
  {
    canonical_code: 'ss_prestaciones',
    canonical_label: 'Prestaciones SS (IT/AT)',
    value_kind: 'currency',
    provenance: 'deterministic_engine',
    officiality: 'internal',
    source_engine_or_table: 'itPaymentEngine + erp_hr_it_processes',
    notes_for_agents: 'Delegated payment amounts for IT/AT. Computed from base reguladora × percentage × days.',
    consumers: ['erp-hr-ai-agent', 'fiscalSupervisorEngine'],
    default_value: null,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Lookup a KPI definition by canonical_code */
export function getKpiDefinition(code: string): KpiDefinition | undefined {
  return HR_PAYROLL_KPI_CATALOG.find(k => k.canonical_code === code);
}

/** Get all KPIs that have a deterministic engine source */
export function getDeterministicKpis(): KpiDefinition[] {
  return HR_PAYROLL_KPI_CATALOG.filter(k => k.provenance === 'deterministic_engine');
}

/** Get all KPIs without real data source */
export function getUnavailableKpis(): KpiDefinition[] {
  return HR_PAYROLL_KPI_CATALOG.filter(k => k.provenance === 'not_available');
}

/**
 * Canonical SS rates from ssRules2026 (RDL 3/2026).
 * Inlined here for edge function consumption without cross-boundary imports.
 */
export const CANONICAL_SS_RATES = {
  cc:                    { employer: 23.60, employee: 4.70, total: 28.30 },
  unemployment_indef:    { employer: 5.50,  employee: 1.55, total: 7.05 },
  unemployment_temp:     { employer: 6.70,  employee: 1.60, total: 8.30 },
  fogasa:                { employer: 0.20,  employee: 0,    total: 0.20 },
  fp:                    { employer: 0.60,  employee: 0.10, total: 0.70 },
  mei:                   { employer: 0.75,  employee: 0.15, total: 0.90 },
  atep_ref:              { employer: 1.50,  employee: 0,    total: 1.50 },
} as const;

/** Total employer rate (indefinido, reference AT/EP) */
export const CANONICAL_EMPLOYER_RATE_INDEF =
  CANONICAL_SS_RATES.cc.employer +
  CANONICAL_SS_RATES.unemployment_indef.employer +
  CANONICAL_SS_RATES.fogasa.employer +
  CANONICAL_SS_RATES.fp.employer +
  CANONICAL_SS_RATES.mei.employer +
  CANONICAL_SS_RATES.atep_ref.employer; // 32.15%

/** Total employee rate (indefinido) */
export const CANONICAL_EMPLOYEE_RATE_INDEF =
  CANONICAL_SS_RATES.cc.employee +
  CANONICAL_SS_RATES.unemployment_indef.employee +
  CANONICAL_SS_RATES.fp.employee +
  CANONICAL_SS_RATES.mei.employee; // 6.50%
