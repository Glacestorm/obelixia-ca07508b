/**
 * B12.3B — Read-only hook that fetches Registry candidates and runs the
 * deterministic match advisor against an operative agreement row.
 *
 * SELECT-only. Auth-safe: returns empty list and authRequired=true when
 * there is no Supabase session. NO writes, NO edge invokes, NO bridge /
 * payroll / resolver imports.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  suggestRegistryMatches,
  type AgreementMatchCandidate,
  type RegistryCandidateInput,
} from '@/lib/hr/agreementRegistryMatchAdvisor';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

interface State {
  loading: boolean;
  error: string | null;
  authRequired: boolean;
  candidates: AgreementMatchCandidate[];
}

const INITIAL: State = { loading: false, error: null, authRequired: false, candidates: [] };

export function useAgreementRegistryMatchAdvisor(row: UnifiedAgreementRow | null) {
  const [state, setState] = useState<State>(INITIAL);

  const isLegacyMissing =
    !!row && row.origin === 'operative' && row.badges.includes('MISSING_FROM_REGISTRY');

  const run = useCallback(async () => {
    if (!row || !isLegacyMissing) {
      setState(INITIAL);
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        setState({ loading: false, error: null, authRequired: true, candidates: [] });
        return;
      }

      // Pull a small Registry slice to score against. SELECT-only.
      const { data, error } = await supabase
        .from('erp_hr_collective_agreements_registry')
        .select(
          'id,internal_code,official_name,cnae_codes,jurisdiction_code,source_quality,data_completeness,ready_for_payroll',
        )
        .limit(50);

      if (error) {
        setState({ loading: false, error: 'fetch_failed', authRequired: false, candidates: [] });
        return;
      }

      const registryCandidates: RegistryCandidateInput[] = (data ?? []).map((r) => {
        const x = r as Record<string, unknown>;
        return {
          id: String(x.id),
          internal_code: String(x.internal_code ?? ''),
          official_name: String(x.official_name ?? ''),
          cnae_codes: Array.isArray(x.cnae_codes) ? (x.cnae_codes as string[]) : undefined,
          jurisdiction_code: x.jurisdiction_code as string | undefined,
          source_quality: x.source_quality as string | undefined,
          data_completeness: x.data_completeness as string | undefined,
          ready_for_payroll: x.ready_for_payroll as boolean | undefined,
        };
      });

      const candidates = suggestRegistryMatches({
        operative: {
          agreementCode: row.key,
          name: row.display_name,
        },
        registryCandidates,
      });

      setState({ loading: false, error: null, authRequired: false, candidates });
    } catch (e) {
      setState({
        loading: false,
        error: e instanceof Error ? e.message : 'unknown_error',
        authRequired: false,
        candidates: [],
      });
    }
  }, [row, isLegacyMissing]);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refresh: run, enabled: isLegacyMissing };
}

export default useAgreementRegistryMatchAdvisor;
