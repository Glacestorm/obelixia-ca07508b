/**
 * sandboxEvidencePackExtension.ts — V2-ES.8 Tramo 9
 * Extends evidence packs with sandbox execution data.
 * Provides sandbox-specific sections for PDF and Excel evidence packs.
 *
 * DISCLAIMER: Los datos sandbox en evidence packs son preparatorios.
 * NO constituyen acuse oficial ni validación de organismo.
 */

import type { SandboxExecutionRecord } from './sandboxExecutionService';
import type { SandboxVsDryRunReport } from './sandboxDryRunComparisonEngine';

// ─── Extended evidence pack input ───────────────────────────────────────────

export interface SandboxEvidenceData {
  /** Sandbox executions to include */
  sandboxExecutions?: SandboxExecutionRecord[];
  /** Sandbox vs dry-run comparisons */
  sandboxComparisons?: SandboxVsDryRunReport[];
}

// ─── PDF/Excel row formatters ───────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

/**
 * Format sandbox executions as table rows for PDF export
 */
export function formatSandboxExecutionsForPDF(
  executions: SandboxExecutionRecord[],
): { headers: string[][]; body: string[][] } {
  const headers = [['Dominio', 'Modo', 'Estado', 'Conformidad', 'Etapas', 'Duracion', 'Fecha']];
  const body = executions.slice(0, 20).map(e => [
    e.domain,
    e.executionMode === 'advanced_simulation' ? 'Simulacion avanzada' : 'Staged',
    e.status,
    `${e.result?.payloadConformance ?? 0}%`,
    `${e.result?.executionStages.filter(s => s.status === 'passed').length ?? 0}/${e.result?.executionStages.length ?? 0}`,
    e.durationMs ? `${e.durationMs}ms` : 'N/A',
    fmtDate(e.executedAt),
  ]);
  return { headers, body };
}

/**
 * Format sandbox comparisons as table rows for PDF export
 */
export function formatSandboxComparisonsForPDF(
  comparisons: SandboxVsDryRunReport[],
): { headers: string[][]; body: string[][] } {
  const headers = [['Dominio', 'Dry-run Score', 'Sandbox Conform.', 'Delta', 'DR Errores', 'SBX Errores', 'Resultado']];
  const body = comparisons.slice(0, 10).map(c => [
    c.domain,
    `${c.dryRunScore}%`,
    `${c.sandboxConformance}%`,
    `${c.scoreDelta > 0 ? '+' : ''}${c.scoreDelta}`,
    `${c.dryRunErrors}`,
    `${c.sandboxErrors}`,
    c.overallDirection === 'improved' ? 'Sandbox superior'
      : c.overallDirection === 'degraded' ? 'Dry-run superior'
      : 'Equivalente',
  ]);
  return { headers, body };
}

/**
 * Format sandbox executions for Excel sheet
 */
export function formatSandboxExecutionsForExcel(
  executions: SandboxExecutionRecord[],
): Record<string, unknown>[] {
  return executions.map(e => ({
    Dominio: e.domain,
    Modo: e.executionMode === 'advanced_simulation' ? 'Simulacion avanzada' : 'Staged',
    Estado: e.status,
    'Conformidad (%)': e.result?.payloadConformance ?? 0,
    Etapas_OK: e.result?.executionStages.filter(s => s.status === 'passed').length ?? 0,
    Etapas_Total: e.result?.executionStages.length ?? 0,
    Errores: e.result?.structuralErrors.length ?? 0,
    Avisos: e.result?.fieldWarnings.length ?? 0,
    'Duracion (ms)': e.durationMs ?? 0,
    'Respuesta simulada': e.result?.simulatedOrganismResponse
      ? `[${e.result.simulatedOrganismResponse.code}] ${e.result.simulatedOrganismResponse.message}`
      : 'N/A',
    Hash: e.payloadHash,
    Entorno: e.environment,
    Fecha: fmtDate(e.executedAt),
    Disclaimer: 'Ejecucion sandbox preparatoria — no oficial',
  }));
}

/**
 * Format sandbox comparisons for Excel sheet
 */
export function formatSandboxComparisonsForExcel(
  comparisons: SandboxVsDryRunReport[],
): Record<string, unknown>[] {
  return comparisons.map(c => ({
    Dominio: c.domain,
    'Dry-run Score (%)': c.dryRunScore,
    'Sandbox Conformidad (%)': c.sandboxConformance,
    Delta: c.scoreDelta,
    'Dry-run Errores': c.dryRunErrors,
    'Sandbox Errores': c.sandboxErrors,
    'Dry-run Avisos': c.dryRunWarnings,
    'Sandbox Avisos': c.sandboxWarnings,
    'Etapas Sandbox': `${c.sandboxStagesPassed}/${c.sandboxStagesTotal}`,
    'Resp. Organismo': c.hasOrganismResponse ? 'Si' : 'No',
    Resultado: c.overallDirection,
    Resumen: c.summaryText,
    Disclaimer: 'Comparativa interna — no oficial',
  }));
}
