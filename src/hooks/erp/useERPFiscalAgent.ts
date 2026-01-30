/**
 * useERPFiscalAgent - Hook principal para el Agente IA Fiscal ultraespecializado
 * Coordina con agente supervisor, aprende, ejecuta recomendaciones y genera asientos
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FiscalAgentSession {
  id: string;
  company_id: string;
  session_type: 'general' | 'compliance_check' | 'entry_generation' | 'regulation_query';
  status: 'active' | 'completed' | 'error';
  started_at: string;
  ended_at?: string;
  context: Record<string, unknown>;
  actions_taken: Array<{
    action: string;
    timestamp: string;
    result: unknown;
  }>;
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    action_required: boolean;
  }>;
  compliance_issues: Array<{
    jurisdiction: string;
    issue: string;
    severity: string;
    resolution: string;
  }>;
  tokens_used: number;
}

export interface ComplianceAlert {
  id: string;
  company_id: string;
  jurisdiction_id?: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description?: string;
  recommended_action?: string;
  is_resolved: boolean;
  created_at: string;
}

export interface FiscalKnowledge {
  id: string;
  jurisdiction_id?: string;
  knowledge_type: string;
  title: string;
  content: string;
  source_url?: string;
  effective_date?: string;
  tags: string[];
}

export interface FiscalFormTemplate {
  id: string;
  jurisdiction_id?: string;
  form_code: string;
  form_name: string;
  form_type: string;
  filing_frequency?: string;
  due_day_rule?: unknown;
  template_fields: unknown;
}

export interface AgentConfig {
  agent_enabled: boolean;
  auto_generate_entries: boolean;
  auto_generate_alerts: boolean;
  require_approval_threshold: number;
  notification_days_before_deadline: number;
  monitored_jurisdictions: string[];
}

export function useERPFiscalAgent(companyId?: string) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<FiscalAgentSession | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [knowledge, setKnowledge] = useState<FiscalKnowledge[]>([]);
  const [formTemplates, setFormTemplates] = useState<FiscalFormTemplate[]>([]);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  const sessionIdRef = useRef<string | null>(null);

  // Fetch company config
  const fetchConfig = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('erp_company_fiscal_agent_config')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig({
          agent_enabled: data.agent_enabled ?? true,
          auto_generate_entries: data.auto_generate_entries ?? false,
          auto_generate_alerts: data.auto_generate_alerts ?? true,
          require_approval_threshold: Number(data.require_approval_threshold) || 10000,
          notification_days_before_deadline: data.notification_days_before_deadline ?? 7,
          monitored_jurisdictions: data.monitored_jurisdictions ?? []
        });
      }
    } catch (error) {
      console.error('[useERPFiscalAgent] fetchConfig error:', error);
    }
  }, [companyId]);

  // Fetch compliance alerts
  const fetchAlerts = useCallback(async (unresolvedOnly = true) => {
    if (!companyId) return;
    
    try {
      let query = supabase
        .from('erp_fiscal_compliance_alerts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (unresolvedOnly) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setAlerts((data || []) as ComplianceAlert[]);
    } catch (error) {
      console.error('[useERPFiscalAgent] fetchAlerts error:', error);
    }
  }, [companyId]);

  // Fetch knowledge base
  const fetchKnowledge = useCallback(async (jurisdictionId?: string, type?: string) => {
    try {
      let query = supabase
        .from('erp_fiscal_knowledge_base')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (jurisdictionId) {
        query = query.eq('jurisdiction_id', jurisdictionId);
      }
      if (type) {
        query = query.eq('knowledge_type', type);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      
      setKnowledge((data || []) as FiscalKnowledge[]);
      return data;
    } catch (error) {
      console.error('[useERPFiscalAgent] fetchKnowledge error:', error);
      return [];
    }
  }, []);

  // Fetch form templates
  const fetchFormTemplates = useCallback(async (jurisdictionId?: string) => {
    try {
      let query = supabase
        .from('erp_fiscal_form_templates')
        .select('*')
        .eq('is_active', true);

      if (jurisdictionId) {
        query = query.eq('jurisdiction_id', jurisdictionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const templates = (data || []).map(d => ({
        id: d.id,
        jurisdiction_id: d.jurisdiction_id ?? undefined,
        form_code: d.form_code,
        form_name: d.form_name,
        form_type: d.form_type,
        filing_frequency: d.filing_frequency ?? undefined,
        due_day_rule: d.due_day_rule,
        template_fields: d.template_fields
      })) as FiscalFormTemplate[];
      setFormTemplates(templates);
      return templates;
    } catch (error) {
      console.error('[useERPFiscalAgent] fetchFormTemplates error:', error);
      return [];
    }
  }, []);

  // Start agent session
  const startSession = useCallback(async (
    sessionType: FiscalAgentSession['session_type'] = 'general',
    context?: Record<string, unknown>
  ) => {
    if (!companyId || !user?.id) {
      toast.error('Se requiere empresa y usuario autenticado');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_fiscal_agent_sessions')
        .insert([{
          company_id: companyId,
          session_type: sessionType,
          status: 'active',
          context: (context || {}) as unknown as Record<string, never>,
          performed_by: user.id
        }] as never)
        .select()
        .single();

      if (error) throw error;
      
      const session: FiscalAgentSession = {
        id: data.id,
        company_id: data.company_id,
        session_type: data.session_type as FiscalAgentSession['session_type'],
        status: data.status as FiscalAgentSession['status'],
        started_at: data.started_at,
        ended_at: data.ended_at ?? undefined,
        context: (data.context || {}) as Record<string, unknown>,
        actions_taken: (data.actions_taken || []) as FiscalAgentSession['actions_taken'],
        recommendations: (data.recommendations || []) as FiscalAgentSession['recommendations'],
        compliance_issues: (data.compliance_issues || []) as FiscalAgentSession['compliance_issues'],
        tokens_used: data.tokens_used ?? 0
      };
      setActiveSession(session);
      sessionIdRef.current = session.id;
      setChatHistory([]);
      
      return session;
    } catch (error) {
      console.error('[useERPFiscalAgent] startSession error:', error);
      toast.error('Error al iniciar sesión del agente');
      return null;
    }
  }, [companyId, user?.id]);

  // End session
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('erp_fiscal_agent_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionIdRef.current);

      setActiveSession(null);
      sessionIdRef.current = null;
    } catch (error) {
      console.error('[useERPFiscalAgent] endSession error:', error);
    }
  }, []);

  // Chat with agent
  const chat = useCallback(async (
    message: string,
    context?: Record<string, unknown>
  ) => {
    if (!companyId) {
      toast.error('Se requiere empresa');
      return null;
    }

    setIsLoading(true);

    // Add user message to history
    const updatedHistory = [...chatHistory, { role: 'user' as const, content: message }];
    setChatHistory(updatedHistory);

    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'chat',
          company_id: companyId,
          session_id: sessionIdRef.current,
          message,
          context: {
            ...context,
            config,
            recent_alerts: alerts.slice(0, 5)
          },
          history: updatedHistory.slice(-10)
        }
      });

      if (error) throw error;

      if (data?.success && data?.response) {
        const assistantMessage = { role: 'assistant' as const, content: data.response };
        setChatHistory(prev => [...prev, assistantMessage]);

        // If agent generated alerts, refresh
        if (data.alerts_generated) {
          fetchAlerts();
        }

        // If agent generated recommendations
        if (data.recommendations && activeSession) {
          setActiveSession(prev => prev ? {
            ...prev,
            recommendations: [...(prev.recommendations || []), ...data.recommendations]
          } : null);
        }

        return data;
      }

      throw new Error(data?.error || 'Sin respuesta del agente');
    } catch (error) {
      console.error('[useERPFiscalAgent] chat error:', error);
      toast.error('Error al comunicarse con el agente fiscal');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, chatHistory, config, alerts, activeSession, fetchAlerts]);

  // Check compliance
  const checkCompliance = useCallback(async (jurisdictionIds?: string[]) => {
    if (!companyId) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'check_compliance',
          company_id: companyId,
          jurisdiction_ids: jurisdictionIds || config?.monitored_jurisdictions
        }
      });

      if (error) throw error;

      if (data?.success) {
        fetchAlerts();
        toast.success(`Verificación completada: ${data.issues_found || 0} incidencias detectadas`);
        return data;
      }

      return null;
    } catch (error) {
      console.error('[useERPFiscalAgent] checkCompliance error:', error);
      toast.error('Error al verificar cumplimiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, config, fetchAlerts]);

  // Generate journal entry suggestion
  const suggestJournalEntry = useCallback(async (
    description: string,
    amount: number,
    jurisdictionId?: string
  ) => {
    if (!companyId) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'suggest_entry',
          company_id: companyId,
          description,
          amount,
          jurisdiction_id: jurisdictionId
        }
      });

      if (error) throw error;

      return data?.entry_suggestion || null;
    } catch (error) {
      console.error('[useERPFiscalAgent] suggestJournalEntry error:', error);
      toast.error('Error al generar sugerencia de asiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Query regulations
  const queryRegulation = useCallback(async (question: string, jurisdictionId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'query_regulation',
          question,
          jurisdiction_id: jurisdictionId
        }
      });

      if (error) throw error;
      return data?.response || null;
    } catch (error) {
      console.error('[useERPFiscalAgent] queryRegulation error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resolve alert
  const resolveAlert = useCallback(async (alertId: string, notes?: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('erp_fiscal_compliance_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta resuelta');
      return true;
    } catch (error) {
      console.error('[useERPFiscalAgent] resolveAlert error:', error);
      toast.error('Error al resolver alerta');
      return false;
    }
  }, [user?.id]);

  // Update config
  const updateConfig = useCallback(async (updates: Partial<AgentConfig>) => {
    if (!companyId) return false;

    try {
      const { error } = await supabase
        .from('erp_company_fiscal_agent_config')
        .upsert({
          company_id: companyId,
          ...config,
          ...updates
        });

      if (error) throw error;
      
      setConfig(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Configuración actualizada');
      return true;
    } catch (error) {
      console.error('[useERPFiscalAgent] updateConfig error:', error);
      toast.error('Error al actualizar configuración');
      return false;
    }
  }, [companyId, config]);

  // Realtime subscription for alerts
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`fiscal-alerts-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'erp_fiscal_compliance_alerts',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newAlert = payload.new as ComplianceAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show notification for critical alerts
          if (newAlert.severity === 'critical' || newAlert.severity === 'error') {
            toast.error(newAlert.title, { description: newAlert.description });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchConfig();
      fetchAlerts();
      fetchKnowledge();
      fetchFormTemplates();
    }
  }, [companyId, fetchConfig, fetchAlerts, fetchKnowledge, fetchFormTemplates]);

  return {
    // State
    isLoading,
    activeSession,
    alerts,
    knowledge,
    formTemplates,
    config,
    chatHistory,
    // Session actions
    startSession,
    endSession,
    // Agent actions
    chat,
    checkCompliance,
    suggestJournalEntry,
    queryRegulation,
    // Alert actions
    resolveAlert,
    fetchAlerts,
    // Config actions
    updateConfig,
    // Data fetch
    fetchKnowledge,
    fetchFormTemplates
  };
}

export default useERPFiscalAgent;
