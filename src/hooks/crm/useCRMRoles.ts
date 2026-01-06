/**
 * Hook para gestión de roles y permisos CRM
 * Equivalente a useERPRoles
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CRMRole, CRMPermission, CreateRoleForm } from '@/types/crm';
import { useCRMContext } from './useCRMContext';
import { toast } from 'sonner';

export function useCRMRoles() {
  const { currentWorkspace, hasPermission } = useCRMContext();
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<CRMRole[]>([]);
  const [permissions, setPermissions] = useState<CRMPermission[]>([]);

  // Cargar permisos disponibles
  const fetchPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_permissions')
        .select('*')
        .order('module')
        .order('name');

      if (error) throw error;
      setPermissions((data || []) as CRMPermission[]);
    } catch (err) {
      console.error('[useCRMRoles] fetchPermissions error:', err);
    }
  }, []);

  // Cargar roles del workspace
  const fetchRoles = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_roles')
        .select(`
          *,
          crm_role_permissions(
            permission:crm_permissions(*)
          )
        `)
        .or(`workspace_id.eq.${currentWorkspace.id},workspace_id.is.null`)
        .order('name');

      if (error) throw error;

      // Mapear permisos
      const rolesWithPermissions = (data || []).map((r: any) => ({
        ...r,
        permissions: r.crm_role_permissions?.map((rp: any) => rp.permission).filter(Boolean) || [],
      }));

      setRoles(rolesWithPermissions as CRMRole[]);
    } catch (err) {
      console.error('[useCRMRoles] fetchRoles error:', err);
      toast.error('Error cargando roles');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  // Crear rol
  const createRole = useCallback(async (form: CreateRoleForm): Promise<CRMRole | null> => {
    if (!currentWorkspace?.id) return null;
    if (!hasPermission('admin.all')) {
      toast.error('Sin permisos');
      return null;
    }

    setIsLoading(true);
    try {
      // Crear rol
      const { data: role, error: roleError } = await supabase
        .from('crm_roles')
        .insert([{
          workspace_id: currentWorkspace.id,
          name: form.name,
          description: form.description,
          role_type: form.role_type || 'agent',
        }])
        .select()
        .single();

      if (roleError) throw roleError;

      // Asignar permisos
      if (form.permission_ids.length > 0) {
        const rolePermissions = form.permission_ids.map(pid => ({
          role_id: role.id,
          permission_id: pid,
        }));

        const { error: rpError } = await supabase
          .from('crm_role_permissions')
          .insert(rolePermissions);

        if (rpError) console.warn('Error asignando permisos:', rpError);
      }

      toast.success('Rol creado');
      await fetchRoles();
      return role as CRMRole;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creando rol';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, hasPermission, fetchRoles]);

  // Actualizar permisos de rol
  const updateRolePermissions = useCallback(async (
    roleId: string, 
    permissionIds: string[]
  ): Promise<boolean> => {
    if (!hasPermission('admin.all')) {
      toast.error('Sin permisos');
      return false;
    }

    try {
      // Eliminar permisos actuales
      await supabase
        .from('crm_role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Insertar nuevos permisos
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(pid => ({
          role_id: roleId,
          permission_id: pid,
        }));

        const { error } = await supabase
          .from('crm_role_permissions')
          .insert(rolePermissions);

        if (error) throw error;
      }

      toast.success('Permisos actualizados');
      await fetchRoles();
      return true;
    } catch (err) {
      toast.error('Error actualizando permisos');
      return false;
    }
  }, [hasPermission, fetchRoles]);

  // Eliminar rol
  const deleteRole = useCallback(async (roleId: string): Promise<boolean> => {
    if (!hasPermission('admin.all')) {
      toast.error('Sin permisos');
      return false;
    }

    try {
      const { error } = await supabase
        .from('crm_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Rol eliminado');
      await fetchRoles();
      return true;
    } catch (err) {
      toast.error('Error eliminando rol');
      return false;
    }
  }, [hasPermission, fetchRoles]);

  // Agrupar permisos por módulo
  const getPermissionsByModule = useCallback(() => {
    const grouped: Record<string, CRMPermission[]> = {};
    permissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  }, [permissions]);

  return {
    roles,
    permissions,
    isLoading,
    fetchRoles,
    fetchPermissions,
    createRole,
    updateRolePermissions,
    deleteRole,
    getPermissionsByModule,
  };
}

export default useCRMRoles;
