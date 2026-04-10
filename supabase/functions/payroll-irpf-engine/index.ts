import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { successResponse, mapAuthError, validationError, notFoundError, internalError } from '../_shared/error-contract.ts';

function r2(n: number): number { return Math.round(n * 100) / 100; }

// ─── IRPF SCALE 2025-2026 ────────────────────────────────
const IRPF_SCALE = [
  { from: 0, to: 12450, rate: 19 },
  { from: 12450, to: 20200, rate: 24 },
  { from: 20200, to: 35200, rate: 30 },
  { from: 35200, to: 60000, rate: 37 },
  { from: 60000, to: 300000, rate: 45 },
  { from: 300000, to: Infinity, rate: 47 },
];

function applyScale(base: number): number {
  let tax = 0;
  for (const bracket of IRPF_SCALE) {
    if (base <= bracket.from) break;
    const taxable = Math.min(base, bracket.to) - bracket.from;
    tax += taxable * bracket.rate / 100;
  }
  return r2(tax);
}

// ─── WORK INCOME REDUCTION (RIRPF Art. 80) ──────────────
function workIncomeReduction(grossAnnual: number): number {
  if (grossAnnual <= 14852) return 7302;
  if (grossAnnual <= 17673.52) return r2(7302 - 1.75 * (grossAnnual - 14852));
  if (grossAnnual <= 19747.50) return 2364;
  return 0;
}

// ─── PERSONAL & FAMILY MINIMUMS (LIRPF Arts. 57-61) ─────
function personalFamilyMinimum(data: any): number {
  let min = 5550; // Personal

  const children = data.descendants ?? 0;
  const childAmounts = [2400, 2700, 4000, 4500];
  for (let i = 0; i < children; i++) {
    min += childAmounts[Math.min(i, 3)];
  }

  const childrenUnder3 = data.children_under_3 ?? 0;
  min += childrenUnder3 * 2800;

  const ascendants65 = data.ascendants_over_65 ?? 0;
  min += ascendants65 * 1150;

  const ascendants75 = data.ascendants_over_75 ?? 0;
  min += ascendants75 * (2550 - 1150);

  const disability = data.disability_degree ?? 0;
  if (disability >= 65) min += 9000;
  else if (disability >= 33) min += 3000;

  if (data.geographic_mobility) min += 2000;

  return min;
}

serve(async (req) => {
  const cors = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { action, company_id, employee_id, period_year, period_quarter } = body;

    if (!company_id) return validationError('company_id required', cors);

    const VALID_ACTIONS = ['calculate_rate', 'regularize', 'generate_model_190_data', 'generate_retention_certificate'];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return validationError('Invalid or missing action', cors);
    }

    // --- Auth + tenant membership ---
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) return mapAuthError(authResult, cors);
    const supabase = authResult.userClient;

    // ─── CALCULATE RATE ─────────────────────────────────────
    if (action === 'calculate_rate') {
      if (!employee_id) return validationError('employee_id required', cors);

      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .eq('company_id', company_id)
        .single();

      if (!emp) return notFoundError('Employee', cors);

      const grossAnnual = (emp.base_salary ?? 2000) * 12 * (emp.part_time_coefficient ?? 1);
      const ssAnnual = r2(grossAnnual * 6.45 / 100);
      const reduction = workIncomeReduction(grossAnnual);
      const pensionContrib = emp.pension_contributions ?? 0;
      const taxableBase = Math.max(grossAnnual - ssAnnual - reduction - pensionContrib, 0);
      const pfMin = personalFamilyMinimum(emp);
      const taxOnBase = applyScale(taxableBase);
      const taxOnMinimum = applyScale(pfMin);
      const estimatedTax = Math.max(taxOnBase - taxOnMinimum, 0);

      let retentionRate = grossAnnual > 0 ? r2(estimatedTax / grossAnnual * 100) : 0;
      retentionRate = Math.max(retentionRate, 2);

      if (emp.two_payers && emp.second_payer_amount > 1500) {
        retentionRate = Math.max(retentionRate, 2);
      }

      const monthlyRetention = r2(grossAnnual * retentionRate / 100 / 12);

      await supabase
        .from('erp_hr_employees')
        .update({ irpf_rate: retentionRate })
        .eq('id', employee_id);

      await supabase.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_employees',
        entity_id: employee_id,
        action: 'UPDATE',
        new_value: { irpf_rate: retentionRate },
        legal_basis: 'RIRPF Arts. 82-89 / LIRPF Arts. 57-61',
        performed_by: employee_id,
      });

      return successResponse({
        retention_rate: retentionRate,
        monthly_retention: monthlyRetention,
        breakdown: {
          grossAnnual,
          ssAnnual,
          workIncomeReduction: reduction,
          pensionContributions: pensionContrib,
          personalAllowance: pfMin,
          liquidableIncome: taxableBase,
          estimatedTax,
        },
      }, cors);
    }

    // ─── REGULARIZE ─────────────────────────────────────────
    if (action === 'regularize') {
      if (!employee_id) return validationError('employee_id required', cors);

      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .eq('company_id', company_id)
        .single();

      if (!emp) return notFoundError('Employee', cors);

      const year = period_year ?? new Date().getFullYear();
      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('gross_salary, irpf_amount')
        .eq('employee_id', employee_id)
        .eq('period_year', year);

      const grossAccumulated = (records ?? []).reduce((s, r) => s + (r.gross_salary ?? 0), 0);
      const irpfAccumulated = (records ?? []).reduce((s, r) => s + (r.irpf_amount ?? 0), 0);
      const monthsWorked = (records ?? []).length;
      const monthsRemaining = Math.max(12 - monthsWorked, 1);

      const grossAnnualProjected = grossAccumulated + (emp.base_salary ?? 2000) * (emp.part_time_coefficient ?? 1) * monthsRemaining;
      const ssAnnual = r2(grossAnnualProjected * 6.45 / 100);
      const reduction = workIncomeReduction(grossAnnualProjected);
      const taxableBase = Math.max(grossAnnualProjected - ssAnnual - reduction, 0);
      const pfMin = personalFamilyMinimum(emp);
      const idealTax = Math.max(applyScale(taxableBase) - applyScale(pfMin), 0);
      const remainingTax = Math.max(idealTax - irpfAccumulated, 0);
      const newRate = Math.max(r2(remainingTax / ((emp.base_salary ?? 2000) * (emp.part_time_coefficient ?? 1) * monthsRemaining) * 100), 2);

      const oldRate = emp.irpf_rate ?? 15;

      await supabase
        .from('erp_hr_employees')
        .update({ irpf_rate: newRate })
        .eq('id', employee_id);

      await supabase.from('erp_audit_events').insert({
        company_id,
        entity_type: 'erp_hr_employees',
        entity_id: employee_id,
        action: 'UPDATE',
        new_value: { old_rate: oldRate, new_rate: newRate },
        legal_basis: 'RIRPF Art. 88',
        performed_by: employee_id,
      });

      return successResponse({
        old_rate: oldRate,
        new_rate: newRate,
        adjustment: r2(newRate - oldRate),
        months_remaining: monthsRemaining,
      }, cors);
    }

    // ─── GENERATE MODEL 190 DATA ────────────────────────────
    if (action === 'generate_model_190_data') {
      const year = period_year ?? new Date().getFullYear();

      const { data: employees } = await supabase
        .from('erp_hr_employees')
        .select('id, full_name, naf, nif_nie')
        .eq('company_id', company_id)
        .eq('status', 'active');

      const perceptors = [];
      for (const emp of employees ?? []) {
        const { data: records } = await supabase
          .from('hr_payroll_records')
          .select('gross_salary, irpf_amount')
          .eq('employee_id', emp.id)
          .eq('period_year', year);

        const totalGross = (records ?? []).reduce((s, r) => s + (r.gross_salary ?? 0), 0);
        const totalIrpf = (records ?? []).reduce((s, r) => s + (r.irpf_amount ?? 0), 0);

        perceptors.push({
          naf: emp.naf,
          nif: emp.nif_nie,
          nombre: emp.full_name,
          clave: 'A',
          base: r2(totalGross),
          retenciones: r2(totalIrpf),
          ingresos_cuenta: r2(totalGross - totalIrpf),
        });
      }

      await supabase.from('erp_hr_generated_files').insert({
        company_id,
        file_type: 'MODELO_190',
        period_year: year,
        status: 'generated',
        metadata: { perceptor_count: perceptors.length },
        generated_at: new Date().toISOString(),
      });

      return successResponse({ perceptors, year }, cors);
    }

    // ─── GENERATE RETENTION CERTIFICATE ─────────────────────
    if (action === 'generate_retention_certificate') {
      if (!employee_id) return validationError('employee_id required', cors);
      const year = period_year ?? new Date().getFullYear();

      const { data: emp } = await supabase
        .from('erp_hr_employees')
        .select('*')
        .eq('id', employee_id)
        .single();

      const { data: records } = await supabase
        .from('hr_payroll_records')
        .select('gross_salary, irpf_amount')
        .eq('employee_id', employee_id)
        .eq('period_year', year);

      const totalRetributed = r2((records ?? []).reduce((s, r) => s + (r.gross_salary ?? 0), 0));
      const totalRetained = r2((records ?? []).reduce((s, r) => s + (r.irpf_amount ?? 0), 0));

      const { data: file } = await supabase
        .from('erp_hr_generated_files')
        .insert({
          company_id,
          file_type: 'CERT_RETENCIONES',
          period_year: year,
          status: 'generated',
          metadata: { employee_id, total_retributed: totalRetributed, total_retained: totalRetained },
          generated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      return successResponse({
        certificate_data: {
          employee: emp?.full_name,
          nif: emp?.nif_nie,
          year,
          total_retributed: totalRetributed,
          total_retained: totalRetained,
        },
        file_id: file?.id,
      }, cors);
    }

    return validationError(`Unknown action: ${action}`, cors);
  } catch (error) {
    console.error('[payroll-irpf-engine] Error:', error);
    return internalError(cors);
  }
});
