/**
 * Motor de Cálculo de Retenciones IRPF — España
 * 
 * Implementación fiel de:
 * - Ley 35/2006, de 28 de noviembre, del IRPF (LIRPF)
 * - RD 439/2007, de 30 de marzo, Reglamento del IRPF (RIRPF)
 * - Art. 80-89 RIRPF: Procedimiento para determinar el tipo de retención
 * 
 * Escala vigente 2024-2026 (Art. 63 LIRPF + Art. 101 LIRPF)
 */

import type { Modelo145Data, Descendant, Ascendant } from '@/components/erp/hr/shared/HRModelo145Section';

// ============================================================
// ESCALAS DE RETENCIÓN (Art. 101 LIRPF + Art. 63 + autonómicas)
// Escala estatal + autonómica combinada para retenciones
// ============================================================

interface TaxBracket {
  upTo: number;       // base liquidable hasta
  cumTax: number;     // cuota acumulada
  rate: number;        // tipo marginal (%) sobre el resto
}

// Escala general de retenciones 2024-2026 (estatal + autonómica combinada)
// Art. 101 LIRPF + tabla retenciones
const RETENTION_SCALE: TaxBracket[] = [
  { upTo: 0,        cumTax: 0,          rate: 19 },
  { upTo: 12_450,   cumTax: 2_365.50,   rate: 24 },
  { upTo: 20_200,   cumTax: 4_225.50,   rate: 30 },
  { upTo: 35_200,   cumTax: 8_725.50,   rate: 37 },
  { upTo: 60_000,   cumTax: 17_901.50,  rate: 45 },
  { upTo: 300_000,  cumTax: 125_901.50, rate: 47 },
];

// ============================================================
// MÍNIMOS PERSONALES Y FAMILIARES (Art. 57-61 LIRPF)
// ============================================================

const MIN_CONTRIBUYENTE = 5_550;
const MIN_CONTRIBUYENTE_65 = 1_150;    // incremento > 65 años
const MIN_CONTRIBUYENTE_75 = 1_400;    // incremento adicional > 75 años

// Mínimo por descendientes (Art. 58 LIRPF)
const MIN_DESCENDIENTES = [2_400, 2_700, 4_000, 4_500]; // 1º, 2º, 3º, 4º+
const MIN_DESCENDIENTE_MENOR_3 = 2_800;

// Mínimo por ascendientes (Art. 59 LIRPF)
const MIN_ASCENDIENTE_65 = 1_150;
const MIN_ASCENDIENTE_75 = 1_400; // adicional

// Discapacidad (Art. 60 LIRPF)
const DISCAPACIDAD_33_65 = 3_000;
const DISCAPACIDAD_65_PLUS = 9_000;
const DISCAPACIDAD_AYUDA = 3_000; // asistencia o movilidad reducida

// Reducción por obtención de rendimientos del trabajo (Art. 19.2 LIRPF)
// Tabla vigente 2024+
function reduccionRendimientosTrabajo(rendimientoNeto: number): number {
  if (rendimientoNeto <= 14_047.50) return 6_498;
  if (rendimientoNeto <= 19_747.50) {
    return 6_498 - 1.14 * (rendimientoNeto - 14_047.50);
  }
  return 0; // > 19.747,50€ no hay reducción
}

// Gastos deducibles fijos (Art. 19.2.a-f LIRPF)
const GASTOS_DEDUCIBLES_FIJOS = 2_000;
const GASTOS_MOVILIDAD_GEOGRAFICA = 2_000; // adicional

// ============================================================
// FUNCIÓN DE ESCALA: Calcula cuota sobre una base
// ============================================================

function applyScale(base: number): number {
  if (base <= 0) return 0;

  let tax = 0;
  let remaining = base;
  let prevUpTo = 0;

  for (const bracket of RETENTION_SCALE) {
    const bracketSize = bracket.upTo - prevUpTo;
    if (remaining <= 0) break;

    if (bracket.upTo === 0) {
      prevUpTo = 0;
      continue;
    }

    const taxableInBracket = Math.min(remaining, bracketSize);
    tax += taxableInBracket * (bracket.rate / 100);
    remaining -= taxableInBracket;
    prevUpTo = bracket.upTo;
  }

  // Si queda base por encima del último tramo
  if (remaining > 0) {
    const lastRate = RETENTION_SCALE[RETENTION_SCALE.length - 1].rate;
    tax += remaining * (lastRate / 100);
  }

  return tax;
}

// ============================================================
// INTERFAZ DE ENTRADA
// ============================================================

export interface IRPFCalculationInput {
  // Retribución
  grossAnnualSalary: number;           // Salario bruto anual
  socialSecurityEmployee: number;       // Cuota SS obrera anual (si se conoce, sino se estima)
  numPayments: number;                  // Nº pagas (12 o 14 normalmente)

  // Datos Modelo 145
  modelo145: Modelo145Data;

  // Datos adicionales
  birthYear?: number;                   // Año nacimiento del perceptor (para mínimo >65, >75)
  currentYear?: number;                 // Año fiscal
}

export interface IRPFCalculationResult {
  retentionRate: number;                // Tipo de retención (%)
  annualRetention: number;              // Cuota anual de retención
  taxableBase: number;                  // Base para calcular tipo
  personalFamilyMinimum: number;        // Mínimo personal y familiar
  taxOnBase: number;                    // Cuota sobre base
  taxOnMinimum: number;                 // Cuota sobre mínimo
  netRetentionQuota: number;            // Cuota neta de retención
  breakdown: {
    grossSalary: number;
    ssDeduction: number;
    workIncomeReduction: number;
    geographicMobility: number;
    compensatoryPension: number;
    childSupport: number;
    netBase: number;
    minContribuyente: number;
    minDescendientes: number;
    minAscendientes: number;
    minDiscapacidad: number;
    housingDeduction: number;
  };
}

// ============================================================
// MOTOR DE CÁLCULO PRINCIPAL
// ============================================================

export function calculateIRPFRetention(input: IRPFCalculationInput): IRPFCalculationResult {
  const currentYear = input.currentYear || new Date().getFullYear();
  const m145 = input.modelo145;

  // ---- 1. BASE DE RETENCIÓN (Art. 83 RIRPF) ----

  // Cuota SS obrera: si no se proporciona, estimar ~6.35% del bruto
  const ssDeduction = input.socialSecurityEmployee > 0
    ? input.socialSecurityEmployee
    : input.grossAnnualSalary * 0.0635;

  // Gastos deducibles
  let gastosDeducibles = GASTOS_DEDUCIBLES_FIJOS;
  if (m145.geographic_mobility) {
    gastosDeducibles += GASTOS_MOVILIDAD_GEOGRAFICA;
  }

  // Rendimiento neto previo (para calcular reducción)
  const rendimientoNeto = input.grossAnnualSalary - ssDeduction - gastosDeducibles;

  // Reducción por obtención de rendimientos del trabajo
  const workReduction = reduccionRendimientosTrabajo(Math.max(0, rendimientoNeto));

  // Pensión compensatoria y anualidades
  const compensatoryPension = parseFloat(m145.compensatory_pension) || 0;
  const childSupport = parseFloat(m145.child_support) || 0;

  // Base de retención
  const taxableBase = Math.max(0,
    input.grossAnnualSalary
    - ssDeduction
    - gastosDeducibles
    - workReduction
    - compensatoryPension
  );
  // Nota: anualidades por alimentos se tratan separadamente (Art. 82.3.b RIRPF)

  // ---- 2. MÍNIMO PERSONAL Y FAMILIAR (Art. 83.2 RIRPF) ----

  // Mínimo del contribuyente
  let minContribuyente = MIN_CONTRIBUYENTE;
  if (input.birthYear) {
    const age = currentYear - input.birthYear;
    if (age >= 65) minContribuyente += MIN_CONTRIBUYENTE_65;
    if (age >= 75) minContribuyente += MIN_CONTRIBUYENTE_75;
  }

  // Mínimo por cónyuge (situación 2)
  if (m145.family_situation === '2') {
    minContribuyente += 3_400; // Mínimo por cónyuge (Art. 84 RIRPF)
  }

  // Mínimo por descendientes
  let minDescendientes = 0;
  if (m145.descendants && m145.descendants.length > 0) {
    m145.descendants.forEach((desc: Descendant, index: number) => {
      const minIndex = Math.min(index, MIN_DESCENDIENTES.length - 1);
      let minDesc = MIN_DESCENDIENTES[minIndex];

      // Menor de 3 años
      const birthYear = parseInt(desc.birth_year);
      if (birthYear && (currentYear - birthYear) < 3) {
        minDesc += MIN_DESCENDIENTE_MENOR_3;
      }

      // Cómputo por entero o al 50%
      if (!desc.sole_custody) {
        minDesc = minDesc / 2;
      }

      // Discapacidad del descendiente
      if (desc.disability_65_plus) {
        minDesc += DISCAPACIDAD_65_PLUS;
        if (desc.needs_help) minDesc += DISCAPACIDAD_AYUDA;
      } else if (desc.disability_33_65) {
        minDesc += DISCAPACIDAD_33_65;
        if (desc.needs_help) minDesc += DISCAPACIDAD_AYUDA;
      }

      minDescendientes += minDesc;
    });
  }

  // Mínimo por ascendientes
  let minAscendientes = 0;
  if (m145.ascendants && m145.ascendants.length > 0) {
    m145.ascendants.forEach((asc: Ascendant) => {
      const birthYear = parseInt(asc.birth_year);
      if (!birthYear) return;

      const age = currentYear - birthYear;
      let minAsc = 0;

      if (age >= 65) {
        minAsc = MIN_ASCENDIENTE_65;
        if (age >= 75) minAsc += MIN_ASCENDIENTE_75;
      }

      // Prorrateo si convive con otros descendientes
      const othersCount = parseInt(asc.other_descendants_count) || 0;
      if (othersCount > 1) {
        minAsc = minAsc / othersCount;
      }

      // Discapacidad del ascendiente
      if (asc.disability_65_plus) {
        minAsc += DISCAPACIDAD_65_PLUS;
        if (asc.needs_help) minAsc += DISCAPACIDAD_AYUDA;
      } else if (asc.disability_33_65) {
        minAsc += DISCAPACIDAD_33_65;
        if (asc.needs_help) minAsc += DISCAPACIDAD_AYUDA;
      }

      minAscendientes += minAsc;
    });
  }

  // Discapacidad del perceptor
  let minDiscapacidad = 0;
  if (m145.disability_degree === '65_plus') {
    minDiscapacidad = DISCAPACIDAD_65_PLUS;
    if (m145.disability_needs_help) minDiscapacidad += DISCAPACIDAD_AYUDA;
  } else if (m145.disability_degree === '33_65') {
    minDiscapacidad = DISCAPACIDAD_33_65;
    if (m145.disability_needs_help) minDiscapacidad += DISCAPACIDAD_AYUDA;
  }

  const personalFamilyMinimum = minContribuyente + minDescendientes + minAscendientes + minDiscapacidad;

  // ---- 3. CUOTA DE RETENCIÓN (Art. 85 RIRPF) ----

  // Cuota1 = Escala(Base retención)
  const taxOnBase = applyScale(taxableBase);

  // Cuota2 = Escala(Mínimo personal y familiar)
  const taxOnMinimum = applyScale(Math.min(personalFamilyMinimum, taxableBase));

  // Cuota neta
  let netRetentionQuota = Math.max(0, taxOnBase - taxOnMinimum);

  // Tratamiento separado de anualidades por alimentos (Art. 82.3.b RIRPF)
  // Se aplica la escala de forma separada a las anualidades
  if (childSupport > 0) {
    // La cuota sobre anualidades se calcula con la escala pero se resta de la base
    const taxOnChildSupport = applyScale(childSupport);
    const taxOnBaseWithoutCS = applyScale(Math.max(0, taxableBase - childSupport));
    const csReduction = taxOnBase - taxOnBaseWithoutCS;
    netRetentionQuota = Math.max(0, netRetentionQuota - csReduction);
  }

  // ---- 4. TIPO DE RETENCIÓN ----

  let retentionRate = 0;
  if (input.grossAnnualSalary > 0) {
    retentionRate = (netRetentionQuota / input.grossAnnualSalary) * 100;
  }

  // Deducción vivienda habitual: -2 puntos (DT 18ª LIRPF)
  let housingDeduction = 0;
  if (m145.housing_deduction && input.grossAnnualSalary < 33_007.20) {
    housingDeduction = 2;
    retentionRate = Math.max(0, retentionRate - 2);
  }

  // Tipo mínimo legal (Art. 86.2 RIRPF)
  // General: 2% contratos temporales/prácticas/formación, duración < 1 año
  // El tipo no puede ser negativo
  retentionRate = Math.max(0, retentionRate);

  // Redondeo a 2 decimales
  retentionRate = Math.round(retentionRate * 100) / 100;

  const annualRetention = Math.round(input.grossAnnualSalary * retentionRate / 100 * 100) / 100;

  return {
    retentionRate,
    annualRetention,
    taxableBase,
    personalFamilyMinimum,
    taxOnBase,
    taxOnMinimum,
    netRetentionQuota,
    breakdown: {
      grossSalary: input.grossAnnualSalary,
      ssDeduction: Math.round(ssDeduction * 100) / 100,
      workIncomeReduction: Math.round(workReduction * 100) / 100,
      geographicMobility: m145.geographic_mobility ? GASTOS_MOVILIDAD_GEOGRAFICA : 0,
      compensatoryPension,
      childSupport,
      netBase: taxableBase,
      minContribuyente,
      minDescendientes,
      minAscendientes,
      minDiscapacidad,
      housingDeduction,
    },
  };
}
