/**
 * sandboxAuditHelper.ts — Auditoría centralizada para operaciones sandbox
 * V2-ES.8 T8 P6: Eventos con naming claro, reutiliza audit trail existente
 * 
 * Eventos auditados:
 *   sandbox_environment_configured   — entorno configurado
 *   sandbox_environment_enabled      — sandbox habilitado
 *   sandbox_execution_attempted      — intento de ejecución sandbox
 *   sandbox_execution_completed      — ejecución sandbox completada
 *   sandbox_execution_failed         — ejecución sandbox fallida
 *   production_activation_blocked    — intento de acceso/activación prod bloqueado
 *   sandbox_environment_switched     — cambio de entorno
 *   sandbox_gate_not_met             — gate no cumplido
 *   sandbox_disclaimers_accepted     — disclaimers aceptados
 *   sandbox_eligibility_evaluated    — elegibilidad evaluada
 */

import { supabase } from '@/integrations/supabase/client';
import type { ConnectorEnvironment, SandboxDomain } from '@/components/erp/hr/shared/sandboxEnvironmentEngine';

// ======================== EVENT TYPES ========================

export type SandboxAuditEventType =
  | 'sandbox_environment_configured'
  | 'sandbox_environment_enabled'
  | 'sandbox_execution_attempted'
  | 'sandbox_execution_completed'
  | 'sandbox_execution_failed'
  | 'production_activation_blocked'
  | 'sandbox_environment_switched'
  | 'sandbox_gate_not_met'
  | 'sandbox_disclaimers_accepted'
  | 'sandbox_eligibility_evaluated'
  // T9: Persistence & comparison events
  | 'sandbox_execution_persisted'
  | 'sandbox_persistence_failed'
  | 'sandbox_comparison_generated'
  | 'sandbox_evidence_pack_generated';

interface SandboxAuditPayload {
  companyId: string;
  environment: ConnectorEnvironment;
  domain?: SandboxDomain;
  adapterId?: string;
  adapterName?: string;
  executionId?: string;
  /** Extra context */
  metadata?: Record<string, unknown>;
}

// ======================== MANDATORY METADATA ========================

const AUDIT_INVARIANTS = {
  _disclaimer: 'Operación en entorno sandbox/preparatorio — no constituye acción oficial',
  _phase: 'V2-ES.8-T8',
  _production_blocked: true,
  _is_official_submission: false,
} as const;

// ======================== LOGGER ========================

export async function logSandboxAuditEvent(
  eventType: SandboxAuditEventType,
  payload: SandboxAuditPayload
): Promise<void> {
  try {
    await supabase.from('erp_hr_audit_log').insert({
      company_id: payload.companyId,
      action: eventType,
      entity_type: 'sandbox_environment',
      entity_id: payload.adapterId || payload.executionId || payload.companyId,
      details: {
        environment: payload.environment,
        domain: payload.domain || null,
        adapterId: payload.adapterId || null,
        adapterName: payload.adapterName || null,
        executionId: payload.executionId || null,
        ...AUDIT_INVARIANTS,
        ...(payload.metadata || {}),
      },
    } as any);
  } catch {
    console.warn(`[sandboxAudit] Failed to log ${eventType}`);
  }
}

// ======================== CONVENIENCE METHODS ========================

/** Log: environment configured for a connector */
export async function auditEnvironmentConfigured(
  companyId: string,
  environment: ConnectorEnvironment,
  adapterId: string,
  adapterName: string
) {
  return logSandboxAuditEvent('sandbox_environment_configured', {
    companyId, environment, adapterId, adapterName,
    metadata: { action_detail: `Entorno ${environment} configurado para ${adapterName}` },
  });
}

/** Log: sandbox enabled for a connector */
export async function auditSandboxEnabled(
  companyId: string,
  environment: ConnectorEnvironment,
  adapterId: string,
  adapterName: string,
  domain?: SandboxDomain
) {
  return logSandboxAuditEvent('sandbox_environment_enabled', {
    companyId, environment, adapterId, adapterName, domain,
    metadata: { action_detail: `Sandbox habilitado: ${adapterName} en ${environment}` },
  });
}

/** Log: sandbox execution attempted */
export async function auditExecutionAttempted(
  companyId: string,
  environment: ConnectorEnvironment,
  adapterId: string,
  domain: SandboxDomain,
  executionId: string
) {
  return logSandboxAuditEvent('sandbox_execution_attempted', {
    companyId, environment, adapterId, domain, executionId,
    metadata: { action_detail: `Intento de ejecución sandbox ${domain}` },
  });
}

/** Log: sandbox execution completed */
export async function auditExecutionCompleted(
  companyId: string,
  environment: ConnectorEnvironment,
  adapterId: string,
  domain: SandboxDomain,
  executionId: string,
  conformance: number
) {
  return logSandboxAuditEvent('sandbox_execution_completed', {
    companyId, environment, adapterId, domain, executionId,
    metadata: {
      action_detail: `Ejecución sandbox ${domain} completada`,
      payloadConformance: conformance,
    },
  });
}

/** Log: sandbox execution failed */
export async function auditExecutionFailed(
  companyId: string,
  environment: ConnectorEnvironment,
  adapterId: string,
  domain: SandboxDomain,
  executionId: string,
  errorSummary: string
) {
  return logSandboxAuditEvent('sandbox_execution_failed', {
    companyId, environment, adapterId, domain, executionId,
    metadata: {
      action_detail: `Ejecución sandbox ${domain} fallida`,
      errorSummary,
    },
  });
}

/** Log: production activation blocked */
export async function auditProductionBlocked(
  companyId: string,
  adapterId?: string,
  reason?: string
) {
  return logSandboxAuditEvent('production_activation_blocked', {
    companyId,
    environment: 'production',
    adapterId,
    metadata: {
      action_detail: reason || 'Intento de activación de producción bloqueado por invariante de seguridad',
      severity: 'critical',
    },
  });
}

/** Log: environment switched */
export async function auditEnvironmentSwitched(
  companyId: string,
  from: ConnectorEnvironment,
  to: ConnectorEnvironment
) {
  return logSandboxAuditEvent('sandbox_environment_switched', {
    companyId,
    environment: to,
    metadata: {
      from_environment: from,
      to_environment: to,
      action_detail: `Cambio de entorno: ${from} → ${to}`,
    },
  });
}

/** Log: gate not met */
export async function auditGateNotMet(
  companyId: string,
  environment: ConnectorEnvironment,
  gateId: string,
  gateLabel: string,
  adapterId?: string
) {
  return logSandboxAuditEvent('sandbox_gate_not_met', {
    companyId, environment, adapterId,
    metadata: {
      gateId,
      gateLabel,
      action_detail: `Gate no cumplido: ${gateLabel} (${gateId})`,
    },
  });
}

/** Log: disclaimers accepted */
export async function auditDisclaimersAccepted(
  companyId: string,
  environment: ConnectorEnvironment
) {
  return logSandboxAuditEvent('sandbox_disclaimers_accepted', {
    companyId, environment,
    metadata: { action_detail: `Disclaimers de ${environment} aceptados` },
  });
}

/** Log: eligibility evaluated */
export async function auditEligibilityEvaluated(
  companyId: string,
  environment: ConnectorEnvironment,
  domain: SandboxDomain,
  eligibility: string,
  percentage: number
) {
  return logSandboxAuditEvent('sandbox_eligibility_evaluated', {
    companyId, environment, domain,
    metadata: {
      eligibility,
      percentage,
      action_detail: `Elegibilidad sandbox ${domain}: ${eligibility} (${percentage}%)`,
    },
  });
}

// ======================== T9: PERSISTENCE & COMPARISON EVENTS ========================

/** Log: sandbox execution persisted to DB */
export async function auditExecutionPersisted(
  companyId: string,
  environment: ConnectorEnvironment,
  executionId: string,
  domain: SandboxDomain
) {
  return logSandboxAuditEvent('sandbox_execution_persisted', {
    companyId, environment, executionId, domain,
    metadata: { action_detail: `Ejecución sandbox ${domain} persistida en BD` },
  });
}

/** Log: sandbox persistence failed */
export async function auditPersistenceFailed(
  companyId: string,
  environment: ConnectorEnvironment,
  executionId: string,
  errorSummary: string
) {
  return logSandboxAuditEvent('sandbox_persistence_failed', {
    companyId, environment, executionId,
    metadata: {
      action_detail: `Fallo al persistir ejecución sandbox`,
      errorSummary,
      severity: 'warning',
    },
  });
}

/** Log: sandbox vs dry-run comparison generated */
export async function auditComparisonGenerated(
  companyId: string,
  environment: ConnectorEnvironment,
  domain: SandboxDomain,
  sandboxId: string,
  dryRunId: string
) {
  return logSandboxAuditEvent('sandbox_comparison_generated', {
    companyId, environment, domain,
    metadata: {
      action_detail: `Comparativa sandbox vs dry-run generada para ${domain}`,
      sandboxId,
      dryRunId,
    },
  });
}

/** Log: evidence pack with sandbox data generated */
export async function auditSandboxEvidencePackGenerated(
  companyId: string,
  environment: ConnectorEnvironment,
  format: string,
  sandboxCount: number
) {
  return logSandboxAuditEvent('sandbox_evidence_pack_generated', {
    companyId, environment,
    metadata: {
      action_detail: `Evidence pack con ${sandboxCount} ejecuciones sandbox generado (${format})`,
      format,
      sandboxCount,
    },
  });
}
