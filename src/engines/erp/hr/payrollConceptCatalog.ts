/**
 * payrollConceptCatalog — V2-ES.7 Paso 1
 * Tipos, helpers y utilidades para el catálogo de conceptos retributivos/deductivos
 * Modelo enriquecido con clasificación fiscal, cotización y cálculo
 */

// ── Tipos ──

export type ConceptCategory = 'earning' | 'deduction' | 'employer_cost' | 'informative';
export type ConceptSubtype =
  | 'fixed' | 'variable' | 'overtime' | 'bonus' | 'commission'
  | 'allowance' | 'flexible_remuneration' | 'advance' | 'regularization'
  | 'withholding' | 'social_contribution' | 'informative' | 'other';
export type CalculationType = 'fixed' | 'percentage' | 'formula' | 'units' | 'days';
export type ConceptSign = 'positive' | 'negative';

export interface PayrollConceptEnriched {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  concept_type: string; // legacy alias for category
  category: string | null;
  subcategory: string | null;
  country_code: string | null;

  // Clasificación funcional
  is_salary: boolean;
  is_taxable: boolean;
  is_ss_contributable: boolean;
  impacts_cra: boolean;
  impacts_irpf: boolean;
  impacts_net_payment: boolean;

  // Cálculo
  calculation_type: CalculationType;
  default_sign: ConceptSign;
  is_percentage: boolean;
  is_prorrateado: boolean;
  default_amount: number | null;
  percentage_value: number | null;
  percentage_base: string | null;

  // Flags legacy compatibles
  tributa_irpf: boolean;
  cotiza_ss: boolean;

  // Metadata
  legal_reference: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Catálogo ES de referencia ──

export interface ESConceptDefinition {
  code: string;
  name: string;
  concept_type: ConceptCategory;
  subcategory: ConceptSubtype;
  is_salary: boolean;
  is_taxable: boolean;
  is_ss_contributable: boolean;
  impacts_cra: boolean;
  impacts_irpf: boolean;
  impacts_net_payment: boolean;
  calculation_type: CalculationType;
  default_sign: ConceptSign;
  is_percentage: boolean;
  is_prorrateado: boolean;
  default_percentage?: number;
  percentage_base?: string;
  sort_order: number;
  legal_reference?: string;
}

/**
 * Catálogo base de conceptos de nómina España
 * Referencia: ET, LGSS, LIRPF, RIRPF vigentes
 * NOTA: Clasificación operativa interna — no constituye asesoramiento jurídico-fiscal
 */
export const ES_CONCEPT_DEFINITIONS: ESConceptDefinition[] = [
  // ─── Devengos fijos ───
  { code: 'ES_SAL_BASE', name: 'Salario base', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 10, legal_reference: 'ET Art. 26' },
  { code: 'ES_MEJORA_VOLUNTARIA', name: 'Mejora voluntaria', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 15, legal_reference: 'ET Art. 26.5 — Absorbible y compensable' },
  { code: 'ES_COMP_CONVENIO', name: 'Plus convenio', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 20 },
  { code: 'ES_COMP_ANTIGUEDAD', name: 'Complemento antigüedad', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 21 },
  { code: 'ES_COMP_PUESTO', name: 'Complemento de puesto', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 22 },

  // ─── Devengos variables ───
  { code: 'ES_COMP_NOCTURNIDAD', name: 'Plus nocturnidad', concept_type: 'earning', subcategory: 'variable', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'units', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 23 },
  { code: 'ES_COMP_TURNICIDAD', name: 'Plus turnicidad', concept_type: 'earning', subcategory: 'variable', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'units', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 24 },
  { code: 'ES_COMP_TOXICIDAD', name: 'Plus peligrosidad/toxicidad', concept_type: 'earning', subcategory: 'variable', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 25 },

  // ─── Horas extra ───
  { code: 'ES_HORAS_EXTRA', name: 'Horas extraordinarias', concept_type: 'earning', subcategory: 'overtime', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'units', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 30, legal_reference: 'ET Art. 35' },
  { code: 'ES_HORAS_EXTRA_FEST', name: 'Horas extra festivas', concept_type: 'earning', subcategory: 'overtime', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'units', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 31 },
  { code: 'ES_HORAS_EXTRA_NOCT', name: 'Horas extra nocturnas', concept_type: 'earning', subcategory: 'overtime', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'units', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 32 },

  // ─── Bonus y comisiones ───
  { code: 'ES_BONUS', name: 'Bonus / Gratificación', concept_type: 'earning', subcategory: 'bonus', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 40 },
  { code: 'ES_COMISION', name: 'Comisiones', concept_type: 'earning', subcategory: 'commission', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 41 },

  // ─── Percepciones extrasalariales ───
  { code: 'ES_DIETAS', name: 'Dietas y gastos viaje', concept_type: 'earning', subcategory: 'allowance', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 50, legal_reference: 'RIRPF Art. 9' },
  { code: 'ES_PLUS_TRANSPORTE', name: 'Plus transporte', concept_type: 'earning', subcategory: 'allowance', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 51 },

  // ─── Pagas extra ───
  { code: 'ES_PAGA_EXTRA', name: 'Paga extraordinaria', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: true, sort_order: 60, legal_reference: 'ET Art. 31' },
  { code: 'ES_VACACIONES', name: 'Vacaciones retribuidas', concept_type: 'earning', subcategory: 'fixed', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'days', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 61 },

  // ─── Retribución flexible ───
  { code: 'ES_RETRIB_FLEX_SEGURO', name: 'Seguro médico empresa', concept_type: 'earning', subcategory: 'flexible_remuneration', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 70, legal_reference: 'LIRPF Art. 42.3.c' },
  // S9.18: Exceso seguro médico sobre límite exento — taxable sí, contributable SS pendiente de decisión operativa por empresa
  { code: 'ES_RETRIB_FLEX_SEGURO_EXCESO', name: 'Seguro médico (exceso gravado)', concept_type: 'earning', subcategory: 'flexible_remuneration', is_salary: false, is_taxable: true, is_ss_contributable: false, impacts_cra: false, impacts_irpf: true, impacts_net_payment: false, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 70, legal_reference: 'LIRPF Art. 42.3.c — exceso sobre 500€/1.500€ por asegurado' },
  { code: 'ES_RETRIB_FLEX_GUARDERIA', name: 'Cheque guardería', concept_type: 'earning', subcategory: 'flexible_remuneration', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 71 },
  { code: 'ES_RETRIB_FLEX_FORMACION', name: 'Formación', concept_type: 'earning', subcategory: 'flexible_remuneration', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 72 },
  { code: 'ES_RETRIB_FLEX_RESTAURANTE', name: 'Ticket restaurante', concept_type: 'earning', subcategory: 'flexible_remuneration', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 73, legal_reference: 'RIRPF Art. 45.2' },

  // ─── IT y prestaciones ───
  { code: 'ES_IT_CC_EMPRESA', name: 'Complemento IT cont. común', concept_type: 'earning', subcategory: 'variable', is_salary: true, is_taxable: true, is_ss_contributable: false, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'days', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 90, legal_reference: 'ET Art. 45.1.c' },
  { code: 'ES_IT_AT_EMPRESA', name: 'Complemento IT acc. trabajo', concept_type: 'earning', subcategory: 'variable', is_salary: true, is_taxable: true, is_ss_contributable: false, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'days', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 91 },
  { code: 'ES_NACIMIENTO', name: 'Prestación nacimiento/cuidado', concept_type: 'earning', subcategory: 'variable', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'days', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 92, legal_reference: 'LGSS Art. 177-182' },
  { code: 'ES_STOCK_OPTIONS', name: 'Stock options', concept_type: 'earning', subcategory: 'variable', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 80 },
  { code: 'ES_REGULARIZACION', name: 'Regularización / atrasos', concept_type: 'earning', subcategory: 'regularization', is_salary: true, is_taxable: true, is_ss_contributable: true, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 95 },

  // ─── Deducciones trabajador ───
  { code: 'ES_IRPF', name: 'Retención IRPF', concept_type: 'deduction', subcategory: 'withholding', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: true, impacts_irpf: true, impacts_net_payment: true, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, sort_order: 100, legal_reference: 'LIRPF Art. 99-101' },
  { code: 'ES_SS_CC_TRAB', name: 'Cotización CC trabajador', concept_type: 'deduction', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 4.70, percentage_base: 'base_cc', sort_order: 110, legal_reference: 'LGSS Art. 19' },
  { code: 'ES_SS_DESEMPLEO_TRAB', name: 'Cotización desempleo trabajador', concept_type: 'deduction', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 1.55, percentage_base: 'base_cc', sort_order: 111 },
  { code: 'ES_SS_FP_TRAB', name: 'Formación profesional trabajador', concept_type: 'deduction', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 0.10, percentage_base: 'base_cc', sort_order: 112 },
  { code: 'ES_ANTICIPO', name: 'Anticipo a descontar', concept_type: 'deduction', subcategory: 'advance', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'negative', is_percentage: false, is_prorrateado: false, sort_order: 120 },
  { code: 'ES_EMBARGO', name: 'Embargo judicial', concept_type: 'deduction', subcategory: 'other', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'negative', is_percentage: false, is_prorrateado: false, sort_order: 130 },
  { code: 'ES_PENSION_COMPENSATORIA', name: 'Pensión compensatoria', concept_type: 'deduction', subcategory: 'other', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'negative', is_percentage: false, is_prorrateado: false, sort_order: 131 },
  { code: 'ES_CUOTA_SINDICAL', name: 'Cuota sindical', concept_type: 'deduction', subcategory: 'other', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'fixed', default_sign: 'negative', is_percentage: false, is_prorrateado: false, sort_order: 132 },
  { code: 'ES_PERMISO_NO_RETRIBUIDO', name: 'Desc. permiso no retribuido', concept_type: 'deduction', subcategory: 'variable', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: true, calculation_type: 'days', default_sign: 'negative', is_percentage: false, is_prorrateado: false, sort_order: 133 },

  // ─── Costes empresa ───
  { code: 'ES_SS_CC_EMP', name: 'Cotización CC empresa', concept_type: 'employer_cost', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 23.60, percentage_base: 'base_cc', sort_order: 200, legal_reference: 'LGSS Art. 19' },
  { code: 'ES_SS_DESEMPLEO_EMP', name: 'Desempleo empresa', concept_type: 'employer_cost', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 5.50, percentage_base: 'base_cc', sort_order: 201 },
  { code: 'ES_SS_FOGASA', name: 'FOGASA', concept_type: 'employer_cost', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 0.20, percentage_base: 'base_cc', sort_order: 202, legal_reference: 'ET Art. 33' },
  { code: 'ES_SS_FP_EMP', name: 'FP empresa', concept_type: 'employer_cost', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 0.60, percentage_base: 'base_cc', sort_order: 203 },
  { code: 'ES_SS_MEI', name: 'MEI', concept_type: 'employer_cost', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 0.58, percentage_base: 'base_cc', sort_order: 204, legal_reference: 'Ley 21/2021' },
  { code: 'ES_SS_AT_EP', name: 'AT/EP empresa', concept_type: 'employer_cost', subcategory: 'social_contribution', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'percentage', default_sign: 'negative', is_percentage: true, is_prorrateado: false, default_percentage: 1.50, percentage_base: 'base_at', sort_order: 205 },

  // ─── Informativos ───
  { code: 'ES_BASE_CC', name: 'Base cotización CC', concept_type: 'informative', subcategory: 'informative', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'formula', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 300 },
  { code: 'ES_BASE_AT', name: 'Base cotización AT/EP', concept_type: 'informative', subcategory: 'informative', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'formula', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 301 },
  { code: 'ES_BASE_IRPF', name: 'Base sujeta a IRPF', concept_type: 'informative', subcategory: 'informative', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'formula', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 302 },
  { code: 'ES_COSTE_EMPRESA_TOTAL', name: 'Coste total empresa', concept_type: 'informative', subcategory: 'informative', is_salary: false, is_taxable: false, is_ss_contributable: false, impacts_cra: false, impacts_irpf: false, impacts_net_payment: false, calculation_type: 'formula', default_sign: 'positive', is_percentage: false, is_prorrateado: false, sort_order: 310 },
];

// ── Helpers ──

/** Get concept definition by code */
export function getESConceptByCode(code: string): ESConceptDefinition | undefined {
  return ES_CONCEPT_DEFINITIONS.find(c => c.code === code);
}

/** Get all concepts of a given category */
export function getESConceptsByCategory(category: ConceptCategory): ESConceptDefinition[] {
  return ES_CONCEPT_DEFINITIONS.filter(c => c.concept_type === category);
}

/** Get salary-only concepts */
export function getESSalaryConcepts(): ESConceptDefinition[] {
  return ES_CONCEPT_DEFINITIONS.filter(c => c.is_salary);
}

/** Get concepts that affect IRPF */
export function getESIRPFConcepts(): ESConceptDefinition[] {
  return ES_CONCEPT_DEFINITIONS.filter(c => c.impacts_irpf);
}

/** Get concepts that affect SS */
export function getESSSConcepts(): ESConceptDefinition[] {
  return ES_CONCEPT_DEFINITIONS.filter(c => c.is_ss_contributable);
}

/** Concept display label with icon */
export function conceptDisplayLabel(code: string): string {
  const def = getESConceptByCode(code);
  if (!def) return code;
  const typeIcon = def.concept_type === 'earning' ? '📈' :
    def.concept_type === 'deduction' ? '📉' :
    def.concept_type === 'employer_cost' ? '🏢' : 'ℹ️';
  return `${typeIcon} ${def.name}`;
}

/** Summary of fiscal classification for display */
export function conceptFiscalSummary(code: string): string {
  const def = getESConceptByCode(code);
  if (!def) return 'Concepto no catalogado';
  const parts: string[] = [];
  if (def.is_salary) parts.push('Salarial');
  else parts.push('Extrasalarial');
  if (def.is_taxable) parts.push('Tributa IRPF');
  if (def.is_ss_contributable) parts.push('Cotiza SS');
  if (def.is_prorrateado) parts.push('Prorrateado');
  if (def.legal_reference) parts.push(`(${def.legal_reference})`);
  return parts.join(' · ');
}
