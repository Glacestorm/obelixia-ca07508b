import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DigitalTwin {
  id: string;
  installation_id: string;
  twin_name: string;
  status: string;
  last_sync_at: string | null;
  snapshot_config: Record<string, unknown>;
  snapshot_modules: unknown[];
  snapshot_metrics: Record<string, unknown>;
  divergence_score: number;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface TwinSnapshot {
  id: string;
  twin_id: string;
  snapshot_type: string;
  config_snapshot: Record<string, unknown>;
  modules_snapshot: unknown[];
  metrics_snapshot: Record<string, unknown>;
  health_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface TwinSimulation {
  id: string;
  twin_id: string;
  simulation_type: string;
  simulation_name: string;
  input_params: Record<string, unknown>;
  result_status: string;
  result_data: Record<string, unknown>;
  risk_score: number | null;
  risk_factors: unknown[];
  ai_analysis: string | null;
  ai_recommendation: string | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useDigitalTwin(installationId?: string) {
  const [twin, setTwin] = useState<DigitalTwin | null>(null);
  const [snapshots, setSnapshots] = useState<TwinSnapshot[]>([]);
  const [simulations, setSimulations] = useState<TwinSimulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const autoSyncRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTwin = useCallback(async () => {
    if (!installationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_twins')
        .select('*')
        .eq('installation_id', installationId)
        .maybeSingle();
      if (error) throw error;
      if (data) setTwin(data as unknown as DigitalTwin);
      else setTwin(null);
    } catch (err) {
      console.error('[useDigitalTwin] fetchTwin:', err);
    } finally {
      setIsLoading(false);
    }
  }, [installationId]);

  const fetchSnapshots = useCallback(async (twinId: string) => {
    try {
      const { data, error } = await supabase
        .from('twin_snapshots')
        .select('*')
        .eq('twin_id', twinId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setSnapshots((data || []) as unknown as TwinSnapshot[]);
    } catch (err) {
      console.error('[useDigitalTwin] fetchSnapshots:', err);
    }
  }, []);

  const fetchSimulations = useCallback(async (twinId: string) => {
    try {
      const { data, error } = await supabase
        .from('twin_simulations')
        .select('*')
        .eq('twin_id', twinId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setSimulations((data || []) as unknown as TwinSimulation[]);
    } catch (err) {
      console.error('[useDigitalTwin] fetchSimulations:', err);
    }
  }, []);

  const createTwin = useCallback(async (installationData: Record<string, unknown>) => {
    if (!installationId) return null;
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('digital-twin-engine', {
        body: { action: 'create_twin', installation_id: installationId, params: installationData }
      });
      if (fnError) throw fnError;
      if (!fnData?.success) throw new Error('Failed to create twin');

      const aiResult = fnData.data;
      const { data: user } = await supabase.auth.getUser();

      const { data: newTwin, error } = await supabase
        .from('digital_twins')
        .insert([{
          installation_id: installationId,
          twin_name: aiResult.twin_name || 'Twin Principal',
          status: 'idle',
          snapshot_config: aiResult.snapshot_config || {},
          snapshot_modules: aiResult.snapshot_modules || [],
          snapshot_metrics: aiResult.snapshot_metrics || {},
          divergence_score: 0,
          last_sync_at: new Date().toISOString(),
          created_by: user?.user?.id,
        }] as any)
        .select()
        .single();

      if (error) throw error;
      setTwin(newTwin as unknown as DigitalTwin);
      toast.success('Digital Twin creado correctamente');
      return newTwin;
    } catch (err) {
      console.error('[useDigitalTwin] createTwin:', err);
      toast.error('Error al crear Digital Twin');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [installationId]);

  const syncTwin = useCallback(async () => {
    if (!twin) return;
    setIsSyncing(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('digital-twin-engine', {
        body: { action: 'sync_twin', twin_id: twin.id, params: { current_metrics: twin.snapshot_metrics, modules: twin.snapshot_modules } }
      });
      if (fnError) throw fnError;
      if (!fnData?.success) throw new Error('Sync failed');

      const result = fnData.data;
      const { error } = await supabase
        .from('digital_twins')
        .update({
          status: 'idle',
          last_sync_at: new Date().toISOString(),
          snapshot_metrics: result.updated_metrics || twin.snapshot_metrics,
          divergence_score: result.divergence_score ?? twin.divergence_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', twin.id);
      if (error) throw error;

      // Save snapshot
      await supabase.from('twin_snapshots').insert([{
        twin_id: twin.id,
        snapshot_type: 'auto',
        config_snapshot: twin.snapshot_config,
        modules_snapshot: twin.snapshot_modules,
        metrics_snapshot: result.updated_metrics || twin.snapshot_metrics,
        health_score: result.updated_metrics?.health_score ?? null,
      }] as any);

      await fetchTwin();
      await fetchSnapshots(twin.id);
      toast.success(`Twin sincronizado — divergencia: ${result.divergence_score ?? 0}%`);
    } catch (err) {
      console.error('[useDigitalTwin] syncTwin:', err);
      toast.error('Error al sincronizar twin');
    } finally {
      setIsSyncing(false);
    }
  }, [twin, fetchTwin, fetchSnapshots]);

  const simulateUpdate = useCallback(async (simulationName: string, simulationType: string, inputParams: Record<string, unknown>) => {
    if (!twin) return null;
    setIsSimulating(true);
    const startTime = Date.now();
    try {
      // Create pending simulation
      const { data: user } = await supabase.auth.getUser();
      const { data: sim, error: insertErr } = await supabase
        .from('twin_simulations')
        .insert([{
          twin_id: twin.id,
          simulation_type: simulationType,
          simulation_name: simulationName,
          input_params: inputParams,
          result_status: 'running',
          started_at: new Date().toISOString(),
          created_by: user?.user?.id,
        }] as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const { data: fnData, error: fnError } = await supabase.functions.invoke('digital-twin-engine', {
        body: { action: 'simulate_update', twin_id: twin.id, params: { ...inputParams, twin_metrics: twin.snapshot_metrics, twin_modules: twin.snapshot_modules } }
      });
      if (fnError) throw fnError;

      const result = fnData?.data || {};
      const duration = Date.now() - startTime;
      const resultStatus = result.simulation_result === 'success' ? 'success' : result.simulation_result === 'failed' ? 'failed' : 'warning';

      await supabase
        .from('twin_simulations')
        .update({
          result_status: resultStatus,
          result_data: result,
          risk_score: result.risk_score ?? null,
          risk_factors: result.risk_factors || [],
          ai_analysis: result.detailed_analysis || null,
          ai_recommendation: result.recommendation || null,
          duration_ms: duration,
          completed_at: new Date().toISOString(),
        })
        .eq('id', (sim as any).id);

      await fetchSimulations(twin.id);
      toast.success(`Simulación completada: ${resultStatus}`);
      return result;
    } catch (err) {
      console.error('[useDigitalTwin] simulateUpdate:', err);
      toast.error('Error en simulación');
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, [twin, fetchSimulations]);

  const runDiagnostic = useCallback(async () => {
    if (!twin) return null;
    setIsSimulating(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('digital-twin-engine', {
        body: { action: 'run_diagnostic', twin_id: twin.id, params: { metrics: twin.snapshot_metrics, modules: twin.snapshot_modules, config: twin.snapshot_config } }
      });
      if (fnError) throw fnError;
      toast.success('Diagnóstico completado');
      return fnData?.data || null;
    } catch (err) {
      console.error('[useDigitalTwin] runDiagnostic:', err);
      toast.error('Error en diagnóstico');
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, [twin]);

  const compareStates = useCallback(async () => {
    if (!twin) return null;
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('digital-twin-engine', {
        body: { action: 'compare_states', twin_id: twin.id, params: { twin_metrics: twin.snapshot_metrics, twin_modules: twin.snapshot_modules } }
      });
      if (fnError) throw fnError;
      return fnData?.data || null;
    } catch (err) {
      console.error('[useDigitalTwin] compareStates:', err);
      toast.error('Error en comparación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [twin]);

  // Initial fetch
  useEffect(() => {
    if (installationId) {
      fetchTwin();
    }
  }, [installationId, fetchTwin]);

  // Fetch sub-data when twin loads
  useEffect(() => {
    if (twin?.id) {
      fetchSnapshots(twin.id);
      fetchSimulations(twin.id);
    }
  }, [twin?.id, fetchSnapshots, fetchSimulations]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    };
  }, []);

  return {
    twin,
    snapshots,
    simulations,
    isLoading,
    isSimulating,
    isSyncing,
    createTwin,
    syncTwin,
    simulateUpdate,
    runDiagnostic,
    compareStates,
    fetchTwin,
  };
}

export default useDigitalTwin;
