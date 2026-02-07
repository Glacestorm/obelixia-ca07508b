/**
 * useAIBatchProcessor - Sistema de procesamiento por lotes
 * Agrupa solicitudes para optimizar uso de tokens
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface BatchRequest {
  id: string;
  prompt: string;
  context?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  resolve: (result: BatchResult) => void;
  reject: (error: Error) => void;
}

export interface BatchResult {
  requestId: string;
  success: boolean;
  response?: string;
  error?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTimeMs: number;
  minBatchSize: number;
  enablePriorityQueue: boolean;
  combinePrompts: boolean;
  maxCombinedTokens: number;
}

export interface BatchStats {
  totalBatches: number;
  totalRequests: number;
  averageBatchSize: number;
  tokensSaved: number;
  timeSavedMs: number;
  lastBatchAt: Date | null;
}

const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  maxWaitTimeMs: 2000,
  minBatchSize: 2,
  enablePriorityQueue: true,
  combinePrompts: true,
  maxCombinedTokens: 8000,
};

// === HOOK ===
export function useAIBatchProcessor() {
  const [config, setConfig] = useState<BatchConfig>(DEFAULT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<BatchStats>({
    totalBatches: 0,
    totalRequests: 0,
    averageBatchSize: 0,
    tokensSaved: 0,
    timeSavedMs: 0,
    lastBatchAt: null,
  });

  const queueRef = useRef<BatchRequest[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // === ADD TO QUEUE ===
  const addToQueue = useCallback((
    prompt: string,
    options?: {
      context?: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<BatchResult> => {
    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: crypto.randomUUID(),
        prompt,
        context: options?.context,
        priority: options?.priority || 'normal',
        createdAt: new Date(),
        resolve,
        reject,
      };

      queueRef.current.push(request);

      // Sort by priority if enabled
      if (config.enablePriorityQueue) {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        queueRef.current.sort((a, b) => 
          priorityOrder[a.priority] - priorityOrder[b.priority]
        );
      }

      // Check if we should process immediately
      if (queueRef.current.length >= config.maxBatchSize) {
        processBatch();
      } else if (!timerRef.current) {
        // Start timer for batch processing
        timerRef.current = setTimeout(() => {
          if (queueRef.current.length >= config.minBatchSize) {
            processBatch();
          }
        }, config.maxWaitTimeMs);
      }
    });
  }, [config]);

  // === PROCESS BATCH ===
  const processBatch = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;

    // Clear timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    processingRef.current = true;
    setIsProcessing(true);

    const batch = queueRef.current.splice(0, config.maxBatchSize);
    const startTime = Date.now();

    try {
      let results: BatchResult[];

      if (config.combinePrompts && batch.length > 1) {
        // Combine prompts into a single request
        results = await processCombinedBatch(batch);
      } else {
        // Process individually but in parallel
        results = await processParallelBatch(batch);
      }

      // Resolve promises
      for (const result of results) {
        const request = batch.find(r => r.id === result.requestId);
        if (request) {
          request.resolve(result);
        }
      }

      // Update stats
      const processingTime = Date.now() - startTime;
      const estimatedIndividualTime = batch.length * 1500; // ~1.5s per request
      
      setStats(prev => ({
        totalBatches: prev.totalBatches + 1,
        totalRequests: prev.totalRequests + batch.length,
        averageBatchSize: (prev.totalRequests + batch.length) / (prev.totalBatches + 1),
        tokensSaved: prev.tokensSaved + (batch.length > 1 ? batch.length * 50 : 0), // Estimated overhead savings
        timeSavedMs: prev.timeSavedMs + Math.max(0, estimatedIndividualTime - processingTime),
        lastBatchAt: new Date(),
      }));

    } catch (error) {
      // Reject all promises in batch
      for (const request of batch) {
        request.reject(error instanceof Error ? error : new Error('Batch processing failed'));
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);

      // Process next batch if queue has items
      if (queueRef.current.length >= config.minBatchSize) {
        processBatch();
      } else if (queueRef.current.length > 0) {
        timerRef.current = setTimeout(() => processBatch(), config.maxWaitTimeMs);
      }
    }
  }, [config]);

  // === PROCESS COMBINED BATCH ===
  const processCombinedBatch = async (batch: BatchRequest[]): Promise<BatchResult[]> => {
    // Combine prompts with separators
    const combinedPrompt = batch.map((req, i) => 
      `[Request ${i + 1}]\n${req.prompt}`
    ).join('\n\n---\n\n');

    const combinedContext = batch.reduce((acc, req) => ({
      ...acc,
      [`request_${req.id}`]: req.context,
    }), {});

    const systemPrompt = `Eres un asistente que procesa múltiples solicitudes a la vez.
Cada solicitud está marcada con [Request N].
Responde a CADA solicitud por separado, usando el formato:
[Response N]
(tu respuesta aquí)

Procesa las ${batch.length} solicitudes siguientes:`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-hybrid-router', {
        body: {
          action: 'chat',
          prompt: combinedPrompt,
          systemPrompt,
          context: combinedContext,
          options: {
            isBatchRequest: true,
            batchSize: batch.length,
          },
        },
      });

      if (error) throw error;

      // Parse combined response
      const responseText = data?.response || '';
      const results: BatchResult[] = [];

      for (let i = 0; i < batch.length; i++) {
        const request = batch[i];
        const marker = `[Response ${i + 1}]`;
        const nextMarker = `[Response ${i + 2}]`;
        
        let startIdx = responseText.indexOf(marker);
        let endIdx = responseText.indexOf(nextMarker);
        
        if (startIdx === -1) {
          results.push({
            requestId: request.id,
            success: false,
            error: 'Response not found in batch',
          });
          continue;
        }

        startIdx += marker.length;
        if (endIdx === -1) endIdx = responseText.length;

        const response = responseText.slice(startIdx, endIdx).trim();
        
        results.push({
          requestId: request.id,
          success: true,
          response,
          tokensUsed: Math.ceil(response.length / 4),
          processingTimeMs: Date.now() - request.createdAt.getTime(),
        });
      }

      return results;
    } catch (err) {
      throw err;
    }
  };

  // === PROCESS PARALLEL BATCH ===
  const processParallelBatch = async (batch: BatchRequest[]): Promise<BatchResult[]> => {
    const promises = batch.map(async (request) => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-hybrid-router', {
          body: {
            action: 'chat',
            prompt: request.prompt,
            context: request.context,
          },
        });

        if (error) throw error;

        return {
          requestId: request.id,
          success: true,
          response: data?.response,
          tokensUsed: data?.usage?.total_tokens,
          processingTimeMs: Date.now() - request.createdAt.getTime(),
        } as BatchResult;
      } catch (err) {
        return {
          requestId: request.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        } as BatchResult;
      }
    });

    return Promise.all(promises);
  };

  // === FLUSH QUEUE ===
  const flushQueue = useCallback(async () => {
    if (queueRef.current.length > 0) {
      await processBatch();
    }
  }, [processBatch]);

  // === CLEAR QUEUE ===
  const clearQueue = useCallback(() => {
    const requests = queueRef.current.splice(0);
    for (const request of requests) {
      request.reject(new Error('Queue cleared'));
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // === UPDATE CONFIG ===
  const updateConfig = useCallback((updates: Partial<BatchConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // === GET QUEUE STATUS ===
  const getQueueStatus = useCallback(() => ({
    queueLength: queueRef.current.length,
    isProcessing: processingRef.current,
    oldestRequest: queueRef.current[0]?.createdAt || null,
    priorityBreakdown: {
      high: queueRef.current.filter(r => r.priority === 'high').length,
      normal: queueRef.current.filter(r => r.priority === 'normal').length,
      low: queueRef.current.filter(r => r.priority === 'low').length,
    },
  }), []);

  // === CLEANUP ON UNMOUNT ===
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    // Queue operations
    addToQueue,
    flushQueue,
    clearQueue,
    getQueueStatus,

    // Config
    config,
    updateConfig,

    // State
    isProcessing,
    stats,
  };
}

export default useAIBatchProcessor;
