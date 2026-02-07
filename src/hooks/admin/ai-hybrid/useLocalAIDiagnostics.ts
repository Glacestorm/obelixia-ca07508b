/**
 * Hook para diagnóstico y gestión de IA Local (Ollama)
 * Auto-detección de modelos, benchmarking y monitoreo de salud
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface LocalAIEndpoint {
  url: string;
  connected: boolean;
  version?: string;
  modelsCount: number;
  lastChecked: Date | null;
  error?: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modifiedAt: string;
  size: number;
  sizeFormatted: string;
  digest: string;
  family?: string;
  parameterSize?: string;
  quantization?: string;
}

export interface BenchmarkResult {
  modelId: string;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
  totalTimeMs: number;
  qualityScore: number;
  responseTokens: number;
  gpuUsed: boolean;
  memoryUsedMb: number;
  error?: string;
  timestamp: Date;
}

export interface SystemCapabilities {
  supportsVision: boolean;
  supportsTools: boolean;
  supportsEmbeddings: boolean;
  supportsChat: boolean;
  supportsGenerate: boolean;
  availableEndpoints: string[];
  modelsByCapability: Record<string, string[]>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  version?: string;
  modelsAvailable: number;
  details: Record<string, any>;
  lastChecked: Date;
}

// === HELPER: Format bytes ===
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === HOOK ===
export function useLocalAIDiagnostics() {
  const [endpoint, setEndpoint] = useState<LocalAIEndpoint | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // === DISCOVER ENDPOINT ===
  const discoverEndpoint = useCallback(async (url: string): Promise<LocalAIEndpoint> => {
    setIsDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-local-diagnostics', {
        body: {
          action: 'discover',
          endpoint_url: url,
        },
      });

      if (error) throw error;

      const result: LocalAIEndpoint = {
        url,
        connected: data?.data?.connected || false,
        version: data?.data?.version,
        modelsCount: data?.data?.models_count || 0,
        lastChecked: new Date(),
        error: data?.data?.error,
      };

      setEndpoint(result);

      if (result.connected) {
        toast.success(`Conectado a Ollama v${result.version}`);
        // Auto-fetch models on successful connection
        await listAvailableModels(url);
      } else {
        toast.error(`No se pudo conectar: ${result.error}`);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Discovery failed';
      const result: LocalAIEndpoint = {
        url,
        connected: false,
        modelsCount: 0,
        lastChecked: new Date(),
        error,
      };
      setEndpoint(result);
      toast.error(`Error de conexión: ${error}`);
      return result;
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  // === LIST MODELS ===
  const listAvailableModels = useCallback(async (url?: string): Promise<OllamaModel[]> => {
    const targetUrl = url || endpoint?.url;
    if (!targetUrl) {
      toast.error('No hay endpoint configurado');
      return [];
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-local-diagnostics', {
        body: {
          action: 'list_models',
          endpoint_url: targetUrl,
        },
      });

      if (error) throw error;

      const modelsList: OllamaModel[] = (data?.data?.models || []).map((m: any) => ({
        name: m.name,
        model: m.model,
        modifiedAt: m.modified_at,
        size: m.size,
        sizeFormatted: formatBytes(m.size),
        digest: m.digest,
        family: m.details?.family,
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
      }));

      setModels(modelsList);
      return modelsList;
    } catch (err) {
      console.error('[useLocalAIDiagnostics] listAvailableModels error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [endpoint?.url]);

  // === BENCHMARK MODEL ===
  const benchmarkModel = useCallback(async (
    modelId: string,
    testPrompt?: string
  ): Promise<BenchmarkResult | null> => {
    if (!endpoint?.url) {
      toast.error('No hay endpoint configurado');
      return null;
    }

    setIsBenchmarking(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-local-diagnostics', {
        body: {
          action: 'benchmark',
          endpoint_url: endpoint.url,
          model_id: modelId,
          test_prompt: testPrompt,
        },
      });

      if (error) throw error;

      const result: BenchmarkResult = {
        modelId: data?.data?.model_id || modelId,
        tokensPerSecond: data?.data?.tokens_per_second || 0,
        timeToFirstTokenMs: data?.data?.time_to_first_token_ms || 0,
        totalTimeMs: data?.data?.total_time_ms || 0,
        qualityScore: data?.data?.quality_score || 0,
        responseTokens: data?.data?.response_tokens || 0,
        gpuUsed: data?.data?.gpu_used || false,
        memoryUsedMb: data?.data?.memory_used_mb || 0,
        error: data?.data?.error,
        timestamp: new Date(),
      };

      setBenchmarks(prev => [result, ...prev.slice(0, 49)]);

      if (result.error) {
        toast.error(`Benchmark fallido: ${result.error}`);
      } else {
        toast.success(`${modelId}: ${result.tokensPerSecond.toFixed(1)} tokens/s`);
      }

      return result;
    } catch (err) {
      console.error('[useLocalAIDiagnostics] benchmarkModel error:', err);
      toast.error('Error en benchmark');
      return null;
    } finally {
      setIsBenchmarking(false);
    }
  }, [endpoint?.url]);

  // === GET CAPABILITIES ===
  const getSystemCapabilities = useCallback(async (): Promise<SystemCapabilities | null> => {
    if (!endpoint?.url) {
      toast.error('No hay endpoint configurado');
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-local-diagnostics', {
        body: {
          action: 'get_capabilities',
          endpoint_url: endpoint.url,
        },
      });

      if (error) throw error;

      const caps: SystemCapabilities = {
        supportsVision: data?.data?.supports_vision || false,
        supportsTools: data?.data?.supports_tools || false,
        supportsEmbeddings: data?.data?.supports_embeddings || false,
        supportsChat: data?.data?.supports_chat || false,
        supportsGenerate: data?.data?.supports_generate || false,
        availableEndpoints: data?.data?.available_endpoints || [],
        modelsByCapability: data?.data?.models_by_capability || {},
      };

      setCapabilities(caps);
      return caps;
    } catch (err) {
      console.error('[useLocalAIDiagnostics] getSystemCapabilities error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint?.url]);

  // === HEALTH CHECK ===
  const monitorHealth = useCallback(async (): Promise<HealthStatus | null> => {
    if (!endpoint?.url) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-local-diagnostics', {
        body: {
          action: 'health_check',
          endpoint_url: endpoint.url,
        },
      });

      if (error) throw error;

      const status: HealthStatus = {
        status: data?.data?.status || 'unknown',
        latencyMs: data?.data?.latency_ms || 0,
        version: data?.data?.version,
        modelsAvailable: data?.data?.models_available || 0,
        details: data?.data?.details || {},
        lastChecked: new Date(),
      };

      setHealth(status);
      return status;
    } catch (err) {
      console.error('[useLocalAIDiagnostics] monitorHealth error:', err);
      const errorStatus: HealthStatus = {
        status: 'unhealthy',
        latencyMs: 0,
        modelsAvailable: 0,
        details: { error: err instanceof Error ? err.message : 'Unknown error' },
        lastChecked: new Date(),
      };
      setHealth(errorStatus);
      return errorStatus;
    }
  }, [endpoint?.url]);

  // === PULL MODEL ===
  const installModel = useCallback(async (modelId: string): Promise<boolean> => {
    if (!endpoint?.url) {
      toast.error('No hay endpoint configurado');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-local-diagnostics', {
        body: {
          action: 'pull_model',
          endpoint_url: endpoint.url,
          model_id: modelId,
        },
      });

      if (error) throw error;

      if (data?.data?.status === 'started') {
        toast.success(`Descarga iniciada para ${modelId}`);
        return true;
      } else {
        toast.error(data?.data?.message || 'Error al iniciar descarga');
        return false;
      }
    } catch (err) {
      console.error('[useLocalAIDiagnostics] installModel error:', err);
      toast.error('Error al instalar modelo');
      return false;
    }
  }, [endpoint?.url]);

  // === RECOMMENDED MODELS ===
  const getRecommendedModels = useCallback((): Array<{
    id: string;
    name: string;
    useCase: string;
    minRam: string;
    size: string;
  }> => {
    return [
      { id: 'llama3.2:8b', name: 'Llama 3.2 8B', useCase: 'Chat general', minRam: '8GB', size: '4.7GB' },
      { id: 'llama3.2:70b', name: 'Llama 3.2 70B', useCase: 'Análisis complejo', minRam: '48GB', size: '40GB' },
      { id: 'mistral:7b', name: 'Mistral 7B', useCase: 'Español/Multiidioma', minRam: '8GB', size: '4.1GB' },
      { id: 'codellama:13b', name: 'Code Llama 13B', useCase: 'Generación de código', minRam: '16GB', size: '7.4GB' },
      { id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder', useCase: 'Código sensible', minRam: '8GB', size: '3.8GB' },
      { id: 'llava:13b', name: 'LLaVA 13B', useCase: 'Visión/Imágenes', minRam: '16GB', size: '8.0GB' },
      { id: 'nomic-embed-text', name: 'Nomic Embed', useCase: 'Embeddings', minRam: '4GB', size: '274MB' },
    ];
  }, []);

  return {
    // State
    endpoint,
    models,
    benchmarks,
    capabilities,
    health,
    isLoading,
    isDiscovering,
    isBenchmarking,

    // Actions
    discoverEndpoint,
    listAvailableModels,
    benchmarkModel,
    getSystemCapabilities,
    monitorHealth,
    installModel,
    getRecommendedModels,
  };
}

export default useLocalAIDiagnostics;
