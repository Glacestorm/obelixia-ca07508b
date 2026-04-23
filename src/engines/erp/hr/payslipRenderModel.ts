/**
 * payslipRenderModel — Source of truth única para renderizar el recibo de nómina ES.
 * S9.22: Consumido por preview RRHH, slip oficial, generador PDF y portal del empleado.
 * Toma `calculation_details` persistido (post S9.21m) o `ESPayrollCalculation` en vivo.
 */

export interface PayslipRenderHeader {
  empresaNombre: string;
  empresaCIF: string;
  empresaCCC: string;
  empleadoNombre: string;
  empleadoNAF: string;
  empleadoDNI: string;
  empleadoCategoria: string;
  empleadoGrupoCotizacion: number | null;
  empleadoAntiguedad: string;
  periodoLabel: string;
  periodoDesde: string | null;
  periodoHasta: string | null;
  diasTotales: number | null;
  currency: string;
}

export interface PayslipRenderLine {
  code: string;
  name: string;
  amount: number;
  base?: number | null;
  percentage?: number | null;
  units?: number | null;
  unitPrice?: number | null;
  isTaxable?: boolean;
  isSSContributable?: boolean;
  legalReference?: string | null;
}

export interface PayslipRenderBases {
  baseCC: number;
  baseAT: number;
  baseIRPF: number;
  baseHorasExtra: number;
  topeMinimo?: number | null;
  topeMaximo?: number | null;
  aplicoTopeMinimo?: boolean;
  aplicoTopeMaximo?: boolean;
}

export interface PayslipRenderTotals {
  totalDevengos: number;
  totalDeducciones: number;
  liquidoPercibir: number;
  totalCosteEmpresa: number;
  costeTotalEmpresa: number;
  tipoIRPF: number;
}

export interface PayslipRenderModel {
  header: PayslipRenderHeader;
  devengos: PayslipRenderLine[];
  deducciones: PayslipRenderLine[];
  costesEmpresa: PayslipRenderLine[];
  bases: PayslipRenderBases;
  totals: PayslipRenderTotals;
  notes: string[];
  warnings: string[];
  /** Hash determinista del calculation_details fuente — para PDF system_generated. */
  sourceHash?: string | null;
  meta: {
    payrollRecordId?: string | null;
    periodId?: string | null;
    generatedAt: string;
  };
}

const r2 = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
};

const safeStr = (v: unknown, fallback = ''): string => {
  if (v === null || v === undefined) return fallback;
  return String(v);
};

/**
 * Builder único. Acepta:
 *  - calculation_details (jsonb persistido en hr_payroll_records) — formato canónico
 *  - O un objeto compatible con ESPayrollCalculation (preview en vivo)
 */
export function buildPayslipRenderModel(args: {
  calculation: any;
  employee: {
    first_name?: string | null;
    last_name?: string | null;
    national_id?: string | null;
    employee_code?: string | null;
    job_title?: string | null;
    category?: string | null;
    hire_date?: string | null;
    grupo_cotizacion?: number | null;
    naf?: string | null;
  };
  company?: {
    name?: string | null;
    cif?: string | null;
    ccc?: string | null;
  };
  period?: {
    id?: string | null;
    period_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  };
  payrollRecordId?: string | null;
  currency?: string;
}): PayslipRenderModel {
  const calc = args.calculation ?? {};
  const lines: any[] = Array.isArray(calc.lines) ? calc.lines : [];
  const summary = calc.summary ?? {};
  const bases = summary.bases ?? {};

  // S9.21o — Defensa en profundidad: si la traza del convenio marca
  // `manual_review_required`, omitir ES_MEJORA_VOLUNTARIA del render. Hereda
  // automáticamente en preview, slip oficial, PDF y portal del empleado.
  const agreementTrace =
    calc.__agreement_trace ??
    (Array.isArray(calc.complements)
      ? calc.complements.find((c: any) => c?.code === '__agreement_trace')?.trace
      : null);
  const omitMejora =
    agreementTrace?.agreement_resolution_status === 'manual_review_required';

  // ─── Líneas ───
  const isMejoraLine = (l: any) => {
    const code = String(l?.concept_code ?? l?.conceptCode ?? l?.code ?? '');
    return code === 'ES_MEJORA_VOLUNTARIA';
  };
  const devengos: PayslipRenderLine[] = lines
    .filter((l) => l && (l.line_type === 'earning' || l.lineType === 'earning'))
    .filter((l) => !(omitMejora && isMejoraLine(l)))
    .map((l) => mapLine(l));

  const deducciones: PayslipRenderLine[] = lines
    .filter((l) => l && (l.line_type === 'deduction' || l.lineType === 'deduction'))
    .map((l) => mapLine(l));

  const costesEmpresa: PayslipRenderLine[] = lines
    .filter((l) => l && (l.line_type === 'employer_cost' || l.lineType === 'employer_cost'))
    .map((l) => mapLine(l));

  // Fallback: si no hay summary.totalDevengos, sumar líneas
  const totalDevengos = r2(
    summary.totalDevengos ?? devengos.reduce((s, d) => s + d.amount, 0),
  );
  const totalDeducciones = r2(
    summary.totalDeducciones ?? deducciones.reduce((s, d) => s + d.amount, 0),
  );
  const totalCosteEmpresa = r2(
    summary.totalCosteEmpresa ?? costesEmpresa.reduce((s, d) => s + d.amount, 0),
  );
  const liquidoPercibir = r2(summary.liquidoPercibir ?? totalDevengos - totalDeducciones);

  const renderBases: PayslipRenderBases = {
    baseCC: r2(summary.baseCotizacionCC ?? bases.baseCotizacionCC ?? 0),
    baseAT: r2(summary.baseCotizacionAT ?? bases.baseCotizacionAT ?? 0),
    baseIRPF: r2(summary.baseIRPF ?? bases.baseIRPF ?? 0),
    baseHorasExtra: r2(bases.horasExtraImporte ?? 0),
    topeMinimo: bases.topeMinimoCC ?? null,
    topeMaximo: bases.topeMaximoCC ?? null,
    aplicoTopeMinimo: !!bases.aplicoTopeMinimo,
    aplicoTopeMaximo: !!bases.aplicoTopeMaximo,
  };

  const totals: PayslipRenderTotals = {
    totalDevengos,
    totalDeducciones,
    liquidoPercibir,
    totalCosteEmpresa,
    costeTotalEmpresa: r2(totalDevengos + totalCosteEmpresa),
    tipoIRPF: r2(summary.tipoIRPF ?? 0),
  };

  const notes: string[] = [];
  if (renderBases.aplicoTopeMaximo) {
    notes.push('Base de cotización CC limitada por tope MÁXIMO legal vigente.');
  } else if (renderBases.aplicoTopeMinimo) {
    notes.push('Base de cotización CC ajustada al tope MÍNIMO legal vigente.');
  }

  const warnings: string[] = Array.isArray(calc.warnings) ? calc.warnings.map(String) : [];

  const empleadoNombre = [args.employee.first_name, args.employee.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Empleado';

  const header: PayslipRenderHeader = {
    empresaNombre: safeStr(args.company?.name, '—'),
    empresaCIF: safeStr(args.company?.cif, '—'),
    empresaCCC: safeStr(args.company?.ccc, '—'),
    empleadoNombre,
    empleadoNAF: safeStr(args.employee.naf, '—'),
    empleadoDNI: safeStr(args.employee.national_id, '—'),
    empleadoCategoria: safeStr(args.employee.category ?? args.employee.job_title, '—'),
    empleadoGrupoCotizacion: args.employee.grupo_cotizacion ?? null,
    empleadoAntiguedad: safeStr(args.employee.hire_date, '—'),
    periodoLabel: safeStr(args.period?.period_name, '—'),
    periodoDesde: args.period?.start_date ?? null,
    periodoHasta: args.period?.end_date ?? null,
    diasTotales: bases.diasTotales ?? null,
    currency: args.currency || 'EUR',
  };

  return {
    header,
    devengos,
    deducciones,
    costesEmpresa,
    bases: renderBases,
    totals,
    notes,
    warnings,
    sourceHash: null,
    meta: {
      payrollRecordId: args.payrollRecordId ?? null,
      periodId: args.period?.id ?? null,
      generatedAt: new Date().toISOString(),
    },
  };
}

function mapLine(l: any): PayslipRenderLine {
  return {
    code: safeStr(l.concept_code ?? l.conceptCode ?? l.code, ''),
    name: safeStr(l.concept_name ?? l.conceptName ?? l.name, 'Concepto'),
    amount: r2(l.amount ?? 0),
    base: l.base_amount ?? l.baseAmount ?? l.base ?? null,
    percentage: l.percentage ?? l.porcentaje ?? null,
    units: l.units ?? l.unidades ?? null,
    unitPrice: l.unit_price ?? l.unitPrice ?? l.precioUnidad ?? null,
    isTaxable: !!(l.is_taxable ?? l.isTaxable),
    isSSContributable: !!(l.is_ss_contributable ?? l.isSSContributable),
    legalReference: l.legal_reference ?? l.legalReference ?? null,
  };
}

/**
 * Hash SHA-256 determinista del calculation_details fuente.
 * Usado en footer del PDF on-demand para trazabilidad.
 */
export async function computeSourceHash(calculation: unknown): Promise<string> {
  try {
    const stable = stableStringify(calculation);
    const buf = new TextEncoder().encode(stable);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'hash-unavailable';
  }
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  );
}