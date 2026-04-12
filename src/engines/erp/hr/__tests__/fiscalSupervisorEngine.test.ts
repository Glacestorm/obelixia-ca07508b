import { describe, it, expect } from 'vitest';
import {
  runFiscalSupervisor,
  type FiscalSupervisorInput,
  type InternationalEmployeeFlag,
  type ActiveIncidentFlag,
  FISCAL_STATUS_CONFIG,
} from '../fiscalSupervisorEngine';

// ─── Helpers ────────────────────────────────────────────────────────────────

function baseInput(overrides: Partial<FiscalSupervisorInput> = {}): FiscalSupervisorInput {
  return {
    companyId: 'test-co',
    periodYear: 2026,
    periodMonth: 3,
    ...overrides,
  };
}

const payrollMonth = (month: number, base = 3000, ret = 600) => ({
  periodYear: 2026,
  periodMonth: month,
  perceptoresCount: 10,
  baseIRPF: base,
  retencionIRPF: ret,
  brutoPeriodo: base * 1.3,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('fiscalSupervisorEngine', () => {
  describe('empty input', () => {
    it('returns preparatory or missing status when no data provided', () => {
      const result = runFiscalSupervisor(baseInput());
      expect(['missing_evidence', 'preparatory_pending']).toContain(result.overallStatus);
      expect(result.domains).toHaveLength(7);
      expect(result.disclaimer).toContain('interna preparatoria');
    });

    it('has correct filters in output', () => {
      const result = runFiscalSupervisor(baseInput());
      expect(result.filters).toEqual({ companyId: 'test-co', periodYear: 2026, periodMonth: 3 });
    });
  });

  describe('IRPF coherence', () => {
    it('passes when tipo medio is within range', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1), payrollMonth(2), payrollMonth(3)],
      }));
      const irpf = result.domains.find(d => d.id === 'irpf_coherence');
      expect(irpf).toBeDefined();
      expect(irpf!.status).toBe('ok');
      expect(irpf!.score).toBeGreaterThan(0);
    });

    it('warns on zero retention with positive base', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1, 3000, 0)],
      }));
      const irpf = result.domains.find(d => d.id === 'irpf_coherence')!;
      const zeroCheck = irpf.checks.find(c => c.id === 'irpf_zero_retention');
      expect(zeroCheck?.status).toBe('warning');
    });
  });

  describe('Modelo 111', () => {
    it('returns preparatory_pending when no modelo111', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1)],
      }));
      const m111 = result.domains.find(d => d.id === 'modelo_111')!;
      expect(m111.status).toBe('preparatory_pending');
    });

    it('reconciles when both payroll and modelo111 are provided', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1), payrollMonth(2), payrollMonth(3)],
        modelo111: {
          trimester: 1,
          periodicity: 'trimestral',
          totalPerceptores: 10,
          totalPercepciones: 9000,
          totalRetenciones: 1800,
          artifactStatus: 'prepared',
        },
      }));
      const m111 = result.domains.find(d => d.id === 'modelo_111')!;
      expect(m111.checks.length).toBeGreaterThan(0);
      expect(m111.checks.some(c => c.status === 'ok')).toBe(true);
    });
  });

  describe('Modelo 145', () => {
    it('flags incomplete 145 data', () => {
      const result = runFiscalSupervisor(baseInput({
        modelo145Employees: [
          { employeeId: 'e1', nif: '12345678A', situacionFamiliar: 1 },
          { employeeId: 'e2' }, // missing NIF and situation
        ],
      }));
      const m145 = result.domains.find(d => d.id === 'modelo_145')!;
      expect(m145.status).not.toBe('ok');
      expect(m145.checks.some(c => c.id === '145_errors')).toBe(true);
    });

    it('passes when all 145 data is complete', () => {
      const result = runFiscalSupervisor(baseInput({
        modelo145Employees: [
          { employeeId: 'e1', nif: '12345678A', situacionFamiliar: 1 },
          { employeeId: 'e2', nif: '87654321B', situacionFamiliar: 2 },
        ],
      }));
      const m145 = result.domains.find(d => d.id === 'modelo_145')!;
      expect(m145.status).toBe('ok');
    });
  });

  describe('SS/CRA', () => {
    it('returns missing_evidence when no cotización data', () => {
      const result = runFiscalSupervisor(baseInput());
      const ss = result.domains.find(d => d.id === 'ss_cra')!;
      expect(ss.status).toBe('missing_evidence');
    });

    it('reconciles with cotización totals', () => {
      const result = runFiscalSupervisor(baseInput({
        cotizacionTotals: {
          payroll: { ssEmpresa: 5000, ssTrabajador: 1500, totalBruto: 30000, workerCount: 10 },
          fan: { totalBasesCC: 28000, totalBasesAT: 28000, totalCuotaEmpresa: 5000, totalCuotaTrabajador: 1500, workerCount: 10 },
        },
      }));
      const ss = result.domains.find(d => d.id === 'ss_cra')!;
      expect(ss.checks.length).toBeGreaterThan(0);
    });
  });

  describe('International / 7p / IRNR', () => {
    const nonResident: InternationalEmployeeFlag = {
      employeeId: 'intl1',
      employeeName: 'John Smith',
      hostCountryCode: 'GB',
      daysWorkedAbroad: 200,
      daysInSpain: 90,
      annualGrossSalary: 60000,
      isNonResident: true,
      workEffectivelyAbroad: true,
      beneficiaryIsNonResident: true,
      spouseInSpain: false,
      dependentChildrenInSpain: false,
      mainEconomicActivitiesInSpain: false,
    };

    it('detects IRNR/216 for non-resident', () => {
      const result = runFiscalSupervisor(baseInput({
        internationalEmployees: [nonResident],
      }));
      const intl = result.domains.find(d => d.id === 'international')!;
      const irnrCheck = intl.checks.find(c => c.id.includes('irnr'));
      expect(irnrCheck).toBeDefined();
      expect(irnrCheck!.source).toContain('TRLIRNR');
    });

    it('evaluates Art. 7.p eligibility with real logic', () => {
      const expatriate: InternationalEmployeeFlag = {
        ...nonResident,
        isNonResident: false,
        daysInSpain: 250,
        daysWorkedAbroad: 60,
        spouseInSpain: true,
        dependentChildrenInSpain: true,
        mainEconomicActivitiesInSpain: true,
      };
      const result = runFiscalSupervisor(baseInput({
        internationalEmployees: [expatriate],
      }));
      const intl = result.domains.find(d => d.id === 'international')!;
      const art7p = intl.checks.find(c => c.id.includes('7p'));
      expect(art7p).toBeDefined();
      expect(art7p!.source).toContain('Art. 7.p');
    });

    it('detects high double tax risk without CDI', () => {
      const noCDIEmployee: InternationalEmployeeFlag = {
        ...nonResident,
        hostCountryCode: 'ZZ', // no CDI
      };
      const result = runFiscalSupervisor(baseInput({
        internationalEmployees: [noCDIEmployee],
      }));
      const intl = result.domains.find(d => d.id === 'international')!;
      const cdiCheck = intl.checks.find(c => c.id.includes('cdi'));
      expect(cdiCheck).toBeDefined();
      expect(cdiCheck!.status).toBe('critical');
    });

    it('detects Beckham regime', () => {
      const beckham: InternationalEmployeeFlag = {
        ...nonResident,
        isNonResident: false,
        isBeckhamEligible: true,
        daysInSpain: 300,
      };
      const result = runFiscalSupervisor(baseInput({
        internationalEmployees: [beckham],
      }));
      const intl = result.domains.find(d => d.id === 'international')!;
      const beckhamCheck = intl.checks.find(c => c.id.includes('beckham'));
      expect(beckhamCheck).toBeDefined();
      expect(beckhamCheck!.source).toContain('Art. 93');
    });

    it('ok when no international employees', () => {
      const result = runFiscalSupervisor(baseInput({ internationalEmployees: [] }));
      const intl = result.domains.find(d => d.id === 'international')!;
      expect(intl.status).toBe('ok');
    });
  });

  describe('Incident impact', () => {
    it('warns on fiscal-impacting incidents', () => {
      const incidents: ActiveIncidentFlag[] = [
        {
          employeeId: 'e1', employeeName: 'María López',
          incidentType: 'IT', startDate: '2026-02-01',
          affectsFiscal: true, affectsCotizacion: true,
        },
      ];
      const result = runFiscalSupervisor(baseInput({ activeIncidents: incidents }));
      const inc = result.domains.find(d => d.id === 'incident_impact')!;
      expect(inc.status).toBe('warning');
    });

    it('detects prolonged IT >365 days', () => {
      const incidents: ActiveIncidentFlag[] = [
        {
          employeeId: 'e1', employeeName: 'Carlos Ruiz',
          incidentType: 'IT', startDate: '2024-01-01', // >365 days
          affectsFiscal: true, affectsCotizacion: true,
        },
      ];
      const result = runFiscalSupervisor(baseInput({ activeIncidents: incidents }));
      const inc = result.domains.find(d => d.id === 'incident_impact')!;
      expect(inc.status).toBe('critical');
    });
  });

  describe('filter by status', () => {
    it('alerts only include non-ok checks', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1), payrollMonth(2), payrollMonth(3)],
        modelo145Employees: [{ employeeId: 'e1', nif: '12345678A', situacionFamiliar: 1 }],
      }));
      for (const alert of result.alerts) {
        expect(alert.severity).not.toBe('ok');
      }
    });
  });

  describe('scoring', () => {
    it('score reflects passed/total ratio', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1), payrollMonth(2), payrollMonth(3)],
        modelo145Employees: [{ employeeId: 'e1', nif: '12345678A', situacionFamiliar: 1 }],
      }));
      expect(result.totalChecks).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('visual config', () => {
    it('all statuses have config', () => {
      const statuses: Array<keyof typeof FISCAL_STATUS_CONFIG> = ['ok', 'missing_evidence', 'preparatory_pending', 'warning', 'critical'];
      for (const s of statuses) {
        expect(FISCAL_STATUS_CONFIG[s]).toBeDefined();
        expect(FISCAL_STATUS_CONFIG[s].label).toBeTruthy();
      }
    });
  });

  describe('preparatory state semantics', () => {
    it('missing artifact does NOT escalate to critical', () => {
      // Only modelo111 is missing, everything else is empty
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1)],
      }));
      // Modelo 111 should be preparatory_pending, not critical
      const m111 = result.domains.find(d => d.id === 'modelo_111')!;
      expect(m111.status).toBe('preparatory_pending');
      expect(result.overallStatus).not.toBe('critical');
    });

    it('missing_evidence and preparatory_pending are distinct', () => {
      const result = runFiscalSupervisor(baseInput({
        payrollMonths: [payrollMonth(1)],
      }));
      const ss = result.domains.find(d => d.id === 'ss_cra')!;
      const m111 = result.domains.find(d => d.id === 'modelo_111')!;
      // SS has no data → missing_evidence
      expect(ss.status).toBe('missing_evidence');
      // M111 not generated but payroll exists → preparatory_pending
      expect(m111.status).toBe('preparatory_pending');
    });
  });
});
