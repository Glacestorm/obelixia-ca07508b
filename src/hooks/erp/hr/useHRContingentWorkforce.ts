/**
 * useHRContingentWorkforce - Hook para gestión de fuerza laboral contingente
 * Fase 8: Gestión de Freelancers, Contratistas y Trabajadores Externos
 * 
 * Funcionalidades:
 * - Registro y gestión de trabajadores contingentes
 * - Contratos de servicios profesionales
 * - Seguimiento de proyectos y asignaciones
 * - Control de horas y facturación
 * - Cumplimiento legal (determinación relación laboral vs. mercantil)
 * - Integración con Compras y Tesorería
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// ============ TIPOS ============

export type ContingentWorkerType = 
  | 'freelancer' 
  | 'contractor' 
  | 'consultant' 
  | 'temp_agency' 
  | 'outsourced' 
  | 'intern_external'
  | 'gig_worker';

export type ContingentWorkerStatus = 
  | 'active' 
  | 'inactive' 
  | 'onboarding' 
  | 'offboarding' 
  | 'suspended' 
  | 'pending_approval';

export type ContractType = 
  | 'services' 
  | 'project' 
  | 'retainer' 
  | 'hourly' 
  | 'fixed_price' 
  | 'milestone';

export type PaymentTerms = 
  | 'net_15' 
  | 'net_30' 
  | 'net_45' 
  | 'net_60' 
  | 'on_completion' 
  | 'milestone';

export type ComplianceRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ContingentWorker {
  id: string;
  company_id: string;
  worker_type: ContingentWorkerType;
  status: ContingentWorkerStatus;
  
  // Datos personales/empresa
  legal_name: string;
  trade_name?: string;
  tax_id: string;
  is_company: boolean;
  contact_name?: string;
  email: string;
  phone?: string;
  address?: string;
  country: string;
  
  // Datos profesionales
  skills: string[];
  certifications?: string[];
  portfolio_url?: string;
  linkedin_url?: string;
  
  // Datos financieros
  default_rate: number;
  rate_type: 'hourly' | 'daily' | 'monthly' | 'project';
  currency: string;
  payment_method?: string;
  bank_account?: string;
  
  // Compliance
  compliance_status: ComplianceRiskLevel;
  last_compliance_review?: string;
  has_liability_insurance: boolean;
  insurance_expiry?: string;
  autonomo_registration?: string;
  
  // Metadata
  onboarding_date?: string;
  termination_date?: string;
  notes?: string;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface ContingentContract {
  id: string;
  company_id: string;
  worker_id: string;
  contract_number: string;
  contract_type: ContractType;
  
  // Detalles
  title: string;
  description?: string;
  scope_of_work: string;
  deliverables?: string[];
  
  // Fechas
  start_date: string;
  end_date?: string;
  is_indefinite: boolean;
  
  // Financiero
  total_value?: number;
  rate: number;
  rate_type: 'hourly' | 'daily' | 'monthly' | 'fixed';
  currency: string;
  payment_terms: PaymentTerms;
  
  // Estado
  status: 'draft' | 'pending_signature' | 'active' | 'completed' | 'terminated' | 'expired';
  signed_date?: string;
  signed_by_company?: string;
  signed_by_worker?: string;
  document_url?: string;
  
  // Legal
  governing_law: string;
  confidentiality_clause: boolean;
  non_compete_clause: boolean;
  ip_assignment: boolean;
  
  // Compliance
  compliance_reviewed: boolean;
  compliance_notes?: string;
  risk_assessment?: ComplianceRiskLevel;
  
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  company_id: string;
  worker_id: string;
  contract_id?: string;
  project_id?: string;
  
  // Detalles
  assignment_name: string;
  description?: string;
  department_id?: string;
  supervisor_id?: string;
  
  // Fechas
  start_date: string;
  end_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  
  // Estado
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  completion_percentage?: number;
  
  // Financiero
  budget?: number;
  actual_cost?: number;
  
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  company_id: string;
  worker_id: string;
  assignment_id?: string;
  
  // Tiempo
  entry_date: string;
  hours: number;
  description?: string;
  
  // Aprobación
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  
  // Facturación
  billable: boolean;
  rate_applied: number;
  total_amount: number;
  invoice_id?: string;
  
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface ContingentInvoice {
  id: string;
  company_id: string;
  worker_id: string;
  invoice_number: string;
  
  // Detalles
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  
  // Financiero
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  
  // Estado
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'disputed';
  payment_date?: string;
  payment_reference?: string;
  
  // Documentos
  invoice_document_url?: string;
  supporting_docs?: string[];
  
  // Integración
  treasury_payment_id?: string;
  accounting_entry_id?: string;
  
  notes?: string;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheck {
  id: string;
  company_id: string;
  worker_id: string;
  check_type: 'initial' | 'periodic' | 'incident' | 'termination';
  check_date: string;
  
  // Evaluación de riesgo de falso autónomo
  economic_dependence_score: number; // 0-100
  organizational_integration_score: number; // 0-100
  autonomy_score: number; // 0-100
  tools_ownership_score: number; // 0-100
  overall_risk_score: number; // 0-100
  
  risk_level: ComplianceRiskLevel;
  
  // Factores analizados
  factors_analyzed: Json;
  recommendations: string[];
  action_required: boolean;
  
  // Revisión
  reviewed_by?: string;
  reviewed_at?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'closed';
  
  notes?: string;
  metadata?: Json;
  created_at: string;
  updated_at: string;
}

export interface ContingentWorkforceStats {
  total_workers: number;
  active_workers: number;
  by_type: Record<ContingentWorkerType, number>;
  by_status: Record<ContingentWorkerStatus, number>;
  
  total_contracts: number;
  active_contracts: number;
  expiring_soon: number;
  
  total_spend_mtd: number;
  total_spend_ytd: number;
  pending_invoices: number;
  pending_amount: number;
  
  compliance_issues: number;
  high_risk_workers: number;
  
  avg_hourly_rate: number;
  utilization_rate: number;
}

export interface AIComplianceAnalysis {
  worker_id: string;
  analysis_date: string;
  risk_assessment: ComplianceRiskLevel;
  
  indicators: {
    economic_dependence: {
      score: number;
      factors: string[];
      risk: string;
    };
    organizational_integration: {
      score: number;
      factors: string[];
      risk: string;
    };
    autonomy_level: {
      score: number;
      factors: string[];
      risk: string;
    };
    tools_and_materials: {
      score: number;
      factors: string[];
      risk: string;
    };
  };
  
  legal_opinion: string;
  recommendations: string[];
  action_items: string[];
  
  regulatory_references: string[];
  similar_cases: string[];
}

// ============ HOOK ============

export function useHRContingentWorkforce() {
  // Estado
  const [workers, setWorkers] = useState<ContingentWorker[]>([]);
  const [contracts, setContracts] = useState<ContingentContract[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<ContingentInvoice[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [stats, setStats] = useState<ContingentWorkforceStats | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // ============ FETCH WORKERS ============
  const fetchWorkers = useCallback(async (companyId: string, filters?: {
    status?: ContingentWorkerStatus;
    worker_type?: ContingentWorkerType;
    search?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = (supabase as any)
        .from('erp_hr_contingent_workers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.worker_type) {
        query = query.eq('worker_type', filters.worker_type);
      }
      if (filters?.search) {
        query = query.or(`legal_name.ilike.%${filters.search}%,trade_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setWorkers(data || []);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar trabajadores';
      setError(message);
      console.error('[useHRContingentWorkforce] fetchWorkers error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============ CREATE WORKER ============
  const createWorker = useCallback(async (
    companyId: string,
    workerData: Partial<ContingentWorker>
  ) => {
    try {
      const { data, error } = await (supabase as any)
        .from('erp_hr_contingent_workers')
        .insert([{
          company_id: companyId,
          status: 'onboarding',
          compliance_status: 'medium',
          ...workerData
        }])
        .select()
        .single();

      if (error) throw error;

      setWorkers(prev => [data, ...prev]);
      toast.success('Trabajador contingente registrado');
      return data;
    } catch (err) {
      console.error('[useHRContingentWorkforce] createWorker error:', err);
      toast.error('Error al registrar trabajador');
      return null;
    }
  }, []);

  // ============ UPDATE WORKER ============
  const updateWorker = useCallback(async (
    workerId: string,
    updates: Partial<ContingentWorker>
  ) => {
    try {
      const { data, error } = await (supabase as any)
        .from('erp_hr_contingent_workers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', workerId)
        .select()
        .single();

      if (error) throw error;

      setWorkers(prev => prev.map(w => w.id === workerId ? data : w));
      toast.success('Trabajador actualizado');
      return data;
    } catch (err) {
      console.error('[useHRContingentWorkforce] updateWorker error:', err);
      toast.error('Error al actualizar trabajador');
      return null;
    }
  }, []);

  // ============ FETCH CONTRACTS ============
  const fetchContracts = useCallback(async (companyId: string, workerId?: string) => {
    try {
      let query = (supabase as any)
        .from('erp_hr_contingent_contracts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setContracts(data || []);
      return data;
    } catch (err) {
      console.error('[useHRContingentWorkforce] fetchContracts error:', err);
      return null;
    }
  }, []);

  // ============ CREATE CONTRACT ============
  const createContract = useCallback(async (
    companyId: string,
    contractData: Partial<ContingentContract>
  ) => {
    try {
      // Generar número de contrato
      const contractNumber = `CW-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await (supabase as any)
        .from('erp_hr_contingent_contracts')
        .insert([{
          company_id: companyId,
          contract_number: contractNumber,
          status: 'draft',
          confidentiality_clause: true,
          ip_assignment: true,
          compliance_reviewed: false,
          ...contractData
        }])
        .select()
        .single();

      if (error) throw error;

      setContracts(prev => [data, ...prev]);
      toast.success('Contrato creado');
      return data;
    } catch (err) {
      console.error('[useHRContingentWorkforce] createContract error:', err);
      toast.error('Error al crear contrato');
      return null;
    }
  }, []);

  // ============ SUBMIT TIME ENTRY ============
  const submitTimeEntry = useCallback(async (
    companyId: string,
    entryData: {
      worker_id: string;
      assignment_id?: string;
      entry_date: string;
      hours: number;
      description?: string;
      billable?: boolean;
      rate_applied: number;
    }
  ) => {
    try {
      const totalAmount = entryData.hours * entryData.rate_applied;

      const { data, error } = await (supabase as any)
        .from('erp_hr_contingent_time_entries')
        .insert([{
          company_id: companyId,
          status: 'submitted',
          billable: entryData.billable ?? true,
          total_amount: totalAmount,
          ...entryData
        }])
        .select()
        .single();

      if (error) throw error;

      setTimeEntries(prev => [data, ...prev]);
      toast.success('Horas registradas');
      return data;
    } catch (err) {
      console.error('[useHRContingentWorkforce] submitTimeEntry error:', err);
      toast.error('Error al registrar horas');
      return null;
    }
  }, []);

  // ============ APPROVE TIME ENTRIES ============
  const approveTimeEntries = useCallback(async (
    entryIds: string[],
    approverId: string
  ) => {
    try {
      const { error } = await (supabase as any)
        .from('erp_hr_contingent_time_entries')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .in('id', entryIds);

      if (error) throw error;

      setTimeEntries(prev => prev.map(e => 
        entryIds.includes(e.id) 
          ? { ...e, status: 'approved' as const, approved_by: approverId, approved_at: new Date().toISOString() }
          : e
      ));

      toast.success(`${entryIds.length} registros aprobados`);
      return true;
    } catch (err) {
      console.error('[useHRContingentWorkforce] approveTimeEntries error:', err);
      toast.error('Error al aprobar registros');
      return false;
    }
  }, []);

  // ============ GENERATE INVOICE ============
  const generateInvoice = useCallback(async (
    companyId: string,
    workerId: string,
    periodStart: string,
    periodEnd: string,
    taxRate: number = 21
  ) => {
    try {
      // Obtener entradas de tiempo aprobadas no facturadas
      const { data: entries, error: entriesError } = await (supabase as any)
        .from('erp_hr_contingent_time_entries')
        .select('*')
        .eq('company_id', companyId)
        .eq('worker_id', workerId)
        .eq('status', 'approved')
        .gte('entry_date', periodStart)
        .lte('entry_date', periodEnd);

      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        toast.error('No hay registros aprobados para facturar');
        return null;
      }

      const subtotal = entries.reduce((sum: number, e: TimeEntry) => sum + e.total_amount, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const invoiceNumber = `INV-CW-${Date.now().toString(36).toUpperCase()}`;

      const { data: invoice, error: invoiceError } = await (supabase as any)
        .from('erp_hr_contingent_invoices')
        .insert([{
          company_id: companyId,
          worker_id: workerId,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          period_start: periodStart,
          period_end: periodEnd,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          currency: 'EUR',
          status: 'draft'
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Marcar entradas como facturadas
      await (supabase as any)
        .from('erp_hr_contingent_time_entries')
        .update({ status: 'invoiced', invoice_id: invoice.id })
        .in('id', entries.map((e: TimeEntry) => e.id));

      setInvoices(prev => [invoice, ...prev]);
      toast.success('Factura generada');
      return invoice;
    } catch (err) {
      console.error('[useHRContingentWorkforce] generateInvoice error:', err);
      toast.error('Error al generar factura');
      return null;
    }
  }, []);

  // ============ RUN COMPLIANCE CHECK ============
  const runComplianceCheck = useCallback(async (
    companyId: string,
    workerId: string,
    checkType: 'initial' | 'periodic' | 'incident' | 'termination' = 'periodic'
  ): Promise<AIComplianceAnalysis | null> => {
    setIsLoading(true);

    try {
      // Obtener datos del trabajador
      const { data: worker, error: workerError } = await (supabase as any)
        .from('erp_hr_contingent_workers')
        .select('*')
        .eq('id', workerId)
        .single();

      if (workerError) throw workerError;

      // Obtener contratos
      const { data: workerContracts } = await (supabase as any)
        .from('erp_hr_contingent_contracts')
        .select('*')
        .eq('worker_id', workerId);

      // Obtener asignaciones
      const { data: workerAssignments } = await (supabase as any)
        .from('erp_hr_contingent_assignments')
        .select('*')
        .eq('worker_id', workerId);

      // Obtener entradas de tiempo
      const { data: workerTimeEntries } = await (supabase as any)
        .from('erp_hr_contingent_time_entries')
        .select('*')
        .eq('worker_id', workerId)
        .order('entry_date', { ascending: false })
        .limit(100);

      // Llamar a Edge Function para análisis IA
      const { data: analysis, error: analysisError } = await supabase.functions.invoke(
        'erp-hr-contingent-workforce',
        {
          body: {
            action: 'analyze_compliance',
            worker,
            contracts: workerContracts,
            assignments: workerAssignments,
            time_entries: workerTimeEntries,
            check_type: checkType
          }
        }
      );

      if (analysisError) throw analysisError;

      if (analysis?.success && analysis?.data) {
        // Guardar resultado del check
        const riskLevel = analysis.data.risk_assessment || 'medium';
        
        await (supabase as any)
          .from('erp_hr_contingent_compliance_checks')
          .insert([{
            company_id: companyId,
            worker_id: workerId,
            check_type: checkType,
            check_date: new Date().toISOString(),
            economic_dependence_score: analysis.data.indicators?.economic_dependence?.score || 50,
            organizational_integration_score: analysis.data.indicators?.organizational_integration?.score || 50,
            autonomy_score: analysis.data.indicators?.autonomy_level?.score || 50,
            tools_ownership_score: analysis.data.indicators?.tools_and_materials?.score || 50,
            overall_risk_score: (
              (analysis.data.indicators?.economic_dependence?.score || 50) +
              (analysis.data.indicators?.organizational_integration?.score || 50) +
              (100 - (analysis.data.indicators?.autonomy_level?.score || 50)) +
              (100 - (analysis.data.indicators?.tools_and_materials?.score || 50))
            ) / 4,
            risk_level: riskLevel,
            factors_analyzed: analysis.data.indicators,
            recommendations: analysis.data.recommendations || [],
            action_required: riskLevel === 'high' || riskLevel === 'critical',
            status: 'pending'
          }]);

        // Actualizar estado de compliance del trabajador
        await (supabase as any)
          .from('erp_hr_contingent_workers')
          .update({
            compliance_status: riskLevel,
            last_compliance_review: new Date().toISOString()
          })
          .eq('id', workerId);

        toast.success('Análisis de cumplimiento completado');
        return analysis.data;
      }

      throw new Error('Respuesta inválida del análisis');
    } catch (err) {
      console.error('[useHRContingentWorkforce] runComplianceCheck error:', err);
      toast.error('Error en análisis de cumplimiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============ FETCH STATS ============
  const fetchStats = useCallback(async (companyId: string) => {
    try {
      // Trabajadores
      const { data: workersData } = await (supabase as any)
        .from('erp_hr_contingent_workers')
        .select('id, worker_type, status, compliance_status, default_rate')
        .eq('company_id', companyId);

      // Contratos
      const { data: contractsData } = await (supabase as any)
        .from('erp_hr_contingent_contracts')
        .select('id, status, end_date')
        .eq('company_id', companyId);

      // Facturas del mes
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: invoicesData } = await (supabase as any)
        .from('erp_hr_contingent_invoices')
        .select('id, total, status')
        .eq('company_id', companyId)
        .gte('invoice_date', startOfMonth);

      // Calcular estadísticas
      const workers = workersData || [];
      const contractsList = contractsData || [];
      const invoicesList = invoicesData || [];

      const byType = workers.reduce((acc: Record<string, number>, w: any) => {
        acc[w.worker_type] = (acc[w.worker_type] || 0) + 1;
        return acc;
      }, {});

      const byStatus = workers.reduce((acc: Record<string, number>, w: any) => {
        acc[w.status] = (acc[w.status] || 0) + 1;
        return acc;
      }, {});

      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = contractsList.filter((c: any) => 
        c.status === 'active' && c.end_date && new Date(c.end_date) <= thirtyDaysFromNow
      ).length;

      const pendingInvoices = invoicesList.filter((i: any) => i.status === 'pending');

      const calculatedStats: ContingentWorkforceStats = {
        total_workers: workers.length,
        active_workers: workers.filter((w: any) => w.status === 'active').length,
        by_type: byType as Record<ContingentWorkerType, number>,
        by_status: byStatus as Record<ContingentWorkerStatus, number>,
        
        total_contracts: contractsList.length,
        active_contracts: contractsList.filter((c: any) => c.status === 'active').length,
        expiring_soon: expiringSoon,
        
        total_spend_mtd: invoicesList.reduce((sum: number, i: any) => 
          i.status === 'paid' ? sum + (i.total || 0) : sum, 0),
        total_spend_ytd: 0, // TODO: Calcular YTD
        pending_invoices: pendingInvoices.length,
        pending_amount: pendingInvoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0),
        
        compliance_issues: workers.filter((w: any) => 
          w.compliance_status === 'high' || w.compliance_status === 'critical'
        ).length,
        high_risk_workers: workers.filter((w: any) => w.compliance_status === 'critical').length,
        
        avg_hourly_rate: workers.length > 0 
          ? workers.reduce((sum: number, w: any) => sum + (w.default_rate || 0), 0) / workers.length 
          : 0,
        utilization_rate: 0 // TODO: Calcular basado en horas
      };

      setStats(calculatedStats);
      return calculatedStats;
    } catch (err) {
      console.error('[useHRContingentWorkforce] fetchStats error:', err);
      return null;
    }
  }, []);

  // ============ AUTO-REFRESH ============
  const startAutoRefresh = useCallback((companyId: string, intervalMs = 120000) => {
    stopAutoRefresh();
    fetchWorkers(companyId);
    fetchStats(companyId);
    autoRefreshInterval.current = setInterval(() => {
      fetchWorkers(companyId);
      fetchStats(companyId);
    }, intervalMs);
  }, [fetchWorkers, fetchStats]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // ============ RETURN ============
  return {
    // Estado
    workers,
    contracts,
    assignments,
    timeEntries,
    invoices,
    complianceChecks,
    stats,
    isLoading,
    error,

    // Workers
    fetchWorkers,
    createWorker,
    updateWorker,

    // Contracts
    fetchContracts,
    createContract,

    // Time & Billing
    submitTimeEntry,
    approveTimeEntries,
    generateInvoice,

    // Compliance
    runComplianceCheck,

    // Stats
    fetchStats,

    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh
  };
}

export default useHRContingentWorkforce;
