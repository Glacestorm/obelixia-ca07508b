/**
 * sandboxDryRunComparisonEngine.ts — V2-ES.8 Tramo 9
 * Compares sandbox execution records against dry-run results.
 * Produces a structured diff highlighting semantic differences between
 * the two modes: sandbox (advanced simulation) vs dry-run (local validation).
 *
 * DISCLAIMER: Comparativa interna preparatoria.
 * NO constituye validación oficial de organismo ni evidencia de cumplimiento.
 */

import type { DryRunResult } from '@/hooks/erp/hr/useDryRunPersistence';
import type { SandboxExecutionRecord } from './sandboxExecutionService';
import type { DiffDirection } from './dryRunDiffEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SandboxVsDryRunDiffItem {
  field: string;
  label: string;
  direction: DiffDirection;
  dryRunValue: unknown;
  sandboxValue: unknown;
  explanation?: string;
  category: 'mode' | 'score' | 'validation' | 'payload' | 'stages' | 'response' | 'metadata';
}

export interface SandboxVsDryRunReport {
  /** Sandbox execution id */
  sandboxId: string;
  /** Dry-run result id */
  dryRunId: string;
  /** Domain */
  domain: string;
  /** Timestamps */
  sandboxAt: string;
  dryRunAt: string;
  /** Diff items */
  diffs: SandboxVsDryRunDiffItem[];
  /** Overall assessment */
  overallDirection: DiffDirection;
  /** Score comparison */
  dryRunScore: number;
  sandboxConformance: number;
  scoreDelta: number;
  /** Validation comparison */
  dryRunPassed: boolean;
  sandboxAccepted: boolean;
  /** Errors & warnings delta */
  dryRunErrors: number;
  sandboxErrors: number;
  dryRunWarnings: number;
  sandboxWarnings: number;
  /** Stages info (sandbox-only) */
  sandboxStagesPassed: number;
  sandboxStagesTotal: number;
  /** Has simulated organism response (sandbox-only) */
  hasOrganismResponse: boolean;
  /** Summary */
  summaryText: string;
  detailedLines: string[];
  /** Disclaimers */
  disclaimers: string[];
  generatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeDirection(a: number, b: number): DiffDirection {
  if (b > a) return 'improved';
  if (b < a) return 'degraded';
  return 'unchanged';
}

function extractDryRunErrorCount(dr: DryRunResult): number {
  const val = dr.validation_result as Record<string, unknown> | null;
  return (val?.errorCount as number) || 0;
}

function extractDryRunWarningCount(dr: DryRunResult): number {
  const val = dr.validation_result as Record<string, unknown> | null;
  return (val?.warningCount as number) || 0;
}

function extractDryRunPassed(dr: DryRunResult): boolean {
  const val = dr.validation_result as Record<string, unknown> | null;
  return (val?.passed as boolean) || dr.status === 'success';
}

// ─── Main comparison ────────────────────────────────────────────────────────

export function compareSandboxVsDryRun(
  sandbox: SandboxExecutionRecord,
  dryRun: DryRunResult,
): SandboxVsDryRunReport {
  const diffs: SandboxVsDryRunDiffItem[] = [];

  // 1. Mode comparison
  diffs.push({
    field: 'execution_mode',
    label: 'Modo de ejecución',
    direction: 'unchanged',
    dryRunValue: dryRun.execution_mode || 'local_validation',
    sandboxValue: sandbox.executionMode,
    explanation: 'Dry-run = validación local; Sandbox = simulación avanzada con respuesta de organismo',
    category: 'mode',
  });

  // 2. Score / conformance
  const dryRunScore = dryRun.readiness_score;
  const sandboxConformance = sandbox.result?.payloadConformance ?? 0;
  const scoreDelta = sandboxConformance - dryRunScore;

  diffs.push({
    field: 'score',
    label: 'Score / Conformidad',
    direction: computeDirection(dryRunScore, sandboxConformance),
    dryRunValue: `${dryRunScore}% (readiness)`,
    sandboxValue: `${sandboxConformance}% (conformidad payload)`,
    explanation: scoreDelta !== 0
      ? `Delta: ${scoreDelta > 0 ? '+' : ''}${scoreDelta} puntos`
      : 'Scores equivalentes',
    category: 'score',
  });

  // 3. Validation outcome
  const dryRunPassed = extractDryRunPassed(dryRun);
  const sandboxAccepted = sandbox.result?.accepted ?? false;

  if (dryRunPassed !== sandboxAccepted) {
    diffs.push({
      field: 'validation_outcome',
      label: 'Resultado de validación',
      direction: sandboxAccepted && !dryRunPassed ? 'improved' : 'degraded',
      dryRunValue: dryRunPassed ? 'Aprobado' : 'Fallido',
      sandboxValue: sandboxAccepted ? 'Aceptado' : 'Rechazado',
      explanation: 'Los criterios de validación difieren entre dry-run y sandbox',
      category: 'validation',
    });
  }

  // 4. Error counts
  const dryRunErrors = extractDryRunErrorCount(dryRun);
  const sandboxErrors = sandbox.result?.structuralErrors.length ?? 0;
  const dryRunWarnings = extractDryRunWarningCount(dryRun);
  const sandboxWarnings = sandbox.result?.fieldWarnings.length ?? 0;

  if (dryRunErrors !== sandboxErrors) {
    diffs.push({
      field: 'error_count',
      label: 'Errores detectados',
      direction: sandboxErrors < dryRunErrors ? 'improved' : 'degraded',
      dryRunValue: dryRunErrors,
      sandboxValue: sandboxErrors,
      category: 'validation',
    });
  }

  if (dryRunWarnings !== sandboxWarnings) {
    diffs.push({
      field: 'warning_count',
      label: 'Avisos detectados',
      direction: sandboxWarnings < dryRunWarnings ? 'improved' : 'degraded',
      dryRunValue: dryRunWarnings,
      sandboxValue: sandboxWarnings,
      category: 'validation',
    });
  }

  // 5. Payload hash comparison
  const dryRunPayloadHash = (dryRun.payload_snapshot as Record<string, unknown>)?.hash as string || null;
  if (dryRunPayloadHash && sandbox.payloadHash) {
    const payloadMatch = dryRunPayloadHash === sandbox.payloadHash;
    diffs.push({
      field: 'payload_hash',
      label: 'Payload',
      direction: payloadMatch ? 'unchanged' : 'new',
      dryRunValue: dryRunPayloadHash,
      sandboxValue: sandbox.payloadHash,
      explanation: payloadMatch ? 'Payload idéntico' : 'Payloads diferentes entre ejecuciones',
      category: 'payload',
    });
  }

  // 6. Stages (sandbox-only)
  const stagesPassed = sandbox.result?.executionStages.filter(s => s.status === 'passed').length ?? 0;
  const stagesTotal = sandbox.result?.executionStages.length ?? 0;

  diffs.push({
    field: 'execution_stages',
    label: 'Etapas de simulación',
    direction: stagesPassed === stagesTotal ? 'improved' : 'degraded',
    dryRunValue: 'N/A (validación local)',
    sandboxValue: `${stagesPassed}/${stagesTotal} etapas OK`,
    explanation: 'Las etapas de simulación solo se ejecutan en modo sandbox',
    category: 'stages',
  });

  // 7. Organism response (sandbox-only)
  const hasOrganismResponse = !!sandbox.result?.simulatedOrganismResponse;
  if (hasOrganismResponse) {
    diffs.push({
      field: 'organism_response',
      label: 'Respuesta de organismo',
      direction: 'new',
      dryRunValue: 'No disponible en dry-run',
      sandboxValue: `[${sandbox.result!.simulatedOrganismResponse!.code}] ${sandbox.result!.simulatedOrganismResponse!.message}`,
      explanation: 'Respuesta simulada del organismo — NO oficial',
      category: 'response',
    });
  }

  // 8. Duration
  const dryRunDuration = dryRun.duration_ms;
  const sandboxDuration = sandbox.durationMs;
  if (dryRunDuration && sandboxDuration) {
    diffs.push({
      field: 'duration',
      label: 'Duración',
      direction: sandboxDuration < dryRunDuration ? 'improved' : 'degraded',
      dryRunValue: `${dryRunDuration}ms`,
      sandboxValue: `${sandboxDuration}ms`,
      category: 'metadata',
    });
  }

  // Overall direction
  let overallDirection: DiffDirection = 'unchanged';
  if (scoreDelta > 5 || (sandboxAccepted && !dryRunPassed)) overallDirection = 'improved';
  else if (scoreDelta < -5 || (!sandboxAccepted && dryRunPassed)) overallDirection = 'degraded';

  // Summary
  const parts: string[] = [];
  parts.push(`Dry-run: ${dryRunScore}% → Sandbox: ${sandboxConformance}%`);
  if (dryRunPassed !== sandboxAccepted) {
    parts.push(`Validación: ${dryRunPassed ? '✓' : '✗'} vs ${sandboxAccepted ? '✓' : '✗'}`);
  }
  if (stagesTotal > 0) parts.push(`Etapas: ${stagesPassed}/${stagesTotal}`);
  if (hasOrganismResponse) parts.push('Con respuesta organismo simulada');

  const detailedLines: string[] = [
    `Comparativa modo: dry-run (validación local) vs sandbox (simulación avanzada)`,
    `Readiness dry-run: ${dryRunScore}% | Conformidad sandbox: ${sandboxConformance}%`,
    `Errores: dry-run ${dryRunErrors} / sandbox ${sandboxErrors}`,
    `Avisos: dry-run ${dryRunWarnings} / sandbox ${sandboxWarnings}`,
  ];
  if (stagesTotal > 0) detailedLines.push(`Etapas sandbox: ${stagesPassed}/${stagesTotal} completadas`);
  if (hasOrganismResponse) {
    detailedLines.push(`Respuesta simulada: [${sandbox.result!.simulatedOrganismResponse!.code}] ${sandbox.result!.simulatedOrganismResponse!.message}`);
  }

  return {
    sandboxId: sandbox.id,
    dryRunId: dryRun.id,
    domain: sandbox.domain,
    sandboxAt: sandbox.executedAt,
    dryRunAt: dryRun.created_at,
    diffs,
    overallDirection,
    dryRunScore,
    sandboxConformance,
    scoreDelta,
    dryRunPassed,
    sandboxAccepted,
    dryRunErrors,
    sandboxErrors,
    dryRunWarnings,
    sandboxWarnings,
    sandboxStagesPassed: stagesPassed,
    sandboxStagesTotal: stagesTotal,
    hasOrganismResponse,
    summaryText: parts.join(' · '),
    detailedLines,
    disclaimers: [
      'Comparativa interna preparatoria — no constituye validación oficial',
      'Sandbox ≠ envío real. Dry-run ≠ validación de organismo',
      'Producción bloqueada por invariante de seguridad',
    ],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get a direction label in Spanish
 */
export function getComparisonDirectionLabel(dir: DiffDirection): string {
  const labels: Record<DiffDirection, string> = {
    improved: '↑ Sandbox superior',
    degraded: '↓ Dry-run superior',
    unchanged: '— Equivalente',
    new: '+ Solo sandbox',
    removed: '− Solo dry-run',
  };
  return labels[dir];
}

/**
 * Get color class for comparison direction
 */
export function getComparisonDirectionColor(dir: DiffDirection): string {
  const colors: Record<DiffDirection, string> = {
    improved: 'text-emerald-600',
    degraded: 'text-destructive',
    unchanged: 'text-muted-foreground',
    new: 'text-blue-600',
    removed: 'text-amber-600',
  };
  return colors[dir];
}
