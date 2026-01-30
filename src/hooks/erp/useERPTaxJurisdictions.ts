/**
 * Hook para gestión de jurisdicciones fiscales globales
 * USA LLC, Dubai Free Zone, UE, etc.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// ========== TYPES ==========

export type JurisdictionType = 
  | 'eu_vat' 
  | 'us_llc' 
  | 'us_state' 
  | 'uae_vat' 
  | 'uae_freezone' 
  | 'uk_vat' 
  | 'swiss_vat' 
  | 'singapore_gst' 
  | 'andorra_igi' 
  | 'offshore' 
  | 'other';

export type FilingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'on_demand';

export interface TaxJurisdiction {
  id: string;
  code: string;
  name: string;
  country_code: string;
  jurisdiction_type: JurisdictionType;
  standard_tax_rate: number | null;
  reduced_tax_rates: number[] | null;
  tax_id_format: string | null;
  tax_id_label: string;
  filing_frequency: FilingFrequency;
  reporting_requirements: string[] | null;
  special_rules: Record<string, unknown> | null;
  calendar_rules: Record<string, unknown> | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyJurisdiction {
  id: string;
  company_id: string;
  jurisdiction_id: string;
  tax_registration_number: string | null;
  registration_date: string | null;
  status: 'active' | 'suspended' | 'closed';
  filing_calendar: Record<string, unknown> | null;
  next_filing_date: string | null;
  last_filing_date: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined
  jurisdiction?: TaxJurisdiction;
}

export interface TaxCalendarEvent {
  id: string;
  company_id: string;
  jurisdiction_id: string | null;
  event_type: 'filing' | 'payment' | 'declaration' | 'audit';
  title: string;
  description: string | null;
  due_date: string;
  reminder_date: string | null;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  completed_at: string | null;
  completed_by: string | null;
  amount: number | null;
  reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined
  jurisdiction?: TaxJurisdiction;
}

export interface JurisdictionStats {
  totalJurisdictions: number;
  activeRegistrations: number;
  upcomingFilings: number;
  overdueFilings: number;
  byType: Record<JurisdictionType, number>;
}

// ========== HOOK ==========

export function useERPTaxJurisdictions() {
  const { currentCompany } = useERPContext();
  const companyId = currentCompany?.id;

  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [companyJurisdictions, setCompanyJurisdictions] = useState<CompanyJurisdiction[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TaxCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<JurisdictionStats>({
    totalJurisdictions: 0,
    activeRegistrations: 0,
    upcomingFilings: 0,
    overdueFilings: 0,
    byType: {} as Record<JurisdictionType, number>,
  });

  // ========== FETCH ALL JURISDICTIONS ==========
  const fetchJurisdictions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('erp_tax_jurisdictions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(j => ({
        ...j,
        jurisdiction_type: j.jurisdiction_type as JurisdictionType,
        filing_frequency: j.filing_frequency as FilingFrequency,
        reporting_requirements: j.reporting_requirements as string[] | null,
        special_rules: j.special_rules as Record<string, unknown> | null,
        calendar_rules: j.calendar_rules as Record<string, unknown> | null,
        reduced_tax_rates: j.reduced_tax_rates as number[] | null,
      }));

      setJurisdictions(mapped);
      
      // Calculate stats by type
      const byType: Record<JurisdictionType, number> = {} as Record<JurisdictionType, number>;
      mapped.forEach(j => {
        byType[j.jurisdiction_type] = (byType[j.jurisdiction_type] || 0) + 1;
      });
      setStats(prev => ({ ...prev, totalJurisdictions: mapped.length, byType }));

      return mapped;
    } catch (err) {
      console.error('[useERPTaxJurisdictions] fetchJurisdictions error:', err);
      return [];
    }
  }, []);

  // ========== FETCH COMPANY REGISTRATIONS ==========
  const fetchCompanyJurisdictions = useCallback(async () => {
    if (!companyId) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_company_jurisdictions')
        .select(`
          *,
          jurisdiction:erp_tax_jurisdictions(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(cj => ({
        ...cj,
        status: cj.status as 'active' | 'suspended' | 'closed',
        filing_calendar: cj.filing_calendar as Record<string, unknown> | null,
        metadata: cj.metadata as Record<string, unknown> | null,
        jurisdiction: cj.jurisdiction ? {
          ...cj.jurisdiction,
          jurisdiction_type: cj.jurisdiction.jurisdiction_type as JurisdictionType,
          filing_frequency: cj.jurisdiction.filing_frequency as FilingFrequency,
          reporting_requirements: cj.jurisdiction.reporting_requirements as string[] | null,
          special_rules: cj.jurisdiction.special_rules as Record<string, unknown> | null,
          calendar_rules: cj.jurisdiction.calendar_rules as Record<string, unknown> | null,
          reduced_tax_rates: cj.jurisdiction.reduced_tax_rates as number[] | null,
        } : undefined,
      }));

      setCompanyJurisdictions(mapped);
      setStats(prev => ({ 
        ...prev, 
        activeRegistrations: mapped.filter(cj => cj.status === 'active').length 
      }));

      return mapped;
    } catch (err) {
      console.error('[useERPTaxJurisdictions] fetchCompanyJurisdictions error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // ========== FETCH CALENDAR EVENTS ==========
  const fetchCalendarEvents = useCallback(async (startDate?: string, endDate?: string) => {
    if (!companyId) return [];

    try {
      let query = supabase
        .from('erp_tax_calendar_events')
        .select(`
          *,
          jurisdiction:erp_tax_jurisdictions(*)
        `)
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });

      if (startDate) {
        query = query.gte('due_date', startDate);
      }
      if (endDate) {
        query = query.lte('due_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map(event => ({
        ...event,
        event_type: event.event_type as 'filing' | 'payment' | 'declaration' | 'audit',
        status: event.status as 'pending' | 'completed' | 'overdue' | 'cancelled',
        metadata: event.metadata as Record<string, unknown> | null,
        jurisdiction: event.jurisdiction ? {
          ...event.jurisdiction,
          jurisdiction_type: event.jurisdiction.jurisdiction_type as JurisdictionType,
          filing_frequency: event.jurisdiction.filing_frequency as FilingFrequency,
          reporting_requirements: event.jurisdiction.reporting_requirements as string[] | null,
          special_rules: event.jurisdiction.special_rules as Record<string, unknown> | null,
          calendar_rules: event.jurisdiction.calendar_rules as Record<string, unknown> | null,
          reduced_tax_rates: event.jurisdiction.reduced_tax_rates as number[] | null,
        } : undefined,
      }));

      setCalendarEvents(mapped);

      // Calculate upcoming and overdue
      const today = new Date().toISOString().split('T')[0];
      const upcoming = mapped.filter(e => e.status === 'pending' && e.due_date >= today).length;
      const overdue = mapped.filter(e => e.status === 'pending' && e.due_date < today).length;
      setStats(prev => ({ ...prev, upcomingFilings: upcoming, overdueFilings: overdue }));

      return mapped;
    } catch (err) {
      console.error('[useERPTaxJurisdictions] fetchCalendarEvents error:', err);
      return [];
    }
  }, [companyId]);

  // ========== REGISTER COMPANY IN JURISDICTION ==========
  const registerInJurisdiction = useCallback(async (
    jurisdictionId: string,
    taxRegistrationNumber?: string,
    registrationDate?: string
  ) => {
    if (!companyId) {
      toast.error('No hay empresa seleccionada');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_company_jurisdictions')
        .insert({
          company_id: companyId,
          jurisdiction_id: jurisdictionId,
          tax_registration_number: taxRegistrationNumber || null,
          registration_date: registrationDate || new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Jurisdicción registrada correctamente');
      await fetchCompanyJurisdictions();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar jurisdicción';
      console.error('[useERPTaxJurisdictions] registerInJurisdiction error:', err);
      toast.error(message);
      return null;
    }
  }, [companyId, fetchCompanyJurisdictions]);

  // ========== UPDATE REGISTRATION ==========
  const updateRegistration = useCallback(async (
    registrationId: string,
    updates: { status?: string; tax_registration_number?: string; next_filing_date?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('erp_company_jurisdictions')
        .update(updates)
        .eq('id', registrationId);

      if (error) throw error;

      toast.success('Registro actualizado');
      await fetchCompanyJurisdictions();
      return true;
    } catch (err) {
      console.error('[useERPTaxJurisdictions] updateRegistration error:', err);
      toast.error('Error al actualizar registro');
      return false;
    }
  }, [fetchCompanyJurisdictions]);

  // ========== CREATE CALENDAR EVENT ==========
  const createCalendarEvent = useCallback(async (
    event: { 
      jurisdiction_id?: string; 
      event_type: string; 
      title: string; 
      description?: string; 
      due_date: string;
      reminder_date?: string;
    }
  ) => {
    if (!companyId) {
      toast.error('No hay empresa seleccionada');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_tax_calendar_events')
        .insert({
          company_id: companyId,
          jurisdiction_id: event.jurisdiction_id || null,
          event_type: event.event_type,
          title: event.title,
          description: event.description || null,
          due_date: event.due_date,
          reminder_date: event.reminder_date || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Evento creado');
      await fetchCalendarEvents();
      return data;
    } catch (err) {
      console.error('[useERPTaxJurisdictions] createCalendarEvent error:', err);
      toast.error('Error al crear evento');
      return null;
    }
  }, [companyId, fetchCalendarEvents]);

  // ========== COMPLETE CALENDAR EVENT ==========
  const completeCalendarEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('erp_tax_calendar_events')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Evento completado');
      await fetchCalendarEvents();
      return true;
    } catch (err) {
      console.error('[useERPTaxJurisdictions] completeCalendarEvent error:', err);
      toast.error('Error al completar evento');
      return false;
    }
  }, [fetchCalendarEvents]);

  // ========== GET JURISDICTION BY CODE ==========
  const getJurisdictionByCode = useCallback((code: string) => {
    return jurisdictions.find(j => j.code === code);
  }, [jurisdictions]);

  // ========== GET JURISDICTIONS BY TYPE ==========
  const getJurisdictionsByType = useCallback((type: JurisdictionType) => {
    return jurisdictions.filter(j => j.jurisdiction_type === type);
  }, [jurisdictions]);

  // ========== GET JURISDICTIONS BY COUNTRY ==========
  const getJurisdictionsByCountry = useCallback((countryCode: string) => {
    return jurisdictions.filter(j => j.country_code === countryCode);
  }, [jurisdictions]);

  // ========== INITIAL FETCH ==========
  useEffect(() => {
    fetchJurisdictions();
  }, [fetchJurisdictions]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyJurisdictions();
      fetchCalendarEvents();
    }
  }, [companyId, fetchCompanyJurisdictions, fetchCalendarEvents]);

  // ========== REALTIME SUBSCRIPTION ==========
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('tax-calendar-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'erp_tax_calendar_events',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          fetchCalendarEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchCalendarEvents]);

  return {
    // Data
    jurisdictions,
    companyJurisdictions,
    calendarEvents,
    stats,
    loading,
    // Actions
    fetchJurisdictions,
    fetchCompanyJurisdictions,
    fetchCalendarEvents,
    registerInJurisdiction,
    updateRegistration,
    createCalendarEvent,
    completeCalendarEvent,
    // Helpers
    getJurisdictionByCode,
    getJurisdictionsByType,
    getJurisdictionsByCountry,
  };
}

export default useERPTaxJurisdictions;
