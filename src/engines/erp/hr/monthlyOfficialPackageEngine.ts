/**
 * monthlyOfficialPackageEngine.ts — V2-RRHH-P4
 * Aggregates all official artifacts for a given month into a unified package.
 *
 * The monthly official package groups:
 *  - FAN (bases de cotización)
 *  - RLC (recibo de liquidación)
 *  - RNT (relación nominal)
 *  - CRA (cuadro resumen)
 *  - Modelo 111 (if end-of-quarter)
 *  - Cross-validations
 *  - Expedient statuses (SS + fiscal)
 *  - Readiness per circuit
 *
 * Pure functions — no side-effects.
 *
 * IMPORTANTE: Paquete preparatorio interno. isRealSubmissionBlocked === true.
 */

import type { CrossValidationResult } from './officialCrossValidationEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PackageStatus =
  | 'incomplete'
  | 'draft'
  | 'generated'
  | 'validated'
  | 'ready_internal'
  | 'error';

export const PACKAGE_STATUS_META: Record<PackageStatus, { label: string; color: string; description: string }> = {
  incomplete: {
    label: 'Incompleto',
    color: 'bg-muted text-muted-foreground',
    description: 'Faltan artefactos obligatorios o el período no está cerrado.',
  },
  draft: {
    label: 'Borrador',
    color: 'bg-blue-500/10 text-blue-700',
    description: 'Artefactos generados pero no validados.',
  },
  generated: {
    label: 'Generado',
    color: 'bg-indigo-500/10 text-indigo-700',
    description: 'Todos los artefactos generados. Pendiente validación cruzada.',
  },
  validated: {
    label: 'Validado internamente',
    color: 'bg-emerald-500/10 text-emerald-700',
    description: 'Validaciones cruzadas superadas. NO presentado oficialmente.',
  },
  ready_internal: {
    label: 'Listo (interno)',
    color: 'bg-green-500/10 text-green-700',
    description: 'Paquete preparado internamente. NO constituye presentación oficial.',
  },
  error: {
    label: 'Error',
    color: 'bg-destructive/10 text-destructive',
    description: 'Errores detectados en validaciones cruzadas.',
  },
};

export interface ArtifactSummary {
  artifactType: string;
  artifactId: string | null;
  isGenerated: boolean;
  isValid: boolean;
  readinessPercent: number;
  statusLabel: string;
  generatedAt: string | null;
}

export interface CircuitReadiness {
  circuitId: string;
  circuitLabel: string;
  status: string;
  isReady: boolean;
}

export interface MonthlyOfficialPackage {
  id: string;
  companyId: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;

  /** Package status */
  packageStatus: PackageStatus;
  statusMeta: typeof PACKAGE_STATUS_META[PackageStatus];

  /** Individual artifact summaries */
  artifacts: ArtifactSummary[];

  /** How many artifacts generated vs required */
  artifactsGenerated: number;
  artifactsRequired: number;
  artifactCompleteness: number; // 0-100

  /** Cross-validation result */
  crossValidation: CrossValidationResult | null;
  crossValidationScore: number;

  /** Expedient statuses */
  ssExpedientStatus: string | null;
  fiscalExpedientStatus: string | null;

  /** Circuit readiness for this period */
  circuitReadiness: CircuitReadiness[];

  /** Is end of quarter (relevant for Modelo 111) */
  isEndOfQuarter: boolean;
  trimester: number | null;

  /** Overall readiness score (0-100) */
  overallReadiness: number;

  /** Honest labels */
  disclaimer: string;
  generatedAt: string;
  version: string;
}

// ─── Builder Input ──────────────────────────────────────────────────────────

export interface MonthlyPackageInput {
  companyId: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;

  /** Artifact generation status */
  fanArtifact: { id: string; isValid: boolean; readinessPercent: number; status: string; generatedAt: string } | null;
  rlcArtifact: { id: string; isValid: boolean; readinessPercent: number; status: string; generatedAt: string } | null;
  rntArtifact: { id: string; isValid: boolean; readinessPercent: number; status: string; generatedAt: string } | null;
  craArtifact: { id: string; isValid: boolean; readinessPercent: number; status: string; generatedAt: string } | null;
  modelo111Artifact: { id: string; isValid: boolean; readinessPercent: number; status: string; generatedAt: string } | null;

  /** Cross-validation */
  crossValidation: CrossValidationResult | null;

  /** Expedient statuses */
  ssExpedientStatus: string | null;
  fiscalExpedientStatus: string | null;

  /** Period status */
  periodClosed: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePackageId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `PKG-OFF-${ts}-${rand}`;
}

function isEndOfQuarter(month: number): boolean {
  return [3, 6, 9, 12].includes(month);
}

function getTrimester(month: number): number {
  return Math.ceil(month / 3);
}

// ─── Package Builder ────────────────────────────────────────────────────────

export function buildMonthlyOfficialPackage(input: MonthlyPackageInput): MonthlyOfficialPackage {
  const periodLabel = `${String(input.periodMonth).padStart(2, '0')}/${input.periodYear}`;
  const endOfQuarter = isEndOfQuarter(input.periodMonth);
  const trimester = endOfQuarter ? getTrimester(input.periodMonth) : null;

  // Build artifact summaries
  const artifacts: ArtifactSummary[] = [
    {
      artifactType: 'FAN (Bases Cotización)',
      artifactId: input.fanArtifact?.id ?? null,
      isGenerated: input.fanArtifact !== null,
      isValid: input.fanArtifact?.isValid ?? false,
      readinessPercent: input.fanArtifact?.readinessPercent ?? 0,
      statusLabel: input.fanArtifact?.status ?? 'No generado',
      generatedAt: input.fanArtifact?.generatedAt ?? null,
    },
    {
      artifactType: 'RLC (Recibo Liquidación)',
      artifactId: input.rlcArtifact?.id ?? null,
      isGenerated: input.rlcArtifact !== null,
      isValid: input.rlcArtifact?.isValid ?? false,
      readinessPercent: input.rlcArtifact?.readinessPercent ?? 0,
      statusLabel: input.rlcArtifact?.status ?? 'No generado',
      generatedAt: input.rlcArtifact?.generatedAt ?? null,
    },
    {
      artifactType: 'RNT (Relación Nominal)',
      artifactId: input.rntArtifact?.id ?? null,
      isGenerated: input.rntArtifact !== null,
      isValid: input.rntArtifact?.isValid ?? false,
      readinessPercent: input.rntArtifact?.readinessPercent ?? 0,
      statusLabel: input.rntArtifact?.status ?? 'No generado',
      generatedAt: input.rntArtifact?.generatedAt ?? null,
    },
    {
      artifactType: 'CRA (Cuadro Resumen)',
      artifactId: input.craArtifact?.id ?? null,
      isGenerated: input.craArtifact !== null,
      isValid: input.craArtifact?.isValid ?? false,
      readinessPercent: input.craArtifact?.readinessPercent ?? 0,
      statusLabel: input.craArtifact?.status ?? 'No generado',
      generatedAt: input.craArtifact?.generatedAt ?? null,
    },
  ];

  // Modelo 111 only required at end of quarter
  if (endOfQuarter) {
    artifacts.push({
      artifactType: `Modelo 111 (${trimester}T)`,
      artifactId: input.modelo111Artifact?.id ?? null,
      isGenerated: input.modelo111Artifact !== null,
      isValid: input.modelo111Artifact?.isValid ?? false,
      readinessPercent: input.modelo111Artifact?.readinessPercent ?? 0,
      statusLabel: input.modelo111Artifact?.status ?? 'No generado',
      generatedAt: input.modelo111Artifact?.generatedAt ?? null,
    });
  }

  // Required artifacts: FAN + RLC + RNT + CRA always, + M111 at quarter end
  const requiredCount = endOfQuarter ? 5 : 4;
  const generatedCount = artifacts.filter(a => a.isGenerated).length;
  const validCount = artifacts.filter(a => a.isValid).length;
  const completeness = requiredCount > 0 ? Math.round((generatedCount / requiredCount) * 100) : 0;

  // Cross-validation score
  const cvScore = input.crossValidation?.overallScore ?? 0;

  // Circuit readiness
  const circuitReadiness: CircuitReadiness[] = [
    {
      circuitId: 'tgss_cotizacion',
      circuitLabel: 'Cotización TGSS (FAN/RLC/RNT/CRA)',
      status: input.fanArtifact && input.rlcArtifact && input.rntArtifact && input.craArtifact
        ? 'Artefactos generados' : 'Artefactos pendientes',
      isReady: !!(input.fanArtifact?.isValid && input.rlcArtifact?.isValid && input.rntArtifact?.isValid && input.craArtifact?.isValid),
    },
  ];

  if (endOfQuarter) {
    circuitReadiness.push({
      circuitId: 'aeat_111',
      circuitLabel: `Modelo 111 (${trimester}T)`,
      status: input.modelo111Artifact ? 'Generado' : 'Pendiente',
      isReady: input.modelo111Artifact?.isValid ?? false,
    });
  }

  // Overall readiness = weighted: artifacts 40%, cross-validation 30%, period status 30%
  const periodScore = input.periodClosed ? 100 : 0;
  const artifactScore = requiredCount > 0 ? Math.round((validCount / requiredCount) * 100) : 0;
  const overallReadiness = Math.round(artifactScore * 0.4 + cvScore * 0.3 + periodScore * 0.3);

  // Determine package status
  let packageStatus: PackageStatus;
  if (!input.periodClosed || generatedCount === 0) {
    packageStatus = 'incomplete';
  } else if (input.crossValidation?.overallStatus === 'critical') {
    packageStatus = 'error';
  } else if (generatedCount < requiredCount) {
    packageStatus = 'draft';
  } else if (!input.crossValidation) {
    packageStatus = 'generated';
  } else if (input.crossValidation.overallStatus === 'clean') {
    packageStatus = overallReadiness >= 90 ? 'ready_internal' : 'validated';
  } else {
    packageStatus = 'validated';
  }

  return {
    id: generatePackageId(),
    companyId: input.companyId,
    companyName: input.companyName,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    periodLabel,
    packageStatus,
    statusMeta: PACKAGE_STATUS_META[packageStatus],
    artifacts,
    artifactsGenerated: generatedCount,
    artifactsRequired: requiredCount,
    artifactCompleteness: completeness,
    crossValidation: input.crossValidation,
    crossValidationScore: cvScore,
    ssExpedientStatus: input.ssExpedientStatus,
    fiscalExpedientStatus: input.fiscalExpedientStatus,
    circuitReadiness,
    isEndOfQuarter: endOfQuarter,
    trimester,
    overallReadiness,
    disclaimer: 'Paquete oficial preparatorio (interno). NO constituye presentación oficial ante ningún organismo. isRealSubmissionBlocked === true.',
    generatedAt: new Date().toISOString(),
    version: '1.0-P4',
  };
}

// ─── Serialize for evidence ─────────────────────────────────────────────────

export function serializePackageForSnapshot(pkg: MonthlyOfficialPackage): Record<string, unknown> {
  return {
    id: pkg.id,
    periodLabel: pkg.periodLabel,
    packageStatus: pkg.packageStatus,
    artifactsGenerated: pkg.artifactsGenerated,
    artifactsRequired: pkg.artifactsRequired,
    artifactCompleteness: pkg.artifactCompleteness,
    crossValidationScore: pkg.crossValidationScore,
    overallReadiness: pkg.overallReadiness,
    isEndOfQuarter: pkg.isEndOfQuarter,
    version: pkg.version,
    generatedAt: pkg.generatedAt,
  };
}
