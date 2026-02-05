/**
 * useTotalRewards - Hook para gestión de Total Rewards Statement
 * Fase 4: Compensación total y visualización para empleados
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// === TIPOS ===

export interface CompensationComponent {
  id: string;
  company_id: string | null;
  name: string;
  category: 'base_salary' | 'variable' | 'benefits' | 'equity' | 'perks' | 'development';
  description: string | null;
  is_taxable: boolean;
  is_cash_equivalent: boolean;
  calculation_type: 'fixed' | 'percentage' | 'formula';
  calculation_formula: string | null;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCompensation {
  id: string;
  employee_id: string;
  component_id: string;
  fiscal_year: number;
  amount: number;
  currency: string;
  frequency: 'annual' | 'monthly' | 'one_time';
  effective_date: string | null;
  end_date: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  component?: CompensationComponent;
}

export interface RewardsStatement {
  id: string;
  employee_id: string;
  fiscal_year: number;
  statement_date: string;
  status: 'draft' | 'generated' | 'sent' | 'viewed';
  total_compensation: number | null;
  total_cash: number | null;
  total_benefits_value: number | null;
  total_equity_value: number | null;
  currency: string;
  breakdown: CategoryBreakdown;
  comparisons: MarketComparison;
  pdf_url: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryBreakdown {
  base_salary?: { total: number; items: BreakdownItem[] };
  variable?: { total: number; items: BreakdownItem[] };
  benefits?: { total: number; items: BreakdownItem[] };
  equity?: { total: number; items: BreakdownItem[] };
  perks?: { total: number; items: BreakdownItem[] };
  development?: { total: number; items: BreakdownItem[] };
}

export interface BreakdownItem {
  name: string;
  amount: number;
  percentage: number;
  icon?: string;
  color?: string;
}

export interface MarketComparison {
  percentile?: number;
  marketMedian?: number;
  difference?: number;
  differencePercent?: number;
}

export interface MarketBenchmark {
  id: string;
  company_id: string | null;
  job_level: string | null;
  job_family: string | null;
  location: string | null;
  percentile_25: number | null;
  percentile_50: number | null;
  percentile_75: number | null;
  percentile_90: number | null;
  currency: string;
  source: string | null;
  survey_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BenefitValuation {
  id: string;
  company_id: string | null;
  benefit_type: string;
  benefit_name: string;
  annual_company_cost: number | null;
  employee_perceived_value: number | null;
  market_value: number | null;
  description: string | null;
  coverage_details: Record<string, unknown> | null;
  is_active: boolean;
  effective_date: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TotalRewardsSummary {
  totalCompensation: number;
  cashCompensation: number;
  benefitsValue: number;
  equityValue: number;
  perksValue: number;
  byCategory: CategoryBreakdown;
  marketPosition?: MarketComparison;
}

// === HOOK ===

export function useTotalRewards() {
  const { user } = useAuth();
  const [components, setComponents] = useState<CompensationComponent[]>([]);
  const [statements, setStatements] = useState<RewardsStatement[]>([]);
  const [benchmarks, setBenchmarks] = useState<MarketBenchmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH COMPONENTS ===
  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error: fetchError } = await client
        .from('erp_hr_benefits_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Map benefits plans to compensation components format
      const mapped = (data || []).map((plan: Record<string, unknown>) => ({
        id: plan.id as string,
        company_id: plan.company_id as string | null,
        name: plan.plan_name as string,
        category: 'benefits' as const,
        description: plan.description as string | null,
        is_taxable: false,
        is_cash_equivalent: false,
        calculation_type: 'fixed' as const,
        calculation_formula: null,
        display_order: 0,
        icon: null,
        color: null,
        is_active: plan.is_active as boolean,
        created_at: plan.created_at as string,
        updated_at: plan.updated_at as string
      }));
      
      setComponents(mapped);
    } catch (err) {
      console.error('[useTotalRewards] fetchComponents error:', err);
      setError(err instanceof Error ? err.message : 'Error loading components');
    } finally {
      setLoading(false);
    }
  }, []);

  // === FETCH EMPLOYEE COMPENSATION ===
  const fetchEmployeeCompensation = useCallback(async (
    employeeId: string,
    fiscalYear: number
  ): Promise<EmployeeCompensation[]> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error: fetchError } = await client
        .from('erp_hr_compensation')
        .select('*')
        .eq('employee_id', employeeId);

      if (fetchError) throw fetchError;
      
      // Map compensation records to expected format
      const mapped = (data || []).map((comp: Record<string, unknown>) => ({
        id: comp.id as string,
        employee_id: comp.employee_id as string,
        component_id: comp.id as string,
        fiscal_year: fiscalYear,
        amount: (comp.base_salary as number) || 0,
        currency: comp.currency as string || 'EUR',
        frequency: 'annual' as const,
        effective_date: comp.effective_date as string | null,
        end_date: null,
        notes: comp.notes as string | null,
        metadata: {},
        created_at: comp.created_at as string,
        updated_at: comp.updated_at as string
      }));
      
      return mapped;
    } catch (err) {
      console.error('[useTotalRewards] fetchEmployeeCompensation error:', err);
      return [];
    }
  }, []);

  // === FETCH STATEMENTS ===
  const fetchStatements = useCallback(async (employeeId?: string) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      let query = client
        .from('erp_hr_rewards_statements')
        .select('*')
        .order('statement_year', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      // Map to expected format
      const mapped = (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        employee_id: s.employee_id as string,
        fiscal_year: s.statement_year as number,
        statement_date: (s.statement_date as string) || (s.created_at as string),
        status: (s.status as RewardsStatement['status']) || 'draft',
        total_compensation: s.total_value as number | null,
        total_cash: s.cash_value as number | null,
        total_benefits_value: s.benefits_value as number | null,
        total_equity_value: s.equity_value as number | null,
        currency: (s.currency as string) || 'EUR',
        breakdown: s.breakdown as CategoryBreakdown || {},
        comparisons: s.comparisons as MarketComparison || {},
        pdf_url: s.pdf_url as string | null,
        sent_at: s.sent_at as string | null,
        viewed_at: s.viewed_at as string | null,
        generated_by: s.generated_by as string | null,
        created_at: s.created_at as string,
        updated_at: s.updated_at as string
      }));
      
      setStatements(mapped);
    } catch (err) {
      console.error('[useTotalRewards] fetchStatements error:', err);
      setError(err instanceof Error ? err.message : 'Error loading statements');
    } finally {
      setLoading(false);
    }
  }, []);

  // === FETCH BENCHMARKS ===
  const fetchBenchmarks = useCallback(async (jobLevel?: string, jobFamily?: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      let query = client
        .from('erp_hr_salary_bands')
        .select('*');

      if (jobLevel) query = query.eq('level', jobLevel);
      if (jobFamily) query = query.eq('job_family', jobFamily);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      // Map salary bands to market benchmark format
      const mapped = (data || []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        company_id: b.company_id as string | null,
        job_level: b.level as string | null,
        job_family: b.job_family as string | null,
        location: b.location as string | null,
        percentile_25: b.min_salary as number | null,
        percentile_50: b.mid_salary as number | null,
        percentile_75: b.max_salary as number | null,
        percentile_90: null,
        currency: (b.currency as string) || 'EUR',
        source: b.source as string | null,
        survey_date: b.effective_date as string | null,
        created_at: b.created_at as string,
        updated_at: b.updated_at as string
      }));
      
      setBenchmarks(mapped);
      return mapped;
    } catch (err) {
      console.error('[useTotalRewards] fetchBenchmarks error:', err);
      return [];
    }
  }, []);

  // === CALCULATE TOTAL REWARDS ===
  const calculateTotalRewards = useCallback(async (
    employeeId: string,
    fiscalYear: number
  ): Promise<TotalRewardsSummary | null> => {
    try {
      const compensations = await fetchEmployeeCompensation(employeeId, fiscalYear);
      
      if (!compensations.length) return null;

      const byCategory: CategoryBreakdown = {
        base_salary: { total: 0, items: [] },
        variable: { total: 0, items: [] },
        benefits: { total: 0, items: [] },
        equity: { total: 0, items: [] },
        perks: { total: 0, items: [] },
        development: { total: 0, items: [] }
      };

      let totalCompensation = 0;
      let cashCompensation = 0;
      let benefitsValue = 0;
      let equityValue = 0;
      let perksValue = 0;

      compensations.forEach(comp => {
        const category = comp.component?.category || 'perks';
        const amount = comp.frequency === 'monthly' ? comp.amount * 12 : comp.amount;
        
        totalCompensation += amount;

        if (comp.component?.is_cash_equivalent) {
          cashCompensation += amount;
        }

        if (category === 'benefits') benefitsValue += amount;
        if (category === 'equity') equityValue += amount;
        if (category === 'perks' || category === 'development') perksValue += amount;

        if (byCategory[category]) {
          byCategory[category]!.total += amount;
          byCategory[category]!.items.push({
            name: comp.component?.name || 'Unknown',
            amount,
            percentage: 0, // Calculate later
            icon: comp.component?.icon || undefined,
            color: comp.component?.color || undefined
          });
        }
      });

      // Calculate percentages
      Object.values(byCategory).forEach(cat => {
        if (cat && cat.items) {
          cat.items.forEach(item => {
            item.percentage = totalCompensation > 0 
              ? (item.amount / totalCompensation) * 100 
              : 0;
          });
        }
      });

      return {
        totalCompensation,
        cashCompensation,
        benefitsValue,
        equityValue,
        perksValue,
        byCategory
      };
    } catch (err) {
      console.error('[useTotalRewards] calculateTotalRewards error:', err);
      return null;
    }
  }, [fetchEmployeeCompensation]);

  // === GENERATE STATEMENT ===
  const generateStatement = useCallback(async (
    employeeId: string,
    fiscalYear: number
  ): Promise<RewardsStatement | null> => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión');
      return null;
    }

    try {
      const summary = await calculateTotalRewards(employeeId, fiscalYear);
      
      if (!summary) {
        toast.error('No hay datos de compensación para este empleado');
        return null;
      }

      const statementData = {
        employee_id: employeeId,
        statement_year: fiscalYear,
        statement_date: new Date().toISOString().split('T')[0],
        status: 'generated',
        total_value: summary.totalCompensation,
        cash_value: summary.cashCompensation,
        benefits_value: summary.benefitsValue,
        equity_value: summary.equityValue,
        breakdown: JSON.parse(JSON.stringify(summary.byCategory)),
        comparisons: JSON.parse(JSON.stringify(summary.marketPosition || {})),
        generated_by: user.id
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error: insertError } = await client
        .from('erp_hr_rewards_statements')
        .upsert([statementData], { onConflict: 'employee_id,statement_year' })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Statement generado correctamente');
      await fetchStatements(employeeId);
      
      // Map returned data to expected format
      const mapped: RewardsStatement = {
        id: data.id,
        employee_id: data.employee_id,
        fiscal_year: data.statement_year,
        statement_date: data.statement_date || data.created_at,
        status: data.status || 'draft',
        total_compensation: data.total_value,
        total_cash: data.cash_value,
        total_benefits_value: data.benefits_value,
        total_equity_value: data.equity_value,
        currency: data.currency || 'EUR',
        breakdown: data.breakdown || {},
        comparisons: data.comparisons || {},
        pdf_url: data.pdf_url,
        sent_at: data.sent_at,
        viewed_at: data.viewed_at,
        generated_by: data.generated_by,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      return mapped;
    } catch (err) {
      console.error('[useTotalRewards] generateStatement error:', err);
      toast.error('Error generando statement');
      return null;
    }
  }, [user?.id, calculateTotalRewards, fetchStatements]);

  // === UPDATE COMPENSATION ===
  const updateEmployeeCompensation = useCallback(async (
    compensationId: string,
    updates: Partial<EmployeeCompensation>
  ): Promise<boolean> => {
    try {
      // Map to actual table columns
      const cleanUpdates: Record<string, unknown> = {};
      if (updates.amount !== undefined) cleanUpdates.base_salary = updates.amount;
      if (updates.currency !== undefined) cleanUpdates.currency = updates.currency;
      if (updates.effective_date !== undefined) cleanUpdates.effective_date = updates.effective_date;
      if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error: updateError } = await client
        .from('erp_hr_compensation')
        .update(cleanUpdates)
        .eq('id', compensationId);

      if (updateError) throw updateError;

      toast.success('Compensación actualizada');
      return true;
    } catch (err) {
      console.error('[useTotalRewards] updateEmployeeCompensation error:', err);
      toast.error('Error actualizando compensación');
      return false;
    }
  }, []);

  // === ADD COMPENSATION ===
  const addEmployeeCompensation = useCallback(async (
    data: Omit<EmployeeCompensation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EmployeeCompensation | null> => {
    try {
      // Map to actual table columns
      const insertData = {
        employee_id: data.employee_id,
        base_salary: data.amount,
        currency: data.currency || 'EUR',
        effective_date: data.effective_date,
        notes: data.notes
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: inserted, error: insertError } = await client
        .from('erp_hr_compensation')
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      // Map back to expected format
      const mapped: EmployeeCompensation = {
        id: inserted.id,
        employee_id: inserted.employee_id,
        component_id: inserted.id,
        fiscal_year: new Date().getFullYear(),
        amount: inserted.base_salary || 0,
        currency: inserted.currency || 'EUR',
        frequency: 'annual',
        effective_date: inserted.effective_date,
        end_date: null,
        notes: inserted.notes,
        metadata: {},
        created_at: inserted.created_at,
        updated_at: inserted.updated_at
      };

      toast.success('Compensación añadida');
      return mapped;
    } catch (err) {
      console.error('[useTotalRewards] addEmployeeCompensation error:', err);
      toast.error('Error añadiendo compensación');
      return null;
    }
  }, []);

  // === SEND STATEMENT ===
  const sendStatement = useCallback(async (statementId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error: updateError } = await client
        .from('erp_hr_rewards_statements')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', statementId);

      if (updateError) throw updateError;

      toast.success('Statement enviado al empleado');
      return true;
    } catch (err) {
      console.error('[useTotalRewards] sendStatement error:', err);
      toast.error('Error enviando statement');
      return false;
    }
  }, []);

  // === GENERATE AI ANALYSIS ===
  const generateAIAnalysis = useCallback(async (
    employeeId: string,
    fiscalYear: number
  ): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-total-rewards',
        {
          body: {
            action: 'analyze_compensation',
            employee_id: employeeId,
            fiscal_year: fiscalYear
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.analysis) {
        return data.analysis;
      }

      return null;
    } catch (err) {
      console.error('[useTotalRewards] generateAIAnalysis error:', err);
      return null;
    }
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  return {
    // State
    components,
    statements,
    benchmarks,
    loading,
    error,
    // Actions
    fetchComponents,
    fetchEmployeeCompensation,
    fetchStatements,
    fetchBenchmarks,
    calculateTotalRewards,
    generateStatement,
    updateEmployeeCompensation,
    addEmployeeCompensation,
    sendStatement,
    generateAIAnalysis
  };
}

export default useTotalRewards;
