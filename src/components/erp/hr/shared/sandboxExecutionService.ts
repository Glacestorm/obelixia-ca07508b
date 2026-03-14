/**
 * sandboxExecutionService.ts — Servicio de ejecución sandbox con trazabilidad reforzada
 * V2-ES.8 T8 P4: Ejecución diferenciada de dry-run, persistencia y audit linkage
 * 
 * sandbox execution ≠ dry-run (local validation only)
 * sandbox execution ≠ envío real (producción bloqueada)
 * sandbox execution = advanced simulation con trazabilidad completa
 */

import type { SandboxDomain, ConnectorEnvironment, SandboxExecution } from './sandboxEnvironmentEngine';
import { isRealSubmissionBlocked, SANDBOX_DISCLAIMERS } from './sandboxEnvironmentEngine';

// ======================== TYPES ========================

export interface SandboxExecutionRequest {
  domain: SandboxDomain;
  adapterId: string;
  adapterName: string;
  companyId: string;
  legalEntityId: string | null;
  environment: ConnectorEnvironment;
  submissionType: string;
  referencePeriod: string | null;
  payload: Record<string, unknown>;
  executedBy: string;
  /** Link to related dry-run if exists */
  relatedDryRunId: string | null;
  /** Link to pre-real approval if exists */
  relatedApprovalId: string | null;
}

export interface SandboxExecutionRecord {
  id: string;
  domain: SandboxDomain;
  adapterId: string;
  adapterName: string;
  companyId: string;
  legalEntityId: string | null;
  environment: ConnectorEnvironment;
  submissionType: string;
  referencePeriod: string | null;
  /** Execution mode: advanced_simulation or staged_execution */
  executionMode: 'advanced_simulation' | 'staged_execution';
  /** Payload snapshot (immutable) */
  payloadSnapshot: Record<string, unknown>;
  payloadHash: string;
  /** Result */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'timeout';
  result: SandboxExecutionResult | null;
  /** Timestamps */
  createdAt: string;
  executedAt: string;
  completedAt: string | null;
  executedBy: string;
  /** Duration */
  durationMs: number | null;
  /** Audit linkage */
  relatedDryRunId: string | null;
  relatedApprovalId: string | null;
  auditEventIds: string[];
  /** Disclaimers embedded in record */
  disclaimers: string[];
  /** Metadata */
  metadata: {
    engineVersion: string;
    phase: string;
    productionBlocked: true;
    isDryRun: false;
    isOfficialSubmission: false;
  };
}

export interface SandboxExecutionResult {
  accepted: boolean;
  responseCode: string;
  validationPassed: boolean;
  structuralErrors: SandboxValidationItem[];
  fieldWarnings: SandboxValidationItem[];
  payloadConformance: number; // 0-100
  simulatedOrganismResponse: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  } | null;
  executionStages: ExecutionStage[];
}

export interface SandboxValidationItem {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ExecutionStage {
  stage: string;
  label: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  detail: string;
}

// ======================== SIMULATION ENGINE ========================

/** Domain-specific simulation configs */
const DOMAIN_SIMULATION: Record<SandboxDomain, {
  stages: { stage: string; label: string }[];
  responseCode: string;
  validationRules: string[];
}> = {
  TGSS: {
    stages: [
      { stage: 'payload_build', label: 'Construcción payload AFI/FAN' },
      { stage: 'structural_validation', label: 'Validación estructural SILTRA' },
      { stage: 'field_validation', label: 'Validación NAF/CCC/DNI' },
      { stage: 'format_check', label: 'Conformidad formato fichero' },
      { stage: 'sandbox_submit', label: 'Envío a endpoint sandbox' },
      { stage: 'response_parse', label: 'Procesamiento respuesta simulada' },
    ],
    responseCode: 'TGSS-SBX',
    validationRules: ['NAF_format', 'CCC_valid', 'worker_count_match'],
  },
  CONTRATA: {
    stages: [
      { stage: 'payload_build', label: 'Construcción payload XML Contrat@' },
      { stage: 'structural_validation', label: 'Validación esquema XML' },
      { stage: 'field_validation', label: 'Validación DNI/NIE/campos contractuales' },
      { stage: 'format_check', label: 'Conformidad XML-SEPE' },
      { stage: 'sandbox_submit', label: 'Envío a endpoint sandbox SEPE' },
      { stage: 'response_parse', label: 'Procesamiento respuesta simulada' },
    ],
    responseCode: 'SEPE-SBX',
    validationRules: ['DNI_format', 'contract_type_valid', 'dates_coherent'],
  },
  AEAT: {
    stages: [
      { stage: 'payload_build', label: 'Construcción modelo 111/190' },
      { stage: 'structural_validation', label: 'Validación campos obligatorios AEAT' },
      { stage: 'field_validation', label: 'Validación NIF/importes/retenciones' },
      { stage: 'format_check', label: 'Conformidad formato telemático' },
      { stage: 'sandbox_submit', label: 'Envío a endpoint sandbox AEAT' },
      { stage: 'response_parse', label: 'Procesamiento respuesta simulada' },
    ],
    responseCode: 'AEAT-SBX',
    validationRules: ['NIF_valid', 'amounts_balanced', 'period_valid'],
  },
};

/**
 * Execute a sandbox simulation — advanced simulation mode.
 * This is NOT a dry-run (which only validates locally) and NOT a real submission.
 */
export async function executeSandboxSimulation(
  request: SandboxExecutionRequest
): Promise<SandboxExecutionRecord> {
  // SAFETY: Hard block on production
  if (request.environment === 'production' || !isRealSubmissionBlocked()) {
    throw new Error('SECURITY VIOLATION: Cannot execute in production environment');
  }

  const id = crypto.randomUUID();
  const startTime = Date.now();
  const domainConfig = DOMAIN_SIMULATION[request.domain];

  const record: SandboxExecutionRecord = {
    id,
    domain: request.domain,
    adapterId: request.adapterId,
    adapterName: request.adapterName,
    companyId: request.companyId,
    legalEntityId: request.legalEntityId,
    environment: request.environment,
    submissionType: request.submissionType,
    referencePeriod: request.referencePeriod,
    executionMode: 'advanced_simulation',
    payloadSnapshot: { ...request.payload },
    payloadHash: hashPayload(request.payload),
    status: 'executing',
    result: null,
    createdAt: new Date().toISOString(),
    executedAt: new Date().toISOString(),
    completedAt: null,
    executedBy: request.executedBy,
    durationMs: null,
    relatedDryRunId: request.relatedDryRunId,
    relatedApprovalId: request.relatedApprovalId,
    auditEventIds: [],
    disclaimers: [
      SANDBOX_DISCLAIMERS[request.environment],
      SANDBOX_DISCLAIMERS.general,
      `Ejecución sandbox ≠ dry-run local. Ejecución sandbox ≠ envío oficial.`,
      `Resultados simulados — no constituyen respuesta real del organismo.`,
    ],
    metadata: {
      engineVersion: 'V2-ES.8-T8-P4',
      phase: 'preparatory',
      productionBlocked: true,
      isDryRun: false,
      isOfficialSubmission: false,
    },
  };

  // Simulate staged execution
  const stages: ExecutionStage[] = [];
  const structuralErrors: SandboxValidationItem[] = [];
  const fieldWarnings: SandboxValidationItem[] = [];
  let allStagesPassed = true;

  for (const stageConfig of domainConfig.stages) {
    const stageStart = Date.now();

    // Simulate processing time
    await simulateDelay(200 + Math.random() * 300);

    const stagePassed = Math.random() > 0.08; // 92% per-stage success
    if (!stagePassed) allStagesPassed = false;

    // Generate realistic validation items for failed stages
    if (!stagePassed && stageConfig.stage === 'field_validation') {
      structuralErrors.push({
        field: domainConfig.validationRules[0] || 'unknown',
        code: `${request.domain}_FIELD_ERR`,
        message: `Error de validación en campo para ${request.domain}`,
        severity: 'error',
      });
    }

    if (Math.random() > 0.7 && stageConfig.stage === 'format_check') {
      fieldWarnings.push({
        field: 'format',
        code: `${request.domain}_FORMAT_WARN`,
        message: 'Formato aceptable pero no óptimo para el organismo',
        severity: 'warning',
      });
    }

    stages.push({
      stage: stageConfig.stage,
      label: stageConfig.label,
      status: stagePassed ? 'passed' : 'failed',
      durationMs: Date.now() - stageStart,
      detail: stagePassed
        ? `${stageConfig.label}: OK`
        : `${stageConfig.label}: Error detectado`,
    });
  }

  const payloadConformance = allStagesPassed
    ? 85 + Math.floor(Math.random() * 15)
    : 40 + Math.floor(Math.random() * 30);

  const result: SandboxExecutionResult = {
    accepted: allStagesPassed,
    responseCode: `${domainConfig.responseCode}-${allStagesPassed ? 'OK' : 'ERR'}`,
    validationPassed: structuralErrors.length === 0,
    structuralErrors,
    fieldWarnings,
    payloadConformance,
    simulatedOrganismResponse: {
      code: allStagesPassed ? '0000' : '9001',
      message: allStagesPassed
        ? 'Simulación aceptada — payload conforme'
        : 'Simulación con errores — revisar validaciones',
      details: {
        domain: request.domain,
        environment: request.environment,
        stagesCompleted: stages.filter(s => s.status === 'passed').length,
        stagesTotal: stages.length,
      },
    },
    executionStages: stages,
  };

  record.status = allStagesPassed ? 'completed' : 'failed';
  record.result = result;
  record.completedAt = new Date().toISOString();
  record.durationMs = Date.now() - startTime;

  return record;
}

// ======================== AUDIT EVENT BUILDER ========================

export interface SandboxAuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
}

export function buildSandboxAuditEvents(record: SandboxExecutionRecord): SandboxAuditEvent[] {
  const events: SandboxAuditEvent[] = [];
  const baseDetails = {
    domain: record.domain,
    environment: record.environment,
    executionMode: record.executionMode,
    companyId: record.companyId,
    submissionType: record.submissionType,
    _disclaimer: 'Ejecución sandbox preparatoria — no constituye envío oficial',
    _phase: record.metadata.engineVersion,
    _production_blocked: true,
    _is_dry_run: false,
    _is_official: false,
  };

  // Start event
  events.push({
    action: 'sandbox_execution_started',
    entityType: 'sandbox_execution',
    entityId: record.id,
    details: {
      ...baseDetails,
      adapterId: record.adapterId,
      adapterName: record.adapterName,
      payloadHash: record.payloadHash,
      relatedDryRunId: record.relatedDryRunId,
      relatedApprovalId: record.relatedApprovalId,
    },
  });

  // Completion event
  events.push({
    action: record.status === 'completed'
      ? 'sandbox_execution_completed'
      : 'sandbox_execution_failed',
    entityType: 'sandbox_execution',
    entityId: record.id,
    details: {
      ...baseDetails,
      status: record.status,
      durationMs: record.durationMs,
      payloadConformance: record.result?.payloadConformance,
      errorsCount: record.result?.structuralErrors.length ?? 0,
      warningsCount: record.result?.fieldWarnings.length ?? 0,
      stagesPassed: record.result?.executionStages.filter(s => s.status === 'passed').length ?? 0,
      stagesTotal: record.result?.executionStages.length ?? 0,
    },
  });

  return events;
}

// ======================== HELPERS ========================

function hashPayload(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sbx-${Math.abs(hash).toString(36)}`;
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
