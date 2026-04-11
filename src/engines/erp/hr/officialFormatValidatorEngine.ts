/**
 * officialFormatValidatorEngine.ts — LM4: Official Format Validators
 *
 * Structural validators for official file formats with deeper checks.
 * Honest status: `spec_aligned` only if deeper structure passes.
 * `uat_confirmed` requires real organism response evidence.
 * Does NOT claim production readiness without real evidence.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type FormatValidationStatus =
  | 'not_verified'
  | 'partially_aligned'
  | 'spec_aligned'
  | 'sandbox_validated'
  | 'uat_confirmed'
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function isValidNIF(nif: unknown): boolean {
  if (typeof nif !== 'string') return false;
  return /^[0-9XYZKLM][0-9]{7}[A-Z]$/i.test(nif.trim()) || /^[A-Z][0-9]{7}[A-Z0-9]$/i.test(nif.trim());
}

function isValidNAF(naf: unknown): boolean {
  if (typeof naf !== 'string') return false;
  return /^[0-9]{12}$/.test(naf.replace(/\s/g, ''));
}

const VALID_CONTRATA_CODES = ['100', '109', '130', '150', '189', '200', '209', '230', '250', '289', '300', '309', '401', '402', '410', '420', '421', '430', '431', '441', '450', '451', '452', '500', '501', '502', '510', '520', '540'];
const VALID_CERTIFICA_CAUSAS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '69', '77', '78', '91', '92', '93', '94'];
const VALID_190_CLAVES = ['A', 'B', 'B01', 'B02', 'B03', 'C', 'D', 'E', 'F', 'G', 'G01', 'G02', 'G03', 'H', 'I', 'J', 'K', 'L'];

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
  const nifEmpresa = payload.nifEmpresa || payload.companyNif;
  if (nifEmpresa) {
    passed++;
    // Deep: NIF format
    checked++;
    if (isValidNIF(nifEmpresa)) {
      passed++;
    } else {
      warnings.push('NIF empresa no tiene formato válido (esperado: 8 dígitos + letra o CIF)');
    }
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

  // Deep: NAF format per worker
  if (Array.isArray(workers) && workers.length > 0) {
    checked++;
    const workersWithNAF = (workers as Record<string, unknown>[]).filter(w => isValidNAF(w.naf || w.NAF || w.nss));
    if (workersWithNAF.length === workers.length) {
      passed++;
    } else {
      warnings.push(`${workers.length - workersWithNAF.length}/${workers.length} trabajadores sin NAF válido (12 dígitos)`);
    }

    // Deep: IPF per worker
    checked++;
    const workersWithIPF = (workers as Record<string, unknown>[]).filter(w => w.ipf || w.IPF || w.nifTrabajador);
    if (workersWithIPF.length === workers.length) {
      passed++;
    } else {
      warnings.push(`${workers.length - workersWithIPF.length}/${workers.length} trabajadores sin IPF`);
    }

    // Deep: Action code (A/B/V)
    checked++;
    const validActions = ['A', 'B', 'V', 'a', 'b', 'v'];
    const workersWithAction = (workers as Record<string, unknown>[]).filter(w =>
      validActions.includes(String(w.accion || w.action || w.tipoAccion || ''))
    );
    if (workersWithAction.length === workers.length) {
      passed++;
    } else {
      warnings.push(`${workers.length - workersWithAction.length}/${workers.length} trabajadores sin código acción válido (A/B/V)`);
    }
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
  const nifEmp = payload.nifEmpresa || payload.cifEmpresa || payload.empresaNif;
  if (nifEmp) {
    passed++;
    checked++;
    if (isValidNIF(nifEmp)) { passed++; }
    else { warnings.push('NIF/CIF empresa no tiene formato estándar'); }
  } else {
    errors.push('Campo obligatorio: NIF/CIF empresa');
  }

  // Required: NIF trabajador
  checked++;
  const nifTrab = payload.nifTrabajador || payload.trabajadorNif || payload.workerNif;
  if (nifTrab) {
    passed++;
    checked++;
    if (isValidNIF(nifTrab)) { passed++; }
    else { warnings.push('NIF trabajador no tiene formato estándar'); }
  } else {
    errors.push('Campo obligatorio: NIF trabajador');
  }

  // Required: Código contrato — validate against official catalog
  checked++;
  const contractCode = String(payload.codigoContrato || payload.contractCode || payload.tipoContrato || '');
  if (contractCode) {
    passed++;
    checked++;
    if (VALID_CONTRATA_CODES.includes(contractCode)) {
      passed++;
    } else {
      warnings.push(`Código contrato '${contractCode}' no encontrado en catálogo oficial SEPE (${VALID_CONTRATA_CODES.length} códigos)`);
    }
  } else {
    errors.push('Campo obligatorio: código de contrato');
  }

  // Required: CNO
  checked++;
  if (payload.cno || payload.ocupacion) {
    passed++;
  } else {
    errors.push('Campo obligatorio: CNO');
  }

  // Required: Fecha inicio — date format
  checked++;
  const fechaInicio = String(payload.fechaInicio || payload.startDate || '');
  if (fechaInicio) {
    passed++;
    checked++;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      passed++;
    } else {
      warnings.push(`Fecha inicio '${fechaInicio}' no cumple formato YYYY-MM-DD`);
    }
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
  const declarante = payload.declarante || payload.nifDeclarante;
  if (declarante) {
    passed++;
    // Deep: NIF format
    checked++;
    const nifDec = typeof declarante === 'object' ? (declarante as Record<string, unknown>).nif : declarante;
    if (isValidNIF(nifDec)) { passed++; }
    else { warnings.push('NIF declarante no tiene formato válido'); }
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

  // Ejercicio — must be 4-digit year
  checked++;
  const ejercicio = String(payload.ejercicio || payload.fiscalYear || '');
  if (ejercicio) {
    passed++;
    checked++;
    if (/^\d{4}$/.test(ejercicio) && Number(ejercicio) >= 2000 && Number(ejercicio) <= 2099) {
      passed++;
    } else {
      warnings.push(`Ejercicio '${ejercicio}' no es un año válido (4 dígitos, 2000-2099)`);
    }
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

  // Deep: Record length hint (BOE 111 = 250 chars fixed per record)
  checked++;
  const rawRecords = payload.rawRecords || payload.registrosBrutos;
  if (Array.isArray(rawRecords)) {
    const invalidLength = (rawRecords as string[]).filter(r => typeof r === 'string' && r.length !== 250);
    if (invalidLength.length === 0) {
      passed++;
    } else {
      warnings.push(`${invalidLength.length} registros no tienen longitud fija 250 chars (spec BOE)`);
    }
  } else {
    // Not available — informational only
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
  const declarante = payload.declarante || payload.nifDeclarante;
  if (declarante) {
    passed++;
    checked++;
    const nifDec = typeof declarante === 'object' ? (declarante as Record<string, unknown>).nif : declarante;
    if (isValidNIF(nifDec)) { passed++; }
    else { warnings.push('NIF declarante no tiene formato válido'); }
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

    // Deep: Validate clave values against official catalog
    checked++;
    const validClaves = withClaves.filter(p => {
      const clave = String(p.clave || p.clavePercepcion || '').toUpperCase();
      return VALID_190_CLAVES.includes(clave);
    });
    if (validClaves.length === withClaves.length) {
      passed++;
    } else {
      warnings.push(`${withClaves.length - validClaves.length} perceptores con clave no válida (catálogo: ${VALID_190_CLAVES.slice(0, 5).join(',')}...)`);
    }

    // Deep: Subclave format
    checked++;
    const withSubclave = (perceptores as Record<string, unknown>[]).filter(p => p.subclave);
    if (withSubclave.length > 0) {
      const validSubclaves = withSubclave.filter(p => /^[0-9]{2}$/.test(String(p.subclave)));
      if (validSubclaves.length === withSubclave.length) {
        passed++;
      } else {
        warnings.push(`${withSubclave.length - validSubclaves.length} subclaves no tienen formato 2 dígitos`);
      }
    } else {
      passed++; // subclave is optional
    }
  } else {
    errors.push('Sin registros tipo 2 (perceptores con clave/subclave)');
  }

  // Ejercicio anual
  checked++;
  const ejercicio = String(payload.ejercicio || payload.fiscalYear || '');
  if (ejercicio) {
    passed++;
    checked++;
    if (/^\d{4}$/.test(ejercicio) && Number(ejercicio) >= 2000) { passed++; }
    else { warnings.push(`Ejercicio '${ejercicio}' no es un año válido`); }
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

  // Causa baja SEPE — validate against official codes
  checked++;
  const causaBaja = String(payload.causaBaja || payload.terminationReason || '');
  if (causaBaja) {
    passed++;
    checked++;
    if (VALID_CERTIFICA_CAUSAS.includes(causaBaja)) {
      passed++;
    } else {
      warnings.push(`Causa baja '${causaBaja}' no encontrada en las ${VALID_CERTIFICA_CAUSAS.length} causas oficiales SEPE`);
    }
  } else {
    errors.push('Causa de baja SEPE no especificada');
  }

  // Bases cotización últimos 180 días — require ≥6 months
  checked++;
  const bases = payload.basesCotizacion || payload.contributionBases;
  if (bases && Array.isArray(bases)) {
    if (bases.length > 0) {
      passed++;
      checked++;
      if (bases.length >= 6) {
        passed++;
      } else {
        warnings.push(`Solo ${bases.length} meses de bases cotización (se requieren ≥6 meses / 180 días)`);
      }
    } else {
      errors.push('Array de bases de cotización vacío');
    }
  } else if (bases) {
    passed++;
  } else {
    errors.push('Bases de cotización últimos 180 días no incluidas');
  }

  // Datos trabajador
  checked++;
  const nifTrab = payload.nifTrabajador || payload.workerNif;
  if (nifTrab) {
    passed++;
    checked++;
    if (isValidNIF(nifTrab)) { passed++; }
    else { warnings.push('NIF trabajador no tiene formato estándar'); }
  } else {
    errors.push('NIF trabajador no presente');
  }

  // Datos empresa
  checked++;
  const nifEmp = payload.nifEmpresa || payload.companyNif;
  if (nifEmp) {
    passed++;
    checked++;
    if (isValidNIF(nifEmp)) { passed++; }
    else { warnings.push('NIF empresa no tiene formato estándar'); }
  } else {
    errors.push('NIF empresa no presente');
  }

  // Fecha baja
  checked++;
  const fechaBaja = String(payload.fechaBaja || payload.terminationDate || '');
  if (fechaBaja) {
    passed++;
    checked++;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaBaja)) { passed++; }
    else { warnings.push(`Fecha baja '${fechaBaja}' no cumple formato YYYY-MM-DD`); }
  } else {
    errors.push('Fecha de baja no especificada');
  }

  const status: FormatValidationStatus = errors.length === 0
    ? (warnings.length === 0 ? 'spec_aligned' : 'partially_aligned')
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
