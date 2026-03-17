/**
 * afiArtifactEngine.ts — V2-RRHH-P2
 * Generador de artefactos AFI (Afiliación) para TGSS / SILTRA.
 *
 * Soporta:
 *  - Alta (AFA): alta inicial, reingreso
 *  - Baja (AFB): voluntaria, disciplinaria, fin contrato, ERE, etc.
 *  - Variación de datos (AFV): cambio grupo, contrato, jornada, etc.
 *
 * Genera payloads estructurados con validación previa, no ficheros binarios SILTRA.
 * Cada artefacto queda vinculado a un circuito, período y empleado(s).
 *
 * IMPORTANTE: Generado ≠ presentado. isRealSubmissionBlocked === true.
 * Legislación referencia: RD 84/1996 (Reglamento General sobre inscripción de empresas),
 *   Orden ESS/1187/2015 (Sistema RED).
 */

// ── Types ──

export type AFIActionType = 'alta' | 'baja' | 'variacion';

export type AFIAltaSubtype = 'alta_inicial' | 'alta_reingreso' | 'alta_pluriempleo' | 'alta_transferencia';

export type AFIBajaSubtype =
  | 'baja_voluntaria'
  | 'baja_fin_contrato'
  | 'baja_despido_disciplinario'
  | 'baja_despido_objetivo'
  | 'baja_ere'
  | 'baja_jubilacion'
  | 'baja_fallecimiento'
  | 'baja_incapacidad_permanente'
  | 'baja_mutuo_acuerdo';

export type AFIVariacionSubtype =
  | 'cambio_grupo_cotizacion'
  | 'cambio_tipo_contrato'
  | 'cambio_coeficiente_parcialidad'
  | 'cambio_epigrafe_at'
  | 'cambio_datos_personales'
  | 'cambio_centro_trabajo'
  | 'cambio_convenio'
  | 'cambio_categoria'
  | 'cambio_iban';

export interface AFIWorkerData {
  employeeId: string;
  naf: string;
  dniNie: string;
  dniType: 'DNI' | 'NIE';
  fullName: string;
  birthDate: string;
  sexo: 'H' | 'M';
  nacionalidad: string;
  domicilio?: string;
  codigoPostal?: string;
  municipio?: string;
  provincia?: string;
}

export interface AFIEmployerData {
  ccc: string;
  cif: string;
  razonSocial: string;
  domicilio?: string;
}

export interface AFIContractData {
  contractTypeCode: string;
  startDate: string;
  endDate?: string | null;
  grupoCotizacion: number;
  coeficienteParcialidad: number;
  regime: string;
  occupationCode?: string | null;
  collectiveAgreement?: string | null;
  trialPeriodDays?: number | null;
  workCenter?: string | null;
  iban?: string | null;
  epigrafAT?: string | null;
}

/** For variación: before and after values */
export interface AFIVariacionChange {
  field: string;
  label: string;
  valueBefore: string | number | null;
  valueAfter: string | number | null;
}

/** For baja: reason and date details */
export interface AFIBajaDetails {
  fechaBaja: string;
  motivoBaja: AFIBajaSubtype;
  motivoBajaLabel: string;
  ultimoDiaTrabajo?: string;
  derechoDesempleo: boolean;
  indemnizacion?: number | null;
}

// ── Artifact ──

export interface AFIArtifact {
  id: string;
  actionType: AFIActionType;
  actionSubtype: AFIAltaSubtype | AFIBajaSubtype | AFIVariacionSubtype;
  actionLabel: string;
  circuitId: 'tgss_afiliacion';

  worker: AFIWorkerData;
  employer: AFIEmployerData;
  contract: AFIContractData;

  /** Only for baja */
  bajaDetails?: AFIBajaDetails;
  /** Only for variación */
  variacionChanges?: AFIVariacionChange[];

  // Metadata
  companyId: string;
  periodId?: string | null;
  effectiveDate: string;
  generatedAt: string;
  version: string;

  // Validation
  validations: AFIFieldValidation[];
  isValid: boolean;
  readinessPercent: number;
  warnings: string[];

  // Honest status
  artifactStatus: AFIArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
}

export type AFIArtifactStatus =
  | 'generated'
  | 'validated_internal'
  | 'dry_run_ready'
  | 'pending_approval'
  | 'error';

export interface AFIFieldValidation {
  field: string;
  label: string;
  present: boolean;
  valid: boolean;
  error: string | null;
  required: boolean;
}

// ── Status labels ──

export const AFI_STATUS_META: Record<AFIArtifactStatus, { label: string; color: string; disclaimer: string }> = {
  generated: {
    label: 'Generado (interno)',
    color: 'bg-blue-500/10 text-blue-700',
    disclaimer: 'Artefacto generado internamente. NO constituye comunicación oficial a la TGSS.',
  },
  validated_internal: {
    label: 'Validado internamente',
    color: 'bg-indigo-500/10 text-indigo-700',
    disclaimer: 'Validación interna superada. NO ha sido validado por SILTRA ni por la TGSS.',
  },
  dry_run_ready: {
    label: 'Listo para dry-run',
    color: 'bg-emerald-500/10 text-emerald-700',
    disclaimer: 'Preparado para simulación interna. El envío real permanece bloqueado.',
  },
  pending_approval: {
    label: 'Pendiente de aprobación',
    color: 'bg-amber-500/10 text-amber-700',
    disclaimer: 'Requiere aprobación interna antes de avanzar. NO es un envío oficial.',
  },
  error: {
    label: 'Error en validación',
    color: 'bg-destructive/10 text-destructive',
    disclaimer: 'El artefacto contiene errores que impiden su procesamiento.',
  },
};

const AFI_ACTION_LABELS: Record<AFIActionType, string> = {
  alta: 'Alta en Seguridad Social',
  baja: 'Baja en Seguridad Social',
  variacion: 'Variación de datos',
};

const AFI_BAJA_LABELS: Record<AFIBajaSubtype, string> = {
  baja_voluntaria: 'Baja voluntaria del trabajador',
  baja_fin_contrato: 'Finalización de contrato temporal',
  baja_despido_disciplinario: 'Despido disciplinario',
  baja_despido_objetivo: 'Despido por causas objetivas',
  baja_ere: 'Expediente de regulación de empleo',
  baja_jubilacion: 'Jubilación',
  baja_fallecimiento: 'Fallecimiento',
  baja_incapacidad_permanente: 'Incapacidad permanente',
  baja_mutuo_acuerdo: 'Extinción por mutuo acuerdo',
};

// ── Validators ──

function validateNAF(v: string): string | null {
  const c = v.replace(/[\s\-\/]/g, '');
  return /^\d{12}$/.test(c) ? null : 'NAF: 12 dígitos';
}

function validateDNINIE(v: string): { valid: boolean; type: 'DNI' | 'NIE'; error: string | null } {
  const c = v.trim().toUpperCase();
  if (/^\d{8}[A-Z]$/.test(c)) return { valid: true, type: 'DNI', error: null };
  if (/^[XYZ]\d{7}[A-Z]$/.test(c)) return { valid: true, type: 'NIE', error: null };
  return { valid: false, type: /^[XYZ]/.test(c) ? 'NIE' : 'DNI', error: 'Formato inválido' };
}

function validateCCC(v: string): string | null {
  const c = v.replace(/[\s\-\/]/g, '');
  return /^\d{11}$/.test(c) ? null : 'CCC: 11 dígitos';
}

function validateCIF(v: string): string | null {
  const c = v.trim().toUpperCase();
  return /^[A-Z]\d{7}[A-Z0-9]$/.test(c) ? null : 'CIF: Letra + 7 dígitos + control';
}

function validateDate(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Formato AAAA-MM-DD';
  return isNaN(new Date(v).getTime()) ? 'Fecha inválida' : null;
}

function validateGrupo(v: number): string | null {
  return v >= 1 && v <= 11 ? null : 'Grupo 1-11';
}

const TEMPORARY_CODES = ['401', '402', '410', '420', '421', '501', '502'];

// ── Field checker helper ──

function checkField(
  validations: AFIFieldValidation[],
  field: string, label: string,
  value: string | number | null | undefined,
  required: boolean,
  validator?: (v: string) => string | null,
): void {
  const strVal = value != null ? String(value).trim() : '';
  const present = strVal !== '';
  let error: string | null = null;
  let valid = true;
  if (!present) {
    valid = !required;
    if (required) error = `${label} es obligatorio`;
  } else if (validator) {
    error = validator(strVal);
    valid = error === null;
  }
  validations.push({ field, label, present, valid, error, required });
}

// ── Generate unique ID ──

function generateArtifactId(action: AFIActionType): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `AFI-${action.toUpperCase()}-${ts}-${rand}`;
}

// ── Builder: Alta ──

export function buildAFIAlta(params: {
  worker: AFIWorkerData;
  employer: AFIEmployerData;
  contract: AFIContractData;
  subtype: AFIAltaSubtype;
  companyId: string;
  periodId?: string;
}): AFIArtifact {
  const validations: AFIFieldValidation[] = [];
  const warnings: string[] = [];

  // Validate worker
  checkField(validations, 'naf', 'NAF', params.worker.naf, true, validateNAF);
  checkField(validations, 'dniNie', 'DNI/NIE', params.worker.dniNie, true, v => validateDNINIE(v).error);
  checkField(validations, 'fullName', 'Nombre completo', params.worker.fullName, true);
  checkField(validations, 'birthDate', 'Fecha nacimiento', params.worker.birthDate, true, validateDate);

  // Validate employer
  checkField(validations, 'ccc', 'CCC', params.employer.ccc, true, validateCCC);
  checkField(validations, 'cif', 'CIF', params.employer.cif, true, validateCIF);
  checkField(validations, 'razonSocial', 'Razón social', params.employer.razonSocial, true);

  // Validate contract
  checkField(validations, 'contractTypeCode', 'Tipo contrato', params.contract.contractTypeCode, true);
  checkField(validations, 'startDate', 'Fecha alta', params.contract.startDate, true, validateDate);
  checkField(validations, 'grupoCotizacion', 'Grupo cotización', params.contract.grupoCotizacion, true, v => validateGrupo(Number(v)));
  checkField(validations, 'regime', 'Régimen', params.contract.regime, true);

  // Optional but recommended
  checkField(validations, 'coeficienteParcialidad', 'Coef. jornada', params.contract.coeficienteParcialidad, false);
  checkField(validations, 'endDate', 'Fecha fin', params.contract.endDate, false, v => v ? validateDate(v) : null);
  checkField(validations, 'iban', 'IBAN', params.contract.iban, false);

  // Temporal contract without end date
  if (TEMPORARY_CODES.includes(params.contract.contractTypeCode) && !params.contract.endDate) {
    warnings.push('Contrato temporal sin fecha fin — recomendado para la TGSS');
  }

  const requiredValid = validations.filter(v => v.required && v.valid).length;
  const totalRequired = validations.filter(v => v.required).length;
  const readinessPercent = totalRequired > 0 ? Math.round((requiredValid / totalRequired) * 100) : 0;
  const isValid = validations.every(v => !v.required || v.valid);

  const status: AFIArtifactStatus = !isValid ? 'error' : 'generated';

  return {
    id: generateArtifactId('alta'),
    actionType: 'alta',
    actionSubtype: params.subtype,
    actionLabel: AFI_ACTION_LABELS.alta,
    circuitId: 'tgss_afiliacion',
    worker: params.worker,
    employer: params.employer,
    contract: params.contract,
    companyId: params.companyId,
    periodId: params.periodId ?? null,
    effectiveDate: params.contract.startDate,
    generatedAt: new Date().toISOString(),
    version: '1.0-P2',
    validations,
    isValid,
    readinessPercent,
    warnings,
    artifactStatus: status,
    statusLabel: AFI_STATUS_META[status].label,
    statusDisclaimer: AFI_STATUS_META[status].disclaimer,
  };
}

// ── Builder: Baja ──

export function buildAFIBaja(params: {
  worker: AFIWorkerData;
  employer: AFIEmployerData;
  contract: AFIContractData;
  bajaDetails: AFIBajaDetails;
  companyId: string;
  periodId?: string;
}): AFIArtifact {
  const validations: AFIFieldValidation[] = [];
  const warnings: string[] = [];

  checkField(validations, 'naf', 'NAF', params.worker.naf, true, validateNAF);
  checkField(validations, 'dniNie', 'DNI/NIE', params.worker.dniNie, true, v => validateDNINIE(v).error);
  checkField(validations, 'ccc', 'CCC', params.employer.ccc, true, validateCCC);
  checkField(validations, 'fechaBaja', 'Fecha baja', params.bajaDetails.fechaBaja, true, validateDate);
  checkField(validations, 'motivoBaja', 'Motivo baja', params.bajaDetails.motivoBaja, true);

  if (params.bajaDetails.derechoDesempleo && !params.bajaDetails.ultimoDiaTrabajo) {
    warnings.push('Con derecho a desempleo pero sin último día de trabajo especificado');
  }

  const requiredValid = validations.filter(v => v.required && v.valid).length;
  const totalRequired = validations.filter(v => v.required).length;
  const readinessPercent = totalRequired > 0 ? Math.round((requiredValid / totalRequired) * 100) : 0;
  const isValid = validations.every(v => !v.required || v.valid);
  const status: AFIArtifactStatus = !isValid ? 'error' : 'generated';

  return {
    id: generateArtifactId('baja'),
    actionType: 'baja',
    actionSubtype: params.bajaDetails.motivoBaja,
    actionLabel: AFI_ACTION_LABELS.baja,
    circuitId: 'tgss_afiliacion',
    worker: params.worker,
    employer: params.employer,
    contract: params.contract,
    bajaDetails: params.bajaDetails,
    companyId: params.companyId,
    periodId: params.periodId ?? null,
    effectiveDate: params.bajaDetails.fechaBaja,
    generatedAt: new Date().toISOString(),
    version: '1.0-P2',
    validations,
    isValid,
    readinessPercent,
    warnings,
    artifactStatus: status,
    statusLabel: AFI_STATUS_META[status].label,
    statusDisclaimer: AFI_STATUS_META[status].disclaimer,
  };
}

// ── Builder: Variación ──

export function buildAFIVariacion(params: {
  worker: AFIWorkerData;
  employer: AFIEmployerData;
  contract: AFIContractData;
  variacionSubtype: AFIVariacionSubtype;
  changes: AFIVariacionChange[];
  effectiveDate: string;
  companyId: string;
  periodId?: string;
}): AFIArtifact {
  const validations: AFIFieldValidation[] = [];
  const warnings: string[] = [];

  checkField(validations, 'naf', 'NAF', params.worker.naf, true, validateNAF);
  checkField(validations, 'dniNie', 'DNI/NIE', params.worker.dniNie, true, v => validateDNINIE(v).error);
  checkField(validations, 'ccc', 'CCC', params.employer.ccc, true, validateCCC);
  checkField(validations, 'effectiveDate', 'Fecha efecto', params.effectiveDate, true, validateDate);

  if (params.changes.length === 0) {
    warnings.push('Variación sin cambios registrados');
  }

  const requiredValid = validations.filter(v => v.required && v.valid).length;
  const totalRequired = validations.filter(v => v.required).length;
  const readinessPercent = totalRequired > 0 ? Math.round((requiredValid / totalRequired) * 100) : 0;
  const isValid = validations.every(v => !v.required || v.valid) && params.changes.length > 0;
  const status: AFIArtifactStatus = !isValid ? 'error' : 'generated';

  return {
    id: generateArtifactId('variacion'),
    actionType: 'variacion',
    actionSubtype: params.variacionSubtype,
    actionLabel: AFI_ACTION_LABELS.variacion,
    circuitId: 'tgss_afiliacion',
    worker: params.worker,
    employer: params.employer,
    contract: params.contract,
    variacionChanges: params.changes,
    companyId: params.companyId,
    periodId: params.periodId ?? null,
    effectiveDate: params.effectiveDate,
    generatedAt: new Date().toISOString(),
    version: '1.0-P2',
    validations,
    isValid,
    readinessPercent,
    warnings,
    artifactStatus: status,
    statusLabel: AFI_STATUS_META[status].label,
    statusDisclaimer: AFI_STATUS_META[status].disclaimer,
  };
}

// ── Promote status ──

export function promoteAFIStatus(
  artifact: AFIArtifact,
  targetStatus: AFIArtifactStatus,
): AFIArtifact {
  const validTransitions: Record<AFIArtifactStatus, AFIArtifactStatus[]> = {
    generated: ['validated_internal', 'error'],
    validated_internal: ['dry_run_ready', 'error'],
    dry_run_ready: ['pending_approval', 'error'],
    pending_approval: ['validated_internal'],
    error: ['generated'],
  };

  const allowed = validTransitions[artifact.artifactStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    return { ...artifact, warnings: [...artifact.warnings, `Transición no permitida: ${artifact.artifactStatus} → ${targetStatus}`] };
  }

  return {
    ...artifact,
    artifactStatus: targetStatus,
    statusLabel: AFI_STATUS_META[targetStatus].label,
    statusDisclaimer: AFI_STATUS_META[targetStatus].disclaimer,
  };
}

// ── Serialize for evidence snapshot ──

export function serializeAFIForSnapshot(artifact: AFIArtifact): Record<string, unknown> {
  return {
    id: artifact.id,
    actionType: artifact.actionType,
    actionSubtype: artifact.actionSubtype,
    circuitId: artifact.circuitId,
    worker: { naf: artifact.worker.naf, dniNie: artifact.worker.dniNie, fullName: artifact.worker.fullName },
    employer: { ccc: artifact.employer.ccc, cif: artifact.employer.cif },
    effectiveDate: artifact.effectiveDate,
    isValid: artifact.isValid,
    readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus,
    version: artifact.version,
    generatedAt: artifact.generatedAt,
    validationErrors: artifact.validations.filter(v => !v.valid).map(v => v.error),
    warningCount: artifact.warnings.length,
  };
}
