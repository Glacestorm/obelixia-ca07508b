/**
 * CRM Module Data - Auto-updating feature inventory
 * This file contains the CRM module features that are dynamically detected
 */

import { ModuleFeature, CompetitorFeature, CompetitorProfile } from './types';

// ============================================
// CRM FEATURES - Core
// ============================================

export const CRM_CORE_FEATURES: ModuleFeature[] = [
  // Pipeline & Deals
  { name: 'Kanban Pipeline', description: 'Board visual de oportunidades con drag-drop y probabilidades', status: 'complete', category: 'Pipeline', components: ['EnhancedKanbanBoard', 'DealsKanban'] },
  { name: 'Deal Scoring', description: 'Puntuacion automatica por probabilidad de cierre', status: 'complete', category: 'Pipeline' },
  { name: 'Stage Flow Automation', description: 'Automatizacion de transiciones entre etapas', status: 'complete', category: 'Pipeline', components: ['StageFlowAutomation'] },
  { name: 'Predictive Pipeline', description: 'Prediccion de cierres con IA y tendencias', status: 'innovation', category: 'Pipeline', components: ['PredictivePipelinePanel'] },
  
  // Contacts & Companies
  { name: 'Gestion de Contactos', description: 'CRUD completo con campos personalizados', status: 'complete', category: 'Contactos', hooks: ['useCRMContacts'], components: ['ContactsManager'] },
  { name: 'Empresas y Cuentas', description: 'Jerarquias de cuentas corporativas', status: 'complete', category: 'Contactos' },
  { name: 'Segmentacion Dinamica', description: 'Filtros avanzados y segmentos guardados', status: 'complete', category: 'Contactos' },
  { name: 'Duplicados Detection', description: 'Deteccion y fusion de registros duplicados', status: 'complete', category: 'Contactos' },
  
  // Activities
  { name: 'Registro de Actividades', description: 'Llamadas, emails, reuniones, tareas', status: 'complete', category: 'Actividades', hooks: ['useCRMActivities'], components: ['ActivitiesManager'] },
  { name: 'Calendario Integrado', description: 'Vista calendario de actividades y seguimientos', status: 'complete', category: 'Actividades' },
  { name: 'Recordatorios Automaticos', description: 'Alertas de seguimiento y vencimientos', status: 'complete', category: 'Actividades' },
  
  // Teams & Workspaces
  { name: 'Multi-Workspace', description: 'Espacios de trabajo aislados por cliente/proyecto', status: 'complete', category: 'Organizacion', hooks: ['useCRMContext'], components: ['CRMWorkspaceSelector'] },
  { name: 'Gestion de Equipos', description: 'Teams con roles y permisos granulares', status: 'complete', category: 'Organizacion', hooks: ['useCRMTeams'], components: ['CRMTeamsManager'] },
  { name: 'RBAC Roles', description: 'Control de acceso basado en roles (owner, admin, agent, viewer)', status: 'complete', category: 'Organizacion', hooks: ['useCRMRoles'] },
];

export const CRM_OMNICHANNEL_FEATURES: ModuleFeature[] = [
  // Inbox
  { name: 'Omnichannel Inbox', description: 'Bandeja unificada email, WhatsApp, Telegram, SMS', status: 'complete', category: 'Omnichannel', components: ['OmnichannelInbox'] },
  { name: 'Threaded Conversations', description: 'Hilos de conversacion con historial completo', status: 'complete', category: 'Omnichannel' },
  { name: 'Quick Replies', description: 'Respuestas rapidas con plantillas', status: 'complete', category: 'Omnichannel' },
  { name: 'Auto-assignment', description: 'Asignacion automatica de conversaciones', status: 'complete', category: 'Omnichannel' },
  
  // SLA
  { name: 'SLA Dashboard', description: 'Metricas de tiempos de respuesta y resolucion', status: 'complete', category: 'SLA', components: ['MultichannelSLADashboard'] },
  { name: 'SLA Policies', description: 'Politicas por prioridad, cliente, canal', status: 'complete', category: 'SLA' },
  { name: 'Breach Alerts', description: 'Alertas de incumplimiento SLA', status: 'complete', category: 'SLA' },
  { name: 'Escalation Rules', description: 'Reglas de escalado automatico', status: 'complete', category: 'SLA' },
];

export const CRM_AI_FEATURES: ModuleFeature[] = [
  // Sentiment
  { name: 'Analisis de Sentimiento', description: 'Deteccion de emociones en conversaciones', status: 'complete', category: 'IA Avanzada', components: ['SentimentAnalysisDashboard'] },
  { name: 'Trend Detection', description: 'Identificacion de tendencias en feedback', status: 'complete', category: 'IA Avanzada' },
  { name: 'Churn Prediction', description: 'Prediccion de abandono de clientes', status: 'innovation', category: 'IA Avanzada' },
  
  // Voice Assistant
  { name: 'Asistente de Voz', description: 'Interaccion por voz con ElevenLabs', status: 'innovation', category: 'IA Avanzada', components: ['CRMVoiceAssistant'] },
  { name: 'Speech-to-Text', description: 'Transcripcion de llamadas y notas', status: 'complete', category: 'IA Avanzada' },
  
  // AI Agents
  { name: 'Agentes IA CRM', description: 'Panel de agentes inteligentes especializados', status: 'complete', category: 'Agentes IA', edgeFunctions: ['crm-agent-ai'], components: ['CRMAgentsPanel'] },
  { name: 'Lead Scoring IA', description: 'Puntuacion de leads con machine learning', status: 'complete', category: 'Agentes IA' },
  { name: 'Next Best Action', description: 'Sugerencias de accion por cliente', status: 'complete', category: 'Agentes IA' },
  { name: 'Email Generator', description: 'Redaccion automatica de emails', status: 'complete', category: 'Agentes IA' },
  
  // Realtime
  { name: 'Colaboracion en Tiempo Real', description: 'Edicion simultanea y presencia', status: 'innovation', category: 'Colaboracion', components: ['RealtimeCollaborationPanel'] },
  { name: 'Live Notifications', description: 'Notificaciones push instantaneas', status: 'complete', category: 'Colaboracion' },
];

export const CRM_AUTOMATION_FEATURES: ModuleFeature[] = [
  // Lead Distribution
  { name: 'Distribucion Inteligente', description: 'Asignacion de leads por carga, skills, territorio', status: 'complete', category: 'Automatizacion', components: ['IntelligentLeadDistribution'] },
  { name: 'Round Robin', description: 'Distribucion rotativa equitativa', status: 'complete', category: 'Automatizacion' },
  { name: 'Skill-based Routing', description: 'Routing por competencias del agente', status: 'complete', category: 'Automatizacion' },
  
  // Workflows
  { name: 'Stage Flow Rules', description: 'Reglas de automatizacion por etapa', status: 'complete', category: 'Automatizacion', components: ['StageFlowAutomation'] },
  { name: 'Email Sequences', description: 'Cadencias de emails automatizadas', status: 'complete', category: 'Automatizacion' },
  { name: 'Task Automation', description: 'Creacion automatica de tareas', status: 'complete', category: 'Automatizacion' },
  
  // Pending
  { name: 'Marketing Automation', description: 'Campanas multicanal automatizadas', status: 'partial', category: 'Pendiente' },
  { name: 'Advanced Workflows', description: 'Builder visual de workflows complejos', status: 'partial', category: 'Pendiente' },
];

// ============================================
// CRM EDGE FUNCTIONS
// ============================================

export const CRM_EDGE_FUNCTIONS = [
  'crm-agent-ai',
  'crm-sentiment-analysis',
  'crm-lead-scoring',
  'crm-email-generator',
  'crm-voice-assistant',
];

// ============================================
// CRM HOOKS
// ============================================

export const CRM_HOOKS = [
  'useCRMContext',
  'useCRMContacts',
  'useCRMDeals',
  'useCRMActivities',
  'useCRMRoles',
  'useCRMTeams',
  'useCRMModuleAgents',
];

// ============================================
// CRM COMPETITORS
// ============================================

export const CRM_COMPETITORS: CompetitorProfile[] = [
  {
    name: 'Salesforce',
    fullName: 'Salesforce Sales Cloud',
    strengths: ['Lider de mercado', 'Ecosistema AppExchange', 'Einstein AI', 'Personalización extrema'],
    weaknesses: ['Coste elevado', 'Complejidad', 'Curva aprendizaje'],
  },
  {
    name: 'HubSpot',
    fullName: 'HubSpot CRM',
    strengths: ['Facilidad uso', 'Freemium potente', 'Marketing integrado', 'Documentación'],
    weaknesses: ['Limitado para enterprise', 'Personalización', 'Reporting avanzado'],
  },
  {
    name: 'Pipedrive',
    fullName: 'Pipedrive',
    strengths: ['UX excelente', 'Pipeline visual', 'Precio competitivo'],
    weaknesses: ['Sin marketing', 'Automatizacion limitada', 'IA basica'],
  },
  {
    name: 'Zoho',
    fullName: 'Zoho CRM',
    strengths: ['Suite completa', 'Precio agresivo', 'Zia AI'],
    weaknesses: ['UX inconsistente', 'Soporte', 'Integraciones terceros'],
  },
];

export const CRM_COMPETITOR_FEATURES: CompetitorFeature[] = [
  // Core
  { feature: 'Pipeline Kanban Visual', competitor1: 'yes', competitor2: 'yes', competitor3: 'yes', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  { feature: 'Gestion Contactos/Empresas', competitor1: 'yes', competitor2: 'yes', competitor3: 'yes', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  { feature: 'Multi-Workspace', competitor1: 'yes', competitor2: 'partial', competitor3: 'no', competitor4: 'partial', obelixia: 'yes', status: 'complete' },
  { feature: 'RBAC Granular', competitor1: 'yes', competitor2: 'partial', competitor3: 'partial', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  
  // Omnichannel
  { feature: 'Inbox Omnichannel', competitor1: 'yes', competitor2: 'yes', competitor3: 'partial', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  { feature: 'WhatsApp Integration', competitor1: 'yes', competitor2: 'yes', competitor3: 'partial', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  { feature: 'SLA Dashboard', competitor1: 'yes', competitor2: 'yes', competitor3: 'partial', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  
  // AI
  { feature: 'Analisis Sentimiento', competitor1: 'yes', competitor2: 'partial', competitor3: 'no', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  { feature: 'Lead Scoring IA', competitor1: 'yes', competitor2: 'yes', competitor3: 'yes', competitor4: 'yes', obelixia: 'yes', status: 'complete' },
  { feature: 'Predictive Pipeline', competitor1: 'yes', competitor2: 'partial', competitor3: 'no', competitor4: 'partial', obelixia: 'yes', status: 'innovation' },
  { feature: 'Voz Bidireccional', competitor1: 'partial', competitor2: 'no', competitor3: 'no', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  { feature: 'Colaboracion Realtime', competitor1: 'yes', competitor2: 'partial', competitor3: 'no', competitor4: 'partial', obelixia: 'yes', status: 'innovation' },
  
  // Integration
  { feature: 'Integracion ERP Nativa', competitor1: 'partial', competitor2: 'no', competitor3: 'no', competitor4: 'partial', obelixia: 'yes', status: 'innovation' },
  { feature: 'Legal Module Cross', competitor1: 'no', competitor2: 'no', competitor3: 'no', competitor4: 'no', obelixia: 'yes', status: 'innovation' },
  
  // Pending
  { feature: 'Marketing Automation Full', competitor1: 'yes', competitor2: 'yes', competitor3: 'partial', competitor4: 'yes', obelixia: 'partial', status: 'pending' },
  { feature: 'Advanced Workflow Builder', competitor1: 'yes', competitor2: 'yes', competitor3: 'yes', competitor4: 'yes', obelixia: 'partial', status: 'pending' },
];

// ============================================
// AGGREGATED DATA FUNCTIONS
// ============================================

export function getCRMFeatures(): ModuleFeature[] {
  return [
    ...CRM_CORE_FEATURES,
    ...CRM_OMNICHANNEL_FEATURES,
    ...CRM_AI_FEATURES,
    ...CRM_AUTOMATION_FEATURES,
  ];
}

export function getCRMStats() {
  const features = getCRMFeatures();
  return {
    total: features.length,
    complete: features.filter(f => f.status === 'complete').length,
    innovation: features.filter(f => f.status === 'innovation').length,
    pending: features.filter(f => f.status === 'pending' || f.status === 'partial').length,
    edgeFunctions: CRM_EDGE_FUNCTIONS.length,
    hooks: CRM_HOOKS.length,
  };
}
