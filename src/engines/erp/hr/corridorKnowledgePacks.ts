/**
 * corridorKnowledgePacks.ts — G2.1
 * Phase 1 knowledge packs for 9 ES↔X corridors.
 * TypeScript constants — Phase 1 solution, NOT the final normative administration model.
 * Future phases will migrate to a DB-backed pack system with versioned snapshots.
 */

// ── Types ──

export type PackStatus = 'current' | 'stale' | 'review_required';
export type ConfidenceSource = 'official_gazette' | 'treaty_text' | 'secondary_source' | 'ai_derived';

export interface PackSourceRef {
  label: string;
  url?: string;
  type: ConfidenceSource;
  lastAccessed?: string;
}

export interface SSInfo {
  regime: 'eu_eea_ch' | 'bilateral_agreement' | 'no_agreement';
  framework: string;
  maxMonths: number;
  certType: string;
  notes: string;
  sources: PackSourceRef[];
}

export interface CDIInfo {
  hasCDI: boolean;
  treatyRef: string;
  keyArticles: string[];
  withholdingRates: {
    dividends: string;
    interest: string;
    royalties: string;
    employment: string;
  };
}

export interface TaxInfo {
  residenceDaysThreshold: number;
  art7pApplicable: boolean;
  beckhamEquivalent: string | null;
  exitTax: boolean;
  notes: string;
}

export interface ImmigrationInfo {
  workPermitRequired: boolean;
  visaType: string;
  processingDays: string;
  notes: string;
}

export interface PayrollInfo {
  splitRecommended: boolean;
  shadowRecommended: boolean;
  taxEqRecommended: boolean;
}

export interface CorridorReviewTrigger {
  id: string;
  severity: 'info' | 'warning' | 'review_required' | 'critical_review_required';
  reason: string;
  affectedModule: string;
  suggestedAction: string;
  evidenceRequired: boolean;
}

export interface CorridorKnowledgePack {
  id: string;
  origin: string;
  destination: string;
  version: string;
  status: PackStatus;
  confidenceScore: number;
  lastReviewed: string;
  reviewOwner: string;
  automationBoundaryNote: string;
  sourceRefs: PackSourceRef[];
  ss: SSInfo;
  cdi: CDIInfo;
  tax: TaxInfo;
  immigration: ImmigrationInfo;
  payroll: PayrollInfo;
  requiredDocuments: string[];
  reviewTriggers: CorridorReviewTrigger[];
}

// ── Phase 1 Corridor Packs ──

const PACK_ES_FR: CorridorKnowledgePack = {
  id: 'COR-ES-FR-v1.0.0',
  origin: 'ES',
  destination: 'FR',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 90,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS classification and Art.7.p eligibility are automated. French social charges calculation and local tax filing require external advisor.',
  sourceRefs: [
    { label: 'Reglamento CE 883/2004', type: 'treaty_text' },
    { label: 'CDI España-Francia 1995', type: 'treaty_text' },
    { label: 'BOE — Convenio SS España-Francia', type: 'official_gazette' },
  ],
  ss: {
    regime: 'eu_eea_ch',
    framework: 'Reglamento CE 883/2004',
    maxMonths: 24,
    certType: 'A1',
    notes: 'Desplazamiento temporal hasta 24 meses con certificado A1. Prórroga posible previo acuerdo entre organismos.',
    sources: [{ label: 'Reglamento CE 883/2004', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-Francia, BOE 12/06/1997',
    keyArticles: ['Art. 15 — Rentas del trabajo', 'Art. 24 — Eliminación doble imposición'],
    withholdingRates: { dividends: '15%', interest: '10%', royalties: '5%', employment: 'Según Art. 15' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: 'Régimen impatriados francés (Art. 155 B CGI)',
    exitTax: true,
    notes: 'Francia aplica exit tax sobre plusvalías latentes. Coordinar con CDI Art. 13.',
  },
  immigration: {
    workPermitRequired: false,
    visaType: 'Libre circulación UE',
    processingDays: 'N/A',
    notes: 'Registro administrativo requerido tras 3 meses. Número de sécurité sociale necesario.',
  },
  payroll: { splitRecommended: false, shadowRecommended: true, taxEqRecommended: false },
  requiredDocuments: ['a1_certificate', 'assignment_letter', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'FR-01', severity: 'info', reason: 'Exit tax francés requiere evaluación de plusvalías latentes', affectedModule: 'fiscal', suggestedAction: 'Verificar posición de plusvalías antes de repatriación', evidenceRequired: false },
    { id: 'FR-02', severity: 'warning', reason: 'Si >24 meses, A1 expira — requiere extensión o cambio de cobertura', affectedModule: 'hr', suggestedAction: 'Solicitar extensión A1 con 3 meses de antelación', evidenceRequired: true },
  ],
};

const PACK_ES_PT: CorridorKnowledgePack = {
  id: 'COR-ES-PT-v1.0.0',
  origin: 'ES',
  destination: 'PT',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 92,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS and CDI automated. Portugal NHR regime requires specialized tax advisor.',
  sourceRefs: [
    { label: 'Reglamento CE 883/2004', type: 'treaty_text' },
    { label: 'CDI España-Portugal 1993', type: 'treaty_text' },
  ],
  ss: {
    regime: 'eu_eea_ch',
    framework: 'Reglamento CE 883/2004',
    maxMonths: 24,
    certType: 'A1',
    notes: 'A1 estándar UE. Cobertura sanitaria con EHIC.',
    sources: [{ label: 'Reglamento CE 883/2004', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-Portugal, BOE 07/11/1995',
    keyArticles: ['Art. 15 — Rentas del trabajo', 'Art. 23 — Eliminación doble imposición'],
    withholdingRates: { dividends: '15%', interest: '15%', royalties: '5%', employment: 'Según Art. 15' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: 'Régimen NHR (Non-Habitual Resident) — en revisión desde 2024',
    exitTax: false,
    notes: 'NHR está siendo reformado. Verificar elegibilidad actual. Art. 7.p LIRPF aplicable desde España.',
  },
  immigration: {
    workPermitRequired: false,
    visaType: 'Libre circulación UE',
    processingDays: 'N/A',
    notes: 'NIF portugués necesario. Registro en SEF/AIMA tras 3 meses.',
  },
  payroll: { splitRecommended: false, shadowRecommended: false, taxEqRecommended: false },
  requiredDocuments: ['a1_certificate', 'assignment_letter', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'PT-01', severity: 'warning', reason: 'NHR en revisión — verificar elegibilidad actual', affectedModule: 'fiscal', suggestedAction: 'Consultar con asesor fiscal portugués sobre estado del NHR', evidenceRequired: false },
  ],
};

const PACK_ES_DE: CorridorKnowledgePack = {
  id: 'COR-ES-DE-v1.0.0',
  origin: 'ES',
  destination: 'DE',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 91,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS and CDI automated. German wage tax (Lohnsteuer) requires local payroll processing.',
  sourceRefs: [
    { label: 'Reglamento CE 883/2004', type: 'treaty_text' },
    { label: 'CDI España-Alemania 2011', type: 'treaty_text' },
  ],
  ss: {
    regime: 'eu_eea_ch',
    framework: 'Reglamento CE 883/2004',
    maxMonths: 24,
    certType: 'A1',
    notes: 'A1 estándar. Alemania exige registro en Krankenkasse si se pierde A1.',
    sources: [{ label: 'Reglamento CE 883/2004', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-Alemania, BOE 30/07/2012',
    keyArticles: ['Art. 14 — Rentas del trabajo dependiente', 'Art. 22 — Eliminación doble imposición'],
    withholdingRates: { dividends: '15%', interest: '0%', royalties: '0%', employment: 'Según Art. 14' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: null,
    exitTax: false,
    notes: 'Alemania aplica progresión fiscal alta. Shadow payroll recomendado si >183 días.',
  },
  immigration: {
    workPermitRequired: false,
    visaType: 'Libre circulación UE',
    processingDays: 'N/A',
    notes: 'Anmeldung obligatorio (registro de residencia) en Bürgeramt.',
  },
  payroll: { splitRecommended: false, shadowRecommended: true, taxEqRecommended: true },
  requiredDocuments: ['a1_certificate', 'assignment_letter', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'DE-01', severity: 'warning', reason: 'Lohnsteuer alemán requiere procesamiento local de nómina', affectedModule: 'fiscal', suggestedAction: 'Activar shadow payroll o procesamiento local', evidenceRequired: true },
  ],
};

const PACK_ES_IT: CorridorKnowledgePack = {
  id: 'COR-ES-IT-v1.0.0',
  origin: 'ES',
  destination: 'IT',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 89,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS and CDI automated. Italian impatriate regime (Art. 16 D.Lgs 147/2015) requires specialist.',
  sourceRefs: [
    { label: 'Reglamento CE 883/2004', type: 'treaty_text' },
    { label: 'CDI España-Italia 1977/2015', type: 'treaty_text' },
  ],
  ss: {
    regime: 'eu_eea_ch',
    framework: 'Reglamento CE 883/2004',
    maxMonths: 24,
    certType: 'A1',
    notes: 'A1 estándar. INPS como organismo de SS destino.',
    sources: [{ label: 'Reglamento CE 883/2004', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-Italia, BOE 1980 (protocolo 2015)',
    keyArticles: ['Art. 15 — Rentas del trabajo', 'Art. 23 — Eliminación doble imposición'],
    withholdingRates: { dividends: '15%', interest: '12%', royalties: '8%', employment: 'Según Art. 15' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: 'Régimen impatriados italiano (Art. 16 D.Lgs 147/2015) — 70% exención',
    exitTax: false,
    notes: 'Régimen impatriados muy favorable. Coordinar con Art. 7.p si aplica desde España.',
  },
  immigration: {
    workPermitRequired: false,
    visaType: 'Libre circulación UE',
    processingDays: 'N/A',
    notes: 'Codice Fiscale necesario. Registro en Anagrafe municipal.',
  },
  payroll: { splitRecommended: false, shadowRecommended: false, taxEqRecommended: false },
  requiredDocuments: ['a1_certificate', 'assignment_letter', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'IT-01', severity: 'info', reason: 'Verificar si aplica régimen impatriados italiano (hasta 70% exención)', affectedModule: 'fiscal', suggestedAction: 'Consultar elegibilidad con asesor fiscal italiano', evidenceRequired: false },
  ],
};

const PACK_ES_AD: CorridorKnowledgePack = {
  id: 'COR-ES-AD-v1.0.0',
  origin: 'ES',
  destination: 'AD',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 85,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS bilateral automated. Andorra has limited fiscal transparency — mandatory review for >12 months.',
  sourceRefs: [
    { label: 'Convenio bilateral SS España-Andorra', type: 'treaty_text' },
    { label: 'CDI España-Andorra 2015', type: 'treaty_text' },
  ],
  ss: {
    regime: 'bilateral_agreement',
    framework: 'Convenio bilateral SS España-Andorra',
    maxMonths: 24,
    certType: 'Certificado de desplazamiento bilateral',
    notes: 'Andorra no es UE/EEE. Convenio bilateral específico. No aplica A1.',
    sources: [{ label: 'Convenio bilateral SS España-Andorra', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-Andorra, BOE 2016',
    keyArticles: ['Art. 14 — Rentas del trabajo', 'Art. 22 — Intercambio información'],
    withholdingRates: { dividends: '15%', interest: '5%', royalties: '5%', employment: 'Según Art. 14' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: null,
    exitTax: false,
    notes: 'Andorra tiene IRPF max 10%. Riesgo de consideración como paraíso fiscal a efectos de ciertas normativas españolas.',
  },
  immigration: {
    workPermitRequired: true,
    visaType: 'Autorización de trabajo y residencia andorrana',
    processingDays: '30-60 días',
    notes: 'Autorización requerida por Govern d\'Andorra. Cupo limitado.',
  },
  payroll: { splitRecommended: true, shadowRecommended: true, taxEqRecommended: false },
  requiredDocuments: ['social_security_cert', 'assignment_letter', 'work_permit', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'AD-01', severity: 'review_required', reason: 'Andorra — limitada transparencia fiscal, verificar normas anti-paraíso', affectedModule: 'fiscal', suggestedAction: 'Revisión especializada Art. 7.p + norma anti-paraíso', evidenceRequired: true },
    { id: 'AD-02', severity: 'warning', reason: 'Permiso de trabajo requerido con cupo', affectedModule: 'hr', suggestedAction: 'Iniciar trámite con 60+ días de antelación', evidenceRequired: true },
  ],
};

const PACK_ES_GB: CorridorKnowledgePack = {
  id: 'COR-ES-GB-v1.0.0',
  origin: 'ES',
  destination: 'GB',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 87,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS bilateral post-Brexit automated. UK immigration (Skilled Worker visa) and PAYE require local specialist.',
  sourceRefs: [
    { label: 'Protocolo SS España-UK post-Brexit (TCA)', type: 'treaty_text' },
    { label: 'CDI España-UK 2013', type: 'treaty_text' },
  ],
  ss: {
    regime: 'bilateral_agreement',
    framework: 'Protocolo TCA SS post-Brexit',
    maxMonths: 24,
    certType: 'Certificado de desplazamiento UK',
    notes: 'Post-Brexit: protocolo TCA cubre desplazamiento temporal. No A1 sino certificado específico.',
    sources: [{ label: 'Trade and Cooperation Agreement (TCA) — Social Security', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-UK, BOE 2014',
    keyArticles: ['Art. 14 — Empleo dependiente', 'Art. 21 — Eliminación doble imposición'],
    withholdingRates: { dividends: '15%', interest: '0%', royalties: '0%', employment: 'Según Art. 14' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: 'Remittance basis (non-domiciled status) — en vías de eliminación 2025+',
    exitTax: false,
    notes: 'UK aplica PAYE. Remittance basis está siendo eliminada. Coordinar con CDI.',
  },
  immigration: {
    workPermitRequired: true,
    visaType: 'Skilled Worker Visa / ICT Visa',
    processingDays: '15-60 días',
    notes: 'Post-Brexit requiere sponsorship. Certificate of Sponsorship (CoS) necesario.',
  },
  payroll: { splitRecommended: true, shadowRecommended: true, taxEqRecommended: true },
  requiredDocuments: ['social_security_cert', 'assignment_letter', 'work_permit', 'visa', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'GB-01', severity: 'review_required', reason: 'Post-Brexit: visado obligatorio, verificar CoS y categoría migratoria', affectedModule: 'hr', suggestedAction: 'Confirmar elegibilidad y categoría de visa con immigration advisor', evidenceRequired: true },
    { id: 'GB-02', severity: 'warning', reason: 'PAYE UK requiere registro y procesamiento local', affectedModule: 'fiscal', suggestedAction: 'Registrar empleador en HMRC o usar payroll provider UK', evidenceRequired: true },
  ],
};

const PACK_ES_CH: CorridorKnowledgePack = {
  id: 'COR-ES-CH-v1.0.0',
  origin: 'ES',
  destination: 'CH',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 88,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS under bilateral agreement (ALCP). Swiss cantonal tax varies — automated classification only, not calculation.',
  sourceRefs: [
    { label: 'ALCP Suiza-UE (Acuerdo Libre Circulación)', type: 'treaty_text' },
    { label: 'CDI España-Suiza 1966/2006', type: 'treaty_text' },
  ],
  ss: {
    regime: 'eu_eea_ch',
    framework: 'ALCP — Reglamento CE 883/2004 por extensión',
    maxMonths: 24,
    certType: 'A1',
    notes: 'Suiza aplica Reglamento 883/2004 vía ALCP. A1 válido.',
    sources: [{ label: 'ALCP — Anexo II', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-Suiza, BOE 2003 (protocolo 2006)',
    keyArticles: ['Art. 15 — Rentas del trabajo', 'Art. 23 — Eliminación doble imposición'],
    withholdingRates: { dividends: '15%', interest: '0%', royalties: '5%', employment: 'Según Art. 15' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: 'Forfait fiscal (tributación a tanto alzado) — restringido',
    exitTax: false,
    notes: 'Fiscalidad cantonal variable. Quellensteuer (impuesto en origen) para no-residentes. Coordinar con CDI.',
  },
  immigration: {
    workPermitRequired: true,
    visaType: 'Permiso L (corta duración) / B (residencia)',
    processingDays: '15-30 días',
    notes: 'Ciudadanos UE: permiso simplificado pero obligatorio. Cupos para determinadas categorías.',
  },
  payroll: { splitRecommended: true, shadowRecommended: true, taxEqRecommended: true },
  requiredDocuments: ['a1_certificate', 'assignment_letter', 'work_permit', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'CH-01', severity: 'warning', reason: 'Fiscalidad cantonal variable — cálculo fiscal requiere localización exacta', affectedModule: 'fiscal', suggestedAction: 'Identificar cantón y comuna de trabajo para tax estimation', evidenceRequired: false },
    { id: 'CH-02', severity: 'info', reason: 'Quellensteuer automático para no-residentes', affectedModule: 'fiscal', suggestedAction: 'Confirmar aplicación de retención en origen suiza', evidenceRequired: false },
  ],
};

const PACK_ES_US: CorridorKnowledgePack = {
  id: 'COR-ES-US-v1.0.0',
  origin: 'ES',
  destination: 'US',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 82,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS bilateral and CDI automated. US federal+state tax, visa categories, PE risk require specialist review.',
  sourceRefs: [
    { label: 'Convenio bilateral SS España-EEUU', type: 'treaty_text' },
    { label: 'CDI España-EEUU 1990', type: 'treaty_text' },
    { label: 'IRS Publication 519 — Nonresident Aliens', type: 'secondary_source' },
  ],
  ss: {
    regime: 'bilateral_agreement',
    framework: 'Convenio bilateral SS España-EEUU',
    maxMonths: 60,
    certType: 'Certificate of Coverage (CoC)',
    notes: 'Hasta 5 años con CoC. FICA exemption durante vigencia. Totalización de períodos.',
    sources: [{ label: 'SSA Totalization Agreement — Spain', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-EEUU, BOE 1990',
    keyArticles: ['Art. 15 — Dependent personal services', 'Art. 23 — Relief from double taxation'],
    withholdingRates: { dividends: '15%', interest: '10%', royalties: '10%', employment: 'Según Art. 15' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: null,
    exitTax: true,
    notes: 'EEUU grava por ciudadanía Y residencia. State tax varía (0%-13.3%). Federal + State + City possible. IRS compliance obligatorio.',
  },
  immigration: {
    workPermitRequired: true,
    visaType: 'L-1 (ICT) / E-2 (Treaty Investor) / H-1B',
    processingDays: '30-180 días',
    notes: 'Visa obligatoria. L-1 para ICT. Petition + consular processing. Premium processing disponible (15 días).',
  },
  payroll: { splitRecommended: true, shadowRecommended: true, taxEqRecommended: true },
  requiredDocuments: ['social_security_cert', 'assignment_letter', 'visa', 'work_permit', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'US-01', severity: 'critical_review_required', reason: 'US tax compliance (federal+state) requiere asesor fiscal US', affectedModule: 'fiscal', suggestedAction: 'Contratar tax advisor con experiencia US expat tax', evidenceRequired: true },
    { id: 'US-02', severity: 'review_required', reason: 'PE risk: presencia de empleado puede crear establecimiento permanente en EEUU', affectedModule: 'legal', suggestedAction: 'Evaluar PE risk con asesor legal especializado', evidenceRequired: true },
    { id: 'US-03', severity: 'warning', reason: 'Visa category determina condiciones de trabajo — verificar categoría migratoria', affectedModule: 'hr', suggestedAction: 'Confirmar categoría de visa y limitaciones laborales', evidenceRequired: true },
  ],
};

const PACK_ES_MX: CorridorKnowledgePack = {
  id: 'COR-ES-MX-v1.0.0',
  origin: 'ES',
  destination: 'MX',
  version: '1.0.0',
  status: 'current',
  confidenceScore: 80,
  lastReviewed: '2026-04-01',
  reviewOwner: 'HR-Legal-Mobility',
  automationBoundaryNote: 'SS bilateral and CDI automated. Mexican PTU, local labor law, and SAT compliance require local specialist.',
  sourceRefs: [
    { label: 'Convenio bilateral SS España-México', type: 'treaty_text' },
    { label: 'CDI España-México 1992/2017', type: 'treaty_text' },
  ],
  ss: {
    regime: 'bilateral_agreement',
    framework: 'Convenio bilateral SS España-México',
    maxMonths: 24,
    certType: 'Certificado de desplazamiento bilateral',
    notes: 'Desplazamiento temporal con certificado. Posible extensión previa solicitud al IMSS.',
    sources: [{ label: 'Convenio bilateral SS España-México', type: 'treaty_text' }],
  },
  cdi: {
    hasCDI: true,
    treatyRef: 'CDI España-México, BOE 2017 (protocolo modificatorio)',
    keyArticles: ['Art. 15 — Servicios personales dependientes', 'Art. 23 — Eliminación doble imposición'],
    withholdingRates: { dividends: '10%', interest: '10%', royalties: '10%', employment: 'Según Art. 15' },
  },
  tax: {
    residenceDaysThreshold: 183,
    art7pApplicable: true,
    beckhamEquivalent: null,
    exitTax: false,
    notes: 'México grava renta mundial de residentes. ISR sobre nómina. PTU (reparto de utilidades) puede aplicar. SAT compliance obligatorio.',
  },
  immigration: {
    workPermitRequired: true,
    visaType: 'Visa de residente temporal con permiso de trabajo',
    processingDays: '30-90 días',
    notes: 'Oferta de empleo ante INM. Visa consular + canje en México.',
  },
  payroll: { splitRecommended: true, shadowRecommended: true, taxEqRecommended: true },
  requiredDocuments: ['social_security_cert', 'assignment_letter', 'work_permit', 'visa', 'tax_residency_cert'],
  reviewTriggers: [
    { id: 'MX-01', severity: 'review_required', reason: 'ISR mexicano + PTU requiere asesoría fiscal local', affectedModule: 'fiscal', suggestedAction: 'Contratar asesor fiscal mexicano para ISR y PTU', evidenceRequired: true },
    { id: 'MX-02', severity: 'warning', reason: 'Ley Federal del Trabajo mexicana impone obligaciones laborales específicas', affectedModule: 'legal', suggestedAction: 'Verificar cumplimiento LFT con abogado laboralista mexicano', evidenceRequired: false },
  ],
};

// ── Registry ──

export const PHASE1_CORRIDOR_PACKS: CorridorKnowledgePack[] = [
  PACK_ES_FR,
  PACK_ES_PT,
  PACK_ES_DE,
  PACK_ES_IT,
  PACK_ES_AD,
  PACK_ES_GB,
  PACK_ES_CH,
  PACK_ES_US,
  PACK_ES_MX,
];

/**
 * Look up a corridor pack by origin+destination.
 * Returns null if no pack exists (out of Phase 1 scope).
 */
export function getCorridorPack(origin: string, destination: string): CorridorKnowledgePack | null {
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  return PHASE1_CORRIDOR_PACKS.find(p => p.origin === o && p.destination === d) ?? null;
}

/**
 * List all available corridor IDs.
 */
export function listAvailableCorridors(): string[] {
  return PHASE1_CORRIDOR_PACKS.map(p => `${p.origin}↔${p.destination}`);
}
