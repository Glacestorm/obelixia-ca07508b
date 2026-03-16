/**
 * officialReadinessMatrixEngine.ts — V2-RRHH-FASE-4
 * Unified readiness matrix engine for Spanish official integrations.
 *
 * Provides:
 *  - Unified operational status taxonomy (10 states)
 *  - Per-circuit readiness evaluation
 *  - Honest labeling (mock/sandbox/preparatory/production)
 *  - System limits declaration
 *
 * Reuses: officialReadinessEngine (ConnectorReadiness), preparatorySubmissionEngine (PreparatorySubmissionStatus)
 * Pure functions — no side-effects.
 */

import type { ConnectorId, ConnectorReadiness, ReadinessLevel } from '@/components/erp/hr/shared/officialReadinessEngine';
import type { PreparatorySubmissionStatus, SubmissionDomain } from '@/components/erp/hr/shared/preparatorySubmissionEngine';

// ─── Unified Operational Status ─────────────────────────────────────────────

export type OfficialOperationalStatus =
  | 'not_configured'
  | 'blocked'
  | 'data_incomplete'
  | 'mock'
  | 'preparatory'
  | 'sandbox_ready'
  | 'production_ready'
  | 'submitted'
  | 'reconciled'
  | 'error';

export interface OperationalStatusMeta {
  label: string;
  labelShort: string;
  description: string;
  color: string;
  icon: string;
  isReal: boolean;
  requiresDisclaimer: boolean;
}

export const OPERATIONAL_STATUS_META: Record<OfficialOperationalStatus, OperationalStatusMeta> = {
  not_configured: {
    label: 'No configurado',
    labelShort: 'Sin config.',
    description: 'El circuito no tiene configuración mínima para operar.',
    color: 'bg-muted text-muted-foreground',
    icon: 'circle-off',
    isReal: false,
    requiresDisclaimer: false,
  },
  blocked: {
    label: 'Bloqueado',
    labelShort: 'Bloqueado',
    description: 'Existen impedimentos que bloquean cualquier avance (certificados, datos críticos, etc.).',
    color: 'bg-destructive/10 text-destructive',
    icon: 'shield-x',
    isReal: false,
    requiresDisclaimer: false,
  },
  data_incomplete: {
    label: 'Datos incompletos',
    labelShort: 'Incompleto',
    description: 'Faltan datos obligatorios del ERP para generar el payload del organismo.',
    color: 'bg-amber-500/10 text-amber-700',
    icon: 'file-warning',
    isReal: false,
    requiresDisclaimer: false,
  },
  mock: {
    label: 'Mock / Simulación',
    labelShort: 'Mock',
    description: 'Solo datos ficticios o de prueba. No refleja información real del cliente.',
    color: 'bg-purple-500/10 text-purple-700',
    icon: 'test-tube',
    isReal: false,
    requiresDisclaimer: true,
  },
  preparatory: {
    label: 'Preparatorio (interno)',
    labelShort: 'Preparatorio',
    description: 'Datos reales transformados al formato del organismo. NO constituye envío oficial.',
    color: 'bg-blue-500/10 text-blue-700',
    icon: 'clipboard-check',
    isReal: false,
    requiresDisclaimer: true,
  },
  sandbox_ready: {
    label: 'Sandbox / Dry-run disponible',
    labelShort: 'Sandbox',
    description: 'Payload validado internamente. Se puede ejecutar simulación sin envío real.',
    color: 'bg-indigo-500/10 text-indigo-700',
    icon: 'flask-conical',
    isReal: false,
    requiresDisclaimer: true,
  },
  production_ready: {
    label: 'Listo para producción',
    labelShort: 'Prod. ready',
    description: 'Todos los requisitos técnicos cumplidos. Pendiente de certificados reales y autorización.',
    color: 'bg-emerald-500/10 text-emerald-700',
    icon: 'rocket',
    isReal: false,
    requiresDisclaimer: true,
  },
  submitted: {
    label: 'Enviado (oficial)',
    labelShort: 'Enviado',
    description: 'Comunicación oficial transmitida al organismo.',
    color: 'bg-green-600/10 text-green-800',
    icon: 'send',
    isReal: true,
    requiresDisclaimer: false,
  },
  reconciled: {
    label: 'Reconciliado',
    labelShort: 'Reconciliado',
    description: 'Envío aceptado y confirmado por el organismo con acuse oficial.',
    color: 'bg-green-700/10 text-green-900',
    icon: 'check-circle-2',
    isReal: true,
    requiresDisclaimer: false,
  },
  error: {
    label: 'Error',
    labelShort: 'Error',
    description: 'Se produjo un error en la validación, transmisión o procesamiento.',
    color: 'bg-red-500/10 text-red-700',
    icon: 'alert-circle',
    isReal: false,
    requiresDisclaimer: false,
  },
};

// ─── Circuit Definition ─────────────────────────────────────────────────────

export type CircuitId =
  | 'tgss_afiliacion'
  | 'tgss_cotizacion'
  | 'contrata_comunicacion'
  | 'contrata_finalizacion'
  | 'certifica2'
  | 'delta_accidentes'
  | 'aeat_111'
  | 'aeat_190'
  | 'rlc_rnt';

export interface CircuitDefinition {
  id: CircuitId;
  connectorId: ConnectorId;
  domain: SubmissionDomain;
  label: string;
  organism: string;
  description: string;
  /** What period type this circuit operates on */
  periodicity: 'event' | 'monthly' | 'quarterly' | 'annual';
  /** Current system capability limit */
  systemLimit: CircuitSystemLimit;
}

export type CircuitSystemLimit =
  | 'full_preparatory'      // Can generate, validate, dry-run. Cannot submit.
  | 'partial_preparatory'   // Can partially generate. Some gaps.
  | 'modeled_only'          // Data model exists but no generator/validator.
  | 'not_modeled';          // Not implemented at all.

export const CIRCUIT_DEFINITIONS: CircuitDefinition[] = [
  {
    id: 'tgss_afiliacion', connectorId: 'tgss_siltra', domain: 'TGSS',
    label: 'Alta / Afiliación TGSS', organism: 'TGSS / SILTRA',
    description: 'Comunicación de alta, baja y variaciones de datos de trabajadores.',
    periodicity: 'event', systemLimit: 'full_preparatory',
  },
  {
    id: 'tgss_cotizacion', connectorId: 'tgss_siltra', domain: 'TGSS',
    label: 'Cotización mensual TGSS', organism: 'TGSS / SILTRA',
    description: 'Liquidación mensual de cuotas de Seguridad Social.',
    periodicity: 'monthly', systemLimit: 'full_preparatory',
  },
  {
    id: 'contrata_comunicacion', connectorId: 'contrata_sepe', domain: 'CONTRATA',
    label: 'Comunicación de contratos', organism: 'SEPE / Contrat@',
    description: 'Registro obligatorio de contratos laborales.',
    periodicity: 'event', systemLimit: 'full_preparatory',
  },
  {
    id: 'contrata_finalizacion', connectorId: 'contrata_sepe', domain: 'CONTRATA',
    label: 'Finalización de contratos', organism: 'SEPE / Contrat@',
    description: 'Comunicación de extinción de contratos.',
    periodicity: 'event', systemLimit: 'full_preparatory',
  },
  {
    id: 'certifica2', connectorId: 'certifica2', domain: 'CERTIFICA2',
    label: 'Certificados de empresa', organism: 'SEPE / Certific@2',
    description: 'Emisión de certificados para prestaciones por desempleo.',
    periodicity: 'event', systemLimit: 'modeled_only',
  },
  {
    id: 'delta_accidentes', connectorId: 'delta', domain: 'DELTA',
    label: 'Partes de accidente', organism: 'MITES / Delt@',
    description: 'Comunicación de accidentes de trabajo y enfermedades profesionales.',
    periodicity: 'event', systemLimit: 'modeled_only',
  },
  {
    id: 'aeat_111', connectorId: 'aeat_111', domain: 'AEAT_111',
    label: 'Modelo 111 (retenciones)', organism: 'AEAT',
    description: 'Declaración trimestral de retenciones e ingresos a cuenta del IRPF.',
    periodicity: 'quarterly', systemLimit: 'full_preparatory',
  },
  {
    id: 'aeat_190', connectorId: 'aeat_190', domain: 'AEAT_190',
    label: 'Modelo 190 (resumen anual)', organism: 'AEAT',
    description: 'Resumen anual de retenciones e ingresos a cuenta del IRPF.',
    periodicity: 'annual', systemLimit: 'full_preparatory',
  },
  {
    id: 'rlc_rnt', connectorId: 'tgss_siltra', domain: 'TGSS',
    label: 'RLC / RNT', organism: 'TGSS / SILTRA',
    description: 'Recibo de Liquidación de Cotizaciones y Relación Nominal de Trabajadores.',
    periodicity: 'monthly', systemLimit: 'modeled_only',
  },
];

// ─── Readiness Matrix Item ──────────────────────────────────────────────────

export interface CircuitReadinessItem {
  circuit: CircuitDefinition;
  operationalStatus: OfficialOperationalStatus;
  statusMeta: OperationalStatusMeta;
  /** From officialReadinessEngine */
  connectorReadiness: ConnectorReadiness | null;
  /** Latest submission info if any */
  latestSubmission: {
    id: string;
    status: PreparatorySubmissionStatus;
    referencePeriod: string | null;
    updatedAt: string;
  } | null;
  /** Certificate status for this domain */
  certificateStatus: 'none' | 'placeholder' | 'ready_preparatory' | 'expired' | 'real';
  /** Blocking reasons */
  blockReasons: string[];
  /** What's missing for next level */
  nextSteps: string[];
  /** System capability honest label */
  systemCapabilityLabel: string;
  /** Whether isRealSubmissionBlocked applies */
  realSubmissionBlocked: boolean;
}

export interface ReadinessMatrix {
  circuits: CircuitReadinessItem[];
  overallStatus: OfficialOperationalStatus;
  totalCircuits: number;
  configured: number;
  preparatory: number;
  sandboxReady: number;
  productionReady: number;
  submitted: number;
  blocked: number;
  evaluatedAt: string;
}

// ─── Derive operational status ──────────────────────────────────────────────

export function deriveOperationalStatus(params: {
  systemLimit: CircuitSystemLimit;
  connectorReadiness: ConnectorReadiness | null;
  latestSubmissionStatus: PreparatorySubmissionStatus | null;
  certificateStatus: string;
  hasAdapter: boolean;
}): OfficialOperationalStatus {
  const { systemLimit, connectorReadiness, latestSubmissionStatus, certificateStatus, hasAdapter } = params;

  // Not modeled = not_configured
  if (systemLimit === 'not_modeled') return 'not_configured';

  // No adapter at all
  if (!hasAdapter && !connectorReadiness) return 'not_configured';

  // Check for submission-driven statuses first (most specific)
  if (latestSubmissionStatus) {
    if (['accepted'].includes(latestSubmissionStatus)) return 'reconciled';
    if (['submitted_real', 'acknowledged'].includes(latestSubmissionStatus)) return 'submitted';
    if (['rejected', 'failed', 'correction_required'].includes(latestSubmissionStatus)) return 'error';
    if (['ready_for_real', 'approved_pre_real'].includes(latestSubmissionStatus)) return 'production_ready';
    if (['dry_run_executed', 'pending_approval'].includes(latestSubmissionStatus)) return 'sandbox_ready';
    if (['validated_internal', 'ready_for_dry_run'].includes(latestSubmissionStatus)) return 'preparatory';
    if (['payload_generated'].includes(latestSubmissionStatus)) return 'preparatory';
  }

  // Fallback to connector readiness
  if (connectorReadiness) {
    if (connectorReadiness.blockers.length > 0) return 'blocked';

    switch (connectorReadiness.level) {
      case 'ready_dryrun': return 'sandbox_ready';
      case 'ready_internal': return 'preparatory';
      case 'partial': return 'data_incomplete';
      case 'not_ready': return 'data_incomplete';
    }
  }

  // System limit fallback
  if (systemLimit === 'modeled_only') return 'mock';
  if (systemLimit === 'partial_preparatory') return 'data_incomplete';

  return 'not_configured';
}

const SYSTEM_LIMIT_LABELS: Record<CircuitSystemLimit, string> = {
  full_preparatory: 'Generación, validación y dry-run completos. Envío real bloqueado.',
  partial_preparatory: 'Generación parcial. Algunos campos o validaciones pendientes.',
  modeled_only: 'Modelo de datos definido. Sin generador ni validador activo.',
  not_modeled: 'No implementado en el sistema.',
};

// ─── Build readiness matrix ─────────────────────────────────────────────────

export function buildReadinessMatrix(params: {
  connectorReadinessMap: Map<ConnectorId, ConnectorReadiness>;
  latestSubmissions: Map<CircuitId, { id: string; status: PreparatorySubmissionStatus; referencePeriod: string | null; updatedAt: string }>;
  certificateStatuses: Map<string, string>;
  adapterIds: Set<string>;
}): ReadinessMatrix {
  const { connectorReadinessMap, latestSubmissions, certificateStatuses, adapterIds } = params;

  const circuits: CircuitReadinessItem[] = CIRCUIT_DEFINITIONS.map(circuit => {
    const connectorReadiness = connectorReadinessMap.get(circuit.connectorId) ?? null;
    const latestSub = latestSubmissions.get(circuit.id) ?? null;
    const certDomain = circuit.connectorId;
    const certStatus = certificateStatuses.get(certDomain) ?? 'none';
    const hasAdapter = connectorReadiness?.adapterStatus === 'configured' || connectorReadiness?.adapterStatus === 'active' || adapterIds.size > 0;

    const operationalStatus = deriveOperationalStatus({
      systemLimit: circuit.systemLimit,
      connectorReadiness,
      latestSubmissionStatus: latestSub?.status ?? null,
      certificateStatus: certStatus,
      hasAdapter,
    });

    const blockReasons: string[] = [];
    const nextSteps: string[] = [];

    // Compute block reasons and next steps
    if (connectorReadiness) {
      blockReasons.push(...connectorReadiness.blockers);
    }

    if (circuit.systemLimit === 'not_modeled') {
      blockReasons.push('Circuito no implementado en el sistema');
    } else if (circuit.systemLimit === 'modeled_only') {
      nextSteps.push('Implementar generador de payload y validador');
    }

    if (certStatus === 'none') {
      nextSteps.push('Configurar certificado digital para este organismo');
    } else if (certStatus === 'expired') {
      blockReasons.push('Certificado digital expirado');
    }

    if (operationalStatus === 'data_incomplete' && connectorReadiness) {
      nextSteps.push('Completar datos obligatorios de empleados/contratos');
    }

    if (operationalStatus === 'preparatory') {
      nextSteps.push('Ejecutar dry-run / sandbox para validación externa');
    }

    if (operationalStatus === 'sandbox_ready') {
      nextSteps.push('Obtener certificado digital real y autorización para envío oficial');
    }

    // Always true while isRealSubmissionBlocked
    const realSubmissionBlocked = true;

    const certMapped: CircuitReadinessItem['certificateStatus'] =
      certStatus === 'cert_ready_preparatory' ? 'ready_preparatory' :
      certStatus === 'cert_loaded_placeholder' ? 'placeholder' :
      certStatus === 'expired' ? 'expired' :
      certStatus === 'real' ? 'real' : 'none';

    return {
      circuit,
      operationalStatus,
      statusMeta: OPERATIONAL_STATUS_META[operationalStatus],
      connectorReadiness,
      latestSubmission: latestSub,
      certificateStatus: certMapped,
      blockReasons,
      nextSteps,
      systemCapabilityLabel: SYSTEM_LIMIT_LABELS[circuit.systemLimit],
      realSubmissionBlocked,
    };
  });

  // Compute aggregates
  const configured = circuits.filter(c => c.operationalStatus !== 'not_configured').length;
  const preparatory = circuits.filter(c => c.operationalStatus === 'preparatory').length;
  const sandboxReady = circuits.filter(c => c.operationalStatus === 'sandbox_ready').length;
  const productionReady = circuits.filter(c => c.operationalStatus === 'production_ready').length;
  const submitted = circuits.filter(c => ['submitted', 'reconciled'].includes(c.operationalStatus)).length;
  const blocked = circuits.filter(c => c.operationalStatus === 'blocked').length;

  // Overall = worst non-configured status
  const statusPriority: OfficialOperationalStatus[] = [
    'error', 'blocked', 'not_configured', 'data_incomplete', 'mock',
    'preparatory', 'sandbox_ready', 'production_ready', 'submitted', 'reconciled',
  ];
  const activeStatuses = circuits.map(c => c.operationalStatus);
  const overallStatus = statusPriority.find(s => activeStatuses.includes(s)) ?? 'not_configured';

  return {
    circuits,
    overallStatus,
    totalCircuits: circuits.length,
    configured,
    preparatory,
    sandboxReady,
    productionReady,
    submitted,
    blocked,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─── System limits declaration ──────────────────────────────────────────────

export interface SystemLimitDeclaration {
  area: string;
  status: 'available' | 'preparatory_only' | 'modeled_only' | 'not_available';
  description: string;
}

export function getSystemLimitsDeclaration(): SystemLimitDeclaration[] {
  return [
    { area: 'Generación de payloads AFI/FAN (TGSS)', status: 'preparatory_only', description: 'Se generan archivos válidos en formato pero no se transmiten a SILTRA.' },
    { area: 'Validación interna de datos', status: 'available', description: 'Validación completa de formato, consistencia y completitud de datos.' },
    { area: 'Dry-run / sandbox', status: 'preparatory_only', description: 'Ejecución de simulación sin conexión a organismos reales.' },
    { area: 'Envío real a organismos', status: 'not_available', description: 'Requiere certificados digitales reales, endpoints oficiales y fase V2-ES.10+.' },
    { area: 'Firma digital real', status: 'not_available', description: 'No se firma digitalmente ningún documento en esta versión.' },
    { area: 'Recepción de acuses oficiales', status: 'not_available', description: 'El sistema modela acuses pero no los recibe de organismos reales.' },
    { area: 'Certificados digitales', status: 'preparatory_only', description: 'Se modelan metadatos de certificados. No se almacena material criptográfico real.' },
    { area: 'Expedientes SS/Fiscal internos', status: 'available', description: 'Generación, reconciliación y cierre de expedientes internos completo.' },
    { area: 'Modelos fiscales (111, 190)', status: 'preparatory_only', description: 'Se generan datos preparatorios. No se presenta ante AEAT.' },
    { area: 'Certific@2 / Delt@', status: 'modeled_only', description: 'Modelo de datos definido. Generador/validador parcial o pendiente.' },
  ];
}
