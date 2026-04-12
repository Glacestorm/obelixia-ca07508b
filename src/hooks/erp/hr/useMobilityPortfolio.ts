/**
 * useMobilityPortfolio.ts — Mobility Ops Premium
 * Orchestration hook: batch-loads assignments, documents, and corridor packs,
 * then feeds the portfolio engine. Deduplicates corridor pack resolution by key.
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { analyzePortfolio, type MobilityPortfolioAnalysis, type CaseAnalysis } from '@/engines/erp/hr/mobilityPortfolioEngine';
import { getCorridorPack, type CorridorKnowledgePack } from '@/engines/erp/hr/corridorKnowledgePacks';
import type { MobilityAssignment, MobilityDocument, AssignmentStatus } from '@/hooks/erp/hr/useGlobalMobility';

// ── Filters ──

export interface PortfolioFilters {
  corridor?: string;       // e.g. "ES-DE"
  coverageLevel?: string;  // full | partial | minimal
  supportLevel?: string;
  status?: string;
  riskMin?: number;
  docCompleteness?: string; // complete | partial | critical
  search?: string;         // employee id substring
}

// ── Batch fetch helpers ──

async function fetchAllAssignments(companyId: string): Promise<MobilityAssignment[]> {
  try {
    const { data, error } = await (supabase
      .from('hr_mobility_assignments')
      .select('*') as any)
      .eq('company_id', companyId)
      .in('status', ['active', 'planned', 'pre_assignment', 'extending', 'repatriating', 'draft'])
      .order('start_date', { ascending: false });

    if (error) {
      console.warn('[useMobilityPortfolio] assignments fetch error:', error.message);
      return [];
    }
    return (data ?? []) as MobilityAssignment[];
  } catch {
    return [];
  }
}

async function fetchAllDocuments(companyId: string): Promise<MobilityDocument[]> {
  try {
    const { data, error } = await (supabase
      .from('hr_mobility_documents')
      .select('*') as any)
      .eq('company_id', companyId);

    if (error) {
      console.warn('[useMobilityPortfolio] documents fetch error:', error.message);
      return [];
    }
    return (data ?? []) as MobilityDocument[];
  } catch {
    return [];
  }
}

/** Group documents by assignment_id */
function groupDocsByAssignment(docs: MobilityDocument[]): Map<string, MobilityDocument[]> {
  const map = new Map<string, MobilityDocument[]>();
  for (const doc of docs) {
    const existing = map.get(doc.assignment_id);
    if (existing) existing.push(doc);
    else map.set(doc.assignment_id, [doc]);
  }
  return map;
}

/** Resolve unique corridor packs — avoids N+1 by deduplicating on corridor key */
function resolveCorridorPacks(assignments: MobilityAssignment[]): Map<string, CorridorKnowledgePack | null> {
  const packs = new Map<string, CorridorKnowledgePack | null>();
  for (const a of assignments) {
    const key = `${a.home_country_code.toUpperCase()}-${a.host_country_code.toUpperCase()}`;
    if (!packs.has(key)) {
      packs.set(key, getCorridorPack(a.home_country_code, a.host_country_code));
    }
  }
  return packs;
}

// ── Hook ──

export function useMobilityPortfolio(companyId: string) {
  const [filters, setFilters] = useState<PortfolioFilters>({});

  // Batch fetch assignments + docs in parallel via react-query
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['mobility-portfolio', companyId],
    queryFn: async () => {
      const [assignments, documents] = await Promise.all([
        fetchAllAssignments(companyId),
        fetchAllDocuments(companyId),
      ]);
      return { assignments, documents };
    },
    staleTime: 3 * 60 * 1000, // 3 min
    enabled: !!companyId,
  });

  // Compute analysis (memoized on raw data)
  const analysis = useMemo<MobilityPortfolioAnalysis | null>(() => {
    if (!rawData || rawData.assignments.length === 0) return null;

    const docsByAssignment = groupDocsByAssignment(rawData.documents);
    const packs = resolveCorridorPacks(rawData.assignments);

    return analyzePortfolio(rawData.assignments, docsByAssignment, packs);
  }, [rawData]);

  // Client-side filtering
  const filteredCases = useMemo<CaseAnalysis[]>(() => {
    if (!analysis) return [];

    let cases = analysis.caseAnalyses;

    if (filters.corridor) {
      cases = cases.filter(c => c.corridorKey === filters.corridor);
    }
    if (filters.coverageLevel) {
      cases = cases.filter(c => c.coverageLevel === filters.coverageLevel);
    }
    if (filters.supportLevel) {
      cases = cases.filter(c => c.supportLevel === filters.supportLevel);
    }
    if (filters.status) {
      cases = cases.filter(c => c.status === filters.status);
    }
    if (filters.riskMin !== undefined) {
      cases = cases.filter(c => c.riskScore >= filters.riskMin!);
    }
    if (filters.docCompleteness) {
      cases = cases.filter(c => c.docCompletenessLevel === filters.docCompleteness);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      cases = cases.filter(c => c.employeeId.toLowerCase().includes(s) || c.corridorLabel.toLowerCase().includes(s));
    }

    return cases;
  }, [analysis, filters]);

  const filteredPriorityQueue = useMemo<CaseAnalysis[]>(() => {
    return [...filteredCases].sort((a, b) => b.priorityScore - a.priorityScore);
  }, [filteredCases]);

  const updateFilters = useCallback((patch: Partial<PortfolioFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    analysis,
    filteredCases,
    filteredPriorityQueue,
    filters,
    updateFilters,
    clearFilters,
    isLoading,
    refetch,
    assignmentCount: rawData?.assignments.length ?? 0,
  };
}
