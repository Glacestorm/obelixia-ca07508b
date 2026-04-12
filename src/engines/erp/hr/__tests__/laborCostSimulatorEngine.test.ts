/**
 * Tests for laborCostSimulatorEngine (C2)
 */
import { describe, it, expect } from 'vitest';
import {
  calculateSSEmployer,
  calculateEmployeeCost,
  defaultScenario,
  projectScenario,
  generateAlerts,
  compareScenarios,
  SIMULATOR_DISCLAIMER,
  type EmployeeCostInput,
} from '../laborCostSimulatorEngine';

const sampleEmployee: EmployeeCostInput = {
  grossMonthly: 2500,
  extraPayments: 2,
  ssGroup: 'G5',
  isTemporary: false,
  weeklyHours: 40,
};

describe('laborCostSimulatorEngine', () => {
  describe('calculateSSEmployer', () => {
    it('calculates SS employer costs for standard contract', () => {
      const result = calculateSSEmployer(2500, false);
      expect(result.total).toBeGreaterThan(700); // ~30% of gross
      expect(result.breakdown.cc).toBeGreaterThan(0);
      expect(result.breakdown.unemployment).toBeGreaterThan(0);
      expect(result.breakdown.fogasa).toBeGreaterThan(0);
    });

    it('applies higher unemployment for temporary contracts', () => {
      const indefinite = calculateSSEmployer(2500, false);
      const temporary = calculateSSEmployer(2500, true);
      expect(temporary.breakdown.unemployment).toBeGreaterThan(indefinite.breakdown.unemployment);
    });

    it('applies SS delta', () => {
      const base = calculateSSEmployer(2500, false, 0);
      const increased = calculateSSEmployer(2500, false, 1.0); // +1pp CC
      expect(increased.total).toBeGreaterThan(base.total);
    });
  });

  describe('calculateEmployeeCost', () => {
    it('calculates full cost breakdown', () => {
      const result = calculateEmployeeCost(sampleEmployee);
      expect(result.grossSalary).toBe(2500);
      expect(result.ssEmployer).toBeGreaterThan(0);
      expect(result.totalMonthly).toBeGreaterThan(result.grossSalary);
      expect(result.totalAnnual).toBeGreaterThan(result.totalMonthly * 12); // extra payments
      expect(result.costPerHour).toBeGreaterThan(0);
      expect(result.lines.length).toBeGreaterThanOrEqual(5);
    });

    it('includes all cost components', () => {
      const result = calculateEmployeeCost(sampleEmployee);
      const codes = result.lines.map(l => l.code);
      expect(codes).toContain('GROSS');
      expect(codes).toContain('SS_EMP');
      expect(codes).toContain('TRAINING');
      expect(codes).toContain('PRL');
      expect(codes).toContain('ABSENT');
    });

    it('percentages sum to ~100', () => {
      const result = calculateEmployeeCost(sampleEmployee);
      const totalPct = result.lines.reduce((s, l) => s + l.percentOfTotal, 0);
      expect(totalPct).toBeGreaterThan(98);
      expect(totalPct).toBeLessThan(102);
    });

    it('marks origins correctly', () => {
      const result = calculateEmployeeCost(sampleEmployee);
      const gross = result.lines.find(l => l.code === 'GROSS');
      expect(gross?.origin).toBe('historical');
      const training = result.lines.find(l => l.code === 'TRAINING');
      expect(training?.origin).toBe('hypothesis');
    });
  });

  describe('defaultScenario', () => {
    it('returns sensible defaults', () => {
      const s = defaultScenario();
      expect(s.months).toBe(12);
      expect(s.ipcAnnual).toBeGreaterThan(0);
      expect(s.smiMonthly).toBeGreaterThan(1000);
    });
  });

  describe('projectScenario', () => {
    it('projects N months correctly', () => {
      const scenario = defaultScenario('Test', 24);
      const result = projectScenario([sampleEmployee], scenario);
      expect(result.projections).toHaveLength(24);
      expect(result.projections[0].month).toBe(1);
      expect(result.projections[23].month).toBe(24);
      expect(result.totalProjectedCost).toBeGreaterThan(0);
      expect(result.assumptions.length).toBeGreaterThan(5);
    });

    it('shows cost growth over time', () => {
      const scenario = defaultScenario('Growth', 12);
      scenario.ipcAnnual = 5;
      scenario.salaryGrowthAboveIPC = 2;
      const result = projectScenario([sampleEmployee], scenario);
      const first = result.projections[0].totalLaborCost;
      const last = result.projections[11].totalLaborCost;
      expect(last).toBeGreaterThan(first);
    });

    it('handles headcount growth', () => {
      const scenario = defaultScenario('Hire', 12);
      scenario.headcountGrowthRate = 20;
      const result = projectScenario([sampleEmployee, sampleEmployee], scenario);
      const firstHC = result.projections[0].headcount;
      const lastHC = result.projections[11].headcount;
      expect(lastHC).toBeGreaterThanOrEqual(firstHC);
    });

    it('handles empty employees', () => {
      const result = projectScenario([], defaultScenario());
      expect(result.totalProjectedCost).toBe(0);
      expect(result.projections).toHaveLength(0);
    });

    it('cumulative cost increases monotonically', () => {
      const result = projectScenario([sampleEmployee], defaultScenario('Cum', 12));
      for (let i = 1; i < result.projections.length; i++) {
        expect(result.projections[i].cumulativeCost).toBeGreaterThan(result.projections[i - 1].cumulativeCost);
      }
    });
  });

  describe('generateAlerts', () => {
    it('generates alert for high cost growth', () => {
      const scenario = defaultScenario('Alert', 36);
      scenario.ipcAnnual = 8;
      scenario.salaryGrowthAboveIPC = 3;
      const result = projectScenario([sampleEmployee], scenario);
      expect(result.alerts.some(a => a.metric === 'cost_growth')).toBe(true);
    });

    it('generates alert for high absenteeism', () => {
      const scenario = defaultScenario('Absent', 12);
      scenario.absenteeismRate = 8;
      const result = projectScenario([sampleEmployee], scenario);
      expect(result.alerts.some(a => a.metric === 'absenteeism')).toBe(true);
    });
  });

  describe('compareScenarios', () => {
    it('compares two scenarios', () => {
      const base = projectScenario([sampleEmployee], defaultScenario('A', 12));
      const optimistic = projectScenario([sampleEmployee], { ...defaultScenario('B', 12), ipcAnnual: 1 });
      const comparison = compareScenarios(base, optimistic);
      expect(comparison).toHaveLength(3);
      expect(comparison[0].label).toBe('Coste mensual base');
    });
  });

  describe('disclaimer', () => {
    it('contains key warning terms', () => {
      expect(SIMULATOR_DISCLAIMER).toContain('estimaciones');
      expect(SIMULATOR_DISCLAIMER).toContain('hipótesis');
      expect(SIMULATOR_DISCLAIMER).toContain('No constituyen garantía');
    });
  });
});
