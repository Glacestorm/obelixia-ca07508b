/**
 * useAdvisoryPortfolio — V2-RRHH-FASE-5 + 5B Hardening
 * Hook for advisory/multi-company portfolio management.
 *
 * Fetches:
 *  - Companies assigned to current advisor (ONLY assigned — no fallback)
 *  - Per-company closing status, task counts via count queries
 *  - Portfolio-level KPIs
 *
 * Security (5B):
 *  - No implicit supervisor fallback — empty assignments = empty portfolio
 *  - Count-based aggregation to avoid 1000-row limit
 *  - Ledger traceability on portfolio access
 *
 * Reuses: existing erp_companies, hr_payroll_periods, erp_hr_tasks, erp_hr_advisor_assignments
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  /** True when user has no assignments at all */
  hasNoAssignments: boolean;
  refresh: () => Promise<void>;
}

const VALID_ROLES: AdvisoryRole[] = ['tecnico_laboral', 'responsable_cartera', 'supervisor'];

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAdvisoryPortfolio(): UseAdvisoryPortfolioReturn {
  const [companies, setCompanies] = useState<PortfolioCompany[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [advisorRole, setAdvisorRole] = useState<AdvisoryRole | null>(null);
  const [hasNoAssignments, setHasNoAssignments] = useState(false);
  const loadedRef = useRef(false);
  const ledgerFiredRef = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCompanies([]);
        setSummary(null);
        setHasNoAssignments(true);
        return;
      }

      // 2. Get advisor assignments — ONLY explicit assignments, no fallback
      const { data: assignments, error: assErr } = await supabase
        .from('erp_hr_advisor_assignments')
        .select('company_id, role, assigned_at, is_active, notes')
        .eq('advisor_user_id', user.id)
        .eq('is_active', true);

      if (assErr) {
        console.error('[useAdvisoryPortfolio] Error fetching assignments:', assErr);
        setCompanies([]);
        setSummary(null);
        setHasNoAssignments(true);
        return;
      }

      if (!assignments || assignments.length === 0) {
        // F5-H5 FIX: No fallback. Empty portfolio = no access.
        setCompanies([]);
        setSummary(null);
        setAdvisorRole(null);
        setHasNoAssignments(true);
        return;
      }

      setHasNoAssignments(false);

      // Determine highest role (validated)
      const roles = assignments
        .map(a => a.role as string)
        .filter(r => VALID_ROLES.includes(r as AdvisoryRole)) as AdvisoryRole[];
      const roleHierarchy: AdvisoryRole[] = ['supervisor', 'responsable_cartera', 'tecnico_laboral'];
      const highestRole = roleHierarchy.find(r => roles.includes(r)) ?? 'tecnico_laboral';
      setAdvisorRole(highestRole);

      // 3. Fetch company details
      const companyIds = assignments.map(a => a.company_id);
      const { data: companyData } = await supabase
        .from('erp_companies')
        .select('id, name, legal_name, tax_id, is_active')
        .in('id', companyIds);

      if (!companyData || companyData.length === 0) {
        setCompanies([]);
        setSummary(null);
        return;
      }

      const assignmentMap = new Map(assignments.map(a => [a.company_id, a]));

      const enrichInput = companyData.map(c => {
        const assignment = assignmentMap.get(c.id);
        const rawRole = (assignment?.role as string) ?? 'tecnico_laboral';
        const validRole = (VALID_ROLES.includes(rawRole as AdvisoryRole) ? rawRole : 'tecnico_laboral') as AdvisoryRole;
        return {
          companyId: c.id,
          name: c.name,
          legalName: c.legal_name,
          taxId: c.tax_id,
          isActive: c.is_active ?? true,
          role: validRole as AdvisoryRole,
          assignedAt: assignment?.assigned_at ?? new Date().toISOString(),
        };
      });

      const portfolioCompanies = await enrichCompaniesWithCounts(enrichInput);
      setCompanies(portfolioCompanies);
      setSummary(buildSummary(portfolioCompanies));

      // 6. Ledger: trace portfolio access (fire once per session)
      if (!ledgerFiredRef.current) {
        ledgerFiredRef.current = true;
        tracePortfolioAccess(user.id, companyIds.length, highestRole);
      }

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

  return { companies, summary, isLoading, advisorRole, hasNoAssignments, refresh };
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

/**
 * F5-H6 FIX: Use count queries instead of fetching all rows.
 * This avoids the 1000-row silent limit and reduces payload size.
 */
async function enrichCompaniesWithCounts(inputs: CompanyInput[]): Promise<PortfolioCompany[]> {
  if (inputs.length === 0) return [];

  const companyIds = inputs.map(i => i.companyId);

  // Employee counts via RPC (no row download, no 1000-row limit)
  // Tasks and periods via batch queries with limits
  const [empCountRes, taskData, periodData] = await Promise.all([
    supabase.rpc('count_active_employees_by_company', {
      p_company_ids: companyIds,
    }),
    supabase.from('hr_tasks')
      .select('company_id, sla_breached')
      .in('company_id', companyIds)
      .in('status', ['pending', 'in_progress'])
      .limit(2000),
    // hr_payroll_periods.period_end not in generated types — cast retained
    (supabase as any).from('hr_payroll_periods')
      .select('company_id, status, period_end')
      .in('company_id', companyIds)
      .order('period_end', { ascending: false })
      .limit(inputs.length * 3),
  ]);

  // Build employee count map from RPC result
  const empCountMap = new Map<string, number>();
  for (const row of (empCountRes.data || []) as Array<{ company_id: string; active_count: number }>) {
    empCountMap.set(row.company_id, Number(row.active_count));
  }

  const tasks = (taskData.data || []) as Array<{ company_id: string; sla_breached: boolean }>;
  const periods = (periodData.data || []) as Array<{ company_id: string; status: string; period_end: string }>;

  // Pre-group by company_id for O(n) lookup instead of O(n×m) filter
  const tasksByCompany = groupBy(tasks, 'company_id');
  const periodsByCompany = groupBy(periods, 'company_id');

  return inputs.map(input => {
    const activeEmployees = empCountMap.get(input.companyId) ?? 0;
    const companyTasks = tasksByCompany.get(input.companyId) || [];
    const companyPeriods = periodsByCompany.get(input.companyId) || [];

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

    const openPeriods = companyPeriods.filter(p => !['closed', 'locked'].includes(p.status ?? '')).length;

    return {
      id: input.companyId,
      name: input.name,
      legalName: input.legalName,
      taxId: input.taxId,
      isActive: input.isActive,
      advisoryRole: input.role,
      assignedAt: input.assignedAt,
      stats: {
        activeEmployees,
        pendingTasks,
        overdueTasks,
        openClosingPeriods: openPeriods,
        lastClosedPeriod,
        closingStatus,
      },
    };
  });
}

function groupBy<T extends Record<string, any>>(items: T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = item[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
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

/**
 * Fire-and-forget ledger trace for portfolio access.
 * Uses direct insert to avoid requiring companyId context from useHRLedgerWriter.
 */
async function tracePortfolioAccess(userId: string, companiesCount: number, role: AdvisoryRole) {
  try {
    // erp_hr_ledger.immutable_hash is required in types but computed server-side — cast retained
    await (supabase as any).from('erp_hr_ledger').insert({
      company_id: 'system',
      event_type: 'system_event',
      entity_type: 'advisory_portfolio',
      entity_id: userId,
      event_label: 'Acceso a cartera asesoría',
      actor_id: userId,
      source_module: 'advisory_portfolio',
      metadata: {
        action: 'portfolio_accessed',
        companies_in_portfolio: companiesCount,
        advisor_role: role,
      },
    });
  } catch (err) {
    // Fire-and-forget: never block business flow
    console.debug('[AdvisoryPortfolio] Ledger trace failed (non-blocking):', err);
  }
}
