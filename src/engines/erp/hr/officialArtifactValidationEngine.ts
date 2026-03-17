/**
 * officialArtifactValidationEngine.ts — V2-RRHH-P2
 * Pre-generation validation rules for official artifacts.
 *
 * Validates that data is complete and consistent BEFORE generating
 * an artifact, reducing error artifacts.
 *
 * Pure functions — no side effects.
 */

import type { AFIWorkerData, AFIEmployerData, AFIContractData } from './afiArtifactEngine';

// ── Types ──

export type P4ArtifactType =
  | 'afi_alta' | 'afi_baja' | 'afi_variacion'
  | 'fan_cotizacion'
  | 'rlc' | 'rnt' | 'cra'
  | 'modelo_111' | 'modelo_190';

export interface ArtifactPreValidation {
  circuitId: string;
  artifactType: P4ArtifactType;
  checks: ArtifactPreCheck[];
  isReady: boolean;
  readinessPercent: number;
  blockingErrors: number;
  warnings: number;
}

export interface ArtifactPreCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'blocking' | 'warning' | 'info';
  detail: string;
  category: 'data_completeness' | 'format' | 'consistency' | 'legal_requirement';
}

// ── AFI Pre-Validation ──

export function validateAFIPrerequisites(params: {
  worker: Partial<AFIWorkerData>;
  employer: Partial<AFIEmployerData>;
  contract: Partial<AFIContractData>;
  actionType: 'alta' | 'baja' | 'variacion';
}): ArtifactPreValidation {
  const checks: ArtifactPreCheck[] = [];

  // Worker data
  checks.push({
    id: 'worker_naf', label: 'NAF del trabajador',
    passed: !!params.worker.naf && params.worker.naf.trim().length > 0,
    severity: 'blocking', detail: params.worker.naf ? 'Disponible' : 'No disponible — obligatorio para TGSS',
    category: 'data_completeness',
  });

  checks.push({
    id: 'worker_dni', label: 'DNI/NIE del trabajador',
    passed: !!params.worker.dniNie && params.worker.dniNie.trim().length > 0,
    severity: 'blocking', detail: params.worker.dniNie ? 'Disponible' : 'No disponible',
    category: 'data_completeness',
  });

  checks.push({
    id: 'worker_name', label: 'Nombre completo',
    passed: !!params.worker.fullName && params.worker.fullName.trim().length > 0,
    severity: 'blocking', detail: params.worker.fullName ? 'Disponible' : 'No disponible',
    category: 'data_completeness',
  });

  // Employer data
  checks.push({
    id: 'employer_ccc', label: 'CCC empresa',
    passed: !!params.employer.ccc && params.employer.ccc.trim().length > 0,
    severity: 'blocking', detail: params.employer.ccc ? 'Disponible' : 'No configurado — obligatorio',
    category: 'data_completeness',
  });

  checks.push({
    id: 'employer_cif', label: 'CIF empresa',
    passed: !!params.employer.cif && params.employer.cif.trim().length > 0,
    severity: 'blocking', detail: params.employer.cif ? 'Disponible' : 'No configurado',
    category: 'data_completeness',
  });

  // Contract data
  checks.push({
    id: 'contract_type', label: 'Tipo de contrato',
    passed: !!params.contract.contractTypeCode,
    severity: 'blocking', detail: params.contract.contractTypeCode ? `Código: ${params.contract.contractTypeCode}` : 'No definido',
    category: 'data_completeness',
  });

  checks.push({
    id: 'contract_grupo', label: 'Grupo de cotización',
    passed: !!params.contract.grupoCotizacion && params.contract.grupoCotizacion >= 1,
    severity: 'blocking', detail: params.contract.grupoCotizacion ? `Grupo ${params.contract.grupoCotizacion}` : 'No asignado',
    category: 'legal_requirement',
  });

  checks.push({
    id: 'contract_regime', label: 'Régimen SS',
    passed: !!params.contract.regime,
    severity: 'blocking', detail: params.contract.regime || 'No definido',
    category: 'legal_requirement',
  });

  // Recommended
  checks.push({
    id: 'contract_iban', label: 'IBAN domiciliación',
    passed: !!params.contract.iban,
    severity: 'warning', detail: params.contract.iban ? 'Disponible' : 'No disponible — recomendado',
    category: 'data_completeness',
  });

  // Consistency checks
  const tempCodes = ['401', '402', '410', '420', '421', '501', '502'];
  if (params.contract.contractTypeCode && tempCodes.includes(params.contract.contractTypeCode)) {
    checks.push({
      id: 'temp_has_end_date', label: 'Contrato temporal con fecha fin',
      passed: !!params.contract.endDate,
      severity: 'warning', detail: params.contract.endDate ? `Hasta ${params.contract.endDate}` : 'Sin fecha fin — recomendado para temporales',
      category: 'consistency',
    });
  }

  const blocking = checks.filter(c => c.severity === 'blocking' && !c.passed).length;
  const warningCount = checks.filter(c => c.severity === 'warning' && !c.passed).length;
  const passed = checks.filter(c => c.passed).length;
  const readinessPercent = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;

  return {
    circuitId: 'tgss_afiliacion',
    artifactType: `afi_${params.actionType}` as ArtifactPreValidation['artifactType'],
    checks,
    isReady: blocking === 0,
    readinessPercent,
    blockingErrors: blocking,
    warnings: warningCount,
  };
}

// ── FAN Pre-Validation ──

export function validateFANPrerequisites(params: {
  companyCCC: string;
  companyCIF: string;
  employeeCount: number;
  allHaveNAF: boolean;
  allHaveGrupo: boolean;
  allHaveSSData: boolean;
  periodYear: number;
  periodMonth: number;
  payrollClosed: boolean;
}): ArtifactPreValidation {
  const checks: ArtifactPreCheck[] = [];

  checks.push({
    id: 'has_ccc', label: 'CCC empresa',
    passed: params.companyCCC.trim().length > 0,
    severity: 'blocking', detail: params.companyCCC || 'No configurado',
    category: 'data_completeness',
  });

  checks.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: params.companyCIF.trim().length > 0,
    severity: 'blocking', detail: params.companyCIF || 'No configurado',
    category: 'data_completeness',
  });

  checks.push({
    id: 'has_employees', label: 'Empleados en período',
    passed: params.employeeCount > 0,
    severity: 'blocking', detail: params.employeeCount > 0 ? `${params.employeeCount} empleado(s)` : 'Sin empleados',
    category: 'data_completeness',
  });

  checks.push({
    id: 'all_naf', label: 'NAF en todos los empleados',
    passed: params.allHaveNAF,
    severity: 'blocking', detail: params.allHaveNAF ? 'OK' : 'Empleados sin NAF detectados',
    category: 'data_completeness',
  });

  checks.push({
    id: 'all_grupo', label: 'Grupo cotización asignado',
    passed: params.allHaveGrupo,
    severity: 'blocking', detail: params.allHaveGrupo ? 'OK' : 'Empleados sin grupo de cotización',
    category: 'legal_requirement',
  });

  checks.push({
    id: 'ss_data', label: 'Datos SS disponibles',
    passed: params.allHaveSSData,
    severity: 'warning', detail: params.allHaveSSData ? 'Todos desde BD' : 'Algunos con tipos estimados',
    category: 'data_completeness',
  });

  checks.push({
    id: 'payroll_closed', label: 'Nómina del período cerrada',
    passed: params.payrollClosed,
    severity: 'warning', detail: params.payrollClosed ? 'Cerrada' : 'Abierta — se recomienda cerrar antes de generar',
    category: 'consistency',
  });

  checks.push({
    id: 'valid_period', label: 'Período válido',
    passed: params.periodMonth >= 1 && params.periodMonth <= 12 && params.periodYear >= 2020,
    severity: 'blocking', detail: `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`,
    category: 'format',
  });

  const blocking = checks.filter(c => c.severity === 'blocking' && !c.passed).length;
  const warningCount = checks.filter(c => c.severity === 'warning' && !c.passed).length;
  const passed = checks.filter(c => c.passed).length;
  const readinessPercent = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;

  return {
    circuitId: 'tgss_cotizacion',
    artifactType: 'fan_cotizacion',
    checks,
    isReady: blocking === 0,
    readinessPercent,
    blockingErrors: blocking,
    warnings: warningCount,
  };
}

// ── Shared helper for TGSS cotización pre-validations ──

function buildTGSSCotizacionChecks(params: {
  companyCCC: string;
  companyCIF: string;
  employeeCount: number;
  allHaveNAF: boolean;
  periodYear: number;
  periodMonth: number;
  payrollClosed: boolean;
}): ArtifactPreCheck[] {
  const checks: ArtifactPreCheck[] = [];

  checks.push({
    id: 'has_ccc', label: 'CCC empresa',
    passed: params.companyCCC.trim().length > 0,
    severity: 'blocking', detail: params.companyCCC || 'No configurado',
    category: 'data_completeness',
  });

  checks.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: params.companyCIF.trim().length > 0,
    severity: 'blocking', detail: params.companyCIF || 'No configurado',
    category: 'data_completeness',
  });

  checks.push({
    id: 'has_employees', label: 'Empleados en período',
    passed: params.employeeCount > 0,
    severity: 'blocking', detail: params.employeeCount > 0 ? `${params.employeeCount} empleado(s)` : 'Sin empleados',
    category: 'data_completeness',
  });

  checks.push({
    id: 'all_naf', label: 'NAF en todos los trabajadores',
    passed: params.allHaveNAF,
    severity: 'blocking', detail: params.allHaveNAF ? 'OK' : 'Trabajadores sin NAF detectados',
    category: 'data_completeness',
  });

  checks.push({
    id: 'payroll_closed', label: 'Nómina del período cerrada',
    passed: params.payrollClosed,
    severity: 'warning', detail: params.payrollClosed ? 'Cerrada' : 'Abierta — se recomienda cerrar antes',
    category: 'consistency',
  });

  checks.push({
    id: 'valid_period', label: 'Período válido',
    passed: params.periodMonth >= 1 && params.periodMonth <= 12 && params.periodYear >= 2020,
    severity: 'blocking', detail: `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`,
    category: 'format',
  });

  return checks;
}

function computeResult(checks: ArtifactPreCheck[], circuitId: string, artifactType: P4ArtifactType): ArtifactPreValidation {
  const blocking = checks.filter(c => c.severity === 'blocking' && !c.passed).length;
  const warningCount = checks.filter(c => c.severity === 'warning' && !c.passed).length;
  const passed = checks.filter(c => c.passed).length;
  const readinessPercent = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;
  return { circuitId, artifactType, checks, isReady: blocking === 0, readinessPercent, blockingErrors: blocking, warnings: warningCount };
}

// ── RLC Pre-Validation ──

export function validateRLCPrerequisites(params: {
  companyCCC: string;
  companyCIF: string;
  employeeCount: number;
  allHaveNAF: boolean;
  periodYear: number;
  periodMonth: number;
  payrollClosed: boolean;
  fanGenerated: boolean;
}): ArtifactPreValidation {
  const checks = buildTGSSCotizacionChecks(params);
  checks.push({
    id: 'fan_exists', label: 'FAN generado previamente',
    passed: params.fanGenerated,
    severity: 'blocking', detail: params.fanGenerated ? 'Disponible' : 'Debe generar FAN antes de RLC',
    category: 'consistency',
  });
  return computeResult(checks, 'tgss_cotizacion', 'rlc');
}

// ── RNT Pre-Validation ──

export function validateRNTPrerequisites(params: {
  companyCCC: string;
  companyCIF: string;
  employeeCount: number;
  allHaveNAF: boolean;
  periodYear: number;
  periodMonth: number;
  payrollClosed: boolean;
  fanGenerated: boolean;
}): ArtifactPreValidation {
  const checks = buildTGSSCotizacionChecks(params);
  checks.push({
    id: 'fan_exists', label: 'FAN generado previamente',
    passed: params.fanGenerated,
    severity: 'blocking', detail: params.fanGenerated ? 'Disponible' : 'Debe generar FAN antes de RNT',
    category: 'consistency',
  });
  return computeResult(checks, 'tgss_cotizacion', 'rnt');
}

// ── CRA Pre-Validation ──

export function validateCRAPrerequisites(params: {
  companyCCC: string;
  companyCIF: string;
  employeeCount: number;
  allHaveNAF: boolean;
  periodYear: number;
  periodMonth: number;
  payrollClosed: boolean;
  fanGenerated: boolean;
}): ArtifactPreValidation {
  const checks = buildTGSSCotizacionChecks(params);
  checks.push({
    id: 'fan_exists', label: 'FAN generado previamente',
    passed: params.fanGenerated,
    severity: 'blocking', detail: params.fanGenerated ? 'Disponible' : 'Debe generar FAN antes de CRA',
    category: 'consistency',
  });
  return computeResult(checks, 'tgss_cotizacion', 'cra');
}

// ── Modelo 111 Pre-Validation ──

export function validateModelo111Prerequisites(params: {
  companyCIF: string;
  fiscalYear: number;
  trimester: number;
  monthsAvailable: number;
  allMonthsClosed: boolean;
}): ArtifactPreValidation {
  const checks: ArtifactPreCheck[] = [];

  checks.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: params.companyCIF.trim().length > 0,
    severity: 'blocking', detail: params.companyCIF || 'No configurado',
    category: 'data_completeness',
  });

  checks.push({
    id: 'valid_trimester', label: 'Trimestre válido (1-4)',
    passed: params.trimester >= 1 && params.trimester <= 4,
    severity: 'blocking', detail: `${params.trimester}T/${params.fiscalYear}`,
    category: 'format',
  });

  checks.push({
    id: 'has_months', label: 'Meses del trimestre disponibles',
    passed: params.monthsAvailable >= 1,
    severity: 'blocking', detail: `${params.monthsAvailable} de 3 meses`,
    category: 'data_completeness',
  });

  checks.push({
    id: 'complete_quarter', label: 'Trimestre completo (3 meses)',
    passed: params.monthsAvailable === 3,
    severity: 'warning', detail: params.monthsAvailable === 3 ? 'Completo' : `Solo ${params.monthsAvailable} meses`,
    category: 'consistency',
  });

  checks.push({
    id: 'all_closed', label: 'Nóminas del trimestre cerradas',
    passed: params.allMonthsClosed,
    severity: 'warning', detail: params.allMonthsClosed ? 'Todas cerradas' : 'Meses sin cerrar',
    category: 'consistency',
  });

  return computeResult(checks, 'aeat_111', 'modelo_111');
}

// ── Modelo 190 Pre-Validation ──

export function validateModelo190Prerequisites(params: {
  companyCIF: string;
  fiscalYear: number;
  perceptorCount: number;
  allHaveNIF: boolean;
  quarterly111Count: number;
}): ArtifactPreValidation {
  const checks: ArtifactPreCheck[] = [];

  checks.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: params.companyCIF.trim().length > 0,
    severity: 'blocking', detail: params.companyCIF || 'No configurado',
    category: 'data_completeness',
  });

  checks.push({
    id: 'has_perceptores', label: 'Perceptores disponibles',
    passed: params.perceptorCount > 0,
    severity: 'blocking', detail: `${params.perceptorCount} perceptor(es)`,
    category: 'data_completeness',
  });

  checks.push({
    id: 'all_nif', label: 'NIF en todos los perceptores',
    passed: params.allHaveNIF,
    severity: 'blocking', detail: params.allHaveNIF ? 'OK' : 'Perceptores sin NIF',
    category: 'data_completeness',
  });

  checks.push({
    id: 'quarterly_111s', label: 'Modelos 111 trimestrales disponibles',
    passed: params.quarterly111Count === 4,
    severity: 'warning', detail: `${params.quarterly111Count} de 4 trimestres`,
    category: 'consistency',
  });

  checks.push({
    id: 'valid_year', label: 'Ejercicio fiscal válido',
    passed: params.fiscalYear >= 2020,
    severity: 'blocking', detail: `${params.fiscalYear}`,
    category: 'format',
  });

  return computeResult(checks, 'aeat_190', 'modelo_190');
}
