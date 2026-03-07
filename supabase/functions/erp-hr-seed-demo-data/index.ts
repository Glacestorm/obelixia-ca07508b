import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COMPANY_ID = '2cbd8718-7a8b-42ce-af61-bef193da32df';
const DEMO_META = { is_demo: true };

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

async function seedInfrastructure(supabase: any): Promise<PhaseResult> {
  let count = 0;
  // Clean existing demo infrastructure first to avoid unique constraint violations
  await supabase.from('erp_hr_departments').delete().eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
  await supabase.from('erp_hr_job_positions').delete().eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
  
  const depts = [
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'DIR', name: 'Dirección General', description: 'Alta dirección y estrategia', sort_order: 1, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'ADM', name: 'Administración y Finanzas', description: 'Contabilidad, tesorería y fiscal', sort_order: 2, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'RRHH', name: 'Recursos Humanos', description: 'Gestión de personas y talento', sort_order: 3, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'COM', name: 'Comercial', description: 'Ventas y desarrollo de negocio', sort_order: 4, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'PROD', name: 'Producción', description: 'Operaciones y fabricación', sort_order: 5, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'LOG', name: 'Logística', description: 'Almacén y distribución', sort_order: 6, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'IT', name: 'Tecnología', description: 'Sistemas, desarrollo y soporte', sort_order: 7, is_active: true, metadata: DEMO_META },
    { id: crypto.randomUUID(), company_id: COMPANY_ID, code: 'CAL', name: 'Calidad y PRL', description: 'Control de calidad y prevención', sort_order: 8, is_active: true, metadata: DEMO_META },
  ];
  const { error: deptErr } = await supabase.from('erp_hr_departments').insert(depts);
  if (deptErr) throw new Error(`Departments: ${deptErr.message}`);
  count += depts.length;

  const positions = [
    { company_id: COMPANY_ID, position_code: 'CEO', position_name: 'Director General', department_id: depts[0].id, salary_range_min: 70000, salary_range_max: 95000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CFO', position_name: 'Director Financiero', department_id: depts[1].id, salary_range_min: 55000, salary_range_max: 80000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'HRD', position_name: 'Director RRHH', department_id: depts[2].id, salary_range_min: 50000, salary_range_max: 70000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'COO', position_name: 'Director Operaciones', department_id: depts[4].id, salary_range_min: 55000, salary_range_max: 75000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CTO', position_name: 'Director Tecnología', department_id: depts[6].id, salary_range_min: 55000, salary_range_max: 80000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CCOO', position_name: 'Director Comercial', department_id: depts[3].id, salary_range_min: 50000, salary_range_max: 75000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CONT', position_name: 'Contable Senior', department_id: depts[1].id, salary_range_min: 30000, salary_range_max: 42000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CONT-JR', position_name: 'Contable Junior', department_id: depts[1].id, salary_range_min: 22000, salary_range_max: 28000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'HRBP', position_name: 'HR Business Partner', department_id: depts[2].id, salary_range_min: 35000, salary_range_max: 48000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'ADMIN-RRHH', position_name: 'Administrativo RRHH', department_id: depts[2].id, salary_range_min: 22000, salary_range_max: 30000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'KAM', position_name: 'Key Account Manager', department_id: depts[3].id, salary_range_min: 35000, salary_range_max: 55000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'VENDEDOR', position_name: 'Comercial de Zona', department_id: depts[3].id, salary_range_min: 24000, salary_range_max: 38000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'JEFE-PROD', position_name: 'Jefe de Producción', department_id: depts[4].id, salary_range_min: 38000, salary_range_max: 52000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'OPERARIO', position_name: 'Operario de Producción', department_id: depts[4].id, salary_range_min: 18000, salary_range_max: 26000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'TECNICO', position_name: 'Técnico de Mantenimiento', department_id: depts[4].id, salary_range_min: 24000, salary_range_max: 34000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'JEFE-LOG', position_name: 'Jefe de Logística', department_id: depts[5].id, salary_range_min: 35000, salary_range_max: 48000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'MOZO', position_name: 'Mozo de Almacén', department_id: depts[5].id, salary_range_min: 18000, salary_range_max: 24000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'DEV-SR', position_name: 'Desarrollador Senior', department_id: depts[6].id, salary_range_min: 40000, salary_range_max: 58000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'DEV-JR', position_name: 'Desarrollador Junior', department_id: depts[6].id, salary_range_min: 24000, salary_range_max: 32000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'SYSADMIN', position_name: 'Administrador de Sistemas', department_id: depts[6].id, salary_range_min: 32000, salary_range_max: 45000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'HELPDESK', position_name: 'Soporte IT', department_id: depts[6].id, salary_range_min: 20000, salary_range_max: 28000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CALIDAD', position_name: 'Técnico de Calidad', department_id: depts[7].id, salary_range_min: 26000, salary_range_max: 38000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'PRL', position_name: 'Técnico PRL', department_id: depts[7].id, salary_range_min: 28000, salary_range_max: 40000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'RECEP', position_name: 'Recepcionista', department_id: depts[1].id, salary_range_min: 18000, salary_range_max: 22000, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, position_code: 'CONDUCTOR', position_name: 'Conductor/Repartidor', department_id: depts[5].id, salary_range_min: 20000, salary_range_max: 28000, is_active: true, metadata: DEMO_META },
  ];
  const { error: posErr } = await supabase.from('erp_hr_job_positions').insert(positions);
  if (posErr) throw new Error(`Positions: ${posErr.message}`);
  count += positions.length;

  const agreements = [
    { company_id: COMPANY_ID, code: 'CONV-METAL-2024', name: 'Convenio Colectivo del Metal de Lleida', jurisdiction_code: 'ES-L', effective_date: '2024-01-01', expiration_date: '2026-12-31', extra_payments: 2, working_hours_week: 40, vacation_days: 23, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'CONV-OFIC-2024', name: 'Convenio Colectivo de Oficinas y Despachos', jurisdiction_code: 'ES-CT', effective_date: '2024-01-01', expiration_date: '2025-12-31', extra_payments: 2, working_hours_week: 38.5, vacation_days: 22, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, code: 'CONV-ELEC-2024', name: 'Convenio Colectivo de la Industria Eléctrica', jurisdiction_code: 'ES', effective_date: '2024-01-01', expiration_date: '2026-06-30', extra_payments: 3, working_hours_week: 37.5, vacation_days: 25, is_active: true, metadata: DEMO_META },
  ];
  const { data: agData, error: agErr } = await supabase.from('erp_hr_collective_agreements').insert(agreements).select('id, code');
  if (agErr) throw new Error(`Agreements: ${agErr.message}`);
  count += agreements.length;

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
  const { error: ltErr } = await supabase.from('erp_hr_leave_types').insert(leaveTypes);
  if (ltErr) console.warn('Leave types:', ltErr.message);
  else count += leaveTypes.length;

  const timePolicies = [
    { company_id: COMPANY_ID, policy_name: 'Jornada Continua (Verano)', policy_type: 'summer', max_daily_hours: 7, start_time: '07:00', end_time: '14:00', break_duration_minutes: 15, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, policy_name: 'Jornada Partida', policy_type: 'standard', max_daily_hours: 8, start_time: '09:00', end_time: '18:00', break_duration_minutes: 60, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, policy_name: 'Turno Mañana', policy_type: 'shift', max_daily_hours: 8, start_time: '06:00', end_time: '14:00', break_duration_minutes: 20, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, policy_name: 'Turno Tarde', policy_type: 'shift', max_daily_hours: 8, start_time: '14:00', end_time: '22:00', break_duration_minutes: 20, is_active: true, metadata: DEMO_META },
  ];
  const { error: tpErr } = await supabase.from('erp_hr_time_policies').insert(timePolicies);
  if (tpErr) console.warn('Time policies:', tpErr.message);
  else count += timePolicies.length;

  return { phase: 'infrastructure', records: count, details: `${depts.length} departamentos, ${positions.length} puestos, ${agreements.length} convenios, ${leaveTypes.length} tipos ausencia, ${timePolicies.length} políticas horarias` };
}

async function seedEmployees(supabase: any): Promise<PhaseResult> {
  const { data: deptData } = await supabase.from('erp_hr_departments').select('id, code').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
  const deptMap: Record<string, string> = {};
  (deptData || []).forEach((d: any) => { deptMap[d.code] = d.id; });
  const { data: agreeData } = await supabase.from('erp_hr_collective_agreements').select('id, code').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
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
      gender: isFemale ? 'female' : 'male',
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

async function seedPayrolls(supabase: any): Promise<PhaseResult> {
  const { data: emps } = await supabase.from('erp_hr_employees').select('id, base_salary, contract_type').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true');
  if (!emps?.length) throw new Error('No demo employees found');

  const payrolls: any[] = [];
  const months = [1,2,3,4,5,6,7,8,9,10];

  for (const emp of emps) {
    const monthlySalary = (emp.base_salary || 24000) / 14;
    for (const month of months) {
      const irpfPct = emp.base_salary > 60000 ? randomDecimal(28,35) : (emp.base_salary > 35000 ? randomDecimal(18,26) : (emp.base_salary > 22000 ? randomDecimal(12,18) : randomDecimal(2,11)));
      const cAntig = emp.base_salary > 30000 ? randomDecimal(50, 200) : 0;
      const cTransp = randomDecimal(40, 100);
      const cConv = randomDecimal(30, 150);
      const cProd = month <= 6 ? randomDecimal(0, 200) : randomDecimal(0, 300);
      const complements = { antiguedad: cAntig, transporte: cTransp, plus_convenio: cConv, productividad: cProd };
      const totalComp = cAntig + cTransp + cConv + cProd;
      const grossSalary = parseFloat((monthlySalary + totalComp).toFixed(2));
      const ssWorker = parseFloat((grossSalary * 0.0635).toFixed(2));
      const irpfAmount = parseFloat((grossSalary * irpfPct / 100).toFixed(2));
      const otherDed = month === 3 ? { anticipo: 200 } : {};
      const totalOtherDed = Object.values(otherDed).reduce((s: number, v: any) => s + (v as number), 0);
      const totalDeductions = parseFloat((ssWorker + irpfAmount + totalOtherDed).toFixed(2));
      const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));
      const ssCompany = parseFloat((grossSalary * 0.305).toFixed(2));
      const totalCost = parseFloat((grossSalary + ssCompany).toFixed(2));
      const statusOpts = month <= 7 ? ['paid'] : (month <= 9 ? ['approved', 'paid'] : ['draft', 'calculated']);
      const status = randomFrom(statusOpts);

      payrolls.push({
        company_id: COMPANY_ID, employee_id: emp.id, period_month: month, period_year: 2025,
        payroll_type: month === 6 ? 'extra_junio' : 'ordinaria',
        base_salary: parseFloat(monthlySalary.toFixed(2)), complements, gross_salary: grossSalary,
        ss_worker: ssWorker, irpf_amount: irpfAmount, irpf_percentage: irpfPct,
        other_deductions: Object.keys(otherDed).length > 0 ? otherDed : null,
        total_deductions: totalDeductions, net_salary: netSalary, ss_company: ssCompany, total_cost: totalCost,
        status, calculated_at: new Date().toISOString(),
        paid_at: status === 'paid' ? `2025-${String(month).padStart(2,'0')}-${randomBetween(25,28)}T10:00:00Z` : null,
        payment_reference: status === 'paid' ? `SEPA-2025${String(month).padStart(2,'0')}-${randomBetween(1000,9999)}` : null,
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
  return { phase: 'payrolls', records: inserted, details: `${inserted} nóminas (${emps.length} emp × ${months.length} meses)` };
}

async function seedTimeAndAbsences(supabase: any): Promise<PhaseResult> {
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
        entry_type: 'regular', source: 'system', status: 'approved', metadata: DEMO_META,
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

async function seedTalent(supabase: any): Promise<PhaseResult> {
  const { data: emps } = await supabase.from('erp_hr_employees').select('id').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'talent', records: 0, details: 'No employees' };
  let count = 0;

  const courses = [
    { company_id: COMPANY_ID, course_code: 'PRL-BAS', course_name: 'Prevención Riesgos Laborales Básico', category: 'seguridad', duration_hours: 30, modality: 'online', provider: 'Prevenia S.L.', cost_per_participant: 150, is_mandatory: true, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'GDPR', course_name: 'Protección de Datos (RGPD/LOPDGDD)', category: 'legal', duration_hours: 10, modality: 'online', provider: 'DataProtect', cost_per_participant: 80, is_mandatory: true, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'EXCEL-AVZ', course_name: 'Excel Avanzado y Power BI', category: 'informatica', duration_hours: 20, modality: 'presencial', provider: 'FormaTech', cost_per_participant: 300, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'LIDER', course_name: 'Liderazgo y Gestión de Equipos', category: 'habilidades', duration_hours: 16, modality: 'presencial', provider: 'LeaderSkills', cost_per_participant: 450, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'INGLES-B2', course_name: 'Inglés Profesional B2', category: 'idiomas', duration_hours: 60, modality: 'hibrido', provider: 'LinguaPro', cost_per_participant: 600, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'IGUALDAD', course_name: 'Igualdad y Prevención de Acoso', category: 'legal', duration_hours: 6, modality: 'online', provider: 'IgualdadPro', cost_per_participant: 60, is_mandatory: true, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'LEAN', course_name: 'Lean Manufacturing', category: 'produccion', duration_hours: 24, modality: 'presencial', provider: 'LeanConsult', cost_per_participant: 350, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'PYTHON', course_name: 'Python para Análisis de Datos', category: 'informatica', duration_hours: 40, modality: 'online', provider: 'CodeAcademy', cost_per_participant: 250, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'NEGOC', course_name: 'Técnicas de Negociación Avanzada', category: 'habilidades', duration_hours: 12, modality: 'presencial', provider: 'NegociaPlus', cost_per_participant: 400, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'CIBERSEG', course_name: 'Ciberseguridad para Empleados', category: 'informatica', duration_hours: 8, modality: 'online', provider: 'CyberGuard', cost_per_participant: 120, is_mandatory: true, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'PRIMAUX', course_name: 'Primeros Auxilios', category: 'seguridad', duration_hours: 16, modality: 'presencial', provider: 'CruzRoja', cost_per_participant: 100, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'CARRET', course_name: 'Carretillero', category: 'produccion', duration_hours: 20, modality: 'presencial', provider: 'FormaTech', cost_per_participant: 200, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'AGILE', course_name: 'Metodologías Ágiles', category: 'habilidades', duration_hours: 16, modality: 'hibrido', provider: 'AgileLab', cost_per_participant: 350, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'CONTA', course_name: 'Actualización Contable PGC 2025', category: 'finanzas', duration_hours: 20, modality: 'online', provider: 'ContaFormación', cost_per_participant: 180, is_mandatory: false, is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, course_code: 'IA-EMP', course_name: 'IA Generativa para Empresas', category: 'informatica', duration_hours: 12, modality: 'online', provider: 'TechFuture', cost_per_participant: 280, is_mandatory: false, is_active: true, metadata: DEMO_META },
  ];
  const { data: courseData, error: courseErr } = await supabase.from('erp_hr_training_catalog').insert(courses).select('id');
  if (courseErr) throw new Error(`Training: ${courseErr.message}`);
  count += courses.length;

  const enrollments: any[] = [];
  for (let i = 0; i < 60; i++) {
    enrollments.push({
      company_id: COMPANY_ID, employee_id: randomFrom(emps).id, catalog_id: randomFrom(courseData).id,
      status: randomFrom(['completed', 'completed', 'in_progress', 'enrolled']),
      enrolled_at: `2025-${String(randomBetween(1,8)).padStart(2,'0')}-${String(randomBetween(1,28)).padStart(2,'0')}`,
      score: Math.random() > 0.3 ? randomBetween(60, 100) : null, metadata: DEMO_META,
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
      evaluator_id: emps[0].id, overall_score: randomDecimal(2.5, 5.0, 1),
      status: randomFrom(['completed', 'completed', 'pending', 'in_progress']),
      strengths: ['Trabajo en equipo', 'Puntualidad', 'Resolución de problemas'].slice(0, randomBetween(1,3)),
      areas_for_improvement: ['Comunicación', 'Delegación'].slice(0, randomBetween(0,2)),
      metadata: DEMO_META,
    });
  }
  for (let b = 0; b < evals.length; b += 25) {
    const { error } = await supabase.from('erp_hr_performance_evaluations').insert(evals.slice(b, b + 25));
    if (error) console.warn(`Evals ${b}:`, error.message); else count += evals.slice(b, b + 25).length;
  }

  const openings = [
    { company_id: COMPANY_ID, title: 'Desarrollador Full-Stack Senior', description: 'Dev senior React+Node', employment_type: 'full_time', location: 'Lleida', remote_option: 'hybrid', salary_range_min: 42000, salary_range_max: 58000, status: 'open', auto_screen_cvs: true },
    { company_id: COMPANY_ID, title: 'Técnico de Producción', description: 'Técnico línea automatizada', employment_type: 'full_time', location: 'Lleida', remote_option: 'on_site', salary_range_min: 24000, salary_range_max: 32000, status: 'open' },
    { company_id: COMPANY_ID, title: 'Comercial Export (Francia/Italia)', description: 'KAM zona sur Europa', employment_type: 'full_time', location: 'Lleida', remote_option: 'hybrid', salary_range_min: 35000, salary_range_max: 50000, status: 'open' },
    { company_id: COMPANY_ID, title: 'Becario Administración', description: 'Prácticas universitarias', employment_type: 'internship', location: 'Lleida', remote_option: 'on_site', salary_range_min: 8000, salary_range_max: 12000, status: 'open' },
    { company_id: COMPANY_ID, title: 'Responsable de Calidad', description: 'ISO 9001/14001', employment_type: 'full_time', location: 'Lleida', remote_option: 'on_site', salary_range_min: 38000, salary_range_max: 48000, status: 'closed' },
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
      status: randomFrom(['new', 'screening', 'interview', 'offer', 'rejected', 'hired']),
      source: randomFrom(['linkedin', 'infojobs', 'referral', 'web']),
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
      interview_type: randomFrom(['phone_screen', 'technical', 'hr', 'final']),
      mode: randomFrom(['video', 'presencial', 'phone']),
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

async function seedCompliance(supabase: any): Promise<PhaseResult> {
  const { data: emps } = await supabase.from('erp_hr_employees').select('id').eq('company_id', COMPANY_ID).eq('metadata->>is_demo', 'true').limit(50);
  if (!emps?.length) return { phase: 'compliance', records: 0, details: 'No employees' };
  let count = 0;

  const incidents = [
    { company_id: COMPANY_ID, employee_id: emps[17]?.id || emps[0].id, incident_type: 'accident', severity: 'minor', title: 'Corte leve en mano izquierda', description: 'Corte superficial durante manipulación', incident_date: '2025-03-15', location: 'Nave 2', status: 'resolved', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[22]?.id || emps[1].id, incident_type: 'near_miss', severity: 'low', title: 'Casi-caída en zona húmeda', description: 'Suelo mojado sin señalización', incident_date: '2025-05-22', location: 'Almacén', status: 'resolved', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[25]?.id || emps[2].id, incident_type: 'accident', severity: 'moderate', title: 'Lumbalgia por sobreesfuerzo', description: 'Dolor lumbar tras carga manual', incident_date: '2025-07-10', location: 'Zona de carga', status: 'investigating', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[30]?.id || emps[3].id, incident_type: 'near_miss', severity: 'low', title: 'Fallo eléctrico detectado', description: 'Chispa en enchufe nave 1', incident_date: '2025-08-05', location: 'Nave 1', status: 'resolved', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[14]?.id || emps[4].id, incident_type: 'accident', severity: 'minor', title: 'Golpe en pie con caja', description: 'Caída de caja desde estantería', incident_date: '2025-09-18', location: 'Almacén auxiliar', status: 'reported', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[35]?.id || emps[5].id, incident_type: 'near_miss', severity: 'medium', title: 'Carretilla sin freno', description: 'Carretilla desplazada sin conductor', incident_date: '2025-06-30', location: 'Muelle carga', status: 'resolved', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[8]?.id || emps[6].id, incident_type: 'illness', severity: 'minor', title: 'Irritación ocular', description: 'Contacto con limpiador industrial', incident_date: '2025-04-12', location: 'Taller', status: 'resolved', metadata: DEMO_META },
    { company_id: COMPANY_ID, employee_id: emps[40]?.id || emps[7].id, incident_type: 'near_miss', severity: 'low', title: 'Estantería inestable', description: 'Anclajes deteriorados', incident_date: '2025-10-01', location: 'Almacén', status: 'investigating', metadata: DEMO_META },
  ];
  const { error: incErr } = await supabase.from('erp_hr_safety_incidents').insert(incidents);
  if (incErr) console.warn('Incidents:', incErr.message); else count += incidents.length;

  const plans = [
    { company_id: COMPANY_ID, plan_code: 'SEG-MED', plan_name: 'Seguro Médico Privado', plan_type: 'health', provider_name: 'Sanitas', coverage_type: 'employee_family', employer_contribution: 120, annual_cost: 1440, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'GUARD', plan_name: 'Cheque Guardería', plan_type: 'childcare', provider_name: 'Ticket Guardería', coverage_type: 'employee', employer_contribution: 0, employee_contribution: 200, annual_cost: 0, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'FORM', plan_name: 'Plan Formación Bonificada', plan_type: 'education', provider_name: 'FUNDAE', coverage_type: 'employee', employer_contribution: 0, annual_cost: 15000, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'TICKET', plan_name: 'Ticket Restaurant', plan_type: 'meal', provider_name: 'Edenred', coverage_type: 'employee', employer_contribution: 9, annual_cost: 0, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
    { company_id: COMPANY_ID, plan_code: 'PENSION', plan_name: 'Plan Pensiones Empresa', plan_type: 'retirement', provider_name: 'VidaCaixa', coverage_type: 'employee', employer_contribution: 100, annual_cost: 0, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
  ];
  const { data: planData, error: plnErr } = await supabase.from('erp_hr_benefits_plans').insert(plans).select('id');
  if (plnErr) throw new Error(`Benefits: ${plnErr.message}`);
  count += plans.length;

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
    { company_id: COMPANY_ID, template_code: 'TPL-CONTRATO', document_type: 'contract', template_name: 'Contrato Indefinido', jurisdiction: 'ES', language_code: 'es', template_content: '# CONTRATO\n\nEntre {{empresa}} y {{empleado}}...', is_active: true, is_system: false, metadata: DEMO_META },
    { company_id: COMPANY_ID, template_code: 'TPL-CERTIF', document_type: 'certificate', template_name: 'Certificado de Empresa', jurisdiction: 'ES', language_code: 'es', template_content: '# CERTIFICADO\n\n{{empleado}}...', is_active: true, is_system: false, metadata: DEMO_META },
    { company_id: COMPANY_ID, template_code: 'TPL-CARTA', document_type: 'letter', template_name: 'Carta de Comunicación', jurisdiction: 'ES', language_code: 'es', template_content: '# CARTA\n\nEstimado/a {{empleado}}...', is_active: true, is_system: false, metadata: DEMO_META },
  ];
  const { error: tplErr } = await supabase.from('erp_hr_document_templates').insert(templates);
  if (tplErr) console.warn('Templates:', tplErr.message); else count += templates.length;

  return { phase: 'compliance', records: count, details: `${incidents.length} incidentes, ${plans.length} beneficios, ${benEnrollments.length} inscripciones, ${docs.length} documentos, ${templates.length} plantillas` };
}

async function seedLegal(supabase: any): Promise<PhaseResult> {
  let count = 0;

  const eqPlans = [
    { company_id: COMPANY_ID, plan_name: 'Plan de Igualdad 2025-2029', status: 'active', start_date: '2025-01-01', end_date: '2029-12-31', responsible_person: 'Directora RRHH', registration_number: `PI-${randomBetween(100000,999999)}`, objectives: ['Reducir brecha salarial <5%', 'Paridad en mandos intermedios', 'Protocolo acoso actualizado'], metadata: DEMO_META },
  ];
  const { error: eqErr } = await supabase.from('erp_hr_equality_plans').insert(eqPlans);
  if (eqErr) console.warn('Equality:', eqErr.message); else count += eqPlans.length;

  const reports = [
    { company_id: COMPANY_ID, report_code: `DEN-${randomBetween(1000,9999)}`, category: 'harassment', description: 'Posible acoso verbal en producción', status: 'investigating', priority: 'high', is_anonymous: true, received_at: '2025-04-20T10:00:00Z', metadata: DEMO_META },
    { company_id: COMPANY_ID, report_code: `DEN-${randomBetween(1000,9999)}`, category: 'fraud', description: 'Uso indebido tarjeta empresa', status: 'resolved', priority: 'medium', is_anonymous: false, received_at: '2025-02-15T14:30:00Z', resolved_at: '2025-03-10T09:00:00Z', resolution: 'Amonestación por escrito.', metadata: DEMO_META },
    { company_id: COMPANY_ID, report_code: `DEN-${randomBetween(1000,9999)}`, category: 'safety', description: 'Incumplimiento normas seguridad turno noche', status: 'pending', priority: 'high', is_anonymous: true, received_at: '2025-09-05T08:00:00Z', metadata: DEMO_META },
  ];
  const { error: repErr } = await supabase.from('erp_hr_whistleblower_reports').insert(reports);
  if (repErr) console.warn('Whistleblower:', repErr.message); else count += reports.length;

  const sanctions = [
    { company_id: COMPANY_ID, alert_type: 'contract_expiry', severity: 'high', title: 'Contratos temporales venciendo', description: '3 contratos vencen en 30 días', due_date: '2025-11-15', status: 'active', metadata: DEMO_META },
    { company_id: COMPANY_ID, alert_type: 'training_overdue', severity: 'medium', title: 'Formación PRL pendiente', description: '5 empleados sin PRL actualizada', due_date: '2025-10-31', status: 'active', metadata: DEMO_META },
    { company_id: COMPANY_ID, alert_type: 'equality_audit', severity: 'medium', title: 'Auditoría salarial pendiente', description: 'Vence el 31/03', due_date: '2026-03-31', status: 'active', metadata: DEMO_META },
    { company_id: COMPANY_ID, alert_type: 'data_protection', severity: 'low', title: 'Renovación RGPD', description: 'Revisión anual consentimientos', due_date: '2025-12-31', status: 'active', metadata: DEMO_META },
    { company_id: COMPANY_ID, alert_type: 'medical_review', severity: 'high', title: 'Reconocimientos médicos', description: '8 empleados sin reconocimiento', due_date: '2025-11-30', status: 'active', metadata: DEMO_META },
  ];
  const { error: sanErr } = await supabase.from('erp_hr_sanction_alerts').insert(sanctions);
  if (sanErr) console.warn('Sanctions:', sanErr.message); else count += sanctions.length;

  return { phase: 'legal', records: count, details: `${eqPlans.length} plan igualdad, ${reports.length} denuncias, ${sanctions.length} alertas` };
}

async function seedExperience(supabase: any): Promise<PhaseResult> {
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
      { code: 'FORM-PRL', name: 'Formación PRL', phase: 'training', responsible: 'prl' },
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
    { company_id: COMPANY_ID, program_name: 'Empleado del Mes', description: 'Reconocimiento mensual', is_active: true, budget_annual: 6000, points_per_award: 200, nomination_type: 'peer', metadata: DEMO_META },
    { company_id: COMPANY_ID, program_name: 'Premio Innovación', description: 'Premio trimestral ideas', is_active: true, budget_annual: 10000, points_per_award: 500, nomination_type: 'manager', metadata: DEMO_META },
  ];
  const { error: progErr } = await supabase.from('erp_hr_recognition_programs').insert(programs);
  if (progErr) console.warn('Programs:', progErr.message); else count += programs.length;

  const ssContribs: any[] = [];
  for (const emp of emps.slice(0, 50)) {
    for (let m = 1; m <= 10; m++) {
      const base = randomDecimal(1500, 5000);
      ssContribs.push({
        company_id: COMPANY_ID, employee_id: emp.id, period_month: m, period_year: 2025,
        base_amount: base, worker_contribution: parseFloat((base * 0.0635).toFixed(2)),
        company_contribution: parseFloat((base * 0.305).toFixed(2)),
        mei_contribution: parseFloat((base * 0.007).toFixed(2)),
        total_contribution: parseFloat((base * 0.3755).toFixed(2)),
        status: m <= 8 ? 'paid' : 'pending', metadata: DEMO_META,
      });
    }
  }
  for (let b = 0; b < ssContribs.length; b += 100) {
    const { error } = await supabase.from('erp_hr_ss_contributions').insert(ssContribs.slice(b, b + 100));
    if (error) console.warn(`SS ${b}:`, error.message); else count += ssContribs.slice(b, b + 100).length;
  }

  return { phase: 'experience', records: count, details: `${onboardings.length} onboardings, ${offboardings.length} offboardings, ${recognitions.length} reconocimientos, ${ssContribs.length} cotizaciones SS` };
}

async function purgeAllDemo(supabase: any): Promise<PhaseResult> {
  const tables = [
    'erp_hr_ss_contributions', 'erp_hr_recognition', 'erp_hr_recognition_programs',
    'erp_hr_onboarding_tasks', 'erp_hr_employee_onboarding', 'erp_hr_offboarding_history',
    'erp_hr_sanction_alerts', 'erp_hr_whistleblower_reports', 'erp_hr_equality_plans',
    'erp_hr_employee_documents', 'erp_hr_document_templates', 'erp_hr_benefits_enrollments',
    'erp_hr_benefits_plans', 'erp_hr_safety_incidents', 'erp_hr_interviews', 'erp_hr_candidates',
    'erp_hr_job_openings', 'erp_hr_performance_evaluations', 'erp_hr_evaluation_cycles',
    'erp_hr_training_enrollments', 'erp_hr_training_catalog', 'erp_hr_leave_balances',
    'erp_hr_leave_requests', 'erp_hr_time_entries', 'erp_hr_payrolls',
    'erp_hr_employee_compensation', 'erp_hr_contracts', 'erp_hr_employees',
    'erp_hr_time_policies', 'erp_hr_collective_agreements', 'erp_hr_job_positions', 'erp_hr_departments',
  ];
  let totalDeleted = 0;
  const details: string[] = [];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).delete().eq('metadata->>is_demo', 'true').select('id');
      if (!error && data) {
        totalDeleted += data.length;
        if (data.length > 0) details.push(`${table.replace('erp_hr_','')}: ${data.length}`);
      } else if (error) {
        const { data: d2, error: e2 } = await supabase.from(table).delete().eq('company_id', COMPANY_ID).select('id');
        if (!e2 && d2) { totalDeleted += d2.length; if (d2.length > 0) details.push(`${table.replace('erp_hr_','')}: ${d2.length}`); }
      }
    } catch (err) { console.warn(`Purge ${table}:`, err); }
  }
  return { phase: 'purge', records: totalDeleted, details: details.join(', ') };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { action } = await req.json();
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
      case 'seed_all': {
        const results: PhaseResult[] = [];
        results.push(await seedInfrastructure(supabase));
        results.push(await seedEmployees(supabase));
        results.push(await seedPayrolls(supabase));
        results.push(await seedTimeAndAbsences(supabase));
        results.push(await seedTalent(supabase));
        results.push(await seedCompliance(supabase));
        results.push(await seedLegal(supabase));
        results.push(await seedExperience(supabase));
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
