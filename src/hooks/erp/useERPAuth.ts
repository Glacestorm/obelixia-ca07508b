import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ERPCompany {
  id: string;
  code: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  currency: string;
  is_active: boolean;
}

export interface ERPUserCompany {
  id: string;
  company_id: string;
  is_default: boolean;
  is_active: boolean;
  company?: ERPCompany;
}

export interface ERPRole {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
}

export interface ERPPermission {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
}

export interface ERPUserRole {
  id: string;
  role_id: string;
  company_id: string;
  role?: ERPRole;
}

export function useERPAuth() {
  const { user } = useAuth();
  const [userCompanies, setUserCompanies] = useState<ERPUserCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<ERPCompany | null>(null);
  const [userRoles, setUserRoles] = useState<ERPUserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Fetch user companies
  const fetchUserCompanies = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('erp_user_companies')
        .select(`
          id,
          company_id,
          is_default,
          is_active,
          company:erp_companies (
            id, code, name, legal_name, tax_id, currency, is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const companies = (data || []).map((uc: any) => ({
        id: uc.id,
        company_id: uc.company_id,
        is_default: uc.is_default,
        is_active: uc.is_active,
        company: uc.company
      }));

      setUserCompanies(companies);

      // Set default company
      const defaultCompany = companies.find((c: ERPUserCompany) => c.is_default);
      if (defaultCompany?.company) {
        setCurrentCompany(defaultCompany.company);
      } else if (companies.length > 0 && companies[0].company) {
        setCurrentCompany(companies[0].company);
      }

      return companies;
    } catch (error) {
      console.error('Error fetching user companies:', error);
      return [];
    }
  }, [user?.id]);

  // Fetch user roles for current company
  const fetchUserRoles = useCallback(async (companyId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('erp_user_roles')
        .select(`
          id,
          role_id,
          company_id,
          role:erp_roles (
            id, company_id, name, description, is_system
          )
        `)
        .eq('user_id', user.id)
        .eq('company_id', companyId);

      if (error) throw error;

      const roles = (data || []).map((ur: any) => ({
        id: ur.id,
        role_id: ur.role_id,
        company_id: ur.company_id,
        role: ur.role
      }));

      setUserRoles(roles);
      return roles;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }, [user?.id]);

  // Fetch user permissions for current company
  const fetchUserPermissions = useCallback(async (companyId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('erp_role_permissions')
        .select(`
          permission:erp_permissions (key)
        `)
        .in('role_id', userRoles.map(r => r.role_id));

      if (error) throw error;

      const permissions = (data || [])
        .map((rp: any) => rp.permission?.key)
        .filter(Boolean) as string[];

      setUserPermissions([...new Set(permissions)]);
      return permissions;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }
  }, [user?.id, userRoles]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (userPermissions.includes('admin.all')) return true;
    return userPermissions.includes(permissionKey);
  }, [userPermissions]);

  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    if (userPermissions.includes('admin.all')) return true;
    return permissionKeys.some(key => userPermissions.includes(key));
  }, [userPermissions]);

  // Switch company
  const switchCompany = useCallback(async (companyId: string) => {
    const company = userCompanies.find(uc => uc.company_id === companyId)?.company;
    if (company) {
      setCurrentCompany(company);
      await fetchUserRoles(companyId);
      toast.success(`Empresa cambiada a ${company.name}`);
    }
  }, [userCompanies, fetchUserRoles]);

  // Initial load
  useEffect(() => {
    if (!user?.id || fetchedRef.current) return;
    fetchedRef.current = true;

    const init = async () => {
      setLoading(true);
      const companies = await fetchUserCompanies();
      
      if (companies && companies.length > 0) {
        const defaultCompany = companies.find((c: ERPUserCompany) => c.is_default) || companies[0];
        if (defaultCompany.company_id) {
          await fetchUserRoles(defaultCompany.company_id);
        }
      }
      setLoading(false);
    };

    init();
  }, [user?.id, fetchUserCompanies, fetchUserRoles]);

  // Fetch permissions when roles change
  useEffect(() => {
    if (currentCompany && userRoles.length > 0) {
      fetchUserPermissions(currentCompany.id);
    }
  }, [currentCompany, userRoles, fetchUserPermissions]);

  return {
    userCompanies,
    currentCompany,
    userRoles,
    userPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    switchCompany,
    refreshCompanies: fetchUserCompanies,
  };
}

export default useERPAuth;
