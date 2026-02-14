/**
 * useGaliaPartnerCRM - Hook para gestión CRM de socios LEADER
 * Actuación 5: Socios potenciales, interacciones y evaluación
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface GaliaPartner {
  id: string;
  name: string;
  type: 'gal' | 'organismo_publico' | 'centro_tecnologico' | 'universidad' | 'empresa' | 'asociacion' | 'otro';
  territory: string | null;
  scope: 'local' | 'regional' | 'nacional' | 'transnacional';
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: 'identificado' | 'contactado' | 'interesado' | 'comprometido' | 'descartado';
  interest_declaration: 'si' | 'no' | 'pendiente';
  notes: string | null;
  website: string | null;
  evaluation_scores: Record<string, number>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GaliaPartnerInteraction {
  id: string;
  partner_id: string;
  interaction_type: 'llamada' | 'email' | 'reunion' | 'evento' | 'nota' | 'documento';
  description: string;
  date: string;
  performed_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PartnerFilters {
  type?: string;
  scope?: string;
  status?: string;
  search?: string;
}

// Criterios de evaluación con pesos
export const EVALUATION_CRITERIA = [
  { key: 'afinidad_objetivos', label: 'Afinidad de Objetivos', weight: 25 },
  { key: 'capacidad_tecnica', label: 'Capacidad Técnica', weight: 20 },
  { key: 'experiencia_relevante', label: 'Experiencia Relevante', weight: 20 },
  { key: 'compromiso_financiero', label: 'Compromiso Financiero', weight: 15 },
  { key: 'cobertura_territorial', label: 'Cobertura Territorial', weight: 10 },
  { key: 'complementariedad', label: 'Complementariedad', weight: 10 },
];

export function useGaliaPartnerCRM() {
  const [partners, setPartners] = useState<GaliaPartner[]>([]);
  const [interactions, setInteractions] = useState<GaliaPartnerInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<PartnerFilters>({});
  const { user } = useAuth();

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('galia_partners')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters.type) query = query.eq('type', filters.type);
      if (filters.scope) query = query.eq('scope', filters.scope);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) query = query.ilike('name', `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      setPartners((data || []) as GaliaPartner[]);
    } catch (err) {
      console.error('[useGaliaPartnerCRM] fetchPartners:', err);
      toast.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Create partner
  const createPartner = useCallback(async (partner: Partial<GaliaPartner>) => {
    if (!user?.id) { toast.error('Debes iniciar sesión'); return null; }
    try {
      const { data, error } = await supabase
        .from('galia_partners')
        .insert([{ ...partner, created_by: user.id } as any])
        .select()
        .single();
      if (error) throw error;
      const newPartner = data as GaliaPartner;
      setPartners(prev => [newPartner, ...prev]);
      toast.success('Socio creado correctamente');
      return newPartner;
    } catch (err) {
      console.error('[useGaliaPartnerCRM] createPartner:', err);
      toast.error('Error al crear socio');
      return null;
    }
  }, [user?.id]);

  // Update partner
  const updatePartner = useCallback(async (id: string, updates: Partial<GaliaPartner>) => {
    try {
      const { error } = await supabase
        .from('galia_partners')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Socio actualizado');
      return true;
    } catch (err) {
      console.error('[useGaliaPartnerCRM] updatePartner:', err);
      toast.error('Error al actualizar socio');
      return false;
    }
  }, []);

  // Delete partner
  const deletePartner = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('galia_partners').delete().eq('id', id);
      if (error) throw error;
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success('Socio eliminado');
      return true;
    } catch (err) {
      console.error('[useGaliaPartnerCRM] deletePartner:', err);
      toast.error('Error al eliminar socio');
      return false;
    }
  }, []);

  // Fetch interactions for a partner
  const fetchInteractions = useCallback(async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('galia_partner_interactions')
        .select('*')
        .eq('partner_id', partnerId)
        .order('date', { ascending: false });
      if (error) throw error;
      setInteractions((data || []) as GaliaPartnerInteraction[]);
    } catch (err) {
      console.error('[useGaliaPartnerCRM] fetchInteractions:', err);
    }
  }, []);

  // Add interaction
  const addInteraction = useCallback(async (interaction: Partial<GaliaPartnerInteraction>) => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('galia_partner_interactions')
        .insert([{ ...interaction, performed_by: user.id } as any])
        .select()
        .single();
      if (error) throw error;
      const newInteraction = data as GaliaPartnerInteraction;
      setInteractions(prev => [newInteraction, ...prev]);
      toast.success('Interacción registrada');
      return newInteraction;
    } catch (err) {
      console.error('[useGaliaPartnerCRM] addInteraction:', err);
      toast.error('Error al registrar interacción');
      return null;
    }
  }, [user?.id]);

  // Calculate weighted score
  const calculateScore = useCallback((scores: Record<string, number>): number => {
    let totalScore = 0;
    let totalWeight = 0;
    EVALUATION_CRITERIA.forEach(c => {
      const val = scores[c.key];
      if (val !== undefined && val > 0) {
        totalScore += val * c.weight;
        totalWeight += c.weight;
      }
    });
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }, []);

  // Stats
  const getStats = useCallback(() => {
    const byStatus = partners.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = partners.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: partners.length,
      byStatus,
      byType,
      comprometidos: byStatus['comprometido'] || 0,
      interesados: byStatus['interesado'] || 0,
    };
  }, [partners]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  return {
    partners,
    interactions,
    loading,
    filters,
    setFilters,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
    fetchInteractions,
    addInteraction,
    calculateScore,
    getStats,
  };
}

export default useGaliaPartnerCRM;
