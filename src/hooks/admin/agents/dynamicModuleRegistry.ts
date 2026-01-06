/**
 * Sistema de Registro Dinámico de Módulos para Agentes
 * 
 * Permite registrar automáticamente nuevos módulos CRM/ERP
 * y crear sus agentes especializados que se coordinan con el supervisor general.
 * 
 * Tendencias 2025-2027:
 * - Auto-discovery de módulos
 * - Hot-reload de agentes
 * - Coordinación automática con supervisor
 * - Learning pipeline compartido
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS ===

export type ModuleDomain = 'crm' | 'erp' | 'analytics' | 'operations' | 'finance' | 'hr' | 'compliance' | 'custom';

export type AgentCapabilityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

export interface DynamicModuleDefinition {
  id: string;
  moduleKey: string;
  moduleName: string;
  domain: ModuleDomain;
  description: string;
  icon: string;
  color: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DynamicAgentDefinition {
  id: string;
  moduleId: string;
  agentName: string;
  agentType: string;
  description: string;
  capabilities: string[];
  capabilityLevel: AgentCapabilityLevel;
  systemPrompt: string;
  confidenceThreshold: number;
  executionMode: 'autonomous' | 'supervised' | 'manual';
  priority: number;
  isActive: boolean;
  coordinatesWithSupervisor: boolean;
  learningEnabled: boolean;
  metrics: AgentMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMetrics {
  totalExecutions: number;
  successRate: number;
  avgResponseTime: number;
  learningProgress: number;
  lastExecution: Date | null;
}

export interface SupervisorRegistration {
  agentId: string;
  moduleKey: string;
  registeredAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
  supervisorNotes?: string;
}

export interface RegistryEvent {
  id: string;
  type: 'module_registered' | 'agent_created' | 'agent_activated' | 'agent_deactivated' | 'supervisor_accepted' | 'supervisor_rejected';
  entityId: string;
  entityType: 'module' | 'agent';
  metadata: Record<string, unknown>;
  timestamp: Date;
}

// === TEMPLATES DE AGENTES POR DOMINIO ===

export const AGENT_TEMPLATES: Record<ModuleDomain, {
  defaultCapabilities: string[];
  systemPromptBase: string;
  defaultConfidenceThreshold: number;
  defaultPriority: number;
}> = {
  crm: {
    defaultCapabilities: [
      'Análisis de clientes y prospectos',
      'Predicción de comportamiento',
      'Optimización de pipeline',
      'Detección de oportunidades',
      'Gestión de relaciones'
    ],
    systemPromptBase: `Eres un agente especializado en CRM. Tu rol es optimizar las relaciones con clientes, 
    identificar oportunidades de negocio y mejorar las tasas de conversión. Coordinas con el supervisor general
    para alinear tus acciones con los objetivos empresariales.`,
    defaultConfidenceThreshold: 0.75,
    defaultPriority: 8
  },
  erp: {
    defaultCapabilities: [
      'Gestión de recursos empresariales',
      'Optimización de procesos',
      'Control de inventario',
      'Planificación de producción',
      'Análisis de eficiencia'
    ],
    systemPromptBase: `Eres un agente especializado en ERP. Tu rol es optimizar los recursos empresariales,
    mejorar la eficiencia operativa y asegurar la integridad de los datos. Reportas al supervisor general
    sobre anomalías y oportunidades de mejora.`,
    defaultConfidenceThreshold: 0.8,
    defaultPriority: 7
  },
  analytics: {
    defaultCapabilities: [
      'Análisis predictivo',
      'Generación de reportes',
      'Detección de anomalías',
      'Forecasting',
      'Visualización de datos'
    ],
    systemPromptBase: `Eres un agente especializado en Analytics. Tu rol es transformar datos en insights
    accionables, predecir tendencias y detectar anomalías. Proporcionas inteligencia al supervisor general
    para la toma de decisiones.`,
    defaultConfidenceThreshold: 0.85,
    defaultPriority: 9
  },
  operations: {
    defaultCapabilities: [
      'Gestión de operaciones',
      'Control de calidad',
      'Optimización de flujos',
      'Gestión de incidencias',
      'Coordinación de equipos'
    ],
    systemPromptBase: `Eres un agente especializado en Operaciones. Tu rol es asegurar la fluidez de los
    procesos operativos, detectar cuellos de botella y optimizar recursos. Escalas al supervisor general
    cuando se requiere coordinación interdepartamental.`,
    defaultConfidenceThreshold: 0.7,
    defaultPriority: 6
  },
  finance: {
    defaultCapabilities: [
      'Gestión financiera',
      'Control de tesorería',
      'Análisis de riesgos',
      'Planificación fiscal',
      'Reporting financiero'
    ],
    systemPromptBase: `Eres un agente especializado en Finanzas. Tu rol es optimizar la gestión financiera,
    controlar riesgos y asegurar el cumplimiento normativo. Coordinas con el supervisor general para
    decisiones de alto impacto financiero.`,
    defaultConfidenceThreshold: 0.9,
    defaultPriority: 10
  },
  hr: {
    defaultCapabilities: [
      'Gestión del talento',
      'Análisis de clima laboral',
      'Optimización de nóminas',
      'Planificación de formación',
      'Evaluación de desempeño'
    ],
    systemPromptBase: `Eres un agente especializado en Recursos Humanos. Tu rol es optimizar la gestión
    del talento, mejorar el clima laboral y asegurar el cumplimiento legal. Reportas al supervisor general
    sobre métricas clave de RRHH.`,
    defaultConfidenceThreshold: 0.75,
    defaultPriority: 7
  },
  compliance: {
    defaultCapabilities: [
      'Monitoreo normativo',
      'Gestión de riesgos',
      'Auditoría continua',
      'Control de cumplimiento',
      'Alertas regulatorias'
    ],
    systemPromptBase: `Eres un agente especializado en Compliance. Tu rol es asegurar el cumplimiento
    normativo, detectar riesgos regulatorios y mantener los estándares de control. Escalas inmediatamente
    al supervisor general cualquier incumplimiento detectado.`,
    defaultConfidenceThreshold: 0.95,
    defaultPriority: 10
  },
  custom: {
    defaultCapabilities: [
      'Adaptación a requisitos específicos',
      'Integración con sistemas existentes',
      'Automatización de tareas',
      'Reporting personalizado'
    ],
    systemPromptBase: `Eres un agente personalizado. Tu rol se adapta a los requisitos específicos
    del módulo. Coordinas con el supervisor general según las directrices establecidas.`,
    defaultConfidenceThreshold: 0.7,
    defaultPriority: 5
  }
};

// === HOOK DE REGISTRO DINÁMICO ===

interface DynamicModuleRegistryState {
  modules: DynamicModuleDefinition[];
  agents: DynamicAgentDefinition[];
  supervisorRegistrations: SupervisorRegistration[];
  events: RegistryEvent[];
  isLoading: boolean;
  error: string | null;
}

export function useDynamicModuleRegistry() {
  const [state, setState] = useState<DynamicModuleRegistryState>({
    modules: [],
    agents: [],
    supervisorRegistrations: [],
    events: [],
    isLoading: false,
    error: null
  });

  // === REGISTRAR NUEVO MÓDULO ===
  const registerModule = useCallback(async (
    moduleData: Omit<DynamicModuleDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DynamicModuleDefinition | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const newModule: DynamicModuleDefinition = {
        ...moduleData,
        id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Crear agente automáticamente basado en el template del dominio
      const template = AGENT_TEMPLATES[moduleData.domain];
      const newAgent = await createAgentForModule(newModule, template);

      setState(prev => ({
        ...prev,
        modules: [...prev.modules, newModule],
        agents: newAgent ? [...prev.agents, newAgent] : prev.agents,
        events: [
          {
            id: `evt_${Date.now()}`,
            type: 'module_registered',
            entityId: newModule.id,
            entityType: 'module',
            metadata: { moduleKey: moduleData.moduleKey, domain: moduleData.domain },
            timestamp: new Date()
          },
          ...prev.events
        ],
        isLoading: false
      }));

      // Registrar con el supervisor
      if (newAgent) {
        await registerWithSupervisor(newAgent.id, moduleData.moduleKey);
      }

      toast.success(`Módulo "${moduleData.moduleName}" registrado correctamente`);
      return newModule;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al registrar módulo';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
      return null;
    }
  }, []);

  // === CREAR AGENTE PARA MÓDULO ===
  const createAgentForModule = useCallback(async (
    module: DynamicModuleDefinition,
    template: typeof AGENT_TEMPLATES[ModuleDomain]
  ): Promise<DynamicAgentDefinition | null> => {
    try {
      const newAgent: DynamicAgentDefinition = {
        id: `agent_${module.moduleKey}_${Date.now()}`,
        moduleId: module.id,
        agentName: `Agente ${module.moduleName}`,
        agentType: module.moduleKey,
        description: `Agente ultra-especializado para el módulo ${module.moduleName}`,
        capabilities: [...template.defaultCapabilities],
        capabilityLevel: 'intermediate',
        systemPrompt: template.systemPromptBase.replace(
          'Tu rol es',
          `Tu rol en ${module.moduleName} es`
        ),
        confidenceThreshold: template.defaultConfidenceThreshold,
        executionMode: 'supervised',
        priority: template.defaultPriority,
        isActive: true,
        coordinatesWithSupervisor: true,
        learningEnabled: true,
        metrics: {
          totalExecutions: 0,
          successRate: 100,
          avgResponseTime: 0,
          learningProgress: 0,
          lastExecution: null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setState(prev => ({
        ...prev,
        events: [
          {
            id: `evt_${Date.now()}`,
            type: 'agent_created',
            entityId: newAgent.id,
            entityType: 'agent',
            metadata: { 
              moduleKey: module.moduleKey, 
              agentName: newAgent.agentName,
              domain: module.domain 
            },
            timestamp: new Date()
          },
          ...prev.events
        ]
      }));

      return newAgent;
    } catch (error) {
      console.error('Error creating agent for module:', error);
      return null;
    }
  }, []);

  // === REGISTRAR CON SUPERVISOR ===
  const registerWithSupervisor = useCallback(async (
    agentId: string,
    moduleKey: string
  ): Promise<SupervisorRegistration | null> => {
    try {
      const registration: SupervisorRegistration = {
        agentId,
        moduleKey,
        registeredAt: new Date(),
        status: 'accepted', // Auto-aceptación para flujo automático
        supervisorNotes: 'Registrado automáticamente por el sistema dinámico'
      };

      setState(prev => ({
        ...prev,
        supervisorRegistrations: [...prev.supervisorRegistrations, registration],
        events: [
          {
            id: `evt_${Date.now()}`,
            type: 'supervisor_accepted',
            entityId: agentId,
            entityType: 'agent',
            metadata: { moduleKey, status: 'accepted' },
            timestamp: new Date()
          },
          ...prev.events
        ]
      }));

      return registration;
    } catch (error) {
      console.error('Error registering with supervisor:', error);
      return null;
    }
  }, []);

  // === CREAR AGENTE PERSONALIZADO ===
  const createCustomAgent = useCallback(async (
    moduleId: string,
    agentData: Partial<DynamicAgentDefinition>
  ): Promise<DynamicAgentDefinition | null> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const module = state.modules.find(m => m.id === moduleId);
      if (!module) throw new Error('Módulo no encontrado');

      const template = AGENT_TEMPLATES[module.domain];
      
      const newAgent: DynamicAgentDefinition = {
        id: `agent_custom_${Date.now()}`,
        moduleId,
        agentName: agentData.agentName || `Agente Personalizado ${module.moduleName}`,
        agentType: agentData.agentType || `${module.moduleKey}_custom`,
        description: agentData.description || `Agente personalizado para ${module.moduleName}`,
        capabilities: agentData.capabilities || template.defaultCapabilities,
        capabilityLevel: agentData.capabilityLevel || 'intermediate',
        systemPrompt: agentData.systemPrompt || template.systemPromptBase,
        confidenceThreshold: agentData.confidenceThreshold ?? template.defaultConfidenceThreshold,
        executionMode: agentData.executionMode || 'supervised',
        priority: agentData.priority ?? template.defaultPriority,
        isActive: agentData.isActive ?? true,
        coordinatesWithSupervisor: agentData.coordinatesWithSupervisor ?? true,
        learningEnabled: agentData.learningEnabled ?? true,
        metrics: {
          totalExecutions: 0,
          successRate: 100,
          avgResponseTime: 0,
          learningProgress: 0,
          lastExecution: null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setState(prev => ({
        ...prev,
        agents: [...prev.agents, newAgent],
        isLoading: false
      }));

      if (newAgent.coordinatesWithSupervisor) {
        await registerWithSupervisor(newAgent.id, module.moduleKey);
      }

      toast.success(`Agente "${newAgent.agentName}" creado correctamente`);
      return newAgent;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear agente';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
      return null;
    }
  }, [state.modules, registerWithSupervisor]);

  // === ACTIVAR/DESACTIVAR AGENTE ===
  const toggleAgentStatus = useCallback((agentId: string, isActive: boolean) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => 
        a.id === agentId ? { ...a, isActive, updatedAt: new Date() } : a
      ),
      events: [
        {
          id: `evt_${Date.now()}`,
          type: isActive ? 'agent_activated' : 'agent_deactivated',
          entityId: agentId,
          entityType: 'agent',
          metadata: { isActive },
          timestamp: new Date()
        },
        ...prev.events
      ]
    }));

    toast.success(isActive ? 'Agente activado' : 'Agente desactivado');
  }, []);

  // === ACTUALIZAR CONFIGURACIÓN DE AGENTE ===
  const updateAgentConfig = useCallback((
    agentId: string,
    updates: Partial<DynamicAgentDefinition>
  ) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => 
        a.id === agentId ? { ...a, ...updates, updatedAt: new Date() } : a
      )
    }));

    toast.success('Configuración de agente actualizada');
  }, []);

  // === ELIMINAR MÓDULO Y SUS AGENTES ===
  const unregisterModule = useCallback((moduleId: string) => {
    setState(prev => {
      const module = prev.modules.find(m => m.id === moduleId);
      if (!module) return prev;

      return {
        ...prev,
        modules: prev.modules.filter(m => m.id !== moduleId),
        agents: prev.agents.filter(a => a.moduleId !== moduleId),
        supervisorRegistrations: prev.supervisorRegistrations.filter(
          r => !prev.agents.find(a => a.moduleId === moduleId && a.id === r.agentId)
        ),
        events: [
          {
            id: `evt_${Date.now()}`,
            type: 'module_registered', // Podría ser 'module_unregistered' si se añade
            entityId: moduleId,
            entityType: 'module',
            metadata: { action: 'unregistered', moduleKey: module.moduleKey },
            timestamp: new Date()
          },
          ...prev.events
        ]
      };
    });

    toast.success('Módulo eliminado del registro');
  }, []);

  // === OBTENER AGENTES POR MÓDULO ===
  const getAgentsByModule = useCallback((moduleId: string) => {
    return state.agents.filter(a => a.moduleId === moduleId);
  }, [state.agents]);

  // === OBTENER AGENTES POR DOMINIO ===
  const getAgentsByDomain = useCallback((domain: ModuleDomain) => {
    const moduleIds = state.modules
      .filter(m => m.domain === domain)
      .map(m => m.id);
    return state.agents.filter(a => moduleIds.includes(a.moduleId));
  }, [state.modules, state.agents]);

  // === OBTENER ESTADÍSTICAS DEL REGISTRO ===
  const registryStats = useMemo(() => {
    const activeModules = state.modules.filter(m => m.isActive).length;
    const activeAgents = state.agents.filter(a => a.isActive).length;
    const acceptedRegistrations = state.supervisorRegistrations.filter(r => r.status === 'accepted').length;
    
    const domainCounts = state.modules.reduce((acc, m) => {
      acc[m.domain] = (acc[m.domain] || 0) + 1;
      return acc;
    }, {} as Record<ModuleDomain, number>);

    const avgConfidence = state.agents.length > 0
      ? state.agents.reduce((sum, a) => sum + a.confidenceThreshold, 0) / state.agents.length
      : 0;

    return {
      totalModules: state.modules.length,
      activeModules,
      totalAgents: state.agents.length,
      activeAgents,
      acceptedRegistrations,
      pendingRegistrations: state.supervisorRegistrations.filter(r => r.status === 'pending').length,
      domainCounts,
      avgConfidence: Math.round(avgConfidence * 100),
      recentEvents: state.events.slice(0, 10)
    };
  }, [state]);

  // === AUTO-DISCOVERY DE MÓDULOS (simulated) ===
  const discoverModules = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Buscar en app_modules los módulos activos
      const { data: appModules, error } = await supabase
        .from('app_modules')
        .select('id, module_key, module_name, description, category, is_core')
        .eq('is_core', false)
        .limit(50);

      if (error) throw error;

      const existingKeys = new Set(state.modules.map(m => m.moduleKey));
      const newModules: DynamicModuleDefinition[] = [];

      for (const appModule of appModules || []) {
        if (!existingKeys.has(appModule.module_key)) {
          // Determinar dominio basado en categoría
          const domain = mapCategoryToDomain(appModule.category);
          
          newModules.push({
            id: `mod_${appModule.id}`,
            moduleKey: appModule.module_key,
            moduleName: appModule.module_name,
            domain,
            description: appModule.description || '',
            icon: 'Bot',
            color: 'from-blue-500 to-cyan-500',
            version: '1.0.0',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      if (newModules.length > 0) {
        for (const module of newModules) {
          await registerModule(module);
        }
        toast.success(`Descubiertos ${newModules.length} nuevos módulos`);
      } else {
        toast.info('No se encontraron módulos nuevos');
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error discovering modules:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Error al descubrir módulos' 
      }));
    }
  }, [state.modules, registerModule]);

  return {
    // Estado
    modules: state.modules,
    agents: state.agents,
    supervisorRegistrations: state.supervisorRegistrations,
    events: state.events,
    isLoading: state.isLoading,
    error: state.error,
    registryStats,

    // Acciones
    registerModule,
    createCustomAgent,
    toggleAgentStatus,
    updateAgentConfig,
    unregisterModule,
    discoverModules,

    // Consultas
    getAgentsByModule,
    getAgentsByDomain,

    // Templates
    AGENT_TEMPLATES
  };
}

// === HELPERS ===

function mapCategoryToDomain(category: string): ModuleDomain {
  const categoryMap: Record<string, ModuleDomain> = {
    'crm': 'crm',
    'sales': 'crm',
    'marketing': 'crm',
    'finance': 'finance',
    'accounting': 'finance',
    'treasury': 'finance',
    'hr': 'hr',
    'human_resources': 'hr',
    'payroll': 'hr',
    'operations': 'operations',
    'inventory': 'operations',
    'logistics': 'operations',
    'analytics': 'analytics',
    'reporting': 'analytics',
    'compliance': 'compliance',
    'legal': 'compliance',
    'audit': 'compliance'
  };

  return categoryMap[category.toLowerCase()] || 'custom';
}

export default useDynamicModuleRegistry;
