/**
 * GALIA EU Funding Monitor Hook
 * Monitoriza nuevas dotaciones de fondos UE/Estado
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FundingAlert {
  source: 'BOE' | 'PRTR' | 'BDNS' | 'EURLEX';
  title: string;
  description: string;
  amount?: number;
  deadline?: string;
  url: string;
  relevance_score: number;
  detected_at: string;
  keywords?: string[];
  territory_scope?: string;
  beneficiary_types?: string[];
}

export interface FundingSource {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface ScanFilters {
  keywords?: string[];
  territory?: string;
  beneficiary_types?: string[];
}

export interface OpportunityAnalysis {
  summary: string;
  eligibility: string[];
  timeline: {
    start: string;
    end: string;
    key_dates: Array<{ date: string; event: string }>;
  };
  budget: {
    total: number;
    max_per_project: number;
    funding_rate: number;
  };
  required_docs: string[];
  fit_score: number;
  recommendations: string[];
  risks: string[];
  action_plan: string[];
}

export interface Subscription {
  subscription_id: string;
  gal_id: string;
  keywords: string[];
  territory: string;
  frequency: 'daily' | 'weekly' | 'realtime';
  created_at: string;
  next_scan: string;
}

export function useGaliaEUFundingMonitor() {
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alerts, setAlerts] = useState<FundingAlert[]>([]);
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scan funding sources for new opportunities
  const scanSources = useCallback(async (filters?: ScanFilters) => {
    setIsScanning(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eu-funding-monitor', {
        body: {
          action: 'scan_sources',
          filters: filters || {}
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setAlerts(data.data.alerts || []);
        setSources(data.sources || []);
        setLastScan(new Date());
        
        const alertCount = data.data.alerts?.length || 0;
        if (alertCount > 0) {
          toast.success(`${alertCount} oportunidades de financiación detectadas`);
        } else {
          toast.info('No se encontraron nuevas oportunidades');
        }
        
        return data.data;
      }

      throw new Error(data?.error || 'Error al escanear fuentes');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error al escanear: ${message}`);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Get recent alerts for a GAL
  const getAlerts = useCallback(async (galId?: string) => {
    setIsScanning(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eu-funding-monitor', {
        body: {
          action: 'get_alerts',
          gal_id: galId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setAlerts(data.data.alerts || []);
        return data.data.alerts;
      }

      throw new Error(data?.error || 'Error al obtener alertas');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Analyze a specific funding opportunity
  const analyzeOpportunity = useCallback(async (
    opportunityUrl: string,
    galProfile?: Record<string, unknown>
  ): Promise<OpportunityAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eu-funding-monitor', {
        body: {
          action: 'analyze_opportunity',
          filters: {
            opportunity_url: opportunityUrl,
            gal_profile: galProfile || {}
          }
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Análisis de oportunidad completado');
        return data.data;
      }

      throw new Error(data?.error || 'Error al analizar oportunidad');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error en análisis: ${message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Subscribe to keyword alerts
  const subscribeToKeywords = useCallback(async (
    galId: string,
    keywords: string[],
    territory: string = 'Asturias',
    frequency: 'daily' | 'weekly' | 'realtime' = 'daily'
  ): Promise<Subscription | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eu-funding-monitor', {
        body: {
          action: 'subscribe_keywords',
          gal_id: galId,
          filters: { keywords, territory, frequency }
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Suscripción a alertas creada');
        return data.data;
      }

      throw new Error(data?.error || 'Error al crear suscripción');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error: ${message}`);
      return null;
    }
  }, []);

  // Get high priority alerts (relevance > 80)
  const getHighPriorityAlerts = useCallback(() => {
    return alerts.filter(alert => alert.relevance_score >= 80);
  }, [alerts]);

  // Get alerts by source
  const getAlertsBySource = useCallback((source: FundingAlert['source']) => {
    return alerts.filter(alert => alert.source === source);
  }, [alerts]);

  return {
    // State
    isScanning,
    isAnalyzing,
    alerts,
    sources,
    lastScan,
    error,
    // Actions
    scanSources,
    getAlerts,
    analyzeOpportunity,
    subscribeToKeywords,
    // Computed
    getHighPriorityAlerts,
    getAlertsBySource,
    alertCount: alerts.length,
    highPriorityCount: alerts.filter(a => a.relevance_score >= 80).length
  };
}

export default useGaliaEUFundingMonitor;
