/**
 * Tests — inspectionCopilotEngine (C3)
 */
import { describe, it, expect } from 'vitest';
import {
  INSPECTION_AREAS,
  scoreToLight,
  resolveCheck,
  evaluateArea,
  generateInspectionReport,
  buildDocumentPack,
  createEmptySnapshot,
  INSPECTION_DISCLAIMER,
  type CompanyDataSnapshot,
} from '../inspectionCopilotEngine';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fullSnapshot(): CompanyDataSnapshot {
  return {
    employeeCount: 100, hasTimeClockSystem: true, timeClockRecordCount: 5000,
    timeClockExportReady: true, contractCount: 100, contractsWithModality: 100,
    tempContractsWithCause: 10, totalTempContracts: 10, hasPRLEvaluation: true,
    hasPRLPlanning: true, hasPRLTraining: true, hasMedicalSurveillance: true,
    hasSPA: true, hasEqualityPlan: true, equalityDiagnosisComplete: true,
    hasSalaryAudit: true, equalityNegotiated: true, equalityRegistered: true,
    lismiQuotaMet: true, lismiAlternatives: true, lismiCertificatesArchived: true,
    hasWhistleblowerChannel: true, whistleblowerResponsible: true,
    whistleblowerConfidentiality: true, whistleblowerResponseTime: true,
    payslipsDelivered: true, hasTC2: true, hasCalendar: true,
    hasIRPFCertificates: true, ssAffiliationsCommunicated: true,
    rltInformed: true, copiaBasicaDelivered: true, sepeContractsCommunicated: true,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('inspectionCopilotEngine', () => {
  describe('INSPECTION_AREAS', () => {
    it('defines exactly 7 inspection areas', () => {
      expect(INSPECTION_AREAS).toHaveLength(7);
    });

    it('all areas have at least 3 checks', () => {
      for (const area of INSPECTION_AREAS) {
        expect(area.checks.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('all checks have unique ids', () => {
      const ids = INSPECTION_AREAS.flatMap(a => a.checks.map(c => c.id));
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all areas reference a legal basis', () => {
      for (const area of INSPECTION_AREAS) {
        expect(area.legalBasis.length).toBeGreaterThan(5);
      }
    });
  });

  describe('scoreToLight', () => {
    it('returns green for >= 80', () => {
      expect(scoreToLight(80)).toBe('green');
      expect(scoreToLight(100)).toBe('green');
    });
    it('returns yellow for 50-79', () => {
      expect(scoreToLight(50)).toBe('yellow');
      expect(scoreToLight(79)).toBe('yellow');
    });
    it('returns red for < 50', () => {
      expect(scoreToLight(0)).toBe('red');
      expect(scoreToLight(49)).toBe('red');
    });
  });

  describe('resolveCheck', () => {
    it('resolves known checks against data', () => {
      const data = fullSnapshot();
      expect(resolveCheck('tc_system_active', data)).toBe(true);
      expect(resolveCheck('prl_eval_risks', data)).toBe(true);
    });

    it('returns false for unknown check ids', () => {
      expect(resolveCheck('unknown_check', fullSnapshot())).toBe(false);
    });

    it('equality checks pass for <50 employees without plan', () => {
      const small = { ...createEmptySnapshot(), employeeCount: 30 };
      expect(resolveCheck('eq_plan_exists', small)).toBe(true);
      expect(resolveCheck('li_quota_met', small)).toBe(true);
    });

    it('equality checks fail for >=50 employees without plan', () => {
      const big = { ...createEmptySnapshot(), employeeCount: 60 };
      expect(resolveCheck('eq_plan_exists', big)).toBe(false);
      expect(resolveCheck('li_quota_met', big)).toBe(false);
    });
  });

  describe('evaluateArea', () => {
    it('returns green for fully compliant area', () => {
      const area = INSPECTION_AREAS.find(a => a.id === 'time_tracking')!;
      const result = evaluateArea(area, fullSnapshot());
      expect(result.light).toBe('green');
      expect(result.score).toBe(100);
      expect(result.gaps).toHaveLength(0);
    });

    it('returns red for empty snapshot', () => {
      const area = INSPECTION_AREAS.find(a => a.id === 'time_tracking')!;
      const result = evaluateArea(area, createEmptySnapshot());
      expect(result.light).toBe('red');
      expect(result.score).toBe(0);
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('evidences match check count', () => {
      const area = INSPECTION_AREAS[0];
      const result = evaluateArea(area, fullSnapshot());
      expect(result.evidences).toHaveLength(area.checks.length);
    });
  });

  describe('generateInspectionReport', () => {
    it('produces full green report for full snapshot', () => {
      const report = generateInspectionReport('company-1', fullSnapshot());
      expect(report.overallLight).toBe('green');
      expect(report.overallScore).toBe(100);
      expect(report.criticalGaps).toHaveLength(0);
      expect(report.areas).toHaveLength(7);
    });

    it('produces red report for empty snapshot', () => {
      const report = generateInspectionReport('company-1', createEmptySnapshot());
      expect(report.overallLight).toBe('red');
      expect(report.criticalGaps.length).toBeGreaterThan(0);
    });

    it('always includes disclaimer', () => {
      const report = generateInspectionReport('x', createEmptySnapshot());
      expect(report.disclaimer).toBe(INSPECTION_DISCLAIMER);
      expect(report.disclaimer).toContain('NO constituye asesoramiento jurídico');
    });

    it('includes evaluatedAt timestamp', () => {
      const report = generateInspectionReport('x', fullSnapshot());
      expect(new Date(report.evaluatedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('buildDocumentPack', () => {
    it('returns at least 10 document items', () => {
      const pack = buildDocumentPack(fullSnapshot());
      expect(pack.length).toBeGreaterThanOrEqual(10);
    });

    it('marks available docs for full snapshot', () => {
      const pack = buildDocumentPack(fullSnapshot());
      const available = pack.filter(d => d.available);
      expect(available.length).toBeGreaterThan(5);
    });

    it('marks all unavailable for empty snapshot', () => {
      const pack = buildDocumentPack(createEmptySnapshot());
      const available = pack.filter(d => d.available);
      expect(available).toHaveLength(0);
    });
  });

  describe('createEmptySnapshot', () => {
    it('all boolean fields are false', () => {
      const snap = createEmptySnapshot();
      const boolFields = Object.entries(snap).filter(([, v]) => typeof v === 'boolean');
      for (const [key, val] of boolFields) {
        expect(val).toBe(false);
      }
    });

    it('all numeric fields are 0', () => {
      const snap = createEmptySnapshot();
      const numFields = Object.entries(snap).filter(([, v]) => typeof v === 'number');
      for (const [, val] of numFields) {
        expect(val).toBe(0);
      }
    });
  });
});
