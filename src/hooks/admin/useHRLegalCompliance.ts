/**
 * useHRLegalCompliance Hook
 * Sistema de Cumplimiento Legal y Alertas RRHH
 * Fase 1-8 Implementation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface LegalCommunication {
  id: string;
  company_id: string;
  employee_id: string;
  communication_type: string;
  jurisdiction: string;
  title: string;
  content?: string;
  legal_references?: string[];
  required_notice_days?: number;
  notice_date?: string;
  effective_date?: string;
  deadline_date?: string;
  delivery_method?: string;
  delivery_status: string;
  delivered_at?: string;
  acknowledged_at?: string;
  union_notification_required: boolean;
  union_notified_at?: string;
  checklist_status: Record<string, unknown>;
  ai_validated: boolean;
  legal_reviewed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminObligation {
  id: string;
  jurisdiction: string;
  organism: string;
  model_code?: string;
  obligation_name: string;
  obligation_type: string;
  periodicity: string;
  deadline_day?: number;
  deadline_month?: number;
  deadline_description?: string;
  legal_reference?: string;
  sanction_type?: string;
  sanction_min?: number;
  sanction_max?: number;
  is_active: boolean;
}

export interface ObligationDeadline {
  id: string;
  company_id: string;
  obligation_id: string;
  period_start?: string;
  period_end?: string;
  deadline_date: string;
  status: string;
  responsible_id?: string;
  completed_at?: string;
  document_url?: string;
  notes?: string;
  ai_reminded: boolean;
  legal_reviewed: boolean;
  obligation?: AdminObligation;
}

export interface SanctionRisk {
  id: string;
  jurisdiction: string;
  legal_reference: string;
  infraction_type: string;
  classification: string;
  description: string;
  sanction_min_minor?: number;
  sanction_max_minor?: number;
  sanction_min_medium?: number;
  sanction_max_medium?: number;
  sanction_min_major?: number;
  sanction_max_major?: number;
  preventive_measures?: string[];
  detection_triggers?: string[];
}

export interface SanctionAlert {
  id: string;
  company_id: string;
  risk_id?: string;
  obligation_deadline_id?: string;
  communication_id?: string;
  alert_level: 'prealert' | 'alert' | 'urgent' | 'critical';
  days_remaining?: number;
  potential_sanction_min?: number;
  potential_sanction_max?: number;
  title: string;
  description?: string;
  recommended_actions?: string[];
  hr_agent_notified: boolean;
  legal_agent_notified: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  risk?: SanctionRisk;
}

export interface CommunicationTemplate {
  id: string;
  jurisdiction: string;
  communication_type: string;
  template_name: string;
  template_content: string;
  dynamic_fields: unknown[];
  legal_references?: string[];
  checklist_items: unknown[];
  is_official: boolean;
  is_active: boolean;
}

export interface ComplianceChecklist {
  template_content: string;
  dynamic_fields: Array<{ name: string; label: string; type: string }>;
  legal_references?: string[];
  checklist_items: Array<{ text: string; mandatory: boolean }>;
  is_official: boolean;
  is_active: boolean;
}

export interface ComplianceChecklist {
  id: string;
  communication_id: string;
  template_id?: string;
  item_order: number;
  item_text: string;
  is_mandatory: boolean;
  status: 'pending' | 'completed' | 'not_applicable';
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export interface RiskAssessment {
  total_alerts: number;
  critical_alerts: number;
  urgent_alerts: number;
  potential_sanctions_min: number;
  potential_sanctions_max: number;
  overdue_obligations: number;
  pending_communications: number;
}

export interface UpcomingDeadline {
  deadline_id: string;
  obligation_name: string;
  organism: string;
  deadline_date: string;
  days_remaining: number;
  status: string;
  sanction_type?: string;
  sanction_max?: number;
}

// === HOOK ===
export function useHRLegalCompliance(companyId: string) {
  // State
  const [communications, setCommunications] = useState<LegalCommunication[]>([]);
  const [obligations, setObligations] = useState<AdminObligation[]>([]);
  const [deadlines, setDeadlines] = useState<ObligationDeadline[]>([]);
  const [sanctionRisks, setSanctionRisks] = useState<SanctionRisk[]>([]);
  const [alerts, setAlerts] = useState<SanctionAlert[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH COMMUNICATIONS ===
  const fetchCommunications = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error: err } = await supabase
        .from('erp_hr_legal_communications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCommunications((data || []) as LegalCommunication[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchCommunications error:', err);
    }
  }, [companyId]);

  // === FETCH OBLIGATIONS ===
  const fetchObligations = useCallback(async (jurisdiction?: string) => {
    try {
      let query = supabase
        .from('erp_hr_admin_obligations')
        .select('*')
        .eq('is_active', true);

      if (jurisdiction) {
        query = query.eq('jurisdiction', jurisdiction);
      }

      const { data, error: err } = await query.order('organism');

      if (err) throw err;
      setObligations((data || []) as AdminObligation[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchObligations error:', err);
    }
  }, []);

  // === FETCH DEADLINES ===
  const fetchDeadlines = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error: err } = await supabase
        .from('erp_hr_obligation_deadlines')
        .select(`
          *,
          obligation:erp_hr_admin_obligations(*)
        `)
        .eq('company_id', companyId)
        .order('deadline_date', { ascending: true });

      if (err) throw err;
      setDeadlines((data || []) as ObligationDeadline[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchDeadlines error:', err);
    }
  }, [companyId]);

  // === FETCH SANCTION RISKS ===
  const fetchSanctionRisks = useCallback(async (jurisdiction?: string) => {
    try {
      let query = supabase
        .from('erp_hr_sanction_risks')
        .select('*')
        .eq('is_active', true);

      if (jurisdiction) {
        query = query.eq('jurisdiction', jurisdiction);
      }

      const { data, error: err } = await query.order('classification');

      if (err) throw err;
      setSanctionRisks((data || []) as SanctionRisk[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchSanctionRisks error:', err);
    }
  }, []);

  // === FETCH ALERTS ===
  const fetchAlerts = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error: err } = await supabase
        .from('erp_hr_sanction_alerts')
        .select(`
          *,
          risk:erp_hr_sanction_risks(*)
        `)
        .eq('company_id', companyId)
        .eq('is_resolved', false)
        .order('alert_level', { ascending: false });

      if (err) throw err;
      setAlerts((data || []) as SanctionAlert[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchAlerts error:', err);
    }
  }, [companyId]);

  // === FETCH TEMPLATES ===
  const fetchTemplates = useCallback(async (jurisdiction?: string, communicationType?: string) => {
    try {
      let query = supabase
        .from('erp_hr_communication_templates')
        .select('*')
        .eq('is_active', true);

      if (jurisdiction) {
        query = query.eq('jurisdiction', jurisdiction);
      }
      if (communicationType) {
        query = query.eq('communication_type', communicationType);
      }

      const { data, error: err } = await query.order('template_name');

      if (err) throw err;
      setTemplates((data || []) as CommunicationTemplate[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchTemplates error:', err);
    }
  }, []);

  // === FETCH RISK ASSESSMENT (RPC) ===
  const fetchRiskAssessment = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error: err } = await supabase.rpc('get_sanction_risk_assessment', {
        p_company_id: companyId
      });

      if (err) throw err;
      if (data && data.length > 0) {
        setRiskAssessment(data[0] as RiskAssessment);
      }
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchRiskAssessment error:', err);
    }
  }, [companyId]);

  // === FETCH UPCOMING DEADLINES (RPC) ===
  const fetchUpcomingDeadlines = useCallback(async (daysAhead = 30) => {
    if (!companyId) return;
    try {
      const { data, error: err } = await supabase.rpc('get_upcoming_deadlines', {
        p_company_id: companyId,
        p_days_ahead: daysAhead
      });

      if (err) throw err;
      setUpcomingDeadlines((data || []) as UpcomingDeadline[]);
    } catch (err) {
      console.error('[useHRLegalCompliance] fetchUpcomingDeadlines error:', err);
    }
  }, [companyId]);

  // === CREATE COMMUNICATION ===
  const createCommunication = useCallback(async (
    communication: Partial<LegalCommunication>
  ): Promise<LegalCommunication | null> => {
    if (!companyId) return null;
    setIsLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('erp_hr_legal_communications')
        .insert([{ ...communication, company_id: companyId }] as any)
        .select()
        .single();

      if (err) throw err;
      
      const newComm = data as LegalCommunication;
      setCommunications(prev => [newComm, ...prev]);
      toast.success('Comunicación creada');
      return newComm;
    } catch (err) {
      console.error('[useHRLegalCompliance] createCommunication error:', err);
      toast.error('Error al crear comunicación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === UPDATE COMMUNICATION ===
  const updateCommunication = useCallback(async (
    id: string,
    updates: Partial<LegalCommunication>
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('erp_hr_legal_communications')
        .update(updates as any)
        .eq('id', id);

      if (err) throw err;

      setCommunications(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('Comunicación actualizada');
      return true;
    } catch (err) {
      console.error('[useHRLegalCompliance] updateCommunication error:', err);
      toast.error('Error al actualizar comunicación');
      return false;
    }
  }, []);

  // === CREATE DEADLINE ===
  const createDeadline = useCallback(async (
    deadline: Partial<ObligationDeadline>
  ): Promise<ObligationDeadline | null> => {
    if (!companyId) return null;
    try {
      const { data, error: err } = await supabase
        .from('erp_hr_obligation_deadlines')
        .insert([{ ...deadline, company_id: companyId }] as any)
        .select(`*, obligation:erp_hr_admin_obligations(*)`)
        .single();

      if (err) throw err;

      const newDeadline = data as ObligationDeadline;
      setDeadlines(prev => [...prev, newDeadline].sort((a, b) => 
        new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
      ));
      toast.success('Vencimiento creado');
      return newDeadline;
    } catch (err) {
      console.error('[useHRLegalCompliance] createDeadline error:', err);
      toast.error('Error al crear vencimiento');
      return null;
    }
  }, [companyId]);

  // === UPDATE DEADLINE ===
  const updateDeadline = useCallback(async (
    id: string,
    updates: Partial<ObligationDeadline>
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('erp_hr_obligation_deadlines')
        .update(updates as any)
        .eq('id', id);

      if (err) throw err;

      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      toast.success('Vencimiento actualizado');
      return true;
    } catch (err) {
      console.error('[useHRLegalCompliance] updateDeadline error:', err);
      toast.error('Error al actualizar vencimiento');
      return false;
    }
  }, []);

  // === RESOLVE ALERT ===
  const resolveAlert = useCallback(async (
    id: string,
    resolutionNotes?: string
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('erp_hr_sanction_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes
        } as any)
        .eq('id', id);

      if (err) throw err;

      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Alerta resuelta');
      return true;
    } catch (err) {
      console.error('[useHRLegalCompliance] resolveAlert error:', err);
      toast.error('Error al resolver alerta');
      return false;
    }
  }, []);

  // === NOTIFY AI AGENTS ===
  const notifyAgents = useCallback(async (alertId: string, agentType: 'hr' | 'legal') => {
    try {
      const updates = agentType === 'hr' 
        ? { hr_agent_notified: true, hr_agent_notified_at: new Date().toISOString() }
        : { legal_agent_notified: true, legal_agent_notified_at: new Date().toISOString() };

      const { error: err } = await supabase
        .from('erp_hr_sanction_alerts')
        .update(updates as any)
        .eq('id', alertId);

      if (err) throw err;

      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...updates } : a));
      toast.success(`Notificado a Agente IA ${agentType === 'hr' ? 'RRHH' : 'Jurídico'}`);
      return true;
    } catch (err) {
      console.error('[useHRLegalCompliance] notifyAgents error:', err);
      return false;
    }
  }, []);

  // === GENERATE AI COMMUNICATION ===
  const generateCommunication = useCallback(async (
    communicationType: string,
    employeeId?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'generate_communication',
          company_id: companyId,
          communication_type: communicationType,
          employee_id: employeeId,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRLegalCompliance] generateCommunication error:', err);
      toast.error('Error al generar comunicación');
      return null;
    }
  }, [companyId]);

  // === VALIDATE CHECKLIST WITH AI ===
  const validateChecklist = useCallback(async (communicationType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'validate_checklist',
          company_id: companyId,
          communication_type: communicationType,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRLegalCompliance] validateChecklist error:', err);
      toast.error('Error en validación');
      return null;
    }
  }, [companyId]);

  // === GET DASHBOARD SUMMARY ===
  const getDashboardSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'get_dashboard_summary',
          company_id: companyId,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRLegalCompliance] getDashboardSummary error:', err);
      return null;
    }
  }, [companyId]);

  // === CREATE COMPLIANCE ALERT ===
  const createAlert = useCallback(async (alertData: {
    title: string;
    description?: string;
    alert_level: 'prealert' | 'alert' | 'urgent' | 'critical';
    obligation_deadline_id?: string;
    communication_id?: string;
    risk_id?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'create_alert',
          company_id: companyId,
          ...alertData
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Alerta creada');
        await fetchAlerts();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRLegalCompliance] createAlert error:', err);
      toast.error('Error al crear alerta');
      return null;
    }
  }, [companyId, fetchAlerts]);

  // === ESCALATE TO LEGAL ===
  const escalateToLegal = useCallback(async (alertId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-compliance-monitor', {
        body: {
          action: 'escalate_to_legal',
          company_id: companyId,
          alert_id: alertId,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Escalado al departamento jurídico');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useHRLegalCompliance] escalateToLegal error:', err);
      toast.error('Error al escalar');
      return false;
    }
  }, [companyId]);

  // === REFRESH ALL ===
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCommunications(),
        fetchObligations(),
        fetchDeadlines(),
        fetchSanctionRisks(),
        fetchAlerts(),
        fetchTemplates(),
        fetchRiskAssessment(),
        fetchUpcomingDeadlines()
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchCommunications, fetchObligations, fetchDeadlines,
    fetchSanctionRisks, fetchAlerts, fetchTemplates,
    fetchRiskAssessment, fetchUpcomingDeadlines
  ]);

  // === AUTO REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 120000) => {
    stopAutoRefresh();
    refreshAll();
    autoRefreshInterval.current = setInterval(refreshAll, intervalMs);
  }, [refreshAll]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === HELPERS ===
  const getAlertLevelColor = useCallback((level: string): string => {
    const colors: Record<string, string> = {
      prealert: 'text-blue-500',
      alert: 'text-yellow-500',
      urgent: 'text-orange-500',
      critical: 'text-red-600'
    };
    return colors[level] || 'text-muted-foreground';
  }, []);

  const getAlertLevelBadge = useCallback((level: string): string => {
    const badges: Record<string, string> = {
      prealert: 'bg-blue-100 text-blue-800',
      alert: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return badges[level] || 'bg-gray-100 text-gray-800';
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-500',
      in_progress: 'text-blue-500',
      completed: 'text-green-500',
      overdue: 'text-red-500',
      draft: 'text-gray-500',
      sent: 'text-blue-500',
      acknowledged: 'text-green-500'
    };
    return colors[status] || 'text-muted-foreground';
  }, []);

  const getClassificationBadge = useCallback((classification: string): string => {
    const badges: Record<string, string> = {
      leve: 'bg-yellow-100 text-yellow-800',
      grave: 'bg-orange-100 text-orange-800',
      muy_grave: 'bg-red-100 text-red-800'
    };
    return badges[classification] || 'bg-gray-100 text-gray-800';
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (companyId) {
      refreshAll();
    }
  }, [companyId, refreshAll]);

  return {
    // State
    communications,
    obligations,
    deadlines,
    sanctionRisks,
    alerts,
    templates,
    riskAssessment,
    upcomingDeadlines,
    isLoading,
    error,
    // Actions
    fetchCommunications,
    fetchObligations,
    fetchDeadlines,
    fetchSanctionRisks,
    fetchAlerts,
    fetchTemplates,
    fetchRiskAssessment,
    fetchUpcomingDeadlines,
    createCommunication,
    updateCommunication,
    createDeadline,
    updateDeadline,
    resolveAlert,
    notifyAgents,
    generateCommunication,
    validateChecklist,
    getDashboardSummary,
    createAlert,
    escalateToLegal,
    refreshAll,
    startAutoRefresh,
    stopAutoRefresh,
    // Helpers
    getAlertLevelColor,
    getAlertLevelBadge,
    getStatusColor,
    getClassificationBadge,
  };
}

export default useHRLegalCompliance;
