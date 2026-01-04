/**
 * Tipos para el CRM Multi-Workspace
 */

export interface CRMWorkspace {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country: string;
  timezone: string;
  currency: string;
  logo_url?: string;
  settings?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMRole {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMPermission {
  id: string;
  key: string;
  name: string;
  description?: string;
  module: string;
  created_at: string;
}

export interface CRMRolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface CRMUserWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  role_id?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  workspace?: CRMWorkspace;
  role?: CRMRole & {
    crm_role_permissions?: Array<{
      permission: CRMPermission;
    }>;
  };
}
