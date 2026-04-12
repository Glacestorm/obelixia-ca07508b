/**
 * timeClockInteropEngine.ts — B3: Fichaje Digital Interoperable
 * 
 * Motor puro (sin side effects) para:
 * - Exportación estandarizada para Inspección (Art. 34.9 ET)
 * - Sellado temporal verificable (SHA-256)
 * - Firma/evidencia del trabajador
 * - Cadena de custodia
 * - Readiness honesto de interoperabilidad
 */

// ─── Types ───────────────────────────────────────────────────────────────

export interface TimeClockRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_nif?: string;
  company_id: string;
  company_name?: string;
  company_cif?: string;
  clock_date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number | null;
  worked_hours: number | null;
  overtime_hours: number | null;
  clock_in_method: string;
  clock_out_method: string | null;
  clock_in_location: { lat: number; lng: number; accuracy?: number } | null;
  clock_out_location: { lat: number; lng: number; accuracy?: number } | null;
  status: string;
  anomaly_type: string | null;
  anomaly_notes: string | null;
  notes: string | null;
}

export interface SealedRecord {
  record: TimeClockRecord;
  seal: {
    hash: string;
    timestamp: string;
    algorithm: 'SHA-256';
    sealed_fields: string[];
  };
}

export interface WorkerSignatureEvidence {
  employee_id: string;
  record_id: string;
  signature_type: 'gps_implicit' | 'device_fingerprint' | 'explicit_confirmation';
  evidence: {
    gps_location?: { lat: number; lng: number; accuracy?: number };
    device_info?: string;
    ip_hash?: string;
    user_agent_hash?: string;
    confirmed_at?: string;
  };
  created_at: string;
}

export interface CustodyChainEntry {
  action: 'created' | 'sealed' | 'exported' | 'accessed' | 'anomaly_flagged';
  actor: string;
  timestamp: string;
  record_ids: string[];
  details: string;
  hash?: string;
}

export interface InspectionExportPackage {
  metadata: {
    export_id: string;
    generated_at: string;
    company_cif: string;
    company_name: string;
    period_start: string;
    period_end: string;
    total_records: number;
    total_employees: number;
    format_version: '1.0';
    legal_basis: 'Art. 34.9 ET — RD-ley 8/2019';
    seal_algorithm: 'SHA-256';
    interop_status: InteropReadiness;
  };
  records: InspectionRecord[];
  summary: InspectionSummary;
  custody_chain: CustodyChainEntry[];
}

export interface InspectionRecord {
  /** Row number for traceability */
  row: number;
  employee_nif: string;
  employee_name: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  worked_hours: number;
  overtime_hours: number;
  method: string;
  gps_in: string | null;
  gps_out: string | null;
  status: string;
  anomaly: string | null;
  seal_hash: string;
}

export interface InspectionSummary {
  total_records: number;
  total_employees: number;
  total_worked_hours: number;
  total_overtime_hours: number;
  anomaly_count: number;
  anomaly_rate_percent: number;
  records_with_gps_percent: number;
  average_hours_per_day: number;
  period_days: number;
}

export type InteropReadiness = 'not_ready' | 'internal_ready' | 'official_handoff_ready';

export interface ReadinessEvaluation {
  status: InteropReadiness;
  checks: ReadinessCheck[];
  missing_for_official: string[];
  summary: string;
}

export interface ReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  category: 'export' | 'seal' | 'signature' | 'custody' | 'retention' | 'access' | 'external';
}

// ─── Seal Engine ─────────────────────────────────────────────────────────

const SEALED_FIELDS = [
  'id', 'employee_id', 'clock_date', 'clock_in', 'clock_out',
  'break_minutes', 'worked_hours', 'clock_in_method', 'clock_out_method',
  'clock_in_location', 'clock_out_location', 'status', 'anomaly_type',
] as const;

/**
 * Compute SHA-256 hash of the canonical representation of a record.
 * Works in browser (SubtleCrypto) — returns hex string.
 */
export async function computeRecordSeal(record: TimeClockRecord): Promise<string> {
  const canonical: Record<string, unknown> = {};
  for (const field of SEALED_FIELDS) {
    canonical[field] = (record as any)[field] ?? null;
  }
  const payload = JSON.stringify(canonical, Object.keys(canonical).sort());
  
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback: simple deterministic hash for test environments
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fallback-' + Math.abs(hash).toString(16).padStart(16, '0');
}

export async function sealRecord(record: TimeClockRecord): Promise<SealedRecord> {
  const hash = await computeRecordSeal(record);
  return {
    record,
    seal: {
      hash,
      timestamp: new Date().toISOString(),
      algorithm: 'SHA-256',
      sealed_fields: [...SEALED_FIELDS],
    },
  };
}

export async function verifySeal(sealed: SealedRecord): Promise<boolean> {
  const recomputed = await computeRecordSeal(sealed.record);
  return recomputed === sealed.seal.hash;
}

// ─── Worker Signature / Evidence ─────────────────────────────────────────

export function extractWorkerEvidence(record: TimeClockRecord): WorkerSignatureEvidence {
  const hasGPS = !!record.clock_in_location || !!record.clock_out_location;
  
  return {
    employee_id: record.employee_id,
    record_id: record.id,
    signature_type: hasGPS ? 'gps_implicit' : 'device_fingerprint',
    evidence: {
      gps_location: record.clock_in_location || record.clock_out_location || undefined,
      device_info: record.clock_in_method,
      confirmed_at: record.clock_in,
    },
    created_at: new Date().toISOString(),
  };
}

// ─── Inspection Export ───────────────────────────────────────────────────

function formatGPS(loc: { lat: number; lng: number; accuracy?: number } | null): string | null {
  if (!loc) return null;
  return `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}${loc.accuracy ? `±${loc.accuracy}m` : ''}`;
}

export async function buildInspectionExport(
  records: TimeClockRecord[],
  companyInfo: { cif: string; name: string },
  periodStart: string,
  periodEnd: string,
  custodyChain: CustodyChainEntry[] = []
): Promise<InspectionExportPackage> {
  const exportId = `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uniqueEmployees = new Set(records.map(r => r.employee_id));
  
  const inspectionRecords: InspectionRecord[] = [];
  
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const hash = await computeRecordSeal(r);
    inspectionRecords.push({
      row: i + 1,
      employee_nif: r.employee_nif || 'N/D',
      employee_name: r.employee_name || 'N/D',
      date: r.clock_date,
      clock_in: r.clock_in,
      clock_out: r.clock_out,
      break_minutes: r.break_minutes || 0,
      worked_hours: r.worked_hours || 0,
      overtime_hours: r.overtime_hours || 0,
      method: r.clock_in_method,
      gps_in: formatGPS(r.clock_in_location),
      gps_out: formatGPS(r.clock_out_location),
      status: r.status,
      anomaly: r.anomaly_type,
      seal_hash: hash,
    });
  }
  
  const totalWorked = records.reduce((s, r) => s + (r.worked_hours || 0), 0);
  const totalOvertime = records.reduce((s, r) => s + (r.overtime_hours || 0), 0);
  const anomalyCount = records.filter(r => r.anomaly_type).length;
  const withGPS = records.filter(r => r.clock_in_location || r.clock_out_location).length;
  
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  
  const exportChainEntry: CustodyChainEntry = {
    action: 'exported',
    actor: 'system',
    timestamp: new Date().toISOString(),
    record_ids: records.map(r => r.id),
    details: `Exportación inspección: ${records.length} registros, periodo ${periodStart} a ${periodEnd}`,
  };
  
  return {
    metadata: {
      export_id: exportId,
      generated_at: new Date().toISOString(),
      company_cif: companyInfo.cif,
      company_name: companyInfo.name,
      period_start: periodStart,
      period_end: periodEnd,
      total_records: records.length,
      total_employees: uniqueEmployees.size,
      format_version: '1.0',
      legal_basis: 'Art. 34.9 ET — RD-ley 8/2019',
      seal_algorithm: 'SHA-256',
      interop_status: 'internal_ready',
    },
    records: inspectionRecords,
    summary: {
      total_records: records.length,
      total_employees: uniqueEmployees.size,
      total_worked_hours: Math.round(totalWorked * 100) / 100,
      total_overtime_hours: Math.round(totalOvertime * 100) / 100,
      anomaly_count: anomalyCount,
      anomaly_rate_percent: records.length > 0 
        ? Math.round((anomalyCount / records.length) * 10000) / 100 
        : 0,
      records_with_gps_percent: records.length > 0 
        ? Math.round((withGPS / records.length) * 10000) / 100 
        : 0,
      average_hours_per_day: periodDays > 0 
        ? Math.round((totalWorked / periodDays) * 100) / 100 
        : 0,
      period_days: periodDays,
    },
    custody_chain: [...custodyChain, exportChainEntry],
  };
}

// ─── CSV Export ──────────────────────────────────────────────────────────

export function exportToCSV(pkg: InspectionExportPackage): string {
  const header = [
    'Nº', 'NIF', 'Empleado', 'Fecha', 'Entrada', 'Salida',
    'Pausa (min)', 'Horas trabajadas', 'Horas extra', 'Método',
    'GPS Entrada', 'GPS Salida', 'Estado', 'Anomalía', 'Hash sellado',
  ].join(';');
  
  const rows = pkg.records.map(r => [
    r.row,
    r.employee_nif,
    `"${r.employee_name}"`,
    r.date,
    r.clock_in,
    r.clock_out || '',
    r.break_minutes,
    r.worked_hours,
    r.overtime_hours,
    r.method,
    r.gps_in || '',
    r.gps_out || '',
    r.status,
    r.anomaly || '',
    r.seal_hash,
  ].join(';'));
  
  const metaLines = [
    `# Exportación de Registro de Jornada — Art. 34.9 ET`,
    `# Empresa: ${pkg.metadata.company_name} (${pkg.metadata.company_cif})`,
    `# Periodo: ${pkg.metadata.period_start} a ${pkg.metadata.period_end}`,
    `# Generado: ${pkg.metadata.generated_at}`,
    `# ID Exportación: ${pkg.metadata.export_id}`,
    `# Registros: ${pkg.metadata.total_records} | Empleados: ${pkg.metadata.total_employees}`,
    `# Algoritmo sellado: ${pkg.metadata.seal_algorithm}`,
    `# Estado interoperabilidad: ${pkg.metadata.interop_status}`,
    `# NOTA: Este documento es preparatorio interno. No constituye presentación oficial ante la ITSS.`,
    '',
  ];
  
  return [...metaLines, header, ...rows].join('\n');
}

// ─── Readiness Evaluation ────────────────────────────────────────────────

export function evaluateInteropReadiness(
  config: {
    hasExportCapability: boolean;
    hasSealEngine: boolean;
    hasWorkerEvidence: boolean;
    hasCustodyChain: boolean;
    hasRetention4Years: boolean;
    hasAccessControl: boolean;
    hasOfficialAPICredentials: boolean;
    hasITSSValidation: boolean;
  }
): ReadinessEvaluation {
  const checks: ReadinessCheck[] = [
    {
      id: 'export',
      label: 'Exportación estandarizada CSV/JSON',
      passed: config.hasExportCapability,
      detail: config.hasExportCapability 
        ? 'Formato CSV con sellado SHA-256 disponible' 
        : 'Exportación no implementada',
      category: 'export',
    },
    {
      id: 'seal',
      label: 'Sellado temporal SHA-256',
      passed: config.hasSealEngine,
      detail: config.hasSealEngine 
        ? 'Cada registro incluye hash SHA-256 verificable' 
        : 'Sin sellado temporal',
      category: 'seal',
    },
    {
      id: 'signature',
      label: 'Evidencia del trabajador (GPS/dispositivo)',
      passed: config.hasWorkerEvidence,
      detail: config.hasWorkerEvidence 
        ? 'GPS implícito + fingerprint de dispositivo capturado' 
        : 'Sin evidencia de trabajador',
      category: 'signature',
    },
    {
      id: 'custody',
      label: 'Cadena de custodia trazable',
      passed: config.hasCustodyChain,
      detail: config.hasCustodyChain 
        ? 'Log de accesos, exportaciones y modificaciones' 
        : 'Sin cadena de custodia',
      category: 'custody',
    },
    {
      id: 'retention',
      label: 'Retención mínima 4 años',
      passed: config.hasRetention4Years,
      detail: config.hasRetention4Years 
        ? 'Configuración de retención cumple Art. 34.9 ET' 
        : 'Sin garantía de retención',
      category: 'retention',
    },
    {
      id: 'access',
      label: 'Control de acceso inspector-ready',
      passed: config.hasAccessControl,
      detail: config.hasAccessControl 
        ? 'Permisos diferenciados para ITSS y representantes' 
        : 'Sin control de acceso para inspección',
      category: 'access',
    },
    {
      id: 'api_creds',
      label: 'Credenciales API oficial (ITSS/SEPE)',
      passed: config.hasOfficialAPICredentials,
      detail: config.hasOfficialAPICredentials 
        ? 'Credenciales oficiales configuradas' 
        : 'Sin credenciales oficiales — requiere activación externa',
      category: 'external',
    },
    {
      id: 'itss_validation',
      label: 'Validación ITSS en entorno real',
      passed: config.hasITSSValidation,
      detail: config.hasITSSValidation 
        ? 'Formato validado por ITSS' 
        : 'Pendiente validación en entorno oficial',
      category: 'external',
    },
  ];
  
  const internalChecks = checks.filter(c => c.category !== 'external');
  const externalChecks = checks.filter(c => c.category === 'external');
  
  const allInternalPassed = internalChecks.every(c => c.passed);
  const allExternalPassed = externalChecks.every(c => c.passed);
  
  const missingForOfficial = checks
    .filter(c => !c.passed && c.category === 'external')
    .map(c => c.label);
  
  let status: InteropReadiness;
  let summary: string;
  
  if (allInternalPassed && allExternalPassed) {
    status = 'official_handoff_ready';
    summary = 'Interoperabilidad completa — pendiente solo de activación oficial';
  } else if (allInternalPassed) {
    status = 'internal_ready';
    summary = `Interoperabilidad interna cerrada. Pendiente: ${missingForOfficial.join(', ')}`;
  } else {
    status = 'not_ready';
    const failedInternal = internalChecks.filter(c => !c.passed).map(c => c.label);
    summary = `Faltan requisitos internos: ${failedInternal.join(', ')}`;
  }
  
  return { status, checks, missing_for_official: missingForOfficial, summary };
}

// ─── Measure State Machine (for tracking) ────────────────────────────────

export type MeasureStatus = 'proposed' | 'approved' | 'in_progress' | 'blocked' | 'completed';

export const MEASURE_TRANSITIONS: Record<MeasureStatus, MeasureStatus[]> = {
  proposed: ['approved', 'blocked'],
  approved: ['in_progress', 'blocked'],
  in_progress: ['completed', 'blocked'],
  blocked: ['proposed', 'in_progress'],
  completed: [],
};

export function canTransitionMeasure(from: MeasureStatus, to: MeasureStatus): boolean {
  return MEASURE_TRANSITIONS[from]?.includes(to) ?? false;
}
