/**
 * usePayrollRecalculation - Hook para gestión de recálculos de nómina
 * Integra Edge Function, validaciones IA y flujo de aprobación
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface RecalculationResult {
  id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  original_values: {
    gross?: number;
    net?: number;
    ss_employee?: number;
    ss_employer?: number;
    irpf?: number;
  };
  recalculated_values: {
    gross?: number;
    net?: number;
    ss_employee?: number;
    ss_employer?: number;
    irpf?: number;
  };
  differences: {
    gross?: number;
    net?: number;
    ss_employee?: number;
    ss_employer?: number;
    irpf?: number;
  };
  total_difference: number;
  compliance_issues: ComplianceIssue[];
  ai_validation_status: string;
  legal_validation_status: string;
  hr_approval_status: string;
  status: string;
  risk_level: string;
  created_at: string;
}

export interface ComplianceIssue {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  expected_value?: number;
  actual_value?: number;
  legal_reference?: string;
}

export interface RecalculationContext {
  companyId: string;
  period: string; // Format: "YYYY-MM"
  employeeIds?: string[];
  agreementId?: string;
}

export interface RecalculationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  issues_detected: number;
  total_difference: number;
}

// === HOOK ===
export function usePayrollRecalculation() {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<RecalculationResult[]>([]);
  const [stats, setStats] = useState<RecalculationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH RECALCULATIONS ===
  const fetchRecalculations = useCallback(async (
    companyId: string,
    filters?: {
      period?: string;
      status?: string;
      employeeId?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query URL manually to avoid type issues
      let url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_payroll_recalculations?company_id=eq.${companyId}&order=created_at.desc&limit=100`;
      
      if (filters?.period) {
        url += `&period=eq.${filters.period}`;
      }
      if (filters?.status) {
        url += `&status=eq.${filters.status}`;
      }
      if (filters?.employeeId) {
        url += `&employee_id=eq.${filters.employeeId}`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar recálculos');
      }

      const data = await response.json();

      // Fetch employee names separately
      const employeeIds = [...new Set((data || []).map((r: { employee_id: string }) => r.employee_id))] as string[];
      let employeeMap: Record<string, string> = {};
      
      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name')
          .in('id', employeeIds);
        
        if (employees) {
          employeeMap = employees.reduce((acc, e) => {
            acc[e.id] = `${e.first_name} ${e.last_name}`;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const mappedResults: RecalculationResult[] = (data || []).map((r: Record<string, unknown>) => {
        const originalValues = (r.original_values || {}) as RecalculationResult['original_values'];
        const recalculatedValues = (r.recalculated_values || {}) as RecalculationResult['recalculated_values'];
        const differences = (r.differences || {}) as RecalculationResult['differences'];
        const issues = Array.isArray(r.compliance_issues) ? r.compliance_issues : [];
        
        return {
          id: r.id as string,
          employee_id: r.employee_id as string,
          employee_name: employeeMap[r.employee_id as string] || 'Empleado desconocido',
          period: (r.period as string) || '',
          original_values: originalValues,
          recalculated_values: recalculatedValues,
          differences: differences,
          total_difference: (r.total_difference as number) || 0,
          compliance_issues: issues as ComplianceIssue[],
          ai_validation_status: (r.ai_validation_status as string) || 'pending',
          legal_validation_status: (r.legal_validation_status as string) || 'pending',
          hr_approval_status: (r.hr_approval_status as string) || 'pending',
          status: (r.status as string) || 'pending',
          risk_level: (r.risk_level as string) || 'low',
          created_at: r.created_at as string
        };
      });

      setResults(mappedResults);
      
      // Calculate stats
      const newStats: RecalculationStats = {
        total: mappedResults.length,
        pending: mappedResults.filter(r => r.status === 'pending' || r.status === 'ai_validated' || r.status === 'legal_validated').length,
        approved: mappedResults.filter(r => r.status === 'approved').length,
        rejected: mappedResults.filter(r => r.status === 'rejected').length,
        issues_detected: mappedResults.filter(r => r.compliance_issues.length > 0).length,
        total_difference: mappedResults.reduce((sum, r) => sum + r.total_difference, 0)
      };
      setStats(newStats);

      return mappedResults;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar recálculos';
      setError(message);
      console.error('[usePayrollRecalculation] fetchRecalculations error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === TRIGGER BATCH RECALCULATION ===
  const triggerBatchRecalculation = useCallback(async (context: RecalculationContext) => {
    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: context.employeeIds?.length || 0 });

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-payroll-recalculation',
        {
          body: {
            action: 'recalculate_batch',
            company_id: context.companyId,
            period: context.period,
            employee_ids: context.employeeIds,
            agreement_id: context.agreementId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success(`Recálculo completado: ${data.processed || 0} nóminas procesadas`);
        
        // Refresh results
        await fetchRecalculations(context.companyId, {
          period: context.period
        });
        
        return data;
      }

      throw new Error(data?.error || 'Error en el recálculo');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar recálculo';
      setError(message);
      toast.error(message);
      console.error('[usePayrollRecalculation] triggerBatchRecalculation error:', err);
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [fetchRecalculations]);

  // === REQUEST AI VALIDATION ===
  const requestAIValidation = useCallback(async (recalculationId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-payroll-recalculation',
        {
          body: {
            action: 'request_ai_validation',
            recalculation_id: recalculationId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Validación IA completada');
        
        // Update local state
        setResults(prev => prev.map(r => 
          r.id === recalculationId 
            ? { ...r, ai_validation_status: 'validated', status: 'ai_validated' }
            : r
        ));
        
        return data.ai_validation;
      }

      return null;
    } catch (err) {
      console.error('[usePayrollRecalculation] requestAIValidation error:', err);
      toast.error('Error en la validación IA');
      return null;
    }
  }, []);

  // === REQUEST LEGAL VALIDATION ===
  const requestLegalValidation = useCallback(async (recalculationId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-payroll-recalculation',
        {
          body: {
            action: 'request_legal_validation',
            recalculation_id: recalculationId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Validación jurídica completada');
        
        // Update local state
        setResults(prev => prev.map(r => 
          r.id === recalculationId 
            ? { ...r, legal_validation_status: 'validated', status: 'legal_validated' }
            : r
        ));
        
        return data.legal_validation;
      }

      return null;
    } catch (err) {
      console.error('[usePayrollRecalculation] requestLegalValidation error:', err);
      toast.error('Error en la validación jurídica');
      return null;
    }
  }, []);

  // === APPROVE/REJECT RECALCULATION ===
  const approveRecalculation = useCallback(async (
    recalculationId: string,
    approved: boolean,
    notes?: string
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-payroll-recalculation',
        {
          body: {
            action: approved ? 'approve_recalculation' : 'reject_recalculation',
            recalculation_id: recalculationId,
            notes
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const newStatus = approved ? 'approved' : 'rejected';
        toast.success(approved ? 'Recálculo aprobado' : 'Recálculo rechazado');
        
        // Update local state
        setResults(prev => prev.map(r => 
          r.id === recalculationId 
            ? { ...r, status: newStatus, hr_approval_status: approved ? 'approved' : 'rejected' }
            : r
        ));
        
        return true;
      }

      return false;
    } catch (err) {
      console.error('[usePayrollRecalculation] approveRecalculation error:', err);
      toast.error('Error al procesar la decisión');
      return false;
    }
  }, []);

  // === DETECT COMPLIANCE ISSUES ===
  const detectComplianceIssues = useCallback(async (
    companyId: string,
    period: string
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-payroll-recalculation',
        {
          body: {
            action: 'detect_issues',
            company_id: companyId,
            period
          }
        }
      );

      if (fnError) throw fnError;

      return data?.issues || [];
    } catch (err) {
      console.error('[usePayrollRecalculation] detectComplianceIssues error:', err);
      return [];
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((
    companyId: string,
    filters?: { period?: string },
    intervalMs = 60000
  ) => {
    stopAutoRefresh();
    fetchRecalculations(companyId, filters);
    autoRefreshInterval.current = setInterval(() => {
      fetchRecalculations(companyId, filters);
    }, intervalMs);
  }, [fetchRecalculations]);

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

  // === RETURN ===
  return {
    // State
    isLoading,
    isProcessing,
    results,
    stats,
    error,
    progress,
    // Actions
    fetchRecalculations,
    triggerBatchRecalculation,
    requestAIValidation,
    requestLegalValidation,
    approveRecalculation,
    detectComplianceIssues,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default usePayrollRecalculation;
