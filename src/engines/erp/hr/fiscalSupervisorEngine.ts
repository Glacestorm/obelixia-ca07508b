/**
 * fiscalSupervisorEngine.ts — G1.2 Fiscal Supervisor Core
 * 
 * Orquestador determinístico de checks fiscales/SS/internacional.
 * Reutiliza engines existentes: fiscalReconciliationEngine, cotizacionReconciliationEngine,
 * modelo145ValidationEngine, internationalTaxEngine, proactiveAlertEngine.
 *
 * NO Supabase, NO React — pure functions only.
 *
 * DISCLAIMER: Supervisión fiscal interna preparatoria.
 * NO constituye presentación oficial, asesoría fiscal ni cumplimiento certificado.
 */

import type {
  PayrollPeriodFiscalData,
  Modelo111FiscalData,
  Modelo190FiscalData,
  ReconciliationCheck as FiscalRecCheck,
} from './fiscalReconciliationEngine';
import { reconcileQuarterly111, reconcileAnnual190 } from './fiscalReconciliationEngine';

import type { ReconciliationTotals } from './cotizacionReconciliationEngine';
import { reconcileCotizacion } from './cotizacionReconciliationEngine';

import type { Modelo145EmployeeData, Modelo145ValidationResult } from './modelo145ValidationEngine';
import { validateModelo145Bulk } from './modelo145ValidationEngine';

import type { Art7pInput, ResidencyInput, InternationalTaxImpact } from './internationalTaxEngine';
import { evaluateArt7p, analyzeResidency, evaluateInternationalTaxImpact } from './internationalTaxEngine';

import type { ProactiveAlert, ProactiveAlertSeverity } from './proactiveAlertEngine';
import { buildDeduplicationKey, worstSeverity, PROACTIVE_SEVERITY_CONFIG } from './proactiveAlertEngine';

// ─── State semantics ────────────────────────────────────────────────────────

export type FiscalCheckStatus =
  | 'ok'                     // Check passed
  | 'missing_evidence'       // Artifact/data not available — not an error
  | 'preparatory_pending'    // Preparatory step not yet completed
  | 'warning'                // Coherence concern, non-blocking
  | 'critical';              // Inconsistency requiring attention

// ─── Domain types ───────────────────────────────────────────────────────────

export interface FiscalSupervisorCheck {
  id: string;
  domain: FiscalDomainId;
  label: string;
  status: FiscalCheckStatus;
  severity: ProactiveAlertSeverity;
  source: string;           // Legal article or rule reference
  detail: string;
  recommendation: string;
  values?: { expected?: string; actual?: string; diff?: string };
}

export type FiscalDomainId =
  | 'irpf_coherence'
  | 'modelo_111'
  | 'modelo_190'
  | 'modelo_145'
  | 'ss_cra'
  | 'international'
  | 'incident_impact';

export interface FiscalDomainResult {
  id: FiscalDomainId;
  label: string;
  status: FiscalCheckStatus;
  score: number;  // 0-100
  checks: FiscalSupervisorCheck[];
  alertCount: number;
}

export interface FiscalSupervisorAlert extends Omit<ProactiveAlert, 'sourceSystem' | 'pushEligible' | 'emailEligible'> {
  sourceSystem: 'fiscal_supervisor';
  pushEligible: false;
  emailEligible: false;
}

// ─── Input ──────────────────────────────────────────────────────────────────

export interface FiscalSupervisorInput {
  companyId: string;
  periodYear: number;
  periodMonth: number;

  // Payroll aggregates
  payrollMonths?: PayrollPeriodFiscalData[];

  // Fiscal artifacts
  modelo111?: Modelo111FiscalData;
  modelo190?: Modelo190FiscalData;
  quarterly111s?: Modelo111FiscalData[];

  // SS / Cotización
  cotizacionTotals?: ReconciliationTotals;

  // Modelo 145
  modelo145Employees?: Modelo145EmployeeData[];

  // International
  internationalEmployees?: InternationalEmployeeFlag[];

  // Incidents
  activeIncidents?: ActiveIncidentFlag[];
}

export interface InternationalEmployeeFlag {
  employeeId: string;
  employeeName: string;
  hostCountryCode: string;
  daysWorkedAbroad: number;
  daysInSpain: number;
  annualGrossSalary: number;
  isNonResident: boolean;
  isBeckhamEligible?: boolean;
  workEffectivelyAbroad: boolean;
  beneficiaryIsNonResident: boolean;
  spouseInSpain: boolean;
  dependentChildrenInSpain: boolean;
  mainEconomicActivitiesInSpain: boolean;
}

export interface ActiveIncidentFlag {
  employeeId: string;
  employeeName: string;
  incidentType: string; // IT, AT, MAT, PAT, ERE, etc.
  startDate: string;
  endDate?: string;
  affectsFiscal: boolean;
  affectsCotizacion: boolean;
  description?: string;
}

// ─── Output ─────────────────────────────────────────────────────────────────

export interface FiscalSupervisorResult {
  overallStatus: FiscalCheckStatus;
  score: number; // 0-100
  domains: FiscalDomainResult[];
  alerts: FiscalSupervisorAlert[];
  totalChecks: number;
  passedChecks: number;
  timestamp: string;
  disclaimer: string;
  filters: {
    companyId: string;
    periodYear: number;
    periodMonth: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DISCLAIMER = 'Supervisión fiscal interna preparatoria. No constituye presentación oficial ni asesoría fiscal.';

const DOMAIN_LABELS: Record<FiscalDomainId, string> = {
  irpf_coherence: 'Coherencia IRPF',
  modelo_111: 'Modelo 111 (Preparatorio)',
  modelo_190: 'Modelo 190 (Preparatorio)',
  modelo_145: 'Modelo 145 — Completitud',
  ss_cra: 'SS / Cotización / CRA',
  international: 'Internacional / 7p / IRNR',
  incident_impact: 'Incidencias con impacto fiscal',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusFromSeverities(checks: FiscalSupervisorCheck[]): FiscalCheckStatus {
  if (checks.length === 0) return 'missing_evidence';
  const hasCritical = checks.some(c => c.status === 'critical');
  if (hasCritical) return 'critical';
  const hasWarning = checks.some(c => c.status === 'warning');
  if (hasWarning) return 'warning';
  const hasPending = checks.some(c => c.status === 'preparatory_pending');
  if (hasPending) return 'preparatory_pending';
  const hasMissing = checks.some(c => c.status === 'missing_evidence');
  if (hasMissing) return 'missing_evidence';
  return 'ok';
}

function scoreFromChecks(checks: FiscalSupervisorCheck[]): number {
  if (checks.length === 0) return 0;
  const passed = checks.filter(c => c.status === 'ok').length;
  return Math.round((passed / checks.length) * 100);
}

function mapCheckStatusToSeverity(status: FiscalCheckStatus): ProactiveAlertSeverity {
  switch (status) {
    case 'critical': return 'critical';
    case 'warning': return 'warning';
    case 'preparatory_pending': return 'info';
    case 'missing_evidence': return 'info';
    case 'ok': return 'info';
  }
}

function createSupervisorAlert(
  check: FiscalSupervisorCheck,
  periodLabel: string,
): FiscalSupervisorAlert {
  return {
    deduplicationKey: buildDeduplicationKey('aeat', 'readiness_drop', `fiscal_supervisor::${check.id}`),
    domain: 'aeat',
    category: 'readiness_drop',
    severity: check.severity,
    status: 'active',
    title: check.label,
    message: `${check.detail} — ${check.recommendation}`,
    entityRef: check.id,
    relatedPeriodId: periodLabel,
    eventType: `fiscal_supervisor_${check.domain}`,
    actionLabel: 'Ver detalle',
    metadata: {
      domain: check.domain,
      source: check.source,
      ...(check.values ?? {}),
    },
    priority: check.severity === 'critical' ? 10 : check.severity === 'warning' ? 30 : 70,
    sourceSystem: 'fiscal_supervisor',
    evaluatedAt: new Date(),
    pushEligible: false,
    emailEligible: false,
  };
}

// ─── Domain evaluators ──────────────────────────────────────────────────────

function evaluateIRPFCoherence(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];
  const { payrollMonths } = input;

  if (!payrollMonths || payrollMonths.length === 0) {
    checks.push({
      id: 'irpf_no_payroll',
      domain: 'irpf_coherence',
      label: 'Datos de nómina no disponibles',
      status: 'missing_evidence',
      severity: 'info',
      source: 'Art. 99 LIRPF',
      detail: 'No se encontraron datos de nómina para el periodo seleccionado.',
      recommendation: 'Procese nóminas del periodo para activar checks IRPF.',
    });
  } else {
    // Check: retenciones vs base
    const totalBase = payrollMonths.reduce((s, m) => s + m.baseIRPF, 0);
    const totalRet = payrollMonths.reduce((s, m) => s + m.retencionIRPF, 0);

    if (totalBase > 0) {
      const tipoMedio = (totalRet / totalBase) * 100;
      const tipoOk = tipoMedio >= 0 && tipoMedio <= 47; // max marginal rate Spain
      checks.push({
        id: 'irpf_tipo_medio',
        domain: 'irpf_coherence',
        label: 'Tipo medio IRPF dentro de rango legal',
        status: tipoOk ? 'ok' : 'warning',
        severity: tipoOk ? 'info' : 'warning',
        source: 'Art. 63 LIRPF — Escala general',
        detail: `Tipo medio: ${tipoMedio.toFixed(2)}%. Base: ${totalBase.toFixed(2)}€, Retenciones: ${totalRet.toFixed(2)}€.`,
        recommendation: tipoOk ? 'Dentro de rango esperado.' : 'Tipo medio fuera de rango esperado. Revisar cálculos IRPF.',
        values: { expected: '0-47%', actual: `${tipoMedio.toFixed(2)}%` },
      });
    }

    // Check: zero retention employees
    const zeroRetMonths = payrollMonths.filter(m => m.baseIRPF > 0 && m.retencionIRPF === 0);
    if (zeroRetMonths.length > 0) {
      checks.push({
        id: 'irpf_zero_retention',
        domain: 'irpf_coherence',
        label: 'Períodos con base IRPF pero retención cero',
        status: 'warning',
        severity: 'warning',
        source: 'Art. 80 RIRPF',
        detail: `${zeroRetMonths.length} período(s) con base >0 y retención 0.`,
        recommendation: 'Verificar si el tipo 0% es correcto (mínimo exento, Mod.145 situación 1 con hijos, etc.).',
        values: { actual: `${zeroRetMonths.length} períodos` },
      });
    } else if (totalBase > 0) {
      checks.push({
        id: 'irpf_zero_retention',
        domain: 'irpf_coherence',
        label: 'Consistencia base/retención IRPF',
        status: 'ok',
        severity: 'info',
        source: 'Art. 80 RIRPF',
        detail: 'Todos los períodos con base positiva tienen retención asociada.',
        recommendation: 'Sin acción requerida.',
      });
    }

    // Check: employee count consistency across months
    const counts = payrollMonths.map(m => m.perceptoresCount);
    const maxDrift = Math.max(...counts) - Math.min(...counts);
    const driftOk = maxDrift <= 5; // allow some fluctuation
    checks.push({
      id: 'irpf_perceptor_drift',
      domain: 'irpf_coherence',
      label: 'Estabilidad de perceptores entre períodos',
      status: driftOk ? 'ok' : 'warning',
      severity: driftOk ? 'info' : 'warning',
      source: 'Control interno',
      detail: `Variación máxima entre meses: ${maxDrift} perceptores.`,
      recommendation: driftOk ? 'Plantilla estable.' : 'Alta variación de perceptores. Revisar altas/bajas e incidencias.',
      values: { expected: '≤5', actual: `${maxDrift}` },
    });
  }

  return {
    id: 'irpf_coherence',
    label: DOMAIN_LABELS.irpf_coherence,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok' && c.status !== 'missing_evidence').length,
  };
}

function evaluateModelo111(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];

  if (!input.modelo111) {
    checks.push({
      id: '111_not_available',
      domain: 'modelo_111',
      label: 'Modelo 111 no generado',
      status: 'preparatory_pending',
      severity: 'info',
      source: 'Art. 105 RIRPF',
      detail: 'Aún no se ha generado el Modelo 111 preparatorio para este período.',
      recommendation: 'Generar el Modelo 111 preparatorio desde el Motor IRPF.',
    });
  } else if (input.payrollMonths && input.payrollMonths.length > 0) {
    const trimester = Math.ceil(input.periodMonth / 3);
    const result = reconcileQuarterly111(input.payrollMonths, input.modelo111, trimester, input.periodYear);

    for (const rc of result.checks) {
      const status: FiscalCheckStatus = rc.passed ? 'ok' : (rc.severity === 'error' ? 'critical' : 'warning');
      checks.push({
        id: `111_${rc.id}`,
        domain: 'modelo_111',
        label: rc.label,
        status,
        severity: rc.passed ? 'info' : (rc.severity === 'error' ? 'critical' : 'warning'),
        source: 'Art. 105 RIRPF — Mod.111',
        detail: rc.detail,
        recommendation: rc.passed ? 'Conciliado correctamente.' : 'Revisar discrepancia antes de presentación.',
        values: { expected: `${rc.expected}`, actual: `${rc.actual}`, diff: `${rc.difference}` },
      });
    }
  } else {
    checks.push({
      id: '111_no_payroll',
      domain: 'modelo_111',
      label: 'Nóminas no disponibles para conciliar con Mod.111',
      status: 'missing_evidence',
      severity: 'info',
      source: 'Art. 105 RIRPF',
      detail: 'Existe Mod.111 pero faltan datos de nómina para conciliar.',
      recommendation: 'Cargar nóminas del periodo.',
    });
  }

  return {
    id: 'modelo_111',
    label: DOMAIN_LABELS.modelo_111,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok' && c.status !== 'missing_evidence' && c.status !== 'preparatory_pending').length,
  };
}

function evaluateModelo190(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];

  if (!input.modelo190) {
    checks.push({
      id: '190_not_available',
      domain: 'modelo_190',
      label: 'Modelo 190 no generado',
      status: 'preparatory_pending',
      severity: 'info',
      source: 'Art. 108 RIRPF',
      detail: 'El Modelo 190 anual aún no se ha generado.',
      recommendation: 'Se generará al cierre del ejercicio fiscal.',
    });
  } else if (input.quarterly111s && input.quarterly111s.length > 0 && input.payrollMonths) {
    const result = reconcileAnnual190(input.modelo190, input.quarterly111s, input.payrollMonths);

    for (const rc of result.checks) {
      const status: FiscalCheckStatus = rc.passed ? 'ok' : (rc.severity === 'error' ? 'critical' : 'warning');
      checks.push({
        id: `190_${rc.id}`,
        domain: 'modelo_190',
        label: rc.label,
        status,
        severity: rc.passed ? 'info' : (rc.severity === 'error' ? 'critical' : 'warning'),
        source: 'Art. 108 RIRPF — Mod.190',
        detail: rc.detail,
        recommendation: rc.passed ? 'Conciliado.' : 'Discrepancia detectada. Revisar acumulados.',
        values: { expected: `${rc.expected}`, actual: `${rc.actual}`, diff: `${rc.difference}` },
      });
    }
  } else {
    checks.push({
      id: '190_missing_data',
      domain: 'modelo_190',
      label: 'Datos insuficientes para conciliar Mod.190',
      status: 'missing_evidence',
      severity: 'info',
      source: 'Art. 108 RIRPF',
      detail: 'Se requieren datos de Mod.111 trimestrales y nóminas anuales.',
      recommendation: 'Completar nóminas y modelos 111 del ejercicio.',
    });
  }

  return {
    id: 'modelo_190',
    label: DOMAIN_LABELS.modelo_190,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok' && c.status !== 'missing_evidence' && c.status !== 'preparatory_pending').length,
  };
}

function evaluateModelo145(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];

  if (!input.modelo145Employees || input.modelo145Employees.length === 0) {
    checks.push({
      id: '145_no_employees',
      domain: 'modelo_145',
      label: 'Sin datos de Modelo 145',
      status: 'missing_evidence',
      severity: 'info',
      source: 'Art. 88 RIRPF',
      detail: 'No se encontraron datos de comunicación fiscal de empleados.',
      recommendation: 'Completar datos fiscales de empleados (situación familiar, NIF, etc.).',
    });
  } else {
    const bulkResult = validateModelo145Bulk(input.modelo145Employees);

    checks.push({
      id: '145_completeness',
      domain: 'modelo_145',
      label: `Completitud Mod.145: ${bulkResult.totalComplete}/${bulkResult.results.length}`,
      status: bulkResult.totalIncomplete === 0 ? 'ok' : (bulkResult.overallScore < 50 ? 'critical' : 'warning'),
      severity: bulkResult.totalIncomplete === 0 ? 'info' : (bulkResult.overallScore < 50 ? 'critical' : 'warning'),
      source: 'Art. 88 RIRPF — Comunicación datos pagador',
      detail: `${bulkResult.totalComplete} completos, ${bulkResult.totalIncomplete} incompletos. Score: ${bulkResult.overallScore}%.`,
      recommendation: bulkResult.totalIncomplete > 0
        ? `Completar datos fiscales de ${bulkResult.totalIncomplete} empleado(s).`
        : 'Todos los empleados tienen datos fiscales completos.',
      values: { expected: `${bulkResult.results.length}`, actual: `${bulkResult.totalComplete}`, diff: `${bulkResult.totalIncomplete}` },
    });

    // Flag employees with errors
    const withErrors = bulkResult.results.filter(r => r.errorCount > 0);
    if (withErrors.length > 0) {
      checks.push({
        id: '145_errors',
        domain: 'modelo_145',
        label: `Empleados con errores en Mod.145: ${withErrors.length}`,
        status: 'critical',
        severity: 'critical',
        source: 'Art. 88 RIRPF',
        detail: `${withErrors.length} empleado(s) con campos obligatorios faltantes o inválidos.`,
        recommendation: 'Corregir datos fiscales de estos empleados antes de calcular IRPF.',
      });
    }
  }

  return {
    id: 'modelo_145',
    label: DOMAIN_LABELS.modelo_145,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok' && c.status !== 'missing_evidence').length,
  };
}

function evaluateSSCRA(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];

  if (!input.cotizacionTotals) {
    checks.push({
      id: 'ss_no_data',
      domain: 'ss_cra',
      label: 'Datos de cotización no disponibles',
      status: 'missing_evidence',
      severity: 'info',
      source: 'Art. 141 LGSS',
      detail: 'No se encontraron datos de cotización (FAN/RLC/RNT/CRA).',
      recommendation: 'Los datos se generan con el cierre de cotización mensual.',
    });
  } else {
    const result = reconcileCotizacion(input.cotizacionTotals);

    for (const rc of result.checks) {
      let status: FiscalCheckStatus;
      if (rc.passed) {
        status = 'ok';
      } else if (rc.severity === 'info') {
        status = 'preparatory_pending';
      } else if (rc.severity === 'error') {
        status = 'critical';
      } else {
        status = 'warning';
      }

      checks.push({
        id: `ss_${rc.id}`,
        domain: 'ss_cra',
        label: rc.label,
        status,
        severity: rc.passed ? 'info' : (rc.severity === 'error' ? 'critical' : rc.severity === 'warning' ? 'warning' : 'info'),
        source: 'Art. 141-144 LGSS / Orden PJC/297/2026',
        detail: `Esperado: ${rc.expected}, Actual: ${rc.actual}${rc.diff !== null ? `, Diferencia: ${rc.diff}` : ''}`,
        recommendation: rc.passed ? 'Conciliado.' : 'Revisar coherencia entre nómina y artefactos de cotización.',
        values: { expected: rc.expected, actual: rc.actual, diff: rc.diff?.toString() ?? '' },
      });
    }
  }

  return {
    id: 'ss_cra',
    label: DOMAIN_LABELS.ss_cra,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok' && c.status !== 'missing_evidence' && c.status !== 'preparatory_pending').length,
  };
}

function evaluateInternational(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];

  if (!input.internationalEmployees || input.internationalEmployees.length === 0) {
    checks.push({
      id: 'intl_none',
      domain: 'international',
      label: 'Sin empleados internacionales detectados',
      status: 'ok',
      severity: 'info',
      source: 'Art. 7.p LIRPF / Art. 24 TRLIRNR',
      detail: 'No hay empleados con flags internacionales en el periodo.',
      recommendation: 'Sin acción requerida.',
    });
  } else {
    for (const emp of input.internationalEmployees) {
      // Full international tax impact evaluation using real engine
      const impact = evaluateInternationalTaxImpact({
        hostCountryCode: emp.hostCountryCode,
        annualGrossSalary: emp.annualGrossSalary,
        daysWorkedAbroad: emp.daysWorkedAbroad,
        daysInSpain: emp.daysInSpain,
        workEffectivelyAbroad: emp.workEffectivelyAbroad,
        beneficiaryIsNonResident: emp.beneficiaryIsNonResident,
        spouseInSpain: emp.spouseInSpain,
        dependentChildrenInSpain: emp.dependentChildrenInSpain,
        mainEconomicActivitiesInSpain: emp.mainEconomicActivitiesInSpain,
        isBeckhamEligible: emp.isBeckhamEligible,
      });

      // Non-resident / IRNR / 216 detection
      if (emp.isNonResident || impact.residency.classification === 'non_resident') {
        checks.push({
          id: `intl_irnr_${emp.employeeId}`,
          domain: 'international',
          label: `IRNR/216 — ${emp.employeeName}`,
          status: 'warning',
          severity: 'high',
          source: 'Art. 24 TRLIRNR / Mod.216',
          detail: `${emp.employeeName}: clasificado como no residente (${emp.daysInSpain} días en España). Puede aplicar IRNR y Modelo 216 en lugar de IRPF.`,
          recommendation: 'Verificar residencia fiscal y aplicar retención IRNR (24% UE/EEE, 24% general) si procede.',
          values: { actual: `${emp.daysInSpain} días` },
        });
      }

      // Art. 7.p evaluation
      if (emp.daysWorkedAbroad > 0 && impact.art7p.eligibility !== 'not_eligible') {
        const art7pStatus: FiscalCheckStatus = impact.art7p.eligibility === 'eligible' ? 'ok'
          : impact.art7p.eligibility === 'requires_review' ? 'warning'
          : 'warning';

        checks.push({
          id: `intl_7p_${emp.employeeId}`,
          domain: 'international',
          label: `Art. 7.p — ${emp.employeeName}`,
          status: art7pStatus,
          severity: impact.art7p.eligibility === 'eligible' ? 'info' : 'warning',
          source: 'Art. 7.p LIRPF',
          detail: `${impact.art7p.eligibilityLabel}. Exención estimada: ${impact.art7p.exemptAmount.toFixed(2)}€ (máx. 60.100€). ${emp.daysWorkedAbroad} días en ${emp.hostCountryCode}.`,
          recommendation: impact.art7p.eligibility === 'eligible'
            ? 'Aplicar exención en cálculo IRPF.'
            : 'Verificar requisitos antes de aplicar exención.',
          values: { actual: `${impact.art7p.exemptAmount.toFixed(2)}€` },
        });
      }

      // Double tax risk
      if (impact.doubleTaxRisk === 'high' || impact.doubleTaxRisk === 'medium') {
        checks.push({
          id: `intl_cdi_${emp.employeeId}`,
          domain: 'international',
          label: `Riesgo doble imposición — ${emp.employeeName}`,
          status: impact.doubleTaxRisk === 'high' ? 'critical' : 'warning',
          severity: impact.doubleTaxRisk === 'high' ? 'critical' : 'warning',
          source: 'CDI España-' + emp.hostCountryCode,
          detail: `${impact.doubleTaxRiskLabel}. ${impact.cdiApplicable ? 'CDI disponible.' : 'Sin CDI con ' + emp.hostCountryCode + '.'}`,
          recommendation: impact.doubleTaxRisk === 'high'
            ? 'Consultar asesor fiscal internacional. Riesgo alto de doble tributación.'
            : 'Revisar provisiones CDI aplicables.',
        });
      }

      // Beckham Law
      if (impact.residency.classification === 'inbound_beckham') {
        checks.push({
          id: `intl_beckham_${emp.employeeId}`,
          domain: 'international',
          label: `Régimen Beckham — ${emp.employeeName}`,
          status: 'warning',
          severity: 'warning',
          source: 'Art. 93 LIRPF',
          detail: 'Empleado bajo régimen especial de impatriados. Tributación como no residente durante 6 años.',
          recommendation: 'Verificar elegibilidad y aplicar tipo fijo 24% según Art. 93 LIRPF.',
        });
      }

      // Mandatory review points
      if (impact.mandatoryReviewPoints.length > 0) {
        checks.push({
          id: `intl_review_${emp.employeeId}`,
          domain: 'international',
          label: `Revisión obligatoria — ${emp.employeeName}`,
          status: 'warning',
          severity: 'warning',
          source: 'Control interno movilidad',
          detail: impact.mandatoryReviewPoints.join(' | '),
          recommendation: 'Completar revisión antes de cerrar el periodo fiscal.',
        });
      }
    }
  }

  return {
    id: 'international',
    label: DOMAIN_LABELS.international,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok' && c.status !== 'missing_evidence').length,
  };
}

function evaluateIncidentImpact(input: FiscalSupervisorInput): FiscalDomainResult {
  const checks: FiscalSupervisorCheck[] = [];

  if (!input.activeIncidents || input.activeIncidents.length === 0) {
    checks.push({
      id: 'incidents_none',
      domain: 'incident_impact',
      label: 'Sin incidencias activas con impacto fiscal',
      status: 'ok',
      severity: 'info',
      source: 'Control interno',
      detail: 'No hay incidencias abiertas que afecten a la fiscalidad del periodo.',
      recommendation: 'Sin acción requerida.',
    });
  } else {
    const fiscalIncidents = input.activeIncidents.filter(i => i.affectsFiscal);
    const cotizIncidents = input.activeIncidents.filter(i => i.affectsCotizacion);

    if (fiscalIncidents.length > 0) {
      checks.push({
        id: 'incidents_fiscal',
        domain: 'incident_impact',
        label: `${fiscalIncidents.length} incidencia(s) con impacto IRPF`,
        status: 'warning',
        severity: 'warning',
        source: 'Art. 99 LIRPF / Art. 147 LGSS',
        detail: `Tipos: ${[...new Set(fiscalIncidents.map(i => i.incidentType))].join(', ')}. Empleados: ${[...new Set(fiscalIncidents.map(i => i.employeeName))].join(', ')}.`,
        recommendation: 'Verificar que las incidencias están reflejadas en el cálculo de IRPF y bases de cotización.',
      });
    }

    if (cotizIncidents.length > 0) {
      checks.push({
        id: 'incidents_cotiz',
        domain: 'incident_impact',
        label: `${cotizIncidents.length} incidencia(s) con impacto cotización`,
        status: 'warning',
        severity: 'warning',
        source: 'Art. 147-149 LGSS',
        detail: `Tipos: ${[...new Set(cotizIncidents.map(i => i.incidentType))].join(', ')}.`,
        recommendation: 'Verificar bases de cotización IT/AT y colaboración con mutua si procede.',
      });
    }

    // Check for prolonged IT (>365 days)
    const now = new Date();
    for (const inc of input.activeIncidents) {
      if (inc.incidentType === 'IT' || inc.incidentType === 'AT') {
        const start = new Date(inc.startDate);
        const daysActive = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysActive > 365) {
          checks.push({
            id: `incident_prolonged_${inc.employeeId}`,
            domain: 'incident_impact',
            label: `IT prolongada >365 días — ${inc.employeeName}`,
            status: 'critical',
            severity: 'critical',
            source: 'Art. 169.1 LGSS',
            detail: `${inc.employeeName}: IT activa desde ${inc.startDate} (${daysActive} días). Puede requerir prórroga INSS o propuesta de IP.`,
            recommendation: 'Verificar prórroga con INSS y actualizar bases de cotización.',
          });
        }
      }
    }
  }

  return {
    id: 'incident_impact',
    label: DOMAIN_LABELS.incident_impact,
    status: statusFromSeverities(checks),
    score: scoreFromChecks(checks),
    checks,
    alertCount: checks.filter(c => c.status !== 'ok').length,
  };
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

export function runFiscalSupervisor(input: FiscalSupervisorInput): FiscalSupervisorResult {
  const periodLabel = `${input.periodMonth.toString().padStart(2, '0')}/${input.periodYear}`;

  const domains: FiscalDomainResult[] = [
    evaluateIRPFCoherence(input),
    evaluateModelo111(input),
    evaluateModelo190(input),
    evaluateModelo145(input),
    evaluateSSCRA(input),
    evaluateInternational(input),
    evaluateIncidentImpact(input),
  ];

  // Collect alerts from non-ok checks
  const alerts: FiscalSupervisorAlert[] = [];
  for (const domain of domains) {
    for (const check of domain.checks) {
      if (check.status !== 'ok' && check.status !== 'missing_evidence') {
        alerts.push(createSupervisorAlert(check, periodLabel));
      }
    }
  }

  // Deduplicate alerts by key
  const dedupedAlerts = new Map<string, FiscalSupervisorAlert>();
  for (const a of alerts) {
    const existing = dedupedAlerts.get(a.deduplicationKey);
    if (!existing || a.priority < existing.priority) {
      dedupedAlerts.set(a.deduplicationKey, a);
    }
  }
  const finalAlerts = Array.from(dedupedAlerts.values()).sort((a, b) => a.priority - b.priority);

  // Aggregate
  const allChecks = domains.flatMap(d => d.checks);
  const totalChecks = allChecks.length;
  const passedChecks = allChecks.filter(c => c.status === 'ok').length;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  // Overall status: worst of all domains, but missing_evidence and preparatory_pending don't escalate to critical
  const domainStatuses = domains.map(d => d.status);
  let overallStatus: FiscalCheckStatus = 'ok';
  if (domainStatuses.some(s => s === 'critical')) overallStatus = 'critical';
  else if (domainStatuses.some(s => s === 'warning')) overallStatus = 'warning';
  else if (domainStatuses.some(s => s === 'preparatory_pending')) overallStatus = 'preparatory_pending';
  else if (domainStatuses.some(s => s === 'missing_evidence')) overallStatus = 'missing_evidence';

  return {
    overallStatus,
    score,
    domains,
    alerts: finalAlerts,
    totalChecks,
    passedChecks,
    timestamp: new Date().toISOString(),
    disclaimer: DISCLAIMER,
    filters: {
      companyId: input.companyId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
    },
  };
}

// ─── Visual helpers ─────────────────────────────────────────────────────────

export const FISCAL_STATUS_CONFIG: Record<FiscalCheckStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  ok: { label: 'OK', color: 'text-green-700', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: 'check-circle' },
  missing_evidence: { label: 'Sin evidencia', color: 'text-slate-500', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20', icon: 'file-question' },
  preparatory_pending: { label: 'Preparatorio', color: 'text-sky-600', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20', icon: 'clock' },
  warning: { label: 'Atención', color: 'text-amber-700', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: 'alert-triangle' },
  critical: { label: 'Crítico', color: 'text-red-700', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: 'alert-octagon' },
};

export function getOverallScoreColor(score: number): string {
  if (score >= 80) return 'text-green-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
}
