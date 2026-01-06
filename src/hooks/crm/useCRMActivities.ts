/**
 * Hook para gestión de actividades CRM
 * Fase 2: Corregido para evitar loops de useEffect
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCRMContext } from './useCRMContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CRMActivity {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  deal_id: string | null;
  activity_type: string;
  subject: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note';

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'call', label: 'Llamada', icon: 'Phone' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'meeting', label: 'Reunión', icon: 'Calendar' },
  { value: 'task', label: 'Tarea', icon: 'CheckSquare' },
  { value: 'note', label: 'Nota', icon: 'FileText' },
];

export function useCRMActivities(contactId?: string, dealId?: string) {
  const { currentWorkspace } = useCRMContext();
  const { user } = useAuth();
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    type?: string;
    status?: string;
  }>({});

  const fetchActivities = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('crm_activities')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('scheduled_at', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      if (dealId) {
        query = query.eq('deal_id', dealId);
      }
      if (filters.type) {
        query = query.eq('activity_type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities((data as CRMActivity[]) || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, contactId, dealId, filters]);

  const createActivity = useCallback(async (activity: Omit<Partial<CRMActivity>, 'activity_type'> & { activity_type: string }) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .insert([{ 
          activity_type: activity.activity_type,
          subject: activity.subject || '',
          description: activity.description,
          status: activity.status || 'pending',
          scheduled_at: activity.scheduled_at,
          contact_id: activity.contact_id,
          deal_id: activity.deal_id,
          workspace_id: currentWorkspace.id,
          assigned_to: activity.assigned_to || user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setActivities(prev => [data as CRMActivity, ...prev]);
      toast.success('Actividad creada');
      return data as CRMActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Error al crear actividad');
      return null;
    }
  }, [currentWorkspace?.id, user?.id]);

  const updateActivity = useCallback(async (id: string, updates: Partial<CRMActivity>) => {
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      toast.success('Actividad actualizada');
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Error al actualizar actividad');
      return false;
    }
  }, []);

  const completeActivity = useCallback(async (id: string) => {
    return updateActivity(id, { 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    });
  }, [updateActivity]);

  const deleteActivity = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setActivities(prev => prev.filter(a => a.id !== id));
      toast.success('Actividad eliminada');
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Error al eliminar actividad');
      return false;
    }
  }, []);

  const getUpcomingActivities = useCallback(() => {
    const now = new Date();
    return activities
      .filter(a => a.status === 'pending' && a.scheduled_at && new Date(a.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  }, [activities]);

  const getOverdueActivities = useCallback(() => {
    const now = new Date();
    return activities
      .filter(a => a.status === 'pending' && a.scheduled_at && new Date(a.scheduled_at) < now);
  }, [activities]);

  // Ref para controlar mount inicial - evita loops infinitos
  const isInitialMount = useRef(true);
  const prevDepsJson = useRef<string>('');

  useEffect(() => {
    const depsKey = JSON.stringify({
      workspaceId: currentWorkspace?.id,
      contactId,
      dealId,
      filters
    });

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (currentWorkspace?.id) {
        prevDepsJson.current = depsKey;
        fetchActivities();
      }
      return;
    }
    
    // Solo refetch si las dependencias realmente cambiaron
    if (depsKey !== prevDepsJson.current) {
      prevDepsJson.current = depsKey;
      fetchActivities();
    }
  }, [currentWorkspace?.id, contactId, dealId, filters, fetchActivities]);

  return {
    activities,
    loading,
    filters,
    setFilters,
    fetchActivities,
    createActivity,
    updateActivity,
    completeActivity,
    deleteActivity,
    getUpcomingActivities,
    getOverdueActivities,
  };
}

export default useCRMActivities;
