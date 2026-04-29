/**
 * B10E.3 — Behavioral tests for the runtime payroll data loader (mock client).
 */
import { describe, it, expect } from 'vitest';
import {
  fetchRegistryRuntimePayrollSnapshot,
  sanitizeError,
} from '@/engines/erp/hr/registryRuntimePayrollDataLoader';

type TableResponse = { data?: any[]; error?: any } | (() => { data?: any[]; error?: any });

function makeClient(map: Record<string, TableResponse>) {
  const calls: string[] = [];
  const builder = (table: string) => {
    calls.push(table);
    const ops: any = {
      select: () => ops,
      eq: () => ops,
      in: () => ops,
      is: () => ops,
      order: () => ops,
      limit: () => ops,
      then: (resolve: (v: any) => any) => {
        const entry = map[table];
        const v = typeof entry === 'function' ? entry() : entry ?? { data: [] };
        return Promise.resolve(v).then(resolve);
      },
    };
    return ops;
  };
  return {
    from: (t: string) => builder(t),
    __calls: calls,
  };
}

const SETTING = {
  id: 'set-1',
  mapping_id: 'map-1',
  company_id: 'co-1',
  employee_id: null,
  contract_id: null,
  use_registry_for_payroll: true,
  is_current: true,
};
const MAPPING = {
  id: 'map-1',
  company_id: 'co-1',
  registry_agreement_id: 'ag-1',
  registry_version_id: 'ver-1',
  mapping_status: 'approved_internal',
  is_current: true,
};
const AGREEMENT = { id: 'ag-1', status: 'vigente', source_quality: 'official' };
const VERSION = { id: 'ver-1', agreement_id: 'ag-1', is_current: true };
const SOURCE = { id: 'src-1', agreement_id: 'ag-1', source_quality: 'official' };
const ROW = { id: 'row-1', agreement_id: 'ag-1', version_id: 'ver-1', year: 2026 };
const RULE = { id: 'rule-1', agreement_id: 'ag-1', rule_type: 'annual_hours' };

const HAPPY_MAP: Record<string, TableResponse> = {
  erp_hr_company_agreement_registry_runtime_settings: { data: [SETTING] },
  erp_hr_company_agreement_registry_mappings: { data: [MAPPING] },
  erp_hr_collective_agreements_registry: { data: [AGREEMENT] },
  erp_hr_collective_agreements_registry_versions: { data: [VERSION] },
  erp_hr_collective_agreements_registry_sources: { data: [SOURCE] },
  erp_hr_collective_agreements_registry_salary_tables: { data: [ROW] },
  erp_hr_collective_agreements_registry_rules: { data: [RULE] },
};

function baseInput(overrides: Partial<any> = {}) {
  return {
    companyId: 'co-1',
    employeeId: null,
    contractId: null,
    year: 2026,
    supabaseClient: makeClient(HAPPY_MAP),
    ...overrides,
  };
}

describe('B10E.3 — fetchRegistryRuntimePayrollSnapshot', () => {
  it('input sin companyId → invalid_input', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({ ...baseInput(), companyId: '' as any });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('invalid_input');
  });

  it('runtime settings query falla → runtime_settings_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_company_agreement_registry_runtime_settings: { error: { message: 'db down' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('runtime_settings_query_failed');
  });

  it('sin runtime settings → ok true + warning no_runtime_settings', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_company_agreement_registry_runtime_settings: { data: [] },
      }),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toContain('no_runtime_settings');
  });

  it('mapping query falla → mapping_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_company_agreement_registry_mappings: { error: { message: 'oops' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('mapping_query_failed');
  });

  it('agreement query falla → registry_agreement_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_collective_agreements_registry: { error: { message: 'oops' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('registry_agreement_query_failed');
  });

  it('versions query falla → registry_version_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_collective_agreements_registry_versions: { error: { message: 'oops' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('registry_version_query_failed');
  });

  it('sources query falla → registry_source_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_collective_agreements_registry_sources: { error: { message: 'oops' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('registry_source_query_failed');
  });

  it('salary tables query falla → salary_tables_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_collective_agreements_registry_salary_tables: { error: { message: 'oops' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('salary_tables_query_failed');
  });

  it('rules query falla → rules_query_failed', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_collective_agreements_registry_rules: { error: { message: 'oops' } },
      }),
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('rules_query_failed');
  });

  it('happy path → ok true with populated arrays', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.runtimeSettings).toHaveLength(1);
      expect(r.snapshot.mappings).toHaveLength(1);
      expect(r.snapshot.agreements).toHaveLength(1);
      expect(r.snapshot.versions).toHaveLength(1);
      expect(r.snapshot.sources).toHaveLength(1);
      expect(r.snapshot.salaryTables).toHaveLength(1);
      expect(r.snapshot.rules).toHaveLength(1);
    }
  });

  it('missing mapping para setting → warning', async () => {
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: makeClient({
        ...HAPPY_MAP,
        erp_hr_company_agreement_registry_mappings: { data: [] },
      }),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toContain('missing_mapping_for_setting');
  });

  it('sanitizeError recorta mensaje largo', () => {
    const long = 'x'.repeat(800);
    const out = sanitizeError({ message: long });
    expect(out.length).toBeLessThanOrEqual(300);
  });

  it('no lanza excepción ante errores simulados (throw en query)', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                then: (_r: any, rej: any) => Promise.reject(new Error('boom')).catch(rej),
              }),
            }),
          }),
        }),
      }),
    };
    // Use a client that throws synchronously inside the chain.
    const throwingClient = {
      from: () => {
        throw new Error('explode');
      },
    };
    const r = await fetchRegistryRuntimePayrollSnapshot({
      ...baseInput(),
      supabaseClient: throwingClient as any,
    });
    if (r.ok) { throw new Error('expected failure'); } expect(r.error).toBe('runtime_settings_query_failed');
    // Reference unused var to keep linter happy.
    expect(typeof client.from).toBe('function');
  });
});