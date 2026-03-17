/**
 * useOfficialArtifacts — V2-RRHH-P2
 * Hook for generating, validating, and tracing official artifacts (AFI, FAN).
 * Orchestrates: artifact engine → validation → ledger → evidence → version registry.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  buildAFIAlta, buildAFIBaja, buildAFIVariacion,
  promoteAFIStatus, serializeAFIForSnapshot,
  type AFIArtifact, type AFIAltaSubtype, type AFIBajaSubtype,
  type AFIVariacionSubtype, type AFIWorkerData, type AFIEmployerData,
  type AFIContractData, type AFIBajaDetails, type AFIVariacionChange,
  type AFIArtifactStatus,
} from '@/engines/erp/hr/afiArtifactEngine';
import {
  buildFANCotizacion, buildFANEmployeeRecord, promoteFANStatus,
  serializeFANForSnapshot,
  type FANCotizacionArtifact, type FANArtifactStatus,
} from '@/engines/erp/hr/fanCotizacionArtifactEngine';
import {
  validateAFIPrerequisites, validateFANPrerequisites,
  type ArtifactPreValidation,
} from '@/engines/erp/hr/officialArtifactValidationEngine';
import type { SSContributionBreakdown } from '@/engines/erp/hr/ssContributionEngine';
import { buildLedgerRow, type LedgerEventInput } from '@/engines/erp/hr/ledgerEngine';
import { buildEvidenceRow, type EvidenceInput } from '@/engines/erp/hr/evidenceEngine';
import { logAuditEvent } from '@/lib/security/auditLogger';

// ── Types ──

export interface OfficialArtifactRecord {
  type: 'afi' | 'fan';
  artifact: AFIArtifact | FANCotizacionArtifact;
  preValidation: ArtifactPreValidation | null;
  ledgerEventId: string | null;
  evidenceId: string | null;
  generatedAt: string;
}

interface UseOfficialArtifactsReturn {
  isGenerating: boolean;
  lastArtifact: OfficialArtifactRecord | null;
  artifacts: OfficialArtifactRecord[];

  // Pre-validation
  validateAFI: (params: {
    worker: Partial<AFIWorkerData>;
    employer: Partial<AFIEmployerData>;
    contract: Partial<AFIContractData>;
    actionType: 'alta' | 'baja' | 'variacion';
  }) => ArtifactPreValidation;

  validateFAN: (params: {
    companyCCC: string;
    companyCIF: string;
    employeeCount: number;
    allHaveNAF: boolean;
    allHaveGrupo: boolean;
    allHaveSSData: boolean;
    periodYear: number;
    periodMonth: number;
    payrollClosed: boolean;
  }) => ArtifactPreValidation;

  // Generation
  generateAFIAlta: (params: {
    worker: AFIWorkerData;
    employer: AFIEmployerData;
    contract: AFIContractData;
    subtype: AFIAltaSubtype;
  }) => Promise<OfficialArtifactRecord>;

  generateAFIBaja: (params: {
    worker: AFIWorkerData;
    employer: AFIEmployerData;
    contract: AFIContractData;
    bajaDetails: AFIBajaDetails;
  }) => Promise<OfficialArtifactRecord>;

  generateAFIVariacion: (params: {
    worker: AFIWorkerData;
    employer: AFIEmployerData;
    contract: AFIContractData;
    variacionSubtype: AFIVariacionSubtype;
    changes: AFIVariacionChange[];
    effectiveDate: string;
  }) => Promise<OfficialArtifactRecord>;

  generateFANCotizacion: (params: {
    companyCIF: string;
    companyCCC: string;
    companyName: string;
    periodYear: number;
    periodMonth: number;
    employeeResults: Array<{
      employeeId: string;
      employeeName: string;
      naf: string;
      dniNie: string;
      grupoCotizacion: number;
      contractTypeCode: string;
      isTemporary: boolean;
      coeficienteParcialidad: number;
      diasCotizados: number;
      ssResult: SSContributionBreakdown;
      tipoIRPF: number;
      retencionIRPF: number;
    }>;
  }) => Promise<OfficialArtifactRecord>;

  // Status promotion
  promoteArtifactStatus: (artifactIndex: number, targetStatus: AFIArtifactStatus | FANArtifactStatus) => void;
}

// ── Hook ──

export function useOfficialArtifacts(companyId: string): UseOfficialArtifactsReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastArtifact, setLastArtifact] = useState<OfficialArtifactRecord | null>(null);
  const [artifacts, setArtifacts] = useState<OfficialArtifactRecord[]>([]);

  // ── Traceability helper ──
  const recordToLedgerAndEvidence = useCallback(async (
    type: 'afi' | 'fan',
    artifact: AFIArtifact | FANCotizacionArtifact,
    snapshot: Record<string, unknown>,
  ): Promise<{ ledgerEventId: string | null; evidenceId: string | null }> => {
    let ledgerEventId: string | null = null;
    let evidenceId: string | null = null;

    try {
      // Ledger event
      const ledgerInput: LedgerEventInput = {
        companyId,
        eventType: 'official_export_prepared',
        eventLabel: type === 'afi'
          ? `AFI ${(artifact as AFIArtifact).actionType} generado`
          : `FAN cotización ${(artifact as FANCotizacionArtifact).periodLabel} generada`,
        entityType: type === 'afi' ? 'afi_artifact' : 'fan_artifact',
        entityId: artifact.id,
        sourceModule: 'hr_official_artifacts',
        afterSnapshot: snapshot,
      };
      const ledgerRow = buildLedgerRow(ledgerInput);
      const { data: ledgerData } = await (supabase as any)
        .from('erp_hr_ledger')
        .insert(ledgerRow)
        .select('id')
        .single();
      ledgerEventId = ledgerData?.id ?? null;

      // Evidence
      const evidenceInput: EvidenceInput = {
        companyId,
        ledgerEventId: ledgerEventId ?? undefined,
        evidenceType: 'export_package',
        evidenceLabel: type === 'afi'
          ? `AFI ${(artifact as AFIArtifact).actionType} — ${artifact.id}`
          : `FAN cotización ${(artifact as FANCotizacionArtifact).periodLabel} — ${artifact.id}`,
        refEntityType: type === 'afi' ? 'afi_artifact' : 'fan_artifact',
        refEntityId: artifact.id,
        evidenceSnapshot: snapshot,
        metadata: {
          artifactStatus: type === 'afi' ? (artifact as AFIArtifact).artifactStatus : (artifact as FANCotizacionArtifact).artifactStatus,
          isValid: type === 'afi' ? (artifact as AFIArtifact).isValid : (artifact as FANCotizacionArtifact).isValid,
          version: artifact.version,
          circuitId: type === 'afi' ? 'tgss_afiliacion' : 'tgss_cotizacion',
        },
      };
      const evidenceRow = buildEvidenceRow(evidenceInput);
      const { data: evidenceData } = await (supabase as any)
        .from('erp_hr_evidence')
        .insert(evidenceRow)
        .select('id')
        .single();
      evidenceId = evidenceData?.id ?? null;

    } catch (err) {
      console.error('[useOfficialArtifacts] ledger/evidence error:', err);
    }

    // Audit log (fire-and-forget)
    logAuditEvent({
      action: 'official_artifact_generated',
      tableName: 'hr_official_artifacts',
      category: 'data_access',
      severity: 'info',
      metadata: {
        artifact_type: type,
        artifact_id: artifact.id,
        company_id: companyId,
        is_valid: type === 'afi' ? (artifact as AFIArtifact).isValid : (artifact as FANCotizacionArtifact).isValid,
        disclaimer: 'Artefacto interno preparatorio — NO constituye presentación oficial',
      },
    }).catch(() => {});

    return { ledgerEventId, evidenceId };
  }, [companyId]);

  // ── Pre-validations ──
  const validateAFI = useCallback((params: Parameters<UseOfficialArtifactsReturn['validateAFI']>[0]) => {
    return validateAFIPrerequisites(params);
  }, []);

  const validateFAN = useCallback((params: Parameters<UseOfficialArtifactsReturn['validateFAN']>[0]) => {
    return validateFANPrerequisites(params);
  }, []);

  // ── AFI Alta ──
  const generateAFIAlta = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateAFIAlta']>[0]) => {
    setIsGenerating(true);
    try {
      const artifact = buildAFIAlta({ ...params, companyId });
      const snapshot = serializeAFIForSnapshot(artifact);
      const { ledgerEventId, evidenceId } = await recordToLedgerAndEvidence('afi', artifact, snapshot);

      const record: OfficialArtifactRecord = {
        type: 'afi', artifact,
        preValidation: null, ledgerEventId, evidenceId,
        generatedAt: artifact.generatedAt,
      };
      setLastArtifact(record);
      setArtifacts(prev => [record, ...prev]);
      toast.success(`AFI Alta generado`, { description: artifact.isValid ? 'Validación interna OK' : 'Con errores — revisar validaciones' });
      return record;
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, recordToLedgerAndEvidence]);

  // ── AFI Baja ──
  const generateAFIBaja = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateAFIBaja']>[0]) => {
    setIsGenerating(true);
    try {
      const artifact = buildAFIBaja({ ...params, companyId });
      const snapshot = serializeAFIForSnapshot(artifact);
      const { ledgerEventId, evidenceId } = await recordToLedgerAndEvidence('afi', artifact, snapshot);

      const record: OfficialArtifactRecord = {
        type: 'afi', artifact,
        preValidation: null, ledgerEventId, evidenceId,
        generatedAt: artifact.generatedAt,
      };
      setLastArtifact(record);
      setArtifacts(prev => [record, ...prev]);
      toast.success(`AFI Baja generado`, { description: artifact.isValid ? 'Validación interna OK' : 'Con errores' });
      return record;
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, recordToLedgerAndEvidence]);

  // ── AFI Variación ──
  const generateAFIVariacion = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateAFIVariacion']>[0]) => {
    setIsGenerating(true);
    try {
      const artifact = buildAFIVariacion({ ...params, companyId });
      const snapshot = serializeAFIForSnapshot(artifact);
      const { ledgerEventId, evidenceId } = await recordToLedgerAndEvidence('afi', artifact, snapshot);

      const record: OfficialArtifactRecord = {
        type: 'afi', artifact,
        preValidation: null, ledgerEventId, evidenceId,
        generatedAt: artifact.generatedAt,
      };
      setLastArtifact(record);
      setArtifacts(prev => [record, ...prev]);
      toast.success(`AFI Variación generado`);
      return record;
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, recordToLedgerAndEvidence]);

  // ── FAN Cotización ──
  const generateFANCotizacion = useCallback(async (params: Parameters<UseOfficialArtifactsReturn['generateFANCotizacion']>[0]) => {
    setIsGenerating(true);
    try {
      const records = params.employeeResults.map(e => buildFANEmployeeRecord(e));
      const artifact = buildFANCotizacion({
        companyId,
        companyCIF: params.companyCIF,
        companyCCC: params.companyCCC,
        companyName: params.companyName,
        periodYear: params.periodYear,
        periodMonth: params.periodMonth,
        records,
      });
      const snapshot = serializeFANForSnapshot(artifact);
      const { ledgerEventId, evidenceId } = await recordToLedgerAndEvidence('fan', artifact, snapshot);

      const record: OfficialArtifactRecord = {
        type: 'fan', artifact,
        preValidation: null, ledgerEventId, evidenceId,
        generatedAt: artifact.generatedAt,
      };
      setLastArtifact(record);
      setArtifacts(prev => [record, ...prev]);
      toast.success(`FAN Cotización ${artifact.periodLabel} generada`, {
        description: `${artifact.totalEmployees} empleados — ${artifact.isValid ? 'válida' : 'con errores'}`,
      });
      return record;
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, recordToLedgerAndEvidence]);

  // ── Status promotion ──
  const promoteArtifactStatus = useCallback((index: number, targetStatus: AFIArtifactStatus | FANArtifactStatus) => {
    setArtifacts(prev => {
      const updated = [...prev];
      const rec = updated[index];
      if (!rec) return prev;

      if (rec.type === 'afi') {
        updated[index] = {
          ...rec,
          artifact: promoteAFIStatus(rec.artifact as AFIArtifact, targetStatus as AFIArtifactStatus),
        };
      } else {
        updated[index] = {
          ...rec,
          artifact: promoteFANStatus(rec.artifact as FANCotizacionArtifact, targetStatus as FANArtifactStatus),
        };
      }
      return updated;
    });
  }, []);

  return {
    isGenerating,
    lastArtifact,
    artifacts,
    validateAFI,
    validateFAN,
    generateAFIAlta,
    generateAFIBaja,
    generateAFIVariacion,
    generateFANCotizacion,
    promoteArtifactStatus,
  };
}
