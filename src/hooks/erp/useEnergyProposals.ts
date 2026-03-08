import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EnergyProposal {
  id: string;
  case_id: string;
  customer_id: string | null;
  version: number;
  status: string;
  cups: string | null;
  current_supplier: string | null;
  current_tariff: string | null;
  current_annual_cost: number | null;
  recommended_supplier: string | null;
  recommended_tariff: string | null;
  estimated_annual_cost: number | null;
  estimated_annual_savings: number | null;
  conditions: string | null;
  observations: string | null;
  issued_at: string | null;
  valid_until: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  signed_by: string | null;
  signature_method: string | null;
  pdf_path: string | null;
}

export const PROPOSAL_STATUSES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  issued: { label: 'Emitida', variant: 'secondary' },
  sent: { label: 'Enviada', variant: 'default' },
  accepted: { label: 'Aceptada', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'destructive' },
  expired: { label: 'Caducada', variant: 'destructive' },
};

// Valid proposal state transitions
const PROPOSAL_TRANSITIONS: Record<string, string[]> = {
  draft: ['issued'],
  issued: ['sent', 'accepted', 'rejected', 'expired'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [], // terminal
  rejected: [], // terminal
  expired: ['draft'], // can re-draft from expired
};

function isValidProposalTransition(from: string, to: string): boolean {
  return (PROPOSAL_TRANSITIONS[from] || []).includes(to);
}

export function useEnergyProposals(caseId: string | null) {
  const [proposals, setProposals] = useState<EnergyProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProposals = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('energy_proposals')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });
      if (fetchErr) throw fetchErr;

      // Auto-expire proposals past valid_until
      const now = new Date();
      const fetched = (data || []) as EnergyProposal[];
      const expired: string[] = [];
      for (const p of fetched) {
        if (['issued', 'sent'].includes(p.status) && p.valid_until && new Date(p.valid_until) < now) {
          expired.push(p.id);
          p.status = 'expired';
        }
      }
      // Batch update expired in DB
      if (expired.length > 0) {
        await supabase.from('energy_proposals').update({ status: 'expired', updated_at: now.toISOString() }).in('id', expired);
      }

      setProposals(fetched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar propuestas';
      setError(msg);
      console.error('[useEnergyProposals] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createProposal = useCallback(async (
    values: Partial<EnergyProposal>,
    onAuditLog?: (action: string, entityType: string, entityId?: string | null, details?: Record<string, unknown>) => void
  ) => {
    if (!caseId || !user?.id) {
      toast.error('Debes iniciar sesión');
      return null;
    }

    // Prevent creating new draft if there's an active non-terminal proposal
    const activeProposal = proposals.find(p => ['draft', 'issued', 'sent'].includes(p.status));
    if (activeProposal) {
      toast.error(`Ya existe una propuesta activa (v${activeProposal.version} - ${PROPOSAL_STATUSES[activeProposal.status]?.label}). Resuélvela antes de crear otra.`);
      return null;
    }

    try {
      const nextVersion = proposals.length > 0 ? Math.max(...proposals.map(p => p.version)) + 1 : 1;
      const { data, error: insertErr } = await supabase
        .from('energy_proposals')
        .insert([{
          ...values,
          case_id: caseId,
          version: nextVersion,
          status: 'draft',
          created_by: user.id,
        }] as any)
        .select()
        .single();
      if (insertErr) throw insertErr;
      const proposal = data as EnergyProposal;
      setProposals(prev => [proposal, ...prev]);
      toast.success(`Propuesta v${nextVersion} creada`);
      onAuditLog?.('proposal_created', 'energy_proposals', proposal.id, { version: nextVersion });
      return proposal;
    } catch (err) {
      toast.error('Error al crear propuesta');
      return null;
    }
  }, [caseId, user?.id, proposals]);

  const updateProposal = useCallback(async (id: string, values: Partial<EnergyProposal>) => {
    try {
      const { data, error: updateErr } = await supabase
        .from('energy_proposals')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      const updated = data as EnergyProposal;
      setProposals(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err) {
      toast.error('Error al actualizar propuesta');
      return null;
    }
  }, []);

  const changeStatus = useCallback(async (
    id: string,
    newStatus: string,
    extraFields: Partial<EnergyProposal> = {},
    onAuditLog?: (action: string, entityType: string, entityId?: string | null, details?: Record<string, unknown>) => void
  ) => {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) { toast.error('Propuesta no encontrada'); return null; }

    if (!isValidProposalTransition(proposal.status, newStatus)) {
      toast.error(`Transición no permitida: ${PROPOSAL_STATUSES[proposal.status]?.label} → ${PROPOSAL_STATUSES[newStatus]?.label}`);
      return null;
    }

    const result = await updateProposal(id, { status: newStatus, ...extraFields } as any);
    if (result) {
      const actionMap: Record<string, string> = {
        issued: 'proposal_issued',
        accepted: 'proposal_accepted',
        rejected: 'proposal_rejected',
      };
      const auditAction = actionMap[newStatus] || `proposal_${newStatus}`;
      onAuditLog?.(auditAction, 'energy_proposals', id, { from: proposal.status, to: newStatus });
      toast.success(`Propuesta ${PROPOSAL_STATUSES[newStatus]?.label || newStatus}`);
    }
    return result;
  }, [proposals, updateProposal]);

  const acceptProposal = useCallback(async (
    id: string,
    observations?: string,
    onAuditLog?: (action: string, entityType: string, entityId?: string | null, details?: Record<string, unknown>) => void
  ) => {
    if (!user?.id) return null;
    return changeStatus(id, 'accepted', {
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
      observations: observations || undefined,
    } as any, onAuditLog);
  }, [user?.id, changeStatus]);

  const rejectProposal = useCallback(async (
    id: string,
    reason: string,
    onAuditLog?: (action: string, entityType: string, entityId?: string | null, details?: Record<string, unknown>) => void
  ) => {
    return changeStatus(id, 'rejected', {
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    } as any, onAuditLog);
  }, [changeStatus]);

  const issueProposal = useCallback(async (
    id: string,
    validDays = 30,
    onAuditLog?: (action: string, entityType: string, entityId?: string | null, details?: Record<string, unknown>) => void
  ) => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);
    return changeStatus(id, 'issued', {
      issued_at: new Date().toISOString(),
      valid_until: validUntil.toISOString(),
    } as any, onAuditLog);
  }, [changeStatus]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const latestProposal = proposals.length > 0 ? proposals[0] : null;

  return {
    proposals, loading, error, latestProposal,
    fetchProposals, createProposal, updateProposal,
    acceptProposal, rejectProposal, issueProposal,
  };
}
