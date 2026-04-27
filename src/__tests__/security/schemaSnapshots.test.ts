/**
 * S5 Fase 2 — Bloque E: Schema Snapshot Tests
 *
 * Validates that critical HR tables maintain their expected column contracts.
 * Uses the generated Supabase types as source of truth so any migration
 * breaking the data contract is caught at compile time + test time.
 *
 * ⚠️  NO production code is modified — read-only validation against types.
 */

import { describe, it, expect } from 'vitest';
import type { Database } from '@/integrations/supabase/types';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

// ============================================================
// 1. erp_hr_employees — Core entity for all HR operations
// ============================================================

describe('Schema Contract: erp_hr_employees', () => {
  type Row = TableRow<'erp_hr_employees'>;
  type Ins = TableInsert<'erp_hr_employees'>;

  const CRITICAL_COLUMNS: (keyof Row)[] = [
    'id',
    'company_id',
    'user_id',
    'first_name',
    'last_name',
    'email',
    'status',
    'hire_date',
    'department_id',
    'position_id',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as Row;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (12 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(12);
  });

  it('company_id is required on insert (tenant isolation)', () => {
    type Check = Ins extends { company_id: string } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('id is optional on insert (auto-generated)', () => {
    type Check = Ins extends { id: string } ? false : true;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// ============================================================
// 2. erp_hr_payroll_runs — Payroll processing backbone
// ============================================================

describe('Schema Contract: erp_hr_payroll_runs', () => {
  type Row = TableRow<'erp_hr_payroll_runs'>;
  type Ins = TableInsert<'erp_hr_payroll_runs'>;

  const CRITICAL_COLUMNS: (keyof Row)[] = [
    'id',
    'company_id',
    'period_id',
    'period_month',
    'period_year',
    'status',
    'run_type',
    'total_gross',
    'total_net',
    'total_deductions',
    'total_employees',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as Row;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (13 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(13);
  });

  it('company_id is required on insert (tenant isolation)', () => {
    type Check = Ins extends { company_id: string } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('financial fields exist for payroll calculations', () => {
    const row = {} as Row;
    const _gross: typeof row.total_gross = row.total_gross;
    const _net: typeof row.total_net = row.total_net;
    const _deductions: typeof row.total_deductions = row.total_deductions;
    expect([_gross, _net, _deductions]).toBeDefined();
  });

  it('period fields exist for date range processing', () => {
    const row = {} as Row;
    const _id: typeof row.period_id = row.period_id;
    const _month: typeof row.period_month = row.period_month;
    const _year: typeof row.period_year = row.period_year;
    expect([_id, _month, _year]).toBeDefined();
  });
});

// ============================================================
// 3. erp_user_companies — Multi-tenant membership (RLS backbone)
// ============================================================

describe('Schema Contract: erp_user_companies', () => {
  type Row = TableRow<'erp_user_companies'>;
  type Ins = TableInsert<'erp_user_companies'>;

  const CRITICAL_COLUMNS: (keyof Row)[] = [
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
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as Row;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (8 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(8);
  });

  it('user_id is required on insert', () => {
    type Check = Ins extends { user_id: string } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('company_id is required on insert', () => {
    type Check = Ins extends { company_id: string } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('is_active field is part of the Row type', () => {
    // Type-level: this won't compile if is_active is removed
    type HasIsActive = Row extends { is_active: boolean | null } ? true : false;
    const check: HasIsActive = true;
    expect(check).toBe(true);
  });

  it('is_default field is part of the Row type', () => {
    type HasIsDefault = Row extends { is_default: boolean | null } ? true : false;
    const check: HasIsDefault = true;
    expect(check).toBe(true);
  });
});

// ============================================================
// CASUISTICA-FECHAS-01 Fase C1 — erp_hr_payroll_incidents hardening
// Validates new columns added by C1 migration are present in generated types.
// Triggers/functions are validated at DB level (not type-level).
// ============================================================

describe('Schema Contract: erp_hr_payroll_incidents (C1 hardening)', () => {
  type Row = TableRow<'erp_hr_payroll_incidents'>;

  it('Row includes deleted_at (soft-delete)', () => {
    type Check = Row extends { deleted_at: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes deleted_by', () => {
    type Check = Row extends { deleted_by: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes cancellation_reason', () => {
    type Check = Row extends { cancellation_reason: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes version (NOT NULL, default 1)', () => {
    type Check = Row extends { version: number } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes legal_review_required (NOT NULL, default false)', () => {
    type Check = Row extends { legal_review_required: boolean } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes official_communication_type (FDI|AFI|DELTA|INSS|TGSS|SEPE)', () => {
    type Check = Row extends { official_communication_type: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});
