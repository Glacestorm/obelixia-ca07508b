/**
 * irpfEngine.ts — V2-RRHH-PINST-B2
 * Motor puro de cálculo de retención IRPF (España) — Con regularización progresiva
 *
 * Calcula:
 *  - Base imponible IRPF (rendimientos del trabajo) con exclusión de exentos
 *  - Reducciones y mínimos personales/familiares
 *  - Cuota íntegra por tramos (estatal + autonómico)
 *  - Regularización progresiva mensual acumulada (RIRPF Art. 82-86)
 *  - Tipo efectivo de retención
 *  - Retención mensual
 *  - Rentas irregulares / regla 30% (LIRPF Art. 18.2)
 *  - Deducciones autonómicas (infraestructura con escalas reales por CCAA)
 *  - Cambio de situación familiar mid-year (regularización Art. 85 RIRPF)
 *
 * Legislación referencia: LIRPF Arts. 17-20, 18.2, 56-66, 80-86, 99-101; RIRPF Art. 82-86
 * NOTA: Cálculo preparatorio avanzado — puede diferir del resultado exacto de la AEAT.
 *       No constituye asesoramiento fiscal.
 */

// ── Input types ──

export interface IRPFEmployeeInput {
  // Compensation
  salarioBrutoAnual: number;
  ssWorkerAnual: number;

  // Family situation (modelo 145)
  situacionFamiliar: 1 | 2 | 3;

  // Descendants
  hijosConvivencia: IRPFDescendant[];

  // Ascendants
  ascendientesCargo: number;
  ascendientesMayores75: number;

  // Disability
  discapacidadTrabajador: IRPFDisabilityLevel;

  // Other deductions
  pensionCompensatoria: number;
  anualidadAlimentos: number;
  aportacionesPlanesP: number;

  // Special situations
  prolongacionLaboral: boolean;
  movilidadGeografica: boolean;
  contratoInferiorAnual: boolean;
  tieneHipotecaAnterior2013: boolean;

  // Community (affects autonómico)
  comunidadAutonoma: string | null;

  // ── PINST-B2: Irregular income ──
  /** Irregular income subject to 30% rule (LIRPF Art. 18.2) */
  rentasIrregulares?: IRPFIrregularIncome[];

  // ── PINST-B2: Mid-year family changes ──
  /** History of family situation changes during the fiscal year */
  cambiosFamiliares?: IRPFFamilyChange[];
}

export type IRPFDisabilityLevel = 'none' | 'gte33' | 'gte33_mobility' | 'gte65';

export interface IRPFDescendant {
  orden: number;
  esMenorDe3: boolean;
  discapacidad: IRPFDisabilityLevel;
}

export interface IRPFTramo {
  tramo_desde: number;
  tramo_hasta: number | null;
  tipo_estatal: number;
  tipo_autonomico: number;
  tipo_total: number;
}

// ── PINST-B2: Irregular income types ──

export interface IRPFIrregularIncome {
  /** Description of the irregular income */
  concepto: string;
  /** Gross amount */
  importe: number;
  /** Number of years of generation (for 30% rule: >2 years) */
  aniosGeneracion: number;
  /** Whether this qualifies for the 30% reduction (Art. 18.2 LIRPF) */
  aplicaReduccion30: boolean;
}

// ── PINST-B2: Mid-year family change types ──

export interface IRPFFamilyChange {
  /** Month (1-12) when the change takes effect */
  mesEfecto: number;
  /** New family situation after the change */
  nuevaSituacion: 1 | 2 | 3;
  /** New descendants after the change */
  nuevosHijos: IRPFDescendant[];
  /** New ascendants count */
  nuevosAscendientesCargo: number;
  nuevosAscendientesMayores75: number;
  /** Reason for the change */
  motivo: string;
}

// ── PINST-B2: Regional deduction types ──

export interface IRPFRegionalDeduction {
  ccaa: string;
  concepto: string;
  importe: number;
  aplicada: boolean;
  motivoNoAplicada?: string;
}

// ── Regularization input (P1B) ──

export interface IRPFRegularizationContext {
  currentMonth: number;
  acumuladoBrutoAnterior: number;
  acumuladoSSAnterior: number;
  acumuladoRetencionAnterior: number;
  brutoMesActual: number;
  ssMesActual: number;
  brutoProyectadoRestante?: number;
}

// ── Output ──

export interface IRPFCalculationResult {
  // Base
  rendimientosBrutos: number;
  gastosDeducibles: number;
  rendimientoNeto: number;
  reduccionRendimientos: number;
  baseImponibleGeneral: number;

  // Minimums
  minimoPersonal: number;
  minimoDescendientes: number;
  minimoAscendientes: number;
  minimoDiscapacidad: number;
  minimoTotal: number;

  // Tax
  baseGravable: number;
  cuotaIntegra: number;
  cuotaMinimos: number;
  cuotaResultante: number;

  // Effective rate
  tipoEfectivo: number;
  retencionMensual: number;
  retencionAnual: number;

  // Regularization (P1B)
  regularization: IRPFRegularizationDetail | null;

  // PINST-B2: Irregular income
  irregularIncome: IRPFIrregularIncomeResult | null;

  // PINST-B2: Regional deductions
  regionalDeductions: IRPFRegionalDeductionResult | null;

  // PINST-B2: Mid-year family changes
  familyChangeImpact: IRPFFamilyChangeImpact | null;

  // Traceability
  tramosAplicados: IRPFTramoAplicado[];
  dataQuality: IRPFDataQuality;
  calculations: IRPFCalculationTrace[];
  warnings: string[];
  limitations: string[];
  legalReferences: string[];
}

export interface IRPFRegularizationDetail {
  method: 'progressive_cumulative';
  currentMonth: number;
  projectedAnnualGross: number;
  projectedAnnualSS: number;
  annualCuotaProjected: number;
  accumulatedRetentionPrior: number;
  remainingMonths: number;
  adjustedMonthlyRetention: number;
  adjustedTipoEfectivo: number;
}

// ── PINST-B2: New result types ──

export interface IRPFIrregularIncomeResult {
  totalIrregular: number;
  reduccion30Applied: number;
  netIrregularAfterReduction: number;
  items: Array<{
    concepto: string;
    importe: number;
    reduccion: number;
    neto: number;
    qualifies: boolean;
  }>;
  legalRef: string;
}

export interface IRPFRegionalDeductionResult {
  ccaa: string;
  supported: boolean;
  deductions: IRPFRegionalDeduction[];
  totalDeduction: number;
  /** If not fully supported, explains why */
  coverageNote: string;
}

export interface IRPFFamilyChangeImpact {
  changes: Array<{
    mesEfecto: number;
    motivo: string;
    minimosAntes: number;
    minimosDespues: number;
    impactoCuotaAnual: number;
  }>;
  minimosPonderados: number;
  regularizacionAplicada: boolean;
}

export interface IRPFTramoAplicado {
  desde: number;
  hasta: number | null;
  tipo: number;
  baseTramo: number;
  cuota: number;
}

export interface IRPFDataQuality {
  tramosFromDB: boolean;
  familyDataAvailable: boolean;
  ssContributionsReal: boolean;
  comunidadEspecifica: boolean;
  regularizationApplied: boolean;
  irregularIncomeProcessed: boolean;
  regionalDeductionsProcessed: boolean;
  familyChangesProcessed: boolean;
}

export interface IRPFCalculationTrace {
  step: string;
  formula: string;
  result: number;
}

// ── Default tramos 2025 (Estatal — when no DB data available) ──

const DEFAULT_TRAMOS_2025: IRPFTramo[] = [
  { tramo_desde: 0, tramo_hasta: 12450, tipo_estatal: 9.50, tipo_autonomico: 9.50, tipo_total: 19.00 },
  { tramo_desde: 12450, tramo_hasta: 20200, tipo_estatal: 12.00, tipo_autonomico: 12.00, tipo_total: 24.00 },
  { tramo_desde: 20200, tramo_hasta: 35200, tipo_estatal: 15.00, tipo_autonomico: 15.00, tipo_total: 30.00 },
  { tramo_desde: 35200, tramo_hasta: 60000, tipo_estatal: 18.50, tipo_autonomico: 18.50, tipo_total: 37.00 },
  { tramo_desde: 60000, tramo_hasta: 300000, tipo_estatal: 22.50, tipo_autonomico: 22.50, tipo_total: 45.00 },
  { tramo_desde: 300000, tramo_hasta: null, tipo_estatal: 24.50, tipo_autonomico: 22.50, tipo_total: 47.00 },
];

// ── PINST-B2: Regional scales (autonómico) ──
// Real scales for major CCAA. If a CCAA is missing, estatal scale is used as fallback with explicit warning.

const CCAA_TRAMOS: Record<string, IRPFTramo[]> = {
  'madrid': [
    { tramo_desde: 0, tramo_hasta: 12450, tipo_estatal: 9.50, tipo_autonomico: 8.50, tipo_total: 18.00 },
    { tramo_desde: 12450, tramo_hasta: 17707, tipo_estatal: 12.00, tipo_autonomico: 10.70, tipo_total: 22.70 },
    { tramo_desde: 17707, tramo_hasta: 33007, tipo_estatal: 15.00, tipo_autonomico: 12.80, tipo_total: 27.80 },
    { tramo_desde: 33007, tramo_hasta: 53407, tipo_estatal: 18.50, tipo_autonomico: 17.40, tipo_total: 35.90 },
    { tramo_desde: 53407, tramo_hasta: null, tipo_estatal: 22.50, tipo_autonomico: 20.50, tipo_total: 43.00 },
  ],
  'cataluña': [
    { tramo_desde: 0, tramo_hasta: 12450, tipo_estatal: 9.50, tipo_autonomico: 10.50, tipo_total: 20.00 },
    { tramo_desde: 12450, tramo_hasta: 17707, tipo_estatal: 12.00, tipo_autonomico: 12.00, tipo_total: 24.00 },
    { tramo_desde: 17707, tramo_hasta: 33007, tipo_estatal: 15.00, tipo_autonomico: 15.00, tipo_total: 30.00 },
    { tramo_desde: 33007, tramo_hasta: 53407, tipo_estatal: 18.50, tipo_autonomico: 18.80, tipo_total: 37.30 },
    { tramo_desde: 53407, tramo_hasta: 90000, tipo_estatal: 22.50, tipo_autonomico: 21.50, tipo_total: 44.00 },
    { tramo_desde: 90000, tramo_hasta: 120000, tipo_estatal: 22.50, tipo_autonomico: 23.50, tipo_total: 46.00 },
    { tramo_desde: 120000, tramo_hasta: 175000, tipo_estatal: 24.50, tipo_autonomico: 24.50, tipo_total: 49.00 },
    { tramo_desde: 175000, tramo_hasta: null, tipo_estatal: 24.50, tipo_autonomico: 25.50, tipo_total: 50.00 },
  ],
  'andalucia': [
    { tramo_desde: 0, tramo_hasta: 12450, tipo_estatal: 9.50, tipo_autonomico: 9.50, tipo_total: 19.00 },
    { tramo_desde: 12450, tramo_hasta: 20200, tipo_estatal: 12.00, tipo_autonomico: 12.00, tipo_total: 24.00 },
    { tramo_desde: 20200, tramo_hasta: 28000, tipo_estatal: 15.00, tipo_autonomico: 15.00, tipo_total: 30.00 },
    { tramo_desde: 28000, tramo_hasta: 35200, tipo_estatal: 15.00, tipo_autonomico: 16.00, tipo_total: 31.00 },
    { tramo_desde: 35200, tramo_hasta: 50000, tipo_estatal: 18.50, tipo_autonomico: 18.50, tipo_total: 37.00 },
    { tramo_desde: 50000, tramo_hasta: 60000, tipo_estatal: 18.50, tipo_autonomico: 19.50, tipo_total: 38.00 },
    { tramo_desde: 60000, tramo_hasta: 120000, tipo_estatal: 22.50, tipo_autonomico: 22.50, tipo_total: 45.00 },
    { tramo_desde: 120000, tramo_hasta: null, tipo_estatal: 24.50, tipo_autonomico: 23.50, tipo_total: 48.00 },
  ],
  'valencia': [
    { tramo_desde: 0, tramo_hasta: 12450, tipo_estatal: 9.50, tipo_autonomico: 10.00, tipo_total: 19.50 },
    { tramo_desde: 12450, tramo_hasta: 17000, tipo_estatal: 12.00, tipo_autonomico: 11.00, tipo_total: 23.00 },
    { tramo_desde: 17000, tramo_hasta: 30000, tipo_estatal: 15.00, tipo_autonomico: 13.90, tipo_total: 28.90 },
    { tramo_desde: 30000, tramo_hasta: 50000, tipo_estatal: 18.50, tipo_autonomico: 18.00, tipo_total: 36.50 },
    { tramo_desde: 50000, tramo_hasta: 65000, tipo_estatal: 22.50, tipo_autonomico: 22.50, tipo_total: 45.00 },
    { tramo_desde: 65000, tramo_hasta: 80000, tipo_estatal: 22.50, tipo_autonomico: 24.50, tipo_total: 47.00 },
    { tramo_desde: 80000, tramo_hasta: 140000, tipo_estatal: 24.50, tipo_autonomico: 25.00, tipo_total: 49.50 },
    { tramo_desde: 140000, tramo_hasta: null, tipo_estatal: 24.50, tipo_autonomico: 25.50, tipo_total: 50.00 },
  ],
  'pais_vasco': [
    { tramo_desde: 0, tramo_hasta: 17360, tipo_estatal: 9.50, tipo_autonomico: 13.60, tipo_total: 23.10 },
    { tramo_desde: 17360, tramo_hasta: 32060, tipo_estatal: 12.00, tipo_autonomico: 16.80, tipo_total: 28.80 },
    { tramo_desde: 32060, tramo_hasta: 47560, tipo_estatal: 15.00, tipo_autonomico: 20.80, tipo_total: 35.80 },
    { tramo_desde: 47560, tramo_hasta: 77360, tipo_estatal: 18.50, tipo_autonomico: 25.00, tipo_total: 43.50 },
    { tramo_desde: 77360, tramo_hasta: null, tipo_estatal: 22.50, tipo_autonomico: 27.00, tipo_total: 49.50 },
  ],
};

// CCAA that have their own IRPF regime (Navarra, País Vasco) — flag for honest blocking
const CCAA_REGIMEN_FORAL = ['navarra', 'pais_vasco'];

// CCAA with known regional scales
const CCAA_SUPPORTED = Object.keys(CCAA_TRAMOS);

// ── Minimum thresholds below which no IRPF applies (RIRPF Art. 81) ──

const IRPF_EXEMPT_THRESHOLDS: Record<number, number> = {
  1: 14852,
  2: 17894,
  3: 14852,
};

// ── Core Calculation ──

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute IRPF retention for one employee for the current fiscal year.
 */
export function computeIRPF(
  input: IRPFEmployeeInput,
  tramos: IRPFTramo[] | null,
  regularizationCtx?: IRPFRegularizationContext | null,
): IRPFCalculationResult {
  const warnings: string[] = [];
  const limitations: string[] = [];
  const traces: IRPFCalculationTrace[] = [];
  const legalRefs: string[] = [
    'LIRPF Arts. 17-20 (Rendimientos del trabajo)',
    'LIRPF Arts. 56-66 (Mínimo personal y familiar)',
    'RIRPF Arts. 80-86 (Retenciones)',
  ];

  // ── PINST-B2: Resolve effective tramos (CCAA-aware) ──
  const ccaaKey = normalizeCCAAKey(input.comunidadAutonoma);
  const ccaaTramos = ccaaKey ? CCAA_TRAMOS[ccaaKey] : null;
  let effectiveTramos: IRPFTramo[];
  let regionalDeductionResult: IRPFRegionalDeductionResult | null = null;

  if (tramos && tramos.length > 0) {
    effectiveTramos = tramos;
  } else if (ccaaTramos) {
    effectiveTramos = ccaaTramos;
  } else {
    effectiveTramos = DEFAULT_TRAMOS_2025;
  }

  const dataQuality: IRPFDataQuality = {
    tramosFromDB: tramos !== null && tramos.length > 0,
    familyDataAvailable: input.hijosConvivencia.length > 0 || input.ascendientesCargo > 0,
    ssContributionsReal: input.ssWorkerAnual > 0,
    comunidadEspecifica: !!input.comunidadAutonoma,
    regularizationApplied: !!regularizationCtx,
    irregularIncomeProcessed: (input.rentasIrregulares?.length ?? 0) > 0,
    regionalDeductionsProcessed: !!ccaaTramos,
    familyChangesProcessed: (input.cambiosFamiliares?.length ?? 0) > 0,
  };

  if (!dataQuality.tramosFromDB && !ccaaTramos) {
    warnings.push('Usando tramos IRPF por defecto 2025 — sin datos específicos en BD ni escala autonómica');
  }

  // ── PINST-B2: Regional deductions resolution ──
  if (input.comunidadAutonoma) {
    const ccNorm = ccaaKey ?? '';
    if (CCAA_REGIMEN_FORAL.includes(ccNorm)) {
      limitations.push(`${input.comunidadAutonoma} tiene régimen foral propio — el cálculo usa escala aproximada, NO sustituye liquidación foral`);
      regionalDeductionResult = {
        ccaa: input.comunidadAutonoma,
        supported: false,
        deductions: [],
        totalDeduction: 0,
        coverageNote: `Régimen foral de ${input.comunidadAutonoma}: cálculo IRPF estatal no es aplicable directamente. Se requiere motor foral específico.`,
      };
    } else if (ccaaTramos) {
      regionalDeductionResult = {
        ccaa: input.comunidadAutonoma,
        supported: true,
        deductions: [],
        totalDeduction: 0,
        coverageNote: `Escala autonómica de ${input.comunidadAutonoma} aplicada. Deducciones autonómicas en cuota no implementadas — requiere datos específicos del contribuyente.`,
      };
      if (!tramos || tramos.length === 0) {
        traces.push({
          step: 'Escala autonómica',
          formula: `Aplicada escala de ${input.comunidadAutonoma} con ${ccaaTramos.length} tramos`,
          result: ccaaTramos.length,
        });
      }
    } else {
      limitations.push(`CCAA "${input.comunidadAutonoma}" sin escala autonómica implementada — usando escala estatal como aproximación`);
      regionalDeductionResult = {
        ccaa: input.comunidadAutonoma,
        supported: false,
        deductions: [],
        totalDeduction: 0,
        coverageNote: `Escala autonómica de ${input.comunidadAutonoma} no disponible. Usando escala estatal duplicada. Para exactitud, registre la escala autonómica en BD.`,
      };
    }
  }

  // ── PINST-B2: Process irregular income (30% rule — LIRPF Art. 18.2) ──
  let irregularIncomeResult: IRPFIrregularIncomeResult | null = null;
  let irregularReduction = 0;

  if (input.rentasIrregulares && input.rentasIrregulares.length > 0) {
    const items: IRPFIrregularIncomeResult['items'] = [];
    let totalIrregular = 0;
    let totalReduction = 0;

    for (const ri of input.rentasIrregulares) {
      const qualifies = ri.aplicaReduccion30 && ri.aniosGeneracion > 2;
      // 30% reduction, max base 300.000€ (LIRPF Art. 18.2)
      const maxReducible = Math.min(ri.importe, 300000);
      const reduccion = qualifies ? r2(maxReducible * 0.30) : 0;
      const neto = r2(ri.importe - reduccion);

      items.push({
        concepto: ri.concepto,
        importe: ri.importe,
        reduccion,
        neto,
        qualifies,
      });

      totalIrregular += ri.importe;
      totalReduction += reduccion;

      if (!qualifies && ri.aplicaReduccion30) {
        warnings.push(`Renta irregular "${ri.concepto}": marcada para reducción 30% pero años de generación (${ri.aniosGeneracion}) ≤ 2 — no aplica`);
      }
    }

    irregularReduction = totalReduction;
    irregularIncomeResult = {
      totalIrregular: r2(totalIrregular),
      reduccion30Applied: r2(totalReduction),
      netIrregularAfterReduction: r2(totalIrregular - totalReduction),
      items,
      legalRef: 'LIRPF Art. 18.2 — Reducción 30% por rentas irregulares (generación >2 años, máx. 300.000€)',
    };

    legalRefs.push('LIRPF Art. 18.2 (Rentas irregulares — reducción 30%)');

    traces.push({
      step: 'Rentas irregulares (regla 30%)',
      formula: `${items.length} conceptos, total irregular ${r2(totalIrregular)}€, reducción 30% aplicada ${r2(totalReduction)}€, neto irregular ${r2(totalIrregular - totalReduction)}€`,
      result: r2(totalReduction),
    });
  }

  // ── 1. Rendimientos brutos ──
  const rendimientosBrutos = input.salarioBrutoAnual;

  // ── 2. Gastos deducibles (LIRPF Art. 19) ──
  const GASTOS_GENERALES = 2000;
  let gastosDeducibles = GASTOS_GENERALES + input.ssWorkerAnual;

  if (input.movilidadGeografica) {
    gastosDeducibles += 2000;
  }

  gastosDeducibles += Math.min(input.aportacionesPlanesP, 1500);

  traces.push({
    step: 'Gastos deducibles',
    formula: `General 2.000 + SS ${r2(input.ssWorkerAnual)} + PP ${Math.min(input.aportacionesPlanesP, 1500)}${input.movilidadGeografica ? ' + Movilidad 2.000' : ''} = ${r2(gastosDeducibles)}`,
    result: r2(gastosDeducibles),
  });

  // ── 3. Rendimiento neto (with irregular income reduction) ──
  const rendimientoNeto = Math.max(0, rendimientosBrutos - gastosDeducibles - irregularReduction);

  if (irregularReduction > 0) {
    traces.push({
      step: 'Rendimiento neto (con reducción rentas irregulares)',
      formula: `max(0, ${r2(rendimientosBrutos)} - ${r2(gastosDeducibles)} - reducción irregular ${r2(irregularReduction)}) = ${r2(rendimientoNeto)}`,
      result: r2(rendimientoNeto),
    });
  }

  // ── 4. Reducción por rendimientos del trabajo (LIRPF Art. 20) ──
  let reduccionRendimientos = 0;
  if (rendimientoNeto <= 14450) {
    if (rendimientoNeto <= 11250) {
      reduccionRendimientos = 7302;
    } else {
      reduccionRendimientos = 7302 - 1.75 * (rendimientoNeto - 11250);
    }
  }
  reduccionRendimientos = Math.max(0, reduccionRendimientos);

  if (input.contratoInferiorAnual) {
    reduccionRendimientos += 2000;
  }

  traces.push({
    step: 'Reducción rendimientos trabajo',
    formula: `Reducción = ${r2(reduccionRendimientos)}`,
    result: r2(reduccionRendimientos),
  });

  // ── 5. Base imponible general ──
  const baseImponibleGeneral = Math.max(0, rendimientoNeto - reduccionRendimientos - input.pensionCompensatoria - input.anualidadAlimentos);

  traces.push({
    step: 'Base imponible general',
    formula: `max(0, ${r2(rendimientoNeto)} - ${r2(reduccionRendimientos)} - pensión ${r2(input.pensionCompensatoria)} - alimentos ${r2(input.anualidadAlimentos)}) = ${r2(baseImponibleGeneral)}`,
    result: r2(baseImponibleGeneral),
  });

  // ── 6-9. Mínimos personales y familiares ──
  // PINST-B2: Support mid-year family changes via weighted minimums
  let minimoPersonal: number;
  let minimoDescendientes: number;
  let minimoAscendientes: number;
  const minimoDiscapacidad = 0;
  let familyChangeImpact: IRPFFamilyChangeImpact | null = null;

  if (input.cambiosFamiliares && input.cambiosFamiliares.length > 0) {
    // ── Mid-year family change: weighted minimums by period ──
    const result = computeWeightedMinimums(input, input.cambiosFamiliares, traces);
    minimoPersonal = result.minimoPersonal;
    minimoDescendientes = result.minimoDescendientes;
    minimoAscendientes = result.minimoAscendientes;
    familyChangeImpact = result.impact;

    legalRefs.push('RIRPF Art. 85 (Regularización por variación de circunstancias familiares)');

    warnings.push(`Cambio de situación familiar detectado — mínimos ponderados por período aplicados`);
  } else {
    // Standard minimums (no changes)
    minimoPersonal = computeMinimoPersonal(input);
    minimoDescendientes = computeMinimoDescendientes(input.hijosConvivencia);
    minimoAscendientes = computeMinimoAscendientes(input.ascendientesCargo, input.ascendientesMayores75);
  }

  const minimoTotal = minimoPersonal + minimoDescendientes + minimoAscendientes + minimoDiscapacidad;

  traces.push({
    step: 'Mínimo personal y familiar',
    formula: `Personal ${minimoPersonal} + Desc. ${minimoDescendientes} + Asc. ${minimoAscendientes}${familyChangeImpact ? ' (ponderado mid-year)' : ''} = ${minimoTotal}`,
    result: minimoTotal,
  });

  // ── 10. Base gravable ──
  const baseGravable = Math.max(0, baseImponibleGeneral);

  // ── 11. Cuota íntegra ──
  const { cuota: cuotaIntegra, tramosAplicados } = applyTramos(baseGravable, effectiveTramos);

  traces.push({
    step: 'Cuota íntegra (base gravable)',
    formula: `Σ tramos sobre ${r2(baseGravable)} = ${r2(cuotaIntegra)}`,
    result: r2(cuotaIntegra),
  });

  // ── 12. Cuota sobre mínimos ──
  const { cuota: cuotaMinimos } = applyTramos(minimoTotal, effectiveTramos);

  traces.push({
    step: 'Cuota sobre mínimos',
    formula: `Σ tramos sobre ${minimoTotal} = ${r2(cuotaMinimos)}`,
    result: r2(cuotaMinimos),
  });

  // ── 13. Cuota resultante ──
  const cuotaResultante = Math.max(0, cuotaIntegra - cuotaMinimos);

  // ── 14. Tipo efectivo base ──
  const tipoEfectivoBase = rendimientosBrutos > 0
    ? r2((cuotaResultante / rendimientosBrutos) * 100)
    : 0;

  // ── 15. Apply minimum thresholds ──
  const effectiveSituacion = input.cambiosFamiliares?.length
    ? input.cambiosFamiliares[input.cambiosFamiliares.length - 1].nuevaSituacion
    : input.situacionFamiliar;
  const threshold = IRPF_EXEMPT_THRESHOLDS[effectiveSituacion] ?? 14852;
  let finalTipo = tipoEfectivoBase;
  if (rendimientosBrutos <= threshold && input.hijosConvivencia.length === 0) {
    finalTipo = 0;
    warnings.push(`Rendimientos (${r2(rendimientosBrutos)}€) ≤ umbral exención (${threshold}€) — retención 0%`);
  }

  if (finalTipo > 0 && finalTipo < 2 && input.contratoInferiorAnual) {
    finalTipo = 2;
    warnings.push('Tipo mínimo 2% aplicado por contrato inferior a un año');
  }

  let retencionAnual = r2((rendimientosBrutos * finalTipo) / 100);
  let retencionMensual = r2(retencionAnual / 12);
  let regularizationDetail: IRPFRegularizationDetail | null = null;

  // ── 16. REGULARIZACIÓN PROGRESIVA (P1B — RIRPF Art. 82-86) ──
  if (regularizationCtx && regularizationCtx.currentMonth >= 1 && regularizationCtx.currentMonth <= 12) {
    const ctx = regularizationCtx;
    const month = ctx.currentMonth;
    const remainingMonths = 12 - month + 1;

    const accumulatedGrossInclCurrent = ctx.acumuladoBrutoAnterior + ctx.brutoMesActual;
    const avgMonthlyGross = accumulatedGrossInclCurrent / month;
    const projectedRemainingGross = ctx.brutoProyectadoRestante ?? (avgMonthlyGross * (12 - month));
    const projectedAnnualGross = accumulatedGrossInclCurrent + projectedRemainingGross;

    const accumulatedSSInclCurrent = ctx.acumuladoSSAnterior + ctx.ssMesActual;
    const avgMonthlySS = accumulatedSSInclCurrent / month;
    const projectedAnnualSS = accumulatedSSInclCurrent + (avgMonthlySS * (12 - month));

    const projectedInput: IRPFEmployeeInput = {
      ...input,
      salarioBrutoAnual: r2(projectedAnnualGross),
      ssWorkerAnual: r2(projectedAnnualSS),
    };
    const projectedResult = computeIRPF(projectedInput, tramos, null);
    const projectedAnnualCuota = r2((projectedResult.tipoEfectivo / 100) * projectedAnnualGross);

    const remainingToWithhold = Math.max(0, projectedAnnualCuota - ctx.acumuladoRetencionAnterior);

    const adjustedMonthlyRetention = r2(remainingToWithhold / remainingMonths);
    const adjustedTipoEfectivo = ctx.brutoMesActual > 0
      ? r2((adjustedMonthlyRetention / ctx.brutoMesActual) * 100)
      : finalTipo;

    regularizationDetail = {
      method: 'progressive_cumulative',
      currentMonth: month,
      projectedAnnualGross: r2(projectedAnnualGross),
      projectedAnnualSS: r2(projectedAnnualSS),
      annualCuotaProjected: r2(projectedAnnualCuota),
      accumulatedRetentionPrior: ctx.acumuladoRetencionAnterior,
      remainingMonths,
      adjustedMonthlyRetention,
      adjustedTipoEfectivo,
    };

    retencionMensual = adjustedMonthlyRetention;
    finalTipo = adjustedTipoEfectivo;
    retencionAnual = r2(projectedAnnualCuota);

    traces.push({
      step: 'Regularización progresiva (P1B)',
      formula: `Mes ${month}: proyección anual ${r2(projectedAnnualGross)}€ → cuota proyectada ${r2(projectedAnnualCuota)}€ - ya retenido ${ctx.acumuladoRetencionAnterior}€ = pendiente ${r2(remainingToWithhold)}€ / ${remainingMonths} meses = ${adjustedMonthlyRetention}€/mes (${adjustedTipoEfectivo}%)`,
      result: adjustedMonthlyRetention,
    });

    legalRefs.push('RIRPF Art. 82-86 (Regularización tipo retención)');
  }

  traces.push({
    step: 'Tipo efectivo final',
    formula: `${regularizationCtx ? 'Regularizado' : 'Base'}: ${finalTipo}% → retención mensual ${retencionMensual}€`,
    result: finalTipo,
  });

  // ── Limitations (explicit, persistent) ──
  limitations.push('Este cálculo es preparatorio — puede diferir del resultado oficial AEAT');
  if (!regionalDeductionResult?.supported && input.comunidadAutonoma) {
    // Already added above per CCAA
  } else if (!input.comunidadAutonoma) {
    limitations.push('Sin comunidad autónoma — escala estatal como aproximación');
  }
  if (!regularizationCtx) {
    limitations.push('Sin regularización progresiva — tipo fijo anual');
  }
  if (!dataQuality.familyDataAvailable) {
    limitations.push('Sin datos familiares — mínimos familiares no aplicados');
  }
  if (irregularIncomeResult && irregularIncomeResult.items.some(i => !i.qualifies && i.importe > 0)) {
    limitations.push('Algunas rentas irregulares no cumplen criterio Art. 18.2 — sin reducción 30%');
  }

  return {
    rendimientosBrutos: r2(rendimientosBrutos),
    gastosDeducibles: r2(gastosDeducibles),
    rendimientoNeto: r2(rendimientoNeto),
    reduccionRendimientos: r2(reduccionRendimientos),
    baseImponibleGeneral: r2(baseImponibleGeneral),
    minimoPersonal,
    minimoDescendientes,
    minimoAscendientes,
    minimoDiscapacidad,
    minimoTotal,
    baseGravable: r2(baseGravable),
    cuotaIntegra: r2(cuotaIntegra),
    cuotaMinimos: r2(cuotaMinimos),
    cuotaResultante: r2(cuotaResultante),
    tipoEfectivo: finalTipo,
    retencionMensual,
    retencionAnual,
    regularization: regularizationDetail,
    irregularIncome: irregularIncomeResult,
    regionalDeductions: regionalDeductionResult,
    familyChangeImpact,
    tramosAplicados,
    dataQuality,
    calculations: traces,
    warnings,
    limitations,
    legalReferences: legalRefs,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── PINST-B2: Mid-year family change weighted minimums ──
// ══════════════════════════════════════════════════════════════════════════════

function computeWeightedMinimums(
  baseInput: IRPFEmployeeInput,
  changes: IRPFFamilyChange[],
  traces: IRPFCalculationTrace[],
): {
  minimoPersonal: number;
  minimoDescendientes: number;
  minimoAscendientes: number;
  impact: IRPFFamilyChangeImpact;
} {
  // Build periods: initial situation + each change
  interface Period {
    fromMonth: number;
    toMonth: number;
    months: number;
    situacion: 1 | 2 | 3;
    hijos: IRPFDescendant[];
    ascendientesCargo: number;
    ascendientesMayores75: number;
  }

  const sortedChanges = [...changes].sort((a, b) => a.mesEfecto - b.mesEfecto);
  const periods: Period[] = [];

  // Initial period
  const firstChangeMonth = sortedChanges[0]?.mesEfecto ?? 13;
  if (firstChangeMonth > 1) {
    periods.push({
      fromMonth: 1,
      toMonth: firstChangeMonth - 1,
      months: firstChangeMonth - 1,
      situacion: baseInput.situacionFamiliar,
      hijos: baseInput.hijosConvivencia,
      ascendientesCargo: baseInput.ascendientesCargo,
      ascendientesMayores75: baseInput.ascendientesMayores75,
    });
  }

  // Change periods
  for (let i = 0; i < sortedChanges.length; i++) {
    const c = sortedChanges[i];
    const nextMonth = sortedChanges[i + 1]?.mesEfecto ?? 13;
    periods.push({
      fromMonth: c.mesEfecto,
      toMonth: nextMonth - 1,
      months: nextMonth - c.mesEfecto,
      situacion: c.nuevaSituacion,
      hijos: c.nuevosHijos,
      ascendientesCargo: c.nuevosAscendientesCargo,
      ascendientesMayores75: c.nuevosAscendientesMayores75,
    });
  }

  // Weighted calculation
  let weightedPersonal = 0;
  let weightedDescendientes = 0;
  let weightedAscendientes = 0;
  const changeDetails: IRPFFamilyChangeImpact['changes'] = [];

  for (const period of periods) {
    const pInput: IRPFEmployeeInput = {
      ...baseInput,
      situacionFamiliar: period.situacion,
      hijosConvivencia: period.hijos,
      ascendientesCargo: period.ascendientesCargo,
      ascendientesMayores75: period.ascendientesMayores75,
    };

    const mp = computeMinimoPersonal(pInput);
    const md = computeMinimoDescendientes(period.hijos);
    const ma = computeMinimoAscendientes(period.ascendientesCargo, period.ascendientesMayores75);
    const weight = period.months / 12;

    weightedPersonal += mp * weight;
    weightedDescendientes += md * weight;
    weightedAscendientes += ma * weight;
  }

  // Build change impact details
  for (const c of sortedChanges) {
    const beforeInput = { ...baseInput };
    const afterInput = {
      ...baseInput,
      situacionFamiliar: c.nuevaSituacion,
      hijosConvivencia: c.nuevosHijos,
      ascendientesCargo: c.nuevosAscendientesCargo,
      ascendientesMayores75: c.nuevosAscendientesMayores75,
    };
    const minBefore = computeMinimoPersonal(beforeInput) + computeMinimoDescendientes(beforeInput.hijosConvivencia) + computeMinimoAscendientes(beforeInput.ascendientesCargo, beforeInput.ascendientesMayores75);
    const minAfter = computeMinimoPersonal(afterInput) + computeMinimoDescendientes(afterInput.hijosConvivencia) + computeMinimoAscendientes(afterInput.ascendientesCargo, afterInput.ascendientesMayores75);

    changeDetails.push({
      mesEfecto: c.mesEfecto,
      motivo: c.motivo,
      minimosAntes: minBefore,
      minimosDespues: minAfter,
      impactoCuotaAnual: r2((minAfter - minBefore) * 0.19), // Rough estimate at lowest tramo
    });
  }

  const minimoPersonal = r2(weightedPersonal);
  const minimoDescendientes = r2(weightedDescendientes);
  const minimoAscendientes = r2(weightedAscendientes);

  traces.push({
    step: 'Mínimos ponderados por cambio familiar mid-year',
    formula: `${periods.length} períodos → Personal ponderado ${minimoPersonal}, Desc. ${minimoDescendientes}, Asc. ${minimoAscendientes}`,
    result: minimoPersonal + minimoDescendientes + minimoAscendientes,
  });

  return {
    minimoPersonal,
    minimoDescendientes,
    minimoAscendientes,
    impact: {
      changes: changeDetails,
      minimosPonderados: r2(minimoPersonal + minimoDescendientes + minimoAscendientes),
      regularizacionAplicada: true,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Helper functions for minimums ──
// ══════════════════════════════════════════════════════════════════════════════

function computeMinimoPersonal(input: IRPFEmployeeInput): number {
  let mp = 5550;
  if (input.discapacidadTrabajador === 'gte33') mp += 3000;
  if (input.discapacidadTrabajador === 'gte33_mobility') mp += 6000;
  if (input.discapacidadTrabajador === 'gte65') mp += 12000;
  if (input.prolongacionLaboral) mp += 3000;
  return mp;
}

function computeMinimoDescendientes(hijos: IRPFDescendant[]): number {
  let md = 0;
  const AMOUNTS = [2400, 2700, 4000, 4500];
  for (const hijo of hijos) {
    const idx = Math.min(hijo.orden - 1, 3);
    md += AMOUNTS[idx];
    if (hijo.esMenorDe3) md += 2800;
    if (hijo.discapacidad === 'gte33') md += 3000;
    if (hijo.discapacidad === 'gte33_mobility') md += 6000;
    if (hijo.discapacidad === 'gte65') md += 12000;
  }
  return md;
}

function computeMinimoAscendientes(cargo: number, mayores75: number): number {
  let ma = cargo * 1150;
  ma += mayores75 * (2550 - 1150);
  return ma;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── CCAA normalization ──
// ══════════════════════════════════════════════════════════════════════════════

function normalizeCCAAKey(ccaa: string | null): string | null {
  if (!ccaa) return null;
  const normalized = ccaa.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[-]/g, '_');

  // Direct match
  if (CCAA_SUPPORTED.includes(normalized)) return normalized;

  // Alias map
  const aliases: Record<string, string> = {
    'comunidad_de_madrid': 'madrid',
    'comunitat_valenciana': 'valencia',
    'comunidad_valenciana': 'valencia',
    'catalunya': 'cataluña',
    'cataluna': 'cataluña',
    'euskadi': 'pais_vasco',
    'andalusia': 'andalucia',
  };
  return aliases[normalized] ?? null;
}

// ── Tramos application ──

function applyTramos(
  base: number,
  tramos: IRPFTramo[],
): { cuota: number; tramosAplicados: IRPFTramoAplicado[] } {
  let remaining = base;
  let cuota = 0;
  const aplicados: IRPFTramoAplicado[] = [];

  for (const t of tramos) {
    if (remaining <= 0) break;
    const tramoSize = t.tramo_hasta !== null ? t.tramo_hasta - t.tramo_desde : remaining;
    const baseTramo = Math.min(remaining, tramoSize);
    const cuotaTramo = r2((baseTramo * t.tipo_total) / 100);
    cuota += cuotaTramo;
    aplicados.push({
      desde: t.tramo_desde,
      hasta: t.tramo_hasta,
      tipo: t.tipo_total,
      baseTramo: r2(baseTramo),
      cuota: cuotaTramo,
    });
    remaining -= baseTramo;
  }

  return { cuota: r2(cuota), tramosAplicados: aplicados };
}

// ── Helpers ──

/** Build IRPFEmployeeInput from ES labor data and payroll data */
export function buildIRPFInputFromLaborData(
  laborData: {
    situacion_familiar_irpf: number | null;
    hijos_menores_25: number | null;
    hijos_menores_3: number | null;
    discapacidad_hijos: boolean | null;
    ascendientes_cargo: number | null;
    pension_compensatoria: number | null;
    anualidad_alimentos: number | null;
    prolongacion_laboral: boolean | null;
    contrato_inferior_anual: boolean | null;
    reduccion_movilidad_geografica: boolean | null;
    comunidad_autonoma: string | null;
  } | null,
  salarioBrutoAnual: number,
  ssWorkerAnual: number,
): IRPFEmployeeInput {
  const sit = (laborData?.situacion_familiar_irpf ?? 1) as 1 | 2 | 3;

  const hijosConvivencia: IRPFDescendant[] = [];
  const totalHijos = laborData?.hijos_menores_25 ?? 0;
  const hijosMenores3 = laborData?.hijos_menores_3 ?? 0;

  for (let i = 0; i < totalHijos; i++) {
    hijosConvivencia.push({
      orden: i + 1,
      esMenorDe3: i < hijosMenores3,
      discapacidad: (laborData?.discapacidad_hijos && i === 0) ? 'gte33' : 'none',
    });
  }

  return {
    salarioBrutoAnual,
    ssWorkerAnual,
    situacionFamiliar: sit,
    hijosConvivencia,
    ascendientesCargo: laborData?.ascendientes_cargo ?? 0,
    ascendientesMayores75: 0,
    discapacidadTrabajador: 'none',
    pensionCompensatoria: laborData?.pension_compensatoria ?? 0,
    anualidadAlimentos: laborData?.anualidad_alimentos ?? 0,
    aportacionesPlanesP: 0,
    prolongacionLaboral: laborData?.prolongacion_laboral ?? false,
    movilidadGeografica: laborData?.reduccion_movilidad_geografica ?? false,
    contratoInferiorAnual: laborData?.contrato_inferior_anual ?? false,
    tieneHipotecaAnterior2013: false,
    comunidadAutonoma: laborData?.comunidad_autonoma ?? null,
  };
}

/** Check missing IRPF data for an employee and return list of missing fields */
export function checkIRPFDataCompleteness(laborData: {
  situacion_familiar_irpf: number | null;
  hijos_menores_25: number | null;
  comunidad_autonoma: string | null;
} | null): { complete: boolean; missingFields: string[] } {
  const missing: string[] = [];

  if (!laborData) {
    return { complete: false, missingFields: ['Ficha laboral ES completa'] };
  }

  if (laborData.situacion_familiar_irpf === null) missing.push('Situación familiar IRPF');
  if (laborData.hijos_menores_25 === null) missing.push('Hijos < 25 años a cargo');
  if (!laborData.comunidad_autonoma) missing.push('Comunidad autónoma');

  return { complete: missing.length === 0, missingFields: missing };
}

/** Get list of supported CCAA for regional scales */
export function getSupportedCCAA(): string[] {
  return [...CCAA_SUPPORTED];
}

/** Check if a CCAA has foral regime */
export function isCCAAForal(ccaa: string): boolean {
  const key = normalizeCCAAKey(ccaa);
  return key ? CCAA_REGIMEN_FORAL.includes(key) : false;
}
