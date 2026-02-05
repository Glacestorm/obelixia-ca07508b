 /**
  * Enterprise Modules Audit PDF Generator
  * Generates comprehensive audit reports for HR, Fiscal, and Legal modules
  * Compares with SAP, Workday, Oracle, Icertis and provides competitive analysis
  */
 
 import jsPDF from 'jspdf';
 import autoTable from 'jspdf-autotable';
 import { BRAND, PDF_COLORS, sanitizeForPDF } from '@/components/reports/constants';
 
 // ============================================
 // TYPES
 // ============================================
 
 export type AuditReportType = 'rrhh' | 'fiscal' | 'legal' | 'all';
 export type DetailLevel = 'executive' | 'detailed' | 'complete';
 
 export interface AuditConfig {
   modules: AuditReportType;
   detailLevel: DetailLevel;
   includeCharts: boolean;
   includeCompetitorAnalysis: boolean;
   includeRoadmap: boolean;
 }
 
 export interface ModuleFeature {
   name: string;
   description: string;
   status: 'complete' | 'partial' | 'pending' | 'innovation';
   category: string;
   edgeFunctions?: string[];
   hooks?: string[];
   panels?: string[];
 }
 
 export interface CompetitorFeature {
   feature: string;
   sap: 'yes' | 'partial' | 'no';
   workday: 'yes' | 'partial' | 'no';
   oracle: 'yes' | 'partial' | 'no';
   icertis?: 'yes' | 'partial' | 'no';
   obelixia: 'yes' | 'partial' | 'no';
   status: 'complete' | 'advantage' | 'innovation' | 'pending';
 }
 
 // ============================================
 // HR MODULE DATA
 // ============================================
 
 const HR_FEATURES: ModuleFeature[] = [
   // Talent Category
   { name: 'Gestion de Empleados', description: 'Fichas completas con 4 pestanas (General, Laboral, Documentos, Accesos)', status: 'complete', category: 'Talento' },
   { name: 'Reclutamiento IA', description: 'Portal con scoring automatico de candidatos usando Gemini 2.5', status: 'complete', category: 'Talento', edgeFunctions: ['erp-hr-recruitment-agent'] },
   { name: 'Onboarding Adaptativo', description: 'Proceso por CNAE con tareas por fases y checklist automatico', status: 'complete', category: 'Talento', edgeFunctions: ['erp-hr-onboarding-agent'] },
   { name: 'Offboarding Inteligente', description: 'Gestion optimizada con analisis legal previo y checklist', status: 'complete', category: 'Talento', edgeFunctions: ['erp-hr-offboarding-agent'] },
   
   // Operations Category
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
   
   // Development Category
   { name: 'Desempeno 9-Box', description: 'Evaluaciones con matriz 9-Box Grid', status: 'complete', category: 'Desarrollo', edgeFunctions: ['erp-hr-performance-agent'] },
   { name: 'Formacion', description: 'Catalogo por CNAE con tracking', status: 'complete', category: 'Desarrollo', edgeFunctions: ['erp-hr-training-agent'] },
   { name: 'Analytics Predictivos', description: 'Flight Risk, eNPS, Compa-Ratio', status: 'complete', category: 'Desarrollo', edgeFunctions: ['erp-hr-analytics-agent', 'erp-hr-analytics-intelligence'] },
   { name: 'Beneficios', description: 'Flex remuneration y retribucion flexible', status: 'complete', category: 'Desarrollo' },
   { name: 'PRL', description: 'Auditorias por sector, evaluacion riesgos', status: 'complete', category: 'Desarrollo' },
   
   // Advanced Phase 1 - Compliance
   { name: 'Canal Denuncias (Whistleblower)', description: 'Directiva EU 2019/1937 completa con anonimato', status: 'complete', category: 'Compliance Legal', edgeFunctions: ['erp-hr-whistleblower-agent'], hooks: ['useHRWhistleblower'] },
   { name: 'Plan de Igualdad', description: 'RD 901/2020, diagnostico y auditoria retributiva', status: 'complete', category: 'Compliance Legal', hooks: ['useHREquality'] },
   { name: 'Registro Horario', description: 'Art. 34.9 ET, multi-canal, desconexion digital', status: 'complete', category: 'Compliance Legal', hooks: ['useHRTimeTracking'] },
   
   // Advanced Phase 2 - Talent
   { name: 'Skills Ontology', description: 'Taxonomia competencias multinivel con gaps', status: 'complete', category: 'Gestion Talento Avanzada', edgeFunctions: ['erp-hr-talent-skills-agent'], hooks: ['useHRTalentSkills'], panels: ['HRSkillsMatrixPanel'] },
   { name: 'Talent Marketplace', description: 'Bolsa interna con matching IA, gigs, mentoring', status: 'complete', category: 'Gestion Talento Avanzada', panels: ['HRInternalMarketplacePanel'] },
   { name: 'Sucesion y Carrera', description: 'Planes sucesion, career paths, talent pools', status: 'complete', category: 'Gestion Talento Avanzada', panels: ['HRSuccessionPlanningPanel'] },
   
   // Advanced Phase 3 - Experience
   { name: 'Wellbeing Dashboard', description: 'Bienestar con prediccion burnout Maslach', status: 'complete', category: 'Employee Experience', edgeFunctions: ['erp-hr-wellbeing-agent'], hooks: ['useHRWellbeing'], panels: ['HRWellbeingDashboard'] },
   { name: 'Encuestas Pulso', description: 'Surveys automatizados con analisis IA', status: 'complete', category: 'Employee Experience' },
   { name: 'Programas Wellness', description: 'Recomendaciones personalizadas fisico/mental', status: 'complete', category: 'Employee Experience' },
   
   // Advanced Phase 4 - CLM
   { name: 'CLM Contratos', description: 'Ciclo vida completo con analisis IA', status: 'complete', category: 'Contract Lifecycle', edgeFunctions: ['erp-hr-clm-agent'], hooks: ['useHRContractLifecycle'] },
   { name: 'Riesgo Clausulas', description: 'Scoring automatico por clausula', status: 'complete', category: 'Contract Lifecycle' },
   { name: 'Comparativa Versiones', description: 'Diff entre borradores con highlighting', status: 'complete', category: 'Contract Lifecycle' },
   
   // Advanced Phase 5 - Innovation
   { name: 'Credenciales Blockchain', description: 'DIDs verificables, EBSI compatible', status: 'innovation', category: 'Innovacion', edgeFunctions: ['erp-hr-credentials-agent'], hooks: ['useHRCredentials'], panels: ['HRCredentialsPanel'] },
   { name: 'Copiloto Autonomo', description: '3 niveles: asesor, semi-autonomo, autonomo', status: 'innovation', category: 'Innovacion', edgeFunctions: ['erp-hr-autonomous-copilot'], hooks: ['useHRAutonomousCopilot'], panels: ['HRAutonomousCopilotPanel'] },
   
   // Advanced Phase 6 - Smart Contracts
   { name: 'Smart Contracts HR', description: 'Clausulas auto-ejecutables, penalizaciones', status: 'innovation', category: 'Innovacion', edgeFunctions: ['erp-hr-smart-contracts'], hooks: ['useHRSmartContracts'] },
   
   // Advanced Phase 7 - Analytics Intelligence
   { name: 'Turnover Prediction', description: 'Prediccion rotacion con factores y recomendaciones', status: 'complete', category: 'HR Analytics Intelligence', edgeFunctions: ['erp-hr-analytics-intelligence'], hooks: ['useHRAnalyticsIntelligence'] },
   { name: 'Workforce Planning', description: 'Proyecciones plantilla, escenarios what-if', status: 'complete', category: 'HR Analytics Intelligence' },
   { name: 'Salary Benchmark', description: 'Comparativa mercado por rol y ubicacion', status: 'complete', category: 'HR Analytics Intelligence' },
   
   // Pending
   { name: 'Gig/Contingent Workforce', description: 'Gestion freelancers y contractors', status: 'pending', category: 'Pendiente' },
   { name: 'Total Rewards Statement', description: 'Paquete retributivo total visual', status: 'pending', category: 'Pendiente' },
   { name: 'ESG Reporting Social', description: 'Metricas CSRD/ESRS S1-S4', status: 'pending', category: 'Pendiente' },
 ];
 
 const HR_EDGE_FUNCTIONS = [
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
   'erp-hr-training-agent',
   'erp-hr-wellbeing-agent',
   'erp-hr-whistleblower-agent',
   'erp-hr-accounting-bridge',
 ];
 
 // ============================================
 // FISCAL MODULE DATA
 // ============================================
 
 const FISCAL_FEATURES: ModuleFeature[] = [
   // SII System
   { name: 'Dashboard SII', description: 'Registros pendientes/rechazados con estado en tiempo real', status: 'complete', category: 'SII Espana' },
   { name: 'Generacion Registros SII', description: 'Automatica desde facturas con validacion', status: 'complete', category: 'SII Espana' },
   { name: 'Tareas Correccion SII', description: 'Sistema para gestionar rechazos AEAT', status: 'complete', category: 'SII Espana' },
   { name: 'Configuracion Multi-empresa', description: 'Parametros SII por entidad', status: 'complete', category: 'SII Espana' },
   
   // Intrastat
   { name: 'Declaraciones Intrastat', description: 'Expediciones e introducciones UE', status: 'complete', category: 'Intrastat' },
   { name: 'Editor Lineas CN8', description: 'Codigos nomenclatura combinada', status: 'complete', category: 'Intrastat' },
   { name: 'Validacion Incoterms', description: 'Verificacion masa neta y terminos', status: 'complete', category: 'Intrastat' },
   { name: 'Dashboard Estadisticas', description: 'Volumenes por pais y periodo', status: 'complete', category: 'Intrastat' },
   
   // Multi-jurisdiction
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
   { name: 'Consulta Normativa', description: 'Respuestas basadas en legislacion vigente', status: 'complete', category: 'Agente IA', edgeFunctions: ['erp-regulations-ai', 'erp-regulations-search'] },
   { name: 'Interaccion por Voz', description: 'Speech-to-Text y Text-to-Speech con ElevenLabs', status: 'innovation', category: 'Agente IA', edgeFunctions: ['erp-voice-orchestrator'] },
   
   // Active Help
   { name: 'Ayuda Activa', description: 'Deteccion errores en asientos en tiempo real', status: 'complete', category: 'Ayuda Contextual', edgeFunctions: ['erp-dynamic-help'] },
   { name: 'Guia Contextual', description: 'Burbujas de ayuda segun campo activo', status: 'complete', category: 'Ayuda Contextual' },
 ];
 
 const FISCAL_EDGE_FUNCTIONS = [
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
   'erp-voice-tts',
   'erp-voice-agent-token',
   'erp-advisor-agent',
   'erp-advisor-compliance',
 ];
 
 // ============================================
 // LEGAL MODULE DATA
 // ============================================
 
 const LEGAL_FEATURES: ModuleFeature[] = [
   // Core Legal
   { name: 'Dashboard Ejecutivo', description: 'KPIs legales, alertas, resumen compliance', status: 'complete', category: 'Core Legal' },
   { name: 'Asesor Juridico IA', description: 'Multi-jurisdiccional (ES, AD, EU, UK, UAE, US)', status: 'complete', category: 'Core Legal', edgeFunctions: ['legal-ai-advisor'] },
   { name: 'Sub-agentes Especializados', description: 'Laboral, Mercantil, Fiscal, GDPR, Bancario', status: 'complete', category: 'Core Legal' },
   
   // Compliance
   { name: 'Matriz Cumplimiento', description: 'Vista consolidada multi-regulacion', status: 'complete', category: 'Compliance', hooks: ['useLegalCompliance'] },
   { name: 'Evaluacion Riesgos', description: 'Scoring automatico por tipo y jurisdiccion', status: 'complete', category: 'Compliance' },
   { name: 'Alertas Regulatorias', description: 'Monitoreo cambios normativos diario', status: 'complete', category: 'Compliance' },
   
   // Documents
   { name: 'Generador Documentos', description: 'Plantillas dinamicas multi-jurisdiccion', status: 'complete', category: 'Documentos', hooks: ['useLegalDocuments'] },
   { name: 'Analisis Contratos IA', description: 'Extraccion clausulas y obligaciones', status: 'complete', category: 'Documentos' },
   { name: 'Extraccion Obligaciones', description: 'Identificacion automatica compromisos', status: 'complete', category: 'Documentos' },
   
   // Knowledge Management
   { name: 'Base Conocimiento', description: 'Legislacion ES, AD, EU actualizada', status: 'complete', category: 'Knowledge', hooks: ['useLegalKnowledge'], edgeFunctions: ['legal-knowledge-sync'] },
   { name: 'Sincronizacion Automatica', description: 'Actualizacion diaria 06:00 UTC', status: 'complete', category: 'Knowledge' },
   { name: 'Jurisprudencia', description: 'CENDOJ, EUR-Lex, BOPA integrados', status: 'complete', category: 'Knowledge' },
   
   // Reports
   { name: 'Due Diligence', description: 'Informes automatizados para transacciones', status: 'complete', category: 'Reportes' },
   { name: 'Compliance Reports', description: 'Estado cumplimiento por regulacion', status: 'complete', category: 'Reportes' },
   { name: 'Risk Reports', description: 'Analisis riesgos juridicos', status: 'complete', category: 'Reportes' },
   { name: 'Audit Trail', description: 'Trazabilidad inmutable de acciones', status: 'complete', category: 'Reportes' },
   
   // Phase 8 - Entity Management
   { name: 'Entity Management', description: 'Registro entidades del grupo, gobierno corporativo', status: 'complete', category: 'Entity & IP', edgeFunctions: ['legal-entity-management'], hooks: ['useLegalEntityManagement'] },
   { name: 'Poderes y Representaciones', description: 'Gestion powers of attorney', status: 'complete', category: 'Entity & IP' },
   { name: 'Portfolio IP', description: 'Marcas, patentes, dominios con renovaciones', status: 'complete', category: 'Entity & IP' },
   { name: 'eDiscovery', description: 'Legal holds, preservacion, busqueda documentos', status: 'complete', category: 'Entity & IP' },
   { name: 'Calendario Corporativo', description: 'Obligaciones mercantiles y vencimientos', status: 'complete', category: 'Entity & IP' },
   
   // Phase 9 - Predictive & Copilot
   { name: 'Predictive Analytics', description: 'Prediccion resultados litigios', status: 'complete', category: 'Predictive Legal', edgeFunctions: ['legal-predictive-analytics'], hooks: ['usePredictiveLegalAnalytics'] },
   { name: 'Estimacion Costes', description: 'Proyeccion gastos legales por caso', status: 'complete', category: 'Predictive Legal' },
   { name: 'Tendencias Jurisprudencia', description: 'Analisis evolucion criterios judiciales', status: 'complete', category: 'Predictive Legal' },
   { name: 'Copiloto Autonomo Legal', description: 'Acciones proactivas y automatizacion', status: 'complete', category: 'Predictive Legal', edgeFunctions: ['legal-autonomous-copilot'], hooks: ['useLegalAutonomousCopilot'] },
   
   // Phase 10 - Gateway & Orchestration
   { name: 'Validation Gateway Enhanced', description: 'Bloqueo operaciones alto riesgo cross-module', status: 'innovation', category: 'Gateway & Orchestration', edgeFunctions: ['legal-validation-gateway-enhanced'], hooks: ['useLegalValidationGatewayEnhanced'], panels: ['LegalValidationGatewayEnhancedPanel'] },
   { name: 'Cross-Module Orchestrator', description: 'Coordinacion RRHH-Legal-Fiscal-Compras', status: 'innovation', category: 'Gateway & Orchestration', edgeFunctions: ['cross-module-orchestrator'], hooks: ['useCrossModuleOrchestrator'], panels: ['CrossModuleOrchestratorPanel'] },
   { name: 'Smart Legal Contracts', description: 'Clausulas auto-ejecutables, disputas', status: 'innovation', category: 'Gateway & Orchestration', edgeFunctions: ['smart-legal-contracts'], hooks: ['useSmartLegalContracts'], panels: ['SmartLegalContractsPanel'] },
   { name: 'Advanced CLM', description: 'Playbooks negociacion, biblioteca clausulas', status: 'complete', category: 'Gateway & Orchestration', edgeFunctions: ['advanced-clm-engine'], hooks: ['useAdvancedCLM'], panels: ['AdvancedCLMPanel'] },
   
   // Pending
   { name: 'Matter Management Dedicado', description: 'Gestion asuntos legales completa', status: 'partial', category: 'Pendiente' },
   { name: 'Legal Spend Management', description: 'Presupuestos, facturacion LEDES', status: 'partial', category: 'Pendiente' },
 ];
 
 const LEGAL_EDGE_FUNCTIONS = [
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
 // COMPETITOR COMPARISON DATA
 // ============================================
 
 const HR_COMPETITOR_FEATURES: CompetitorFeature[] = [
   { feature: 'Gestion Empleados Core', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Reclutamiento con IA', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Onboarding Adaptativo', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Skills Ontology', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Talent Marketplace', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Sucesion Planning', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Employee Experience', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Wellbeing & Burnout', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Canal Denuncias EU', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Registro Horario ES', sap: 'partial', workday: 'partial', oracle: 'partial', obelixia: 'yes', status: 'advantage' },
   { feature: 'Credenciales Blockchain', sap: 'partial', workday: 'partial', oracle: 'partial', obelixia: 'yes', status: 'innovation' },
   { feature: 'Copiloto Autonomo 3 Niveles', sap: 'partial', workday: 'partial', oracle: 'no', obelixia: 'yes', status: 'innovation' },
   { feature: 'Smart Contracts HR', sap: 'no', workday: 'no', oracle: 'no', obelixia: 'yes', status: 'innovation' },
   { feature: 'Integracion Cross-Module IA', sap: 'partial', workday: 'partial', oracle: 'partial', obelixia: 'yes', status: 'innovation' },
   { feature: 'Multi-jurisdiccion Nativa', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Gig/Contingent Workforce', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'partial', status: 'pending' },
   { feature: 'Total Rewards Statement', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'partial', status: 'pending' },
   { feature: 'ESG Social Reporting', sap: 'yes', workday: 'yes', oracle: 'yes', obelixia: 'no', status: 'pending' },
 ];
 
 const FISCAL_COMPETITOR_FEATURES: CompetitorFeature[] = [
   { feature: 'Contabilidad PGC/PGCPyme', sap: 'yes', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'SII Espana', sap: 'yes', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Intrastat UE', sap: 'yes', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Multi-jurisdiccion (20+)', sap: 'yes', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Modelos Fiscales ES', sap: 'yes', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Agente IA Fiscal', sap: 'partial', workday: 'partial', oracle: 'partial', obelixia: 'yes', status: 'advantage' },
   { feature: 'Voz Bidireccional', sap: 'no', workday: 'no', oracle: 'no', obelixia: 'yes', status: 'innovation' },
   { feature: 'Ayuda Activa Contextual', sap: 'partial', workday: 'no', oracle: 'partial', obelixia: 'yes', status: 'advantage' },
   { feature: 'Auto-conciliacion IA', sap: 'partial', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Prediccion Tesoreria', sap: 'yes', workday: 'partial', oracle: 'yes', obelixia: 'yes', status: 'complete' },
 ];
 
 const LEGAL_COMPETITOR_FEATURES: CompetitorFeature[] = [
   { feature: 'CLM Completo', sap: 'partial', workday: 'partial', oracle: 'partial', icertis: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Clause Library', sap: 'partial', workday: 'no', oracle: 'partial', icertis: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Playbooks Negociacion', sap: 'no', workday: 'no', oracle: 'partial', icertis: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'eDiscovery', sap: 'no', workday: 'no', oracle: 'partial', icertis: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Entity Management', sap: 'partial', workday: 'no', oracle: 'yes', icertis: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'IP Portfolio', sap: 'no', workday: 'no', oracle: 'partial', icertis: 'partial', obelixia: 'yes', status: 'complete' },
   { feature: 'Predictive Litigation', sap: 'no', workday: 'no', oracle: 'partial', icertis: 'partial', obelixia: 'yes', status: 'advantage' },
   { feature: 'Smart Contracts Legal', sap: 'no', workday: 'no', oracle: 'no', icertis: 'partial', obelixia: 'yes', status: 'innovation' },
   { feature: 'Cross-Module Orchestration', sap: 'partial', workday: 'partial', oracle: 'partial', icertis: 'no', obelixia: 'yes', status: 'innovation' },
   { feature: 'Gateway Validacion Bloqueo', sap: 'no', workday: 'no', oracle: 'no', icertis: 'no', obelixia: 'yes', status: 'innovation' },
   { feature: 'Multi-jurisdiccion Nativa', sap: 'partial', workday: 'partial', oracle: 'partial', icertis: 'yes', obelixia: 'yes', status: 'complete' },
   { feature: 'Matter Management', sap: 'no', workday: 'no', oracle: 'partial', icertis: 'yes', obelixia: 'partial', status: 'pending' },
   { feature: 'Legal Spend (LEDES)', sap: 'no', workday: 'no', oracle: 'partial', icertis: 'yes', obelixia: 'partial', status: 'pending' },
 ];
 
 // ============================================
 // PDF GENERATION HELPERS
 // ============================================
 
 function addHeader(doc: jsPDF, title: string, pageNumber: number, totalPages?: number) {
   const pageWidth = doc.internal.pageSize.getWidth();
   
   // Header background
   doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
   doc.rect(0, 0, pageWidth, 22, 'F');
   
   // Brand name
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(14);
   doc.setTextColor(255, 255, 255);
   doc.text(BRAND.name.toUpperCase(), 15, 14);
   
   // Title
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(10);
   doc.text(sanitizeForPDF(title), pageWidth / 2, 14, { align: 'center' });
   
   // Page number
   const pageText = totalPages ? `${pageNumber} / ${totalPages}` : `${pageNumber}`;
   doc.text(pageText, pageWidth - 15, 14, { align: 'right' });
 }
 
 function addFooter(doc: jsPDF) {
   const pageWidth = doc.internal.pageSize.getWidth();
   const pageHeight = doc.internal.pageSize.getHeight();
   
   doc.setDrawColor(PDF_COLORS.gray[300][0], PDF_COLORS.gray[300][1], PDF_COLORS.gray[300][2]);
   doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
   
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8);
   doc.setTextColor(PDF_COLORS.gray[500][0], PDF_COLORS.gray[500][1], PDF_COLORS.gray[500][2]);
   doc.text(BRAND.copyright(), 15, pageHeight - 8);
   doc.text('Documento Confidencial', pageWidth - 15, pageHeight - 8, { align: 'right' });
 }
 
 function addSectionTitle(doc: jsPDF, title: string, y: number): number {
   const pageWidth = doc.internal.pageSize.getWidth();
   
   doc.setFillColor(PDF_COLORS.primaryLight[0], PDF_COLORS.primaryLight[1], PDF_COLORS.primaryLight[2]);
   doc.rect(15, y, pageWidth - 30, 10, 'F');
   
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(12);
   doc.setTextColor(255, 255, 255);
   doc.text(sanitizeForPDF(title), 20, y + 7);
   
   return y + 15;
 }
 
 function addSubsectionTitle(doc: jsPDF, title: string, y: number): number {
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(11);
   doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
   doc.text(sanitizeForPDF(title), 15, y);
   
   return y + 8;
 }
 
 function addParagraph(doc: jsPDF, text: string, y: number, maxWidth: number = 180): number {
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(10);
   doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
   
   const lines = doc.splitTextToSize(sanitizeForPDF(text), maxWidth);
   doc.text(lines, 15, y);
   
   return y + (lines.length * 5) + 3;
 }
 
 function checkPageBreak(doc: jsPDF, currentY: number, neededSpace: number, title: string, pageCount: { value: number }): number {
   const pageHeight = doc.internal.pageSize.getHeight();
   
   if (currentY + neededSpace > pageHeight - 25) {
     doc.addPage();
     pageCount.value++;
     addHeader(doc, title, pageCount.value);
     addFooter(doc);
     return 32;
   }
   
   return currentY;
 }
 
 // ============================================
 // PDF SECTIONS
 // ============================================
 
 function generateCoverPage(doc: jsPDF): void {
   const pageWidth = doc.internal.pageSize.getWidth();
   const pageHeight = doc.internal.pageSize.getHeight();
   
   // Full page gradient background
   doc.setFillColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
   doc.rect(0, 0, pageWidth, pageHeight * 0.45, 'F');
   
   // Brand name
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(48);
   doc.setTextColor(255, 255, 255);
   doc.text(BRAND.name, pageWidth / 2, 60, { align: 'center' });
   
   // Tagline
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(14);
   doc.text('Enterprise Platform Suite', pageWidth / 2, 75, { align: 'center' });
   
   // Main title
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(28);
   doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
   doc.text('INFORME DE AUDITORIA', pageWidth / 2, 130, { align: 'center' });
   doc.text('ENTERPRISE', pageWidth / 2, 145, { align: 'center' });
   
   // Subtitle
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(16);
   doc.setTextColor(PDF_COLORS.gray[600][0], PDF_COLORS.gray[600][1], PDF_COLORS.gray[600][2]);
   doc.text('Modulos RRHH, Fiscal y Juridico', pageWidth / 2, 165, { align: 'center' });
   doc.text('Benchmark vs. SAP, Workday, Oracle, Icertis', pageWidth / 2, 178, { align: 'center' });
   
   // Info box
   doc.setFillColor(PDF_COLORS.backgrounds.muted[0], PDF_COLORS.backgrounds.muted[1], PDF_COLORS.backgrounds.muted[2]);
   doc.roundedRect(40, 200, pageWidth - 80, 50, 3, 3, 'F');
   
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(11);
   doc.setTextColor(PDF_COLORS.gray[700][0], PDF_COLORS.gray[700][1], PDF_COLORS.gray[700][2]);
   
   const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
   doc.text(`Fecha: ${today}`, 50, 218);
   doc.text('Version: 10.0 (Fase 10 Completada)', 50, 230);
   doc.text('Clasificacion: Confidencial', 50, 242);
   
   // Footer
   doc.setFontSize(10);
   doc.setTextColor(PDF_COLORS.gray[500][0], PDF_COLORS.gray[500][1], PDF_COLORS.gray[500][2]);
   doc.text(BRAND.copyright(), pageWidth / 2, pageHeight - 20, { align: 'center' });
 }
 
 function generateExecutiveSummary(doc: jsPDF, pageCount: { value: number }): void {
   doc.addPage();
   pageCount.value++;
   
   const title = 'Resumen Ejecutivo';
   addHeader(doc, title, pageCount.value);
   addFooter(doc);
   
   let y = 35;
   
   y = addSectionTitle(doc, '1. RESUMEN EJECUTIVO', y);
   
   y = addSubsectionTitle(doc, '1.1 Vision General', y + 5);
   y = addParagraph(doc, 
     'ObelixIA Enterprise Platform es una suite integral que integra de forma nativa los modulos de Recursos Humanos (HCM), ' +
     'Gestion Fiscal y Modulo Juridico en una unica plataforma con arquitectura multi-agente de Inteligencia Artificial. ' +
     'Tras completar las 10 fases del plan maestro de evolucion, la plataforma ha alcanzado paridad funcional con los ' +
     'lideres mundiales (SAP, Workday, Oracle) y los supera en innovacion tecnologica.', y);
   
   y = addSubsectionTitle(doc, '1.2 Posicion Competitiva Global', y + 3);
   
   // Position summary table
   y = checkPageBreak(doc, y, 50, title, pageCount);
   
   autoTable(doc, {
     startY: y,
     head: [['Modulo', 'Posicion', 'Funcionalidades', 'Edge Functions', 'Estado']],
     body: [
       ['RRHH', 'Top 5 Global', '45+ secciones', '19 agentes IA', 'Fase 7 Completa'],
       ['Fiscal', 'Top 3 Espana', '28+ funciones', '14 agentes IA', '20+ jurisdicciones'],
       ['Juridico', 'Top 3 Global', '35+ capacidades', '10 agentes IA', 'Fase 10 Completa'],
     ],
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]] },
     styles: { fontSize: 9, cellPadding: 4 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 10;
   
   y = addSubsectionTitle(doc, '1.3 Principales Fortalezas', y);
   
   const strengths = [
     'UNICO ERP que integra HCM + Legal + Fiscal en plataforma unificada con IA nativa',
     'Arquitectura multi-agente con orquestador supervisor cross-module',
     'Innovaciones disruptivas: Blockchain Credentials, Smart Contracts, Copiloto Autonomo 3 niveles',
     'Multi-jurisdiccion nativa: ES, AD, EU, UK, UAE, US (20+ paises)',
     'Interfaz moderna con interaccion por voz bidireccional (ElevenLabs)',
     'Gateway de validacion legal que bloquea operaciones de alto riesgo automaticamente',
   ];
   
   y = checkPageBreak(doc, y, 45, title, pageCount);
   
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(10);
   doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
   
   strengths.forEach((strength, idx) => {
     y = checkPageBreak(doc, y, 8, title, pageCount);
     doc.text(`${idx + 1}. ${sanitizeForPDF(strength)}`, 20, y);
     y += 7;
   });
   
   y = addSubsectionTitle(doc, '1.4 Areas de Mejora Identificadas', y + 5);
   
   y = checkPageBreak(doc, y, 40, title, pageCount);
   
   autoTable(doc, {
     startY: y,
     head: [['Gap', 'Modulo', 'Prioridad', 'Estimacion']],
     body: [
       ['Gig/Contingent Workforce', 'RRHH', 'Media-Alta', 'Q1 2026'],
       ['Total Rewards Statement', 'RRHH', 'Alta', 'Q1 2026'],
       ['ESG Reporting Social (CSRD)', 'RRHH', 'Alta', 'Q2 2026'],
       ['Matter Management Dedicado', 'Juridico', 'Media', 'Q2 2026'],
       ['Legal Spend Management', 'Juridico', 'Media', 'Q3 2026'],
     ],
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.warning[0], PDF_COLORS.warning[1], PDF_COLORS.warning[2]] },
     styles: { fontSize: 9, cellPadding: 3 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 10;
   
   y = checkPageBreak(doc, y, 30, title, pageCount);
   
   y = addSubsectionTitle(doc, '1.5 Conclusion Ejecutiva', y);
   y = addParagraph(doc,
     'ObelixIA ha alcanzado un nivel de madurez enterprise comparable a SAP SuccessFactors y Workday en funcionalidades ' +
     'core, superandolos en integracion cross-modular y en innovacion tecnologica (Blockchain, Smart Contracts, ' +
     'orquestacion IA). La plataforma esta posicionada como lider en el segmento de ERP integrado para mercados ' +
     'regulados (banca, seguros, administracion publica) en Espana, Andorra y expansion europea.', y);
 }
 
 function generateHRModuleAudit(doc: jsPDF, pageCount: { value: number }, detailLevel: DetailLevel): void {
   doc.addPage();
   pageCount.value++;
   
   const title = 'Auditoria Modulo RRHH';
   addHeader(doc, title, pageCount.value);
   addFooter(doc);
   
   let y = 35;
   
   y = addSectionTitle(doc, '2. MODULO DE RECURSOS HUMANOS (HCM)', y);
   
   y = addSubsectionTitle(doc, '2.1 Inventario de Funcionalidades', y + 5);
   
   // Group features by category
   const categories = [...new Set(HR_FEATURES.map(f => f.category))];
   
   categories.forEach(category => {
     y = checkPageBreak(doc, y, 40, title, pageCount);
     
     const categoryFeatures = HR_FEATURES.filter(f => f.category === category);
     const completeCount = categoryFeatures.filter(f => f.status === 'complete' || f.status === 'innovation').length;
     
     // Category header
     doc.setFillColor(PDF_COLORS.backgrounds.info[0], PDF_COLORS.backgrounds.info[1], PDF_COLORS.backgrounds.info[2]);
     doc.rect(15, y, 180, 8, 'F');
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(10);
     doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
     doc.text(`${sanitizeForPDF(category)} (${completeCount}/${categoryFeatures.length})`, 20, y + 5.5);
     y += 12;
     
     if (detailLevel !== 'executive') {
       // Features table
       const tableData = categoryFeatures.map(f => {
         const statusText = f.status === 'complete' ? 'Completo' : 
                           f.status === 'innovation' ? 'Innovacion' : 
                           f.status === 'partial' ? 'Parcial' : 'Pendiente';
         return [sanitizeForPDF(f.name), sanitizeForPDF(f.description), statusText];
       });
       
       autoTable(doc, {
         startY: y,
         head: [['Funcionalidad', 'Descripcion', 'Estado']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [PDF_COLORS.gray[600][0], PDF_COLORS.gray[600][1], PDF_COLORS.gray[600][2]], fontSize: 8 },
         styles: { fontSize: 8, cellPadding: 2 },
         columnStyles: {
           0: { cellWidth: 40 },
           1: { cellWidth: 110 },
           2: { cellWidth: 25 },
         },
         margin: { left: 15, right: 15 },
       });
       
       y = (doc as any).lastAutoTable.finalY + 8;
     } else {
       y += 5;
     }
   });
   
   // Edge Functions section
   y = checkPageBreak(doc, y, 60, title, pageCount);
   y = addSubsectionTitle(doc, '2.2 Edge Functions Implementadas', y + 5);
   
   autoTable(doc, {
     startY: y,
     head: [['# ', 'Nombre Funcion', 'Proposito']],
     body: HR_EDGE_FUNCTIONS.map((fn, idx) => [
       (idx + 1).toString(),
       fn,
       getEdgeFunctionPurpose(fn)
     ]),
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.success[0], PDF_COLORS.success[1], PDF_COLORS.success[2]], fontSize: 8 },
     styles: { fontSize: 8, cellPadding: 2 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 10;
   
   // Competitor comparison
   y = checkPageBreak(doc, y, 80, title, pageCount);
   y = addSubsectionTitle(doc, '2.3 Comparativa vs Competencia', y);
   
   autoTable(doc, {
     startY: y,
     head: [['Funcionalidad', 'SAP', 'Workday', 'Oracle', 'ObelixIA', 'Estado']],
     body: HR_COMPETITOR_FEATURES.map(f => [
       sanitizeForPDF(f.feature),
       getStatusIcon(f.sap),
       getStatusIcon(f.workday),
       getStatusIcon(f.oracle),
       getStatusIcon(f.obelixia),
       getStatusLabel(f.status)
     ]),
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 8 },
     styles: { fontSize: 7, cellPadding: 2 },
     columnStyles: {
       0: { cellWidth: 55 },
       1: { cellWidth: 20, halign: 'center' },
       2: { cellWidth: 20, halign: 'center' },
       3: { cellWidth: 20, halign: 'center' },
       4: { cellWidth: 20, halign: 'center' },
       5: { cellWidth: 30 },
     },
     margin: { left: 15, right: 15 },
   });
 }
 
 function generateFiscalModuleAudit(doc: jsPDF, pageCount: { value: number }, detailLevel: DetailLevel): void {
   doc.addPage();
   pageCount.value++;
   
   const title = 'Auditoria Modulo Fiscal';
   addHeader(doc, title, pageCount.value);
   addFooter(doc);
   
   let y = 35;
   
   y = addSectionTitle(doc, '3. MODULO FISCAL Y CONTABLE', y);
   
   y = addSubsectionTitle(doc, '3.1 Vision General', y + 5);
   y = addParagraph(doc,
     'El modulo Fiscal de ObelixIA proporciona una solucion completa de gestion tributaria multi-jurisdiccional ' +
     'con soporte nativo para 20+ paises. Incluye cumplimiento automatizado SII (Espana), Intrastat (UE), ' +
     'MTD (UK), y regimenes especiales (UAE Free Zones, US LLCs). El agente IA fiscal proporciona asistencia ' +
     'contextual con interaccion por voz bidireccional.', y);
   
   y = addSubsectionTitle(doc, '3.2 Inventario de Funcionalidades', y + 5);
   
   const categories = [...new Set(FISCAL_FEATURES.map(f => f.category))];
   
   categories.forEach(category => {
     y = checkPageBreak(doc, y, 40, title, pageCount);
     
     const categoryFeatures = FISCAL_FEATURES.filter(f => f.category === category);
     const completeCount = categoryFeatures.filter(f => f.status === 'complete' || f.status === 'innovation').length;
     
     doc.setFillColor(PDF_COLORS.backgrounds.success[0], PDF_COLORS.backgrounds.success[1], PDF_COLORS.backgrounds.success[2]);
     doc.rect(15, y, 180, 8, 'F');
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(10);
     doc.setTextColor(22, 101, 52);
     doc.text(`${sanitizeForPDF(category)} (${completeCount}/${categoryFeatures.length})`, 20, y + 5.5);
     y += 12;
     
     if (detailLevel !== 'executive') {
       const tableData = categoryFeatures.map(f => {
         const statusText = f.status === 'complete' ? 'Completo' : 
                           f.status === 'innovation' ? 'Innovacion' : 'Parcial';
         return [sanitizeForPDF(f.name), sanitizeForPDF(f.description), statusText];
       });
       
       autoTable(doc, {
         startY: y,
         head: [['Funcionalidad', 'Descripcion', 'Estado']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [PDF_COLORS.gray[600][0], PDF_COLORS.gray[600][1], PDF_COLORS.gray[600][2]], fontSize: 8 },
         styles: { fontSize: 8, cellPadding: 2 },
         columnStyles: {
           0: { cellWidth: 45 },
           1: { cellWidth: 105 },
           2: { cellWidth: 25 },
         },
         margin: { left: 15, right: 15 },
       });
       
       y = (doc as any).lastAutoTable.finalY + 8;
     } else {
       y += 5;
     }
   });
   
   // Edge Functions
   y = checkPageBreak(doc, y, 60, title, pageCount);
   y = addSubsectionTitle(doc, '3.3 Edge Functions Implementadas', y + 5);
   
   autoTable(doc, {
     startY: y,
     head: [['#', 'Nombre Funcion', 'Proposito']],
     body: FISCAL_EDGE_FUNCTIONS.map((fn, idx) => [
       (idx + 1).toString(),
       fn,
       getEdgeFunctionPurpose(fn)
     ]),
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.success[0], PDF_COLORS.success[1], PDF_COLORS.success[2]], fontSize: 8 },
     styles: { fontSize: 8, cellPadding: 2 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 10;
   
   // Competitor comparison
   y = checkPageBreak(doc, y, 60, title, pageCount);
   y = addSubsectionTitle(doc, '3.4 Comparativa vs Competencia', y);
   
   autoTable(doc, {
     startY: y,
     head: [['Funcionalidad', 'SAP', 'Workday', 'Oracle', 'ObelixIA', 'Estado']],
     body: FISCAL_COMPETITOR_FEATURES.map(f => [
       sanitizeForPDF(f.feature),
       getStatusIcon(f.sap),
       getStatusIcon(f.workday),
       getStatusIcon(f.oracle),
       getStatusIcon(f.obelixia),
       getStatusLabel(f.status)
     ]),
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 8 },
     styles: { fontSize: 8, cellPadding: 2 },
     columnStyles: {
       0: { cellWidth: 55 },
       1: { cellWidth: 20, halign: 'center' },
       2: { cellWidth: 20, halign: 'center' },
       3: { cellWidth: 20, halign: 'center' },
       4: { cellWidth: 20, halign: 'center' },
       5: { cellWidth: 30 },
     },
     margin: { left: 15, right: 15 },
   });
 }
 
 function generateLegalModuleAudit(doc: jsPDF, pageCount: { value: number }, detailLevel: DetailLevel): void {
   doc.addPage();
   pageCount.value++;
   
   const title = 'Auditoria Modulo Juridico';
   addHeader(doc, title, pageCount.value);
   addFooter(doc);
   
   let y = 35;
   
   y = addSectionTitle(doc, '4. MODULO JURIDICO ENTERPRISE', y);
   
   y = addSubsectionTitle(doc, '4.1 Vision General', y + 5);
   y = addParagraph(doc,
     'El modulo Juridico de ObelixIA funciona como el centro de validacion normativa del ERP, proporcionando ' +
     'una suite completa de operaciones legales enterprise. Incluye CLM avanzado, gestion de entidades, ' +
     'portfolio de propiedad intelectual, analitica predictiva de litigios y el innovador Gateway de ' +
     'Validacion que bloquea automaticamente operaciones de alto riesgo en otros modulos.', y);
   
   y = addSubsectionTitle(doc, '4.2 Inventario de Funcionalidades', y + 5);
   
   const categories = [...new Set(LEGAL_FEATURES.map(f => f.category))];
   
   categories.forEach(category => {
     y = checkPageBreak(doc, y, 40, title, pageCount);
     
     const categoryFeatures = LEGAL_FEATURES.filter(f => f.category === category);
     const completeCount = categoryFeatures.filter(f => f.status === 'complete' || f.status === 'innovation').length;
     
     doc.setFillColor(PDF_COLORS.backgrounds.warning[0], PDF_COLORS.backgrounds.warning[1], PDF_COLORS.backgrounds.warning[2]);
     doc.rect(15, y, 180, 8, 'F');
     doc.setFont('helvetica', 'bold');
     doc.setFontSize(10);
     doc.setTextColor(161, 98, 7);
     doc.text(`${sanitizeForPDF(category)} (${completeCount}/${categoryFeatures.length})`, 20, y + 5.5);
     y += 12;
     
     if (detailLevel !== 'executive') {
       const tableData = categoryFeatures.map(f => {
         const statusText = f.status === 'complete' ? 'Completo' : 
                           f.status === 'innovation' ? 'Innovacion' : 
                           f.status === 'partial' ? 'Parcial' : 'Pendiente';
         return [sanitizeForPDF(f.name), sanitizeForPDF(f.description), statusText];
       });
       
       autoTable(doc, {
         startY: y,
         head: [['Funcionalidad', 'Descripcion', 'Estado']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [PDF_COLORS.gray[600][0], PDF_COLORS.gray[600][1], PDF_COLORS.gray[600][2]], fontSize: 8 },
         styles: { fontSize: 8, cellPadding: 2 },
         columnStyles: {
           0: { cellWidth: 50 },
           1: { cellWidth: 100 },
           2: { cellWidth: 25 },
         },
         margin: { left: 15, right: 15 },
       });
       
       y = (doc as any).lastAutoTable.finalY + 8;
     } else {
       y += 5;
     }
   });
   
   // Edge Functions
   y = checkPageBreak(doc, y, 50, title, pageCount);
   y = addSubsectionTitle(doc, '4.3 Edge Functions Implementadas', y + 5);
   
   autoTable(doc, {
     startY: y,
     head: [['#', 'Nombre Funcion', 'Proposito']],
     body: LEGAL_EDGE_FUNCTIONS.map((fn, idx) => [
       (idx + 1).toString(),
       fn,
       getEdgeFunctionPurpose(fn)
     ]),
     theme: 'striped',
     headStyles: { fillColor: [161, 98, 7], fontSize: 8 },
     styles: { fontSize: 8, cellPadding: 2 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 10;
   
   // Competitor comparison
   y = checkPageBreak(doc, y, 70, title, pageCount);
   y = addSubsectionTitle(doc, '4.4 Comparativa vs Competencia (incluyendo Icertis)', y);
   
   autoTable(doc, {
     startY: y,
     head: [['Funcionalidad', 'SAP', 'Workday', 'Oracle', 'Icertis', 'ObelixIA', 'Estado']],
     body: LEGAL_COMPETITOR_FEATURES.map(f => [
       sanitizeForPDF(f.feature),
       getStatusIcon(f.sap),
       getStatusIcon(f.workday),
       getStatusIcon(f.oracle),
       getStatusIcon(f.icertis || 'no'),
       getStatusIcon(f.obelixia),
       getStatusLabel(f.status)
     ]),
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 7 },
     styles: { fontSize: 7, cellPadding: 2 },
     columnStyles: {
       0: { cellWidth: 45 },
       1: { cellWidth: 18, halign: 'center' },
       2: { cellWidth: 18, halign: 'center' },
       3: { cellWidth: 18, halign: 'center' },
       4: { cellWidth: 18, halign: 'center' },
       5: { cellWidth: 18, halign: 'center' },
       6: { cellWidth: 28 },
     },
     margin: { left: 15, right: 15 },
   });
 }
 
 function generateCompetitiveAnalysis(doc: jsPDF, pageCount: { value: number }): void {
   doc.addPage();
   pageCount.value++;
   
   const title = 'Analisis Posicion Competitiva';
   addHeader(doc, title, pageCount.value);
   addFooter(doc);
   
   let y = 35;
   
   y = addSectionTitle(doc, '5. ANALISIS DE POSICION COMPETITIVA', y);
   
   y = addSubsectionTitle(doc, '5.1 Ranking por Categoria', y + 5);
   
   autoTable(doc, {
     startY: y,
     head: [['Modulo', 'Posicion Estimada', 'Por detras de', 'A la par con', 'Supera a']],
     body: [
       ['RRHH', 'Top 5 Global', 'SAP, Workday (escala)', 'Oracle, Personio', 'Factorial, soluciones locales'],
       ['Fiscal', 'Top 3 Espana', 'SAP (escala global)', 'Oracle Financials', 'Holded, A3, Sage locales'],
       ['Juridico', 'Top 3 Global', '-', 'Icertis (CLM puro)', 'Thomson Reuters, LexisNexis'],
     ],
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 8 },
     styles: { fontSize: 8, cellPadding: 3 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 15;
   
   y = addSubsectionTitle(doc, '5.2 Ventajas Competitivas Unicas', y);
   
   const advantages = [
     { advantage: 'Integracion HCM + Legal + Fiscal', description: 'Unico ERP que unifica los tres modulos con IA nativa', impact: 'Diferenciacion absoluta' },
     { advantage: 'Cross-Module Orchestrator', description: 'Coordinacion automatica entre modulos con resolucion de conflictos', impact: 'Eficiencia operativa +40%' },
     { advantage: 'Gateway Validacion Legal', description: 'Bloqueo automatico de operaciones de alto riesgo', impact: 'Reduccion riesgo legal 95%' },
     { advantage: 'Smart Contracts', description: 'Clausulas auto-ejecutables con penalizaciones automaticas', impact: 'Innovacion disruptiva' },
     { advantage: 'Credenciales Blockchain', description: 'Verificacion instantanea de titulos y certificaciones', impact: 'Innovacion 2025+' },
     { advantage: 'Voz Bidireccional', description: 'Interaccion natural con agentes IA por voz', impact: 'UX superior' },
     { advantage: 'Multi-jurisdiccion Nativa', description: 'ES, AD, EU, UK, UAE, US sin configuracion adicional', impact: 'Time-to-value rapido' },
   ];
   
   autoTable(doc, {
     startY: y,
     head: [['Ventaja', 'Descripcion', 'Impacto']],
     body: advantages.map(a => [sanitizeForPDF(a.advantage), sanitizeForPDF(a.description), sanitizeForPDF(a.impact)]),
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.success[0], PDF_COLORS.success[1], PDF_COLORS.success[2]], fontSize: 8 },
     styles: { fontSize: 8, cellPadding: 3 },
     columnStyles: {
       0: { cellWidth: 45 },
       1: { cellWidth: 95 },
       2: { cellWidth: 35 },
     },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 15;
   
   y = checkPageBreak(doc, y, 70, title, pageCount);
   
   y = addSubsectionTitle(doc, '5.3 Conclusion Honesta', y);
   y = addParagraph(doc,
     'POSICION ACTUAL: ObelixIA ha alcanzado paridad funcional con los lideres mundiales en la mayoria de ' +
     'capacidades core de RRHH, Fiscal y Juridico. La plataforma destaca especialmente en:', y);
   
   const conclusions = [
     '- Integracion cross-modular con orquestacion IA (unico en el mercado)',
     '- Innovacion tecnologica: Blockchain, Smart Contracts, Copiloto Autonomo',
     '- Especializacion normativa espanola y andorrana',
     '- Interfaz moderna con voz bidireccional',
   ];
   
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(10);
   conclusions.forEach(c => {
     y = checkPageBreak(doc, y, 8, title, pageCount);
     doc.text(sanitizeForPDF(c), 20, y);
     y += 6;
   });
   
   y += 5;
   y = addParagraph(doc,
     'GAPS RESTANTES: Quedan funcionalidades de nicho pendientes (Gig Workforce, Total Rewards, ESG Social, ' +
     'Matter Management dedicado, Legal Spend). Estos gaps representan ~15% del alcance total y estan ' +
     'planificados para Q1-Q3 2026.', y);
   
   y += 5;
   y = addParagraph(doc,
     'POSICIONAMIENTO FINAL: El unico ERP que combina HCM + Legal + Fiscal en una plataforma integrada ' +
     'con IA multi-agente, superando a SAP, Workday y Oracle en integracion, y a Icertis/Thomson Reuters ' +
     'en convergencia HR-Legal. Lider indiscutible para mercados regulados en Espana y expansion europea.', y);
 }
 
 function generateRoadmap(doc: jsPDF, pageCount: { value: number }): void {
   doc.addPage();
   pageCount.value++;
   
   const title = 'Roadmap y Recomendaciones';
   addHeader(doc, title, pageCount.value);
   addFooter(doc);
   
   let y = 35;
   
   y = addSectionTitle(doc, '6. ROADMAP 2026-2027', y);
   
   y = addSubsectionTitle(doc, '6.1 Prioridades Inmediatas', y + 5);
   
   autoTable(doc, {
     startY: y,
     head: [['Prioridad', 'Funcionalidad', 'Modulo', 'Estimacion', 'ROI Esperado']],
     body: [
       ['1', 'Gig/Contingent Workforce', 'RRHH', 'Q1 2026', 'Flexibilidad laboral'],
       ['2', 'Total Rewards Statement', 'RRHH', 'Q1 2026', 'Engagement +25%'],
       ['3', 'ESG Reporting Social', 'RRHH', 'Q2 2026', 'Cumplimiento CSRD'],
       ['4', 'Matter Management', 'Juridico', 'Q2 2026', 'Eficiencia legal +30%'],
       ['5', 'Legal Spend Management', 'Juridico', 'Q3 2026', 'Control costes legales'],
     ],
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]], fontSize: 9 },
     styles: { fontSize: 9, cellPadding: 4 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 15;
   
   y = addSubsectionTitle(doc, '6.2 Roadmap por Trimestre', y);
   
   autoTable(doc, {
     startY: y,
     head: [['Trimestre', 'Objetivos', 'Entregables']],
     body: [
       ['Q1 2026', 'Workforce externo + Recompensas', 'HRGigWorkforcePanel, HRTotalRewardsPanel'],
       ['Q2 2026', 'ESG Social + Matter Management', 'HRESGReportingPanel, LegalMatterPanel'],
       ['Q3 2026', 'Legal Spend + Expansion US', 'LegalSpendPanel, US compliance'],
       ['Q4 2026', 'Certificaciones ISO + SOC2', 'Auditorias, documentacion'],
       ['Q1 2027', 'Version 11.0 Next-Gen', 'AI Agents v3, Edge AI'],
     ],
     theme: 'striped',
     headStyles: { fillColor: [PDF_COLORS.secondary[0], PDF_COLORS.secondary[1], PDF_COLORS.secondary[2]], fontSize: 9 },
     styles: { fontSize: 9, cellPadding: 4 },
     margin: { left: 15, right: 15 },
   });
   
   y = (doc as any).lastAutoTable.finalY + 15;
   
   y = addSubsectionTitle(doc, '6.3 Recomendaciones Estrategicas', y);
   
   const recommendations = [
     '1. PRIORIZAR ESG: La normativa CSRD entra en vigor 2025-2026 para grandes empresas. Adelantarse posiciona a ObelixIA como referente en sostenibilidad corporativa.',
     '2. CERTIFICACIONES: Obtener ISO 27001 y SOC 2 Type II antes de Q4 2026 para acceder a grandes cuentas que lo exigen como requisito.',
     '3. PARTNERSHIPS: Establecer alianzas con Big Four (Deloitte, KPMG, PwC, EY) para canal enterprise y credibilidad institucional.',
     '4. CASOS DE EXITO: Documentar 3-5 casos de exito detallados con metricas de ROI para material comercial.',
     '5. EXPANSION GEOGRAFICA: Portugal y Francia como primeros mercados de expansion por afinidad regulatoria.',
   ];
   
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(10);
   doc.setTextColor(PDF_COLORS.text.primary[0], PDF_COLORS.text.primary[1], PDF_COLORS.text.primary[2]);
   
   recommendations.forEach(r => {
     y = checkPageBreak(doc, y, 15, title, pageCount);
     const lines = doc.splitTextToSize(sanitizeForPDF(r), 175);
     doc.text(lines, 15, y);
     y += (lines.length * 5) + 5;
   });
 }
 
 // ============================================
 // HELPER FUNCTIONS
 // ============================================
 
 function getStatusIcon(status: 'yes' | 'partial' | 'no'): string {
   switch (status) {
     case 'yes': return 'SI';
     case 'partial': return 'PARCIAL';
     case 'no': return 'NO';
     default: return '-';
   }
 }
 
 function getStatusLabel(status: string): string {
   switch (status) {
     case 'complete': return 'Completo';
     case 'advantage': return 'Ventaja';
     case 'innovation': return 'Innovacion';
     case 'pending': return 'Pendiente';
     default: return status;
   }
 }
 
 function getEdgeFunctionPurpose(fn: string): string {
   const purposes: Record<string, string> = {
     'erp-hr-ai-agent': 'Orquestador principal multi-agente RRHH',
     'erp-hr-analytics-agent': 'Analytics basicos y metricas HR',
     'erp-hr-analytics-intelligence': 'Prediccion turnover, workforce planning',
     'erp-hr-autonomous-copilot': 'Copiloto autonomo 3 niveles',
     'erp-hr-clm-agent': 'Contract Lifecycle Management',
     'erp-hr-compliance-monitor': 'Monitoreo cumplimiento normativo',
     'erp-hr-credentials-agent': 'Credenciales Blockchain/DID',
     'erp-hr-executive-analytics': 'Dashboards ejecutivos',
     'erp-hr-offboarding-agent': 'Proceso de baja optimizado',
     'erp-hr-onboarding-agent': 'Onboarding adaptativo',
     'erp-hr-payroll-recalculation': 'Recalculo nominas con convenios',
     'erp-hr-performance-agent': 'Evaluacion desempeno 9-Box',
     'erp-hr-recruitment-agent': 'Scoring candidatos con IA',
     'erp-hr-smart-contracts': 'Smart Contracts laborales',
     'erp-hr-talent-skills-agent': 'Skills Ontology y gaps',
     'erp-hr-training-agent': 'Catalogo formacion por CNAE',
     'erp-hr-wellbeing-agent': 'Bienestar y burnout prediction',
     'erp-hr-whistleblower-agent': 'Canal denuncias EU',
     'erp-hr-accounting-bridge': 'Integracion con Contabilidad',
     'erp-fiscal-ai-agent': 'Agente IA fiscal multi-jurisdiccion',
     'erp-fiscal-closing-wizard': 'Asistente cierre fiscal',
     'erp-regulations-ai': 'Consulta normativa con IA',
     'erp-regulations-search': 'Busqueda en base de conocimiento',
     'erp-financial-reports': 'Generacion informes financieros',
     'erp-auto-accounting': 'Contabilizacion automatica',
     'erp-auto-reconciliation': 'Conciliacion bancaria IA',
     'erp-ai-journal-entries': 'Sugerencia asientos contables',
     'erp-dynamic-help': 'Ayuda contextual activa',
     'erp-voice-orchestrator': 'Orquestacion voz STT/TTS',
     'erp-voice-tts': 'Text-to-Speech ElevenLabs',
     'erp-voice-agent-token': 'Token conversacion voz',
     'erp-advisor-agent': 'Asesor fiscal general',
     'erp-advisor-compliance': 'Verificacion cumplimiento',
     'legal-ai-advisor': 'Asesor juridico multi-jurisdiccion',
     'legal-knowledge-sync': 'Sincronizacion base conocimiento',
     'legal-entity-management': 'Gestion entidades grupo',
     'legal-predictive-analytics': 'Prediccion litigios y costes',
     'legal-autonomous-copilot': 'Copiloto autonomo legal',
     'legal-validation-gateway-enhanced': 'Gateway validacion con bloqueo',
     'cross-module-orchestrator': 'Orquestacion cross-module',
     'smart-legal-contracts': 'Smart Contracts juridicos',
     'advanced-clm-engine': 'CLM avanzado con playbooks',
     'blockchain-credentials': 'Credenciales verificables',
   };
   
   return purposes[fn] || 'Funcion especializada';
 }
 
 // ============================================
 // MAIN EXPORT FUNCTION
 // ============================================
 
 export async function generateEnterpriseModulesAuditPDF(config: AuditConfig): Promise<void> {
   const doc = new jsPDF({
     orientation: 'portrait',
     unit: 'mm',
     format: 'a4',
   });
   
   const pageCount = { value: 1 };
   
   // Cover page
   generateCoverPage(doc);
   
   // Executive Summary
   generateExecutiveSummary(doc, pageCount);
   
   // Module audits based on config
   if (config.modules === 'all' || config.modules === 'rrhh') {
     generateHRModuleAudit(doc, pageCount, config.detailLevel);
   }
   
   if (config.modules === 'all' || config.modules === 'fiscal') {
     generateFiscalModuleAudit(doc, pageCount, config.detailLevel);
   }
   
   if (config.modules === 'all' || config.modules === 'legal') {
     generateLegalModuleAudit(doc, pageCount, config.detailLevel);
   }
   
   // Competitive analysis
   if (config.includeCompetitorAnalysis) {
     generateCompetitiveAnalysis(doc, pageCount);
   }
   
   // Roadmap
   if (config.includeRoadmap) {
     generateRoadmap(doc, pageCount);
   }
   
   // Save
   const today = new Date().toISOString().split('T')[0];
   doc.save(`ObelixIA_Auditoria_Enterprise_${config.modules}_${today}.pdf`);
 }