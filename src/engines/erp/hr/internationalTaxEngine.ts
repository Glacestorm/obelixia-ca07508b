/**
 * internationalTaxEngine.ts — P1.7B-RA
 * Pure engine for international tax classification (Spain-centric).
 * Art. 7.p LIRPF, CDI lookup, residency classification.
 * No side-effects, no fetch — deterministic functions only.
 */

// ── Types ──

export type ResidencyClassification = 'resident' | 'non_resident' | 'inbound_beckham' | 'outbound';
export type Art7pEligibility = 'eligible' | 'partially_eligible' | 'not_eligible' | 'requires_review';

export interface Art7pResult {
  eligibility: Art7pEligibility;
  eligibilityLabel: string;
  exemptAmount: number;
  maxExemption: number;
  requirements: Art7pRequirement[];
  annualProration?: number;
  notes: string[];
}

export interface Art7pRequirement {
  id: string;
  label: string;
  met: boolean | null; // null = unknown / needs verification
  description: string;
}

export interface DoubleTaxTreaty {
  countryCode: string;
  countryName: string;
  signedDate?: string;
  inForceDate?: string;
  keyProvisions: string[];
  notes?: string;
}

export interface ResidencyAnalysis {
  classification: ResidencyClassification;
  classificationLabel: string;
  daysInSpain: number;
  daysAbroad: number;
  threshold183Exceeded: boolean;
  centerVitalInterests: 'spain' | 'abroad' | 'indeterminate';
  notes: string[];
  mandatoryReviewPoints: string[];
}

export interface InternationalTaxImpact {
  art7p: Art7pResult;
  residency: ResidencyAnalysis;
  cdiApplicable: boolean;
  cdiDetails?: DoubleTaxTreaty;
  doubleTaxRisk: 'none' | 'low' | 'medium' | 'high';
  doubleTaxRiskLabel: string;
  excessRegimeApplicable: boolean;
  excessRegimeNotes: string[];
  supportLevel: 'supported_production' | 'supported_with_review' | 'out_of_scope';
  mandatoryReviewPoints: string[];
}

// ── Constants ──

const ART_7P_MAX_EXEMPTION = 60_100; // €/year
const DAYS_THRESHOLD = 183;

const ART_7P_ELIGIBILITY_LABELS: Record<Art7pEligibility, string> = {
  eligible: 'Elegible — Art. 7.p LIRPF aplicable',
  partially_eligible: 'Parcialmente elegible — Requiere verificación',
  not_eligible: 'No elegible',
  requires_review: 'Requiere revisión especializada',
};

const RESIDENCY_LABELS: Record<ResidencyClassification, string> = {
  resident: 'Residente fiscal en España',
  non_resident: 'No residente fiscal',
  inbound_beckham: 'Régimen especial impatriados (Beckham Law)',
  outbound: 'Salida — En transición de residencia fiscal',
};

const DOUBLE_TAX_RISK_LABELS: Record<string, string> = {
  none: 'Sin riesgo',
  low: 'Riesgo bajo',
  medium: 'Riesgo medio — CDI disponible',
  high: 'Riesgo alto — Sin CDI o caso complejo',
};

// ── CDI Knowledge Base (most relevant Spanish treaties) ──

const DOUBLE_TAX_TREATIES: Record<string, DoubleTaxTreaty> = {
  DE: { countryCode: 'DE', countryName: 'Alemania', keyProvisions: ['Art. 15: Renta del trabajo dependiente', 'Art. 24: Eliminación doble imposición por crédito'] },
  FR: { countryCode: 'FR', countryName: 'Francia', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 24: Crédito fiscal'] },
  GB: { countryCode: 'GB', countryName: 'Reino Unido', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Eliminación doble imposición', 'Protocolo post-Brexit en vigor'] },
  US: { countryCode: 'US', countryName: 'Estados Unidos', keyProvisions: ['Art. 15: Servicios personales dependientes', 'Art. 23: Crédito fiscal'] },
  IT: { countryCode: 'IT', countryName: 'Italia', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Crédito fiscal'] },
  PT: { countryCode: 'PT', countryName: 'Portugal', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Eliminación doble imposición'] },
  NL: { countryCode: 'NL', countryName: 'Países Bajos', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 22: Eliminación doble imposición'] },
  BE: { countryCode: 'BE', countryName: 'Bélgica', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Crédito fiscal'] },
  CH: { countryCode: 'CH', countryName: 'Suiza', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Crédito fiscal', 'Protocolo sobre intercambio de información'] },
  MX: { countryCode: 'MX', countryName: 'México', keyProvisions: ['Art. 15: Servicios personales dependientes', 'Art. 23: Crédito fiscal'] },
  BR: { countryCode: 'BR', countryName: 'Brasil', keyProvisions: ['Art. 15: Servicios personales', 'Art. 23: Crédito fiscal'] },
  AR: { countryCode: 'AR', countryName: 'Argentina', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Crédito fiscal'] },
  CL: { countryCode: 'CL', countryName: 'Chile', keyProvisions: ['Art. 15: Rentas del trabajo', 'Art. 23: Eliminación doble imposición'] },
  CO: { countryCode: 'CO', countryName: 'Colombia', keyProvisions: ['Art. 14: Rentas del trabajo', 'Art. 22: Eliminación doble imposición'] },
  JP: { countryCode: 'JP', countryName: 'Japón', keyProvisions: ['Art. 15: Rentas del trabajo', 'Art. 23: Crédito fiscal'] },
  CN: { countryCode: 'CN', countryName: 'China', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Crédito fiscal'] },
  IN: { countryCode: 'IN', countryName: 'India', keyProvisions: ['Art. 16: Servicios personales', 'Art. 25: Eliminación doble imposición'] },
  AE: { countryCode: 'AE', countryName: 'Emiratos Árabes Unidos', keyProvisions: ['Art. 14: Trabajo dependiente', 'Art. 22: Eliminación doble imposición'] },
  AU: { countryCode: 'AU', countryName: 'Australia', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 22: Crédito fiscal'] },
  CA: { countryCode: 'CA', countryName: 'Canadá', keyProvisions: ['Art. 15: Rentas del trabajo', 'Art. 23: Eliminación doble imposición'] },
  KR: { countryCode: 'KR', countryName: 'Corea del Sur', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 23: Crédito fiscal'] },
  MA: { countryCode: 'MA', countryName: 'Marruecos', keyProvisions: ['Art. 15: Trabajo dependiente', 'Art. 24: Crédito fiscal'] },
  AD: { countryCode: 'AD', countryName: 'Andorra', keyProvisions: ['Art. 14: Trabajo dependiente', 'Art. 21: Eliminación doble imposición', 'Intercambio automático de información'] },
};

// ── Art. 7.p Evaluation ──

export interface Art7pInput {
  hostCountryCode: string;
  daysWorkedAbroad: number;
  annualGrossSalary: number;
  workEffectivelyAbroad: boolean;
  beneficiaryIsNonResident: boolean; // beneficiary of the work is not ES tax resident
  countryHasCDIOrInfoExchange: boolean;
}

export function evaluateArt7p(input: Art7pInput): Art7pResult {
  const requirements: Art7pRequirement[] = [
    {
      id: 'effective_work', label: 'Trabajo efectivo en el extranjero',
      met: input.workEffectivelyAbroad,
      description: 'El trabajador debe realizar trabajo efectivo fuera de España (no teletrabajo desde España).',
    },
    {
      id: 'beneficiary_non_resident', label: 'Beneficiario no residente en España',
      met: input.beneficiaryIsNonResident,
      description: 'La entidad o persona beneficiaria del trabajo no debe ser residente fiscal en España.',
    },
    {
      id: 'cdi_or_info_exchange', label: 'País con CDI o acuerdo de intercambio',
      met: input.countryHasCDIOrInfoExchange,
      description: 'El país destino debe tener CDI con España o acuerdo de intercambio de información tributaria.',
    },
    {
      id: 'not_tax_haven', label: 'País no calificado como paraíso fiscal',
      met: null, // requires specific verification
      description: 'El país destino no debe figurar en la lista de paraísos fiscales (RD 1080/1991).',
    },
  ];

  const criticalMet = requirements.filter(r => r.id !== 'not_tax_haven').every(r => r.met === true);
  const anyUnknown = requirements.some(r => r.met === null);

  let eligibility: Art7pEligibility;
  if (criticalMet && !anyUnknown) eligibility = 'eligible';
  else if (criticalMet && anyUnknown) eligibility = 'partially_eligible';
  else if (requirements.some(r => r.met === false)) eligibility = 'not_eligible';
  else eligibility = 'requires_review';

  // Proration: daily salary × days abroad, capped at 60,100
  const dailySalary = input.annualGrossSalary / 365;
  const rawExempt = dailySalary * input.daysWorkedAbroad;
  const exemptAmount = eligibility === 'not_eligible' ? 0 : Math.min(rawExempt, ART_7P_MAX_EXEMPTION);

  const notes: string[] = [];
  if (eligibility === 'eligible') {
    notes.push(`Exención estimada: ${exemptAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} (${input.daysWorkedAbroad} días).`);
  }
  if (eligibility === 'partially_eligible') {
    notes.push('Verificar requisito de paraíso fiscal antes de aplicar la exención.');
  }
  notes.push('Art. 7.p es incompatible con régimen de excesos (Art. 9.A.3.b RIRPF). El contribuyente elige uno.');

  return {
    eligibility,
    eligibilityLabel: ART_7P_ELIGIBILITY_LABELS[eligibility],
    exemptAmount,
    maxExemption: ART_7P_MAX_EXEMPTION,
    requirements,
    annualProration: input.daysWorkedAbroad / 365,
    notes,
  };
}

// ── Residency Analysis ──

export interface ResidencyInput {
  daysInSpain: number;
  totalDaysInYear?: number;
  spouseInSpain: boolean;
  dependentChildrenInSpain: boolean;
  mainEconomicActivitiesInSpain: boolean;
  isBeckhamEligible?: boolean;
}

export function analyzeResidency(input: ResidencyInput): ResidencyAnalysis {
  const totalDays = input.totalDaysInYear ?? 365;
  const daysAbroad = totalDays - input.daysInSpain;
  const threshold183Exceeded = input.daysInSpain > DAYS_THRESHOLD;

  // Center of vital interests
  let centerVitalInterests: 'spain' | 'abroad' | 'indeterminate' = 'indeterminate';
  const spainFactors = [input.spouseInSpain, input.dependentChildrenInSpain, input.mainEconomicActivitiesInSpain].filter(Boolean).length;
  if (spainFactors >= 2) centerVitalInterests = 'spain';
  else if (spainFactors === 0) centerVitalInterests = 'abroad';

  let classification: ResidencyClassification;
  const mandatoryReviewPoints: string[] = [];
  const notes: string[] = [];

  if (input.isBeckhamEligible) {
    classification = 'inbound_beckham';
    notes.push('Régimen especial de impatriados (Art. 93 LIRPF / Ley Beckham). Tributación como no residente durante 6 años.');
    mandatoryReviewPoints.push('Verificar elegibilidad: no residente en España en los 5 ejercicios anteriores.');
  } else if (threshold183Exceeded) {
    classification = 'resident';
    notes.push(`${input.daysInSpain} días en España (>183). Residente fiscal según Art. 9.1.a LIRPF.`);
  } else if (centerVitalInterests === 'spain') {
    classification = 'resident';
    notes.push('Menos de 183 días pero centro de intereses vitales en España. Residente por Art. 9.1.b LIRPF.');
    mandatoryReviewPoints.push('Revisión recomendada: residencia por centro de intereses vitales es interpretativa.');
  } else if (centerVitalInterests === 'abroad' && !threshold183Exceeded) {
    classification = 'outbound';
    notes.push('Menos de 183 días en España y centro vital en el extranjero. Posible no residente.');
    mandatoryReviewPoints.push('Confirmar que no aplica presunción del Art. 9.1.b LIRPF (cónyuge/hijos en España).');
  } else {
    classification = 'resident'; // presumption
    notes.push('Caso indeterminado — se presume residente fiscal en España. Revisión obligatoria.');
    mandatoryReviewPoints.push('Determinar residencia fiscal con asesor especializado. Caso limítrofe.');
  }

  return {
    classification,
    classificationLabel: RESIDENCY_LABELS[classification],
    daysInSpain: input.daysInSpain,
    daysAbroad,
    threshold183Exceeded,
    centerVitalInterests,
    notes,
    mandatoryReviewPoints,
  };
}

// ── CDI Lookup ──

export function getDoubleTaxTreaty(hostCountryCode: string): DoubleTaxTreaty | null {
  return DOUBLE_TAX_TREATIES[hostCountryCode.toUpperCase()] ?? null;
}

// ── Full International Tax Impact ──

export interface TaxImpactInput {
  hostCountryCode: string;
  annualGrossSalary: number;
  daysWorkedAbroad: number;
  daysInSpain: number;
  workEffectivelyAbroad: boolean;
  beneficiaryIsNonResident: boolean;
  spouseInSpain: boolean;
  dependentChildrenInSpain: boolean;
  mainEconomicActivitiesInSpain: boolean;
  isBeckhamEligible?: boolean;
}

export function evaluateInternationalTaxImpact(input: TaxImpactInput): InternationalTaxImpact {
  const cdi = getDoubleTaxTreaty(input.hostCountryCode);
  const hasCDI = !!cdi;

  const art7p = evaluateArt7p({
    hostCountryCode: input.hostCountryCode,
    daysWorkedAbroad: input.daysWorkedAbroad,
    annualGrossSalary: input.annualGrossSalary,
    workEffectivelyAbroad: input.workEffectivelyAbroad,
    beneficiaryIsNonResident: input.beneficiaryIsNonResident,
    countryHasCDIOrInfoExchange: hasCDI,
  });

  const residency = analyzeResidency({
    daysInSpain: input.daysInSpain,
    spouseInSpain: input.spouseInSpain,
    dependentChildrenInSpain: input.dependentChildrenInSpain,
    mainEconomicActivitiesInSpain: input.mainEconomicActivitiesInSpain,
    isBeckhamEligible: input.isBeckhamEligible,
  });

  // Double tax risk
  let doubleTaxRisk: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (!hasCDI && residency.classification !== 'non_resident') doubleTaxRisk = 'high';
  else if (!hasCDI) doubleTaxRisk = 'high';
  else if (residency.mandatoryReviewPoints.length > 0) doubleTaxRisk = 'medium';
  else if (input.daysWorkedAbroad > 60) doubleTaxRisk = 'low';

  // Excess regime (alternative to Art. 7.p)
  const excessRegimeApplicable = residency.classification === 'resident' && input.daysWorkedAbroad > 0;
  const excessRegimeNotes = excessRegimeApplicable
    ? ['Régimen de excesos (Art. 9.A.3.b RIRPF): las dietas por desplazamiento al extranjero pueden estar exentas. Incompatible con Art. 7.p — el contribuyente elige.']
    : [];

  // Overall support level
  const mandatoryReviewPoints = [
    ...residency.mandatoryReviewPoints,
    ...(art7p.eligibility === 'requires_review' ? ['Art. 7.p requiere verificación de requisitos'] : []),
    ...(!hasCDI ? [`Sin CDI con ${input.hostCountryCode} — riesgo de doble imposición`] : []),
  ];

  let supportLevel: 'supported_production' | 'supported_with_review' | 'out_of_scope' = 'supported_production';
  if (mandatoryReviewPoints.length > 0 || doubleTaxRisk === 'medium') supportLevel = 'supported_with_review';
  if (doubleTaxRisk === 'high') supportLevel = 'supported_with_review';

  return {
    art7p,
    residency,
    cdiApplicable: hasCDI,
    cdiDetails: cdi ?? undefined,
    doubleTaxRisk,
    doubleTaxRiskLabel: DOUBLE_TAX_RISK_LABELS[doubleTaxRisk],
    excessRegimeApplicable,
    excessRegimeNotes,
    supportLevel,
    mandatoryReviewPoints,
  };
}
