/**
 * ssContributionEngine.ts — V2-RRHH-P1B
 * Motor puro de cálculo de bases de cotización a la Seguridad Social (España)
 *
 * Calcula:
 *  - Base de cotización por contingencias comunes (BCCC)
 *  - Base de cotización por contingencias profesionales (AT/EP)
 *  - Base de cotización por horas extra
 *  - Aplica topes min/max por grupo de cotización
 *  - Diferencia contrato general vs temporal para desempleo
 *  - MEI trabajador + empresa (P1B)
 *
 * Legislación referencia: LGSS Art. 147, Orden TMS/83/2019 (actualizada anualmente)
 * NOTA: Clasificación operativa interna — no constituye asesoramiento jurídico
 */

// ── SS Group Limits (from hr_es_ss_bases table) ──

export interface SSGroupLimits {
  grupo_cotizacion: number;
  base_minima_mensual: number;
  base_maxima_mensual: number;
  base_minima_diaria: number | null;
  base_maxima_diaria: number | null;
  // Rates
  tipo_cc_empresa: number;
  tipo_cc_trabajador: number;
  tipo_desempleo_empresa_gi: number;
  tipo_desempleo_trabajador_gi: number;
  tipo_desempleo_empresa_td: number;
  tipo_desempleo_trabajador_td: number;
  tipo_fogasa: number;
  tipo_fp_empresa: number;
  tipo_fp_trabajador: number;
  tipo_mei: number; // Total MEI (will be split empresa/trabajador)
  tipo_at_empresa: number | null;
}

// ── Payroll line input for SS calculation ──

export interface SSPayrollLineInput {
  conceptCode: string;
  amount: number;
  isSalary: boolean;
  isSSContributable: boolean;
  isProrrateado: boolean; // P1B: true if this line is already a prorated extra pay
  isOvertime: boolean;
  /** P1B: Fiscal classification for IRPF base calculation */
  fiscalClass: SSFiscalClass;
}

/** P1B: Fiscal classification for correct IRPF base */
export type SSFiscalClass = 'salarial_sujeto' | 'extrasalarial_exento' | 'extrasalarial_sujeto' | 'no_sujeto';

// ── Employee context for SS ──

export interface SSEmployeeContext {
  grupoCotizacion: number;
  isTemporaryContract: boolean;
  coeficienteParcialidad: number; // 1.0 = full time
  pagasExtrasAnuales: number; // Normally 2
  pagasExtrasProrrateadas: boolean; // P1B: true if pagas extras are paid monthly (prorated)
  salarioBaseAnual: number; // For prorrateo calculation
  epigrafAT?: string | null; // AT/EP tariff code (affects AT rate)
  /** P1B: Real period days (28-31) instead of fixed 30 */
  diasRealesPeriodo?: number;
}

// ── Output ──

export interface SSContributionBreakdown {
  // Bases
  baseCCMensualBruta: number;       // Before topes
  prorrateoMensual: number;         // Monthly fraction of pagas extras
  baseCCMensual: number;            // After topes
  baseATMensual: number;            // CC + horas extra, after topes
  baseHorasExtra: number;           // Only overtime amounts

  // Worker deductions
  ccTrabajador: number;
  desempleoTrabajador: number;
  fpTrabajador: number;
  meiTrabajador: number; // P1B
  totalTrabajador: number;

  // Employer costs
  ccEmpresa: number;
  desempleoEmpresa: number;
  fogasa: number;
  fpEmpresa: number;
  meiEmpresa: number; // P1B (renamed from mei)
  atEmpresa: number;
  totalEmpresa: number;

  // P1B: Correct IRPF base (excluding exempt extrasalarial)
  baseIRPFCorregida: number;
  conceptosExentos: number;

  // Topes applied
  topeMinAplicado: boolean;
  topeMaxAplicado: boolean;

  // P1B: Prorrateo handling
  prorrateoApplied: boolean;
  prorrateoSource: 'calculated' | 'from_lines' | 'none';

  // Traceability
  dataQuality: SSDataQuality;
  calculations: SSCalculationTrace[];
  warnings: string[];
  legalReferences: string[];
}

export interface SSDataQuality {
  grupoFromDB: boolean;
  ratesFromDB: boolean;
  topesFromDB: boolean;
  coeficienteParcialidad: 'real' | 'default';
  pagasExtras: 'real' | 'estimated';
  diasReales: boolean; // P1B
}

export interface SSCalculationTrace {
  step: string;
  formula: string;
  result: number;
}

// ── Constants ──

/** Default SS topes 2025 when no DB data is available (Grupo 1 — most conservative) */
const DEFAULT_SS_TOPES_2025 = {
  base_minima_mensual: 1547.40,
  base_maxima_mensual: 4720.50,
};

/** Default rates 2025 (Régimen General) */
const DEFAULT_SS_RATES_2025 = {
  tipo_cc_empresa: 23.60,
  tipo_cc_trabajador: 4.70,
  tipo_desempleo_empresa_gi: 5.50,
  tipo_desempleo_trabajador_gi: 1.55,
  tipo_desempleo_empresa_td: 6.70,
  tipo_desempleo_trabajador_td: 1.60,
  tipo_fogasa: 0.20,
  tipo_fp_empresa: 0.60,
  tipo_fp_trabajador: 0.10,
  tipo_mei: 0.58,
  tipo_at_empresa: 1.50,
};

/** P1B: MEI split 2025 — total 0.58%: empresa 0.50%, trabajador 0.08% (RD 322/2024) */
const MEI_SPLIT_2025 = {
  empresa: 0.50,
  trabajador: 0.08,
};

// ── Core calculation ──

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute SS contribution bases and amounts for a single employee in a month.
 *
 * @param lines     — All payroll lines for the employee this period
 * @param employee  — Employee SS context (grupo, contract type, etc.)
 * @param limits    — SS group limits from hr_es_ss_bases (or null for defaults)
 */
export function computeSSContributions(
  lines: SSPayrollLineInput[],
  employee: SSEmployeeContext,
  limits: SSGroupLimits | null,
): SSContributionBreakdown {
  const warnings: string[] = [];
  const traces: SSCalculationTrace[] = [];
  const legalRefs: string[] = ['LGSS Art. 147', 'Orden ISM/2024 (bases y tipos)', 'RD 322/2024 (MEI)'];

  // ── Data quality tracking ──
  const dataQuality: SSDataQuality = {
    grupoFromDB: limits !== null,
    ratesFromDB: limits !== null,
    topesFromDB: limits !== null,
    coeficienteParcialidad: employee.coeficienteParcialidad !== 1.0 ? 'real' : 'default',
    pagasExtras: employee.pagasExtrasAnuales !== 2 ? 'real' : 'estimated',
    diasReales: !!employee.diasRealesPeriodo,
  };

  if (!limits) {
    warnings.push('Sin datos de bases SS en BD — usando topes y tipos por defecto 2025');
  }

  // ── Resolve rates ──
  const rates = limits ?? DEFAULT_SS_RATES_2025;
  const topes = limits ? {
    base_minima_mensual: limits.base_minima_mensual,
    base_maxima_mensual: limits.base_maxima_mensual,
  } : DEFAULT_SS_TOPES_2025;

  // ── 1. Sum contributable salary amounts (excluding overtime) ──
  // P1B: Also track prorated amounts from lines and fiscal classification
  let remuneracionMensual = 0;
  let horasExtra = 0;
  let prorrateoFromLines = 0;
  let baseIRPFSujeta = 0;
  let conceptosExentos = 0;

  for (const line of lines) {
    // P1B: Track IRPF base correctly
    if (line.fiscalClass === 'salarial_sujeto' || line.fiscalClass === 'extrasalarial_sujeto') {
      baseIRPFSujeta += line.amount;
    } else if (line.fiscalClass === 'extrasalarial_exento') {
      conceptosExentos += line.amount;
    }
    // 'no_sujeto' — neither IRPF nor SS

    if (!line.isSSContributable) continue;

    if (line.isOvertime) {
      horasExtra += line.amount;
    } else if (line.isProrrateado) {
      // P1B: If lines are already prorated extras, track them separately
      prorrateoFromLines += line.amount;
    } else {
      remuneracionMensual += line.amount;
    }
  }

  traces.push({
    step: 'Remuneración mensual computable',
    formula: `Σ líneas cotizables (excl. HHEE y prorrateadas) = ${r2(remuneracionMensual)}`,
    result: r2(remuneracionMensual),
  });

  // ── 2. Prorrateo de pagas extraordinarias ──
  // P1B: If pagas extras are already prorated in lines, use line amounts directly.
  // If NOT prorated, calculate the monthly fraction.
  let prorrateoMensual: number;
  let prorrateoSource: 'calculated' | 'from_lines' | 'none';

  if (employee.pagasExtrasProrrateadas && prorrateoFromLines > 0) {
    // Pagas are prorated and appear as lines — use directly, don't add extra
    prorrateoMensual = prorrateoFromLines;
    prorrateoSource = 'from_lines';
    traces.push({
      step: 'Prorrateo pagas extras (desde líneas)',
      formula: `Pagas prorrateadas en líneas = ${r2(prorrateoFromLines)}€ (no se añade cálculo adicional)`,
      result: r2(prorrateoMensual),
    });
  } else if (!employee.pagasExtrasProrrateadas && employee.pagasExtrasAnuales > 0) {
    // Pagas NOT prorated — calculate monthly fraction
    const salarioBaseMensual = employee.salarioBaseAnual / (12 + employee.pagasExtrasAnuales);
    prorrateoMensual = (salarioBaseMensual * employee.pagasExtrasAnuales) / 12;
    prorrateoSource = 'calculated';
    traces.push({
      step: 'Prorrateo pagas extras (calculado)',
      formula: `(salBase ${r2(salarioBaseMensual)} × ${employee.pagasExtrasAnuales} pagas) / 12 = ${r2(prorrateoMensual)}`,
      result: r2(prorrateoMensual),
    });
  } else {
    prorrateoMensual = 0;
    prorrateoSource = 'none';
  }

  // ── 3. Base CC bruta ──
  const baseCCBruta = remuneracionMensual + prorrateoMensual;

  traces.push({
    step: 'Base CC bruta (antes topes)',
    formula: `remuneración ${r2(remuneracionMensual)} + prorrateo ${r2(prorrateoMensual)} = ${r2(baseCCBruta)}`,
    result: r2(baseCCBruta),
  });

  // ── 4. Apply parcialidad coefficient ──
  const topeMinAjustado = r2(topes.base_minima_mensual * employee.coeficienteParcialidad);
  const topeMaxAjustado = topes.base_maxima_mensual; // Max tope no se reduce por parcialidad

  // ── 5. Apply topes ──
  let baseCCFinal: number;
  let topeMinAplicado = false;
  let topeMaxAplicado = false;

  if (baseCCBruta < topeMinAjustado) {
    baseCCFinal = topeMinAjustado;
    topeMinAplicado = true;
    warnings.push(`Base CC inferior al mínimo del grupo ${employee.grupoCotizacion}: ajustada de ${r2(baseCCBruta)}€ a ${topeMinAjustado}€`);
  } else if (baseCCBruta > topeMaxAjustado) {
    baseCCFinal = topeMaxAjustado;
    topeMaxAplicado = true;
    warnings.push(`Base CC superior al máximo: topada de ${r2(baseCCBruta)}€ a ${topeMaxAjustado}€`);
  } else {
    baseCCFinal = baseCCBruta;
  }

  baseCCFinal = r2(baseCCFinal);

  traces.push({
    step: 'Base CC final (con topes)',
    formula: `clamp(${r2(baseCCBruta)}, min=${topeMinAjustado}, max=${topeMaxAjustado}) = ${baseCCFinal}`,
    result: baseCCFinal,
  });

  // ── 6. Base AT/EP = Base CC + Horas extra ──
  const baseATBruta = baseCCFinal + horasExtra;
  const baseATFinal = r2(Math.min(baseATBruta, topeMaxAjustado));

  traces.push({
    step: 'Base AT/EP',
    formula: `baseCC ${baseCCFinal} + HHEE ${r2(horasExtra)} = ${r2(baseATBruta)}, topada = ${baseATFinal}`,
    result: baseATFinal,
  });

  // ── 7. Calculate contributions ──
  const isTemp = employee.isTemporaryContract;
  const tipoDesempleoEmp = isTemp
    ? (rates as any).tipo_desempleo_empresa_td ?? DEFAULT_SS_RATES_2025.tipo_desempleo_empresa_td
    : (rates as any).tipo_desempleo_empresa_gi ?? DEFAULT_SS_RATES_2025.tipo_desempleo_empresa_gi;
  const tipoDesempleoTrab = isTemp
    ? (rates as any).tipo_desempleo_trabajador_td ?? DEFAULT_SS_RATES_2025.tipo_desempleo_trabajador_td
    : (rates as any).tipo_desempleo_trabajador_gi ?? DEFAULT_SS_RATES_2025.tipo_desempleo_trabajador_gi;

  const ccTrabajador = r2((baseCCFinal * ((rates as any).tipo_cc_trabajador ?? DEFAULT_SS_RATES_2025.tipo_cc_trabajador)) / 100);
  const desempleoTrabajador = r2((baseCCFinal * tipoDesempleoTrab) / 100);
  const fpTrabajador = r2((baseCCFinal * ((rates as any).tipo_fp_trabajador ?? DEFAULT_SS_RATES_2025.tipo_fp_trabajador)) / 100);

  // P1B: MEI split — trabajador pays 0.08%, empresa pays 0.50% (total 0.58%)
  const meiTrabajador = r2((baseCCFinal * MEI_SPLIT_2025.trabajador) / 100);
  const totalTrabajador = r2(ccTrabajador + desempleoTrabajador + fpTrabajador + meiTrabajador);

  const ccEmpresa = r2((baseCCFinal * ((rates as any).tipo_cc_empresa ?? DEFAULT_SS_RATES_2025.tipo_cc_empresa)) / 100);
  const desempleoEmpresa = r2((baseCCFinal * tipoDesempleoEmp) / 100);
  const fogasa = r2((baseCCFinal * ((rates as any).tipo_fogasa ?? DEFAULT_SS_RATES_2025.tipo_fogasa)) / 100);
  const fpEmpresa = r2((baseCCFinal * ((rates as any).tipo_fp_empresa ?? DEFAULT_SS_RATES_2025.tipo_fp_empresa)) / 100);
  const meiEmpresa = r2((baseCCFinal * MEI_SPLIT_2025.empresa) / 100);
  const tipoAT = (rates as any).tipo_at_empresa ?? DEFAULT_SS_RATES_2025.tipo_at_empresa;
  const atEmpresa = r2((baseATFinal * tipoAT) / 100);
  const totalEmpresa = r2(ccEmpresa + desempleoEmpresa + fogasa + fpEmpresa + meiEmpresa + atEmpresa);

  traces.push({
    step: 'Cotizaciones trabajador (incl. MEI)',
    formula: `CC=${ccTrabajador} + Desemp=${desempleoTrabajador} + FP=${fpTrabajador} + MEI=${meiTrabajador} = ${totalTrabajador}`,
    result: totalTrabajador,
  });

  traces.push({
    step: 'Cotizaciones empresa (incl. MEI)',
    formula: `CC=${ccEmpresa} + Desemp=${desempleoEmpresa} + FOGASA=${fogasa} + FP=${fpEmpresa} + MEI=${meiEmpresa} + AT=${atEmpresa} = ${totalEmpresa}`,
    result: totalEmpresa,
  });

  // P1B: Correct IRPF base (only taxable income, excluding exempt extrasalarial)
  const baseIRPFCorregida = r2(baseIRPFSujeta);

  traces.push({
    step: 'Base IRPF corregida (P1B)',
    formula: `Σ salariales sujetos + extrasalariales sujetos = ${r2(baseIRPFSujeta)} (exentos excluidos: ${r2(conceptosExentos)})`,
    result: baseIRPFCorregida,
  });

  return {
    baseCCMensualBruta: r2(baseCCBruta),
    prorrateoMensual: r2(prorrateoMensual),
    baseCCMensual: baseCCFinal,
    baseATMensual: baseATFinal,
    baseHorasExtra: r2(horasExtra),
    ccTrabajador,
    desempleoTrabajador,
    fpTrabajador,
    meiTrabajador,
    totalTrabajador,
    ccEmpresa,
    desempleoEmpresa,
    fogasa,
    fpEmpresa,
    meiEmpresa,
    atEmpresa,
    totalEmpresa,
    baseIRPFCorregida,
    conceptosExentos: r2(conceptosExentos),
    topeMinAplicado,
    topeMaxAplicado,
    prorrateoApplied: prorrateoMensual > 0,
    prorrateoSource,
    dataQuality,
    calculations: traces,
    warnings,
    legalReferences: legalRefs,
  };
}

// ── Helpers ──

/** Check if a concept code represents overtime */
export function isOvertimeConcept(code: string): boolean {
  return code.includes('HORAS_EXTRA');
}

/** Check if a concept is prorrateado (e.g. pagas extras paid monthly) */
export function isProrrateadoConcept(code: string): boolean {
  return code === 'ES_PAGA_EXTRA' || code === 'ES_PAGA_EXTRA_PRORRATEADA';
}

/**
 * P1B: Derive fiscal class from concept properties.
 * More precise than the P1 `is_taxable` boolean.
 */
export function deriveFiscalClass(conceptCode: string, isTaxable: boolean, isSalary: boolean): SSFiscalClass {
  // Known exempt extrasalarial concepts (Spanish payroll)
  const EXEMPT_EXTRASALARIAL = [
    'ES_DIETAS', 'ES_GASTOS_LOCOMOCION', 'ES_GASTOS_TRANSPORTE',
    'ES_INDEMNIZACION', 'ES_SEGURO_MEDICO', 'ES_GUARDERIA',
    'ES_FORMACION', 'ES_TICKET_TRANSPORTE',
  ];

  if (EXEMPT_EXTRASALARIAL.some(ex => conceptCode.startsWith(ex))) {
    return 'extrasalarial_exento';
  }
  if (!isTaxable) {
    return 'no_sujeto';
  }
  if (isSalary) {
    return 'salarial_sujeto';
  }
  return 'extrasalarial_sujeto';
}

/** Map payroll lines from concept catalog flags to SS input format — P1B enhanced */
export function mapLinesToSSInput(lines: Array<{
  concept_code: string;
  amount: number;
  is_ss_contributable: boolean;
  is_taxable: boolean;
  category?: string;
}>): SSPayrollLineInput[] {
  return lines.map(l => {
    const isSalary = l.category !== 'extrasalarial' && l.is_taxable;
    return {
      conceptCode: l.concept_code,
      amount: l.amount,
      isSalary,
      isSSContributable: l.is_ss_contributable,
      isProrrateado: isProrrateadoConcept(l.concept_code),
      isOvertime: isOvertimeConcept(l.concept_code),
      fiscalClass: deriveFiscalClass(l.concept_code, l.is_taxable, isSalary),
    };
  });
}

/** Format SS group label */
export function formatSSGroupLabel(grupo: number): string {
  const labels: Record<number, string> = {
    1: 'Ingenieros y Licenciados',
    2: 'Ingenieros Técnicos',
    3: 'Jefes Administrativos',
    4: 'Ayudantes no Titulados',
    5: 'Oficiales Administrativos',
    6: 'Subalternos',
    7: 'Auxiliares Administrativos',
    8: 'Oficiales 1ª y 2ª',
    9: 'Oficiales 3ª y Especialistas',
    10: 'Peones',
    11: 'Menores 18 años',
  };
  return labels[grupo] ?? `Grupo ${grupo}`;
}
