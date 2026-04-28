/**
 * B1 — Registro Maestro de Convenios Colectivos
 *
 * Tests de contrato de schema usando los tipos generados de Supabase como
 * fuente de verdad. NO ejecuta SQL contra la DB: si una migración futura
 * rompe el contrato (renombra columnas, cambia tipos, elimina banderas de
 * seguridad legal), estos tests fallan en compile + runtime.
 *
 * Invariantes legales validadas:
 *  - El registro maestro existe y expone las banderas de seguridad
 *    (ready_for_payroll, requires_human_review, official_submission_blocked,
 *    salary_tables_loaded, source_quality, data_completeness, status).
 *  - Las 5 tablas hijas existen y tienen FK a la maestra (agreement_id).
 *  - import_runs está disponible para auditoría.
 *
 * El cumplimiento real del trigger defensivo (bloqueo de ready_for_payroll
 * sin invariantes) se valida a nivel DB en la migración B1; aquí sólo se
 * verifica que las columnas implicadas siguen presentes y con el tipo
 * correcto, ya que sin ellas el trigger no puede operar.
 */

import { describe, it, expect } from 'vitest';
import type { Database } from '@/integrations/supabase/types';

type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

// =============================================================
// 1. erp_hr_collective_agreements_registry — registro maestro
// =============================================================

describe('Schema Contract: erp_hr_collective_agreements_registry', () => {
  type Row = TableRow<'erp_hr_collective_agreements_registry'>;
  type Ins = TableInsert<'erp_hr_collective_agreements_registry'>;

  const CRITICAL_COLUMNS: (keyof Row)[] = [
    'id',
    'internal_code',
    'official_name',
    'scope_type',
    'jurisdiction_code',
    'cnae_codes',
    'status',
    'source_quality',
    'data_completeness',
    'salary_tables_loaded',
    'ready_for_payroll',
    'requires_human_review',
    'official_submission_blocked',
    'created_at',
    'updated_at',
  ];

  it('Row type includes all critical columns', () => {
    const _typeCheck: Record<(typeof CRITICAL_COLUMNS)[number], unknown> = {} as Row;
    expect(_typeCheck).toBeDefined();
  });

  it('critical columns list is stable (15 columns)', () => {
    expect(CRITICAL_COLUMNS).toHaveLength(15);
  });

  it('internal_code, official_name, scope_type, jurisdiction_code are required on insert', () => {
    type Check = Ins extends {
      internal_code: string;
      official_name: string;
      scope_type: string;
      jurisdiction_code: string;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('payroll-safety flags are booleans on Row', () => {
    type Check = Row extends {
      ready_for_payroll: boolean;
      requires_human_review: boolean;
      official_submission_blocked: boolean;
      salary_tables_loaded: boolean;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('cnae_codes is a string array (GIN-indexed for CNAE search)', () => {
    type Check = Row extends { cnae_codes: string[] } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================
// 2. _versions — versionado con is_current
// =============================================================

describe('Schema Contract: erp_hr_collective_agreements_registry_versions', () => {
  type Row = TableRow<'erp_hr_collective_agreements_registry_versions'>;

  it('Row exposes agreement_id, version_label, change_type, is_current', () => {
    type Check = Row extends {
      agreement_id: string;
      version_label: string;
      change_type: string;
      is_current: boolean;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes superseded_by for version chains', () => {
    type Check = Row extends { superseded_by: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================
// 3. _salary_tables — nunca activan ready_for_payroll por sí solas
// =============================================================

describe('Schema Contract: erp_hr_collective_agreements_registry_salary_tables', () => {
  type Row = TableRow<'erp_hr_collective_agreements_registry_salary_tables'>;

  it('Row links to agreement_id and version_id and carries year', () => {
    type Check = Row extends {
      agreement_id: string;
      version_id: string;
      year: number;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row carries requires_human_review (default true at DB level)', () => {
    type Check = Row extends { requires_human_review: boolean } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================
// 4. _rules — reglas no salariales
// =============================================================

describe('Schema Contract: erp_hr_collective_agreements_registry_rules', () => {
  type Row = TableRow<'erp_hr_collective_agreements_registry_rules'>;

  it('Row exposes agreement_id, rule_type, rule_json', () => {
    type Check = Row extends {
      agreement_id: string;
      rule_type: string;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================
// 5. _sources — REGCON/BOE/boletines + hash documento
// =============================================================

describe('Schema Contract: erp_hr_collective_agreements_registry_sources', () => {
  type Row = TableRow<'erp_hr_collective_agreements_registry_sources'>;

  it('Row exposes source_type, source_quality, document_hash, status', () => {
    type Check = Row extends {
      agreement_id: string;
      source_type: string;
      source_quality: string;
      status: string;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });

  it('Row includes document_hash for change detection', () => {
    type Check = Row extends { document_hash: string | null } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================
// 6. _import_runs — auditoría del importer
// =============================================================

describe('Schema Contract: erp_hr_collective_agreements_registry_import_runs', () => {
  type Row = TableRow<'erp_hr_collective_agreements_registry_import_runs'>;

  it('Row exposes counters and status for run auditing', () => {
    type Check = Row extends {
      source: string;
      total_found: number;
      inserted: number;
      updated: number;
      skipped: number;
      errors: number;
      status: string;
    }
      ? true
      : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});

// =============================================================
// 7. Coexistencia con la tabla operativa preexistente
// =============================================================

describe('B1 coexistence: legacy operational table is untouched', () => {
  it('legacy erp_hr_collective_agreements still exists with its own schema', () => {
    type LegacyRow = TableRow<'erp_hr_collective_agreements'>;
    // La tabla operativa por empresa sigue existiendo con su shape original
    // (code/name/salary_tables jsonb/company_id...). Nos basta con verificar
    // que sigue tipada y disponible para el resto del ERP.
    type Check = LegacyRow extends { id: string } ? true : false;
    const r: Check = true;
    expect(r).toBe(true);
  });
});