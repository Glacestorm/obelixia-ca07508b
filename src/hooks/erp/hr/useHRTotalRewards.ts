/**
 * Hook: useHRTotalRewards
 * Fase 7: Total Rewards - Compensation, Benefits & Recognition Management
 * Enterprise HR Module
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// ============================================
// INTERFACES
// ============================================

export interface SalaryBand {
  id: string;
  company_id: string;
  band_code: string;
  band_name: string;
  job_family?: string;
  level?: string;
  min_salary: number;
  mid_salary: number;
  max_salary: number;
  currency: string;
  country_code: string;
  effective_from: string;
  effective_to?: string;
  market_percentile: number;
  benchmark_source?: string;
  last_benchmarked_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Compensation {
  id: string;
  company_id: string;
  employee_id: string;
  salary_band_id?: string;
  base_salary: number;
  currency: string;
  pay_frequency: string;
  effective_from: string;
  effective_to?: string;
  bonus_target_percent: number;
  bonus_actual?: number;
  commission_plan?: string;
  commission_rate?: number;
  equity_type?: string;
  equity_grant_value?: number;
  equity_vesting_schedule?: string;
  equity_vested_value?: number;
  compa_ratio?: number;
  range_penetration?: number;
  change_type?: string;
  change_reason?: string;
  change_percent?: number;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BenefitsPlan {
  id: string;
  company_id: string;
  plan_code: string;
  plan_name: string;
  plan_type: string;
  provider_name?: string;
  provider_contact?: string;
  coverage_type?: string;
  employer_contribution?: number;
  employer_contribution_percent?: number;
  employee_contribution?: number;
  annual_cost?: number;
  eligibility_criteria?: Record<string, unknown>;
  waiting_period_days: number;
  enrollment_period?: string;
  effective_from: string;
  effective_to?: string;
  is_taxable: boolean;
  tax_treatment?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BenefitsEnrollment {
  id: string;
  company_id?: string;
  employee_id: string;
  plan_id?: string;
  enrollment_status?: string;
  coverage_level?: string;
  enrolled_at?: string;
  effective_date: string;
  termination_date?: string;
  employee_contribution?: number;
  employer_contribution?: number;
  contribution_frequency?: string;
  dependents?: Json;
  beneficiaries?: Json;
  election_amount?: number;
  waiver_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Recognition {
  id: string;
  company_id: string;
  recipient_id: string;
  nominator_id?: string;
  approver_id?: string;
  recognition_type: string;
  category?: string;
  title: string;
  description?: string;
  award_date: string;
  points_awarded: number;
  monetary_value?: number;
  currency: string;
  gift_type?: string;
  gift_details?: string;
  is_public: boolean;
  shared_to_feed: boolean;
  celebration_type?: string;
  status: string;
  approved_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecognitionProgram {
  id: string;
  company_id: string;
  program_name: string;
  program_type: string;
  annual_budget?: number;
  budget_per_manager?: number;
  budget_per_employee?: number;
  currency: string;
  points_per_currency?: number;
  min_award_value?: number;
  max_award_value?: number;
  requires_approval: boolean;
  approval_threshold?: number;
  recognition_categories?: string[];
  company_values?: string[];
  eligible_nominators: string;
  eligible_recipients: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardsStatement {
  id: string;
  company_id?: string;
  employee_id: string;
  statement_year?: number;
  fiscal_year?: number;
  statement_period?: string;
  generated_at?: string;
  base_salary?: number;
  variable_pay?: number;
  bonus_paid?: number;
  commission_earned?: number;
  equity_granted_value?: number;
  equity_vested_value?: number;
  employer_benefits_cost?: number;
  health_insurance_value?: number;
  retirement_contribution?: number;
  other_benefits_value?: number;
  recognition_awards_value?: number;
  recognition_count?: number;
  perks_value?: number;
  training_investment?: number;
  total_cash_compensation?: number;
  total_benefits_value?: number;
  total_rewards_value?: number;
  document_url?: string;
  pdf_url?: string;
  viewed_at?: string;
  acknowledged_at?: string;
  currency?: string;
  created_at?: string;
  breakdown?: Json;
  comparisons?: Json;
}

export interface CompensationAnalytics {
  id: string;
  company_id?: string;
  analysis_date: string;
  analysis_type: string;
  total_headcount?: number;
  total_payroll?: number;
  avg_salary?: number;
  median_salary?: number;
  salary_spread?: number;
  gender_pay_gap?: number;
  adjusted_pay_gap?: number;
  equity_score?: number;
  market_position_index?: number;
  below_market_count?: number;
  above_market_count?: number;
  at_market_count?: number;
  high_performers_below_market?: number;
  flight_risk_compensation?: number;
  compression_issues?: number;
  ai_insights?: Json;
  recommendations?: Json;
  forecast_next_year?: Json;
  currency?: string;
  created_at?: string;
}

export interface TotalRewardsContext {
  companyId: string;
  employeeId?: string;
  analysisType?: string;
}

// ============================================
// HOOK
// ============================================

export function useHRTotalRewards() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [salaryBands, setSalaryBands] = useState<SalaryBand[]>([]);
  const [compensations, setCompensations] = useState<Compensation[]>([]);
  const [benefitsPlans, setBenefitsPlans] = useState<BenefitsPlan[]>([]);
  const [enrollments, setEnrollments] = useState<BenefitsEnrollment[]>([]);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [programs, setPrograms] = useState<RecognitionProgram[]>([]);
  const [statements, setStatements] = useState<RewardsStatement[]>([]);
  const [analytics, setAnalytics] = useState<CompensationAnalytics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchSalaryBands = useCallback(async (companyId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_salary_bands')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('band_code');

      if (fetchError) throw fetchError;
      setSalaryBands((data || []) as SalaryBand[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchSalaryBands error:', err);
      return null;
    }
  }, []);

  const fetchCompensations = useCallback(async (companyId: string, employeeId?: string) => {
    try {
      let query = supabase
        .from('erp_hr_compensation')
        .select('*')
        .eq('company_id', companyId)
        .order('effective_from', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error: fetchError } = await query.limit(100);
      if (fetchError) throw fetchError;
      setCompensations((data || []) as Compensation[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchCompensations error:', err);
      return null;
    }
  }, []);

  const fetchBenefitsPlans = useCallback(async (companyId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_benefits_plans')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('plan_type');

      if (fetchError) throw fetchError;
      setBenefitsPlans((data || []) as BenefitsPlan[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchBenefitsPlans error:', err);
      return null;
    }
  }, []);

  const fetchEnrollments = useCallback(async (companyId: string, employeeId?: string) => {
    try {
      let query = supabase
        .from('erp_hr_benefits_enrollments')
        .select('*')
        .eq('company_id', companyId)
        .order('enrolled_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error: fetchError } = await query.limit(100);
      if (fetchError) throw fetchError;
      setEnrollments((data || []) as BenefitsEnrollment[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchEnrollments error:', err);
      return null;
    }
  }, []);

  const fetchRecognitions = useCallback(async (companyId: string, recipientId?: string) => {
    try {
      let query = supabase
        .from('erp_hr_recognition')
        .select('*')
        .eq('company_id', companyId)
        .order('award_date', { ascending: false });

      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      }

      const { data, error: fetchError } = await query.limit(100);
      if (fetchError) throw fetchError;
      setRecognitions((data || []) as Recognition[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchRecognitions error:', err);
      return null;
    }
  }, []);

  const fetchPrograms = useCallback(async (companyId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_recognition_programs')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('program_name');

      if (fetchError) throw fetchError;
      setPrograms((data || []) as RecognitionProgram[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchPrograms error:', err);
      return null;
    }
  }, []);

  const fetchStatements = useCallback(async (companyId: string, employeeId?: string) => {
    try {
      // Using explicit any to break TS2589 infinite type recursion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const baseQuery = client
        .from('erp_hr_rewards_statements')
        .select('*')
        .eq('company_id', companyId)
        .order('statement_year', { ascending: false });

      const query = employeeId 
        ? baseQuery.eq('employee_id', employeeId) 
        : baseQuery;

      const { data, error: fetchError } = await query.limit(50);
      if (fetchError) throw fetchError;
      setStatements((data || []) as RewardsStatement[]);
      return data as RewardsStatement[];
    } catch (err) {
      console.error('[useHRTotalRewards] fetchStatements error:', err);
      return null;
    }
  }, []);

  const fetchAnalytics = useCallback(async (companyId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_hr_compensation_analytics')
        .select('*')
        .eq('company_id', companyId)
        .order('analysis_date', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setAnalytics((data || []) as CompensationAnalytics[]);
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] fetchAnalytics error:', err);
      return null;
    }
  }, []);

  // ============================================
  // MAIN FETCH
  // ============================================

  const fetchAll = useCallback(async (context: TotalRewardsContext) => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchSalaryBands(context.companyId),
        fetchCompensations(context.companyId, context.employeeId),
        fetchBenefitsPlans(context.companyId),
        fetchEnrollments(context.companyId, context.employeeId),
        fetchRecognitions(context.companyId, context.employeeId),
        fetchPrograms(context.companyId),
        fetchStatements(context.companyId, context.employeeId),
        fetchAnalytics(context.companyId)
      ]);
      setLastRefresh(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useHRTotalRewards] fetchAll error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSalaryBands, fetchCompensations, fetchBenefitsPlans, fetchEnrollments, fetchRecognitions, fetchPrograms, fetchStatements, fetchAnalytics]);

  // ============================================
  // AI FUNCTIONS
  // ============================================

  const analyzeCompensation = useCallback(async (
    context: TotalRewardsContext,
    analysisType: 'benchmark' | 'equity' | 'forecast' | 'optimization'
  ) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-total-rewards',
        {
          body: {
            action: 'analyze_compensation',
            company_id: context.companyId,
            employee_id: context.employeeId,
            context,
            params: { analysisType }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Análisis de compensación completado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRTotalRewards] analyzeCompensation error:', err);
      toast.error('Error al analizar compensación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateRewardsStatement = useCallback(async (
    context: TotalRewardsContext,
    year: number
  ) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-total-rewards',
        {
          body: {
            action: 'generate_statement',
            company_id: context.companyId,
            employee_id: context.employeeId,
            context,
            params: { year }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Total Rewards Statement generado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRTotalRewards] generateRewardsStatement error:', err);
      toast.error('Error al generar statement');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const benchmarkSalary = useCallback(async (
    context: TotalRewardsContext,
    params: {
      jobFamily: string;
      level: string;
      location: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-total-rewards',
        {
          body: {
            action: 'benchmark_salary',
            company_id: context.companyId,
            employee_id: context.employeeId,
            context,
            params
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Benchmarking salarial completado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRTotalRewards] benchmarkSalary error:', err);
      toast.error('Error en benchmarking');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const optimizeBenefits = useCallback(async (
    context: TotalRewardsContext,
    employeeProfile: {
      age: number;
      familyStatus: string;
      preferences: string[];
    }
  ) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'erp-hr-total-rewards',
        {
          body: {
            action: 'optimize_benefits',
            company_id: context.companyId,
            employee_id: context.employeeId,
            context,
            params: { employeeProfile }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Optimización de beneficios completada');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRTotalRewards] optimizeBenefits error:', err);
      toast.error('Error al optimizar beneficios');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const createRecognition = useCallback(async (recognition: Partial<Recognition> & { recipient_id: string; recognition_type: string; title: string }) => {
    try {
      const { data, error: insertError } = await supabase
        .from('erp_hr_recognition')
        .insert([recognition])
        .select()
        .single();

      if (insertError) throw insertError;

      setRecognitions(prev => [data as Recognition, ...prev]);
      toast.success('Reconocimiento creado');
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] createRecognition error:', err);
      toast.error('Error al crear reconocimiento');
      return null;
    }
  }, []);

  const createSalaryBand = useCallback(async (band: Partial<SalaryBand> & { band_code: string; band_name: string; min_salary: number; mid_salary: number; max_salary: number }) => {
    try {
      const { data, error: insertError } = await supabase
        .from('erp_hr_salary_bands')
        .insert([band])
        .select()
        .single();

      if (insertError) throw insertError;

      setSalaryBands(prev => [...prev, data as SalaryBand]);
      toast.success('Banda salarial creada');
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] createSalaryBand error:', err);
      toast.error('Error al crear banda salarial');
      return null;
    }
  }, []);

  const updateCompensation = useCallback(async (id: string, updates: Partial<Compensation>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('erp_hr_compensation')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setCompensations(prev => prev.map(c => c.id === id ? data as Compensation : c));
      toast.success('Compensación actualizada');
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] updateCompensation error:', err);
      toast.error('Error al actualizar compensación');
      return null;
    }
  }, []);

  const enrollInBenefit = useCallback(async (enrollment: Partial<BenefitsEnrollment> & { employee_id: string; effective_date: string }) => {
    try {
      const { data, error: insertError } = await supabase
        .from('erp_hr_benefits_enrollments')
        .insert([enrollment])
        .select()
        .single();

      if (insertError) throw insertError;

      setEnrollments(prev => [data as BenefitsEnrollment, ...prev]);
      toast.success('Inscripción en beneficio completada');
      return data;
    } catch (err) {
      console.error('[useHRTotalRewards] enrollInBenefit error:', err);
      toast.error('Error al inscribirse en beneficio');
      return null;
    }
  }, []);

  // ============================================
  // AUTO-REFRESH
  // ============================================

  const startAutoRefresh = useCallback((context: TotalRewardsContext, intervalMs = 120000) => {
    stopAutoRefresh();
    fetchAll(context);
    autoRefreshInterval.current = setInterval(() => {
      fetchAll(context);
    }, intervalMs);
  }, [fetchAll]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalBenefitsCost = benefitsPlans.reduce((sum, plan) => 
    sum + (plan.annual_cost || 0), 0);

  const totalRecognitionValue = recognitions.reduce((sum, rec) => 
    sum + (rec.monetary_value || 0), 0);

  const averageSalary = compensations.length > 0
    ? compensations.reduce((sum, c) => sum + c.base_salary, 0) / compensations.length
    : 0;

  // ============================================
  // RETURN
  // ============================================

  return {
    // Estado
    isLoading,
    error,
    lastRefresh,
    
    // Data
    salaryBands,
    compensations,
    benefitsPlans,
    enrollments,
    recognitions,
    programs,
    statements,
    analytics,
    
    // Computed
    totalBenefitsCost,
    totalRecognitionValue,
    averageSalary,
    
    // Fetch
    fetchAll,
    fetchSalaryBands,
    fetchCompensations,
    fetchBenefitsPlans,
    fetchEnrollments,
    fetchRecognitions,
    fetchPrograms,
    fetchStatements,
    fetchAnalytics,
    
    // AI Functions
    analyzeCompensation,
    generateRewardsStatement,
    benchmarkSalary,
    optimizeBenefits,
    
    // CRUD
    createRecognition,
    createSalaryBand,
    updateCompensation,
    enrollInBenefit,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useHRTotalRewards;
