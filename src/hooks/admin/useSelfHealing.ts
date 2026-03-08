import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HealthCheck {
  id: string;
  installation_id: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  response_latency_ms: number;
  error_rate: number;
  active_connections: number;
  health_score: number;
  metrics_raw: Record<string, unknown>;
  checked_at: string;
  created_at: string;
}

export interface Incident {
  id: string;
  installation_id: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string | null;
  detected_at: string;
  resolved_at: string | null;
  auto_resolved: boolean;
  resolution_type: string | null;
  resolution_details: Record<string, unknown>;
  trigger_metrics: Record<string, unknown>;
  affected_modules: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HealthAnalysis {
  health_score: number;
  status: string;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    affected_module: string | null;
    recommendation: string;
  }>;
  trends: Record<string, string>;
  prediction: {
    risk_level: string;
    estimated_degradation_hours: number | null;
    preventive_actions: string[];
  };
}

export interface RemediationDecision {
  decision: string;
  confidence: number;
  reasoning: string;
  rollback_target: string | null;
  estimated_downtime_minutes: number;
  risk_level: string;
  steps: string[];
  requires_human_approval: boolean;
}

export function useSelfHealing() {
  const [isLoading, setIsLoading] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<HealthAnalysis | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const analyzeHealth = useCallback(async (installationId: string, metrics?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-monitor', {
        body: { action: 'analyze_health', installation_id: installationId, metrics }
      });
      if (error) throw error;
      if (data?.success) {
        setCurrentAnalysis(data.data.analysis);
        setLastRefresh(new Date());
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useSelfHealing] analyzeHealth error:', err);
      toast.error('Error al analizar salud');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const detectDegradation = useCallback(async (installationId: string, timeRangeHours = 24) => {
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-monitor', {
        body: { action: 'detect_degradation', installation_id: installationId, time_range_hours: timeRangeHours }
      });
      if (error) throw error;
      return data?.success ? data.data : null;
    } catch (err) {
      console.error('[useSelfHealing] detectDegradation error:', err);
      return null;
    }
  }, []);

  const decideAction = useCallback(async (incidentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-monitor', {
        body: { action: 'decide_action', incident_id: incidentId }
      });
      if (error) throw error;
      return data?.success ? data.data as RemediationDecision : null;
    } catch (err) {
      console.error('[useSelfHealing] decideAction error:', err);
      return null;
    }
  }, []);

  const executeRemediation = useCallback(async (incidentId: string, resolutionType: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-monitor', {
        body: { action: 'execute_remediation', incident_id: incidentId, metrics: { resolution_type: resolutionType } }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Remediación ejecutada: ${resolutionType}`);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useSelfHealing] executeRemediation error:', err);
      toast.error('Error al ejecutar remediación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHealthHistory = useCallback(async (installationId: string, timeRangeHours = 72) => {
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-monitor', {
        body: { action: 'get_health_history', installation_id: installationId, time_range_hours: timeRangeHours }
      });
      if (error) throw error;
      if (data?.success) {
        setHealthChecks(data.data.checks || []);
        setIncidents(data.data.incidents || []);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useSelfHealing] fetchHealthHistory error:', err);
      return null;
    }
  }, []);

  const configureThresholds = useCallback(async (installationId: string, thresholds: Record<string, number>) => {
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-monitor', {
        body: { action: 'configure_thresholds', installation_id: installationId, thresholds }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Umbrales actualizados');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useSelfHealing] configureThresholds error:', err);
      toast.error('Error al configurar umbrales');
      return false;
    }
  }, []);

  const startAutoMonitoring = useCallback((installationId: string, intervalMs = 90000) => {
    stopAutoMonitoring();
    analyzeHealth(installationId);
    fetchHealthHistory(installationId);
    autoRefreshInterval.current = setInterval(() => {
      analyzeHealth(installationId);
      fetchHealthHistory(installationId);
    }, intervalMs);
  }, [analyzeHealth, fetchHealthHistory]);

  const stopAutoMonitoring = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoMonitoring();
  }, [stopAutoMonitoring]);

  return {
    isLoading,
    healthChecks,
    incidents,
    currentAnalysis,
    lastRefresh,
    analyzeHealth,
    detectDegradation,
    decideAction,
    executeRemediation,
    fetchHealthHistory,
    configureThresholds,
    startAutoMonitoring,
    stopAutoMonitoring,
  };
}

export default useSelfHealing;
