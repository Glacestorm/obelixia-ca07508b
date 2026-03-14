/**
 * sandboxEnvironmentEngine.ts — Motor de entornos sandbox para conectores regulatorios
 * V2-ES.8 T8: Modelado de entornos, gates, separación de credenciales y barreras de seguridad
 * 
 * INVARIANTE: isRealSubmissionBlocked() === true se mantiene.
 * producción queda bloqueada por defecto; sandbox/test/preprod son los únicos habilitables.
 */

// ======================== TYPES ========================

export type ConnectorEnvironment = 'sandbox' | 'test' | 'preprod' | 'production';

export type EnvironmentStatus =
  | 'not_configured'   // Sin configuración mínima
  | 'configured'       // Credenciales/config presentes
  | 'gated'            // Configurado pero gates no cumplidos
  | 'sandbox_ready'    // Gates cumplidos, listo para habilitar
  | 'sandbox_enabled'  // Activo y ejecutable
  | 'prod_blocked';    // Invariante permanente para producción

export type SandboxDomain = 'TGSS' | 'CONTRATA' | 'AEAT';

export const SANDBOX_DOMAINS: { id: SandboxDomain; label: string; system: string }[] = [
  { id: 'TGSS', label: 'TGSS / SILTRA', system: 'siltra' },
  { id: 'CONTRATA', label: 'Contrat@ / SEPE', system: 'contrata' },
  { id: 'AEAT', label: 'AEAT (Modelo 111/190)', system: 'aeat' },
];

/** Per-domain, per-environment configuration record */
export interface DomainEnvironmentRecord {
  domain: SandboxDomain;
  environment: ConnectorEnvironment;
  status: EnvironmentStatus;
  companyId: string;
  legalEntityId: string | null;
  sandboxEnabled: boolean;
  prodEnabled: false; // INVARIANT: always false
  certificateBinding: string | null; // alias from erp_hr_domain_certificates
  configBinding: Record<string, unknown> | null;
  credentialAlias: string | null;
  metadata: {
    lastStatusChange: string;
    changedBy: string | null;
    gateSnapshot: GateEvaluationResult[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentDefinition {
  id: ConnectorEnvironment;
  label: string;
  description: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  color: string;
  icon: string;
  /** Whether this environment can be activated in the current phase */
  activatable: boolean;
  /** Gates required before activating */
  requiredGates: EnvironmentGate[];
  /** Explicit warnings shown to user */
  warnings: string[];
}

export interface EnvironmentGate {
  id: string;
  label: string;
  description: string;
  type: 'readiness' | 'approval' | 'credential' | 'certificate' | 'compliance' | 'manual';
  /** Function key to evaluate gate */
  evaluator: string;
  /** Whether this gate is blocking */
  blocking: boolean;
}

export interface ConnectorEnvironmentConfig {
  adapterId: string;
  adapterName: string;
  environment: ConnectorEnvironment;
  /** Credential set identifier (not the credentials themselves) */
  credentialAlias: string | null;
  /** Whether credentials are configured for this env */
  hasCredentials: boolean;
  /** Whether the connector is enabled in this env */
  isEnabled: boolean;
  /** Activation timestamp */
  enabledAt: string | null;
  /** Who enabled it */
  enabledBy: string | null;
  /** Gate evaluation results */
  gateResults: GateEvaluationResult[];
  /** Last execution in this env */
  lastExecutionAt: string | null;
  lastExecutionStatus: 'success' | 'failure' | 'timeout' | null;
  /** Execution count in this env */
  executionCount: number;
}

export interface GateEvaluationResult {
  gateId: string;
  passed: boolean;
  reason: string;
  evaluatedAt: string;
}

export interface SandboxExecution {
  id: string;
  adapterId: string;
  environment: ConnectorEnvironment;
  executionType: 'dry_run' | 'sandbox_submit' | 'test_connect' | 'preprod_validate';
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  request: {
    payloadHash: string;
    submissionType: string;
    domain: string;
  };
  response: {
    statusCode: number | null;
    accepted: boolean | null;
    errors: string[];
    warnings: string[];
    rawResponseHash: string | null;
  } | null;
  initiatedBy: string;
  auditTrail: SandboxAuditEntry[];
}

export interface SandboxAuditEntry {
  timestamp: string;
  event: string;
  detail: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface EnvironmentSummary {
  activeEnvironment: ConnectorEnvironment;
  configuredEnvironments: ConnectorEnvironment[];
  productionBlocked: true; // Always true — invariant
  sandboxReady: boolean;
  testReady: boolean;
  preprodReady: boolean;
  totalSandboxExecutions: number;
  lastSandboxExecution: string | null;
  pendingGates: { environment: ConnectorEnvironment; gates: string[] }[];
  /** Domain-level status overview */
  domainStatuses: { domain: SandboxDomain; environment: ConnectorEnvironment; status: EnvironmentStatus }[];
}

// ======================== CONSTANTS ========================

export const ENVIRONMENT_DEFINITIONS: Record<ConnectorEnvironment, EnvironmentDefinition> = {
  sandbox: {
    id: 'sandbox',
    label: 'Sandbox',
    description: 'Entorno aislado con datos ficticios. Sin conexión real con organismos.',
    riskLevel: 'none',
    color: 'emerald',
    icon: '🧪',
    activatable: true,
    requiredGates: [
      {
        id: 'adapter_configured',
        label: 'Conector configurado',
        description: 'El conector debe tener configuración mínima definida',
        type: 'readiness',
        evaluator: 'checkAdapterConfigured',
        blocking: true,
      },
    ],
    warnings: [
      'Las respuestas en sandbox son simuladas y no reflejan el comportamiento real del organismo.',
    ],
  },
  test: {
    id: 'test',
    label: 'Test',
    description: 'Entorno de pruebas con endpoint de test del organismo (si existe).',
    riskLevel: 'low',
    color: 'blue',
    icon: '🔬',
    activatable: true,
    requiredGates: [
      {
        id: 'adapter_configured',
        label: 'Conector configurado',
        description: 'Configuración mínima requerida',
        type: 'readiness',
        evaluator: 'checkAdapterConfigured',
        blocking: true,
      },
      {
        id: 'test_credentials',
        label: 'Credenciales de test',
        description: 'Credenciales de entorno de pruebas configuradas',
        type: 'credential',
        evaluator: 'checkTestCredentials',
        blocking: true,
      },
      {
        id: 'sandbox_success',
        label: 'Éxito previo en sandbox',
        description: 'Al menos una ejecución exitosa en sandbox',
        type: 'compliance',
        evaluator: 'checkSandboxSuccess',
        blocking: true,
      },
    ],
    warnings: [
      'El entorno de test puede usar endpoints reales del organismo en modo prueba.',
      'Verifique que las credenciales son de entorno de test, NO de producción.',
    ],
  },
  preprod: {
    id: 'preprod',
    label: 'Pre-producción',
    description: 'Entorno previo a producción. Requiere aprobación formal.',
    riskLevel: 'medium',
    color: 'amber',
    icon: '⚠️',
    activatable: true,
    requiredGates: [
      {
        id: 'adapter_configured',
        label: 'Conector configurado',
        description: 'Configuración completa requerida',
        type: 'readiness',
        evaluator: 'checkAdapterConfigured',
        blocking: true,
      },
      {
        id: 'preprod_credentials',
        label: 'Credenciales pre-prod',
        description: 'Credenciales de pre-producción configuradas',
        type: 'credential',
        evaluator: 'checkPreprodCredentials',
        blocking: true,
      },
      {
        id: 'certificate_valid',
        label: 'Certificado digital válido',
        description: 'Certificado digital configurado y no expirado',
        type: 'certificate',
        evaluator: 'checkCertificateValid',
        blocking: true,
      },
      {
        id: 'pre_real_approval',
        label: 'Aprobación pre-real',
        description: 'Aprobación formal del workflow pre-real',
        type: 'approval',
        evaluator: 'checkPreRealApproval',
        blocking: true,
      },
      {
        id: 'test_success',
        label: 'Éxito previo en test',
        description: 'Al menos una ejecución exitosa en entorno test',
        type: 'compliance',
        evaluator: 'checkTestSuccess',
        blocking: true,
      },
    ],
    warnings: [
      'Pre-producción puede interactuar con endpoints cercanos a producción.',
      'Requiere aprobación formal antes de activación.',
      'Este entorno NO es producción — no genera obligaciones legales.',
    ],
  },
  production: {
    id: 'production',
    label: 'Producción',
    description: 'BLOQUEADO — No disponible en esta fase del sistema.',
    riskLevel: 'critical',
    color: 'red',
    icon: '🚫',
    activatable: false, // INVARIANT: always false
    requiredGates: [
      {
        id: 'production_blocked',
        label: 'Producción bloqueada',
        description: 'La fase actual no permite activación de producción',
        type: 'manual',
        evaluator: 'blockProduction',
        blocking: true,
      },
    ],
    warnings: [
      'PRODUCCIÓN NO DISPONIBLE — El sistema no permite envíos oficiales en esta fase.',
      'La activación de producción requiere una fase posterior del roadmap.',
    ],
  },
};

/** Central safety invariant — MUST always return true in current phase */
export function isRealSubmissionBlocked(): boolean {
  return true;
}

/** Check if an environment can be activated */
export function isEnvironmentActivatable(env: ConnectorEnvironment): boolean {
  if (env === 'production') return false; // Hard block
  return ENVIRONMENT_DEFINITIONS[env].activatable;
}

// ======================== GATE EVALUATORS ========================

export function evaluateGates(
  env: ConnectorEnvironment,
  context: {
    adapterConfigured: boolean;
    hasTestCredentials: boolean;
    hasPreprodCredentials: boolean;
    hasCertificate: boolean;
    certificateExpired: boolean;
    hasPreRealApproval: boolean;
    sandboxSuccessCount: number;
    testSuccessCount: number;
  }
): GateEvaluationResult[] {
  const def = ENVIRONMENT_DEFINITIONS[env];
  const now = new Date().toISOString();

  return def.requiredGates.map((gate): GateEvaluationResult => {
    let passed = false;
    let reason = '';

    switch (gate.evaluator) {
      case 'checkAdapterConfigured':
        passed = context.adapterConfigured;
        reason = passed ? 'Conector configurado correctamente' : 'Conector sin configuración mínima';
        break;
      case 'checkTestCredentials':
        passed = context.hasTestCredentials;
        reason = passed ? 'Credenciales de test disponibles' : 'Faltan credenciales de entorno test';
        break;
      case 'checkPreprodCredentials':
        passed = context.hasPreprodCredentials;
        reason = passed ? 'Credenciales pre-prod disponibles' : 'Faltan credenciales de pre-producción';
        break;
      case 'checkCertificateValid':
        passed = context.hasCertificate && !context.certificateExpired;
        reason = !context.hasCertificate
          ? 'Sin certificado digital configurado'
          : context.certificateExpired
            ? 'Certificado digital expirado'
            : 'Certificado digital válido';
        break;
      case 'checkPreRealApproval':
        passed = context.hasPreRealApproval;
        reason = passed ? 'Aprobación pre-real concedida' : 'Pendiente de aprobación pre-real';
        break;
      case 'checkSandboxSuccess':
        passed = context.sandboxSuccessCount > 0;
        reason = passed
          ? `${context.sandboxSuccessCount} ejecución(es) exitosa(s) en sandbox`
          : 'Sin ejecuciones exitosas en sandbox';
        break;
      case 'checkTestSuccess':
        passed = context.testSuccessCount > 0;
        reason = passed
          ? `${context.testSuccessCount} ejecución(es) exitosa(s) en test`
          : 'Sin ejecuciones exitosas en test';
        break;
      case 'blockProduction':
        passed = false;
        reason = 'Producción bloqueada por diseño en esta fase';
        break;
      default:
        reason = `Evaluador desconocido: ${gate.evaluator}`;
    }

    return { gateId: gate.id, passed, reason, evaluatedAt: now };
  });
}

/** Check if all blocking gates pass for an environment */
export function allBlockingGatesPassed(
  env: ConnectorEnvironment,
  results: GateEvaluationResult[]
): boolean {
  const def = ENVIRONMENT_DEFINITIONS[env];
  const blockingGateIds = def.requiredGates.filter(g => g.blocking).map(g => g.id);
  return blockingGateIds.every(gid => results.find(r => r.gateId === gid)?.passed === true);
}

// ======================== EXECUTION FACTORY ========================

export function createSandboxExecution(params: {
  adapterId: string;
  environment: ConnectorEnvironment;
  executionType: SandboxExecution['executionType'];
  submissionType: string;
  domain: string;
  payloadHash: string;
  initiatedBy: string;
}): SandboxExecution {
  if (params.environment === 'production') {
    throw new Error('SECURITY: Cannot create execution in production environment');
  }

  return {
    id: crypto.randomUUID(),
    adapterId: params.adapterId,
    environment: params.environment,
    executionType: params.executionType,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    request: {
      payloadHash: params.payloadHash,
      submissionType: params.submissionType,
      domain: params.domain,
    },
    response: null,
    initiatedBy: params.initiatedBy,
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        event: 'execution_started',
        detail: `Ejecución ${params.executionType} iniciada en ${params.environment}`,
        severity: 'info',
      },
    ],
  };
}

export function completeExecution(
  execution: SandboxExecution,
  result: {
    statusCode: number | null;
    accepted: boolean;
    errors: string[];
    warnings: string[];
  }
): SandboxExecution {
  const now = new Date();
  return {
    ...execution,
    status: result.accepted ? 'completed' : 'failed',
    completedAt: now.toISOString(),
    durationMs: now.getTime() - new Date(execution.startedAt).getTime(),
    response: {
      ...result,
      rawResponseHash: crypto.randomUUID().slice(0, 16),
    },
    auditTrail: [
      ...execution.auditTrail,
      {
        timestamp: now.toISOString(),
        event: result.accepted ? 'execution_completed' : 'execution_failed',
        detail: result.accepted
          ? `Ejecución completada exitosamente en ${execution.environment}`
          : `Ejecución fallida: ${result.errors.join('; ')}`,
        severity: result.accepted ? 'info' : 'warning',
      },
    ],
  };
}

// ======================== DISCLAIMERS ========================

export const SANDBOX_DISCLAIMERS = {
  sandbox: 'Entorno SANDBOX: datos simulados, sin conexión con organismos oficiales. No genera obligaciones.',
  test: 'Entorno TEST: conexión con endpoint de pruebas del organismo. Datos no oficiales.',
  preprod: 'Entorno PRE-PRODUCCIÓN: próximo a producción pero SIN efecto legal. No constituye presentación oficial.',
  production: 'PRODUCCIÓN BLOQUEADA: no disponible en esta fase del sistema.',
  general: 'Este entorno es preparatorio e interno. No sustituye la presentación oficial ante el organismo correspondiente.',
} as const;

export function getEnvironmentDisclaimer(env: ConnectorEnvironment): string {
  return SANDBOX_DISCLAIMERS[env];
}

// ======================== SUMMARY BUILDER ========================

export function buildEnvironmentSummary(
  configs: ConnectorEnvironmentConfig[]
): EnvironmentSummary {
  const sandboxConfigs = configs.filter(c => c.environment === 'sandbox');
  const testConfigs = configs.filter(c => c.environment === 'test');
  const preprodConfigs = configs.filter(c => c.environment === 'preprod');

  const allExecutions = configs.flatMap(c =>
    c.lastExecutionAt ? [{ at: c.lastExecutionAt, env: c.environment }] : []
  );

  const pendingGates: EnvironmentSummary['pendingGates'] = [];
  for (const config of configs) {
    const failedGates = config.gateResults.filter(g => !g.passed).map(g => g.gateId);
    if (failedGates.length > 0) {
      pendingGates.push({ environment: config.environment, gates: failedGates });
    }
  }

  return {
    activeEnvironment: 'sandbox', // Default active
    configuredEnvironments: [
      ...(sandboxConfigs.some(c => c.isEnabled) ? ['sandbox' as const] : []),
      ...(testConfigs.some(c => c.isEnabled) ? ['test' as const] : []),
      ...(preprodConfigs.some(c => c.isEnabled) ? ['preprod' as const] : []),
    ],
    productionBlocked: true,
    sandboxReady: sandboxConfigs.some(c => c.gateResults.every(g => g.passed)),
    testReady: testConfigs.some(c => c.gateResults.every(g => g.passed)),
    preprodReady: preprodConfigs.some(c => c.gateResults.every(g => g.passed)),
    totalSandboxExecutions: configs.reduce((sum, c) => sum + c.executionCount, 0),
    lastSandboxExecution: allExecutions.sort((a, b) => b.at.localeCompare(a.at))[0]?.at || null,
    pendingGates,
  };
}
