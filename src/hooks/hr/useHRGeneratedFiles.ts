/**
 * useHRGeneratedFiles — Hook para gestión de ficheros TGSS/AEAT generados
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HRGeneratedFile } from '@/types/hr';

export function useHRGeneratedFiles(companyId: string | undefined) {
  const [files, setFiles] = useState<HRGeneratedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFiles = useCallback(async (filters?: {
    file_type?: string;
    status?: string;
    period_year?: number;
    period_month?: number;
  }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_generated_files')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.file_type) query = query.eq('file_type', filters.file_type);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.period_year) query = query.eq('period_year', filters.period_year);
      if (filters?.period_month) query = query.eq('period_month', filters.period_month);

      const { data, error } = await query;
      if (error) throw error;
      setFiles((data || []) as unknown as HRGeneratedFile[]);
    } catch (err) {
      if (import.meta.env.DEV) { console.error('[HR] Error:', err); }
      toast.error('Error cargando ficheros generados');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const updateFileStatus = useCallback(async (
    id: string,
    status: string,
    extra?: { rejection_reason?: string; sent_at?: string; response_at?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('erp_hr_generated_files')
        .update({ status, ...extra } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success(`Estado actualizado a ${status}`);
      await fetchFiles();
      return true;
    } catch (err) {
      toast.error('Error actualizando estado');
      return false;
    }
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    fetchFiles,
    updateFileStatus,
  };
}
