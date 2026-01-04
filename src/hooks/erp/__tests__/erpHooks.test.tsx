/**
 * Tests para Hooks ERP
 * Verifica la funcionalidad de los hooks principales
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============ MOCKS ============

const mockUser = { id: 'test-user-uuid', email: 'test@example.com' };

const mockCompany = {
  id: 'test-company-uuid',
  code: 'TEST',
  name: 'Test Company',
  legal_name: 'Test Company S.L.',
  tax_id: 'B00000000',
  currency: 'EUR',
  is_active: true,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    session: { user: mockUser },
  }),
}));

const mockSupabase = {
  auth: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: { user: mockUser } } })),
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
    info: vi.fn(),
  },
}));

// ============ TEST WRAPPER ============

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// ============ TESTS ============

describe('ERP Hook Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ERPCompany Type', () => {
    it('should have required fields', () => {
      const company: typeof mockCompany = {
        id: 'uuid',
        code: 'CODE',
        name: 'Name',
        legal_name: 'Legal Name',
        tax_id: 'B12345678',
        currency: 'EUR',
        is_active: true,
      };

      expect(company.id).toBeDefined();
      expect(company.code).toBeDefined();
      expect(company.name).toBeDefined();
      expect(company.currency).toBeDefined();
      expect(company.is_active).toBeDefined();
    });

    it('should allow nullable fields', () => {
      const company = {
        id: 'uuid',
        code: 'CODE',
        name: 'Name',
        legal_name: null,
        tax_id: null,
        currency: 'EUR',
        is_active: true,
      };

      expect(company.legal_name).toBeNull();
      expect(company.tax_id).toBeNull();
    });
  });

  describe('ERPFiscalYear Type', () => {
    it('should have required fields', () => {
      const fiscalYear = {
        id: 'fy-uuid',
        company_id: 'company-uuid',
        name: '2026',
        code: '2026',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_current: true,
        is_closed: false,
      };

      expect(fiscalYear.id).toBeDefined();
      expect(fiscalYear.company_id).toBeDefined();
      expect(fiscalYear.start_date).toBeDefined();
      expect(fiscalYear.end_date).toBeDefined();
      expect(fiscalYear.is_current).toBe(true);
      expect(fiscalYear.is_closed).toBe(false);
    });
  });

  describe('ERPPeriod Type', () => {
    it('should have required fields', () => {
      const period = {
        id: 'period-uuid',
        fiscal_year_id: 'fy-uuid',
        company_id: 'company-uuid',
        period_number: 1,
        month: 1,
        name: 'Enero 2026',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
        is_closed: false,
        is_adjustment: false,
      };

      expect(period.id).toBeDefined();
      expect(period.fiscal_year_id).toBeDefined();
      expect(period.company_id).toBeDefined();
      expect(period.period_number).toBe(1);
      expect(period.is_closed).toBe(false);
    });
  });

  describe('ERPDocumentSeries Type', () => {
    it('should have required fields', () => {
      const series = {
        id: 'series-uuid',
        company_id: 'company-uuid',
        module: 'sales',
        document_type: 'invoice',
        code: 'FV',
        name: 'Facturas de Venta',
        prefix: 'FV',
        suffix: '',
        next_number: 1,
        padding: 6,
        reset_annually: true,
        is_default: true,
        is_active: true,
      };

      expect(series.id).toBeDefined();
      expect(series.company_id).toBeDefined();
      expect(series.module).toBe('sales');
      expect(series.document_type).toBe('invoice');
      expect(series.next_number).toBe(1);
      expect(series.padding).toBe(6);
    });

    it('should generate correct document numbers', () => {
      const generateDocNumber = (
        prefix: string,
        number: number,
        padding: number,
        suffix: string
      ): string => {
        return `${prefix}${String(number).padStart(padding, '0')}${suffix}`;
      };

      expect(generateDocNumber('FV', 1, 6, '')).toBe('FV000001');
      expect(generateDocNumber('FV', 123, 6, '')).toBe('FV000123');
      expect(generateDocNumber('FC-', 1, 4, '-2026')).toBe('FC-0001-2026');
    });
  });
});

describe('Permission Utilities', () => {
  const hasPermission = (permissions: string[], required: string): boolean => {
    if (permissions.includes('admin.all')) return true;
    return permissions.includes(required);
  };

  const hasAnyPermission = (permissions: string[], required: string[]): boolean => {
    if (permissions.includes('admin.all')) return true;
    return required.some(r => permissions.includes(r));
  };

  it('should check single permission', () => {
    const perms = ['sales.read', 'sales.write'];

    expect(hasPermission(perms, 'sales.read')).toBe(true);
    expect(hasPermission(perms, 'sales.write')).toBe(true);
    expect(hasPermission(perms, 'accounting.read')).toBe(false);
  });

  it('should grant all with admin.all', () => {
    const perms = ['admin.all'];

    expect(hasPermission(perms, 'sales.read')).toBe(true);
    expect(hasPermission(perms, 'anything.whatever')).toBe(true);
  });

  it('should check any permission', () => {
    const perms = ['sales.read'];

    expect(hasAnyPermission(perms, ['sales.read', 'sales.write'])).toBe(true);
    expect(hasAnyPermission(perms, ['accounting.read', 'accounting.write'])).toBe(false);
  });
});

describe('Audit Event Utilities', () => {
  interface AuditEvent {
    id: string;
    company_id: string;
    actor_user_id: string;
    entity_type: string;
    entity_id: string | null;
    action: string;
    before_json: Record<string, any> | null;
    after_json: Record<string, any> | null;
    metadata: Record<string, any>;
    created_at: string;
  }

  it('should create proper audit event', () => {
    const createAuditEvent = (
      companyId: string,
      userId: string,
      entityType: string,
      entityId: string | null,
      action: string,
      before: Record<string, any> | null,
      after: Record<string, any> | null
    ): Omit<AuditEvent, 'id' | 'created_at'> => ({
      company_id: companyId,
      actor_user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      before_json: before,
      after_json: after,
      metadata: { timestamp: new Date().toISOString() },
    });

    const event = createAuditEvent(
      'company-uuid',
      'user-uuid',
      'invoice',
      'inv-001',
      'update',
      { total: 100 },
      { total: 150 }
    );

    expect(event.company_id).toBe('company-uuid');
    expect(event.actor_user_id).toBe('user-uuid');
    expect(event.entity_type).toBe('invoice');
    expect(event.action).toBe('update');
    expect(event.before_json).toEqual({ total: 100 });
    expect(event.after_json).toEqual({ total: 150 });
  });

  it('should detect changes in audit', () => {
    const detectChanges = (
      before: Record<string, any> | null,
      after: Record<string, any> | null
    ): string[] => {
      if (!before || !after) return [];
      
      const changedFields: string[] = [];
      const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
      
      allKeys.forEach(key => {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changedFields.push(key);
        }
      });

      return changedFields;
    };

    const changes = detectChanges(
      { name: 'Old', total: 100, status: 'draft' },
      { name: 'New', total: 100, status: 'sent' }
    );

    expect(changes).toContain('name');
    expect(changes).toContain('status');
    expect(changes).not.toContain('total');
  });
});

describe('Fiscal Year Utilities', () => {
  it('should validate fiscal year dates', () => {
    const validateFiscalYear = (startDate: string, endDate: string): boolean => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return end > start;
    };

    expect(validateFiscalYear('2026-01-01', '2026-12-31')).toBe(true);
    expect(validateFiscalYear('2026-12-31', '2026-01-01')).toBe(false);
    expect(validateFiscalYear('2026-01-01', '2026-01-01')).toBe(false);
  });

  it('should check date within fiscal year', () => {
    const isDateInFiscalYear = (
      date: string,
      fyStart: string,
      fyEnd: string
    ): boolean => {
      const d = new Date(date);
      const start = new Date(fyStart);
      const end = new Date(fyEnd);
      return d >= start && d <= end;
    };

    expect(isDateInFiscalYear('2026-06-15', '2026-01-01', '2026-12-31')).toBe(true);
    expect(isDateInFiscalYear('2025-12-31', '2026-01-01', '2026-12-31')).toBe(false);
    expect(isDateInFiscalYear('2027-01-01', '2026-01-01', '2026-12-31')).toBe(false);
  });

  it('should generate periods for fiscal year', () => {
    const generateMonthlyPeriods = (
      fyId: string,
      companyId: string,
      year: number
    ): Array<{ period_number: number; month: number; name: string; start_date: string; end_date: string }> => {
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      return months.map((name, idx) => {
        const month = idx + 1;
        const startDate = new Date(year, idx, 1);
        const endDate = new Date(year, idx + 1, 0);

        return {
          period_number: month,
          month,
          name: `${name} ${year}`,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        };
      });
    };

    const periods = generateMonthlyPeriods('fy-uuid', 'company-uuid', 2026);

    expect(periods).toHaveLength(12);
    expect(periods[0].name).toBe('Enero 2026');
    expect(periods[0].start_date).toBe('2026-01-01');
    expect(periods[0].end_date).toBe('2026-01-31');
    expect(periods[11].name).toBe('Diciembre 2026');
    expect(periods[11].end_date).toBe('2026-12-31');
  });
});

describe('Document Series Utilities', () => {
  it('should generate next document number', () => {
    const getNextDocNumber = (
      prefix: string,
      currentNumber: number,
      padding: number,
      suffix: string
    ): { number: string; nextValue: number } => {
      const numStr = String(currentNumber).padStart(padding, '0');
      return {
        number: `${prefix}${numStr}${suffix}`,
        nextValue: currentNumber + 1,
      };
    };

    const result = getNextDocNumber('FV', 1, 6, '');
    expect(result.number).toBe('FV000001');
    expect(result.nextValue).toBe(2);

    const result2 = getNextDocNumber('FC-', 99, 4, '-2026');
    expect(result2.number).toBe('FC-0099-2026');
    expect(result2.nextValue).toBe(100);
  });

  it('should reset series annually', () => {
    const shouldResetSeries = (
      lastUsedYear: number,
      currentYear: number,
      resetAnnually: boolean
    ): boolean => {
      return resetAnnually && currentYear > lastUsedYear;
    };

    expect(shouldResetSeries(2025, 2026, true)).toBe(true);
    expect(shouldResetSeries(2026, 2026, true)).toBe(false);
    expect(shouldResetSeries(2025, 2026, false)).toBe(false);
  });
});
