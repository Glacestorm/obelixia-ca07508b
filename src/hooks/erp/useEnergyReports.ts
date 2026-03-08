import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyReport {
  id: string;
  case_id: string;
  report_type: string | null;
  version: number | null;
  pdf_url: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export function useEnergyReports(caseId: string | null) {
  const [reports, setReports] = useState<EnergyReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!caseId) { setReports([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_reports')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false });
      if (error) throw error;
      setReports((data as EnergyReport[]) || []);
    } catch (err) {
      console.error('[useEnergyReports] error:', err);
      toast.error('Error al cargar informes');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createReport = useCallback(async (values: Partial<EnergyReport>) => {
    if (!caseId) return null;
    try {
      const nextVersion = reports.length > 0 ? Math.max(...reports.map(r => r.version || 0)) + 1 : 1;
      const { data, error } = await supabase
        .from('energy_reports')
        .insert([{ ...values, case_id: caseId, version: nextVersion }] as any)
        .select()
        .single();
      if (error) throw error;
      const newReport = data as EnergyReport;
      setReports(prev => [newReport, ...prev]);
      toast.success(`Informe v${nextVersion} guardado`);
      return newReport;
    } catch (err) {
      toast.error('Error al guardar informe');
      return null;
    }
  }, [caseId, reports]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return { reports, loading, fetchReports, createReport };
}
