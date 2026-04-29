/**
 * B10C.2A — Tests for the pure mapping preview helper.
 * Behavior + static contract (no Supabase, no payroll, no bridge, etc.).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  previewRegistryAgreementMapping,
  type CompanySnapshot,
  type EmployeeContractSnapshot,
  type RegistryAgreementCandidateInput,
  type MappingPreviewInput,
} from '@/engines/erp/hr/registryAgreementMappingPreview';

import type {
  RegistryAgreementSnapshot,
  RegistryAgreementVersionSnapshot,
  RegistryAgreementSourceSnapshot,
} from '@/engines/erp/hr/registryAwareAgreementResolver';

// ---------- Builders ----------

function makeAgreement(overrides: Partial<RegistryAgreementSnapshot> = {}): RegistryAgreementSnapshot {
  return {
    id: overrides.id ?? 'agr-A',
    internal_code: overrides.internal_code ?? 'CONV-A',
    status: overrides.status ?? 'vigente',
    ready_for_payroll: overrides.ready_for_payroll ?? true,
    requires_human_review: overrides.requires_human_review ?? false,
    data_completeness: overrides.data_completeness ?? 'human_validated',
    salary_tables_loaded: overrides.salary_tables_loaded ?? true,
  };
}

function makeVersion(
  overrides: Partial<RegistryAgreementVersionSnapshot> = {},
): RegistryAgreementVersionSnapshot {
  return {
    id: overrides.id ?? 'ver-A',
    agreement_id: overrides.agreement_id ?? 'agr-A',
    is_current: overrides.is_current ?? true,
    source_hash: overrides.source_hash ?? null,
  };
}

function makeSource(
  overrides: Partial<RegistryAgreementSourceSnapshot> = {},
): RegistryAgreementSourceSnapshot {
  return {
    id: overrides.id ?? 'src-A',
    agreement_id: overrides.agreement_id ?? 'agr-A',
    source_quality: overrides.source_quality ?? 'official',
    document_hash: overrides.document_hash ?? null,
  };
}

function makeCandidate(
  overrides: Partial<RegistryAgreementCandidateInput> & { id?: string } = {},
): RegistryAgreementCandidateInput {
  const id = overrides.id ?? 'agr-A';
  return {
    agreement: overrides.agreement ?? makeAgreement({ id, internal_code: `CONV-${id}` }),
    version: overrides.version ?? makeVersion({ id: `ver-${id}`, agreement_id: id }),
    source: overrides.source ?? makeSource({ id: `src-${id}`, agreement_id: id }),
    cnae_codes: overrides.cnae_codes ?? ['4711'],
    province_code: overrides.province_code ?? 'PM',
    autonomous_region: overrides.autonomous_region ?? 'IB',
    scope_type: overrides.scope_type ?? 'provincial',
    effective_end_date: overrides.effective_end_date ?? '2099-12-31',
    sector: overrides.sector ?? 'comercio',
    name_match_only: overrides.name_match_only ?? false,
  };
}

function makeCompany(overrides: Partial<CompanySnapshot> = {}): CompanySnapshot {
  return {
    company_id: overrides.company_id ?? 'co-1',
    cnae_codes: overrides.cnae_codes ?? ['4711'],
    province_code: overrides.province_code ?? 'PM',
    autonomous_region: overrides.autonomous_region ?? 'IB',
    sector: overrides.sector ?? 'comercio',
    legacy_operative_agreement_code: overrides.legacy_operative_agreement_code,
  };
}

function buildInput(overrides: Partial<MappingPreviewInput> = {}): MappingPreviewInput {
  return {
    company: overrides.company ?? makeCompany(),
    contract: overrides.contract,
    candidates: overrides.candidates ?? [makeCandidate()],
    today: overrides.today ?? '2026-04-29',
  };
}

// ---------- Behavior ----------

describe('previewRegistryAgreementMapping — behavior', () => {
  it('CNAE + province match + payroll_ready ⇒ top candidate, requiresHumanSelection true', () => {
    const result = previewRegistryAgreementMapping(buildInput());
    expect(result.candidates).toHaveLength(1);
    const top = result.candidates[0];
    expect(top.payroll_ready).toBe(true);
    expect(top.blockers).toEqual([]);
    expect(top.score).toBeGreaterThan(0);
    expect(result.requiresHumanSelection).toBe(true);
  });

  it('emits recommendedCandidateId only when margin >= 20 and candidate is payroll_ready', () => {
    const strong = makeCandidate({ id: 'agr-strong' });
    const weakAgreement = makeAgreement({ id: 'agr-weak', internal_code: 'CONV-weak' });
    const weak: RegistryAgreementCandidateInput = {
      agreement: weakAgreement,
      version: makeVersion({ id: 'ver-weak', agreement_id: 'agr-weak' }),
      source: makeSource({ id: 'src-weak', agreement_id: 'agr-weak' }),
      cnae_codes: ['9999'],
      province_code: 'XX',
      autonomous_region: 'XX',
      sector: 'otro',
      effective_end_date: '2099-12-31',
    };
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [weak, strong] }),
    );
    expect(result.recommendedCandidateId).toBe('agr-strong');
    expect(result.requiresHumanSelection).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('two near-tied candidates (margin < 20) ⇒ no recommendation + ambiguous warning', () => {
    const a = makeCandidate({ id: 'agr-A' });
    const b = makeCandidate({ id: 'agr-B' });
    // Identical scoring inputs ⇒ margin = 0
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [a, b] }),
    );
    expect(result.recommendedCandidateId).toBeUndefined();
    expect(result.warnings).toContain('ambiguous_candidates_require_human_selection');
    expect(result.requiresHumanSelection).toBe(true);
  });

  it('not ready_for_payroll ⇒ blocker + payroll_ready false + no recommendation', () => {
    const cand = makeCandidate({
      id: 'agr-NR',
      agreement: makeAgreement({ id: 'agr-NR', ready_for_payroll: false }),
    });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [cand] }),
    );
    expect(result.candidates[0].payroll_ready).toBe(false);
    expect(result.candidates[0].blockers).toContain('not_payroll_ready');
    expect(result.recommendedCandidateId).toBeUndefined();
  });

  it('source_quality !== official ⇒ blocker source_not_official', () => {
    const cand = makeCandidate({
      id: 'agr-SO',
      source: makeSource({ id: 'src-SO', agreement_id: 'agr-SO', source_quality: 'secondary' }),
    });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [cand] }),
    );
    expect(result.candidates[0].blockers).toContain('source_not_official');
    expect(result.candidates[0].payroll_ready).toBe(false);
  });

  it('version.is_current = false ⇒ blocker version_not_current', () => {
    const cand = makeCandidate({
      id: 'agr-VC',
      version: makeVersion({ id: 'ver-VC', agreement_id: 'agr-VC', is_current: false }),
    });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [cand] }),
    );
    expect(result.candidates[0].blockers).toContain('version_not_current');
  });

  it('expired effective_end_date ⇒ blocker expired', () => {
    const cand = makeCandidate({
      id: 'agr-EX',
      effective_end_date: '2020-01-01',
    });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [cand] }),
    );
    expect(result.candidates[0].blockers).toContain('expired');
  });

  it('data_completeness !== human_validated ⇒ blocker not_human_validated', () => {
    const cand = makeCandidate({
      id: 'agr-HV',
      agreement: makeAgreement({ id: 'agr-HV', data_completeness: 'metadata_only' }),
    });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [cand] }),
    );
    expect(result.candidates[0].blockers).toContain('not_human_validated');
  });

  it('legacy_operative_agreement_code adds score but cannot decide alone', () => {
    // Single candidate where ONLY the legacy code matches; other hard signals miss.
    const cand = makeCandidate({
      id: 'agr-LC',
      agreement: makeAgreement({ id: 'agr-LC', internal_code: 'LEGACY-XYZ' }),
      cnae_codes: ['9999'],
      province_code: 'XX',
      autonomous_region: 'XX',
      sector: 'otro',
    });
    const company = makeCompany({ legacy_operative_agreement_code: 'LEGACY-XYZ' });
    const result = previewRegistryAgreementMapping(
      buildInput({ company, candidates: [cand] }),
    );
    const legacySignal = result.candidates[0].signals.find((s) => s.key === 'legacy_operative_code');
    expect(legacySignal?.matched).toBe(true);
    // requiresHumanSelection remains true regardless.
    expect(result.requiresHumanSelection).toBe(true);
  });

  it('name_match_only ⇒ warning name_only_match_not_decisive, weight 0', () => {
    const cand = makeCandidate({ id: 'agr-NM', name_match_only: true });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [cand] }),
    );
    expect(result.candidates[0].warnings).toContain('name_only_match_not_decisive');
    const sig = result.candidates[0].signals.find((s) => s.key === 'name_only_match');
    expect(sig?.weight).toBe(0);
    expect(result.warnings).toContain('name_only_match_present');
  });

  it('no candidates ⇒ blockers no_candidates, confidence 0', () => {
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [] }),
    );
    expect(result.candidates).toEqual([]);
    expect(result.blockers).toEqual(['no_candidates']);
    expect(result.confidence).toBe(0);
    expect(result.requiresHumanSelection).toBe(true);
  });

  it('requiresHumanSelection is always true, even with a recommendation', () => {
    const strong = makeCandidate({ id: 'agr-strong' });
    const weak = makeCandidate({
      id: 'agr-weak',
      cnae_codes: ['9999'],
      province_code: 'XX',
      autonomous_region: 'XX',
      sector: 'otro',
    });
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [weak, strong] }),
    );
    expect(result.recommendedCandidateId).toBe('agr-strong');
    expect(result.requiresHumanSelection).toBe(true);
  });

  it('determinism: same input ⇒ deep-equal output across two calls', () => {
    const input = buildInput({
      candidates: [makeCandidate({ id: 'agr-A' }), makeCandidate({ id: 'agr-B' })],
    });
    const r1 = previewRegistryAgreementMapping(input);
    const r2 = previewRegistryAgreementMapping(input);
    expect(r1).toEqual(r2);
  });

  it('deterministic ordering: by score desc, then blockers asc, then id asc', () => {
    const a = makeCandidate({ id: 'agr-A' }); // tied
    const b = makeCandidate({ id: 'agr-B' }); // tied
    const result = previewRegistryAgreementMapping(
      buildInput({ candidates: [b, a] }),
    );
    expect(result.candidates.map((c) => c.registry_agreement_id)).toEqual(['agr-A', 'agr-B']);
  });

  it('province uses work_center_province over company.province_code when present', () => {
    const company = makeCompany({ province_code: 'XX' });
    const contract: EmployeeContractSnapshot = { work_center_province: 'PM' };
    const cand = makeCandidate({ id: 'agr-WP', province_code: 'PM' });
    const result = previewRegistryAgreementMapping(
      buildInput({ company, contract, candidates: [cand] }),
    );
    const sig = result.candidates[0].signals.find((s) => s.key === 'province');
    expect(sig?.matched).toBe(true);
    expect(sig?.note).toBe('work_center_province');
  });

  it('region uses work_center_region over company.autonomous_region when present', () => {
    const company = makeCompany({ autonomous_region: 'XX' });
    const contract: EmployeeContractSnapshot = { work_center_region: 'IB' };
    const cand = makeCandidate({ id: 'agr-WR', autonomous_region: 'IB' });
    const result = previewRegistryAgreementMapping(
      buildInput({ company, contract, candidates: [cand] }),
    );
    const sig = result.candidates[0].signals.find((s) => s.key === 'autonomous_region');
    expect(sig?.matched).toBe(true);
    expect(sig?.note).toBe('work_center_region');
  });
});

// ---------- Static contract ----------

describe('registryAgreementMappingPreview — static contract', () => {
  const filePath = resolve(
    process.cwd(),
    'src/engines/erp/hr/registryAgreementMappingPreview.ts',
  );
  const source = readFileSync(filePath, 'utf-8');

  it('does not import or use forbidden runtime modules', () => {
    const forbidden = [
      'supabase',
      'fetch(',
      "from 'react'",
      'useState',
      'useEffect',
      'payrollEngine',
      'payslipEngine',
      'salaryNormalizer',
      'agreementSalaryResolver',
      'useESPayrollBridge',
      'agreementSafetyGate',
    ];
    for (const token of forbidden) {
      expect(
        source.includes(token),
        `Forbidden token present in helper: ${token}`,
      ).toBe(false);
    }
  });

  it('does not reference the operative collective agreements table', () => {
    // Allow `_registry` references; reject the bare operative table name.
    const operativeTable = /erp_hr_collective_agreements(?!_registry)/;
    expect(operativeTable.test(source)).toBe(false);
  });

  it('does not perform DB writes/reads', () => {
    const dbTokens = ['.from(', '.insert(', '.update(', '.delete('];
    for (const token of dbTokens) {
      expect(source.includes(token), `DB token present: ${token}`).toBe(false);
    }
  });

  it('does not write ready_for_payroll nor touch persisted_priority_apply / C3B3C2', () => {
    expect(source.includes('ready_for_payroll =')).toBe(false);
    expect(source.includes('persisted_priority_apply')).toBe(false);
    expect(source.includes('C3B3C2')).toBe(false);
  });
});