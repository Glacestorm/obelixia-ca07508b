/**
 * Edge Function: ERP HR Payroll Recalculation Engine
 * 
 * Motor inteligente de recálculo de nóminas con cumplimiento de convenios colectivos.
 * Verifica salarios mínimos, aplica conceptos obligatorios, calcula cotizaciones SS/IRPF,
 * y detecta incumplimientos para validación por IA y Agente Jurídico.
 * 
 * @module erp-hr-payroll-recalculation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TIPOS ============

interface RecalculationRequest {
  action: 
    | 'recalculate_single'
    | 'recalculate_batch'
    | 'validate_agreement_compliance'
    | 'get_agreement_concepts'
    | 'request_ai_validation'
    | 'request_legal_validation'
    | 'approve_recalculation'
    | 'reject_recalculation';
  employee_id?: string;
  employee_ids?: string[];
  company_id: string;
  period: string; // YYYY-MM
  recalculation_id?: string;
  notes?: string;
}

interface SalaryBreakdown {
  base_salary: number;
  seniority_bonus: number;
  agreement_bonus: number;
  transport_bonus: number;
  night_shift_bonus: number;
  hazard_bonus: number;
  other_earnings: number;
  gross_salary: number;
  // Deducciones
  ss_employee: number;
  irpf: number;
  other_deductions: number;
  net_salary: number;
  // Costes empresa
  ss_employer: number;
  total_cost: number;
}

interface ComplianceIssue {
  code: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  expected_value: number | string;
  actual_value: number | string;
  recommendation: string;
}

interface RecalculationResult {
  employee_id: string;
  employee_name: string;
  period: string;
  agreement_code: string;
  agreement_name: string;
  original_values: SalaryBreakdown;
  recalculated_values: SalaryBreakdown;
  differences: Array<{
    concept: string;
    original: number;
    recalculated: number;
    difference: number;
  }>;
  compliance_issues: ComplianceIssue[];
  requires_legal_review: boolean;
  risk_level: 'high' | 'medium' | 'low' | 'none';
}

// ============ CONSTANTES SS 2026 ============

const SS_RATES_2026 = {
  // Contingencias Comunes
  cc_employer: 0.2360,
  cc_employee: 0.0470,
  // Desempleo (contrato indefinido)
  unemployment_employer_indefinite: 0.0550,
  unemployment_employee_indefinite: 0.0155,
  // Desempleo (contrato temporal)
  unemployment_employer_temporary: 0.0690,
  unemployment_employee_temporary: 0.0160,
  // FOGASA
  fogasa: 0.0020,
  // Formación Profesional
  fp_employer: 0.0060,
  fp_employee: 0.0010,
  // MEI (Mecanismo de Equidad Intergeneracional)
  mei_employer: 0.0058,
  mei_employee: 0.0012,
  // Bases mínima y máxima
  base_min_monthly: 1260.00, // SMI 2026 estimado
  base_max_monthly: 4720.50,
};

// ============ HELPERS ============

function calculateSeniority(hireDate: string): { years: number; months: number } {
  const hire = new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return { years, months };
}

function calculateSeniorityBonus(
  baseSalary: number,
  hireDate: string,
  seniorityRules: Record<string, unknown> | null
): number {
  if (!seniorityRules) return 0;
  
  const seniority = calculateSeniority(hireDate);
  const rules = seniorityRules as {
    type?: string;
    percentage_per_year?: number;
    fixed_per_year?: number;
    max_years?: number;
    trienniums?: { amount: number };
    quinquenniums?: { amount: number };
  };
  
  const yearsApplicable = Math.min(seniority.years, rules.max_years || 999);
  
  switch (rules.type) {
    case 'percentage':
      return baseSalary * (rules.percentage_per_year || 0) * yearsApplicable;
    case 'fixed':
      return (rules.fixed_per_year || 0) * yearsApplicable;
    case 'trienniums':
      const trienniums = Math.floor(yearsApplicable / 3);
      return trienniums * (rules.trienniums?.amount || 0);
    case 'quinquenniums':
      const quinquenniums = Math.floor(yearsApplicable / 5);
      return quinquenniums * (rules.quinquenniums?.amount || 0);
    default:
      return 0;
  }
}

function calculateSSContributions(
  grossSalary: number,
  contractType: string,
  extraPaymentsProrated: boolean
): { employer: number; employee: number } {
  // Ajustar base si las pagas están prorrateadas
  const base = Math.max(
    SS_RATES_2026.base_min_monthly,
    Math.min(grossSalary, SS_RATES_2026.base_max_monthly)
  );
  
  const isTemporary = contractType?.toLowerCase().includes('temporal') || 
                      contractType?.toLowerCase().includes('temporary');
  
  // Calcular cotizaciones empresa
  const employer = base * (
    SS_RATES_2026.cc_employer +
    (isTemporary ? SS_RATES_2026.unemployment_employer_temporary : SS_RATES_2026.unemployment_employer_indefinite) +
    SS_RATES_2026.fogasa +
    SS_RATES_2026.fp_employer +
    SS_RATES_2026.mei_employer
  );
  
  // Calcular cotizaciones empleado
  const employee = base * (
    SS_RATES_2026.cc_employee +
    (isTemporary ? SS_RATES_2026.unemployment_employee_temporary : SS_RATES_2026.unemployment_employee_indefinite) +
    SS_RATES_2026.fp_employee +
    SS_RATES_2026.mei_employee
  );
  
  return {
    employer: Math.round(employer * 100) / 100,
    employee: Math.round(employee * 100) / 100
  };
}

function estimateIRPF(
  annualGross: number,
  personalSituation: Record<string, unknown> | null
): number {
  // Tabla IRPF simplificada 2026
  const brackets = [
    { limit: 12450, rate: 0.19 },
    { limit: 20200, rate: 0.24 },
    { limit: 35200, rate: 0.30 },
    { limit: 60000, rate: 0.37 },
    { limit: 300000, rate: 0.45 },
    { limit: Infinity, rate: 0.47 },
  ];
  
  // Mínimo personal (simplificado)
  let minPersonal = 5550;
  const situation = personalSituation as {
    children?: number;
    disability?: boolean;
    single_parent?: boolean;
  } | null;
  
  if (situation?.children) {
    minPersonal += situation.children * 2400;
  }
  if (situation?.disability) {
    minPersonal += 3000;
  }
  
  const taxableBase = Math.max(0, annualGross - minPersonal);
  
  let tax = 0;
  let remaining = taxableBase;
  let prevLimit = 0;
  
  for (const bracket of brackets) {
    const taxableInBracket = Math.min(remaining, bracket.limit - prevLimit);
    if (taxableInBracket <= 0) break;
    
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    prevLimit = bracket.limit;
  }
  
  // Devolver tipo mensual
  return Math.round((tax / annualGross) * 10000) / 100; // Porcentaje con 2 decimales
}

function detectComplianceIssues(
  original: SalaryBreakdown,
  recalculated: SalaryBreakdown,
  agreement: Record<string, unknown>,
  employee: Record<string, unknown>
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  
  // 1. Verificar salario mínimo por categoría
  const salaryTables = agreement.salary_tables as Record<string, { base_salary: number }> | null;
  const category = employee.professional_category as string;
  const minSalaryCategory = salaryTables?.[category]?.base_salary || SS_RATES_2026.base_min_monthly;
  
  if (original.base_salary < minSalaryCategory) {
    issues.push({
      code: 'SALARY_BELOW_AGREEMENT',
      severity: 'high',
      description: `El salario base está por debajo del mínimo establecido en el convenio para la categoría ${category}`,
      expected_value: minSalaryCategory,
      actual_value: original.base_salary,
      recommendation: `Incrementar salario base a mínimo ${minSalaryCategory.toFixed(2)}€ según convenio`
    });
  }
  
  // 2. Verificar plus de antigüedad
  if (recalculated.seniority_bonus > 0 && original.seniority_bonus === 0) {
    issues.push({
      code: 'SENIORITY_NOT_APPLIED',
      severity: 'medium',
      description: 'El plus de antigüedad no está siendo aplicado según las reglas del convenio',
      expected_value: recalculated.seniority_bonus,
      actual_value: original.seniority_bonus,
      recommendation: `Aplicar plus de antigüedad de ${recalculated.seniority_bonus.toFixed(2)}€`
    });
  }
  
  // 3. Verificar plus de convenio
  if (recalculated.agreement_bonus > 0 && original.agreement_bonus === 0) {
    issues.push({
      code: 'AGREEMENT_BONUS_MISSING',
      severity: 'medium',
      description: 'El plus de convenio obligatorio no está incluido en la nómina',
      expected_value: recalculated.agreement_bonus,
      actual_value: original.agreement_bonus,
      recommendation: `Incluir plus de convenio de ${recalculated.agreement_bonus.toFixed(2)}€`
    });
  }
  
  // 4. Verificar cotizaciones SS
  const ssDiff = Math.abs(original.ss_employee - recalculated.ss_employee);
  if (ssDiff > 1) { // Tolerancia de 1€
    issues.push({
      code: 'SS_CONTRIBUTION_INCORRECT',
      severity: 'high',
      description: 'La cotización a la Seguridad Social no coincide con los tipos vigentes',
      expected_value: recalculated.ss_employee,
      actual_value: original.ss_employee,
      recommendation: 'Recalcular cotizaciones SS con tipos actualizados 2026'
    });
  }
  
  // 5. Verificar IRPF desactualizado
  const irpfDiff = Math.abs(original.irpf - recalculated.irpf);
  if (irpfDiff > 5) { // Tolerancia de 5€
    issues.push({
      code: 'IRPF_OUTDATED',
      severity: 'low',
      description: 'El tipo de IRPF aplicado puede estar desactualizado',
      expected_value: recalculated.irpf,
      actual_value: original.irpf,
      recommendation: 'Revisar situación personal del empleado y recalcular IRPF'
    });
  }
  
  return issues;
}

function calculateRiskLevel(issues: ComplianceIssue[]): 'high' | 'medium' | 'low' | 'none' {
  if (issues.some(i => i.severity === 'high')) return 'high';
  if (issues.some(i => i.severity === 'medium')) return 'medium';
  if (issues.some(i => i.severity === 'low')) return 'low';
  return 'none';
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const request: RecalculationRequest = await req.json();
    const { action, company_id, period } = request;

    console.log(`[erp-hr-payroll-recalculation] Action: ${action}, Company: ${company_id}, Period: ${period}`);

    // ============ ACTIONS ============

    switch (action) {
      case 'recalculate_single': {
        const { employee_id } = request;
        if (!employee_id) {
          throw new Error('employee_id is required');
        }

        // 1. Obtener datos del empleado
        const { data: employee, error: empError } = await supabase
          .from('erp_hr_employees')
          .select(`
            id, full_name, hire_date, professional_category,
            base_salary, department_id, position_id, work_schedule,
            personal_irpf_data
          `)
          .eq('id', employee_id)
          .eq('company_id', company_id)
          .single();

        if (empError || !employee) {
          throw new Error(`Employee not found: ${empError?.message}`);
        }

        // 2. Obtener contrato activo con convenio
        const { data: contract, error: contractError } = await supabase
          .from('erp_hr_contracts')
          .select(`
            id, contract_type, start_date, collective_agreement_id,
            erp_hr_collective_agreements (
              id, code, name, salary_tables, seniority_rules,
              extra_payments, working_hours_week, other_concepts
            )
          `)
          .eq('employee_id', employee_id)
          .eq('status', 'active')
          .single();

        if (contractError || !contract) {
          throw new Error(`Active contract not found: ${contractError?.message}`);
        }

        // Handle the agreement - it could be an array or single object from the join
        const agreementData = contract.erp_hr_collective_agreements;
        const agreement = (Array.isArray(agreementData) ? agreementData[0] : agreementData) as Record<string, unknown> | null;
        if (!agreement) {
          throw new Error('No collective agreement assigned to contract');
        }

        // 3. Obtener nómina actual del período
        const { data: currentPayroll } = await supabase
          .from('erp_hr_payroll_entries')
          .select('*')
          .eq('employee_id', employee_id)
          .eq('period', period)
          .single();

        // 4. Calcular valores originales (de la nómina actual o del empleado)
        const originalValues: SalaryBreakdown = {
          base_salary: currentPayroll?.base_salary || employee.base_salary || 0,
          seniority_bonus: currentPayroll?.seniority_bonus || 0,
          agreement_bonus: currentPayroll?.agreement_bonus || 0,
          transport_bonus: currentPayroll?.transport_bonus || 0,
          night_shift_bonus: currentPayroll?.night_shift_bonus || 0,
          hazard_bonus: currentPayroll?.hazard_bonus || 0,
          other_earnings: currentPayroll?.other_earnings || 0,
          gross_salary: currentPayroll?.gross_salary || 0,
          ss_employee: currentPayroll?.ss_employee || 0,
          irpf: currentPayroll?.irpf_amount || 0,
          other_deductions: currentPayroll?.other_deductions || 0,
          net_salary: currentPayroll?.net_salary || 0,
          ss_employer: currentPayroll?.ss_employer || 0,
          total_cost: currentPayroll?.total_cost || 0,
        };

        // 5. Recalcular según convenio
        const salaryTables = agreement.salary_tables as Record<string, { base_salary: number }> | null;
        const category = employee.professional_category as string;
        const minBaseSalary = salaryTables?.[category]?.base_salary || employee.base_salary;
        
        const seniorityBonus = calculateSeniorityBonus(
          minBaseSalary,
          employee.hire_date,
          agreement.seniority_rules as Record<string, unknown>
        );
        
        // Plus de convenio y otros conceptos obligatorios
        const otherConcepts = agreement.other_concepts as Record<string, { amount?: number; mandatory?: boolean }> | null;
        let agreementBonus = 0;
        let transportBonus = 0;
        let hazardBonus = 0;
        
        if (otherConcepts) {
          if (otherConcepts.plus_convenio?.mandatory) {
            agreementBonus = otherConcepts.plus_convenio.amount || 0;
          }
          if (otherConcepts.plus_transporte?.mandatory) {
            transportBonus = otherConcepts.plus_transporte.amount || 0;
          }
          if (otherConcepts.plus_peligrosidad?.mandatory) {
            hazardBonus = otherConcepts.plus_peligrosidad.amount || 0;
          }
        }
        
        const grossSalary = minBaseSalary + seniorityBonus + agreementBonus + 
                          transportBonus + hazardBonus + originalValues.night_shift_bonus;
        
        // Cotizaciones SS
        const ssContributions = calculateSSContributions(
          grossSalary,
          contract.contract_type,
          true // Pagas prorrateadas
        );
        
        // IRPF
        const extraPayments = (agreement.extra_payments as number) || 14;
        const annualGross = grossSalary * extraPayments;
        const irpfRate = estimateIRPF(annualGross, employee.personal_irpf_data as Record<string, unknown>);
        const irpfAmount = Math.round(grossSalary * (irpfRate / 100) * 100) / 100;
        
        const netSalary = grossSalary - ssContributions.employee - irpfAmount - originalValues.other_deductions;
        const totalCost = grossSalary + ssContributions.employer;

        const recalculatedValues: SalaryBreakdown = {
          base_salary: minBaseSalary,
          seniority_bonus: seniorityBonus,
          agreement_bonus: agreementBonus,
          transport_bonus: transportBonus,
          night_shift_bonus: originalValues.night_shift_bonus,
          hazard_bonus: hazardBonus,
          other_earnings: originalValues.other_earnings,
          gross_salary: grossSalary,
          ss_employee: ssContributions.employee,
          irpf: irpfAmount,
          other_deductions: originalValues.other_deductions,
          net_salary: netSalary,
          ss_employer: ssContributions.employer,
          total_cost: totalCost,
        };

        // 6. Calcular diferencias
        const differences = [];
        const concepts = Object.keys(originalValues) as (keyof SalaryBreakdown)[];
        for (const concept of concepts) {
          const original = originalValues[concept];
          const recalculated = recalculatedValues[concept];
          if (Math.abs(original - recalculated) > 0.01) {
            differences.push({
              concept,
              original,
              recalculated,
              difference: recalculated - original
            });
          }
        }

        // 7. Detectar incumplimientos
        const complianceIssues = detectComplianceIssues(
          originalValues,
          recalculatedValues,
          agreement,
          employee
        );

        const riskLevel = calculateRiskLevel(complianceIssues);
        const requiresLegalReview = riskLevel === 'high' || riskLevel === 'medium';

        // 8. Guardar recálculo
        const { data: savedRecalc, error: saveError } = await supabase
          .from('erp_hr_payroll_recalculations')
          .insert({
            payroll_id: currentPayroll?.id,
            employee_id,
            company_id,
            period,
            original_values: originalValues,
            recalculated_values: recalculatedValues,
            differences,
            compliance_issues: complianceIssues,
            status: 'draft',
            ai_validation: null,
            legal_validation: null,
            legal_validation_status: requiresLegalReview ? 'pending' : null,
            hr_approval: null,
            hr_approval_status: 'pending'
          })
          .select()
          .single();

        if (saveError) {
          console.error('[erp-hr-payroll-recalculation] Save error:', saveError);
        }

        const result: RecalculationResult = {
          employee_id,
          employee_name: employee.full_name,
          period,
          agreement_code: agreement.code as string,
          agreement_name: agreement.name as string,
          original_values: originalValues,
          recalculated_values: recalculatedValues,
          differences,
          compliance_issues: complianceIssues,
          requires_legal_review: requiresLegalReview,
          risk_level: riskLevel
        };

        return new Response(
          JSON.stringify({
            success: true,
            data: result,
            recalculation_id: savedRecalc?.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'recalculate_batch': {
        const { employee_ids } = request;
        
        // Obtener empleados activos si no se especifican IDs
        let targetEmployees: string[] = employee_ids || [];
        
        if (!targetEmployees.length) {
          const { data: employees } = await supabase
            .from('erp_hr_employees')
            .select('id')
            .eq('company_id', company_id)
            .eq('is_active', true)
            .limit(50); // Límite de batch
          
          targetEmployees = employees?.map(e => e.id) || [];
        }

        // Procesar en paralelo (máximo 10 simultáneos)
        const results: RecalculationResult[] = [];
        const batchSize = 10;
        
        for (let i = 0; i < targetEmployees.length; i += batchSize) {
          const batch = targetEmployees.slice(i, i + batchSize);
          
          // Hacer llamadas recursivas a esta misma función
          const batchResults = await Promise.all(
            batch.map(async (empId) => {
              try {
                const { data } = await supabase.functions.invoke('erp-hr-payroll-recalculation', {
                  body: {
                    action: 'recalculate_single',
                    employee_id: empId,
                    company_id,
                    period
                  }
                });
                return data?.data;
              } catch (error) {
                console.error(`[Batch] Error for employee ${empId}:`, error);
                return null;
              }
            })
          );
          
          results.push(...batchResults.filter(Boolean));
        }

        // Resumen
        const summary = {
          total_processed: results.length,
          with_issues: results.filter(r => r.compliance_issues.length > 0).length,
          high_risk: results.filter(r => r.risk_level === 'high').length,
          medium_risk: results.filter(r => r.risk_level === 'medium').length,
          requires_legal: results.filter(r => r.requires_legal_review).length,
          total_difference: results.reduce((sum, r) => {
            const netDiff = r.differences.find(d => d.concept === 'net_salary');
            return sum + (netDiff?.difference || 0);
          }, 0)
        };

        return new Response(
          JSON.stringify({ success: true, data: { results, summary } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_agreement_concepts': {
        const { data: concepts } = await supabase
          .from('erp_hr_agreement_salary_concepts')
          .select('*')
          .eq('is_active', true)
          .order('concept_name');

        return new Response(
          JSON.stringify({ success: true, data: concepts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'request_ai_validation': {
        const { recalculation_id } = request;
        
        // Obtener recálculo
        const { data: recalc } = await supabase
          .from('erp_hr_payroll_recalculations')
          .select('*')
          .eq('id', recalculation_id)
          .single();

        if (!recalc) {
          throw new Error('Recalculation not found');
        }

        // Llamar al agente HR para validación
        const { data: aiValidation, error: aiError } = await supabase.functions.invoke('erp-hr-ai-agent', {
          body: {
            action: 'validate_payroll_recalculation',
            recalculation: recalc,
            company_id
          }
        });

        // Actualizar con resultado de IA
        await supabase
          .from('erp_hr_payroll_recalculations')
          .update({
            ai_validation: aiValidation?.data || { error: aiError?.message },
            status: 'ai_reviewed'
          })
          .eq('id', recalculation_id);

        return new Response(
          JSON.stringify({ success: true, data: aiValidation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'request_legal_validation': {
        const { recalculation_id } = request;
        
        // Obtener recálculo con datos del empleado y convenio
        const { data: recalc } = await supabase
          .from('erp_hr_payroll_recalculations')
          .select(`
            *,
            erp_hr_employees!employee_id (
              id, full_name, professional_category
            )
          `)
          .eq('id', recalculation_id)
          .single();

        if (!recalc) {
          throw new Error('Recalculation not found');
        }

        // Llamar al agente jurídico para validación
        const { data: legalValidation, error: legalError } = await supabase.functions.invoke('legal-ai-advisor', {
          body: {
            action: 'validate_action',
            validation_type: 'payroll_recalculation',
            context: {
              recalculation: recalc,
              jurisdiction: 'ES',
              risk_level: recalc.compliance_issues?.length > 0 ? 'high' : 'medium'
            }
          }
        });

        // Actualizar con resultado legal
        await supabase
          .from('erp_hr_payroll_recalculations')
          .update({
            legal_validation: legalValidation?.data || { error: legalError?.message },
            legal_validation_status: legalValidation?.data?.approved ? 'approved' : 'pending',
            status: 'legal_reviewed'
          })
          .eq('id', recalculation_id);

        return new Response(
          JSON.stringify({ success: true, data: legalValidation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'approve_recalculation': {
        const { recalculation_id, notes } = request;

        await supabase
          .from('erp_hr_payroll_recalculations')
          .update({
            hr_approval: {
              approved: true,
              approved_at: new Date().toISOString(),
              approved_by: userId,
              notes
            },
            hr_approval_status: 'approved',
            hr_approver_id: userId,
            approved_at: new Date().toISOString(),
            status: 'approved'
          })
          .eq('id', recalculation_id);

        return new Response(
          JSON.stringify({ success: true, message: 'Recálculo aprobado correctamente' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reject_recalculation': {
        const { recalculation_id, notes } = request;

        await supabase
          .from('erp_hr_payroll_recalculations')
          .update({
            hr_approval: {
              approved: false,
              rejected_at: new Date().toISOString(),
              rejected_by: userId,
              notes
            },
            hr_approval_status: 'rejected',
            hr_approver_id: userId,
            status: 'rejected',
            notes
          })
          .eq('id', recalculation_id);

        return new Response(
          JSON.stringify({ success: true, message: 'Recálculo rechazado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[erp-hr-payroll-recalculation] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
