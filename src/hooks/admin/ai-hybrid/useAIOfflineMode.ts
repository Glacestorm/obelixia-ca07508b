/**
 * useAIOfflineMode - Funcionalidad básica sin conectividad
 * Usa modelos locales y caché cuando no hay internet
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAICache } from './useAICache';

// === INTERFACES ===
export type ConnectionState = 'online' | 'offline' | 'degraded' | 'checking';

export interface OfflineConfig {
  enableAutoSwitch: boolean;
  offlineFallbackModel: string;
  offlineOllamaUrl: string;
  maxOfflineQueueSize: number;
  syncOnReconnect: boolean;
  showOfflineIndicator: boolean;
}

export interface QueuedRequest {
  id: string;
  prompt: string;
  context?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  retryCount: number;
}

export interface OfflineStats {
  offlineDuration: number;
  requestsQueued: number;
  requestsSynced: number;
  cacheHitsWhileOffline: number;
  localModelRequests: number;
}

const DEFAULT_CONFIG: OfflineConfig = {
  enableAutoSwitch: true,
  offlineFallbackModel: 'llama3.2',
  offlineOllamaUrl: 'http://localhost:11434',
  maxOfflineQueueSize: 100,
  syncOnReconnect: true,
  showOfflineIndicator: true,
};

const STORAGE_KEY = 'ai_offline_queue';

// === HOOK ===
export function useAIOfflineMode() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [config, setConfig] = useState<OfflineConfig>(DEFAULT_CONFIG);
  const [offlineQueue, setOfflineQueue] = useState<QueuedRequest[]>([]);
  const [stats, setStats] = useState<OfflineStats>({
    offlineDuration: 0,
    requestsQueued: 0,
    requestsSynced: 0,
    cacheHitsWhileOffline: 0,
    localModelRequests: 0,
  });
  const [isLocalAvailable, setIsLocalAvailable] = useState(false);

  const offlineStartRef = useRef<Date | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { get: getCached, set: setCached } = useAICache();

  // === CHECK ONLINE STATUS ===
  const checkOnlineStatus = useCallback(async (): Promise<ConnectionState> => {
    // Check browser online status
    if (!navigator.onLine) {
      return 'offline';
    }

    // Check Supabase connection
    try {
      const { error } = await supabase.functions.invoke('ai-hybrid-router', {
        body: { action: 'health_check' },
      });

      if (error) {
        return 'degraded';
      }

      return 'online';
    } catch {
      return 'offline';
    }
  }, []);

  // === CHECK LOCAL AI AVAILABILITY ===
  const checkLocalAI = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${config.offlineOllamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }, [config.offlineOllamaUrl]);

  // === HANDLE OFFLINE REQUEST ===
  const handleOfflineRequest = useCallback(async (
    prompt: string,
    options?: {
      context?: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high';
      requireSync?: boolean;
    }
  ): Promise<{ response?: string; queued?: boolean; fromCache?: boolean }> => {
    // Try cache first
    const cached = getCached(prompt, config.offlineFallbackModel);
    if (cached) {
      setStats(prev => ({
        ...prev,
        cacheHitsWhileOffline: prev.cacheHitsWhileOffline + 1,
      }));
      return { response: cached.response, fromCache: true };
    }

    // Try local Ollama
    if (isLocalAvailable) {
      try {
        const response = await fetch(`${config.offlineOllamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.offlineFallbackModel,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.message?.content || data.response;

          // Cache for future use
          setCached(prompt, aiResponse, {
            model: config.offlineFallbackModel,
            provider: 'ollama-local',
            tokensUsed: Math.ceil(aiResponse.length / 4),
            costPerToken: 0, // Local is free
          });

          setStats(prev => ({
            ...prev,
            localModelRequests: prev.localModelRequests + 1,
          }));

          return { response: aiResponse };
        }
      } catch (err) {
        console.error('[useAIOfflineMode] Local AI error:', err);
      }
    }

    // Queue for later sync
    if (options?.requireSync && offlineQueue.length < config.maxOfflineQueueSize) {
      const queuedRequest: QueuedRequest = {
        id: crypto.randomUUID(),
        prompt,
        context: options.context,
        priority: options.priority || 'normal',
        createdAt: new Date(),
        retryCount: 0,
      };

      setOfflineQueue(prev => [...prev, queuedRequest]);
      setStats(prev => ({
        ...prev,
        requestsQueued: prev.requestsQueued + 1,
      }));

      // Persist queue
      saveQueueToStorage([...offlineQueue, queuedRequest]);

      return { queued: true };
    }

    throw new Error('No AI service available offline');
  }, [
    getCached, 
    setCached, 
    config, 
    isLocalAvailable, 
    offlineQueue,
  ]);

  // === SYNC QUEUED REQUESTS ===
  const syncQueuedRequests = useCallback(async () => {
    if (connectionState !== 'online' || offlineQueue.length === 0) return;

    const toSync = [...offlineQueue];
    let synced = 0;

    for (const request of toSync) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-hybrid-router', {
          body: {
            action: 'chat',
            prompt: request.prompt,
            context: request.context,
          },
        });

        if (!error && data?.response) {
          // Cache the response
          setCached(request.prompt, data.response, {
            model: data.model || 'unknown',
            provider: data.source || 'unknown',
            tokensUsed: data.usage?.total_tokens || 0,
            costPerToken: 0.00003, // Approximate
          });

          // Remove from queue
          setOfflineQueue(prev => prev.filter(r => r.id !== request.id));
          synced++;
        }
      } catch (err) {
        console.error('[useAIOfflineMode] Sync error:', err);
        // Increment retry count
        setOfflineQueue(prev => prev.map(r => 
          r.id === request.id ? { ...r, retryCount: r.retryCount + 1 } : r
        ));
      }
    }

    if (synced > 0) {
      setStats(prev => ({
        ...prev,
        requestsSynced: prev.requestsSynced + synced,
      }));
      toast.success(`${synced} solicitudes sincronizadas`);
      saveQueueToStorage(offlineQueue.filter(r => !toSync.some(s => s.id === r.id)));
    }
  }, [connectionState, offlineQueue, setCached]);

  // === SAVE QUEUE TO STORAGE ===
  const saveQueueToStorage = useCallback((queue: QueuedRequest[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('[useAIOfflineMode] Save queue error:', err);
    }
  }, []);

  // === LOAD QUEUE FROM STORAGE ===
  const loadQueueFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const queue = JSON.parse(stored).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
        setOfflineQueue(queue);
      }
    } catch (err) {
      console.error('[useAIOfflineMode] Load queue error:', err);
    }
  }, []);

  // === UPDATE CONFIG ===
  const updateConfig = useCallback((updates: Partial<OfflineConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // === FORCE OFFLINE MODE ===
  const forceOfflineMode = useCallback((enabled: boolean) => {
    setConnectionState(enabled ? 'offline' : 'online');
  }, []);

  // === CONNECTION STATE CHANGE HANDLER ===
  const handleConnectionChange = useCallback((newState: ConnectionState) => {
    const prevState = connectionState;
    setConnectionState(newState);

    if (prevState === 'online' && (newState === 'offline' || newState === 'degraded')) {
      // Going offline
      offlineStartRef.current = new Date();
      if (config.showOfflineIndicator) {
        toast.warning('Conexión perdida. Modo offline activado.');
      }
    } else if ((prevState === 'offline' || prevState === 'degraded') && newState === 'online') {
      // Coming back online
      if (offlineStartRef.current) {
        const duration = Date.now() - offlineStartRef.current.getTime();
        setStats(prev => ({
          ...prev,
          offlineDuration: prev.offlineDuration + duration,
        }));
        offlineStartRef.current = null;
      }

      if (config.showOfflineIndicator) {
        toast.success('Conexión restaurada');
      }

      // Sync queued requests
      if (config.syncOnReconnect) {
        syncQueuedRequests();
      }
    }
  }, [connectionState, config, syncQueuedRequests]);

  // === INITIAL CHECKS ===
  useEffect(() => {
    loadQueueFromStorage();
    
    const initialCheck = async () => {
      const [online, local] = await Promise.all([
        checkOnlineStatus(),
        checkLocalAI(),
      ]);
      setConnectionState(online);
      setIsLocalAvailable(local);
    };

    initialCheck();

    // Periodic connection check
    checkIntervalRef.current = setInterval(async () => {
      const newState = await checkOnlineStatus();
      handleConnectionChange(newState);
      
      const localAvailable = await checkLocalAI();
      setIsLocalAvailable(localAvailable);
    }, 30000);

    // Browser online/offline events
    const handleOnline = () => handleConnectionChange('online');
    const handleOffline = () => handleConnectionChange('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkOnlineStatus, checkLocalAI, handleConnectionChange, loadQueueFromStorage]);

  return {
    // State
    connectionState,
    isLocalAvailable,
    offlineQueue,
    stats,

    // Actions
    handleOfflineRequest,
    syncQueuedRequests,
    forceOfflineMode,
    checkOnlineStatus,
    checkLocalAI,

    // Config
    config,
    updateConfig,
  };
}

export default useAIOfflineMode;
