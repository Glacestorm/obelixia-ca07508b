import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

// corsHeaders now computed per-request via getSecureCorsHeaders(req)

const SMI_2026 = 1184.00; // SMI 2026 — RD 87/2025, de 11 de febrero. Sin subida publicada para 2026.
const SS_BASE_MAX = 5101.20;
const SS_GROUP_MIN: Record<number, number> = {
  1: 1847.40,  // Ingenieros y Licenciados
  2: 1531.50,  // Ingenieros Técnicos y Peritos
  3: 1332.90,  // Jefes Administrativos y de Taller
  4: 1381.20,  // Ayudantes no titulados
  5: 1381.20,  // Oficiales Administrativos
  6: 1381.20,  // Subalternos
  7: 1381.20,  // Auxiliares Administrativos
  8: 1381.20,  // Oficiales de 1ª y 2ª
  9: 1381.20,  // Oficiales de 3ª y Especialistas
  10: 1381.20, // Peones
  11: 1381.20, // Trabajadores menores de 18 años
};
// Fuente: SMI 2026 (1.184€ × 7/6 = 1.381,33€) · LGSS Art. 147
const SS_EMPLOYEE_RATES = { cc: 4.70, fp: 0.10, mei: 0.15, desempleo_indef: 1.55, desempleo_temp: 1.60 };
const SS_EMPLOYER_RATES = { cc: 23.60, fp: 0.60, mei: 0.75, desempleo_indef: 5.50, desempleo_temp: 6.70, fogasa: 0.20, atep: 1.50 };

function r2(n: number): number { return Math.round(n * 100) / 100; }

interface LegalValidation {
  rule: string; severity: 'error' | 'warning' | 'info'; norm: string; message: string;
}

function calculatePayrollForEmployee(emp: any): { result: any; legalValidations: LegalValidation[] } {
  const validations: LegalValidation[] = [];
  const baseSalary = emp.base_salary ?? 2000;
  const group = emp.cotization_group ?? 7;
  const partTime = emp.part_time_coefficient ?? 1;
  const isTemp = emp.is_temporary ?? false;
  const irpfRate = emp.irpf_rate ?? 15;

  // Gross
  const grossSalary = r2(baseSalary * partTime);

  // SS Bases
  const minBase = r2((SS_GROUP_MIN[group] ?? 1381.20) * partTime);
  const maxBase = r2(SS_BASE_MAX * partTime);
  const baseCC = Math.min(Math.max(grossSalary, minBase), maxBase);
  const prorataExtras = r2(baseSalary * partTime / 2);
  const baseCP = Math.min(Math.max(grossSalary + prorataExtras, minBase), maxBase);

  // SS Employee
  const desempleoRate = isTemp ? SS_EMPLOYEE_RATES.desempleo_temp : SS_EMPLOYEE_RATES.desempleo_indef;
  const ssEmployee = r2(baseCC * SS_EMPLOYEE_RATES.cc / 100 + baseCP * SS_EMPLOYEE_RATES.fp / 100 + baseCC * SS_EMPLOYEE_RATES.mei / 100 + baseCP * desempleoRate / 100);

  // SS Employer
  const desempleoRateEmp = isTemp ? SS_EMPLOYER_RATES.desempleo_temp : SS_EMPLOYER_RATES.desempleo_indef;
  const ssEmployer = r2(baseCC * SS_EMPLOYER_RATES.cc / 100 + baseCP * SS_EMPLOYER_RATES.fp / 100 + baseCC * SS_EMPLOYER_RATES.mei / 100 + baseCP * desempleoRateEmp / 100 + baseCP * SS_EMPLOYER_RATES.fogasa / 100 + baseCP * SS_EMPLOYER_RATES.atep / 100);

  // IRPF
  const effectiveIrpf = Math.max(irpfRate, 2);
  const irpfAmount = r2(grossSalary * effectiveIrpf / 100);

  // Garnishment (pre-calculated from input)
  const garnishment = emp.garnishment_amount ?? 0;

  // Net
  const netSalary = r2(grossSalary - ssEmployee - irpfAmount - garnishment);

  // ─── LEGAL VALIDATIONS ────────────────────────────────────
  const smiProporcional = r2(SMI_2026 * partTime);
  if (netSalary < smiProporcional) {
    validations.push({ rule: 'SMI_VIOLATION', severity: 'error', norm: 'ET Art. 27', message: `Neto (${netSalary}€) < SMI proporcional (${smiProporcional}€)` });
  }
  if (baseCC < minBase * 0.99) {
    validations.push({ rule: 'BASE_MIN_VIOLATION', severity: 'error', norm: 'LGSS Art. 147', message: `Base CC (${baseCC}€) < mínimo grupo ${group} (${minBase}€)` });
  }
  if (irpfRate < 2) {
    validations.push({ rule: 'IRPF_MIN_RATE', severity: 'error', norm: 'RIRPF Art. 86', message: `Tipo IRPF (${irpfRate}%) < mínimo legal (2%)` });
  }
  if (emp.overtime_hours_year > 80) {
    validations.push({ rule: 'OVERTIME_80H', severity: 'warning', norm: 'ET Art. 35', message: `Horas extras acumuladas (${emp.overtime_hours_year}h) > 80h/año` });
  }

  return {
    result: {
      employee_id: emp.id,
      employee_name: emp.full_name ?? emp.id,
      gross_salary: grossSalary,
      base_cc: baseCC,
      base_cp: baseCP,
      ss_employee: ssEmployee,
      ss_employer: ssEmployer,
      irpf_rate: effectiveIrpf,
      irpf_amount: irpfAmount,
      garnishment,
      net_salary: netSalary,
      employer_cost: r2(grossSalary + ssEmployer),
    },
    legalValidations: validations,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getSecureCorsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, company_id, employee_id, period_year, period_month, overrides, employee_ids } = body;

    if (!company_id) throw new Error('company_id required');

    // ─── CALCULATE PAYROLL ──────────────────────────────────
    if (action === 'calculate_payroll') {
      if (!employee_id) throw new Error('employee_id required');

      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .eq('company_id', company_id)
        .single();

      if (!emp) throw new Error('Employee not found');

      const { result, legalValidations } = calculatePayrollForEmployee(emp);

      const hasErrors = legalValidations.some(v => v.severity === 'error');

      if (overrides?.forcedNet) {
        result.net_salary = overrides.forcedNet;
        legalValidations.push({ rule: 'FORCED_NET', severity: 'info', norm: 'Manual override', message: `Neto forzado a ${overrides.forcedNet}€` });
      }

      if (hasErrors && !overrides?.forcedNet) {
        return new Response(JSON.stringify({ success: false, legalValidations, preview: result }), {
          headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      // Save to payroll records
      await supabase.from('hr_payroll_records').upsert({
        company_id,
        employee_id,
        period_year: period_year ?? new Date().getFullYear(),
        period_month: period_month ?? new Date().getMonth() + 1,
        gross_salary: result.gross_salary,
        base_cc: result.base_cc,
        base_cp: result.base_cp,
        ss_employee: result.ss_employee,
        ss_employer: result.ss_employer,
        irpf_rate: result.irpf_rate,
        irpf_amount: result.irpf_amount,
        net_salary: result.net_salary,
        employer_cost: result.employer_cost,
        status: 'calculated',
        calculated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,employee_id,period_year,period_month' });

      await supabase.from('erp_audit_events').insert({
        company_id,
        entity_type: 'hr_payroll_records',
        entity_id: employee_id,
        action: 'CREATE',
        new_value: result,
        legal_basis: 'ET Arts. 26-29 / LGSS Art. 147 / RIRPF Art. 82',
        performed_by: employee_id,
      });

      return new Response(JSON.stringify({ success: true, result, legalValidations }), {
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // ─── VALIDATE ONLY ──────────────────────────────────────
    if (action === 'validate_only') {
      if (!employee_id) throw new Error('employee_id required');

      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .eq('company_id', company_id)
        .single();

      if (!emp) throw new Error('Employee not found');

      const { result, legalValidations } = calculatePayrollForEmployee(emp);

      return new Response(JSON.stringify({ success: true, legalValidations, previewResult: result }), {
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // ─── BATCH VALIDATION ───────────────────────────────────
    if (action === 'get_legal_validations_batch') {
      const ids = employee_ids ?? [];
      let query = supabase.from('erp_hr_employees').select('*').eq('company_id', company_id);
      if (ids.length > 0) query = query.in('id', ids);

      const { data: employees } = await query;

      const validationsByEmployee: Record<string, LegalValidation[]> = {};
      let totalErrors = 0;
      let totalWarnings = 0;

      for (const emp of employees ?? []) {
        const { legalValidations } = calculatePayrollForEmployee(emp);
        validationsByEmployee[emp.id] = legalValidations;
        totalErrors += legalValidations.filter(v => v.severity === 'error').length;
        totalWarnings += legalValidations.filter(v => v.severity === 'warning').length;
      }

      return new Response(JSON.stringify({
        success: true,
        total: (employees ?? []).length,
        errors: totalErrors,
        warnings: totalWarnings,
        validations_by_employee: validationsByEmployee,
      }), {
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
