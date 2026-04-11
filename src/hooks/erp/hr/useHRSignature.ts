/**
 * useHRSignature — HR Signature hook reutilizing energy-signature-provider
 * LM1+LM2: Wraps existing Signaturit/internal signature for HR official artifacts
 *
 * - requestSignature(): invoke edge function for signing
 * - checkSignatureStatus(): poll signature status
 * - Fallback to internal signature if SIGNATURIT_TOKEN unavailable
 * - Creates evidence + ledger entries on completion
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignatureRequest {
  artifactId: string;
  submissionId?: string;
  documentName: string;
  documentBase64?: string;
  signerName: string;
  signerEmail: string;
  organism?: string;
}

export interface SignatureResult {
  success: boolean;
  signatureId?: string;
  provider?: 'signaturit' | 'internal';
  status?: string;
  error?: string;
}

export interface SignatureStatus {
  id: string;
  status: 'pending' | 'signed' | 'declined' | 'expired' | 'error';
  provider: string;
  signedAt?: string;
  documentUrl?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHRSignature(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const requestSignature = useCallback(async (
    request: SignatureRequest
  ): Promise<SignatureResult> => {
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }

    setIsLoading(true);
    try {
      // Invoke the existing energy-signature-provider edge function
      const { data, error } = await supabase.functions.invoke('energy-signature-provider', {
        body: {
          action: 'request_signature',
          provider: 'signaturit', // will fallback to internal if token missing
          documentName: request.documentName,
          documentBase64: request.documentBase64 || null,
          signerName: request.signerName,
          signerEmail: request.signerEmail,
          metadata: {
            source: 'hr_official',
            companyId,
            artifactId: request.artifactId,
            submissionId: request.submissionId,
            organism: request.organism,
          },
        },
      });

      if (error) {
        console.error('[useHRSignature] edge function error:', error);
        // Fallback to internal signature
        return await requestInternalSignature(request);
      }

      if (data?.success) {
        // Record evidence via ledger
        await recordSignatureEvidence(request, data.signatureId || data.id, data.provider || 'signaturit');
        
        toast.success('Firma solicitada correctamente');
        return {
          success: true,
          signatureId: data.signatureId || data.id,
          provider: data.provider || 'signaturit',
          status: 'pending',
        };
      }

      // If signaturit not available, fallback
      if (data?.error?.includes('not configured') || data?.error?.includes('SIGNATURIT')) {
        return await requestInternalSignature(request);
      }

      return { success: false, error: data?.error || 'Error desconocido en firma' };
    } catch (err) {
      console.error('[useHRSignature] unexpected error:', err);
      return await requestInternalSignature(request);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user]);

  const requestInternalSignature = useCallback(async (
    request: SignatureRequest
  ): Promise<SignatureResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('energy-signature-provider', {
        body: {
          action: 'request_signature',
          provider: 'internal',
          documentName: request.documentName,
          signerName: request.signerName,
          signerEmail: request.signerEmail,
          metadata: {
            source: 'hr_official',
            companyId,
            artifactId: request.artifactId,
            organism: request.organism,
          },
        },
      });

      if (error) {
        return { success: false, error: 'Error en firma interna' };
      }

      await recordSignatureEvidence(request, data?.signatureId || data?.id, 'internal');

      toast.success('Firma interna aplicada');
      return {
        success: true,
        signatureId: data?.signatureId || data?.id,
        provider: 'internal',
        status: 'signed',
      };
    } catch {
      return { success: false, error: 'Error inesperado en firma interna' };
    }
  }, [companyId]);

  const checkSignatureStatus = useCallback(async (
    signatureId: string
  ): Promise<SignatureStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('energy-signature-provider', {
        body: {
          action: 'check_status',
          signatureId,
        },
      });

      if (error || !data) return null;

      return {
        id: signatureId,
        status: data.status || 'pending',
        provider: data.provider || 'unknown',
        signedAt: data.signedAt,
        documentUrl: data.documentUrl,
      };
    } catch {
      return null;
    }
  }, []);

  const recordSignatureEvidence = useCallback(async (
    request: SignatureRequest,
    signatureId: string | undefined,
    provider: string
  ) => {
    try {
      await (supabase as any)
        .from('erp_hr_evidence')
        .insert({
          company_id: companyId,
          evidence_type: 'digital_signature',
          evidence_label: `Firma ${provider} - ${request.documentName}`,
          ref_entity_type: 'official_artifact',
          ref_entity_id: request.artifactId,
          evidence_snapshot: {
            signatureId,
            provider,
            signerName: request.signerName,
            signerEmail: request.signerEmail,
            organism: request.organism,
            timestamp: new Date().toISOString(),
          },
          captured_by: user?.id,
          metadata: {
            process: 'official_signature',
            provider,
            organism: request.organism,
          },
        });
    } catch (err) {
      console.error('[useHRSignature] evidence recording error (non-blocking):', err);
    }
  }, [companyId, user]);

  return {
    requestSignature,
    checkSignatureStatus,
    isLoading,
  };
}
