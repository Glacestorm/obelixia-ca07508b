/**
 * useMonthlyOfficialPackage — V2-RRHH-P4B
 * Hook that builds the monthly official package from real DB data,
 * runs cross-validation, and provides the data for MonthlyOfficialPackagePanel.
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildMonthlyOfficialPackage,
  type MonthlyOfficialPackage,
  type MonthlyPackageInput,
} from '@/engines/erp/hr/monthlyOfficialPackageEngine';
import {
  runCrossValidation,
  type CrossValidationInput,
  type CrossValidationResult,
} from '@/engines/erp/hr/officialCrossValidationEngine';
import type { OfficialArtifactDBRow } from './useOfficialArtifacts';

// ── Types ──

interface PayrollSummary {
  totalBruto: number;
  totalNeto: number;
  totalSSEmpresa: number;
  totalSSTrabajador: number;
  totalIRPF: number;
  totalBasesCC: number;
  totalBasesAT: number;
  employeeCount: number;
}

interface MonthlyOfficialPackageHookReturn {
  pkg: MonthlyOfficialPackage | null;
  crossValidation: CrossValidationResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Helper: find latest artifact of type for period ──

function findLatestArtifact(
  rows: OfficialArtifactDBRow[],
  artifactType: string,
  periodYear: number,
  periodMonth: number | null,
): OfficialArtifactDBRow | null {
  return rows.find(r =>
    r.artifact_type === artifactType &&
    r.period_year === periodYear &&
    (periodMonth === null || r.period_month === periodMonth) &&
    r.superseded_by_id === null
  ) ?? null;
}

function toArtifactSummaryInput(row: OfficialArtifactDBRow | null) {
  if (!row) return null;
  return {
    id: row.artifact_id,
    isValid: row.is_valid,
    readinessPercent: row.readiness_percent,
    status: row.status,
    generatedAt: row.created_at,
  };
}

// ── Hook ──

export function useMonthlyOfficialPackage(
  companyId: string,
  companyName: string,
  periodYear: number,
  periodMonth: number,
  payrollSummary: PayrollSummary | null,
  periodClosed: boolean,
): MonthlyOfficialPackageHookReturn {
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch persisted artifacts for the company
  const { data: allArtifacts = [], isLoading: isLoadingArtifacts, refetch } = useQuery({
    queryKey: ['hr-official-artifacts', companyId, periodYear, periodMonth],
    queryFn: async (): Promise<OfficialArtifactDBRow[]> => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data, error: qErr } = await sb
        .from('erp_hr_official_artifacts')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_year', periodYear)
        .order('created_at', { ascending: false })
        .limit(200);
      if (qErr) {
        console.error('[useMonthlyOfficialPackage] query error:', qErr);
        setError(qErr.message);
        return [];
      }
      return (data ?? []) as OfficialArtifactDBRow[];
    },
    enabled: !!companyId && !!periodYear,
  });

  // 2. Find latest artifacts by type
  const fan = useMemo(() => findLatestArtifact(allArtifacts, 'fan_cotizacion', periodYear, periodMonth), [allArtifacts, periodYear, periodMonth]);
  const rlc = useMemo(() => findLatestArtifact(allArtifacts, 'rlc', periodYear, periodMonth), [allArtifacts, periodYear, periodMonth]);
  const rnt = useMemo(() => findLatestArtifact(allArtifacts, 'rnt', periodYear, periodMonth), [allArtifacts, periodYear, periodMonth]);
  const cra = useMemo(() => findLatestArtifact(allArtifacts, 'cra', periodYear, periodMonth), [allArtifacts, periodYear, periodMonth]);

  const isEndOfQuarter = [3, 6, 9, 12].includes(periodMonth);
  const trimester = Math.ceil(periodMonth / 3);
  const m111 = useMemo(() => {
    if (!isEndOfQuarter) return null;
    // Modelo 111 is stored with period_month = null or the quarter-end month
    return allArtifacts.find(r =>
      r.artifact_type === 'modelo_111' &&
      r.period_year === periodYear &&
      r.superseded_by_id === null
    ) ?? null;
  }, [allArtifacts, periodYear, isEndOfQuarter]);

  // 3. Run cross-validation
  const crossValidation = useMemo((): CrossValidationResult | null => {
    const cvInput: CrossValidationInput = {
      periodYear,
      periodMonth,
      periodStatus: periodClosed ? 'closed' : 'open',
      payrollClosed: periodClosed,
      payroll: payrollSummary,
      fan: fan ? {
        totalBasesCC: (fan.totals as any)?.totalBasesCC ?? 0,
        totalBasesAT: (fan.totals as any)?.totalBasesAT ?? 0,
        totalCotizacionEmpresa: (fan.totals as any)?.totalCotizacionEmpresa ?? 0,
        totalCotizacionTrabajador: (fan.totals as any)?.totalCotizacionTrabajador ?? 0,
        totalEmployees: fan.employee_ids?.length ?? 0,
        isValid: fan.is_valid,
      } : null,
      rlc: rlc ? {
        totalLiquidacion: (rlc.totals as any)?.totalLiquidacion ?? 0,
        totalWorkers: (rlc.totals as any)?.totalWorkers ?? 0,
        isValid: rlc.is_valid,
      } : null,
      rnt: rnt ? {
        totalWorkers: (rnt.totals as any)?.totalWorkers ?? 0,
        isValid: rnt.is_valid,
      } : null,
      fiscal: payrollSummary ? {
        totalBaseIRPF: payrollSummary.totalBruto,
        totalRetencion: payrollSummary.totalIRPF,
        perceptores: payrollSummary.employeeCount,
      } : null,
    };

    return runCrossValidation(cvInput);
  }, [periodYear, periodMonth, periodClosed, payrollSummary, fan, rlc, rnt]);

  // 4. Build monthly package
  const pkg = useMemo((): MonthlyOfficialPackage | null => {
    if (isLoadingArtifacts) return null;

    const input: MonthlyPackageInput = {
      companyId,
      companyName,
      periodYear,
      periodMonth,
      fanArtifact: toArtifactSummaryInput(fan),
      rlcArtifact: toArtifactSummaryInput(rlc),
      rntArtifact: toArtifactSummaryInput(rnt),
      craArtifact: toArtifactSummaryInput(cra),
      modelo111Artifact: toArtifactSummaryInput(m111),
      crossValidation,
      ssExpedientStatus: null,
      fiscalExpedientStatus: null,
      periodClosed,
    };

    return buildMonthlyOfficialPackage(input);
  }, [companyId, companyName, periodYear, periodMonth, fan, rlc, rnt, cra, m111, crossValidation, periodClosed, isLoadingArtifacts]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    pkg,
    crossValidation,
    isLoading: isLoadingArtifacts,
    error,
    refresh,
  };
}
