/**
 * employeeLegalProfileEngine.ts — Motor de Perfil Legal Unificado del Empleado
 *
 * Computa las interrelaciones legales entre todos los campos del formulario:
 *  - Contrato RD → SS (tipo desempleo), IRPF (mínimo 2%), indemnización
 *  - Grupo Cotización → Bases mín/máx SS, categoría profesional
 *  - Salario bruto + Grupo → Base cotización ajustada a topes
 *  - CCC → Identifica empleador ante TGSS, vincula AT/EP
 *  - Empresa Fiscal → NIF pagador (IRPF dos pagadores), nómina oficial
 *  - Comunidad Autónoma → Escala autonómica IRPF
 *  - Convenio colectivo → Salario mínimo convenio, categorías
 *  - Modelo 145 → Situación familiar IRPF, mínimos personales/familiares
 *
 * Legislación:
 *  - ET Art. 15, 12, 14, 49.1.c, 53, 56 (contratos)
 *  - LGSS Art. 147-148 (bases cotización), DA 7ª (desempleo)
 *  - RIRPF Art. 80-88 (retenciones IRPF)
 *  - RD 84/1996 Art. 29-31 (CCC)
 *  - OM 27/12/1994 Art. 2 (contenido nómina)
 *  - RDL 32/2021 (reforma laboral)
 *  - RDL 3/2026 (cotizaciones 2026)
 */

import {
  resolveContractType,
  getContractLegalSummary,
  type ContractTypeLegalProfile,
} from './contractTypeEngine';

// ── SS Group Bases 2026 (RDL 3/2026) ──

export const SS_GROUP_BASES_2026: Record<string, { minMensual: number; maxMensual: number; label: string }> = {
  '1':  { minMensual: 1847.40, maxMensual: 5101.20, label: 'Ingenieros y Licenciados' },
  '2':  { minMensual: 1531.50, maxMensual: 5101.20, label: 'Ingenieros Técnicos / Peritos' },
  '3':  { minMensual: 1332.90, maxMensual: 5101.20, label: 'Jefes Administrativos y de Taller' },
  '4':  { minMensual: 1321.20, maxMensual: 5101.20, label: 'Ayudantes no Titulados' },
  '5':  { minMensual: 1321.20, maxMensual: 5101.20, label: 'Oficiales Administrativos' },
  '6':  { minMensual: 1321.20, maxMensual: 5101.20, label: 'Subalternos' },
  '7':  { minMensual: 1321.20, maxMensual: 5101.20, label: 'Auxiliares Administrativos' },
  '8':  { minMensual: 44.04,   maxMensual: 170.04,  label: 'Oficiales 1ª y 2ª (diaria)' },
  '9':  { minMensual: 44.04,   maxMensual: 170.04,  label: 'Oficiales 3ª y Especialistas (diaria)' },
  '10': { minMensual: 44.04,   maxMensual: 170.04,  label: 'Peones (diaria)' },
  '11': { minMensual: 44.04,   maxMensual: 170.04,  label: 'Menores de 18 años (diaria)' },
};

// ── SS Contribution Rates 2026 ──

export const SS_RATES_2026 = {
  contingenciasComunes: { empresa: 23.60, trabajador: 4.70, total: 28.30 },
  desempleoIndefinido: { empresa: 5.50, trabajador: 1.55, total: 7.05 },
  desempleoTemporal:   { empresa: 6.70, trabajador: 1.60, total: 8.30 },
  formacionProfesional: { empresa: 0.60, trabajador: 0.10, total: 0.70 },
  fogasa: { empresa: 0.20, trabajador: 0, total: 0.20 },
  mei: { empresa: 0.75, trabajador: 0.15, total: 0.90 },
};

// ── Types ──

export interface EmployeeLegalProfile {
  // Identity
  employeeId: string | null;
  employeeName: string;
  companyId: string;

  // Contract
  contractProfile: ContractTypeLegalProfile;
  contractSummary: ReturnType<typeof getContractLegalSummary>;

  // SS
  grupoCotizacion: string;
  grupoLabel: string;
  baseCotizacionMensual: number; // Salario bruto mensual ajustado a topes
  baseMinima: number;
  baseMaxima: number;
  isDailyBase: boolean;
  ssRates: {
    contingenciasComunes: { empresa: number; trabajador: number };
    desempleo: { empresa: number; trabajador: number; tipo: string };
    formacion: { empresa: number; trabajador: number };
    fogasa: { empresa: number };
    mei: { empresa: number; trabajador: number };
    totalEmpresa: number;
    totalTrabajador: number;
    totalCoste: number;
  };

  // IRPF
  irpfTipoLegalEstimado: number;
  irpfTipoSolicitado: number;
  irpfTipoEfectivo: number; // max(legal, solicitado) per Art. 88.5
  irpfMinimoAplicable: boolean; // 2% contract < 1 year
  comunidadAutonoma: string;

  // Empresa Fiscal
  empresaFiscalNIF: string;
  empresaFiscalNombre: string;
  ccc: string;

  // Cost summary
  costeMensualEmpresa: number;
  costeAnualEmpresa: number;
  netoEstimadoMensual: number;

  // Legal references
  legalReferences: string[];
  warnings: string[];
  crossFieldValidations: CrossFieldValidation[];

  // Timestamp
  computedAt: string;
}

export interface CrossFieldValidation {
  field: string;
  relatedFields: string[];
  status: 'ok' | 'warning' | 'error';
  message: string;
  legalRef: string;
}

export interface EmployeeLegalProfileInput {
  employeeId?: string | null;
  firstName: string;
  lastName: string;
  companyId: string;
  baseSalary: number;
  contractTypeRD: string;
  contributionGroup: string;
  irpfPercentage: number;
  irpfLegalRate: number;
  comunidadAutonoma: string;
  empresaFiscalNIF: string;
  empresaFiscalNombre: string;
  ccc: string;
  naf: string;
  convenioColectivo: string;
  cnoCode: string;
  ocupacionSS: string;
  hireDate: string;
  status: string;
}

// ── Main computation ──

export function computeEmployeeLegalProfile(input: EmployeeLegalProfileInput): EmployeeLegalProfile {
  const warnings: string[] = [];
  const legalRefs: string[] = [];
  const validations: CrossFieldValidation[] = [];

  // 1. Contract resolution
  const contractProfile = resolveContractType(input.contractTypeRD);
  const contractSummary = getContractLegalSummary(input.contractTypeRD);
  legalRefs.push(...contractSummary.legalReferences);
  warnings.push(...contractSummary.warnings);

  // 2. SS group bases
  const grupo = input.contributionGroup || '7'; // default auxiliar
  const groupBases = SS_GROUP_BASES_2026[grupo] || SS_GROUP_BASES_2026['7'];
  const isDailyBase = parseInt(grupo) >= 8;

  // 3. Base cotización: salary clamped to group limits
  const salarioMensual = input.baseSalary / (isDailyBase ? 365 : 12);
  let baseCot = salarioMensual;

  if (isDailyBase) {
    // For daily groups, compare daily salary
    const salarioDiario = input.baseSalary / 365;
    baseCot = Math.max(groupBases.minMensual, Math.min(salarioDiario, groupBases.maxMensual));
    baseCot = baseCot * 30; // Monthly equivalent for rate calculation
  } else {
    baseCot = Math.max(groupBases.minMensual, Math.min(salarioMensual, groupBases.maxMensual));
  }

  // Validation: salary vs group minimum
  if (salarioMensual < groupBases.minMensual && !isDailyBase) {
    validations.push({
      field: 'base_salary',
      relatedFields: ['contribution_group'],
      status: 'warning',
      message: `Salario mensual (${salarioMensual.toFixed(2)}€) inferior a base mínima grupo ${grupo} (${groupBases.minMensual}€). Se cotizará por la base mínima.`,
      legalRef: 'LGSS Art. 148 — Topes de bases de cotización',
    });
  }

  // 4. SS rates
  const desempleo = contractProfile.isTemporaryForSS
    ? SS_RATES_2026.desempleoTemporal
    : SS_RATES_2026.desempleoIndefinido;

  const ssRates = {
    contingenciasComunes: { empresa: SS_RATES_2026.contingenciasComunes.empresa, trabajador: SS_RATES_2026.contingenciasComunes.trabajador },
    desempleo: { empresa: desempleo.empresa, trabajador: desempleo.trabajador, tipo: contractProfile.isTemporaryForSS ? 'temporal' : 'indefinido' },
    formacion: { empresa: SS_RATES_2026.formacionProfesional.empresa, trabajador: SS_RATES_2026.formacionProfesional.trabajador },
    fogasa: { empresa: SS_RATES_2026.fogasa.empresa },
    mei: { empresa: SS_RATES_2026.mei.empresa, trabajador: SS_RATES_2026.mei.trabajador },
    totalEmpresa: SS_RATES_2026.contingenciasComunes.empresa + desempleo.empresa + SS_RATES_2026.formacionProfesional.empresa + SS_RATES_2026.fogasa.empresa + SS_RATES_2026.mei.empresa,
    totalTrabajador: SS_RATES_2026.contingenciasComunes.trabajador + desempleo.trabajador + SS_RATES_2026.formacionProfesional.trabajador + SS_RATES_2026.mei.trabajador,
    totalCoste: 0,
  };
  ssRates.totalCoste = ssRates.totalEmpresa + ssRates.totalTrabajador;

  if (contractProfile.isTemporaryForSS) {
    legalRefs.push('LGSS DA 7ª — Tipo desempleo contratos temporales: 8,30% (6,70% + 1,60%)');
  }

  // 5. IRPF
  const irpfMinimo2 = contractSummary.irpfMinimo2Pct;
  let irpfLegal = input.irpfLegalRate || 0;
  if (irpfMinimo2 && irpfLegal < 2) {
    irpfLegal = 2;
    legalRefs.push('RIRPF Art. 86.2 — Tipo mínimo 2% contrato duración determinada < 1 año');
  }

  const irpfSolicitado = input.irpfPercentage || 0;
  const irpfEfectivo = Math.max(irpfLegal, irpfSolicitado);

  if (irpfSolicitado > 0 && irpfSolicitado > irpfLegal) {
    legalRefs.push(`RIRPF Art. 88.5 — Tipo voluntario ${irpfSolicitado}% > legal ${irpfLegal}%`);
  }

  // 6. Cross-field validations

  // CCC ↔ Empresa Fiscal
  if (input.ccc && !input.empresaFiscalNIF) {
    validations.push({
      field: 'empresa_fiscal_nif',
      relatedFields: ['ccc'],
      status: 'warning',
      message: 'CCC definido pero falta NIF de Empresa Fiscal. Ambos son obligatorios en la nómina.',
      legalRef: 'OM 27/12/1994 Art. 2 — Contenido obligatorio de la nómina',
    });
  }

  if (input.empresaFiscalNIF && !input.ccc) {
    validations.push({
      field: 'ccc',
      relatedFields: ['empresa_fiscal_nif'],
      status: 'warning',
      message: 'Empresa Fiscal definida pero falta CCC. Necesario para cotización SS.',
      legalRef: 'LGSS Art. 15 / RD 84/1996 Art. 29',
    });
  }

  // Grupo cotización ↔ Contrato formación
  if (contractProfile.category === 'formacion' && parseInt(grupo) <= 3) {
    validations.push({
      field: 'contribution_group',
      relatedFields: ['contract_type_rd'],
      status: 'warning',
      message: `Contrato de formación (${input.contractTypeRD}) con grupo cotización ${grupo} (${groupBases.label}). Verificar que corresponde al puesto formativo.`,
      legalRef: 'ET Art. 11.2 (RDL 32/2021)',
    });
  }

  // NAF obligatorio
  if (!input.naf) {
    validations.push({
      field: 'naf',
      relatedFields: ['contribution_group', 'ccc'],
      status: 'error',
      message: 'Nº Afiliación SS (NAF) es obligatorio para alta y cotización.',
      legalRef: 'LGSS Art. 139 — Afiliación obligatoria',
    });
  }

  // Comunidad Autónoma ↔ IRPF
  if (!input.comunidadAutonoma) {
    validations.push({
      field: 'autonomous_community',
      relatedFields: ['irpf_percentage'],
      status: 'warning',
      message: 'Sin CA definida. Se aplicará escala estatal IRPF sin tramo autonómico.',
      legalRef: 'Ley 22/2009 Art. 74 — Competencias normativas CCAA en IRPF',
    });
  }

  // Contract duration ↔ hire date
  if (contractProfile.duracionMaximaMeses && input.hireDate) {
    const hireDate = new Date(input.hireDate);
    const maxEnd = new Date(hireDate);
    maxEnd.setMonth(maxEnd.getMonth() + contractProfile.duracionMaximaMeses);
    const now = new Date();
    if (now > maxEnd && input.status === 'active') {
      validations.push({
        field: 'hire_date',
        relatedFields: ['contract_type_rd', 'status'],
        status: 'error',
        message: `Contrato ${contractProfile.name} excede duración máxima de ${contractProfile.duracionMaximaMeses} meses (inicio: ${input.hireDate}). Debe convertirse en indefinido o finalizar.`,
        legalRef: `${contractProfile.normativaReferencia}; ET Art. 15.5 — Conversión en indefinido`,
      });
    }
  }

  // 7. Cost calculation
  const ssTrabajadorMensual = baseCot * (ssRates.totalTrabajador / 100);
  const ssEmpresaMensual = baseCot * (ssRates.totalEmpresa / 100);
  const irpfMensual = (input.baseSalary / 12) * (irpfEfectivo / 100);
  const netoEstimado = (input.baseSalary / 12) - ssTrabajadorMensual - irpfMensual;
  const costeMensualEmpresa = (input.baseSalary / 12) + ssEmpresaMensual;

  return {
    employeeId: input.employeeId || null,
    employeeName: `${input.firstName} ${input.lastName}`,
    companyId: input.companyId,
    contractProfile,
    contractSummary,
    grupoCotizacion: grupo,
    grupoLabel: groupBases.label,
    baseCotizacionMensual: Math.round(baseCot * 100) / 100,
    baseMinima: groupBases.minMensual,
    baseMaxima: groupBases.maxMensual,
    isDailyBase,
    ssRates,
    irpfTipoLegalEstimado: irpfLegal,
    irpfTipoSolicitado: irpfSolicitado,
    irpfTipoEfectivo: irpfEfectivo,
    irpfMinimoAplicable: irpfMinimo2,
    comunidadAutonoma: input.comunidadAutonoma,
    empresaFiscalNIF: input.empresaFiscalNIF,
    empresaFiscalNombre: input.empresaFiscalNombre,
    ccc: input.ccc,
    costeMensualEmpresa: Math.round(costeMensualEmpresa * 100) / 100,
    costeAnualEmpresa: Math.round(costeMensualEmpresa * 12 * 100) / 100,
    netoEstimadoMensual: Math.round(netoEstimado * 100) / 100,
    legalReferences: legalRefs,
    warnings,
    crossFieldValidations: validations,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Genera un resumen en lenguaje natural del perfil legal para inyección en prompts de IA.
 */
export function buildLegalProfileContextForAI(profile: EmployeeLegalProfile): string {
  const lines: string[] = [
    `=== PERFIL LEGAL EMPLEADO: ${profile.employeeName} ===`,
    `Empresa: ${profile.empresaFiscalNombre || 'No definida'} (NIF: ${profile.empresaFiscalNIF || 'N/D'})`,
    `CCC: ${profile.ccc || 'N/D'}`,
    '',
    `── CONTRATO ──`,
    `Tipo: ${profile.contractProfile.code} — ${profile.contractProfile.name}`,
    `Categoría: ${profile.contractProfile.category}`,
    `Temporal para SS: ${profile.contractProfile.isTemporaryForSS ? 'Sí' : 'No'}`,
    `Periodo prueba máx: ${profile.contractProfile.periodoPruebaMaxMeses} meses`,
    profile.contractProfile.duracionMaximaMeses ? `Duración máxima: ${profile.contractProfile.duracionMaximaMeses} meses` : 'Duración: indefinida',
    `Indemnización fin contrato: ${profile.contractProfile.indemnizacionFinContratoDiasAnyo} días/año`,
    `Indemnización despido objetivo: ${profile.contractProfile.indemnizacionObjetivoDiasAnyo} días/año`,
    `Indemnización despido improcedente: ${profile.contractProfile.indemnizacionImprocedenteDiasAnyo} días/año`,
    '',
    `── SEGURIDAD SOCIAL ──`,
    `Grupo cotización: ${profile.grupoCotizacion} — ${profile.grupoLabel}`,
    `Base cotización mensual: ${profile.baseCotizacionMensual}€ (min: ${profile.baseMinima}€ / max: ${profile.baseMaxima}€)`,
    `Tipo desempleo: ${profile.ssRates.desempleo.tipo} (emp: ${profile.ssRates.desempleo.empresa}% + trab: ${profile.ssRates.desempleo.trabajador}%)`,
    `Total SS empresa: ${profile.ssRates.totalEmpresa.toFixed(2)}%`,
    `Total SS trabajador: ${profile.ssRates.totalTrabajador.toFixed(2)}%`,
    `MEI: ${profile.ssRates.mei.empresa}% emp + ${profile.ssRates.mei.trabajador}% trab (RDL 3/2026)`,
    '',
    `── IRPF ──`,
    `Tipo legal estimado: ${profile.irpfTipoLegalEstimado}%`,
    `Tipo solicitado: ${profile.irpfTipoSolicitado}%`,
    `Tipo efectivo (max): ${profile.irpfTipoEfectivo}%`,
    profile.irpfMinimoAplicable ? '⚠ Contrato < 1 año: tipo mínimo IRPF 2% (Art. 86.2 RIRPF)' : '',
    `Comunidad Autónoma: ${profile.comunidadAutonoma || 'No definida'}`,
    '',
    `── COSTE ──`,
    `Coste mensual empresa: ${profile.costeMensualEmpresa}€`,
    `Coste anual empresa: ${profile.costeAnualEmpresa}€`,
    `Neto estimado mensual: ${profile.netoEstimadoMensual}€`,
  ];

  if (profile.warnings.length > 0) {
    lines.push('', '── ALERTAS ──');
    profile.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  if (profile.crossFieldValidations.length > 0) {
    lines.push('', '── VALIDACIONES CRUZADAS ──');
    profile.crossFieldValidations.forEach(v => {
      const icon = v.status === 'error' ? '❌' : v.status === 'warning' ? '⚠' : '✓';
      lines.push(`${icon} [${v.field}↔${v.relatedFields.join(',')}]: ${v.message} (${v.legalRef})`);
    });
  }

  if (profile.legalReferences.length > 0) {
    lines.push('', '── REFERENCIAS LEGALES ──');
    profile.legalReferences.forEach(r => lines.push(`• ${r}`));
  }

  return lines.filter(Boolean).join('\n');
}
