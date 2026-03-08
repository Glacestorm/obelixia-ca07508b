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
}

export const PROPOSAL_STATUSES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  issued: { label: 'Emitida', variant: 'secondary' },
  sent: { label: 'Enviada', variant: 'default' },
  accepted: { label: 'Aceptada', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'destructive' },
  expired: { label: 'Caducada', variant: 'destructive' },
};

export function useEnergyProposals(caseId: string | null) {
  const [proposals, setProposals] = useState<EnergyProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchProposals = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_proposals')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });
      if (error) throw error;
      setProposals((data || []) as EnergyProposal[]);
    } catch (err) {
      console.error('[useEnergyProposals] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createProposal = useCallback(async (values: Partial<EnergyProposal>) => {
    if (!caseId || !user?.id) return null;
    try {
      const nextVersion = proposals.length > 0 ? Math.max(...proposals.map(p => p.version)) + 1 : 1;
      const { data, error } = await supabase
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
      if (error) throw error;
      const proposal = data as EnergyProposal;
      setProposals(prev => [proposal, ...prev]);
      toast.success(`Propuesta v${nextVersion} creada`);
      return proposal;
    } catch (err) {
      toast.error('Error al crear propuesta');
      return null;
    }
  }, [caseId, user?.id, proposals]);

  const updateProposal = useCallback(async (id: string, values: Partial<EnergyProposal>) => {
    try {
      const { data, error } = await supabase
        .from('energy_proposals')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as EnergyProposal;
      setProposals(prev => prev.map(p => p.id === id ? updated : p));
      toast.success('Propuesta actualizada');
      return updated;
    } catch (err) {
      toast.error('Error al actualizar propuesta');
      return null;
    }
  }, []);

  const acceptProposal = useCallback(async (id: string, observations?: string) => {
    if (!user?.id) return null;
    return updateProposal(id, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
      observations: observations || undefined,
    } as any);
  }, [user?.id, updateProposal]);

  const rejectProposal = useCallback(async (id: string, reason: string) => {
    return updateProposal(id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    } as any);
  }, [updateProposal]);

  const issueProposal = useCallback(async (id: string, validDays = 30) => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);
    return updateProposal(id, {
      status: 'issued',
      issued_at: new Date().toISOString(),
      valid_until: validUntil.toISOString(),
    } as any);
  }, [updateProposal]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const latestProposal = proposals.length > 0 ? proposals[0] : null;

  return {
    proposals, loading, latestProposal,
    fetchProposals, createProposal, updateProposal,
    acceptProposal, rejectProposal, issueProposal,
  };
}
