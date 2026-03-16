/**
 * useControlTower — V2-RRHH-FASE-6 + 6B Enrichment
 * Hook that connects advisory portfolio data + enriched signals
 * to the Control Tower engine.
 *
 * 6B additions:
 *  - Fetches readiness matrix data per company (hr_official_submissions)
 *  - Fetches documental alerts per company (erp_hr_alerts)
 *  - Fetches traceability counts per company (erp_hr_evidence, erp_hr_version_registry)
 *  - Passes enriched signals to the scoring engine
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
  type EnrichedCompanySignals,
  type CompanyReadinessSignals,
  type CompanyDocumentalSignals,
  type CompanyTraceabilitySignals,
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

// ─── Enrichment data fetcher ────────────────────────────────────────────────

async function fetchEnrichedSignals(
  companyIds: string[],
): Promise<Map<string, EnrichedCompanySignals>> {
  const map = new Map<string, EnrichedCompanySignals>();
  if (companyIds.length === 0) return map;

  // Fetch all enrichment data in parallel
  const [submissionsRes, alertsRes, evidenceRes, versionRes] = await Promise.all([
    // Readiness: latest submissions per company to derive circuit statuses
    supabase
      .from('hr_official_submissions')
      .select('company_id, status, submission_domain, submission_type, period_year, period_month, created_at')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })
      .limit(500),

    // Documental: unresolved HR alerts per company
    supabase
      .from('erp_hr_alerts' as any)
      .select('company_id, severity, title, is_resolved')
      .in('company_id', companyIds)
      .eq('is_resolved', false)
      .limit(500),

    // Traceability: evidence counts per company + type check
    (supabase as any)
      .from('erp_hr_evidence')
      .select('company_id, ref_entity_type')
      .in('company_id', companyIds)
      .eq('is_valid', true)
      .limit(1000),

    // Traceability: version counts per company + type check
    (supabase as any)
      .from('erp_hr_version_registry')
      .select('company_id, entity_type')
      .in('company_id', companyIds)
      .limit(1000),
  ]);

  const submissions = (submissionsRes.data || []) as any[];
  const alerts = (alertsRes.data || []) as any[];
  const evidenceRows = (evidenceRes.data || []) as any[];
  const versionRows = (versionRes.data || []) as any[];

  // Initialize map for all companies
  for (const cid of companyIds) {
    map.set(cid, {});
  }

  // ── Build readiness signals ──
  const subsByCompany = groupBy(submissions, 'company_id');
  for (const cid of companyIds) {
    const companySubs = subsByCompany.get(cid) || [];
    if (companySubs.length === 0) continue;

    // Count statuses — we derive blocked/error/incomplete from submission statuses
    let blocked = 0;
    let error = 0;
    let dataIncomplete = 0;
    let notConfigured = 0;
    const blockDetails: string[] = [];

    // Group by domain to get latest per domain
    const byDomain = new Map<string, any>();
    for (const s of companySubs) {
      const existing = byDomain.get(s.submission_domain);
      if (!existing) byDomain.set(s.submission_domain, s);
    }

    for (const [domain, sub] of byDomain) {
      const st = sub.status as string;
      if (['blocked', 'suspended'].includes(st)) {
        blocked++;
        blockDetails.push(`${domain}: bloqueado/suspendido (${st})`);
      } else if (['rejected', 'failed', 'correction_required'].includes(st)) {
        error++;
        blockDetails.push(`${domain}: error/rechazado (${st})`);
      } else if (['payload_generated', 'pending_validation', 'pending_correction'].includes(st)) {
        dataIncomplete++;
        blockDetails.push(`${domain}: datos incompletos (${st})`);
      } else if (['draft'].includes(st)) {
        dataIncomplete++;
      }
    }

    // Total circuits is 9 (from CIRCUIT_DEFINITIONS), submissions tell us about configured ones
    const totalCircuits = 9;
    const configuredCircuits = byDomain.size;
    notConfigured = Math.max(0, totalCircuits - configuredCircuits);

    const readiness: CompanyReadinessSignals = {
      blockedCircuits: blocked,
      dataIncompleteCircuits: dataIncomplete,
      notConfiguredCircuits: notConfigured,
      errorCircuits: error,
      totalCircuits,
      blockDetails,
    };

    const existing = map.get(cid) || {};
    map.set(cid, { ...existing, readiness });
  }

  // ── Build documental signals ──
  const alertsByCompany = groupBy(alerts, 'company_id');
  for (const cid of companyIds) {
    const companyAlerts = alertsByCompany.get(cid) || [];
    if (companyAlerts.length === 0) continue;

    const critical = companyAlerts.filter((a: any) => a.severity === 'critical');
    const high = companyAlerts.filter((a: any) => a.severity === 'high');
    const medium = companyAlerts.filter((a: any) => a.severity === 'medium');

    const topTitles = [...critical, ...high]
      .slice(0, 3)
      .map((a: any) => a.title || 'Sin título');

    const documental: CompanyDocumentalSignals = {
      unresolvedCritical: critical.length,
      unresolvedHigh: high.length,
      unresolvedMedium: medium.length,
      topAlertTitles: topTitles,
    };

    const existing = map.get(cid) || {};
    map.set(cid, { ...existing, documental });
  }

  // ── Build traceability signals ──
  const evidenceByCompany = groupBy(evidenceRows, 'company_id');
  const versionByCompany = groupBy(versionRows, 'company_id');
  for (const cid of companyIds) {
    const companyEvidence = evidenceByCompany.get(cid) || [];
    const companyVersions = versionByCompany.get(cid) || [];

    const hasClosingEvidence = companyEvidence.some(
      (e: any) => e.ref_entity_type === 'payroll_period_closure' || e.ref_entity_type === 'closure_package',
    );
    const hasReadinessEvidence = companyEvidence.some(
      (e: any) => e.ref_entity_type === 'readiness_matrix' || e.ref_entity_type === 'official_readiness',
    );

    const traceability: CompanyTraceabilitySignals = {
      evidenceCount: companyEvidence.length,
      versionCount: companyVersions.length,
      hasClosingEvidence,
      hasReadinessEvidence,
    };

    const existing = map.get(cid) || {};
    map.set(cid, { ...existing, traceability });
  }

  return map;
}

function groupBy<T extends Record<string, any>>(items: T[], key: string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of items) {
    const k = item[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(item);
  }
  return m;
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
  const [enrichedSignals, setEnrichedSignals] = useState<Map<string, EnrichedCompanySignals>>(new Map());
  const [enrichmentLoaded, setEnrichmentLoaded] = useState(false);
  const ledgerFiredRef = useRef(false);

  // Fetch enrichment data when portfolio companies change
  useEffect(() => {
    if (portfolio.companies.length === 0) {
      setEnrichedSignals(new Map());
      setEnrichmentLoaded(false);
      return;
    }

    const companyIds = portfolio.companies.map(c => c.id);
    let cancelled = false;

    fetchEnrichedSignals(companyIds).then(signals => {
      if (!cancelled) {
        setEnrichedSignals(signals);
        setEnrichmentLoaded(true);
      }
    }).catch(err => {
      console.error('[useControlTower] enrichment fetch error:', err);
      if (!cancelled) {
        setEnrichedSignals(new Map());
        setEnrichmentLoaded(true);
      }
    });

    return () => { cancelled = true; };
  }, [portfolio.companies]);

  // Compute scored companies from portfolio data + enriched signals
  const { scoredCompanies, summary } = useMemo(() => {
    if (portfolio.companies.length === 0) {
      return { scoredCompanies: [], summary: null };
    }
    return buildControlTowerState(
      portfolio.companies,
      enrichmentLoaded ? enrichedSignals : undefined,
    );
  }, [portfolio.companies, enrichedSignals, enrichmentLoaded]);

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
            enrichment_loaded: enrichmentLoaded,
          },
        });
      } catch {
        // fire-and-forget
      }
    })();
  }, [scoredCompanies.length, summary, enrichmentLoaded]);

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
