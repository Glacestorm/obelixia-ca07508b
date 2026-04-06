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

import {
  SS_CONTRIBUTION_RATES_2026,
  SS_GROUP_BASES_2026 as SS_GROUP_BASES_SHARED,
  SS_BASE_MAX_MENSUAL_2026,
  SS_BASE_MAX_DIARIA_2026,
} from '@/shared/legal/rules/ssRules2026';

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
  /** Ocupación SS (Cuadro II DA 61ª LGSS): 'a'=oficina, 'b'=representantes, 'd'=oficios construcción, 'f'=conductores, 'g'=limpieza, 'h'=seguridad */
  ocupacionSS?: 'a' | 'b' | 'd' | 'f' | 'g' | 'h' | null;
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

  // Cotización adicional de solidaridad 2026
  solidaridad: SolidarityContribution | null;

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

/**
 * Bases mínimas por grupo de cotización 2026 (RDL 3/2026, BOE 04/02/2026)
 * Derived from Shared Legal Core (ssRules2026) — single source of truth.
 * Adapter maps shared shape → engine shape for backward compatibility.
 */
export const SS_GROUP_BASES_2026: Record<number, {
  base_minima_mensual: number;
  base_maxima_mensual: number;
  base_minima_diaria: number | null;
  base_maxima_diaria: number | null;
  cotizacion_tipo: 'mensual' | 'diaria';
  descripcion: string;
}> = Object.fromEntries(
  Object.entries(SS_GROUP_BASES_SHARED).map(([k, v]) => [
    Number(k),
    {
      base_minima_mensual: v.isDailyBase ? Math.round(v.minMensual * 30 * 100) / 100 : v.minMensual,
      base_maxima_mensual: SS_BASE_MAX_MENSUAL_2026,
      base_minima_diaria: v.isDailyBase ? v.minMensual : null,
      base_maxima_diaria: v.isDailyBase ? SS_BASE_MAX_DIARIA_2026 : null,
      cotizacion_tipo: v.isDailyBase ? 'diaria' as const : 'mensual' as const,
      descripcion: v.label,
    },
  ])
);

/** Default SS topes — resolved by grupo de cotización (2026) */
function getDefaultTopesForGroup(grupo: number) {
  const groupData = SS_GROUP_BASES_2026[grupo] ?? SS_GROUP_BASES_2026[1];
  return {
    base_minima_mensual: groupData.base_minima_mensual,
    base_maxima_mensual: groupData.base_maxima_mensual,
    base_minima_diaria: groupData.base_minima_diaria,
    base_maxima_diaria: groupData.base_maxima_diaria,
  };
}

/** Default rates 2026 (Régimen General) — derived from Shared Legal Core (ssRules2026) */
const DEFAULT_SS_RATES_2026 = {
  tipo_cc_empresa: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa,
  tipo_cc_trabajador: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador,
  tipo_desempleo_empresa_gi: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa,
  tipo_desempleo_trabajador_gi: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.trabajador,
  tipo_desempleo_empresa_td: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa,
  tipo_desempleo_trabajador_td: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.trabajador,
  tipo_fogasa: SS_CONTRIBUTION_RATES_2026.fogasa.empresa,
  tipo_fp_empresa: SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa,
  tipo_fp_trabajador: SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador,
  tipo_mei: SS_CONTRIBUTION_RATES_2026.mei.total,
  tipo_at_empresa: SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa,
};

/**
 * Cuadro II — DA 61ª LGSS (RDL 16/2025, confirmado RDL 3/2026)
 * Tipos AT/EP por clave de ocupación SS
 * Se aplican INDEPENDIENTEMENTE del CNAE cuando el trabajador tiene una de estas claves.
 */
const CUADRO_II_AT_EP: Record<string, { it: number; ims: number; total: number; descripcion: string }> = {
  a: { it: 0.80, ims: 0.70, total: 1.50, descripcion: 'Personal en trabajos exclusivos de oficina' },
  b: { it: 1.00, ims: 1.00, total: 2.00, descripcion: 'Representantes de comercio' },
  d: { it: 3.35, ims: 3.35, total: 6.70, descripcion: 'Personal de oficios en instalaciones/reparaciones/construcción' },
  f: { it: 3.35, ims: 3.35, total: 6.70, descripcion: 'Conductores vehículo >3,5 Tm' },
  g: { it: 2.10, ims: 1.50, total: 3.60, descripcion: 'Personal de limpieza' },
  h: { it: 1.40, ims: 2.20, total: 3.60, descripcion: 'Vigilantes, guardas jurados y personal de seguridad' },
};

/**
 * Cuadro I — DA 61ª LGSS: Tarifa AT/EP por CNAE-2025 (extracto)
 * Clave: código CNAE (puede ser 2, 3 o 4 dígitos). Resolución: match más específico primero.
 */
const CUADRO_I_CNAE_AT_EP: Record<string, { it: number; ims: number; total: number }> = {
  '01':   { it: 1.50, ims: 1.10, total: 2.60 },
  '0113': { it: 1.00, ims: 1.00, total: 2.00 },
  '0119': { it: 1.00, ims: 1.00, total: 2.00 },
  '0129': { it: 2.25, ims: 2.90, total: 5.15 },
  '0130': { it: 1.15, ims: 1.10, total: 2.25 },
  '014':  { it: 1.80, ims: 1.50, total: 3.30 },
  '0147': { it: 1.25, ims: 1.15, total: 2.40 },
  '015':  { it: 1.60, ims: 1.20, total: 2.80 },
  '016':  { it: 1.60, ims: 1.20, total: 2.80 },
  '0163': { it: 1.50, ims: 1.15, total: 2.65 },
  '017':  { it: 1.80, ims: 1.50, total: 3.30 },
  '02':   { it: 2.25, ims: 2.90, total: 5.15 },
  '03':   { it: 3.05, ims: 3.35, total: 6.40 },
  '0322': { it: 3.05, ims: 3.20, total: 6.25 },
  '0330': { it: 2.25, ims: 2.90, total: 5.15 },
  '05':   { it: 2.30, ims: 2.90, total: 5.20 },
  '06':   { it: 2.30, ims: 2.90, total: 5.20 },
  '07':   { it: 2.30, ims: 2.90, total: 5.20 },
  '08':   { it: 2.30, ims: 2.90, total: 5.20 },
  '0811': { it: 3.45, ims: 3.70, total: 7.15 },
  '09':   { it: 2.30, ims: 2.90, total: 5.20 },
  '10':   { it: 1.60, ims: 1.60, total: 3.20 },
  '101':  { it: 2.00, ims: 1.90, total: 3.90 },
  '102':  { it: 1.80, ims: 1.50, total: 3.30 },
  '106':  { it: 1.70, ims: 1.60, total: 3.30 },
  '107':  { it: 1.05, ims: 0.90, total: 1.95 },
  '108':  { it: 1.05, ims: 0.90, total: 1.95 },
  '11':   { it: 1.60, ims: 1.60, total: 3.20 },
  '12':   { it: 1.00, ims: 0.80, total: 1.80 },
  '13':   { it: 1.00, ims: 0.85, total: 1.85 },
  '1391': { it: 0.80, ims: 0.70, total: 1.50 },
  '14':   { it: 0.80, ims: 0.70, total: 1.50 },
  '1424': { it: 1.50, ims: 1.10, total: 2.60 },
  '15':   { it: 1.50, ims: 1.10, total: 2.60 },
  '16':   { it: 2.25, ims: 2.90, total: 5.15 },
  '1624': { it: 2.10, ims: 2.00, total: 4.10 },
  '1626': { it: 2.10, ims: 2.00, total: 4.10 },
  '1627': { it: 2.20, ims: 2.70, total: 4.90 },
  '1628': { it: 2.10, ims: 2.00, total: 4.10 },
  '17':   { it: 1.00, ims: 1.05, total: 2.05 },
  '171':  { it: 2.00, ims: 1.50, total: 3.50 },
  '18':   { it: 1.00, ims: 1.00, total: 2.00 },
  '19':   { it: 1.45, ims: 1.90, total: 3.35 },
  '20':   { it: 1.60, ims: 1.40, total: 3.00 },
  '204':  { it: 1.50, ims: 1.20, total: 2.70 },
  '206':  { it: 1.50, ims: 1.20, total: 2.70 },
  '21':   { it: 1.30, ims: 1.10, total: 2.40 },
  '22':   { it: 1.75, ims: 1.25, total: 3.00 },
  '23':   { it: 2.10, ims: 2.00, total: 4.10 },
  '231':  { it: 1.60, ims: 1.50, total: 3.10 },
  '232':  { it: 1.60, ims: 1.50, total: 3.10 },
  '2331': { it: 1.60, ims: 1.50, total: 3.10 },
  '234':  { it: 1.60, ims: 1.50, total: 3.10 },
  '237':  { it: 2.75, ims: 3.35, total: 6.10 },
  '24':   { it: 2.00, ims: 1.85, total: 3.85 },
  '25':   { it: 2.00, ims: 1.85, total: 3.85 },
  '26':   { it: 1.50, ims: 1.10, total: 2.60 },
  '27':   { it: 1.60, ims: 1.20, total: 2.80 },
  '279':  { it: 1.65, ims: 1.25, total: 2.90 },
  '28':   { it: 2.00, ims: 1.85, total: 3.85 },
  '29':   { it: 1.60, ims: 1.20, total: 2.80 },
  '30':   { it: 2.00, ims: 1.85, total: 3.85 },
  '3091': { it: 1.60, ims: 1.20, total: 2.80 },
  '3092': { it: 1.60, ims: 1.20, total: 2.80 },
  '31':   { it: 2.00, ims: 1.85, total: 3.85 },
  '32':   { it: 1.60, ims: 1.20, total: 2.80 },
  '321':  { it: 1.00, ims: 0.85, total: 1.85 },
  '322':  { it: 1.00, ims: 0.85, total: 1.85 },
  '33':   { it: 2.00, ims: 1.85, total: 3.85 },
  '3313': { it: 1.50, ims: 1.10, total: 2.60 },
  '3314': { it: 1.60, ims: 1.20, total: 2.80 },
  '35':   { it: 1.80, ims: 1.50, total: 3.30 },
  '36':   { it: 2.10, ims: 1.60, total: 3.70 },
  '37':   { it: 2.10, ims: 1.60, total: 3.70 },
  '38':   { it: 2.10, ims: 1.60, total: 3.70 },
  '39':   { it: 2.10, ims: 1.60, total: 3.70 },
  '41':   { it: 3.35, ims: 3.35, total: 6.70 },
  '42':   { it: 3.35, ims: 3.35, total: 6.70 },
  '43':   { it: 3.35, ims: 3.35, total: 6.70 },
  '436':  { it: 1.00, ims: 1.05, total: 2.05 },
  '46':   { it: 1.40, ims: 1.20, total: 2.60 },
  '4618': { it: 1.00, ims: 1.05, total: 2.05 },
  '4623': { it: 1.80, ims: 1.50, total: 3.30 },
  '4624': { it: 1.80, ims: 1.50, total: 3.30 },
  '4632': { it: 1.70, ims: 1.45, total: 3.15 },
  '4671': { it: 1.00, ims: 1.05, total: 2.05 },
  '4672': { it: 1.00, ims: 1.05, total: 2.05 },
  '4673': { it: 1.70, ims: 1.20, total: 2.90 },
  '4682': { it: 1.80, ims: 1.50, total: 3.30 },
  '4683': { it: 1.80, ims: 1.50, total: 3.30 },
  '4684': { it: 1.80, ims: 1.55, total: 3.35 },
  '4687': { it: 1.80, ims: 1.55, total: 3.35 },
  '4689': { it: 1.45, ims: 1.25, total: 2.70 },
  '4690': { it: 1.80, ims: 1.55, total: 3.35 },
  '47':   { it: 0.95, ims: 0.70, total: 1.65 },
  '473':  { it: 1.00, ims: 0.85, total: 1.85 },
  '4781': { it: 1.00, ims: 1.05, total: 2.05 },
  '4782': { it: 1.00, ims: 1.05, total: 2.05 },
  '4783': { it: 1.70, ims: 1.20, total: 2.90 },
  '49':   { it: 1.80, ims: 1.50, total: 3.30 },
  '494':  { it: 2.00, ims: 1.70, total: 3.70 },
  '50':   { it: 2.00, ims: 1.85, total: 3.85 },
  '51':   { it: 1.90, ims: 1.70, total: 3.60 },
  '52':   { it: 1.80, ims: 1.50, total: 3.30 },
  '5221': { it: 1.00, ims: 1.10, total: 2.10 },
  '5232': { it: 1.00, ims: 0.85, total: 1.85 },
  '53':   { it: 1.00, ims: 0.75, total: 1.75 },
  '55':   { it: 0.80, ims: 0.70, total: 1.50 },
  '56':   { it: 0.80, ims: 0.70, total: 1.50 },
  '58':   { it: 0.65, ims: 1.00, total: 1.65 },
  '59':   { it: 0.80, ims: 0.70, total: 1.50 },
  '60':   { it: 0.80, ims: 0.70, total: 1.50 },
  '6039': { it: 0.80, ims: 0.85, total: 1.65 },
  '61':   { it: 0.80, ims: 0.70, total: 1.50 },
  '62':   { it: 0.80, ims: 0.70, total: 1.50 },
  '63':   { it: 0.65, ims: 1.00, total: 1.65 },
  '64':   { it: 0.80, ims: 0.70, total: 1.50 },
  '65':   { it: 0.80, ims: 0.70, total: 1.50 },
  '66':   { it: 0.80, ims: 0.70, total: 1.50 },
  '68':   { it: 0.65, ims: 1.00, total: 1.65 },
  '69':   { it: 0.80, ims: 0.70, total: 1.50 },
  '70':   { it: 0.80, ims: 0.70, total: 1.50 },
  '71':   { it: 0.65, ims: 1.00, total: 1.65 },
  '72':   { it: 0.80, ims: 0.70, total: 1.50 },
  '73':   { it: 0.90, ims: 0.80, total: 1.70 },
  '7330': { it: 0.80, ims: 0.70, total: 1.50 },
  '74':   { it: 0.90, ims: 0.85, total: 1.75 },
  '742':  { it: 0.80, ims: 0.70, total: 1.50 },
  '77':   { it: 1.00, ims: 1.00, total: 2.00 },
  '78':   { it: 1.55, ims: 1.20, total: 2.75 },
  '781':  { it: 0.95, ims: 1.00, total: 1.95 },
  '79':   { it: 0.80, ims: 0.70, total: 1.50 },
  '80':   { it: 1.40, ims: 2.20, total: 3.60 },
  '81':   { it: 2.10, ims: 1.50, total: 3.60 },
  '811':  { it: 1.00, ims: 0.85, total: 1.85 },
  '82':   { it: 1.00, ims: 1.05, total: 2.05 },
  '8220': { it: 0.80, ims: 0.70, total: 1.50 },
  '8292': { it: 1.80, ims: 1.50, total: 3.30 },
  '84':   { it: 0.65, ims: 1.00, total: 1.65 },
  '842':  { it: 1.40, ims: 2.20, total: 3.60 },
  '85':   { it: 0.80, ims: 0.70, total: 1.50 },
  '86':   { it: 0.80, ims: 0.70, total: 1.50 },
  '869':  { it: 0.95, ims: 0.80, total: 1.75 },
  '87':   { it: 0.80, ims: 0.70, total: 1.50 },
  '88':   { it: 0.80, ims: 0.70, total: 1.50 },
  '90':   { it: 0.80, ims: 0.70, total: 1.50 },
  '91':   { it: 0.80, ims: 0.70, total: 1.50 },
  '914':  { it: 1.75, ims: 1.20, total: 2.95 },
  '92':   { it: 0.80, ims: 0.70, total: 1.50 },
  '93':   { it: 1.70, ims: 1.30, total: 3.00 },
  '94':   { it: 0.65, ims: 1.00, total: 1.65 },
  '95':   { it: 1.50, ims: 1.10, total: 2.60 },
  '9524': { it: 2.00, ims: 1.85, total: 3.85 },
  '9531': { it: 2.45, ims: 2.00, total: 4.45 },
  '9532': { it: 1.70, ims: 1.20, total: 2.90 },
  '9540': { it: 1.00, ims: 1.05, total: 2.05 },
  '96':   { it: 0.85, ims: 0.70, total: 1.55 },
  '9621': { it: 0.80, ims: 0.70, total: 1.50 },
  '9622': { it: 0.80, ims: 0.70, total: 1.50 },
  '9630': { it: 1.80, ims: 1.50, total: 3.30 },
  '9699': { it: 1.50, ims: 1.10, total: 2.60 },
  '97':   { it: 0.80, ims: 0.70, total: 1.50 },
  '99':   { it: 1.20, ims: 1.15, total: 2.35 },
};

/**
 * Resuelve CNAE → tipo AT/EP usando match jerárquico (4 dígitos > 3 > 2)
 */
function resolveCNAERate(cnae: string): { it: number; ims: number; total: number } | null {
  const cleaned = cnae.replace(/\./g, '').trim();
  // Try exact match first (4 digits), then 3, then 2
  if (CUADRO_I_CNAE_AT_EP[cleaned]) return CUADRO_I_CNAE_AT_EP[cleaned];
  if (cleaned.length >= 3 && CUADRO_I_CNAE_AT_EP[cleaned.substring(0, 3)]) return CUADRO_I_CNAE_AT_EP[cleaned.substring(0, 3)];
  if (cleaned.length >= 2 && CUADRO_I_CNAE_AT_EP[cleaned.substring(0, 2)]) return CUADRO_I_CNAE_AT_EP[cleaned.substring(0, 2)];
  return null;
}

/**
 * Resuelve el tipo AT/EP aplicable según:
 * 1. Si hay ocupación SS (Cuadro II) → aplica tipo fijo de esa clave
 * 2. Si NO hay ocupación (sin especificar) → aplica Cuadro I según CNAE de la empresa
 * 3. Si tampoco hay CNAE → aplica tipo por defecto 1.50%
 *
 * DA 61ª LGSS (RDL 16/2025 confirmado RDL 3/2026)
 */
export function resolveATRate(
  ocupacionSS: 'a' | 'b' | 'd' | 'f' | 'g' | 'h' | null | undefined,
  tipoATFromDB: number | null | undefined,
  epigrafAT?: string | null,
): { rate: number; it: number; ims: number; source: string } {
  // 1. Cuadro II: ocupación específica
  if (ocupacionSS && CUADRO_II_AT_EP[ocupacionSS]) {
    const c2 = CUADRO_II_AT_EP[ocupacionSS];
    return { rate: c2.total, it: c2.it, ims: c2.ims, source: `Cuadro II clave "${ocupacionSS}" — ${c2.descripcion} (DA 61ª LGSS)` };
  }

  // 2. Sin especificar → Cuadro I por CNAE
  if (epigrafAT) {
    const cnaeRate = resolveCNAERate(epigrafAT);
    if (cnaeRate) {
      return { rate: cnaeRate.total, it: cnaeRate.it, ims: cnaeRate.ims, source: `Cuadro I CNAE ${epigrafAT} (DA 61ª LGSS)` };
    }
  }

  // 3. Tipo AT/EP de BD (legacy)
  if (tipoATFromDB != null && tipoATFromDB > 0) {
    return { rate: tipoATFromDB, it: tipoATFromDB * 0.53, ims: tipoATFromDB * 0.47, source: `Tipo AT/EP BD (epígrafe ${epigrafAT || 'N/A'})` };
  }

  // 4. Default
  return { rate: DEFAULT_SS_RATES_2026.tipo_at_empresa, it: 0.80, ims: 0.70, source: 'Tipo AT/EP por defecto 1,50% (sin CNAE ni ocupación configurados)' };
}

/** MEI split 2026 — total 0.90%: empresa 0.75%, trabajador 0.15% (RDL 3/2026) */
const MEI_SPLIT_2026 = {
  empresa: 0.75,
  trabajador: 0.15,
};

/**
 * Cotización adicional de solidaridad 2026 (RDL 3/2026)
 * Aplica sobre retribución que exceda la base máxima mensual
 */
export interface SolidarityContribution {
  tramo1Empresa: number;
  tramo1Trabajador: number;
  tramo2Empresa: number;
  tramo2Trabajador: number;
  tramo3Empresa: number;
  tramo3Trabajador: number;
  totalEmpresa: number;
  totalTrabajador: number;
}

export function computeSolidarityContribution(remuneracionMensualTotal: number): SolidarityContribution {
  const BASE_MAX = 5101.20;
  const TRAMO1_TOPE = 5611.32;
  const TRAMO2_TOPE = 7651.80;

  const result: SolidarityContribution = {
    tramo1Empresa: 0, tramo1Trabajador: 0,
    tramo2Empresa: 0, tramo2Trabajador: 0,
    tramo3Empresa: 0, tramo3Trabajador: 0,
    totalEmpresa: 0, totalTrabajador: 0,
  };

  if (remuneracionMensualTotal <= BASE_MAX) return result;

  // Tramo 1: 5.101,21 - 5.611,32 → 0.96% empresa, 0.19% trabajador
  const baseTramo1 = Math.min(remuneracionMensualTotal, TRAMO1_TOPE) - BASE_MAX;
  if (baseTramo1 > 0) {
    result.tramo1Empresa = r2(baseTramo1 * 0.96 / 100);
    result.tramo1Trabajador = r2(baseTramo1 * 0.19 / 100);
  }

  // Tramo 2: 5.611,33 - 7.651,80 → 1.04% empresa, 0.21% trabajador
  if (remuneracionMensualTotal > TRAMO1_TOPE) {
    const baseTramo2 = Math.min(remuneracionMensualTotal, TRAMO2_TOPE) - TRAMO1_TOPE;
    if (baseTramo2 > 0) {
      result.tramo2Empresa = r2(baseTramo2 * 1.04 / 100);
      result.tramo2Trabajador = r2(baseTramo2 * 0.21 / 100);
    }
  }

  // Tramo 3: > 7.651,80 → 1.22% empresa, 0.24% trabajador
  if (remuneracionMensualTotal > TRAMO2_TOPE) {
    const baseTramo3 = remuneracionMensualTotal - TRAMO2_TOPE;
    result.tramo3Empresa = r2(baseTramo3 * 1.22 / 100);
    result.tramo3Trabajador = r2(baseTramo3 * 0.24 / 100);
  }

  result.totalEmpresa = r2(result.tramo1Empresa + result.tramo2Empresa + result.tramo3Empresa);
  result.totalTrabajador = r2(result.tramo1Trabajador + result.tramo2Trabajador + result.tramo3Trabajador);

  return result;
}

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
  const legalRefs: string[] = ['LGSS Art. 147', 'RDL 3/2026 (bases, tipos y solidaridad)', 'Orden PJC/178/2025 (normas cotización)'];

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
    warnings.push(`Sin datos de bases SS en BD — usando topes y tipos por defecto 2026 para grupo ${employee.grupoCotizacion}`);
  }

  // ── Resolve rates ──
  const rates = limits ?? DEFAULT_SS_RATES_2026;
  const defaultTopes = getDefaultTopesForGroup(employee.grupoCotizacion);
  const topes = limits ? {
    base_minima_mensual: limits.base_minima_mensual,
    base_maxima_mensual: limits.base_maxima_mensual,
  } : {
    base_minima_mensual: defaultTopes.base_minima_mensual,
    base_maxima_mensual: defaultTopes.base_maxima_mensual,
  };

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
    ? (rates as any).tipo_desempleo_empresa_td ?? DEFAULT_SS_RATES_2026.tipo_desempleo_empresa_td
    : (rates as any).tipo_desempleo_empresa_gi ?? DEFAULT_SS_RATES_2026.tipo_desempleo_empresa_gi;
  const tipoDesempleoTrab = isTemp
    ? (rates as any).tipo_desempleo_trabajador_td ?? DEFAULT_SS_RATES_2026.tipo_desempleo_trabajador_td
    : (rates as any).tipo_desempleo_trabajador_gi ?? DEFAULT_SS_RATES_2026.tipo_desempleo_trabajador_gi;

  const ccTrabajador = r2((baseCCFinal * ((rates as any).tipo_cc_trabajador ?? DEFAULT_SS_RATES_2026.tipo_cc_trabajador)) / 100);
  const desempleoTrabajador = r2((baseCCFinal * tipoDesempleoTrab) / 100);
  const fpTrabajador = r2((baseCCFinal * ((rates as any).tipo_fp_trabajador ?? DEFAULT_SS_RATES_2026.tipo_fp_trabajador)) / 100);

  // P1B: MEI split — trabajador pays 0.08%, empresa pays 0.50% (total 0.58%)
  const meiTrabajador = r2((baseCCFinal * MEI_SPLIT_2026.trabajador) / 100);
  const totalTrabajador = r2(ccTrabajador + desempleoTrabajador + fpTrabajador + meiTrabajador);

  const ccEmpresa = r2((baseCCFinal * ((rates as any).tipo_cc_empresa ?? DEFAULT_SS_RATES_2026.tipo_cc_empresa)) / 100);
  const desempleoEmpresa = r2((baseCCFinal * tipoDesempleoEmp) / 100);
  const fogasa = r2((baseCCFinal * ((rates as any).tipo_fogasa ?? DEFAULT_SS_RATES_2026.tipo_fogasa)) / 100);
  const fpEmpresa = r2((baseCCFinal * ((rates as any).tipo_fp_empresa ?? DEFAULT_SS_RATES_2026.tipo_fp_empresa)) / 100);
  const meiEmpresa = r2((baseCCFinal * MEI_SPLIT_2026.empresa) / 100);
  const atResolved = resolveATRate(employee.ocupacionSS, (rates as any).tipo_at_empresa, employee.epigrafAT);
  const tipoAT = atResolved.rate;
  const atEmpresa = r2((baseATFinal * tipoAT) / 100);
  const totalEmpresa = r2(ccEmpresa + desempleoEmpresa + fogasa + fpEmpresa + meiEmpresa + atEmpresa);

  traces.push({
    step: 'Tipo AT/EP aplicado',
    formula: `${atResolved.source} → ${tipoAT}% sobre base AT ${baseATFinal}€ = ${atEmpresa}€`,
    result: tipoAT,
  });

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

  // ── 8. Cotización adicional de solidaridad (RDL 3/2026) ──
  const remuneracionTotal = remuneracionMensual + prorrateoMensual + horasExtra;
  const solidaridad = computeSolidarityContribution(remuneracionTotal);
  const hasSolidaridad = solidaridad.totalEmpresa > 0 || solidaridad.totalTrabajador > 0;

  if (hasSolidaridad) {
    traces.push({
      step: 'Cotización solidaridad (RDL 3/2026)',
      formula: `Remuneración total ${r2(remuneracionTotal)}€ > base máx 5.101,20€ → Empresa: ${solidaridad.totalEmpresa}€, Trabajador: ${solidaridad.totalTrabajador}€`,
      result: r2(solidaridad.totalEmpresa + solidaridad.totalTrabajador),
    });
  }

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
    totalTrabajador: r2(totalTrabajador + solidaridad.totalTrabajador),
    ccEmpresa,
    desempleoEmpresa,
    fogasa,
    fpEmpresa,
    meiEmpresa,
    atEmpresa,
    totalEmpresa: r2(totalEmpresa + solidaridad.totalEmpresa),
    solidaridad: hasSolidaridad ? solidaridad : null,
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
