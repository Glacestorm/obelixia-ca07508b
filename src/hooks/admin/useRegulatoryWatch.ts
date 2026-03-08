/**
 * useRegulatoryWatch - Hook para vigilancia normativa
 * Sistema de control de cambios regulatorios por jurisdicción
 * Gestiona convenios, CNO, y normativas oficiales (BOE, BOPA, etc.)
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface RegulatoryWatchItem {
  id: string;
  company_id?: string;
  title: string;
  description?: string;
  source_type: 'press' | 'draft' | 'proposal' | 'rumor' | 'union_communication' | 'ministry_announcement';
  source_url?: string;
  source_name?: string;
  detected_at: string;
  category: string;
  jurisdiction: string;
  affected_cnae_codes?: string[];
  approval_status: 'pending' | 'approved' | 'rejected' | 'in_force' | 'expired' | 'superseded';
  official_publication?: string;
  official_publication_date?: string;
  official_publication_number?: string;
  official_publication_url?: string;
  effective_date?: string;
  key_changes?: Record<string, unknown>;
  affected_articles?: string[];
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  requires_contract_update: boolean;
  requires_payroll_recalc: boolean;
  requires_immediate_action: boolean;
  estimated_affected_employees?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  implementation_status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
  implemented_at?: string;
  implemented_by?: string;
  knowledge_base_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryWatchConfig {
  id: string;
  company_id: string;
  auto_check_enabled: boolean;
  check_frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  check_time: string;
  jurisdictions: string[];
  watch_boe: boolean;
  watch_bopa: boolean;
  watch_dogc: boolean;
  watch_bocm: boolean;
  watch_bopv: boolean;
  watch_eu_official_journal: boolean;
  watch_press: boolean;
  watch_ministry_announcements: boolean;
  watch_union_communications: boolean;
  watch_categories: string[];
  notify_on_detection: boolean;
  notify_on_approval: boolean;
  notify_responsible_ids?: string[];
  last_check_at?: string;
  last_check_status?: string;
  last_check_results?: Record<string, unknown>;
}

export interface RegulatoryAlert {
  id: string;
  company_id: string;
  watch_item_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action_required?: string;
  action_deadline?: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface CNOVersion {
  id: string;
  version_code: string;
  version_name: string;
  publication_date: string;
  effective_date: string;
  official_publication?: string;
  official_publication_url?: string;
  is_current: boolean;
  total_codes?: number;
}

// === HOOK ===
export function useRegulatoryWatch(companyId?: string) {
  const [items, setItems] = useState<RegulatoryWatchItem[]>([]);
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>([]);
  const [config, setConfig] = useState<RegulatoryWatchConfig | null>(null);
  const [cnoVersions, setCnoVersions] = useState<CNOVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // === FETCH ITEMS ===
  const fetchItems = useCallback(async (filters?: {
    status?: string;
    category?: string;
    jurisdiction?: string;
  }) => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_regulatory_watch')
        .select('*')
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .order('detected_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('approval_status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.jurisdiction) {
        query = query.eq('jurisdiction', filters.jurisdiction);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems((data || []) as unknown as RegulatoryWatchItem[]);
    } catch (error) {
      console.error('[useRegulatoryWatch] fetchItems error:', error);
      toast.error('Error al cargar normativas');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === FETCH ALERTS ===
  const fetchAlerts = useCallback(async (unreadOnly = true) => {
    if (!companyId) return;

    try {
      let query = supabase
        .from('erp_hr_regulatory_alerts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts((data || []) as unknown as RegulatoryAlert[]);
    } catch (error) {
      console.error('[useRegulatoryWatch] fetchAlerts error:', error);
    }
  }, [companyId]);

  // === FETCH CONFIG ===
  const fetchConfig = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('erp_hr_regulatory_watch_config')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setConfig(data as unknown as RegulatoryWatchConfig);
    } catch (error) {
      console.error('[useRegulatoryWatch] fetchConfig error:', error);
    }
  }, [companyId]);

  // === FETCH CNO VERSIONS ===
  const fetchCNOVersions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_cno_versions')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;
      setCnoVersions(data as unknown as CNOVersion[]);
    } catch (error) {
      console.error('[useRegulatoryWatch] fetchCNOVersions error:', error);
    }
  }, []);

  // === UPDATE CONFIG ===
  const updateConfig = useCallback(async (updates: Partial<RegulatoryWatchConfig>) => {
    if (!companyId) return null;

    try {
      const { data, error } = await supabase
        .from('erp_hr_regulatory_watch_config')
        .upsert({
          company_id: companyId,
          ...updates,
          updated_at: new Date().toISOString()
        } as never)
        .select()
        .single();

      if (error) throw error;

      setConfig(data as unknown as RegulatoryWatchConfig);
      toast.success('Configuración actualizada');
      return data;
    } catch (error) {
      console.error('[useRegulatoryWatch] updateConfig error:', error);
      toast.error('Error al actualizar configuración');
      return null;
    }
  }, [companyId]);

  // === RUN MANUAL CHECK ===
  const runManualCheck = useCallback(async () => {
    if (!companyId) return null;

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-regulatory-watch', {
        body: {
          action: 'check_updates',
          company_id: companyId,
          jurisdictions: config?.jurisdictions || ['ES'],
          categories: config?.watch_categories || ['convenio_colectivo', 'cno', 'salario_minimo']
        }
      });

      if (error) throw error;

      // Actualizar última ejecución
      await updateConfig({
        last_check_at: new Date().toISOString(),
        last_check_status: 'completed',
        last_check_results: data
      });

      // Recargar datos
      await Promise.all([
        fetchItems(),
        fetchAlerts()
      ]);

      toast.success(`Chequeo completado: ${data?.new_items || 0} nuevos elementos detectados`);
      return data;
    } catch (error) {
      console.error('[useRegulatoryWatch] runManualCheck error:', error);
      toast.error('Error al ejecutar chequeo');
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [companyId, config, updateConfig, fetchItems, fetchAlerts]);

  // === MARK AS APPROVED ===
  const markAsApproved = useCallback(async (
    itemId: string,
    officialData: {
      publication: string;
      publication_date: string;
      publication_number?: string;
      publication_url?: string;
      effective_date: string;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('erp_hr_regulatory_watch')
        .update({
          approval_status: 'approved',
          official_publication: officialData.publication,
          official_publication_date: officialData.publication_date,
          official_publication_number: officialData.publication_number,
          official_publication_url: officialData.publication_url,
          effective_date: officialData.effective_date,
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', itemId);

      if (error) throw error;

      // Crear alerta de aprobación
      await supabase.from('erp_hr_regulatory_alerts').insert({
        company_id: companyId,
        watch_item_id: itemId,
        alert_type: 'approved',
        severity: 'warning',
        title: 'Normativa aprobada oficialmente',
        message: `La normativa ha sido publicada en ${officialData.publication} y entrará en vigor el ${officialData.effective_date}`,
        action_required: 'Revisar impacto y planificar implementación',
        action_deadline: officialData.effective_date
      } as never);

      toast.success('Normativa marcada como aprobada');
      await fetchItems();
    } catch (error) {
      console.error('[useRegulatoryWatch] markAsApproved error:', error);
      toast.error('Error al actualizar estado');
    }
  }, [companyId, fetchItems]);

  // === IMPLEMENT REGULATION ===
  const implementRegulation = useCallback(async (
    itemId: string,
    userId: string
  ) => {
    try {
      // 1. Actualizar estado de implementación
      const { data: item, error: updateError } = await supabase
        .from('erp_hr_regulatory_watch')
        .update({
          implementation_status: 'completed',
          implemented_at: new Date().toISOString(),
          implemented_by: userId
        } as never)
        .eq('id', itemId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Crear entrada en base de conocimiento
      const watchItem = item as unknown as RegulatoryWatchItem;
      
      const { data: knowledgeEntry, error: kbError } = await supabase
        .from('agent_knowledge_base')
        .insert({
          agent_id: 'hr-agent',
          agent_type: 'hr',
          category: 'normativa',
          title: watchItem.title,
          content: `${watchItem.description || ''}\n\nPublicación oficial: ${watchItem.official_publication} (${watchItem.official_publication_date})\nFecha de entrada en vigor: ${watchItem.effective_date}\n\nCambios clave: ${JSON.stringify(watchItem.key_changes || {})}`,
          tags: [watchItem.category, watchItem.jurisdiction, 'normativa_vigente'],
          is_active: true,
          is_verified: true,
          source: watchItem.official_publication_url || 'Vigilancia normativa',
          created_by: userId
        } as never)
        .select()
        .single();

      if (kbError) {
        console.error('Error creating knowledge base entry:', kbError);
      } else {
        // Vincular KB a la normativa
        await supabase
          .from('erp_hr_regulatory_watch')
          .update({ knowledge_base_id: (knowledgeEntry as { id: string }).id } as never)
          .eq('id', itemId);
      }

      toast.success('Normativa implementada y añadida a la base de conocimiento');
      await fetchItems();
    } catch (error) {
      console.error('[useRegulatoryWatch] implementRegulation error:', error);
      toast.error('Error al implementar normativa');
    }
  }, [fetchItems]);

  // === MARK ALERT AS READ ===
  const markAlertAsRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_regulatory_alerts')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        } as never)
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts(false);
    } catch (error) {
      console.error('[useRegulatoryWatch] markAlertAsRead error:', error);
    }
  }, [fetchAlerts]);

  // === DISMISS ALERT ===
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_regulatory_alerts')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        } as never)
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (error) {
      console.error('[useRegulatoryWatch] dismissAlert error:', error);
    }
  }, [fetchAlerts]);

  // === ADD MANUAL ITEM ===
  const addManualItem = useCallback(async (item: Partial<RegulatoryWatchItem>) => {
    if (!companyId) return null;

    try {
      const { data, error } = await supabase
        .from('erp_hr_regulatory_watch')
        .insert({
          company_id: companyId,
          ...item,
          detected_at: new Date().toISOString()
        } as never)
        .select()
        .single();

      if (error) throw error;

      toast.success('Normativa añadida manualmente');
      await fetchItems();
      return data;
    } catch (error) {
      console.error('[useRegulatoryWatch] addManualItem error:', error);
      toast.error('Error al añadir normativa');
      return null;
    }
  }, [companyId, fetchItems]);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (companyId) {
      fetchItems();
      fetchAlerts();
      fetchConfig();
      fetchCNOVersions();
    }
  }, [companyId, fetchItems, fetchAlerts, fetchConfig, fetchCNOVersions]);

  // === COMPUTED VALUES ===
  const pendingImplementations = items.filter(
    i => i.approval_status === 'approved' && 
        i.implementation_status !== 'completed' &&
        i.implementation_status !== 'not_applicable'
  );

  const upcomingEffective = items.filter(i => {
    if (!i.effective_date) return false;
    const daysUntil = Math.ceil(
      (new Date(i.effective_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil > 0 && daysUntil <= 30 && i.approval_status === 'approved';
  });

  const unreadAlertsCount = alerts.filter(a => !a.is_read).length;

  return {
    // Estado
    items,
    alerts,
    config,
    cnoVersions,
    isLoading,
    isChecking,
    // Computed
    pendingImplementations,
    upcomingEffective,
    unreadAlertsCount,
    // Acciones
    fetchItems,
    fetchAlerts,
    updateConfig,
    runManualCheck,
    markAsApproved,
    implementRegulation,
    markAlertAsRead,
    dismissAlert,
    addManualItem
  };
}

export default useRegulatoryWatch;
