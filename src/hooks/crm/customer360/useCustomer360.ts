/**
 * Customer 360 & CDP Hook
 * Unified customer profiles, timeline, and identity resolution
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// === TYPES ===
export type LifecycleStage = 'visitor' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer' | 'evangelist' | 'churned';
export type AccountTier = 'standard' | 'silver' | 'gold' | 'platinum' | 'enterprise';
export type PreferredChannel = 'email' | 'phone' | 'sms' | 'whatsapp' | 'chat' | 'social';

export interface UnifiedProfile {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  display_name: string;
  primary_email: string | null;
  secondary_emails: string[];
  primary_phone: string | null;
  secondary_phones: string[];
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  company_size: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  headquarters_location: Record<string, unknown>;
  total_score: number;
  engagement_score: number;
  fit_score: number;
  intent_score: number;
  health_score: number;
  lifetime_value: number;
  lifecycle_stage: LifecycleStage;
  customer_segment: string | null;
  persona_type: string | null;
  account_tier: AccountTier;
  preferred_channel: PreferredChannel;
  preferred_language: string;
  timezone: string;
  first_touch_at: string | null;
  last_touch_at: string | null;
  last_activity_at: string | null;
  total_touchpoints: number;
  total_interactions: number;
  is_merged: boolean;
  merge_source_ids: string[];
  data_quality_score: number;
  requires_enrichment: boolean;
  custom_attributes: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Touchpoint {
  id: string;
  company_id: string | null;
  profile_id: string;
  touchpoint_type: string;
  channel: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  source: string | null;
  campaign_id: string | null;
  utm_params: Record<string, unknown>;
  performed_by: string | null;
  engagement_value: number;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  reference_type: string | null;
  reference_id: string | null;
  occurred_at: string;
  duration_seconds: number | null;
  created_at: string;
}

export interface CDPSegment {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  segment_type: 'static' | 'dynamic' | 'predictive' | 'ai_generated';
  conditions: Json;
  condition_logic: 'AND' | 'OR';
  member_count: number;
  last_computed_at: string | null;
  is_active: boolean;
  auto_refresh: boolean;
  category: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// === HOOK ===
export function useCustomer360() {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // === FETCH PROFILES ===
  const { data: profiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ['crm-unified-profiles'],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_unified_profiles')
        .select('*')
        .order('last_activity_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as UnifiedProfile[];
    }
  });

  // === FETCH SINGLE PROFILE ===
  const { data: selectedProfile } = useQuery({
    queryKey: ['crm-unified-profile', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return null;
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_unified_profiles')
        .select('*')
        .eq('id', selectedProfileId)
        .single();

      if (error) throw error;
      return data as UnifiedProfile;
    },
    enabled: !!selectedProfileId
  });

  // === FETCH TOUCHPOINTS FOR PROFILE ===
  const { data: touchpoints = [] } = useQuery({
    queryKey: ['crm-touchpoints', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_touchpoints')
        .select('*')
        .eq('profile_id', selectedProfileId)
        .order('occurred_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Touchpoint[];
    },
    enabled: !!selectedProfileId
  });

  // === FETCH SEGMENTS ===
  const { data: segments = [], refetch: refetchSegments } = useQuery({
    queryKey: ['crm-cdp-segments'],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_cdp_segments')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) throw error;
      return data as CDPSegment[];
    }
  });

  // === CREATE PROFILE ===
  const createProfile = useMutation({
    mutationFn: async (profile: Partial<UnifiedProfile>) => {
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_unified_profiles')
        .insert({
          ...profile,
          custom_attributes: JSON.parse(JSON.stringify(profile.custom_attributes || {})),
          headquarters_location: JSON.parse(JSON.stringify(profile.headquarters_location || {}))
        })
        .select()
        .single();

      if (error) throw error;
      return data as UnifiedProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-unified-profiles'] });
      toast.success('Perfil creado');
    },
    onError: (err) => {
      console.error('[useCustomer360] createProfile error:', err);
      toast.error('Error al crear perfil');
    }
  });

  // === UPDATE PROFILE ===
  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnifiedProfile> & { id: string }) => {
      const client = supabase as any;
      const updateData: any = { ...updates };
      if (updates.custom_attributes) {
        updateData.custom_attributes = JSON.parse(JSON.stringify(updates.custom_attributes));
      }
      if (updates.headquarters_location) {
        updateData.headquarters_location = JSON.parse(JSON.stringify(updates.headquarters_location));
      }

      const { error } = await client
        .from('crm_unified_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-unified-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['crm-unified-profile'] });
      toast.success('Perfil actualizado');
    },
    onError: (err) => {
      console.error('[useCustomer360] updateProfile error:', err);
      toast.error('Error al actualizar perfil');
    }
  });

  // === ADD TOUCHPOINT ===
  const addTouchpoint = useMutation({
    mutationFn: async (touchpoint: Partial<Touchpoint>) => {
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_touchpoints')
        .insert({
          ...touchpoint,
          metadata: JSON.parse(JSON.stringify(touchpoint.metadata || {})),
          utm_params: JSON.parse(JSON.stringify(touchpoint.utm_params || {}))
        })
        .select()
        .single();

      if (error) throw error;
      return data as Touchpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-touchpoints'] });
      queryClient.invalidateQueries({ queryKey: ['crm-unified-profile'] });
      toast.success('Touchpoint registrado');
    }
  });

  // === CREATE SEGMENT ===
  const createSegment = useMutation({
    mutationFn: async (segment: Partial<CDPSegment>) => {
      const client = supabase as any;
      const { data, error } = await client
        .from('crm_cdp_segments')
        .insert({
          ...segment,
          conditions: JSON.parse(JSON.stringify(segment.conditions || []))
        })
        .select()
        .single();

      if (error) throw error;
      return data as CDPSegment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cdp-segments'] });
      toast.success('Segmento creado');
    }
  });

  // === ENRICH PROFILE (AI) ===
  const enrichProfile = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('crm-customer-360', {
        body: { action: 'enrich', profileId }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['crm-unified-profile', profileId] });
      toast.success('Perfil enriquecido con IA');
      return data;
    } catch (err) {
      console.error('[useCustomer360] enrichProfile error:', err);
      toast.error('Error al enriquecer perfil');
      return null;
    }
  }, [queryClient]);

  // === MERGE PROFILES ===
  const mergeProfiles = useCallback(async (sourceIds: string[], targetId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('crm-customer-360', {
        body: { action: 'merge', sourceIds, targetId }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['crm-unified-profiles'] });
      toast.success('Perfiles fusionados');
      return data;
    } catch (err) {
      console.error('[useCustomer360] mergeProfiles error:', err);
      toast.error('Error al fusionar perfiles');
      return null;
    }
  }, [queryClient]);

  // === STATS ===
  const stats = {
    totalProfiles: profiles.length,
    leads: profiles.filter(p => p.lifecycle_stage === 'lead').length,
    customers: profiles.filter(p => p.lifecycle_stage === 'customer').length,
    avgHealthScore: profiles.length > 0 
      ? Math.round(profiles.reduce((sum, p) => sum + p.health_score, 0) / profiles.length)
      : 0,
    totalSegments: segments.length,
    activeSegments: segments.filter(s => s.is_active).length
  };

  return {
    // Data
    profiles,
    selectedProfile,
    touchpoints,
    segments,
    stats,
    // Loading
    isLoading: profilesLoading,
    // Selection
    selectedProfileId,
    setSelectedProfileId,
    // Actions
    createProfile: createProfile.mutateAsync,
    updateProfile: updateProfile.mutateAsync,
    addTouchpoint: addTouchpoint.mutateAsync,
    createSegment: createSegment.mutateAsync,
    enrichProfile,
    mergeProfiles,
    // Refetch
    refetchProfiles,
    refetchSegments
  };
}

export default useCustomer360;
