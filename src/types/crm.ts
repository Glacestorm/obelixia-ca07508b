/**
 * CRM Modular - Tipos TypeScript
 * Multi-workspace, RBAC, Teams
 */

import { Json } from '@/integrations/supabase/types';

// ============ WORKSPACES ============

export interface CRMWorkspace {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  settings: Json;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMUserWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  role_id?: string | null;
  is_default: boolean;
  is_active: boolean;
  invited_by?: string | null;
  joined_at?: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  workspace?: CRMWorkspace;
  role?: CRMRole;
}

// ============ PERMISOS Y ROLES ============

export interface CRMPermission {
  id: string;
  key: string;
  name: string;
  module: string;
  description?: string | null;
  created_at: string;
}

export interface CRMRole {
  id: string;
  workspace_id?: string | null;
  name: string;
  role_type?: 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
  description?: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  permissions?: CRMPermission[];
}

export interface CRMRolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

// ============ TEAMS ============

export interface CRMTeam {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  lead_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  members?: CRMTeamMember[];
  lead?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface CRMTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at?: string | null;
  created_at: string;
  // Relaciones
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

// ============ MÓDULOS CRM ============

export type CRMModuleKey = 
  | 'overview'
  | 'kanban'
  | 'contacts'
  | 'omnichannel'
  | 'sentiment'
  | 'sla'
  | 'automation'
  | 'reports'
  | 'agents'
  | 'config';

export interface CRMModuleConfig {
  key: CRMModuleKey;
  name: string;
  icon: string;
  requiredPermission?: string;
}

// ============ FORMULARIOS ============

export interface CreateWorkspaceForm {
  name: string;
  slug?: string;
  description?: string;
}

export interface CreateRoleForm {
  name: string;
  description?: string;
  role_type?: 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
  permission_ids: string[];
}

export interface CreateTeamForm {
  name: string;
  description?: string;
  color?: string;
  lead_id?: string;
}

export interface InviteUserForm {
  email: string;
  role_id: string;
  team_ids?: string[];
}

// ============ FILTROS ============

export interface CRMContactFilters {
  search?: string;
  status?: string;
  source?: string;
  team_id?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
}

export interface CRMDealFilters {
  search?: string;
  stage?: string;
  priority?: string;
  team_id?: string;
  owner_id?: string;
  date_from?: string;
  date_to?: string;
  value_min?: number;
  value_max?: number;
}
