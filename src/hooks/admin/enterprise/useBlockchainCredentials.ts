/**
 * useBlockchainCredentials Hook
 * Phase 9: Verifiable credentials, EBSI integration, and immutable employment history
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface VerifiableCredential {
  credential: {
    id: string;
    type: string[];
    issuer: {
      id: string;
      name: string;
    };
    issuanceDate: string;
    expirationDate?: string;
    credentialSubject: {
      id: string;
      name: string;
      achievement: {
        type: string;
        name: string;
        description: string;
        criteria: string;
      };
    };
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  blockchainRecord: {
    transactionHash: string;
    blockNumber: number;
    network: string;
    timestamp: string;
    status: string;
  };
  qrCode?: string;
  verificationUrl?: string;
}

export interface CredentialVerification {
  verification: {
    credentialId: string;
    status: 'valid' | 'invalid' | 'revoked' | 'expired' | 'pending';
    verifiedAt: string;
    verificationMethod: string;
  };
  checks: Array<{
    check: string;
    result: 'passed' | 'failed' | 'warning';
    details: string;
  }>;
  issuerVerification: {
    issuerDID: string;
    issuerName: string;
    issuerStatus: 'trusted' | 'unknown' | 'revoked';
    registryCheck: boolean;
  };
  blockchainProof: {
    found: boolean;
    transactionHash: string;
    blockNumber: number;
    confirmations: number;
  };
  confidence: number;
}

export interface EmploymentHistory {
  employmentHistory: {
    subjectDID: string;
    subjectName: string;
    totalVerifiedExperience: {
      years: number;
      months: number;
    };
    lastUpdated: string;
  };
  employmentRecords: Array<{
    id: string;
    employer: {
      name: string;
      did: string;
      verified: boolean;
    };
    position: string;
    department: string;
    startDate: string;
    endDate?: string;
    duration: {
      years: number;
      months: number;
    };
    verificationStatus: 'verified' | 'pending' | 'unverified';
    credentialId?: string;
    skills: string[];
    achievements: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId: string;
    status: 'valid' | 'expired';
  }>;
  verificationSummary: {
    totalRecords: number;
    verified: number;
    pending: number;
    unverified: number;
    trustScore: number;
  };
}

export interface DIDDocument {
  did: string;
  entityType: string;
  entityId: string;
  created: string;
  method: string;
  keyPair: {
    type: string;
    publicKeyMultibase: string;
    controller: string;
  };
  services: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

export interface EBSIStatus {
  ebsiStatus: {
    connected: boolean;
    network: string;
    version: string;
    lastSync: string;
  };
  capabilities: {
    credentialIssuance: boolean;
    credentialVerification: boolean;
    trustedIssuerRegistry: boolean;
    timestamping: boolean;
    didRegistry: boolean;
  };
  registries: {
    trustedIssuers: {
      registered: boolean;
      status: string;
    };
    trustedSchemas: {
      available: string[];
    };
  };
  compliance: {
    eIDAS: boolean;
    GDPR: boolean;
    W3C_DID: boolean;
    W3C_VC: boolean;
  };
  metrics: {
    credentialsIssued: number;
    verificationsProcessed: number;
    averageVerificationTime: string;
    uptime: string;
  };
}

export interface CredentialAudit {
  audit: {
    auditId: string;
    period: {
      from: string;
      to: string;
    };
    scope: string;
    auditor: string;
  };
  statistics: {
    totalCredentials: number;
    issued: number;
    verified: number;
    revoked: number;
    expired: number;
  };
  findings: Array<{
    severity: 'info' | 'warning' | 'critical';
    category: string;
    description: string;
    affectedCredentials: number;
    recommendation: string;
  }>;
  compliance: {
    eIDAS: boolean;
    GDPR: boolean;
    W3C_VC: boolean;
    EBSI: boolean;
    overallScore: number;
  };
  recommendations: string[];
}

// === HOOK ===
export function useBlockchainCredentials() {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory | null>(null);
  const [ebsiStatus, setEbsiStatus] = useState<EBSIStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === ISSUE CREDENTIAL ===
  const issueCredential = useCallback(async (credentialData: Record<string, unknown>): Promise<VerifiableCredential | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'issue_credential',
            params: credentialData
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        const newCredential = fnData.data as VerifiableCredential;
        setCredentials(prev => [...prev, newCredential]);
        toast.success('Credencial emitida correctamente');
        return newCredential;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useBlockchainCredentials] issueCredential error:', err);
      toast.error('Error al emitir credencial');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFY CREDENTIAL ===
  const verifyCredential = useCallback(async (credentialId: string): Promise<CredentialVerification | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'verify_credential',
            params: { credentialId }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        toast.success('Credencial verificada');
        return fnData.data as CredentialVerification;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useBlockchainCredentials] verifyCredential error:', err);
      toast.error('Error al verificar credencial');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === REVOKE CREDENTIAL ===
  const revokeCredential = useCallback(async (credentialId: string, reason: string) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'revoke_credential',
            params: { credentialId, reason }
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Credencial revocada');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] revokeCredential error:', err);
      toast.error('Error al revocar credencial');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET EMPLOYMENT HISTORY ===
  const getEmploymentHistory = useCallback(async (subjectDID: string): Promise<EmploymentHistory | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'get_employment_history',
            params: { subjectDID }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        const history = fnData.data as EmploymentHistory;
        setEmploymentHistory(history);
        return history;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useBlockchainCredentials] getEmploymentHistory error:', err);
      toast.error('Error al obtener historial laboral');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === REGISTER CERTIFICATION ===
  const registerCertification = useCallback(async (certificationData: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'register_certification',
            params: certificationData
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Certificación registrada');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] registerCertification error:', err);
      toast.error('Error al registrar certificación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFY EMPLOYMENT ===
  const verifyEmployment = useCallback(async (employeeId: string, employerId: string) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'verify_employment',
            params: { employeeId, employerId }
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Empleo verificado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] verifyEmployment error:', err);
      toast.error('Error al verificar empleo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE DID ===
  const generateDID = useCallback(async (entityType: string, entityId: string): Promise<DIDDocument | null> => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'generate_did',
            params: { entityType, entityId }
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('DID generado');
        return fnData.data as DIDDocument;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] generateDID error:', err);
      toast.error('Error al generar DID');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SIGN DOCUMENT ===
  const signDocument = useCallback(async (documentData: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'sign_document',
            params: documentData
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Documento firmado');
        return fnData.data;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] signDocument error:', err);
      toast.error('Error al firmar documento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === AUDIT CREDENTIALS ===
  const auditCredentials = useCallback(async (scope?: Record<string, unknown>): Promise<CredentialAudit | null> => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'audit_credentials',
            params: scope
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        toast.success('Auditoría completada');
        return fnData.data as CredentialAudit;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] auditCredentials error:', err);
      toast.error('Error en auditoría');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET EBSI STATUS ===
  const getEBSIStatus = useCallback(async (): Promise<EBSIStatus | null> => {
    setIsLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'blockchain-credentials',
        {
          body: {
            action: 'ebsi_integration_status'
          }
        }
      );

      if (fnError) throw fnError;
      if (fnData?.success) {
        const status = fnData.data as EBSIStatus;
        setEbsiStatus(status);
        return status;
      }
      return null;
    } catch (err) {
      console.error('[useBlockchainCredentials] getEBSIStatus error:', err);
      toast.error('Error al obtener estado EBSI');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    credentials,
    employmentHistory,
    ebsiStatus,
    error,
    issueCredential,
    verifyCredential,
    revokeCredential,
    getEmploymentHistory,
    registerCertification,
    verifyEmployment,
    generateDID,
    signDocument,
    auditCredentials,
    getEBSIStatus,
  };
}

export default useBlockchainCredentials;
