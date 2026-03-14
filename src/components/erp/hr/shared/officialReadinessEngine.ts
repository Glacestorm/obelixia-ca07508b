/**
 * officialReadinessEngine — V2-ES.8 Paso 1
 * Unified readiness evaluator for ALL official integration connectors.
 * Pure function — no side effects, no DB access.
 * Evaluates: TGSS/SILTRA, Contrat@/SEPE, AEAT 111/190
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConnectorId = 'tgss_siltra' | 'contrata_sepe' | 'aeat_111' | 'aeat_190' | 'certifica2' | 'delta';

export type ReadinessLevel = 'not_ready' | 'partial' | 'ready_internal' | 'ready_dryrun';

export interface ConnectorReadiness {
  /** Connector identifier */
  connectorId: ConnectorId;
  /** Human label */
  label: string;
  /** Readiness level */
  level: ReadinessLevel;
  /** Human label for level */
  levelLabel: string;
  /** Percent readiness 0-100 */
  percent: number;
  /** Description of current state */
  description: string;
  /** Blocking issues */
  blockers: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
  /** Whether dry-run simulation is possible */
  canDryRun: boolean;
  /** Whether real integration would be possible (future) */
  canIntegrate: boolean;
  /** Sub-signals */
  signals: {
    dataComplete: boolean;
    formatValid: boolean;
    consistencyOk: boolean;
    docsReady: boolean | null;
    adapterConfigured: boolean;
    credentialsPresent: boolean;
  };
  /** Adapter status if available */
  adapterStatus: 'not_found' | 'inactive' | 'configured' | 'active';
}

export interface OfficialReadinessSummary {
  /** All connector evaluations */
  connectors: ConnectorReadiness[];
  /** Overall readiness percent (average) */
  overallPercent: number;
  /** Overall level (min of all connectors) */
  overallLevel: ReadinessLevel;
  /** Overall label */
  overallLabel: string;
  /** Total blockers across all connectors */
  totalBlockers: number;
  /** Total warnings */
  totalWarnings: number;
  /** How many can dry-run */
  dryRunReady: number;
  /** Timestamp of evaluation */
  evaluatedAt: string;
}

// ─── Level labels ───────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<ReadinessLevel, string> = {
  not_ready: 'No preparado',
  partial: 'Parcialmente preparado',
  ready_internal: 'Preparado internamente',
  ready_dryrun: 'Listo para dry-run',
};

const LEVEL_ORDER: Record<ReadinessLevel, number> = {
  not_ready: 0,
  partial: 1,
  ready_internal: 2,
  ready_dryrun: 3,
};

// ─── Input context ──────────────────────────────────────────────────────────

export interface ConnectorDataContext {
  /** Number of employees with complete registration data */
  employeesWithCompleteData: number;
  /** Total active employees */
  totalActiveEmployees: number;
  /** Number of contracts with complete data */
  contractsWithCompleteData: number;
  /** Total active contracts */
  totalActiveContracts: number;
  /** Whether payroll engine has closed periods */
  hasClosedPayrollPeriods: boolean;
  /** Number of closed payroll periods */
  closedPayrollPeriodsCount: number;
  /** Whether SS expedient exists for latest period */
  hasSSExpedient: boolean;
  /** Whether fiscal expedient exists */
  hasFiscalExpedient: boolean;
  /** Doc completeness average (0-100) */
  docCompletenessAvg: number;
  /** Adapters currently configured */
  configuredAdapters: Array<{
    id: string;
    adapter_type: string;
    system_name: string;
    is_active: boolean;
    status: string;
  }>;
  /** V2-ES.8 T3: Certificate configurations per domain */
  certificateConfigs?: Array<{
    domain: string;
    certificate_status: string;
    certificate_type: string;
    configuration_completeness: number;
    expiration_date: string | null;
    readiness_impact: string;
  }>;
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

function evaluateConnector(
  connectorId: ConnectorId,
  ctx: ConnectorDataContext,
): ConnectorReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Find matching adapter
  const adapterMap: Record<ConnectorId, string[]> = {
    tgss_siltra: ['social_security'],
    contrata_sepe: ['labor'],
    aeat_111: ['tax'],
    aeat_190: ['tax'],
    certifica2: ['labor'],
    delta: ['prevention'],
  };

  const systemMap: Record<ConnectorId, string> = {
    tgss_siltra: 'SILTRA',
    contrata_sepe: 'Contrat@',
    aeat_111: 'AEAT Mod.111',
    aeat_190: 'AEAT Mod.190',
    certifica2: 'Certific@2',
    delta: 'Delt@',
  };

  const labelMap: Record<ConnectorId, string> = {
    tgss_siltra: 'TGSS / SILTRA',
    contrata_sepe: 'Contrat@ / SEPE',
    aeat_111: 'AEAT Modelo 111',
    aeat_190: 'AEAT Modelo 190',
    certifica2: 'Certific@2',
    delta: 'Delt@',
  };

  const matchingAdapters = ctx.configuredAdapters.filter(
    a => adapterMap[connectorId]?.includes(a.adapter_type) &&
      a.system_name.toLowerCase().includes(systemMap[connectorId].toLowerCase())
  );
  const adapter = matchingAdapters[0];
  const adapterStatus: ConnectorReadiness['adapterStatus'] = !adapter
    ? 'not_found'
    : !adapter.is_active
      ? 'inactive'
      : adapter.status === 'configured'
        ? 'configured'
        : 'active';

  // ── V2-ES.8 T3: Evaluate certificate status for this connector ──
  const certDomainMap: Record<ConnectorId, string> = {
    tgss_siltra: 'tgss_siltra',
    contrata_sepe: 'contrata_sepe',
    aeat_111: 'aeat',
    aeat_190: 'aeat',
    certifica2: 'contrata_sepe',
    delta: 'tgss_siltra',
  };
  const certConfig = ctx.certificateConfigs?.find(c => c.domain === certDomainMap[connectorId]);
  const credentialsPresent = certConfig
    ? (certConfig.certificate_status === 'cert_loaded_placeholder' || certConfig.certificate_status === 'cert_ready_preparatory')
    : false;
  const certExpired = certConfig?.certificate_status === 'expired';
  const certCompleteness = certConfig?.configuration_completeness ?? 0;

  // ── Evaluate signals per connector ──
  let dataComplete = false;
  let formatValid = false;
  let consistencyOk = false;
  let docsReady: boolean | null = null;
  const adapterConfigured = adapterStatus === 'configured' || adapterStatus === 'active';

  switch (connectorId) {
    case 'tgss_siltra': {
      const ratio = ctx.totalActiveEmployees > 0
        ? ctx.employeesWithCompleteData / ctx.totalActiveEmployees
        : 0;
      dataComplete = ratio >= 0.8;
      formatValid = dataComplete; // simplified — real format via tgssPayloadBuilder
      consistencyOk = ctx.hasSSExpedient || ctx.closedPayrollPeriodsCount > 0;
      docsReady = ctx.docCompletenessAvg >= 80;
      if (!dataComplete) blockers.push(`Solo ${Math.round(ratio * 100)}% de empleados con datos completos para SS`);
      if (!ctx.hasSSExpedient) warnings.push('Sin expediente SS para el último período');
      if (!adapterConfigured) warnings.push('Conector SILTRA no configurado');
      break;
    }
    case 'contrata_sepe': {
      const ratio = ctx.totalActiveContracts > 0
        ? ctx.contractsWithCompleteData / ctx.totalActiveContracts
        : 0;
      dataComplete = ratio >= 0.8;
      formatValid = dataComplete;
      consistencyOk = dataComplete;
      docsReady = ctx.docCompletenessAvg >= 70;
      if (!dataComplete) blockers.push(`Solo ${Math.round(ratio * 100)}% de contratos con datos completos`);
      if (!adapterConfigured) warnings.push('Conector Contrat@ no configurado');
      break;
    }
    case 'aeat_111': {
      dataComplete = ctx.hasClosedPayrollPeriods;
      formatValid = dataComplete;
      consistencyOk = ctx.hasFiscalExpedient;
      docsReady = null; // no doc requirement for AEAT
      if (!dataComplete) blockers.push('Sin períodos de nómina cerrados para calcular retenciones');
      if (!ctx.hasFiscalExpedient) warnings.push('Sin expediente fiscal interno preparado');
      if (!adapterConfigured) warnings.push('Conector AEAT no configurado');
      break;
    }
    case 'aeat_190': {
      dataComplete = ctx.closedPayrollPeriodsCount >= 3; // at least a quarter
      formatValid = dataComplete;
      consistencyOk = ctx.hasFiscalExpedient;
      docsReady = null;
      if (!dataComplete) blockers.push(`Solo ${ctx.closedPayrollPeriodsCount} períodos cerrados (mínimo 3 para 190)`);
      if (!adapterConfigured) warnings.push('Conector AEAT no configurado');
      break;
    }
    case 'certifica2': {
      dataComplete = ctx.totalActiveEmployees > 0;
      formatValid = dataComplete;
      consistencyOk = ctx.hasClosedPayrollPeriods;
      docsReady = null;
      if (!dataComplete) blockers.push('Sin empleados activos registrados');
      if (!adapterConfigured) warnings.push('Conector Certific@2 no configurado');
      break;
    }
    case 'delta': {
      dataComplete = ctx.totalActiveEmployees > 0;
      formatValid = true;
      consistencyOk = true;
      docsReady = null;
      if (!dataComplete) blockers.push('Sin empleados activos');
      if (!adapterConfigured) warnings.push('Conector Delt@ no configurado');
      break;
    }
  }

  // ── V2-ES.8 T3: Certificate warnings (cross-connector) ──
  if (certExpired) {
    warnings.push('Certificado digital expirado — renovar antes de envío real');
  } else if (!credentialsPresent && certConfig && certConfig.certificate_status !== 'not_configured') {
    warnings.push(`Certificado ${certConfig.certificate_status === 'partially_configured' ? 'parcialmente configurado' : 'sin cargar'}`);
  }
  if (certConfig && certConfig.expiration_date) {
    const daysToExpiry = Math.ceil((new Date(certConfig.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry > 0 && daysToExpiry <= 30) {
      warnings.push(`Certificado expira en ${daysToExpiry} días`);
    }
  }

  // ── Calculate level & percent ──
  const signalCount = [dataComplete, formatValid, consistencyOk, docsReady !== false, adapterConfigured, credentialsPresent]
    .filter(Boolean).length;
  const signalTotal = docsReady === null ? 5 : 6;
  const percent = Math.round((signalCount / signalTotal) * 100);

  let level: ReadinessLevel;
  if (blockers.length > 0 || percent < 40) {
    level = 'not_ready';
  } else if (percent < 70) {
    level = 'partial';
  } else if (!adapterConfigured || percent < 90) {
    level = 'ready_internal';
  } else {
    level = 'ready_dryrun';
  }

  const canDryRun = level === 'ready_dryrun' || (level === 'ready_internal' && blockers.length === 0);
  const canIntegrate = false; // V2-ES.8 is always dry-run

  return {
    connectorId,
    label: labelMap[connectorId],
    level,
    levelLabel: LEVEL_LABELS[level],
    percent,
    description: getDescription(connectorId, level),
    blockers,
    warnings,
    canDryRun,
    canIntegrate,
    signals: {
      dataComplete,
      formatValid,
      consistencyOk,
      docsReady,
      adapterConfigured,
      credentialsPresent,
    },
    adapterStatus,
  };
}

function getDescription(id: ConnectorId, level: ReadinessLevel): string {
  const base: Record<ConnectorId, string> = {
    tgss_siltra: 'Altas, bajas, variaciones y cotización SS',
    contrata_sepe: 'Comunicación de contratos al SEPE',
    aeat_111: 'Retenciones e ingresos a cuenta trimestrales',
    aeat_190: 'Resumen anual de retenciones',
    certifica2: 'Certificados de empresa para prestaciones',
    delta: 'Comunicación de accidentes de trabajo',
  };
  return base[id];
}

// ─── Main evaluator ─────────────────────────────────────────────────────────

/** Primary connectors to always evaluate */
const PRIMARY_CONNECTORS: ConnectorId[] = ['tgss_siltra', 'contrata_sepe', 'aeat_111', 'aeat_190'];
/** Secondary connectors — only if adapter exists */
const SECONDARY_CONNECTORS: ConnectorId[] = ['certifica2', 'delta'];

export function evaluateOfficialReadiness(
  ctx: ConnectorDataContext,
  options?: { includeSecondary?: boolean },
): OfficialReadinessSummary {
  const connectorsToEval = [
    ...PRIMARY_CONNECTORS,
    ...(options?.includeSecondary ? SECONDARY_CONNECTORS : []),
  ];

  const connectors = connectorsToEval.map(id => evaluateConnector(id, ctx));

  const overallPercent = connectors.length > 0
    ? Math.round(connectors.reduce((sum, c) => sum + c.percent, 0) / connectors.length)
    : 0;

  const minLevel = connectors.reduce<ReadinessLevel>((min, c) => {
    return LEVEL_ORDER[c.level] < LEVEL_ORDER[min] ? c.level : min;
  }, 'ready_dryrun');

  return {
    connectors,
    overallPercent,
    overallLevel: connectors.length === 0 ? 'not_ready' : minLevel,
    overallLabel: LEVEL_LABELS[connectors.length === 0 ? 'not_ready' : minLevel],
    totalBlockers: connectors.reduce((sum, c) => sum + c.blockers.length, 0),
    totalWarnings: connectors.reduce((sum, c) => sum + c.warnings.length, 0),
    dryRunReady: connectors.filter(c => c.canDryRun).length,
    evaluatedAt: new Date().toISOString(),
  };
}
