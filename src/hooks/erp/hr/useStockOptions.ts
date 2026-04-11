/**
 * useStockOptions — Hook for managing equity plans and grants.
 * P1.7B-RB: Stock Options / Equity Compensation
 * 
 * Uses employee metadata for persistence (no new table needed).
 * Provides CRUD for plans/grants and exercise simulation.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type EquityPlan,
  type EquityGrant,
  type GrantClassification,
  type ExerciseSimulation,
  type VestingScheduleEntry,
  classifyGrant,
  simulateExercise,
  computeVestingSchedule,
  getCurrentVestedShares,
  getEquityPreflightStatus,
  computePayrollImpact,
} from '@/engines/erp/hr/stockOptionsEngine';

export interface StockOptionsState {
  plans: EquityPlan[];
  grants: EquityGrant[];
  loading: boolean;
  error: string | null;
}

/**
 * Persists equity plans/grants in a company-level metadata store.
 * Uses erp_hr_employees metadata.equity_plans / metadata.equity_grants
 * via a simple local state + Supabase metadata pattern.
 */
export function useStockOptions(companyId: string) {
  const [plans, setPlans] = useState<EquityPlan[]>([]);
  const [grants, setGrants] = useState<EquityGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load from company metadata ──
  const loadEquityData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      // Load plans from company-level config (stored in a pseudo-config row)
      const { data, error: fetchError } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, metadata')
        .eq('company_id', companyId)
        .not('metadata->equity_grants', 'is', null);

      if (fetchError) throw fetchError;

      // Aggregate plans from a known company config
      // For now, use demo plans if none stored
      const allGrants: EquityGrant[] = [];
      for (const emp of (data || [])) {
        const empGrants = emp.metadata?.equity_grants as EquityGrant[] | undefined;
        if (empGrants) allGrants.push(...empGrants);
      }

      setGrants(allGrants);

      // Plans are stored at company level — use demo for now
      if (plans.length === 0) {
        setPlans(getDemoPlans(companyId));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos de equity';
      setError(msg);
      console.error('[useStockOptions] loadEquityData error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, plans.length]);

  // ── Classify a grant ──
  const classify = useCallback((planId: string, grant: EquityGrant): GrantClassification | null => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;
    return classifyGrant(plan, grant);
  }, [plans]);

  // ── Simulate exercise ──
  const simulate = useCallback((
    planId: string,
    grant: EquityGrant,
    marketPrice: number,
    sharesToExercise?: number,
  ): ExerciseSimulation | null => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;
    return simulateExercise(plan, grant, marketPrice, sharesToExercise);
  }, [plans]);

  // ── Get vesting schedule ──
  const getVestingSchedule = useCallback((
    planId: string,
    grant: EquityGrant,
  ): VestingScheduleEntry[] => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return [];
    return computeVestingSchedule(grant, plan);
  }, [plans]);

  // ── Get vested shares ──
  const getVested = useCallback((
    planId: string,
    grant: EquityGrant,
  ): number => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return 0;
    return getCurrentVestedShares(grant, plan);
  }, [plans]);

  // ── Preflight status ──
  const getPreflightStatus = useCallback(() => {
    const planMap = new Map(plans.map(p => [p.id, p]));
    return getEquityPreflightStatus(grants, planMap);
  }, [plans, grants]);

  // ── Payroll impact ──
  const getPayrollImpact = useCallback((simulation: ExerciseSimulation) => {
    return computePayrollImpact(simulation);
  }, []);

  // ── Add demo grant for employee ──
  const addDemoGrant = useCallback((employeeId: string, planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const now = new Date();
    const grantDate = new Date(now);
    grantDate.setFullYear(grantDate.getFullYear() - 1);
    const cliffDate = new Date(grantDate);
    cliffDate.setMonth(cliffDate.getMonth() + plan.cliffMonths);
    const finalDate = new Date(grantDate);
    finalDate.setMonth(finalDate.getMonth() + plan.vestingMonths);

    const newGrant: EquityGrant = {
      id: crypto.randomUUID(),
      planId,
      employeeId,
      grantDate: grantDate.toISOString().slice(0, 10),
      totalShares: 1000,
      strikePrice: 5.00,
      vestedShares: 0,
      exercisedShares: 0,
      status: 'vesting',
      cliffDate: cliffDate.toISOString().slice(0, 10),
      finalVestingDate: finalDate.toISOString().slice(0, 10),
    };

    // Update vested shares based on schedule
    newGrant.vestedShares = getCurrentVestedShares(newGrant, plan);
    if (newGrant.vestedShares >= newGrant.totalShares) {
      newGrant.status = 'fully_vested';
    } else if (newGrant.vestedShares > 0) {
      newGrant.status = 'partially_vested';
    }

    setGrants(prev => [...prev, newGrant]);
    toast.success('Grant demo añadido');
  }, [plans]);

  return {
    plans,
    grants,
    loading,
    error,
    loadEquityData,
    classify,
    simulate,
    getVestingSchedule,
    getVested,
    getPreflightStatus,
    getPayrollImpact,
    addDemoGrant,
    setPlans,
    setGrants,
  };
}

// ── Demo plans for initial load ──

function getDemoPlans(companyId: string): EquityPlan[] {
  return [
    {
      id: 'demo-plan-standard',
      companyId,
      planName: 'Plan Stock Options 2025',
      planType: 'standard_stock_options',
      totalPool: 100_000,
      currency: 'EUR',
      approvalDate: '2025-01-15',
      isStartup: false,
      cliffMonths: 12,
      vestingMonths: 48,
      vestingSchedule: 'cliff_then_linear',
      notes: 'Plan estándar de opciones sobre acciones para empleados clave',
    },
    {
      id: 'demo-plan-startup',
      companyId,
      planName: 'Plan Startup Equity 2025',
      planType: 'startup_stock_options',
      totalPool: 50_000,
      currency: 'EUR',
      approvalDate: '2025-03-01',
      isStartup: true,
      cliffMonths: 12,
      vestingMonths: 48,
      vestingSchedule: 'cliff_then_linear',
      notes: 'Plan para empresa emergente (Ley 28/2022). Exención hasta 50.000€.',
    },
    {
      id: 'demo-plan-rsu',
      companyId,
      planName: 'RSU Program 2025',
      planType: 'restricted_stock_units',
      totalPool: 30_000,
      currency: 'EUR',
      approvalDate: '2025-06-01',
      isStartup: false,
      cliffMonths: 0,
      vestingMonths: 36,
      vestingSchedule: 'graded',
      notes: 'Programa de RSU con vesting trimestral',
    },
  ];
}

export default useStockOptions;
