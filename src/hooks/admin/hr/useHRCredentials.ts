/**
 * Hook: useHRCredentials
 * Gestión de credenciales digitales verificables para empleados
 * Fase 5: Credenciales Blockchain y Copilotos IA Autónomos
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface CredentialSubject {
  id: string;
  name: string;
  claims: Record<string, unknown>;
}

export interface BlockchainRecord {
  network: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

export interface DigitalCredential {
  id: string;
  type: string;
  title?: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string | null;
  credentialSubject: CredentialSubject;
  proof: CredentialProof;
  status?: 'active' | 'expired' | 'revoked';
  badgeIcon?: string;
}

export interface IssuedCredential {
  credential: DigitalCredential;
  verificationUrl: string;
  qrCodeData: string;
  blockchain: BlockchainRecord;
}

export interface VerificationResult {
  verified: boolean;
  status: 'valid' | 'expired' | 'revoked' | 'invalid';
  checks: {
    signature: { passed: boolean; details: string };
    revocation: { passed: boolean; details: string };
    expiration: { passed: boolean; details: string };
    issuer: { passed: boolean; details: string };
  };
  credential: {
    type: string;
    subject: string;
    issuedAt: string;
    expiresAt?: string;
  };
  verifiedAt: string;
}

export interface SelectiveProof {
  proof: {
    id: string;
    type: string;
    credentialId: string;
    disclosedClaims: Record<string, unknown>;
    hiddenClaims: string[];
    proofValue: string;
    validUntil: string;
    singleUse: boolean;
  };
  shareableLink: string;
  qrCodeData: string;
  instructions: string;
}

export interface AuditEntry {
  timestamp: string;
  action: 'issued' | 'verified' | 'shared' | 'revoked';
  actor: string;
  details: string;
  ipAddress?: string;
  txHash?: string;
}

export interface CredentialsList {
  credentials: DigitalCredential[];
  summary: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
  };
  recommendations: string[];
}

export type CredentialType = 
  | 'employment' 
  | 'training' 
  | 'skills' 
  | 'compliance' 
  | 'performance' 
  | 'safety';

// === HOOK ===

export function useHRCredentials() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<DigitalCredential[]>([]);
  const [issuedCredential, setIssuedCredential] = useState<IssuedCredential | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [selectiveProof, setSelectiveProof] = useState<SelectiveProof | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);

  // === ISSUE CREDENTIAL ===
  const issueCredential = useCallback(async (
    credentialType: CredentialType,
    employeeId: string,
    credentialData: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-credentials-agent',
        {
          body: {
            action: 'issue_credential',
            credentialType,
            employeeId,
            credentialData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setIssuedCredential(data.data);
        toast.success('Credencial emitida y registrada en blockchain');
        return data.data as IssuedCredential;
      }

      throw new Error('Error al emitir credencial');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFY CREDENTIAL ===
  const verifyCredential = useCallback(async (
    credentialId: string,
    verificationCode?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-credentials-agent',
        {
          body: {
            action: 'verify_credential',
            credentialId,
            verificationCode
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setVerificationResult(data.data);
        if (data.data.verified) {
          toast.success('Credencial verificada correctamente');
        } else {
          toast.warning(`Credencial no válida: ${data.data.status}`);
        }
        return data.data as VerificationResult;
      }

      throw new Error('Error al verificar credencial');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === REVOKE CREDENTIAL ===
  const revokeCredential = useCallback(async (
    credentialId: string,
    reason: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-credentials-agent',
        {
          body: {
            action: 'revoke_credential',
            credentialId,
            credentialData: { reason }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.revoked) {
        toast.success('Credencial revocada correctamente');
        return data.data;
      }

      throw new Error('Error al revocar credencial');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === LIST CREDENTIALS ===
  const listCredentials = useCallback(async (employeeId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-credentials-agent',
        {
          body: {
            action: 'list_credentials',
            employeeId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as CredentialsList;
        setCredentials(result.credentials || []);
        return result;
      }

      throw new Error('Error al listar credenciales');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE SELECTIVE PROOF ===
  const generateSelectiveProof = useCallback(async (
    credentialId: string,
    disclosedFields: string[],
    hiddenFields: string[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-credentials-agent',
        {
          body: {
            action: 'generate_proof',
            credentialId,
            credentialData: { disclosedFields, hiddenFields }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setSelectiveProof(data.data);
        toast.success('Prueba selectiva generada');
        return data.data as SelectiveProof;
      }

      throw new Error('Error al generar prueba');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET AUDIT TRAIL ===
  const getAuditTrail = useCallback(async (credentialId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-credentials-agent',
        {
          body: {
            action: 'audit_trail',
            credentialId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setAuditTrail(data.data.auditTrail || []);
        return data.data;
      }

      throw new Error('Error al obtener auditoría');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    credentials,
    issuedCredential,
    verificationResult,
    selectiveProof,
    auditTrail,
    // Actions
    issueCredential,
    verifyCredential,
    revokeCredential,
    listCredentials,
    generateSelectiveProof,
    getAuditTrail,
  };
}

export default useHRCredentials;
