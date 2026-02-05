/**
 * Marketing Campaigns Hook - Phase 1
 * Manages CRM marketing campaigns with full CRUD operations
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface MarketingCampaign {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  type: 'email' | 'social' | 'multichannel' | 'sms' | 'ads';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
  start_date: string | null;
  end_date: string | null;
  audience_segment_id: string | null;
  budget: number;
  spent: number;
  goals: CampaignGoals;
  metrics: CampaignMetrics;
  settings: CampaignSettings;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignGoals {
  conversions?: number;
  opens?: number;
  clicks?: number;
  revenue?: number;
}

export interface CampaignMetrics {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  bounced?: number;
  unsubscribed?: number;
  revenue?: number;
}

export interface CampaignSettings {
  ab_testing?: boolean;
  tracking_enabled?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  send_time?: string;
  timezone?: string;
}

export interface CampaignFilters {
  status?: string;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// === HOOK ===
export function useMarketingCampaigns(companyId?: string) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH CAMPAIGNS ===
  const fetchCampaigns = useCallback(async (filters?: CampaignFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('crm_marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte('start_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('end_date', filters.dateTo);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCampaigns((data || []) as MarketingCampaign[]);
      return data as MarketingCampaign[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching campaigns';
      setError(message);
      console.error('[useMarketingCampaigns] fetchCampaigns error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === CREATE CAMPAIGN ===
  const createCampaign = useCallback(async (
    campaign: Partial<MarketingCampaign>
  ): Promise<MarketingCampaign | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('crm_marketing_campaigns')
        .insert([{
          name: campaign.name,
          description: campaign.description,
          company_id: campaign.company_id || companyId,
          created_by: userData.user?.id,
          status: campaign.status || 'draft',
          type: campaign.type || 'email',
          budget: campaign.budget || 0,
          spent: 0,
          goals: JSON.parse(JSON.stringify(campaign.goals || {})),
          metrics: {},
          settings: JSON.parse(JSON.stringify(campaign.settings || { tracking_enabled: true })),
          tags: campaign.tags,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          audience_segment_id: campaign.audience_segment_id,
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const newCampaign = data as MarketingCampaign;
      setCampaigns(prev => [newCampaign, ...prev]);
      toast.success('Campaña creada correctamente');
      return newCampaign;
    } catch (err) {
      console.error('[useMarketingCampaigns] createCampaign error:', err);
      toast.error('Error al crear la campaña');
      return null;
    }
  }, [companyId]);

  // === UPDATE CAMPAIGN ===
  const updateCampaign = useCallback(async (
    id: string,
    updates: Partial<MarketingCampaign>
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.goals) updateData.goals = JSON.parse(JSON.stringify(updates.goals));
      if (updates.metrics) updateData.metrics = JSON.parse(JSON.stringify(updates.metrics));
      if (updates.settings) updateData.settings = JSON.parse(JSON.stringify(updates.settings));
      
      const { error: updateError } = await supabase
        .from('crm_marketing_campaigns')
        .update(updateData as any)
        .eq('id', id);

      if (updateError) throw updateError;

      setCampaigns(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ));
      toast.success('Campaña actualizada');
      return true;
    } catch (err) {
      console.error('[useMarketingCampaigns] updateCampaign error:', err);
      toast.error('Error al actualizar la campaña');
      return false;
    }
  }, []);

  // === DELETE CAMPAIGN ===
  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_marketing_campaigns')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success('Campaña eliminada');
      return true;
    } catch (err) {
      console.error('[useMarketingCampaigns] deleteCampaign error:', err);
      toast.error('Error al eliminar la campaña');
      return false;
    }
  }, []);

  // === CHANGE STATUS ===
  const changeStatus = useCallback(async (
    id: string,
    status: MarketingCampaign['status']
  ): Promise<boolean> => {
    return updateCampaign(id, { status });
  }, [updateCampaign]);

  // === LAUNCH CAMPAIGN ===
  const launchCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'crm-marketing-automation',
        {
          body: { action: 'launch_campaign', campaignId: id }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        await updateCampaign(id, { status: 'active' });
        toast.success('Campaña lanzada correctamente');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useMarketingCampaigns] launchCampaign error:', err);
      toast.error('Error al lanzar la campaña');
      return false;
    }
  }, [updateCampaign]);

  // === DUPLICATE CAMPAIGN ===
  const duplicateCampaign = useCallback(async (
    id: string
  ): Promise<MarketingCampaign | null> => {
    const original = campaigns.find(c => c.id === id);
    if (!original) return null;

    const { id: _, created_at, updated_at, metrics, ...rest } = original;
    
    return createCampaign({
      ...rest,
      name: `${original.name} (copia)`,
      status: 'draft',
    });
  }, [campaigns, createCampaign]);

  // === GET CAMPAIGN STATS ===
  const getCampaignStats = useCallback(() => {
    const stats = {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      draft: campaigns.filter(c => c.status === 'draft').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      totalSpent: campaigns.reduce((sum, c) => sum + (c.spent || 0), 0),
      totalSent: campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0),
      totalOpened: campaigns.reduce((sum, c) => sum + (c.metrics?.opened || 0), 0),
      totalClicked: campaigns.reduce((sum, c) => sum + (c.metrics?.clicked || 0), 0),
      avgOpenRate: 0,
      avgClickRate: 0,
    };

    if (stats.totalSent > 0) {
      stats.avgOpenRate = (stats.totalOpened / stats.totalSent) * 100;
      stats.avgClickRate = (stats.totalClicked / stats.totalSent) * 100;
    }

    return stats;
  }, [campaigns]);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    changeStatus,
    launchCampaign,
    duplicateCampaign,
    getCampaignStats,
  };
}

export default useMarketingCampaigns;
