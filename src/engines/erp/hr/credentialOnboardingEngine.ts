/**
 * credentialOnboardingEngine.ts — LM3: Credential Onboarding + Go-Live Rules
 *
 * Pure engine (no side effects):
 *  - Credential types & status per organism
 *  - Sandbox/UAT scenario definitions
 *  - Hard go-live rule (6 conditions, never faked)
 *  - Enhanced readiness computation
 *  - isRealSubmissionBlocked === true always
 */

import type { ReadinessLevel } from './officialAdaptersEngine';
import type { FormatValidationStatus } from './officialFormatValidatorEngine';

// ── Credential Types ────────────────────────────────────────────────────────

export type CredentialType =
  | 'autorizacion_red'
  | 'autorizacion_contrata'
  | 'certificado_electronico'
  | 'clave_pin'
  | 'clave_permanente'
  | 'dnie'
  | 'winsuite_siltra';

export type CredentialStatus =
  | 'not_configured'
  | 'pending_request'
  | 'configured'
  | 'validated'
  | 'expired'
  | 'revoked';

export type CertificateBindingStatus =
  | 'not_configured'
  | 'present'
  | 'valid'
  | 'expired'
  | 'incomplete'
  | 'revoked';

export type CertificatePurpose = 'firma' | 'autenticacion' | 'presentacion_oficial';

export type OrganismId = 'tgss' | 'contrata' | 'certifica' | 'aeat_111' | 'aeat_190';

// ── Credential Requirements per Organism ────────────────────────────────────

export interface CredentialRequirement {
  type: CredentialType;
  mandatory: boolean;
  description: string;
}

export const ORGANISM_CREDENTIAL_REQUIREMENTS: Record<OrganismId, CredentialRequirement[]> = {
  tgss: [
    { type: 'autorizacion_red', mandatory: true, description: 'Autorización RED vigente para envío de ficheros TGSS' },
    { type: 'certificado_electronico', mandatory: true, description: 'Certificado FNMT o equivalente para autenticación' },
    { type: 'winsuite_siltra', mandatory: true, description: 'WinSuite32/SILTRA instalado y configurado' },
  ],
  contrata: [
    { type: 'autorizacion_contrata', mandatory: true, description: 'Autorización Contrat@ vigente en SEPE' },
    { type: 'certificado_electronico', mandatory: true, description: 'Certificado electrónico o DNIe para acceso' },
  ],
  certifica: [
    { type: 'autorizacion_contrata', mandatory: true, description: 'Autorización Contrat@ (da acceso a Certific@2)' },
    { type: 'certificado_electronico', mandatory: true, description: 'Certificado electrónico para acceso' },
  ],
  aeat_111: [
    { type: 'certificado_electronico', mandatory: true, description: 'Certificado electrónico, DNIe o Cl@ve' },
    { type: 'clave_pin', mandatory: false, description: 'Cl@ve PIN como alternativa para presentación' },
    { type: 'clave_permanente', mandatory: false, description: 'Cl@ve permanente como alternativa' },
  ],
  aeat_190: [
    { type: 'certificado_electronico', mandatory: true, description: 'Certificado electrónico, DNIe o Cl@ve' },
    { type: 'clave_pin', mandatory: false, description: 'Cl@ve PIN como alternativa' },
  ],
};

export const ORGANISM_LABELS: Record<OrganismId, string> = {
  tgss: 'TGSS / RED / SILTRA',
  contrata: 'SEPE / Contrat@',
  certifica: 'SEPE / Certific@2',
  aeat_111: 'AEAT / Modelo 111',
  aeat_190: 'AEAT / Modelo 190',
};

export const ALL_ORGANISMS: OrganismId[] = ['contrata', 'aeat_111', 'aeat_190', 'tgss', 'certifica'];

// ── Credential State ────────────────────────────────────────────────────────

export interface CredentialEntry {
  type: CredentialType;
  status: CredentialStatus;
  configuredAt?: string;
  expiresAt?: string;
  notes?: string;
}

// ── Sandbox / UAT Scenarios ─────────────────────────────────────────────────

export type ScenarioStatus = 'pending' | 'passed' | 'failed' | 'skipped';
export type ScenarioPhase = 'sandbox' | 'uat';

export interface SandboxScenario {
  id: string;
  organism: OrganismId;
  phase: ScenarioPhase;
  description: string;
  expectedResult: string;
  evidenceRequired: string;
  status: ScenarioStatus;
  executedAt?: string;
  notes?: string;
}

export const ORGANISM_SANDBOX_SCENARIOS: SandboxScenario[] = [
  // TGSS
  { id: 'tgss_afi_alta', organism: 'tgss', phase: 'sandbox', description: 'Alta AFI con datos de prueba → envío SILTRA → acuse', expectedResult: 'Acuse TGSS recibido', evidenceRequired: 'Captura acuse TGSS', status: 'pending' },
  { id: 'tgss_afi_baja', organism: 'tgss', phase: 'sandbox', description: 'Baja AFI → envío → confirmación', expectedResult: 'Confirmación TGSS', evidenceRequired: 'Captura confirmación', status: 'pending' },
  { id: 'tgss_bases', organism: 'tgss', phase: 'sandbox', description: 'Remesa de bases → envío → RLC/RNT de respuesta', expectedResult: 'RLC/RNT recibido', evidenceRequired: 'Fichero RLC/RNT importado', status: 'pending' },
  { id: 'tgss_uat_full', organism: 'tgss', phase: 'uat', description: 'Ciclo completo alta+bases+baja con CCC de prueba', expectedResult: 'Ciclo validado sin rechazos', evidenceRequired: 'Evidencia completa del ciclo', status: 'pending' },
  // Contrat@
  { id: 'contrata_alta', organism: 'contrata', phase: 'sandbox', description: 'Alta contrato indefinido → envío XML → referencia SEPE', expectedResult: 'Referencia SEPE recibida', evidenceRequired: 'Captura referencia', status: 'pending' },
  { id: 'contrata_baja', organism: 'contrata', phase: 'sandbox', description: 'Baja contrato → comunicación → acuse', expectedResult: 'Acuse SEPE', evidenceRequired: 'Captura acuse', status: 'pending' },
  { id: 'contrata_prorroga', organism: 'contrata', phase: 'sandbox', description: 'Prórroga contrato temporal → comunicación → confirmación', expectedResult: 'Confirmación SEPE', evidenceRequired: 'Captura confirmación', status: 'pending' },
  { id: 'contrata_rechazo', organism: 'contrata', phase: 'sandbox', description: 'Rechazo simulado → corrección → reenvío', expectedResult: 'Reenvío aceptado', evidenceRequired: 'Captura rechazo + reenvío', status: 'pending' },
  { id: 'contrata_uat', organism: 'contrata', phase: 'uat', description: 'Ciclo contrato real: alta + prórroga + baja', expectedResult: 'Ciclo completo sin errores', evidenceRequired: 'Referencias SEPE de cada paso', status: 'pending' },
  // Certific@2
  { id: 'certifica_fin_contrato', organism: 'certifica', phase: 'sandbox', description: 'Certificado empresa por fin de contrato → envío → referencia SEPE', expectedResult: 'Referencia SEPE', evidenceRequired: 'Captura referencia', status: 'pending' },
  { id: 'certifica_despido', organism: 'certifica', phase: 'sandbox', description: 'Certificado por despido objetivo → envío → acuse', expectedResult: 'Acuse SEPE', evidenceRequired: 'Captura acuse', status: 'pending' },
  { id: 'certifica_uat', organism: 'certifica', phase: 'uat', description: 'Certificado empresa completo con datos reales', expectedResult: 'Aceptación SEPE', evidenceRequired: 'Referencia oficial', status: 'pending' },
  // AEAT 111
  { id: 'aeat111_trimestral', organism: 'aeat_111', phase: 'sandbox', description: 'Modelo 111 trimestral → fichero BOE → importar en Sede → CSV', expectedResult: 'CSV justificante', evidenceRequired: 'CSV AEAT', status: 'pending' },
  { id: 'aeat111_mensual', organism: 'aeat_111', phase: 'sandbox', description: 'Modelo 111 mensual → misma secuencia', expectedResult: 'CSV justificante', evidenceRequired: 'CSV AEAT', status: 'pending' },
  { id: 'aeat111_uat', organism: 'aeat_111', phase: 'uat', description: 'Presentación real modelo 111 con datos fiscales válidos', expectedResult: 'Justificante AEAT aceptado', evidenceRequired: 'CSV + justificante PDF', status: 'pending' },
  // AEAT 190
  { id: 'aeat190_anual', organism: 'aeat_190', phase: 'sandbox', description: 'Modelo 190 ejercicio completo → fichero BOE → CSV justificante', expectedResult: 'CSV justificante', evidenceRequired: 'CSV AEAT', status: 'pending' },
  { id: 'aeat190_discrepancia', organism: 'aeat_190', phase: 'sandbox', description: 'Discrepancia con 111 trimestral → alerta → corrección', expectedResult: 'Corrección validada', evidenceRequired: 'Captura alerta + corrección', status: 'pending' },
  { id: 'aeat190_uat', organism: 'aeat_190', phase: 'uat', description: 'Presentación real modelo 190 ejercicio completo', expectedResult: 'Justificante AEAT aceptado', evidenceRequired: 'CSV + justificante PDF', status: 'pending' },
];

export function getOrganismScenarios(organism: OrganismId): SandboxScenario[] {
  return ORGANISM_SANDBOX_SCENARIOS.filter(s => s.organism === organism);
}

// ── Consolidated Onboarding State ───────────────────────────────────────────

export interface CredentialOnboardingState {
  organism: OrganismId;
  label: string;
  credentials: CredentialEntry[];
  certificateStatus: CertificateBindingStatus;
  certificatePurposes: CertificatePurpose[];
  formatValidation: Record<string, FormatValidationStatus>;
  parserVerified: boolean;
  sandboxScenarios: SandboxScenario[];
  uatScenarios: SandboxScenario[];
  readiness: ReadinessLevel;
  goLiveEvaluation: GoLiveEvaluation;
  nextRecommendedAction: string;
}

// ── Go-Live Hard Rule ───────────────────────────────────────────────────────

export type GoLiveBlockerSeverity = 'critical' | 'high' | 'medium';

export interface GoLiveBlocker {
  dimension: string;
  description: string;
  severity: GoLiveBlockerSeverity;
  unblockAction: string;
  owner: string;
  estimatedEffort: string;
}

export interface GoLiveEvaluation {
  organism: OrganismId;
  canGoLive: false; // ALWAYS false — no credentials exist
  readinessLevel: ReadinessLevel;
  blockers: GoLiveBlocker[];
  conditionsMet: {
    hasRequiredCredentials: boolean;
    hasValidCertificate: boolean;
    hasFormatAligned: boolean;
    hasParserVerified: boolean;
    hasSandboxPassed: boolean;
    hasUATPassed: boolean;
  };
  evaluatedAt: string;
}

export function evaluateOrganismGoLiveReadiness(params: {
  organism: OrganismId;
  credentials: CredentialEntry[];
  certificateStatus: CertificateBindingStatus;
  formatStatuses: Record<string, FormatValidationStatus>;
  parserVerified: boolean;
  sandboxPassedCount: number;
  uatPassedCount: number;
}): GoLiveEvaluation {
  const requirements = ORGANISM_CREDENTIAL_REQUIREMENTS[params.organism];
  const blockers: GoLiveBlocker[] = [];

  // Condition 1: Required credentials
  const mandatoryReqs = requirements.filter(r => r.mandatory);
  const hasRequiredCredentials = mandatoryReqs.every(req =>
    params.credentials.some(c => c.type === req.type && (c.status === 'configured' || c.status === 'validated'))
  );
  if (!hasRequiredCredentials) {
    const missing = mandatoryReqs.filter(req =>
      !params.credentials.some(c => c.type === req.type && (c.status === 'configured' || c.status === 'validated'))
    );
    missing.forEach(m => blockers.push({
      dimension: 'Credencial',
      description: `${m.description} — no configurada`,
      severity: 'critical',
      unblockAction: `Solicitar/configurar ${m.type}`,
      owner: 'Administrador RRHH',
      estimatedEffort: '1-5 días hábiles',
    }));
  }

  // Condition 2: Valid certificate
  const hasValidCertificate = params.certificateStatus === 'valid' || params.certificateStatus === 'present';
  if (!hasValidCertificate) {
    blockers.push({
      dimension: 'Certificado',
      description: `Certificado electrónico: ${params.certificateStatus}`,
      severity: 'critical',
      unblockAction: 'Obtener/renovar certificado electrónico (FNMT/DNIe)',
      owner: 'Administrador',
      estimatedEffort: '1-10 días hábiles',
    });
  }

  // Condition 3: Format ≥ spec_aligned
  const formatValues = Object.values(params.formatStatuses);
  const hasFormatAligned = formatValues.length > 0 && formatValues.every(
    s => s === 'spec_aligned' || s === 'sandbox_validated'
  );
  if (!hasFormatAligned) {
    blockers.push({
      dimension: 'Formato',
      description: 'Formato oficial no validado contra especificación',
      severity: 'high',
      unblockAction: 'Validar estructura de fichero contra spec oficial del organismo',
      owner: 'Equipo técnico',
      estimatedEffort: '2-5 días',
    });
  }

  // Condition 4: Parser verified
  if (!params.parserVerified) {
    blockers.push({
      dimension: 'Parser',
      description: 'Parser de respuesta oficial no verificado',
      severity: 'high',
      unblockAction: 'Verificar parser con respuesta real o sample del organismo',
      owner: 'Equipo técnico',
      estimatedEffort: '1-3 días',
    });
  }

  // Condition 5: ≥1 sandbox passed
  const hasSandboxPassed = params.sandboxPassedCount > 0;
  if (!hasSandboxPassed) {
    blockers.push({
      dimension: 'Sandbox',
      description: 'Ningún escenario sandbox superado',
      severity: 'high',
      unblockAction: 'Ejecutar al menos un escenario sandbox con datos de prueba',
      owner: 'Equipo RRHH + Técnico',
      estimatedEffort: '1-3 días',
    });
  }

  // Condition 6: ≥1 UAT passed
  const hasUATPassed = params.uatPassedCount > 0;
  if (!hasUATPassed) {
    blockers.push({
      dimension: 'UAT',
      description: 'Ningún escenario UAT superado',
      severity: 'high',
      unblockAction: 'Ejecutar escenario UAT con organismo real',
      owner: 'Equipo RRHH',
      estimatedEffort: '3-10 días',
    });
  }

  const conditionsMet = { hasRequiredCredentials, hasValidCertificate, hasFormatAligned, hasParserVerified: params.parserVerified, hasSandboxPassed, hasUATPassed };

  // Compute readiness level
  let readinessLevel: ReadinessLevel = 'internally_ready';
  if (hasRequiredCredentials && hasValidCertificate && hasFormatAligned && params.parserVerified && hasSandboxPassed && hasUATPassed) {
    readinessLevel = 'go_live_ready'; // This will effectively never happen without real credentials
  } else if (hasRequiredCredentials && hasValidCertificate && hasSandboxPassed) {
    readinessLevel = 'uat_ready';
  } else if (hasFormatAligned || hasSandboxPassed) {
    readinessLevel = 'sandbox_ready';
  } else if (formatValues.length > 0) {
    readinessLevel = 'official_handoff_ready';
  }

  return {
    organism: params.organism,
    canGoLive: false as const, // HARD RULE: never true without all 6 conditions verified in production
    readinessLevel,
    blockers,
    conditionsMet,
    evaluatedAt: new Date().toISOString(),
  };
}

// ── Next Action Recommender ─────────────────────────────────────────────────

export function computeNextRecommendedAction(evaluation: GoLiveEvaluation): string {
  if (!evaluation.conditionsMet.hasRequiredCredentials) {
    return 'Configurar credenciales obligatorias del organismo';
  }
  if (!evaluation.conditionsMet.hasValidCertificate) {
    return 'Obtener/vincular certificado electrónico válido';
  }
  if (!evaluation.conditionsMet.hasFormatAligned) {
    return 'Validar formato de fichero contra especificación oficial';
  }
  if (!evaluation.conditionsMet.hasParserVerified) {
    return 'Verificar parser de respuesta con muestra del organismo';
  }
  if (!evaluation.conditionsMet.hasSandboxPassed) {
    return 'Ejecutar escenario sandbox con datos de prueba';
  }
  if (!evaluation.conditionsMet.hasUATPassed) {
    return 'Ejecutar escenario UAT con organismo real';
  }
  return 'Todas las condiciones cumplidas — pendiente de autorización final';
}
