/**
 * useHRESGSelfService - Hook for ESG Social + Self-Service Portal
 * Phase 7: Employee portal, ESG social metrics, surveys, and AI assistant
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface ESGSocialMetric {
  id: string;
  company_id: string;
  period: string;
  category: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  target_value: number | null;
  benchmark_value: number | null;
  trend: string;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ESGSocialKPI {
  id: string;
  kpi_name: string;
  kpi_code: string;
  category: string;
  current_value: number;
  target_value: number;
  previous_value: number;
  unit: string;
  period: string;
  framework: string;
  gri_disclosure: string | null;
  status: string;
}

export interface SelfServiceRequest {
  id: string;
  employee_id: string;
  request_type: string;
  category: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  submitted_at: string;
  resolved_at: string | null;
}

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  helpful_count: number;
  view_count: number;
}

export interface ESGSurvey {
  id: string;
  title: string;
  description: string | null;
  survey_type: string;
  status: string;
  questions: unknown[];
  target_audience: string;
  response_count: number;
  avg_score: number;
  results: Record<string, unknown>;
  starts_at: string | null;
  ends_at: string | null;
}

export interface DocumentRequest {
  id: string;
  employee_id: string;
  document_type: string;
  purpose: string | null;
  status: string;
  generated_at: string | null;
  document_url: string | null;
}

export interface ESGSocialAnalysis {
  overallScore: number;
  rating: string;
  dimensions: Array<{
    name: string;
    score: number;
    status: string;
    findings: string[];
    recommendations: string[];
  }>;
  risks: Array<{
    area: string;
    level: string;
    description: string;
  }>;
  strengths: string[];
  actionPlan: Array<{
    priority: string;
    action: string;
    timeline: string;
  }>;
}

// === HOOK ===
export function useHRESGSelfService(companyId: string) {
  const [metrics, setMetrics] = useState<ESGSocialMetric[]>([]);
  const [kpis, setKpis] = useState<ESGSocialKPI[]>([]);
  const [requests, setRequests] = useState<SelfServiceRequest[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [surveys, setSurveys] = useState<ESGSurvey[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [analysis, setAnalysis] = useState<ESGSocialAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const invoke = useCallback(async (action: string, params?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-esg-selfservice', {
      body: { action, params: { ...params, companyId } }
    });
    if (error) throw error;
    return data;
  }, [companyId]);

  // === FETCH ALL ===
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await invoke('get_esg_metrics');
      if (res?.success) setMetrics(res.data || []);
    } catch (e) { console.error('fetchMetrics:', e); }
  }, [invoke]);

  const fetchKPIs = useCallback(async () => {
    try {
      const res = await invoke('get_esg_kpis');
      if (res?.success) setKpis(res.data || []);
    } catch (e) { console.error('fetchKPIs:', e); }
  }, [invoke]);

  const fetchRequests = useCallback(async (status?: string) => {
    try {
      const res = await invoke('get_requests', { status });
      if (res?.success) setRequests(res.data || []);
    } catch (e) { console.error('fetchRequests:', e); }
  }, [invoke]);

  const fetchFAQs = useCallback(async () => {
    try {
      const res = await invoke('get_faq');
      if (res?.success) setFaqs(res.data || []);
    } catch (e) { console.error('fetchFAQs:', e); }
  }, [invoke]);

  const fetchSurveys = useCallback(async () => {
    try {
      const res = await invoke('get_surveys');
      if (res?.success) setSurveys(res.data || []);
    } catch (e) { console.error('fetchSurveys:', e); }
  }, [invoke]);

  const fetchDocumentRequests = useCallback(async () => {
    try {
      const res = await invoke('get_document_requests');
      if (res?.success) setDocumentRequests(res.data || []);
    } catch (e) { console.error('fetchDocRequests:', e); }
  }, [invoke]);

  // === ACTIONS ===
  const createRequest = useCallback(async (request: Partial<SelfServiceRequest>) => {
    try {
      const res = await invoke('create_request', { request });
      if (res?.success) {
        toast.success('Solicitud creada correctamente');
        fetchRequests();
        return res.data;
      }
    } catch (e) {
      toast.error('Error al crear solicitud');
      console.error('createRequest:', e);
    }
    return null;
  }, [invoke, fetchRequests]);

  const updateRequest = useCallback(async (id: string, updates: Partial<SelfServiceRequest>) => {
    try {
      const res = await invoke('update_request', { id, ...updates });
      if (res?.success) {
        toast.success('Solicitud actualizada');
        fetchRequests();
      }
    } catch (e) {
      toast.error('Error al actualizar solicitud');
    }
  }, [invoke, fetchRequests]);

  const createDocumentRequest = useCallback(async (request: Partial<DocumentRequest>) => {
    try {
      const res = await invoke('create_document_request', { request });
      if (res?.success) {
        toast.success('Solicitud de documento creada');
        fetchDocumentRequests();
        return res.data;
      }
    } catch (e) {
      toast.error('Error al solicitar documento');
    }
    return null;
  }, [invoke, fetchDocumentRequests]);

  // === AI ===
  const runESGAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const res = await invoke('ai_esg_social_analysis');
      if (res?.success && res.data) {
        setAnalysis(res.data);
        toast.success('Análisis ESG Social completado');
        return res.data;
      }
    } catch (e) {
      toast.error('Error en análisis IA');
      console.error('runESGAnalysis:', e);
    } finally {
      setAnalysisLoading(false);
    }
    return null;
  }, [invoke]);

  const askAssistant = useCallback(async (question: string) => {
    try {
      const res = await invoke('ai_selfservice_assist', { question });
      if (res?.success) return res.data;
    } catch (e) {
      toast.error('Error del asistente');
    }
    return null;
  }, [invoke]);

  // === SEED ===
  const seedDemo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke('seed_demo');
      if (res?.success) {
        toast.success('Datos demo ESG Social cargados');
        await Promise.all([fetchMetrics(), fetchKPIs(), fetchFAQs(), fetchSurveys()]);
      }
    } catch (e) {
      toast.error('Error al cargar datos demo');
    } finally {
      setLoading(false);
    }
  }, [invoke, fetchMetrics, fetchKPIs, fetchFAQs, fetchSurveys]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('selfservice-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_self_service_requests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRequests(prev => [payload.new as SelfServiceRequest, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as SelfServiceRequest;
          setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchMetrics();
    fetchKPIs();
    fetchFAQs();
    fetchSurveys();
  }, [fetchMetrics, fetchKPIs, fetchFAQs, fetchSurveys]);

  // === COMPUTED STATS ===
  const stats = {
    totalMetrics: metrics.length,
    improvingMetrics: metrics.filter(m => m.trend === 'improving').length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    totalFAQs: faqs.length,
    activeSurveys: surveys.filter(s => s.status === 'active').length,
    avgKPIProgress: kpis.length > 0
      ? Math.round(kpis.reduce((acc, k) => acc + (k.target_value > 0 ? (k.current_value / k.target_value) * 100 : 0), 0) / kpis.length)
      : 0,
  };

  return {
    metrics, kpis, requests, faqs, surveys, documentRequests, analysis, stats,
    loading, analysisLoading,
    fetchMetrics, fetchKPIs, fetchRequests, fetchFAQs, fetchSurveys, fetchDocumentRequests,
    createRequest, updateRequest, createDocumentRequest,
    runESGAnalysis, askAssistant, seedDemo,
  };
}

export default useHRESGSelfService;
