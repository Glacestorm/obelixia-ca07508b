/**
 * contractTypeEngine.ts — Motor de resolución de Tipos de Contrato RD
 *
 * Mapea códigos de contrato RD (SEPE/Contrat@) a sus implicaciones legales
 * en el cálculo de nómina: SS (desempleo), IRPF (tipo mínimo), indemnización,
 * periodo de prueba y duración máxima.
 *
 * Legislación de referencia:
 *  - ET Art. 15 (tipos de contratos tras RDL 32/2021)
 *  - ET Art. 49.1.c (indemnización fin contrato temporal: 12 d/año)
 *  - ET Art. 53 (despido objetivo: 20 d/año)
 *  - ET Art. 56 (despido improcedente: 33 d/año post-2012)
 *  - ET Art. 14 (periodo de prueba)
 *  - RDL 32/2021 (reforma laboral — reestructuración contratos)
 *  - RIRPF Art. 86.2 (tipo mínimo 2% contrato < 1 año)
 *  - LGSS DA 7ª (tipo desempleo temporal vs indefinido)
 *
 * NOTA: Clasificación operativa — no constituye asesoramiento jurídico.
 */

// ── Types ──

export type ContractCategory = 'indefinido' | 'temporal' | 'formacion' | 'practicas' | 'fijo_discontinuo';

export interface ContractTypeLegalProfile {
  /** Código RD (SEPE/Contrat@) */
  code: string;
  /** Descripción oficial */
  name: string;
  /** Categoría principal */
  category: ContractCategory;

  // ── SS implications ──
  /** Si true → tipo desempleo temporal (6,70% emp / 1,60% trab) */
  isTemporaryForSS: boolean;

  // ── IRPF implications ──
  /** Si true → tipo mínimo IRPF 2% (RIRPF Art. 86.2) */
  contratoInferiorAnual: boolean;
  /** Duración máxima en meses (null = sin límite) */
  duracionMaximaMeses: number | null;

  // ── Indemnización ──
  /** Días de indemnización por año trabajado al fin de contrato */
  indemnizacionFinContratoDiasAnyo: number;
  /** Días por despido objetivo (ET Art. 53) */
  indemnizacionObjetivoDiasAnyo: number;
  /** Días por despido improcedente (ET Art. 56) */
  indemnizacionImprocedenteDiasAnyo: number;

  // ── Periodo de prueba ──
  /** Periodo de prueba máximo en meses (ET Art. 14) */
  periodoPruebaMaxMeses: number;

  // ── Jornada ──
  /** Jornada por defecto */
  jornadaDefault: 'completa' | 'parcial' | 'variable';

  /** Normativa de referencia */
  normativaReferencia: string;
}

// ── Contract Type Registry ──

/**
 * Catálogo completo de tipos de contrato RD con implicaciones legales.
 * Actualizado según RDL 32/2021 (reforma laboral) y normativa vigente 2026.
 */
export const CONTRACT_TYPE_REGISTRY: Record<string, ContractTypeLegalProfile> = {
  // ═══════════════════════════════════════════
  // INDEFINIDOS
  // ═══════════════════════════════════════════
  '100': {
    code: '100',
    name: 'Indefinido ordinario a tiempo completo',
    category: 'indefinido',
    isTemporaryForSS: false,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 0,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 6, // ET Art. 14: 6 meses titulados, 2 meses resto (usamos max)
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.1; RDL 32/2021 Art. 1',
  },
  '130': {
    code: '130',
    name: 'Indefinido ordinario a tiempo parcial',
    category: 'indefinido',
    isTemporaryForSS: false,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 0,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 6,
    jornadaDefault: 'parcial',
    normativaReferencia: 'ET Art. 12, 15.1',
  },
  '150': {
    code: '150',
    name: 'Indefinido de persona con discapacidad',
    category: 'indefinido',
    isTemporaryForSS: false,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 0,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 6,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.1; Ley 13/1982 Art. 38; RDL 32/2021',
  },
  '189': {
    code: '189',
    name: 'Indefinido fijo-discontinuo',
    category: 'fijo_discontinuo',
    isTemporaryForSS: false,
    contratoInferiorAnual: false, // Es indefinido aunque con actividad intermitente
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 0,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 6,
    jornadaDefault: 'variable',
    normativaReferencia: 'ET Art. 16 (nueva redacción RDL 32/2021)',
  },
  '200': {
    code: '200',
    name: 'Indefinido de servicio doméstico',
    category: 'indefinido',
    isTemporaryForSS: false,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 0,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 2,
    jornadaDefault: 'completa',
    normativaReferencia: 'RD 1620/2011; ET Art. 15.1',
  },

  // ═══════════════════════════════════════════
  // TEMPORALES — Circunstancias de producción
  // ═══════════════════════════════════════════
  '401': {
    code: '401',
    name: 'Temporal por circunstancias de la producción (obra o servicio — pre-reforma)',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: true,
    duracionMaximaMeses: 6, // ET Art. 15.2 RDL 32/2021: max 6 meses (ampliable a 12 por convenio)
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.2 (RDL 32/2021); ET Art. 49.1.c (indemn.)',
  },
  '402': {
    code: '402',
    name: 'Temporal eventual por circunstancias de la producción',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: true,
    duracionMaximaMeses: 6,
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.2 (RDL 32/2021); ET Art. 49.1.c',
  },
  '410': {
    code: '410',
    name: 'Temporal por sustitución (interinidad)',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: false, // Duración indeterminada (hasta reincorporación)
    duracionMaximaMeses: null, // Sin límite — dura lo que dure la sustitución
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.3 (RDL 32/2021)',
  },
  '501': {
    code: '501',
    name: 'Temporal de duración determinada a tiempo completo',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: true,
    duracionMaximaMeses: 6,
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.2 (RDL 32/2021); ET Art. 49.1.c',
  },
  '502': {
    code: '502',
    name: 'Temporal por sustitución a tiempo parcial',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'parcial',
    normativaReferencia: 'ET Art. 15.3 (RDL 32/2021); ET Art. 12',
  },
  '503': {
    code: '503',
    name: 'Temporal por circunstancias de la producción — situación imprevisible',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: true,
    duracionMaximaMeses: 6,
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.2.a (RDL 32/2021)',
  },
  '504': {
    code: '504',
    name: 'Temporal por circunstancias de la producción — situación ocasional previsible (max 90 días/año)',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: true,
    duracionMaximaMeses: 3, // Max 90 días naturales en año natural
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1,
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 15.2.b (RDL 32/2021)',
  },

  // ═══════════════════════════════════════════
  // FORMACIÓN Y PRÁCTICAS (RDL 32/2021 Art. 11)
  // ═══════════════════════════════════════════
  '420': {
    code: '420',
    name: 'Contrato formativo para obtención de práctica profesional',
    category: 'practicas',
    isTemporaryForSS: true,
    contratoInferiorAnual: true,
    duracionMaximaMeses: 12, // ET Art. 11.3: 6 a 12 meses (ampliable por convenio)
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 1, // ET Art. 11.3.d: max 1 mes
    jornadaDefault: 'completa',
    normativaReferencia: 'ET Art. 11.3 (RDL 32/2021)',
  },
  '421': {
    code: '421',
    name: 'Contrato formativo en alternancia (formación dual)',
    category: 'formacion',
    isTemporaryForSS: true,
    contratoInferiorAnual: false,
    duracionMaximaMeses: 24, // ET Art. 11.2: min 3 meses, max 2 años
    indemnizacionFinContratoDiasAnyo: 0, // Sin indemnización al fin
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 0, // ET Art. 11.2.k: No periodo de prueba
    jornadaDefault: 'parcial', // Max 65% primer año, 85% segundo año
    normativaReferencia: 'ET Art. 11.2 (RDL 32/2021)',
  },

  // ═══════════════════════════════════════════
  // OTROS ESPECÍFICOS
  // ═══════════════════════════════════════════
  '300': {
    code: '300',
    name: 'Contrato de relevo',
    category: 'temporal',
    isTemporaryForSS: true,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null, // Hasta jubilación total del sustituido
    indemnizacionFinContratoDiasAnyo: 12,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 2,
    jornadaDefault: 'parcial',
    normativaReferencia: 'ET Art. 12.7; LGSS Art. 215',
  },
};

// ── Resolution Functions ──

/**
 * Resuelve el perfil legal completo de un tipo de contrato por su código RD.
 * Si el código no está en el catálogo, devuelve un perfil por defecto conservador.
 */
export function resolveContractType(code: string | null | undefined): ContractTypeLegalProfile {
  if (!code) return getDefaultContractProfile();
  const profile = CONTRACT_TYPE_REGISTRY[code.trim()];
  if (profile) return profile;

  // Fallback heurístico por prefijo
  const prefix = code.trim().charAt(0);
  if (prefix === '1' || prefix === '2') {
    // Códigos 1xx, 2xx → generalmente indefinidos
    return {
      ...getDefaultContractProfile(),
      code,
      name: `Indefinido (código ${code})`,
      category: 'indefinido',
      isTemporaryForSS: false,
      contratoInferiorAnual: false,
      normativaReferencia: 'Código no catalogado — tratado como indefinido por prefijo',
    };
  }
  if (prefix === '4' || prefix === '5') {
    // Códigos 4xx, 5xx → generalmente temporales
    return {
      ...getDefaultContractProfile(),
      code,
      name: `Temporal (código ${code})`,
      category: 'temporal',
      isTemporaryForSS: true,
      contratoInferiorAnual: true,
      indemnizacionFinContratoDiasAnyo: 12,
      normativaReferencia: 'Código no catalogado — tratado como temporal por prefijo',
    };
  }

  return { ...getDefaultContractProfile(), code, name: `Contrato código ${code}` };
}

function getDefaultContractProfile(): ContractTypeLegalProfile {
  return {
    code: '000',
    name: 'Sin tipo de contrato especificado',
    category: 'indefinido',
    isTemporaryForSS: false,
    contratoInferiorAnual: false,
    duracionMaximaMeses: null,
    indemnizacionFinContratoDiasAnyo: 0,
    indemnizacionObjetivoDiasAnyo: 20,
    indemnizacionImprocedenteDiasAnyo: 33,
    periodoPruebaMaxMeses: 6,
    jornadaDefault: 'completa',
    normativaReferencia: 'Sin especificar — se aplican condiciones por defecto (indefinido)',
  };
}

/**
 * Determina si un contrato debe cotizar con tipo de desempleo temporal.
 * LGSS DA 7ª: contratos temporales → tipo desempleo superior.
 */
export function isTemporaryForSS(contractCode: string | null | undefined): boolean {
  return resolveContractType(contractCode).isTemporaryForSS;
}

/**
 * Determina si un contrato aplica tipo mínimo IRPF 2%.
 * RIRPF Art. 86.2: contratos de duración determinada inferior a un año → mínimo 2%.
 * 
 * Lógica:
 * - Contratos temporales con duración máxima ≤ 12 meses → true
 * - Sustitución (410, 502): duración indeterminada → false
 * - Indefinidos y fijo-discontinuos → false
 * - Formación en alternancia (421): min 3 meses, max 24 → depende de duración real
 */
export function isContratoInferiorAnual(
  contractCode: string | null | undefined,
  durationMonths?: number | null,
): boolean {
  const profile = resolveContractType(contractCode);

  // Si el perfil lo marca directamente
  if (profile.contratoInferiorAnual) return true;

  // Si hay duración real conocida y es < 12 meses
  if (durationMonths != null && durationMonths > 0 && durationMonths < 12) {
    return true;
  }

  return false;
}

/**
 * Calcula la indemnización por fin de contrato temporal.
 * ET Art. 49.1.c: 12 días de salario por año de servicio.
 * 
 * @param contractCode Código RD del contrato
 * @param salarioDiario Salario diario del trabajador
 * @param diasTrabajados Días trabajados en el contrato
 * @returns Importe de indemnización en euros
 */
export function computeIndemnizacionFinContrato(
  contractCode: string | null | undefined,
  salarioDiario: number,
  diasTrabajados: number,
): { importe: number; diasAnyo: number; formula: string; normativa: string } {
  const profile = resolveContractType(contractCode);
  const diasAnyo = profile.indemnizacionFinContratoDiasAnyo;

  if (diasAnyo === 0) {
    return {
      importe: 0,
      diasAnyo: 0,
      formula: 'Sin indemnización por fin de contrato (contrato indefinido o formación en alternancia)',
      normativa: profile.normativaReferencia,
    };
  }

  // Fórmula: (salarioDiario × diasAnyo × diasTrabajados) / 365
  const importe = Math.round((salarioDiario * diasAnyo * diasTrabajados / 365) * 100) / 100;

  return {
    importe,
    diasAnyo,
    formula: `${salarioDiario}€/día × ${diasAnyo} d/año × ${diasTrabajados} días / 365 = ${importe}€`,
    normativa: `ET Art. 49.1.c — ${profile.normativaReferencia}`,
  };
}

/**
 * Devuelve el resumen de impacto legal del tipo de contrato para trazabilidad en nómina.
 */
export function getContractLegalSummary(contractCode: string | null | undefined): {
  tipoDesempleo: 'general_indefinido' | 'temporal_duración_determinada';
  tipoDesempleoLabel: string;
  irpfMinimo2Pct: boolean;
  indemnizacionFinDiasAnyo: number;
  warnings: string[];
  legalReferences: string[];
} {
  const profile = resolveContractType(contractCode);
  const warnings: string[] = [];
  const legalRefs: string[] = [profile.normativaReferencia];

  if (profile.isTemporaryForSS) {
    legalRefs.push('LGSS DA 7ª (tipo desempleo contrato temporal: 6,70% emp / 1,60% trab)');
  }

  if (profile.contratoInferiorAnual) {
    legalRefs.push('RIRPF Art. 86.2 (tipo mínimo IRPF 2% contrato < 1 año)');
  }

  if (profile.duracionMaximaMeses != null) {
    warnings.push(`Duración máxima legal: ${profile.duracionMaximaMeses} meses (${profile.normativaReferencia})`);
  }

  if (profile.indemnizacionFinContratoDiasAnyo > 0) {
    legalRefs.push(`ET Art. 49.1.c (indemnización fin contrato: ${profile.indemnizacionFinContratoDiasAnyo} d/año)`);
  }

  return {
    tipoDesempleo: profile.isTemporaryForSS ? 'temporal_duración_determinada' : 'general_indefinido',
    tipoDesempleoLabel: profile.isTemporaryForSS
      ? 'Temporal — Desempleo 8,30% (6,70% emp + 1,60% trab)'
      : 'General indefinido — Desempleo 7,05% (5,50% emp + 1,55% trab)',
    irpfMinimo2Pct: profile.contratoInferiorAnual,
    indemnizacionFinDiasAnyo: profile.indemnizacionFinContratoDiasAnyo,
    warnings,
    legalReferences: legalRefs,
  };
}
