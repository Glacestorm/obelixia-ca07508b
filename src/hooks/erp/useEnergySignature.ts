import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EnergySignature {
  id: string;
  proposal_id: string;
  case_id: string;
  signer_name: string;
  signer_email: string | null;
  signer_nif: string | null;
  signature_type: 'simple' | 'advanced' | 'qualified';
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'rejected' | 'expired' | 'cancelled' | 'error';
  provider: string;
  provider_reference: string | null;
  provider_envelope_id: string | null;
  requested_at: string;
  signed_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  expiry_date: string | null;
  ip_address: string | null;
  evidence_hash: string | null;
  evidence_pdf_path: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SignatureProvider = 'internal' | 'docusign' | 'signaturit' | 'vidchain';

const SIGNATURE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  sent: 'Enviada',
  viewed: 'Visualizada',
  signed: 'Firmada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
  error: 'Error',
};

export function useEnergySignature(proposalId: string | null) {
  const [signatures, setSignatures] = useState<EnergySignature[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchSignatures = useCallback(async () => {
    if (!proposalId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_signatures')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      setSignatures((data || []) as unknown as EnergySignature[]);
    } catch (err) {
      console.error('[useEnergySignature] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  const requestSignature = useCallback(async (params: {
    caseId: string;
    signerName: string;
    signerEmail?: string;
    signerNif?: string;
    signatureType?: 'simple' | 'advanced' | 'qualified';
    provider?: SignatureProvider;
    expiryDays?: number;
  }) => {
    if (!proposalId || !user?.id) {
      toast.error('Datos insuficientes para solicitar firma');
      return null;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (params.expiryDays || 30));

    try {
      const { data, error } = await supabase
        .from('energy_signatures')
        .insert([{
          proposal_id: proposalId,
          case_id: params.caseId,
          signer_name: params.signerName,
          signer_email: params.signerEmail || null,
          signer_nif: params.signerNif || null,
          signature_type: params.signatureType || 'simple',
          status: 'pending',
          provider: params.provider || 'internal',
          expiry_date: expiryDate.toISOString(),
          created_by: user.id,
          metadata: {
            requested_by_name: user.email,
            requested_at: new Date().toISOString(),
          },
        }] as any)
        .select()
        .single();

      if (error) throw error;
      const sig = data as unknown as EnergySignature;
      setSignatures(prev => [sig, ...prev]);
      toast.success('Solicitud de firma creada');
      return sig;
    } catch (err) {
      console.error('[useEnergySignature] request error:', err);
      toast.error('Error al solicitar firma');
      return null;
    }
  }, [proposalId, user]);

  const updateSignatureStatus = useCallback(async (
    signatureId: string,
    newStatus: EnergySignature['status'],
    extras: Partial<EnergySignature> = {}
  ) => {
    try {
      const timestampField = newStatus === 'signed' ? { signed_at: new Date().toISOString() }
        : newStatus === 'rejected' ? { rejected_at: new Date().toISOString() }
        : newStatus === 'expired' ? { expired_at: new Date().toISOString() }
        : {};

      const { error } = await supabase
        .from('energy_signatures')
        .update({
          status: newStatus,
          ...timestampField,
          ...extras,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', signatureId);

      if (error) throw error;

      setSignatures(prev => prev.map(s =>
        s.id === signatureId ? { ...s, status: newStatus, ...timestampField, ...extras } : s
      ));

      toast.success(`Firma: ${SIGNATURE_STATUS_LABELS[newStatus]}`);
      return true;
    } catch (err) {
      console.error('[useEnergySignature] update error:', err);
      toast.error('Error al actualizar firma');
      return false;
    }
  }, []);

  /** Simple internal signature: records acceptance with IP and timestamp */
  const signSimple = useCallback(async (signatureId: string) => {
    return updateSignatureStatus(signatureId, 'signed', {
      signed_at: new Date().toISOString(),
      ip_address: 'client',
      evidence_hash: btoa(`signed-${signatureId}-${Date.now()}`),
      metadata: { method: 'simple_acceptance', timestamp: new Date().toISOString() },
    } as any);
  }, [updateSignatureStatus]);

  const cancelSignature = useCallback(async (signatureId: string) => {
    return updateSignatureStatus(signatureId, 'cancelled');
  }, [updateSignatureStatus]);

  const latestSignature = signatures[0] || null;
  const hasSigned = signatures.some(s => s.status === 'signed');

  useEffect(() => { fetchSignatures(); }, [fetchSignatures]);

  return {
    signatures, loading, latestSignature, hasSigned,
    fetchSignatures, requestSignature, updateSignatureStatus,
    signSimple, cancelSignature,
    SIGNATURE_STATUS_LABELS,
  };
}
