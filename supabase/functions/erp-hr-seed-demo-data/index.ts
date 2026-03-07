import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

let COMPANY_ID = '2cbd8718-7a8b-42ce-af61-bef193da32df';
const DEMO_META = { is_demo: true };

async function resolveCompanyId(supabase: any, requestCompanyId?: string): Promise<string> {
  if (requestCompanyId) { COMPANY_ID = requestCompanyId; }
  else {
    const { data } = await supabase.from('erp_companies').select('id, name').limit(1).single();
    if (!data?.id) throw new Error('No ERP company found. Create one first.');
    COMPANY_ID = data.id;
  }

  // Ensure company exists in BOTH tables (some HR tables FK to `companies`, others to `erp_companies`)
  const { data: erpCo } = await supabase.from('erp_companies').select('id, name').eq('id', COMPANY_ID).single();
  if (erpCo) {
    const { data: mainCo } = await supabase.from('companies').select('id').eq('id', COMPANY_ID).maybeSingle();
    if (!mainCo) {
      // Insert into companies table so FKs referencing companies(id) work
      const { error: syncErr } = await supabase.from('companies').insert({
        id: COMPANY_ID,
        name: erpCo.name || 'Demo Company',
        address: 'Carrer Major 1, 25001 Lleida',
        longitude: 0.6206,
        latitude: 41.6148,
        parroquia: 'Lleida',
      });
      if (syncErr) console.warn('[resolveCompanyId] Sync error:', syncErr.message);
      else console.log(`[resolveCompanyId] Synced company ${COMPANY_ID} into companies table`);
    }
  }

  return COMPANY_ID;
}

const FIRST_NAMES_M = ['Carlos','Miguel','Alejandro','David','Javier','Pablo','Andrés','Daniel','Jorge','Fernando','Sergio','Raúl','Antonio','Manuel','Francisco','Luis','Pedro','Iván','Rubén','Óscar'];
const FIRST_NAMES_F = ['María','Laura','Ana','Carmen','Lucía','Elena','Marta','Paula','Cristina','Patricia','Sara','Raquel','Beatriz','Irene','Nuria','Isabel','Rosa','Pilar','Sofía','Andrea'];
const LAST_NAMES = ['García','Martínez','López','Sánchez','González','Rodríguez','Fernández','Pérez','Gómez','Ruiz','Díaz','Hernández','Álvarez','Moreno','Jiménez','Romero','Muñoz','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Ramos','Vázquez','Gil','Serrano','Blanco','Molina','Morales','Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín'];

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDecimal(min: number, max: number, decimals = 2): number { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)); }
function padDNI(n: number): string { const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'; return `${String(n).padStart(8,'0')}${letters[n % 23]}`; }
function genIBAN(): string { return `ES${randomBetween(10,99)} ${randomBetween(1000,9999)} ${randomBetween(1000,9999)} ${randomBetween(10,99)} ${randomBetween(1000000000,9999999999)}`; }
function genSSN(): string { return `28/${randomBetween(10000000,99999999)}/${randomBetween(10,99)}`; }
function dateStr(y: number, m: number, d: number): string { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

interface PhaseResult { phase: string; records: number; details: string; }

// =============================================
// CLEANUP HELPER: delete demo data from dependent tables in safe FK order
// =============================================
async function cleanupDemoData(supabase: any, scope: 'all' | 'infrastructure' | 'employees' | 'payrolls' | 'time_absences' | 'talent' | 'compliance' | 'legal' | 'experience' | 'operations' | 'regulatory' | 'time_clock') {
  const deleteDemo = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq('metadata->>is_demo', 'true');
    if (error) {
      await supabase.from(table).delete().eq('company_id', COMPANY_ID);
    }
  };

  const deleteByCompany = async (table: string, extraFilter?: { col: string; op: string; val: any }) => {
    let q = supabase.from(table).delete().eq('company_id', COMPANY_ID);
    if (extraFilter) {
      if (extraFilter.op === 'like') q = q.like(extraFilter.col, extraFilter.val);
      else if (extraFilter.op === 'in') q = q.in(extraFilter.col, extraFilter.val);
    }
    await q;
  };

  if (scope === 'all' || scope === 'time_clock') {
    await deleteDemo('erp_hr_time_clock');
    await deleteByCompany('erp_hr_time_clock');
  }

  if (scope === 'all' || scope === 'operations') {
    await deleteByCompany('erp_hr_settlements');
    await deleteByCompany('erp_hr_termination_analysis');
    await deleteByCompany('erp_hr_payroll_recalculations');
    await deleteByCompany('erp_hr_employee_objectives');
  }

  if (scope === 'all' || scope === 'regulatory') {
    await deleteByCompany('erp_hr_regulatory_alerts');
    await deleteByCompany('erp_hr_regulatory_watch');
    await deleteByCompany('erp_hr_regulatory_watch_config');
  }

  if (scope === 'all' || scope === 'experience') {
    await deleteDemo('erp_hr_ss_contributions');
    await deleteDemo('erp_hr_recognition');
    await deleteDemo('erp_hr_recognition_programs');
    await supabase.from('erp_hr_onboarding_tasks').delete().in(
      'onboarding_id',
      (await supabase.from('erp_hr_employee_onboarding').select('id').eq('company_id', COMPANY_ID)).data?.map((r: any) => r.id) || []
    );
    await deleteByCompany('erp_hr_employee_onboarding');
    await deleteByCompany('erp_hr_offboarding_history');
  }

  if (scope === 'all' || scope === 'legal') {
    await deleteByCompany('erp_hr_sanction_alerts');
    await deleteByCompany('erp_hr_whistleblower_reports');
    await deleteByCompany('erp_hr_equality_plans');
  }

  if (scope === 'all' || scope === 'compliance') {
    await deleteByCompany('erp_hr_employee_documents');
    await deleteByCompany('erp_hr_document_templates');
    // Clean both benefit table sets
    await deleteByCompany('erp_hr_benefits_enrollments');
    await deleteByCompany('erp_hr_benefits_plans');
    // Also clean the social benefits tables used by the panel
    await supabase.from('erp_hr_employee_benefits').delete().in(
      'benefit_id',
      (await supabase.from('erp_hr_social_benefits').select('id').eq('company_id', COMPANY_ID)).data?.map((r: any) => r.id) || []
    );
    await deleteByCompany('erp_hr_social_benefits');
    await deleteByCompany('erp_hr_safety_incidents');
  }

  if (scope === 'all' || scope === 'talent') {
    await deleteByCompany('erp_hr_interviews');
    await deleteByCompany('erp_hr_candidates');
    await deleteByCompany('erp_hr_job_openings');
    await deleteByCompany('erp_hr_performance_evaluations');
    await deleteByCompany('erp_hr_evaluation_cycles');
    await supabase.from('erp_hr_training_enrollments').delete().in(
      'training_id',
      (await supabase.from('erp_hr_training_catalog').select('id').eq('company_id', COMPANY_ID)).data?.map((r: any) => r.id) || []
    );
    await deleteByCompany('erp_hr_training_catalog');
  }

  if (scope === 'all' || scope === 'time_absences') {
    await deleteDemo('erp_hr_time_entries');
    await deleteByCompany('erp_hr_leave_requests');
    await deleteByCompany('erp_hr_leave_balances');
  }

  if (scope === 'all' || scope === 'payrolls') {
    await deleteDemo('erp_hr_payrolls');
  }

  if (scope === 'all' || scope === 'employees') {
    await deleteDemo('erp_hr_employee_compensation');
    await deleteByCompany('erp_hr_contracts');
    await deleteDemo('erp_hr_employees');
  }

  if (scope === 'all' || scope === 'infrastructure') {
    await deleteByCompany('erp_hr_time_policies', { col: 'policy_name', op: 'like', val: '%Demo%' });
    await supabase.from('erp_hr_leave_types').delete().in('code', ['VAC','IT','MAT','PAT','AP','MATRIM','MUDANZA','FALLEC']);
    await deleteDemo('erp_hr_collective_agreements');
    await deleteByCompany('erp_hr_job_positions', { col: 'position_name', op: 'like', val: '%(Demo)%' });
    await supabase.from('erp_hr_departments').delete().eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
  }

  console.log(`[cleanup] Scope ${scope} completed for company ${COMPANY_ID}`);
}

// =============================================
// PHASE 1: Infrastructure
// =============================================
async function seedInfrastructure(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'infrastructure');
  let count = 0;

  // --- Departments: select existing, insert only missing ---
  const deptSeeds = [
    { company_id: COMPANY_ID, code: 'DIR', name: 'Dirección General', description: 'Alta dirección y estrategia', sort_order: 1, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'ADM', name: 'Administración y Finanzas', description: 'Contabilidad, tesorería y fiscal', sort_order: 2, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'RRHH', name: 'Recursos Humanos', description: 'Gestión de personas y talento', sort_order: 3, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'COM', name: 'Comercial', description: 'Ventas y desarrollo de negocio', sort_order: 4, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'PROD', name: 'Producción', description: 'Operaciones y fabricación', sort_order: 5, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'LOG', name: 'Logística', description: 'Almacén y distribución', sort_order: 6, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'IT', name: 'Tecnología', description: 'Sistemas, desarrollo y soporte', sort_order: 7, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'CAL', name: 'Calidad y PRL', description: 'Control de calidad y prevención', sort_order: 8, is_active: true, metadata: DEMO_META },
  ];
  const deptCodes = deptSeeds.map(d => d.code);

  // Check which departments already exist
  const { data: existingDepts } = await supabase
    .from('erp_hr_departments')
    .select('id, code')
    .eq('company_id', COMPANY_ID)
    .in('code', deptCodes);

  const existingCodes = new Set((existingDepts || []).map((d: any) => d.code));
  const newDepts = deptSeeds.filter(d => !existingCodes.has(d.code));

  if (newDepts.length > 0) {
    const { error: deptErr } = await supabase.from('erp_hr_departments').insert(newDepts);
    if (deptErr) throw new Error(`Departments insert: ${deptErr.message}`);
  }

  // Update metadata on existing departments to mark as demo
  for (const existing of (existingDepts || [])) {
    await supabase.from('erp_hr_departments').update({ metadata: DEMO_META }).eq('id', existing.id);
  }

  // Fetch all department IDs
  const { data: deptRows, error: deptFetchErr } = await supabase
    .from('erp_hr_departments')
    .select('id, code')
    .eq('company_id', COMPANY_ID)
    .in('code', deptCodes);
  if (deptFetchErr) throw new Error(`Departments fetch: ${deptFetchErr.message}`);

  const deptMapByCode = Object.fromEntries((deptRows || []).map((d: any) => [d.code, d.id]));
  for (const code of deptCodes) {
    if (!deptMapByCode[code]) throw new Error(`Missing department: ${code}`);
  }
  count += deptSeeds.length;

  // --- Positions ---
  const positions = [
    { company_id: COMPANY_ID, position_code: 'D-CEO', position_name: 'Director General (Demo)', department_id: deptMapByCode.DIR, salary_band_min: 70000, salary_band_max: 95000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-CFO', position_name: 'Director Financiero (Demo)', department_id: deptMapByCode.ADM, salary_band_min: 55000, salary_band_max: 80000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-HRD', position_name: 'Director RRHH (Demo)', department_id: deptMapByCode.RRHH, salary_band_min: 50000, salary_band_max: 70000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-COO', position_name: 'Director Operaciones (Demo)', department_id: deptMapByCode.PROD, salary_band_min: 55000, salary_band_max: 75000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-CTO', position_name: 'Director Tecnología (Demo)', department_id: deptMapByCode.IT, salary_band_min: 55000, salary_band_max: 80000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-CCOO', position_name: 'Director Comercial (Demo)', department_id: deptMapByCode.COM, salary_band_min: 50000, salary_band_max: 75000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-CONT', position_name: 'Contable Senior (Demo)', department_id: deptMapByCode.ADM, salary_band_min: 30000, salary_band_max: 42000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-CONTJR', position_name: 'Contable Junior (Demo)', department_id: deptMapByCode.ADM, salary_band_min: 22000, salary_band_max: 28000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-HRBP', position_name: 'HR Business Partner (Demo)', department_id: deptMapByCode.RRHH, salary_band_min: 35000, salary_band_max: 48000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-ADMRH', position_name: 'Administrativo RRHH (Demo)', department_id: deptMapByCode.RRHH, salary_band_min: 22000, salary_band_max: 30000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-KAM', position_name: 'Key Account Manager (Demo)', department_id: deptMapByCode.COM, salary_band_min: 35000, salary_band_max: 55000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-VEND', position_name: 'Comercial de Zona (Demo)', department_id: deptMapByCode.COM, salary_band_min: 24000, salary_band_max: 38000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-JPROD', position_name: 'Jefe de Producción (Demo)', department_id: deptMapByCode.PROD, salary_band_min: 38000, salary_band_max: 52000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-OPER', position_name: 'Operario de Producción (Demo)', department_id: deptMapByCode.PROD, salary_band_min: 18000, salary_band_max: 26000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-TECN', position_name: 'Técnico de Mantenimiento (Demo)', department_id: deptMapByCode.PROD, salary_band_min: 24000, salary_band_max: 34000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-JLOG', position_name: 'Jefe de Logística (Demo)', department_id: deptMapByCode.LOG, salary_band_min: 35000, salary_band_max: 48000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-MOZO', position_name: 'Mozo de Almacén (Demo)', department_id: deptMapByCode.LOG, salary_band_min: 18000, salary_band_max: 24000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-DEVSR', position_name: 'Desarrollador Senior (Demo)', department_id: deptMapByCode.IT, salary_band_min: 40000, salary_band_max: 58000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-DEVJR', position_name: 'Desarrollador Junior (Demo)', department_id: deptMapByCode.IT, salary_band_min: 24000, salary_band_max: 32000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-SYSAD', position_name: 'Administrador de Sistemas (Demo)', department_id: deptMapByCode.IT, salary_band_min: 32000, salary_band_max: 45000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-HELP', position_name: 'Soporte IT (Demo)', department_id: deptMapByCode.IT, salary_band_min: 20000, salary_band_max: 28000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-CAL', position_name: 'Técnico de Calidad (Demo)', department_id: deptMapByCode.CAL, salary_band_min: 26000, salary_band_max: 38000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-PRL', position_name: 'Técnico PRL (Demo)', department_id: deptMapByCode.CAL, salary_band_min: 28000, salary_band_max: 40000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-RECEP', position_name: 'Recepcionista (Demo)', department_id: deptMapByCode.ADM, salary_band_min: 18000, salary_band_max: 22000, is_active: true },
    { company_id: COMPANY_ID, position_code: 'D-COND', position_name: 'Conductor/Repartidor (Demo)', department_id: deptMapByCode.LOG, salary_band_min: 20000, salary_band_max: 28000, is_active: true },
  ];

  // Check existing positions and only insert missing
  const posCodes = positions.map(p => p.position_code);
  const { data: existingPos } = await supabase
    .from('erp_hr_job_positions')
    .select('position_code')
    .eq('company_id', COMPANY_ID)
    .in('position_code', posCodes);
  const existingPosCodes = new Set((existingPos || []).map((p: any) => p.position_code));
  const newPositions = positions.filter(p => !existingPosCodes.has(p.position_code));
  if (newPositions.length > 0) {
    const { error: posErr } = await supabase.from('erp_hr_job_positions').insert(newPositions);
    if (posErr) throw new Error(`Positions: ${posErr.message}`);
  }
  count += positions.length;

  // --- Collective Agreements ---
  const agreements = [
    { company_id: COMPANY_ID, code: 'CONV-METAL-2024', name: 'Convenio Colectivo del Metal de Lleida', jurisdiction_code: 'ES-L', effective_date: '2024-01-01', expiration_date: '2026-12-31', extra_payments: 2, working_hours_week: 40, vacation_days: 23, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'CONV-OFIC-2024', name: 'Convenio Colectivo de Oficinas y Despachos', jurisdiction_code: 'ES-CT', effective_date: '2024-01-01', expiration_date: '2025-12-31', extra_payments: 2, working_hours_week: 38.5, vacation_days: 22, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'CONV-ELEC-2024', name: 'Convenio Colectivo de la Industria Eléctrica', jurisdiction_code: 'ES', effective_date: '2024-01-01', expiration_date: '2026-06-30', extra_payments: 3, working_hours_week: 37.5, vacation_days: 25, is_active: true, metadata: DEMO_META },
  ];
  const { data: agData, error: agErr } = await supabase.from('erp_hr_collective_agreements').insert(agreements).select('id, code');
  if (agErr) throw new Error(`Agreements: ${agErr.message}`);
  count += agreements.length;

  // --- Leave Types (global, not company-scoped) ---
  const leaveTypes = [
    { code: 'VAC', name: 'Vacaciones anuales', jurisdiction: 'ES', category: 'vacation', days_entitled: 22, is_calendar_days: false, is_paid: true, requires_documentation: false, legal_reference: 'Art. 38 ET', is_active: true },
    { code: 'IT', name: 'Incapacidad Temporal', jurisdiction: 'ES', category: 'sick', days_entitled: 365, is_calendar_days: true, is_paid: true, requires_documentation: true, legal_reference: 'Art. 169 LGSS', is_active: true },
    { code: 'MAT', name: 'Maternidad', jurisdiction: 'ES', category: 'parental', days_entitled: 112, is_calendar_days: true, is_paid: true, requires_documentation: true, legal_reference: 'Art. 48.4 ET', is_active: true },
    { code: 'PAT', name: 'Paternidad', jurisdiction: 'ES', category: 'parental', days_entitled: 112, is_calendar_days: true, is_paid: true, requires_documentation: true, legal_reference: 'Art. 48.7 ET', is_active: true },
    { code: 'AP', name: 'Asuntos Propios', jurisdiction: 'ES', category: 'personal', days_entitled: 3, is_calendar_days: false, is_paid: true, requires_documentation: false, is_active: true },
    { code: 'MATRIM', name: 'Matrimonio', jurisdiction: 'ES', category: 'personal', days_entitled: 15, is_calendar_days: true, is_paid: true, requires_documentation: true, legal_reference: 'Art. 37.3.a ET', is_active: true },
    { code: 'MUDANZA', name: 'Mudanza', jurisdiction: 'ES', category: 'personal', days_entitled: 1, is_calendar_days: false, is_paid: true, requires_documentation: false, legal_reference: 'Art. 37.3.c ET', is_active: true },
    { code: 'FALLEC', name: 'Fallecimiento familiar', jurisdiction: 'ES', category: 'bereavement', days_entitled: 3, is_calendar_days: true, is_paid: true, requires_documentation: true, legal_reference: 'Art. 37.3.b ET', is_active: true },
  ];
  // Use select-then-insert for leave types (unique on code+jurisdiction)
  const ltCodes = leaveTypes.map(lt => lt.code);
  const { data: existingLT } = await supabase.from('erp_hr_leave_types').select('code').in('code', ltCodes).eq('jurisdiction', 'ES');
  const existingLTCodes = new Set((existingLT || []).map((lt: any) => lt.code));
  const newLeaveTypes = leaveTypes.filter(lt => !existingLTCodes.has(lt.code));
  if (newLeaveTypes.length > 0) {
    const { error: ltErr } = await supabase.from('erp_hr_leave_types').insert(newLeaveTypes);
    if (ltErr) console.warn('Leave types:', ltErr.message);
    else count += newLeaveTypes.length;
  } else {
    count += leaveTypes.length;
  }

  // --- Time Policies ---
  const timePolicies = [
    { company_id: COMPANY_ID, policy_name: 'Jornada Continua Demo', policy_code: 'DEMO-CONT', weekly_hours: 35, daily_hours: 7, break_duration_minutes: 15, is_active: true },
    { company_id: COMPANY_ID, policy_name: 'Jornada Partida Demo', policy_code: 'DEMO-PART', weekly_hours: 40, daily_hours: 8, break_duration_minutes: 60, is_active: true },
    { company_id: COMPANY_ID, policy_name: 'Turno Mañana Demo', policy_code: 'DEMO-TM', weekly_hours: 40, daily_hours: 8, break_duration_minutes: 20, is_active: true },
    { company_id: COMPANY_ID, policy_name: 'Turno Tarde Demo', policy_code: 'DEMO-TT', weekly_hours: 40, daily_hours: 8, break_duration_minutes: 20, is_active: true },
  ];
  const { error: tpErr } = await supabase.from('erp_hr_time_policies').insert(timePolicies);
  if (tpErr) console.warn('Time policies (may already exist):', tpErr.message);
  else count += timePolicies.length;

  return { phase: 'infrastructure', records: count, details: `${deptSeeds.length} departamentos, ${positions.length} puestos, ${agreements.length} convenios, ${leaveTypes.length} tipos ausencia, ${timePolicies.length} políticas horarias` };
}

// =============================================
// PHASE 2: Employees
// =============================================
async function seedEmployees(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'employees');

  const { data: deptData } = await supabase.from('erp_hr_departments').select('id, code').eq('company_id', COMPANY_ID).in('code', ['DIR','ADM','RRHH','COM','PROD','LOG','IT','CAL']);
  const deptMap: Record<string, string> = {};
  (deptData || []).forEach((d: any) => { deptMap[d.code] = d.id; });

  const { data: agreeData } = await supabase.from('erp_hr_collective_agreements').select('id, code').eq('company_id', COMPANY_ID);
  const agreeMap: Record<string, string> = {};
  (agreeData || []).forEach((a: any) => { agreeMap[a.code] = a.id; });

  const empDefs = [
    { dept: 'DIR', salMin: 72000, salMax: 90000, ct: 'indefinido', hireY: [2015,2018], gender: 'M' },
    { dept: 'DIR', salMin: 60000, salMax: 75000, ct: 'indefinido', hireY: [2017,2019], gender: 'F' },
    { dept: 'ADM', salMin: 55000, salMax: 72000, ct: 'indefinido', hireY: [2016,2019], gender: 'M' },
    { dept: 'ADM', salMin: 30000, salMax: 38000, ct: 'indefinido', hireY: [2019,2022], gender: 'F' },
    { dept: 'ADM', salMin: 28000, salMax: 34000, ct: 'indefinido', hireY: [2020,2023], gender: 'F' },
    { dept: 'ADM', salMin: 22000, salMax: 26000, ct: 'temporal', hireY: [2024,2025], gender: 'M' },
    { dept: 'ADM', salMin: 18000, salMax: 22000, ct: 'practicas', hireY: [2024,2025], gender: 'F' },
    { dept: 'RRHH', salMin: 50000, salMax: 65000, ct: 'indefinido', hireY: [2017,2020], gender: 'F' },
    { dept: 'RRHH', salMin: 36000, salMax: 45000, ct: 'indefinido', hireY: [2020,2022], gender: 'M' },
    { dept: 'RRHH', salMin: 24000, salMax: 30000, ct: 'indefinido', hireY: [2022,2024], gender: 'F' },
    { dept: 'RRHH', salMin: 22000, salMax: 26000, ct: 'formacion', hireY: [2025,2025], gender: 'M' },
    { dept: 'COM', salMin: 52000, salMax: 70000, ct: 'indefinido', hireY: [2016,2019], gender: 'M' },
    { dept: 'COM', salMin: 38000, salMax: 50000, ct: 'indefinido', hireY: [2019,2021], gender: 'F' },
    { dept: 'COM', salMin: 35000, salMax: 45000, ct: 'indefinido', hireY: [2020,2022], gender: 'M' },
    { dept: 'COM', salMin: 28000, salMax: 36000, ct: 'indefinido', hireY: [2021,2023], gender: 'F' },
    { dept: 'COM', salMin: 26000, salMax: 34000, ct: 'temporal', hireY: [2024,2025], gender: 'M' },
    { dept: 'COM', salMin: 24000, salMax: 30000, ct: 'temporal', hireY: [2024,2025], gender: 'F' },
    { dept: 'PROD', salMin: 55000, salMax: 70000, ct: 'indefinido', hireY: [2015,2018], gender: 'M' },
    { dept: 'PROD', salMin: 40000, salMax: 48000, ct: 'indefinido', hireY: [2018,2020], gender: 'M' },
    { dept: 'PROD', salMin: 26000, salMax: 32000, ct: 'indefinido', hireY: [2019,2022], gender: 'M' },
    { dept: 'PROD', salMin: 24000, salMax: 30000, ct: 'indefinido', hireY: [2019,2022], gender: 'F' },
    { dept: 'PROD', salMin: 22000, salMax: 28000, ct: 'indefinido', hireY: [2020,2023], gender: 'M' },
    { dept: 'PROD', salMin: 20000, salMax: 26000, ct: 'indefinido', hireY: [2020,2023], gender: 'M' },
    { dept: 'PROD', salMin: 19000, salMax: 24000, ct: 'temporal', hireY: [2023,2025], gender: 'F' },
    { dept: 'PROD', salMin: 18000, salMax: 24000, ct: 'temporal', hireY: [2024,2025], gender: 'M' },
    { dept: 'PROD', salMin: 18000, salMax: 22000, ct: 'temporal', hireY: [2024,2025], gender: 'M' },
    { dept: 'PROD', salMin: 18000, salMax: 22000, ct: 'formacion', hireY: [2025,2025], gender: 'F' },
    { dept: 'LOG', salMin: 38000, salMax: 48000, ct: 'indefinido', hireY: [2018,2020], gender: 'M' },
    { dept: 'LOG', salMin: 22000, salMax: 28000, ct: 'indefinido', hireY: [2020,2023], gender: 'M' },
    { dept: 'LOG', salMin: 20000, salMax: 26000, ct: 'indefinido', hireY: [2021,2023], gender: 'F' },
    { dept: 'LOG', salMin: 20000, salMax: 26000, ct: 'temporal', hireY: [2024,2025], gender: 'M' },
    { dept: 'LOG', salMin: 22000, salMax: 28000, ct: 'indefinido', hireY: [2022,2024], gender: 'M' },
    { dept: 'IT', salMin: 60000, salMax: 78000, ct: 'indefinido', hireY: [2017,2020], gender: 'M' },
    { dept: 'IT', salMin: 42000, salMax: 55000, ct: 'indefinido', hireY: [2019,2022], gender: 'F' },
    { dept: 'IT', salMin: 40000, salMax: 52000, ct: 'indefinido', hireY: [2020,2022], gender: 'M' },
    { dept: 'IT', salMin: 34000, salMax: 44000, ct: 'indefinido', hireY: [2021,2023], gender: 'M' },
    { dept: 'IT', salMin: 26000, salMax: 32000, ct: 'indefinido', hireY: [2023,2025], gender: 'F' },
    { dept: 'IT', salMin: 24000, salMax: 30000, ct: 'practicas', hireY: [2024,2025], gender: 'M' },
    { dept: 'IT', salMin: 22000, salMax: 28000, ct: 'temporal', hireY: [2024,2025], gender: 'F' },
    { dept: 'CAL', salMin: 40000, salMax: 52000, ct: 'indefinido', hireY: [2018,2020], gender: 'F' },
    { dept: 'CAL', salMin: 30000, salMax: 38000, ct: 'indefinido', hireY: [2020,2023], gender: 'M' },
    { dept: 'CAL', salMin: 28000, salMax: 36000, ct: 'indefinido', hireY: [2021,2023], gender: 'F' },
    { dept: 'CAL', salMin: 26000, salMax: 34000, ct: 'indefinido', hireY: [2022,2024], gender: 'M' },
    { dept: 'PROD', salMin: 19000, salMax: 24000, ct: 'temporal', hireY: [2024,2025], gender: 'M' },
    { dept: 'COM', salMin: 26000, salMax: 34000, ct: 'indefinido', hireY: [2022,2024], gender: 'M' },
    { dept: 'ADM', salMin: 24000, salMax: 30000, ct: 'indefinido', hireY: [2021,2023], gender: 'M' },
    { dept: 'LOG', salMin: 19000, salMax: 25000, ct: 'temporal', hireY: [2024,2025], gender: 'F' },
    { dept: 'IT', salMin: 28000, salMax: 36000, ct: 'indefinido', hireY: [2022,2024], gender: 'M' },
    { dept: 'PROD', salMin: 20000, salMax: 25000, ct: 'indefinido', hireY: [2021,2023], gender: 'F' },
    { dept: 'CAL', salMin: 24000, salMax: 32000, ct: 'temporal', hireY: [2024,2025], gender: 'F' },
  ];

  const employees: any[] = [];
  const contracts: any[] = [];
  const compensations: any[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    const def = empDefs[i];
    const isFemale = def.gender === 'F';
    let firstName: string, lastName1: string, lastName2: string, fullKey: string;
    do {
      firstName = randomFrom(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
      lastName1 = randomFrom(LAST_NAMES);
      lastName2 = randomFrom(LAST_NAMES);
      fullKey = `${firstName}${lastName1}${lastName2}`;
    } while (usedNames.has(fullKey));
    usedNames.add(fullKey);

    const hireYear = randomBetween(def.hireY[0], def.hireY[1]);
    const hireMonth = randomBetween(1, 12);
    const hireDay = randomBetween(1, 28);
    const salary = randomBetween(def.salMin, def.salMax);
    const empId = crypto.randomUUID();

    employees.push({
      id: empId, company_id: COMPANY_ID, employee_code: `EMP-${String(i + 1).padStart(3, '0')}`,
      first_name: firstName, last_name: `${lastName1} ${lastName2}`,
      national_id: padDNI(randomBetween(10000000, 99999999)), ss_number: genSSN(),
      birth_date: dateStr(randomBetween(1968, 2000), randomBetween(1,12), randomBetween(1,28)),
      gender: isFemale ? 'F' : 'M',
      email: `${firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${lastName1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@empresa-demo.es`,
      phone: `+34 6${randomBetween(10,99)} ${randomBetween(100,999)} ${randomBetween(100,999)}`,
      address: { street: `Calle ${randomFrom(['Mayor','Real','Nueva','Sol','Luna','Estrella','Paz'])} ${randomBetween(1,120)}`, city: randomFrom(['Lleida','Balaguer','Tàrrega','Mollerussa','Cervera']), postal_code: `25${String(randomBetween(1,999)).padStart(3,'0')}`, province: 'Lleida', country: 'ES' },
      bank_account: genIBAN(), hire_date: dateStr(hireYear, hireMonth, hireDay), status: 'active',
      department_id: deptMap[def.dept], category: def.ct === 'indefinido' ? 'fijo' : def.ct,
      job_title: `Puesto ${i + 1}`, base_salary: salary, contract_type: def.ct,
      work_schedule: 'full_time', weekly_hours: 40, metadata: DEMO_META,
    });

    const agreementKey = ['PROD','LOG','CAL'].includes(def.dept) ? 'CONV-METAL-2024' : (def.dept === 'IT' ? 'CONV-ELEC-2024' : 'CONV-OFIC-2024');
    contracts.push({
      company_id: COMPANY_ID, employee_id: empId, contract_type: def.ct,
      contract_code: `CTR-${String(i + 1).padStart(3, '0')}`,
      start_date: dateStr(hireYear, hireMonth, hireDay),
      end_date: ['temporal','practicas','formacion'].includes(def.ct) ? dateStr(hireYear + 1, hireMonth, hireDay) : null,
      base_salary: salary, annual_salary: salary, working_hours: 40, workday_type: 'full_time',
      category: def.ct === 'indefinido' ? 'fijo' : def.ct,
      collective_agreement_id: agreeMap[agreementKey] || null, is_active: true,
    });

    compensations.push({
      employee_id: empId, component_id: null, fiscal_year: 2025, amount: salary,
      currency: 'EUR', frequency: 'annual', effective_date: '2025-01-01', metadata: DEMO_META,
    });
  }

  for (let b = 0; b < employees.length; b += 25) {
    const { error } = await supabase.from('erp_hr_employees').insert(employees.slice(b, b + 25));
    if (error) throw new Error(`Employees batch ${b}: ${error.message}`);
  }
  for (let b = 0; b < contracts.length; b += 25) {
    const { error } = await supabase.from('erp_hr_contracts').insert(contracts.slice(b, b + 25));
    if (error) throw new Error(`Contracts batch ${b}: ${error.message}`);
  }
  const { error: compErr } = await supabase.from('erp_hr_employee_compensation').insert(compensations);
  if (compErr) console.warn('Compensation:', compErr.message);

  return { phase: 'employees', records: employees.length + contracts.length + compensations.length, details: `${employees.length} empleados, ${contracts.length} contratos, ${compensations.length} compensaciones` };
}

// =============================================
// PHASE 3: Payrolls
// =============================================
async function seedPayrolls(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'payrolls');

  const { data: emps } = await supabase.from('erp_hr_employees').select('id, base_salary, contract_type, fiscal_jurisdiction, autonomous_community').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
  if (!emps?.length) throw new Error('No demo employees found');

  const payrolls: any[] = [];
  // Seed months 1-10 of 2025 AND months 1-3 of 2026 (current year)
  const periods = [
    ...([1,2,3,4,5,6,7,8,9,10].map(m => ({ month: m, year: 2025 }))),
    ...([1,2,3].map(m => ({ month: m, year: 2026 }))),
  ];

  for (const emp of emps) {
    const jurisdiction = emp.fiscal_jurisdiction || 'ES';
    const monthlySalary = (emp.base_salary || 24000) / 14;
    for (const { month, year } of periods) {
      // Jurisdiction-aware IRPF calculation
      let irpfPct: number;
      if (jurisdiction === 'AD') {
        // Andorra: flat 10% max
        irpfPct = emp.base_salary > 40000 ? randomDecimal(7, 10) : randomDecimal(0, 5);
      } else if (jurisdiction === 'ES') {
        irpfPct = emp.base_salary > 60000 ? randomDecimal(28,35) : (emp.base_salary > 35000 ? randomDecimal(18,26) : (emp.base_salary > 22000 ? randomDecimal(12,18) : randomDecimal(2,11)));
      } else {
        irpfPct = randomDecimal(15, 30); // Generic EU
      }

      const cAntig = emp.base_salary > 30000 ? randomDecimal(50, 200) : 0;
      const cTransp = randomDecimal(40, 100);
      const cConv = randomDecimal(30, 150);
      const cProd = month <= 6 ? randomDecimal(0, 200) : randomDecimal(0, 300);
      const complements = { antiguedad: cAntig, transporte: cTransp, plus_convenio: cConv, productividad: cProd };
      const totalComp = cAntig + cTransp + cConv + cProd;
      const grossSalary = parseFloat((monthlySalary + totalComp).toFixed(2));

      // Jurisdiction-aware SS rates
      const ssRate = jurisdiction === 'AD' ? 0.065 : 0.0635;
      const ssCompanyRate = jurisdiction === 'AD' ? 0.155 : 0.305;
      const ssWorker = parseFloat((grossSalary * ssRate).toFixed(2));
      const irpfAmount = parseFloat((grossSalary * irpfPct / 100).toFixed(2));
      const otherDed = month === 3 ? { anticipo: 200 } : {};
      const totalOtherDed = Object.values(otherDed).reduce((s: number, v: any) => s + (v as number), 0);
      const totalDeductions = parseFloat((ssWorker + irpfAmount + totalOtherDed).toFixed(2));
      const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));
      const ssCompany = parseFloat((grossSalary * ssCompanyRate).toFixed(2));
      const totalCost = parseFloat((grossSalary + ssCompany).toFixed(2));

      let statusOpts: string[];
      if (year === 2025) {
        statusOpts = month <= 7 ? ['paid'] : (month <= 9 ? ['approved', 'paid'] : ['draft', 'calculated']);
      } else {
        // 2026
        statusOpts = month === 1 ? ['paid'] : (month === 2 ? ['approved', 'paid'] : ['draft', 'calculated']);
      }
      const status = randomFrom(statusOpts);

      payrolls.push({
        company_id: COMPANY_ID, employee_id: emp.id, period_month: month, period_year: year,
        payroll_type: (month === 6 || month === 12) ? 'extra' : 'mensual',
        base_salary: parseFloat(monthlySalary.toFixed(2)), complements, gross_salary: grossSalary,
        ss_worker: ssWorker, irpf_amount: irpfAmount, irpf_percentage: irpfPct,
        other_deductions: Object.keys(otherDed).length > 0 ? otherDed : null,
        total_deductions: totalDeductions, net_salary: netSalary, ss_company: ssCompany, total_cost: totalCost,
        status, calculated_at: new Date().toISOString(),
        paid_at: status === 'paid' ? `${year}-${String(month).padStart(2,'0')}-${randomBetween(25,28)}T10:00:00Z` : null,
        payment_reference: status === 'paid' ? `SEPA-${year}${String(month).padStart(2,'0')}-${randomBetween(1000,9999)}` : null,
        fiscal_jurisdiction: jurisdiction,
        metadata: DEMO_META,
      });
    }
  }

  let inserted = 0;
  for (let b = 0; b < payrolls.length; b += 50) {
    const { error } = await supabase.from('erp_hr_payrolls').insert(payrolls.slice(b, b + 50));
    if (error) throw new Error(`Payrolls batch ${b}: ${error.message}`);
    inserted += payrolls.slice(b, b + 50).length;
  }
  return { phase: 'payrolls', records: inserted, details: `${inserted} nóminas (${emps.length} emp × ${periods.length} meses, multijurisdicción)` };
}

// =============================================
// PHASE 4: Time & Absences
// =============================================
async function seedTimeAndAbsences(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'time_absences');

  const { data: emps } = await supabase.from('erp_hr_employees').select('id').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'time_absences', records: 0, details: 'No employees' };
  let count = 0;

  const timeEntries: any[] = [];
  const today = new Date();
  for (const emp of emps) {
    let workDays = 0;
    const day = new Date(today);
    while (workDays < 40) {
      day.setDate(day.getDate() - 1);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      workDays++;
      const ds = day.toISOString().split('T')[0];
      const ciH = randomBetween(7, 9), ciM = randomBetween(0, 59);
      const coH = ciH + 8 + (Math.random() > 0.7 ? 1 : 0), coM = randomBetween(0, 59);
      timeEntries.push({
        company_id: COMPANY_ID, employee_id: emp.id, entry_date: ds,
        clock_in: `${ds}T${String(ciH).padStart(2,'0')}:${String(ciM).padStart(2,'0')}:00+01:00`,
        clock_out: `${ds}T${String(coH).padStart(2,'0')}:${String(coM).padStart(2,'0')}:00+01:00`,
        worked_hours: parseFloat((coH - ciH + (coM - ciM)/60).toFixed(2)),
        entry_method: 'web', status: 'approved',
      });
    }
  }
  for (let b = 0; b < timeEntries.length; b += 100) {
    const { error } = await supabase.from('erp_hr_time_entries').insert(timeEntries.slice(b, b + 100));
    if (error) console.warn(`Time batch ${b}:`, error.message);
    else count += timeEntries.slice(b, b + 100).length;
  }

  const leaveRequests: any[] = [];
  const statuses = ['approved', 'approved', 'approved', 'pending', 'rejected'];
  const leaveCodes = ['VAC', 'AP', 'IT', 'VAC', 'VAC'];
  for (let i = 0; i < 80; i++) {
    const emp = randomFrom(emps);
    const code = randomFrom(leaveCodes);
    const days = code === 'VAC' ? randomBetween(3, 10) : (code === 'IT' ? randomBetween(2, 15) : randomBetween(1, 3));
    const sm = randomBetween(1, 10), sd = randomBetween(1, 20);
    leaveRequests.push({
      company_id: COMPANY_ID, employee_id: emp.id, leave_type_code: code, jurisdiction: 'ES',
      start_date: dateStr(2025, sm, sd), end_date: dateStr(2025, sm, Math.min(sd + days, 28)),
      days_requested: days, status: randomFrom(statuses),
    });
  }
  const { error: lrErr } = await supabase.from('erp_hr_leave_requests').insert(leaveRequests);
  if (lrErr) console.warn('Leave requests:', lrErr.message);
  else count += leaveRequests.length;

  const balances: any[] = [];
  for (const emp of emps) {
    const used = randomBetween(5, 18);
    balances.push({
      company_id: COMPANY_ID, employee_id: emp.id, year: 2025, leave_type_code: 'VAC',
      jurisdiction: 'ES', entitled_days: 22, used_days: used, pending_days: 22 - used,
    });
  }
  const { error: balErr } = await supabase.from('erp_hr_leave_balances').insert(balances);
  if (balErr) console.warn('Leave balances:', balErr.message);
  else count += balances.length;

  return { phase: 'time_absences', records: count, details: `${timeEntries.length} registros horarios, ${leaveRequests.length} ausencias, ${balances.length} saldos` };
}

// =============================================
// PHASE 5: Talent
// =============================================
async function seedTalent(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'talent');

  const { data: emps } = await supabase.from('erp_hr_employees').select('id').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'talent', records: 0, details: 'No employees' };
  let count = 0;

  const courses = [
    { company_id: COMPANY_ID, title: 'Prevención Riesgos Laborales Básico (Demo)', description: 'PRL básico', duration_hours: 30, modality: 'online', provider_name: 'Prevenia S.L.', cost_per_person: 150, is_mandatory: true, is_active: true },
    { company_id: COMPANY_ID, title: 'Protección de Datos RGPD (Demo)', description: 'RGPD/LOPDGDD', duration_hours: 10, modality: 'online', provider_name: 'DataProtect', cost_per_person: 80, is_mandatory: true, is_active: true },
    { company_id: COMPANY_ID, title: 'Excel Avanzado y Power BI (Demo)', description: 'Informática', duration_hours: 20, modality: 'presencial', provider_name: 'FormaTech', cost_per_person: 300, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Liderazgo y Gestión de Equipos (Demo)', description: 'Habilidades', duration_hours: 16, modality: 'presencial', provider_name: 'LeaderSkills', cost_per_person: 450, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Inglés Profesional B2 (Demo)', description: 'Idiomas', duration_hours: 60, modality: 'hibrido', provider_name: 'LinguaPro', cost_per_person: 600, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Igualdad y Prevención de Acoso (Demo)', description: 'Legal', duration_hours: 6, modality: 'online', provider_name: 'IgualdadPro', cost_per_person: 60, is_mandatory: true, is_active: true },
    { company_id: COMPANY_ID, title: 'Lean Manufacturing (Demo)', description: 'Producción', duration_hours: 24, modality: 'presencial', provider_name: 'LeanConsult', cost_per_person: 350, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Python para Análisis de Datos (Demo)', description: 'Informática', duration_hours: 40, modality: 'online', provider_name: 'CodeAcademy', cost_per_person: 250, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Técnicas de Negociación Avanzada (Demo)', description: 'Habilidades', duration_hours: 12, modality: 'presencial', provider_name: 'NegociaPlus', cost_per_person: 400, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Ciberseguridad para Empleados (Demo)', description: 'Informática', duration_hours: 8, modality: 'online', provider_name: 'CyberGuard', cost_per_person: 120, is_mandatory: true, is_active: true },
    { company_id: COMPANY_ID, title: 'Primeros Auxilios (Demo)', description: 'Seguridad', duration_hours: 16, modality: 'presencial', provider_name: 'CruzRoja', cost_per_person: 100, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Carretillero (Demo)', description: 'Producción', duration_hours: 20, modality: 'presencial', provider_name: 'FormaTech', cost_per_person: 200, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Metodologías Ágiles (Demo)', description: 'Habilidades', duration_hours: 16, modality: 'hibrido', provider_name: 'AgileLab', cost_per_person: 350, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'Actualización Contable PGC 2025 (Demo)', description: 'Finanzas', duration_hours: 20, modality: 'online', provider_name: 'ContaFormación', cost_per_person: 180, is_mandatory: false, is_active: true },
    { company_id: COMPANY_ID, title: 'IA Generativa para Empresas (Demo)', description: 'Informática', duration_hours: 12, modality: 'online', provider_name: 'TechFuture', cost_per_person: 280, is_mandatory: false, is_active: true },
  ];
  const { data: courseData, error: courseErr } = await supabase.from('erp_hr_training_catalog').insert(courses).select('id');
  if (courseErr) throw new Error(`Training: ${courseErr.message}`);
  count += courses.length;

  // training_enrollments uses training_id (not catalog_id), no company_id
  const enrollments: any[] = [];
  for (let i = 0; i < 60; i++) {
    enrollments.push({
      employee_id: randomFrom(emps).id, training_id: randomFrom(courseData).id,
      status: randomFrom(['completed', 'completed', 'in_progress', 'enrolled']),
      requested_at: `2025-${String(randomBetween(1,8)).padStart(2,'0')}-${String(randomBetween(1,28)).padStart(2,'0')}`,
      final_score: Math.random() > 0.3 ? randomBetween(60, 100) : null,
    });
  }
  const { error: enrErr } = await supabase.from('erp_hr_training_enrollments').insert(enrollments);
  if (enrErr) console.warn('Enrollments:', enrErr.message); else count += enrollments.length;

  const cycles = [
    { company_id: COMPANY_ID, name: 'Evaluación Anual 2024', cycle_type: 'annual', start_date: '2024-11-01', end_date: '2024-12-31', status: 'completed', self_evaluation_enabled: true, peer_evaluation_enabled: false, manager_evaluation_required: true },
    { company_id: COMPANY_ID, name: 'Evaluación Semestral H1 2025', cycle_type: 'semi_annual', start_date: '2025-06-15', end_date: '2025-07-15', status: 'completed', self_evaluation_enabled: true, peer_evaluation_enabled: true, manager_evaluation_required: true },
    { company_id: COMPANY_ID, name: 'Evaluación Anual 2025', cycle_type: 'annual', start_date: '2025-11-01', end_date: '2025-12-31', status: 'active', self_evaluation_enabled: true, peer_evaluation_enabled: true, manager_evaluation_required: true },
  ];
  const { data: cycleData, error: cycErr } = await supabase.from('erp_hr_evaluation_cycles').insert(cycles).select('id');
  if (cycErr) throw new Error(`Cycles: ${cycErr.message}`);
  count += cycles.length;

  const evals: any[] = [];
  for (const emp of emps) {
    evals.push({
      company_id: COMPANY_ID, employee_id: emp.id, cycle_id: randomFrom(cycleData).id,
      evaluation_type: randomFrom(['self', 'manager', 'peer']),
      overall_score: randomDecimal(50, 98, 1),
      status: randomFrom(['approved', 'approved', 'draft', 'submitted', 'reviewed']),
      strengths: ['Trabajo en equipo', 'Puntualidad', 'Resolución de problemas'].slice(0, randomBetween(1,3)),
      areas_for_improvement: ['Comunicación', 'Delegación'].slice(0, randomBetween(0,2)),
    });
  }
  for (let b = 0; b < evals.length; b += 25) {
    const { error } = await supabase.from('erp_hr_performance_evaluations').insert(evals.slice(b, b + 25));
    if (error) console.warn(`Evals ${b}:`, error.message); else count += evals.slice(b, b + 25).length;
  }

  const openings = [
    { company_id: COMPANY_ID, title: 'Desarrollador Full-Stack Senior', description: 'Dev senior React+Node', employment_type: 'full_time', location: 'Lleida', remote_option: 'hybrid', salary_range_min: 42000, salary_range_max: 58000, status: 'published', auto_screen_cvs: true },
    { company_id: COMPANY_ID, title: 'Técnico de Producción', description: 'Técnico línea automatizada', employment_type: 'full_time', location: 'Lleida', remote_option: 'no', salary_range_min: 24000, salary_range_max: 32000, status: 'published' },
    { company_id: COMPANY_ID, title: 'Comercial Export (Francia/Italia)', description: 'KAM zona sur Europa', employment_type: 'full_time', location: 'Lleida', remote_option: 'hybrid', salary_range_min: 35000, salary_range_max: 50000, status: 'published' },
    { company_id: COMPANY_ID, title: 'Becario Administración', description: 'Prácticas universitarias', employment_type: 'internship', location: 'Lleida', remote_option: 'no', salary_range_min: 8000, salary_range_max: 12000, status: 'draft' },
    { company_id: COMPANY_ID, title: 'Responsable de Calidad', description: 'ISO 9001/14001', employment_type: 'full_time', location: 'Lleida', remote_option: 'no', salary_range_min: 38000, salary_range_max: 48000, status: 'closed' },
  ];
  const { data: openingData, error: opErr } = await supabase.from('erp_hr_job_openings').insert(openings).select('id');
  if (opErr) throw new Error(`Openings: ${opErr.message}`);
  count += openings.length;

  const candidates: any[] = [];
  for (let i = 0; i < 20; i++) {
    const isFemale = Math.random() > 0.5;
    candidates.push({
      company_id: COMPANY_ID, job_opening_id: randomFrom(openingData).id,
      first_name: randomFrom(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M),
      last_name: `${randomFrom(LAST_NAMES)} ${randomFrom(LAST_NAMES)}`,
      email: `candidato.${randomBetween(100,9999)}@email.com`,
      status: randomFrom(['new', 'screening', 'shortlisted', 'interviewing', 'offer', 'rejected', 'hired']),
      source: randomFrom(['linkedin', 'portal', 'referral', 'email']),
      ai_score: randomDecimal(40, 98),
    });
  }
  const { data: candData, error: candErr } = await supabase.from('erp_hr_candidates').insert(candidates).select('id');
  if (candErr) throw new Error(`Candidates: ${candErr.message}`);
  count += candidates.length;

  const interviews: any[] = [];
  for (let i = 0; i < 10; i++) {
    interviews.push({
      company_id: COMPANY_ID, candidate_id: randomFrom(candData).id, job_opening_id: randomFrom(openingData).id,
      interview_type: randomFrom(['screening', 'technical', 'hr', 'final']),
      mode: randomFrom(['virtual', 'presencial']),
      scheduled_at: `2025-${String(randomBetween(8,10)).padStart(2,'0')}-${String(randomBetween(1,28)).padStart(2,'0')}T${randomBetween(9,17)}:00:00Z`,
      duration_minutes: randomFrom([30, 45, 60]),
      status: randomFrom(['scheduled', 'completed', 'completed']),
      score: Math.random() > 0.3 ? randomDecimal(3, 5, 1) : null,
    });
  }
  const { error: intErr } = await supabase.from('erp_hr_interviews').insert(interviews);
  if (intErr) console.warn('Interviews:', intErr.message); else count += interviews.length;

  return { phase: 'talent', records: count, details: `${courses.length} cursos, ${enrollments.length} inscripciones, ${cycles.length} ciclos, ${evals.length} evaluaciones, ${openings.length} ofertas, ${candidates.length} candidatos, ${interviews.length} entrevistas` };
}

// =============================================
// PHASE 6: Compliance
// =============================================
async function seedCompliance(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'compliance');

  const { data: emps } = await supabase.from('erp_hr_employees').select('id').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'compliance', records: 0, details: 'No employees' };
  let count = 0;

  const incidents = [
    { company_id: COMPANY_ID, employee_id: emps[17]?.id || emps[0].id, incident_type: 'accident', severity: 'minor', description: 'Corte superficial durante manipulación de piezas en nave 2', incident_date: '2025-03-15', location: 'Nave 2', investigation_status: 'closed' },
    { company_id: COMPANY_ID, employee_id: emps[22]?.id || emps[1].id, incident_type: 'near_miss', severity: 'low', description: 'Suelo mojado sin señalización en almacén', incident_date: '2025-05-22', location: 'Almacén', investigation_status: 'closed' },
    { company_id: COMPANY_ID, employee_id: emps[25]?.id || emps[2].id, incident_type: 'accident', severity: 'moderate', description: 'Dolor lumbar tras carga manual pesada', incident_date: '2025-07-10', location: 'Zona de carga', investigation_status: 'in_progress' },
    { company_id: COMPANY_ID, employee_id: emps[30]?.id || emps[3].id, incident_type: 'near_miss', severity: 'low', description: 'Chispa en enchufe nave 1', incident_date: '2025-08-05', location: 'Nave 1', investigation_status: 'closed' },
    { company_id: COMPANY_ID, employee_id: emps[14]?.id || emps[4].id, incident_type: 'accident', severity: 'minor', description: 'Caída de caja desde estantería, golpe en pie', incident_date: '2025-09-18', location: 'Almacén auxiliar', investigation_status: 'pending' },
    { company_id: COMPANY_ID, employee_id: emps[35]?.id || emps[5].id, incident_type: 'near_miss', severity: 'medium', description: 'Carretilla desplazada sin conductor', incident_date: '2025-06-30', location: 'Muelle carga', investigation_status: 'closed' },
    { company_id: COMPANY_ID, employee_id: emps[8]?.id || emps[6].id, incident_type: 'illness', severity: 'minor', description: 'Irritación ocular por contacto con limpiador industrial', incident_date: '2025-04-12', location: 'Taller', investigation_status: 'closed' },
    { company_id: COMPANY_ID, employee_id: emps[40]?.id || emps[7].id, incident_type: 'near_miss', severity: 'low', description: 'Anclajes de estantería deteriorados', incident_date: '2025-10-01', location: 'Almacén', investigation_status: 'in_progress' },
  ];
  const { error: incErr } = await supabase.from('erp_hr_safety_incidents').insert(incidents);
  if (incErr) console.warn('Incidents:', incErr.message); else count += incidents.length;

  // --- Benefits Plans (legacy table) ---
  const plans = [
    { company_id: COMPANY_ID, plan_code: 'SEG-MED', plan_name: 'Seguro Médico Privado', plan_type: 'health', provider_name: 'Sanitas', coverage_type: 'employee_family', employer_contribution: 120, annual_cost: 1440, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'GUARD', plan_name: 'Cheque Guardería', plan_type: 'childcare', provider_name: 'Ticket Guardería', coverage_type: 'employee', employer_contribution: 0, employee_contribution: 200, annual_cost: 0, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'FORM', plan_name: 'Plan Formación Bonificada', plan_type: 'education', provider_name: 'FUNDAE', coverage_type: 'employee', employer_contribution: 0, annual_cost: 15000, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'TICKET', plan_name: 'Ticket Restaurant', plan_type: 'meal', provider_name: 'Edenred', coverage_type: 'employee', employer_contribution: 9, annual_cost: 0, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'PENSION', plan_name: 'Plan Pensiones Empresa', plan_type: 'retirement', provider_name: 'VidaCaixa', coverage_type: 'employee', employer_contribution: 100, annual_cost: 0, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
  ];
  const { data: planData, error: plnErr } = await supabase.from('erp_hr_benefits_plans').insert(plans).select('id');
  if (plnErr) console.warn('Benefits plans:', plnErr.message); else count += plans.length;

  if (planData?.length) {
    const benEnrollments: any[] = [];
    for (let i = 0; i < 30; i++) {
      benEnrollments.push({
        company_id: COMPANY_ID, employee_id: randomFrom(emps).id, plan_id: randomFrom(planData).id,
        enrollment_status: 'active', coverage_level: 'individual',
        enrolled_at: '2025-01-15', effective_date: '2025-02-01',
        employee_contribution: randomDecimal(0, 200), employer_contribution: randomDecimal(50, 200),
        contribution_frequency: 'monthly', metadata: DEMO_META,
      });
    }
    const { error: benErr } = await supabase.from('erp_hr_benefits_enrollments').insert(benEnrollments);
    if (benErr) console.warn('Benefits enrollments:', benErr.message); else count += benEnrollments.length;
  }

  // --- Social Benefits (table used by HRSocialBenefitsPanel) ---
  const socialBenefits = [
    { company_id: COMPANY_ID, benefit_code: 'SB-HEALTH', benefit_name: 'Seguro Médico Privado', benefit_type: 'health_insurance', provider_name: 'Sanitas', monthly_cost_company: 120, monthly_cost_employee: 0, is_taxable: false, tax_percentage: 0, is_flex_benefit: false, is_active: true, description: 'Seguro médico completo con cobertura familiar', max_beneficiaries: 200 },
    { company_id: COMPANY_ID, benefit_code: 'SB-DENTAL', benefit_name: 'Seguro Dental', benefit_type: 'dental_insurance', provider_name: 'Sanitas Dental', monthly_cost_company: 25, monthly_cost_employee: 10, is_taxable: false, tax_percentage: 0, is_flex_benefit: true, flex_points_cost: 15, is_active: true, description: 'Cobertura dental básica y ortodoncia', max_beneficiaries: 200 },
    { company_id: COMPANY_ID, benefit_code: 'SB-CHILD', benefit_name: 'Cheque Guardería', benefit_type: 'childcare', provider_name: 'Ticket Guardería', monthly_cost_company: 0, monthly_cost_employee: 200, is_taxable: false, tax_percentage: 0, is_flex_benefit: true, flex_points_cost: 100, is_active: true, description: 'Cheque guardería exento de IRPF', max_beneficiaries: 50 },
    { company_id: COMPANY_ID, benefit_code: 'SB-MEAL', benefit_name: 'Ticket Restaurant', benefit_type: 'meal_vouchers', provider_name: 'Edenred', monthly_cost_company: 180, monthly_cost_employee: 0, is_taxable: false, tax_percentage: 0, is_flex_benefit: false, is_active: true, description: 'Ticket restaurant diario 11€ (exento IRPF)', max_beneficiaries: 200 },
    { company_id: COMPANY_ID, benefit_code: 'SB-TRANSPORT', benefit_name: 'Tarjeta Transporte', benefit_type: 'transport', provider_name: 'Cobee', monthly_cost_company: 0, monthly_cost_employee: 60, is_taxable: false, tax_percentage: 0, is_flex_benefit: true, flex_points_cost: 30, is_active: true, description: 'Abono transporte público exento de IRPF hasta 1.500€/año', max_beneficiaries: 200 },
    { company_id: COMPANY_ID, benefit_code: 'SB-GYM', benefit_name: 'Gimnasio Corporativo', benefit_type: 'gym', provider_name: 'Gympass', monthly_cost_company: 35, monthly_cost_employee: 15, is_taxable: true, tax_percentage: 21, is_flex_benefit: true, flex_points_cost: 25, is_active: true, description: 'Acceso a red de gimnasios y clases online', max_beneficiaries: 100 },
    { company_id: COMPANY_ID, benefit_code: 'SB-PENSION', benefit_name: 'Plan de Pensiones', benefit_type: 'pension', provider_name: 'VidaCaixa', monthly_cost_company: 100, monthly_cost_employee: 50, is_taxable: false, tax_percentage: 0, is_flex_benefit: false, is_active: true, description: 'Plan de pensiones de empleo con aportación empresa', max_beneficiaries: 200 },
    { company_id: COMPANY_ID, benefit_code: 'SB-EDUCATION', benefit_name: 'Formación Bonificada', benefit_type: 'education', provider_name: 'FUNDAE', monthly_cost_company: 0, monthly_cost_employee: 0, is_taxable: false, tax_percentage: 0, is_flex_benefit: false, is_active: true, description: 'Formación continua bonificada por FUNDAE', max_beneficiaries: 200 },
    { company_id: COMPANY_ID, benefit_code: 'SB-REMOTE', benefit_name: 'Compensación Teletrabajo', benefit_type: 'remote_work_allowance', provider_name: null, monthly_cost_company: 55, monthly_cost_employee: 0, is_taxable: true, tax_percentage: 21, is_flex_benefit: false, is_active: true, description: 'Compensación gastos teletrabajo (Art. 12 Ley 10/2021)', max_beneficiaries: 100 },
    { company_id: COMPANY_ID, benefit_code: 'SB-LIFE', benefit_name: 'Seguro de Vida', benefit_type: 'life_insurance', provider_name: 'Zurich', monthly_cost_company: 20, monthly_cost_employee: 0, is_taxable: true, tax_percentage: 21, is_flex_benefit: false, is_active: true, description: 'Seguro de vida y accidentes 2x salario anual', max_beneficiaries: 200 },
  ];
  const { data: sbData, error: sbErr } = await supabase.from('erp_hr_social_benefits').insert(socialBenefits).select('id');
  if (sbErr) console.warn('Social benefits:', sbErr.message); else count += socialBenefits.length;

  // --- Employee Benefits enrollments (for social benefits panel) ---
  if (sbData?.length) {
    const empBenefits: any[] = [];
    for (let i = 0; i < 40; i++) {
      empBenefits.push({
        employee_id: randomFrom(emps).id,
        benefit_id: randomFrom(sbData).id,
        enrollment_date: `2025-${String(randomBetween(1, 6)).padStart(2, '0')}-${String(randomBetween(1, 28)).padStart(2, '0')}`,
        status: randomFrom(['active', 'active', 'active', 'pending', 'cancelled']),
        employee_contribution: randomDecimal(0, 200),
        company_contribution: randomDecimal(20, 180),
        coverage_level: randomFrom(['individual', 'individual', 'family', 'couple']),
      });
    }
    const { error: ebErr } = await supabase.from('erp_hr_employee_benefits').insert(empBenefits);
    if (ebErr) console.warn('Employee benefits:', ebErr.message); else count += empBenefits.length;
  }

  const docs: any[] = [];
  const docTypes = ['contrato', 'nomina', 'certificado', 'titulo', 'dni_copy'];
  for (let i = 0; i < 100; i++) {
    const dt = randomFrom(docTypes);
    docs.push({
      company_id: COMPANY_ID, employee_id: randomFrom(emps).id, document_type: dt,
      document_name: `${dt}_${randomBetween(1000,9999)}.pdf`,
      document_url: `https://storage.example.com/docs/${dt}_${randomBetween(1000,9999)}.pdf`,
      file_size: randomBetween(50000, 5000000), mime_type: 'application/pdf', version: 1,
      is_confidential: dt === 'contrato', metadata: DEMO_META,
    });
  }
  for (let b = 0; b < docs.length; b += 50) {
    const { error } = await supabase.from('erp_hr_employee_documents').insert(docs.slice(b, b + 50));
    if (error) console.warn(`Docs ${b}:`, error.message); else count += docs.slice(b, b + 50).length;
  }

  const templates = [
    { company_id: COMPANY_ID, template_code: 'TPL-CONTRATO', document_type: 'contract', template_name: 'Contrato Indefinido', jurisdiction: 'ES', language_code: 'es', template_content: '# CONTRATO\n\nEntre {{empresa}} y {{empleado}}...', is_active: true, is_system: false },
    { company_id: COMPANY_ID, template_code: 'TPL-CERTIF', document_type: 'certificate', template_name: 'Certificado de Empresa', jurisdiction: 'ES', language_code: 'es', template_content: '# CERTIFICADO\n\n{{empleado}}...', is_active: true, is_system: false },
    { company_id: COMPANY_ID, template_code: 'TPL-CARTA', document_type: 'letter', template_name: 'Carta de Comunicación', jurisdiction: 'ES', language_code: 'es', template_content: '# CARTA\n\nEstimado/a {{empleado}}...', is_active: true, is_system: false },
  ];
  const { error: tplErr } = await supabase.from('erp_hr_document_templates').insert(templates);
  if (tplErr) console.warn('Templates:', tplErr.message); else count += templates.length;

  return { phase: 'compliance', records: count, details: `${incidents.length} incidentes, ${socialBenefits.length} beneficios sociales, ${docs.length} documentos, ${templates.length} plantillas` };
}

// =============================================
// PHASE 7: Legal
// =============================================
async function seedLegal(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'legal');
  let count = 0;

  const eqPlans = [
    { company_id: COMPANY_ID, plan_code: 'PI-2025', plan_name: 'Plan de Igualdad 2025-2029', status: 'active', start_date: '2025-01-01', end_date: '2029-12-31', registration_number: `PI-${randomBetween(100000,999999)}`, objectives: ['Reducir brecha salarial <5%', 'Paridad en mandos intermedios', 'Protocolo acoso actualizado'] },
  ];
  const { error: eqErr } = await supabase.from('erp_hr_equality_plans').insert(eqPlans);
  if (eqErr) console.warn('Equality:', eqErr.message); else count += eqPlans.length;

  const reports = [
    { company_id: COMPANY_ID, report_code: `DEN-${randomBetween(1000,9999)}`, category: 'harassment', subject: 'Posible acoso verbal', description: 'Posible acoso verbal en producción', status: 'investigating', priority: 'high', is_anonymous: true, received_at: '2025-04-20T10:00:00Z' },
    { company_id: COMPANY_ID, report_code: `DEN-${randomBetween(1000,9999)}`, category: 'fraud', subject: 'Uso indebido tarjeta empresa', description: 'Uso indebido de tarjeta corporativa', status: 'resolved', priority: 'medium', is_anonymous: false, received_at: '2025-02-15T14:30:00Z', resolved_at: '2025-03-10T09:00:00Z' },
    { company_id: COMPANY_ID, report_code: `DEN-${randomBetween(1000,9999)}`, category: 'safety_violation', subject: 'Incumplimiento normas seguridad', description: 'Incumplimiento normas seguridad turno noche', status: 'received', priority: 'high', is_anonymous: true, received_at: '2025-09-05T08:00:00Z' },
  ];
  const { error: repErr } = await supabase.from('erp_hr_whistleblower_reports').insert(reports);
  if (repErr) console.warn('Whistleblower:', repErr.message); else count += reports.length;

  const sanctions = [
    { company_id: COMPANY_ID, alert_level: 'warning', title: 'Contratos temporales venciendo', description: '3 contratos vencen en 30 días', days_remaining: 30 },
    { company_id: COMPANY_ID, alert_level: 'prealert', title: 'Formación PRL pendiente', description: '5 empleados sin PRL actualizada', days_remaining: 60 },
    { company_id: COMPANY_ID, alert_level: 'prealert', title: 'Auditoría salarial pendiente', description: 'Vence el 31/03', days_remaining: 180 },
    { company_id: COMPANY_ID, alert_level: 'prealert', title: 'Renovación RGPD', description: 'Revisión anual consentimientos', days_remaining: 90 },
    { company_id: COMPANY_ID, alert_level: 'warning', title: 'Reconocimientos médicos', description: '8 empleados sin reconocimiento', days_remaining: 45 },
  ];
  const { error: sanErr } = await supabase.from('erp_hr_sanction_alerts').insert(sanctions);
  if (sanErr) console.warn('Sanctions:', sanErr.message); else count += sanctions.length;

  return { phase: 'legal', records: count, details: `${eqPlans.length} plan igualdad, ${reports.length} denuncias, ${sanctions.length} alertas` };
}

// =============================================
// PHASE 8: Experience
// =============================================
async function seedExperience(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'experience');

  const { data: emps } = await supabase.from('erp_hr_employees').select('id').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'experience', records: 0, details: 'No employees' };
  let count = 0;

  const onboardings: any[] = [];
  for (let i = 0; i < 5; i++) {
    const emp = emps[emps.length - 1 - i] || emps[i];
    onboardings.push({
      company_id: COMPANY_ID, employee_id: emp.id,
      status: i < 2 ? 'in_progress' : 'completed',
      started_at: `2025-${String(randomBetween(6,10)).padStart(2,'0')}-01T09:00:00Z`,
      target_completion_date: `2025-${String(randomBetween(7,11)).padStart(2,'0')}-15T09:00:00Z`,
      completed_at: i >= 2 ? `2025-${String(randomBetween(7,10)).padStart(2,'0')}-10T09:00:00Z` : null,
      current_phase: i < 2 ? 'documentation' : 'completed',
      progress_percentage: i < 2 ? randomBetween(40, 80) : 100,
    });
  }
  const { data: onbData, error: onbErr } = await supabase.from('erp_hr_employee_onboarding').insert(onboardings).select('id');
  if (onbErr) console.warn('Onboarding:', onbErr.message); else count += onboardings.length;

  if (onbData?.length) {
    const taskDefs = [
      { code: 'DOC-DNI', name: 'Entregar copia DNI', phase: 'documentation', responsible: 'employee' },
      { code: 'DOC-IBAN', name: 'Datos bancarios', phase: 'documentation', responsible: 'employee' },
      { code: 'DOC-CONTRATO', name: 'Firma contrato', phase: 'documentation', responsible: 'hr' },
      { code: 'IT-EQUIPO', name: 'Equipo informático', phase: 'it_setup', responsible: 'it' },
      { code: 'IT-EMAIL', name: 'Email corporativo', phase: 'it_setup', responsible: 'it' },
        { code: 'FORM-PRL', name: 'Formación PRL', phase: 'training', responsible: 'hr' },
        { code: 'FORM-IGUALDAD', name: 'Formación igualdad', phase: 'training', responsible: 'hr' },
      { code: 'BIENVENIDA', name: 'Reunión bienvenida', phase: 'integration', responsible: 'manager' },
    ];
    const tasks: any[] = [];
    for (const onb of onbData) {
      for (let t = 0; t < taskDefs.length; t++) {
        tasks.push({
          onboarding_id: onb.id, task_code: taskDefs[t].code, task_name: taskDefs[t].name,
          phase: taskDefs[t].phase, order_in_phase: t + 1, responsible: taskDefs[t].responsible,
          status: Math.random() > 0.4 ? 'completed' : 'pending', priority: t < 3 ? 'high' : 'medium',
        });
      }
    }
    const { error: taskErr } = await supabase.from('erp_hr_onboarding_tasks').insert(tasks);
    if (taskErr) console.warn('Tasks:', taskErr.message); else count += tasks.length;
  }

  const offboardings = [
    { company_id: COMPANY_ID, employee_id: emps[45]?.id || emps[0].id, employee_snapshot: { name: 'Demo 1', department: 'Producción' }, termination_type: 'voluntary', termination_date: '2025-06-30', tenure_months: 36, final_settlement_amount: 4500, exit_interview_conducted: true, exit_interview_data: { satisfaction: 3, reason: 'Mejor oferta' }, tasks_completed: 8, tasks_total: 10 },
    { company_id: COMPANY_ID, employee_id: emps[46]?.id || emps[1].id, employee_snapshot: { name: 'Demo 2', department: 'Comercial' }, termination_type: 'end_of_contract', termination_date: '2025-08-31', tenure_months: 12, final_settlement_amount: 2800, exit_interview_conducted: false, tasks_completed: 6, tasks_total: 10 },
  ];
  const { error: offErr } = await supabase.from('erp_hr_offboarding_history').insert(offboardings);
  if (offErr) console.warn('Offboarding:', offErr.message); else count += offboardings.length;

  const recognitions: any[] = [];
  const recTypes = ['employee_of_month', 'innovation', 'teamwork', 'customer_excellence', 'safety_champion'];
  for (let i = 0; i < 20; i++) {
    recognitions.push({
      company_id: COMPANY_ID, recipient_id: randomFrom(emps).id, nominator_id: randomFrom(emps).id,
      recognition_type: randomFrom(recTypes), category: randomFrom(['excellence', 'innovation', 'collaboration']),
      title: `Reconocimiento ${randomFrom(['Excelencia', 'Innovación', 'Equipo'])} ${randomBetween(1,12)}/2025`,
      description: 'Destacada contribución al equipo.',
      award_date: dateStr(2025, randomBetween(1, 10), randomBetween(1, 28)),
      points_awarded: randomBetween(50, 500), status: 'approved', is_public: true, metadata: DEMO_META,
    });
  }
  const { error: recErr } = await supabase.from('erp_hr_recognition').insert(recognitions);
  if (recErr) console.warn('Recognition:', recErr.message); else count += recognitions.length;

  const programs = [
    { company_id: COMPANY_ID, program_name: 'Empleado del Mes', program_type: 'peer', is_active: true, annual_budget: 6000, metadata: DEMO_META },
    { company_id: COMPANY_ID, program_name: 'Premio Innovación', program_type: 'manager', is_active: true, annual_budget: 10000, metadata: DEMO_META },
  ];
  const { error: progErr } = await supabase.from('erp_hr_recognition_programs').insert(programs);
  if (progErr) console.warn('Programs:', progErr.message); else count += programs.length;

  // SS Contributions: UNIQUE on (company_id, period_month, period_year) — aggregate per month
  const ssContribs: any[] = [];
  for (let m = 1; m <= 10; m++) {
    const numWorkers = emps.length;
    let totalBaseCC = 0, totalBaseAT = 0;
    for (const emp of emps.slice(0, 50)) {
      const base = randomDecimal(1500, 5000);
      totalBaseCC += base;
      totalBaseAT += base;
    }
    const ccCompany = parseFloat((totalBaseCC * 0.236).toFixed(2));
    const atCompany = parseFloat((totalBaseAT * 0.035).toFixed(2));
    const unemploymentCompany = parseFloat((totalBaseCC * 0.055).toFixed(2));
    const fogasa = parseFloat((totalBaseCC * 0.002).toFixed(2));
    const fpCompany = parseFloat((totalBaseCC * 0.006).toFixed(2));
    const totalCompany = parseFloat((ccCompany + atCompany + unemploymentCompany + fogasa + fpCompany).toFixed(2));
    const ccWorker = parseFloat((totalBaseCC * 0.047).toFixed(2));
    const unemploymentWorker = parseFloat((totalBaseCC * 0.0155).toFixed(2));
    const fpWorker = parseFloat((totalBaseCC * 0.001).toFixed(2));
    const totalWorker = parseFloat((ccWorker + unemploymentWorker + fpWorker).toFixed(2));
    const totalAmount = parseFloat((totalCompany + totalWorker).toFixed(2));

    ssContribs.push({
      company_id: COMPANY_ID, period_month: m, period_year: 2025,
      total_workers: numWorkers,
      total_base_cc: parseFloat(totalBaseCC.toFixed(2)),
      total_base_at: parseFloat(totalBaseAT.toFixed(2)),
      cc_company: ccCompany, at_ep_company: atCompany, unemployment_company: unemploymentCompany,
      fogasa, fp_company: fpCompany, total_company: totalCompany,
      cc_worker: ccWorker, unemployment_worker: unemploymentWorker, fp_worker: fpWorker,
      total_worker: totalWorker, total_amount: totalAmount,
      status: m <= 8 ? 'paid' : 'pending', metadata: DEMO_META,
    });
  }
  const { error: ssErr } = await supabase.from('erp_hr_ss_contributions').upsert(ssContribs, { onConflict: 'company_id,period_month,period_year' });
  if (ssErr) console.warn('SS contributions:', ssErr.message); else count += ssContribs.length;

  return { phase: 'experience', records: count, details: `${onboardings.length} onboardings, ${offboardings.length} offboardings, ${recognitions.length} reconocimientos, ${ssContribs.length} cotizaciones SS` };
}

// =============================================
// PHASE 9: Talent Advanced (Opportunities + Succession)
// =============================================
async function seedTalentAdvanced(supabase: any): Promise<PhaseResult> {
  // Cleanup
  await supabase.from('erp_hr_opportunities').delete().eq('company_id', COMPANY_ID);
  await supabase.from('erp_hr_succession_positions').delete().eq('company_id', COMPANY_ID);
  let count = 0;

  // Opportunities
  const oppTypes = ['project','rotation','mentoring','committee','stretch'] as const;
  const opportunities = [
    { company_id: COMPANY_ID, type: 'project', title: 'Transformación Digital - Fase 2', description: 'Liderar la implementación de automatización en el área comercial.', department: 'Tecnología + Comercial', duration: '6 meses', time_commitment: '30%', skills_required: ['Project Management','Change Management','Digital Tools'], skills_developed: ['Strategic Planning','Cross-functional Leadership'], posted_by: 'CTO', spots: 2, applicants: 8, deadline: '2026-04-15', metadata: DEMO_META },
    { company_id: COMPANY_ID, type: 'rotation', title: 'Rotación - Business Development', description: 'Rotación de 12 meses en desarrollo de negocio.', department: 'Business Development', duration: '12 meses', time_commitment: '100%', skills_required: ['Sales','B2B'], skills_developed: ['International Business','Market Analysis'], posted_by: 'VP Sales', spots: 1, applicants: 15, deadline: '2026-05-28', metadata: DEMO_META },
    { company_id: COMPANY_ID, type: 'mentoring', title: 'Programa Mentoring - Future Leaders', description: 'Mentoring de 6 meses con ejecutivos senior.', department: 'RRHH', duration: '6 meses', time_commitment: '5%', skills_required: ['High Potential','Leadership'], skills_developed: ['Executive Presence','Strategic Thinking'], posted_by: 'CHRO', spots: 10, applicants: 25, deadline: '2026-04-10', metadata: DEMO_META },
    { company_id: COMPANY_ID, type: 'committee', title: 'Comité de Innovación y Sostenibilidad', description: 'Participación en comité estratégico de innovación y ESG.', department: 'Estrategia', duration: 'Indefinido', time_commitment: '10%', skills_required: ['Innovation','ESG'], skills_developed: ['Board Exposure','Strategic Decision Making'], posted_by: 'CEO Office', spots: 3, applicants: 12, deadline: '2026-04-05', metadata: DEMO_META },
    { company_id: COMPANY_ID, type: 'stretch', title: 'Stretch - Lanzamiento Producto B2C', description: 'Go-to-market de nuevo producto con exposición al comité ejecutivo.', department: 'Marketing + Producto', duration: '4 meses', time_commitment: '50%', skills_required: ['Marketing','Product Launch'], skills_developed: ['GTM Strategy','P&L Ownership'], posted_by: 'VP Marketing', spots: 1, applicants: 6, deadline: '2026-04-20', metadata: DEMO_META },
    { company_id: COMPANY_ID, type: 'project', title: 'Migración Cloud AWS', description: 'Proyecto de migración de infraestructura on-premise a cloud.', department: 'IT', duration: '8 meses', time_commitment: '40%', skills_required: ['AWS','DevOps','Cloud Architecture'], skills_developed: ['Cloud Engineering','Cost Optimization'], posted_by: 'CTO', spots: 3, applicants: 10, deadline: '2026-05-01', metadata: DEMO_META },
    { company_id: COMPANY_ID, type: 'mentoring', title: 'Mentoring Técnico - Arquitectura', description: 'Programa de mentoring en arquitectura de software.', department: 'IT', duration: '4 meses', time_commitment: '10%', skills_required: ['Software Development'], skills_developed: ['System Design','Technical Leadership'], posted_by: 'Tech Lead', spots: 5, applicants: 8, deadline: '2026-04-30', metadata: DEMO_META },
  ];
  const { error: oppErr } = await supabase.from('erp_hr_opportunities').insert(opportunities);
  if (oppErr) console.warn('Opportunities:', oppErr.message); else count += opportunities.length;

  // Succession Positions
  const successionPositions = [
    { company_id: COMPANY_ID, title: 'Director General (CEO)', department: 'Dirección General', incumbent_name: 'Carlos García López', incumbent_tenure_years: 8, criticality: 'critical', vacancy_risk: 'medium', bench_strength: 'adequate', candidates_count: 3, ready_now_count: 0, metadata: DEMO_META },
    { company_id: COMPANY_ID, title: 'Director Financiero (CFO)', department: 'Administración y Finanzas', incumbent_name: 'Ana Martínez Ruiz', incumbent_tenure_years: 6, criticality: 'critical', vacancy_risk: 'low', bench_strength: 'adequate', candidates_count: 2, ready_now_count: 1, metadata: DEMO_META },
    { company_id: COMPANY_ID, title: 'Director de Operaciones (COO)', department: 'Producción', incumbent_name: 'Juan Rodríguez Pérez', incumbent_tenure_years: 12, criticality: 'high', vacancy_risk: 'high', bench_strength: 'weak', candidates_count: 2, ready_now_count: 0, metadata: DEMO_META },
    { company_id: COMPANY_ID, title: 'Director Tecnología (CTO)', department: 'Tecnología', incumbent_name: 'María García Fernández', incumbent_tenure_years: 5, criticality: 'critical', vacancy_risk: 'medium', bench_strength: 'strong', candidates_count: 4, ready_now_count: 2, metadata: DEMO_META },
    { company_id: COMPANY_ID, title: 'Director Comercial', department: 'Comercial', incumbent_name: 'Pablo Sánchez Gil', incumbent_tenure_years: 7, criticality: 'high', vacancy_risk: 'low', bench_strength: 'strong', candidates_count: 3, ready_now_count: 1, metadata: DEMO_META },
    { company_id: COMPANY_ID, title: 'Director RRHH (CHRO)', department: 'Recursos Humanos', incumbent_name: 'Elena Torres Díaz', incumbent_tenure_years: 4, criticality: 'high', vacancy_risk: 'low', bench_strength: 'adequate', candidates_count: 2, ready_now_count: 1, metadata: DEMO_META },
  ];
  const { error: sucErr } = await supabase.from('erp_hr_succession_positions').insert(successionPositions);
  if (sucErr) console.warn('Succession:', sucErr.message); else count += successionPositions.length;

  return { phase: 'talent_advanced', records: count, details: `${opportunities.length} oportunidades, ${successionPositions.length} posiciones sucesión` };
}

// =============================================
// PHASE 10: Operations (Settlements, Termination Analysis, Recalculations, Objectives)
// =============================================
async function seedOperations(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'operations');

  const { data: emps } = await supabase.from('erp_hr_employees').select('id, first_name, last_name, base_salary, hire_date, department_id, contract_type').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'operations', records: 0, details: 'No employees' };

  const { data: cycles } = await supabase.from('erp_hr_evaluation_cycles').select('id').eq('company_id', COMPANY_ID).limit(3);
  const { data: agreements } = await supabase.from('erp_hr_collective_agreements').select('id, code').eq('company_id', COMPANY_ID);

  let count = 0;

  // --- Termination Analysis (Offboarding) ---
  const termTypes = ['voluntary', 'objective', 'disciplinary', 'end_contract', 'mutual', 'retirement'];
  const termStatuses = ['draft', 'under_review', 'approved', 'in_progress', 'executed'];
  const terminations: any[] = [];
  // Pick 6 employees for termination scenarios
  const termEmps = emps.slice(40, 46);
  for (let i = 0; i < termEmps.length; i++) {
    const emp = termEmps[i];
    const tType = termTypes[i];
    const status = termStatuses[Math.min(i, termStatuses.length - 1)];
    const salary = emp.base_salary || 28000;
    const hireDate = new Date(emp.hire_date);
    const yearsWorked = Math.max(1, new Date().getFullYear() - hireDate.getFullYear());
    const costMin = tType === 'voluntary' ? 0 : salary * yearsWorked * 20 / 365;
    const costMax = tType === 'voluntary' ? salary / 12 : salary * yearsWorked * 33 / 365;
    
    terminations.push({
      company_id: COMPANY_ID, employee_id: emp.id,
      termination_type: tType,
      status,
      proposed_termination_date: dateStr(2025, randomBetween(8, 12), randomBetween(1, 28)),
      actual_termination_date: ['executed'].includes(status) ? dateStr(2025, 11, 30) : null,
      termination_reason: tType === 'voluntary' ? 'Mejor oferta laboral' : (tType === 'objective' ? 'Amortización de puesto por reestructuración' : (tType === 'retirement' ? 'Jubilación ordinaria' : 'Reorganización departamental')),
      estimated_cost_min: parseFloat(costMin.toFixed(2)),
      estimated_cost_max: parseFloat(costMax.toFixed(2)),
      final_cost: status === 'executed' ? parseFloat(((costMin + costMax) / 2).toFixed(2)) : null,
      legal_review_required: ['objective', 'disciplinary', 'collective'].includes(tType),
      legal_review_status: ['objective', 'disciplinary'].includes(tType) ? (status === 'executed' ? 'approved' : 'pending') : null,
      notice_period_days: tType === 'voluntary' ? 15 : (tType === 'objective' ? 15 : 0),
      indemnity_calculated: status !== 'draft',
      severance_calculated: status !== 'draft',
      recommended_approach: tType === 'voluntary' ? 'Tramitar baja voluntaria estándar' : (tType === 'objective' ? 'Carta de despido objetivo con indemnización 20 días/año' : 'Procedimiento disciplinario con acta'),
      legal_risks: tType === 'disciplinary' ? [{ risk: 'Impugnación por improcedencia', probability: 'media', mitigation: 'Documentar faltas graves con pruebas' }] : [],
      ai_analysis: { risk_score: randomBetween(20, 80), recommendation: 'Seguir protocolo estándar', compliance_check: true },
    });
  }
  const { error: termErr } = await supabase.from('erp_hr_termination_analysis').insert(terminations);
  if (termErr) console.warn('Terminations:', termErr.message); else count += terminations.length;

  // --- Settlements (Finiquitos) ---
  const settlements: any[] = [];
  const settlementStatuses = ['draft', 'calculated', 'pending_legal_validation', 'approved', 'paid'];
  // Map termination types for settlements (uses mutual_agreement, not mutual)
  const settlementTermTypes = ['voluntary', 'objective', 'disciplinary', 'end_contract', 'mutual_agreement'];
  for (let i = 0; i < 5; i++) {
    const emp = termEmps[i];
    const salary = emp.base_salary || 28000;
    const dailySalary = parseFloat((salary / 365).toFixed(2));
    const hireDate = emp.hire_date;
    const yearsWorked = Math.max(1, 2025 - parseInt(hireDate.substring(0, 4)));
    const termDate = dateStr(2025, randomBetween(6, 11), randomBetween(1, 28));
    const vacDays = randomBetween(3, 15);
    const vacAmount = parseFloat((dailySalary * vacDays).toFixed(2));
    const extraPaysProp = parseFloat((salary / 14 * randomDecimal(0.2, 0.8)).toFixed(2));
    const salaryMonth = parseFloat((salary / 12).toFixed(2));
    const tType = settlementTermTypes[i];
    const indemnDaysPerYear = tType === 'objective' ? 20 : (tType === 'disciplinary' ? 33 : (tType === 'end_contract' ? 12 : 0));
    const indemnTotalDays = parseFloat((indemnDaysPerYear * yearsWorked).toFixed(2));
    const indemnGross = parseFloat((dailySalary * indemnTotalDays).toFixed(2));
    const indemnExempt = Math.min(indemnGross, 180000);
    const indemnTaxable = Math.max(0, indemnGross - indemnExempt);
    const grossTotal = parseFloat((vacAmount + extraPaysProp + salaryMonth + indemnGross).toFixed(2));
    const irpfPct = randomDecimal(12, 28);
    const irpfRet = parseFloat(((grossTotal - indemnExempt) * irpfPct / 100).toFixed(2));
    const ssRet = parseFloat((grossTotal * 0.0635).toFixed(2));
    const netTotal = parseFloat((grossTotal - irpfRet - ssRet).toFixed(2));
    const status = settlementStatuses[i];
    
    settlements.push({
      company_id: COMPANY_ID, employee_id: emp.id,
      employee_snapshot: { first_name: emp.first_name, last_name: emp.last_name },
      hire_date: hireDate, termination_date: termDate,
      last_work_day: termDate,
      termination_type: tType,
      termination_reason: tType === 'voluntary' ? 'Baja voluntaria' : 'Despido objetivo',
      base_salary: salary, daily_salary: dailySalary, years_worked: yearsWorked,
      pending_vacation_days: vacDays, vacation_amount: vacAmount,
      extra_pays_proportional: extraPaysProp, salary_current_month: salaryMonth,
      other_concepts: 0, other_concepts_detail: [],
      indemnization_type: tType, indemnization_days_per_year: indemnDaysPerYear,
      indemnization_total_days: indemnTotalDays, indemnization_gross: indemnGross,
      indemnization_exempt: indemnExempt, indemnization_taxable: indemnTaxable,
      gross_total: grossTotal, irpf_retention: Math.max(0, irpfRet), irpf_percentage: irpfPct,
      ss_retention: ssRet, net_total: netTotal,
      status,
      legal_references: [{ ref: 'Art. 49.1.c ET', description: 'Extinción por causas objetivas' }],
      ai_validation_status: ['calculated', 'pending_legal_validation', 'approved', 'paid'].includes(status) ? 'approved' : null,
      ai_confidence_score: ['calculated', 'pending_legal_validation', 'approved', 'paid'].includes(status) ? randomDecimal(85, 98) : null,
      ai_explanation: ['calculated', 'pending_legal_validation', 'approved', 'paid'].includes(status) ? 'Cálculo verificado conforme a ET y convenio aplicable' : null,
      legal_validation_status: ['approved', 'paid'].includes(status) ? 'approved' : null,
      legal_validation_notes: status === 'paid' ? 'Conforme a normativa vigente' : null,
      hr_approval_status: ['approved', 'paid'].includes(status) ? 'approved' : null,
      payment_date: status === 'paid' ? dateStr(2025, 10, 28) : null,
      payment_method: status === 'paid' ? 'transfer' : null,
      collective_agreement_name: 'Convenio Colectivo del Metal',
    });
  }
  const { error: setErr } = await supabase.from('erp_hr_settlements').insert(settlements);
  if (setErr) console.warn('Settlements:', setErr.message); else count += settlements.length;

  // --- Payroll Recalculations ---
  const recalculations: any[] = [];
  const recalcStatuses = ['draft', 'ai_reviewed', 'legal_reviewed', 'approved', 'applied', 'rejected', 'pending_approval', 'calculating'];
  for (let i = 0; i < 8; i++) {
    const emp = emps[i * 5];
    const origBase = parseFloat(((emp.base_salary || 28000) / 14).toFixed(2));
    const recalcBase = parseFloat((origBase * randomDecimal(1.01, 1.05)).toFixed(2));
    const diff = parseFloat((recalcBase - origBase).toFixed(2));
    const period = `2025-${String(randomBetween(1, 9)).padStart(2, '0')}`;
    const status = recalcStatuses[i % recalcStatuses.length];
    
    recalculations.push({
      company_id: COMPANY_ID, employee_id: emp.id,
      period,
      status,
      original_values: { base_salary: origBase, ss_worker: parseFloat((origBase * 0.0635).toFixed(2)), irpf: parseFloat((origBase * 0.18).toFixed(2)), net: parseFloat((origBase * 0.75).toFixed(2)) },
      recalculated_values: { base_salary: recalcBase, ss_worker: parseFloat((recalcBase * 0.0635).toFixed(2)), irpf: parseFloat((recalcBase * 0.18).toFixed(2)), net: parseFloat((recalcBase * 0.75).toFixed(2)) },
      differences: { base_salary: { original: origBase, recalculated: recalcBase, diff } },
      total_difference: diff,
      risk_level: diff > 100 ? 'medium' : 'low',
      compliance_issues: diff > 80 ? [{ type: 'salary_update', severity: 'info', message: 'Actualización por revisión salarial de convenio' }] : [],
      ai_validation_status: !['draft', 'calculating'].includes(status) ? 'approved' : null,
      ai_validation: !['draft', 'calculating'].includes(status) ? { status: 'approved', analysis: 'Recálculo conforme a tablas salariales', recommendations: ['Aplicar retroactivos'] } : null,
      legal_validation_status: ['approved', 'applied', 'legal_reviewed'].includes(status) ? 'approved' : null,
      legal_validation: ['approved', 'applied', 'legal_reviewed'].includes(status) ? { status: 'approved', opinion: 'Conforme', risk_level: 'low' } : null,
      hr_approval_status: status === 'applied' ? 'approved' : null,
      hr_approval: status === 'applied' ? { status: 'approved', approver: 'Director RRHH', notes: 'Aprobado', approved_at: new Date().toISOString() } : null,
      agreement_id: agreements?.[0]?.id || null,
      notes: 'Recálculo por actualización tablas convenio',
    });
  }
  const { error: recErr } = await supabase.from('erp_hr_payroll_recalculations').insert(recalculations);
  if (recErr) console.warn('Recalculations:', recErr.message); else count += recalculations.length;

  // --- Employee Objectives ---
  if (cycles?.length) {
    const objectives: any[] = [];
    const objTypes = ['quantitative', 'qualitative', 'project', 'competency', 'development'];
    const objStatuses = ['in_progress', 'in_progress', 'achieved', 'partially_achieved', 'pending'];
    const objTitles = [
      'Incrementar ventas 15% trimestral', 'Reducir incidencias producción', 'Completar certificación PMP',
      'Mejorar NPS cliente interno', 'Optimizar tiempo de entrega', 'Implementar proceso lean en línea 2',
      'Alcanzar ratio calidad 99.5%', 'Formación equipo en nuevas herramientas', 'Reducir absentismo departamental',
      'Desarrollar plan de carrera individual', 'Liderar proyecto transformación digital', 'Mejorar eficiencia energética planta'
    ];
    for (let i = 0; i < 30; i++) {
      const emp = randomFrom(emps);
      const cycle = randomFrom(cycles);
      objectives.push({
        company_id: COMPANY_ID, employee_id: emp.id, cycle_id: cycle.id,
        title: objTitles[i % objTitles.length],
        description: `Objetivo asignado en ciclo de evaluación`,
        objective_type: randomFrom(objTypes),
        status: randomFrom(objStatuses),
        weight_percentage: randomBetween(10, 40),
        target_value: randomBetween(70, 100),
        current_value: randomBetween(30, 95),
        achievement_percentage: randomBetween(40, 100),
        target_unit: randomFrom(['%', 'unidades', 'puntos', 'días']),
        due_date: dateStr(2025, 12, 31),
      });
    }
    const { error: objErr } = await supabase.from('erp_hr_employee_objectives').insert(objectives);
    if (objErr) console.warn('Objectives:', objErr.message); else count += objectives.length;
  }

  return { phase: 'operations', records: count, details: `${terminations.length} offboardings, ${settlements.length} finiquitos, ${recalculations.length} recálculos, ${cycles?.length ? 30 : 0} objetivos` };
}

// =============================================
// PHASE 11: Regulatory Watch (Vigilancia Normativa)
// =============================================
async function seedRegulatoryWatch(supabase: any): Promise<PhaseResult> {
  await cleanupDemoData(supabase, 'regulatory');
  let count = 0;

  // --- Config ---
  const config = {
    company_id: COMPANY_ID,
    auto_check_enabled: true,
    check_frequency: 'daily',
    check_time: '08:00',
    jurisdictions: ['ES', 'EU'],
    watch_boe: true,
    watch_bopa: false,
    watch_dogc: true,
    watch_bocm: false,
    watch_bopv: false,
    watch_eu_official_journal: true,
    watch_press: true,
    watch_ministry_announcements: true,
    watch_union_communications: true,
    watch_categories: ['convenio_colectivo', 'salario_minimo', 'seguridad_social', 'irpf', 'jornada', 'prl', 'igualdad', 'contratacion'],
    notify_on_detection: true,
    notify_on_approval: true,
    last_check_at: new Date().toISOString(),
    last_check_status: 'success',
    last_check_results: { items_found: 8, new_items: 3, updated_items: 2 },
  };
  const { error: cfgErr } = await supabase.from('erp_hr_regulatory_watch_config').upsert(config, { onConflict: 'company_id' });
  if (cfgErr) console.warn('Regulatory config:', cfgErr.message); else count += 1;

  // --- Watch Items (source_type must be: press, draft, proposal, rumor, union_communication, ministry_announcement) ---
  // --- (approval_status must be: pending, approved, rejected, in_force, expired, superseded) ---
  const watchItems = [
    { company_id: COMPANY_ID, title: 'SMI 2026: Subida del 4,2% confirmada', description: 'El Salario Mínimo Interprofesional se fija en 1.184€/mes (14 pagas) para 2026, con efectos retroactivos desde el 1 de enero.', source_type: 'ministry_announcement', source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-XXXXX', source_name: 'BOE', detected_at: '2026-02-15T09:00:00Z', category: 'salario_minimo', jurisdiction: 'ES', approval_status: 'approved', official_publication: 'BOE', official_publication_date: '2026-02-14', official_publication_number: 'BOE-A-2026-2345', effective_date: '2026-01-01', key_changes: [{ change: 'SMI 14 pagas: 1.184€/mes', impact: 'Afecta a bases mínimas de cotización y contratos con SMI referenciado' }], impact_level: 'high', requires_payroll_recalc: true, requires_contract_update: false, requires_immediate_action: true, estimated_affected_employees: 12, implementation_status: 'not_started' },
    { company_id: COMPANY_ID, title: 'Nuevo Convenio Metal Lleida 2026-2028', description: 'Publicación del nuevo convenio colectivo del metal de la provincia de Lleida con tablas salariales actualizadas y reducción de jornada.', source_type: 'ministry_announcement', source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-YYYYY', source_name: 'BOP Lleida', detected_at: '2026-01-20T10:00:00Z', category: 'convenio_colectivo', jurisdiction: 'ES', approval_status: 'approved', official_publication: 'BOP Lleida', official_publication_date: '2026-01-18', effective_date: '2026-01-01', key_changes: [{ change: 'Subida tablas salariales +3,5%', impact: 'Recálculo nóminas retroactivo' }, { change: 'Jornada máxima 1.740h/año', impact: 'Ajustar horarios y turnos' }], impact_level: 'high', requires_payroll_recalc: true, requires_contract_update: true, requires_immediate_action: true, estimated_affected_employees: 30, implementation_status: 'in_progress' },
    { company_id: COMPANY_ID, title: 'Bases cotización SS 2026 actualizadas', description: 'Orden ISM/XXX/2026 por la que se desarrollan las normas legales de cotización para 2026. Nuevas bases máximas y mínimas.', source_type: 'ministry_announcement', source_name: 'BOE', detected_at: '2026-01-25T08:30:00Z', category: 'seguridad_social', jurisdiction: 'ES', approval_status: 'in_force', official_publication: 'BOE', official_publication_date: '2026-01-24', effective_date: '2026-01-01', key_changes: [{ change: 'Base máxima cotización: 4.720,50€/mes', impact: 'Afecta a empleados con salarios altos' }, { change: 'Tipo MEI: 0,80%', impact: 'Incremento cotización empresarial' }], impact_level: 'medium', requires_payroll_recalc: true, requires_contract_update: false, requires_immediate_action: false, estimated_affected_employees: 100, implementation_status: 'completed', implemented_at: '2026-02-01T09:00:00Z' },
    { company_id: COMPANY_ID, title: 'Directiva UE 2024/2831 Transparencia Salarial', description: 'Transposición obligatoria antes del 7 de junio de 2026. Obligación de informar sobre brecha salarial y criterios retributivos.', source_type: 'proposal', source_name: 'DOUE', detected_at: '2025-11-10T10:00:00Z', category: 'igualdad', jurisdiction: 'EU', approval_status: 'pending', official_publication: 'DOUE', official_publication_date: '2024-04-24', effective_date: '2026-06-07', key_changes: [{ change: 'Obligación de publicar brecha salarial por categoría', impact: 'Requiere auditoría salarial detallada' }], impact_level: 'high', requires_contract_update: false, requires_payroll_recalc: false, requires_immediate_action: false, estimated_affected_employees: 100, implementation_status: 'not_started' },
    { company_id: COMPANY_ID, title: 'Tablas IRPF 2026 actualizadas', description: 'Nuevas tablas de retención de IRPF para 2026 con deflactación del 2% en tramos autonómicos.', source_type: 'ministry_announcement', source_name: 'BOE', detected_at: '2026-01-05T09:00:00Z', category: 'irpf', jurisdiction: 'ES', approval_status: 'in_force', official_publication: 'BOE', official_publication_date: '2025-12-30', effective_date: '2026-01-01', key_changes: [{ change: 'Deflactación tramos 2%', impact: 'Menor retención en tramos bajos' }], impact_level: 'medium', requires_payroll_recalc: true, requires_contract_update: false, requires_immediate_action: true, estimated_affected_employees: 100, implementation_status: 'completed', implemented_at: '2026-01-02T08:00:00Z' },
    { company_id: COMPANY_ID, title: 'Reducción jornada máxima a 37,5h/semana', description: 'Proyecto de ley en tramitación para reducir la jornada máxima legal a 37,5 horas semanales sin reducción salarial.', source_type: 'press', source_name: 'Ministerio de Trabajo', detected_at: '2026-02-20T14:00:00Z', category: 'jornada', jurisdiction: 'ES', approval_status: 'pending', impact_level: 'critical', requires_contract_update: true, requires_payroll_recalc: false, requires_immediate_action: false, estimated_affected_employees: 100, implementation_status: 'not_started' },
    { company_id: COMPANY_ID, title: 'Nuevo protocolo PRL para trabajo en calor', description: 'Real Decreto que establece medidas de protección de trabajadores frente a riesgos por temperaturas extremas.', source_type: 'ministry_announcement', source_name: 'BOE', detected_at: '2026-03-01T09:00:00Z', category: 'prl', jurisdiction: 'ES', approval_status: 'approved', official_publication: 'BOE', official_publication_date: '2026-02-28', effective_date: '2026-05-01', key_changes: [{ change: 'Prohibición trabajo al aire libre >40°C', impact: 'Afecta producción y logística en verano' }], impact_level: 'medium', requires_contract_update: false, requires_payroll_recalc: false, requires_immediate_action: false, estimated_affected_employees: 20, implementation_status: 'not_started' },
    { company_id: COMPANY_ID, title: 'Prórroga incentivos contratación indefinida', description: 'Prórroga de bonificaciones por conversión de contratos temporales a indefinidos: 275€/mes durante 3 años.', source_type: 'ministry_announcement', source_name: 'BOE', detected_at: '2026-01-15T11:00:00Z', category: 'contratacion', jurisdiction: 'ES', approval_status: 'in_force', official_publication: 'BOE', official_publication_date: '2026-01-14', effective_date: '2026-01-01', key_changes: [{ change: 'Bonificación 275€/mes × 36 meses', impact: 'Oportunidad de ahorro en conversiones' }], impact_level: 'low', requires_contract_update: false, requires_payroll_recalc: false, requires_immediate_action: false, estimated_affected_employees: 8, implementation_status: 'completed' },
  ];
  const { data: watchData, error: watchErr } = await supabase.from('erp_hr_regulatory_watch').insert(watchItems).select('id, title');
  if (watchErr) console.warn('Regulatory watch:', watchErr.message); else count += watchItems.length;

  // --- Alerts ---
  if (watchData?.length) {
    const alerts = [
      { company_id: COMPANY_ID, watch_item_id: watchData[0]?.id, alert_type: 'action_required', severity: 'high', title: 'Recálculo nóminas por SMI 2026', message: 'Es necesario recalcular las nóminas de enero y febrero por la subida retroactiva del SMI.', action_required: 'Ejecutar recálculo masivo de nóminas con nuevo SMI', action_deadline: '2026-03-31', is_read: false, is_dismissed: false },
      { company_id: COMPANY_ID, watch_item_id: watchData[1]?.id, alert_type: 'action_required', severity: 'high', title: 'Actualizar tablas convenio metal', message: 'Nuevo convenio del metal publicado. Actualizar tablas salariales y recalcular retroactivos.', action_required: 'Importar nuevas tablas salariales del convenio', action_deadline: '2026-03-15', is_read: false, is_dismissed: false },
      { company_id: COMPANY_ID, watch_item_id: watchData[3]?.id, alert_type: 'upcoming_deadline', severity: 'medium', title: 'Transparencia salarial UE - Plazo junio 2026', message: 'La directiva de transparencia salarial debe transponerse antes del 7 de junio. Preparar auditoría salarial.', action_required: 'Iniciar auditoría salarial por categorías', action_deadline: '2026-05-31', is_read: true, is_dismissed: false },
      { company_id: COMPANY_ID, watch_item_id: watchData[5]?.id, alert_type: 'monitoring', severity: 'low', title: 'Jornada 37,5h - En tramitación', message: 'Proyecto de ley en tramitación parlamentaria. Preparar escenarios de impacto.', action_required: 'Analizar impacto en planificación de turnos', is_read: false, is_dismissed: false },
      { company_id: COMPANY_ID, watch_item_id: watchData[6]?.id, alert_type: 'information', severity: 'medium', title: 'Protocolo calor - Implementar antes mayo', message: 'Nuevo protocolo PRL para temperaturas extremas entra en vigor el 1 de mayo.', action_required: 'Actualizar plan de PRL y protocolo de calor', action_deadline: '2026-04-30', is_read: false, is_dismissed: false },
    ];
    const { error: alertErr } = await supabase.from('erp_hr_regulatory_alerts').insert(alerts);
    if (alertErr) console.warn('Regulatory alerts:', alertErr.message); else count += alerts.length;
  }

  return { phase: 'regulatory', records: count, details: `1 config, ${watchItems.length} normativas, ${watchData?.length ? 5 : 0} alertas` };
}

// =============================================
// PURGE ALL DEMO DATA
// =============================================
async function purgeAllDemo(supabase: any): Promise<PhaseResult> {
  await supabase.from('erp_hr_opportunities').delete().eq('company_id', COMPANY_ID);
  await supabase.from('erp_hr_succession_positions').delete().eq('company_id', COMPANY_ID);
  await supabase.from('erp_hr_settlements').delete().eq('company_id', COMPANY_ID);
  await supabase.from('erp_hr_termination_analysis').delete().eq('company_id', COMPANY_ID);
  await supabase.from('erp_hr_payroll_recalculations').delete().eq('company_id', COMPANY_ID);
  await supabase.from('erp_hr_employee_objectives').delete().eq('company_id', COMPANY_ID);
  await cleanupDemoData(supabase, 'all');

  const { count: empCount } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');

  return { phase: 'purge', records: 0, details: `Purge complete. Remaining demo employees: ${empCount || 0}` };
}

// =============================================
// MAIN HANDLER
// =============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { action, company_id: reqCompanyId } = await req.json();
    await resolveCompanyId(supabase, reqCompanyId);
    let result: PhaseResult;

    switch (action) {
      case 'seed_infrastructure': result = await seedInfrastructure(supabase); break;
      case 'seed_employees': result = await seedEmployees(supabase); break;
      case 'seed_payrolls': result = await seedPayrolls(supabase); break;
      case 'seed_time_absences': result = await seedTimeAndAbsences(supabase); break;
      case 'seed_talent': result = await seedTalent(supabase); break;
      case 'seed_compliance': result = await seedCompliance(supabase); break;
      case 'seed_legal': result = await seedLegal(supabase); break;
      case 'seed_experience': result = await seedExperience(supabase); break;
      case 'seed_talent_advanced': result = await seedTalentAdvanced(supabase); break;
      case 'seed_operations': result = await seedOperations(supabase); break;
      case 'seed_regulatory': result = await seedRegulatoryWatch(supabase); break;
      case 'seed_all': {
        console.log('[seed_all] Starting full cleanup...');
        await cleanupDemoData(supabase, 'all');
        await supabase.from('erp_hr_opportunities').delete().eq('company_id', COMPANY_ID);
        await supabase.from('erp_hr_succession_positions').delete().eq('company_id', COMPANY_ID);
        await supabase.from('erp_hr_settlements').delete().eq('company_id', COMPANY_ID);
        await supabase.from('erp_hr_termination_analysis').delete().eq('company_id', COMPANY_ID);
        await supabase.from('erp_hr_payroll_recalculations').delete().eq('company_id', COMPANY_ID);
        await supabase.from('erp_hr_employee_objectives').delete().eq('company_id', COMPANY_ID);
        console.log('[seed_all] Cleanup done. Seeding...');

        const results: PhaseResult[] = [];
        results.push(await seedInfrastructure(supabase));
        results.push(await seedEmployees(supabase));
        results.push(await seedPayrolls(supabase));
        results.push(await seedTimeAndAbsences(supabase));
        results.push(await seedTalent(supabase));
        results.push(await seedCompliance(supabase));
        results.push(await seedLegal(supabase));
        results.push(await seedExperience(supabase));
        results.push(await seedTalentAdvanced(supabase));
        results.push(await seedOperations(supabase));
        results.push(await seedRegulatoryWatch(supabase));
        console.log('[seed_all] All phases done');
        result = { phase: 'all', records: results.reduce((s, r) => s + r.records, 0), details: results.map(r => `${r.phase}: ${r.records}`).join(' | ') };
        break;
      }
      case 'purge_demo': result = await purgeAllDemo(supabase); break;
      case 'check_status': {
        const { count: empCount } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
        const { count: payCount } = await supabase.from('erp_hr_payrolls').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
        result = { phase: 'status', records: (empCount || 0) + (payCount || 0), details: `${empCount || 0} empleados demo, ${payCount || 0} nóminas demo` };
        break;
      }
      default: throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[erp-hr-seed-demo-data] ${action}: ${result.records} records`);
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[erp-hr-seed-demo-data] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
