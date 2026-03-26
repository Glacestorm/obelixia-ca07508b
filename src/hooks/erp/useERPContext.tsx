/**
 * ERP Context - Gestión de contexto multi-empresa
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ERPCompany, ERPUserCompany, ERPPermission } from '@/types/erp';
import { toast } from 'sonner';

interface ERPContextType {
  // Estado
  companies: ERPCompany[];
  currentCompany: ERPCompany | null;
  userPermissions: string[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  setCurrentCompany: (company: ERPCompany | null) => void;
  refreshCompanies: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
}

const ERPContext = createContext<ERPContextType | null>(null);

interface ERPProviderProps {
  children: ReactNode;
}

export function ERPProvider({ children }: ERPProviderProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<ERPCompany[]>([]);
  const [currentCompany, setCurrentCompanyState] = useState<ERPCompany | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar empresas del usuario
  const refreshCompanies = useCallback(async () => {
    if (!user?.id) {
      setCompanies([]);
      setCurrentCompanyState(null);
      setUserPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener empresas del usuario
      const { data: userCompanies, error: ucError } = await supabase
        .from('erp_user_companies')
        .select(`
          *,
          company:erp_companies(*),
          role:erp_roles(
            *,
            erp_role_permissions(
              permission:erp_permissions(*)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (ucError) throw ucError;

      interface UCRow {
        company: ERPCompany | null;
        is_default: boolean;
        role?: {
          erp_role_permissions?: Array<{ permission?: { key: string } | null }> | null;
        } | null;
      }

      const typedUCs = (userCompanies ?? []) as UCRow[];
      const companyList = typedUCs
        .map(uc => uc.company)
        .filter((c): c is ERPCompany => c !== null && c.is_active);

      setCompanies(companyList);

      // Establecer empresa por defecto
      const defaultUC = typedUCs.find(uc => uc.is_default);
      const firstUC = typedUCs[0];
      const selected = defaultUC || firstUC;

      if (selected?.company) {
        setCurrentCompanyState(selected.company);
        
        // Extraer permisos del rol
        const permissions = (selected.role?.erp_role_permissions ?? [])
          .map(rp => rp.permission?.key)
          .filter((k): k is string => typeof k === 'string');
        
        setUserPermissions(permissions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando empresas';
      setError(message);
      console.error('[useERPContext] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Cambiar empresa actual
  const setCurrentCompany = useCallback(async (company: ERPCompany | null) => {
    if (!company || !user?.id) {
      setCurrentCompanyState(null);
      setUserPermissions([]);
      return;
    }

    setCurrentCompanyState(company);

    // Cargar permisos para esta empresa
    try {
      const { data: userCompany } = await supabase
        .from('erp_user_companies')
        .select(`
          role:erp_roles(
            erp_role_permissions(
              permission:erp_permissions(key)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .eq('is_active', true)
        .single();

      type PermRow = { role?: { erp_role_permissions?: Array<{ permission?: { key: string } | null }> | null } | null };
      const typedUserCompany = userCompany as PermRow | undefined;
      const permissions = (typedUserCompany?.role?.erp_role_permissions ?? [])
        .map(rp => rp.permission?.key)
        .filter((k): k is string => typeof k === 'string');
      
      setUserPermissions(permissions);
    } catch (err) {
      console.error('[useERPContext] Error cargando permisos:', err);
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
    refreshCompanies();
  }, [refreshCompanies]);

  return (
    <ERPContext.Provider value={{
      companies,
      currentCompany,
      userPermissions,
      isLoading,
      error,
      setCurrentCompany,
      refreshCompanies,
      hasPermission,
      hasAnyPermission,
    }}>
      {children}
    </ERPContext.Provider>
  );
}

export function useERPContext(): ERPContextType {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERPContext must be used within ERPProvider');
  }
  return context;
}

export default useERPContext;
