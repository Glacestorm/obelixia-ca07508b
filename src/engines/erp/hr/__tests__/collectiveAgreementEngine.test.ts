/**
 * Tests for collectiveAgreementEngine (C1)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveWorkingConditions,
  normalizeSalaryTable,
  detectConflicts,
  resolveAgreement,
  computeAgreementCompleteness,
  parseSeniorityRules,
  parseNightShiftBonus,
  parseAdditionalPermits,
  parseUnionObligations,
  AGREEMENT_DISCLAIMER,
  type RawCollectiveAgreement,
  type RawSalaryTableEntry,
} from '../collectiveAgreementEngine';

const baseAgreement: RawCollectiveAgreement = {
  id: 'agr-001',
  code: 'METAL-ESTATAL',
  name: 'Convenio colectivo estatal de la industria del metal',
  effective_date: '2025-01-01',
  expiration_date: '2027-12-31',
  is_active: true,
  working_hours_week: 38.5,
  vacation_days: 23,
  extra_payments: 3,
  seniority_rules: { type: 'trienios', amount_per_period: 45.50, max_periods: 10, is_percentage: false, source: 'Art. 32 Conv. Metal' },
  night_shift_bonus: { percentage: 25, start_hour: 22, end_hour: 6, source: 'Art. 40 Conv. Metal' },
  other_concepts: { permits: [{ name: 'Mudanza', days: 2, paid: true, conditions: 'Cambio domicilio habitual', source: 'Art. 51' }] },
  union_obligations: { obligations: ['Tablón de anuncios sindical', 'Horas sindicales: 20h/mes'] },
  salary_tables: null,
  metadata: { trial_period_tecnico: 180, trial_period_otros: 30 },
  source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-XXXXX',
};

const sampleSalaryRows: RawSalaryTableEntry[] = [
  { professional_group: 'G1', professional_group_description: 'Ingenieros y Licenciados', level: '', base_salary_monthly: 1800, base_salary_annual: 25200, plus_convenio_monthly: 150, extra_pay_amount: 1800, total_annual_compensation: 30600 },
  { professional_group: 'G3', professional_group_description: 'Jefes de Taller y Sección', level: '', base_salary_monthly: 1400, base_salary_annual: 19600, plus_convenio_monthly: 100, extra_pay_amount: 1400, total_annual_compensation: 23400 },
  { professional_group: 'G5', professional_group_description: 'Oficiales de primera', level: '', base_salary_monthly: 1200, base_salary_annual: 16800, plus_convenio_monthly: 80, extra_pay_amount: 1200, total_annual_compensation: 20160 },
];

describe('collectiveAgreementEngine', () => {
  describe('parseSeniorityRules', () => {
    it('returns null for null input', () => {
      expect(parseSeniorityRules(null)).toBeNull();
    });
    it('parses seniority config correctly', () => {
      const result = parseSeniorityRules({ type: 'quinquenios', amount_per_period: 100, max_periods: 5, is_percentage: true });
      expect(result).toEqual({ type: 'quinquenios', amountPerPeriod: 100, maxPeriods: 5, isPercentage: true, source: 'Convenio colectivo' });
    });
  });

  describe('parseNightShiftBonus', () => {
    it('returns null for null', () => {
      expect(parseNightShiftBonus(null)).toBeNull();
    });
    it('parses night config', () => {
      const r = parseNightShiftBonus({ percentage: 30, start_hour: 22, end_hour: 7 });
      expect(r?.percentageIncrease).toBe(30);
      expect(r?.endHour).toBe(7);
    });
  });

  describe('parseAdditionalPermits', () => {
    it('returns empty for null', () => {
      expect(parseAdditionalPermits(null)).toEqual([]);
    });
    it('parses permits array', () => {
      const r = parseAdditionalPermits({ permits: [{ name: 'Mudanza', days: 2, paid: true }] });
      expect(r).toHaveLength(1);
      expect(r[0].name).toBe('Mudanza');
      expect(r[0].isPaid).toBe(true);
    });
  });

  describe('parseUnionObligations', () => {
    it('returns empty for null', () => {
      expect(parseUnionObligations(null)).toEqual([]);
    });
    it('parses obligations', () => {
      expect(parseUnionObligations({ obligations: ['A', 'B'] })).toEqual(['A', 'B']);
    });
  });

  describe('resolveWorkingConditions', () => {
    it('resolves from agreement fields', () => {
      const { conditions, trace } = resolveWorkingConditions(baseAgreement);
      expect(conditions.weeklyHours).toBe(38.5);
      expect(conditions.vacationDays).toBe(23);
      expect(conditions.extraPayments).toBe(3);
      expect(conditions.seniorityRules?.type).toBe('trienios');
      expect(conditions.nightShiftBonus?.percentageIncrease).toBe(25);
      expect(conditions.additionalPermits).toHaveLength(1);
      expect(conditions.unionObligations).toHaveLength(2);
      expect(trace.length).toBeGreaterThanOrEqual(3);
    });

    it('falls back to ET defaults when fields are null', () => {
      const empty: RawCollectiveAgreement = { ...baseAgreement, working_hours_week: null, vacation_days: null, extra_payments: null, seniority_rules: null, night_shift_bonus: null, other_concepts: null, union_obligations: null };
      const { conditions } = resolveWorkingConditions(empty);
      expect(conditions.weeklyHours).toBe(40);
      expect(conditions.vacationDays).toBe(30);
      expect(conditions.extraPayments).toBe(2);
    });
  });

  describe('normalizeSalaryTable', () => {
    it('normalizes rows correctly', () => {
      const result = normalizeSalaryTable(sampleSalaryRows);
      expect(result).toHaveLength(3);
      expect(result[0].professionalGroup).toBe('G1');
      expect(result[0].baseSalaryMonthly).toBe(1800);
      expect(result[0].plusConvenioMonthly).toBe(150);
    });
  });

  describe('detectConflicts', () => {
    it('detects hours conflict', () => {
      const conditions = resolveWorkingConditions(baseAgreement).conditions;
      const conflicts = detectConflicts(conditions, { weeklyHours: 42 }, []);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].severity).toBe('critical');
      expect(conflicts[0].area).toBe('Jornada laboral');
    });

    it('detects salary below minimum', () => {
      const conditions = resolveWorkingConditions(baseAgreement).conditions;
      const table = normalizeSalaryTable(sampleSalaryRows);
      const conflicts = detectConflicts(conditions, { baseSalaryMonthly: 1000, professionalGroup: 'G5' }, table);
      expect(conflicts.some(c => c.area === 'Salario base')).toBe(true);
    });

    it('detects vacation conflict', () => {
      const conditions = resolveWorkingConditions(baseAgreement).conditions;
      const conflicts = detectConflicts(conditions, { vacationDays: 20 }, []);
      expect(conflicts.some(c => c.area === 'Vacaciones')).toBe(true);
    });

    it('no conflicts when compliant', () => {
      const conditions = resolveWorkingConditions(baseAgreement).conditions;
      const table = normalizeSalaryTable(sampleSalaryRows);
      const conflicts = detectConflicts(conditions, { weeklyHours: 37, vacationDays: 25, baseSalaryMonthly: 2000, professionalGroup: 'G1' }, table);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveAgreement', () => {
    it('produces full resolution with traceability', () => {
      const result = resolveAgreement(baseAgreement, sampleSalaryRows);
      expect(result.agreementCode).toBe('METAL-ESTATAL');
      expect(result.salaryTable).toHaveLength(3);
      expect(result.isExpired).toBe(false);
      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.disclaimer).toBe(AGREEMENT_DISCLAIMER);
      expect(result.overallConfidence).toBeDefined();
    });

    it('marks expired agreements', () => {
      const expired = { ...baseAgreement, expiration_date: '2020-01-01' };
      const result = resolveAgreement(expired, []);
      expect(result.isExpired).toBe(true);
      expect(result.trace.some(t => t.field === 'vigencia')).toBe(true);
    });

    it('includes conflicts when employee data provided', () => {
      const result = resolveAgreement(baseAgreement, sampleSalaryRows, { weeklyHours: 45, baseSalaryMonthly: 900, professionalGroup: 'G5' });
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('computeAgreementCompleteness', () => {
    it('scores full agreement high', () => {
      const { score, missing } = computeAgreementCompleteness(baseAgreement);
      expect(score).toBeGreaterThanOrEqual(80);
      expect(missing.length).toBeLessThanOrEqual(2);
    });

    it('scores empty agreement low', () => {
      const empty: RawCollectiveAgreement = {
        ...baseAgreement, working_hours_week: null, vacation_days: null,
        extra_payments: null, seniority_rules: null, night_shift_bonus: null,
        other_concepts: null, union_obligations: null, salary_tables: null, source_url: null,
      };
      const { score } = computeAgreementCompleteness(empty);
      expect(score).toBe(0);
    });
  });
});
