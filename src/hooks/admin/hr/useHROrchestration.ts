/**
 * useHROrchestration — P10 Inter-Module Orchestration Engine
 * Manages orchestration rules and execution between Premium HR modules.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TriggerEvent = 'record_created' | 'record_updated' | 'status_changed' | 'threshold_exceeded' | 'count_changed';
export type ActionType = 'create_alert' | 'create_record' | 'update_status' | 'invoke_ai' | 'send_notification';
export type LogStatus = 'pending' | 'success' | 'failed' | 'skipped';
export type ModuleKey = 'security' | 'ai_governance' | 'workforce' | 'fairness' | 'twin' | 'legal' | 'cnae' | 'role_experience';

export interface OrchestrationRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  trigger_module: ModuleKey;
  trigger_event: TriggerEvent;
  trigger_table: string;
  trigger_conditions: Record<string, unknown>;
  action_module: ModuleKey;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  last_executed_at: string | null;
  execution_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrchestrationLogEntry {
  id: string;
  rule_id: string;
  trigger_module: string;
  trigger_event: string;
  trigger_data: Record<string, unknown>;
  action_module: string;
  action_type: string;
  action_result: Record<string, unknown>;
  status: LogStatus;
  error_message: string | null;
  execution_time_ms: number | null;
  created_at: string;
}

export interface OrchestrationStats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  recentLogs: OrchestrationLogEntry[];
}

const MODULE_LABELS: Record<ModuleKey, string> = {
  security: 'Security & Data Masking',
  ai_governance: 'AI Governance',
  workforce: 'Workforce Planning',
  fairness: 'Fairness Engine',
  twin: 'Digital Twin',
  legal: 'Legal Engine',
  cnae: 'CNAE Intelligence',
  role_experience: 'Role Experience',
};

const MODULE_TABLES: Record<ModuleKey, string[]> = {
  security: ['erp_hr_security_incidents', 'erp_hr_masking_rules', 'erp_hr_sod_rules', 'erp_hr_data_access_log'],
  ai_governance: ['erp_hr_ai_decisions', 'erp_hr_ai_model_registry', 'erp_hr_ai_bias_audits'],
  workforce: ['erp_hr_workforce_plans', 'erp_hr_scenarios'],
  fairness: ['erp_hr_justice_cases', 'erp_hr_pay_equity_analyses', 'erp_hr_pay_equity_snapshots'],
  twin: ['erp_hr_twin_module_snapshots', 'erp_hr_twin_alerts', 'erp_hr_twin_experiments'],
  legal: ['erp_hr_legal_contracts', 'erp_hr_legal_clauses', 'erp_hr_legal_templates'],
  cnae: ['erp_hr_cnae_sector_profiles', 'erp_hr_cnae_risk_assessments', 'erp_hr_cnae_benchmarks'],
  role_experience: ['erp_hr_role_dashboards', 'erp_hr_role_analytics'],
};

// Predefined orchestration templates
export const RULE_TEMPLATES: Partial<OrchestrationRule>[] = [
  {
    name: 'Incidente Seguridad → Caso Justicia',
    description: 'Cuando se crea un incidente de seguridad crítico, abre un caso en el motor de equidad.',
    trigger_module: 'security', trigger_event: 'record_created', trigger_table: 'erp_hr_security_incidents',
    trigger_conditions: { severity: 'critical' },
    action_module: 'fairness', action_type: 'create_alert',
    action_config: { alert_type: 'security_escalation', auto_create_case: true },
  },
  {
    name: 'Sesgo IA Detectado → Alerta Twin',
    description: 'Cuando una auditoría de sesgo detecta impacto dispar, genera alerta en el Digital Twin.',
    trigger_module: 'ai_governance', trigger_event: 'record_created', trigger_table: 'erp_hr_ai_bias_audits',
    trigger_conditions: { result: 'bias_detected' },
    action_module: 'twin', action_type: 'create_alert',
    action_config: { alert_type: 'ai_bias_divergence' },
  },
  {
    name: 'Riesgo CNAE Alto → Revisión Legal',
    description: 'Cuando se detecta un riesgo CNAE alto, solicita revisión de contratos afectados.',
    trigger_module: 'cnae', trigger_event: 'record_created', trigger_table: 'erp_hr_cnae_risk_assessments',
    trigger_conditions: { risk_level: 'high' },
    action_module: 'legal', action_type: 'send_notification',
    action_config: { notification_type: 'contract_review_required' },
  },
  {
    name: 'Caso Equidad Resuelto → Snapshot Twin',
    description: 'Al resolver un caso de equidad, captura snapshot del gemelo digital.',
    trigger_module: 'fairness', trigger_event: 'status_changed', trigger_table: 'erp_hr_justice_cases',
    trigger_conditions: { new_status: 'resolved' },
    action_module: 'twin', action_type: 'create_record',
    action_config: { record_type: 'snapshot', reason: 'post_equity_resolution' },
  },
  {
    name: 'Plan Workforce Activado → Análisis IA',
    description: 'Al activar un plan de workforce, ejecuta análisis IA de viabilidad.',
    trigger_module: 'workforce', trigger_event: 'status_changed', trigger_table: 'erp_hr_workforce_plans',
    trigger_conditions: { new_status: 'active' },
    action_module: 'ai_governance', action_type: 'invoke_ai',
    action_config: { analysis_type: 'plan_viability' },
  },
  {
    name: 'Contrato Legal Generado → Log Seguridad',
    description: 'Al generar un contrato legal, registra el evento en el log de acceso a datos.',
    trigger_module: 'legal', trigger_event: 'record_created', trigger_table: 'erp_hr_legal_contracts',
    trigger_conditions: {},
    action_module: 'security', action_type: 'create_record',
    action_config: { record_type: 'data_access_log', access_type: 'contract_generated' },
  },
];

export function useHROrchestration(companyId?: string) {
  const [rules, setRules] = useState<OrchestrationRule[]>([]);
  const [logs, setLogs] = useState<OrchestrationLogEntry[]>([]);
  const [stats, setStats] = useState<OrchestrationStats>({ totalRules: 0, activeRules: 0, totalExecutions: 0, successRate: 0, recentLogs: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_orchestration_rules')
        .select('*')
        .eq('company_id', companyId)
        .order('priority', { ascending: true });

      if (error) throw error;
      const typed = (data || []) as unknown as OrchestrationRule[];
      setRules(typed);

      // Fetch logs
      const { data: logData } = await supabase
        .from('erp_hr_orchestration_log')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      const typedLogs = (logData || []) as unknown as OrchestrationLogEntry[];
      setLogs(typedLogs);

      // Compute stats
      const active = typed.filter(r => r.is_active).length;
      const totalExec = typed.reduce((s, r) => s + r.execution_count, 0);
      const successLogs = typedLogs.filter(l => l.status === 'success').length;

      setStats({
        totalRules: typed.length,
        activeRules: active,
        totalExecutions: totalExec,
        successRate: typedLogs.length > 0 ? Math.round((successLogs / typedLogs.length) * 100) : 100,
        recentLogs: typedLogs.slice(0, 10),
      });
    } catch (err) {
      console.error('[useHROrchestration] fetchRules error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Create rule
  const createRule = useCallback(async (rule: Partial<OrchestrationRule>) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase
        .from('erp_hr_orchestration_rules')
        .insert([{ ...rule, company_id: companyId } as any])
        .select()
        .single();

      if (error) throw error;
      toast.success('Regla de orquestación creada');
      fetchRules();
      return data;
    } catch (err) {
      console.error('[useHROrchestration] createRule error:', err);
      toast.error('Error al crear regla');
      return null;
    }
  }, [companyId, fetchRules]);

  // Toggle rule
  const toggleRule = useCallback(async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('erp_hr_orchestration_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() } as any)
        .eq('id', ruleId);

      if (error) throw error;
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: isActive } : r));
      toast.success(isActive ? 'Regla activada' : 'Regla desactivada');
    } catch (err) {
      console.error('[useHROrchestration] toggleRule error:', err);
      toast.error('Error al cambiar estado');
    }
  }, []);

  // Delete rule
  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_orchestration_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success('Regla eliminada');
    } catch (err) {
      console.error('[useHROrchestration] deleteRule error:', err);
      toast.error('Error al eliminar regla');
    }
  }, []);

  // Simulate execution (log entry)
  const simulateExecution = useCallback(async (ruleId: string) => {
    if (!companyId) return;
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const startTime = Date.now();
    try {
      const { error } = await supabase
        .from('erp_hr_orchestration_log')
        .insert([{
          company_id: companyId,
          rule_id: ruleId,
          trigger_module: rule.trigger_module,
          trigger_event: rule.trigger_event,
          trigger_data: { simulated: true, timestamp: new Date().toISOString() },
          action_module: rule.action_module,
          action_type: rule.action_type,
          action_result: { simulated: true, message: 'Ejecución simulada exitosa' },
          status: 'success',
          execution_time_ms: Date.now() - startTime,
        } as any]);

      if (error) throw error;

      // Update rule execution count
      await supabase
        .from('erp_hr_orchestration_rules')
        .update({
          execution_count: rule.execution_count + 1,
          last_executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', ruleId);

      toast.success('Simulación ejecutada correctamente');
      fetchRules();
    } catch (err) {
      console.error('[useHROrchestration] simulate error:', err);
      toast.error('Error en simulación');
    }
  }, [companyId, rules, fetchRules]);

  // Install template
  const installTemplate = useCallback(async (templateIndex: number) => {
    const template = RULE_TEMPLATES[templateIndex];
    if (!template) return;
    await createRule(template);
  }, [createRule]);

  // Realtime
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('orchestration-log-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'erp_hr_orchestration_log' }, (payload) => {
        const newLog = payload.new as unknown as OrchestrationLogEntry;
        setLogs(prev => [newLog, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  // Initial fetch
  useEffect(() => { fetchRules(); }, [fetchRules]);

  return {
    rules,
    logs,
    stats,
    isLoading,
    fetchRules,
    createRule,
    toggleRule,
    deleteRule,
    simulateExecution,
    installTemplate,
    moduleLabels: MODULE_LABELS,
    moduleTables: MODULE_TABLES,
    templates: RULE_TEMPLATES,
  };
}

export default useHROrchestration;
