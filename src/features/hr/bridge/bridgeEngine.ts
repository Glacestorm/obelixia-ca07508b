/**
 * HR Cross-Module Bridge Engine — Fase H
 * Pure logic layer: maps payroll results to accounting entries (PGC 2007),
 * treasury payment orders, and legal compliance snapshots.
 * No React, no Supabase — deterministic and testable.
 */

// ── PGC 2007 Standard Account Mappings ───────────────────────────────

export const PGC_PAYROLL_ACCOUNTS = {
  // Gastos de personal (Grupo 64)
  SUELDOS_SALARIOS: '640',           // Sueldos y salarios
  SS_EMPRESA: '642',                 // Seguridad Social a cargo empresa
  INDEMNIZACIONES: '641',            // Indemnizaciones
  OTROS_GASTOS_SOCIALES: '649',      // Otros gastos sociales
  RETRIBUCIONES_LP: '643',           // Retribuciones a largo plazo

  // Pasivos (Grupo 47/46)
  HP_IRPF_RETENIDO: '4751',          // HP acreedora retenciones IRPF
  ORGANISMOS_SS: '476',              // Organismos SS acreedores
  REMUNERACIONES_PENDIENTES: '465',  // Remuneraciones pendientes de pago
  ANTICIPOS_PERSONAL: '460',         // Anticipos de remuneraciones

  // Tesorería
  BANCOS: '572',                     // Bancos e instituciones de crédito
} as const;

// ── Types ────────────────────────────────────────────────────────────

export interface PayrollSummaryInput {
  payroll_run_id: string;
  company_id: string;
  period_month: number;
  period_year: number;
  total_gross: number;
  total_ss_employee: number;
  total_ss_employer: number;
  total_irpf: number;
  total_net: number;
  total_deductions_other: number;
  employee_count: number;
}

export interface AccountingEntry {
  id: string;
  date: string;
  description: string;
  debit_account: string;
  debit_label: string;
  credit_account: string;
  credit_label: string;
  amount: number;
  reference: string;
}

export interface TreasuryOrder {
  id: string;
  order_type: 'net_salary' | 'ss_payment' | 'irpf_payment';
  description: string;
  amount: number;
  due_date: string;
  beneficiary: string;
  reference: string;
  status: 'pending' | 'approved' | 'executed';
}

export interface LegalSnapshot {
  compliance_items: ComplianceItem[];
  generated_at: string;
  period: string;
}

export interface ComplianceItem {
  code: string;
  description: string;
  status: 'ok' | 'warning' | 'missing';
  detail?: string;
}

export interface BridgeResult {
  accounting_entries: AccountingEntry[];
  treasury_orders: TreasuryOrder[];
  legal_snapshot: LegalSnapshot;
  totals: {
    total_debit: number;
    total_credit: number;
    balanced: boolean;
  };
}

// ── Engine ───────────────────────────────────────────────────────────

export function generateAccountingEntries(input: PayrollSummaryInput): AccountingEntry[] {
  const { period_month, period_year, payroll_run_id } = input;
  const date = `${period_year}-${String(period_month).padStart(2, '0')}-28`;
  const ref = `NOM-${period_year}${String(period_month).padStart(2, '0')}`;
  const entries: AccountingEntry[] = [];

  // 1. Sueldos y salarios (DEBE) → Remuneraciones pendientes (HABER)
  if (input.total_gross > 0) {
    entries.push({
      id: `${payroll_run_id}-gross`,
      date,
      description: `Nóminas ${period_month}/${period_year} — Sueldos brutos`,
      debit_account: PGC_PAYROLL_ACCOUNTS.SUELDOS_SALARIOS,
      debit_label: 'Sueldos y salarios',
      credit_account: PGC_PAYROLL_ACCOUNTS.REMUNERACIONES_PENDIENTES,
      credit_label: 'Remuneraciones pendientes de pago',
      amount: round2(input.total_gross),
      reference: ref,
    });
  }

  // 2. SS empresa (DEBE) → Organismos SS (HABER)
  if (input.total_ss_employer > 0) {
    entries.push({
      id: `${payroll_run_id}-ss-emp`,
      date,
      description: `SS empresa ${period_month}/${period_year}`,
      debit_account: PGC_PAYROLL_ACCOUNTS.SS_EMPRESA,
      debit_label: 'Seguridad Social empresa',
      credit_account: PGC_PAYROLL_ACCOUNTS.ORGANISMOS_SS,
      credit_label: 'Organismos SS acreedores',
      amount: round2(input.total_ss_employer),
      reference: ref,
    });
  }

  // 3. Remuneraciones pendientes (DEBE) → Retenciones IRPF (HABER)
  if (input.total_irpf > 0) {
    entries.push({
      id: `${payroll_run_id}-irpf`,
      date,
      description: `Retención IRPF ${period_month}/${period_year}`,
      debit_account: PGC_PAYROLL_ACCOUNTS.REMUNERACIONES_PENDIENTES,
      debit_label: 'Remuneraciones pendientes de pago',
      credit_account: PGC_PAYROLL_ACCOUNTS.HP_IRPF_RETENIDO,
      credit_label: 'HP acreedora retenciones IRPF',
      amount: round2(input.total_irpf),
      reference: ref,
    });
  }

  // 4. Remuneraciones pendientes (DEBE) → SS trabajador via Organismos SS (HABER)
  if (input.total_ss_employee > 0) {
    entries.push({
      id: `${payroll_run_id}-ss-worker`,
      date,
      description: `SS trabajador ${period_month}/${period_year}`,
      debit_account: PGC_PAYROLL_ACCOUNTS.REMUNERACIONES_PENDIENTES,
      debit_label: 'Remuneraciones pendientes de pago',
      credit_account: PGC_PAYROLL_ACCOUNTS.ORGANISMOS_SS,
      credit_label: 'Organismos SS acreedores',
      amount: round2(input.total_ss_employee),
      reference: ref,
    });
  }

  // 5. Remuneraciones pendientes (DEBE) → Bancos (HABER) — pago neto
  if (input.total_net > 0) {
    entries.push({
      id: `${payroll_run_id}-net`,
      date,
      description: `Pago nóminas ${period_month}/${period_year}`,
      debit_account: PGC_PAYROLL_ACCOUNTS.REMUNERACIONES_PENDIENTES,
      debit_label: 'Remuneraciones pendientes de pago',
      credit_account: PGC_PAYROLL_ACCOUNTS.BANCOS,
      credit_label: 'Bancos',
      amount: round2(input.total_net),
      reference: ref,
    });
  }

  return entries;
}

export function generateTreasuryOrders(input: PayrollSummaryInput): TreasuryOrder[] {
  const { period_month, period_year, payroll_run_id } = input;
  const ref = `NOM-${period_year}${String(period_month).padStart(2, '0')}`;
  const orders: TreasuryOrder[] = [];

  // Net salary payment — due end of month
  if (input.total_net > 0) {
    orders.push({
      id: `${payroll_run_id}-pay-net`,
      order_type: 'net_salary',
      description: `Pago nóminas netas ${period_month}/${period_year}`,
      amount: round2(input.total_net),
      due_date: `${period_year}-${String(period_month).padStart(2, '0')}-28`,
      beneficiary: `${input.employee_count} empleados`,
      reference: ref,
      status: 'pending',
    });
  }

  // SS payment — due last day of following month
  const totalSS = input.total_ss_employer + input.total_ss_employee;
  if (totalSS > 0) {
    const nextMonth = period_month === 12 ? 1 : period_month + 1;
    const nextYear = period_month === 12 ? period_year + 1 : period_year;
    orders.push({
      id: `${payroll_run_id}-pay-ss`,
      order_type: 'ss_payment',
      description: `Cuotas SS ${period_month}/${period_year}`,
      amount: round2(totalSS),
      due_date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-28`,
      beneficiary: 'TGSS',
      reference: ref,
      status: 'pending',
    });
  }

  // IRPF — quarterly (month after quarter end)
  if (input.total_irpf > 0 && [3, 6, 9, 12].includes(period_month)) {
    const qMonth = period_month === 12 ? 1 : period_month + 1;
    const qYear = period_month === 12 ? period_year + 1 : period_year;
    orders.push({
      id: `${payroll_run_id}-pay-irpf`,
      order_type: 'irpf_payment',
      description: `Modelo 111 — T${Math.ceil(period_month / 3)}/${period_year}`,
      amount: round2(input.total_irpf),
      due_date: `${qYear}-${String(qMonth).padStart(2, '0')}-20`,
      beneficiary: 'AEAT',
      reference: ref,
      status: 'pending',
    });
  }

  return orders;
}

export function generateLegalSnapshot(input: PayrollSummaryInput): LegalSnapshot {
  const period = `${input.period_month}/${input.period_year}`;
  const items: ComplianceItem[] = [];

  // Check balanced totals
  const expectedNet = input.total_gross - input.total_ss_employee - input.total_irpf - input.total_deductions_other;
  const netDiff = Math.abs(expectedNet - input.total_net);

  items.push({
    code: 'NET_BALANCE',
    description: 'Cuadre neto = bruto - SS trabajador - IRPF - otras deducciones',
    status: netDiff < 0.02 ? 'ok' : 'warning',
    detail: netDiff < 0.02 ? 'Cuadrado' : `Diferencia de ${netDiff.toFixed(2)} €`,
  });

  items.push({
    code: 'SS_EMPLOYER',
    description: 'Cotización empresarial registrada',
    status: input.total_ss_employer > 0 ? 'ok' : 'missing',
  });

  items.push({
    code: 'IRPF_RETENTION',
    description: 'Retenciones IRPF aplicadas',
    status: input.total_irpf > 0 ? 'ok' : 'warning',
    detail: input.total_irpf === 0 ? 'Sin retenciones — verificar exenciones' : undefined,
  });

  items.push({
    code: 'EMPLOYEE_COUNT',
    description: 'Trabajadores en nómina',
    status: input.employee_count > 0 ? 'ok' : 'missing',
    detail: `${input.employee_count} empleados`,
  });

  return {
    compliance_items: items,
    generated_at: new Date().toISOString(),
    period,
  };
}

export function generateFullBridge(input: PayrollSummaryInput): BridgeResult {
  const accounting_entries = generateAccountingEntries(input);
  const treasury_orders = generateTreasuryOrders(input);
  const legal_snapshot = generateLegalSnapshot(input);

  const total_debit = accounting_entries.reduce((s, e) => s + e.amount, 0);
  // Credit side: gross = irpf + ss_worker + net + (other deductions via remuneraciones)
  // For double-entry the debit of 640 and 642 should equal the credits
  const total_credit = round2(
    input.total_gross + input.total_ss_employer
  );

  return {
    accounting_entries,
    treasury_orders,
    legal_snapshot,
    totals: {
      total_debit: round2(total_debit),
      total_credit,
      balanced: Math.abs(total_debit - total_credit) < 0.02,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
