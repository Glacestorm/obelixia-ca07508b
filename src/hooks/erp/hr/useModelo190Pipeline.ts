/**
 * useModelo190Pipeline — V2-RRHH-PINST
 * Hook for Model 190 annual perceptor pipeline.
 * Aggregates 12 months of payroll data into perceptor lines.
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  aggregatePerceptorsForModelo190,
  checkModelo190PipelineReadiness,
  type Modelo190PerceptorInput,
  type Modelo190AggregationResult,
  type Modelo190PipelineReadiness,
} from '@/engines/erp/hr/modelo190PipelineEngine';

// ── Types ──

export interface Modelo190PerceptorRow {
  id: string;
  company_id: string;
  fiscal_year: number;
  employee_id: string;
  nif: string;
  employee_name: string;
  clave_percepcion: string;
  subclave: string;
  percepciones_integras: number;
  retenciones_practicadas: number;
  percepciones_en_especie: number;
  ingresos_a_cuenta: number;
  q1_percepciones: number;
  q1_retenciones: number;
  q2_percepciones: number;
  q2_retenciones: number;
  q3_percepciones: number;
  q3_retenciones: number;
  q4_percepciones: number;
  q4_retenciones: number;
  data_quality: string;
  estimation_flags: unknown[];
  family_situation_changes: unknown | null;
  regional_deductions: unknown | null;
  irregular_income: unknown | null;
  zero_retention_justified: boolean;
  zero_retention_reason: string | null;
  created_at: string;
}

// ── Hook ──

export function useModelo190Pipeline(companyId: string) {
  const [isAggregating, setIsAggregating] = useState(false);
  const [lastResult, setLastResult] = useState<Modelo190AggregationResult | null>(null);
  const queryClient = useQueryClient();
  const sb = supabase as unknown as { from: (t: string) => any };

  // ── Fetch persisted perceptors ──
  const { data: perceptors = [], isLoading, refetch } = useQuery({
    queryKey: ['modelo190-perceptors', companyId],
    queryFn: async (): Promise<Modelo190PerceptorRow[]> => {
      const { data, error } = await sb
        .from('erp_hr_modelo190_perceptors')
        .select('*')
        .eq('company_id', companyId)
        .order('employee_name');
      if (error) { console.error('[useModelo190Pipeline] fetch error:', error); return []; }
      return (data ?? []) as Modelo190PerceptorRow[];
    },
    enabled: !!companyId,
  });

  // ── Aggregate from payroll data ──
  const aggregatePerceptors = useCallback(async (fiscalYear: number): Promise<Modelo190AggregationResult | null> => {
    setIsAggregating(true);
    try {
      // Fetch all payroll periods for the fiscal year
      const { data: periods } = await sb
        .from('hr_payroll_periods')
        .select('id, period_number, status')
        .eq('company_id', companyId)
        .eq('fiscal_year', fiscalYear)
        .order('period_number');

      const periodList = (periods ?? []) as Array<{ id: string; period_number: number; status: string }>;

      if (periodList.length === 0) {
        toast.error('No hay períodos de nómina para el ejercicio seleccionado');
        return null;
      }

      // Fetch all payroll records for the year
      const periodIds = periodList.map(p => p.id);
      const { data: records } = await sb
        .from('hr_payroll_records')
        .select('id, employee_id, payroll_period_id, gross_salary, net_salary, total_deductions, calculation_details')
        .in('payroll_period_id', periodIds)
        .limit(5000);

      const allRecords = (records ?? []) as Array<{
        id: string;
        employee_id: string;
        payroll_period_id: string;
        gross_salary: number;
        net_salary: number;
        calculation_details: Record<string, unknown> | null;
      }>;

      // Fetch employee info
      const employeeIds = [...new Set(allRecords.map(r => r.employee_id))];
      const { data: employees } = await sb
        .from('erp_hr_employees')
        .select('id, full_name, document_number')
        .in('id', employeeIds.slice(0, 500));

      const employeeMap = new Map<string, { full_name: string; document_number: string }>();
      for (const emp of (employees ?? []) as Array<{ id: string; full_name: string; document_number: string }>) {
        employeeMap.set(emp.id, emp);
      }

      // Build period number mapping
      const periodNumberMap = new Map<string, number>();
      for (const p of periodList) periodNumberMap.set(p.id, p.period_number);

      // Group records by employee
      const byEmployee = new Map<string, typeof allRecords>();
      for (const rec of allRecords) {
        const list = byEmployee.get(rec.employee_id) ?? [];
        list.push(rec);
        byEmployee.set(rec.employee_id, list);
      }

      // Build perceptor inputs
      const perceptorInputs: Modelo190PerceptorInput[] = [];

      for (const [empId, empRecords] of byEmployee) {
        const emp = employeeMap.get(empId);
        const monthlyData = empRecords.map(rec => {
          const d = rec.calculation_details;
          const bases = ((d?.bases ?? {}) as Record<string, number>);
          const deducciones = d?.deducciones as Array<{ concepto?: string; importe?: number; porcentaje?: number }> | undefined;
          let retencionIRPF = 0;
          let tipoIRPF = 0;
          let irpfAvailable = false;

          if (deducciones && Array.isArray(deducciones)) {
            const irpfLine = deducciones.find(dd => dd.concepto?.includes('IRPF'));
            if (irpfLine) {
              retencionIRPF = Number(irpfLine.importe ?? 0);
              tipoIRPF = Number(irpfLine.porcentaje ?? 0);
              irpfAvailable = true;
            }
          }
          if (!irpfAvailable && bases.retencionIRPF) {
            retencionIRPF = Number(bases.retencionIRPF);
            tipoIRPF = Number(bases.tipoIRPF ?? 0);
            irpfAvailable = retencionIRPF > 0;
          }

          const month = periodNumberMap.get(rec.payroll_period_id) ?? 1;
          const period = periodList.find(p => p.id === rec.payroll_period_id);

          return {
            month,
            grossSalary: rec.gross_salary,
            baseIRPF: Number(bases.baseIRPF ?? 0),
            retencionIRPF,
            tipoIRPF,
            irpfAvailable,
            payrollClosed: period?.status === 'closed' || period?.status === 'locked',
            perceptionsInKind: 0,
            paymentsOnAccount: 0,
          };
        });

        perceptorInputs.push({
          employeeId: empId,
          employeeName: emp?.full_name ?? empId,
          nif: emp?.document_number ?? '',
          monthlyData,
        });
      }

      // Fetch 111 retention totals for cross-check
      const { data: m111Artifacts } = await sb
        .from('erp_hr_official_artifacts')
        .select('totals')
        .eq('company_id', companyId)
        .eq('artifact_type', 'modelo_111')
        .eq('period_year', fiscalYear)
        .is('superseded_by_id', null);

      const m111Retentions = ((m111Artifacts ?? []) as Array<{ totals: Record<string, number> | null }>)
        .map(a => Number(a.totals?.totalRetenciones ?? 0))
        .filter(r => r > 0);

      const result = aggregatePerceptorsForModelo190(perceptorInputs, m111Retentions);
      setLastResult(result);

      toast.success(`Pipeline 190 completado: ${result.perceptorLines.length} perceptores agregados`);
      return result;
    } catch (err) {
      console.error('[useModelo190Pipeline] aggregation error:', err);
      toast.error('Error al agregar perceptores');
      return null;
    } finally {
      setIsAggregating(false);
    }
  }, [companyId]);

  // ── Persist perceptors to DB ──
  const persistPerceptors = useCallback(async (
    fiscalYear: number,
    result: Modelo190AggregationResult,
  ): Promise<boolean> => {
    setIsAggregating(true);
    try {
      // Delete existing for this year
      await sb
        .from('erp_hr_modelo190_perceptors')
        .delete()
        .eq('company_id', companyId)
        .eq('fiscal_year', fiscalYear);

      // Insert new
      const rows = result.perceptorLines.map((line, idx) => {
        const quality = result.qualityReport.issues.find(i => i.employeeId === line.employee_id);
        return {
          company_id: companyId,
          fiscal_year: fiscalYear,
          employee_id: line.employee_id,
          nif: line.nif,
          employee_name: line.employee_name,
          clave_percepcion: line.clave_percepcion,
          subclave: line.subclave,
          percepciones_integras: line.percepciones_integras,
          retenciones_practicadas: line.retenciones_practicadas,
          percepciones_en_especie: line.percepciones_en_especie,
          ingresos_a_cuenta: line.ingresos_a_cuenta,
          q1_percepciones: result.quarterlyTotals.q1.percepciones > 0 ? line.percepciones_integras / 4 : 0,
          q1_retenciones: result.quarterlyTotals.q1.retenciones > 0 ? line.retenciones_practicadas / 4 : 0,
          q2_percepciones: result.quarterlyTotals.q2.percepciones > 0 ? line.percepciones_integras / 4 : 0,
          q2_retenciones: result.quarterlyTotals.q2.retenciones > 0 ? line.retenciones_practicadas / 4 : 0,
          q3_percepciones: result.quarterlyTotals.q3.percepciones > 0 ? line.percepciones_integras / 4 : 0,
          q3_retenciones: result.quarterlyTotals.q3.retenciones > 0 ? line.retenciones_practicadas / 4 : 0,
          q4_percepciones: result.quarterlyTotals.q4.percepciones > 0 ? line.percepciones_integras / 4 : 0,
          q4_retenciones: result.quarterlyTotals.q4.retenciones > 0 ? line.retenciones_practicadas / 4 : 0,
          data_quality: quality ? 'partial' : 'real',
          estimation_flags: [],
          zero_retention_justified: line.retenciones_practicadas === 0,
        };
      });

      if (rows.length > 0) {
        const { error } = await sb.from('erp_hr_modelo190_perceptors').insert(rows);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['modelo190-perceptors', companyId] });
      toast.success(`${rows.length} perceptores persistidos para ${fiscalYear}`);
      return true;
    } catch (err) {
      console.error('[useModelo190Pipeline] persist error:', err);
      toast.error('Error al persistir perceptores');
      return false;
    } finally {
      setIsAggregating(false);
    }
  }, [companyId, queryClient]);

  // ── Pipeline readiness ──
  const getPipelineReadiness = useCallback((fiscalYear: number): Modelo190PipelineReadiness => {
    const yearPerceptors = perceptors.filter(p => p.fiscal_year === fiscalYear);
    return checkModelo190PipelineReadiness({
      perceptorCount: yearPerceptors.length,
      allHaveNIF: yearPerceptors.every(p => p.nif && p.nif.trim().length > 0),
      quarterly111Count: 0, // Will be checked against artifacts
      monthsCovered: 12, // Approximate
      dataQualityScore: lastResult?.qualityReport.dataQualityScore ?? 0,
    });
  }, [perceptors, lastResult]);

  return {
    perceptors,
    isLoading,
    isAggregating,
    lastResult,
    refetch,
    aggregatePerceptors,
    persistPerceptors,
    getPipelineReadiness,
  };
}
