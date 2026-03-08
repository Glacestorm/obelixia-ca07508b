/**
 * useHRCopilotTwin - Hook para Fase 8: Copilot + Digital Twin
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CopilotSession {
  id: string;
  company_id: string;
  session_type: string;
  title: string;
  status: string;
  messages: any[];
  context: Record<string, unknown>;
  autonomy_level: string;
  actions_taken: any[];
  satisfaction_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CopilotAction {
  id: string;
  session_id: string | null;
  action_type: string;
  description: string;
  target_entity: string | null;
  status: string;
  result: any;
  confidence_score: number | null;
  executed_at: string | null;
  created_at: string;
}

export interface TwinSnapshot {
  id: string;
  company_id: string;
  snapshot_name: string;
  snapshot_type: string;
  status: string;
  org_structure: Record<string, any>;
  workforce_metrics: Record<string, any>;
  payroll_snapshot: Record<string, any>;
  compliance_status: Record<string, any>;
  wellness_metrics: Record<string, any>;
  divergence_score: number;
  last_sync_at: string;
  created_at: string;
}

export interface TwinSimulation {
  id: string;
  snapshot_id: string | null;
  simulation_name: string;
  simulation_type: string;
  parameters: Record<string, any>;
  status: string;
  results: any;
  impact_analysis: any;
  risk_score: number | null;
  recommendation: string | null;
  created_at: string;
}

export interface CopilotKPI {
  id: string;
  kpi_name: string;
  kpi_category: string;
  current_value: number;
  target_value: number | null;
  previous_value: number | null;
  unit: string;
  trend: string;
}

export function useHRCopilotTwin(companyId: string = 'demo-company-id') {
  const [sessions, setSessions] = useState<CopilotSession[]>([]);
  const [actions, setActions] = useState<CopilotAction[]>([]);
  const [snapshots, setSnapshots] = useState<TwinSnapshot[]>([]);
  const [simulations, setSimulations] = useState<TwinSimulation[]>([]);
  const [kpis, setKpis] = useState<CopilotKPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [twinAnalysis, setTwinAnalysis] = useState<any>(null);
  const [proactiveInsights, setProactiveInsights] = useState<any>(null);

  const fetchCopilotData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-copilot-twin', {
        body: { action: 'get_copilot_stats', companyId }
      });
      if (error) throw error;
      if (data?.success) {
        setSessions(data.data.sessions || []);
        setActions(data.data.actions || []);
        setKpis(data.data.kpis || []);
      }
    } catch (err) {
      console.error('[useHRCopilotTwin] fetchCopilotData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchTwinData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-copilot-twin', {
        body: { action: 'get_twin_data', companyId }
      });
      if (error) throw error;
      if (data?.success) {
        setSnapshots(data.data.snapshots || []);
        setSimulations(data.data.simulations || []);
      }
    } catch (err) {
      console.error('[useHRCopilotTwin] fetchTwinData error:', err);
    }
  }, [companyId]);

  const sendChat = useCallback(async (message: string, context?: Record<string, unknown>) => {
    setIsLoading(true);
    setChatResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-copilot-twin', {
        body: { action: 'copilot_chat', companyId, params: { message, context } }
      });
      if (error) throw error;
      if (data?.success) {
        setChatResponse(data.data.response);
        return data.data.response;
      }
    } catch (err) {
      console.error('[useHRCopilotTwin] sendChat error:', err);
      toast.error('Error al enviar mensaje al copilot');
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [companyId]);

  const analyzeTwin = useCallback(async (snapshotData?: any) => {
    setIsLoading(true);
    setTwinAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-copilot-twin', {
        body: { action: 'ai_twin_analysis', companyId, params: snapshotData || snapshots[0] || {} }
      });
      if (error) throw error;
      if (data?.success) {
        setTwinAnalysis(data.data);
        toast.success('Análisis del Digital Twin completado');
        return data.data;
      }
    } catch (err) {
      console.error('[useHRCopilotTwin] analyzeTwin error:', err);
      toast.error('Error al analizar Digital Twin');
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [companyId, snapshots]);

  const simulateScenario = useCallback(async (scenario: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-copilot-twin', {
        body: { action: 'ai_simulate_scenario', companyId, params: scenario }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Simulación completada');
        return data.data;
      }
    } catch (err) {
      console.error('[useHRCopilotTwin] simulateScenario error:', err);
      toast.error('Error en simulación');
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [companyId]);

  const getProactiveInsights = useCallback(async () => {
    setIsLoading(true);
    setProactiveInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-copilot-twin', {
        body: { action: 'ai_proactive_insights', companyId, params: { snapshots, kpis } }
      });
      if (error) throw error;
      if (data?.success) {
        setProactiveInsights(data.data);
        return data.data;
      }
    } catch (err) {
      console.error('[useHRCopilotTwin] getProactiveInsights error:', err);
      toast.error('Error al obtener insights');
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [companyId, snapshots, kpis]);

  // Realtime for actions
  useEffect(() => {
    const channel = supabase
      .channel('copilot-actions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_copilot_actions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAction = payload.new as CopilotAction;
          setActions(prev => {
            if (prev.some(a => a.id === newAction.id)) return prev;
            return [newAction, ...prev];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCopilotData();
    fetchTwinData();
  }, [fetchCopilotData, fetchTwinData]);

  return {
    sessions, actions, snapshots, simulations, kpis,
    isLoading, chatResponse, twinAnalysis, proactiveInsights,
    fetchCopilotData, fetchTwinData, sendChat, analyzeTwin,
    simulateScenario, getProactiveInsights,
  };
}

export default useHRCopilotTwin;
