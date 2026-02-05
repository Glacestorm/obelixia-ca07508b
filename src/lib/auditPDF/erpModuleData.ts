/**
 * ERP Module Data - Auto-updating feature inventory
 * Re-exports from existing enterpriseModulesAuditPDF for HR, Fiscal, Legal
 */

import { ModuleFeature, CompetitorFeature, CompetitorProfile } from './types';

// ============================================
// HR MODULE FEATURES
// ============================================

export const HR_FEATURES: ModuleFeature[] = [
  // Talent
  { name: 'Gestion de Empleados', description: 'Fichas completas con 4 pestanas (General, Laboral, Documentos, Accesos)', status: 'complete', category: 'Talento' },
  { name: 'Reclutamiento IA', description: 'Portal con scoring automatico de candidatos usando Gemini 2.5', status: 'complete', category: 'Talento', edgeFunctions: ['erp-hr-recruitment-agent'] },
  { name: 'Onboarding Adaptativo', description: 'Proceso por CNAE con tareas por fases y checklist', status: 'complete', category: 'Talento', edgeFunctions: ['erp-hr-onboarding-agent'] },
  { name: 'Offboarding Inteligente', description: 'Gestion optimizada con analisis legal previo', status: 'complete', category: 'Talento', edgeFunctions: ['erp-hr-offboarding-agent'] },
  
  // Operations
  { name: 'Nominas', description: 'Calculo completo con IRPF, SS, extras, anticipos', status: 'complete', category: 'Operaciones' },
  { name: 'Recalculo Nominas', description: 'Validacion contra convenios colectivos con IA', status: 'complete', category: 'Operaciones', edgeFunctions: ['erp-hr-payroll-recalculation'] },
  { name: 'Finiquitos', description: 'Sistema 3 niveles validacion (IA, Juridico, RRHH)', status: 'complete', category: 'Operaciones' },
  { name: 'Seguridad Social', description: 'Integracion SILTRA, RED, certificados A1, SEPE', status: 'complete', category: 'Operaciones' },
  { name: 'Vacaciones', description: 'Solicitudes con aprobacion multinivel y calendario', status: 'complete', category: 'Operaciones' },
  { name: 'Contratos', description: 'Plantillas por jurisdiccion (ES, AD, EU)', status: 'complete', category: 'Operaciones' },
  { name: 'Sindicatos', description: 'Credito horario Art.68 ET, elecciones, negociacion', status: 'complete', category: 'Operaciones' },
  { name: 'Documentos OCR', description: 'Clasificacion automatica con IA y extraccion', status: 'complete', category: 'Operaciones' },
  { name: 'Organizacion', description: 'Organigramas visuales interactivos', status: 'complete', category: 'Operaciones' },
  { name: 'Vigilancia Normativa', description: 'Monitoreo BOE/BOPA/EUR-Lex diario', status: 'complete', category: 'Operaciones', edgeFunctions: ['erp-hr-compliance-monitor'] },
  
  // Development
  { name: 'Desempeno 9-Box', description: 'Evaluaciones con matriz 9-Box Grid', status: 'complete', category: 'Desarrollo', edgeFunctions: ['erp-hr-performance-agent'] },
  { name: 'Formacion', description: 'Catalogo por CNAE con tracking', status: 'complete', category: 'Desarrollo' },
  { name: 'Analytics Predictivos', description: 'Flight Risk, eNPS, Compa-Ratio', status: 'complete', category: 'Desarrollo', edgeFunctions: ['erp-hr-analytics-intelligence'] },
  { name: 'Beneficios', description: 'Flex remuneration y retribucion flexible', status: 'complete', category: 'Desarrollo' },
  { name: 'PRL', description: 'Auditorias por sector, evaluacion riesgos', status: 'complete', category: 'Desarrollo' },
  
  // Compliance Legal
  { name: 'Canal Denuncias (Whistleblower)', description: 'Directiva EU 2019/1937 completa con anonimato', status: 'complete', category: 'Compliance Legal', edgeFunctions: ['erp-hr-whistleblower-agent'] },
  { name: 'Plan de Igualdad', description: 'RD 901/2020, diagnostico y auditoria retributiva', status: 'complete', category: 'Compliance Legal' },
  { name: 'Registro Horario', description: 'Art. 34.9 ET, multi-canal, desconexion digital', status: 'complete', category: 'Compliance Legal' },
  
  // Talent Advanced
  { name: 'Skills Ontology', description: 'Taxonomia competencias multinivel con gaps', status: 'complete', category: 'Gestion Talento Avanzada', edgeFunctions: ['erp-hr-talent-skills-agent'] },
  { name: 'Talent Marketplace', description: 'Bolsa interna con matching IA, gigs, mentoring', status: 'complete', category: 'Gestion Talento Avanzada' },
  { name: 'Sucesion y Carrera', description: 'Planes sucesion, career paths, talent pools', status: 'complete', category: 'Gestion Talento Avanzada' },
  
  // Employee Experience
  { name: 'Wellbeing Dashboard', description: 'Bienestar con prediccion burnout Maslach', status: 'complete', category: 'Employee Experience', edgeFunctions: ['erp-hr-wellbeing-agent'] },
  { name: 'Encuestas Pulso', description: 'Surveys automatizados con analisis IA', status: 'complete', category: 'Employee Experience' },
  { name: 'Programas Wellness', description: 'Recomendaciones personalizadas fisico/mental', status: 'complete', category: 'Employee Experience' },
  
  // Contract Lifecycle
  { name: 'CLM Contratos', description: 'Ciclo vida completo con analisis IA', status: 'complete', category: 'Contract Lifecycle', edgeFunctions: ['erp-hr-clm-agent'] },
  { name: 'Riesgo Clausulas', description: 'Scoring automatico por clausula', status: 'complete', category: 'Contract Lifecycle' },
  { name: 'Comparativa Versiones', description: 'Diff entre borradores con highlighting', status: 'complete', category: 'Contract Lifecycle' },
  
  // Innovation
  { name: 'Credenciales Blockchain', description: 'DIDs verificables, EBSI compatible', status: 'innovation', category: 'Innovacion', edgeFunctions: ['erp-hr-credentials-agent'] },
  { name: 'Copiloto Autonomo', description: '3 niveles: asesor, semi-autonomo, autonomo', status: 'innovation', category: 'Innovacion', edgeFunctions: ['erp-hr-autonomous-copilot'] },
  { name: 'Smart Contracts HR', description: 'Clausulas auto-ejecutables, penalizaciones', status: 'innovation', category: 'Innovacion', edgeFunctions: ['erp-hr-smart-contracts'] },
  
  // Analytics Intelligence
  { name: 'Turnover Prediction', description: 'Prediccion rotacion con factores y recomendaciones', status: 'complete', category: 'HR Analytics Intelligence', edgeFunctions: ['erp-hr-analytics-intelligence'] },
  { name: 'Workforce Planning', description: 'Proyecciones plantilla, escenarios what-if', status: 'complete', category: 'HR Analytics Intelligence' },
  { name: 'Salary Benchmark', description: 'Comparativa mercado por rol y ubicacion', status: 'complete', category: 'HR Analytics Intelligence' },
  
  // Pending
  { name: 'Gig/Contingent Workforce', description: 'Gestion freelancers y contractors', status: 'pending', category: 'Pendiente' },
  { name: 'Total Rewards Statement', description: 'Paquete retributivo total visual', status: 'pending', category: 'Pendiente' },
  { name: 'ESG Reporting Social', description: 'Metricas CSRD/ESRS S1-S4', status: 'pending', category: 'Pendiente' },
];

export const HR_EDGE_FUNCTIONS = [
  'erp-hr-ai-agent',
  'erp-hr-analytics-agent',
  'erp-hr-analytics-intelligence',
  'erp-hr-autonomous-copilot',
  'erp-hr-clm-agent',
  'erp-hr-compliance-monitor',
  'erp-hr-credentials-agent',
  'erp-hr-executive-analytics',
  'erp-hr-offboarding-agent',
  'erp-hr-onboarding-agent',
  'erp-hr-payroll-recalculation',
  'erp-hr-performance-agent',
  'erp-hr-recruitment-agent',
  'erp-hr-smart-contracts',
  'erp-hr-talent-skills-agent',
  'erp-hr-wellbeing-agent',
  'erp-hr-whistleblower-agent',
  'erp-hr-accounting-bridge',
];

// ============================================
// FISCAL MODULE FEATURES
// ============================================

export const FISCAL_FEATURES: ModuleFeature[] = [
  // SII
  { name: 'Dashboard SII', description: 'Registros pendientes/rechazados con estado en tiempo real', status: 'complete', category: 'SII Espana' },
  { name: 'Generacion Registros SII', description: 'Automatica desde facturas con validacion', status: 'complete', category: 'SII Espana' },
  { name: 'Tareas Correccion SII', description: 'Sistema para gestionar rechazos AEAT', status: 'complete', category: 'SII Espana' },
  { name: 'Configuracion Multi-empresa', description: 'Parametros SII por entidad', status: 'complete', category: 'SII Espana' },
  
  // Intrastat
  { name: 'Declaraciones Intrastat', description: 'Expediciones e introducciones UE', status: 'complete', category: 'Intrastat' },
  { name: 'Editor Lineas CN8', description: 'Codigos nomenclatura combinada', status: 'complete', category: 'Intrastat' },
  { name: 'Validacion Incoterms', description: 'Verificacion masa neta y terminos', status: 'complete', category: 'Intrastat' },
  { name: 'Dashboard Estadisticas', description: 'Volumenes por pais y periodo', status: 'complete', category: 'Intrastat' },
  
  // Jurisdictions
  { name: 'Espana Completo', description: 'SII, IVA, IRPF, IS, modelos 303/390/111/115/200', status: 'complete', category: 'Jurisdicciones' },
  { name: 'Andorra IGI', description: 'Impuesto General Indirecto, IRPF, IS', status: 'complete', category: 'Jurisdicciones' },
  { name: 'UK MTD', description: 'Making Tax Digital VAT', status: 'complete', category: 'Jurisdicciones' },
  { name: 'UAE Free Zones', description: 'DIFC, DMCC, exenciones fiscales', status: 'complete', category: 'Jurisdicciones' },
  { name: 'US LLCs', description: 'Delaware, Wyoming, Nevada, Schedule K-1', status: 'complete', category: 'Jurisdicciones' },
  { name: 'EU OSS/IOSS', description: 'One-Stop Shop para e-commerce', status: 'complete', category: 'Jurisdicciones' },
  
  // Documents
  { name: 'Modelo 303', description: 'IVA trimestral con calculo automatico', status: 'complete', category: 'Documentos Oficiales' },
  { name: 'Modelo 390', description: 'Resumen anual IVA', status: 'complete', category: 'Documentos Oficiales' },
  { name: 'Modelo 111', description: 'Retenciones IRPF trabajadores', status: 'complete', category: 'Documentos Oficiales' },
  { name: 'Modelo 115', description: 'Retenciones alquileres', status: 'complete', category: 'Documentos Oficiales' },
  { name: 'Modelo 200', description: 'Impuesto Sociedades', status: 'complete', category: 'Documentos Oficiales' },
  { name: 'Export Multi-formato', description: 'PDF, Excel, XBRL', status: 'complete', category: 'Documentos Oficiales' },
  
  // AI Agent
  { name: 'Agente IA Fiscal', description: 'Chat especializado multi-jurisdiccion', status: 'complete', category: 'Agente IA', edgeFunctions: ['erp-fiscal-ai-agent'] },
  { name: 'Verificacion Cumplimiento', description: 'Comprobacion automatica obligaciones', status: 'complete', category: 'Agente IA' },
  { name: 'Sugerencia Asientos', description: 'IA propone contabilizaciones', status: 'complete', category: 'Agente IA', edgeFunctions: ['erp-ai-journal-entries'] },
  { name: 'Consulta Normativa', description: 'Respuestas basadas en legislacion vigente', status: 'complete', category: 'Agente IA', edgeFunctions: ['erp-regulations-ai'] },
  { name: 'Interaccion por Voz', description: 'Speech-to-Text y Text-to-Speech ElevenLabs', status: 'innovation', category: 'Agente IA', edgeFunctions: ['erp-voice-orchestrator'] },
  
  // Active Help
  { name: 'Ayuda Activa', description: 'Deteccion errores en asientos en tiempo real', status: 'complete', category: 'Ayuda Contextual', edgeFunctions: ['erp-dynamic-help'] },
  { name: 'Guia Contextual', description: 'Burbujas de ayuda segun campo activo', status: 'complete', category: 'Ayuda Contextual' },
];

export const FISCAL_EDGE_FUNCTIONS = [
  'erp-fiscal-ai-agent',
  'erp-fiscal-closing-wizard',
  'erp-regulations-ai',
  'erp-regulations-search',
  'erp-financial-reports',
  'erp-auto-accounting',
  'erp-auto-reconciliation',
  'erp-ai-journal-entries',
  'erp-dynamic-help',
  'erp-voice-orchestrator',
  'erp-advisor-agent',
  'erp-advisor-compliance',
];

// ============================================
// LEGAL MODULE FEATURES
// ============================================

export const LEGAL_FEATURES: ModuleFeature[] = [
  // Core Legal
  { name: 'Dashboard Ejecutivo', description: 'KPIs legales, alertas, resumen compliance', status: 'complete', category: 'Core Legal' },
  { name: 'Asesor Juridico IA', description: 'Multi-jurisdiccional (ES, AD, EU, UK, UAE, US)', status: 'complete', category: 'Core Legal', edgeFunctions: ['legal-ai-advisor'] },
  { name: 'Sub-agentes Especializados', description: 'Laboral, Mercantil, Fiscal, GDPR, Bancario', status: 'complete', category: 'Core Legal' },
  
  // Compliance
  { name: 'Matriz Cumplimiento', description: 'Vista consolidada multi-regulacion', status: 'complete', category: 'Compliance' },
  { name: 'Evaluacion Riesgos', description: 'Scoring automatico por tipo y jurisdiccion', status: 'complete', category: 'Compliance' },
  { name: 'Alertas Regulatorias', description: 'Monitoreo cambios normativos diario', status: 'complete', category: 'Compliance' },
  
  // Documents
  { name: 'Generador Documentos', description: 'Plantillas dinamicas multi-jurisdiccion', status: 'complete', category: 'Documentos' },
  { name: 'Analisis Contratos IA', description: 'Extraccion clausulas y obligaciones', status: 'complete', category: 'Documentos' },
  { name: 'Extraccion Obligaciones', description: 'Identificacion automatica compromisos', status: 'complete', category: 'Documentos' },
  
  // Knowledge
  { name: 'Base Conocimiento', description: 'Legislacion ES, AD, EU actualizada', status: 'complete', category: 'Knowledge', edgeFunctions: ['legal-knowledge-sync'] },
  { name: 'Sincronizacion Automatica', description: 'Actualizacion diaria 06:00 UTC', status: 'complete', category: 'Knowledge' },
  { name: 'Jurisprudencia', description: 'CENDOJ, EUR-Lex, BOPA integrados', status: 'complete', category: 'Knowledge' },
  
  // Reports
  { name: 'Due Diligence', description: 'Informes automatizados para transacciones', status: 'complete', category: 'Reportes' },
  { name: 'Compliance Reports', description: 'Estado cumplimiento por regulacion', status: 'complete', category: 'Reportes' },
  { name: 'Risk Reports', description: 'Analisis riesgos juridicos', status: 'complete', category: 'Reportes' },
  { name: 'Audit Trail', description: 'Trazabilidad inmutable de acciones', status: 'complete', category: 'Reportes' },
  
  // Entity Management
  { name: 'Entity Management', description: 'Registro entidades del grupo, gobierno corporativo', status: 'complete', category: 'Entity & IP', edgeFunctions: ['legal-entity-management'] },
  { name: 'Poderes y Representaciones', description: 'Gestion powers of attorney', status: 'complete', category: 'Entity & IP' },
  { name: 'Portfolio IP', description: 'Marcas, patentes, dominios con renovaciones', status: 'complete', category: 'Entity & IP' },
  { name: 'eDiscovery', description: 'Legal holds, preservacion, busqueda documentos', status: 'complete', category: 'Entity & IP' },
  { name: 'Calendario Corporativo', description: 'Obligaciones mercantiles y vencimientos', status: 'complete', category: 'Entity & IP' },
  
  // Predictive
  { name: 'Predictive Analytics', description: 'Prediccion resultados litigios', status: 'complete', category: 'Predictive Legal', edgeFunctions: ['legal-predictive-analytics'] },
  { name: 'Estimacion Costes', description: 'Proyeccion gastos legales por caso', status: 'complete', category: 'Predictive Legal' },
  { name: 'Tendencias Jurisprudencia', description: 'Analisis evolucion criterios judiciales', status: 'complete', category: 'Predictive Legal' },
  { name: 'Copiloto Autonomo Legal', description: 'Acciones proactivas y automatizacion', status: 'complete', category: 'Predictive Legal', edgeFunctions: ['legal-autonomous-copilot'] },
  
  // Gateway & Orchestration
  { name: 'Validation Gateway Enhanced', description: 'Bloqueo operaciones alto riesgo cross-module', status: 'innovation', category: 'Gateway & Orchestration', edgeFunctions: ['legal-validation-gateway-enhanced'] },
  { name: 'Cross-Module Orchestrator', description: 'Coordinacion RRHH-Legal-Fiscal-Compras', status: 'innovation', category: 'Gateway & Orchestration', edgeFunctions: ['cross-module-orchestrator'] },
  { name: 'Smart Legal Contracts', description: 'Clausulas auto-ejecutables, disputas', status: 'innovation', category: 'Gateway & Orchestration', edgeFunctions: ['smart-legal-contracts'] },
  { name: 'Advanced CLM', description: 'Playbooks negociacion, biblioteca clausulas', status: 'complete', category: 'Gateway & Orchestration', edgeFunctions: ['advanced-clm-engine'] },
  
  // Pending
  { name: 'Matter Management Dedicado', description: 'Gestion asuntos legales completa', status: 'partial', category: 'Pendiente' },
  { name: 'Legal Spend Management', description: 'Presupuestos, facturacion LEDES', status: 'partial', category: 'Pendiente' },
];

export const LEGAL_EDGE_FUNCTIONS = [
  'legal-ai-advisor',
  'legal-knowledge-sync',
  'legal-entity-management',
  'legal-predictive-analytics',
  'legal-autonomous-copilot',
  'legal-validation-gateway-enhanced',
  'cross-module-orchestrator',
  'smart-legal-contracts',
  'advanced-clm-engine',
  'blockchain-credentials',
];

// ============================================
// ERP COMPETITORS
// ============================================

export const ERP_COMPETITORS: CompetitorProfile[] = [
  {
    name: 'SAP',
    fullName: 'SAP SuccessFactors / S/4HANA',
    strengths: ['Lider enterprise', 'Suite completa', 'Localizaciones globales', 'IA integrada'],
    weaknesses: ['Coste muy elevado', 'Complejidad implementacion', 'Rigidez'],
  },
  {
    name: 'Workday',
    fullName: 'Workday HCM / Finance',
    strengths: ['HCM lider', 'UX moderna', 'Cloud native', 'Skills Cloud'],
    weaknesses: ['Fiscal limitado', 'Sin legal nativo', 'Precio premium'],
  },
  {
    name: 'Oracle',
    fullName: 'Oracle Cloud HCM / Financials',
    strengths: ['Suite amplia', 'AI/ML avanzado', 'Escalabilidad', 'Localizaciones'],
    weaknesses: ['Complejidad', 'Coste', 'UX legacy en partes'],
  },
  {
    name: 'Icertis',
    fullName: 'Icertis CLM',
    strengths: ['Lider CLM', 'AI contratos', 'Integraciones', 'Enterprise ready'],
    weaknesses: ['Solo CLM', 'Sin HCM', 'Sin fiscal', 'Precio alto'],
  },
];

// ============================================
// AGGREGATED DATA FUNCTIONS
// ============================================

export function getERPFeatures() {
  return {
    hr: HR_FEATURES,
    fiscal: FISCAL_FEATURES,
    legal: LEGAL_FEATURES,
  };
}

export function getERPStats() {
  const hrStats = {
    total: HR_FEATURES.length,
    complete: HR_FEATURES.filter(f => f.status === 'complete').length,
    innovation: HR_FEATURES.filter(f => f.status === 'innovation').length,
    edgeFunctions: HR_EDGE_FUNCTIONS.length,
  };
  
  const fiscalStats = {
    total: FISCAL_FEATURES.length,
    complete: FISCAL_FEATURES.filter(f => f.status === 'complete').length,
    innovation: FISCAL_FEATURES.filter(f => f.status === 'innovation').length,
    edgeFunctions: FISCAL_EDGE_FUNCTIONS.length,
  };
  
  const legalStats = {
    total: LEGAL_FEATURES.length,
    complete: LEGAL_FEATURES.filter(f => f.status === 'complete').length,
    innovation: LEGAL_FEATURES.filter(f => f.status === 'innovation').length,
    edgeFunctions: LEGAL_EDGE_FUNCTIONS.length,
  };
  
  return { hr: hrStats, fiscal: fiscalStats, legal: legalStats };
}
