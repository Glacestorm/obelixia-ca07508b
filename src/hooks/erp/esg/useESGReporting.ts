/**
 * useESGReporting Hook
 * Fase 5: ESG Reporting Suite - CSRD/ESRS Compliance
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface ESGEmissions {
  id: string;
  company_id: string;
  fiscal_year: string;
  reporting_month?: number;
  scope1_total: number;
  scope2_location_based: number;
  scope2_market_based: number;
  scope3_total: number;
  total_emissions: number;
  emissions_per_million_revenue?: number;
  emissions_per_employee?: number;
}

export interface ESGReductionTarget {
  id: string;
  target_name: string;
  target_type: 'absolute' | 'intensity' | 'net_zero' | 'carbon_neutral';
  scope_covered: string;
  baseline_year: number;
  baseline_emissions: number;
  target_year: number;
  target_emissions?: number;
  reduction_percentage?: number;
  current_emissions?: number;
  progress_percentage?: number;
  on_track: boolean;
  sbti_validated: boolean;
  sbti_target_type?: string;
}

export interface ESGReport {
  id: string;
  company_id: string;
  fiscal_year: string;
  report_type: 'CSRD' | 'GRI' | 'TCFD' | 'SASB' | 'CDP' | 'SFDR' | 'EU_TAXONOMY';
  report_title: string;
  executive_summary?: string;
  compliance_score?: number;
  disclosure_completeness?: number;
  status: 'draft' | 'internal_review' | 'external_audit' | 'approved' | 'published';
  pdf_url?: string;
  created_at: string;
}

export interface ESGDataPoint {
  id: string;
  esrs_standard: string;
  disclosure_requirement?: string;
  data_point_id: string;
  data_point_name: string;
  value_numeric?: number;
  value_text?: string;
  unit?: string;
  data_quality_score?: number;
  verification_status: string;
}

export interface TaxonomyAlignment {
  id: string;
  economic_activity: string;
  environmental_objective: string;
  turnover_percentage?: number;
  capex_percentage?: number;
  opex_percentage?: number;
  is_eligible: boolean;
  is_aligned: boolean;
}

export interface SocialMetrics {
  total_employees?: number;
  gender_diversity_percentage?: number;
  gender_pay_gap_percentage?: number;
  training_hours_per_employee?: number;
  health_safety_incidents?: number;
  employee_turnover_rate?: number;
}

export interface GovernanceMetrics {
  board_size?: number;
  independent_directors?: number;
  women_on_board?: number;
  sustainability_committee?: boolean;
  esg_linked_executive_compensation?: boolean;
}

export interface ESGContext {
  companyId: string;
  fiscalYear: string;
}

// === HOOK ===

export function useESGReporting() {
  const [isLoading, setIsLoading] = useState(false);
  const [emissions, setEmissions] = useState<ESGEmissions[]>([]);
  const [targets, setTargets] = useState<ESGReductionTarget[]>([]);
  const [reports, setReports] = useState<ESGReport[]>([]);
  const [dataPoints, setDataPoints] = useState<ESGDataPoint[]>([]);
  const [taxonomyAlignments, setTaxonomyAlignments] = useState<TaxonomyAlignment[]>([]);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetrics | null>(null);
  const [governanceMetrics, setGovernanceMetrics] = useState<GovernanceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH EMISSIONS ===
  const fetchEmissions = useCallback(async (context: ESGContext) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('erp_esg_emissions')
        .select('*')
        .eq('company_id', context.companyId)
        .eq('fiscal_year', context.fiscalYear)
        .order('reporting_month', { ascending: true });

      if (dbError) throw dbError;
      setEmissions((data || []) as unknown as ESGEmissions[]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching emissions';
      setError(message);
      console.error('[useESGReporting] fetchEmissions error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH TARGETS ===
  const fetchTargets = useCallback(async (companyId: string) => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_esg_reduction_targets')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('target_year', { ascending: true });

      if (dbError) throw dbError;
      setTargets((data || []) as unknown as ESGReductionTarget[]);
      return data;
    } catch (err) {
      console.error('[useESGReporting] fetchTargets error:', err);
      return null;
    }
  }, []);

  // === FETCH REPORTS ===
  const fetchReports = useCallback(async (context: ESGContext) => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_esg_reports')
        .select('*')
        .eq('company_id', context.companyId)
        .order('fiscal_year', { ascending: false });

      if (dbError) throw dbError;
      setReports((data || []) as unknown as ESGReport[]);
      return data;
    } catch (err) {
      console.error('[useESGReporting] fetchReports error:', err);
      return null;
    }
  }, []);

  // === GENERATE CSRD REPORT ===
  const generateCSRDReport = useCallback(async (
    context: ESGContext,
    reportType: 'CSRD' | 'GRI' | 'TCFD' | 'SASB' = 'CSRD'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-esg-reporting',
        {
          body: {
            action: 'generate_csrd_report',
            context,
            params: { reportType }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success(`Informe ${reportType} generado correctamente`);
        await fetchReports(context);
        return data.data;
      }

      throw new Error(data?.error || 'Error generando informe');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando informe CSRD';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchReports]);

  // === ANALYZE EMISSIONS ===
  const analyzeEmissions = useCallback(async (context: ESGContext) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-esg-reporting',
        {
          body: {
            action: 'analyze_emissions',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useESGReporting] analyzeEmissions error:', err);
      toast.error('Error analizando emisiones');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CALCULATE EU TAXONOMY ===
  const calculateTaxonomyAlignment = useCallback(async (context: ESGContext) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-esg-reporting',
        {
          body: {
            action: 'taxonomy_alignment',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Análisis Taxonomía UE completado');
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useESGReporting] calculateTaxonomyAlignment error:', err);
      toast.error('Error calculando alineación con Taxonomía UE');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === DOUBLE MATERIALITY ASSESSMENT ===
  const assessDoubleMateriality = useCallback(async (
    context: ESGContext,
    industry: string
  ) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-esg-reporting',
        {
          body: {
            action: 'double_materiality',
            context,
            params: { industry }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Evaluación de doble materialidad completada');
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useESGReporting] assessDoubleMateriality error:', err);
      toast.error('Error en evaluación de materialidad');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SAVE EMISSIONS DATA ===
  const saveEmissions = useCallback(async (
    context: ESGContext,
    emissionsData: Partial<ESGEmissions>
  ) => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_esg_emissions')
        .upsert({
          company_id: context.companyId,
          fiscal_year: context.fiscalYear,
          ...emissionsData
        } as never)
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Datos de emisiones guardados');
      await fetchEmissions(context);
      return data;
    } catch (err) {
      console.error('[useESGReporting] saveEmissions error:', err);
      toast.error('Error guardando emisiones');
      return null;
    }
  }, [fetchEmissions]);

  // === CREATE REDUCTION TARGET ===
  const createTarget = useCallback(async (
    companyId: string,
    targetData: Partial<ESGReductionTarget>
  ) => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_esg_reduction_targets')
        .insert({
          company_id: companyId,
          ...targetData
        } as never)
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Objetivo de reducción creado');
      await fetchTargets(companyId);
      return data;
    } catch (err) {
      console.error('[useESGReporting] createTarget error:', err);
      toast.error('Error creando objetivo');
      return null;
    }
  }, [fetchTargets]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((context: ESGContext, intervalMs = 300000) => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    
    // Initial fetch
    fetchEmissions(context);
    fetchTargets(context.companyId);
    fetchReports(context);
    
    autoRefreshInterval.current = setInterval(() => {
      fetchEmissions(context);
    }, intervalMs);
  }, [fetchEmissions, fetchTargets, fetchReports]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    emissions,
    targets,
    reports,
    dataPoints,
    taxonomyAlignments,
    socialMetrics,
    governanceMetrics,
    error,
    // Fetch actions
    fetchEmissions,
    fetchTargets,
    fetchReports,
    // AI Actions
    generateCSRDReport,
    analyzeEmissions,
    calculateTaxonomyAlignment,
    assessDoubleMateriality,
    // CRUD Actions
    saveEmissions,
    createTarget,
    // Lifecycle
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useESGReporting;
