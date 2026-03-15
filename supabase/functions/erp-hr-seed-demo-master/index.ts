import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEMO_MASTER_META = { is_demo: true, is_demo_master: true };
const BATCH_ID = () => `master-${Date.now()}`;

function padDNI(n: number): string {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  return `${String(n).padStart(8, '0')}${letters[n % 23]}`;
}
function genIBAN(): string {
  const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  return `ES${r(10, 99)} ${r(1000, 9999)} ${r(1000, 9999)} ${r(10, 99)} ${r(1000000000, 9999999999)}`;
}
function genSSN(): string {
  const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  return `28/${r(10000000, 99999999)}/${r(10, 99)}`;
}
function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// =========================================================
// 12 MASTER DEMO PROFILES
// =========================================================
interface MasterProfile {
  code: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  gender: 'M' | 'F';
  birthDate: string;
  jobTitle: string;
  department: string;
  baseSalary: number;
  contractType: string;
  hireDate: string;
  status: 'active' | 'on_leave' | 'terminated';
  terminationDate?: string;
  weeklyHours: number;
  workSchedule: string;
  scenario: string;
}

const MASTER_PROFILES: MasterProfile[] = [
  {
    code: 'DM-001', firstName: 'Carlos', lastName: 'Ruiz Martín',
    nationalId: padDNI(12345678), gender: 'M', birthDate: '1988-05-15',
    jobTitle: 'Desarrollador Senior', department: 'IT', baseSalary: 42000,
    contractType: 'indefinido', hireDate: '2020-03-01', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'standard_active'
  },
  {
    code: 'DM-002', firstName: 'Ana Belén', lastName: 'Torres Sánchez',
    nationalId: padDNI(23456789), gender: 'F', birthDate: '1995-11-22',
    jobTitle: 'Analista Junior', department: 'ADM', baseSalary: 24000,
    contractType: 'temporal', hireDate: '2026-03-10', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'recent_hire'
  },
  {
    code: 'DM-003', firstName: 'Miguel Ángel', lastName: 'Sanz Herrero',
    nationalId: padDNI(34567890), gender: 'M', birthDate: '1982-02-08',
    jobTitle: 'Director Comercial', department: 'COM', baseSalary: 65000,
    contractType: 'indefinido', hireDate: '2017-09-15', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'overtime_bonus'
  },
  {
    code: 'DM-004', firstName: 'Laura', lastName: 'Fernández Gil',
    nationalId: padDNI(45678901), gender: 'F', birthDate: '1990-07-30',
    jobTitle: 'Product Manager', department: 'IT', baseSalary: 48000,
    contractType: 'indefinido', hireDate: '2019-01-15', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'flex_benefits'
  },
  {
    code: 'DM-005', firstName: 'David', lastName: 'Moreno Ortiz',
    nationalId: padDNI(56789012), gender: 'M', birthDate: '1978-12-03',
    jobTitle: 'CTO', department: 'DIR', baseSalary: 95000,
    contractType: 'indefinido', hireDate: '2016-06-01', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'stock_options'
  },
  {
    code: 'DM-006', firstName: 'Elena', lastName: 'Vidal Ruiz',
    nationalId: padDNI(67890123), gender: 'F', birthDate: '1993-04-18',
    jobTitle: 'Diseñadora UX', department: 'IT', baseSalary: 36000,
    contractType: 'indefinido', hireDate: '2021-02-01', status: 'on_leave',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'work_accident_it'
  },
  {
    code: 'DM-007', firstName: 'Javier', lastName: 'López Navarro',
    nationalId: padDNI(78901234), gender: 'M', birthDate: '1991-09-25',
    jobTitle: 'Ingeniero DevOps', department: 'IT', baseSalary: 45000,
    contractType: 'indefinido', hireDate: '2020-07-01', status: 'on_leave',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'paternity_leave'
  },
  {
    code: 'DM-008', firstName: 'Sofía', lastName: 'Martínez Díaz',
    nationalId: padDNI(89012345), gender: 'F', birthDate: '1985-01-12',
    jobTitle: 'Country Manager LATAM', department: 'COM', baseSalary: 72000,
    contractType: 'indefinido', hireDate: '2018-04-01', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'international_assignment'
  },
  {
    code: 'DM-009', firstName: 'Pablo', lastName: 'García Herrera',
    nationalId: padDNI(90123456), gender: 'M', birthDate: '1996-08-05',
    jobTitle: 'Técnico de Soporte', department: 'IT', baseSalary: 26000,
    contractType: 'indefinido', hireDate: '2022-10-01', status: 'active',
    weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'arrears_correction'
  },
  {
    code: 'DM-010', firstName: 'Carmen', lastName: 'Alonso Vega',
    nationalId: padDNI(11234567), gender: 'F', birthDate: '1987-06-20',
    jobTitle: 'Contable Senior', department: 'ADM', baseSalary: 38000,
    contractType: 'indefinido', hireDate: '2019-05-01', status: 'active',
    weeklyHours: 30, workSchedule: 'part_time',
    scenario: 'reduced_hours'
  },
  {
    code: 'DM-011', firstName: 'Roberto', lastName: 'Díaz Campos',
    nationalId: padDNI(22345678), gender: 'M', birthDate: '1989-03-14',
    jobTitle: 'Comercial', department: 'COM', baseSalary: 30000,
    contractType: 'indefinido', hireDate: '2021-01-15', status: 'terminated',
    terminationDate: '2026-02-15', weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'disciplinary_dismissal'
  },
  {
    code: 'DM-012', firstName: 'Isabel', lastName: 'Muñoz Pérez',
    nationalId: padDNI(33456789), gender: 'F', birthDate: '1986-10-28',
    jobTitle: 'Marketing Manager', department: 'COM', baseSalary: 50000,
    contractType: 'indefinido', hireDate: '2018-11-01', status: 'terminated',
    terminationDate: '2026-01-31', weeklyHours: 40, workSchedule: 'full_time',
    scenario: 'objective_dismissal'
  },
];

// =========================================================
// CLEANUP: Remove only demo master data
// =========================================================
async function cleanupMasterDemo(supabase: any, companyId: string) {
  console.log('[cleanup] Removing previous master demo data...');

  // Get master demo employee IDs
  const { data: masterEmps } = await supabase
    .from('erp_hr_employees')
    .select('id')
    .eq('company_id', companyId)
    .eq('metadata->>is_demo_master', 'true');

  const empIds = (masterEmps || []).map((e: any) => e.id);
  if (empIds.length === 0) {
    console.log('[cleanup] No previous master demo employees found');
    return;
  }

  console.log(`[cleanup] Found ${empIds.length} master demo employees to remove`);

  // Delete in FK-safe order (children first)
  const tablesToClean = [
    'erp_hr_time_clock',
    'erp_hr_leave_requests',
    'erp_hr_leave_balances',
    'erp_hr_payroll_incidents',
    'erp_hr_benefits_enrollments',
    'erp_hr_employee_documents',
    'erp_hr_registration_data',
    'erp_hr_contract_process_data',
    'erp_hr_employee_compensation',
  ];

  for (const table of tablesToClean) {
    const { error } = await supabase.from(table).delete().in('employee_id', empIds);
    if (error) console.warn(`[cleanup] ${table}:`, error.message);
  }

  // Delete payrolls
  await supabase.from('erp_hr_payrolls').delete().in('employee_id', empIds);

  // Delete payroll runs marked as demo master
  await supabase.from('erp_hr_payroll_runs').delete()
    .eq('company_id', companyId)
    .eq('metadata->>is_demo_master', 'true');

  // Delete benefits plans marked as demo master
  await supabase.from('erp_hr_benefits_plans').delete()
    .eq('company_id', companyId)
    .eq('metadata->>is_demo_master', 'true');

  // Delete payroll periods marked as demo master
  await supabase.from('hr_payroll_periods').delete()
    .eq('company_id', companyId)
    .eq('metadata->>is_demo_master', 'true');

  // Delete contracts
  await supabase.from('erp_hr_contracts').delete().in('employee_id', empIds);

  // Finally delete employees
  await supabase.from('erp_hr_employees').delete().in('id', empIds);

  console.log('[cleanup] Master demo cleanup complete');
}

// =========================================================
// PHASE 1: Employees
// =========================================================
async function seedMasterEmployees(supabase: any, companyId: string, batchId: string) {
  // Get departments
  const { data: deptRows } = await supabase
    .from('erp_hr_departments')
    .select('id, code')
    .eq('company_id', companyId);

  const deptMap: Record<string, string> = {};
  (deptRows || []).forEach((d: any) => { deptMap[d.code] = d.id; });

  const employees: any[] = [];
  const empIdMap: Record<string, string> = {};

  for (const p of MASTER_PROFILES) {
    const empId = crypto.randomUUID();
    empIdMap[p.code] = empId;

    employees.push({
      id: empId,
      company_id: companyId,
      employee_code: p.code,
      first_name: p.firstName,
      last_name: p.lastName,
      national_id: p.nationalId,
      ss_number: genSSN(),
      birth_date: p.birthDate,
      gender: p.gender,
      email: `${p.firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')}.${p.lastName.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@obelixia-demo.es`,
      phone: `+34 6${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 900 + 100)}`,
      address: {
        street: `Calle ${['Mayor', 'Real', 'Nueva', 'Sol', 'Luna'][Math.floor(Math.random() * 5)]} ${Math.floor(Math.random() * 120) + 1}`,
        city: 'Madrid', postal_code: '28001', province: 'Madrid', country: 'ES'
      },
      bank_account: genIBAN(),
      hire_date: p.hireDate,
      status: p.status,
      termination_date: p.terminationDate || null,
      department_id: deptMap[p.department] || null,
      category: p.contractType === 'indefinido' ? 'fijo' : p.contractType,
      job_title: p.jobTitle,
      base_salary: p.baseSalary,
      contract_type: p.contractType,
      work_schedule: p.workSchedule,
      weekly_hours: p.weeklyHours,
      fiscal_jurisdiction: 'ES',
      autonomous_community: p.scenario === 'international_assignment' ? null : 'Madrid',
      country_code: 'ES',
      nationality: 'ES',
      metadata: { ...DEMO_MASTER_META, demo_profile_code: p.code, demo_batch_id: batchId, scenario: p.scenario },
    });
  }

  const { error } = await supabase.from('erp_hr_employees').insert(employees);
  if (error) throw new Error(`Master employees: ${error.message}`);

  return empIdMap;
}

// =========================================================
// PHASE 2: Contracts
// =========================================================
async function seedMasterContracts(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const contracts: any[] = [];

  for (const p of MASTER_PROFILES) {
    const empId = empIdMap[p.code];
    const isTerminated = p.status === 'terminated';

    contracts.push({
      company_id: companyId,
      employee_id: empId,
      contract_type: p.contractType,
      contract_code: `CTR-${p.code}`,
      start_date: p.hireDate,
      end_date: p.contractType === 'temporal' ? '2026-09-10' : null,
      base_salary: p.baseSalary,
      annual_salary: p.baseSalary,
      working_hours: p.weeklyHours,
      workday_type: p.workSchedule,
      category: p.contractType === 'indefinido' ? 'fijo' : p.contractType,
      is_active: !isTerminated,
      termination_date: p.terminationDate || null,
      termination_type: p.scenario === 'disciplinary_dismissal' ? 'disciplinario' :
                       p.scenario === 'objective_dismissal' ? 'objetivo' : null,
      termination_reason: p.scenario === 'disciplinary_dismissal' ? 'Incumplimiento grave de obligaciones laborales' :
                         p.scenario === 'objective_dismissal' ? 'Causas económicas - reestructuración departamental' : null,
      country_code: 'ES',
    });
  }

  const { error } = await supabase.from('erp_hr_contracts').insert(contracts);
  if (error) throw new Error(`Master contracts: ${error.message}`);
  return contracts.length;
}

// =========================================================
// PHASE 3: Payroll Periods + Runs
// =========================================================
async function seedMasterPayrollPeriods(supabase: any, companyId: string, batchId: string) {
  const periods: any[] = [];
  const periodIdMap: Record<string, string> = {};

  for (const month of [1, 2, 3]) {
    const periodId = crypto.randomUUID();
    const key = `2026-${month}`;
    periodIdMap[key] = periodId;

    periods.push({
      id: periodId,
      company_id: companyId,
      period_name: `Nómina ${['Enero', 'Febrero', 'Marzo'][month - 1]} 2026`,
      period_number: month,
      period_type: 'monthly',
      fiscal_year: 2026,
      start_date: dateStr(2026, month, 1),
      end_date: dateStr(2026, month, month === 2 ? 28 : (month % 2 === 0 ? 30 : 31)),
      status: month === 1 ? 'closed' : (month === 2 ? 'approved' : 'draft'),
      country_code: 'ES',
      employee_count: 10,
      metadata: { ...DEMO_MASTER_META, demo_batch_id: batchId },
    });
  }

  const { error: pErr } = await supabase.from('hr_payroll_periods').insert(periods);
  if (pErr) console.warn('[periods]', pErr.message);

  // Create payroll runs
  const runs: any[] = [];
  for (const month of [1, 2, 3]) {
    const key = `2026-${month}`;
    const periodId = periodIdMap[key];
    if (!periodId) continue;

    runs.push({
      company_id: companyId,
      period_id: periodId,
      period_month: month,
      period_year: 2026,
      run_type: 'initial',
      run_number: 1,
      version: 1,
      status: month === 1 ? 'approved' : (month === 2 ? 'approved' : 'draft'),
      total_employees: 10,
      employees_calculated: 10,
      employees_errored: 0,
      employees_skipped: 0,
      errors_count: 0,
      warnings_count: 0,
      context_snapshot: { type: 'master_demo', created: new Date().toISOString() },
      snapshot_hash: `sha-v1-master-${month}`,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      metadata: { ...DEMO_MASTER_META, demo_batch_id: batchId },
    });
  }

  // Correction run for Pablo (arrears)
  const marchKey = `2026-3`;
  if (periodIdMap[marchKey]) {
    runs.push({
      company_id: companyId,
      period_id: periodIdMap[marchKey],
      period_month: 3,
      period_year: 2026,
      run_type: 'correction',
      run_number: 2,
      version: 2,
      status: 'draft',
      total_employees: 1,
      employees_calculated: 1,
      employees_errored: 0,
      employees_skipped: 0,
      errors_count: 0,
      warnings_count: 1,
      notes: 'Recálculo por IT no reflejada en enero - atrasos Pablo García',
      context_snapshot: { type: 'correction', reason: 'arrears_it_missing', employee: 'Pablo García Herrera' },
      snapshot_hash: `sha-v1-correction-3`,
      started_at: new Date().toISOString(),
      metadata: { ...DEMO_MASTER_META, demo_batch_id: batchId },
    });
  }

  const { error: rErr } = await supabase.from('erp_hr_payroll_runs').insert(runs);
  if (rErr) console.warn('[runs]', rErr.message);

  return { periodIdMap, runsCount: runs.length };
}

// =========================================================
// PHASE 4: Payrolls (nóminas mensuales)
// =========================================================
async function seedMasterPayrolls(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const payrolls: any[] = [];

  for (const p of MASTER_PROFILES) {
    const empId = empIdMap[p.code];
    // Skip terminated employees for months after their termination
    const months = p.status === 'terminated'
      ? (p.scenario === 'objective_dismissal' ? [1] : [1, 2])
      : (p.scenario === 'recent_hire' ? [3] : [1, 2, 3]);

    for (const month of months) {
      const monthlySalary = p.baseSalary / 14;
      const irpfPct = p.baseSalary > 60000 ? 30 : (p.baseSalary > 35000 ? 22 : (p.baseSalary > 22000 ? 15 : 8));

      let complements: Record<string, number> = {};
      let extraGross = 0;

      // Scenario-specific
      if (p.scenario === 'overtime_bonus' && month >= 2) {
        complements = { horas_extra: 850, plus_productividad: 400 };
        extraGross = 1250;
      } else if (p.scenario === 'stock_options' && month === 1) {
        complements = { stock_options: 5000, plus_responsabilidad: 500 };
        extraGross = 5500;
      } else if (p.scenario === 'reduced_hours') {
        // 30h/40h = 75% salary
        // Already reflected in base
      }

      const grossSalary = parseFloat((monthlySalary + extraGross).toFixed(2));
      const ssWorker = parseFloat((grossSalary * 0.0635).toFixed(2));
      const irpfAmount = parseFloat((grossSalary * irpfPct / 100).toFixed(2));
      const totalDeductions = parseFloat((ssWorker + irpfAmount).toFixed(2));
      const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));
      const ssCompany = parseFloat((grossSalary * 0.305).toFixed(2));
      const totalCost = parseFloat((grossSalary + ssCompany).toFixed(2));

      payrolls.push({
        company_id: companyId,
        employee_id: empId,
        period_month: month,
        period_year: 2026,
        payroll_type: 'mensual',
        base_salary: parseFloat(monthlySalary.toFixed(2)),
        complements: Object.keys(complements).length > 0 ? complements : null,
        gross_salary: grossSalary,
        ss_worker: ssWorker,
        irpf_amount: irpfAmount,
        irpf_percentage: irpfPct,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        ss_company: ssCompany,
        total_cost: totalCost,
        status: month === 1 ? 'paid' : (month === 2 ? 'approved' : 'calculated'),
        calculated_at: new Date().toISOString(),
        paid_at: month === 1 ? `2026-01-28T10:00:00Z` : null,
        fiscal_jurisdiction: 'ES',
        metadata: { ...DEMO_MASTER_META, demo_batch_id: batchId, demo_profile_code: p.code },
      });
    }
  }

  const { error } = await supabase.from('erp_hr_payrolls').insert(payrolls);
  if (error) throw new Error(`Master payrolls: ${error.message}`);
  return payrolls.length;
}

// =========================================================
// PHASE 5: Payroll Incidents
// =========================================================
async function seedMasterIncidents(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const incidents: any[] = [];
  const meta = { ...DEMO_MASTER_META, demo_batch_id: batchId };

  // Miguel Ángel — horas extras
  incidents.push({
    company_id: companyId, employee_id: empIdMap['DM-003'],
    concept_code: 'ES_HORAS_EXTRA', incident_type: 'variable',
    description: 'Horas extra febrero - campaña comercial', amount: 850,
    units: 20, unit_price: 42.5, period_month: 2, period_year: 2026,
    status: 'approved', source: 'manual',
    tributa_irpf: true, cotiza_ss: true, metadata: meta,
  });
  incidents.push({
    company_id: companyId, employee_id: empIdMap['DM-003'],
    concept_code: 'ES_HORAS_EXTRA', incident_type: 'variable',
    description: 'Horas extra marzo - cierre trimestral', amount: 850,
    units: 20, unit_price: 42.5, period_month: 3, period_year: 2026,
    status: 'pending', source: 'manual',
    tributa_irpf: true, cotiza_ss: true, metadata: meta,
  });

  // David — stock options
  incidents.push({
    company_id: companyId, employee_id: empIdMap['DM-005'],
    concept_code: 'ES_STOCK_OPTIONS', incident_type: 'retribution_in_kind',
    description: 'Ejercicio stock options Q1 2026 — 500 acciones a 10€/ud',
    amount: 5000, period_month: 1, period_year: 2026,
    status: 'approved', source: 'manual',
    tributa_irpf: true, cotiza_ss: true,
    requires_tax_adjustment: true, metadata: meta,
  });

  // Pablo — atrasos por IT no reflejada
  incidents.push({
    company_id: companyId, employee_id: empIdMap['DM-009'],
    concept_code: 'ES_ATRASOS', incident_type: 'correction',
    description: 'Atrasos enero — IT no reflejada en nómina mensual',
    amount: 312.50, period_month: 3, period_year: 2026,
    status: 'pending', source: 'recalculation',
    tributa_irpf: true, cotiza_ss: true,
    notes: 'Corresponde a 5 días IT enero no descontados. Recálculo pendiente.',
    metadata: meta,
  });

  // Carmen — reducción jornada impact
  incidents.push({
    company_id: companyId, employee_id: empIdMap['DM-010'],
    concept_code: 'ES_REDUCCION_JORNADA', incident_type: 'modification',
    description: 'Reducción de jornada por guarda legal — 30h/semana (75%)',
    amount: -712.14, period_month: 1, period_year: 2026,
    status: 'approved', source: 'admin_request',
    tributa_irpf: true, cotiza_ss: true,
    notes: 'Art. 37.6 ET — Reducción del 25% de jornada',
    metadata: meta,
  });

  const { error } = await supabase.from('erp_hr_payroll_incidents').insert(incidents);
  if (error) console.warn('[incidents]', error.message);
  return incidents.length;
}

// =========================================================
// PHASE 6: Leave balances, requests, IT
// =========================================================
async function seedMasterLeaves(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const meta = { ...DEMO_MASTER_META, demo_batch_id: batchId };
  let count = 0;

  // Leave balances for active employees
  const activeProfiles = MASTER_PROFILES.filter(p => p.status !== 'terminated');
  const balances: any[] = activeProfiles.map(p => ({
    company_id: companyId,
    employee_id: empIdMap[p.code],
    year: 2026,
    leave_type_code: 'VAC',
    jurisdiction: 'ES',
    entitled_days: 22,
    used_days: p.scenario === 'paternity_leave' ? 0 : (p.scenario === 'work_accident_it' ? 2 : Math.floor(Math.random() * 5)),
    pending_days: 22 - (p.scenario === 'paternity_leave' ? 0 : (p.scenario === 'work_accident_it' ? 2 : Math.floor(Math.random() * 5))),
  }));

  const { error: balErr } = await supabase.from('erp_hr_leave_balances').insert(balances);
  if (balErr) console.warn('[balances]', balErr.message);
  else count += balances.length;

  // Leave requests
  const requests: any[] = [];

  // Elena — IT por accidente de trabajo
  requests.push({
    company_id: companyId, employee_id: empIdMap['DM-006'],
    leave_type_code: 'IT', jurisdiction: 'ES',
    start_date: '2026-02-20', end_date: '2026-04-20',
    days_requested: 60, status: 'approved',
    notes: 'IT por accidente de trabajo — caída en oficina. Parte AT comunicado.',
  });

  // Javier — permiso paternidad
  requests.push({
    company_id: companyId, employee_id: empIdMap['DM-007'],
    leave_type_code: 'PAT', jurisdiction: 'ES',
    start_date: '2026-02-15', end_date: '2026-06-08',
    days_requested: 112, status: 'approved',
    notes: 'Permiso por nacimiento — Art. 48.7 ET. 16 semanas.',
  });

  // Carlos — vacaciones normales
  requests.push({
    company_id: companyId, employee_id: empIdMap['DM-001'],
    leave_type_code: 'VAC', jurisdiction: 'ES',
    start_date: '2026-07-15', end_date: '2026-07-29',
    days_requested: 10, status: 'approved',
  });

  // Laura — asuntos propios
  requests.push({
    company_id: companyId, employee_id: empIdMap['DM-004'],
    leave_type_code: 'AP', jurisdiction: 'ES',
    start_date: '2026-03-20', end_date: '2026-03-21',
    days_requested: 2, status: 'pending',
  });

  const { error: lrErr } = await supabase.from('erp_hr_leave_requests').insert(requests);
  if (lrErr) console.warn('[leave_requests]', lrErr.message);
  else count += requests.length;

  return count;
}

// =========================================================
// PHASE 7: Benefits plans + enrollments
// =========================================================
async function seedMasterBenefits(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const meta = { ...DEMO_MASTER_META, demo_batch_id: batchId };

  // Create benefit plans
  const plans = [
    {
      company_id: companyId, plan_code: 'SEGMED-2026', plan_name: 'Seguro Médico Premium',
      plan_type: 'health_insurance', effective_from: '2026-01-01',
      provider_name: 'Sanitas', is_active: true, is_taxable: false,
      employer_contribution: 120, employee_contribution: 30,
      tax_treatment: 'exento_500', coverage_type: 'family',
      metadata: meta,
    },
    {
      company_id: companyId, plan_code: 'TICKET-2026', plan_name: 'Tickets Restaurante',
      plan_type: 'meal_voucher', effective_from: '2026-01-01',
      provider_name: 'Sodexo', is_active: true, is_taxable: false,
      employer_contribution: 176.40, employee_contribution: 0,
      tax_treatment: 'exento_11_diarios', coverage_type: 'individual',
      metadata: meta,
    },
    {
      company_id: companyId, plan_code: 'GUARD-2026', plan_name: 'Cheque Guardería',
      plan_type: 'childcare_voucher', effective_from: '2026-01-01',
      provider_name: 'Edenred', is_active: true, is_taxable: false,
      employer_contribution: 0, employee_contribution: 200,
      tax_treatment: 'exento_total', coverage_type: 'individual',
      metadata: meta,
    },
  ];

  const { data: planData, error: planErr } = await supabase.from('erp_hr_benefits_plans').insert(plans).select('id, plan_code');
  if (planErr) {
    console.warn('[benefits_plans]', planErr.message);
    return 0;
  }

  const planMap: Record<string, string> = {};
  (planData || []).forEach((p: any) => { planMap[p.plan_code] = p.id; });

  // Enrollments for Laura (seguro + tickets)
  const enrollments = [
    {
      company_id: companyId, employee_id: empIdMap['DM-004'],
      plan_id: planMap['SEGMED-2026'], effective_date: '2026-01-01',
      enrolled_at: '2025-12-15', enrollment_status: 'active',
      employee_contribution: 30, employer_contribution: 120,
      coverage_level: 'family',
      beneficiaries: [{ name: 'Marcos Fernández', relationship: 'spouse' }],
      metadata: meta,
    },
    {
      company_id: companyId, employee_id: empIdMap['DM-004'],
      plan_id: planMap['TICKET-2026'], effective_date: '2026-01-01',
      enrolled_at: '2025-12-15', enrollment_status: 'active',
      employee_contribution: 0, employer_contribution: 176.40,
      coverage_level: 'individual',
      metadata: meta,
    },
    // David also has health insurance
    {
      company_id: companyId, employee_id: empIdMap['DM-005'],
      plan_id: planMap['SEGMED-2026'], effective_date: '2026-01-01',
      enrolled_at: '2025-12-10', enrollment_status: 'active',
      employee_contribution: 30, employer_contribution: 120,
      coverage_level: 'family',
      metadata: meta,
    },
    // Carmen — guardería
    {
      company_id: companyId, employee_id: empIdMap['DM-010'],
      plan_id: planMap['GUARD-2026'], effective_date: '2026-01-01',
      enrolled_at: '2025-12-20', enrollment_status: 'active',
      employee_contribution: 200, employer_contribution: 0,
      coverage_level: 'individual',
      metadata: meta,
    },
  ];

  const { error: enrErr } = await supabase.from('erp_hr_benefits_enrollments').insert(enrollments);
  if (enrErr) console.warn('[enrollments]', enrErr.message);

  return plans.length + enrollments.length;
}

// =========================================================
// PHASE 8: Documents
// =========================================================
async function seedMasterDocuments(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const meta = { ...DEMO_MASTER_META, demo_batch_id: batchId };
  const docs: any[] = [];

  for (const p of MASTER_PROFILES) {
    const empId = empIdMap[p.code];
    const baseDocs = [
      { document_name: `DNI - ${p.firstName} ${p.lastName}`, document_type: 'identification', category: 'personal', document_status: 'active' },
      { document_name: `Contrato laboral - ${p.firstName}`, document_type: 'contract', category: 'laboral', document_status: 'active' },
      { document_name: `Nómina Enero 2026 - ${p.firstName}`, document_type: 'payslip', category: 'payroll', document_status: 'active' },
    ];

    // Scenario-specific documents
    if (p.scenario === 'work_accident_it') {
      baseDocs.push({ document_name: 'Parte de accidente de trabajo', document_type: 'accident_report', category: 'safety', document_status: 'active' });
      baseDocs.push({ document_name: 'Informe médico IT', document_type: 'medical_report', category: 'medical', document_status: 'active' });
    }
    if (p.scenario === 'paternity_leave') {
      baseDocs.push({ document_name: 'Certificado de nacimiento', document_type: 'birth_certificate', category: 'personal', document_status: 'active' });
    }
    if (p.scenario === 'disciplinary_dismissal') {
      baseDocs.push({ document_name: 'Carta de despido disciplinario', document_type: 'dismissal_letter', category: 'laboral', document_status: 'active' });
      baseDocs.push({ document_name: 'Finiquito y liquidación', document_type: 'settlement', category: 'payroll', document_status: 'active' });
    }
    if (p.scenario === 'objective_dismissal') {
      baseDocs.push({ document_name: 'Carta de despido objetivo', document_type: 'dismissal_letter', category: 'laboral', document_status: 'active' });
      baseDocs.push({ document_name: 'Comunicación al SEPE', document_type: 'official_communication', category: 'laboral', document_status: 'active' });
      baseDocs.push({ document_name: 'Finiquito e indemnización', document_type: 'settlement', category: 'payroll', document_status: 'active' });
    }
    if (p.scenario === 'reduced_hours') {
      baseDocs.push({ document_name: 'Solicitud reducción jornada - guarda legal', document_type: 'request', category: 'laboral', document_status: 'active' });
    }
    if (p.scenario === 'international_assignment') {
      baseDocs.push({ document_name: 'Carta de desplazamiento temporal - México', document_type: 'assignment_letter', category: 'laboral', document_status: 'active' });
      baseDocs.push({ document_name: 'Certificado A1 Seguridad Social', document_type: 'social_security_cert', category: 'laboral', document_status: 'active' });
    }
    if (p.scenario === 'recent_hire') {
      baseDocs.push({ document_name: 'Solicitud alta TGSS', document_type: 'registration_request', category: 'laboral', document_status: 'pending' });
    }

    for (const doc of baseDocs) {
      docs.push({
        ...doc,
        company_id: companyId,
        employee_id: empId,
        document_url: `https://storage.demo/documents/${p.code}/${doc.document_type}.pdf`,
        source: 'demo_master',
        metadata: meta,
      });
    }
  }

  for (let b = 0; b < docs.length; b += 50) {
    const { error } = await supabase.from('erp_hr_employee_documents').insert(docs.slice(b, b + 50));
    if (error) console.warn(`[documents batch ${b}]`, error.message);
  }
  return docs.length;
}

// =========================================================
// PHASE 9: Time Clock
// =========================================================
async function seedMasterTimeClock(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const meta = { ...DEMO_MASTER_META, demo_batch_id: batchId };
  const entries: any[] = [];

  const activeForTimeClock = MASTER_PROFILES.filter(p =>
    p.status === 'active' && p.scenario !== 'recent_hire' && p.scenario !== 'international_assignment'
  );

  for (const p of activeForTimeClock) {
    const empId = empIdMap[p.code];
    const today = new Date(2026, 2, 14); // March 14, 2026
    let workDays = 0;
    const day = new Date(today);

    while (workDays < 15) {
      day.setDate(day.getDate() - 1);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      workDays++;

      const ds = day.toISOString().split('T')[0];
      const ciH = 8 + Math.floor(Math.random() * 2);
      const ciM = Math.floor(Math.random() * 60);
      const workedH = p.weeklyHours === 30 ? 6 : 8;
      const coH = ciH + workedH + (p.scenario === 'overtime_bonus' && Math.random() > 0.5 ? 1 : 0);
      const coM = Math.floor(Math.random() * 60);

      entries.push({
        company_id: companyId,
        employee_id: empId,
        clock_date: ds,
        clock_in: `${ds}T${String(ciH).padStart(2, '0')}:${String(ciM).padStart(2, '0')}:00+01:00`,
        clock_out: `${ds}T${String(Math.min(coH, 23)).padStart(2, '0')}:${String(coM).padStart(2, '0')}:00+01:00`,
        break_minutes: 30,
        worked_hours: parseFloat((coH - ciH + (coM - ciM) / 60).toFixed(2)),
        overtime_hours: p.scenario === 'overtime_bonus' && coH - ciH > 8 ? coH - ciH - 8 : 0,
        clock_in_method: 'web',
        clock_out_method: 'web',
        status: workDays > 5 ? 'approved' : 'closed',
        metadata: meta,
      });
    }
  }

  for (let b = 0; b < entries.length; b += 100) {
    const { error } = await supabase.from('erp_hr_time_clock').insert(entries.slice(b, b + 100));
    if (error) console.warn(`[time_clock batch ${b}]`, error.message);
  }
  return entries.length;
}

// =========================================================
// PHASE 10: Registration Data (Ana Belén — recent hire)
// =========================================================
async function seedMasterRegistration(supabase: any, companyId: string, empIdMap: Record<string, string>, batchId: string) {
  const meta = { ...DEMO_MASTER_META, demo_batch_id: batchId };

  const regData = {
    company_id: companyId,
    employee_id: empIdMap['DM-002'],
    process_status: 'pending_validation',
    registration_type: 'alta_inicial',
    naf_number: genSSN(),
    ccc_number: '28/1234567/89',
    grupo_cotizacion: '07',
    tipo_contrato_ss: '401',
    jornada_parcial_coeficiente: null,
    fecha_alta_real: '2026-03-10',
    epígrafe_at: '096',
    cnae_code: '6201',
    ocupacion_code: '3820',
    dry_run_result: { status: 'valid', warnings: 0, errors: 0 },
    readiness_status: 'ready',
    metadata: meta,
  };

  const { error } = await supabase.from('erp_hr_registration_data').insert(regData);
  if (error) console.warn('[registration]', error.message);
  return 1;
}

// =========================================================
// VALIDATIONS
// =========================================================
async function runValidations(supabase: any, companyId: string) {
  const results: { check: string; expected: string; actual: string; pass: boolean }[] = [];

  // 1. Employee count
  const { count: empCount } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('metadata->>is_demo_master', 'true');
  results.push({ check: 'Empleados demo master', expected: '12', actual: String(empCount || 0), pass: (empCount || 0) === 12 });

  // 2. Contracts
  const { data: masterEmps } = await supabase.from('erp_hr_employees').select('id')
    .eq('company_id', companyId).eq('metadata->>is_demo_master', 'true');
  const empIds = (masterEmps || []).map((e: any) => e.id);

  const { count: ctrCount } = await supabase.from('erp_hr_contracts').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Contratos', expected: '>=12', actual: String(ctrCount || 0), pass: (ctrCount || 0) >= 12 });

  // 3. Payrolls
  const { count: payCount } = await supabase.from('erp_hr_payrolls').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Nóminas', expected: '>=28', actual: String(payCount || 0), pass: (payCount || 0) >= 28 });

  // 4. Terminated employees
  const { count: termCount } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('metadata->>is_demo_master', 'true').eq('status', 'terminated');
  results.push({ check: 'Empleados terminados', expected: '2', actual: String(termCount || 0), pass: (termCount || 0) === 2 });

  // 5. Leave balances
  const { count: balCount } = await supabase.from('erp_hr_leave_balances').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Saldos vacaciones', expected: '>=10', actual: String(balCount || 0), pass: (balCount || 0) >= 10 });

  // 6. Documents
  const { count: docCount } = await supabase.from('erp_hr_employee_documents').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Documentos', expected: '>=36', actual: String(docCount || 0), pass: (docCount || 0) >= 36 });

  // 7. Payroll incidents
  const { count: incCount } = await supabase.from('erp_hr_payroll_incidents').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Incidencias nómina', expected: '>=4', actual: String(incCount || 0), pass: (incCount || 0) >= 4 });

  // 8. Benefits enrollments
  const { count: benCount } = await supabase.from('erp_hr_benefits_enrollments').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Enrollments beneficios', expected: '>=3', actual: String(benCount || 0), pass: (benCount || 0) >= 3 });

  // 9. Time clock
  const { count: tcCount } = await supabase.from('erp_hr_time_clock').select('id', { count: 'exact', head: true }).in('employee_id', empIds);
  results.push({ check: 'Registros fichaje', expected: '>=60', actual: String(tcCount || 0), pass: (tcCount || 0) >= 60 });

  // 10. On leave
  const { count: leaveCount } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('metadata->>is_demo_master', 'true').eq('status', 'on_leave');
  results.push({ check: 'Empleados en baja/permiso', expected: '2', actual: String(leaveCount || 0), pass: (leaveCount || 0) === 2 });

  const totalPassed = results.filter(r => r.pass).length;
  return {
    total: results.length,
    passed: totalPassed,
    failed: results.length - totalPassed,
    results,
    overallPass: totalPassed === results.length,
  };
}

// =========================================================
// MAIN HANDLER
// =========================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const {
      action = 'seed_master_demo',
      company_id,
      reset_previous = true,
      run_validations: shouldValidate = true,
    } = body;

    // Resolve company
    let companyId = company_id;
    if (!companyId) {
      const { data } = await supabase.from('erp_companies').select('id').limit(1).single();
      if (!data?.id) throw new Error('No company found');
      companyId = data.id;
    }

    if (action === 'check_status') {
      const { count: empCount } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('metadata->>is_demo_master', 'true');
      return new Response(JSON.stringify({
        success: true,
        masterDemoEmployees: empCount || 0,
        details: `${empCount || 0} perfiles demo maestros`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'purge_master') {
      await cleanupMasterDemo(supabase, companyId);
      return new Response(JSON.stringify({
        success: true,
        message: 'Master demo data purged',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action !== 'seed_master_demo') {
      throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[seed-demo-master] Starting for company ${companyId}`);
    const batchId = BATCH_ID();
    const phases: { phase: string; count: number }[] = [];

    // Step 0: Cleanup if requested
    if (reset_previous) {
      await cleanupMasterDemo(supabase, companyId);
      phases.push({ phase: 'cleanup', count: 0 });
    }

    // Step 1: Employees
    const empIdMap = await seedMasterEmployees(supabase, companyId, batchId);
    phases.push({ phase: 'employees', count: 12 });

    // Step 2: Contracts
    const ctrCount = await seedMasterContracts(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'contracts', count: ctrCount });

    // Step 3: Payroll periods + runs
    const { periodIdMap, runsCount } = await seedMasterPayrollPeriods(supabase, companyId, batchId);
    phases.push({ phase: 'periods_runs', count: 3 + runsCount });

    // Step 4: Payrolls
    const payCount = await seedMasterPayrolls(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'payrolls', count: payCount });

    // Step 5: Incidents
    const incCount = await seedMasterIncidents(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'incidents', count: incCount });

    // Step 6: Leaves
    const leaveCount = await seedMasterLeaves(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'leaves', count: leaveCount });

    // Step 7: Benefits
    const benCount = await seedMasterBenefits(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'benefits', count: benCount });

    // Step 8: Documents
    const docCount = await seedMasterDocuments(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'documents', count: docCount });

    // Step 9: Time clock
    const tcCount = await seedMasterTimeClock(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'time_clock', count: tcCount });

    // Step 10: Registration data (Ana Belén)
    const regCount = await seedMasterRegistration(supabase, companyId, empIdMap, batchId);
    phases.push({ phase: 'registration', count: regCount });

    // Step 11: Validations
    let validation = null;
    if (shouldValidate) {
      validation = await runValidations(supabase, companyId);
      phases.push({ phase: 'validation', count: validation.passed });
    }

    const totalRecords = phases.reduce((s, p) => s + p.count, 0);

    console.log(`[seed-demo-master] Complete: ${totalRecords} records in ${phases.length} phases`);

    return new Response(JSON.stringify({
      success: true,
      batchId,
      totalRecords,
      phases,
      profiles: MASTER_PROFILES.map(p => ({
        code: p.code,
        name: `${p.firstName} ${p.lastName}`,
        scenario: p.scenario,
        status: p.status,
      })),
      validation,
      scenarios_covered: [
        'standard_active', 'recent_hire', 'overtime_bonus', 'flex_benefits',
        'stock_options', 'work_accident_it', 'paternity_leave',
        'international_assignment', 'arrears_correction', 'reduced_hours',
        'disciplinary_dismissal', 'objective_dismissal',
      ],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[seed-demo-master] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
