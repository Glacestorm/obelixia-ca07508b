import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BoardPackTemplate {
  id: string;
  company_id: string;
  name: string;
  audience: string;
  description: string | null;
  sections: string[];
  default_period: string;
  ai_narrative_enabled: boolean;
  is_active: boolean;
}

export interface BoardPackSection {
  id: string;
  board_pack_id: string;
  section_key: string;
  title: string;
  order_index: number;
  narrative: string | null;
  data_source: string | null;
  metrics: Array<{ label: string; value: string; change?: number }>;
  alerts: Array<{ level: string; message: string }>;
  recommendations: string[];
}

export interface BoardPack {
  id: string;
  company_id: string;
  template_id: string | null;
  title: string;
  audience: string;
  period_start: string;
  period_end: string;
  status: string;
  executive_summary: string | null;
  ai_narrative: Record<string, unknown>;
  key_metrics: Array<{ label: string; value: string; change?: number; trend?: string; severity?: string }>;
  data_sources: Array<{ section: string; source: string }>;
  disclaimers: string[];
  modules_included: string[];
  generated_at: string;
  approved_at: string | null;
  erp_hr_board_pack_sections?: BoardPackSection[];
}

export interface BoardPackReview {
  id: string;
  board_pack_id: string;
  action: string;
  reviewer_name: string | null;
  comments: string | null;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
}

export interface BoardPackDistribution {
  id: string;
  board_pack_id: string;
  channel: string;
  recipient: string | null;
  status: string;
  distributed_at: string;
}

const AUDIENCE_LABELS: Record<string, string> = {
  board_directors: 'Consejo de Administración',
  executive_committee: 'Comité de Dirección',
  audit_committee: 'Comité de Auditoría',
  risk_committee: 'Comité de Riesgos',
  compliance_committee: 'Comité de Compliance',
  hr_strategic: 'Comité Estratégico RRHH',
};

export function useHRBoardPack(companyId?: string) {
  const [templates, setTemplates] = useState<BoardPackTemplate[]>([]);
  const [packs, setPacks] = useState<BoardPack[]>([]);
  const [reviews, setReviews] = useState<BoardPackReview[]>([]);
  const [distributions, setDistributions] = useState<BoardPackDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('hr-board-pack', {
        body: { action: 'list_templates', companyId }
      });
      if (fnError) throw fnError;
      if (data?.success) setTemplates(data.templates || []);
    } catch (err) {
      console.error('[useHRBoardPack] fetchTemplates error:', err);
    }
  }, [companyId]);

  const fetchPacks = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('hr-board-pack', {
        body: { action: 'list_packs', companyId }
      });
      if (fnError) throw fnError;
      if (data?.success) setPacks(data.packs || []);
    } catch (err) {
      console.error('[useHRBoardPack] fetchPacks error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchReviews = useCallback(async (packId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_board_pack_reviews')
        .select('*')
        .eq('board_pack_id', packId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReviews((data as unknown as BoardPackReview[]) || []);
    } catch (err) {
      console.error('[useHRBoardPack] fetchReviews error:', err);
    }
  }, []);

  const fetchDistributions = useCallback(async (packId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_board_pack_distribution')
        .select('*')
        .eq('board_pack_id', packId)
        .order('distributed_at', { ascending: false });
      if (error) throw error;
      setDistributions((data as unknown as BoardPackDistribution[]) || []);
    } catch (err) {
      console.error('[useHRBoardPack] fetchDistributions error:', err);
    }
  }, []);

  const generatePack = useCallback(async (
    templateId: string,
    period: { start: string; end: string }
  ): Promise<BoardPack | null> => {
    if (!companyId) return null;
    setIsGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('hr-board-pack', {
        body: { action: 'generate_pack', companyId, templateId, period }
      });
      if (fnError) throw fnError;
      if (data?.success && data?.pack) {
        toast.success('Board pack generado');
        await fetchPacks();
        return data.pack;
      }
      throw new Error(data?.error || 'Error generating pack');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      toast.error('Error al generar board pack');
      console.error('[useHRBoardPack] generatePack error:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, fetchPacks]);

  const updateStatus = useCallback(async (
    packId: string,
    newStatus: string,
    comments?: string,
    reviewerName?: string
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('hr-board-pack', {
        body: { action: 'update_status', packId, status: newStatus, comments, reviewerName }
      });
      if (fnError) throw fnError;
      if (data?.success) {
        toast.success(`Estado actualizado a ${newStatus}`);
        await fetchPacks();
        await fetchReviews(packId);
      }
    } catch (err) {
      console.error('[useHRBoardPack] updateStatus error:', err);
      toast.error('Error al actualizar estado');
    }
  }, [fetchPacks, fetchReviews]);

  const logDistribution = useCallback(async (
    packId: string,
    channel: string,
    recipient?: string
  ) => {
    try {
      await supabase.from('erp_hr_board_pack_distribution').insert({
        board_pack_id: packId,
        channel,
        recipient: recipient || null,
        status: 'sent',
      } as any);
      toast.success('Distribución registrada');
      await fetchDistributions(packId);
    } catch (err) {
      console.error('[useHRBoardPack] logDistribution error:', err);
    }
  }, [fetchDistributions]);

  useEffect(() => {
    fetchTemplates();
    fetchPacks();
  }, [fetchTemplates, fetchPacks]);

  return {
    templates,
    packs,
    reviews,
    distributions,
    isLoading,
    isGenerating,
    error,
    audienceLabels: AUDIENCE_LABELS,
    fetchTemplates,
    fetchPacks,
    fetchReviews,
    fetchDistributions,
    generatePack,
    updateStatus,
    logDistribution,
  };
}

export default useHRBoardPack;
