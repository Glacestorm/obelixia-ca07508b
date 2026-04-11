/**
 * officialAdaptersEngine.ts — LM1+LM2: Official Adapter Layer
 * 
 * Pure engine (no side effects) providing:
 *  - OfficialAdapter definitions per organism (TGSS, Contrat@, Certific@2, AEAT 111/190)
 *  - HandoffPackage builder
 *  - Error taxonomy (9 types) with severity/action/retry
 *  - ReadinessLevel computation (never go_live_ready without credentials)
 *  - isRealSubmissionBlocked === true enforced
 */

import type { TargetOrganism } from './institutionalSubmissionEngine';

// ── Channel & Priority ──────────────────────────────────────────────────────

export type ChannelType = 'direct' | 'assisted_handoff' | 'import_response_only';
export type AdapterPriority = 'A' | 'B' | 'C';
export type OfficialFormatType = 'xml' | 'fan_positional' | 'boe_positional' | 'json_payload' | 'binary_remesa';

export type ReadinessLevel =
  | 'internally_ready'
  | 'official_handoff_ready'
  | 'sandbox_ready'
  | 'uat_ready'
  | 'go_live_ready';

// ── OfficialAdapter ─────────────────────────────────────────────────────────

export interface OfficialAdapter {
  id: string;
  organism: TargetOrganism | 'certifica';
  organismLabel: string;
  artifactTypes: string[];
  channelType: ChannelType;
  requiresCertificate: boolean;
  requiresSignature: boolean;
  formatType: OfficialFormatType;
  priority: AdapterPriority;
  directConnectorAvailable: boolean;
  handoffInstructions: string[];
  expectedResponseType: string;
  retryPolicy: RetryPolicy;
  blockingGaps: string[];
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelayMinutes: number;
  autoRetryAllowed: boolean;
  requiresManualReview: boolean;
}

// ── Adapter Registry ────────────────────────────────────────────────────────

export const TGSS_ADAPTER: OfficialAdapter = {
  id: 'tgss_red_siltra',
  organism: 'tgss',
  organismLabel: 'TGSS / Sistema RED / SILTRA',
  artifactTypes: ['afi_alta', 'afi_baja', 'afi_variacion', 'ta2', 'bases_cotizacion', 'rlc', 'rnt', 'cra'],
  channelType: 'assisted_handoff',
  requiresCertificate: true,
  requiresSignature: true,
  formatType: 'fan_positional',
  priority: 'B',
  directConnectorAvailable: false,
  handoffInstructions: [
    '1. Exportar fichero de remesa FAN/AFI desde el sistema',
    '2. Abrir WinSuite32/SILTRA con autorización RED vigente',
    '3. Importar fichero de remesa en SILTRA',
    '4. Validar contenido en SILTRA (errores de formato)',
    '5. Enviar remesa a TGSS vía Sistema RED',
    '6. Guardar acuse/referencia TGSS',
    '7. Importar acuse en el sistema ERP para trazabilidad',
  ],
  expectedResponseType: 'acuse_tgss_referencia',
  retryPolicy: { maxRetries: 3, retryDelayMinutes: 60, autoRetryAllowed: false, requiresManualReview: true },
  blockingGaps: ['Credencial RED no configurada', 'Certificado electrónico no disponible', 'WinSuite32/SILTRA requerido como intermediario'],
};

export const CONTRATA_ADAPTER: OfficialAdapter = {
  id: 'contrata_sepe',
  organism: 'contrata',
  organismLabel: 'SEPE / Contrat@',
  artifactTypes: ['contrata_alta', 'contrata_baja', 'contrata_prorroga', 'contrata_conversion'],
  channelType: 'assisted_handoff',
  requiresCertificate: true,
  requiresSignature: true,
  formatType: 'xml',
  priority: 'A',
  directConnectorAvailable: false,
  handoffInstructions: [
    '1. Exportar fichero XML Contrat@ desde el sistema',
    '2. Acceder a Contrat@ (contrata.sepe.gob.es) con certificado/DNIe',
    '3. Seleccionar "Comunicar contrato" o "Envío por fichero XML"',
    '4. Importar fichero XML generado',
    '5. Validar datos en pantalla de confirmación',
    '6. Confirmar envío y obtener referencia SEPE',
    '7. Importar referencia y acuse en el sistema ERP',
  ],
  expectedResponseType: 'referencia_sepe_contrata',
  retryPolicy: { maxRetries: 5, retryDelayMinutes: 30, autoRetryAllowed: false, requiresManualReview: true },
  blockingGaps: ['Credencial Contrat@ no configurada', 'Certificado electrónico/DNIe requerido'],
};

export const CERTIFICA_ADAPTER: OfficialAdapter = {
  id: 'certifica2_sepe',
  organism: 'certifica',
  organismLabel: 'SEPE / Certific@2',
  artifactTypes: ['certificado_empresa'],
  channelType: 'assisted_handoff',
  requiresCertificate: true,
  requiresSignature: true,
  formatType: 'xml',
  priority: 'C',
  directConnectorAvailable: false,
  handoffInstructions: [
    '1. Exportar payload Certific@2 desde el sistema',
    '2. Acceder a Certific@2 (certifica2.sepe.gob.es) con autorización Contrat@',
    '3. Introducir datos del certificado de empresa (o importar fichero)',
    '4. Validar datos: causa baja, bases cotización, días trabajados',
    '5. Confirmar envío y obtener referencia SEPE',
    '6. Importar referencia y acuse en el sistema ERP',
  ],
  expectedResponseType: 'referencia_sepe_certifica',
  retryPolicy: { maxRetries: 3, retryDelayMinutes: 60, autoRetryAllowed: false, requiresManualReview: true },
  blockingGaps: ['Autorización Contrat@ requerida', 'Certificado electrónico requerido', 'No existe API pública para envío directo'],
};

export const AEAT_111_ADAPTER: OfficialAdapter = {
  id: 'aeat_modelo_111',
  organism: 'aeat',
  organismLabel: 'AEAT / Modelo 111',
  artifactTypes: ['modelo_111_mensual', 'modelo_111_trimestral'],
  channelType: 'assisted_handoff',
  requiresCertificate: true,
  requiresSignature: true,
  formatType: 'boe_positional',
  priority: 'A',
  directConnectorAvailable: false,
  handoffInstructions: [
    '1. Exportar fichero BOE posicional del Modelo 111 desde el sistema',
    '2. Acceder a Sede Electrónica AEAT (sede.agenciatributaria.gob.es)',
    '3. Seleccionar "Modelo 111 - Retenciones e ingresos a cuenta"',
    '4. Seleccionar "Importar fichero" y cargar el fichero BOE',
    '5. Validar datos en pantalla de confirmación',
    '6. Firmar con certificado/DNIe/Cl@ve',
    '7. Confirmar presentación y obtener CSV justificante',
    '8. Importar CSV y justificante en el sistema ERP',
  ],
  expectedResponseType: 'csv_justificante_aeat',
  retryPolicy: { maxRetries: 3, retryDelayMinutes: 120, autoRetryAllowed: false, requiresManualReview: true },
  blockingGaps: ['Certificado electrónico/DNIe/Cl@ve no configurado', 'Sin conector directo a Sede AEAT'],
};

export const AEAT_190_ADAPTER: OfficialAdapter = {
  id: 'aeat_modelo_190',
  organism: 'aeat',
  organismLabel: 'AEAT / Modelo 190',
  artifactTypes: ['modelo_190_anual'],
  channelType: 'assisted_handoff',
  requiresCertificate: true,
  requiresSignature: true,
  formatType: 'boe_positional',
  priority: 'A',
  directConnectorAvailable: false,
  handoffInstructions: [
    '1. Exportar fichero BOE posicional del Modelo 190 desde el sistema',
    '2. Acceder a Sede Electrónica AEAT',
    '3. Seleccionar "Modelo 190 - Resumen anual de retenciones"',
    '4. Seleccionar "Importar fichero" y cargar el fichero BOE',
    '5. Validar datos (perceptores, retenciones, totales)',
    '6. Firmar con certificado/DNIe/Cl@ve',
    '7. Confirmar presentación y obtener CSV justificante',
    '8. Importar CSV y justificante en el sistema ERP',
  ],
  expectedResponseType: 'csv_justificante_aeat',
  retryPolicy: { maxRetries: 3, retryDelayMinutes: 120, autoRetryAllowed: false, requiresManualReview: true },
  blockingGaps: ['Certificado electrónico/DNIe/Cl@ve no configurado', 'Sin conector directo a Sede AEAT'],
};

export const ADAPTER_REGISTRY: OfficialAdapter[] = [
  CONTRATA_ADAPTER,
  AEAT_111_ADAPTER,
  AEAT_190_ADAPTER,
  TGSS_ADAPTER,
  CERTIFICA_ADAPTER,
];

export function getAdapterByOrganism(organism: string): OfficialAdapter | undefined {
  return ADAPTER_REGISTRY.find(a => a.organism === organism || a.id === organism);
}

export function getAdapterById(id: string): OfficialAdapter | undefined {
  return ADAPTER_REGISTRY.find(a => a.id === id);
}

// ── Handoff Package ─────────────────────────────────────────────────────────

export interface HandoffPackage {
  adapterId: string;
  organism: string;
  organismLabel: string;
  artifactType: string;
  channelType: ChannelType;
  payload: Record<string, unknown> | null;
  payloadFormat: OfficialFormatType;
  metadata: {
    companyId: string;
    period: string;
    fiscalYear: number;
    generatedAt: string;
    generatedBy: string | null;
    submissionId: string | null;
  };
  signatureRequired: boolean;
  signatureCompleted: boolean;
  certificateRequired: boolean;
  certificateAvailable: boolean;
  submissionInstructions: string[];
  expectedResponseType: string;
  retryPolicy: RetryPolicy;
  blockingGaps: string[];
  readinessLevel: ReadinessLevel;
  isRealSubmissionBlocked: true; // always true
}

export function buildHandoffPackage(params: {
  adapter: OfficialAdapter;
  artifactType: string;
  payload: Record<string, unknown> | null;
  companyId: string;
  period: string;
  fiscalYear: number;
  generatedBy: string | null;
  submissionId: string | null;
  signatureCompleted?: boolean;
  certificateAvailable?: boolean;
}): HandoffPackage {
  const readiness = computeOrganismReadiness({
    adapter: params.adapter,
    hasCredentials: false,
    hasCertificate: params.certificateAvailable ?? false,
    hasPassedSandbox: false,
    hasPassedUAT: false,
    payloadGenerated: !!params.payload,
    signatureCompleted: params.signatureCompleted ?? false,
  });

  return {
    adapterId: params.adapter.id,
    organism: params.adapter.organism,
    organismLabel: params.adapter.organismLabel,
    artifactType: params.artifactType,
    channelType: params.adapter.channelType,
    payload: params.payload,
    payloadFormat: params.adapter.formatType,
    metadata: {
      companyId: params.companyId,
      period: params.period,
      fiscalYear: params.fiscalYear,
      generatedAt: new Date().toISOString(),
      generatedBy: params.generatedBy,
      submissionId: params.submissionId,
    },
    signatureRequired: params.adapter.requiresSignature,
    signatureCompleted: params.signatureCompleted ?? false,
    certificateRequired: params.adapter.requiresCertificate,
    certificateAvailable: params.certificateAvailable ?? false,
    submissionInstructions: params.adapter.handoffInstructions,
    expectedResponseType: params.adapter.expectedResponseType,
    retryPolicy: params.adapter.retryPolicy,
    blockingGaps: params.adapter.blockingGaps,
    readinessLevel: readiness,
    isRealSubmissionBlocked: true,
  };
}

// ── Error Taxonomy ──────────────────────────────────────────────────────────

export type OfficialErrorType =
  | 'validation_error'
  | 'schema_error'
  | 'credential_error'
  | 'signature_error'
  | 'submission_error'
  | 'response_parse_error'
  | 'organism_rejection'
  | 'timeout_or_missing_receipt'
  | 'manual_intervention_required';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ClassifiedError {
  type: OfficialErrorType;
  severity: ErrorSeverity;
  suggestedAction: string;
  autoRetryAllowed: boolean;
  requiresManualFix: boolean;
  originalMessage: string;
  organism?: string;
}

interface ErrorTaxonomyEntry {
  type: OfficialErrorType;
  severity: ErrorSeverity;
  suggestedAction: string;
  autoRetryAllowed: boolean;
  requiresManualFix: boolean;
  patterns: RegExp[];
}

const ERROR_TAXONOMY: ErrorTaxonomyEntry[] = [
  {
    type: 'validation_error',
    severity: 'medium',
    suggestedAction: 'Corregir datos del artefacto y regenerar',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/validat/i, /campo.*obligatorio/i, /formato.*incorrecto/i, /nif.*inválido/i],
  },
  {
    type: 'schema_error',
    severity: 'high',
    suggestedAction: 'Verificar estructura del fichero contra especificación oficial',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/schema/i, /xsd/i, /estructura/i, /posición.*incorrecta/i, /longitud/i],
  },
  {
    type: 'credential_error',
    severity: 'critical',
    suggestedAction: 'Renovar o configurar credenciales/autorización del organismo',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/credential/i, /autorización/i, /autenticación/i, /certificado.*caducado/i, /acceso.*denegado/i],
  },
  {
    type: 'signature_error',
    severity: 'high',
    suggestedAction: 'Verificar certificado de firma y reintentar firma',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/firma/i, /signature/i, /certificado.*firma/i, /signaturit/i],
  },
  {
    type: 'submission_error',
    severity: 'high',
    suggestedAction: 'Reintentar envío; si persiste, contactar soporte del organismo',
    autoRetryAllowed: true,
    requiresManualFix: false,
    patterns: [/envío/i, /submission/i, /timeout/i, /conexión/i, /servicio.*no.*disponible/i],
  },
  {
    type: 'response_parse_error',
    severity: 'medium',
    suggestedAction: 'Verificar formato de respuesta importada manualmente',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/parse/i, /respuesta.*no.*reconocida/i, /formato.*respuesta/i],
  },
  {
    type: 'organism_rejection',
    severity: 'high',
    suggestedAction: 'Revisar motivo de rechazo del organismo, corregir datos y reenviar',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/rechaz/i, /reject/i, /denegad/i, /error.*organismo/i],
  },
  {
    type: 'timeout_or_missing_receipt',
    severity: 'medium',
    suggestedAction: 'Verificar en portal del organismo si el envío fue procesado',
    autoRetryAllowed: true,
    requiresManualFix: false,
    patterns: [/timeout/i, /acuse.*no.*recibido/i, /sin.*respuesta/i, /plazo/i],
  },
  {
    type: 'manual_intervention_required',
    severity: 'critical',
    suggestedAction: 'Escalar a responsable RRHH para resolución manual',
    autoRetryAllowed: false,
    requiresManualFix: true,
    patterns: [/manual/i, /intervención/i, /escalar/i],
  },
];

export function classifyError(message: string, organism?: string): ClassifiedError {
  for (const entry of ERROR_TAXONOMY) {
    if (entry.patterns.some(p => p.test(message))) {
      return {
        type: entry.type,
        severity: entry.severity,
        suggestedAction: entry.suggestedAction,
        autoRetryAllowed: entry.autoRetryAllowed,
        requiresManualFix: entry.requiresManualFix,
        originalMessage: message,
        organism,
      };
    }
  }

  return {
    type: 'manual_intervention_required',
    severity: 'high',
    suggestedAction: 'Revisar error manualmente y determinar acción correctiva',
    autoRetryAllowed: false,
    requiresManualFix: true,
    originalMessage: message,
    organism,
  };
}

export function getErrorTaxonomyList(): Omit<ErrorTaxonomyEntry, 'patterns'>[] {
  return ERROR_TAXONOMY.map(({ patterns, ...rest }) => rest);
}

// ── Readiness Computation ───────────────────────────────────────────────────

export interface ReadinessInput {
  adapter: OfficialAdapter;
  hasCredentials: boolean;
  hasCertificate: boolean;
  hasPassedSandbox: boolean;
  hasPassedUAT: boolean;
  payloadGenerated: boolean;
  signatureCompleted: boolean;
  /** LM3: extended readiness inputs */
  formatValidationStatus?: 'not_verified' | 'partially_aligned' | 'spec_aligned' | 'sandbox_validated' | 'rejected';
  parserVerified?: boolean;
  sandboxScenariosPassedCount?: number;
  uatScenariosPassedCount?: number;
}

export function computeOrganismReadiness(input: ReadinessInput): ReadinessLevel {
  const fmtOk = input.formatValidationStatus === 'spec_aligned' || input.formatValidationStatus === 'sandbox_validated';
  const parserOk = input.parserVerified ?? false;
  const sandboxCount = input.sandboxScenariosPassedCount ?? (input.hasPassedSandbox ? 1 : 0);
  const uatCount = input.uatScenariosPassedCount ?? (input.hasPassedUAT ? 1 : 0);

  // HARD RULE: go_live_ready requires ALL 6 conditions
  if (input.hasCredentials && input.hasCertificate && fmtOk && parserOk && sandboxCount > 0 && uatCount > 0) {
    return 'go_live_ready';
  }
  if (input.hasCredentials && input.hasCertificate && sandboxCount > 0) {
    return 'uat_ready';
  }
  if ((fmtOk || sandboxCount > 0) && input.hasCertificate) {
    return 'sandbox_ready';
  }
  if (input.payloadGenerated) {
    return 'official_handoff_ready';
  }
  return 'internally_ready';
}

export const READINESS_LABELS: Record<ReadinessLevel, { label: string; color: string; description: string }> = {
  internally_ready: {
    label: 'Interno',
    color: 'bg-muted text-muted-foreground',
    description: 'Artefacto generado internamente, no preparado para envío oficial',
  },
  official_handoff_ready: {
    label: 'Handoff listo',
    color: 'bg-blue-100 text-blue-800',
    description: 'Paquete de handoff preparado para envío manual al organismo',
  },
  sandbox_ready: {
    label: 'Sandbox',
    color: 'bg-amber-100 text-amber-800',
    description: 'Listo para pruebas en entorno sandbox del organismo',
  },
  uat_ready: {
    label: 'UAT',
    color: 'bg-purple-100 text-purple-800',
    description: 'Pendiente de pruebas UAT con organismo real',
  },
  go_live_ready: {
    label: 'Producción',
    color: 'bg-green-100 text-green-800',
    description: 'Validado y listo para envío productivo real',
  },
};

// ── Safety invariant ────────────────────────────────────────────────────────

export function isRealSubmissionBlocked(): true {
  return true;
}
