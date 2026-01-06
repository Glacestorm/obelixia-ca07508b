/**
 * Hook para gestión de equipos CRM
 * Auditoría: Guards añadidos para evitar loops infinitos
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CRMTeam, CRMTeamMember, CreateTeamForm } from '@/types/crm';
import { useCRMContext } from './useCRMContext';
import { toast } from 'sonner';

export function useCRMTeams() {
  const { currentWorkspace, hasPermission } = useCRMContext();
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<CRMTeam[]>([]);

  // Cargar equipos del workspace
  const fetchTeams = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setTeams([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_teams')
        .select(`
          *,
          crm_team_members(
            *,
            user:profiles(id, full_name, email, avatar_url)
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Mapear miembros
      const teamsWithMembers = (data || []).map((t: any) => ({
        ...t,
        members: t.crm_team_members?.map((m: any) => ({
          ...m,
          user: m.user || { id: m.user_id }
        })) || [],
      }));

      setTeams(teamsWithMembers as CRMTeam[]);
    } catch (err) {
      console.error('[useCRMTeams] fetchTeams error:', err);
      toast.error('Error cargando equipos');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  // Crear equipo
  const createTeam = useCallback(async (form: CreateTeamForm): Promise<CRMTeam | null> => {
    if (!currentWorkspace?.id) return null;
    if (!hasPermission('teams.manage')) {
      toast.error('Sin permisos para crear equipos');
      return null;
    }

    setIsLoading(true);
    try {
      const { data: team, error } = await supabase
        .from('crm_teams')
        .insert([{
          workspace_id: currentWorkspace.id,
          name: form.name,
          description: form.description,
          color: form.color,
          lead_id: form.lead_id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Equipo creado');
      await fetchTeams();
      return team as CRMTeam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creando equipo';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, hasPermission, fetchTeams]);

  // Actualizar equipo
  const updateTeam = useCallback(async (
    teamId: string,
    updates: Partial<CreateTeamForm>
  ): Promise<boolean> => {
    if (!hasPermission('teams.manage')) {
      toast.error('Sin permisos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('crm_teams')
        .update(updates)
        .eq('id', teamId);

      if (error) throw error;

      toast.success('Equipo actualizado');
      await fetchTeams();
      return true;
    } catch (err) {
      toast.error('Error actualizando equipo');
      return false;
    }
  }, [hasPermission, fetchTeams]);

  // Eliminar equipo (soft delete)
  const deleteTeam = useCallback(async (teamId: string): Promise<boolean> => {
    if (!hasPermission('teams.manage')) {
      toast.error('Sin permisos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('crm_teams')
        .update({ is_active: false })
        .eq('id', teamId);

      if (error) throw error;

      toast.success('Equipo eliminado');
      await fetchTeams();
      return true;
    } catch (err) {
      toast.error('Error eliminando equipo');
      return false;
    }
  }, [hasPermission, fetchTeams]);

  // Añadir miembro al equipo
  const addTeamMember = useCallback(async (
    teamId: string,
    userId: string,
    role = 'member'
  ): Promise<boolean> => {
    if (!hasPermission('teams.manage')) {
      toast.error('Sin permisos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('crm_team_members')
        .insert([{
          team_id: teamId,
          user_id: userId,
          role,
        }]);

      if (error) throw error;

      toast.success('Miembro añadido');
      await fetchTeams();
      return true;
    } catch (err) {
      toast.error('Error añadiendo miembro');
      return false;
    }
  }, [hasPermission, fetchTeams]);

  // Eliminar miembro del equipo
  const removeTeamMember = useCallback(async (
    teamId: string,
    userId: string
  ): Promise<boolean> => {
    if (!hasPermission('teams.manage')) {
      toast.error('Sin permisos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('crm_team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Miembro eliminado');
      await fetchTeams();
      return true;
    } catch (err) {
      toast.error('Error eliminando miembro');
      return false;
    }
  }, [hasPermission, fetchTeams]);

  // Guard para controlar mount inicial - evita loops infinitos
  const isInitialMount = useRef(true);
  const prevWorkspaceId = useRef<string | null>(null);

  // Cargar al cambiar workspace - con guard
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (currentWorkspace?.id) {
        prevWorkspaceId.current = currentWorkspace.id;
        fetchTeams();
      }
      return;
    }
    
    // Solo refetch si workspace realmente cambió
    if (currentWorkspace?.id !== prevWorkspaceId.current) {
      prevWorkspaceId.current = currentWorkspace?.id || null;
      fetchTeams();
    }
  }, [currentWorkspace?.id, fetchTeams]);

  return {
    teams,
    isLoading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
  };
}

export default useCRMTeams;
