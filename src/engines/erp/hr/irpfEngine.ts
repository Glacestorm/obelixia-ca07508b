/**
 * irpfEngine.ts — V2-RRHH-P1
 * Motor puro de cálculo de retención IRPF (España) — Preparatorio avanzado
 *
 * Calcula:
 *  - Base imponible IRPF (rendimientos del trabajo)
 *  - Reducciones y mínimos personales/familiares
 *  - Cuota íntegra por tramos (estatal + autonómico)
 *  - Tipo efectivo de retención
 *  - Retención mensual
 *
 * Legislación referencia: LIRPF Arts. 17-20, 56-66, 80-86, 99-101; RIRPF Art. 82-86
 * NOTA: Cálculo preparatorio — puede diferir del resultado exacto de la AEAT.
 *       No constituye asesoramiento fiscal.
 */

// ── Input types ──

export interface IRPFEmployeeInput {
  // Compensation
  salarioBrutoAnual: number;
  ssWorkerAnual: number; // Annual SS worker contributions (deductible)

  // Family situation (modelo 145)
  situacionFamiliar: 1 | 2 | 3;
  // 1: Soltero/a, viudo/a, divorciado/a, separado/a
  // 2: Casado/a con cónyuge sin rentas > 1.500€
  // 3: Casado/a con cónyuge con rentas > 1.500€ o sin declaración conjunta

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
  aportacionesPlanesP: number; // Pension plan contributions

  // Special situations
  prolongacionLaboral: boolean;       // >65 y sigue trabajando
  movilidadGeografica: boolean;       // 2 primeros años
  contratoInferiorAnual: boolean;
  tieneHipotecaAnterior2013: boolean; // Legacy deduction

  // Community (affects autonómico)
  comunidadAutonoma: string | null;
}

export type IRPFDisabilityLevel = 'none' | 'gte33' | 'gte33_mobility' | 'gte65';

export interface IRPFDescendant {
  orden: number; // 1st child, 2nd, etc.
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
  cuotaMinimos: number; // Tax on minimums (to subtract)
  cuotaResultante: number;

  // Effective rate
  tipoEfectivo: number;          // Percentage to apply
  retencionMensual: number;      // Monthly withholding
  retencionAnual: number;        // Annual withholding

  // Traceability
  tramosAplicados: IRPFTramoAplicado[];
  dataQuality: IRPFDataQuality;
  calculations: IRPFCalculationTrace[];
  warnings: string[];
  limitations: string[];
  legalReferences: string[];
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

// ── Minimum thresholds below which no IRPF applies (RIRPF Art. 81) ──

const IRPF_EXEMPT_THRESHOLDS: Record<number, number> = {
  1: 14852, // Situación 1 sin hijos
  2: 17894, // Situación 2
  3: 14852, // Situación 3
};

// ── Core Calculation ──

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute IRPF retention for one employee for the current fiscal year.
 *
 * @param input   — Employee data (salary, family, etc.)
 * @param tramos  — Tax brackets from hr_es_irpf_tables (or null for defaults)
 */
export function computeIRPF(
  input: IRPFEmployeeInput,
  tramos: IRPFTramo[] | null,
): IRPFCalculationResult {
  const warnings: string[] = [];
  const limitations: string[] = [];
  const traces: IRPFCalculationTrace[] = [];
  const legalRefs: string[] = [
    'LIRPF Arts. 17-20 (Rendimientos del trabajo)',
    'LIRPF Arts. 56-66 (Mínimo personal y familiar)',
    'RIRPF Arts. 80-86 (Retenciones)',
  ];

  const effectiveTramos = tramos && tramos.length > 0 ? tramos : DEFAULT_TRAMOS_2025;

  const dataQuality: IRPFDataQuality = {
    tramosFromDB: tramos !== null && tramos.length > 0,
    familyDataAvailable: input.hijosConvivencia.length > 0 || input.ascendientesCargo > 0,
    ssContributionsReal: input.ssWorkerAnual > 0,
    comunidadEspecifica: !!input.comunidadAutonoma,
  };

  if (!dataQuality.tramosFromDB) {
    warnings.push('Usando tramos IRPF por defecto 2025 — sin datos específicos en BD');
  }
  if (!dataQuality.comunidadEspecifica) {
    limitations.push('Escala autonómica no especificada — usando escala estatal duplicada como aproximación');
  }

  // ── 1. Rendimientos brutos ──
  const rendimientosBrutos = input.salarioBrutoAnual;

  // ── 2. Gastos deducibles (LIRPF Art. 19) ──
  const GASTOS_GENERALES = 2000; // Fixed deduction
  let gastosDeducibles = GASTOS_GENERALES + input.ssWorkerAnual;

  if (input.movilidadGeografica) {
    gastosDeducibles += 2000; // Additional deduction for geographic mobility
  }

  // Aportaciones planes pensiones (max 1.500€ individual + 8.500€ empresa)
  gastosDeducibles += Math.min(input.aportacionesPlanesP, 1500);

  traces.push({
    step: 'Gastos deducibles',
    formula: `General 2.000 + SS ${r2(input.ssWorkerAnual)} + PP ${Math.min(input.aportacionesPlanesP, 1500)}${input.movilidadGeografica ? ' + Movilidad 2.000' : ''} = ${r2(gastosDeducibles)}`,
    result: r2(gastosDeducibles),
  });

  // ── 3. Rendimiento neto ──
  const rendimientoNeto = Math.max(0, rendimientosBrutos - gastosDeducibles);

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

  // Additional reduction for contract < 1 year
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

  // ── 6. Mínimo personal (LIRPF Art. 57) ──
  let minimoPersonal = 5550;
  if (input.discapacidadTrabajador === 'gte33') minimoPersonal += 3000;
  if (input.discapacidadTrabajador === 'gte33_mobility') minimoPersonal += 3000 + 3000;
  if (input.discapacidadTrabajador === 'gte65') minimoPersonal += 12000;
  if (input.prolongacionLaboral) minimoPersonal += 3000; // >65 working

  // ── 7. Mínimo por descendientes (LIRPF Art. 58) ──
  let minimoDescendientes = 0;
  const DESCENDANT_AMOUNTS = [2400, 2700, 4000, 4500]; // 1st, 2nd, 3rd, 4th+
  for (const hijo of input.hijosConvivencia) {
    const idx = Math.min(hijo.orden - 1, 3);
    minimoDescendientes += DESCENDANT_AMOUNTS[idx];
    if (hijo.esMenorDe3) minimoDescendientes += 2800;
    if (hijo.discapacidad === 'gte33') minimoDescendientes += 3000;
    if (hijo.discapacidad === 'gte33_mobility') minimoDescendientes += 6000;
    if (hijo.discapacidad === 'gte65') minimoDescendientes += 12000;
  }

  // ── 8. Mínimo por ascendientes (LIRPF Art. 59) ──
  let minimoAscendientes = input.ascendientesCargo * 1150;
  minimoAscendientes += input.ascendientesMayores75 * (2550 - 1150); // 2550 for >75, already counted 1150

  // ── 9. Mínimo por discapacidad (already included above per person) ──
  const minimoDiscapacidad = 0; // Already computed inline

  const minimoTotal = minimoPersonal + minimoDescendientes + minimoAscendientes + minimoDiscapacidad;

  traces.push({
    step: 'Mínimo personal y familiar',
    formula: `Personal ${minimoPersonal} + Desc. ${minimoDescendientes} + Asc. ${minimoAscendientes} = ${minimoTotal}`,
    result: minimoTotal,
  });

  // ── 10. Base gravable ──
  const baseGravable = Math.max(0, baseImponibleGeneral);

  // ── 11. Cuota íntegra (apply tramos) ──
  const { cuota: cuotaIntegra, tramosAplicados } = applyTramos(baseGravable, effectiveTramos);

  traces.push({
    step: 'Cuota íntegra (base gravable)',
    formula: `Σ tramos sobre ${r2(baseGravable)} = ${r2(cuotaIntegra)}`,
    result: r2(cuotaIntegra),
  });

  // ── 12. Cuota sobre mínimos (to subtract) ──
  const { cuota: cuotaMinimos } = applyTramos(minimoTotal, effectiveTramos);

  traces.push({
    step: 'Cuota sobre mínimos',
    formula: `Σ tramos sobre ${minimoTotal} = ${r2(cuotaMinimos)}`,
    result: r2(cuotaMinimos),
  });

  // ── 13. Cuota resultante ──
  const cuotaResultante = Math.max(0, cuotaIntegra - cuotaMinimos);

  // ── 14. Tipo efectivo ──
  const tipoEfectivo = rendimientosBrutos > 0
    ? r2((cuotaResultante / rendimientosBrutos) * 100)
    : 0;

  // ── 15. Apply minimum thresholds ──
  const threshold = IRPF_EXEMPT_THRESHOLDS[input.situacionFamiliar] ?? 14852;
  let finalTipo = tipoEfectivo;
  if (rendimientosBrutos <= threshold && input.hijosConvivencia.length === 0) {
    finalTipo = 0;
    warnings.push(`Rendimientos (${r2(rendimientosBrutos)}€) ≤ umbral exención (${threshold}€) — retención 0%`);
  }

  // Minimum 2% for contracts < 1 year or internships
  if (finalTipo > 0 && finalTipo < 2 && input.contratoInferiorAnual) {
    finalTipo = 2;
    warnings.push('Tipo mínimo 2% aplicado por contrato inferior a un año');
  }

  const retencionAnual = r2((rendimientosBrutos * finalTipo) / 100);
  const retencionMensual = r2(retencionAnual / 12);

  traces.push({
    step: 'Tipo efectivo final',
    formula: `cuotaResultante ${r2(cuotaResultante)} / brutoAnual ${r2(rendimientosBrutos)} × 100 = ${finalTipo}%`,
    result: finalTipo,
  });

  // ── Limitations ──
  limitations.push('Este cálculo es preparatorio — puede diferir del resultado oficial AEAT');
  limitations.push('No incluye deducciones autonómicas específicas');
  limitations.push('Regularización progresiva (recálculo mensual acumulado) no implementada');
  if (!dataQuality.familyDataAvailable) {
    limitations.push('Sin datos familiares del empleado — mínimos familiares no aplicados');
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
    tramosAplicados,
    dataQuality,
    calculations: traces,
    warnings,
    limitations,
    legalReferences: legalRefs,
  };
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

  // Build descendants list
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
