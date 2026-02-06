/**
 * useGigWorkforce - Gestión de Fuerza Laboral Contingent/Gig
 * Fase 11: Freelancers, Contractors, Trabajadores Externos
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS ===
export type ContractorType = 'freelancer' | 'contractor' | 'consultant' | 'temp_agency' | 'outsourced' | 'intern';
export type ContractorStatus = 'active' | 'onboarding' | 'offboarding' | 'inactive' | 'blacklisted';
export type PaymentType = 'hourly' | 'daily' | 'project' | 'milestone' | 'retainer';
export type ComplianceStatus = 'compliant' | 'pending_docs' | 'expired' | 'non_compliant';

export interface GigContractor {
  id: string;
  company_id: string;
  contractor_type: ContractorType;
  status: ContractorStatus;
  
  // Datos personales/empresa
  legal_name: string;
  trade_name?: string;
  tax_id: string;
  email: string;
  phone?: string;
  country: string;
  address?: string;
  
  // Datos contractuales
  primary_skill_category: string;
  skills: string[];
  hourly_rate?: number;
  daily_rate?: number;
  currency: string;
  payment_type: PaymentType;
  payment_terms_days: number;
  
  // Compliance
  compliance_status: ComplianceStatus;
  has_liability_insurance: boolean;
  insurance_expiry?: string;
  has_nda_signed: boolean;
  nda_signed_at?: string;
  has_ip_agreement: boolean;
  background_check_status?: string;
  
  // Evaluación
  performance_rating?: number;
  total_projects: number;
  total_hours_logged: number;
  total_invoiced: number;
  
  // Relaciones
  agency_id?: string;
  manager_user_id?: string;
  
  // Metadatos
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GigProject {
  id: string;
  company_id: string;
  contractor_id: string;
  project_code: string;
  title: string;
  description?: string;
  
  // Alcance
  scope_type: 'fixed' | 'time_and_materials' | 'retainer';
  estimated_hours?: number;
  actual_hours: number;
  budget_amount?: number;
  spent_amount: number;
  
  // Fechas
  start_date: string;
  end_date?: string;
  deadline?: string;
  
  // Estado
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  completion_percentage: number;
  
  // Facturación
  invoiced_amount: number;
  pending_amount: number;
  
  // Entregables
  deliverables?: Record<string, unknown>[];
  milestones?: Record<string, unknown>[];
  
  created_at: string;
  updated_at: string;
}

export interface GigTimeEntry {
  id: string;
  project_id: string;
  contractor_id: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate_applied: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface GigInvoice {
  id: string;
  company_id: string;
  contractor_id: string;
  project_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  payment_date?: string;
  payment_reference?: string;
  
  line_items: Record<string, unknown>[];
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface GigComplianceDocument {
  id: string;
  contractor_id: string;
  document_type: 'id_document' | 'tax_certificate' | 'insurance' | 'nda' | 'contract' | 'background_check' | 'other';
  document_name: string;
  file_url?: string;
  issue_date?: string;
  expiry_date?: string;
  status: 'valid' | 'pending_review' | 'expired' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
}

export interface GigWorkforceAnalytics {
  totalContractors: number;
  activeContractors: number;
  byType: Record<ContractorType, number>;
  byStatus: Record<ContractorStatus, number>;
  complianceRate: number;
  avgPerformanceRating: number;
  totalMonthlySpend: number;
  projectsInProgress: number;
  pendingInvoices: number;
  pendingApprovals: number;
  topSkills: { skill: string; count: number }[];
  spendByCategory: { category: string; amount: number }[];
}

export interface GigAIInsight {
  type: 'risk' | 'optimization' | 'compliance' | 'cost' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedContractors?: string[];
  recommendedAction?: string;
  potentialSavings?: number;
  deadline?: string;
}

export interface GigWorkforceContext {
  companyId: string;
  companyName?: string;
  dateRange?: { from: string; to: string };
  filters?: {
    contractorType?: ContractorType;
    status?: ContractorStatus;
    skillCategory?: string;
  };
}

// === HOOK ===
export function useGigWorkforce() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [contractors, setContractors] = useState<GigContractor[]>([]);
  const [projects, setProjects] = useState<GigProject[]>([]);
  const [analytics, setAnalytics] = useState<GigWorkforceAnalytics | null>(null);
  const [insights, setInsights] = useState<GigAIInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Auto-refresh
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH CONTRACTORS ===
  const fetchContractors = useCallback(async (companyId: string, filters?: GigWorkforceContext['filters']) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = (supabase as any)
        .from('erp_gig_contractors')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.contractorType) {
        query = query.eq('contractor_type', filters.contractorType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setContractors(data || []);
      setLastRefresh(new Date());
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando contractors';
      setError(message);
      console.error('[useGigWorkforce] fetchContractors error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH PROJECTS ===
  const fetchProjects = useCallback(async (companyId: string, contractorId?: string) => {
    try {
      let query = (supabase as any)
        .from('erp_gig_projects')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (contractorId) {
        query = query.eq('contractor_id', contractorId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setProjects(data || []);
      return data;
    } catch (err) {
      console.error('[useGigWorkforce] fetchProjects error:', err);
      return null;
    }
  }, []);

  // === CREATE CONTRACTOR ===
  const createContractor = useCallback(async (contractor: Partial<GigContractor>) => {
    try {
      const { data, error: insertError } = await (supabase as any)
        .from('erp_gig_contractors')
        .insert([contractor])
        .select()
        .single();

      if (insertError) throw insertError;

      setContractors(prev => [data, ...prev]);
      toast.success('Contractor registrado correctamente');
      return data;
    } catch (err) {
      console.error('[useGigWorkforce] createContractor error:', err);
      toast.error('Error al registrar contractor');
      return null;
    }
  }, []);

  // === UPDATE CONTRACTOR ===
  const updateContractor = useCallback(async (id: string, updates: Partial<GigContractor>) => {
    try {
      const { data, error: updateError } = await (supabase as any)
        .from('erp_gig_contractors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setContractors(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Contractor actualizado');
      return data;
    } catch (err) {
      console.error('[useGigWorkforce] updateContractor error:', err);
      toast.error('Error al actualizar contractor');
      return null;
    }
  }, []);

  // === CREATE PROJECT ===
  const createProject = useCallback(async (project: Partial<GigProject>) => {
    try {
      const { data, error: insertError } = await (supabase as any)
        .from('erp_gig_projects')
        .insert([{
          ...project,
          actual_hours: 0,
          spent_amount: 0,
          invoiced_amount: 0,
          pending_amount: 0,
          completion_percentage: 0,
          status: 'draft'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setProjects(prev => [data, ...prev]);
      toast.success('Proyecto creado correctamente');
      return data;
    } catch (err) {
      console.error('[useGigWorkforce] createProject error:', err);
      toast.error('Error al crear proyecto');
      return null;
    }
  }, []);

  // === LOG TIME ENTRY ===
  const logTimeEntry = useCallback(async (entry: Partial<GigTimeEntry>) => {
    try {
      const { data, error: insertError } = await (supabase as any)
        .from('erp_gig_time_entries')
        .insert([{ ...entry, status: 'pending' }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Tiempo registrado');
      return data;
    } catch (err) {
      console.error('[useGigWorkforce] logTimeEntry error:', err);
      toast.error('Error al registrar tiempo');
      return null;
    }
  }, []);

  // === APPROVE TIME ENTRIES ===
  const approveTimeEntries = useCallback(async (entryIds: string[], approverUserId: string) => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('erp_gig_time_entries')
        .update({
          status: 'approved',
          approved_by: approverUserId,
          approved_at: new Date().toISOString()
        })
        .in('id', entryIds);

      if (updateError) throw updateError;

      toast.success(`${entryIds.length} entradas aprobadas`);
      return true;
    } catch (err) {
      console.error('[useGigWorkforce] approveTimeEntries error:', err);
      toast.error('Error al aprobar entradas');
      return false;
    }
  }, []);

  // === GET AI ANALYTICS ===
  const getAIAnalytics = useCallback(async (context: GigWorkforceContext) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gig-workforce-ai', {
        body: {
          action: 'analyze_workforce',
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setAnalytics(data.analytics);
        setInsights(data.insights || []);
        return data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useGigWorkforce] getAIAnalytics error:', err);
      toast.error('Error al obtener análisis IA');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET COMPLIANCE ALERTS ===
  const getComplianceAlerts = useCallback(async (companyId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gig-workforce-ai', {
        body: {
          action: 'compliance_check',
          context: { companyId }
        }
      });

      if (fnError) throw fnError;
      return data?.alerts || [];
    } catch (err) {
      console.error('[useGigWorkforce] getComplianceAlerts error:', err);
      return [];
    }
  }, []);

  // === PREDICT CONTRACTOR PERFORMANCE ===
  const predictPerformance = useCallback(async (contractorId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gig-workforce-ai', {
        body: {
          action: 'predict_performance',
          contractorId
        }
      });

      if (fnError) throw fnError;
      return data?.prediction || null;
    } catch (err) {
      console.error('[useGigWorkforce] predictPerformance error:', err);
      return null;
    }
  }, []);

  // === GENERATE INVOICE ===
  const generateInvoice = useCallback(async (
    contractorId: string,
    projectId: string,
    timeEntryIds: string[]
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gig-workforce-ai', {
        body: {
          action: 'generate_invoice',
          contractorId,
          projectId,
          timeEntryIds
        }
      });

      if (fnError) throw fnError;

      if (data?.invoice) {
        toast.success('Factura generada');
        return data.invoice;
      }

      return null;
    } catch (err) {
      console.error('[useGigWorkforce] generateInvoice error:', err);
      toast.error('Error al generar factura');
      return null;
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((context: GigWorkforceContext, intervalMs = 120000) => {
    stopAutoRefresh();
    fetchContractors(context.companyId, context.filters);
    fetchProjects(context.companyId);
    
    autoRefreshInterval.current = setInterval(() => {
      fetchContractors(context.companyId, context.filters);
      fetchProjects(context.companyId);
    }, intervalMs);
  }, [fetchContractors, fetchProjects]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // Estado
    isLoading,
    contractors,
    projects,
    analytics,
    insights,
    error,
    lastRefresh,
    
    // CRUD Contractors
    fetchContractors,
    createContractor,
    updateContractor,
    
    // Projects
    fetchProjects,
    createProject,
    
    // Time & Invoicing
    logTimeEntry,
    approveTimeEntries,
    generateInvoice,
    
    // AI
    getAIAnalytics,
    getComplianceAlerts,
    predictPerformance,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useGigWorkforce;
