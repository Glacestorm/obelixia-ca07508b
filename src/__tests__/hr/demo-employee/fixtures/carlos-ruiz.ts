/**
 * Fixture determinista del empleado DEMO Carlos Ruiz Martín.
 *
 * Reglas:
 *  - Sin DB, sin red, sin imports de producción.
 *  - Importes redondeados a 2 decimales.
 *  - Stock options y movilidad internacional NUNCA auto-aplican beneficios fiscales:
 *    se exponen con `requiresHumanReview` para que los validadores lo verifiquen.
 *  - Snapshots esperados son referencia para Fase C; no se contrastan aquí contra
 *    el motor real, solo contra los comparadores.
 */

// === Tipos públicos del fixture =============================================

export interface CompanyDemo {
  id: string;
  name: string;
  cif: string;
  ccc: string;
  collectiveAgreement: string;
}

export interface EmployeeDemo {
  id: string;
  fullName: string;
  nif: string;
  naf: string;
  iban: string;
  birthDate: string;
  hireDate: string;
  professionalGroup: string;
  ssContributionGroup: number;
}

export interface ContractDemo {
  id: string;
  type: 'indefinido_ordinario';
  startDate: string;
  fulltime: boolean;
  weeklyHours: number;
  baseSalaryAnnual: number;
  paymentsPerYear: 14 | 12;
}

export interface PayrollPeriodDemo {
  id: string;
  year: number;
  month: number; // 1-12
  startDate: string;
  endDate: string;
  workingDays: number;
}

export interface WorkScheduleDemo {
  weeklyHours: number;
  dailyHours: number;
  daysPerWeek: number;
}

export interface IncidentDemo {
  type: 'overtime' | 'unpaid_leave' | 'work_accident' | 'maternity_paternity' | 'reduced_shift_guarda_legal';
  startDate?: string;
  endDate?: string;
  hours?: number;
  days?: number;
  reductionPercent?: number;
  notes?: string;
}

export interface BenefitDemo {
  type: 'health_insurance_flex';
  monthlyAmount: number;
  taxExemptCap: number; // tope mensual exención (orientativo)
  beneficiaries: ('employee' | 'spouse' | 'child')[];
}

export type StockOptionsClassification =
  | 'supported_production'
  | 'supported_with_review'
  | 'out_of_scope';

export interface StockOptionsDemo {
  grantId: string;
  grantDate: string;
  vestingDate: string;
  exerciseDate: string;
  shares: number;
  fairMarketValue: number; // precio de mercado por acción en ejercicio
  strikePrice: number; // precio de ejercicio por acción
  taxableBenefit: number; // (FMV - strike) * shares
  classification: StockOptionsClassification;
  requiresHumanReview: boolean;
  fiscalNotes: string;
}

export interface MobilityDemo {
  destinationCountry: string;
  startDate: string;
  endDate: string;
  hostEntity: string;
  corridor: string;
  potential7p: boolean;
  potential216: boolean;
  requiresHumanReview: boolean;
  payrollImpactExpected: boolean;
  notes: string;
}

export interface TimeClockEntryDemo {
  date: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
}

export interface OffboardingDemo {
  modes: ('disciplinary' | 'objective')[];
  pendingVacationDays: number;
  l13Applies: boolean;
  sepaDryRun: boolean;
}

export interface ExpectedPayslipSnapshot {
  totalDevengos: number;
  totalDeducciones: number;
  liquido: number;
  baseCC: number;
  baseCP: number;
  baseIRPF: number;
  irpf: number;
  ssTrabajador: number;
  ssEmpresa: number;
  costeEmpresa: number;
  conceptosEspeciales: string[];
}

export interface ExpectedBackpaySnapshot {
  original: ExpectedPayslipSnapshot;
  corrected: ExpectedPayslipSnapshot;
  diffBruto: number;
  diffIrpf: number;
  diffSsTrabajador: number;
  diffNeto: number;
}

export interface ExpectedSettlementSnapshot {
  type: 'disciplinary' | 'objective';
  pendingSalary: number;
  vacationCompensation: number;
  proRataExtraPay: number;
  indemnization: number;
  irpfWithheld: number;
  totalBruto: number;
  totalNeto: number;
  notes: string;
}

// === Datos =================================================================

export const companyDemo: CompanyDemo = {
  id: 'demo-company-001',
  name: 'Obelixia DEMO S.L.',
  cif: 'B00000000',
  ccc: '28-1234567-89',
  collectiveAgreement: 'Convenio Oficinas y Despachos (DEMO)',
};

export const employeeDemo: EmployeeDemo = {
  id: 'demo-emp-carlos-ruiz',
  fullName: 'Carlos Ruiz Martín',
  nif: '00000000T',
  naf: '281234567890',
  iban: 'ES7620770024003102575766',
  birthDate: '1988-04-12',
  hireDate: '2022-01-10',
  professionalGroup: 'Técnico',
  ssContributionGroup: 2,
};

export const contractDemo: ContractDemo = {
  id: 'demo-contract-001',
  type: 'indefinido_ordinario',
  startDate: '2022-01-10',
  fulltime: true,
  weeklyHours: 40,
  baseSalaryAnnual: 36000,
  paymentsPerYear: 14,
};

export const workScheduleDemo: WorkScheduleDemo = {
  weeklyHours: 40,
  dailyHours: 8,
  daysPerWeek: 5,
};

export const payrollPeriodDemo: PayrollPeriodDemo = {
  id: 'demo-period-2026-04',
  year: 2026,
  month: 4,
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  workingDays: 22,
};

export const incidentsDemo: IncidentDemo[] = [
  { type: 'overtime', hours: 6, notes: 'Horas extras estructurales (DEMO)' },
  { type: 'unpaid_leave', days: 1, startDate: '2026-04-15', endDate: '2026-04-15' },
  {
    type: 'work_accident',
    startDate: '2026-04-20',
    endDate: '2026-04-23',
    notes: 'IT por AT — 75% Mutua + complemento empresa según convenio',
  },
];

export const benefitsDemo: BenefitDemo[] = [
  {
    type: 'health_insurance_flex',
    monthlyAmount: 50,
    taxExemptCap: 41.67, // 500€/año / 12, orientativo
    beneficiaries: ['employee'],
  },
];

export const stockOptionsDemo: StockOptionsDemo = {
  grantId: 'demo-grant-001',
  grantDate: '2024-01-15',
  vestingDate: '2026-01-15',
  exerciseDate: '2026-04-10',
  shares: 100,
  fairMarketValue: 30,
  strikePrice: 10,
  taxableBenefit: 100 * (30 - 10), // 2000€
  classification: 'supported_with_review',
  requiresHumanReview: true,
  fiscalNotes:
    'Posible exención Art. 42.3.f LIRPF y reducción Art. 18.2 LIRPF requieren validación humana antes de marcar oficial.',
};

export const mobilityDemo: MobilityDemo = {
  destinationCountry: 'MX',
  startDate: '2026-05-05',
  endDate: '2026-07-05',
  hostEntity: 'Obelixia México S. de R.L. (DEMO)',
  corridor: 'ES-MX',
  potential7p: true,
  potential216: true,
  requiresHumanReview: true,
  payrollImpactExpected: true,
  notes:
    'Regla 183 días no auto-aplicada. 7p / 216 quedan como revisión humana obligatoria.',
};

export const timeClockDemo: TimeClockEntryDemo[] = Array.from({ length: 22 }).map(
  (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, '0')}`,
    clockIn: '09:00',
    clockOut: '18:00',
    breakMinutes: 60,
  }),
);

export const offboardingDemo: OffboardingDemo = {
  modes: ['disciplinary', 'objective'],
  pendingVacationDays: 12,
  l13Applies: true,
  sepaDryRun: true,
};

// === Snapshots esperados (referencia Fase C) ================================

/**
 * Snapshot esperado del payslip mensual con casuística completa.
 * Importes simples, internamente coherentes:
 *   - liquido = totalDevengos - totalDeducciones
 *   - costeEmpresa = totalDevengos + ssEmpresa
 */
const _devengos = 3500;
const _ssTrab = 222.25;
const _irpf = 525;
const _ssEmp = 1085;
const _deducciones = _ssTrab + _irpf;

export const expectedComplexPayslipSnapshot: ExpectedPayslipSnapshot = {
  totalDevengos: _devengos,
  totalDeducciones: round2(_deducciones),
  liquido: round2(_devengos - _deducciones),
  baseCC: 3500,
  baseCP: 3500,
  baseIRPF: 3500,
  irpf: _irpf,
  ssTrabajador: _ssTrab,
  ssEmpresa: _ssEmp,
  costeEmpresa: round2(_devengos + _ssEmp),
  conceptosEspeciales: [
    'horas_extras',
    'seguro_medico_flex',
    'stock_options_review',
    'pnr_1_dia',
    'it_at',
  ],
};

export const expectedBackpaySnapshot: ExpectedBackpaySnapshot = {
  original: {
    ...expectedComplexPayslipSnapshot,
    conceptosEspeciales: expectedComplexPayslipSnapshot.conceptosEspeciales.filter(
      (c) => c !== 'it_at',
    ),
  },
  corrected: expectedComplexPayslipSnapshot,
  diffBruto: 0, // a verificar en Fase C contra motor real
  diffIrpf: 0,
  diffSsTrabajador: 0,
  diffNeto: 0,
};

export const expectedSettlementDisciplinarySnapshot: ExpectedSettlementSnapshot = {
  type: 'disciplinary',
  pendingSalary: 1166.67,
  vacationCompensation: 1400,
  proRataExtraPay: 750,
  indemnization: 0, // procedente
  irpfWithheld: 498.5,
  totalBruto: 3316.67,
  totalNeto: round2(3316.67 - 498.5),
  notes: 'Despido disciplinario procedente: indemnización 0; riesgo improcedencia documentado.',
};

export const expectedSettlementObjectiveSnapshot: ExpectedSettlementSnapshot = {
  type: 'objective',
  pendingSalary: 1166.67,
  vacationCompensation: 1400,
  proRataExtraPay: 750,
  indemnization: 8000, // 20 d/año (referencia DEMO, tope 12 mensualidades)
  irpfWithheld: 498.5,
  totalBruto: round2(1166.67 + 1400 + 750 + 8000),
  totalNeto: round2(1166.67 + 1400 + 750 + 8000 - 498.5),
  notes: 'Despido objetivo Art. 53 ET: 20 d/año con tope 12 mensualidades. Preaviso 15 días.',
};

// === Utilidades internas ====================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// === Re-export agrupado =====================================================

export const carlosRuizFixture = {
  company: companyDemo,
  employee: employeeDemo,
  contract: contractDemo,
  workSchedule: workScheduleDemo,
  payrollPeriod: payrollPeriodDemo,
  incidents: incidentsDemo,
  benefits: benefitsDemo,
  stockOptions: stockOptionsDemo,
  mobility: mobilityDemo,
  timeClock: timeClockDemo,
  offboarding: offboardingDemo,
  expected: {
    complexPayslip: expectedComplexPayslipSnapshot,
    backpay: expectedBackpaySnapshot,
    settlementDisciplinary: expectedSettlementDisciplinarySnapshot,
    settlementObjective: expectedSettlementObjectiveSnapshot,
  },
} as const;

export type CarlosRuizFixture = typeof carlosRuizFixture;