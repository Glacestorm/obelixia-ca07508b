/**
 * officialFormatValidatorEngine.ts — LM3: Official Format Validators
 *
 * Basic structural validators for official file formats.
 * Honest status: `spec_aligned` only if basic structure passes.
 * Does NOT claim production readiness.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type FormatValidationStatus =
  | 'not_verified'
  | 'partially_aligned'
  | 'spec_aligned'
  | 'sandbox_validated'
  | 'rejected';

export interface FormatValidationResult {
  status: FormatValidationStatus;
  errors: string[];
  warnings: string[];
  fieldsChecked: number;
  fieldsPassed: number;
  validatedAt: string;
}

function result(status: FormatValidationStatus, errors: string[], warnings: string[], checked: number, passed: number): FormatValidationResult {
  return { status, errors, warnings, fieldsChecked: checked, fieldsPassed: passed, validatedAt: new Date().toISOString() };
}

// ── FAN / TGSS Validator ────────────────────────────────────────────────────

export function validateFANStructure(payload: Record<string, unknown> | null): FormatValidationResult {
  if (!payload) return result('not_verified', ['No hay payload para validar'], [], 0, 0);

  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0, passed = 0;

  // Header record (type 0)
  checked++;
  if (payload.headerType === '0' || payload.header || payload.tipoRegistro0) {
    passed++;
  } else {
    errors.push('Falta registro cabecera tipo 0');
  }

  // Worker records (type 1)
  checked++;
  const workers = payload.workers || payload.registros || payload.trabajadores;
  if (Array.isArray(workers) && workers.length > 0) {
    passed++;
  } else {
    errors.push('Sin registros de trabajador tipo 1');
  }

  // CCC (Código Cuenta Cotización)
  checked++;
  if (payload.ccc || payload.codigoCuentaCotizacion) {
    passed++;
  } else {
    warnings.push('CCC no detectado en el payload');
  }

  // Company NIF
  checked++;
  if (payload.nifEmpresa || payload.companyNif) {
    passed++;
  } else {
    errors.push('NIF empresa no presente');
  }

  // Period
  checked++;
  if (payload.periodo || payload.period) {
    passed++;
  } else {
    warnings.push('Periodo no especificado');
  }

  const status: FormatValidationStatus = errors.length === 0
    ? (warnings.length === 0 ? 'spec_aligned' : 'partially_aligned')
    : 'rejected';

  return result(status, errors, warnings, checked, passed);
}

// ── XML Contrat@ Validator ──────────────────────────────────────────────────

export function validateContratXMLStructure(payload: Record<string, unknown> | null): FormatValidationResult {
  if (!payload) return result('not_verified', ['No hay payload para validar'], [], 0, 0);

  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0, passed = 0;

  // Required: NIF empresa
  checked++;
  if (payload.nifEmpresa || payload.cifEmpresa || payload.empresaNif) {
    passed++;
  } else {
    errors.push('Campo obligatorio: NIF/CIF empresa');
  }

  // Required: NIF trabajador
  checked++;
  if (payload.nifTrabajador || payload.trabajadorNif || payload.workerNif) {
    passed++;
  } else {
    errors.push('Campo obligatorio: NIF trabajador');
  }

  // Required: Código contrato
  checked++;
  if (payload.codigoContrato || payload.contractCode || payload.tipoContrato) {
    passed++;
  } else {
    errors.push('Campo obligatorio: código de contrato');
  }

  // Required: CNO (Clasificación Nacional de Ocupaciones)
  checked++;
  if (payload.cno || payload.ocupacion) {
    passed++;
  } else {
    errors.push('Campo obligatorio: CNO');
  }

  // Required: Fecha inicio
  checked++;
  if (payload.fechaInicio || payload.startDate) {
    passed++;
  } else {
    errors.push('Campo obligatorio: fecha de inicio');
  }

  // Optional but expected
  checked++;
  if (payload.jornada || payload.jornadaType) {
    passed++;
  } else {
    warnings.push('Jornada no especificada (recomendado)');
  }

  const status: FormatValidationStatus = errors.length === 0
    ? (warnings.length === 0 ? 'spec_aligned' : 'partially_aligned')
    : (passed > 0 ? 'partially_aligned' : 'rejected');

  return result(status, errors, warnings, checked, passed);
}

// ── BOE Modelo 111 Validator ────────────────────────────────────────────────

export function validateBOE111Structure(payload: Record<string, unknown> | null): FormatValidationResult {
  if (!payload) return result('not_verified', ['No hay payload para validar'], [], 0, 0);

  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0, passed = 0;

  // Declarante (type 1 record)
  checked++;
  if (payload.declarante || payload.nifDeclarante) {
    passed++;
  } else {
    errors.push('Falta registro tipo 1 (declarante)');
  }

  // Perceptores (type 2 records)
  checked++;
  const perceptores = payload.perceptores || payload.recipients;
  if (Array.isArray(perceptores) && perceptores.length > 0) {
    passed++;
  } else {
    errors.push('Sin registros tipo 2 (perceptores)');
  }

  // Ejercicio
  checked++;
  if (payload.ejercicio || payload.fiscalYear) {
    passed++;
  } else {
    errors.push('Ejercicio fiscal no especificado');
  }

  // Periodo
  checked++;
  if (payload.periodo || payload.period) {
    passed++;
  } else {
    errors.push('Periodo no especificado');
  }

  // Totales cuadrados
  checked++;
  if (payload.totalRetenciones !== undefined && payload.totalBases !== undefined) {
    const ret = Number(payload.totalRetenciones) || 0;
    const bas = Number(payload.totalBases) || 0;
    if (bas > 0 && ret <= bas) {
      passed++;
    } else {
      warnings.push('Totales podrían no cuadrar: retenciones vs bases');
    }
  } else {
    warnings.push('Totales de retenciones/bases no disponibles para validar');
  }

  const status: FormatValidationStatus = errors.length === 0
    ? (warnings.length === 0 ? 'spec_aligned' : 'partially_aligned')
    : (passed >= 2 ? 'partially_aligned' : 'rejected');

  return result(status, errors, warnings, checked, passed);
}

// ── BOE Modelo 190 Validator ────────────────────────────────────────────────

export function validateBOE190Structure(payload: Record<string, unknown> | null): FormatValidationResult {
  if (!payload) return result('not_verified', ['No hay payload para validar'], [], 0, 0);

  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0, passed = 0;

  // Declarante
  checked++;
  if (payload.declarante || payload.nifDeclarante) {
    passed++;
  } else {
    errors.push('Falta registro tipo 1 (declarante)');
  }

  // Perceptores con clave/subclave
  checked++;
  const perceptores = payload.perceptores || payload.recipients;
  if (Array.isArray(perceptores) && perceptores.length > 0) {
    passed++;
    // Check clave/subclave
    checked++;
    const withClaves = (perceptores as Record<string, unknown>[]).filter(
      p => p.clave || p.clavePercepcion
    );
    if (withClaves.length === perceptores.length) {
      passed++;
    } else {
      warnings.push(`${perceptores.length - withClaves.length} perceptores sin clave/subclave`);
    }
  } else {
    errors.push('Sin registros tipo 2 (perceptores con clave/subclave)');
  }

  // Ejercicio anual
  checked++;
  if (payload.ejercicio || payload.fiscalYear) {
    passed++;
  } else {
    errors.push('Ejercicio fiscal no especificado');
  }

  // Totales anuales
  checked++;
  if (payload.totalRetenciones !== undefined) {
    passed++;
  } else {
    warnings.push('Total retenciones anuales no disponible');
  }

  const status: FormatValidationStatus = errors.length === 0
    ? (warnings.length === 0 ? 'spec_aligned' : 'partially_aligned')
    : (passed >= 2 ? 'partially_aligned' : 'rejected');

  return result(status, errors, warnings, checked, passed);
}

// ── Certific@2 Payload Validator ────────────────────────────────────────────

export function validateCertificaPayload(payload: Record<string, unknown> | null): FormatValidationResult {
  if (!payload) return result('not_verified', ['No hay payload para validar'], [], 0, 0);

  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0, passed = 0;

  // Causa baja SEPE
  checked++;
  if (payload.causaBaja || payload.terminationReason) {
    passed++;
  } else {
    errors.push('Causa de baja SEPE no especificada');
  }

  // Bases cotización últimos 180 días
  checked++;
  const bases = payload.basesCotizacion || payload.contributionBases;
  if (bases && (Array.isArray(bases) ? bases.length > 0 : true)) {
    passed++;
  } else {
    errors.push('Bases de cotización últimos 180 días no incluidas');
  }

  // Datos trabajador
  checked++;
  if (payload.nifTrabajador || payload.workerNif) {
    passed++;
  } else {
    errors.push('NIF trabajador no presente');
  }

  // Datos empresa
  checked++;
  if (payload.nifEmpresa || payload.companyNif) {
    passed++;
  } else {
    errors.push('NIF empresa no presente');
  }

  // Fecha baja
  checked++;
  if (payload.fechaBaja || payload.terminationDate) {
    passed++;
  } else {
    errors.push('Fecha de baja no especificada');
  }

  const status: FormatValidationStatus = errors.length === 0
    ? 'spec_aligned'
    : (passed >= 3 ? 'partially_aligned' : 'rejected');

  return result(status, errors, warnings, checked, passed);
}

// ── Dispatch by organism ────────────────────────────────────────────────────

export function validateFormatByOrganism(
  organism: string,
  payload: Record<string, unknown> | null
): FormatValidationResult {
  switch (organism) {
    case 'tgss': return validateFANStructure(payload);
    case 'contrata': return validateContratXMLStructure(payload);
    case 'certifica': return validateCertificaPayload(payload);
    case 'aeat_111': return validateBOE111Structure(payload);
    case 'aeat_190': return validateBOE190Structure(payload);
    default: return result('not_verified', [`Organismo no soportado: ${organism}`], [], 0, 0);
  }
}
