/**
 * Tests — B3: Fichaje Digital Interoperable Engine
 */
import { describe, it, expect } from 'vitest';
import {
  computeRecordSeal,
  sealRecord,
  verifySeal,
  extractWorkerEvidence,
  buildInspectionExport,
  exportToCSV,
  evaluateInteropReadiness,
  canTransitionMeasure,
  type TimeClockRecord,
  type InteropReadiness,
} from '../timeClockInteropEngine';

// ─── Fixtures ────────────────────────────────────────────────────────────

const makeRecord = (overrides: Partial<TimeClockRecord> = {}): TimeClockRecord => ({
  id: 'tc-001',
  employee_id: 'emp-001',
  employee_name: 'Ana García',
  employee_nif: '12345678A',
  company_id: 'comp-001',
  company_name: 'Acme S.L.',
  company_cif: 'B12345678',
  clock_date: '2026-04-10',
  clock_in: '2026-04-10T08:00:00Z',
  clock_out: '2026-04-10T16:30:00Z',
  break_minutes: 30,
  worked_hours: 8.0,
  overtime_hours: 0,
  clock_in_method: 'web_portal',
  clock_out_method: 'web_portal',
  clock_in_location: { lat: 40.416775, lng: -3.703790, accuracy: 10 },
  clock_out_location: { lat: 40.416780, lng: -3.703800, accuracy: 12 },
  status: 'completed',
  anomaly_type: null,
  anomaly_notes: null,
  notes: null,
  ...overrides,
});

// ─── Seal Tests ──────────────────────────────────────────────────────────

describe('Seal Engine', () => {
  it('computes deterministic hash for same record', async () => {
    const r = makeRecord();
    const h1 = await computeRecordSeal(r);
    const h2 = await computeRecordSeal(r);
    expect(h1).toBe(h2);
    expect(h1.length).toBeGreaterThan(0);
  });

  it('produces different hash for different data', async () => {
    const r1 = makeRecord({ clock_out: '2026-04-10T16:30:00Z' });
    const r2 = makeRecord({ clock_out: '2026-04-10T17:00:00Z' });
    const h1 = await computeRecordSeal(r1);
    const h2 = await computeRecordSeal(r2);
    expect(h1).not.toBe(h2);
  });

  it('seals a record with timestamp and algorithm', async () => {
    const sealed = await sealRecord(makeRecord());
    expect(sealed.seal.algorithm).toBe('SHA-256');
    expect(sealed.seal.sealed_fields.length).toBeGreaterThanOrEqual(10);
    expect(sealed.seal.timestamp).toBeTruthy();
    expect(sealed.seal.hash.length).toBeGreaterThan(0);
  });

  it('verifies a valid seal', async () => {
    const sealed = await sealRecord(makeRecord());
    const valid = await verifySeal(sealed);
    expect(valid).toBe(true);
  });

  it('detects tampered seal', async () => {
    const sealed = await sealRecord(makeRecord());
    sealed.record.worked_hours = 99;
    const valid = await verifySeal(sealed);
    expect(valid).toBe(false);
  });

  it('ignores non-sealed fields in hash', async () => {
    const r1 = makeRecord({ notes: 'Note A' });
    const r2 = makeRecord({ notes: 'Note B' });
    const h1 = await computeRecordSeal(r1);
    const h2 = await computeRecordSeal(r2);
    expect(h1).toBe(h2); // notes is not in SEALED_FIELDS
  });
});

// ─── Worker Evidence Tests ───────────────────────────────────────────────

describe('Worker Evidence', () => {
  it('extracts GPS implicit evidence when location present', () => {
    const ev = extractWorkerEvidence(makeRecord());
    expect(ev.signature_type).toBe('gps_implicit');
    expect(ev.evidence.gps_location).toBeTruthy();
    expect(ev.employee_id).toBe('emp-001');
  });

  it('falls back to device_fingerprint when no GPS', () => {
    const ev = extractWorkerEvidence(makeRecord({
      clock_in_location: null,
      clock_out_location: null,
    }));
    expect(ev.signature_type).toBe('device_fingerprint');
    expect(ev.evidence.gps_location).toBeUndefined();
  });
});

// ─── Inspection Export Tests ─────────────────────────────────────────────

describe('Inspection Export', () => {
  it('builds a complete package with metadata', async () => {
    const records = [makeRecord(), makeRecord({ id: 'tc-002', employee_id: 'emp-002' })];
    const pkg = await buildInspectionExport(
      records,
      { cif: 'B12345678', name: 'Acme S.L.' },
      '2026-04-01',
      '2026-04-30'
    );
    
    expect(pkg.metadata.format_version).toBe('1.0');
    expect(pkg.metadata.legal_basis).toContain('Art. 34.9');
    expect(pkg.metadata.total_records).toBe(2);
    expect(pkg.metadata.total_employees).toBe(2);
    expect(pkg.metadata.seal_algorithm).toBe('SHA-256');
    expect(pkg.metadata.interop_status).toBe('internal_ready');
  });

  it('each record has a seal hash', async () => {
    const pkg = await buildInspectionExport(
      [makeRecord()],
      { cif: 'B12345678', name: 'Acme S.L.' },
      '2026-04-01',
      '2026-04-30'
    );
    expect(pkg.records[0].seal_hash.length).toBeGreaterThan(0);
  });

  it('computes correct summary stats', async () => {
    const records = [
      makeRecord({ worked_hours: 8, overtime_hours: 1, anomaly_type: null }),
      makeRecord({ id: 'tc-002', worked_hours: 7.5, overtime_hours: 0, anomaly_type: 'excessive_hours' }),
    ];
    const pkg = await buildInspectionExport(
      records,
      { cif: 'B12345678', name: 'Acme' },
      '2026-04-10',
      '2026-04-10'
    );
    expect(pkg.summary.total_worked_hours).toBe(15.5);
    expect(pkg.summary.total_overtime_hours).toBe(1);
    expect(pkg.summary.anomaly_count).toBe(1);
    expect(pkg.summary.anomaly_rate_percent).toBe(50);
  });

  it('adds export event to custody chain', async () => {
    const pkg = await buildInspectionExport(
      [makeRecord()],
      { cif: 'B12345678', name: 'Acme' },
      '2026-04-01',
      '2026-04-30'
    );
    expect(pkg.custody_chain.length).toBe(1);
    expect(pkg.custody_chain[0].action).toBe('exported');
  });
});

// ─── CSV Export Tests ────────────────────────────────────────────────────

describe('CSV Export', () => {
  it('produces valid CSV with metadata header', async () => {
    const pkg = await buildInspectionExport(
      [makeRecord()],
      { cif: 'B12345678', name: 'Acme S.L.' },
      '2026-04-01',
      '2026-04-30'
    );
    const csv = exportToCSV(pkg);
    
    expect(csv).toContain('# Exportación de Registro de Jornada');
    expect(csv).toContain('Art. 34.9 ET');
    expect(csv).toContain('Acme S.L.');
    expect(csv).toContain('B12345678');
    expect(csv).toContain('NOTA: Este documento es preparatorio interno');
    expect(csv).toContain('Nº;NIF;Empleado');
    expect(csv.split('\n').length).toBeGreaterThan(10);
  });

  it('uses semicolon separator (ES standard)', async () => {
    const pkg = await buildInspectionExport(
      [makeRecord()],
      { cif: 'B12345678', name: 'Acme' },
      '2026-04-01',
      '2026-04-30'
    );
    const csv = exportToCSV(pkg);
    const dataLine = csv.split('\n').find(l => l.startsWith('1;'));
    expect(dataLine).toBeTruthy();
    expect(dataLine!.split(';').length).toBe(15);
  });
});

// ─── Readiness Tests ─────────────────────────────────────────────────────

describe('Interop Readiness', () => {
  it('returns internal_ready when all internal checks pass', () => {
    const result = evaluateInteropReadiness({
      hasExportCapability: true,
      hasSealEngine: true,
      hasWorkerEvidence: true,
      hasCustodyChain: true,
      hasRetention4Years: true,
      hasAccessControl: true,
      hasOfficialAPICredentials: false,
      hasITSSValidation: false,
    });
    expect(result.status).toBe('internal_ready');
    expect(result.missing_for_official.length).toBe(2);
  });

  it('returns not_ready when internal checks fail', () => {
    const result = evaluateInteropReadiness({
      hasExportCapability: false,
      hasSealEngine: true,
      hasWorkerEvidence: true,
      hasCustodyChain: false,
      hasRetention4Years: true,
      hasAccessControl: true,
      hasOfficialAPICredentials: false,
      hasITSSValidation: false,
    });
    expect(result.status).toBe('not_ready');
  });

  it('returns official_handoff_ready when all pass', () => {
    const result = evaluateInteropReadiness({
      hasExportCapability: true,
      hasSealEngine: true,
      hasWorkerEvidence: true,
      hasCustodyChain: true,
      hasRetention4Years: true,
      hasAccessControl: true,
      hasOfficialAPICredentials: true,
      hasITSSValidation: true,
    });
    expect(result.status).toBe('official_handoff_ready');
  });

  it('never returns ready without official validation', () => {
    const result = evaluateInteropReadiness({
      hasExportCapability: true,
      hasSealEngine: true,
      hasWorkerEvidence: true,
      hasCustodyChain: true,
      hasRetention4Years: true,
      hasAccessControl: true,
      hasOfficialAPICredentials: true,
      hasITSSValidation: false,
    });
    expect(result.status).toBe('internal_ready');
  });
});

// ─── Measure Transitions ─────────────────────────────────────────────────

describe('Measure State Machine', () => {
  it('allows proposed → approved', () => {
    expect(canTransitionMeasure('proposed', 'approved')).toBe(true);
  });

  it('blocks completed → proposed', () => {
    expect(canTransitionMeasure('completed', 'proposed')).toBe(false);
  });

  it('allows blocked → in_progress', () => {
    expect(canTransitionMeasure('blocked', 'in_progress')).toBe(true);
  });
});
