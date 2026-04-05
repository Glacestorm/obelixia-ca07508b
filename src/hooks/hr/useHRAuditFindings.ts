/**
 * useHRAuditFindings — Hook para gestión de hallazgos de auditoría ISO
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HRAuditFinding, HRAuditKPIs } from '@/types/hr';

export function useHRAuditFindings(companyId: string | undefined) {
  const [findings, setFindings] = useState<HRAuditFinding[]>([]);
  const [kpis, setKPIs] = useState<HRAuditKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFindings = useCallback(async (filters?: {
    status?: string;
    severity?: string;
    iso_standard?: string;
  }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_audit_findings')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.iso_standard) query = query.eq('iso_standard', filters.iso_standard);

      const { data, error } = await query;
      if (error) throw error;
      setFindings((data || []) as HRAuditFinding[]);
    } catch (err) {
      if (import.meta.env.DEV) { console.error('[HR] Error:', err); }
      toast.error('Error cargando hallazgos de auditoría');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchKPIs = useCallback(async () => {
    if (!companyId) return;
    try {
      const [findingsRes, reportsRes, exportsRes, filesRes] = await Promise.all([
        supabase.from('erp_audit_findings').select('severity, status').eq('company_id', companyId),
        supabase.from('erp_audit_reports').select('id').eq('company_id', companyId),
        supabase.from('erp_audit_document_exports').select('status').eq('company_id', companyId),
        supabase.from('erp_hr_generated_files').select('status').eq('company_id', companyId),
      ]);

      const allFindings = findingsRes.data || [];
      const allFiles = filesRes.data || [];

      setKPIs({
        totalFindings: allFindings.length,
        openFindings: allFindings.filter(f => f.status === 'open' || f.status === 'in_progress').length,
        criticalFindings: allFindings.filter(f => f.severity === 'critical').length,
        complianceRate: allFindings.length > 0
          ? Math.round((allFindings.filter(f => f.status === 'closed' || f.status === 'verified').length / allFindings.length) * 100)
          : 100,
        totalReports: (reportsRes.data || []).length,
        pendingExports: (exportsRes.data || []).filter(e => e.status === 'pending' || e.status === 'generating').length,
        generatedFiles: allFiles.length,
        pendingFiles: allFiles.filter(f => f.status === 'generated' || f.status === 'validated').length,
        rejectedFiles: allFiles.filter(f => f.status === 'rejected').length,
      });
    } catch (err) {
      if (import.meta.env.DEV) { console.error('[HR] Error:', err); }
    }
  }, [companyId]);

  const createFinding = useCallback(async (finding: Partial<HRAuditFinding>) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase
        .from('erp_audit_findings')
        .insert([{ ...finding, company_id: companyId }])
        .select()
        .single();
      if (error) throw error;
      toast.success('Hallazgo registrado');
      await fetchFindings();
      return data;
    } catch (err) {
      toast.error('Error al registrar hallazgo');
      return null;
    }
  }, [companyId, fetchFindings]);

  const updateFinding = useCallback(async (id: string, updates: Partial<HRAuditFinding>) => {
    try {
      const { error } = await supabase
        .from('erp_audit_findings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      toast.success('Hallazgo actualizado');
      await fetchFindings();
      return true;
    } catch (err) {
      toast.error('Error al actualizar hallazgo');
      return false;
    }
  }, [fetchFindings]);

  return {
    findings,
    kpis,
    isLoading,
    fetchFindings,
    fetchKPIs,
    createFinding,
    updateFinding,
  };
}
