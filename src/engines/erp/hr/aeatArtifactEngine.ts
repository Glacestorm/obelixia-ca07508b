/**
 * aeatArtifactEngine.ts — V2-RRHH-P4
 * Generadores pre-reales de artefactos AEAT:
 *
 *  - Modelo 111: Retenciones e ingresos a cuenta del IRPF (trimestral)
 *  - Modelo 190: Resumen anual de retenciones e ingresos a cuenta (anual)
 *
 * Inputs: Datos fiscales de períodos cerrados (fiscal expedient snapshots)
 *         + datos de empleados + IRPF ya calculado
 *
 * IMPORTANTE: Generado ≠ presentado. isRealSubmissionBlocked === true.
 * Legislación: LIRPF Art. 99-101, RIRPF Art. 74-76, Orden HAP/2194/2013.
 */

import type { Modelo111Summary, Modelo190LineItem } from './fiscalMonthlyExpedientEngine';

// ─── Shared Types ───────────────────────────────────────────────────────────

export type AEATArtifactStatus =
  | 'generated'
  | 'validated_internal'
  | 'dry_run_ready'
  | 'pending_approval'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'confirmed'
  | 'archived'
  | 'error';

/** Periodicity for Modelo 111: trimestral (default) or mensual (grandes empresas) */
export type Modelo111Periodicity = 'trimestral' | 'mensual';

export const AEAT_STATUS_META: Record<AEATArtifactStatus, { label: string; color: string; disclaimer: string; isPostSubmission?: boolean }> = {
  generated: {
    label: 'Generado (interno)',
    color: 'bg-blue-500/10 text-blue-700',
    disclaimer: 'Modelo generado internamente. NO constituye declaración oficial ante la AEAT.',
  },
  validated_internal: {
    label: 'Validado internamente',
    color: 'bg-indigo-500/10 text-indigo-700',
    disclaimer: 'Validación interna superada. NO ha sido presentado ante la AEAT.',
  },
  dry_run_ready: {
    label: 'Listo para dry-run',
    color: 'bg-emerald-500/10 text-emerald-700',
    disclaimer: 'Preparado para simulación. El envío real permanece bloqueado.',
  },
  pending_approval: {
    label: 'Pendiente de aprobación',
    color: 'bg-amber-500/10 text-amber-700',
    disclaimer: 'Requiere aprobación interna. NO es una declaración oficial.',
  },
  sent: {
    label: 'Enviado (registrado)',
    color: 'bg-sky-500/10 text-sky-700',
    disclaimer: 'Marcado como enviado. isRealSubmissionBlocked === true: el envío real no se ha producido.',
    isPostSubmission: true,
  },
  accepted: {
    label: 'Aceptado por AEAT',
    color: 'bg-emerald-500/10 text-emerald-700',
    disclaimer: 'Respuesta AEAT registrada como aceptada. Verificar con referencia CSV oficial.',
    isPostSubmission: true,
  },
  rejected: {
    label: 'Rechazado por AEAT',
    color: 'bg-red-500/10 text-red-700',
    disclaimer: 'Respuesta AEAT registrada como rechazada. Requiere corrección y reenvío.',
    isPostSubmission: true,
  },
  confirmed: {
    label: 'Confirmado (reconciliado)',
    color: 'bg-green-500/10 text-green-700',
    disclaimer: 'Artefacto confirmado tras reconciliación fiscal completa.',
    isPostSubmission: true,
  },
  archived: {
    label: 'Archivado',
    color: 'bg-gray-500/10 text-gray-700',
    disclaimer: 'Artefacto archivado. Período fiscal cerrado.',
    isPostSubmission: true,
  },
  error: {
    label: 'Error en validación',
    color: 'bg-destructive/10 text-destructive',
    disclaimer: 'Errores detectados que impiden el procesamiento.',
  },
};

export interface AEATValidationItem {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail: string;
}

// ─── Modelo 111 Artifact ────────────────────────────────────────────────────

/** Input for a single month within the quarter */
export interface Modelo111MonthInput {
  periodYear: number;
  periodMonth: number;
  perceptoresCount: number;
  /** Unique employee identifiers for this month (NIF/DNI or employeeId). Used for accurate cross-month deduplication. */
  perceptorIds?: string[];
  baseImponible: number;
  retencionPracticada: number;
  payrollClosed: boolean;
}

export interface Modelo111Artifact {
  id: string;
  artifactType: 'modelo_111';
  circuitId: 'aeat_111';
  companyId: string;
  companyCIF: string;
  companyName: string;
  /** Fiscal year */
  fiscalYear: number;
  /** Quarter (1-4) */
  trimester: number;
  trimesterLabel: string;
  /** Period covered: months */
  monthsCovered: number[];

  /** Section I: Rendimientos del trabajo */
  seccionTrabajo: {
    perceptores: number;
    percepciones: number;
    retenciones: number;
  };

  /** Section II: Actividades profesionales (0 if not applicable) */
  seccionProfesionales: {
    perceptores: number;
    percepciones: number;
    retenciones: number;
  };

  /** Section III: Premios y ganancias (0 if not applicable) */
  seccionPremios: {
    perceptores: number;
    percepciones: number;
    retenciones: number;
  };

  /** Totals */
  totalPerceptores: number;
  totalPercepciones: number;
  totalRetenciones: number;

  /** Amount to deposit */
  resultadoAIngresar: number;

  /** Source months detail */
  monthlyBreakdown: Modelo111MonthInput[];

  /** Per-month summaries for traceability */
  modelo111Summaries: Modelo111Summary[];

  validations: AEATValidationItem[];
  isValid: boolean;
  readinessPercent: number;
  artifactStatus: AEATArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
  generatedAt: string;
  version: string;
}

// ─── Modelo 190 Artifact ────────────────────────────────────────────────────

export interface Modelo190Artifact {
  id: string;
  artifactType: 'modelo_190';
  circuitId: 'aeat_190';
  companyId: string;
  companyCIF: string;
  companyName: string;
  fiscalYear: number;

  /** Individual perceptor lines */
  perceptorLines: Modelo190LineItem[];

  /** Summary by clave_percepcion */
  summaryByKey: Modelo190KeySummary[];

  /** Grand totals */
  totalPerceptores: number;
  totalPercepciones: number;
  totalRetenciones: number;
  totalEspecie: number;
  totalIngresosCuenta: number;

  /** Consistency with quarterly 111s */
  crossCheckWith111: {
    totalRetencion111: number;
    totalRetencion190: number;
    difference: number;
    isConsistent: boolean;
  } | null;

  validations: AEATValidationItem[];
  isValid: boolean;
  readinessPercent: number;
  artifactStatus: AEATArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
  generatedAt: string;
  version: string;
}

export interface Modelo190KeySummary {
  clavePercepcion: string;
  claveLabel: string;
  perceptores: number;
  percepciones: number;
  retenciones: number;
}

// ─── Clave de percepción labels ─────────────────────────────────────────────

const CLAVE_LABELS: Record<string, string> = {
  A: 'Rendimientos del trabajo: empleados por cuenta ajena',
  B: 'Rendimientos del trabajo: pensionistas',
  C: 'Rendimientos del trabajo: prestaciones de desempleo',
  D: 'Rendimientos del trabajo: consejeros/administradores',
  E: 'Rendimientos del trabajo: cursos/conferencias/seminarios',
  F: 'Rendimientos de actividades económicas',
  G: 'Rendimientos de actividades profesionales',
  H: 'Rendimientos de actividades agrícolas/ganaderas/forestales',
  I: 'Rendimientos de la propiedad intelectual/industrial',
  K: 'Premios por participación en juegos/concursos',
  L: 'Rentas por cesión de derechos de imagen',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;

function generateArtifactId(type: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${type.toUpperCase()}-${ts}-${rand}`;
}

// ─── Modelo 111 Builder ─────────────────────────────────────────────────────

export function buildModelo111(params: {
  companyId: string;
  companyCIF: string;
  companyName: string;
  fiscalYear: number;
  trimester: number;
  monthInputs: Modelo111MonthInput[];
  modelo111Summaries?: Modelo111Summary[];
}): Modelo111Artifact {
  const { companyId, companyCIF, companyName, fiscalYear, trimester, monthInputs } = params;
  const trimesterLabel = `${trimester}T/${fiscalYear}`;
  const monthsCovered = monthInputs.map(m => m.periodMonth);
  const validations: AEATValidationItem[] = [];

  // Aggregate from monthly inputs — unique perceptores across the quarter
  // A4 fix (P4C): Use real perceptor IDs when available for accurate deduplication.
  // If perceptorIds are provided, deduplicate across months via Set<string>.
  // Otherwise, fall back to the maximum monthly count as a conservative estimate.
  const uniquePerceptorIds = new Set<string>();
  let hasRealIds = false;
  for (const m of monthInputs) {
    if (m.perceptorIds && m.perceptorIds.length > 0) {
      hasRealIds = true;
      for (const pid of m.perceptorIds) uniquePerceptorIds.add(pid);
    }
  }
  const totalPerceptores = hasRealIds
    ? uniquePerceptorIds.size
    : Math.max(...monthInputs.map(m => m.perceptoresCount), 0);
  const totalPercepciones = r2(monthInputs.reduce((s, m) => s + m.baseImponible, 0));
  const totalRetenciones = r2(monthInputs.reduce((s, m) => s + m.retencionPracticada, 0));

  // Build modelo111 summaries from monthly inputs if not provided
  const modelo111Summaries: Modelo111Summary[] = (params.modelo111Summaries ?? monthInputs.map(m => ({
    perceptores_trabajo: m.perceptoresCount,
    importe_percepciones_trabajo: m.baseImponible,
    importe_retenciones_trabajo: m.retencionPracticada,
    perceptores_profesionales: 0,
    importe_percepciones_profesionales: 0,
    importe_retenciones_profesionales: 0,
    total_perceptores: m.perceptoresCount,
    total_percepciones: m.baseImponible,
    total_retenciones: m.retencionPracticada,
  })));

  // ── Validations ──
  validations.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: companyCIF.trim().length > 0,
    severity: 'error', detail: companyCIF || 'No configurado',
  });

  validations.push({
    id: 'valid_trimester', label: 'Trimestre válido',
    passed: trimester >= 1 && trimester <= 4,
    severity: 'error', detail: trimesterLabel,
  });

  validations.push({
    id: 'has_months', label: 'Meses del trimestre disponibles',
    passed: monthInputs.length >= 1 && monthInputs.length <= 3,
    severity: 'error', detail: `${monthInputs.length} mes(es) de datos`,
  });

  const allClosed = monthInputs.every(m => m.payrollClosed);
  validations.push({
    id: 'all_months_closed', label: 'Nóminas del trimestre cerradas',
    passed: allClosed,
    severity: allClosed ? 'info' : 'warning',
    detail: allClosed ? 'Todos los meses cerrados' : `${monthInputs.filter(m => !m.payrollClosed).length} mes(es) sin cerrar`,
  });

  validations.push({
    id: 'has_perceptores', label: 'Perceptores > 0',
    passed: totalPerceptores > 0,
    severity: 'error', detail: totalPerceptores > 0 ? `${totalPerceptores} perceptor(es)` : 'Sin perceptores',
  });

  validations.push({
    id: 'retenciones_positive', label: 'Retenciones coherentes',
    passed: totalRetenciones >= 0,
    severity: 'error', detail: `${totalRetenciones.toFixed(2)}€`,
  });

  // Average rate sanity
  const avgRate = totalPercepciones > 0 ? r2((totalRetenciones / totalPercepciones) * 100) : 0;
  validations.push({
    id: 'avg_rate_sanity', label: 'Tipo medio retención razonable (0-50%)',
    passed: avgRate >= 0 && avgRate <= 50,
    severity: 'warning', detail: `${avgRate.toFixed(2)}%`,
  });

  if (monthInputs.length < 3) {
    validations.push({
      id: 'incomplete_quarter', label: 'Trimestre completo',
      passed: false, severity: 'warning',
      detail: `Solo ${monthInputs.length} de 3 meses — el modelo puede estar incompleto`,
    });
  }

  const errors = validations.filter(v => v.severity === 'error' && !v.passed).length;
  const passed = validations.filter(v => v.passed).length;
  const readinessPercent = validations.length > 0 ? Math.round((passed / validations.length) * 100) : 0;
  const isValid = errors === 0 && totalPerceptores > 0;
  const status: AEATArtifactStatus = isValid ? 'generated' : 'error';

  return {
    id: generateArtifactId('M111'),
    artifactType: 'modelo_111',
    circuitId: 'aeat_111',
    companyId, companyCIF, companyName,
    fiscalYear, trimester, trimesterLabel,
    monthsCovered,
    seccionTrabajo: {
      perceptores: totalPerceptores,
      percepciones: totalPercepciones,
      retenciones: totalRetenciones,
    },
    seccionProfesionales: { perceptores: 0, percepciones: 0, retenciones: 0 },
    seccionPremios: { perceptores: 0, percepciones: 0, retenciones: 0 },
    totalPerceptores, totalPercepciones, totalRetenciones,
    resultadoAIngresar: totalRetenciones,
    monthlyBreakdown: monthInputs,
    modelo111Summaries,
    validations, isValid, readinessPercent,
    artifactStatus: status,
    statusLabel: AEAT_STATUS_META[status].label,
    statusDisclaimer: AEAT_STATUS_META[status].disclaimer,
    generatedAt: new Date().toISOString(),
    version: '1.0-P4',
  };
}

// ─── Modelo 190 Builder ─────────────────────────────────────────────────────

export function buildModelo190(params: {
  companyId: string;
  companyCIF: string;
  companyName: string;
  fiscalYear: number;
  perceptorLines: Modelo190LineItem[];
  /** Optional: total retenciones from 4 x Modelo 111s for cross-check */
  totalRetencionesFrom111?: number;
}): Modelo190Artifact {
  const { companyId, companyCIF, companyName, fiscalYear, perceptorLines } = params;
  const validations: AEATValidationItem[] = [];

  // Aggregate totals
  const totalPerceptores = perceptorLines.length;
  const totalPercepciones = r2(perceptorLines.reduce((s, l) => s + l.percepciones_integras, 0));
  const totalRetenciones = r2(perceptorLines.reduce((s, l) => s + l.retenciones_practicadas, 0));
  const totalEspecie = r2(perceptorLines.reduce((s, l) => s + l.percepciones_en_especie, 0));
  const totalIngresosCuenta = r2(perceptorLines.reduce((s, l) => s + l.ingresos_a_cuenta, 0));

  // Summary by clave
  const keyMap = new Map<string, { perceptores: number; percepciones: number; retenciones: number }>();
  for (const line of perceptorLines) {
    const key = line.clave_percepcion;
    const existing = keyMap.get(key) ?? { perceptores: 0, percepciones: 0, retenciones: 0 };
    existing.perceptores++;
    existing.percepciones = r2(existing.percepciones + line.percepciones_integras);
    existing.retenciones = r2(existing.retenciones + line.retenciones_practicadas);
    keyMap.set(key, existing);
  }

  const summaryByKey: Modelo190KeySummary[] = Array.from(keyMap.entries()).map(([key, data]) => ({
    clavePercepcion: key,
    claveLabel: CLAVE_LABELS[key] ?? `Clave ${key}`,
    ...data,
  }));

  // Cross-check with 111s
  let crossCheckWith111: Modelo190Artifact['crossCheckWith111'] = null;
  if (params.totalRetencionesFrom111 !== undefined) {
    const diff = r2(Math.abs(params.totalRetencionesFrom111 - totalRetenciones));
    crossCheckWith111 = {
      totalRetencion111: params.totalRetencionesFrom111,
      totalRetencion190: totalRetenciones,
      difference: diff,
      isConsistent: diff < 1, // <1€ tolerance
    };
  }

  // ── Validations ──
  validations.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: companyCIF.trim().length > 0,
    severity: 'error', detail: companyCIF || 'No configurado',
  });

  validations.push({
    id: 'has_perceptores', label: 'Perceptores > 0',
    passed: totalPerceptores > 0,
    severity: 'error', detail: `${totalPerceptores} perceptor(es)`,
  });

  // All perceptors have NIF
  const withoutNIF = perceptorLines.filter(l => !l.nif || l.nif.trim().length === 0);
  validations.push({
    id: 'all_have_nif', label: 'NIF en todos los perceptores',
    passed: withoutNIF.length === 0,
    severity: 'error', detail: withoutNIF.length > 0 ? `${withoutNIF.length} sin NIF` : 'OK',
  });

  // All have clave
  const withoutClave = perceptorLines.filter(l => !l.clave_percepcion);
  validations.push({
    id: 'all_have_clave', label: 'Clave de percepción asignada',
    passed: withoutClave.length === 0,
    severity: 'error', detail: withoutClave.length > 0 ? `${withoutClave.length} sin clave` : 'OK',
  });

  // Retenciones positive
  validations.push({
    id: 'retenciones_positive', label: 'Retenciones coherentes',
    passed: totalRetenciones >= 0,
    severity: 'error', detail: `${totalRetenciones.toFixed(2)}€`,
  });

  // Cross-check with 111s
  if (crossCheckWith111) {
    validations.push({
      id: 'cross_check_111', label: 'Coherencia retenciones 190 vs Σ111',
      passed: crossCheckWith111.isConsistent,
      severity: crossCheckWith111.isConsistent ? 'info' : 'warning',
      detail: `190: ${totalRetenciones.toFixed(2)}€, Σ111: ${crossCheckWith111.totalRetencion111.toFixed(2)}€ (dif: ${crossCheckWith111.difference.toFixed(2)}€)`,
    });
  }

  // Average rate sanity
  const avgRate = totalPercepciones > 0 ? r2((totalRetenciones / totalPercepciones) * 100) : 0;
  validations.push({
    id: 'avg_rate_sanity', label: 'Tipo medio retención razonable',
    passed: avgRate >= 0 && avgRate <= 50,
    severity: 'warning', detail: `${avgRate.toFixed(2)}%`,
  });

  const errorCount = validations.filter(v => v.severity === 'error' && !v.passed).length;
  const passedCount = validations.filter(v => v.passed).length;
  const readinessPercent = validations.length > 0 ? Math.round((passedCount / validations.length) * 100) : 0;
  const isValid = errorCount === 0 && totalPerceptores > 0;
  const status: AEATArtifactStatus = isValid ? 'generated' : 'error';

  return {
    id: generateArtifactId('M190'),
    artifactType: 'modelo_190',
    circuitId: 'aeat_190',
    companyId, companyCIF, companyName, fiscalYear,
    perceptorLines, summaryByKey,
    totalPerceptores, totalPercepciones, totalRetenciones, totalEspecie, totalIngresosCuenta,
    crossCheckWith111,
    validations, isValid, readinessPercent,
    artifactStatus: status,
    statusLabel: AEAT_STATUS_META[status].label,
    statusDisclaimer: AEAT_STATUS_META[status].disclaimer,
    generatedAt: new Date().toISOString(),
    version: '1.0-P4',
  };
}

// ─── Status promotion ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<AEATArtifactStatus, AEATArtifactStatus[]> = {
  generated: ['validated_internal', 'error'],
  validated_internal: ['dry_run_ready', 'error'],
  dry_run_ready: ['pending_approval', 'error'],
  pending_approval: ['validated_internal'],
  error: ['generated'],
};

export function promoteAEATStatus<T extends { artifactStatus: AEATArtifactStatus; statusLabel: string; statusDisclaimer: string }>(
  artifact: T,
  targetStatus: AEATArtifactStatus,
): T {
  const allowed = VALID_TRANSITIONS[artifact.artifactStatus] ?? [];
  if (!allowed.includes(targetStatus)) return artifact;
  return {
    ...artifact,
    artifactStatus: targetStatus,
    statusLabel: AEAT_STATUS_META[targetStatus].label,
    statusDisclaimer: AEAT_STATUS_META[targetStatus].disclaimer,
  };
}

// ─── Serialize for evidence ─────────────────────────────────────────────────

export function serializeModelo111ForSnapshot(artifact: Modelo111Artifact): Record<string, unknown> {
  return {
    id: artifact.id, artifactType: 'modelo_111', circuitId: artifact.circuitId,
    fiscalYear: artifact.fiscalYear, trimester: artifact.trimester,
    totalPerceptores: artifact.totalPerceptores,
    totalPercepciones: artifact.totalPercepciones,
    totalRetenciones: artifact.totalRetenciones,
    resultadoAIngresar: artifact.resultadoAIngresar,
    isValid: artifact.isValid, readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus, version: artifact.version,
    generatedAt: artifact.generatedAt,
  };
}

export function serializeModelo190ForSnapshot(artifact: Modelo190Artifact): Record<string, unknown> {
  return {
    id: artifact.id, artifactType: 'modelo_190', circuitId: artifact.circuitId,
    fiscalYear: artifact.fiscalYear,
    totalPerceptores: artifact.totalPerceptores,
    totalPercepciones: artifact.totalPercepciones,
    totalRetenciones: artifact.totalRetenciones,
    crossCheckWith111: artifact.crossCheckWith111,
    isValid: artifact.isValid, readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus, version: artifact.version,
    generatedAt: artifact.generatedAt,
  };
}
