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
      const { data, error: fetchError } = await supabase
        .from('erp_hr_compensation_components')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setComponents(data as CompensationComponent[]);
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
      const { data, error: fetchError } = await supabase
        .from('erp_hr_employee_compensation')
        .select(`
          *,
          component:erp_hr_compensation_components(*)
        `)
        .eq('employee_id', employeeId)
        .eq('fiscal_year', fiscalYear);

      if (fetchError) throw fetchError;
      return (data || []) as EmployeeCompensation[];
    } catch (err) {
      console.error('[useTotalRewards] fetchEmployeeCompensation error:', err);
      return [];
    }
  }, []);

  // === FETCH STATEMENTS ===
  const fetchStatements = useCallback(async (employeeId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('erp_hr_rewards_statements')
        .select('*')
        .order('fiscal_year', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setStatements(data as RewardsStatement[]);
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
      let query = supabase
        .from('erp_hr_market_benchmarks')
        .select('*');

      if (jobLevel) query = query.eq('job_level', jobLevel);
      if (jobFamily) query = query.eq('job_family', jobFamily);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setBenchmarks(data as MarketBenchmark[]);
      return data as MarketBenchmark[];
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
        fiscal_year: fiscalYear,
        statement_date: new Date().toISOString().split('T')[0],
        status: 'generated',
        total_compensation: summary.totalCompensation,
        total_cash: summary.cashCompensation,
        total_benefits_value: summary.benefitsValue,
        total_equity_value: summary.equityValue,
        breakdown: JSON.parse(JSON.stringify(summary.byCategory)),
        comparisons: JSON.parse(JSON.stringify(summary.marketPosition || {})),
        generated_by: user.id
      };

      const { data, error: insertError } = await supabase
        .from('erp_hr_rewards_statements')
        .upsert([statementData], { onConflict: 'employee_id,fiscal_year' })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Statement generado correctamente');
      await fetchStatements(employeeId);
      return data as RewardsStatement;
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
      // Serialize metadata for Supabase Json compatibility
      const cleanUpdates = {
        ...updates,
        metadata: updates.metadata ? JSON.parse(JSON.stringify(updates.metadata)) : undefined
      };

      const { error: updateError } = await supabase
        .from('erp_hr_employee_compensation')
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
      // Serialize metadata for Supabase Json compatibility
      const cleanData = {
        ...data,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : {}
      };

      const { data: inserted, error: insertError } = await supabase
        .from('erp_hr_employee_compensation')
        .insert([cleanData])
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Compensación añadida');
      return inserted as EmployeeCompensation;
    } catch (err) {
      console.error('[useTotalRewards] addEmployeeCompensation error:', err);
      toast.error('Error añadiendo compensación');
      return null;
    }
  }, []);

  // === SEND STATEMENT ===
  const sendStatement = useCallback(async (statementId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
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
