/**
 * useGaliaBlockchainAudit - Hook for Blockchain Audit Trail
 * 
 * Immutable record of critical decisions via private blockchain.
 * FEDER/LEADER audit compliant.
 * 
 * Features:
 * - SHA-256 chained hashing
 * - Certified timestamps
 * - Verifiable integrity proofs
 * - Export for European audits
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuditBlock {
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  data: {
    expedienteId: string;
    decisionType: string;
    decisionData: Record<string, unknown>;
    performedBy: string;
    signature: string;
  };
  nonce: number;
}

export interface ChainValidation {
  isValid: boolean;
  chainLength: number;
  genesisHash: string;
}

export interface AuditInfo {
  legalReference: string;
  retentionPeriod: string;
  classificationLevel: string;
}

export interface RecordDecisionResult {
  block: AuditBlock;
  chainValidation: ChainValidation;
  auditInfo: AuditInfo;
}

export interface VerificationResult {
  verification: {
    isValid: boolean;
    blocksVerified: number;
    firstBlock: string;
    lastBlock: string;
    hashAlgorithm: string;
  };
  anomalies: Array<{
    blockIndex: number;
    type: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  certificate: {
    verificationId: string;
    verifiedAt: string;
    validUntil: string;
    auditorSignature: string;
  };
}

export interface AuditTrailEvent {
  id: string;
  timestamp: string;
  type: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  action: string;
  details: Record<string, unknown>;
  blockHash: string;
  verified: boolean;
}

export interface AuditTrailResult {
  auditTrail: {
    expedienteId: string;
    period: { from: string; to: string };
    totalEvents: number;
    events: AuditTrailEvent[];
  };
  summary: {
    decisionsCount: number;
    modificationsCount: number;
    lastActivity: string;
    riskFlags: string[];
  };
  exportFormats: string[];
}

export interface ProofResult {
  proof: {
    type: 'merkle' | 'timestamp' | 'integrity' | 'chain';
    targetHash: string;
    proofData: {
      root: string;
      path: string[];
      siblings: string[];
      index: number;
    };
    verificationSteps: Array<{
      step: number;
      operation: string;
      input: string;
      output: string;
    }>;
  };
  certificate: {
    proofId: string;
    generatedAt: string;
    expiresAt: string;
    qrCode: string;
    verificationUrl: string;
  };
}

export interface AnchorResult {
  batch: {
    batchId: string;
    period: { from: string; to: string };
    itemsCount: number;
    merkleRoot: string;
  };
  anchor: {
    blockchainNetwork: string;
    transactionHash: string;
    blockNumber: number;
    timestamp: string;
    gasUsed: number;
  };
  verification: {
    verifyUrl: string;
    explorerUrl: string;
  };
}

export type DecisionType = 'aprobacion' | 'denegacion' | 'subsanacion' | 'pago' | 'resolucion';

export function useGaliaBlockchainAudit() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<AuditBlock | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrailResult | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationResult | null>(null);

  const recordDecision = useCallback(async (
    expedienteId: string,
    decisionType: DecisionType,
    decisionData: Record<string, unknown>
  ): Promise<RecordDecisionResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-blockchain-audit', {
        body: {
          action: 'record_decision',
          expedienteId,
          decisionType,
          decisionData
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.block) {
        setLastBlock(data.data.block);
        toast.success('Decisión registrada en blockchain');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error registrando decisión';
      setError(message);
      toast.error('Error al registrar en blockchain');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyIntegrity = useCallback(async (
    expedienteId?: string,
    blockHash?: string
  ): Promise<VerificationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-blockchain-audit', {
        body: {
          action: 'verify_integrity',
          expedienteId,
          blockHash
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setVerificationStatus(data.data);
        
        if (data.data.verification?.isValid) {
          toast.success('Integridad verificada correctamente');
        } else {
          toast.error('Se detectaron anomalías en la cadena');
        }

        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error verificando integridad';
      setError(message);
      toast.error('Error al verificar integridad');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuditTrail = useCallback(async (
    expedienteId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<AuditTrailResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-blockchain-audit', {
        body: {
          action: 'get_audit_trail',
          expedienteId,
          fromDate,
          toDate
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setAuditTrail(data.data);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error obteniendo pista de auditoría';
      setError(message);
      toast.error('Error al obtener auditoría');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateProof = useCallback(async (
    expedienteId: string,
    blockHash: string
  ): Promise<ProofResult | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-blockchain-audit', {
        body: {
          action: 'generate_proof',
          expedienteId,
          blockHash
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Prueba de integridad generada');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useGaliaBlockchainAudit] generateProof error:', err);
      toast.error('Error al generar prueba');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const anchorBatch = useCallback(async (
    fromDate: string,
    toDate: string
  ): Promise<AnchorResult | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-blockchain-audit', {
        body: {
          action: 'anchor_batch',
          fromDate,
          toDate
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Lote anclado en blockchain pública');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useGaliaBlockchainAudit] anchorBatch error:', err);
      toast.error('Error al anclar lote');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearState = useCallback(() => {
    setLastBlock(null);
    setAuditTrail(null);
    setVerificationStatus(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    lastBlock,
    auditTrail,
    verificationStatus,
    recordDecision,
    verifyIntegrity,
    getAuditTrail,
    generateProof,
    anchorBatch,
    clearState
  };
}

export default useGaliaBlockchainAudit;
