/**
 * internationalMobilityEngine.ts — P1.7B-RA
 * Pure classification engine for international mobility / expatriate cases.
 * No side-effects, no fetch — deterministic functions only.
 *
 * Classifies each assignment by:
 *  - SS regime (EU/EEA/CH, bilateral, no agreement)
 *  - Support level (production, review, out_of_scope)
 *  - Document checklist by regime & assignment type
 *  - Payroll / SS / Tax impact flags
 *  - Risk score 0-100
 */

// ── Types ──

export type SSRegime = 'eu_eea_ch' | 'bilateral_agreement' | 'no_agreement';
export type SupportLevel = 'supported_production' | 'supported_with_review' | 'out_of_scope';

export interface CountryProfile {
  code: string;
  name: string;
  isEU: boolean;
  isEEA: boolean;
  isCH: boolean;
  hasBilateralSS: boolean;
  bilateralSSDetails?: string;
  hasCDI: boolean;
  cdiDetails?: string;
  notes?: string;
}

export interface MobilityClassification {
  ssRegime: SSRegime;
  ssRegimeLabel: string;
  supportLevel: SupportLevel;
  supportLevelLabel: string;
  reviewTriggers: ReviewTrigger[];
  documentChecklist: DocumentChecklistItem[];
  payrollImpact: PayrollImpact;
  ssImpact: SSImpact;
  taxImpact: TaxImpactSummary;
  riskScore: number;
  riskFactors: string[];
  countryProfile: CountryProfile;
}

export interface ReviewTrigger {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'ss' | 'tax' | 'legal' | 'payroll' | 'compliance';
  label: string;
  description: string;
  requiredAction?: string;
}

export interface DocumentChecklistItem {
  id: string;
  documentType: string;
  label: string;
  required: boolean;
  regime: SSRegime | 'all';
  description: string;
  issuingAuthority?: string;
  typicalProcessingDays?: number;
}

export interface PayrollImpact {
  splitPayrollRecommended: boolean;
  shadowPayrollRecommended: boolean;
  taxEqualizationRecommended: boolean;
  hypotheticalTaxNeeded: boolean;
  notes: string[];
}

export interface SSImpact {
  homeCoverage: boolean;
  hostCoverage: boolean;
  dualCoverage: boolean;
  a1Required: boolean;
  bilateralCertRequired: boolean;
  voluntaryCoverageOption: boolean;
  notes: string[];
}

export interface TaxImpactSummary {
  residencyRisk: boolean;
  art7pPotential: boolean;
  cdiAvailable: boolean;
  doubleTaxRisk: boolean;
  notes: string[];
}

// ── Country Knowledge Base ──

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','SE',
]);

const EEA_NON_EU = new Set(['IS','LI','NO']);

const CH = 'CH';
const UK = 'GB';
const AD = 'AD'; // Andorra

/** Bilateral SS agreements Spain has with non-EU/EEA countries */
const BILATERAL_SS_AGREEMENTS: Record<string, { name: string; details: string }> = {
  US: { name: 'Estados Unidos', details: 'Convenio bilateral SS España-EEUU. Cobertura temporal hasta 5 años con certificado de cobertura.' },
  CA: { name: 'Canadá', details: 'Convenio bilateral SS España-Canadá. Totalización de períodos, cobertura temporal con certificado.' },
  MX: { name: 'México', details: 'Convenio bilateral SS España-México. Desplazamiento temporal con certificado de cobertura.' },
  CL: { name: 'Chile', details: 'Convenio bilateral SS España-Chile. Totalización de cotizaciones y desplazamiento temporal.' },
  CO: { name: 'Colombia', details: 'Convenio bilateral SS España-Colombia. Desplazamiento temporal hasta 2 años prorrogable.' },
  AR: { name: 'Argentina', details: 'Convenio bilateral SS España-Argentina. Totalización y desplazamiento temporal.' },
  UY: { name: 'Uruguay', details: 'Convenio bilateral SS España-Uruguay. Cobertura temporal desplazados.' },
  BR: { name: 'Brasil', details: 'Convenio bilateral SS España-Brasil. Desplazamiento temporal con certificado.' },
  PE: { name: 'Perú', details: 'Convenio bilateral SS España-Perú. Totalización de períodos cotizados.' },
  VE: { name: 'Venezuela', details: 'Convenio bilateral SS España-Venezuela. Totalización (aplicación limitada).' },
  PY: { name: 'Paraguay', details: 'Convenio bilateral SS España-Paraguay. Totalización y cobertura temporal.' },
  DO: { name: 'Rep. Dominicana', details: 'Convenio bilateral SS España-Rep. Dominicana. Cobertura temporal.' },
  EC: { name: 'Ecuador', details: 'Convenio bilateral SS España-Ecuador. Totalización y desplazamiento.' },
  PH: { name: 'Filipinas', details: 'Convenio bilateral SS España-Filipinas. Totalización de períodos.' },
  MA: { name: 'Marruecos', details: 'Convenio bilateral SS España-Marruecos. Desplazamiento temporal con certificado.' },
  TN: { name: 'Túnez', details: 'Convenio bilateral SS España-Túnez. Desplazamiento temporal.' },
  UA: { name: 'Ucrania', details: 'Convenio bilateral SS España-Ucrania. Desplazamiento temporal.' },
  JP: { name: 'Japón', details: 'Convenio bilateral SS España-Japón. Desplazamiento temporal hasta 5 años.' },
  KR: { name: 'Corea del Sur', details: 'Convenio bilateral SS España-Corea del Sur. Desplazamiento temporal.' },
  AU: { name: 'Australia', details: 'Convenio bilateral SS España-Australia. Totalización de períodos cotizados.' },
  RU: { name: 'Rusia', details: 'Convenio bilateral SS España-Rusia. Totalización y desplazamiento temporal.' },
  CN: { name: 'China', details: 'Convenio bilateral SS España-China. Desplazamiento temporal con exención de cotización.' },
  IN: { name: 'India', details: 'Convenio bilateral SS España-India (en vigor reciente). Desplazamiento temporal.' },
};

/** Countries with CDI (Convenio Doble Imposición) with Spain — most relevant subset */
const CDI_COUNTRIES = new Set([
  ...Array.from(EU_COUNTRIES), ...Array.from(EEA_NON_EU), CH,
  UK, AD, 'US','CA','MX','CL','CO','AR','UY','BR','PE','PY','DO','EC',
  'JP','KR','AU','CN','IN','RU','MA','TN','UA','PH',
  'IL','TR','AE','SA','SG','HK','TH','NZ','ZA','EG','DZ',
]);

// ── Country Profile Builder ──

export function getCountryProfile(code: string): CountryProfile {
  const upper = code.toUpperCase();
  const isEU = EU_COUNTRIES.has(upper);
  const isEEA = EEA_NON_EU.has(upper);
  const isCH = upper === CH;
  const bilateral = BILATERAL_SS_AGREEMENTS[upper];
  const isUK = upper === UK;
  const isAD = upper === AD;

  // UK + Andorra get bilateral-like treatment
  const hasBilateralSS = !!bilateral || isUK || isAD;
  const hasCDI = CDI_COUNTRIES.has(upper);

  let name = bilateral?.name ?? upper;
  if (isUK) name = 'Reino Unido';
  if (isAD) name = 'Andorra';

  return {
    code: upper,
    name,
    isEU,
    isEEA,
    isCH,
    hasBilateralSS,
    bilateralSSDetails: bilateral?.details ?? (isUK ? 'Protocolo SS España-UK post-Brexit. Cobertura temporal con certificado.' : isAD ? 'Convenio bilateral SS España-Andorra.' : undefined),
    hasCDI,
    cdiDetails: hasCDI ? `CDI vigente entre España y ${name}` : undefined,
    notes: !isEU && !isEEA && !isCH && !hasBilateralSS ? 'Sin convenio bilateral SS. Requiere análisis específico.' : undefined,
  };
}

// ── SS Regime Classification ──

function classifySSRegime(hostCountryCode: string): SSRegime {
  const upper = hostCountryCode.toUpperCase();
  if (EU_COUNTRIES.has(upper) || EEA_NON_EU.has(upper) || upper === CH) return 'eu_eea_ch';
  if (BILATERAL_SS_AGREEMENTS[upper] || upper === UK || upper === AD) return 'bilateral_agreement';
  return 'no_agreement';
}

const SS_REGIME_LABELS: Record<SSRegime, string> = {
  eu_eea_ch: 'UE / EEE / Suiza — Reglamentos CE 883/2004',
  bilateral_agreement: 'Convenio Bilateral de Seguridad Social',
  no_agreement: 'Sin Convenio — Régimen general',
};

// ── Document Checklist Templates ──

const BASE_DOCUMENTS: DocumentChecklistItem[] = [
  { id: 'assignment_letter', documentType: 'assignment_letter', label: 'Carta de asignación', required: true, regime: 'all', description: 'Documento formal de asignación internacional', typicalProcessingDays: 5 },
  { id: 'medical_clearance', documentType: 'medical_clearance', label: 'Certificado médico', required: true, regime: 'all', description: 'Aptitud médica para desplazamiento', typicalProcessingDays: 10 },
];

const EU_DOCUMENTS: DocumentChecklistItem[] = [
  { id: 'a1_certificate', documentType: 'a1_certificate', label: 'Certificado A1 (PD A1)', required: true, regime: 'eu_eea_ch', description: 'Certificado de legislación SS aplicable — Reglamento CE 883/2004', issuingAuthority: 'TGSS', typicalProcessingDays: 15 },
  { id: 'ehic', documentType: 'social_security_cert', label: 'Tarjeta Sanitaria Europea (TSE)', required: true, regime: 'eu_eea_ch', description: 'Cobertura sanitaria temporal en UE/EEE', issuingAuthority: 'INSS', typicalProcessingDays: 10 },
  { id: 'tax_residency_cert', documentType: 'tax_residency_cert', label: 'Certificado de residencia fiscal', required: false, regime: 'eu_eea_ch', description: 'Para aplicar CDI — emitido por AEAT', issuingAuthority: 'AEAT', typicalProcessingDays: 15 },
];

const BILATERAL_DOCUMENTS: DocumentChecklistItem[] = [
  { id: 'bilateral_cert', documentType: 'social_security_cert', label: 'Certificado de cobertura bilateral', required: true, regime: 'bilateral_agreement', description: 'Certificado SS según convenio bilateral aplicable', issuingAuthority: 'TGSS', typicalProcessingDays: 20 },
  { id: 'tax_residency_cert_b', documentType: 'tax_residency_cert', label: 'Certificado de residencia fiscal', required: true, regime: 'bilateral_agreement', description: 'Necesario para aplicar CDI bilateral', issuingAuthority: 'AEAT', typicalProcessingDays: 15 },
];

const NO_AGREEMENT_DOCUMENTS: DocumentChecklistItem[] = [
  { id: 'voluntary_ss', documentType: 'social_security_cert', label: 'Convenio especial SS (voluntario)', required: false, regime: 'no_agreement', description: 'Mantenimiento voluntario cobertura SS española', issuingAuthority: 'TGSS', typicalProcessingDays: 30 },
  { id: 'private_insurance', documentType: 'medical_clearance', label: 'Seguro médico privado internacional', required: true, regime: 'no_agreement', description: 'Cobertura sanitaria sin convenio SS', typicalProcessingDays: 5 },
  { id: 'tax_residency_cert_n', documentType: 'tax_residency_cert', label: 'Certificado de residencia fiscal', required: true, regime: 'no_agreement', description: 'Documentación fiscal para doble imposición', issuingAuthority: 'AEAT', typicalProcessingDays: 15 },
];

const WORK_PERMIT_DOCUMENTS: DocumentChecklistItem[] = [
  { id: 'work_permit', documentType: 'work_permit', label: 'Permiso de trabajo', required: true, regime: 'all', description: 'Autorización de trabajo en país destino', typicalProcessingDays: 60 },
  { id: 'visa', documentType: 'visa', label: 'Visado', required: true, regime: 'all', description: 'Visado de entrada/residencia', typicalProcessingDays: 30 },
  { id: 'residence_permit', documentType: 'residence_permit', label: 'Permiso de residencia', required: false, regime: 'all', description: 'Permiso de residencia en país destino (si >90 días fuera UE)', typicalProcessingDays: 45 },
];

function buildDocumentChecklist(regime: SSRegime, hostCountry: string, needsWorkPermit: boolean): DocumentChecklistItem[] {
  const docs = [...BASE_DOCUMENTS];

  switch (regime) {
    case 'eu_eea_ch':
      docs.push(...EU_DOCUMENTS);
      break;
    case 'bilateral_agreement':
      docs.push(...BILATERAL_DOCUMENTS);
      break;
    case 'no_agreement':
      docs.push(...NO_AGREEMENT_DOCUMENTS);
      break;
  }

  // EU citizens don't need work permits within EU/EEA/CH
  const hostIsEU = EU_COUNTRIES.has(hostCountry.toUpperCase()) || EEA_NON_EU.has(hostCountry.toUpperCase()) || hostCountry.toUpperCase() === CH;
  if (needsWorkPermit && !hostIsEU) {
    docs.push(...WORK_PERMIT_DOCUMENTS);
  }

  return docs;
}

// ── Impact Derivation ──

function derivePayrollImpact(regime: SSRegime, assignment: MobilityInput): PayrollImpact {
  const notes: string[] = [];
  let splitRecommended = assignment.splitPayroll ?? false;
  let shadowRecommended = assignment.shadowPayroll ?? false;
  const taxEqRecommended = assignment.compensationApproach === 'tax_equalization';

  if (regime === 'no_agreement') {
    notes.push('Sin convenio: posible doble cotización SS. Evaluar convenio especial.');
    shadowRecommended = true;
  }
  if (assignment.durationMonths && assignment.durationMonths > 24) {
    notes.push('Asignación >24 meses: revisar residencia fiscal y split payroll.');
    splitRecommended = true;
  }
  if (assignment.peRiskFlag) {
    notes.push('Riesgo de establecimiento permanente detectado.');
  }

  return {
    splitPayrollRecommended: splitRecommended,
    shadowPayrollRecommended: shadowRecommended,
    taxEqualizationRecommended: taxEqRecommended,
    hypotheticalTaxNeeded: taxEqRecommended || shadowRecommended,
    notes,
  };
}

function deriveSSImpact(regime: SSRegime): SSImpact {
  switch (regime) {
    case 'eu_eea_ch':
      return {
        homeCoverage: true, hostCoverage: false, dualCoverage: false,
        a1Required: true, bilateralCertRequired: false, voluntaryCoverageOption: false,
        notes: ['Cobertura SS España vía A1 (Reglamento CE 883/2004). Máximo 24 meses, prorrogable con Art. 16.'],
      };
    case 'bilateral_agreement':
      return {
        homeCoverage: true, hostCoverage: false, dualCoverage: false,
        a1Required: false, bilateralCertRequired: true, voluntaryCoverageOption: false,
        notes: ['Cobertura SS España vía certificado bilateral. Duración según convenio específico.'],
      };
    case 'no_agreement':
      return {
        homeCoverage: false, hostCoverage: false, dualCoverage: true,
        a1Required: false, bilateralCertRequired: false, voluntaryCoverageOption: true,
        notes: ['Sin convenio: posible doble cotización. Considerar convenio especial con TGSS para mantener cobertura española.'],
      };
  }
}

function deriveTaxImpactSummary(regime: SSRegime, profile: CountryProfile, durationMonths?: number): TaxImpactSummary {
  const notes: string[] = [];
  const residencyRisk = (durationMonths ?? 0) > 6; // > 183 days approx
  const art7pPotential = profile.hasCDI && (durationMonths ?? 0) >= 1;

  if (residencyRisk) notes.push('Riesgo de cambio de residencia fiscal (>183 días). Revisar Art. 9 LIRPF.');
  if (art7pPotential) notes.push('Posible aplicación Art. 7.p LIRPF (exención hasta 60.100€/año por trabajo efectivo en el extranjero).');
  if (!profile.hasCDI) notes.push('Sin CDI vigente — riesgo elevado de doble imposición.');
  if (profile.hasCDI) notes.push(`CDI disponible: ${profile.cdiDetails}`);

  return {
    residencyRisk,
    art7pPotential,
    cdiAvailable: profile.hasCDI,
    doubleTaxRisk: !profile.hasCDI || residencyRisk,
    notes,
  };
}

// ── Review Triggers ──

function deriveReviewTriggers(
  regime: SSRegime,
  profile: CountryProfile,
  assignment: MobilityInput,
): ReviewTrigger[] {
  const triggers: ReviewTrigger[] = [];

  if (regime === 'no_agreement') {
    triggers.push({
      id: 'no_ss_agreement', severity: 'high', category: 'ss',
      label: 'Sin convenio SS bilateral',
      description: `No existe convenio bilateral SS con ${profile.name}. Riesgo de doble cotización.`,
      requiredAction: 'Evaluar convenio especial con TGSS y cobertura privada.',
    });
  }

  if (!profile.hasCDI) {
    triggers.push({
      id: 'no_cdi', severity: 'high', category: 'tax',
      label: 'Sin CDI (Convenio Doble Imposición)',
      description: `No existe CDI vigente con ${profile.name}. Riesgo elevado de doble imposición.`,
      requiredAction: 'Análisis fiscal especializado obligatorio antes de la asignación.',
    });
  }

  if ((assignment.durationMonths ?? 0) > 24) {
    triggers.push({
      id: 'long_duration', severity: 'medium', category: 'compliance',
      label: 'Duración >24 meses',
      description: 'Asignación de larga duración. Posible pérdida de cobertura A1/bilateral. Revisar residencia fiscal.',
      requiredAction: 'Revisar extensión de cobertura SS y cambio de residencia fiscal.',
    });
  }

  if (assignment.peRiskFlag) {
    triggers.push({
      id: 'pe_risk', severity: 'critical', category: 'tax',
      label: 'Riesgo de establecimiento permanente (PE)',
      description: 'Se ha detectado riesgo de PE. Implicaciones fiscales y legales significativas.',
      requiredAction: 'Análisis jurídico-fiscal obligatorio. Evaluar reestructuración de la asignación.',
    });
  }

  if (assignment.splitPayroll) {
    triggers.push({
      id: 'split_payroll', severity: 'medium', category: 'payroll',
      label: 'Split payroll activo',
      description: 'Nómina dividida entre origen y destino. Requiere coordinación fiscal inter-jurisdicción.',
      requiredAction: 'Verificar obligaciones de retención en ambos países.',
    });
  }

  if ((assignment.durationMonths ?? 0) > 6) {
    triggers.push({
      id: 'residency_risk', severity: 'high', category: 'tax',
      label: 'Riesgo de cambio de residencia fiscal',
      description: 'Permanencia >183 días puede cambiar residencia fiscal. Art. 9 LIRPF.',
      requiredAction: 'Determinar residencia fiscal esperada y planificación previa.',
    });
  }

  if (assignment.assignmentType === 'permanent_transfer') {
    triggers.push({
      id: 'permanent_transfer', severity: 'medium', category: 'legal',
      label: 'Transferencia permanente',
      description: 'No es una asignación temporal — implica cambio de empleador/contrato.',
      requiredAction: 'Revisar implicaciones contractuales, SS y fiscales del cambio de residencia permanente.',
    });
  }

  return triggers;
}

// ── Risk Score ──

function computeRiskScore(regime: SSRegime, triggers: ReviewTrigger[], assignment: MobilityInput): number {
  let score = 0;

  // Base regime risk
  if (regime === 'no_agreement') score += 30;
  else if (regime === 'bilateral_agreement') score += 10;

  // Trigger-based risk
  for (const t of triggers) {
    switch (t.severity) {
      case 'critical': score += 25; break;
      case 'high': score += 15; break;
      case 'medium': score += 8; break;
      case 'low': score += 3; break;
    }
  }

  // Duration risk
  if ((assignment.durationMonths ?? 0) > 36) score += 10;
  else if ((assignment.durationMonths ?? 0) > 24) score += 5;

  return Math.min(100, score);
}

// ── Support Level Derivation ──

function deriveSupportLevel(regime: SSRegime, triggers: ReviewTrigger[], riskScore: number): SupportLevel {
  // Out of scope: no agreement + critical triggers
  if (regime === 'no_agreement' && triggers.some(t => t.severity === 'critical')) return 'out_of_scope';

  // Supported with review: bilateral, or any high/critical trigger, or high risk
  if (regime === 'no_agreement') return 'supported_with_review';
  if (triggers.some(t => t.severity === 'critical' || t.severity === 'high')) return 'supported_with_review';
  if (riskScore > 50) return 'supported_with_review';

  // EU/EEA/CH with manageable triggers
  return 'supported_production';
}

const SUPPORT_LEVEL_LABELS: Record<SupportLevel, string> = {
  supported_production: 'Soportado — Producción',
  supported_with_review: 'Soportado — Requiere revisión especializada',
  out_of_scope: 'Fuera de alcance — Derivar a especialista externo',
};

// ── Main Classification Function ──

export interface MobilityInput {
  hostCountryCode: string;
  homeCountryCode?: string;
  assignmentType: string;
  durationMonths?: number;
  splitPayroll?: boolean;
  shadowPayroll?: boolean;
  peRiskFlag?: boolean;
  compensationApproach?: string;
  daysInHost?: number;
}

export function classifyMobilityCase(input: MobilityInput): MobilityClassification {
  const profile = getCountryProfile(input.hostCountryCode);
  const regime = classifySSRegime(input.hostCountryCode);
  const ssImpact = deriveSSImpact(regime);
  const payrollImpact = derivePayrollImpact(regime, input);
  const taxImpact = deriveTaxImpactSummary(regime, profile, input.durationMonths);
  const reviewTriggers = deriveReviewTriggers(regime, profile, input);
  const riskScore = computeRiskScore(regime, reviewTriggers, input);
  const supportLevel = deriveSupportLevel(regime, reviewTriggers, riskScore);

  // EU citizens don't need work permits within EU — simplified heuristic
  const hostIsEU_EEA_CH = regime === 'eu_eea_ch';
  const needsWorkPermit = !hostIsEU_EEA_CH;
  const documentChecklist = buildDocumentChecklist(regime, input.hostCountryCode, needsWorkPermit);

  const riskFactors: string[] = [];
  if (regime === 'no_agreement') riskFactors.push('Sin convenio SS bilateral');
  if (!profile.hasCDI) riskFactors.push('Sin CDI');
  if (input.peRiskFlag) riskFactors.push('Riesgo PE');
  if ((input.durationMonths ?? 0) > 24) riskFactors.push('Duración >24 meses');
  if (input.splitPayroll) riskFactors.push('Split payroll');

  return {
    ssRegime: regime,
    ssRegimeLabel: SS_REGIME_LABELS[regime],
    supportLevel,
    supportLevelLabel: SUPPORT_LEVEL_LABELS[supportLevel],
    reviewTriggers,
    documentChecklist,
    payrollImpact,
    ssImpact,
    taxImpact,
    riskScore,
    riskFactors,
    countryProfile: profile,
  };
}

/** List all countries with known profiles for UI selectors */
export function getKnownCountries(): CountryProfile[] {
  const codes = new Set([
    ...Array.from(EU_COUNTRIES),
    ...Array.from(EEA_NON_EU),
    CH, UK, AD,
    ...Object.keys(BILATERAL_SS_AGREEMENTS),
  ]);
  return Array.from(codes).map(getCountryProfile).sort((a, b) => a.name.localeCompare(b.name));
}
