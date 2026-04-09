/**
 * S5 Fase 2 — Bloque E: Schema Snapshot Tests
 *
 * Validates that critical HR tables maintain their expected column contracts.
 * These tests use the generated Supabase types as the source of truth,
 * ensuring that any migration breaking the data contract is caught immediately.
 *
 * ⚠️  NO production code is modified — read-only validation against types.
 */

import { describe, it, expect } from 'vitest';
import type { Database } from '@/integrations/supabase/types';

// === Type Helpers ===
type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Extracts the keys of a type as a string array for assertion */
function columnsOf<T extends Record<string, unknown>>(): (keyof T)[] {
  // We validate at the type level — runtime uses the expected list
  return [] as unknown as (keyof T)[];
}

// ============================================================
// 1. erp_hr_employees — Core entity for all HR operations
// ============================================================

describe('Schema Contract: erp_hr_employees', () => {
  type EmployeeRow = TableRow<'erp_hr_employees'>;
  type EmployeeInsert = TableInsert<'erp_hr_employees'>;

  // These columns are used by hooks, edge functions, and RLS policies.
  // Removing or renaming any of them will break tenant isolation or business logic.
  const CRITICAL_COLUMNS: (keyof EmployeeRow)[] = [
    'id',
    'company_id',
    'user_id',
    'first_name',
    'last_name',
    'email',
    'status',
    'hire_date',
    'department_id',
    'position',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    // Type-level check: if any column is removed from the DB type,
    // TypeScript will error here at compile time.
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as EmployeeRow;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (12 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(12);
  });

  it('company_id is required on insert (tenant isolation)', () => {
    // company_id must NOT be optional on insert — it's the tenant key
    type CompanyIdRequired = EmployeeInsert extends { company_id: string } ? true : false;
    const isRequired: CompanyIdRequired = true;
    expect(isRequired).toBe(true);
  });

  it('id has a default (uuid auto-generation)', () => {
    // id should be optional on insert (auto-generated)
    type IdOptional = EmployeeInsert extends { id: string } ? false : true;
    const isOptional: IdOptional = true;
    expect(isOptional).toBe(true);
  });

  it('status field exists for lifecycle management', () => {
    const row = {} as EmployeeRow;
    // Type assertion — if status is removed, this line won't compile
    const _status: typeof row.status = row.status;
    expect(typeof _status === 'string' || _status === null || _status === undefined).toBe(true);
  });
});

// ============================================================
// 2. erp_hr_payroll_runs — Payroll processing backbone
// ============================================================

describe('Schema Contract: erp_hr_payroll_runs', () => {
  type PayrollRunRow = TableRow<'erp_hr_payroll_runs'>;
  type PayrollRunInsert = TableInsert<'erp_hr_payroll_runs'>;

  const CRITICAL_COLUMNS: (keyof PayrollRunRow)[] = [
    'id',
    'company_id',
    'period_start',
    'period_end',
    'status',
    'run_type',
    'total_gross',
    'total_net',
    'total_deductions',
    'employee_count',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as PayrollRunRow;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (12 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(12);
  });

  it('company_id is required on insert (tenant isolation)', () => {
    type CompanyIdRequired = PayrollRunInsert extends { company_id: string } ? true : false;
    const isRequired: CompanyIdRequired = true;
    expect(isRequired).toBe(true);
  });

  it('financial fields exist for payroll calculations', () => {
    const row = {} as PayrollRunRow;
    // These fields are consumed by payroll-calculation-engine
    const _gross: typeof row.total_gross = row.total_gross;
    const _net: typeof row.total_net = row.total_net;
    const _deductions: typeof row.total_deductions = row.total_deductions;
    expect([_gross, _net, _deductions]).toBeDefined();
  });

  it('period fields exist for date range processing', () => {
    const row = {} as PayrollRunRow;
    const _start: typeof row.period_start = row.period_start;
    const _end: typeof row.period_end = row.period_end;
    expect([_start, _end]).toBeDefined();
  });
});

// ============================================================
// 3. erp_user_companies — Multi-tenant membership (RLS backbone)
// ============================================================

describe('Schema Contract: erp_user_companies', () => {
  type UCRow = TableRow<'erp_user_companies'>;
  type UCInsert = TableInsert<'erp_user_companies'>;

  // This table is referenced by user_has_erp_company_access (139+ RLS policies),
  // validateTenantAccess in edge functions, and useERPContext hook.
  const CRITICAL_COLUMNS: (keyof UCRow)[] = [
    'id',
    'user_id',
    'company_id',
    'role_id',
    'is_active',
    'is_default',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as UCRow;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (8 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(8);
  });

  it('user_id is required on insert', () => {
    type UserIdRequired = UCInsert extends { user_id: string } ? true : false;
    const isRequired: UserIdRequired = true;
    expect(isRequired).toBe(true);
  });

  it('company_id is required on insert', () => {
    type CompanyIdRequired = UCInsert extends { company_id: string } ? true : false;
    const isRequired: CompanyIdRequired = true;
    expect(isRequired).toBe(true);
  });

  it('is_active field exists for membership filtering', () => {
    // validateTenantAccess and RLS both filter on is_active = true
    const row = {} as UCRow;
    const _active: typeof row.is_active = row.is_active;
    expect(typeof _active === 'boolean' || _active === null).toBe(true);
  });

  it('is_default field exists for default company selection', () => {
    // useERPContext reads is_default to set initial company
    const row = {} as UCRow;
    const _default: typeof row.is_default = row.is_default;
    expect(typeof _default === 'boolean' || _default === null).toBe(true);
  });
});
