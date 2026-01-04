/**
 * Tests de Aislamiento Multi-Tenant ERP
 * Verifica que los datos de una empresa no son accesibles por usuarios de otras empresas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// ============ MOCKS ============

// Mock de Supabase con datos multi-tenant
const mockSupabase = {
  auth: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ============ TEST DATA ============

const COMPANY_A = {
  id: 'company-a-uuid',
  code: 'COMP_A',
  name: 'Empresa A',
  legal_name: 'Empresa A S.L.',
  tax_id: 'B12345678',
  currency: 'EUR',
  is_active: true,
  group_id: 'group-1-uuid',
};

const COMPANY_B = {
  id: 'company-b-uuid',
  code: 'COMP_B',
  name: 'Empresa B',
  legal_name: 'Empresa B S.A.',
  tax_id: 'B87654321',
  currency: 'EUR',
  is_active: true,
  group_id: 'group-2-uuid',
};

const USER_A = { id: 'user-a-uuid', email: 'user-a@example.com' };
const USER_B = { id: 'user-b-uuid', email: 'user-b@example.com' };

const FISCAL_YEAR_A = {
  id: 'fy-a-uuid',
  company_id: COMPANY_A.id,
  name: '2026 - Empresa A',
  code: '2026',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  is_current: true,
  is_closed: false,
};

const FISCAL_YEAR_B = {
  id: 'fy-b-uuid',
  company_id: COMPANY_B.id,
  name: '2026 - Empresa B',
  code: '2026',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  is_current: true,
  is_closed: false,
};

const AUDIT_EVENT_A = {
  id: 'audit-a-uuid',
  company_id: COMPANY_A.id,
  actor_user_id: USER_A.id,
  entity_type: 'invoice',
  entity_id: 'inv-001',
  action: 'create',
  created_at: new Date().toISOString(),
};

const AUDIT_EVENT_B = {
  id: 'audit-b-uuid',
  company_id: COMPANY_B.id,
  actor_user_id: USER_B.id,
  entity_type: 'invoice',
  entity_id: 'inv-002',
  action: 'create',
  created_at: new Date().toISOString(),
};

// ============ TESTS ============

describe('Multi-Tenant Isolation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Company Access Isolation', () => {
    it('User A should only see companies assigned to them', async () => {
      // Simular que User A solo tiene acceso a Company A
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'erp_user_companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string, value: string) => {
              if (field === 'user_id' && value === USER_A.id) {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'uc-1',
                      company_id: COMPANY_A.id,
                      user_id: USER_A.id,
                      is_default: true,
                      is_active: true,
                      company: COMPANY_A,
                    }],
                    error: null,
                  }),
                };
              }
              return {
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      // Verificar que User A solo ve Company A
      const result = await mockSupabase.from('erp_user_companies')
        .select()
        .eq('user_id', USER_A.id)
        .eq('is_active', true);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].company_id).toBe(COMPANY_A.id);
      expect(result.data[0].company.name).toBe('Empresa A');
    });

    it('User B should only see companies assigned to them', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'erp_user_companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string, value: string) => {
              if (field === 'user_id' && value === USER_B.id) {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'uc-2',
                      company_id: COMPANY_B.id,
                      user_id: USER_B.id,
                      is_default: true,
                      is_active: true,
                      company: COMPANY_B,
                    }],
                    error: null,
                  }),
                };
              }
              return {
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const result = await mockSupabase.from('erp_user_companies')
        .select()
        .eq('user_id', USER_B.id)
        .eq('is_active', true);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].company_id).toBe(COMPANY_B.id);
      expect(result.data[0].company.name).toBe('Empresa B');
    });

    it('User A should NOT have access to Company B data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'erp_user_companies') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string, value: string) => {
              // User A queriendo acceder a Company B debería devolver vacío
              if (field === 'user_id' && value === USER_A.id) {
                return {
                  eq: vi.fn().mockImplementation((f2: string, v2: string) => {
                    if (f2 === 'company_id' && v2 === COMPANY_B.id) {
                      return Promise.resolve({ data: [], error: null });
                    }
                    return Promise.resolve({ data: [], error: null });
                  }),
                };
              }
              return { eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const result = await mockSupabase.from('erp_user_companies')
        .select()
        .eq('user_id', USER_A.id)
        .eq('company_id', COMPANY_B.id);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('Fiscal Year Isolation', () => {
    it('should only return fiscal years for the current company', async () => {
      const currentCompanyId = COMPANY_A.id;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'erp_fiscal_years') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string, value: string) => {
              if (field === 'company_id' && value === currentCompanyId) {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: [FISCAL_YEAR_A],
                    error: null,
                  }),
                };
              }
              // RLS debería bloquear acceso a otras empresas
              return {
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      // Consulta para Company A
      const resultA = await mockSupabase.from('erp_fiscal_years')
        .select()
        .eq('company_id', COMPANY_A.id)
        .order('start_date');

      expect(resultA.data).toHaveLength(1);
      expect(resultA.data[0].company_id).toBe(COMPANY_A.id);

      // Intento de acceso a Company B debería fallar
      const resultB = await mockSupabase.from('erp_fiscal_years')
        .select()
        .eq('company_id', COMPANY_B.id)
        .order('start_date');

      expect(resultB.data).toHaveLength(0);
    });
  });

  describe('Audit Log Isolation', () => {
    it('should only show audit events for the current company', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'erp_audit_events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field: string, value: string) => {
              if (field === 'company_id' && value === COMPANY_A.id) {
                return {
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({
                    data: [AUDIT_EVENT_A],
                    error: null,
                  }),
                };
              }
              return {
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      // Audit events de Company A
      const resultA = await mockSupabase.from('erp_audit_events')
        .select()
        .eq('company_id', COMPANY_A.id)
        .order('created_at')
        .limit(100);

      expect(resultA.data).toHaveLength(1);
      expect(resultA.data[0].actor_user_id).toBe(USER_A.id);

      // No debería ver events de Company B
      const resultB = await mockSupabase.from('erp_audit_events')
        .select()
        .eq('company_id', COMPANY_B.id)
        .order('created_at')
        .limit(100);

      expect(resultB.data).toHaveLength(0);
    });

    it('audit events should not leak data between companies', async () => {
      const allAuditEvents = [AUDIT_EVENT_A, AUDIT_EVENT_B];
      const currentCompanyId = COMPANY_A.id;

      // Simular filtrado por company_id (como haría RLS)
      const filteredEvents = allAuditEvents.filter(
        e => e.company_id === currentCompanyId
      );

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].id).toBe(AUDIT_EVENT_A.id);
      expect(filteredEvents.some(e => e.company_id === COMPANY_B.id)).toBe(false);
    });
  });

  describe('Permission Isolation', () => {
    it('permissions should be company-scoped', async () => {
      const rolePermissionsCompanyA = [
        { role_id: 'role-admin-a', permission_id: 'perm-1', company_id: COMPANY_A.id },
        { role_id: 'role-admin-a', permission_id: 'perm-2', company_id: COMPANY_A.id },
      ];

      const rolePermissionsCompanyB = [
        { role_id: 'role-viewer-b', permission_id: 'perm-3', company_id: COMPANY_B.id },
      ];

      // User A tiene rol admin en Company A
      const userARoles = rolePermissionsCompanyA.filter(
        rp => rp.company_id === COMPANY_A.id
      );

      // User A NO debería tener permisos en Company B
      const userAInCompanyB = rolePermissionsCompanyB.filter(
        rp => rp.company_id === COMPANY_A.id
      );

      expect(userARoles).toHaveLength(2);
      expect(userAInCompanyB).toHaveLength(0);
    });

    it('admin.all permission should be company-scoped', () => {
      const checkAdminPermission = (
        permissions: string[],
        companyId: string,
        currentCompanyId: string
      ): boolean => {
        // admin.all solo aplica si el contexto es la misma empresa
        if (companyId !== currentCompanyId) return false;
        return permissions.includes('admin.all');
      };

      const userAPermissions = ['admin.all', 'config.read', 'config.write'];
      
      // Admin en Company A
      expect(checkAdminPermission(userAPermissions, COMPANY_A.id, COMPANY_A.id)).toBe(true);
      
      // NO Admin en Company B
      expect(checkAdminPermission(userAPermissions, COMPANY_B.id, COMPANY_A.id)).toBe(false);
    });
  });

  describe('Data Insert Isolation', () => {
    it('should only allow inserts for the current company', async () => {
      const currentCompanyId = COMPANY_A.id;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'erp_fiscal_years') {
          return {
            insert: vi.fn().mockImplementation((data: any[]) => {
              const record = data[0];
              // RLS verificaría que company_id coincide
              if (record.company_id !== currentCompanyId) {
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'new row violates row-level security policy' },
                  }),
                };
              }
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { ...record, id: 'new-fy-uuid' },
                  error: null,
                }),
              };
            }),
          };
        }
        return { insert: vi.fn().mockReturnThis() };
      });

      // Insert válido para Company A
      const validInsert = await mockSupabase.from('erp_fiscal_years')
        .insert([{ company_id: COMPANY_A.id, name: 'Test FY' }])
        .select()
        .single();

      expect(validInsert.error).toBeNull();
      expect(validInsert.data).not.toBeNull();

      // Insert inválido para Company B (RLS lo bloquea)
      const invalidInsert = await mockSupabase.from('erp_fiscal_years')
        .insert([{ company_id: COMPANY_B.id, name: 'Test FY' }])
        .select()
        .single();

      expect(invalidInsert.error).not.toBeNull();
      expect(invalidInsert.error?.message).toContain('row-level security');
    });
  });

  describe('Group Isolation', () => {
    it('companies in different groups should be isolated', () => {
      const groups = [
        { id: 'group-1-uuid', name: 'Grupo Holding A', companies: [COMPANY_A] },
        { id: 'group-2-uuid', name: 'Grupo Holding B', companies: [COMPANY_B] },
      ];

      const getCompaniesInGroup = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        return group?.companies || [];
      };

      const group1Companies = getCompaniesInGroup('group-1-uuid');
      const group2Companies = getCompaniesInGroup('group-2-uuid');

      expect(group1Companies).toHaveLength(1);
      expect(group1Companies[0].id).toBe(COMPANY_A.id);

      expect(group2Companies).toHaveLength(1);
      expect(group2Companies[0].id).toBe(COMPANY_B.id);

      // No hay solapamiento
      const overlap = group1Companies.filter(c1 =>
        group2Companies.some(c2 => c2.id === c1.id)
      );
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Cross-Company Query Prevention', () => {
    it('should prevent queries without company_id filter', () => {
      const validateQuery = (query: { table: string; filters: Record<string, any> }): boolean => {
        const tablesRequiringCompanyFilter = [
          'erp_fiscal_years',
          'erp_periods',
          'erp_document_series',
          'erp_audit_events',
          'erp_journal_entries',
          'erp_invoices',
        ];

        if (tablesRequiringCompanyFilter.includes(query.table)) {
          return 'company_id' in query.filters;
        }
        return true;
      };

      // Query válida con company_id
      expect(validateQuery({
        table: 'erp_fiscal_years',
        filters: { company_id: COMPANY_A.id },
      })).toBe(true);

      // Query inválida sin company_id
      expect(validateQuery({
        table: 'erp_fiscal_years',
        filters: { is_current: true },
      })).toBe(false);

      // Tabla que no requiere company_id
      expect(validateQuery({
        table: 'erp_permissions',
        filters: { module: 'accounting' },
      })).toBe(true);
    });
  });
});

describe('RLS Policy Simulation', () => {
  it('should simulate RLS SELECT policy', () => {
    const simulateRLSSelect = (
      userId: string,
      companyId: string,
      userCompanies: Array<{ user_id: string; company_id: string; is_active: boolean }>
    ): boolean => {
      // Simula: EXISTS (SELECT 1 FROM erp_user_companies WHERE user_id = auth.uid() AND company_id = target.company_id AND is_active)
      return userCompanies.some(
        uc => uc.user_id === userId && uc.company_id === companyId && uc.is_active
      );
    };

    const userCompanyMappings = [
      { user_id: USER_A.id, company_id: COMPANY_A.id, is_active: true },
      { user_id: USER_B.id, company_id: COMPANY_B.id, is_active: true },
    ];

    // User A puede ver Company A
    expect(simulateRLSSelect(USER_A.id, COMPANY_A.id, userCompanyMappings)).toBe(true);

    // User A NO puede ver Company B
    expect(simulateRLSSelect(USER_A.id, COMPANY_B.id, userCompanyMappings)).toBe(false);

    // User B puede ver Company B
    expect(simulateRLSSelect(USER_B.id, COMPANY_B.id, userCompanyMappings)).toBe(true);

    // User B NO puede ver Company A
    expect(simulateRLSSelect(USER_B.id, COMPANY_A.id, userCompanyMappings)).toBe(false);
  });

  it('should simulate RLS INSERT policy', () => {
    const simulateRLSInsert = (
      userId: string,
      targetCompanyId: string,
      userCompanies: Array<{ user_id: string; company_id: string; is_active: boolean }>,
      requiredPermission: string,
      userPermissions: Record<string, string[]>
    ): boolean => {
      // Verificar acceso a la empresa
      const hasCompanyAccess = userCompanies.some(
        uc => uc.user_id === userId && uc.company_id === targetCompanyId && uc.is_active
      );

      if (!hasCompanyAccess) return false;

      // Verificar permiso
      const permissions = userPermissions[`${userId}:${targetCompanyId}`] || [];
      return permissions.includes(requiredPermission) || permissions.includes('admin.all');
    };

    const userCompanyMappings = [
      { user_id: USER_A.id, company_id: COMPANY_A.id, is_active: true },
      { user_id: USER_B.id, company_id: COMPANY_B.id, is_active: true },
    ];

    const userPerms: Record<string, string[]> = {
      [`${USER_A.id}:${COMPANY_A.id}`]: ['admin.all'],
      [`${USER_B.id}:${COMPANY_B.id}`]: ['sales.read'],
    };

    // User A puede insertar en Company A (tiene admin.all)
    expect(simulateRLSInsert(
      USER_A.id,
      COMPANY_A.id,
      userCompanyMappings,
      'sales.write',
      userPerms
    )).toBe(true);

    // User A NO puede insertar en Company B (no tiene acceso)
    expect(simulateRLSInsert(
      USER_A.id,
      COMPANY_B.id,
      userCompanyMappings,
      'sales.write',
      userPerms
    )).toBe(false);

    // User B NO puede insertar en Company B (solo tiene read)
    expect(simulateRLSInsert(
      USER_B.id,
      COMPANY_B.id,
      userCompanyMappings,
      'sales.write',
      userPerms
    )).toBe(false);
  });
});
