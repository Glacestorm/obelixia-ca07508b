/**
 * Hook para gestión de contactos CRM
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCRMContext } from './useCRMContext';
import { toast } from 'sonner';

export interface CRMContact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: 'lead' | 'active' | 'inactive' | 'customer' | 'lost';
  source: string | null;
  assigned_to: string | null;
  team_id: string | null;
  lifetime_value: number;
  deals_count: number;
  tags: string[];
  custom_fields: Record<string, unknown>;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relaciones
  assigned_user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  team?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface CreateContactInput {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  status?: 'lead' | 'active' | 'inactive' | 'customer' | 'lost';
  source?: string;
  assigned_to?: string;
  team_id?: string;
  tags?: string[];
  notes?: string;
}

export interface ContactFilters {
  search?: string;
  status?: string;
  source?: string;
  team_id?: string;
  assigned_to?: string;
}

export function useCRMContacts() {
  const { currentWorkspace } = useCRMContext();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContactFilters>({});

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setContacts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('crm_contacts')
        .select(`
          *,
          assigned_user:profiles!crm_contacts_assigned_to_fkey(id, full_name, avatar_url),
          team:crm_teams(id, name, color)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.limit(200);

      if (fetchError) throw fetchError;

      setContacts((data || []).map(c => ({
        ...c,
        lifetime_value: Number(c.lifetime_value) || 0,
        deals_count: c.deals_count || 0,
        tags: c.tags || [],
        custom_fields: c.custom_fields || {},
      })) as CRMContact[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando contactos';
      setError(message);
      console.error('[useCRMContacts] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, filters]);

  // Create contact
  const createContact = useCallback(async (input: CreateContactInput): Promise<CRMContact | null> => {
    if (!currentWorkspace?.id) {
      toast.error('Selecciona un workspace primero');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('crm_contacts')
        .insert([{
          workspace_id: currentWorkspace.id,
          first_name: input.first_name,
          last_name: input.last_name || null,
          email: input.email || null,
          phone: input.phone || null,
          company: input.company || null,
          position: input.position || null,
          status: input.status || 'lead',
          source: input.source || null,
          assigned_to: input.assigned_to || null,
          team_id: input.team_id || null,
          tags: input.tags || [],
          notes: input.notes || null,
        }])
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Contacto creado');
      await fetchContacts();
      return data as CRMContact;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creando contacto';
      toast.error(message);
      console.error('[useCRMContacts] Create error:', err);
      return null;
    }
  }, [currentWorkspace?.id, fetchContacts]);

  // Update contact
  const updateContact = useCallback(async (
    id: string, 
    updates: Partial<CreateContactInput>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('crm_contacts')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Contacto actualizado');
      await fetchContacts();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error actualizando contacto';
      toast.error(message);
      console.error('[useCRMContacts] Update error:', err);
      return false;
    }
  }, [fetchContacts]);

  // Delete contact
  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Contacto eliminado');
      setContacts(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error eliminando contacto';
      toast.error(message);
      console.error('[useCRMContacts] Delete error:', err);
      return false;
    }
  }, []);

  // Fetch on mount and when workspace changes
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Stats
  const stats = {
    total: contacts.length,
    leads: contacts.filter(c => c.status === 'lead').length,
    active: contacts.filter(c => c.status === 'active').length,
    customers: contacts.filter(c => c.status === 'customer').length,
    totalValue: contacts.reduce((acc, c) => acc + c.lifetime_value, 0),
    totalDeals: contacts.reduce((acc, c) => acc + c.deals_count, 0),
  };

  return {
    contacts,
    isLoading,
    error,
    stats,
    filters,
    setFilters,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}

export default useCRMContacts;
