/**
 * useHRBridge — Hook for cross-module bridge operations
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BridgeLogRow {
  id: string;
  company_id: string;
  bridge_type: string;
  source_module: string;
  target_module: string;
  source_record_id: string | null;
  payload_snapshot: Record<string, unknown>;
  status: string;
  error_message: string | null;
  retry_count: number;
  processed_at: string | null;
  approved_by: string | null;
  created_at: string;
}

export interface BridgeApprovalRow {
  id: string;
  bridge_log_id: string;
  approval_type: string;
  status: string;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
}

export function useHRBridge(companyId: string | undefined) {
  const [logs, setLogs] = useState<BridgeLogRow[]>([]);
  const [approvals, setApprovals] = useState<BridgeApprovalRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async (filters?: { status?: string; bridge_type?: string }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_bridge_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.bridge_type) query = query.eq('bridge_type', filters.bridge_type);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as unknown as BridgeLogRow[]);
    } catch (err) {
      if (import.meta.env.DEV) { console.error('[HR] Error:', err); }
      toast.error('Error cargando registros bridge');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchApprovals = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('erp_hr_bridge_approvals')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovals((data || []) as unknown as BridgeApprovalRow[]);
    } catch (err) {
      if (import.meta.env.DEV) { console.error('[HR] Error:', err); }
    }
  }, [companyId]);

  const triggerSync = useCallback(async (bridgeType: string, sourceRecordId: string, payload: Record<string, unknown>) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase.functions.invoke('payroll-cross-module-bridge', {
        body: {
          action: 'sync',
          company_id: companyId,
          bridge_type: bridgeType,
          source_record_id: sourceRecordId,
          payload,
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success('Sincronización iniciada');
        await fetchLogs();
        return data;
      }
      throw new Error(data?.error || 'Error desconocido');
    } catch (err) {
      toast.error('Error al sincronizar');
      if (import.meta.env.DEV) { console.error('[HR] Error:', err); }
      return null;
    }
  }, [companyId, fetchLogs]);

  const approveItem = useCallback(async (approvalId: string, approved: boolean, comments?: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_bridge_approvals')
        .update({
          status: approved ? 'approved' : 'rejected',
          comments: comments || null,
          decided_at: new Date().toISOString(),
        } as any)
        .eq('id', approvalId);

      if (error) throw error;
      toast.success(approved ? 'Aprobado' : 'Rechazado');
      await fetchApprovals();
      return true;
    } catch (err) {
      toast.error('Error al procesar aprobación');
      return false;
    }
  }, [fetchApprovals]);

  return {
    logs,
    approvals,
    isLoading,
    fetchLogs,
    fetchApprovals,
    triggerSync,
    approveItem,
  };
}
