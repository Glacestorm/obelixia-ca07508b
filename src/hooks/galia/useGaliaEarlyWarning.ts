/**
 * useGaliaEarlyWarning - Sistema de Alertas Tempranas ML
 * Fase 7: Excelencia Operacional
 * Detecta señales tempranas de problemas y genera alertas proactivas
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EarlyWarning {
  id: string;
  warningType: 'budget_overrun' | 'deadline_risk' | 'documentation_gap' | 'inactivity' | 'compliance_drift' | 'fraud_indicator';
  severity: 'critical' | 'high' | 'medium' | 'low';
  expedienteId?: string;
  convocatoriaId?: string;
  title: string;
  description: string;
  detectedAt: string;
  predictedImpact: string;
  timeToImpact?: string;
  confidence: number;
  signals: Array<{ signal: string; value: string; threshold: string; deviation: number }>;
  recommendedActions: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
}

export interface WarningThreshold {
  id: string;
  warningType: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number;
  secondaryValue?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  customMessage?: string;
}

export interface WarningStats {
  totalWarnings: number;
  activeWarnings: number;
  criticalWarnings: number;
  resolvedThisWeek: number;
  averageResolutionTime: number;
  falsePositiveRate: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface SignalPattern {
  patternId: string;
  patternName: string;
  description: string;
  accuracy: number;
  occurrences: number;
  lastTriggered: string;
  associatedWarningType: string;
}

export function useGaliaEarlyWarning() {
  const [isLoading, setIsLoading] = useState(false);
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [thresholds, setThresholds] = useState<WarningThreshold[]>([]);
  const [stats, setStats] = useState<WarningStats | null>(null);
  const [patterns, setPatterns] = useState<SignalPattern[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get active warnings
  const getActiveWarnings = useCallback(async (filters?: {
    severity?: string[];
    warningType?: string[];
    expedienteId?: string;
    unacknowledgedOnly?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: {
          action: 'get_active_warnings',
          filters
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setWarnings(data.warnings || []);
        return data.warnings as EarlyWarning[];
      }

      throw new Error(data?.error || 'Error al obtener alertas');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run detection scan
  const runDetectionScan = useCallback(async (scope?: {
    expedienteIds?: string[];
    convocatoriaId?: string;
    fullScan?: boolean;
  }) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: {
          action: 'run_detection_scan',
          scope
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        const newWarnings = data.newWarnings || [];
        if (newWarnings.length > 0) {
          setWarnings(prev => [...newWarnings, ...prev]);
          toast.warning(`Detectadas ${newWarnings.length} nuevas alertas`);
        } else {
          toast.success('Escaneo completado: sin nuevas alertas');
        }
        return newWarnings as EarlyWarning[];
      }

      return [];
    } catch (err) {
      toast.error('Error en escaneo de detección');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Acknowledge warning
  const acknowledgeWarning = useCallback(async (warningId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: {
          action: 'acknowledge_warning',
          warningId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setWarnings(prev => prev.map(w => 
          w.id === warningId 
            ? { ...w, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : w
        ));
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al confirmar alerta');
      return false;
    }
  }, []);

  // Resolve warning
  const resolveWarning = useCallback(async (warningId: string, resolution: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: {
          action: 'resolve_warning',
          warningId,
          resolution
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setWarnings(prev => prev.filter(w => w.id !== warningId));
        toast.success('Alerta resuelta');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al resolver alerta');
      return false;
    }
  }, []);

  // Mark as false positive
  const markAsFalsePositive = useCallback(async (warningId: string, reason: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: {
          action: 'mark_false_positive',
          warningId,
          reason
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setWarnings(prev => prev.filter(w => w.id !== warningId));
        toast.info('Marcado como falso positivo');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al marcar falso positivo');
      return false;
    }
  }, []);

  // Configure thresholds
  const configureThreshold = useCallback(async (threshold: Partial<WarningThreshold>) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: {
          action: 'configure_threshold',
          threshold
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        await getThresholds();
        toast.success('Umbral configurado');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al configurar umbral');
      return false;
    }
  }, []);

  // Get thresholds
  const getThresholds = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: { action: 'get_thresholds' }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setThresholds(data.thresholds || []);
        return data.thresholds as WarningThreshold[];
      }

      return [];
    } catch (err) {
      console.error('[EarlyWarning] Thresholds error:', err);
      return [];
    }
  }, []);

  // Get statistics
  const getStats = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: { action: 'get_stats' }
      });

      if (fnError) throw fnError;

      if (data?.success && data.stats) {
        setStats(data.stats);
        return data.stats as WarningStats;
      }

      return null;
    } catch (err) {
      console.error('[EarlyWarning] Stats error:', err);
      return null;
    }
  }, []);

  // Get signal patterns
  const getSignalPatterns = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-early-warning', {
        body: { action: 'get_signal_patterns' }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPatterns(data.patterns || []);
        return data.patterns as SignalPattern[];
      }

      return [];
    } catch (err) {
      console.error('[EarlyWarning] Patterns error:', err);
      return [];
    }
  }, []);

  // Subscribe to realtime warnings
  const subscribeToWarnings = useCallback(() => {
    if (realtimeChannelRef.current) return;

    realtimeChannelRef.current = supabase
      .channel('galia-early-warnings')
      .on('broadcast', { event: 'new_warning' }, (payload) => {
        const newWarning = payload.payload as EarlyWarning;
        setWarnings(prev => [newWarning, ...prev]);
        
        if (newWarning.severity === 'critical') {
          toast.error(`⚠️ Alerta crítica: ${newWarning.title}`);
        } else {
          toast.warning(`Alerta: ${newWarning.title}`);
        }
      })
      .subscribe();
  }, []);

  // Unsubscribe from realtime
  const unsubscribeFromWarnings = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => unsubscribeFromWarnings();
  }, [unsubscribeFromWarnings]);

  return {
    isLoading,
    warnings,
    thresholds,
    stats,
    patterns,
    error,
    getActiveWarnings,
    runDetectionScan,
    acknowledgeWarning,
    resolveWarning,
    markAsFalsePositive,
    configureThreshold,
    getThresholds,
    getStats,
    getSignalPatterns,
    subscribeToWarnings,
    unsubscribeFromWarnings
  };
}

export default useGaliaEarlyWarning;
