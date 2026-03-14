/**
 * useSandboxPersistence — V2-ES.8 Tramo 9
 * Hook for persisting and querying sandbox execution records from DB.
 * Separated from useSandboxEnvironment to keep concerns focused.
 *
 * DISCLAIMER: Sandbox executions are internal preparatory records.
 * They do NOT constitute official submissions or organism validations.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SandboxExecutionRecord } from '@/components/erp/hr/shared/sandboxExecutionService';
import type { SandboxDomain, ConnectorEnvironment } from '@/components/erp/hr/shared/sandboxEnvironmentEngine';

// ─── DB Row Type ────────────────────────────────────────────────────────────

interface SandboxExecutionRow {
  id: string;
  company_id: string;
  domain: string;
  adapter_id: string;
  adapter_name: string;
  legal_entity_id: string | null;
  environment: string;
  submission_type: string;
  reference_period: string | null;
  execution_mode: string;
  payload_snapshot: Record<string, unknown>;
  payload_hash: string;
  status: string;
  result: Record<string, unknown> | null;
  executed_at: string;
  completed_at: string | null;
  executed_by: string;
  duration_ms: number | null;
  related_dry_run_id: string | null;
  related_approval_id: string | null;
  audit_event_ids: string[];
  disclaimers: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export interface SandboxHistoryFilters {
  domain?: SandboxDomain;
  adapterId?: string;
  environment?: ConnectorEnvironment;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function rowToRecord(row: SandboxExecutionRow): SandboxExecutionRecord {
  return {
    id: row.id,
    domain: row.domain as SandboxDomain,
    adapterId: row.adapter_id,
    adapterName: row.adapter_name,
    companyId: row.company_id,
    legalEntityId: row.legal_entity_id,
    environment: row.environment as ConnectorEnvironment,
    submissionType: row.submission_type,
    referencePeriod: row.reference_period,
    executionMode: row.execution_mode as 'advanced_simulation' | 'staged_execution',
    payloadSnapshot: row.payload_snapshot,
    payloadHash: row.payload_hash,
    status: row.status as SandboxExecutionRecord['status'],
    result: row.result as unknown as SandboxExecutionRecord['result'],
    createdAt: row.created_at,
    executedAt: row.executed_at,
    completedAt: row.completed_at,
    executedBy: row.executed_by,
    durationMs: row.duration_ms,
    relatedDryRunId: row.related_dry_run_id,
    relatedApprovalId: row.related_approval_id,
    auditEventIds: row.audit_event_ids || [],
    disclaimers: row.disclaimers || [],
    metadata: row.metadata as SandboxExecutionRecord['metadata'],
  };
}

function recordToRow(record: SandboxExecutionRecord): Partial<SandboxExecutionRow> {
  return {
    id: record.id,
    company_id: record.companyId,
    domain: record.domain,
    adapter_id: record.adapterId,
    adapter_name: record.adapterName,
    legal_entity_id: record.legalEntityId,
    environment: record.environment,
    submission_type: record.submissionType,
    reference_period: record.referencePeriod,
    execution_mode: record.executionMode,
    payload_snapshot: record.payloadSnapshot,
    payload_hash: record.payloadHash,
    status: record.status,
    result: record.result as Record<string, unknown> | null,
    executed_at: record.executedAt,
    completed_at: record.completedAt,
    executed_by: record.executedBy,
    duration_ms: record.durationMs,
    related_dry_run_id: record.relatedDryRunId,
    related_approval_id: record.relatedApprovalId,
    audit_event_ids: record.auditEventIds,
    disclaimers: record.disclaimers,
    metadata: record.metadata as Record<string, unknown>,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSandboxPersistence(companyId: string) {
  const [history, setHistory] = useState<SandboxExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  /** Persist a sandbox execution record to DB */
  const persistRecord = useCallback(async (record: SandboxExecutionRecord): Promise<boolean> => {
    try {
      const row = recordToRow(record);
      const { error } = await supabase
        .from('erp_hr_sandbox_executions' as any)
        .insert(row as any);

      if (error) {
        console.error('[useSandboxPersistence] persist error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[useSandboxPersistence] persist error:', err);
      return false;
    }
  }, []);

  /** Fetch sandbox execution history with filters */
  const fetchHistory = useCallback(async (filters?: SandboxHistoryFilters) => {
    setIsLoading(true);
    try {
      let query = (supabase.from('erp_hr_sandbox_executions' as any) as any)
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('executed_at', { ascending: false });

      if (filters?.domain) query = query.eq('domain', filters.domain);
      if (filters?.adapterId) query = query.eq('adapter_id', filters.adapterId);
      if (filters?.environment) query = query.eq('environment', filters.environment);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.fromDate) query = query.gte('executed_at', filters.fromDate);
      if (filters?.toDate) query = query.lte('executed_at', filters.toDate);

      const limit = filters?.limit || 50;
      query = query.limit(limit);

      const { data, error, count } = await query;

      if (error) {
        console.error('[useSandboxPersistence] fetch error:', error);
        toast.error('Error al cargar historial sandbox');
        return;
      }

      const records = ((data as SandboxExecutionRow[]) || []).map(rowToRecord);
      setHistory(records);
      setTotalCount(count || records.length);
    } catch (err) {
      console.error('[useSandboxPersistence] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  /** Get a single record by ID */
  const getRecord = useCallback(async (id: string): Promise<SandboxExecutionRecord | null> => {
    try {
      const { data, error } = await (supabase.from('erp_hr_sandbox_executions' as any) as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return rowToRecord(data as SandboxExecutionRow);
    } catch {
      return null;
    }
  }, []);

  /** Get latest sandbox execution for a domain/adapter pair */
  const getLatestForDomain = useCallback(async (
    domain: SandboxDomain,
    adapterId?: string
  ): Promise<SandboxExecutionRecord | null> => {
    try {
      let query = (supabase.from('erp_hr_sandbox_executions' as any) as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('domain', domain)
        .order('executed_at', { ascending: false })
        .limit(1);

      if (adapterId) query = query.eq('adapter_id', adapterId);

      const { data, error } = await query;
      if (error || !data || (data as any[]).length === 0) return null;
      return rowToRecord((data as SandboxExecutionRow[])[0]);
    } catch {
      return null;
    }
  }, [companyId]);

  return {
    history,
    isLoading,
    totalCount,
    persistRecord,
    fetchHistory,
    getRecord,
    getLatestForDomain,
  };
}
