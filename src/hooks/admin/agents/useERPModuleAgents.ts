/**
 * useERPModuleAgents - Hook para gestión de agentes especializados por módulo ERP
 * Arquitectura híbrida: Supervisor → Agentes de Dominio → Sub-agentes de Módulo
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS DE AGENTES ===

export type AgentDomain = 'financial' | 'crm_cs' | 'compliance' | 'operations' | 'hr' | 'analytics';

export type ModuleAgentType = 
  // Financiero
  | 'accounting' | 'treasury' | 'invoicing' | 'collections' | 'cashflow'
  // CRM & CS
  | 'sales' | 'customer_success' | 'pipeline' | 'churn_prevention' | 'upsell'
  // Compliance
  | 'gdpr' | 'psd2' | 'esg' | 'audit' | 'kyc_aml' | 'risk'
  // Operaciones
  | 'inventory' | 'procurement' | 'logistics' | 'maintenance' | 'scheduling'
  // RRHH
  | 'payroll' | 'recruitment' | 'training' | 'performance'
  // Analytics
  | 'reporting' | 'forecasting' | 'anomaly_detection';

export interface ModuleAgent {
  id: string;
  domain: AgentDomain;
  type: ModuleAgentType;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'analyzing' | 'error' | 'paused';
  capabilities: string[];
  metrics: Record<string, number | string>;
  lastActivity: string;
  healthScore: number;
  confidenceThreshold: number;
  executionMode: 'autonomous' | 'supervised' | 'manual';
  parentAgentId?: string;
  priority: number;
}

export interface DomainAgent {
  id: string;
  domain: AgentDomain;
  name: string;
  description: string;
  status: 'active' | 'coordinating' | 'idle' | 'error';
  moduleAgents: ModuleAgent[];
  metrics: {
    totalActions: number;
    successRate: number;
    avgResponseTime: number;
    activeModules: number;
  };
  lastCoordination: string;
}

export interface SupervisorStatus {
  status: 'running' | 'idle' | 'analyzing' | 'coordinating';
  activeDomains: number;
  activeAgents: number;
  pendingDecisions: number;
  conflictsResolved: number;
  lastOptimization: string;
  systemHealth: number;
  resourceUtilization: number;
  learningProgress: number;
  predictiveInsights: SupervisorInsight[];
  autonomousMode: boolean;
  autonomousIntervalMs: number;
}

export interface SupervisorInsight {
  id: string;
  type: 'optimization' | 'warning' | 'prediction' | 'recommendation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedDomains: AgentDomain[];
  suggestedAction?: string;
  confidence: number;
  timestamp: string;
}

export interface AgentCommunication {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'escalation' | 'coordination' | 'learning';
  payload: Record<string, unknown>;
  status: 'pending' | 'processed' | 'failed';
  timestamp: string;
}

// === CONFIGURACIÓN DE DOMINIOS Y AGENTES ===

export const DOMAIN_CONFIG: Record<AgentDomain, {
  name: string;
  color: string;
  icon: string;
  description: string;
  moduleTypes: ModuleAgentType[];
}> = {
  financial: {
    name: 'Financiero',
    color: 'from-emerald-500 to-green-600',
    icon: 'Calculator',
    description: 'Gestión contable, tesorería, facturación y cash flow',
    moduleTypes: ['accounting', 'treasury', 'invoicing', 'collections', 'cashflow']
  },
  crm_cs: {
    name: 'CRM & Customer Success',
    color: 'from-blue-500 to-indigo-600',
    icon: 'Users',
    description: 'Pipeline de ventas, retención y satisfacción de clientes',
    moduleTypes: ['sales', 'customer_success', 'pipeline', 'churn_prevention', 'upsell']
  },
  compliance: {
    name: 'Compliance & Auditoría',
    color: 'from-orange-500 to-red-600',
    icon: 'Shield',
    description: 'Normativas RGPD, PSD2/3, ESG, KYC/AML y auditoría continua',
    moduleTypes: ['gdpr', 'psd2', 'esg', 'audit', 'kyc_aml', 'risk']
  },
  operations: {
    name: 'Operaciones',
    color: 'from-purple-500 to-violet-600',
    icon: 'Cog',
    description: 'Inventario, compras, logística y mantenimiento',
    moduleTypes: ['inventory', 'procurement', 'logistics', 'maintenance', 'scheduling']
  },
  hr: {
    name: 'Recursos Humanos',
    color: 'from-pink-500 to-rose-600',
    icon: 'UserCheck',
    description: 'Nóminas, reclutamiento, formación y evaluación',
    moduleTypes: ['payroll', 'recruitment', 'training', 'performance']
  },
  analytics: {
    name: 'Analytics & BI',
    color: 'from-cyan-500 to-teal-600',
    icon: 'BarChart3',
    description: 'Reporting, forecasting y detección de anomalías',
    moduleTypes: ['reporting', 'forecasting', 'anomaly_detection']
  }
};

export const MODULE_AGENT_CONFIG: Record<ModuleAgentType, {
  name: string;
  description: string;
  capabilities: string[];
  defaultPriority: number;
}> = {
  // Financiero
  accounting: {
    name: 'Agente Contable',
    description: 'Automatización de asientos, reconciliación y cierre contable',
    capabilities: ['asientos_automaticos', 'reconciliacion_bancaria', 'cierre_mensual', 'analisis_pgc', 'consolidacion'],
    defaultPriority: 1
  },
  treasury: {
    name: 'Agente Tesorería',
    description: 'Gestión de liquidez, previsiones y operaciones de tesorería',
    capabilities: ['prevision_liquidez', 'gestion_cobros', 'gestion_pagos', 'pooling_cash', 'alertas_saldos'],
    defaultPriority: 1
  },
  invoicing: {
    name: 'Agente Facturación',
    description: 'Generación automática de facturas y gestión de impuestos',
    capabilities: ['facturacion_automatica', 'calculo_iva', 'retenciones', 'envio_sii', 'facturas_electronicas'],
    defaultPriority: 2
  },
  collections: {
    name: 'Agente Cobros',
    description: 'Seguimiento de cobros y gestión de impagados',
    capabilities: ['seguimiento_vencimientos', 'recordatorios_automaticos', 'escalado_impagados', 'analisis_riesgo_cliente'],
    defaultPriority: 2
  },
  cashflow: {
    name: 'Agente Cash Flow',
    description: 'Predicción y optimización del flujo de caja',
    capabilities: ['prediccion_cashflow', 'escenarios_what_if', 'alertas_deficit', 'optimizacion_pagos'],
    defaultPriority: 1
  },
  // CRM & CS
  sales: {
    name: 'Agente Ventas',
    description: 'Calificación de leads y automatización del proceso comercial',
    capabilities: ['lead_scoring', 'seguimiento_automatico', 'prediccion_cierre', 'emails_personalizados', 'scheduling'],
    defaultPriority: 1
  },
  customer_success: {
    name: 'Agente CS',
    description: 'Gestión proactiva del éxito del cliente',
    capabilities: ['health_score', 'onboarding_asistido', 'qbr_automation', 'advocacy_detection', 'renewal_management'],
    defaultPriority: 1
  },
  pipeline: {
    name: 'Agente Pipeline',
    description: 'Análisis y optimización del pipeline de ventas',
    capabilities: ['forecast_accuracy', 'stage_optimization', 'deal_velocity', 'pipeline_coverage', 'bottleneck_detection'],
    defaultPriority: 2
  },
  churn_prevention: {
    name: 'Agente Anti-Churn',
    description: 'Detección temprana y prevención de bajas',
    capabilities: ['churn_prediction', 'risk_segmentation', 'intervention_automation', 'retention_campaigns', 'win_back'],
    defaultPriority: 1
  },
  upsell: {
    name: 'Agente Upsell',
    description: 'Identificación de oportunidades de expansión',
    capabilities: ['expansion_scoring', 'product_fit_analysis', 'timing_optimization', 'proposal_generation'],
    defaultPriority: 2
  },
  // Compliance
  gdpr: {
    name: 'Agente RGPD',
    description: 'Cumplimiento y monitoreo de protección de datos',
    capabilities: ['consent_management', 'dsar_automation', 'breach_detection', 'pia_assistance', 'data_mapping'],
    defaultPriority: 1
  },
  psd2: {
    name: 'Agente PSD2/3',
    description: 'Cumplimiento de normativas de pagos y Open Banking',
    capabilities: ['sca_monitoring', 'tpp_management', 'api_compliance', 'fraud_detection', 'regulatory_reporting'],
    defaultPriority: 1
  },
  esg: {
    name: 'Agente ESG',
    description: 'Monitoreo y reporting de criterios ESG',
    capabilities: ['carbon_tracking', 'social_metrics', 'governance_scoring', 'esg_reporting', 'sustainability_alerts'],
    defaultPriority: 2
  },
  audit: {
    name: 'Agente Auditoría',
    description: 'Auditoría continua y detección de anomalías',
    capabilities: ['continuous_monitoring', 'control_testing', 'exception_detection', 'audit_trail', 'finding_management'],
    defaultPriority: 1
  },
  kyc_aml: {
    name: 'Agente KYC/AML',
    description: 'Verificación de clientes y prevención de blanqueo',
    capabilities: ['identity_verification', 'pep_screening', 'transaction_monitoring', 'sar_generation', 'risk_assessment'],
    defaultPriority: 1
  },
  risk: {
    name: 'Agente Riesgos',
    description: 'Evaluación y monitoreo de riesgos operacionales',
    capabilities: ['risk_identification', 'control_effectiveness', 'incident_management', 'risk_reporting', 'mitigation_tracking'],
    defaultPriority: 1
  },
  // Operaciones
  inventory: {
    name: 'Agente Inventario',
    description: 'Gestión optimizada de stock y almacén',
    capabilities: ['stock_optimization', 'reorder_automation', 'demand_forecasting', 'obsolete_detection', 'abc_analysis'],
    defaultPriority: 2
  },
  procurement: {
    name: 'Agente Compras',
    description: 'Automatización del proceso de aprovisionamiento',
    capabilities: ['supplier_evaluation', 'purchase_automation', 'contract_management', 'spend_analysis', 'negotiation_support'],
    defaultPriority: 2
  },
  logistics: {
    name: 'Agente Logística',
    description: 'Optimización de rutas y entregas',
    capabilities: ['route_optimization', 'delivery_tracking', 'carrier_selection', 'last_mile', 'returns_management'],
    defaultPriority: 2
  },
  maintenance: {
    name: 'Agente Mantenimiento',
    description: 'Mantenimiento predictivo de activos',
    capabilities: ['predictive_maintenance', 'work_order_automation', 'spare_parts_management', 'asset_tracking'],
    defaultPriority: 3
  },
  scheduling: {
    name: 'Agente Scheduling',
    description: 'Programación inteligente de recursos',
    capabilities: ['resource_allocation', 'capacity_planning', 'conflict_resolution', 'optimization'],
    defaultPriority: 2
  },
  // RRHH
  payroll: {
    name: 'Agente Nóminas',
    description: 'Automatización del proceso de nóminas',
    capabilities: ['payroll_calculation', 'tax_compliance', 'benefits_administration', 'reporting'],
    defaultPriority: 1
  },
  recruitment: {
    name: 'Agente Reclutamiento',
    description: 'Optimización del proceso de selección',
    capabilities: ['cv_screening', 'candidate_matching', 'interview_scheduling', 'onboarding'],
    defaultPriority: 2
  },
  training: {
    name: 'Agente Formación',
    description: 'Gestión de capacitación y desarrollo',
    capabilities: ['learning_paths', 'skill_gap_analysis', 'certification_tracking', 'content_recommendation'],
    defaultPriority: 3
  },
  performance: {
    name: 'Agente Performance',
    description: 'Evaluación y gestión del desempeño',
    capabilities: ['goal_tracking', 'feedback_automation', 'review_scheduling', 'talent_analytics'],
    defaultPriority: 2
  },
  // Analytics
  reporting: {
    name: 'Agente Reporting',
    description: 'Generación automática de informes',
    capabilities: ['report_generation', 'data_visualization', 'scheduled_reports', 'ad_hoc_queries'],
    defaultPriority: 2
  },
  forecasting: {
    name: 'Agente Forecasting',
    description: 'Predicciones y proyecciones de negocio',
    capabilities: ['revenue_forecasting', 'demand_prediction', 'trend_analysis', 'scenario_modeling'],
    defaultPriority: 1
  },
  anomaly_detection: {
    name: 'Agente Anomalías',
    description: 'Detección de patrones anómalos',
    capabilities: ['statistical_analysis', 'pattern_recognition', 'alert_generation', 'root_cause_analysis'],
    defaultPriority: 1
  }
};

// === HOOK PRINCIPAL ===

export function useERPModuleAgents() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [domainAgents, setDomainAgents] = useState<DomainAgent[]>([]);
  const [supervisorStatus, setSupervisorStatus] = useState<SupervisorStatus | null>(null);
  const [communications, setCommunications] = useState<AgentCommunication[]>([]);
  const [insights, setInsights] = useState<SupervisorInsight[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const autonomousInterval = useRef<NodeJS.Timeout | null>(null);

  // === INICIALIZAR AGENTES ===
  const initializeAgents = useCallback(async () => {
    setIsLoading(true);

    try {
      // Generar estructura de agentes basada en configuración
      const domains: DomainAgent[] = Object.entries(DOMAIN_CONFIG).map(([domainKey, config]) => {
        const moduleAgents: ModuleAgent[] = config.moduleTypes.map(moduleType => {
          const moduleConfig = MODULE_AGENT_CONFIG[moduleType];
          return {
            id: `agent_${domainKey}_${moduleType}`,
            domain: domainKey as AgentDomain,
            type: moduleType,
            name: moduleConfig.name,
            description: moduleConfig.description,
            status: 'idle' as const,
            capabilities: moduleConfig.capabilities,
            metrics: {},
            lastActivity: new Date().toISOString(),
            healthScore: 100,
            confidenceThreshold: 80,
            executionMode: 'supervised' as const,
            priority: moduleConfig.defaultPriority
          };
        });

        return {
          id: `domain_${domainKey}`,
          domain: domainKey as AgentDomain,
          name: config.name,
          description: config.description,
          status: 'idle' as const,
          moduleAgents,
          metrics: {
            totalActions: 0,
            successRate: 100,
            avgResponseTime: 0,
            activeModules: 0
          },
          lastCoordination: new Date().toISOString()
        };
      });

      setDomainAgents(domains);

      // Inicializar supervisor
      setSupervisorStatus({
        status: 'running',
        activeDomains: domains.length,
        activeAgents: domains.reduce((sum, d) => sum + d.moduleAgents.length, 0),
        pendingDecisions: 0,
        conflictsResolved: 0,
        lastOptimization: new Date().toISOString(),
        systemHealth: 98,
        resourceUtilization: 45,
        learningProgress: 72,
        predictiveInsights: [],
        autonomousMode: false,
        autonomousIntervalMs: 60000
      });

      setLastRefresh(new Date());
      return domains;
    } catch (error) {
      console.error('[useERPModuleAgents] initializeAgents error:', error);
      toast.error('Error al inicializar agentes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EJECUTAR AGENTE DE MÓDULO ===
  const executeModuleAgent = useCallback(async (
    agentId: string,
    context: Record<string, unknown>
  ) => {
    setIsLoading(true);

    try {
      // Encontrar el agente
      let targetAgent: ModuleAgent | null = null;
      let targetDomain: DomainAgent | null = null;

      for (const domain of domainAgents) {
        const agent = domain.moduleAgents.find(a => a.id === agentId);
        if (agent) {
          targetAgent = agent;
          targetDomain = domain;
          break;
        }
      }

      if (!targetAgent || !targetDomain) {
        throw new Error('Agente no encontrado');
      }

      // Actualizar estado a analyzing
      setDomainAgents(prev => prev.map(d => ({
        ...d,
        moduleAgents: d.moduleAgents.map(a => 
          a.id === agentId ? { ...a, status: 'analyzing' as const } : a
        )
      })));

      // Llamar a edge function del agente
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'execute',
          agentType: targetAgent.type,
          domain: targetAgent.domain,
          context,
          capabilities: targetAgent.capabilities
        }
      });

      if (error) throw error;

      // Actualizar estado y métricas
      setDomainAgents(prev => prev.map(d => ({
        ...d,
        moduleAgents: d.moduleAgents.map(a => 
          a.id === agentId ? { 
            ...a, 
            status: 'active' as const,
            lastActivity: new Date().toISOString(),
            metrics: data?.metrics || a.metrics
          } : a
        ),
        metrics: d.id === targetDomain.id ? {
          ...d.metrics,
          totalActions: d.metrics.totalActions + 1
        } : d.metrics
      })));

      toast.success(`${targetAgent.name} ejecutado correctamente`);
      return data;
    } catch (error) {
      console.error('[useERPModuleAgents] executeModuleAgent error:', error);
      
      // Marcar como error
      setDomainAgents(prev => prev.map(d => ({
        ...d,
        moduleAgents: d.moduleAgents.map(a => 
          a.id === agentId ? { ...a, status: 'error' as const } : a
        )
      })));

      toast.error('Error al ejecutar agente');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [domainAgents]);

  // === COORDINAR DOMINIO ===
  const coordinateDomain = useCallback(async (
    domainId: string,
    objective: string
  ) => {
    setIsLoading(true);

    try {
      const domain = domainAgents.find(d => d.id === domainId);
      if (!domain) throw new Error('Dominio no encontrado');

      // Actualizar estado del dominio
      setDomainAgents(prev => prev.map(d => 
        d.id === domainId ? { ...d, status: 'coordinating' as const } : d
      ));

      // Llamar a edge function de coordinación
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'coordinate_domain',
          domain: domain.domain,
          objective,
          moduleAgents: domain.moduleAgents.map(a => ({
            id: a.id,
            type: a.type,
            status: a.status,
            capabilities: a.capabilities
          }))
        }
      });

      if (error) throw error;

      // Actualizar estado
      setDomainAgents(prev => prev.map(d => 
        d.id === domainId ? { 
          ...d, 
          status: 'active' as const,
          lastCoordination: new Date().toISOString()
        } : d
      ));

      toast.success(`Coordinación de ${domain.name} completada`);
      return data;
    } catch (error) {
      console.error('[useERPModuleAgents] coordinateDomain error:', error);
      toast.error('Error en coordinación de dominio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [domainAgents]);

  // === SUPERVISOR: ORQUESTAR TODOS ===
  const supervisorOrchestrate = useCallback(async (
    objective: string,
    priority?: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    setIsLoading(true);

    const parseJsonFromRawContent = (raw: string): any | null => {
      // Soporta respuestas tipo ```json { ... } ``` o texto con JSON embebido
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    };

    try {
      setSupervisorStatus(prev => prev ? { ...prev, status: 'coordinating' } : prev);

      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'supervisor_orchestrate',
          objective,
          priority: priority || 'medium',
          domains: domainAgents.map(d => ({
            id: d.id,
            domain: d.domain,
            status: d.status,
            activeModules: d.moduleAgents.filter(a => a.status === 'active').length
          }))
        }
      });

      if (error) throw error;

      // Normalizar respuesta: a veces llega como rawContent (parseError) desde backend
      let payload: any = data;
      if (payload?.rawContent) {
        const parsed = parseJsonFromRawContent(payload.rawContent);
        if (parsed) payload = { ...payload, ...parsed };
      }

      const nextInsights = payload?.insights;

      // Actualizar insights del supervisor
      if (Array.isArray(nextInsights)) {
        setInsights(nextInsights);
        setSupervisorStatus(prev => prev ? {
          ...prev,
          status: 'running',
          predictiveInsights: nextInsights,
          lastOptimization: new Date().toISOString()
        } : prev);
      } else {
        // Si no hay insights, al menos dejamos el supervisor en running
        setSupervisorStatus(prev => prev ? { ...prev, status: 'running' } : prev);
      }

      toast.success('Orquestación del supervisor completada');
      return payload;
    } catch (error) {
      console.error('[useERPModuleAgents] supervisorOrchestrate error:', error);
      toast.error('Error en orquestación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [domainAgents]);

  // === OBTENER INSIGHTS PREDICTIVOS ===
  const fetchPredictiveInsights = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-module-agent', {
        body: {
          action: 'get_predictive_insights',
          currentState: {
            domains: domainAgents.map(d => ({
              domain: d.domain,
              metrics: d.metrics,
              agentStatuses: d.moduleAgents.map(a => a.status)
            }))
          }
        }
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
      }

      return data?.insights || [];
    } catch (error) {
      console.error('[useERPModuleAgents] fetchPredictiveInsights error:', error);
      return [];
    }
  }, [domainAgents]);

  // === CONFIGURAR AGENTE ===
  const configureAgent = useCallback(async (
    agentId: string,
    config: Partial<Pick<ModuleAgent, 'confidenceThreshold' | 'executionMode' | 'priority'>>
  ) => {
    setDomainAgents(prev => prev.map(d => ({
      ...d,
      moduleAgents: d.moduleAgents.map(a => 
        a.id === agentId ? { ...a, ...config } : a
      )
    })));

    toast.success('Configuración actualizada');
  }, []);

  // === TOGGLE AGENTE ===
  const toggleAgent = useCallback(async (agentId: string, active: boolean) => {
    setDomainAgents(prev => prev.map(d => ({
      ...d,
      moduleAgents: d.moduleAgents.map(a => 
        a.id === agentId ? { 
          ...a, 
          status: active ? 'idle' as const : 'paused' as const 
        } : a
      )
    })));

    toast.success(active ? 'Agente activado' : 'Agente pausado');
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    stopAutoRefresh();
    initializeAgents();
    autoRefreshInterval.current = setInterval(() => {
      fetchPredictiveInsights();
    }, intervalMs);
  }, [initializeAgents, fetchPredictiveInsights]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === MODO AUTÓNOMO DEL SUPERVISOR ===
  const autonomousActions = [
    'distribute_tasks',
    'realtime_monitoring', 
    'predictive_analysis',
    'optimize_workflows',
    'resolve_conflicts',
    'auto_optimize'
  ];

  const runAutonomousCycle = useCallback(async () => {
    // Seleccionar acción aleatoria o basada en prioridad
    const randomAction = autonomousActions[Math.floor(Math.random() * autonomousActions.length)];
    console.log('[Supervisor Autónomo] Ejecutando ciclo:', randomAction);
    await supervisorOrchestrate(randomAction, 'medium');
  }, [supervisorOrchestrate]);

  const toggleAutonomousMode = useCallback((enabled: boolean, intervalMs: number = 60000) => {
    // Limpiar intervalo anterior si existe
    if (autonomousInterval.current) {
      clearInterval(autonomousInterval.current);
      autonomousInterval.current = null;
    }

    setSupervisorStatus(prev => prev ? {
      ...prev,
      autonomousMode: enabled,
      autonomousIntervalMs: intervalMs
    } : prev);

    if (enabled) {
      // Ejecutar inmediatamente y luego en intervalo
      runAutonomousCycle();
      autonomousInterval.current = setInterval(() => {
        runAutonomousCycle();
      }, intervalMs);
      toast.success(`Modo autónomo activado (cada ${Math.round(intervalMs / 1000)}s)`);
    } else {
      toast.info('Modo autónomo desactivado');
    }
  }, [runAutonomousCycle]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      if (autonomousInterval.current) {
        clearInterval(autonomousInterval.current);
      }
    };
  }, [stopAutoRefresh]);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    domainAgents,
    supervisorStatus,
    communications,
    insights,
    lastRefresh,
    // Configuración
    DOMAIN_CONFIG,
    MODULE_AGENT_CONFIG,
    // Acciones
    initializeAgents,
    executeModuleAgent,
    coordinateDomain,
    supervisorOrchestrate,
    fetchPredictiveInsights,
    configureAgent,
    toggleAgent,
    toggleAutonomousMode,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useERPModuleAgents;
