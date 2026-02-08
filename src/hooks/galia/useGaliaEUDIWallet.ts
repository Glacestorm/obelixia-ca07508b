/**
 * useGaliaEUDIWallet - Hook for eIDAS 2.0 / EUDI Wallet Integration
 * 
 * Provides European Digital Identity Wallet verification capabilities:
 * - Person Identification Data (PID) verification
 * - Mobile Driving License (mDL) validation
 * - Qualified Electronic Attestation of Attributes (QEAA)
 * - OpenID4VP presentation verification
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PresentationRequest {
  id: string;
  type: string;
  responseType: string;
  clientId: string;
  redirectUri: string;
  nonce: string;
  state: string;
  presentationDefinition: {
    id: string;
    inputDescriptors: Array<{
      id: string;
      name: string;
      purpose: string;
      constraints: Record<string, unknown>;
    }>;
  };
}

export interface VerificationResult {
  verified: boolean;
  credentialId: string;
  issuer: {
    did: string;
    name: string;
    country: string;
    trustLevel: 'qualified' | 'trusted' | 'unknown';
  };
  subject: {
    claims: Record<string, unknown>;
    assuranceLevel: 'low' | 'substantial' | 'high';
  };
  validations: {
    signatureValid: boolean;
    chainValid: boolean;
    notRevoked: boolean;
    notExpired: boolean;
  };
  issuanceDate: string;
  expirationDate: string;
  warnings: string[];
  errors: string[];
}

export interface RevocationStatus {
  credentialId: string;
  status: 'valid' | 'revoked' | 'suspended' | 'unknown';
  statusListCredential: string;
  statusListIndex: string;
  lastChecked: string;
  nextUpdate: string;
  reason: string | null;
}

export type CredentialType = 'PID' | 'mDL' | 'QEAA' | 'EAA';

export function useGaliaEUDIWallet() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presentationRequest, setPresentationRequest] = useState<PresentationRequest | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const requestCredential = useCallback(async (
    credentialType: CredentialType = 'PID',
    requiredClaims?: string[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eudi-wallet', {
        body: {
          action: 'request_credential',
          credentialType,
          requiredClaims,
          nonce: crypto.randomUUID(),
          verifierDID: 'did:web:galia.gob.es'
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.presentationRequest) {
        setPresentationRequest(data.data.presentationRequest);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error solicitando credencial';
      setError(message);
      toast.error('Error al solicitar credencial EUDI');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyPresentation = useCallback(async (
    presentationId: string,
    holderDID: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eudi-wallet', {
        body: {
          action: 'verify_presentation',
          presentationId,
          holderDID
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setVerificationResult(data.data);
        
        if (data.data.verified) {
          toast.success('Credencial verificada correctamente');
        } else {
          toast.warning('La credencial no pudo ser verificada');
        }

        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error verificando presentación';
      setError(message);
      toast.error('Error al verificar credencial');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkRevocation = useCallback(async (
    credentialId: string
  ): Promise<RevocationStatus | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eudi-wallet', {
        body: {
          action: 'check_revocation',
          presentationId: credentialId
        }
      });

      if (fnError) throw fnError;

      return data?.data || null;
    } catch (err) {
      console.error('[useGaliaEUDIWallet] checkRevocation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPresentationRequest = useCallback(async (
    credentialType: CredentialType,
    requiredClaims: string[]
  ) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-eudi-wallet', {
        body: {
          action: 'create_presentation_request',
          credentialType,
          requiredClaims
        }
      });

      if (fnError) throw fnError;

      return data?.data || null;
    } catch (err) {
      console.error('[useGaliaEUDIWallet] createPresentationRequest error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearState = useCallback(() => {
    setPresentationRequest(null);
    setVerificationResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    presentationRequest,
    verificationResult,
    requestCredential,
    verifyPresentation,
    checkRevocation,
    createPresentationRequest,
    clearState
  };
}

export default useGaliaEUDIWallet;
