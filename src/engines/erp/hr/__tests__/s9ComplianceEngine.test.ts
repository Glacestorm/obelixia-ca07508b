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
  DEFAULT_VPT_METHODOLOGY,
} from '../s9ComplianceEngine';

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
});
