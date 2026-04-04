/**
 * laborDocumentEngine — Motor de generación de documentos laborales
 * Capa 4: Engine determinista sin side-effects
 * ET Arts. 49, 53, 56 · RD 625/1985 · OM 6/2/1996
 */

// ============================================
// FINIQUITO (Settlement)
// ============================================

export interface FiniquitoInput {
  startDate: Date;
  endDate: Date;
  annualSalary: number;
  vacationDaysEntitled: number;
  vacationDaysTaken: number;
  extraPayments: number;
  dismissalType: 'procedente' | 'improcedente' | 'temporal_end' | 'null' | 'voluntary';
  yearsWorked: number;
  /** Monthly salary supplements (pluses) */
  monthlySalarySupplements?: number;
  /** Pending salary days in current month */
  pendingSalaryDays?: number;
  /** Working days in current month */
  workingDaysInMonth?: number;
}

export interface FiniquitoResult {
  /** Pending salary proration */
  pendingSalary: number;
  /** Vacation compensation */
  vacationAmount: number;
  vacationPending: number;
  /** Extra pay proration */
  extraProportional: number;
  /** Severance pay */
  severance: number;
  indemnizationDays: number;
  /** Total before deductions */
  totalBruto: number;
  /** Legal reference */
  legalNote: string;
  /** Breakdown lines for document */
  lines: Array<{ concept: string; amount: number; type: 'earning' | 'deduction' }>;
}

export function calculateFiniquito(input: FiniquitoInput): FiniquitoResult {
  const dailySalary = input.annualSalary / 365;
  const monthSalary = input.annualSalary / 12;
  const totalMonthly = monthSalary + (input.monthlySalarySupplements || 0);

  // 1. Pending salary for current month
  const pendingSalary = input.pendingSalaryDays !== undefined && input.workingDaysInMonth
    ? Math.round((totalMonthly / input.workingDaysInMonth) * input.pendingSalaryDays * 100) / 100
    : 0;

  // 2. Vacation compensation
  const vacationPending = Math.max(0, input.vacationDaysEntitled - input.vacationDaysTaken);
  const vacationAmount = Math.round(dailySalary * vacationPending * 100) / 100;

  // 3. Extra pay proration
  const currentMonth = input.endDate.getMonth() + 1;
  const extraProportional = input.extraPayments > 12
    ? Math.round((monthSalary / (input.extraPayments - 12)) * (currentMonth / 6) * 100) / 100
    : 0;

  // 4. Severance calculation per ET
  let indemnizationDays: number;
  let maxMonths: number;
  let legalArticle: string;

  switch (input.dismissalType) {
    case 'improcedente':
      indemnizationDays = 33; // ET Art. 56.1 (post-reforma 2012)
      maxMonths = 24;
      legalArticle = 'ET Art. 56.1';
      break;
    case 'procedente':
      indemnizationDays = 20; // ET Art. 53.1
      maxMonths = 12;
      legalArticle = 'ET Art. 53.1';
      break;
    case 'temporal_end':
      indemnizationDays = 12; // ET Art. 49.1.c
      maxMonths = 12;
      legalArticle = 'ET Art. 49.1.c';
      break;
    case 'voluntary':
      indemnizationDays = 0;
      maxMonths = 0;
      legalArticle = 'ET Art. 49.1.d';
      break;
    default: // 'null' — nulidad
      indemnizationDays = 0; // readmisión o 33 días
      maxMonths = 0;
      legalArticle = 'ET Art. 55.6';
      break;
  }

  const severance = indemnizationDays > 0
    ? Math.min(
        Math.round(dailySalary * indemnizationDays * input.yearsWorked * 100) / 100,
        monthSalary * maxMonths
      )
    : 0;

  // Build lines
  const lines: FiniquitoResult['lines'] = [];

  if (pendingSalary > 0) {
    lines.push({ concept: 'Salario pendiente mes en curso', amount: pendingSalary, type: 'earning' });
  }
  if (vacationAmount > 0) {
    lines.push({ concept: `Vacaciones no disfrutadas (${vacationPending} días)`, amount: vacationAmount, type: 'earning' });
  }
  if (extraProportional > 0) {
    lines.push({ concept: 'Prorrata pagas extras', amount: extraProportional, type: 'earning' });
  }
  if (severance > 0) {
    lines.push({ concept: `Indemnización (${indemnizationDays} d/año × ${input.yearsWorked} años)`, amount: severance, type: 'earning' });
  }

  const totalBruto = Math.round((pendingSalary + vacationAmount + extraProportional + severance) * 100) / 100;

  return {
    pendingSalary,
    vacationAmount,
    vacationPending,
    extraProportional,
    severance,
    indemnizationDays,
    totalBruto,
    legalNote: legalArticle,
    lines,
  };
}

// ============================================
// CARTA DE DESPIDO (Dismissal Letter)
// ============================================

export interface DismissalLetterInput {
  employeeName: string;
  employeeNIF: string;
  companyName: string;
  companyCIF: string;
  dismissalDate: string;
  effectiveDate: string;
  dismissalType: 'procedente' | 'improcedente' | 'disciplinario';
  reasons: string[];
  severanceAmount: number;
  vacationDays: number;
}

export interface DismissalLetterResult {
  subject: string;
  body: string;
  legalBasis: string;
  requiredDelivery: string;
  preaviso: number;
}

export function generateDismissalLetter(input: DismissalLetterInput): DismissalLetterResult {
  const preaviso = input.dismissalType === 'disciplinario' ? 0 : 15;

  const legalBasis = input.dismissalType === 'disciplinario'
    ? 'ET Art. 54 — Despido disciplinario'
    : input.dismissalType === 'procedente'
    ? 'ET Art. 52 — Extinción por causas objetivas'
    : 'ET Art. 56 — Despido improcedente';

  const subject = `Comunicación de ${input.dismissalType === 'disciplinario' ? 'despido disciplinario' : 'extinción de contrato'}`;

  const body = [
    `${input.companyName} (CIF: ${input.companyCIF}),`,
    `comunica a D./Dña. ${input.employeeName} (NIF: ${input.employeeNIF}),`,
    `la decisión de proceder a la extinción de su relación laboral,`,
    `con efectos desde el día ${input.effectiveDate}.`,
    '',
    'HECHOS:',
    ...input.reasons.map((r, i) => `${i + 1}. ${r}`),
    '',
    `FUNDAMENTO LEGAL: ${legalBasis}`,
    '',
    input.severanceAmount > 0
      ? `Se pone a su disposición la cantidad de ${input.severanceAmount.toFixed(2)}€ en concepto de indemnización legal.`
      : '',
    input.vacationDays > 0
      ? `Asimismo, tiene pendientes ${input.vacationDays} días de vacaciones que serán compensados económicamente.`
      : '',
    '',
    `Le informamos de su derecho a impugnar esta decisión ante la jurisdicción social en el plazo de 20 días hábiles (ET Art. 59.3).`,
    '',
    `En ${new Date().toLocaleDateString('es-ES')}.`,
  ].filter(Boolean).join('\n');

  return {
    subject,
    body,
    legalBasis,
    requiredDelivery: 'Entrega en mano con testigos o burofax con acuse de recibo',
    preaviso,
  };
}

// ============================================
// CERTIFICADO DE EMPRESA (Employment Certificate for SEPE)
// RD 625/1985
// ============================================

export interface EmploymentCertificateInput {
  employeeName: string;
  employeeNIF: string;
  employeeNAF: string;
  companyName: string;
  companyCIF: string;
  companyCCC: string;
  contractStartDate: string;
  contractEndDate: string;
  contractType: string;
  dismissalCause: string;
  last180DaysBases: Array<{ month: string; base: number; days: number }>;
  vacationPending: number;
}

export interface EmploymentCertificateResult {
  employeeData: Record<string, string>;
  companyData: Record<string, string>;
  contractData: Record<string, string>;
  bases: Array<{ month: string; base: number; days: number }>;
  totalDays: number;
  averageDailyBase: number;
  legalNote: string;
}

export function generateEmploymentCertificate(input: EmploymentCertificateInput): EmploymentCertificateResult {
  const totalDays = input.last180DaysBases.reduce((sum, b) => sum + b.days, 0);
  const totalBases = input.last180DaysBases.reduce((sum, b) => sum + b.base, 0);
  const averageDailyBase = totalDays > 0 ? Math.round((totalBases / totalDays) * 100) / 100 : 0;

  return {
    employeeData: {
      nombre: input.employeeName,
      nif: input.employeeNIF,
      naf: input.employeeNAF,
    },
    companyData: {
      nombre: input.companyName,
      cif: input.companyCIF,
      ccc: input.companyCCC,
    },
    contractData: {
      tipo: input.contractType,
      inicio: input.contractStartDate,
      fin: input.contractEndDate,
      causa: input.dismissalCause,
      vacacionesPendientes: `${input.vacationPending} días`,
    },
    bases: input.last180DaysBases,
    totalDays,
    averageDailyBase,
    legalNote: 'RD 625/1985, de 2 de abril — Certificado de empresa para prestaciones por desempleo',
  };
}

// ============================================
// PARTE DELTA (Workplace Accident Report)
// ============================================

export interface ParteDeltaInput {
  employeeName: string;
  employeeNIF: string;
  employeeNAF: string;
  companyName: string;
  companyCCC: string;
  accidentDate: string;
  accidentTime: string;
  accidentPlace: string;
  accidentDescription: string;
  injuryType: string;
  bodyPart: string;
  workStation: string;
  witnessNames: string[];
  medicalDiagnosis: string;
  expectedLeave: boolean;
  expectedLeaveDays?: number;
}

export interface ParteDeltaResult {
  header: Record<string, string>;
  accidentData: Record<string, string>;
  medicalData: Record<string, string>;
  deadlines: Array<{ action: string; deadline: string; norm: string }>;
  legalNote: string;
}

export function generateParteDelta(input: ParteDeltaInput): ParteDeltaResult {
  const accidentDateObj = new Date(input.accidentDate);
  const fiveDaysLater = new Date(accidentDateObj);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

  return {
    header: {
      trabajador: input.employeeName,
      nif: input.employeeNIF,
      naf: input.employeeNAF,
      empresa: input.companyName,
      ccc: input.companyCCC,
    },
    accidentData: {
      fecha: input.accidentDate,
      hora: input.accidentTime,
      lugar: input.accidentPlace,
      descripcion: input.accidentDescription,
      puestoTrabajo: input.workStation,
      testigos: input.witnessNames.join(', '),
    },
    medicalData: {
      tipoLesion: input.injuryType,
      parteAfectada: input.bodyPart,
      diagnostico: input.medicalDiagnosis,
      bajaPrevista: input.expectedLeave ? 'Sí' : 'No',
      diasEstimados: input.expectedLeaveDays?.toString() ?? '—',
    },
    deadlines: [
      {
        action: 'Comunicar accidente a la Autoridad Laboral (Sistema Delt@)',
        deadline: fiveDaysLater.toISOString().split('T')[0],
        norm: 'Orden TAS/2926/2002',
      },
      {
        action: 'Comunicar accidente grave/muy grave: 24 horas',
        deadline: 'Inmediato si accidente grave',
        norm: 'Art. 6 Orden TAS/2926/2002',
      },
      {
        action: 'Investigación interna del accidente',
        deadline: '72 horas',
        norm: 'LPRL Art. 16.3',
      },
    ],
    legalNote: 'Orden TAS/2926/2002, de 19 de noviembre — Sistema de notificación de accidentes de trabajo Delt@',
  };
}
