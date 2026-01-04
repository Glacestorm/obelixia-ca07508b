/**
 * CRM Context - Gestión de contexto multi-workspace
 * Equivalente a useERPContext para el módulo CRM
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CRMWorkspace } from '@/types/crm';
import { toast } from 'sonner';

interface CRMContextType {
  // Estado
  workspaces: CRMWorkspace[];
  currentWorkspace: CRMWorkspace | null;
  userPermissions: string[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  setCurrentWorkspace: (workspace: CRMWorkspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
}

const CRMContext = createContext<CRMContextType | null>(null);

interface CRMProviderProps {
  children: ReactNode;
}

export function CRMProvider({ children }: CRMProviderProps) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<CRMWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<CRMWorkspace | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar workspaces del usuario
  const refreshWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setUserPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener workspaces del usuario
      const { data: userWorkspaces, error: uwError } = await supabase
        .from('crm_user_workspaces')
        .select(`
          *,
          workspace:crm_workspaces(*),
          role:crm_roles(
            *,
            crm_role_permissions(
              permission:crm_permissions(*)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (uwError) throw uwError;

      const workspaceList = (userWorkspaces || [])
        .map((uw: Record<string, unknown>) => uw.workspace as CRMWorkspace)
        .filter((w: CRMWorkspace | null) => w && w.is_active);

      setWorkspaces(workspaceList);

      // Establecer workspace por defecto
      const defaultUW = (userWorkspaces || []).find((uw: Record<string, unknown>) => uw.is_default);
      const firstUW = (userWorkspaces || [])[0];
      const selected = defaultUW || firstUW;

      if (selected?.workspace) {
        setCurrentWorkspaceState(selected.workspace as CRMWorkspace);
        
        // Extraer permisos del rol
        const role = selected.role as Record<string, unknown> | undefined;
        const rolePermissions = role?.crm_role_permissions as Array<{ permission?: { key?: string } }> | undefined;
        const permissions = rolePermissions?.map(
          (rp) => rp.permission?.key
        ).filter(Boolean) as string[] || [];
        
        setUserPermissions(permissions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando workspaces';
      setError(message);
      console.error('[useCRMContext] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Cambiar workspace actual
  const setCurrentWorkspace = useCallback(async (workspace: CRMWorkspace | null) => {
    if (!workspace || !user?.id) {
      setCurrentWorkspaceState(null);
      setUserPermissions([]);
      return;
    }

    setCurrentWorkspaceState(workspace);

    // Cargar permisos para este workspace
    try {
      const { data: userWorkspace } = await supabase
        .from('crm_user_workspaces')
        .select(`
          role:crm_roles(
            crm_role_permissions(
              permission:crm_permissions(key)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)
        .single();

      const role = (userWorkspace as Record<string, unknown>)?.role as Record<string, unknown> | undefined;
      const rolePermissions = role?.crm_role_permissions as Array<{ permission?: { key?: string } }> | undefined;
      const permissions = rolePermissions?.map(
        (rp) => rp.permission?.key
      ).filter(Boolean) as string[] || [];
      
      setUserPermissions(permissions);
    } catch (err) {
      console.error('[useCRMContext] Error cargando permisos:', err);
      setUserPermissions([]);
    }
  }, [user?.id]);

  // Verificar permiso
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (userPermissions.includes('admin.all')) return true;
    return userPermissions.includes(permissionKey);
  }, [userPermissions]);

  // Verificar alguno de varios permisos
  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    if (userPermissions.includes('admin.all')) return true;
    return permissionKeys.some(key => userPermissions.includes(key));
  }, [userPermissions]);

  // Cargar al iniciar o cambiar usuario
  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  return (
    <CRMContext.Provider value={{
      workspaces,
      currentWorkspace,
      userPermissions,
      isLoading,
      error,
      setCurrentWorkspace,
      refreshWorkspaces,
      hasPermission,
      hasAnyPermission,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRMContext(): CRMContextType {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRMContext must be used within CRMProvider');
  }
  return context;
}

export default useCRMContext;
