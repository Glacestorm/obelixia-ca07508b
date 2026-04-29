/**
 * B8A.3 — Read-only hook for the human validation UI.
 *
 * Reads registry agreement / version / source / parsed payload (B7B)
 * + current validation + items + signatures + history through the
 * authenticated user client (RLS). Performs NO writes.
 *
 * NEVER touches the operational table `erp_hr_collective_agreements`.
 * NEVER touches payroll engines or registry safety flags.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgreementValidationReadInput {
  agreementId: string;
  versionId: string;
  sourceId: string;
}

export interface AgreementValidationData {
  agreement: Record<string, unknown> | null;
  version: Record<string, unknown> | null;
  source: Record<string, unknown> | null;
  salaryRows: Array<Record<string, unknown>>;
  rules: Record<string, unknown> | null;
  parserWarnings: { unresolved: unknown[]; resolved: unknown[] };
  discardedRows: Array<Record<string, unknown>>;
}

export interface AgreementValidationHookResult {
  isLoading: boolean;
  error: Error | null;
  data: AgreementValidationData | null;
  currentValidation: Record<string, unknown> | null;
  items: Array<Record<string, unknown>>;
  signatures: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
}

export function useCollectiveAgreementValidation(
  input: AgreementValidationReadInput | null,
): AgreementValidationHookResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<AgreementValidationData | null>(null);
  const [currentValidation, setCurrentValidation] = useState<Record<string, unknown> | null>(
    null,
  );
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [signatures, setSignatures] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!input) return;
    setIsLoading(true);
    setError(null);
    try {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: string,
            ) => {
              maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
              order?: (
                c: string,
                opts?: { ascending: boolean },
              ) => Promise<{ data: unknown; error: unknown }>;
            };
          };
        };
      };

      const [
        agreementRes,
        versionRes,
        sourceRes,
        salaryRowsRes,
        rulesRes,
        currentValidationRes,
        historyRes,
      ] = await Promise.all([
        client
          .from('erp_hr_collective_agreements_registry')
          .select('*')
          .eq('id', input.agreementId)
          .maybeSingle(),
        client
          .from('erp_hr_collective_agreements_registry_versions')
          .select('*')
          .eq('id', input.versionId)
          .maybeSingle(),
        client
          .from('erp_hr_collective_agreements_registry_sources')
          .select('*')
          .eq('id', input.sourceId)
          .maybeSingle(),
        (
          client
            .from('erp_hr_collective_agreements_registry_salary_tables')
            .select('*')
            .eq('version_id', input.versionId) as unknown as {
            order: (
              c: string,
              o: { ascending: boolean },
            ) => Promise<{ data: unknown; error: unknown }>;
          }
        ).order('created_at', { ascending: true }),
        client
          .from('erp_hr_collective_agreements_registry_rules')
          .select('*')
          .eq('version_id', input.versionId)
          .maybeSingle(),
        client
          .from('erp_hr_collective_agreement_registry_validations')
          .select('*')
          .eq('version_id', input.versionId)
          .maybeSingle(),
        (
          client
            .from('erp_hr_collective_agreement_registry_validations')
            .select('*')
            .eq('agreement_id', input.agreementId) as unknown as {
            order: (
              c: string,
              o: { ascending: boolean },
            ) => Promise<{ data: unknown; error: unknown }>;
          }
        ).order('created_at', { ascending: false }),
      ]);

      const validationRow = (currentValidationRes?.data as Record<string, unknown> | null) ?? null;

      let itemsRows: Array<Record<string, unknown>> = [];
      let signatureRows: Array<Record<string, unknown>> = [];
      if (validationRow?.id) {
        const validationId = validationRow.id as string;
        const [itemsRes, sigRes] = await Promise.all([
          (
            client
              .from('erp_hr_collective_agreement_registry_validation_items')
              .select('*')
              .eq('validation_id', validationId) as unknown as {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => Promise<{ data: unknown; error: unknown }>;
            }
          ).order('item_key', { ascending: true }),
          (
            client
              .from('erp_hr_collective_agreement_registry_validation_signatures')
              .select('*')
              .eq('validation_id', validationId) as unknown as {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => Promise<{ data: unknown; error: unknown }>;
            }
          ).order('signed_at', { ascending: true }),
        ]);
        itemsRows = (itemsRes?.data as Array<Record<string, unknown>>) ?? [];
        signatureRows = (sigRes?.data as Array<Record<string, unknown>>) ?? [];
      }

      const rulesRow = (rulesRes?.data as Record<string, unknown> | null) ?? null;
      const allSalaryRows =
        (salaryRowsRes?.data as Array<Record<string, unknown>>) ?? [];
      const validRows = allSalaryRows.filter((r) => r.is_discarded !== true);
      const discardedRows = allSalaryRows.filter((r) => r.is_discarded === true);

      const versionRow = (versionRes?.data as Record<string, unknown> | null) ?? null;
      const unresolved =
        (versionRow?.parser_unresolved_warnings as unknown[]) ?? [];
      const resolved = (versionRow?.parser_resolved_warnings as unknown[]) ?? [];

      setData({
        agreement: (agreementRes?.data as Record<string, unknown> | null) ?? null,
        version: versionRow,
        source: (sourceRes?.data as Record<string, unknown> | null) ?? null,
        salaryRows: validRows,
        rules: rulesRow,
        parserWarnings: { unresolved, resolved },
        discardedRows,
      });
      setCurrentValidation(validationRow);
      setItems(itemsRows);
      setSignatures(signatureRows);
      setHistory((historyRes?.data as Array<Record<string, unknown>>) ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [input]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    isLoading,
    error,
    data,
    currentValidation,
    items,
    signatures,
    history,
    lastRefresh,
    refresh,
  };
}

export default useCollectiveAgreementValidation;