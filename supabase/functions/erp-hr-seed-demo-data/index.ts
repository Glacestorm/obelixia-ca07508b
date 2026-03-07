import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANY_ID = '2cbd8718-7a8b-42ce-af61-bef193da32df';
const DEMO_META = { is_demo: true };

// ====== HELPERS ======
function uuid() { return crypto.randomUUID(); }
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rnd(0, arr.length - 1)]; }
function dateStr(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

const FIRST_NAMES_M = ['Carlos','Miguel','Antonio','José','Francisco','David','Pablo','Javier','Daniel','Alejandro','Pedro','Rafael','Manuel','Luis','Fernando','Sergio','Adrián','Jorge','Marcos','Ángel'];
const FIRST_NAMES_F = ['María','Ana','Laura','Carmen','Isabel','Lucía','Elena','Sara','Paula','Marta','Cristina','Patricia','Sandra','Rosa','Teresa','Raquel','Andrea','Silvia','Beatriz','Sofía'];
const LAST_NAMES = ['García','Martínez','López','Hernández','González','Rodríguez','Sánchez','Pérez','Fernández','Gómez','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Serrano','Blanco','Molina','Suárez','Castro','Ortega','Rubio'];

function genDNI() { const n = rnd(10000000,99999999); const l = 'TRWAGMYFPDXBNJZSQVHLCKE'[n%23]; return `${n}${l}`; }
function genNSS() { return `28/${rnd(10000000,99999999)}/${rnd(10,99)}`; }
function genIBAN() { return `ES${rnd(10,99)} ${rnd(1000,9999)} ${rnd(1000,9999)} ${rnd(10,99)} ${rnd(1000000000,9999999999)}`; }
function genPhone() { return `6${rnd(10000000,99999999)}`; }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey);

    const { action, companyId } = await req.json();
    const cid = companyId || COMPANY_ID;

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'seed_infrastructure': {
        // === DEPARTMENTS ===
        const depts = [
          { id: uuid(), company_id: cid, code: 'DIR', name: 'Dirección General', sort_order: 1, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'ADM', name: 'Administración y Finanzas', sort_order: 2, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'RRHH', name: 'Recursos Humanos', sort_order: 3, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'COM', name: 'Comercial y Ventas', sort_order: 4, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'PROD', name: 'Producción', sort_order: 5, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'LOG', name: 'Logística y Almacén', sort_order: 6, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'IT', name: 'Tecnología e Innovación', sort_order: 7, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'CAL', name: 'Calidad y Medio Ambiente', sort_order: 8, metadata: DEMO_META },
        ];
        const { error: e1 } = await db.from('erp_hr_departments').insert(depts);
        if (e1) throw e1;

        // === JOB POSITIONS ===
        const positions = [
          { company_id: cid, position_code: 'DG01', position_name: 'Director/a General', department_id: depts[0].id, salary_band_min: 70000, salary_band_max: 95000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'CFO01', position_name: 'Director/a Financiero', department_id: depts[1].id, salary_band_min: 55000, salary_band_max: 80000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'ADM01', position_name: 'Administrativo/a Contable', department_id: depts[1].id, salary_band_min: 22000, salary_band_max: 32000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'ADM02', position_name: 'Auxiliar Administrativo/a', department_id: depts[1].id, salary_band_min: 18000, salary_band_max: 24000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'RH01', position_name: 'Responsable de RRHH', department_id: depts[2].id, salary_band_min: 40000, salary_band_max: 55000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'RH02', position_name: 'Técnico/a de Nóminas', department_id: depts[2].id, salary_band_min: 26000, salary_band_max: 36000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'RH03', position_name: 'Técnico/a de Selección', department_id: depts[2].id, salary_band_min: 24000, salary_band_max: 34000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'COM01', position_name: 'Director/a Comercial', department_id: depts[3].id, salary_band_min: 45000, salary_band_max: 65000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'COM02', position_name: 'Comercial de Zona', department_id: depts[3].id, salary_band_min: 24000, salary_band_max: 38000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'COM03', position_name: 'Atención al Cliente', department_id: depts[3].id, salary_band_min: 20000, salary_band_max: 28000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'PRD01', position_name: 'Jefe/a de Producción', department_id: depts[4].id, salary_band_min: 38000, salary_band_max: 52000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'PRD02', position_name: 'Encargado/a de Línea', department_id: depts[4].id, salary_band_min: 28000, salary_band_max: 38000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'PRD03', position_name: 'Operario/a de Producción', department_id: depts[4].id, salary_band_min: 18000, salary_band_max: 26000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'PRD04', position_name: 'Técnico/a de Mantenimiento', department_id: depts[4].id, salary_band_min: 24000, salary_band_max: 34000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'LOG01', position_name: 'Responsable de Logística', department_id: depts[5].id, salary_band_min: 32000, salary_band_max: 45000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'LOG02', position_name: 'Mozo/a de Almacén', department_id: depts[5].id, salary_band_min: 18000, salary_band_max: 24000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'LOG03', position_name: 'Transportista', department_id: depts[5].id, salary_band_min: 20000, salary_band_max: 28000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'IT01', position_name: 'Responsable de IT', department_id: depts[6].id, salary_band_min: 42000, salary_band_max: 60000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'IT02', position_name: 'Desarrollador/a Software', department_id: depts[6].id, salary_band_min: 30000, salary_band_max: 48000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'IT03', position_name: 'Técnico/a de Sistemas', department_id: depts[6].id, salary_band_min: 26000, salary_band_max: 38000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'CAL01', position_name: 'Responsable de Calidad', department_id: depts[7].id, salary_band_min: 35000, salary_band_max: 50000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'CAL02', position_name: 'Técnico/a de Calidad', department_id: depts[7].id, salary_band_min: 24000, salary_band_max: 34000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'CAL03', position_name: 'Técnico/a Medio Ambiente', department_id: depts[7].id, salary_band_min: 26000, salary_band_max: 36000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'PRL01', position_name: 'Técnico/a PRL', department_id: depts[7].id, salary_band_min: 28000, salary_band_max: 40000, is_active: true, metadata: DEMO_META },
          { company_id: cid, position_code: 'BEC01', position_name: 'Becario/a', department_id: depts[1].id, salary_band_min: 8000, salary_band_max: 12000, is_active: true, metadata: DEMO_META },
        ];
        const { error: e2 } = await db.from('erp_hr_job_positions').insert(positions);
        if (e2) throw e2;

        // === COLLECTIVE AGREEMENTS ===
        const agreements = [
          { id: uuid(), company_id: cid, code: 'CONV-METAL-2024', name: 'Convenio Colectivo del Metal de Lleida', jurisdiction_code: 'ES-L', effective_date: '2024-01-01', expiration_date: '2026-12-31', working_hours_week: 40, vacation_days: 23, extra_payments: 2, is_active: true, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'CONV-OFICINAS-2024', name: 'Convenio Oficinas y Despachos de Cataluña', jurisdiction_code: 'ES-CT', effective_date: '2024-01-01', expiration_date: '2025-12-31', working_hours_week: 38.5, vacation_days: 22, extra_payments: 2, is_active: true, metadata: DEMO_META },
          { id: uuid(), company_id: cid, code: 'CONV-ELECT-2024', name: 'Convenio Industria Eléctrica Nacional', jurisdiction_code: 'ES', effective_date: '2024-01-01', expiration_date: '2026-12-31', working_hours_week: 38, vacation_days: 25, extra_payments: 3, is_active: true, metadata: DEMO_META },
        ];
        const { error: e3 } = await db.from('erp_hr_collective_agreements').insert(agreements);
        if (e3) throw e3;

        // === LEAVE TYPES ===
        const leaveTypes = [
          { code: 'VAC', name: 'Vacaciones', jurisdiction: 'ES', category: 'vacaciones', days_entitled: 22, is_calendar_days: false, is_paid: true, requires_documentation: false, advance_notice_days: 15 },
          { code: 'IT', name: 'Incapacidad Temporal', jurisdiction: 'ES', category: 'enfermedad', is_calendar_days: true, is_paid: true, requires_documentation: true, advance_notice_days: 0 },
          { code: 'MAT', name: 'Maternidad/Paternidad', jurisdiction: 'ES', category: 'conciliacion', days_entitled: 112, is_calendar_days: true, is_paid: true, requires_documentation: true, advance_notice_days: 30 },
          { code: 'AP', name: 'Asuntos Propios', jurisdiction: 'ES', category: 'personal', days_entitled: 3, is_calendar_days: false, is_paid: true, requires_documentation: false, advance_notice_days: 3 },
          { code: 'PERM', name: 'Permiso Retribuido', jurisdiction: 'ES', category: 'permiso', days_entitled: 15, is_calendar_days: true, is_paid: true, requires_documentation: true, advance_notice_days: 7 },
          { code: 'MUD', name: 'Mudanza', jurisdiction: 'ES', category: 'permiso', days_entitled: 1, is_calendar_days: false, is_paid: true, requires_documentation: true, advance_notice_days: 7 },
          { code: 'MAT2', name: 'Matrimonio', jurisdiction: 'ES', category: 'permiso', days_entitled: 15, is_calendar_days: true, is_paid: true, requires_documentation: true, advance_notice_days: 30 },
          { code: 'FALL', name: 'Fallecimiento Familiar', jurisdiction: 'ES', category: 'permiso', days_entitled: 3, is_calendar_days: false, is_paid: true, requires_documentation: true, advance_notice_days: 0 },
        ];
        const { error: e4 } = await db.from('erp_hr_leave_types').insert(leaveTypes);
        if (e4) throw e4;

        // === TIME POLICIES ===
        const timePolicies = [
          { company_id: cid, policy_name: 'Jornada Continua', policy_type: 'fixed', start_time: '07:00', end_time: '15:00', break_minutes: 30, weekly_hours: 40, is_default: true, is_active: true },
          { company_id: cid, policy_name: 'Jornada Partida', policy_type: 'split', start_time: '09:00', end_time: '18:00', break_minutes: 60, weekly_hours: 40, is_default: false, is_active: true },
          { company_id: cid, policy_name: 'Turnos Rotativos', policy_type: 'shift', start_time: '06:00', end_time: '14:00', break_minutes: 30, weekly_hours: 40, is_default: false, is_active: true },
        ];
        const { error: e5 } = await db.from('erp_hr_time_policies').insert(timePolicies);
        if (e5) throw e5;

        // === DISCONNECTION POLICIES ===
        const discPolicies = [
          { company_id: cid, policy_name: 'Desconexión Digital General', disconnection_start: '19:00', disconnection_end: '07:00', applies_weekdays: true, applies_weekends: true, applies_holidays: true, email_delay_enabled: true, notification_blocking: true, is_active: true, effective_date: '2024-01-01' },
        ];
        const { error: e6 } = await db.from('erp_hr_disconnection_policies').insert(discPolicies);
        if (e6) throw e6;

        result = { departments: depts.length, positions: positions.length, agreements: agreements.length, leaveTypes: leaveTypes.length, timePolicies: timePolicies.length };
        break;
      }

      case 'seed_employees': {
        // Fetch departments and positions
        const { data: depts } = await db.from('erp_hr_departments').select('id,code').eq('company_id', cid);
        const { data: positions } = await db.from('erp_hr_job_positions').select('id,position_code,department_id,salary_band_min,salary_band_max').eq('company_id', cid);
        const { data: agreements } = await db.from('erp_hr_collective_agreements').select('id,code').eq('company_id', cid);
        if (!depts?.length || !positions?.length) throw new Error('Run seed_infrastructure first');

        const deptMap: Record<string, string> = {};
        depts.forEach(d => { deptMap[d.code] = d.id; });

        const posMap: Record<string, any> = {};
        positions.forEach(p => { posMap[p.position_code] = p; });

        // Position assignments for 50 employees
        const empTemplates = [
          // Direction (2)
          { pos: 'DG01', dept: 'DIR', ct: 'indefinido', gender: 'M', yearStart: 2015 },
          { pos: 'CFO01', dept: 'ADM', ct: 'indefinido', gender: 'F', yearStart: 2017 },
          // Admin (4)
          { pos: 'ADM01', dept: 'ADM', ct: 'indefinido', gender: 'F', yearStart: 2019 },
          { pos: 'ADM01', dept: 'ADM', ct: 'indefinido', gender: 'M', yearStart: 2020 },
          { pos: 'ADM02', dept: 'ADM', ct: 'temporal', gender: 'F', yearStart: 2024 },
          { pos: 'BEC01', dept: 'ADM', ct: 'formacion', gender: 'M', yearStart: 2025 },
          // RRHH (3)
          { pos: 'RH01', dept: 'RRHH', ct: 'indefinido', gender: 'F', yearStart: 2018 },
          { pos: 'RH02', dept: 'RRHH', ct: 'indefinido', gender: 'F', yearStart: 2020 },
          { pos: 'RH03', dept: 'RRHH', ct: 'indefinido', gender: 'M', yearStart: 2022 },
          // Comercial (6)
          { pos: 'COM01', dept: 'COM', ct: 'indefinido', gender: 'M', yearStart: 2016 },
          { pos: 'COM02', dept: 'COM', ct: 'indefinido', gender: 'F', yearStart: 2019 },
          { pos: 'COM02', dept: 'COM', ct: 'indefinido', gender: 'M', yearStart: 2020 },
          { pos: 'COM02', dept: 'COM', ct: 'temporal', gender: 'F', yearStart: 2024 },
          { pos: 'COM03', dept: 'COM', ct: 'indefinido', gender: 'F', yearStart: 2021 },
          { pos: 'COM03', dept: 'COM', ct: 'practicas', gender: 'M', yearStart: 2025 },
          // Producción (12)
          { pos: 'PRD01', dept: 'PROD', ct: 'indefinido', gender: 'M', yearStart: 2015 },
          { pos: 'PRD02', dept: 'PROD', ct: 'indefinido', gender: 'M', yearStart: 2018 },
          { pos: 'PRD02', dept: 'PROD', ct: 'indefinido', gender: 'F', yearStart: 2019 },
          { pos: 'PRD03', dept: 'PROD', ct: 'indefinido', gender: 'M', yearStart: 2018 },
          { pos: 'PRD03', dept: 'PROD', ct: 'indefinido', gender: 'M', yearStart: 2019 },
          { pos: 'PRD03', dept: 'PROD', ct: 'indefinido', gender: 'F', yearStart: 2020 },
          { pos: 'PRD03', dept: 'PROD', ct: 'indefinido', gender: 'M', yearStart: 2021 },
          { pos: 'PRD03', dept: 'PROD', ct: 'temporal', gender: 'M', yearStart: 2024 },
          { pos: 'PRD03', dept: 'PROD', ct: 'temporal', gender: 'F', yearStart: 2024 },
          { pos: 'PRD03', dept: 'PROD', ct: 'temporal', gender: 'M', yearStart: 2025 },
          { pos: 'PRD04', dept: 'PROD', ct: 'indefinido', gender: 'M', yearStart: 2019 },
          { pos: 'PRD04', dept: 'PROD', ct: 'indefinido', gender: 'F', yearStart: 2022 },
          // Logística (5)
          { pos: 'LOG01', dept: 'LOG', ct: 'indefinido', gender: 'M', yearStart: 2017 },
          { pos: 'LOG02', dept: 'LOG', ct: 'indefinido', gender: 'M', yearStart: 2020 },
          { pos: 'LOG02', dept: 'LOG', ct: 'temporal', gender: 'F', yearStart: 2024 },
          { pos: 'LOG03', dept: 'LOG', ct: 'indefinido', gender: 'M', yearStart: 2021 },
          { pos: 'LOG03', dept: 'LOG', ct: 'indefinido', gender: 'M', yearStart: 2022 },
          // IT (5)
          { pos: 'IT01', dept: 'IT', ct: 'indefinido', gender: 'M', yearStart: 2018 },
          { pos: 'IT02', dept: 'IT', ct: 'indefinido', gender: 'F', yearStart: 2020 },
          { pos: 'IT02', dept: 'IT', ct: 'indefinido', gender: 'M', yearStart: 2021 },
          { pos: 'IT03', dept: 'IT', ct: 'indefinido', gender: 'F', yearStart: 2022 },
          { pos: 'IT03', dept: 'IT', ct: 'practicas', gender: 'M', yearStart: 2025 },
          // Calidad (8)
          { pos: 'CAL01', dept: 'CAL', ct: 'indefinido', gender: 'F', yearStart: 2017 },
          { pos: 'CAL02', dept: 'CAL', ct: 'indefinido', gender: 'M', yearStart: 2020 },
          { pos: 'CAL02', dept: 'CAL', ct: 'indefinido', gender: 'F', yearStart: 2021 },
          { pos: 'CAL03', dept: 'CAL', ct: 'indefinido', gender: 'M', yearStart: 2019 },
          { pos: 'CAL03', dept: 'CAL', ct: 'temporal', gender: 'F', yearStart: 2024 },
          { pos: 'PRL01', dept: 'CAL', ct: 'indefinido', gender: 'M', yearStart: 2018 },
          { pos: 'PRL01', dept: 'CAL', ct: 'indefinido', gender: 'F', yearStart: 2023 },
          { pos: 'BEC01', dept: 'CAL', ct: 'formacion', gender: 'F', yearStart: 2025 },
        ];

        const employees: any[] = [];
        const contracts: any[] = [];
        const compensations: any[] = [];
        let mIdx = 0, fIdx = 0;

        for (const tmpl of empTemplates) {
          const empId = uuid();
          const isMale = tmpl.gender === 'M';
          const firstName = isMale ? FIRST_NAMES_M[mIdx % FIRST_NAMES_M.length] : FIRST_NAMES_F[fIdx % FIRST_NAMES_F.length];
          if (isMale) mIdx++; else fIdx++;
          const lastName = `${LAST_NAMES[employees.length % LAST_NAMES.length]} ${LAST_NAMES[(employees.length + 7) % LAST_NAMES.length]}`;

          const pos = posMap[tmpl.pos];
          const salary = pos ? rnd(pos.salary_band_min, pos.salary_band_max) : rnd(20000, 40000);
          const hireDate = dateStr(tmpl.yearStart, rnd(1, 12), rnd(1, 28));
          const empCode = `EMP-${String(employees.length + 1).padStart(3, '0')}`;

          employees.push({
            id: empId,
            company_id: cid,
            employee_code: empCode,
            first_name: firstName,
            last_name: lastName,
            national_id: genDNI(),
            ss_number: genNSS(),
            birth_date: dateStr(rnd(1965, 2000), rnd(1, 12), rnd(1, 28)),
            gender: isMale ? 'male' : 'female',
            email: `${firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${lastName.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@productoraelectrica.es`,
            phone: genPhone(),
            bank_account: genIBAN(),
            hire_date: hireDate,
            status: 'active',
            department_id: deptMap[tmpl.dept],
            position_id: pos?.id,
            job_title: pos?.position_code ? positions.find(p => p.position_code === tmpl.pos)?.position_code : tmpl.pos,
            base_salary: salary,
            contract_type: tmpl.ct,
            work_schedule: 'full_time',
            weekly_hours: 40,
            metadata: DEMO_META,
          });

          const agId = agreements?.length ? pick(agreements).id : null;
          contracts.push({
            company_id: cid,
            employee_id: empId,
            contract_type: tmpl.ct,
            contract_code: `CTR-${empCode}`,
            start_date: hireDate,
            end_date: tmpl.ct === 'temporal' ? dateStr(tmpl.yearStart + 1, rnd(1, 12), rnd(1, 28)) : null,
            base_salary: salary,
            annual_salary: salary,
            working_hours: 40,
            workday_type: 'full_time',
            category: tmpl.pos.startsWith('DG') || tmpl.pos.startsWith('CFO') || tmpl.pos.endsWith('01') ? 'directivo' : 'empleado',
            collective_agreement_id: agId,
            is_active: true,
          });

          compensations.push({
            employee_id: empId,
            fiscal_year: 2025,
            amount: salary,
            currency: 'EUR',
            frequency: 'annual',
            effective_date: '2025-01-01',
            metadata: DEMO_META,
          });
        }

        // Set reports_to: director is first emp, dept heads report to director
        const directorId = employees[0].id;
        const deptHeadPositions = ['CFO01','RH01','COM01','PRD01','LOG01','IT01','CAL01'];
        const deptHeadMap: Record<string, string> = {};
        for (const emp of employees) {
          const posCode = empTemplates[employees.indexOf(emp)].pos;
          if (deptHeadPositions.includes(posCode)) {
            emp.reports_to = directorId;
            deptHeadMap[empTemplates[employees.indexOf(emp)].dept] = emp.id;
          }
        }
        // Other employees report to their dept head
        for (let i = 0; i < employees.length; i++) {
          if (!employees[i].reports_to && i > 0) {
            const dept = empTemplates[i].dept;
            employees[i].reports_to = deptHeadMap[dept] || directorId;
          }
        }

        const { error: e1 } = await db.from('erp_hr_employees').insert(employees);
        if (e1) throw e1;
        const { error: e2 } = await db.from('erp_hr_contracts').insert(contracts);
        if (e2) throw e2;
        const { error: e3 } = await db.from('erp_hr_employee_compensation').insert(compensations);
        if (e3) throw e3;

        result = { employees: employees.length, contracts: contracts.length, compensations: compensations.length };
        break;
      }

      case 'seed_payrolls': {
        const { data: emps } = await db.from('erp_hr_employees').select('id,base_salary,hire_date,contract_type').eq('company_id', cid).eq('status', 'active');
        if (!emps?.length) throw new Error('Run seed_employees first');

        const payrolls: any[] = [];
        const months = [1,2,3,4,5,6,7,8,9,10]; // Jan-Oct 2025
        const statuses = ['paid','paid','paid','paid','paid','paid','approved','approved','calculated','draft'];

        for (const emp of emps) {
          const baseSalary = Number(emp.base_salary) || 24000;
          const monthlySalary = Math.round(baseSalary / 14 * 100) / 100; // 14 pagas

          for (let mi = 0; mi < months.length; mi++) {
            const m = months[mi];
            const irpfPct = baseSalary < 20000 ? 8 : baseSalary < 30000 ? 15 : baseSalary < 45000 ? 22 : baseSalary < 60000 ? 28 : 35;
            const ssWorker = Math.round(monthlySalary * 0.0635 * 100) / 100;
            const ssCompany = Math.round(monthlySalary * 0.305 * 100) / 100;

            // Complements
            const seniority = rnd(0, 200);
            const transport = rnd(50, 120);
            const productivity = rnd(0, 300);
            const complements = [
              { concept: 'Antigüedad', amount: seniority },
              { concept: 'Plus Transporte', amount: transport },
              { concept: 'Plus Productividad', amount: productivity },
            ];
            const totalComplements = seniority + transport + productivity;
            const gross = Math.round((monthlySalary + totalComplements) * 100) / 100;
            const irpfAmount = Math.round(gross * irpfPct / 100 * 100) / 100;
            const totalDeductions = Math.round((ssWorker + irpfAmount) * 100) / 100;
            const net = Math.round((gross - totalDeductions) * 100) / 100;
            const totalCost = Math.round((gross + ssCompany) * 100) / 100;

            const payrollType = m === 6 ? 'extra_junio' : m === 12 ? 'extra_diciembre' : 'mensual';
            const status = statuses[mi] || 'draft';

            payrolls.push({
              company_id: cid,
              employee_id: emp.id,
              period_month: m,
              period_year: 2025,
              payroll_type: payrollType,
              base_salary: monthlySalary,
              complements,
              gross_salary: gross,
              ss_worker: ssWorker,
              irpf_amount: irpfAmount,
              irpf_percentage: irpfPct,
              other_deductions: [],
              total_deductions: totalDeductions,
              net_salary: net,
              ss_company: ssCompany,
              total_cost: totalCost,
              status,
              calculated_at: status !== 'draft' ? new Date().toISOString() : null,
              paid_at: status === 'paid' ? `2025-${String(m).padStart(2,'0')}-28T10:00:00Z` : null,
              metadata: DEMO_META,
            });
          }
        }

        // Insert in batches of 100
        for (let i = 0; i < payrolls.length; i += 100) {
          const batch = payrolls.slice(i, i + 100);
          const { error } = await db.from('erp_hr_payrolls').insert(batch);
          if (error) throw error;
        }

        result = { payrolls: payrolls.length };
        break;
      }

      case 'seed_time_and_absences': {
        const { data: emps } = await db.from('erp_hr_employees').select('id,department_id').eq('company_id', cid).eq('status', 'active');
        if (!emps?.length) throw new Error('Run seed_employees first');

        // Time entries: last 2 months (Feb-Mar 2025), ~20 work days each
        const timeEntries: any[] = [];
        const workDays: string[] = [];
        for (let m = 2; m <= 3; m++) {
          for (let d = 1; d <= 28; d++) {
            const date = new Date(2025, m - 1, d);
            if (date.getDay() > 0 && date.getDay() < 6) {
              workDays.push(dateStr(2025, m, d));
            }
          }
        }

        // Sample 40 employees for time entries (skip some for variety)
        const timeEmps = emps.slice(0, 40);
        for (const emp of timeEmps) {
          for (const day of workDays) {
            const startHour = rnd(7, 9);
            const startMin = rnd(0, 30);
            const endHour = startHour + 8;
            const endMin = rnd(0, 59);
            timeEntries.push({
              company_id: cid,
              employee_id: emp.id,
              entry_date: day,
              entry_type: 'regular',
              source: 'system',
              clock_in: `${day}T${String(startHour).padStart(2,'0')}:${String(startMin).padStart(2,'0')}:00Z`,
              clock_out: `${day}T${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}:00Z`,
              total_hours: 8 + (endMin - startMin) / 60,
              status: 'approved',
            });
          }
        }

        for (let i = 0; i < timeEntries.length; i += 200) {
          const { error } = await db.from('erp_hr_time_entries').insert(timeEntries.slice(i, i + 200));
          if (error) throw error;
        }

        // Leave requests
        const leaveRequests: any[] = [];
        const leaveStatuses = ['approved','approved','approved','pending','rejected','cancelled'];
        const leaveCodes = ['VAC','VAC','VAC','IT','AP','PERM','VAC','VAC'];
        for (let i = 0; i < 80; i++) {
          const emp = pick(emps);
          const code = pick(leaveCodes);
          const startMonth = rnd(1, 10);
          const startDay = rnd(1, 20);
          const days = code === 'VAC' ? rnd(3, 10) : code === 'IT' ? rnd(2, 15) : rnd(1, 3);
          leaveRequests.push({
            company_id: cid,
            employee_id: emp.id,
            leave_type_code: code,
            jurisdiction: 'ES',
            start_date: dateStr(2025, startMonth, startDay),
            end_date: dateStr(2025, startMonth, Math.min(startDay + days, 28)),
            days_requested: days,
            status: pick(leaveStatuses),
          });
        }
        const { error: e2 } = await db.from('erp_hr_leave_requests').insert(leaveRequests);
        if (e2) throw e2;

        // Leave balances
        const leaveBalances: any[] = [];
        for (const emp of emps) {
          const used = rnd(3, 15);
          leaveBalances.push({
            company_id: cid,
            employee_id: emp.id,
            year: 2025,
            leave_type_code: 'VAC',
            jurisdiction: 'ES',
            entitled_days: 22,
            used_days: used,
            pending_days: 22 - used,
          });
        }
        const { error: e3 } = await db.from('erp_hr_leave_balances').insert(leaveBalances);
        if (e3) throw e3;

        result = { timeEntries: timeEntries.length, leaveRequests: leaveRequests.length, leaveBalances: leaveBalances.length };
        break;
      }

      case 'seed_talent': {
        const { data: emps } = await db.from('erp_hr_employees').select('id').eq('company_id', cid).eq('status', 'active');
        if (!emps?.length) throw new Error('Run seed_employees first');

        // Training catalog
        const courses = [
          { company_id: cid, course_code: 'PRL-001', title: 'Prevención de Riesgos Laborales Básico', category: 'seguridad', modality: 'online', duration_hours: 60, provider: 'FREMAP', is_mandatory: true, is_active: true },
          { company_id: cid, course_code: 'PRL-002', title: 'PRL Específico - Sector Eléctrico', category: 'seguridad', modality: 'presencial', duration_hours: 20, provider: 'FREMAP', is_mandatory: true, is_active: true },
          { company_id: cid, course_code: 'RGPD-001', title: 'Protección de Datos RGPD', category: 'compliance', modality: 'online', duration_hours: 8, provider: 'AEPD', is_mandatory: true, is_active: true },
          { company_id: cid, course_code: 'IGUALDAD-001', title: 'Igualdad y Acoso Laboral', category: 'compliance', modality: 'online', duration_hours: 10, provider: 'RRHH Interno', is_mandatory: true, is_active: true },
          { company_id: cid, course_code: 'EXCEL-001', title: 'Excel Avanzado para Gestión', category: 'habilidades', modality: 'online', duration_hours: 20, provider: 'Udemy Business', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'LIDER-001', title: 'Liderazgo y Gestión de Equipos', category: 'liderazgo', modality: 'presencial', duration_hours: 16, provider: 'ESADE', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'IDIOM-001', title: 'Inglés Técnico B2', category: 'idiomas', modality: 'online', duration_hours: 60, provider: 'Oxford Online', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'LEAN-001', title: 'Lean Manufacturing', category: 'produccion', modality: 'presencial', duration_hours: 24, provider: 'Lean Institute', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'SAP-001', title: 'SAP S/4HANA Fundamentos', category: 'tecnologia', modality: 'online', duration_hours: 40, provider: 'SAP Training', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'NEGOC-001', title: 'Técnicas de Negociación Comercial', category: 'comercial', modality: 'presencial', duration_hours: 12, provider: 'IE Business School', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'PYTHON-001', title: 'Python para Análisis de Datos', category: 'tecnologia', modality: 'online', duration_hours: 30, provider: 'Coursera', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'CALIDAD-001', title: 'ISO 9001:2015 Auditor Interno', category: 'calidad', modality: 'presencial', duration_hours: 16, provider: 'AENOR', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'MEDIO-001', title: 'ISO 14001 Gestión Medioambiental', category: 'calidad', modality: 'online', duration_hours: 20, provider: 'Bureau Veritas', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'DIGIT-001', title: 'Transformación Digital Industrial', category: 'tecnologia', modality: 'online', duration_hours: 15, provider: 'Fundación Telefónica', is_mandatory: false, is_active: true },
          { company_id: cid, course_code: 'FINAN-001', title: 'Finanzas para No Financieros', category: 'finanzas', modality: 'presencial', duration_hours: 12, provider: 'IESE', is_mandatory: false, is_active: true },
        ];
        const { data: insertedCourses, error: e1 } = await db.from('erp_hr_training_catalog').insert(courses).select('id');
        if (e1) throw e1;

        // Training enrollments (60)
        const enrollments: any[] = [];
        const enrollStatuses = ['completed','completed','completed','in_progress','in_progress','enrolled','cancelled'];
        for (let i = 0; i < 60; i++) {
          const emp = pick(emps);
          const course = insertedCourses![i % insertedCourses!.length];
          const status = pick(enrollStatuses);
          enrollments.push({
            company_id: cid,
            employee_id: emp.id,
            course_id: course.id,
            status,
            enrolled_at: dateStr(2025, rnd(1, 8), rnd(1, 28)),
            completed_at: status === 'completed' ? dateStr(2025, rnd(3, 10), rnd(1, 28)) : null,
            score: status === 'completed' ? rnd(60, 100) : null,
          });
        }
        const { error: e2 } = await db.from('erp_hr_training_enrollments').insert(enrollments);
        if (e2) throw e2;

        // Evaluation cycles (3)
        const cycles = [
          { company_id: cid, name: 'Evaluación Anual 2024', cycle_type: 'annual', start_date: '2024-11-01', end_date: '2024-12-31', status: 'completed', self_evaluation_enabled: true, peer_evaluation_enabled: false, manager_evaluation_required: true },
          { company_id: cid, name: 'Evaluación Semestral H1 2025', cycle_type: 'semi_annual', start_date: '2025-06-01', end_date: '2025-07-15', status: 'completed', self_evaluation_enabled: true, peer_evaluation_enabled: true, manager_evaluation_required: true },
          { company_id: cid, name: 'Evaluación Anual 2025', cycle_type: 'annual', start_date: '2025-11-01', end_date: '2025-12-31', status: 'in_progress', self_evaluation_enabled: true, peer_evaluation_enabled: true, manager_evaluation_required: true },
        ];
        const { data: insertedCycles, error: e3 } = await db.from('erp_hr_evaluation_cycles').insert(cycles).select('id');
        if (e3) throw e3;

        // Performance evaluations (50)
        const evaluations: any[] = [];
        for (const emp of emps) {
          const cycle = insertedCycles![rnd(0, 1)]; // use completed cycles
          evaluations.push({
            company_id: cid,
            employee_id: emp.id,
            cycle_id: cycle.id,
            evaluator_id: emps[0].id,
            overall_score: rnd(50, 100) / 10,
            self_score: rnd(60, 100) / 10,
            status: 'completed',
            strengths: ['Trabajo en equipo', 'Puntualidad', 'Proactividad'].slice(0, rnd(1, 3)),
            areas_for_improvement: ['Comunicación escrita', 'Gestión del tiempo', 'Delegación'].slice(0, rnd(1, 2)),
            goals_next_period: ['Mejorar productividad un 10%', 'Completar formación técnica'],
          });
        }
        const { error: e4 } = await db.from('erp_hr_performance_evaluations').insert(evaluations);
        if (e4) throw e4;

        // Job openings (5)
        const openings = [
          { company_id: cid, title: 'Ingeniero/a de Producción', department: 'Producción', location: 'Lleida', employment_type: 'full_time', contract_type: 'indefinido', salary_min: 30000, salary_max: 42000, status: 'open', vacancies: 2, description: 'Buscamos ingeniero/a industrial para línea de producción eléctrica.' },
          { company_id: cid, title: 'Administrativo/a Contable', department: 'Administración', location: 'Lleida', employment_type: 'full_time', contract_type: 'temporal', salary_min: 22000, salary_max: 28000, status: 'open', vacancies: 1, description: 'Soporte administrativo y contable.' },
          { company_id: cid, title: 'Comercial de Zona Cataluña', department: 'Comercial', location: 'Barcelona', employment_type: 'full_time', contract_type: 'indefinido', salary_min: 26000, salary_max: 35000, status: 'interviewing', vacancies: 1, description: 'Gestión comercial zona noreste.' },
          { company_id: cid, title: 'Técnico/a de Calidad', department: 'Calidad', location: 'Lleida', employment_type: 'full_time', contract_type: 'indefinido', salary_min: 26000, salary_max: 34000, status: 'closed', vacancies: 1, description: 'Control de calidad y auditorías ISO.' },
          { company_id: cid, title: 'Becario/a Desarrollo Software', department: 'IT', location: 'Lleida', employment_type: 'part_time', contract_type: 'formacion', salary_min: 8000, salary_max: 12000, status: 'open', vacancies: 1, description: 'Prácticas en desarrollo web y ERP.' },
        ];
        const { data: insertedOpenings, error: e5 } = await db.from('erp_hr_job_openings').insert(openings).select('id');
        if (e5) throw e5;

        // Candidates (20)
        const candidates: any[] = [];
        const candStatuses = ['new','screening','interview','offer','hired','rejected','withdrawn'];
        const sources = ['LinkedIn','InfoJobs','Referencia interna','Web corporativa','Indeed'];
        for (let i = 0; i < 20; i++) {
          const isMale = i % 2 === 0;
          candidates.push({
            company_id: cid,
            job_opening_id: insertedOpenings![i % insertedOpenings!.length].id,
            first_name: isMale ? FIRST_NAMES_M[i % FIRST_NAMES_M.length] : FIRST_NAMES_F[i % FIRST_NAMES_F.length],
            last_name: `${LAST_NAMES[(i + 10) % LAST_NAMES.length]} ${LAST_NAMES[(i + 15) % LAST_NAMES.length]}`,
            email: `candidato${i + 1}@ejemplo.com`,
            phone: genPhone(),
            status: pick(candStatuses),
            source: pick(sources),
            ai_score: rnd(30, 98),
          });
        }
        const { error: e6 } = await db.from('erp_hr_candidates').insert(candidates);
        if (e6) throw e6;

        // Interviews (10)
        const { data: insertedCandidates } = await db.from('erp_hr_candidates').select('id,job_opening_id').eq('company_id', cid).limit(10);
        const interviews: any[] = [];
        const intTypes = ['phone_screen','technical','cultural_fit','final','panel'];
        for (let i = 0; i < 10; i++) {
          const cand = insertedCandidates![i];
          interviews.push({
            company_id: cid,
            candidate_id: cand.id,
            job_opening_id: cand.job_opening_id,
            interviewer_id: emps[rnd(0, 5)].id,
            interview_type: pick(intTypes),
            scheduled_at: `2025-${String(rnd(3, 10)).padStart(2,'0')}-${String(rnd(1, 28)).padStart(2,'0')}T${rnd(9, 17)}:00:00Z`,
            duration_minutes: pick([30, 45, 60]),
            status: pick(['completed', 'scheduled', 'cancelled']),
            overall_rating: rnd(1, 5),
            notes: 'Entrevista demo generada automáticamente',
          });
        }
        const { error: e7 } = await db.from('erp_hr_interviews').insert(interviews);
        if (e7) throw e7;

        result = { courses: courses.length, enrollments: enrollments.length, cycles: cycles.length, evaluations: evaluations.length, openings: openings.length, candidates: candidates.length, interviews: interviews.length };
        break;
      }

      case 'seed_compliance': {
        const { data: emps } = await db.from('erp_hr_employees').select('id').eq('company_id', cid).eq('status', 'active');
        if (!emps?.length) throw new Error('Run seed_employees first');

        // Safety incidents (8)
        const incidents = [
          { company_id: cid, employee_id: emps[rnd(15, 25)].id, incident_type: 'accident', severity: 'minor', title: 'Corte superficial en línea de montaje', description: 'Corte leve en mano derecha al manipular componente sin guantes.', incident_date: '2025-02-15', location: 'Nave de producción', status: 'closed', corrective_actions: ['Reforzar uso de EPIs', 'Charla de seguridad'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(15, 25)].id, incident_type: 'near_miss', severity: 'low', title: 'Casi-accidente: caída de material', description: 'Caída de caja de herramientas desde estantería sin causar daños.', incident_date: '2025-03-02', location: 'Almacén', status: 'investigating', corrective_actions: ['Revisar anclajes estanterías'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(15, 25)].id, incident_type: 'accident', severity: 'moderate', title: 'Tropiezo en zona de carga', description: 'Empleado tropezó con cable suelto en zona de carga. Contusión en rodilla.', incident_date: '2025-01-20', location: 'Muelle de carga', status: 'closed', corrective_actions: ['Canalización de cables', 'Señalización zona'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(25, 35)].id, incident_type: 'near_miss', severity: 'low', title: 'Fallo eléctrico en panel', description: 'Chispazo en panel de control durante mantenimiento programado.', incident_date: '2025-04-10', location: 'Sala eléctrica', status: 'closed', corrective_actions: ['Revisión de protecciones'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(15, 25)].id, incident_type: 'occupational_illness', severity: 'minor', title: 'Dolor lumbar por sobreesfuerzo', description: 'Trabajador reporta dolor lumbar tras jornada de carga manual.', incident_date: '2025-05-08', location: 'Almacén', status: 'investigating', corrective_actions: ['Evaluación ergonómica', 'Formación manipulación cargas'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(30, 40)].id, incident_type: 'near_miss', severity: 'low', title: 'Derrame químico controlado', description: 'Pequeño vertido de disolvente en área de limpieza. Contenido sin daño ambiental.', incident_date: '2025-06-15', location: 'Taller', status: 'closed', corrective_actions: ['Kit anti-derrames en zona'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(15, 30)].id, incident_type: 'accident', severity: 'minor', title: 'Quemadura leve por soldadura', description: 'Quemadura superficial en antebrazo durante operación de soldadura.', incident_date: '2025-07-22', location: 'Nave de producción', status: 'closed', corrective_actions: ['Verificar protecciones de soldadura'], reported_by: emps[0].id },
          { company_id: cid, employee_id: emps[rnd(5, 15)].id, incident_type: 'near_miss', severity: 'medium', title: 'Fallo de carretilla elevadora', description: 'Frenos de carretilla no respondieron adecuadamente. Sin heridos.', incident_date: '2025-08-05', location: 'Almacén', status: 'investigating', corrective_actions: ['Revisión completa de carretillas', 'Mantenimiento preventivo'], reported_by: emps[0].id },
        ];
        const { error: e1 } = await db.from('erp_hr_safety_incidents').insert(incidents);
        if (e1) throw e1;

        // Benefits plans (5)
        const plans = [
          { company_id: cid, plan_code: 'SEG-MED', plan_name: 'Seguro Médico Privado', plan_type: 'health', provider_name: 'Sanitas', coverage_type: 'individual_family', employer_contribution: 120, employee_contribution: 40, annual_cost: 76800, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
          { company_id: cid, plan_code: 'GUARD', plan_name: 'Cheque Guardería', plan_type: 'childcare', provider_name: 'Sodexo', coverage_type: 'dependent', employer_contribution: 0, employee_contribution: 0, annual_cost: 12000, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
          { company_id: cid, plan_code: 'FORM', plan_name: 'Formación Bonificada', plan_type: 'education', provider_name: 'FUNDAE', coverage_type: 'individual', employer_contribution: 500, employee_contribution: 0, annual_cost: 25000, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
          { company_id: cid, plan_code: 'TICK-REST', plan_name: 'Ticket Restaurant', plan_type: 'meal', provider_name: 'Edenred', coverage_type: 'individual', employer_contribution: 9, employee_contribution: 0, annual_cost: 45000, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
          { company_id: cid, plan_code: 'PENSION', plan_name: 'Plan de Pensiones Empresa', plan_type: 'retirement', provider_name: 'BBVA Asset Management', coverage_type: 'individual', employer_contribution_percent: 3, employee_contribution: 0, annual_cost: 36000, effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
        ];
        const { data: insertedPlans, error: e2 } = await db.from('erp_hr_benefits_plans').insert(plans).select('id');
        if (e2) throw e2;

        // Benefits enrollments (30)
        const benefitEnrollments: any[] = [];
        for (let i = 0; i < 30; i++) {
          benefitEnrollments.push({
            company_id: cid,
            employee_id: emps[i % emps.length].id,
            plan_id: insertedPlans![i % insertedPlans!.length].id,
            enrollment_status: 'active',
            coverage_level: pick(['individual', 'individual_plus_one', 'family']),
            enrolled_at: '2025-01-15',
            effective_date: '2025-02-01',
            employee_contribution: rnd(0, 80),
            employer_contribution: rnd(50, 200),
            metadata: DEMO_META,
          });
        }
        const { error: e3 } = await db.from('erp_hr_benefits_enrollments').insert(benefitEnrollments);
        if (e3) throw e3;

        // Employee documents (100)
        const docTypes = ['contract','payslip','certificate','id_copy','medical_report','training_cert','tax_form','agreement'];
        const docs: any[] = [];
        for (let i = 0; i < 100; i++) {
          const emp = emps[i % emps.length];
          const docType = docTypes[i % docTypes.length];
          docs.push({
            company_id: cid,
            employee_id: emp.id,
            document_type: docType,
            document_name: `${docType}_${i + 1}.pdf`,
            document_url: `https://storage.example.com/hr-docs/${docType}_${i + 1}.pdf`,
            file_size: rnd(50000, 2000000),
            mime_type: 'application/pdf',
            version: 1,
            is_confidential: docType === 'medical_report' || docType === 'payslip',
            metadata: DEMO_META,
          });
        }
        for (let i = 0; i < docs.length; i += 50) {
          const { error } = await db.from('erp_hr_employee_documents').insert(docs.slice(i, i + 50));
          if (error) throw error;
        }

        // Document templates (3)
        const templates = [
          { company_id: cid, template_code: 'TPL-CONTRATO', document_type: 'contract', template_name: 'Contrato de Trabajo Indefinido', jurisdiction: 'ES', language_code: 'es', template_content: '# CONTRATO DE TRABAJO\n\nEntre la empresa {{company_name}} y D/Dña. {{employee_name}}...', is_active: true },
          { company_id: cid, template_code: 'TPL-CERT', document_type: 'certificate', template_name: 'Certificado de Empresa', jurisdiction: 'ES', language_code: 'es', template_content: '# CERTIFICADO\n\nD/Dña. {{hr_manager}} certifica que {{employee_name}} trabaja en esta empresa...', is_active: true },
          { company_id: cid, template_code: 'TPL-CARTA', document_type: 'letter', template_name: 'Carta de Amonestación', jurisdiction: 'ES', language_code: 'es', template_content: '# CARTA DE AMONESTACIÓN\n\nEn {{city}}, a {{date}}...', is_active: true },
        ];
        const { error: e5 } = await db.from('erp_hr_document_templates').insert(templates);
        if (e5) throw e5;

        result = { incidents: incidents.length, plans: plans.length, enrollments: benefitEnrollments.length, documents: docs.length, templates: templates.length };
        break;
      }

      case 'seed_legal': {
        const { data: emps } = await db.from('erp_hr_employees').select('id').eq('company_id', cid).eq('status', 'active');
        if (!emps?.length) throw new Error('Run seed_employees first');

        // Equality plan
        const { error: e1 } = await db.from('erp_hr_equality_plans').insert({
          company_id: cid,
          plan_code: 'PI-2025-001',
          plan_name: 'Plan de Igualdad 2025-2029',
          version: 1,
          start_date: '2025-01-01',
          end_date: '2029-12-31',
          registration_number: 'PI-CT-2025-00342',
          registration_date: '2025-01-15',
          status: 'active',
          diagnosis_data: { total_employees: 50, gender_distribution: { male: 28, female: 22 }, avg_salary_gap: 4.2 },
          objectives: [{ id: 1, text: 'Reducir brecha salarial al 2%' }, { id: 2, text: 'Paridad en mandos intermedios' }],
          measures: [{ id: 1, text: 'CV ciego en selección' }, { id: 2, text: 'Formación en igualdad' }],
        });
        if (e1) throw e1;

        // Salary audit
        const { data: eqPlan } = await db.from('erp_hr_equality_plans').select('id').eq('company_id', cid).limit(1).single();
        const { error: e1b } = await db.from('erp_hr_salary_audits').insert({
          company_id: cid,
          equality_plan_id: eqPlan?.id,
          audit_year: 2025,
          audit_period: 'annual',
          overall_gap_percentage: 4.2,
          gap_by_category: { directivos: 6.1, mandos: 3.8, empleados: 2.9, operarios: 1.5 },
          status: 'completed',
        });
        if (e1b) throw e1b;

        // Whistleblower reports (3)
        const reports = [
          { company_id: cid, report_code: 'WB-2025-001', category: 'harassment', subcategory: 'verbal', severity: 'high', description: 'Denuncia anónima de comentarios inapropiados en departamento de producción.', status: 'investigating', is_anonymous: true, channel: 'web_form', priority: 'urgent' },
          { company_id: cid, report_code: 'WB-2025-002', category: 'fraud', subcategory: 'expense', severity: 'medium', description: 'Sospecha de gastos de viaje inflados por empleado de comercial.', status: 'received', is_anonymous: true, channel: 'email', priority: 'high' },
          { company_id: cid, report_code: 'WB-2025-003', category: 'safety', subcategory: 'negligence', severity: 'medium', description: 'Incumplimiento de protocolos de seguridad en turno de noche.', status: 'resolved', is_anonymous: false, reporter_id: emps[rnd(0, 10)].id, channel: 'web_form', priority: 'normal', resolution: 'Se verificó y se tomaron medidas correctivas.' },
        ];
        const { error: e2 } = await db.from('erp_hr_whistleblower_reports').insert(reports);
        if (e2) throw e2;

        // Sanction alerts (5)
        const sanctions = [
          { company_id: cid, alert_level: 'high', days_remaining: 15, potential_sanction_min: 626, potential_sanction_max: 6250, title: 'Registro horario incompleto', description: 'Faltan registros de 5 empleados en el mes de febrero. Art. 34.9 ET.', status: 'active', lisos_article: 'Art. 7.5 LISOS' },
          { company_id: cid, alert_level: 'critical', days_remaining: 5, potential_sanction_min: 6251, potential_sanction_max: 187515, title: 'Plan de Igualdad sin registrar', description: 'El plan de igualdad debe registrarse en el REGCON antes de 30 días.', status: 'resolved', lisos_article: 'Art. 8.17 LISOS' },
          { company_id: cid, alert_level: 'medium', days_remaining: 45, potential_sanction_min: 70, potential_sanction_max: 750, title: 'Reconocimientos médicos pendientes', description: '3 empleados de producción sin reconocimiento médico anual.', status: 'active', lisos_article: 'Art. 12.1 LISOS' },
          { company_id: cid, alert_level: 'low', days_remaining: 90, potential_sanction_min: 70, potential_sanction_max: 750, title: 'Formación PRL inicial pendiente', description: 'Nuevo empleado sin formación PRL básica completada.', status: 'active', lisos_article: 'Art. 12.8 LISOS' },
          { company_id: cid, alert_level: 'medium', days_remaining: 30, potential_sanction_min: 626, potential_sanction_max: 6250, title: 'Canal de denuncias sin auditar', description: 'Auditoría anual del canal ético pendiente. Ley 2/2023.', status: 'active', lisos_article: 'Ley 2/2023 Art. 63' },
        ];
        const { error: e3 } = await db.from('erp_hr_sanction_alerts').insert(sanctions);
        if (e3) throw e3;

        // Legal communications (10)
        const commTypes = ['warning','notification','requirement','certificate','communication'];
        const legalComms: any[] = [];
        for (let i = 0; i < 10; i++) {
          legalComms.push({
            company_id: cid,
            employee_id: emps[i % emps.length].id,
            communication_type: pick(commTypes),
            subject: `Comunicación laboral ${i + 1}`,
            content: `Contenido de la comunicación demo ${i + 1}. Generada automáticamente.`,
            status: pick(['sent', 'delivered', 'read', 'draft']),
            sent_at: `2025-${String(rnd(1, 10)).padStart(2, '0')}-${String(rnd(1, 28)).padStart(2, '0')}T10:00:00Z`,
          });
        }
        const { error: e4 } = await db.from('erp_hr_legal_communications').insert(legalComms);
        if (e4) throw e4;

        // Compliance checklist
        const checklistItems = [
          { company_id: cid, item_text: 'Plan de Igualdad registrado (RD 901/2020)', is_mandatory: true, status: 'completed' },
          { company_id: cid, item_text: 'Canal de Denuncias operativo (Ley 2/2023)', is_mandatory: true, status: 'completed' },
          { company_id: cid, item_text: 'Registro horario Art. 34.9 ET', is_mandatory: true, status: 'in_progress' },
          { company_id: cid, item_text: 'Protocolo Acoso Laboral/Sexual', is_mandatory: true, status: 'completed' },
          { company_id: cid, item_text: 'Auditoría Salarial (RD 902/2020)', is_mandatory: true, status: 'completed' },
          { company_id: cid, item_text: 'Política Desconexión Digital (Art. 88 LOPDGDD)', is_mandatory: true, status: 'completed' },
          { company_id: cid, item_text: 'Plan de Prevención Riesgos Laborales', is_mandatory: true, status: 'in_progress' },
          { company_id: cid, item_text: 'Registro Retributivo (RD 902/2020)', is_mandatory: true, status: 'pending' },
        ];
        const { error: e5 } = await db.from('erp_hr_compliance_checklist').insert(checklistItems);
        if (e5) throw e5;

        result = { equalityPlan: 1, salaryAudit: 1, whistleblowerReports: reports.length, sanctionAlerts: sanctions.length, legalCommunications: legalComms.length, complianceChecklist: checklistItems.length };
        break;
      }

      case 'seed_experience': {
        const { data: emps } = await db.from('erp_hr_employees').select('id,first_name,last_name,department_id,hire_date,base_salary,job_title').eq('company_id', cid).eq('status', 'active');
        if (!emps?.length) throw new Error('Run seed_employees first');

        // Onboarding (5 most recent hires)
        const recentHires = emps.filter(e => e.hire_date >= '2024-06-01').slice(0, 5);
        const onboardings: any[] = [];
        for (const emp of recentHires) {
          onboardings.push({
            company_id: cid,
            employee_id: emp.id,
            status: pick(['in_progress', 'completed', 'in_progress']),
            started_at: emp.hire_date + 'T08:00:00Z',
            target_completion_date: new Date(new Date(emp.hire_date).getTime() + 30 * 86400000).toISOString(),
            current_phase: pick(['documentation', 'training', 'integration', 'evaluation']),
            progress_percentage: rnd(30, 95),
            notes: 'Proceso de onboarding generado como demo.',
          });
        }
        const { data: insertedOnboardings, error: e1 } = await db.from('erp_hr_employee_onboarding').insert(onboardings).select('id');
        if (e1) throw e1;

        // Onboarding tasks
        const obTasks: any[] = [];
        const taskTemplates = [
          { code: 'DOC-01', name: 'Firma de contrato', type: 'documentation', phase: 'documentation', order: 1 },
          { code: 'DOC-02', name: 'Alta en Seguridad Social', type: 'documentation', phase: 'documentation', order: 2 },
          { code: 'DOC-03', name: 'Entrega de EPIs', type: 'equipment', phase: 'documentation', order: 3 },
          { code: 'TRN-01', name: 'Formación PRL inicial', type: 'training', phase: 'training', order: 1 },
          { code: 'TRN-02', name: 'Formación RGPD', type: 'training', phase: 'training', order: 2 },
          { code: 'INT-01', name: 'Presentación al equipo', type: 'social', phase: 'integration', order: 1 },
          { code: 'INT-02', name: 'Tour por instalaciones', type: 'orientation', phase: 'integration', order: 2 },
          { code: 'EVL-01', name: 'Evaluación primer mes', type: 'evaluation', phase: 'evaluation', order: 1 },
        ];
        for (const ob of insertedOnboardings!) {
          for (const t of taskTemplates) {
            obTasks.push({
              onboarding_id: ob.id,
              task_code: t.code,
              task_name: t.name,
              task_type: t.type,
              phase: t.phase,
              order_in_phase: t.order,
              responsible_type: 'hr',
              status: pick(['completed', 'completed', 'in_progress', 'pending']),
            });
          }
        }
        const { error: e2 } = await db.from('erp_hr_onboarding_tasks').insert(obTasks);
        if (e2) throw e2;

        // Offboarding (2)
        const offboardingEmps = emps.slice(45, 47);
        const offboardings: any[] = [];
        for (const emp of offboardingEmps) {
          offboardings.push({
            company_id: cid,
            employee_id: emp.id,
            employee_snapshot: { name: `${emp.first_name} ${emp.last_name}`, salary: emp.base_salary, department: emp.department_id },
            termination_type: pick(['voluntary', 'mutual_agreement']),
            termination_date: dateStr(2025, rnd(6, 10), rnd(1, 28)),
            tenure_months: rnd(12, 84),
            final_settlement_amount: rnd(3000, 25000),
            exit_interview_conducted: true,
            exit_interview_data: { reason: 'Mejor oportunidad profesional', satisfaction: 7, recommendations: 'Mejorar plan de carrera' },
            tasks_completed: rnd(5, 10),
            tasks_total: 10,
          });
        }
        const { error: e3 } = await db.from('erp_hr_offboarding_history').insert(offboardings);
        if (e3) throw e3;

        // Recognition programs (2)
        const programs = [
          { company_id: cid, program_name: 'Empleado/a del Mes', program_type: 'peer_to_peer', annual_budget: 6000, currency: 'EUR', min_award_value: 100, max_award_value: 500, requires_approval: true, recognition_categories: [{ name: 'Innovación' }, { name: 'Trabajo en equipo' }, { name: 'Excelencia' }], effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
          { company_id: cid, program_name: 'Programa de Antigüedad', program_type: 'milestone', annual_budget: 12000, currency: 'EUR', min_award_value: 200, max_award_value: 2000, requires_approval: false, recognition_categories: [{ name: '5 años' }, { name: '10 años' }, { name: '15 años' }], effective_from: '2025-01-01', is_active: true, metadata: DEMO_META },
        ];
        const { error: e4 } = await db.from('erp_hr_recognition_programs').insert(programs);
        if (e4) throw e4;

        // Recognitions (20)
        const recognitions: any[] = [];
        const recTypes = ['peer_nomination','manager_award','milestone','spot_bonus'];
        const recCategories = ['Innovación','Trabajo en equipo','Excelencia','Puntualidad','Liderazgo'];
        for (let i = 0; i < 20; i++) {
          recognitions.push({
            company_id: cid,
            recipient_id: emps[i % emps.length].id,
            nominator_id: emps[(i + 5) % emps.length].id,
            recognition_type: pick(recTypes),
            category: pick(recCategories),
            title: `Reconocimiento ${i + 1}: ${pick(recCategories)}`,
            description: `Reconocimiento demo por destacar en ${pick(recCategories).toLowerCase()}.`,
            award_date: dateStr(2025, rnd(1, 10), rnd(1, 28)),
            points_awarded: rnd(50, 500),
            is_public: true,
            status: 'approved',
            metadata: DEMO_META,
          });
        }
        const { error: e5 } = await db.from('erp_hr_recognition').insert(recognitions);
        if (e5) throw e5;

        // SS Contributions (50)
        const ssContributions: any[] = [];
        for (const emp of emps) {
          const salary = Number(emp.base_salary) || 24000;
          const monthlyBase = Math.round(salary / 14 * 100) / 100;
          ssContributions.push({
            company_id: cid,
            employee_id: emp.id,
            period_month: rnd(1, 10),
            period_year: 2025,
            contribution_group: rnd(1, 11),
            base_amount: monthlyBase,
            worker_contribution: Math.round(monthlyBase * 0.0635 * 100) / 100,
            company_contribution: Math.round(monthlyBase * 0.305 * 100) / 100,
            total_contribution: Math.round(monthlyBase * 0.3685 * 100) / 100,
            status: 'calculated',
            metadata: DEMO_META,
          });
        }
        const { error: e6 } = await db.from('erp_hr_ss_contributions').insert(ssContributions);
        if (e6) throw e6;

        result = { onboardings: onboardings.length, onboardingTasks: obTasks.length, offboardings: offboardings.length, programs: programs.length, recognitions: recognitions.length, ssContributions: ssContributions.length };
        break;
      }

      case 'purge_demo': {
        // Delete in reverse order to respect foreign keys
        const tablesWithMetadata = [
          'erp_hr_ss_contributions', 'erp_hr_recognition', 'erp_hr_recognition_programs',
          'erp_hr_employee_documents', 'erp_hr_benefits_enrollments', 'erp_hr_benefits_plans',
          'erp_hr_employee_compensation', 'erp_hr_payrolls', 'erp_hr_employees',
          'erp_hr_departments', 'erp_hr_collective_agreements', 'erp_hr_job_positions',
        ];

        const tablesWithCompanyId = [
          'erp_hr_onboarding_tasks', 'erp_hr_offboarding_tasks',
          'erp_hr_offboarding_history', 'erp_hr_employee_onboarding',
          'erp_hr_compliance_checklist', 'erp_hr_legal_communications',
          'erp_hr_sanction_alerts', 'erp_hr_whistleblower_reports',
          'erp_hr_salary_audits', 'erp_hr_equality_plans',
          'erp_hr_document_templates',
          'erp_hr_interviews', 'erp_hr_candidates', 'erp_hr_job_openings',
          'erp_hr_performance_evaluations', 'erp_hr_evaluation_cycles',
          'erp_hr_training_enrollments', 'erp_hr_training_catalog',
          'erp_hr_leave_balances', 'erp_hr_leave_requests', 'erp_hr_time_entries',
          'erp_hr_disconnection_policies', 'erp_hr_time_policies',
          'erp_hr_safety_incidents', 'erp_hr_contracts',
        ];

        const deletedCounts: Record<string, number> = {};

        // First delete tables with metadata flag
        for (const table of tablesWithMetadata) {
          const { count, error } = await db.from(table).delete({ count: 'exact' }).eq('metadata->>is_demo', 'true');
          if (error) console.error(`Error deleting ${table}:`, error.message);
          else deletedCounts[table] = count || 0;
        }

        // Then delete tables by company_id (all data was seeded)
        for (const table of tablesWithCompanyId) {
          const { count, error } = await db.from(table).delete({ count: 'exact' }).eq('company_id', cid);
          if (error) console.error(`Error deleting ${table}:`, error.message);
          else deletedCounts[table] = count || 0;
        }

        // Delete leave_types (no company_id, delete by code pattern)
        const { count: ltCount } = await db.from('erp_hr_leave_types').delete({ count: 'exact' }).in('code', ['VAC','IT','MAT','AP','PERM','MUD','MAT2','FALL']);
        deletedCounts['erp_hr_leave_types'] = ltCount || 0;

        result = { deletedCounts, totalTablesCleared: Object.keys(deletedCounts).length };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, action, data: result, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-seed-demo-data] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
