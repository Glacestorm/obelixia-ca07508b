/**
 * Competitive Intelligence & Market Penetration Analysis
 * Auto-updating competitive analysis with disruptive features detection
 */

// ============================================
// COMPETITOR DETAILED PROFILES (Updated 2025-2026)
// ============================================

export interface CompetitorDetailedProfile {
  name: string;
  fullName: string;
  marketCap: string;
  annualRevenue: string;
  employeeCount: string;
  pricing: {
    starter: string;
    professional: string;
    enterprise: string;
  };
  coreStrengths: string[];
  coreWeaknesses: string[];
  aiCapabilities: string[];
  missingFeatures: string[];
  marketPosition: string;
  targetSegment: string;
}

// CRM COMPETITORS 2025-2026
export const CRM_COMPETITORS_DETAILED: CompetitorDetailedProfile[] = [
  {
    name: 'Salesforce',
    fullName: 'Salesforce Sales Cloud + Einstein',
    marketCap: '$290B',
    annualRevenue: '$34.9B (FY2025)',
    employeeCount: '73,000+',
    pricing: {
      starter: '€25/usuario/mes',
      professional: '€80/usuario/mes',
      enterprise: '€165/usuario/mes + Einstein €50'
    },
    coreStrengths: [
      'Lider absoluto de mercado CRM',
      'Einstein AI con GPT integrado',
      'AppExchange con 7,000+ apps',
      'Ecosistema de partners masivo',
      'Data Cloud unificado',
    ],
    coreWeaknesses: [
      'Precio muy elevado (TCO €300-500/usuario/mes)',
      'Complejidad implementacion (6-18 meses)',
      'Requiere consultores certificados',
      'Fragmentacion de productos',
      'Lock-in contractual agresivo',
    ],
    aiCapabilities: [
      'Einstein GPT (generativo)',
      'Einstein Prediction Builder',
      'Einstein Activity Capture',
      'Einstein Lead Scoring',
    ],
    missingFeatures: [
      'Suite ERP nativa (requiere integraciones)',
      'Legal CLM integrado',
      'Fiscal multi-jurisdiccion',
      'Voz bidireccional nativa',
    ],
    marketPosition: 'Lider Enterprise Global',
    targetSegment: 'Enterprise 500+ empleados',
  },
  {
    name: 'HubSpot',
    fullName: 'HubSpot CRM Suite',
    marketCap: '$28B',
    annualRevenue: '$2.3B (2025)',
    employeeCount: '8,000+',
    pricing: {
      starter: '€20/usuario/mes',
      professional: '€100/usuario/mes',
      enterprise: '€150/usuario/mes'
    },
    coreStrengths: [
      'Freemium potente para SMB',
      'Marketing Hub integrado',
      'Excelente UX/UI',
      'Documentacion y Academy',
      'Inbound marketing nativo',
    ],
    coreWeaknesses: [
      'Limitado para enterprise complejo',
      'Personalizacion restringida',
      'Reporting avanzado de pago',
      'Sin ERP/Legal/Fiscal',
      'IA basica vs competencia',
    ],
    aiCapabilities: [
      'ChatSpot (asistente conversacional)',
      'Content Assistant (generacion)',
      'Predictive Lead Scoring',
    ],
    missingFeatures: [
      'Multi-workspace enterprise',
      'SLA avanzado',
      'Integracion ERP nativa',
      'Legal compliance',
      'Voz bidireccional',
    ],
    marketPosition: 'Lider SMB/Mid-Market',
    targetSegment: 'SMB 10-200 empleados',
  },
  {
    name: 'Pipedrive',
    fullName: 'Pipedrive CRM',
    marketCap: 'Private (~$1.5B valuation)',
    annualRevenue: '$200M+ (2025)',
    employeeCount: '1,000+',
    pricing: {
      starter: '€14/usuario/mes',
      professional: '€34/usuario/mes',
      enterprise: '€99/usuario/mes'
    },
    coreStrengths: [
      'Pipeline visual excepcional',
      'Precio muy competitivo',
      'Facil de usar',
      'Mobile-first',
    ],
    coreWeaknesses: [
      'Sin marketing automation',
      'IA muy limitada',
      'Solo ventas (sin servicio)',
      'Personalizacion basica',
      'Sin multi-workspace',
    ],
    aiCapabilities: [
      'AI Sales Assistant basico',
      'Email suggestions',
    ],
    missingFeatures: [
      'Omnichannel completo',
      'Analisis sentimiento',
      'Integracion ERP',
      'Legal/Fiscal',
      'Colaboracion realtime',
    ],
    marketPosition: 'Especialista Pipeline SMB',
    targetSegment: 'Micro-SMB 1-50 empleados',
  },
  {
    name: 'Zoho',
    fullName: 'Zoho CRM Plus',
    marketCap: 'Private (~$15B valuation)',
    annualRevenue: '$1B+ (2025)',
    employeeCount: '15,000+',
    pricing: {
      starter: '€14/usuario/mes',
      professional: '€23/usuario/mes',
      enterprise: '€40/usuario/mes'
    },
    coreStrengths: [
      'Suite muy completa (45+ apps)',
      'Precio agresivo',
      'Zia AI potente',
      'Self-hosted disponible',
    ],
    coreWeaknesses: [
      'UX inconsistente entre apps',
      'Soporte lento',
      'Integraciones terceros limitadas',
      'Documentacion fragmentada',
    ],
    aiCapabilities: [
      'Zia AI (asistente conversacional)',
      'Zia Prediction',
      'Zia Voice',
      'Sentiment Analysis',
    ],
    missingFeatures: [
      'ERP enterprise-grade',
      'Legal CLM avanzado',
      'Fiscal multi-jurisdiccion',
      'Colaboracion realtime avanzada',
    ],
    marketPosition: 'Value Player Global',
    targetSegment: 'SMB precio-sensitivo',
  },
];

// ERP COMPETITORS 2025-2026
export const ERP_COMPETITORS_DETAILED: CompetitorDetailedProfile[] = [
  {
    name: 'SAP',
    fullName: 'SAP SuccessFactors + S/4HANA',
    marketCap: '$250B',
    annualRevenue: '$35B (2025)',
    employeeCount: '107,000+',
    pricing: {
      starter: 'N/A (solo enterprise)',
      professional: '€50-80/usuario/mes HCM',
      enterprise: '€150-300/usuario/mes (suite completa)'
    },
    coreStrengths: [
      'Suite ERP mas completa del mundo',
      'Localizaciones 100+ paises',
      'SuccessFactors HCM lider',
      'Industria 4.0 / IoT',
      'IA con Joule assistant',
    ],
    coreWeaknesses: [
      'Coste total muy elevado (€500K-5M implementacion)',
      'Complejidad extrema',
      'Implementacion 12-36 meses',
      'Rigidez arquitectura',
      'Requiere equipo IT dedicado',
    ],
    aiCapabilities: [
      'SAP Joule (asistente IA)',
      'SAP Business AI',
      'Predictive Analytics',
      'Machine Learning foundation',
    ],
    missingFeatures: [
      'CRM nativo moderno (adquisicion SAP CX)',
      'Legal CLM integrado',
      'Simplicidad SMB',
      'Time-to-value rapido',
    ],
    marketPosition: 'Lider ERP Enterprise Global',
    targetSegment: 'Enterprise 1000+ empleados',
  },
  {
    name: 'Workday',
    fullName: 'Workday HCM + Financials',
    marketCap: '$65B',
    annualRevenue: '$7.3B (FY2025)',
    employeeCount: '18,500+',
    pricing: {
      starter: 'N/A',
      professional: '€100-150/usuario/mes',
      enterprise: '€200-400/usuario/mes'
    },
    coreStrengths: [
      'HCM cloud-native lider',
      'UX moderna y consistente',
      'Skills Cloud innovador',
      'Financial planning potente',
      'Extensibilidad platform',
    ],
    coreWeaknesses: [
      'Fiscal muy limitado (US-centric)',
      'Sin legal nativo',
      'Precio premium',
      'Menor presencia Europa',
      'Personalizacion costosa',
    ],
    aiCapabilities: [
      'Workday AI/ML',
      'Skills Cloud Intelligence',
      'Talent Optimization',
      'Financial Insights',
    ],
    missingFeatures: [
      'Fiscal europeo (SII, IVA)',
      'Legal CLM',
      'CRM integrado',
      'Multi-jurisdiccion fiscal',
    ],
    marketPosition: 'Lider HCM Cloud',
    targetSegment: 'Enterprise 500-10,000 empleados',
  },
  {
    name: 'Oracle',
    fullName: 'Oracle Cloud HCM + Financials',
    marketCap: '$350B',
    annualRevenue: '$53B (FY2025)',
    employeeCount: '150,000+',
    pricing: {
      starter: 'N/A',
      professional: '€80-120/usuario/mes',
      enterprise: '€150-250/usuario/mes'
    },
    coreStrengths: [
      'Suite cloud muy amplia',
      'AI/ML Oracle avanzado',
      'Base datos lider',
      'Localizaciones globales',
      'Fusion Applications moderno',
    ],
    coreWeaknesses: [
      'Complejidad SAP-like',
      'UX legacy en partes',
      'Implementacion larga',
      'Fragmentacion productos',
      'Coste elevado',
    ],
    aiCapabilities: [
      'Oracle AI',
      'Autonomous Database',
      'Digital Assistant',
      'Adaptive Intelligent Apps',
    ],
    missingFeatures: [
      'CRM moderno (Fusion CX legacy)',
      'Legal CLM nativo',
      'Simplicidad mid-market',
    ],
    marketPosition: 'Challenger Enterprise',
    targetSegment: 'Enterprise 500+ empleados',
  },
  {
    name: 'Icertis',
    fullName: 'Icertis Contract Intelligence',
    marketCap: 'Private (~$5B valuation)',
    annualRevenue: '$400M+ (2025)',
    employeeCount: '2,500+',
    pricing: {
      starter: 'N/A',
      professional: '€75-100/usuario/mes',
      enterprise: '€150-250/usuario/mes'
    },
    coreStrengths: [
      'CLM lider mundial Gartner',
      'AI contratos excepcional',
      'Integraciones enterprise',
      'Compliance avanzado',
    ],
    coreWeaknesses: [
      'Solo CLM (no HCM, no Fiscal)',
      'Precio elevado',
      'Complejidad configuracion',
      'Sin suite integrada',
    ],
    aiCapabilities: [
      'ICI AI',
      'Contract Intelligence',
      'Risk Scoring',
      'Obligation Management',
    ],
    missingFeatures: [
      'HCM completo',
      'Fiscal',
      'CRM',
      'Suite integrada',
    ],
    marketPosition: 'Lider CLM Enterprise',
    targetSegment: 'Enterprise Legal Teams',
  },
];

// ============================================
// DISRUPTIVE FEATURES ANALYSIS
// ============================================

export interface DisruptiveFeature {
  name: string;
  category: string;
  description: string;
  competitorStatus: {
    salesforce: boolean;
    hubspot: boolean;
    sap: boolean;
    workday: boolean;
    oracle: boolean;
    icertis: boolean;
  };
  obelixiaStatus: 'complete' | 'innovation' | 'roadmap';
  disruptionLevel: 'high' | 'very_high' | 'game_changer';
  marketAdvantage: string;
  estimatedValue: number;
}

export const DISRUPTIVE_FEATURES: DisruptiveFeature[] = [
  // IA y Agentes Autonomos
  {
    name: 'Orquestador Cross-Module IA',
    category: 'IA Disruptiva',
    description: 'Coordinacion agentes IA entre CRM, RRHH, Legal y Fiscal con contexto compartido',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: false },
    obelixiaStatus: 'innovation',
    disruptionLevel: 'game_changer',
    marketAdvantage: 'Unico en mercado - Workflow inteligente cross-suite',
    estimatedValue: 150000,
  },
  {
    name: 'Copiloto Autonomo 3 Niveles',
    category: 'IA Disruptiva',
    description: 'Agente con autonomia configurable: asesor, semi-autonomo, completamente autonomo',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: false },
    obelixiaStatus: 'innovation',
    disruptionLevel: 'game_changer',
    marketAdvantage: 'Control granular de autonomia IA - Confianza enterprise',
    estimatedValue: 120000,
  },
  {
    name: 'Voz Bidireccional con IA',
    category: 'IA Disruptiva',
    description: 'Speech-to-Text y Text-to-Speech nativo con ElevenLabs en todos los modulos',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: false },
    obelixiaStatus: 'innovation',
    disruptionLevel: 'very_high',
    marketAdvantage: 'Interaccion natural por voz en ERP/CRM',
    estimatedValue: 80000,
  },
  
  // Blockchain y Web3
  {
    name: 'Credenciales Blockchain Verificables',
    category: 'Blockchain',
    description: 'DIDs y Verifiable Credentials (W3C) para certificaciones, titulos, historial laboral',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: false },
    obelixiaStatus: 'innovation',
    disruptionLevel: 'game_changer',
    marketAdvantage: 'Verificacion instantanea sin intermediarios',
    estimatedValue: 100000,
  },
  {
    name: 'Smart Legal Contracts',
    category: 'Blockchain',
    description: 'Contratos con clausulas auto-ejecutables, penalizaciones automaticas, renovaciones',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: false },
    obelixiaStatus: 'innovation',
    disruptionLevel: 'very_high',
    marketAdvantage: 'Automatizacion contractual sin precedentes',
    estimatedValue: 90000,
  },
  
  // Legal Validation
  {
    name: 'Legal Validation Gateway',
    category: 'Compliance Transversal',
    description: 'Bloqueo automatico de operaciones de alto riesgo legal en cualquier modulo',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: false },
    obelixiaStatus: 'innovation',
    disruptionLevel: 'game_changer',
    marketAdvantage: 'Prevencion de riesgos legales proactiva',
    estimatedValue: 110000,
  },
  {
    name: 'Predictive Litigation Analytics',
    category: 'Legal IA',
    description: 'Prediccion probabilidad exito en litigios con estimacion costes',
    competitorStatus: { salesforce: false, hubspot: false, sap: false, workday: false, oracle: false, icertis: true },
    obelixiaStatus: 'complete',
    disruptionLevel: 'very_high',
    marketAdvantage: 'Decisiones legales basadas en datos predictivos',
    estimatedValue: 85000,
  },
  
  // Suite Integrada
  {
    name: 'CRM-ERP Nativo Unificado',
    category: 'Integracion',
    description: 'Quote-to-Cash completo sin integraciones terceros',
    competitorStatus: { salesforce: false, hubspot: false, sap: true, workday: false, oracle: true, icertis: false },
    obelixiaStatus: 'complete',
    disruptionLevel: 'very_high',
    marketAdvantage: 'Eliminacion silos CRM-ERP',
    estimatedValue: 75000,
  },
  {
    name: 'Customer 360 Real',
    category: 'Integracion',
    description: 'Vista cliente con datos CRM + contabilidad + legal en tiempo real',
    competitorStatus: { salesforce: true, hubspot: false, sap: true, workday: false, oracle: true, icertis: false },
    obelixiaStatus: 'complete',
    disruptionLevel: 'high',
    marketAdvantage: 'Vision holistica cliente con riesgo financiero y legal',
    estimatedValue: 65000,
  },
  
  // Fiscal
  {
    name: 'Multi-Jurisdiccion 20+ Paises',
    category: 'Fiscal Global',
    description: 'Soporte nativo ES, AD, UK, UAE, US (Delaware/Wyoming), EU OSS',
    competitorStatus: { salesforce: false, hubspot: false, sap: true, workday: false, oracle: true, icertis: false },
    obelixiaStatus: 'complete',
    disruptionLevel: 'high',
    marketAdvantage: 'Expansion internacional sin fricciones',
    estimatedValue: 95000,
  },
  {
    name: 'SII Espana Automatizado',
    category: 'Fiscal Espana',
    description: 'Suministro Inmediato Informacion con tareas correccion IA',
    competitorStatus: { salesforce: false, hubspot: false, sap: true, workday: false, oracle: true, icertis: false },
    obelixiaStatus: 'complete',
    disruptionLevel: 'high',
    marketAdvantage: 'Compliance AEAT automatico',
    estimatedValue: 55000,
  },
  
  // HCM Avanzado
  {
    name: 'Skills Ontology + Marketplace',
    category: 'Talento',
    description: 'Taxonomia competencias multinivel con bolsa interna, gigs, mentoring',
    competitorStatus: { salesforce: false, hubspot: false, sap: true, workday: true, oracle: false, icertis: false },
    obelixiaStatus: 'complete',
    disruptionLevel: 'high',
    marketAdvantage: 'Movilidad interna basada en skills',
    estimatedValue: 70000,
  },
  {
    name: 'Wellbeing + Burnout Prediction',
    category: 'Employee Experience',
    description: 'Dashboard bienestar con prediccion burnout Maslach',
    competitorStatus: { salesforce: false, hubspot: false, sap: true, workday: true, oracle: false, icertis: false },
    obelixiaStatus: 'complete',
    disruptionLevel: 'high',
    marketAdvantage: 'Prevencion proactiva salud mental',
    estimatedValue: 60000,
  },
];

// ============================================
// MARKET PENETRATION SECTORS ANALYSIS
// ============================================

export interface SectorPenetrationAnalysis {
  sector: string;
  sectorCode: string;
  marketSize: string;
  growthRate: string;
  crmNeed: 'high' | 'very_high' | 'critical';
  erpNeed: 'high' | 'very_high' | 'critical';
  regulatoryComplexity: 'low' | 'medium' | 'high' | 'very_high';
  competitionLevel: 'low' | 'medium' | 'high' | 'saturated';
  obelixiaAdvantage: string[];
  priorityScore: number; // 1-100
  estimatedDeals: string;
  averageDealSize: string;
  salesCycleMonths: number;
  keyPainPoints: string[];
  recommendedApproach: string;
}

export const SECTOR_PENETRATION_ANALYSIS: SectorPenetrationAnalysis[] = [
  // TIER 1 - Highest Priority
  {
    sector: 'Servicios Profesionales',
    sectorCode: 'CNAE 69-71',
    marketSize: '€15B (Espana)',
    growthRate: '+8% anual',
    crmNeed: 'very_high',
    erpNeed: 'very_high',
    regulatoryComplexity: 'high',
    competitionLevel: 'medium',
    obelixiaAdvantage: [
      'Suite HR-Legal-Fiscal integrada ideal',
      'CLM para contratos clientes',
      'Multi-workspace por cliente',
      'Compliance sectorial automatico',
    ],
    priorityScore: 95,
    estimatedDeals: '500+ firmas medianas',
    averageDealSize: '€45,000-120,000/ano',
    salesCycleMonths: 3,
    keyPainPoints: [
      'Gestion fragmentada clientes-proyectos',
      'Control horario y facturacion',
      'Compliance multi-cliente',
      'Rotacion talento',
    ],
    recommendedApproach: 'Partner con colegios profesionales + caso exito asesorias/abogados',
  },
  {
    sector: 'Banca y Servicios Financieros',
    sectorCode: 'CNAE 64-66',
    marketSize: '€45B (Espana)',
    growthRate: '+5% anual',
    crmNeed: 'critical',
    erpNeed: 'very_high',
    regulatoryComplexity: 'very_high',
    competitionLevel: 'high',
    obelixiaAdvantage: [
      'Compliance DORA/MiFID integrado',
      'Legal validation gateway bancario',
      'SII y reporting regulatorio',
      'Customer 360 con riesgo',
    ],
    priorityScore: 92,
    estimatedDeals: '50+ entidades medianas',
    averageDealSize: '€150,000-500,000/ano',
    salesCycleMonths: 9,
    keyPainPoints: [
      'Regulacion creciente (DORA, MiFID)',
      'Legacy systems costosos',
      'Experiencia cliente digital',
      'Costes operativos elevados',
    ],
    recommendedApproach: 'POC con fintech/neobancos + expansion a banca tradicional',
  },
  {
    sector: 'Seguros',
    sectorCode: 'CNAE 65',
    marketSize: '€65B primas (Espana)',
    growthRate: '+4% anual',
    crmNeed: 'critical',
    erpNeed: 'very_high',
    regulatoryComplexity: 'very_high',
    competitionLevel: 'medium',
    obelixiaAdvantage: [
      'Compliance Solvencia II',
      'CLM polizas y siniestros',
      'Omnichannel agentes/corredores',
      'Analytics predictivo fraude',
    ],
    priorityScore: 90,
    estimatedDeals: '100+ aseguradoras/corredores',
    averageDealSize: '€80,000-300,000/ano',
    salesCycleMonths: 6,
    keyPainPoints: [
      'Digitalizacion canal agentes',
      'Gestion siniestros eficiente',
      'Compliance regulatorio',
      'Retencion cartera',
    ],
    recommendedApproach: 'Partner con corredurias lider + verticalizacion seguros',
  },
  
  // TIER 2 - High Priority
  {
    sector: 'Construccion e Inmobiliario',
    sectorCode: 'CNAE 41-43, 68',
    marketSize: '€120B (Espana)',
    growthRate: '+6% anual',
    crmNeed: 'very_high',
    erpNeed: 'very_high',
    regulatoryComplexity: 'high',
    competitionLevel: 'low',
    obelixiaAdvantage: [
      'Gestion subcontratas y PRL',
      'Contratos obra y garantias',
      'Control costes proyecto',
      'CRM promotoras',
    ],
    priorityScore: 88,
    estimatedDeals: '2000+ constructoras medianas',
    averageDealSize: '€35,000-90,000/ano',
    salesCycleMonths: 4,
    keyPainPoints: [
      'Control subcontratistas',
      'Cumplimiento PRL',
      'Gestion documentacion obra',
      'Facturacion certificaciones',
    ],
    recommendedApproach: 'Integracion con software obra + enfoque PRL',
  },
  {
    sector: 'Retail y Distribucion',
    sectorCode: 'CNAE 47',
    marketSize: '€250B (Espana)',
    growthRate: '+7% anual',
    crmNeed: 'critical',
    erpNeed: 'high',
    regulatoryComplexity: 'medium',
    competitionLevel: 'high',
    obelixiaAdvantage: [
      'Omnichannel retail',
      'Gestion plantilla retail',
      'Analisis sentimiento cliente',
      'Prediccion demanda',
    ],
    priorityScore: 82,
    estimatedDeals: '500+ cadenas medianas',
    averageDealSize: '€50,000-150,000/ano',
    salesCycleMonths: 5,
    keyPainPoints: [
      'Omnicanalidad real',
      'Gestion turnos y temporalidad',
      'Fidelizacion cliente',
      'Optimizacion inventario',
    ],
    recommendedApproach: 'Caso exito retail especializado + integracion POS',
  },
  {
    sector: 'Salud y Farmaceutico',
    sectorCode: 'CNAE 86, 21',
    marketSize: '€130B (Espana)',
    growthRate: '+9% anual',
    crmNeed: 'very_high',
    erpNeed: 'very_high',
    regulatoryComplexity: 'very_high',
    competitionLevel: 'medium',
    obelixiaAdvantage: [
      'Compliance sanitario',
      'Gestion personal sanitario',
      'CRM pacientes/prescriptores',
      'Trazabilidad regulatory',
    ],
    priorityScore: 85,
    estimatedDeals: '1000+ clinicas/laboratorios',
    averageDealSize: '€60,000-200,000/ano',
    salesCycleMonths: 7,
    keyPainPoints: [
      'Compliance FDA/EMA',
      'Gestion turnos 24/7',
      'Relacion prescriptores',
      'Digitalizacion historiales',
    ],
    recommendedApproach: 'Verticalizacion clinicas privadas + compliance pharma',
  },
  
  // TIER 3 - Medium Priority
  {
    sector: 'Tecnologia y Software',
    sectorCode: 'CNAE 62',
    marketSize: '€35B (Espana)',
    growthRate: '+12% anual',
    crmNeed: 'very_high',
    erpNeed: 'high',
    regulatoryComplexity: 'low',
    competitionLevel: 'saturated',
    obelixiaAdvantage: [
      'Pipeline SaaS optimizado',
      'Gestion equipos remotos',
      'Integracion DevOps',
      'Revenue Operations',
    ],
    priorityScore: 75,
    estimatedDeals: '1000+ startups/scale-ups',
    averageDealSize: '€25,000-80,000/ano',
    salesCycleMonths: 2,
    keyPainPoints: [
      'Pipeline predecible',
      'Churn control',
      'Talento escaso',
      'Scaling operaciones',
    ],
    recommendedApproach: 'Product-led growth + integraciones tech stack',
  },
  {
    sector: 'Manufactura Industrial',
    sectorCode: 'CNAE 10-33',
    marketSize: '€180B (Espana)',
    growthRate: '+4% anual',
    crmNeed: 'high',
    erpNeed: 'critical',
    regulatoryComplexity: 'high',
    competitionLevel: 'high',
    obelixiaAdvantage: [
      'HR industria (turnos, PRL)',
      'Fiscal Intrastat',
      'Legal contratos suministro',
      'Multi-planta',
    ],
    priorityScore: 70,
    estimatedDeals: '3000+ fabricantes medianos',
    averageDealSize: '€40,000-120,000/ano',
    salesCycleMonths: 6,
    keyPainPoints: [
      'Gestion plantilla industrial',
      'Compliance PRL estricto',
      'Intrastat y aduanas',
      'Contratos suministro',
    ],
    recommendedApproach: 'Partner con ERP industriales + modulo HR/Legal',
  },
  {
    sector: 'Educacion y Formacion',
    sectorCode: 'CNAE 85',
    marketSize: '€50B (Espana)',
    growthRate: '+6% anual',
    crmNeed: 'high',
    erpNeed: 'very_high',
    regulatoryComplexity: 'high',
    competitionLevel: 'low',
    obelixiaAdvantage: [
      'Gestion docentes y contratos',
      'CRM captacion alumnos',
      'Compliance educativo',
      'Certificaciones verificables',
    ],
    priorityScore: 78,
    estimatedDeals: '500+ centros privados',
    averageDealSize: '€30,000-80,000/ano',
    salesCycleMonths: 4,
    keyPainPoints: [
      'Captacion alumnos digital',
      'Gestion plantilla docente',
      'Compliance titulaciones',
      'Facturacion servicios',
    ],
    recommendedApproach: 'Credenciales blockchain como diferenciador',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTopPrioritySectors(limit: number = 5): SectorPenetrationAnalysis[] {
  return [...SECTOR_PENETRATION_ANALYSIS]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

export function getDisruptiveAdvantages(): DisruptiveFeature[] {
  return DISRUPTIVE_FEATURES.filter(f => 
    f.obelixiaStatus === 'innovation' || f.obelixiaStatus === 'complete'
  );
}

export function getCompetitorGaps(scope: 'crm' | 'erp' | 'combined'): string[] {
  const gaps: string[] = [];
  
  DISRUPTIVE_FEATURES.forEach(feature => {
    const hasNoCompetitor = !Object.values(feature.competitorStatus).some(v => v);
    if (hasNoCompetitor && feature.obelixiaStatus !== 'roadmap') {
      gaps.push(`${feature.name}: ${feature.marketAdvantage}`);
    }
  });
  
  return gaps;
}

export function getTotalDisruptiveValue(): number {
  return DISRUPTIVE_FEATURES
    .filter(f => f.obelixiaStatus !== 'roadmap')
    .reduce((sum, f) => sum + f.estimatedValue, 0);
}
