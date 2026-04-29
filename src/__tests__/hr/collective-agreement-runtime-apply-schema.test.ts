/**
 * B10D.1 — Schema + safety contract tests for the runtime-apply layer.
 *
 * 3 tables:
 *   - erp_hr_company_agreement_registry_apply_requests
 *   - erp_hr_company_agreement_registry_apply_runs (append-only)
 *   - erp_hr_company_agreement_registry_runtime_settings
 *
 * Strategy:
 *   1. Type-level contract via generated Supabase types.
 *   2. Source-level inspection of the migration SQL: tables, columns,
 *      CHECKs, FKs, indexes (incl. partial uniques), RLS forced, SELECT
 *      policies, triggers and trigger functions, append-only,
 *      immutability, supersede, signature regex.
 *   3. Isolation: bridge / shadow flag / resolver / normalizer /
 *      payrollEngine / payslipEngine / operative agreements table /
 *      ready_for_payroll mutations are NOT touched by this migration.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Database } from '@/integrations/supabase/types';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function findMigrationSql(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  // Find the migration that creates apply_requests + apply_runs + runtime_settings.
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (
      sql.includes('erp_hr_company_agreement_registry_apply_requests') &&
      sql.includes('erp_hr_company_agreement_registry_apply_runs') &&
      sql.includes('erp_hr_company_agreement_registry_runtime_settings') &&
      sql.includes('CREATE TABLE')
    ) {
      return sql;
    }
  }
  throw new Error('B10D.1 migration not found');
}

const SQL = findMigrationSql();

describe('B10D.1 — runtime-apply schema (type contract)', () => {
  it('apply_requests table is exposed in generated types', () => {
    type Row = TableRow<'erp_hr_company_agreement_registry_apply_requests'>;
    const sample: Row = {
      id: 'x',
      mapping_id: 'm',
      company_id: 'c',
      employee_id: null,
      contract_id: null,
      request_status: 'draft',
      requested_by: 'u',
      requested_at: 'now',
      second_approved_by: null,
      second_approved_at: null,
      second_approval_acknowledgements: {},
      comparison_report_json: {},
      comparison_critical_diffs_count: 0,
      payroll_impact_preview_json: {},
      activation_run_id: null,
      rollback_run_id: null,
      rejection_reason: null,
      created_at: 'now',
      updated_at: 'now',
    } as Row;
    expect(sample.request_status).toBe('draft');
  });

  it('apply_runs table is exposed in generated types', () => {
    type Row = TableRow<'erp_hr_company_agreement_registry_apply_runs'>;
    const sample: Row = {
      id: 'x',
      apply_request_id: 'r',
      mapping_id: 'm',
      company_id: 'c',
      executed_by: 'u',
      executed_at: 'now',
      outcome: 'activated',
      pre_state_snapshot_json: {},
      post_state_snapshot_json: {},
      invariant_check_json: {},
      error_detail: null,
      run_signature_hash: 'a'.repeat(64),
      created_at: 'now',
    } as Row;
    expect(sample.outcome).toBe('activated');
  });

  it('runtime_settings table is exposed in generated types', () => {
    type Row = TableRow<'erp_hr_company_agreement_registry_runtime_settings'>;
    const sample: Row = {
      id: 'x',
      mapping_id: 'm',
      company_id: 'c',
      employee_id: null,
      contract_id: null,
      use_registry_for_payroll: true,
      activated_by: 'u',
      activated_at: 'now',
      activation_run_id: 'r',
      rollback_at: null,
      rollback_run_id: null,
      is_current: true,
      created_at: 'now',
      updated_at: 'now',
    } as Row;
    expect(sample.is_current).toBe(true);
  });
});

describe('B10D.1 — apply_requests SQL contract', () => {
  it('creates the table with all expected columns', () => {
    expect(SQL).toMatch(/CREATE TABLE public\.erp_hr_company_agreement_registry_apply_requests/);
    for (const col of [
      'mapping_id uuid NOT NULL',
      'company_id uuid NOT NULL',
      'employee_id uuid NULL',
      'contract_id uuid NULL',
      'request_status text NOT NULL',
      'requested_by uuid NOT NULL',
      'requested_at timestamptz NOT NULL',
      'second_approved_by uuid NULL',
      'second_approved_at timestamptz NULL',
      'second_approval_acknowledgements jsonb NOT NULL',
      'comparison_report_json jsonb NOT NULL',
      'comparison_critical_diffs_count integer NOT NULL',
      'payroll_impact_preview_json jsonb NOT NULL',
      'activation_run_id uuid NULL',
      'rollback_run_id uuid NULL',
      'rejection_reason text NULL',
    ]) {
      expect(SQL.includes(col)).toBe(true);
    }
  });

  it('CHECK request_status contains the 7 statuses', () => {
    for (const s of [
      'draft',
      'pending_second_approval',
      'approved_for_runtime',
      'activated',
      'rejected',
      'rolled_back',
      'superseded',
    ]) {
      expect(SQL).toMatch(new RegExp(`'${s}'`));
    }
  });

  it('CHECK comparison_critical_diffs_count >= 0', () => {
    expect(SQL).toMatch(/comparison_critical_diffs_count\s*>=\s*0/);
  });

  it('FK to mapping table is RESTRICT', () => {
    expect(SQL).toMatch(
      /REFERENCES public\.erp_hr_company_agreement_registry_mappings\(id\)\s*ON DELETE RESTRICT/,
    );
  });

  it('FK requested_by/second_approved_by to auth.users', () => {
    expect(SQL).toMatch(/requested_by uuid NOT NULL REFERENCES auth\.users\(id\)/);
    expect(SQL).toMatch(/second_approved_by uuid NULL REFERENCES auth\.users\(id\)/);
  });

  it('cross FKs activation_run_id / rollback_run_id added after apply_runs exists', () => {
    expect(SQL).toMatch(/fk_car_apply_requests_activation_run/);
    expect(SQL).toMatch(/fk_car_apply_requests_rollback_run/);
  });

  it('partial unique index: live request per mapping', () => {
    expect(SQL).toMatch(/uniq_car_apply_request_live_per_mapping/);
    expect(SQL).toMatch(
      /WHERE request_status IN \('draft','pending_second_approval','approved_for_runtime'\)/,
    );
  });

  it('helper indexes on apply_requests', () => {
    for (const idx of [
      'idx_car_apply_requests_mapping',
      'idx_car_apply_requests_company',
      'idx_car_apply_requests_status',
      'idx_car_apply_requests_requested_by',
      'idx_car_apply_requests_second_by',
    ]) {
      expect(SQL).toMatch(new RegExp(idx));
    }
  });
});

describe('B10D.1 — apply_runs SQL contract', () => {
  it('creates the table with the expected columns', () => {
    expect(SQL).toMatch(/CREATE TABLE public\.erp_hr_company_agreement_registry_apply_runs/);
    for (const col of [
      'apply_request_id uuid NOT NULL',
      'mapping_id uuid NOT NULL',
      'company_id uuid NOT NULL',
      'executed_by uuid NOT NULL',
      'executed_at timestamptz NOT NULL',
      'outcome text NOT NULL',
      'pre_state_snapshot_json jsonb NOT NULL',
      'post_state_snapshot_json jsonb NOT NULL',
      'invariant_check_json jsonb NOT NULL',
      'error_detail text NULL',
      'run_signature_hash text NOT NULL',
    ]) {
      expect(SQL.includes(col)).toBe(true);
    }
  });

  it('CHECK outcome contains the 3 values', () => {
    expect(SQL).toMatch(/outcome IN \('activated','blocked_by_invariant','rolled_back'\)/);
  });

  it('signature regex trigger validates SHA-256', () => {
    expect(SQL).toMatch(/run_signature_hash !~ '\^\[a-f0-9\]\{64\}\$'/);
    expect(SQL).toMatch(/runtime_apply_invalid_signature_hash/);
  });

  it('append-only triggers (no UPDATE, no DELETE)', () => {
    expect(SQL).toMatch(/trg_car_apply_runs_no_update[\s\S]*BEFORE UPDATE/);
    expect(SQL).toMatch(/trg_car_apply_runs_no_delete[\s\S]*BEFORE DELETE/);
    expect(SQL).toMatch(/runtime_apply_runs_append_only/);
  });

  it('helper indexes on apply_runs', () => {
    for (const idx of [
      'idx_car_apply_runs_request',
      'idx_car_apply_runs_mapping',
      'idx_car_apply_runs_company',
      'idx_car_apply_runs_outcome',
    ]) {
      expect(SQL).toMatch(new RegExp(idx));
    }
  });
});

describe('B10D.1 — runtime_settings SQL contract', () => {
  it('creates the table with the expected columns', () => {
    expect(SQL).toMatch(/CREATE TABLE public\.erp_hr_company_agreement_registry_runtime_settings/);
    for (const col of [
      'mapping_id uuid NOT NULL',
      'company_id uuid NOT NULL',
      'employee_id uuid NULL',
      'contract_id uuid NULL',
      'use_registry_for_payroll boolean NOT NULL DEFAULT true',
      'activated_by uuid NOT NULL',
      'activated_at timestamptz NOT NULL',
      'activation_run_id uuid NOT NULL',
      'rollback_at timestamptz NULL',
      'rollback_run_id uuid NULL',
      'is_current boolean NOT NULL DEFAULT true',
    ]) {
      expect(SQL.includes(col)).toBe(true);
    }
  });

  it('FKs to apply_runs are RESTRICT', () => {
    expect(SQL).toMatch(
      /activation_run_id uuid NOT NULL[\s\S]*REFERENCES public\.erp_hr_company_agreement_registry_apply_runs\(id\)\s*ON DELETE RESTRICT/,
    );
    expect(SQL).toMatch(
      /rollback_run_id uuid NULL[\s\S]*REFERENCES public\.erp_hr_company_agreement_registry_apply_runs\(id\)\s*ON DELETE RESTRICT/,
    );
  });

  it('partial unique index: ≤1 current per scope with COALESCE on null employee/contract', () => {
    expect(SQL).toMatch(/uniq_car_runtime_setting_current_per_scope/);
    expect(SQL).toMatch(/COALESCE\(employee_id, '00000000-0000-0000-0000-000000000000'::uuid\)/);
    expect(SQL).toMatch(/COALESCE\(contract_id, '00000000-0000-0000-0000-000000000000'::uuid\)/);
    expect(SQL).toMatch(/WHERE is_current = true/);
  });
});

describe('B10D.1 — RLS and policies', () => {
  it('enables and FORCEs RLS on the 3 tables', () => {
    for (const t of [
      'erp_hr_company_agreement_registry_apply_requests',
      'erp_hr_company_agreement_registry_apply_runs',
      'erp_hr_company_agreement_registry_runtime_settings',
    ]) {
      expect(SQL).toMatch(
        new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`),
      );
      expect(SQL).toMatch(
        new RegExp(`ALTER TABLE public\\.${t} FORCE\\s+ROW LEVEL SECURITY`),
      );
    }
  });

  it('only SELECT policies are created (no INSERT/UPDATE/DELETE policies)', () => {
    // SELECT policies present
    expect(SQL).toMatch(/car_apply_requests_select_authorized[\s\S]*FOR SELECT/);
    expect(SQL).toMatch(/car_apply_runs_select_authorized[\s\S]*FOR SELECT/);
    expect(SQL).toMatch(/car_runtime_settings_select_authorized[\s\S]*FOR SELECT/);
    // No write/delete policies for these tables
    const writePolicy = /CREATE POLICY[\s\S]*?FOR (INSERT|UPDATE|DELETE)[\s\S]*?ON public\.erp_hr_company_agreement_registry_(apply_requests|apply_runs|runtime_settings)/;
    expect(writePolicy.test(SQL)).toBe(false);
  });

  it('SELECT policies use user_has_erp_company_access + role gates', () => {
    expect(SQL).toMatch(/user_has_erp_company_access\(company_id\)/);
    for (const role of ['superadmin', 'admin', 'hr_manager', 'legal_manager', 'payroll_supervisor']) {
      expect(SQL).toMatch(new RegExp(`has_role\\(auth\\.uid\\(\\), '${role}'::app_role\\)`));
    }
  });

  it('does not contain USING(true)/WITH CHECK(true)', () => {
    expect(/USING\s*\(\s*true\s*\)/i.test(SQL)).toBe(false);
    expect(/WITH CHECK\s*\(\s*true\s*\)/i.test(SQL)).toBe(false);
  });
});

describe('B10D.1 — Triggers and trigger functions', () => {
  it('updated_at trigger function and triggers exist', () => {
    expect(SQL).toMatch(/FUNCTION public\.tg_car_set_updated_at/);
    expect(SQL).toMatch(/trg_car_apply_requests_updated_at[\s\S]*BEFORE UPDATE/);
    expect(SQL).toMatch(/trg_car_runtime_settings_updated_at[\s\S]*BEFORE UPDATE/);
  });

  it('second-approval invariants trigger exists with all gates', () => {
    expect(SQL).toMatch(/tg_car_apply_requests_second_approval_invariants/);
    for (const reason of [
      'self_approval_forbidden',
      'second_approval_required',
      'second_approver_role_invalid',
      'acknowledgements_incomplete',
      'comparison_critical_diffs_present',
      'mapping_not_found',
      'mapping_not_approved_internal',
      'mapping_not_current',
      'mapping_missing_internal_approval',
    ]) {
      expect(SQL).toMatch(new RegExp(`runtime_apply_blocked: ${reason}`));
    }
    for (const ack of [
      'understands_runtime_enable',
      'reviewed_comparison_report',
      'reviewed_payroll_impact',
      'confirms_rollback_available',
    ]) {
      expect(SQL).toMatch(new RegExp(ack));
    }
    for (const role of ['superadmin', 'admin', 'payroll_supervisor', 'legal_manager']) {
      expect(SQL).toMatch(
        new RegExp(`has_role\\(NEW\\.second_approved_by, '${role}'::app_role\\)`),
      );
    }
  });

  it('apply_requests immutable trigger exists and lists protected fields', () => {
    expect(SQL).toMatch(/tg_car_apply_requests_immutable/);
    for (const f of [
      'mapping_id',
      'company_id',
      'employee_id',
      'contract_id',
      'requested_by',
      'requested_at',
    ]) {
      expect(SQL).toMatch(new RegExp(`runtime_apply_immutable_field: ${f}`));
    }
  });

  it('runtime_settings supersede trigger exists (AFTER INSERT OR UPDATE)', () => {
    expect(SQL).toMatch(/tg_car_runtime_settings_supersede_previous/);
    expect(SQL).toMatch(/trg_car_runtime_settings_supersede[\s\S]*AFTER INSERT OR UPDATE/);
    expect(SQL).toMatch(/SET is_current = false/);
  });

  it('runtime_settings immutable trigger lists protected fields', () => {
    expect(SQL).toMatch(/tg_car_runtime_settings_immutable/);
    for (const f of [
      'mapping_id',
      'company_id',
      'employee_id',
      'contract_id',
      'activation_run_id',
      'activated_by',
      'activated_at',
    ]) {
      expect(SQL).toMatch(new RegExp(`runtime_setting_immutable_field: ${f}`));
    }
  });

  it('runtime_settings no-delete trigger exists', () => {
    expect(SQL).toMatch(/trg_car_runtime_settings_no_delete[\s\S]*BEFORE DELETE/);
    expect(SQL).toMatch(/runtime_settings_no_delete/);
  });
});

describe('B10D.1 — Isolation contract', () => {
  const FORBIDDEN = [
    'useESPayrollBridge',
    'registryShadowFlag',
    'agreementSalaryResolver',
    'salaryNormalizer',
    'payrollEngine',
    'payslipEngine',
    'agreementSafetyGate',
  ];

  it('migration does NOT reference any payroll-runtime identifier', () => {
    for (const id of FORBIDDEN) {
      expect(SQL.includes(id), `migration references ${id}`).toBe(false);
    }
  });

  it('migration does NOT reference operative table erp_hr_collective_agreements (without _registry)', () => {
    const operative = /erp_hr_collective_agreements(?!_registry|_registry_versions|_registry_sources|_registry_validations|_company_agreement_registry_mappings|_company_agreement_registry_apply|_company_agreement_registry_runtime)/;
    expect(operative.test(SQL)).toBe(false);
  });

  it('migration does NOT write ready_for_payroll', () => {
    // No assignment to ready_for_payroll. Allow the column name only inside
    // unrelated text — but here we expect zero occurrences.
    expect(SQL.includes('ready_for_payroll')).toBe(false);
  });

  it('useESPayrollBridge.ts is intact', () => {
    const bridgePath = join(process.cwd(), 'src/hooks/erp/hr/useESPayrollBridge.ts');
    const src = readFileSync(bridgePath, 'utf8');
    expect(src.length).toBeGreaterThan(0);
  });

  it('registryShadowFlag.ts still exports false', () => {
    const flagPath = join(process.cwd(), 'src/engines/erp/hr/registryShadowFlag.ts');
    const src = readFileSync(flagPath, 'utf8');
    expect(src).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });

  it('no edge function for B10D was created in this Build', () => {
    const candidates = [
      'supabase/functions/erp-hr-company-agreement-runtime-apply',
      'supabase/functions/erp-hr-runtime-apply',
    ];
    for (const dir of candidates) {
      const full = join(process.cwd(), dir);
      let exists = false;
      try {
        readdirSync(full);
        exists = true;
      } catch {
        exists = false;
      }
      expect(exists, `unexpected edge function dir ${dir}`).toBe(false);
    }
  });
});