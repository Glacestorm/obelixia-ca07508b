import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { successResponse, mapAuthError, validationError, notFoundError, internalError, errorResponse } from '../_shared/error-contract.ts';

// corsHeaders now computed per-request via getSecureCorsHeaders(req)

// ────────────────────────────────────────────────────────────────────────────
// SHARED LEGAL CORE MIRROR — Canonical 2026 values
// SOURCE OF TRUTH: src/shared/legal/rules/ssRules2026.ts + src/shared/legal/rules/smiRules.ts
// Fuentes oficiales:
//   · SMI 2026 — RD 87/2025 (sin subida publicada → 1.184 €/mes)
//   · Bases SS 2026 — Orden PJC/297/2026 + RDL 3/2026 (LGSS Art. 147-148)
// IMPORTANT: Deno edge functions cannot import @/shared/* directly.
// Any change to ssRules2026.ts MUST be mirrored here in the same commit.
// ────────────────────────────────────────────────────────────────────────────
const SMI_2026 = 1184.00;
const SS_BASE_MAX = 5101.20;
const SS_GROUP_MIN: Record<number, number> = {
  1: 1989.30,  // Ingenieros, Licenciados y Personal de alta dirección
  2: 1649.70,  // Ingenieros técnicos, Peritos y Ayudantes titulados
  3: 1435.20,  // Jefes Administrativos y de Taller
  4: 1424.40,  // Ayudantes no titulados
  5: 1424.40,  // Oficiales Administrativos
  6: 1424.40,  // Subalternos
  7: 1424.40,  // Auxiliares Administrativos
  8: 1424.40,  // Oficiales de 1ª y 2ª (equivalente mensual de 47.48 €/día)
  9: 1424.40,  // Oficiales de 3ª y Especialistas
  10: 1424.40, // Peones
  11: 1424.40, // Trabajadores menores de 18 años
};
// Tipos cotización 2026 — RDL 3/2026 (canonical, alineado con SS_CONTRIBUTION_RATES_2026)
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
  const cors = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { action, company_id, employee_id, period_year, period_month, overrides, employee_ids } = body;

    if (!company_id) return validationError('company_id required', cors);
    if (!action) return validationError('action required', cors);

    // --- AUTH + TENANT via shared utility ---
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) return mapAuthError(authResult, cors);
    const { userClient } = authResult;

    // ─── CALCULATE PAYROLL ──────────────────────────────────
    if (action === 'calculate_payroll') {
      if (!employee_id) return validationError('employee_id required', cors);

      const { data: emp } = await userClient
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .eq('company_id', company_id)
        .single();

      if (!emp) return notFoundError('Employee', cors);

      const { result, legalValidations } = calculatePayrollForEmployee(emp);

      const hasErrors = legalValidations.some(v => v.severity === 'error');

      if (overrides?.forcedNet) {
        result.net_salary = overrides.forcedNet;
        legalValidations.push({ rule: 'FORCED_NET', severity: 'info', norm: 'Manual override', message: `Neto forzado a ${overrides.forcedNet}€` });
      }

      if (hasErrors && !overrides?.forcedNet) {
        return errorResponse('BUSINESS_RULE_VIOLATION', 'Legal validations failed', 422, cors);
      }

      await userClient.from('hr_payroll_records').upsert({
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

      await userClient.from('erp_audit_events').insert({
        company_id,
        entity_type: 'hr_payroll_records',
        entity_id: employee_id,
        action: 'CREATE',
        new_value: result,
        legal_basis: 'ET Arts. 26-29 / LGSS Art. 147 / RIRPF Art. 82',
        performed_by: employee_id,
      });

      return successResponse({ result, legalValidations }, cors);
    }

    // ─── VALIDATE ONLY ──────────────────────────────────────
    if (action === 'validate_only') {
      if (!employee_id) return validationError('employee_id required', cors);

      const { data: emp } = await userClient
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .eq('company_id', company_id)
        .single();

      if (!emp) return notFoundError('Employee', cors);

      const { result, legalValidations } = calculatePayrollForEmployee(emp);

      return successResponse({ legalValidations, previewResult: result }, cors);
    }

    // ─── BATCH VALIDATION ───────────────────────────────────
    if (action === 'get_legal_validations_batch') {
      const ids = employee_ids ?? [];
      let query = userClient.from('erp_hr_employees').select('*').eq('company_id', company_id);
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

      return successResponse({
        total: (employees ?? []).length,
        errors: totalErrors,
        warnings: totalWarnings,
        validations_by_employee: validationsByEmployee,
      }, cors);
    }

    return validationError(`Unknown action: ${action}`, cors);
  } catch (error) {
    console.error('[payroll-calculation-engine] Error:', error);
    return internalError(cors);
  }
});
