/**
 * B12.2 — Unified search hook for the Centro de Convenios.
 *
 * SELECT-only. No privileged backend role. No edge writes. No bridge/payroll imports.
 * Auth-safe: if there is no active Supabase session, returns
 * { authRequired: true, results: [] } without calling RLS-protected SELECTs.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AgreementOrigin = 'operative' | 'registry' | 'both' | 'candidate';

export interface UnifiedAgreementRow {
  key: string;
  display_name: string;
  origin: AgreementOrigin;
  operative?: {
    id: string;
    status?: string;
    updated_at?: string;
  };
  registry?: {
    id: string;
    status?: string;
    source_quality?: string;
    data_completeness?: string;
    salary_tables_loaded?: boolean;
    ready_for_payroll?: boolean;
    requires_human_review?: boolean;
    official_submission_blocked?: boolean;
    versions_count?: number;
  };
  mappings_count: number;
  runtime_settings_count: number;
  badges: string[];
}

export interface UnifiedSearchFilters {
  text?: string;
  internal_code?: string;
  agreement_code?: string;
  official_name?: string;
  regcon?: string;
  cnae?: string;
  sector?: string;
  province?: string;
  ccaa?: string;
  status?: string;
  source_quality?: string;
  ready_for_payroll?: boolean;
  salary_tables_loaded?: boolean;
}

export interface UseAgreementUnifiedSearchResult {
  loading: boolean;
  error: string | null;
  authRequired: boolean;
  results: UnifiedAgreementRow[];
  search: (filters: UnifiedSearchFilters) => Promise<void>;
  reset: () => void;
}

function deriveBadges(row: UnifiedAgreementRow): string[] {
  const out: string[] = [];
  if (row.operative) out.push('OPERATIVO_ACTUAL');
  if (row.registry) {
    const r = row.registry;
    if (r.data_completeness === 'metadata_only') out.push('REGISTRY_METADATA_ONLY');
    if (r.salary_tables_loaded === true && r.ready_for_payroll !== true)
      out.push('REGISTRY_PARSED');
    if (r.data_completeness === 'human_validated') out.push('REGISTRY_HUMAN_VALIDATED');
    if (r.ready_for_payroll === true) out.push('REGISTRY_READY');
    if (r.requires_human_review === true) out.push('NEEDS_HUMAN_REVIEW');
  }
  if (row.origin === 'operative') out.push('MISSING_FROM_REGISTRY');
  return Array.from(new Set(out));
}

export function useAgreementUnifiedSearch(): UseAgreementUnifiedSearchResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [results, setResults] = useState<UnifiedAgreementRow[]>([]);

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const search = useCallback(async (filters: UnifiedSearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        setAuthRequired(true);
        setResults([]);
        return;
      }
      setAuthRequired(false);

      const text = (filters.text ?? '').trim();
      const ilike = text ? `%${text}%` : null;

      // Operative legacy table — SELECT only.
      let opQuery = supabase
        .from('erp_hr_collective_agreements')
        .select('id,code,name,is_active,updated_at,cnae_codes,jurisdiction_code')
        .limit(50);

      if (filters.internal_code) opQuery = opQuery.eq('code', filters.internal_code);
      if (filters.cnae) opQuery = opQuery.contains('cnae_codes', [filters.cnae]);
      if (filters.ccaa) opQuery = opQuery.eq('jurisdiction_code', filters.ccaa);
      if (ilike) opQuery = opQuery.or(`name.ilike.${ilike},code.ilike.${ilike}`);

      // Registry table — SELECT only.
      let regQuery = supabase
        .from('erp_hr_collective_agreements_registry')
        .select(
          'id,internal_code,agreement_code,official_name,status,source_quality,data_completeness,salary_tables_loaded,ready_for_payroll,requires_human_review,official_submission_blocked,sector,province_code,autonomous_region,cnae_codes,jurisdiction_code,scope_type',
        )
        .limit(50);

      if (filters.internal_code) regQuery = regQuery.eq('internal_code', filters.internal_code);
      if (filters.agreement_code) regQuery = regQuery.eq('agreement_code', filters.agreement_code);
      if (filters.regcon) regQuery = regQuery.eq('agreement_code', filters.regcon);
      if (filters.cnae) regQuery = regQuery.contains('cnae_codes', [filters.cnae]);
      if (filters.sector) regQuery = regQuery.eq('sector', filters.sector);
      if (filters.province) regQuery = regQuery.eq('province_code', filters.province);
      if (filters.ccaa) regQuery = regQuery.eq('autonomous_region', filters.ccaa);
      if (filters.status) regQuery = regQuery.eq('status', filters.status);
      if (filters.source_quality) regQuery = regQuery.eq('source_quality', filters.source_quality);
      if (typeof filters.ready_for_payroll === 'boolean')
        regQuery = regQuery.eq('ready_for_payroll', filters.ready_for_payroll);
      if (typeof filters.salary_tables_loaded === 'boolean')
        regQuery = regQuery.eq('salary_tables_loaded', filters.salary_tables_loaded);
      if (ilike)
        regQuery = regQuery.or(
          `official_name.ilike.${ilike},internal_code.ilike.${ilike},agreement_code.ilike.${ilike}`,
        );

      const [opRes, regRes] = await Promise.all([opQuery, regQuery]);
      if (opRes.error && regRes.error) {
        setError('search_failed');
        setResults([]);
        return;
      }

      const merged = new Map<string, UnifiedAgreementRow>();

      for (const op of opRes.data ?? []) {
        const key = String((op as Record<string, unknown>).code ?? (op as Record<string, unknown>).id);
        const row: UnifiedAgreementRow = {
          key,
          display_name: String((op as Record<string, unknown>).name ?? key),
          origin: 'operative',
          operative: {
            id: String((op as Record<string, unknown>).id),
            status:
              (op as Record<string, unknown>).is_active === true
                ? 'active'
                : (op as Record<string, unknown>).is_active === false
                  ? 'inactive'
                  : undefined,
            updated_at: (op as Record<string, unknown>).updated_at as string | undefined,
          },
          mappings_count: 0,
          runtime_settings_count: 0,
          badges: [],
        };
        merged.set(key, row);
      }

      for (const reg of regRes.data ?? []) {
        const r = reg as Record<string, unknown>;
        const key = String(r.internal_code ?? r.agreement_code ?? r.id);
        const existing = merged.get(key);
        const registryPart = {
          id: String(r.id),
          status: r.status as string | undefined,
          source_quality: r.source_quality as string | undefined,
          data_completeness: r.data_completeness as string | undefined,
          salary_tables_loaded: r.salary_tables_loaded as boolean | undefined,
          ready_for_payroll: r.ready_for_payroll as boolean | undefined,
          requires_human_review: r.requires_human_review as boolean | undefined,
          official_submission_blocked: r.official_submission_blocked as boolean | undefined,
          versions_count: undefined,
        };
        if (existing) {
          existing.registry = registryPart;
          existing.origin = 'both';
        } else {
          merged.set(key, {
            key,
            display_name: String(r.official_name ?? key),
            origin: 'registry',
            registry: registryPart,
            mappings_count: 0,
            runtime_settings_count: 0,
            badges: [],
          });
        }
      }

      const out: UnifiedAgreementRow[] = [];
      for (const row of merged.values()) {
        row.badges = deriveBadges(row);
        out.push(row);
      }
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, authRequired, results, search, reset };
}

export default useAgreementUnifiedSearch;