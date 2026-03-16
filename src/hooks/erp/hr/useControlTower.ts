/**
 * useControlTower — V2-RRHH-FASE-6
 * Hook that connects advisory portfolio data to the Control Tower engine.
 * Produces scored/prioritized companies, alerts, and global KPIs.
 *
 * Reuses: useAdvisoryPortfolio (data source)
 * Computes: controlTowerEngine (pure scoring + alert generation)
 * Traces: ledger event on first access per session
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  useAdvisoryPortfolio,
  type PortfolioCompany,
} from '@/hooks/erp/hr/useAdvisoryPortfolio';
import {
  buildControlTowerState,
  type CompanyHealthScore,
  type ControlTowerSummary,
  type AlertSeverity,
  type AlertCategory,
} from '@/engines/erp/hr/controlTowerEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ControlTowerFilters {
  severity: AlertSeverity | 'all';
  category: AlertCategory | 'all';
  search: string;
}

export interface UseControlTowerReturn {
  // Data
  scoredCompanies: CompanyHealthScore[];
  filteredCompanies: CompanyHealthScore[];
  summary: ControlTowerSummary | null;
  selectedCompany: CompanyHealthScore | null;
  // Portfolio pass-through
  advisorRole: string | null;
  hasNoAssignments: boolean;
  // State
  isLoading: boolean;
  filters: ControlTowerFilters;
  // Actions
  setFilters: (f: Partial<ControlTowerFilters>) => void;
  selectCompany: (companyId: string | null) => void;
  refresh: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useControlTower(): UseControlTowerReturn {
  const portfolio = useAdvisoryPortfolio();
  const [filters, setFiltersState] = useState<ControlTowerFilters>({
    severity: 'all',
    category: 'all',
    search: '',
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const ledgerFiredRef = useRef(false);

  // Compute scored companies from portfolio data
  const { scoredCompanies, summary } = useMemo(() => {
    if (portfolio.companies.length === 0) {
      return { scoredCompanies: [], summary: null };
    }
    return buildControlTowerState(portfolio.companies);
  }, [portfolio.companies]);

  // Apply filters
  const filteredCompanies = useMemo(() => {
    return scoredCompanies.filter(c => {
      if (filters.severity !== 'all' && c.severity !== filters.severity) return false;
      if (filters.category !== 'all') {
        const hasCategory = c.alerts.some(a => a.category === filters.category);
        if (!hasCategory) return false;
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matchesName = c.companyName.toLowerCase().includes(s);
        const matchesReason = c.reasons.some(r => r.toLowerCase().includes(s));
        if (!matchesName && !matchesReason) return false;
      }
      return true;
    });
  }, [scoredCompanies, filters]);

  // Selected company drill-down
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return scoredCompanies.find(c => c.companyId === selectedCompanyId) ?? null;
  }, [selectedCompanyId, scoredCompanies]);

  // Setters
  const setFilters = useCallback((partial: Partial<ControlTowerFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const selectCompany = useCallback((companyId: string | null) => {
    setSelectedCompanyId(companyId);
  }, []);

  // Ledger trace — once per session
  useEffect(() => {
    if (ledgerFiredRef.current || scoredCompanies.length === 0) return;
    ledgerFiredRef.current = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await (supabase as any).from('erp_hr_ledger').insert({
          event_type: 'system_event',
          entity_type: 'control_tower',
          entity_id: user.id,
          event_label: 'Acceso a Control Tower laboral',
          actor_id: user.id,
          source_module: 'control_tower',
          metadata: {
            action: 'control_tower_accessed',
            companies_count: scoredCompanies.length,
            critical_count: summary?.criticalCount ?? 0,
            total_alerts: summary?.totalAlerts ?? 0,
          },
        });
      } catch {
        // fire-and-forget
      }
    })();
  }, [scoredCompanies.length, summary]);

  return {
    scoredCompanies,
    filteredCompanies,
    summary,
    selectedCompany,
    advisorRole: portfolio.advisorRole,
    hasNoAssignments: portfolio.hasNoAssignments,
    isLoading: portfolio.isLoading,
    filters,
    setFilters,
    selectCompany,
    refresh: portfolio.refresh,
  };
}
