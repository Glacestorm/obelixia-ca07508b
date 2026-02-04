/**
 * useHRWhistleblower - Hook para gestión del Canal de Denuncias
 * Directiva EU 2019/1937 - Whistleblower Protection
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WhistleblowerStatus = 'received' | 'under_review' | 'investigating' | 'resolved' | 'dismissed' | 'archived';
export type WhistleblowerCategory = 'fraud' | 'corruption' | 'harassment' | 'discrimination' | 
  'safety_violation' | 'environmental' | 'data_breach' | 'financial_irregularity' | 'other';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface WhistleblowerReport {
  id: string;
  report_code: string;
  category: WhistleblowerCategory;
  title: string;
  status: WhistleblowerStatus;
  priority_level: PriorityLevel;
  is_anonymous: boolean;
  created_at: string;
  acknowledgment_deadline: string | null;
  resolution_deadline: string | null;
  acknowledged_at: string | null;
  investigation?: {
    report_id: string;
    status: string;
    investigator_id: string;
  };
}

export interface WhistleblowerStats {
  total: number;
  pending: number;
  urgent: number;
}

export interface ReportSubmission {
  category: WhistleblowerCategory;
  title: string;
  description: string;
  is_anonymous: boolean;
  contact_method?: string;
  contact_details?: string;
  evidence_urls?: string[];
}

export function useHRWhistleblower(companyId: string | null) {
  const [reports, setReports] = useState<WhistleblowerReport[]>([]);
  const [stats, setStats] = useState<WhistleblowerStats>({ total: 0, pending: 0, urgent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WhistleblowerReport | null>(null);

  // Fetch all reports
  const fetchReports = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-whistleblower-agent', {
        body: {
          action: 'get_reports',
          company_id: companyId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setReports(data.reports || []);
        setStats(data.stats || { total: 0, pending: 0, urgent: 0 });
      }
    } catch (error) {
      console.error('[useHRWhistleblower] fetchReports error:', error);
      toast.error('Error al cargar denuncias');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Submit a new report
  const submitReport = useCallback(async (reportData: ReportSubmission): Promise<string | null> => {
    if (!companyId) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-whistleblower-agent', {
        body: {
          action: 'submit_report',
          company_id: companyId,
          data: reportData,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Denuncia registrada: ${data.report_code}`);
        await fetchReports();
        return data.report_code;
      }

      return null;
    } catch (error) {
      console.error('[useHRWhistleblower] submitReport error:', error);
      toast.error('Error al enviar denuncia');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, fetchReports]);

  // Acknowledge a report (7-day deadline compliance)
  const acknowledgeReport = useCallback(async (reportId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-whistleblower-agent', {
        body: {
          action: 'acknowledge_report',
          report_id: reportId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Denuncia acusada correctamente');
        await fetchReports();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useHRWhistleblower] acknowledgeReport error:', error);
      toast.error('Error al acusar denuncia');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchReports]);

  // Update investigation
  const updateInvestigation = useCallback(async (
    reportId: string,
    findings: string,
    status: string,
    recommendedActions?: string[]
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-whistleblower-agent', {
        body: {
          action: 'update_investigation',
          report_id: reportId,
          data: { findings, status, recommended_actions: recommendedActions },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Investigación actualizada');
        await fetchReports();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useHRWhistleblower] updateInvestigation error:', error);
      toast.error('Error al actualizar investigación');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchReports]);

  // AI Analysis
  const analyzeReport = useCallback(async (reportId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-whistleblower-agent', {
        body: {
          action: 'analyze_report',
          report_id: reportId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Análisis IA completado');
        await fetchReports();
        return data.analysis;
      }

      return null;
    } catch (error) {
      console.error('[useHRWhistleblower] analyzeReport error:', error);
      toast.error('Error en análisis IA');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchReports]);

  // Get status color
  const getStatusColor = useCallback((status: WhistleblowerStatus) => {
    const colors: Record<WhistleblowerStatus, string> = {
      received: 'bg-blue-500',
      under_review: 'bg-yellow-500',
      investigating: 'bg-orange-500',
      resolved: 'bg-green-500',
      dismissed: 'bg-gray-500',
      archived: 'bg-slate-400',
    };
    return colors[status] || 'bg-gray-500';
  }, []);

  // Get priority color
  const getPriorityColor = useCallback((priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      critical: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100',
    };
    return colors[priority] || 'text-gray-600 bg-gray-100';
  }, []);

  // Get category label
  const getCategoryLabel = useCallback((category: WhistleblowerCategory) => {
    const labels: Record<WhistleblowerCategory, string> = {
      fraud: 'Fraude',
      corruption: 'Corrupción',
      harassment: 'Acoso',
      discrimination: 'Discriminación',
      safety_violation: 'Seguridad Laboral',
      environmental: 'Medio Ambiente',
      data_breach: 'Protección Datos',
      financial_irregularity: 'Irregularidad Financiera',
      other: 'Otros',
    };
    return labels[category] || category;
  }, []);

  // Check deadline compliance
  const isDeadlineExpired = useCallback((deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    stats,
    isLoading,
    selectedReport,
    setSelectedReport,
    fetchReports,
    submitReport,
    acknowledgeReport,
    updateInvestigation,
    analyzeReport,
    getStatusColor,
    getPriorityColor,
    getCategoryLabel,
    isDeadlineExpired,
  };
}

export default useHRWhistleblower;
