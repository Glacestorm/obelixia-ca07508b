/**
 * Economic Valuation & Commercial Pricing Data
 * Market-based pricing following enterprise software standards
 */

// ============================================
// DEVELOPMENT COST ESTIMATION (per feature)
// Based on senior developer rates EUR 85/hour
// ============================================

export interface FeatureValuation {
  name: string;
  category: string;
  devHours: number;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  marketValue: number; // EUR
  competitorPrice: number; // What competitors charge for similar
  aiPremium: number; // Additional value for AI features
}

// ============================================
// CRM VALUATION
// ============================================

export const CRM_VALUATIONS: FeatureValuation[] = [
  // Pipeline & Deals
  { name: 'Kanban Pipeline Visual', category: 'Pipeline', devHours: 120, complexity: 'medium', marketValue: 15000, competitorPrice: 18000, aiPremium: 0 },
  { name: 'Deal Scoring Automatico', category: 'Pipeline', devHours: 80, complexity: 'medium', marketValue: 12000, competitorPrice: 15000, aiPremium: 3000 },
  { name: 'Stage Flow Automation', category: 'Pipeline', devHours: 100, complexity: 'high', marketValue: 18000, competitorPrice: 22000, aiPremium: 5000 },
  { name: 'Predictive Pipeline IA', category: 'Pipeline', devHours: 200, complexity: 'very_high', marketValue: 45000, competitorPrice: 60000, aiPremium: 25000 },
  
  // Contactos
  { name: 'Gestion Contactos Avanzada', category: 'Contactos', devHours: 150, complexity: 'medium', marketValue: 18000, competitorPrice: 20000, aiPremium: 0 },
  { name: 'Empresas y Jerarquias', category: 'Contactos', devHours: 100, complexity: 'medium', marketValue: 12000, competitorPrice: 15000, aiPremium: 0 },
  { name: 'Segmentacion Dinamica', category: 'Contactos', devHours: 80, complexity: 'medium', marketValue: 10000, competitorPrice: 12000, aiPremium: 2000 },
  { name: 'Deteccion Duplicados IA', category: 'Contactos', devHours: 60, complexity: 'high', marketValue: 15000, competitorPrice: 18000, aiPremium: 8000 },
  
  // Actividades
  { name: 'Registro Actividades', category: 'Actividades', devHours: 100, complexity: 'medium', marketValue: 12000, competitorPrice: 14000, aiPremium: 0 },
  { name: 'Calendario Integrado', category: 'Actividades', devHours: 80, complexity: 'medium', marketValue: 10000, competitorPrice: 12000, aiPremium: 0 },
  { name: 'Recordatorios Automaticos', category: 'Actividades', devHours: 40, complexity: 'low', marketValue: 5000, competitorPrice: 6000, aiPremium: 0 },
  
  // Organizacion
  { name: 'Multi-Workspace', category: 'Organizacion', devHours: 200, complexity: 'very_high', marketValue: 35000, competitorPrice: 45000, aiPremium: 0 },
  { name: 'Gestion Equipos', category: 'Organizacion', devHours: 120, complexity: 'high', marketValue: 18000, competitorPrice: 22000, aiPremium: 0 },
  { name: 'RBAC Avanzado', category: 'Organizacion', devHours: 150, complexity: 'very_high', marketValue: 25000, competitorPrice: 30000, aiPremium: 0 },
  
  // Omnichannel
  { name: 'Inbox Omnichannel', category: 'Omnichannel', devHours: 300, complexity: 'very_high', marketValue: 55000, competitorPrice: 70000, aiPremium: 10000 },
  { name: 'Integracion WhatsApp Business', category: 'Omnichannel', devHours: 120, complexity: 'high', marketValue: 25000, competitorPrice: 35000, aiPremium: 0 },
  { name: 'Integracion Telegram', category: 'Omnichannel', devHours: 80, complexity: 'medium', marketValue: 15000, competitorPrice: 18000, aiPremium: 0 },
  { name: 'Respuestas Rapidas', category: 'Omnichannel', devHours: 40, complexity: 'low', marketValue: 6000, competitorPrice: 8000, aiPremium: 0 },
  
  // SLA
  { name: 'Dashboard SLA', category: 'SLA', devHours: 100, complexity: 'high', marketValue: 18000, competitorPrice: 22000, aiPremium: 0 },
  { name: 'Politicas SLA', category: 'SLA', devHours: 80, complexity: 'medium', marketValue: 12000, competitorPrice: 15000, aiPremium: 0 },
  { name: 'Alertas Incumplimiento', category: 'SLA', devHours: 60, complexity: 'medium', marketValue: 8000, competitorPrice: 10000, aiPremium: 0 },
  { name: 'Reglas Escalado', category: 'SLA', devHours: 80, complexity: 'high', marketValue: 12000, competitorPrice: 15000, aiPremium: 0 },
  
  // IA Avanzada
  { name: 'Analisis Sentimiento', category: 'IA Avanzada', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 30000 },
  { name: 'Trend Detection', category: 'IA Avanzada', devHours: 120, complexity: 'very_high', marketValue: 35000, competitorPrice: 45000, aiPremium: 25000 },
  { name: 'Churn Prediction', category: 'IA Avanzada', devHours: 200, complexity: 'very_high', marketValue: 60000, competitorPrice: 80000, aiPremium: 45000 },
  { name: 'Asistente Voz ElevenLabs', category: 'IA Avanzada', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 40000 },
  
  // Agentes IA
  { name: 'Panel Agentes IA', category: 'Agentes IA', devHours: 200, complexity: 'very_high', marketValue: 45000, competitorPrice: 60000, aiPremium: 35000 },
  { name: 'Lead Scoring ML', category: 'Agentes IA', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 30000 },
  { name: 'Next Best Action', category: 'Agentes IA', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 40000 },
  { name: 'Email Generator IA', category: 'Agentes IA', devHours: 100, complexity: 'high', marketValue: 25000, competitorPrice: 35000, aiPremium: 18000 },
  
  // Colaboracion
  { name: 'Colaboracion Realtime', category: 'Colaboracion', devHours: 200, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 10000 },
  { name: 'Notificaciones Push', category: 'Colaboracion', devHours: 60, complexity: 'medium', marketValue: 8000, competitorPrice: 10000, aiPremium: 0 },
  
  // Automatizacion
  { name: 'Distribucion Leads IA', category: 'Automatizacion', devHours: 120, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 12000 },
  { name: 'Round Robin', category: 'Automatizacion', devHours: 40, complexity: 'low', marketValue: 6000, competitorPrice: 8000, aiPremium: 0 },
  { name: 'Email Sequences', category: 'Automatizacion', devHours: 100, complexity: 'high', marketValue: 18000, competitorPrice: 24000, aiPremium: 5000 },
  { name: 'Task Automation', category: 'Automatizacion', devHours: 80, complexity: 'medium', marketValue: 12000, competitorPrice: 15000, aiPremium: 0 },
];

// ============================================
// ERP HR VALUATION
// ============================================

export const HR_VALUATIONS: FeatureValuation[] = [
  // Talento
  { name: 'Gestion Empleados Completa', category: 'Talento', devHours: 250, complexity: 'very_high', marketValue: 45000, competitorPrice: 60000, aiPremium: 0 },
  { name: 'Reclutamiento IA', category: 'Talento', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 35000 },
  { name: 'Onboarding Adaptativo', category: 'Talento', devHours: 150, complexity: 'high', marketValue: 35000, competitorPrice: 45000, aiPremium: 15000 },
  { name: 'Offboarding Inteligente', category: 'Talento', devHours: 120, complexity: 'high', marketValue: 28000, competitorPrice: 35000, aiPremium: 10000 },
  
  // Operaciones
  { name: 'Motor Nominas Completo', category: 'Operaciones', devHours: 400, complexity: 'very_high', marketValue: 85000, competitorPrice: 120000, aiPremium: 0 },
  { name: 'Recalculo Convenios IA', category: 'Operaciones', devHours: 180, complexity: 'very_high', marketValue: 45000, competitorPrice: 60000, aiPremium: 25000 },
  { name: 'Sistema Finiquitos 3 Niveles', category: 'Operaciones', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 20000 },
  { name: 'Integracion SILTRA/RED', category: 'Operaciones', devHours: 200, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 0 },
  { name: 'Gestion Vacaciones', category: 'Operaciones', devHours: 100, complexity: 'medium', marketValue: 18000, competitorPrice: 22000, aiPremium: 0 },
  { name: 'Generador Contratos', category: 'Operaciones', devHours: 120, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 5000 },
  { name: 'Gestion Sindical Art.68', category: 'Operaciones', devHours: 100, complexity: 'high', marketValue: 22000, competitorPrice: 28000, aiPremium: 0 },
  { name: 'OCR Documentos IA', category: 'Operaciones', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 25000 },
  { name: 'Organigramas Visuales', category: 'Operaciones', devHours: 80, complexity: 'medium', marketValue: 15000, competitorPrice: 18000, aiPremium: 0 },
  { name: 'Vigilancia BOE/BOPA', category: 'Operaciones', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 15000 },
  
  // Desarrollo
  { name: 'Desempeno 9-Box Grid', category: 'Desarrollo', devHours: 150, complexity: 'high', marketValue: 35000, competitorPrice: 45000, aiPremium: 10000 },
  { name: 'Catalogo Formacion CNAE', category: 'Desarrollo', devHours: 120, complexity: 'high', marketValue: 28000, competitorPrice: 35000, aiPremium: 8000 },
  { name: 'Analytics Flight Risk', category: 'Desarrollo', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 35000 },
  { name: 'Beneficios Flex', category: 'Desarrollo', devHours: 100, complexity: 'high', marketValue: 22000, competitorPrice: 28000, aiPremium: 0 },
  { name: 'PRL por Sector', category: 'Desarrollo', devHours: 120, complexity: 'high', marketValue: 28000, competitorPrice: 35000, aiPremium: 5000 },
  
  // Compliance
  { name: 'Whistleblower EU 2019/1937', category: 'Compliance', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 20000 },
  { name: 'Plan Igualdad RD 901/2020', category: 'Compliance', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 10000 },
  { name: 'Registro Horario Art.34.9', category: 'Compliance', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 0 },
  
  // Talento Avanzado
  { name: 'Skills Ontology', category: 'Talento Avanzado', devHours: 250, complexity: 'very_high', marketValue: 70000, competitorPrice: 95000, aiPremium: 40000 },
  { name: 'Talent Marketplace', category: 'Talento Avanzado', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 30000 },
  { name: 'Planes Sucesion', category: 'Talento Avanzado', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 65000, aiPremium: 20000 },
  
  // Employee Experience
  { name: 'Wellbeing Dashboard Maslach', category: 'Experience', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 35000 },
  { name: 'Encuestas Pulso IA', category: 'Experience', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 15000 },
  { name: 'Programas Wellness', category: 'Experience', devHours: 100, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 10000 },
  
  // CLM HR
  { name: 'CLM Contratos HR', category: 'CLM', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 25000 },
  { name: 'Risk Scoring Clausulas', category: 'CLM', devHours: 150, complexity: 'very_high', marketValue: 45000, competitorPrice: 60000, aiPremium: 30000 },
  { name: 'Comparativa Versiones', category: 'CLM', devHours: 100, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 10000 },
  
  // Innovacion
  { name: 'Blockchain Credentials EBSI', category: 'Innovacion', devHours: 300, complexity: 'very_high', marketValue: 85000, competitorPrice: 120000, aiPremium: 50000 },
  { name: 'Copiloto Autonomo 3 Niveles', category: 'Innovacion', devHours: 350, complexity: 'very_high', marketValue: 100000, competitorPrice: 150000, aiPremium: 70000 },
  { name: 'Smart Contracts HR', category: 'Innovacion', devHours: 280, complexity: 'very_high', marketValue: 80000, competitorPrice: 110000, aiPremium: 50000 },
  
  // Analytics Intelligence
  { name: 'Turnover Prediction', category: 'Analytics', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 40000 },
  { name: 'Workforce Planning', category: 'Analytics', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 65000, aiPremium: 30000 },
  { name: 'Salary Benchmark', category: 'Analytics', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 20000 },
];

// ============================================
// ERP FISCAL VALUATION
// ============================================

export const FISCAL_VALUATIONS: FeatureValuation[] = [
  // SII
  { name: 'Dashboard SII Completo', category: 'SII', devHours: 200, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 10000 },
  { name: 'Generacion Registros SII', category: 'SII', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 0 },
  { name: 'Sistema Correcciones AEAT', category: 'SII', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 5000 },
  { name: 'Config Multi-empresa', category: 'SII', devHours: 80, complexity: 'high', marketValue: 20000, competitorPrice: 25000, aiPremium: 0 },
  
  // Intrastat
  { name: 'Declaraciones Intrastat', category: 'Intrastat', devHours: 180, complexity: 'very_high', marketValue: 45000, competitorPrice: 60000, aiPremium: 0 },
  { name: 'Editor CN8 Completo', category: 'Intrastat', devHours: 100, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 0 },
  { name: 'Validacion Incoterms', category: 'Intrastat', devHours: 60, complexity: 'medium', marketValue: 15000, competitorPrice: 18000, aiPremium: 0 },
  { name: 'Dashboard Estadisticas', category: 'Intrastat', devHours: 80, complexity: 'medium', marketValue: 18000, competitorPrice: 22000, aiPremium: 0 },
  
  // Jurisdicciones
  { name: 'Espana Completo (IVA/IRPF/IS)', category: 'Jurisdicciones', devHours: 300, complexity: 'very_high', marketValue: 75000, competitorPrice: 100000, aiPremium: 0 },
  { name: 'Andorra IGI/IRPF/IS', category: 'Jurisdicciones', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 0 },
  { name: 'UK MTD VAT', category: 'Jurisdicciones', devHours: 120, complexity: 'very_high', marketValue: 35000, competitorPrice: 45000, aiPremium: 0 },
  { name: 'UAE Free Zones', category: 'Jurisdicciones', devHours: 100, complexity: 'high', marketValue: 28000, competitorPrice: 35000, aiPremium: 0 },
  { name: 'US LLCs Multi-Estado', category: 'Jurisdicciones', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 0 },
  { name: 'EU OSS/IOSS', category: 'Jurisdicciones', devHours: 120, complexity: 'very_high', marketValue: 35000, competitorPrice: 45000, aiPremium: 0 },
  
  // Modelos
  { name: 'Modelo 303 Automatico', category: 'Modelos', devHours: 100, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 5000 },
  { name: 'Modelo 390 Anual', category: 'Modelos', devHours: 80, complexity: 'high', marketValue: 20000, competitorPrice: 25000, aiPremium: 0 },
  { name: 'Modelo 111 Retenciones', category: 'Modelos', devHours: 80, complexity: 'high', marketValue: 20000, competitorPrice: 25000, aiPremium: 0 },
  { name: 'Modelo 115 Alquileres', category: 'Modelos', devHours: 60, complexity: 'medium', marketValue: 15000, competitorPrice: 18000, aiPremium: 0 },
  { name: 'Modelo 200 Sociedades', category: 'Modelos', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 0 },
  { name: 'Export XBRL/PDF/Excel', category: 'Modelos', devHours: 100, complexity: 'high', marketValue: 25000, competitorPrice: 32000, aiPremium: 0 },
  
  // Agente IA
  { name: 'Agente IA Fiscal Multi-Juris', category: 'IA Fiscal', devHours: 250, complexity: 'very_high', marketValue: 70000, competitorPrice: 95000, aiPremium: 50000 },
  { name: 'Verificacion Cumplimiento', category: 'IA Fiscal', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 25000 },
  { name: 'Sugerencia Asientos IA', category: 'IA Fiscal', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 35000 },
  { name: 'Consulta Normativa IA', category: 'IA Fiscal', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 28000 },
  { name: 'Interaccion Voz Fiscal', category: 'IA Fiscal', devHours: 180, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 45000 },
  
  // Ayuda
  { name: 'Ayuda Activa Errores', category: 'Ayuda', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 18000 },
  { name: 'Guia Contextual', category: 'Ayuda', devHours: 80, complexity: 'medium', marketValue: 18000, competitorPrice: 22000, aiPremium: 5000 },
];

// ============================================
// ERP LEGAL VALUATION
// ============================================

export const LEGAL_VALUATIONS: FeatureValuation[] = [
  // Core Legal
  { name: 'Dashboard Ejecutivo Legal', category: 'Core Legal', devHours: 150, complexity: 'high', marketValue: 35000, competitorPrice: 45000, aiPremium: 8000 },
  { name: 'Asesor Juridico IA Multi-Juris', category: 'Core Legal', devHours: 300, complexity: 'very_high', marketValue: 85000, competitorPrice: 120000, aiPremium: 60000 },
  { name: 'Sub-agentes Especializados', category: 'Core Legal', devHours: 250, complexity: 'very_high', marketValue: 70000, competitorPrice: 95000, aiPremium: 45000 },
  
  // Compliance
  { name: 'Matriz Cumplimiento', category: 'Compliance', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 15000 },
  { name: 'Evaluacion Riesgos Scoring', category: 'Compliance', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 30000 },
  { name: 'Alertas Regulatorias Auto', category: 'Compliance', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 15000 },
  
  // Documentos
  { name: 'Generador Documentos Multi-Juris', category: 'Documentos', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 20000 },
  { name: 'Analisis Contratos IA', category: 'Documentos', devHours: 250, complexity: 'very_high', marketValue: 70000, competitorPrice: 95000, aiPremium: 50000 },
  { name: 'Extraccion Obligaciones', category: 'Documentos', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 65000, aiPremium: 35000 },
  
  // Knowledge
  { name: 'Base Conocimiento Legal', category: 'Knowledge', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 25000 },
  { name: 'Sync Automatico BOE/EUR-Lex', category: 'Knowledge', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 20000 },
  { name: 'Jurisprudencia CENDOJ', category: 'Knowledge', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 12000 },
  
  // Reportes
  { name: 'Due Diligence Auto', category: 'Reportes', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 25000 },
  { name: 'Compliance Reports', category: 'Reportes', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 10000 },
  { name: 'Risk Reports', category: 'Reportes', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 20000 },
  { name: 'Audit Trail Inmutable', category: 'Reportes', devHours: 100, complexity: 'high', marketValue: 28000, competitorPrice: 35000, aiPremium: 0 },
  
  // Entity Management
  { name: 'Entity Management Completo', category: 'Entity', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 75000, aiPremium: 15000 },
  { name: 'Poderes y Representaciones', category: 'Entity', devHours: 120, complexity: 'high', marketValue: 30000, competitorPrice: 40000, aiPremium: 5000 },
  { name: 'Portfolio IP', category: 'Entity', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 10000 },
  { name: 'eDiscovery', category: 'Entity', devHours: 250, complexity: 'very_high', marketValue: 70000, competitorPrice: 95000, aiPremium: 30000 },
  { name: 'Calendario Corporativo', category: 'Entity', devHours: 80, complexity: 'medium', marketValue: 18000, competitorPrice: 22000, aiPremium: 0 },
  
  // Predictive
  { name: 'Predictive Litigation', category: 'Predictive', devHours: 250, complexity: 'very_high', marketValue: 75000, competitorPrice: 100000, aiPremium: 55000 },
  { name: 'Estimacion Costes Legales', category: 'Predictive', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 55000, aiPremium: 25000 },
  { name: 'Tendencias Jurisprudencia', category: 'Predictive', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 35000 },
  { name: 'Copiloto Autonomo Legal', category: 'Predictive', devHours: 300, complexity: 'very_high', marketValue: 90000, competitorPrice: 130000, aiPremium: 65000 },
  
  // Gateway & Orchestration
  { name: 'Legal Gateway Enhanced', category: 'Gateway', devHours: 280, complexity: 'very_high', marketValue: 80000, competitorPrice: 110000, aiPremium: 45000 },
  { name: 'Cross-Module Orchestrator', category: 'Gateway', devHours: 350, complexity: 'very_high', marketValue: 100000, competitorPrice: 140000, aiPremium: 60000 },
  { name: 'Smart Legal Contracts', category: 'Gateway', devHours: 300, complexity: 'very_high', marketValue: 90000, competitorPrice: 125000, aiPremium: 55000 },
  { name: 'Advanced CLM Engine', category: 'Gateway', devHours: 280, complexity: 'very_high', marketValue: 80000, competitorPrice: 110000, aiPremium: 40000 },
];

// ============================================
// CROSS-MODULE VALUATION
// ============================================

export const CROSS_MODULE_VALUATIONS: FeatureValuation[] = [
  { name: 'CRM-ERP Pipeline Sync', category: 'Integracion', devHours: 150, complexity: 'very_high', marketValue: 40000, competitorPrice: 60000, aiPremium: 15000 },
  { name: 'Customer 360 View', category: 'Integracion', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 80000, aiPremium: 20000 },
  { name: 'Quote-to-Cash E2E', category: 'Integracion', devHours: 250, complexity: 'very_high', marketValue: 70000, competitorPrice: 100000, aiPremium: 25000 },
  { name: 'Revenue Recognition', category: 'Integracion', devHours: 180, complexity: 'very_high', marketValue: 50000, competitorPrice: 70000, aiPremium: 15000 },
  { name: 'Legal Gateway Universal', category: 'Cross-Legal', devHours: 300, complexity: 'very_high', marketValue: 90000, competitorPrice: 130000, aiPremium: 50000 },
  { name: 'Cross-Module AI Orchestrator', category: 'Cross-IA', devHours: 400, complexity: 'very_high', marketValue: 120000, competitorPrice: 180000, aiPremium: 80000 },
  { name: 'Unified Knowledge Base', category: 'Cross-IA', devHours: 200, complexity: 'very_high', marketValue: 55000, competitorPrice: 80000, aiPremium: 30000 },
  { name: 'Blockchain Credentials Suite', category: 'Cross-Innovation', devHours: 350, complexity: 'very_high', marketValue: 100000, competitorPrice: 150000, aiPremium: 65000 },
];

// ============================================
// PRICING MODELS
// ============================================

export interface PricingTier {
  name: string;
  description: string;
  userRange: string;
  monthlyPerUser: number;
  annualPerUser: number;
  features: string[];
  support: string;
}

export interface LicenseOption {
  type: 'subscription' | 'perpetual' | 'hybrid';
  name: string;
  description: string;
  pricing: string;
  includes: string[];
  terms: string;
}

export const CRM_PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    description: 'Para equipos pequenos de ventas',
    userRange: '1-10 usuarios',
    monthlyPerUser: 49,
    annualPerUser: 39,
    features: ['Pipeline Kanban', 'Contactos ilimitados', 'Email integration', 'Reportes basicos'],
    support: 'Email (48h)',
  },
  {
    name: 'Professional',
    description: 'Para empresas en crecimiento',
    userRange: '11-50 usuarios',
    monthlyPerUser: 99,
    annualPerUser: 79,
    features: ['Todo Starter', 'Omnichannel (Email+WhatsApp)', 'SLA Dashboard', 'Automatizaciones', 'API Access'],
    support: 'Email + Chat (24h)',
  },
  {
    name: 'Enterprise',
    description: 'Para grandes organizaciones',
    userRange: '51-500 usuarios',
    monthlyPerUser: 179,
    annualPerUser: 149,
    features: ['Todo Professional', 'IA Completa (Sentimiento, Scoring, NBA)', 'Multi-workspace', 'RBAC Avanzado', 'SSO/SAML'],
    support: 'Dedicado (4h SLA)',
  },
  {
    name: 'Unlimited',
    description: 'Sin limites para corporaciones',
    userRange: '500+ usuarios',
    monthlyPerUser: 249,
    annualPerUser: 199,
    features: ['Todo Enterprise', 'Asistente Voz', 'Predictive Pipeline', 'Churn Prediction', 'On-premise option'],
    support: 'Premium 24/7 (1h SLA)',
  },
];

export const ERP_PRICING_TIERS: PricingTier[] = [
  {
    name: 'Essential',
    description: 'RRHH basico para PYMEs',
    userRange: '1-25 empleados',
    monthlyPerUser: 12,
    annualPerUser: 9,
    features: ['Fichas empleados', 'Vacaciones', 'Documentos', 'Organigrama'],
    support: 'Email (72h)',
  },
  {
    name: 'Professional',
    description: 'Suite HR completa',
    userRange: '26-100 empleados',
    monthlyPerUser: 25,
    annualPerUser: 19,
    features: ['Todo Essential', 'Nominas', 'Formacion', 'Evaluaciones', 'Onboarding'],
    support: 'Email + Chat (24h)',
  },
  {
    name: 'Enterprise',
    description: 'HCM + Fiscal + Legal',
    userRange: '101-500 empleados',
    monthlyPerUser: 45,
    annualPerUser: 35,
    features: ['HR Completo', 'Fiscal Multi-Juris', 'Legal Suite', 'Compliance', 'IA Agentes'],
    support: 'Dedicado (8h SLA)',
  },
  {
    name: 'Corporate',
    description: 'Full Enterprise con Innovacion',
    userRange: '500+ empleados',
    monthlyPerUser: 69,
    annualPerUser: 55,
    features: ['Todo Enterprise', 'Blockchain', 'Smart Contracts', 'Copiloto Autonomo', 'Cross-Module'],
    support: 'Premium 24/7 (2h SLA)',
  },
];

export const LICENSE_OPTIONS: LicenseOption[] = [
  {
    type: 'subscription',
    name: 'SaaS Cloud',
    description: 'Suscripcion mensual/anual en cloud',
    pricing: 'Por usuario/mes segun tier',
    includes: ['Hosting', 'Actualizaciones', 'Backups', 'Soporte', 'SLA 99.9%'],
    terms: 'Compromiso anual para mejor precio, mensual +25%',
  },
  {
    type: 'perpetual',
    name: 'Licencia Perpetua',
    description: 'Compra unica con mantenimiento anual',
    pricing: '36x mensualidad = precio perpetuo',
    includes: ['Licencia permanente', 'Codigo fuente opcional', 'Instalacion on-premise'],
    terms: 'Mantenimiento anual 18% del precio base',
  },
  {
    type: 'hybrid',
    name: 'Hybrid Enterprise',
    description: 'Cloud + On-premise segun modulo',
    pricing: 'Cotizacion personalizada',
    includes: ['Flexibilidad deployment', 'Data residency', 'Cumplimiento local'],
    terms: 'Minimo 100 usuarios, contrato 3 anos',
  },
];

// ============================================
// CALCULATION FUNCTIONS
// ============================================

export function calculateTotalValuation(valuations: FeatureValuation[]): {
  totalDevHours: number;
  totalMarketValue: number;
  totalCompetitorPrice: number;
  totalAIPremium: number;
  devCostAt85: number;
} {
  const totals = valuations.reduce((acc, v) => ({
    totalDevHours: acc.totalDevHours + v.devHours,
    totalMarketValue: acc.totalMarketValue + v.marketValue,
    totalCompetitorPrice: acc.totalCompetitorPrice + v.competitorPrice,
    totalAIPremium: acc.totalAIPremium + v.aiPremium,
  }), { totalDevHours: 0, totalMarketValue: 0, totalCompetitorPrice: 0, totalAIPremium: 0 });

  return {
    ...totals,
    devCostAt85: totals.totalDevHours * 85,
  };
}

export function getCRMValuationSummary() {
  return calculateTotalValuation(CRM_VALUATIONS);
}

export function getERPValuationSummary() {
  const hr = calculateTotalValuation(HR_VALUATIONS);
  const fiscal = calculateTotalValuation(FISCAL_VALUATIONS);
  const legal = calculateTotalValuation(LEGAL_VALUATIONS);
  
  return {
    hr,
    fiscal,
    legal,
    total: {
      totalDevHours: hr.totalDevHours + fiscal.totalDevHours + legal.totalDevHours,
      totalMarketValue: hr.totalMarketValue + fiscal.totalMarketValue + legal.totalMarketValue,
      totalCompetitorPrice: hr.totalCompetitorPrice + fiscal.totalCompetitorPrice + legal.totalCompetitorPrice,
      totalAIPremium: hr.totalAIPremium + fiscal.totalAIPremium + legal.totalAIPremium,
      devCostAt85: hr.devCostAt85 + fiscal.devCostAt85 + legal.devCostAt85,
    },
  };
}

export function getCombinedValuationSummary() {
  const crm = getCRMValuationSummary();
  const erp = getERPValuationSummary();
  const cross = calculateTotalValuation(CROSS_MODULE_VALUATIONS);
  
  return {
    crm,
    erp: erp.total,
    cross,
    grandTotal: {
      totalDevHours: crm.totalDevHours + erp.total.totalDevHours + cross.totalDevHours,
      totalMarketValue: crm.totalMarketValue + erp.total.totalMarketValue + cross.totalMarketValue,
      totalCompetitorPrice: crm.totalCompetitorPrice + erp.total.totalCompetitorPrice + cross.totalCompetitorPrice,
      totalAIPremium: crm.totalAIPremium + erp.total.totalAIPremium + cross.totalAIPremium,
      devCostAt85: crm.devCostAt85 + erp.total.devCostAt85 + cross.devCostAt85,
    },
  };
}
