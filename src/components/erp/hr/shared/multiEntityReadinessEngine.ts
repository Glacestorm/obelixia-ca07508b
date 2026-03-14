/**
 * multiEntityReadinessEngine — V2-ES.8 Tramo 4
 * Consolidated readiness evaluation across legal entities and work centers.
 *
 * Pure function — no side effects, no DB access.
 * Consumes data gathered by hooks and produces a multi-entity readiness summary.
 */

import type {
  OfficialReadinessSummary,
  ConnectorReadiness,
  ReadinessLevel,
  ConnectorDataContext,
} from '@/components/erp/hr/shared/officialReadinessEngine';
import { evaluateOfficialReadiness } from '@/components/erp/hr/shared/officialReadinessEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EntityReadinessInput {
  entityId: string;
  entityName: string;
  entityType: 'legal_entity' | 'work_center' | 'company';
  /** CIF / NIF of the entity (if applicable) */
  fiscalId?: string;
  /** Data context for this entity */
  dataContext: ConnectorDataContext;
}

export interface EntityReadinessResult {
  entityId: string;
  entityName: string;
  entityType: EntityReadinessInput['entityType'];
  fiscalId?: string;
  summary: OfficialReadinessSummary;
  /** Per-connector status */
  connectorStatus: Record<string, {
    level: ReadinessLevel;
    percent: number;
    blockers: number;
    canDryRun: boolean;
  }>;
}

export interface MultiEntityReadinessReport {
  /** Individual entity results */
  entities: EntityReadinessResult[];
  /** Consolidated metrics */
  consolidated: {
    /** Average readiness across all entities */
    avgPercent: number;
    /** Min readiness (weakest entity) */
    minPercent: number;
    /** Max readiness (strongest entity) */
    maxPercent: number;
    /** Overall level (min of all entities) */
    overallLevel: ReadinessLevel;
    /** Total blockers across all entities */
    totalBlockers: number;
    /** Total warnings */
    totalWarnings: number;
    /** How many entities can dry-run at least 1 connector */
    entitiesWithDryRun: number;
    /** How many entities have all primary connectors ready */
    fullyReadyEntities: number;
  };
  /** Per-domain consolidated view */
  byDomain: Record<string, {
    label: string;
    avgPercent: number;
    entitiesReady: number;
    totalEntities: number;
    hasBlockers: boolean;
  }>;
  /** Human summary */
  summaryLabel: string;
  /** Generated at */
  evaluatedAt: string;
}

// ─── Level ordering ─────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<ReadinessLevel, number> = {
  not_ready: 0,
  partial: 1,
  ready_internal: 2,
  ready_dryrun: 3,
};

const LEVEL_LABELS: Record<ReadinessLevel, string> = {
  not_ready: 'No preparado',
  partial: 'Parcialmente preparado',
  ready_internal: 'Preparado internamente',
  ready_dryrun: 'Listo para dry-run',
};

// ─── Connector-to-domain mapping ────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  tgss_siltra: 'TGSS / SILTRA',
  contrata_sepe: 'Contrat@ / SEPE',
  aeat_111: 'AEAT Mod. 111',
  aeat_190: 'AEAT Mod. 190',
  certifica2: 'Certific@2',
  delta: 'Delt@',
};

// ─── Main evaluator ─────────────────────────────────────────────────────────

/**
 * Evaluate readiness across multiple legal entities / work centers.
 */
export function evaluateMultiEntityReadiness(
  inputs: EntityReadinessInput[],
): MultiEntityReadinessReport {
  if (inputs.length === 0) {
    return {
      entities: [],
      consolidated: {
        avgPercent: 0,
        minPercent: 0,
        maxPercent: 0,
        overallLevel: 'not_ready',
        totalBlockers: 0,
        totalWarnings: 0,
        entitiesWithDryRun: 0,
        fullyReadyEntities: 0,
      },
      byDomain: {},
      summaryLabel: 'Sin entidades configuradas',
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Evaluate each entity
  const entities: EntityReadinessResult[] = inputs.map(input => {
    const summary = evaluateOfficialReadiness(input.dataContext, { includeSecondary: true });

    const connectorStatus: EntityReadinessResult['connectorStatus'] = {};
    for (const c of summary.connectors) {
      connectorStatus[c.connectorId] = {
        level: c.level,
        percent: c.percent,
        blockers: c.blockers.length,
        canDryRun: c.canDryRun,
      };
    }

    return {
      entityId: input.entityId,
      entityName: input.entityName,
      entityType: input.entityType,
      fiscalId: input.fiscalId,
      summary,
      connectorStatus,
    };
  });

  // Consolidated metrics
  const percents = entities.map(e => e.summary.overallPercent);
  const avgPercent = Math.round(percents.reduce((s, p) => s + p, 0) / percents.length);
  const minPercent = Math.min(...percents);
  const maxPercent = Math.max(...percents);

  const overallLevel = entities.reduce<ReadinessLevel>((min, e) => {
    return LEVEL_ORDER[e.summary.overallLevel] < LEVEL_ORDER[min] ? e.summary.overallLevel : min;
  }, 'ready_dryrun');

  const totalBlockers = entities.reduce((s, e) => s + e.summary.totalBlockers, 0);
  const totalWarnings = entities.reduce((s, e) => s + e.summary.totalWarnings, 0);
  const entitiesWithDryRun = entities.filter(e => e.summary.dryRunReady > 0).length;

  const PRIMARY_CONNECTORS = ['tgss_siltra', 'contrata_sepe', 'aeat_111', 'aeat_190'];
  const fullyReadyEntities = entities.filter(e =>
    PRIMARY_CONNECTORS.every(cId => {
      const cs = e.connectorStatus[cId];
      return cs && cs.canDryRun;
    })
  ).length;

  // Per-domain view
  const byDomain: MultiEntityReadinessReport['byDomain'] = {};
  const allConnectorIds = new Set<string>();
  for (const e of entities) {
    for (const c of e.summary.connectors) {
      allConnectorIds.add(c.connectorId);
    }
  }

  for (const cId of allConnectorIds) {
    const domainEntities = entities.filter(e => e.connectorStatus[cId]);
    const domainPercents = domainEntities.map(e => e.connectorStatus[cId].percent);
    const domainReady = domainEntities.filter(e => e.connectorStatus[cId].canDryRun).length;
    const domainBlockers = domainEntities.some(e => e.connectorStatus[cId].blockers > 0);

    byDomain[cId] = {
      label: DOMAIN_LABELS[cId] || cId,
      avgPercent: domainPercents.length > 0
        ? Math.round(domainPercents.reduce((s, p) => s + p, 0) / domainPercents.length)
        : 0,
      entitiesReady: domainReady,
      totalEntities: domainEntities.length,
      hasBlockers: domainBlockers,
    };
  }

  // Summary label
  let summaryLabel: string;
  if (fullyReadyEntities === entities.length) {
    summaryLabel = `${entities.length} entidad(es) completamente preparada(s)`;
  } else if (entitiesWithDryRun > 0) {
    summaryLabel = `${entitiesWithDryRun} de ${entities.length} entidad(es) con dry-run disponible`;
  } else {
    summaryLabel = `${entities.length} entidad(es) pendientes de preparación`;
  }

  return {
    entities,
    consolidated: {
      avgPercent,
      minPercent,
      maxPercent,
      overallLevel,
      totalBlockers,
      totalWarnings,
      entitiesWithDryRun,
      fullyReadyEntities,
    },
    byDomain,
    summaryLabel,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Get a color class for entity readiness (using semantic tokens where possible).
 */
export function getEntityReadinessColor(percent: number): string {
  if (percent >= 80) return 'text-green-600';
  if (percent >= 50) return 'text-blue-500';
  if (percent >= 30) return 'text-amber-500';
  return 'text-destructive';
}
