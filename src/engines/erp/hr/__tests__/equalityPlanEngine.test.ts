/**
 * equalityPlanEngine tests — B1 Complete
 */

import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_AREAS,
  MEASURE_STATUS_CONFIG,
  VALID_MEASURE_TRANSITIONS,
  NEGOTIATION_PHASES,
  canTransitionMeasure,
  computeDiagnosticProgress,
  computeMeasuresSummary,
  evaluateRegconReadiness,
  parseDiagnosisData,
  parseMeasuresData,
  parseNegotiationTimeline,
  serializeDiagnosisData,
  serializeMeasuresData,
  serializeNegotiationTimeline,
  type DiagnosticAreaScore,
  type EqualityMeasure,
  type MeasureStatus,
} from '@/engines/erp/hr/equalityPlanEngine';

// ─── Diagnostic Areas ───────────────────────────────────────────────────────

describe('DIAGNOSTIC_AREAS', () => {
  it('contains exactly 9 mandatory areas per RD 901/2020', () => {
    expect(DIAGNOSTIC_AREAS).toHaveLength(9);
  });

  it('all areas have code, label, description and legalRef', () => {
    for (const area of DIAGNOSTIC_AREAS) {
      expect(area.code).toBeTruthy();
      expect(area.label).toBeTruthy();
      expect(area.description).toBeTruthy();
      expect(area.legalRef).toMatch(/Art\./);
    }
  });

  it('includes salary_audit and harassment_prevention', () => {
    const codes = DIAGNOSTIC_AREAS.map(a => a.code);
    expect(codes).toContain('salary_audit');
    expect(codes).toContain('harassment_prevention');
  });
});

// ─── Measure State Machine ──────────────────────────────────────────────────

describe('canTransitionMeasure', () => {
  it('allows proposed → approved', () => {
    expect(canTransitionMeasure('proposed', 'approved')).toBe(true);
  });

  it('allows in_progress → completed', () => {
    expect(canTransitionMeasure('in_progress', 'completed')).toBe(true);
  });

  it('blocks completed → proposed', () => {
    expect(canTransitionMeasure('completed', 'proposed')).toBe(false);
  });

  it('allows any state → blocked except completed', () => {
    const blockable: MeasureStatus[] = ['proposed', 'approved', 'in_progress'];
    for (const s of blockable) {
      expect(canTransitionMeasure(s, 'blocked')).toBe(true);
    }
    expect(canTransitionMeasure('completed', 'blocked')).toBe(false);
  });

  it('allows blocked → proposed or in_progress', () => {
    expect(canTransitionMeasure('blocked', 'proposed')).toBe(true);
    expect(canTransitionMeasure('blocked', 'in_progress')).toBe(true);
  });

  it('blocks direct proposed → completed', () => {
    expect(canTransitionMeasure('proposed', 'completed')).toBe(false);
  });
});

// ─── Diagnostic Progress ────────────────────────────────────────────────────

describe('computeDiagnosticProgress', () => {
  it('returns 0% for empty array', () => {
    expect(computeDiagnosticProgress([])).toEqual({ total: 9, completed: 0, percentage: 0 });
  });

  it('returns 100% when all 9 are completed', () => {
    const all: DiagnosticAreaScore[] = DIAGNOSTIC_AREAS.map(a => ({
      areaCode: a.code,
      status: 'completed',
    }));
    const result = computeDiagnosticProgress(all);
    expect(result.percentage).toBe(100);
    expect(result.completed).toBe(9);
  });

  it('correctly computes partial progress', () => {
    const partial: DiagnosticAreaScore[] = [
      { areaCode: 'hiring_selection', status: 'completed' },
      { areaCode: 'training', status: 'completed' },
      { areaCode: 'promotion', status: 'in_progress' },
    ];
    const result = computeDiagnosticProgress(partial);
    expect(result.completed).toBe(2);
    expect(result.percentage).toBe(22); // 2/9 = 22%
  });
});

// ─── Measures Summary ───────────────────────────────────────────────────────

describe('computeMeasuresSummary', () => {
  it('returns zeros for empty array', () => {
    const r = computeMeasuresSummary([]);
    expect(r.total).toBe(0);
    expect(r.completionRate).toBe(0);
  });

  it('correctly counts by status', () => {
    const measures: EqualityMeasure[] = [
      { id: '1', areaCode: 'training', title: 'M1', description: '', status: 'proposed', createdAt: '' },
      { id: '2', areaCode: 'training', title: 'M2', description: '', status: 'completed', createdAt: '' },
      { id: '3', areaCode: 'promotion', title: 'M3', description: '', status: 'in_progress', createdAt: '' },
      { id: '4', areaCode: 'promotion', title: 'M4', description: '', status: 'completed', createdAt: '' },
    ];
    const r = computeMeasuresSummary(measures);
    expect(r.total).toBe(4);
    expect(r.byStatus.completed).toBe(2);
    expect(r.byStatus.proposed).toBe(1);
    expect(r.completionRate).toBe(50);
    expect(r.byArea['training']).toBe(2);
    expect(r.byArea['promotion']).toBe(2);
  });
});

// ─── REGCON Readiness ───────────────────────────────────────────────────────

describe('evaluateRegconReadiness', () => {
  it('returns not_ready when nothing exists', () => {
    const r = evaluateRegconReadiness({
      planExists: false, planApproved: false, diagnosticComplete: false,
      measuresApproved: false, salaryAuditDone: false,
      harassmentProtocolActive: false, commissionConstituted: false,
      hasRegistrationNumber: false,
    });
    expect(r.status).toBe('not_ready');
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it('returns internal_ready when plan + diagnostic done but incomplete', () => {
    const r = evaluateRegconReadiness({
      planExists: true, planApproved: false, diagnosticComplete: true,
      measuresApproved: false, salaryAuditDone: false,
      harassmentProtocolActive: false, commissionConstituted: false,
      hasRegistrationNumber: false,
    });
    expect(r.status).toBe('internal_ready');
  });

  it('returns official_handoff_ready when all internal checks pass', () => {
    const r = evaluateRegconReadiness({
      planExists: true, planApproved: true, diagnosticComplete: true,
      measuresApproved: true, salaryAuditDone: true,
      harassmentProtocolActive: true, commissionConstituted: true,
      hasRegistrationNumber: false,
    });
    expect(r.status).toBe('official_handoff_ready');
    expect(r.blockers).toHaveLength(0);
  });

  it('never returns "registered" even with registration_number', () => {
    const r = evaluateRegconReadiness({
      planExists: true, planApproved: true, diagnosticComplete: true,
      measuresApproved: true, salaryAuditDone: true,
      harassmentProtocolActive: true, commissionConstituted: true,
      hasRegistrationNumber: true,
    });
    expect(r.status).toBe('official_handoff_ready');
    expect(r.status).not.toBe('registered' as any);
  });

  it('has exactly 7 checks', () => {
    const r = evaluateRegconReadiness({
      planExists: false, planApproved: false, diagnosticComplete: false,
      measuresApproved: false, salaryAuditDone: false,
      harassmentProtocolActive: false, commissionConstituted: false,
      hasRegistrationNumber: false,
    });
    expect(r.checks).toHaveLength(7);
  });
});

// ─── Negotiation Phases ─────────────────────────────────────────────────────

describe('NEGOTIATION_PHASES', () => {
  it('has 7 phases in correct order', () => {
    expect(NEGOTIATION_PHASES).toHaveLength(7);
    expect(NEGOTIATION_PHASES[0].code).toBe('constitution');
    expect(NEGOTIATION_PHASES[6].code).toBe('monitoring');
  });
});

// ─── Serialization ──────────────────────────────────────────────────────────

describe('serialization roundtrip', () => {
  it('diagnosis roundtrip preserves data', () => {
    const areas: DiagnosticAreaScore[] = [
      { areaCode: 'training', status: 'completed', findings: 'OK' },
    ];
    const serialized = serializeDiagnosisData(areas);
    const parsed = parseDiagnosisData(serialized);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].areaCode).toBe('training');
  });

  it('measures roundtrip preserves data', () => {
    const items: EqualityMeasure[] = [
      { id: '1', areaCode: 'promotion', title: 'Test', description: '', status: 'proposed', createdAt: '' },
    ];
    const serialized = serializeMeasuresData(items);
    const parsed = parseMeasuresData(serialized);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Test');
  });

  it('timeline roundtrip preserves data', () => {
    const events = [{ id: '1', phase: 'constitution' as const, title: 'Reunión', date: '2025-01-15' }];
    const serialized = serializeNegotiationTimeline(events);
    const parsed = parseNegotiationTimeline(serialized);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].phase).toBe('constitution');
  });

  it('handles null gracefully', () => {
    expect(parseDiagnosisData(null)).toEqual([]);
    expect(parseMeasuresData(null)).toEqual([]);
    expect(parseNegotiationTimeline(null)).toEqual([]);
  });

  it('handles malformed data gracefully', () => {
    expect(parseDiagnosisData({ foo: 'bar' })).toEqual([]);
    expect(parseMeasuresData({})).toEqual([]);
  });
});

// ─── Non-regression: existing status configs ────────────────────────────────

describe('MEASURE_STATUS_CONFIG', () => {
  it('covers all 5 statuses', () => {
    const statuses: MeasureStatus[] = ['proposed', 'approved', 'in_progress', 'blocked', 'completed'];
    for (const s of statuses) {
      expect(MEASURE_STATUS_CONFIG[s]).toBeDefined();
      expect(MEASURE_STATUS_CONFIG[s].label).toBeTruthy();
    }
  });
});
