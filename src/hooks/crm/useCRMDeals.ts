import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCRMContext } from './useCRMContext';
import { toast } from 'sonner';

export interface CRMDeal {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage: string;
  probability: number | null;
  priority: string;
  expected_close_date: string | null;
  closed_at: string | null;
  owner_id: string | null;
  team_id: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null | undefined;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-500' },
  { value: 'qualified', label: 'Calificado', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Propuesta', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negociación', color: 'bg-orange-500' },
  { value: 'won', label: 'Ganado', color: 'bg-green-500' },
  { value: 'lost', label: 'Perdido', color: 'bg-red-500' },
];

export function useCRMDeals() {
  const { currentWorkspace, hasPermission } = useCRMContext();
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    stage?: string;
    search?: string;
    contactId?: string;
  }>({});

  const fetchDeals = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    if (!hasPermission('deals.read')) {
      toast.error('No tienes permiso para ver deals');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('crm_deals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filters.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeals((data as CRMDeal[]) || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Error al cargar deals');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, filters, hasPermission]);

  const createDeal = useCallback(async (deal: Omit<Partial<CRMDeal>, 'title'> & { title: string }) => {
    if (!currentWorkspace?.id) return null;
    if (!hasPermission('deals.create')) {
      toast.error('No tienes permiso para crear deals');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('crm_deals')
        .insert([{ 
          title: deal.title,
          description: deal.description,
          value: deal.value,
          stage: deal.stage || 'lead',
          priority: deal.priority || 'medium',
          expected_close_date: deal.expected_close_date,
          contact_id: deal.contact_id,
          workspace_id: currentWorkspace.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setDeals(prev => [data as CRMDeal, ...prev]);
      toast.success('Deal creado correctamente');
      return data as CRMDeal;
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Error al crear deal');
      return null;
    }
  }, [currentWorkspace?.id, hasPermission]);

  const updateDeal = useCallback(async (id: string, updates: Partial<CRMDeal>) => {
    if (!hasPermission('deals.update')) {
      toast.error('No tienes permiso para editar deals');
      return false;
    }

    try {
      const { custom_fields, ...restUpdates } = updates;
      const { error } = await supabase
        .from('crm_deals')
        .update(restUpdates)
        .eq('id', id);

      if (error) throw error;
      
      setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      toast.success('Deal actualizado');
      return true;
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Error al actualizar deal');
      return false;
    }
  }, [hasPermission]);

  const deleteDeal = useCallback(async (id: string) => {
    if (!hasPermission('deals.delete')) {
      toast.error('No tienes permiso para eliminar deals');
      return false;
    }

    try {
      const { error } = await supabase
        .from('crm_deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDeals(prev => prev.filter(d => d.id !== id));
      toast.success('Deal eliminado');
      return true;
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Error al eliminar deal');
      return false;
    }
  }, [hasPermission]);

  const moveDealToStage = useCallback(async (id: string, stage: DealStage) => {
    const updates: Partial<CRMDeal> = { stage };
    if (stage === 'won' || stage === 'lost') {
      updates.closed_at = new Date().toISOString();
    }
    return updateDeal(id, updates);
  }, [updateDeal]);

  const getDealsByStage = useCallback(() => {
    const grouped: Record<DealStage, CRMDeal[]> = {
      lead: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    deals.forEach(deal => {
      const stage = deal.stage as DealStage;
      if (grouped[stage]) {
        grouped[stage].push(deal);
      }
    });
    return grouped;
  }, [deals]);

  const getPipelineStats = useCallback(() => {
    const stats = {
      totalValue: 0,
      totalDeals: deals.length,
      wonValue: 0,
      wonDeals: 0,
      lostDeals: 0,
      avgDealValue: 0,
      conversionRate: 0,
    };

    deals.forEach(deal => {
      if (deal.value) {
        stats.totalValue += deal.value;
        if (deal.stage === 'won') {
          stats.wonValue += deal.value;
          stats.wonDeals++;
        }
      }
      if (deal.stage === 'lost') stats.lostDeals++;
    });

    const closedDeals = stats.wonDeals + stats.lostDeals;
    stats.avgDealValue = stats.totalDeals > 0 ? stats.totalValue / stats.totalDeals : 0;
    stats.conversionRate = closedDeals > 0 ? (stats.wonDeals / closedDeals) * 100 : 0;

    return stats;
  }, [deals]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return {
    deals,
    loading,
    filters,
    setFilters,
    fetchDeals,
    createDeal,
    updateDeal,
    deleteDeal,
    moveDealToStage,
    getDealsByStage,
    getPipelineStats,
  };
}

export default useCRMDeals;
