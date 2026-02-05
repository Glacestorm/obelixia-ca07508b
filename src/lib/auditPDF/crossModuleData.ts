/**
 * Cross-Module Integration Data
 * Features that span CRM + ERP modules
 */

import { ModuleFeature, CompetitorFeature } from './types';

// ============================================
// CROSS-MODULE FEATURES
// ============================================

export const CROSS_MODULE_FEATURES: ModuleFeature[] = [
  // CRM <-> ERP Integration
  { name: 'CRM-ERP Pipeline', description: 'Sincronizacion oportunidades CRM con pedidos ERP', status: 'complete', category: 'Integracion CRM-ERP' },
  { name: 'Customer 360', description: 'Vista unificada cliente con datos CRM+Contabilidad', status: 'complete', category: 'Integracion CRM-ERP' },
  { name: 'Quote-to-Cash', description: 'Flujo completo desde presupuesto a cobro', status: 'complete', category: 'Integracion CRM-ERP' },
  { name: 'Revenue Recognition', description: 'Reconocimiento ingresos ASC 606/NIIF 15', status: 'complete', category: 'Integracion CRM-ERP' },
  
  // Legal Cross-Module
  { name: 'Legal Gateway Universal', description: 'Validacion legal de operaciones CRM y ERP', status: 'innovation', category: 'Legal Cross-Module', edgeFunctions: ['legal-validation-gateway-enhanced'] },
  { name: 'Contract to Deal', description: 'Vinculacion contratos legales con oportunidades CRM', status: 'complete', category: 'Legal Cross-Module' },
  { name: 'Compliance Transversal', description: 'Cumplimiento normativo unificado', status: 'complete', category: 'Legal Cross-Module' },
  
  // HR Cross-Module
  { name: 'Salesforce Compensation', description: 'Comisiones de ventas CRM a nominas RRHH', status: 'complete', category: 'HR Cross-Module' },
  { name: 'Employee as Customer', description: 'Gestion empleados como clientes internos', status: 'complete', category: 'HR Cross-Module' },
  { name: 'Recruiting from CRM', description: 'Conversion contactos a candidatos RRHH', status: 'complete', category: 'HR Cross-Module' },
  
  // Fiscal Cross-Module  
  { name: 'Facturacion Integrada', description: 'Facturas desde oportunidades CRM', status: 'complete', category: 'Fiscal Cross-Module' },
  { name: 'Multi-Currency', description: 'Gestion divisas en CRM con contabilidad ERP', status: 'complete', category: 'Fiscal Cross-Module' },
  { name: 'Tax Calculation', description: 'Calculo impuestos en ofertas CRM', status: 'complete', category: 'Fiscal Cross-Module' },
  
  // AI Orchestration
  { name: 'Cross-Module Orchestrator', description: 'Coordinacion agentes IA de todos los modulos', status: 'innovation', category: 'Orquestacion IA', edgeFunctions: ['cross-module-orchestrator'] },
  { name: 'Unified Knowledge Base', description: 'Base conocimiento compartida CRM+ERP', status: 'complete', category: 'Orquestacion IA' },
  { name: 'Predictive Cross-Insights', description: 'Predicciones usando datos combinados', status: 'innovation', category: 'Orquestacion IA' },
  
  // Blockchain & Smart Contracts
  { name: 'Blockchain Credentials Cross', description: 'Credenciales verificables HR disponibles en CRM', status: 'innovation', category: 'Blockchain', edgeFunctions: ['blockchain-credentials'] },
  { name: 'Smart Contracts Suite', description: 'Contratos inteligentes HR+Legal', status: 'innovation', category: 'Blockchain', edgeFunctions: ['smart-legal-contracts'] },
];

// ============================================
// COMBINED COMPETITOR COMPARISON
// ============================================

export const COMBINED_COMPETITOR_FEATURES: CompetitorFeature[] = [
  // Integration
  { feature: 'Suite CRM+ERP Nativa', competitor1: 'yes', competitor2: 'partial', competitor3: 'yes', competitor4: 'no', obelixia: 'yes', status: 'complete' },
  { feature: 'HCM+Legal+Fiscal Unificado', competitor1: 'partial', competitor2: 'partial', competitor3: 'partial', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  { feature: 'Quote-to-Cash End-to-End', competitor1: 'yes', competitor2: 'partial', competitor3: 'yes', competitor4: 'no', obelixia: 'yes', status: 'complete' },
  { feature: 'Customer 360 Real', competitor1: 'yes', competitor2: 'yes', competitor3: 'yes', competitor4: 'no', obelixia: 'yes', status: 'complete' },
  
  // Cross-Module AI
  { feature: 'Orquestador IA Multi-Modulo', competitor1: 'partial', competitor2: 'partial', competitor3: 'partial', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  { feature: 'Validacion Legal Cross-Module', competitor1: 'no', competitor2: 'no', competitor3: 'no', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  { feature: 'Predictive Cross-Analytics', competitor1: 'yes', competitor2: 'yes', competitor3: 'yes', competitor4: 'no', obelixia: 'yes', status: 'complete' },
  
  // Innovation
  { feature: 'Blockchain Credentials', competitor1: 'no', competitor2: 'no', competitor3: 'no', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  { feature: 'Smart Contracts Suite', competitor1: 'no', competitor2: 'no', competitor3: 'partial', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  { feature: 'Voz Bidireccional Suite', competitor1: 'partial', competitor2: 'no', competitor3: 'no', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  
  // Compliance
  { feature: 'Multi-Jurisdiccion Nativa', competitor1: 'yes', competitor2: 'partial', competitor3: 'yes', competitor4: 'no', obelixia: 'yes', status: 'complete' },
  { feature: 'GDPR/DORA/NIS2 Suite', competitor1: 'yes', competitor2: 'partial', competitor3: 'yes', competitor4: 'partial', obelixia: 'yes', status: 'complete' },
];

// ============================================
// INTEGRATION METRICS
// ============================================

export function getCrossModuleStats() {
  return {
    totalFeatures: CROSS_MODULE_FEATURES.length,
    complete: CROSS_MODULE_FEATURES.filter(f => f.status === 'complete').length,
    innovation: CROSS_MODULE_FEATURES.filter(f => f.status === 'innovation').length,
    categories: [...new Set(CROSS_MODULE_FEATURES.map(f => f.category))].length,
  };
}

export function getIntegrationScore(): number {
  // Calculate integration maturity score 0-100
  const features = CROSS_MODULE_FEATURES;
  const complete = features.filter(f => f.status === 'complete').length;
  const innovation = features.filter(f => f.status === 'innovation').length;
  const partial = features.filter(f => f.status === 'partial').length;
  
  const score = ((complete * 100) + (innovation * 100) + (partial * 50)) / features.length;
  return Math.round(score);
}
