/**
 * usePayrollLegalCalculation — V2-RRHH-P1B
 * Hook that connects SS + IRPF engines to real employee/payroll data.
 *
 * P1B enhancements:
 *  - Progressive IRPF regularization with accumulated data
 *  - Correct IRPF base (excluding exempt extrasalarial)
 *  - Smart prorrateo handling (from_lines vs calculated)
 *  - MEI trabajador
 *  - Real period days
 *  - CCC empresa from DB
 *  - Batch payroll lines fetch (N+1 elimination)
 *  - Ledger/Evidence/Version registry integration
 *
 * Fetches:
 *  - Employee ES labor data (grupo cotización, situación familiar, etc.)
 *  - SS bases/rates from hr_es_ss_bases
 *  - IRPF tramos from hr_es_irpf_tables
 *  - Payroll lines for the period (batched)
 *  - Prior period accumulated data for IRPF regularization
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
  type IRPFRegularizationContext,
} from '@/engines/erp/hr/irpfEngine';
import {
  buildPayslip,
  validateLegalPreClose,
  type PayslipData,
  type PayslipLineInput,
  type LegalPreCloseCheck,
  type LegalPreCloseEmployee,
} from '@/engines/erp/hr/payslipEngine';
import {
  resolveContractType,
  getContractLegalSummary,
} from '@/engines/erp/hr/contractTypeEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

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

// ── Helper: compute real days in period ──
function computeRealDays(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  } catch {
    return 30;
  }
}

// ── Hook ──

export function usePayrollLegalCalculation(companyId: string) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastResult, setLastResult] = useState<LegalCalculationSummary | null>(null);
  const { writeLedgerWithEvidence, writeVersion } = useHRLedgerWriter(companyId, 'payroll_legal_calc');

  /**
   * Calculate SS + IRPF for all employees in a payroll period.
   * P1B: With progressive regularization, correct bases, and traceability.
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

      // ── 5. Fetch company data for header (P1B: CCC from DB) ──
      const { data: companyData } = await (supabase as any)
        .from('erp_companies')
        .select('name, legal_name, tax_id, address, city, postal_code, ss_ccc')
        .eq('id', companyId)
        .single();

      // ── 5b. P1B: Batch fetch ALL payroll lines for ALL records (eliminates N+1) ──
      const recordIds = records.map((r: any) => r.id);
      const { data: allLines } = await (supabase as any)
        .from('erp_hr_payroll_lines')
        .select('payroll_record_id, concept_code, concept_name, line_type, amount, units, unit_price, is_taxable, is_ss_contributable, sort_order, category')
        .in('payroll_record_id', recordIds);

      const linesByRecord = new Map<string, any[]>();
      (allLines ?? []).forEach((line: any) => {
        const existing = linesByRecord.get(line.payroll_record_id) ?? [];
        existing.push(line);
        linesByRecord.set(line.payroll_record_id, existing);
      });

      // ── 5c. P1B: Fetch accumulated data for IRPF regularization ──
      // Get prior months' payroll records for the same fiscal year to compute accumulated gross/SS/retention
      const accumulatedMap = new Map<string, { bruto: number; ss: number; retencion: number }>();
      if (periodMonth > 1) {
        const { data: priorPeriods } = await (supabase as any)
          .from('erp_hr_payroll_periods')
          .select('id')
          .eq('company_id', companyId)
          .eq('fiscal_year', periodYear)
          .lt('period_number', periodMonth);

        if (priorPeriods && priorPeriods.length > 0) {
          const priorPeriodIds = priorPeriods.map((p: any) => p.id);
          const { data: priorRecords } = await (supabase as any)
            .from('erp_hr_payroll_records')
            .select('employee_id, gross_salary, total_deductions')
            .eq('company_id', companyId)
            .in('payroll_period_id', priorPeriodIds)
            .in('status', ['confirmed', 'closed']);

          if (priorRecords) {
            for (const pr of priorRecords) {
              const acc = accumulatedMap.get(pr.employee_id) ?? { bruto: 0, ss: 0, retencion: 0 };
              acc.bruto += pr.gross_salary ?? 0;
              // Approximate SS and IRPF from total_deductions
              // In future, use detailed breakdown stored in ledger
              acc.ss += (pr.gross_salary ?? 0) * 0.0643; // Approximate SS worker %
              acc.retencion += (pr.total_deductions ?? 0) - ((pr.gross_salary ?? 0) * 0.0643);
              accumulatedMap.set(pr.employee_id, acc);
            }
          }
        }
      }

      // ── Real period days ──
      const diasReales = computeRealDays(periodStartDate, periodEndDate);

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

        // P1B: Get lines from batch (no N+1)
        const payrollLines = linesByRecord.get(record.id) ?? [];

        // ── SS Calculation (P1B: with prorrateo flag and real days) ──
        const ssInput = mapLinesToSSInput(payrollLines);
        const ssLimits = grupoCot ? ssBasesMap.get(grupoCot) ?? null : null;
        const pagasProrrateadas = laborData?.pagas_extras_prorrateadas ?? false;
        const ssContext: SSEmployeeContext = {
          grupoCotizacion: grupoCot ?? 1,
          isTemporaryContract: laborData?.contrato_inferior_anual ?? false,
          coeficienteParcialidad: laborData?.coeficiente_parcialidad ?? 1.0,
          pagasExtrasAnuales: 2,
          pagasExtrasProrrateadas: pagasProrrateadas,
          salarioBaseAnual: (emp.base_salary ?? record.gross_salary * 12) || record.gross_salary * 12,
          epigrafAT: laborData?.epigrafe_at ?? null,
          ocupacionSS: (laborData as any)?.ocupacion_ss ?? null,
          diasRealesPeriodo: diasReales,
        };

        const ssResult = computeSSContributions(ssInput, ssContext, ssLimits);

        // ── IRPF Calculation (P1B: with regularization context) ──
        const salarioBrutoAnual = (emp.base_salary ?? record.gross_salary * 12) || record.gross_salary * 12;
        const ssWorkerAnual = ssResult.totalTrabajador * 12;
        const irpfInput = buildIRPFInputFromLaborData(laborData, salarioBrutoAnual, ssWorkerAnual);

        // P1B: Build regularization context
        let regularizationCtx: IRPFRegularizationContext | null = null;
        const accumulated = accumulatedMap.get(empId);
        if (periodMonth >= 1) {
          regularizationCtx = {
            currentMonth: periodMonth,
            acumuladoBrutoAnterior: accumulated?.bruto ?? 0,
            acumuladoSSAnterior: accumulated?.ss ?? 0,
            acumuladoRetencionAnterior: accumulated?.retencion ?? 0,
            brutoMesActual: record.gross_salary ?? 0,
            ssMesActual: ssResult.totalTrabajador,
          };
        }

        let irpfResult = computeIRPF(
          irpfInput,
          irpfTramos.length > 0 ? irpfTramos : null,
          regularizationCtx,
        );

        // ── Art. 88.5 RIRPF: Tipo voluntario solicitado por el empleado ──
        // El trabajador puede solicitar un tipo superior al calculado.
        // Siempre se aplica el MAYOR entre el solicitado y el calculado legalmente.
        const tipoSolicitado = parseFloat((laborData as any)?.irpf_percentage) || 0;
        if (tipoSolicitado > 0 && tipoSolicitado > irpfResult.tipoEfectivo) {
          const tipoLegalCalculado = irpfResult.tipoEfectivo;
          const retencionMensualOverride = Math.round((record.gross_salary ?? 0) * tipoSolicitado / 100 * 100) / 100;
          const retencionAnualOverride = Math.round(salarioBrutoAnual * tipoSolicitado / 100 * 100) / 100;
          irpfResult = {
            ...irpfResult,
            tipoEfectivo: tipoSolicitado,
            retencionMensual: retencionMensualOverride,
            retencionAnual: retencionAnualOverride,
            warnings: [
              ...irpfResult.warnings,
              `Art. 88.5 RIRPF: Tipo solicitado ${tipoSolicitado}% > calculado ${tipoLegalCalculado}% → se aplica el mayor`,
            ],
            legalReferences: [
              ...irpfResult.legalReferences,
              'RIRPF Art. 88.5 (Tipo voluntario superior solicitado por el trabajador)',
            ],
            calculations: [
              ...irpfResult.calculations,
              {
                step: 'Art. 88.5 RIRPF — Tipo voluntario',
                formula: `max(solicitado=${tipoSolicitado}%, calculado=${tipoLegalCalculado}%) = ${tipoSolicitado}%`,
                result: tipoSolicitado,
              },
            ],
          };
        }

        // ── Build Payslip (P1B: with real days and CCC) ──
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
            empresaCCC: companyData?.ss_ccc ?? laborData?.ccc_empresa ?? '',
            trabajadorNombre: empName,
            trabajadorDNI: emp.tax_id ?? '',
            trabajadorNAF: laborData?.naf ?? '',
            trabajadorCategoria: laborData?.categoria_profesional ?? emp.position_title ?? '',
            trabajadorGrupoCotizacion: grupoCot ?? 0,
            trabajadorAntiguedad: emp.hire_date ?? '',
            periodoNombre: periodName,
            periodoDesde: periodStartDate,
            periodoHasta: periodEndDate,
            diasTotales: diasReales,
          },
          lines: payslipLines,
          ssResult,
          irpfResult,
          runId: null,
          periodId,
        });

        results.push({ employeeId: empId, employeeName: empName, ss: ssResult, irpf: irpfResult, payslip });
      }

      // ── 7. Legal pre-close validations (P1B enhanced) ──
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
        irpfRegularized: !!r.irpf.regularization,
        baseIRPFCorregida: r.ss.baseIRPFCorregida,
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

      // ── 8. P1B: Write to Ledger + Evidence + Version Registry ──
      try {
        // Ledger event for the calculation
        const eventId = await writeLedgerWithEvidence(
          {
            eventType: 'payroll_calculation' as any,
            entityType: 'payroll_period',
            entityId: periodId,
            afterSnapshot: {
              totalEmployees: summary.totalEmployees,
              calculated: summary.calculated,
              skipped: summary.skipped,
              errors: summary.errors.length,
              checksPassedCount: preCloseChecks.filter(c => c.passed).length,
              checksTotal: preCloseChecks.length,
              version: '1.1-P1B',
              method: 'progressive_regularization',
            },
            metadata: {
              periodYear,
              periodMonth,
              periodName,
              phase: 'P1B',
              engineVersion: '1.1',
            },
          },
          // Evidence: snapshot of each employee's calculation summary
          results.slice(0, 10).map(r => ({
            evidenceType: 'snapshot' as any,
            evidenceLabel: `Cálculo legal ${periodName} - ${r.employeeName}`,
            refEntityType: 'payroll_legal_calc',
            refEntityId: r.employeeId,
            evidenceSnapshot: {
              ss: {
                baseCCMensual: r.ss.baseCCMensual,
                baseATMensual: r.ss.baseATMensual,
                totalTrabajador: r.ss.totalTrabajador,
                totalEmpresa: r.ss.totalEmpresa,
                baseIRPFCorregida: r.ss.baseIRPFCorregida,
                prorrateoSource: r.ss.prorrateoSource,
                meiTrabajador: r.ss.meiTrabajador,
              },
              irpf: {
                tipoEfectivo: r.irpf.tipoEfectivo,
                retencionMensual: r.irpf.retencionMensual,
                regularized: !!r.irpf.regularization,
                regularizationDetail: r.irpf.regularization,
              },
              payslip: {
                totalDevengos: r.payslip.totalDevengos,
                totalDeducciones: r.payslip.totalDeducciones,
                liquidoTotal: r.payslip.liquidoTotal,
                hash: r.payslip.traceability.calculationHash,
              },
            },
          })),
        );

        // Version registry for the period calculation
        if (eventId) {
          await writeVersion({
            entityType: 'payroll_legal_calculation',
            entityId: `${periodId}_${periodYear}_${periodMonth}`,
            state: 'closed',
            contentSnapshot: {
              totalEmployees: summary.totalEmployees,
              calculated: summary.calculated,
              checksPassedCount: preCloseChecks.filter(c => c.passed).length,
              checksTotal: preCloseChecks.length,
              calculatedAt: summary.calculatedAt,
              engineVersion: '1.1-P1B',
            },
            metadata: {
              ledgerEventId: eventId,
              periodYear,
              periodMonth,
            },
          });
        }
      } catch (traceErr) {
        console.warn('[usePayrollLegalCalculation] Traceability write failed (non-blocking):', traceErr);
      }

      toast.success(`Cálculo legal completado: ${results.length} nóminas`);
      return summary;

    } catch (err) {
      console.error('[usePayrollLegalCalculation] error:', err);
      toast.error('Error en cálculo legal');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [companyId, writeLedgerWithEvidence, writeVersion]);

  return {
    isCalculating,
    lastResult,
    calculateForPeriod,
  };
}
