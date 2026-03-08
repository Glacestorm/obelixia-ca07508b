import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AuditEntry {
  id: string;
  case_id: string | null;
  company_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  performed_by: string | null;
  performed_at: string;
}

export const AUDIT_ACTIONS: Record<string, { label: string; icon: string }> = {
  proposal_created: { label: 'Propuesta creada', icon: '📝' },
  proposal_issued: { label: 'Propuesta emitida', icon: '📤' },
  proposal_accepted: { label: 'Propuesta aceptada', icon: '✅' },
  proposal_rejected: { label: 'Propuesta rechazada', icon: '❌' },
  workflow_transition: { label: 'Cambio de estado', icon: '🔄' },
  document_uploaded: { label: 'Documento subido', icon: '📎' },
  report_generated: { label: 'Informe generado', icon: '📊' },
  recommendation_generated: { label: 'Recomendación generada', icon: '💡' },
  checklist_updated: { label: 'Checklist actualizado', icon: '☑️' },
  case_created: { label: 'Expediente creado', icon: '📁' },
  case_updated: { label: 'Expediente actualizado', icon: '✏️' },
};

export function useEnergyAuditLog(companyId: string, caseId?: string | null) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('energy_audit_log')
        .select('*')
        .eq('company_id', companyId)
        .order('performed_at', { ascending: false })
        .limit(100);
      if (caseId) query = query.eq('case_id', caseId);
      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as AuditEntry[]);
    } catch (err) {
      console.error('[useEnergyAuditLog] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, caseId]);

  const log = useCallback(async (
    action: string,
    entityType: string,
    entityId?: string | null,
    details?: Record<string, unknown>,
    logCaseId?: string | null,
  ) => {
    if (!user?.id) return;
    try {
      await supabase.from('energy_audit_log').insert([{
        case_id: logCaseId || caseId || null,
        company_id: companyId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || {},
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      }] as any);
    } catch (err) {
      console.error('[useEnergyAuditLog] log error:', err);
    }
  }, [companyId, caseId, user?.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  return { entries, loading, fetchEntries, log };
}
