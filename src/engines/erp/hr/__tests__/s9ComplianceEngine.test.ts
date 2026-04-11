/**
 * S9 Compliance Engine — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  computeLISMIQuota,
  generateSalaryRegisterData,
  evaluateDisconnectionCompliance,
  validateRemoteWorkAgreement,
  computePresenciality,
  computeVPTScore,
  detectVPTIncoherences,
  suggestEquivalentBand,
  compareVPTValuations,
  DEFAULT_VPT_METHODOLOGY,
  generateVPTEnrichedRegister,
  computeRetributiveAudit,
  computeEquityVPTContext,
  computeFairnessVPTSummary,
} from '../s9ComplianceEngine';
import { RETRIBUTIVE_AUDIT_DISCLAIMER, VPT_CONTEXT_DISCLAIMER } from '@/types/s9-compliance';

// ─── LISMI ───────────────────────────────────────────────────

describe('computeLISMIQuota', () => {
  it('should not apply for companies < 50 employees', () => {
    const result = computeLISMIQuota(30, 0);
    expect(result.thresholdApplies).toBe(false);
    expect(result.isCompliant).toBe(true);
    expect(result.deficit).toBe(0);
  });

  it('should require 1 disabled employee for exactly 50', () => {
    const result = computeLISMIQuota(50, 0);
    expect(result.thresholdApplies).toBe(true);
    expect(result.isCompliant).toBe(false);
    expect(result.deficit).toBe(1);
  });

  it('should be compliant with 1 disabled for 50', () => {
    const result = computeLISMIQuota(50, 1);
    expect(result.isCompliant).toBe(true);
    expect(result.deficit).toBe(0);
  });

  it('should calculate deficit for 200 with 3 disabled', () => {
    const result = computeLISMIQuota(200, 3);
    expect(result.thresholdApplies).toBe(true);
    expect(result.isCompliant).toBe(false);
    expect(result.deficit).toBe(1); // needs 4
  });

  it('should be compliant for 200 with 4 disabled', () => {
    const result = computeLISMIQuota(200, 4);
    expect(result.isCompliant).toBe(true);
    expect(result.deficit).toBe(0);
  });

  it('should generate critical alert on non-compliance', () => {
    const result = computeLISMIQuota(100, 0);
    expect(result.alerts.some(a => a.level === 'critical')).toBe(true);
  });
});

// ─── SALARY REGISTER ────────────────────────────────────────

describe('generateSalaryRegisterData', () => {
  const records = [
    { employeeId: '1', gender: 'M', groupOrCategory: 'A1', concept: 'base', amount: 3000 },
    { employeeId: '2', gender: 'M', groupOrCategory: 'A1', concept: 'base', amount: 3200 },
    { employeeId: '3', gender: 'F', groupOrCategory: 'A1', concept: 'base', amount: 2000 },
    { employeeId: '4', gender: 'F', groupOrCategory: 'A1', concept: 'base', amount: 2200 },
  ];

  it('should compute mean and median correctly', () => {
    const report = generateSalaryRegisterData(records, '2026-01');
    const entry = report.entries[0];
    expect(entry.maleMean).toBe(3100);
    expect(entry.femaleMean).toBe(2100);
    expect(entry.maleMedian).toBe(3100);
    expect(entry.femaleMedian).toBe(2100);
  });

  it('should detect significant gap > 25%', () => {
    const report = generateSalaryRegisterData(records, '2026-01');
    const entry = report.entries[0];
    expect(entry.hasSignificantGap).toBe(true);
    expect(entry.gapPercent).toBeGreaterThan(0.25);
  });

  it('should generate alerts for significant gaps', () => {
    const report = generateSalaryRegisterData(records, '2026-01');
    expect(report.alerts.length).toBeGreaterThan(0);
  });

  it('should not flag gap when pay is equal', () => {
    const equalRecords = [
      { employeeId: '1', gender: 'M', groupOrCategory: 'B1', concept: 'base', amount: 2500 },
      { employeeId: '2', gender: 'F', groupOrCategory: 'B1', concept: 'base', amount: 2500 },
    ];
    const report = generateSalaryRegisterData(equalRecords, '2026-01');
    expect(report.entries[0].hasSignificantGap).toBe(false);
  });

  it('should increment version', () => {
    const report = generateSalaryRegisterData(records, '2026-01', 2);
    expect(report.version).toBe(3);
  });
});

// ─── DISCONNECTION ──────────────────────────────────────────

describe('evaluateDisconnectionCompliance', () => {
  const policy = { id: 'p1', startTime: '18:00', endTime: '08:00' };

  it('should detect violations when clock-out after disconnection start', () => {
    const entries = [
      { employeeId: 'e1', date: '2026-01-15', clockIn: '09:00', clockOut: '19:30' },
    ];
    const { violations, metrics } = evaluateDisconnectionCompliance(policy, entries);
    expect(violations.length).toBe(1);
    expect(violations[0].minutesOutside).toBe(90);
    expect(metrics.employeesAffected).toBe(1);
  });

  it('should not flag violations within policy', () => {
    const entries = [
      { employeeId: 'e1', date: '2026-01-15', clockIn: '09:00', clockOut: '17:45' },
    ];
    const { violations } = evaluateDisconnectionCompliance(policy, entries);
    expect(violations.length).toBe(0);
  });

  it('should calculate compliance rate', () => {
    const entries = [
      { employeeId: 'e1', date: '2026-01-15', clockIn: '09:00', clockOut: '17:00' },
      { employeeId: 'e2', date: '2026-01-15', clockIn: '09:00', clockOut: '20:00' },
    ];
    const { metrics } = evaluateDisconnectionCompliance(policy, entries);
    expect(metrics.complianceRate).toBe(50);
  });
});

// ─── REMOTE WORK ────────────────────────────────────────────

describe('validateRemoteWorkAgreement', () => {
  it('should fail validation when empty', () => {
    const result = validateRemoteWorkAgreement({});
    expect(result.isComplete).toBe(false);
    expect(result.missingPoints.length).toBe(13);
    expect(result.completionPercent).toBeCloseTo(0);
  });

  it('should pass when all 13 points filled', () => {
    const content: Record<string, unknown> = {
      equipment_inventory: ['laptop'],
      expense_list: 'internet+electricity',
      work_schedule: '9-18',
      availability_hours: '10-14',
      workplace_percentage: 60,
      work_center_reference: 'Madrid office',
      work_location: 'Home address',
      duration_and_notice: '6 months, 15 days notice',
      reversibility_terms: 'Any party, 15 days',
      performance_monitoring: 'Monthly OKRs',
      disconnection_protocol: 'Policy P1',
      data_protection: 'VPN + encrypted',
      risk_prevention: 'Ergonomic assessment',
    };
    const result = validateRemoteWorkAgreement(content);
    expect(result.isComplete).toBe(true);
    expect(result.missingPoints.length).toBe(0);
    expect(result.completionPercent).toBe(100);
  });

  it('should detect partial completion', () => {
    const content = {
      equipment_inventory: ['laptop'],
      work_schedule: '9-18',
    };
    const result = validateRemoteWorkAgreement(content);
    expect(result.isComplete).toBe(false);
    expect(result.completedPoints.length).toBe(2);
    expect(result.completionPercent).toBeCloseTo((2 / 13) * 100, 0);
  });
});

// ─── PRESENCIALITY ──────────────────────────────────────────

describe('computePresenciality', () => {
  it('should classify >= 30% as remote work', () => {
    const result = computePresenciality(40);
    expect(result.presencial).toBe(60);
    expect(result.remote).toBe(40);
    expect(result.label).toContain('distancia');
  });

  it('should classify < 30% as occasional', () => {
    const result = computePresenciality(20);
    expect(result.label).toContain('puntual');
});

// ─── VPT SCORING ───────────────────────────────────────────

describe('computeVPTScore', () => {
  const allMax: import('@/types/s9-compliance').VPTFactorScores = {
    qualifications: { formal_education: 5, experience: 5, certifications: 5 },
    responsibility: { people_decisions: 5, economic_decisions: 5, organizational_impact: 5 },
    effort: { intellectual_complexity: 5, physical_effort: 5, emotional_load: 5 },
    conditions: { hardship_danger: 5, atypical_schedules: 5, availability_travel: 5 },
  };

  const allMin: import('@/types/s9-compliance').VPTFactorScores = {
    qualifications: { formal_education: 1, experience: 1, certifications: 1 },
    responsibility: { people_decisions: 1, economic_decisions: 1, organizational_impact: 1 },
    effort: { intellectual_complexity: 1, physical_effort: 1, emotional_load: 1 },
    conditions: { hardship_danger: 1, atypical_schedules: 1, availability_travel: 1 },
  };

  it('should produce score 100 with all subfactors at max', () => {
    const result = computeVPTScore(allMax);
    expect(result.totalScore).toBe(100);
  });

  it('should produce score 0 with all subfactors at min', () => {
    const result = computeVPTScore(allMin);
    expect(result.totalScore).toBe(0);
  });

  it('should produce deterministic results for same inputs', () => {
    const a = computeVPTScore(allMax);
    const b = computeVPTScore(allMax);
    expect(a.totalScore).toBe(b.totalScore);
    expect(a.factorScores).toEqual(b.factorScores);
  });

  it('should respect factor weights — responsibility (30%) weighs more than effort (20%)', () => {
    const highResp: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 1, experience: 1, certifications: 1 },
      responsibility: { people_decisions: 5, economic_decisions: 5, organizational_impact: 5 },
      effort: { intellectual_complexity: 1, physical_effort: 1, emotional_load: 1 },
      conditions: { hardship_danger: 1, atypical_schedules: 1, availability_travel: 1 },
    };
    const highEffort: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 1, experience: 1, certifications: 1 },
      responsibility: { people_decisions: 1, economic_decisions: 1, organizational_impact: 1 },
      effort: { intellectual_complexity: 5, physical_effort: 5, emotional_load: 5 },
      conditions: { hardship_danger: 1, atypical_schedules: 1, availability_travel: 1 },
    };
    const rScore = computeVPTScore(highResp).totalScore;
    const eScore = computeVPTScore(highEffort).totalScore;
    expect(rScore).toBeGreaterThan(eScore);
  });

  it('should not bias physical_effort over emotional_load with default weights', () => {
    const physicalHigh: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 3, experience: 3, certifications: 3 },
      responsibility: { people_decisions: 3, economic_decisions: 3, organizational_impact: 3 },
      effort: { intellectual_complexity: 3, physical_effort: 5, emotional_load: 1 },
      conditions: { hardship_danger: 3, atypical_schedules: 3, availability_travel: 3 },
    };
    const emotionalHigh: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 3, experience: 3, certifications: 3 },
      responsibility: { people_decisions: 3, economic_decisions: 3, organizational_impact: 3 },
      effort: { intellectual_complexity: 3, physical_effort: 1, emotional_load: 5 },
      conditions: { hardship_danger: 3, atypical_schedules: 3, availability_travel: 3 },
    };
    const pScore = computeVPTScore(physicalHigh).totalScore;
    const eScore = computeVPTScore(emotionalHigh).totalScore;
    // Same weight (0.30 each) so scores should be equal
    expect(pScore).toBe(eScore);
  });

  it('should produce per-factor scores between 0 and 100', () => {
    const mid: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 3, experience: 3, certifications: 3 },
      responsibility: { people_decisions: 3, economic_decisions: 3, organizational_impact: 3 },
      effort: { intellectual_complexity: 3, physical_effort: 3, emotional_load: 3 },
      conditions: { hardship_danger: 3, atypical_schedules: 3, availability_travel: 3 },
    };
    const result = computeVPTScore(mid);
    for (const factorScore of Object.values(result.factorScores)) {
      expect(factorScore).toBeGreaterThanOrEqual(0);
      expect(factorScore).toBeLessThanOrEqual(100);
    }
    expect(result.totalScore).toBe(50);
  });

  it('should accept custom methodology with different weights', () => {
    const custom: import('@/types/s9-compliance').VPTMethodology = [
      { factor: 'qualifications', weight: 1.0, subfactors: [{ subfactor: 'formal_education', weight: 1.0 }] },
      { factor: 'responsibility', weight: 0, subfactors: [{ subfactor: 'people_decisions', weight: 1.0 }] },
      { factor: 'effort', weight: 0, subfactors: [{ subfactor: 'intellectual_complexity', weight: 1.0 }] },
      { factor: 'conditions', weight: 0, subfactors: [{ subfactor: 'hardship_danger', weight: 1.0 }] },
    ];
    const scores: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 5 },
      responsibility: { people_decisions: 1 },
      effort: { intellectual_complexity: 1 },
      conditions: { hardship_danger: 1 },
    };
    const result = computeVPTScore(scores, custom);
    expect(result.totalScore).toBe(100);
  });
});

// ─── VPT INCOHERENCES ──────────────────────────────────────

describe('detectVPTIncoherences', () => {
  it('should detect score vs band incoherence', () => {
    const vals = [
      { id: '1', positionId: 'p1', positionName: 'Director', totalScore: 90, salaryBandMax: 20000, jobLevel: 'A' },
      { id: '2', positionId: 'p2', positionName: 'Junior', totalScore: 20, salaryBandMax: 60000, jobLevel: 'B' },
      { id: '3', positionId: 'p3', positionName: 'Mid', totalScore: 50, salaryBandMax: 40000, jobLevel: 'C' },
      { id: '4', positionId: 'p4', positionName: 'Senior', totalScore: 80, salaryBandMax: 55000, jobLevel: 'D' },
    ];
    const incs = detectVPTIncoherences(vals);
    const scoreBand = incs.filter(i => i.type === 'score_vs_band');
    expect(scoreBand.length).toBeGreaterThan(0);
    expect(scoreBand[0].level).toBe('critical');
  });

  it('should detect level divergence when same level has >30pt difference', () => {
    const vals = [
      { id: '1', positionId: 'p1', totalScore: 80, jobLevel: 'A' },
      { id: '2', positionId: 'p2', totalScore: 40, jobLevel: 'A' },
    ];
    const incs = detectVPTIncoherences(vals);
    expect(incs.some(i => i.type === 'level_divergence')).toBe(true);
  });

  it('should not flag when same level has similar scores', () => {
    const vals = [
      { id: '1', positionId: 'p1', totalScore: 60, jobLevel: 'A' },
      { id: '2', positionId: 'p2', totalScore: 65, jobLevel: 'A' },
    ];
    const incs = detectVPTIncoherences(vals);
    expect(incs.filter(i => i.type === 'level_divergence').length).toBe(0);
  });
});

// ─── VPT BAND SUGGESTION ───────────────────────────────────

describe('suggestEquivalentBand', () => {
  it('should return null with fewer than 2 references', () => {
    expect(suggestEquivalentBand(50, [{ score: 50, bandMin: 20000, bandMax: 30000 }])).toBeNull();
  });

  it('should interpolate between two reference points', () => {
    const refs = [
      { score: 0, bandMin: 15000, bandMax: 20000 },
      { score: 100, bandMin: 50000, bandMax: 70000 },
    ];
    const result = suggestEquivalentBand(50, refs)!;
    expect(result.suggestedMin).toBe(32500);
    expect(result.suggestedMax).toBe(45000);
    expect(result.basis).toBe('interpolación lineal');
  });

  it('should keep band separate from score calculation', () => {
    const scores: import('@/types/s9-compliance').VPTFactorScores = {
      qualifications: { formal_education: 3, experience: 3, certifications: 3 },
      responsibility: { people_decisions: 3, economic_decisions: 3, organizational_impact: 3 },
      effort: { intellectual_complexity: 3, physical_effort: 3, emotional_load: 3 },
      conditions: { hardship_danger: 3, atypical_schedules: 3, availability_travel: 3 },
    };
    const scoreResult = computeVPTScore(scores);
    const bandResult = suggestEquivalentBand(scoreResult.totalScore, [
      { score: 0, bandMin: 15000, bandMax: 20000 },
      { score: 100, bandMin: 50000, bandMax: 70000 },
    ]);
    // Score and band are independent calculations
    expect(scoreResult.totalScore).toBe(50);
    expect(bandResult).not.toBeNull();
    expect(bandResult!.suggestedMin).not.toBe(scoreResult.totalScore);
  });
});

// ─── VPT COMPARISON ────────────────────────────────────────

describe('compareVPTValuations', () => {
  it('should return breakdown for each valuation', () => {
    const vals = [
      { positionId: 'p1', positionName: 'Dir', factorScores: {
        qualifications: { formal_education: 5, experience: 5, certifications: 5 },
        responsibility: { people_decisions: 5, economic_decisions: 5, organizational_impact: 5 },
        effort: { intellectual_complexity: 5, physical_effort: 5, emotional_load: 5 },
        conditions: { hardship_danger: 5, atypical_schedules: 5, availability_travel: 5 },
      } as import('@/types/s9-compliance').VPTFactorScores, methodology: DEFAULT_VPT_METHODOLOGY, totalScore: 100 },
      { positionId: 'p2', positionName: 'Jr', factorScores: {
        qualifications: { formal_education: 1, experience: 1, certifications: 1 },
        responsibility: { people_decisions: 1, economic_decisions: 1, organizational_impact: 1 },
        effort: { intellectual_complexity: 1, physical_effort: 1, emotional_load: 1 },
        conditions: { hardship_danger: 1, atypical_schedules: 1, availability_travel: 1 },
      } as import('@/types/s9-compliance').VPTFactorScores, methodology: DEFAULT_VPT_METHODOLOGY, totalScore: 0 },
    ];
    const result = compareVPTValuations(vals);
    expect(result.length).toBe(2);
    expect(result[0].totalScore).toBe(100);
    expect(result[1].totalScore).toBe(0);
  });
  });
});

// ─── VPT-ENRICHED SALARY REGISTER (S9.4) ──────────────────

describe('generateVPTEnrichedRegister', () => {
  const records = [
    { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', concept: 'base', amount: 3000, positionId: 'p1' },
    { employeeId: '2', gender: 'M' as const, groupOrCategory: 'A1', concept: 'base', amount: 3200, positionId: 'p1' },
    { employeeId: '3', gender: 'F' as const, groupOrCategory: 'A1', concept: 'base', amount: 2000, positionId: 'p2' },
    { employeeId: '4', gender: 'F' as const, groupOrCategory: 'A1', concept: 'base', amount: 2200, positionId: 'p2' },
  ];
  const vptMap = { p1: 70, p2: 45 };

  it('should preserve base register entries', () => {
    const enriched = generateVPTEnrichedRegister(records, '2026-01', vptMap);
    expect(enriched.entries.length).toBe(1);
    expect(enriched.entries[0].maleMean).toBe(3100);
    expect(enriched.entries[0].femaleMean).toBe(2100);
    expect(enriched.entries[0].hasSignificantGap).toBe(true);
  });

  it('should add vptScore and vptBandLabel when VPT exists', () => {
    const enriched = generateVPTEnrichedRegister(records, '2026-01', vptMap);
    expect(enriched.entries[0].vptScore).not.toBeNull();
    expect(enriched.entries[0].vptBandLabel).not.toBeNull();
  });

  it('should gracefully handle employees without VPT', () => {
    const enriched = generateVPTEnrichedRegister(records, '2026-01', {});
    expect(enriched.entries[0].vptScore).toBeNull();
    expect(enriched.entries[0].vptBandLabel).toBeNull();
    // Base data still works
    expect(enriched.entries[0].maleMean).toBe(3100);
  });

  it('should produce byVPTBand aggregation', () => {
    const enriched = generateVPTEnrichedRegister(records, '2026-01', vptMap);
    expect(enriched.byVPTBand.length).toBeGreaterThan(0);
    const bands = enriched.byVPTBand.map(b => b.band);
    // p1=70 → Q3, p2=45 → Q2
    expect(bands).toContain('Q3 (50-75)');
    expect(bands).toContain('Q2 (25-50)');
  });

  it('should produce empty byVPTBand when no VPT data', () => {
    const enriched = generateVPTEnrichedRegister(records, '2026-01', {});
    expect(enriched.byVPTBand.length).toBe(0);
  });
});

// ─── RETRIBUTIVE AUDIT (S9.4) ──────────────────────────────

describe('computeRetributiveAudit', () => {
  it('should calculate total gap correctly', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 3000, positionId: 'p1' },
      { employeeId: '2', gender: 'F' as const, groupOrCategory: 'A1', salary: 2000, positionId: 'p2' },
    ];
    const report = computeRetributiveAudit(employees, {}, '2026-01');
    expect(report.entries[0].totalGapPercent).toBeCloseTo(1/3, 2); // (3000-2000)/3000
  });

  it('should not contextualize when VPT scores are similar', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 3000, positionId: 'p1' },
      { employeeId: '2', gender: 'F' as const, groupOrCategory: 'A1', salary: 2000, positionId: 'p2' },
    ];
    // Similar VPT scores (diff < 15)
    const vptMap = { p1: 60, p2: 55 };
    const report = computeRetributiveAudit(employees, vptMap, '2026-01');
    expect(report.entries[0].gapContextualizedByVPT).toBe(0);
    expect(report.entries[0].gapUnexplained).toBeGreaterThan(0);
  });

  it('should partially contextualize when VPT scores diverge significantly', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 3000, positionId: 'p1' },
      { employeeId: '2', gender: 'F' as const, groupOrCategory: 'A1', salary: 2000, positionId: 'p2' },
    ];
    // Divergent VPT scores (diff > 15)
    const vptMap = { p1: 80, p2: 40 };
    const report = computeRetributiveAudit(employees, vptMap, '2026-01');
    expect(report.entries[0].gapContextualizedByVPT).toBeGreaterThan(0);
    expect(report.entries[0].gapUnexplained).toBeGreaterThan(0);
  });

  it('should never allow gapExplainedByVPT to exceed 80% of total gap', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 5000, positionId: 'p1' },
      { employeeId: '2', gender: 'F' as const, groupOrCategory: 'A1', salary: 1000, positionId: 'p2' },
    ];
    // Maximum divergence
    const vptMap = { p1: 100, p2: 0 };
    const report = computeRetributiveAudit(employees, vptMap, '2026-01');
    const entry = report.entries[0];
    const totalGap = entry.totalGapPercent;
    expect(entry.gapContextualizedByVPT).toBeLessThanOrEqual(totalGap * 0.80 + 0.001);
    expect(entry.gapUnexplained).toBeGreaterThan(0);
  });

  it('should include disclaimer in report', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 3000, positionId: null },
    ];
    const report = computeRetributiveAudit(employees, {}, '2026-01');
    expect(report.disclaimer).toBe(RETRIBUTIVE_AUDIT_DISCLAIMER);
    expect(report.disclaimer).toContain('soporte analítico');
    expect(report.disclaimer).toContain('no constituyen justificación');
  });

  it('should handle single-gender groups gracefully', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 3000, positionId: 'p1' },
      { employeeId: '2', gender: 'M' as const, groupOrCategory: 'A1', salary: 3200, positionId: 'p1' },
    ];
    const report = computeRetributiveAudit(employees, { p1: 60 }, '2026-01');
    expect(report.entries[0].totalGapPercent).toBe(0);
    expect(report.entries[0].gapContextualizedByVPT).toBe(0);
  });

  it('should gracefully handle employees without VPT', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 3000, positionId: null },
      { employeeId: '2', gender: 'F' as const, groupOrCategory: 'A1', salary: 2000, positionId: null },
    ];
    const report = computeRetributiveAudit(employees, {}, '2026-01');
    expect(report.entries[0].maleAvgVPT).toBeNull();
    expect(report.entries[0].femaleAvgVPT).toBeNull();
    expect(report.entries[0].gapContextualizedByVPT).toBe(0);
    // Gap still calculated
    expect(report.entries[0].totalGapPercent).toBeGreaterThan(0);
  });

  it('should generate alerts for gaps >= 25%', () => {
    const employees = [
      { employeeId: '1', gender: 'M' as const, groupOrCategory: 'A1', salary: 4000, positionId: 'p1' },
      { employeeId: '2', gender: 'F' as const, groupOrCategory: 'A1', salary: 2000, positionId: 'p2' },
    ];
    const report = computeRetributiveAudit(employees, { p1: 80, p2: 30 }, '2026-01');
    expect(report.groupsWithAlert).toBe(1);
    expect(report.entries[0].alerts.length).toBeGreaterThan(0);
  });
});