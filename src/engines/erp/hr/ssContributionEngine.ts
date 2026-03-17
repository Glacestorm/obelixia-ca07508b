/**
 * ssContributionEngine.ts — V2-RRHH-P1
 * Motor puro de cálculo de bases de cotización a la Seguridad Social (España)
 *
 * Calcula:
 *  - Base de cotización por contingencias comunes (BCCC)
 *  - Base de cotización por contingencias profesionales (AT/EP)
 *  - Base de cotización por horas extra
 *  - Aplica topes min/max por grupo de cotización
 *  - Diferencia contrato general vs temporal para desempleo
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
  tipo_mei: number;
  tipo_at_empresa: number | null;
}

// ── Payroll line input for SS calculation ──

export interface SSPayrollLineInput {
  conceptCode: string;
  amount: number;
  isSalary: boolean;
  isSSContributable: boolean;
  isProrrateado: boolean;
  isOvertime: boolean;
}

// ── Employee context for SS ──

export interface SSEmployeeContext {
  grupoCotizacion: number;
  isTemporaryContract: boolean;
  coeficienteParcialidad: number; // 1.0 = full time
  pagasExtrasAnuales: number; // Normally 2
  salarioBaseAnual: number; // For prorrateo calculation
  epigrafAT?: string | null; // AT/EP tariff code (affects AT rate)
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
  totalTrabajador: number;

  // Employer costs
  ccEmpresa: number;
  desempleoEmpresa: number;
  fogasa: number;
  fpEmpresa: number;
  mei: number;
  atEmpresa: number;
  totalEmpresa: number;

  // Topes applied
  topeMinAplicado: boolean;
  topeMaxAplicado: boolean;

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
  const legalRefs: string[] = ['LGSS Art. 147', 'Orden ISM/2024 (bases y tipos)'];

  // ── Data quality tracking ──
  const dataQuality: SSDataQuality = {
    grupoFromDB: limits !== null,
    ratesFromDB: limits !== null,
    topesFromDB: limits !== null,
    coeficienteParcialidad: employee.coeficienteParcialidad !== 1.0 ? 'real' : 'default',
    pagasExtras: employee.pagasExtrasAnuales !== 2 ? 'real' : 'estimated',
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
  let remuneracionMensual = 0;
  let horasExtra = 0;

  for (const line of lines) {
    if (!line.isSSContributable) continue;
    if (line.isOvertime) {
      horasExtra += line.amount;
    } else if (!line.isProrrateado) {
      remuneracionMensual += line.amount;
    }
    // Prorrateado lines are handled via prorrateo calculation below
  }

  traces.push({
    step: 'Remuneración mensual computable',
    formula: `Σ líneas cotizables (excl. HHEE y prorrateadas) = ${r2(remuneracionMensual)}`,
    result: r2(remuneracionMensual),
  });

  // ── 2. Prorrateo de pagas extraordinarias ──
  // BCCC = Remuneración mensual + (Pagas extras anuales / 12)
  // If pagas extras are prorrateadas (paid monthly), they're already included in remuneracionMensual
  const pagasExtrasAnuales = employee.pagasExtrasAnuales;
  // Simple estimation: each paga extra ≈ salario base mensual
  const salarioBaseMensual = employee.salarioBaseAnual / (12 + pagasExtrasAnuales);
  const prorrateoMensual = (salarioBaseMensual * pagasExtrasAnuales) / 12;

  traces.push({
    step: 'Prorrateo pagas extras',
    formula: `(salBase ${r2(salarioBaseMensual)} × ${pagasExtrasAnuales} pagas) / 12 = ${r2(prorrateoMensual)}`,
    result: r2(prorrateoMensual),
  });

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
  const totalTrabajador = r2(ccTrabajador + desempleoTrabajador + fpTrabajador);

  const ccEmpresa = r2((baseCCFinal * ((rates as any).tipo_cc_empresa ?? DEFAULT_SS_RATES_2025.tipo_cc_empresa)) / 100);
  const desempleoEmpresa = r2((baseCCFinal * tipoDesempleoEmp) / 100);
  const fogasa = r2((baseCCFinal * ((rates as any).tipo_fogasa ?? DEFAULT_SS_RATES_2025.tipo_fogasa)) / 100);
  const fpEmpresa = r2((baseCCFinal * ((rates as any).tipo_fp_empresa ?? DEFAULT_SS_RATES_2025.tipo_fp_empresa)) / 100);
  const mei = r2((baseCCFinal * ((rates as any).tipo_mei ?? DEFAULT_SS_RATES_2025.tipo_mei)) / 100);
  const tipoAT = (rates as any).tipo_at_empresa ?? DEFAULT_SS_RATES_2025.tipo_at_empresa;
  const atEmpresa = r2((baseATFinal * tipoAT) / 100);
  const totalEmpresa = r2(ccEmpresa + desempleoEmpresa + fogasa + fpEmpresa + mei + atEmpresa);

  traces.push({
    step: 'Cotizaciones trabajador',
    formula: `CC=${ccTrabajador} + Desemp=${desempleoTrabajador} + FP=${fpTrabajador} = ${totalTrabajador}`,
    result: totalTrabajador,
  });

  traces.push({
    step: 'Cotizaciones empresa',
    formula: `CC=${ccEmpresa} + Desemp=${desempleoEmpresa} + FOGASA=${fogasa} + FP=${fpEmpresa} + MEI=${mei} + AT=${atEmpresa} = ${totalEmpresa}`,
    result: totalEmpresa,
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
    totalTrabajador,
    ccEmpresa,
    desempleoEmpresa,
    fogasa,
    fpEmpresa,
    mei,
    atEmpresa,
    totalEmpresa,
    topeMinAplicado,
    topeMaxAplicado,
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
  return code === 'ES_PAGA_EXTRA';
}

/** Map payroll lines from concept catalog flags to SS input format */
export function mapLinesToSSInput(lines: Array<{
  concept_code: string;
  amount: number;
  is_ss_contributable: boolean;
  is_taxable: boolean;
}>): SSPayrollLineInput[] {
  return lines.map(l => ({
    conceptCode: l.concept_code,
    amount: l.amount,
    isSalary: l.is_taxable, // Approximation: taxable ≈ salary for SS purposes
    isSSContributable: l.is_ss_contributable,
    isProrrateado: isProrrateadoConcept(l.concept_code),
    isOvertime: isOvertimeConcept(l.concept_code),
  }));
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
