/**
 * useGaliaHybridAI - Sistema de IA Híbrida para GALIA
 * Fase 9 del Plan Estratégico GALIA 2.0
 * 
 * Enrutamiento inteligente local/cloud con priorización:
 * - Datos sensibles → Local (Ollama)
 * - Alta capacidad → Cloud (Gemini/GPT)
 * - Modo fallback automático
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AIProvider = 'local' | 'cloud' | 'hybrid';
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'advanced';

export interface HybridAIConfig {
  preferLocal: boolean;
  fallbackToCloud: boolean;
  sensitivityThreshold: DataSensitivity;
  maxLocalTokens: number;
  cloudModels: string[];
  localEndpoint?: string;
}

export interface AIRoutingDecision {
  provider: AIProvider;
  model: string;
  reasoning: string;
  estimatedLatency: number;
  confidenceScore: number;
  privacyCompliant: boolean;
}

export interface HybridAIResponse {
  success: boolean;
  provider: AIProvider;
  model: string;
  content: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  cached: boolean;
  privacyFlags?: string[];
}

export interface AutomationTask {
  id: string;
  type: 'document_analysis' | 'risk_assessment' | 'compliance_check' | 'report_generation' | 'decision_support';
  input: Record<string, unknown>;
  sensitivity: DataSensitivity;
  complexity: TaskComplexity;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AutomationResult {
  taskId: string;
  status: 'completed' | 'failed' | 'partial';
  output: Record<string, unknown>;
  provider: AIProvider;
  processingTime: number;
  qualityScore: number;
  auditTrail: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

const DEFAULT_CONFIG: HybridAIConfig = {
  preferLocal: false,
  fallbackToCloud: true,
  sensitivityThreshold: 'internal',
  maxLocalTokens: 4000,
  cloudModels: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro']
};

export function useGaliaHybridAI(initialConfig?: Partial<HybridAIConfig>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<HybridAIConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [lastResponse, setLastResponse] = useState<HybridAIResponse | null>(null);
  const [routingStats, setRoutingStats] = useState({
    localRequests: 0,
    cloudRequests: 0,
    fallbackCount: 0,
    avgLatency: 0
  });

  const requestCache = useRef<Map<string, HybridAIResponse>>(new Map());

  // === ROUTING INTELIGENTE ===
  const determineRoute = useCallback((
    task: AutomationTask
  ): AIRoutingDecision => {
    const sensitivityLevels: Record<DataSensitivity, number> = {
      public: 0,
      internal: 1,
      confidential: 2,
      restricted: 3
    };

    const configThreshold = sensitivityLevels[config.sensitivityThreshold];
    const taskSensitivity = sensitivityLevels[task.sensitivity];

    // Datos muy sensibles → Local obligatorio
    if (taskSensitivity >= 3 || (taskSensitivity > configThreshold && config.preferLocal)) {
      return {
        provider: 'local',
        model: 'llama3.2',
        reasoning: 'Datos clasificados como restringidos/confidenciales. Procesamiento local obligatorio para cumplimiento GDPR.',
        estimatedLatency: 2000,
        confidenceScore: 0.85,
        privacyCompliant: true
      };
    }

    // Tareas complejas → Cloud preferido
    if (task.complexity === 'advanced' || task.complexity === 'complex') {
      return {
        provider: 'cloud',
        model: 'google/gemini-2.5-pro',
        reasoning: 'Tarea compleja que requiere capacidad de razonamiento avanzado. Usando modelo cloud de alta capacidad.',
        estimatedLatency: 3000,
        confidenceScore: 0.95,
        privacyCompliant: taskSensitivity <= 1
      };
    }

    // Híbrido: decisión basada en configuración
    if (config.preferLocal) {
      return {
        provider: 'hybrid',
        model: 'llama3.2 → gemini-2.5-flash',
        reasoning: 'Modo híbrido: intento local primero con fallback a cloud si es necesario.',
        estimatedLatency: 1500,
        confidenceScore: 0.90,
        privacyCompliant: true
      };
    }

    // Default: Cloud para eficiencia
    return {
      provider: 'cloud',
      model: 'google/gemini-2.5-flash',
      reasoning: 'Tarea estándar sin restricciones de privacidad. Usando cloud para máxima eficiencia.',
      estimatedLatency: 1000,
      confidenceScore: 0.92,
      privacyCompliant: true
    };
  }, [config]);

  // === EJECUTAR TAREA CON IA HÍBRIDA ===
  const executeTask = useCallback(async (
    task: AutomationTask
  ): Promise<AutomationResult | null> => {
    setIsLoading(true);
    setError(null);

    const cacheKey = JSON.stringify({ type: task.type, input: task.input });
    const cached = requestCache.current.get(cacheKey);
    
    if (cached && Date.now() - (cached as any)._timestamp < 300000) {
      setLastResponse(cached);
      return {
        taskId: task.id,
        status: 'completed',
        output: JSON.parse(cached.content),
        provider: cached.provider,
        processingTime: 0,
        qualityScore: 95,
        auditTrail: [{ action: 'cache_hit', timestamp: new Date().toISOString(), details: 'Resultado desde caché' }]
      };
    }

    const routing = determineRoute(task);
    const startTime = Date.now();

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-hybrid-ai',
        {
          body: {
            action: 'execute_task',
            task,
            routing,
            config: {
              preferLocal: config.preferLocal,
              fallbackToCloud: config.fallbackToCloud
            }
          }
        }
      );

      if (fnError) throw fnError;

      const latency = Date.now() - startTime;

      if (data?.success) {
        const response: HybridAIResponse = {
          success: true,
          provider: data.provider || routing.provider,
          model: data.model || routing.model,
          content: JSON.stringify(data.output),
          tokens: data.tokens || { input: 0, output: 0 },
          latencyMs: latency,
          cached: false,
          privacyFlags: data.privacyFlags
        };

        setLastResponse(response);
        (response as any)._timestamp = Date.now();
        requestCache.current.set(cacheKey, response);

        // Actualizar stats
        setRoutingStats(prev => ({
          localRequests: prev.localRequests + (data.provider === 'local' ? 1 : 0),
          cloudRequests: prev.cloudRequests + (data.provider === 'cloud' ? 1 : 0),
          fallbackCount: prev.fallbackCount + (data.usedFallback ? 1 : 0),
          avgLatency: (prev.avgLatency * (prev.localRequests + prev.cloudRequests) + latency) / 
                      (prev.localRequests + prev.cloudRequests + 1)
        }));

        return {
          taskId: task.id,
          status: 'completed',
          output: data.output,
          provider: data.provider,
          processingTime: latency,
          qualityScore: data.qualityScore || 85,
          auditTrail: data.auditTrail || []
        };
      }

      throw new Error(data?.error || 'Error en ejecución híbrida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en IA Híbrida', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config, determineRoute]);

  // === AUTOMATIZACIÓN EN LOTE ===
  const executeBatch = useCallback(async (
    tasks: AutomationTask[]
  ): Promise<AutomationResult[]> => {
    const results: AutomationResult[] = [];
    
    // Ordenar por prioridad
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const task of sortedTasks) {
      const result = await executeTask(task);
      if (result) results.push(result);
    }

    toast.success(`Lote completado: ${results.length}/${tasks.length} tareas`);
    return results;
  }, [executeTask]);

  // === ANÁLISIS DE DOCUMENTO CON IA HÍBRIDA ===
  const analyzeDocument = useCallback(async (
    documentContent: string,
    documentType: string,
    sensitivity: DataSensitivity = 'internal'
  ) => {
    const task: AutomationTask = {
      id: `doc-${Date.now()}`,
      type: 'document_analysis',
      input: { content: documentContent, type: documentType },
      sensitivity,
      complexity: documentContent.length > 5000 ? 'complex' : 'moderate',
      priority: 'medium'
    };

    return executeTask(task);
  }, [executeTask]);

  // === EVALUACIÓN DE RIESGOS ===
  const assessRisk = useCallback(async (
    expedienteData: Record<string, unknown>,
    sensitivity: DataSensitivity = 'confidential'
  ) => {
    const task: AutomationTask = {
      id: `risk-${Date.now()}`,
      type: 'risk_assessment',
      input: expedienteData,
      sensitivity,
      complexity: 'complex',
      priority: 'high'
    };

    return executeTask(task);
  }, [executeTask]);

  // === GENERACIÓN DE INFORME ===
  const generateReport = useCallback(async (
    reportType: string,
    data: Record<string, unknown>,
    sensitivity: DataSensitivity = 'internal'
  ) => {
    const task: AutomationTask = {
      id: `report-${Date.now()}`,
      type: 'report_generation',
      input: { reportType, data },
      sensitivity,
      complexity: 'moderate',
      priority: 'medium'
    };

    return executeTask(task);
  }, [executeTask]);

  // === ACTUALIZAR CONFIGURACIÓN ===
  const updateConfig = useCallback((newConfig: Partial<HybridAIConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    toast.success('Configuración de IA Híbrida actualizada');
  }, []);

  // === LIMPIAR CACHÉ ===
  const clearCache = useCallback(() => {
    requestCache.current.clear();
    toast.info('Caché de IA limpiada');
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      requestCache.current.clear();
    };
  }, []);

  return {
    // Estado
    isLoading,
    error,
    config,
    lastResponse,
    routingStats,
    // Acciones principales
    executeTask,
    executeBatch,
    determineRoute,
    // Atajos de tareas
    analyzeDocument,
    assessRisk,
    generateReport,
    // Configuración
    updateConfig,
    clearCache
  };
}

export default useGaliaHybridAI;
