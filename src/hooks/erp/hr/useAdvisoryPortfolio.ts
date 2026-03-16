/**
 * useAdvisoryPortfolio — V2-RRHH-FASE-5
 * Hook for advisory/multi-company portfolio management.
 *
 * Fetches:
 *  - Companies assigned to current advisor
 *  - Per-company closing status, task counts, readiness summary
 *  - Portfolio-level KPIs
 *
 * Reuses: existing erp_companies, hr_payroll_periods, erp_hr_tasks, erp_hr_advisor_assignments
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHRLedgerWriter } from './useHRLedgerWriter';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AdvisoryRole = 'tecnico_laboral' | 'responsable_cartera' | 'supervisor';

export interface PortfolioCompany {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  isActive: boolean;
  /** Advisory role for this company */
  advisoryRole: AdvisoryRole;
  assignedAt: string;
  /** Aggregated stats */
  stats: {
    activeEmployees: number;
    pendingTasks: number;
    overdueTasks: number;
    openClosingPeriods: number;
    lastClosedPeriod: string | null;
    closingStatus: 'no_periods' | 'open' | 'closing' | 'closed' | 'locked';
  };
}

export interface PortfolioSummary {
  totalCompanies: number;
  activeCompanies: number;
  totalEmployees: number;
  totalPendingTasks: number;
  totalOverdueTasks: number;
  companiesWithOpenClosing: number;
  companiesFullyClosed: number;
  evaluatedAt: string;
}

export interface UseAdvisoryPortfolioReturn {
  companies: PortfolioCompany[];
  summary: PortfolioSummary | null;
  isLoading: boolean;
  advisorRole: AdvisoryRole | null;
  refresh: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAdvisoryPortfolio(): UseAdvisoryPortfolioReturn {
  const [companies, setCompanies] = useState<PortfolioCompany[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [advisorRole, setAdvisorRole] = useState<AdvisoryRole | null>(null);
  const loadedRef = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCompanies([]);
        setSummary(null);
        return;
      }

      // 2. Get advisor assignments
      const { data: assignments, error: assErr } = await (supabase as any)
        .from('erp_hr_advisor_assignments')
        .select('company_id, role, assigned_at, is_active, notes')
        .eq('advisor_user_id', user.id)
        .eq('is_active', true);

      if (assErr || !assignments || assignments.length === 0) {
        // Fallback: if no assignments, load all companies (supervisor/admin mode)
        const { data: allCompanies } = await supabase
          .from('erp_companies')
          .select('id, name, legal_name, tax_id, is_active')
          .eq('is_active', true)
          .order('name')
          .limit(50);

        if (allCompanies && allCompanies.length > 0) {
          setAdvisorRole('supervisor');
          const portfolioCompanies = await enrichCompanies(
            allCompanies.map(c => ({
              companyId: c.id,
              name: c.name,
              legalName: c.legal_name,
              taxId: c.tax_id,
              isActive: c.is_active ?? true,
              role: 'supervisor' as AdvisoryRole,
              assignedAt: new Date().toISOString(),
            }))
          );
          setCompanies(portfolioCompanies);
          setSummary(buildSummary(portfolioCompanies));
        }
        return;
      }

      // Determine highest role
      const roles = (assignments as any[]).map(a => a.role as AdvisoryRole);
      const roleHierarchy: AdvisoryRole[] = ['supervisor', 'responsable_cartera', 'tecnico_laboral'];
      const highestRole = roleHierarchy.find(r => roles.includes(r)) ?? 'tecnico_laboral';
      setAdvisorRole(highestRole);

      // 3. Fetch company details
      const companyIds = (assignments as any[]).map(a => a.company_id);
      const { data: companyData } = await supabase
        .from('erp_companies')
        .select('id, name, legal_name, tax_id, is_active')
        .in('id', companyIds);

      if (!companyData) return;

      const assignmentMap = new Map((assignments as any[]).map(a => [a.company_id, a]));

      const enrichInput = companyData.map(c => {
        const assignment = assignmentMap.get(c.id);
        return {
          companyId: c.id,
          name: c.name,
          legalName: c.legal_name,
          taxId: c.tax_id,
          isActive: c.is_active ?? true,
          role: (assignment?.role ?? 'tecnico_laboral') as AdvisoryRole,
          assignedAt: assignment?.assigned_at ?? new Date().toISOString(),
        };
      });

      const portfolioCompanies = await enrichCompanies(enrichInput);
      setCompanies(portfolioCompanies);
      setSummary(buildSummary(portfolioCompanies));

    } catch (err) {
      console.error('[useAdvisoryPortfolio] refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      refresh();
    }
  }, [refresh]);

  return { companies, summary, isLoading, advisorRole, refresh };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface CompanyInput {
  companyId: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  isActive: boolean;
  role: AdvisoryRole;
  assignedAt: string;
}

async function enrichCompanies(inputs: CompanyInput[]): Promise<PortfolioCompany[]> {
  if (inputs.length === 0) return [];

  const companyIds = inputs.map(i => i.companyId);

  // Batch fetch: employees, tasks, payroll periods
  const [empRes, taskRes, periodRes] = await Promise.all([
    supabase.from('hr_employees' as any)
      .select('id, company_id, status')
      .in('company_id', companyIds)
      .eq('status', 'active'),
    supabase.from('erp_hr_tasks' as any)
      .select('id, company_id, status, sla_breached')
      .in('company_id', companyIds)
      .in('status', ['pending', 'in_progress']),
    supabase.from('hr_payroll_periods' as any)
      .select('id, company_id, status, period_end')
      .in('company_id', companyIds)
      .order('period_end', { ascending: false }),
  ]);

  const employees = (empRes.data || []) as any[];
  const tasks = (taskRes.data || []) as any[];
  const periods = (periodRes.data || []) as any[];

  return inputs.map(input => {
    const companyEmployees = employees.filter(e => e.company_id === input.companyId);
    const companyTasks = tasks.filter(t => t.company_id === input.companyId);
    const companyPeriods = periods.filter(p => p.company_id === input.companyId);

    const pendingTasks = companyTasks.length;
    const overdueTasks = companyTasks.filter(t => t.sla_breached).length;

    // Determine closing status from most recent period
    const latestPeriod = companyPeriods[0];
    let closingStatus: PortfolioCompany['stats']['closingStatus'] = 'no_periods';
    let lastClosedPeriod: string | null = null;

    if (latestPeriod) {
      const status = latestPeriod.status as string;
      if (status === 'locked') {
        closingStatus = 'locked';
        lastClosedPeriod = latestPeriod.period_end;
      } else if (status === 'closed') {
        closingStatus = 'closed';
        lastClosedPeriod = latestPeriod.period_end;
      } else if (status === 'closing') {
        closingStatus = 'closing';
      } else {
        closingStatus = 'open';
      }
    }

    const openPeriods = companyPeriods.filter(p => !['closed', 'locked'].includes(p.status)).length;

    return {
      id: input.companyId,
      name: input.name,
      legalName: input.legalName,
      taxId: input.taxId,
      isActive: input.isActive,
      advisoryRole: input.role,
      assignedAt: input.assignedAt,
      stats: {
        activeEmployees: companyEmployees.length,
        pendingTasks,
        overdueTasks,
        openClosingPeriods: openPeriods,
        lastClosedPeriod,
        closingStatus,
      },
    };
  });
}

function buildSummary(companies: PortfolioCompany[]): PortfolioSummary {
  return {
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.isActive).length,
    totalEmployees: companies.reduce((sum, c) => sum + c.stats.activeEmployees, 0),
    totalPendingTasks: companies.reduce((sum, c) => sum + c.stats.pendingTasks, 0),
    totalOverdueTasks: companies.reduce((sum, c) => sum + c.stats.overdueTasks, 0),
    companiesWithOpenClosing: companies.filter(c => ['open', 'closing'].includes(c.stats.closingStatus)).length,
    companiesFullyClosed: companies.filter(c => ['closed', 'locked'].includes(c.stats.closingStatus)).length,
    evaluatedAt: new Date().toISOString(),
  };
}
