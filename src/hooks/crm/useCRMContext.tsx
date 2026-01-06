/**
 * CRM Context - Gestión de contexto multi-workspace
 * Equivalente a useERPContext para el módulo CRM
 * Fase 4: Reforzado con guards para evitar fetches duplicados
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CRMWorkspace, CRMUserWorkspace, CRMPermission } from '@/types/crm';
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
  
  // Guards para evitar fetches duplicados
  const isFetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar workspaces del usuario
  const refreshWorkspaces = useCallback(async () => {
    // Guard: evitar llamadas duplicadas
    if (isFetchingRef.current) {
      console.log('[useCRMContext] Fetch already in progress, skipping');
      return;
    }

    // Guard: si el userId no cambió y ya tenemos datos, no refetch
    if (lastUserIdRef.current === user?.id && workspaces.length > 0) {
      console.log('[useCRMContext] Same user, using cached data');
      return;
    }

    if (!user?.id) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setUserPermissions([]);
      setIsLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    isFetchingRef.current = true;
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
        .map((uw: any) => uw.workspace)
        .filter((w: any) => w && w.is_active);

      setWorkspaces(workspaceList);
      lastUserIdRef.current = user.id;

      // Establecer workspace por defecto
      const defaultUW = (userWorkspaces || []).find((uw: any) => uw.is_default);
      const firstUW = (userWorkspaces || [])[0];
      const selected = defaultUW || firstUW;

      if (selected?.workspace) {
        setCurrentWorkspaceState(selected.workspace);
        
        // Extraer permisos del rol
        const permissions = selected.role?.crm_role_permissions?.map(
          (rp: any) => rp.permission?.key
        ).filter(Boolean) || [];
        
        setUserPermissions(permissions);
      }
    } catch (err) {
      // Ignorar errores de abort
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Error cargando workspaces';
      setError(message);
      console.error('[useCRMContext] Error:', err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [user?.id, workspaces.length]);

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

      const permissions = (userWorkspace as any)?.role?.crm_role_permissions?.map(
        (rp: any) => rp.permission?.key
      ).filter(Boolean) || [];
      
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
  const prevUserIdEffect = useRef<string | null>(null);
  
  useEffect(() => {
    // Solo ejecutar si el userId realmente cambió
    if (prevUserIdEffect.current !== user?.id) {
      prevUserIdEffect.current = user?.id || null;
      refreshWorkspaces();
    }
    
    // Cleanup: cancelar requests pendientes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id, refreshWorkspaces]);

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
