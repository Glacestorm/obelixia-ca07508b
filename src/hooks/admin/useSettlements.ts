/**
 * useSettlements - Hook para gestión de finiquitos con validación multinivel
 * Sistema completo: Persistencia + IA + Legal + RRHH
 * Incluye validación de convenios colectivos y obligaciones sindicales
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePayrollComplianceValidation } from './usePayrollComplianceValidation';

// === INTERFACES ===
export interface Settlement {
  id: string;
  company_id: string;
  employee_id: string;
  employee_snapshot: Record<string, unknown>;
  hire_date: string;
  termination_date: string;
  last_work_day: string | null;
  termination_type: string;
  termination_reason: string | null;
  base_salary: number;
  daily_salary: number | null;
  years_worked: number | null;
  pending_vacation_days: number;
  vacation_amount: number;
  extra_pays_proportional: number;
  salary_current_month: number;
  other_concepts: number;
  other_concepts_detail: Array<{ concept: string; amount: number }>;
  indemnization_type: string | null;
  indemnization_days_per_year: number | null;
  indemnization_total_days: number;
  indemnization_gross: number;
  indemnization_exempt: number;
  indemnization_taxable: number;
  gross_total: number;
  irpf_retention: number;
  irpf_percentage: number;
  ss_retention: number;
  net_total: number;
  collective_agreement_id: string | null;
  collective_agreement_name: string | null;
  legal_references: Array<{ ref: string; description: string }>;
  status: SettlementStatus;
  ai_validation_status: ValidationStatus | null;
  ai_validation_at: string | null;
  ai_validation_result: Record<string, unknown>;
  ai_confidence_score: number | null;
  ai_warnings: Array<{ code: string; message: string }>;
  ai_explanation: string | null;
  legal_validation_status: ValidationStatus | null;
  legal_validation_at: string | null;
  legal_validated_by: string | null;
  legal_validation_notes: string | null;
  legal_compliance_checks: Array<{ check: string; passed: boolean; notes?: string }>;
  hr_approval_status: 'pending' | 'approved' | 'rejected' | null;
  hr_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approval_notes: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  document_url: string | null;
  document_generated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: {
    first_name: string;
    last_name: string;
  };
}

export type SettlementStatus = 
  | 'draft' 
  | 'calculated' 
  | 'pending_ai_validation' 
  | 'pending_legal_validation'
  | 'pending_hr_approval' 
  | 'approved' 
  | 'rejected' 
  | 'paid' 
  | 'cancelled';

export type ValidationStatus = 'pending' | 'approved' | 'warning' | 'rejected';

export interface SettlementMetrics {
  total_settlements: number;
  pending_validation: number;
  approved: number;
  rejected: number;
  paid: number;
  draft: number;
  total_gross: number;
  total_net: number;
  total_indemnization: number;
  avg_processing_days: number;
  by_termination_type: Record<string, number>;
}

export interface CreateSettlementInput {
  employee_id: string;
  termination_date: string;
  termination_type: string;
  termination_reason?: string;
  last_work_day?: string;
  pending_vacation_days?: number;
}

// === HOOK ===
export function useSettlements(companyId: string) {
  const { user } = useAuth();
  const { validateSettlement: runComplianceValidation } = usePayrollComplianceValidation();
  const [isLoading, setIsLoading] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [metrics, setMetrics] = useState<SettlementMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [complianceResult, setComplianceResult] = useState<Record<string, unknown> | null>(null);
  
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH SETTLEMENTS ===
  const loadSettlements = useCallback(async (statusFilter?: SettlementStatus[]) => {
    if (!companyId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('erp_hr_settlements')
        .select(`
          *,
          employee:erp_hr_employees!erp_hr_settlements_employee_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Parse JSONB fields
      const parsed = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        employee_snapshot: typeof row.employee_snapshot === 'string' 
          ? JSON.parse(row.employee_snapshot as string) 
          : row.employee_snapshot || {},
        other_concepts_detail: typeof row.other_concepts_detail === 'string'
          ? JSON.parse(row.other_concepts_detail as string)
          : row.other_concepts_detail || [],
        legal_references: typeof row.legal_references === 'string'
          ? JSON.parse(row.legal_references as string)
          : row.legal_references || [],
        ai_validation_result: typeof row.ai_validation_result === 'string'
          ? JSON.parse(row.ai_validation_result as string)
          : row.ai_validation_result || {},
        ai_warnings: typeof row.ai_warnings === 'string'
          ? JSON.parse(row.ai_warnings as string)
          : row.ai_warnings || [],
        legal_compliance_checks: typeof row.legal_compliance_checks === 'string'
          ? JSON.parse(row.legal_compliance_checks as string)
          : row.legal_compliance_checks || [],
      })) as Settlement[];

      setSettlements(parsed);
      setLastRefresh(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar finiquitos';
      setError(message);
      console.error('[useSettlements] loadSettlements error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === FETCH METRICS ===
  const loadMetrics = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error: fnError } = await supabase.rpc(
        'get_settlement_compliance_metrics',
        { p_company_id: companyId }
      );

      if (fnError) throw fnError;

      if (data) {
        setMetrics(data as unknown as SettlementMetrics);
      }
    } catch (err) {
      console.error('[useSettlements] loadMetrics error:', err);
    }
  }, [companyId]);

  // === CREATE SETTLEMENT ===
  const createSettlement = useCallback(async (input: CreateSettlementInput): Promise<Settlement | null> => {
    if (!user?.id || !companyId) {
      toast.error('Sesión no válida');
      return null;
    }

    setIsLoading(true);
    try {
      // Fetch employee data for snapshot
      const { data: empData, error: empError } = await supabase
        .from('erp_hr_employees')
        .select('*, erp_hr_contracts!erp_hr_contracts_employee_id_fkey(base_salary, contract_type)')
        .eq('id', input.employee_id)
        .single();

      if (empError) throw empError;

      const activeContract = empData?.erp_hr_contracts?.find((c: Record<string, unknown>) => c.base_salary);
      const baseSalary = activeContract?.base_salary || empData?.base_salary || 0;
      const hireDate = empData?.hire_date || new Date().toISOString().split('T')[0];

      const { data, error: insertError } = await supabase
        .from('erp_hr_settlements')
        .insert([{
          company_id: companyId,
          employee_id: input.employee_id,
          employee_snapshot: {
            first_name: empData?.first_name,
            last_name: empData?.last_name,
            category: empData?.category,
            department_id: empData?.department_id,
            email: empData?.email,
          },
          hire_date: hireDate,
          termination_date: input.termination_date,
          last_work_day: input.last_work_day || input.termination_date,
          termination_type: input.termination_type,
          termination_reason: input.termination_reason,
          base_salary: baseSalary,
          pending_vacation_days: input.pending_vacation_days || 0,
          status: 'draft',
          created_by: user.id,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Finiquito creado en borrador');
      await loadSettlements();
      return data as Settlement;
    } catch (err) {
      console.error('[useSettlements] createSettlement error:', err);
      toast.error('Error al crear finiquito');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user?.id, loadSettlements]);

  // === CALCULATE WITH AI + COMPLIANCE VALIDATION ===
  const calculateWithAI = useCallback(async (settlementId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const settlement = settlements.find(s => s.id === settlementId);
      if (!settlement) throw new Error('Finiquito no encontrado');

      // 1. Ejecutar validación de compliance (convenios + sindicatos)
      let complianceData;
      try {
        complianceData = await runComplianceValidation(
          settlement.employee_id,
          companyId,
          {
            terminationType: settlement.termination_type,
            terminationDate: settlement.termination_date,
            baseSalary: settlement.base_salary,
            yearsWorked: settlement.years_worked || 0,
            indemnizationDays: settlement.indemnization_days_per_year || 0,
            convenioId: settlement.collective_agreement_id || undefined,
          }
        );
        setComplianceResult(complianceData as unknown as Record<string, unknown>);
      } catch (compError) {
        console.warn('[useSettlements] Compliance validation failed, continuing with AI calc:', compError);
      }

      // 2. Ejecutar cálculo con IA
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'calculate_severance',
          company_id: companyId,
          employee_id: settlement.employee_id,
          severance_data: {
            start_date: settlement.hire_date,
            end_date: settlement.termination_date,
            base_salary: settlement.base_salary,
            termination_type: settlement.termination_type,
            pending_vacation_days: settlement.pending_vacation_days,
            pending_extra_pays: 2,
            // Incluir datos de compliance para que IA tenga contexto
            compliance_checks: complianceData?.allChecks || [],
            convenio_name: complianceData?.convenio?.convenioName,
          }
        }
      });

      if (fnError) throw fnError;

      const calc = data?.severance_calculation;
      if (!calc) throw new Error('Sin resultado del cálculo');

      // 3. Preparar warnings de compliance
      const complianceWarnings = (complianceData?.criticalIssues || []).map((issue: { code: string; title: string }) => ({
        code: issue.code,
        message: issue.title,
      }));

      // 4. Preparar referencias legales combinadas
      const legalRefs = [
        ...(calc.indemnization?.legal_reference 
          ? [{ ref: calc.indemnization.legal_reference, description: 'Cálculo indemnización' }] 
          : []),
        ...(complianceData?.legalReferences || []),
      ];

      // 5. Preparar checks de compliance legal
      const legalComplianceChecks = (complianceData?.allChecks || []).map((check: { id: string; passed: boolean; title: string }) => ({
        check: check.id,
        passed: check.passed,
        notes: check.title,
      }));

      // 6. Update settlement with calculated values + compliance data
      const { error: updateError } = await supabase
        .from('erp_hr_settlements')
        .update({
          daily_salary: calc.finiquito?.daily_salary || (settlement.base_salary * 14 / 365),
          years_worked: calc.work_period?.total_years,
          vacation_amount: calc.finiquito?.vacation_amount || 0,
          extra_pays_proportional: calc.finiquito?.extra_pays_amount || 0,
          salary_current_month: calc.finiquito?.salary_current_month || 0,
          indemnization_type: calc.indemnization?.type,
          indemnization_days_per_year: calc.indemnization?.days_per_year,
          indemnization_total_days: calc.indemnization?.total_days || 0,
          indemnization_gross: calc.indemnization?.gross_amount || 0,
          indemnization_exempt: calc.indemnization?.tax_exempt || 0,
          indemnization_taxable: calc.indemnization?.taxable || 0,
          gross_total: calc.grand_total?.gross || calc.finiquito?.gross_total || 0,
          irpf_retention: calc.finiquito?.irpf_retention || 0,
          irpf_percentage: 15,
          net_total: calc.grand_total?.net || calc.finiquito?.net_total || 0,
          legal_references: legalRefs,
          ai_validation_status: complianceData?.isCompliant ? 'approved' : 'warning',
          ai_validation_at: new Date().toISOString(),
          ai_validation_result: {
            ...calc,
            compliance: {
              score: complianceData?.complianceScore || 0,
              isCompliant: complianceData?.isCompliant || false,
              convenioValid: complianceData?.convenio?.hasConvenio || false,
              sindicatoNotified: complianceData?.sindicato?.notificationSent || true,
            }
          },
          ai_confidence_score: complianceData?.isCompliant ? (calc.confidence || 85) : Math.min(calc.confidence || 85, 60),
          ai_warnings: complianceWarnings,
          ai_explanation: complianceData?.summary || calc.explanation,
          legal_compliance_checks: legalComplianceChecks,
          collective_agreement_name: complianceData?.convenio?.convenioName,
          status: 'pending_legal_validation',
        })
        .eq('id', settlementId);

      if (updateError) throw updateError;

      // 7. Mostrar resultado apropiado
      if (complianceData?.isCompliant) {
        toast.success('Cálculo completado - Cumple convenio colectivo');
      } else if (complianceData?.criticalIssues?.length) {
        toast.warning(`Cálculo completado - ${complianceData.criticalIssues.length} incumplimiento(s) detectados`);
      } else {
        toast.success('Cálculo completado - Pendiente validación legal');
      }

      await loadSettlements();
      return true;
    } catch (err) {
      console.error('[useSettlements] calculateWithAI error:', err);
      toast.error('Error en el cálculo');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [settlements, companyId, loadSettlements, runComplianceValidation]);

  // === LEGAL VALIDATION ===
  const submitLegalValidation = useCallback(async (
    settlementId: string,
    approved: boolean,
    notes?: string,
    checks?: Array<{ check: string; passed: boolean; notes?: string }>
  ): Promise<boolean> => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('erp_hr_settlements')
        .update({
          legal_validation_status: approved ? 'approved' : 'rejected',
          legal_validation_at: new Date().toISOString(),
          legal_validated_by: user.id,
          legal_validation_notes: notes,
          legal_compliance_checks: checks || [],
          status: approved ? 'pending_hr_approval' : 'rejected',
        })
        .eq('id', settlementId);

      if (updateError) throw updateError;

      toast.success(approved ? 'Validación legal aprobada' : 'Finiquito rechazado');
      await loadSettlements();
      return true;
    } catch (err) {
      console.error('[useSettlements] submitLegalValidation error:', err);
      toast.error('Error en validación legal');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadSettlements]);

  // === HR APPROVAL ===
  const submitHRApproval = useCallback(async (
    settlementId: string,
    approved: boolean,
    notes?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('erp_hr_settlements')
        .update({
          hr_approval_status: approved ? 'approved' : 'rejected',
          hr_approved_at: new Date().toISOString(),
          hr_approved_by: user.id,
          hr_approval_notes: notes,
          status: approved ? 'approved' : 'rejected',
        })
        .eq('id', settlementId);

      if (updateError) throw updateError;

      toast.success(approved ? 'Finiquito aprobado' : 'Finiquito rechazado');
      await loadSettlements();
      await loadMetrics();
      return true;
    } catch (err) {
      console.error('[useSettlements] submitHRApproval error:', err);
      toast.error('Error en aprobación RRHH');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadSettlements, loadMetrics]);

  // === MARK AS PAID ===
  const markAsPaid = useCallback(async (
    settlementId: string,
    paymentDate: string,
    paymentMethod: string,
    paymentReference?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('erp_hr_settlements')
        .update({
          status: 'paid',
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
        })
        .eq('id', settlementId);

      if (updateError) throw updateError;

      toast.success('Finiquito marcado como pagado');
      await loadSettlements();
      await loadMetrics();
      return true;
    } catch (err) {
      console.error('[useSettlements] markAsPaid error:', err);
      toast.error('Error al marcar como pagado');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettlements, loadMetrics]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    stopAutoRefresh();
    loadSettlements();
    loadMetrics();
    autoRefreshInterval.current = setInterval(() => {
      loadSettlements();
      loadMetrics();
    }, intervalMs);
  }, [loadSettlements, loadMetrics]);

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

  // === INITIAL LOAD ===
  useEffect(() => {
    if (companyId) {
      loadSettlements();
      loadMetrics();
    }
  }, [companyId, loadSettlements, loadMetrics]);

  return {
    // Estado
    isLoading,
    settlements,
    metrics,
    error,
    lastRefresh,
    complianceResult,
    // Acciones
    loadSettlements,
    loadMetrics,
    createSettlement,
    calculateWithAI,
    submitLegalValidation,
    submitHRApproval,
    markAsPaid,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useSettlements;
