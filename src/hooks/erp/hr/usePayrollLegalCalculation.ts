/**
 * usePayrollLegalCalculation — V2-RRHH-P1
 * Hook that connects SS + IRPF engines to real employee/payroll data.
 *
 * Fetches:
 *  - Employee ES labor data (grupo cotización, situación familiar, etc.)
 *  - SS bases/rates from hr_es_ss_bases
 *  - IRPF tramos from hr_es_irpf_tables
 *  - Payroll lines for the period
 *
 * Produces:
 *  - Per-employee SS contribution breakdown
 *  - Per-employee IRPF calculation
 *  - Payslip data structure
 *  - Legal pre-close validations
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  computeSSContributions,
  mapLinesToSSInput,
  type SSGroupLimits,
  type SSEmployeeContext,
  type SSContributionBreakdown,
} from '@/engines/erp/hr/ssContributionEngine';
import {
  computeIRPF,
  buildIRPFInputFromLaborData,
  checkIRPFDataCompleteness,
  type IRPFTramo,
  type IRPFCalculationResult,
} from '@/engines/erp/hr/irpfEngine';
import {
  buildPayslip,
  validateLegalPreClose,
  type PayslipData,
  type PayslipLineInput,
  type LegalPreCloseCheck,
  type LegalPreCloseEmployee,
} from '@/engines/erp/hr/payslipEngine';

// ── Types ──

export interface EmployeeLegalCalcResult {
  employeeId: string;
  employeeName: string;
  ss: SSContributionBreakdown;
  irpf: IRPFCalculationResult;
  payslip: PayslipData;
}

export interface LegalCalculationSummary {
  totalEmployees: number;
  calculated: number;
  skipped: number;
  errors: string[];
  results: EmployeeLegalCalcResult[];
  preCloseChecks: LegalPreCloseCheck[];
  calculatedAt: string;
}

// ── Hook ──

export function usePayrollLegalCalculation(companyId: string) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastResult, setLastResult] = useState<LegalCalculationSummary | null>(null);

  /**
   * Calculate SS + IRPF for all employees in a payroll period.
   * Uses real data from hr_es_ss_bases, hr_es_irpf_tables, hr_es_employee_labor_data.
   */
  const calculateForPeriod = useCallback(async (
    periodId: string,
    periodYear: number,
    periodMonth: number,
    periodName: string,
    periodStartDate: string,
    periodEndDate: string,
  ): Promise<LegalCalculationSummary | null> => {
    setIsCalculating(true);
    const errors: string[] = [];
    const results: EmployeeLegalCalcResult[] = [];

    try {
      // ── 1. Fetch SS bases for the year ──
      const { data: ssBasesRaw } = await supabase
        .from('hr_es_ss_bases')
        .select('*')
        .eq('year', periodYear)
        .eq('is_active', true);

      const ssBasesMap = new Map<number, SSGroupLimits>();
      if (ssBasesRaw) {
        for (const row of ssBasesRaw) {
          ssBasesMap.set(row.grupo_cotizacion, row as unknown as SSGroupLimits);
        }
      }

      // ── 2. Fetch IRPF tramos for the year ──
      const { data: irpfTramosRaw } = await supabase
        .from('hr_es_irpf_tables')
        .select('*')
        .eq('tax_year', periodYear)
        .eq('is_active', true)
        .is('ccaa_code', null) // State-level as default
        .order('tramo_desde', { ascending: true });

      const irpfTramos: IRPFTramo[] = (irpfTramosRaw ?? []).map(t => ({
        tramo_desde: t.tramo_desde,
        tramo_hasta: t.tramo_hasta,
        tipo_estatal: t.tipo_estatal,
        tipo_autonomico: t.tipo_autonomico,
        tipo_total: t.tipo_total,
      }));

      // ── 3. Fetch payroll records for this period ──
      const { data: records } = await (supabase as any)
        .from('erp_hr_payroll_records')
        .select('id, employee_id, gross_salary, net_salary, total_deductions, employer_cost, status')
        .eq('company_id', companyId)
        .eq('payroll_period_id', periodId);

      if (!records || records.length === 0) {
        toast.error('Sin nóminas en este período');
        setIsCalculating(false);
        return null;
      }

      // ── 4. Fetch employee data + labor data ──
      const employeeIds = records.map((r: any) => r.employee_id);

      const { data: employees } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, first_name, last_name, tax_id, hire_date, department_name, position_title, base_salary')
        .in('id', employeeIds);

      const { data: laborDataRaw } = await supabase
        .from('hr_es_employee_labor_data')
        .select('*')
        .eq('company_id', companyId)
        .in('employee_id', employeeIds);

      const employeeMap = new Map<string, any>();
      (employees ?? []).forEach((e: any) => employeeMap.set(e.id, e));

      const laborDataMap = new Map<string, any>();
      (laborDataRaw ?? []).forEach((ld: any) => laborDataMap.set(ld.employee_id, ld));

      // ── 5. Fetch company data for header ──
      const { data: companyData } = await (supabase as any)
        .from('erp_companies')
        .select('name, legal_name, tax_id, address, city, postal_code')
        .eq('id', companyId)
        .single();

      // ── 6. For each employee, calculate SS + IRPF ──
      for (const record of records) {
        const empId = record.employee_id;
        const emp = employeeMap.get(empId);
        const laborData = laborDataMap.get(empId);

        if (!emp) {
          errors.push(`Empleado ${empId} no encontrado`);
          continue;
        }

        const empName = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim();
        const grupoCot = laborData?.grupo_cotizacion ?? null;

        // Fetch payroll lines for this record
        const { data: lines } = await (supabase as any)
          .from('erp_hr_payroll_lines')
          .select('concept_code, concept_name, line_type, amount, units, unit_price, is_taxable, is_ss_contributable, sort_order, category')
          .eq('payroll_record_id', record.id);

        const payrollLines = lines ?? [];

        // ── SS Calculation ──
        const ssInput = mapLinesToSSInput(payrollLines);
        const ssLimits = grupoCot ? ssBasesMap.get(grupoCot) ?? null : null;
        const ssContext: SSEmployeeContext = {
          grupoCotizacion: grupoCot ?? 1,
          isTemporaryContract: laborData?.contrato_inferior_anual ?? false,
          coeficienteParcialidad: laborData?.coeficiente_parcialidad ?? 1.0,
          pagasExtrasAnuales: 2,
          salarioBaseAnual: (emp.base_salary ?? record.gross_salary * 12) || record.gross_salary * 12,
          epigrafAT: laborData?.epigrafe_at ?? null,
        };

        const ssResult = computeSSContributions(ssInput, ssContext, ssLimits);

        // ── IRPF Calculation ──
        const salarioBrutoAnual = (emp.base_salary ?? record.gross_salary * 12) || record.gross_salary * 12;
        const ssWorkerAnual = ssResult.totalTrabajador * 12;
        const irpfInput = buildIRPFInputFromLaborData(laborData, salarioBrutoAnual, ssWorkerAnual);
        const irpfResult = computeIRPF(irpfInput, irpfTramos.length > 0 ? irpfTramos : null);

        // ── Build Payslip ──
        const payslipLines: PayslipLineInput[] = payrollLines.map((l: any) => ({
          conceptCode: l.concept_code,
          conceptName: l.concept_name,
          lineType: l.line_type,
          amount: l.amount,
          units: l.units,
          unitPrice: l.unit_price,
          isSalary: l.is_taxable,
          isSSContributable: l.is_ss_contributable,
          isTaxable: l.is_taxable,
          sortOrder: l.sort_order ?? 0,
        }));

        const payslip = buildPayslip({
          header: {
            empresaNombre: companyData?.legal_name ?? companyData?.name ?? '',
            empresaCIF: companyData?.tax_id ?? '',
            empresaDomicilio: [companyData?.address, companyData?.city, companyData?.postal_code].filter(Boolean).join(', '),
            empresaCCC: '',
            trabajadorNombre: empName,
            trabajadorDNI: emp.tax_id ?? '',
            trabajadorNAF: laborData?.naf ?? '',
            trabajadorCategoria: laborData?.categoria_profesional ?? emp.position_title ?? '',
            trabajadorGrupoCotizacion: grupoCot ?? 0,
            trabajadorAntiguedad: emp.hire_date ?? '',
            periodoNombre: periodName,
            periodoDesde: periodStartDate,
            periodoHasta: periodEndDate,
            diasTotales: 30,
          },
          lines: payslipLines,
          ssResult,
          irpfResult,
          runId: null,
          periodId,
        });

        results.push({ employeeId: empId, employeeName: empName, ss: ssResult, irpf: irpfResult, payslip });
      }

      // ── 7. Legal pre-close validations ──
      const preCloseEmployees: LegalPreCloseEmployee[] = results.map(r => ({
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        grossSalary: r.payslip.totalDevengos,
        baseCCMensual: r.ss.baseCCMensual,
        grupoCotizacion: laborDataMap.get(r.employeeId)?.grupo_cotizacion ?? null,
        tipoIRPF: r.irpf.tipoEfectivo,
        ssWorker: r.ss.totalTrabajador,
        hasLaborData: laborDataMap.has(r.employeeId),
        hasFamilyData: checkIRPFDataCompleteness(laborDataMap.get(r.employeeId) ?? null).complete,
        hasSSData: ssBasesMap.size > 0,
      }));

      const preCloseChecks = validateLegalPreClose({
        employees: preCloseEmployees,
        periodYear,
        periodMonth,
      });

      const summary: LegalCalculationSummary = {
        totalEmployees: records.length,
        calculated: results.length,
        skipped: records.length - results.length,
        errors,
        results,
        preCloseChecks,
        calculatedAt: new Date().toISOString(),
      };

      setLastResult(summary);
      toast.success(`Cálculo legal completado: ${results.length} nóminas`);
      return summary;

    } catch (err) {
      console.error('[usePayrollLegalCalculation] error:', err);
      toast.error('Error en cálculo legal');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [companyId]);

  return {
    isCalculating,
    lastResult,
    calculateForPeriod,
  };
}
