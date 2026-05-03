/**
 * B13.5A — Behavioral tests for the pure agreement impact engine.
 */
import { describe, it, expect } from 'vitest';
import {
  computeAgreementImpactPreview,
  computeMonthlyDelta,
  computeAnnualDelta,
  computeArrearsEstimate,
  computeEmployerCostDelta,
  rankAffectedEmployeesByRisk,
  summarizeAgreementImpact,
  DEFAULT_EMPLOYER_COST_MULTIPLIER,
  type AgreementImpactInput,
  type RegistryAgreementImpactSnapshot,
  type SalaryTableImpactSnapshot,
} from '@/engines/erp/hr/agreementImpactEngine';

function baseAgreement(
  overrides: Partial<RegistryAgreementImpactSnapshot> = {},
): RegistryAgreementImpactSnapshot {
  return {
    id: 'agr-1',
    internal_code: 'AGR-1',
    official_name: 'Test Agreement',
    ready_for_payroll: true,
    requires_human_review: false,
    data_completeness: 'human_validated',
    source_quality: 'official',
    salary_tables_loaded: true,
    ...overrides,
  };
}

function baseTable(
  overrides: Partial<SalaryTableImpactSnapshot> = {},
): SalaryTableImpactSnapshot {
  return {
    id: 'tbl-1',
    agreement_id: 'agr-1',
    version_id: 'ver-1',
    year: 2026,
    professional_group: 'G2',
    level: 'L1',
    category: 'Oficial 1ª',
    salary_base_monthly: 1800,
    salary_base_annual: 1800 * 14,
    payslip_label: 'SALARIO BASE CONVENIO',
    concept_literal_from_agreement: 'Salario base de convenio',
    ...overrides,
  };
}

function baseInput(over: Partial<AgreementImpactInput> = {}): AgreementImpactInput {
  const agreement = over.agreement ?? baseAgreement();
  const version = over.version ?? {
    id: 'ver-1',
    agreement_id: agreement.id,
    year: 2026,
    is_current: true,
  };
  return {
    agreement,
    version,
    runtimeSettings: over.runtimeSettings ?? [
      {
        id: 'rs-1',
        mapping_id: 'map-1',
        company_id: 'co-1',
        is_current: true,
        use_registry_for_payroll: true,
      },
    ],
    mappings: over.mappings ?? [
      {
        id: 'map-1',
        company_id: 'co-1',
        registry_agreement_id: agreement.id,
        registry_version_id: version.id,
        mapping_status: 'approved_internal',
        is_current: true,
      },
    ],
    companies: over.companies ?? [{ id: 'co-1', name: 'ACME' }],
    employees: over.employees ?? [
      {
        id: 'emp-1',
        company_id: 'co-1',
        status: 'active',
        professional_group: 'G2',
        level: 'L1',
        category: 'Oficial 1ª',
      },
    ],
    contracts: over.contracts ?? [
      {
        id: 'ctr-1',
        employee_id: 'emp-1',
        company_id: 'co-1',
        is_active: true,
        start_date: '2024-01-01',
        base_salary_monthly: 1500,
        base_salary_annual: 1500 * 14,
      },
    ],
    salaryTables: over.salaryTables ?? [baseTable()],
    rules: over.rules ?? [
      {
        id: 'rule-pay',
        agreement_id: agreement.id,
        version_id: version.id,
        rule_type: 'extra_pay',
        value_json: { payment_count: 14 },
      },
    ],
    options: over.options ?? {
      target_year: 2026,
      as_of_date: '2026-05-01',
      require_runtime_setting: true,
      risk_thresholds: { large_delta_monthly: 200, arrears_max_months: 24 },
    },
  };
}

describe('B13.5A — eligibility gates', () => {
  it('blocks if registry not ready_for_payroll', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ agreement: baseAgreement({ ready_for_payroll: false }) }),
    );
    expect(r.eligible).toBe(false);
    expect(r.blockers).toContain('registry_not_ready_for_payroll');
  });

  it('blocks if requires_human_review=true', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ agreement: baseAgreement({ requires_human_review: true }) }),
    );
    expect(r.blockers).toContain('registry_requires_human_review');
  });

  it('blocks if data_completeness != human_validated', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ agreement: baseAgreement({ data_completeness: 'partial' }) }),
    );
    expect(r.blockers).toContain('registry_not_human_validated');
  });

  it('blocks if source_quality != official', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ agreement: baseAgreement({ source_quality: 'unofficial' }) }),
    );
    expect(r.blockers).toContain('registry_source_not_official');
  });

  it('blocks if salary_tables_loaded=false', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ agreement: baseAgreement({ salary_tables_loaded: false }) }),
    );
    expect(r.blockers).toContain('registry_salary_tables_not_loaded');
  });

  it('blocks if no salary table for target_year', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ salaryTables: [baseTable({ year: 2025 })] }),
    );
    expect(r.blockers).toContain('no_salary_tables_for_target_year');
  });

  it('blocks if require_runtime_setting=true and none exists', () => {
    const r = computeAgreementImpactPreview(
      baseInput({ runtimeSettings: [] }),
    );
    expect(r.blockers).toContain('no_current_runtime_setting');
  });
});

describe('B13.5A — per-employee preview', () => {
  it('produces affected preview for active employee with compatible table', () => {
    const r = computeAgreementImpactPreview(baseInput());
    expect(r.eligible).toBe(true);
    expect(r.employee_previews).toHaveLength(1);
    const p = r.employee_previews[0];
    expect(p.affected).toBe(true);
    expect(p.blocked).toBe(false);
    expect(p.delta_monthly).toBe(300);
    expect(p.delta_annual).toBe(300 * 14);
    expect(p.matched_salary_table_id).toBe('tbl-1');
  });

  it('blocks when mapping not approved_internal', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        mappings: [
          {
            id: 'map-1',
            company_id: 'co-1',
            registry_agreement_id: 'agr-1',
            registry_version_id: 'ver-1',
            mapping_status: 'pending_review',
            is_current: true,
          },
        ],
      }),
    );
    const p = r.employee_previews[0];
    expect(p.blocked).toBe(true);
    expect(p.blockers).toContain('mapping_not_approved');
  });

  it('matches salary table by group+level+category first', () => {
    const tables = [
      baseTable({ id: 'tA', professional_group: 'G2', level: 'L1', category: 'Oficial 1ª', salary_base_monthly: 1800, salary_base_annual: 25200 }),
      baseTable({ id: 'tB', professional_group: 'G2', level: 'L1', category: 'Otro', salary_base_monthly: 9999, salary_base_annual: 99999 }),
    ];
    const r = computeAgreementImpactPreview(baseInput({ salaryTables: tables }));
    expect(r.employee_previews[0].matched_salary_table_id).toBe('tA');
  });

  it('falls back to professional_group only with warning', () => {
    const tables = [
      baseTable({
        id: 'tFallback',
        professional_group: 'G2',
        level: 'OTHER',
        category: 'OTHER',
        salary_base_monthly: 1700,
        salary_base_annual: 1700 * 14,
      }),
    ];
    const r = computeAgreementImpactPreview(baseInput({ salaryTables: tables }));
    const p = r.employee_previews[0];
    expect(p.matched_salary_table_id).toBe('tFallback');
    expect(p.warnings).toContain('salary_table_match_fallback');
  });

  it('emits ambiguous warning when multiple matches', () => {
    const tables = [
      baseTable({ id: 'tA' }),
      baseTable({ id: 'tB', salary_base_monthly: 1900, salary_base_annual: 1900 * 14 }),
    ];
    const r = computeAgreementImpactPreview(baseInput({ salaryTables: tables }));
    const p = r.employee_previews[0];
    expect(p.warnings).toContain('ambiguous_salary_table_match');
    expect(p.risk_flags).toContain('ambiguous_salary_table_match');
  });

  it('blocks employee when no salary table matches the employee group', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        salaryTables: [
          baseTable({ professional_group: 'G99', level: 'X', category: 'Y' }),
        ],
      }),
    );
    const p = r.employee_previews[0];
    expect(p.blockers).toContain('missing_salary_table');
    expect(p.blocked).toBe(true);
  });

  it('inactive employee blocked when include_inactive_employees=false', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        employees: [
          {
            id: 'emp-1',
            company_id: 'co-1',
            status: 'inactive',
            professional_group: 'G2',
            level: 'L1',
            category: 'Oficial 1ª',
          },
        ],
      }),
    );
    expect(r.employee_previews[0].blockers).toContain('inactive_employee');
  });

  it('inactive contract blocked', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        contracts: [
          {
            id: 'ctr-1',
            employee_id: 'emp-1',
            company_id: 'co-1',
            is_active: false,
            start_date: '2024-01-01',
            base_salary_monthly: 1500,
            base_salary_annual: 1500 * 14,
          },
        ],
      }),
    );
    expect(r.employee_previews[0].blockers).toContain('inactive_contract');
  });

  it('rejects non-current runtime setting', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        runtimeSettings: [
          {
            id: 'rs-1',
            mapping_id: 'map-1',
            company_id: 'co-1',
            is_current: false,
            use_registry_for_payroll: true,
          },
        ],
      }),
    );
    expect(r.blockers).toContain('no_current_runtime_setting');
  });
});

describe('B13.5A — deltas and arrears', () => {
  it('delta monthly correct', () => {
    expect(computeMonthlyDelta(1500, 1800)).toBe(300);
  });
  it('delta annual correct', () => {
    expect(computeAnnualDelta(20000, 25200)).toBe(5200);
  });
  it('uses 14 payments rule when present', () => {
    const r = computeAgreementImpactPreview(baseInput());
    const p = r.employee_previews[0];
    expect(p.target_salary_annual).toBe(1800 * 14);
  });
  it('warns payment_count_unknown when no rule and only annual provided', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        rules: [],
        contracts: [
          {
            id: 'ctr-1',
            employee_id: 'emp-1',
            company_id: 'co-1',
            is_active: true,
            start_date: '2024-01-01',
            base_salary_annual: 18000,
          },
        ],
        salaryTables: [baseTable({ salary_base_monthly: undefined, salary_base_annual: 21000 })],
      }),
    );
    const p = r.employee_previews[0];
    expect(p.warnings).toContain('payment_count_unknown');
  });
  it('arrears estimate computed', () => {
    const result = computeArrearsEstimate(300, '2026-01-01', '2026-04-01', { max_months: 24 });
    expect(result.amount).toBeCloseTo(300 * 4);
    expect(result.months).toBe(4);
  });
  it('arrears zero when delta negative', () => {
    const result = computeArrearsEstimate(-100, '2026-01-01', '2026-04-01', { max_months: 24 });
    expect(result.amount).toBe(0);
    expect(result.warnings).toContain('arrears_negative_delta');
  });
  it('arrears period too long flagged', () => {
    const result = computeArrearsEstimate(100, '2020-01-01', '2026-01-01', { max_months: 24 });
    expect(result.warnings).toContain('arrears_period_too_long');
    expect(result.months).toBe(24);
  });
});

describe('B13.5A — employer cost', () => {
  it('uses configured multiplier without warning', () => {
    const r = computeAgreementImpactPreview({
      ...baseInput(),
      options: {
        ...baseInput().options,
        employer_cost_multiplier: 1.4,
      },
    });
    const p = r.employee_previews[0];
    expect(p.warnings).not.toContain('employer_cost_multiplier_defaulted');
    expect(p.employer_cost_delta).toBeCloseTo(300 * 14 * 1.4, 1);
  });
  it('defaults multiplier with warning', () => {
    const r = computeAgreementImpactPreview(baseInput());
    const p = r.employee_previews[0];
    expect(p.warnings).toContain('employer_cost_multiplier_defaulted');
    expect(p.employer_cost_delta).toBeCloseTo(
      300 * 14 * DEFAULT_EMPLOYER_COST_MULTIPLIER,
      1,
    );
  });
  it('computeEmployerCostDelta clamps negative to zero', () => {
    const e = computeEmployerCostDelta({ delta_annual: -100 }, { multiplier: 1.3 });
    expect(e.amount).toBe(0);
  });
});

describe('B13.5A — risk flags', () => {
  it('salary_below_agreement when current<target', () => {
    const r = computeAgreementImpactPreview(baseInput());
    expect(r.employee_previews[0].risk_flags).toContain('salary_below_agreement');
  });
  it('salary_above_agreement when current>target', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        contracts: [
          {
            id: 'ctr-1',
            employee_id: 'emp-1',
            company_id: 'co-1',
            is_active: true,
            start_date: '2024-01-01',
            base_salary_monthly: 2500,
            base_salary_annual: 2500 * 14,
          },
        ],
      }),
    );
    const p = r.employee_previews[0];
    expect(p.risk_flags).toContain('salary_above_agreement');
    expect(p.risk_flags).toContain('negative_delta');
  });
  it('large_delta when above threshold', () => {
    const r = computeAgreementImpactPreview({
      ...baseInput(),
      options: { ...baseInput().options, risk_thresholds: { large_delta_monthly: 100, arrears_max_months: 24 } },
    });
    expect(r.employee_previews[0].risk_flags).toContain('large_delta');
  });
});

describe('B13.5A — concept preservation', () => {
  it('detects transporte concept in concepts_detected', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        salaryTables: [
          baseTable({
            plus_transport: 100,
            payslip_label: 'PLUS TRANSPORTE',
            concept_literal_from_agreement: 'Plus transporte mensual',
          }),
        ],
      }),
    );
    expect(r.employee_previews[0].concepts_detected).toContain('transporte');
  });
  it('blocks when payslip_label missing for protected concept', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        salaryTables: [
          baseTable({
            plus_transport: 100,
            payslip_label: '',
            concept_literal_from_agreement: 'Plus transporte',
          }),
        ],
      }),
    );
    const p = r.employee_previews[0];
    expect(p.blockers).toContain('missing_payslip_literal_preservation');
    expect(p.blocked).toBe(true);
  });
});

describe('B13.5A — summary, ranking, determinism', () => {
  it('summary totals correct across multiple employees', () => {
    const r = computeAgreementImpactPreview(
      baseInput({
        employees: [
          { id: 'e1', company_id: 'co-1', status: 'active', professional_group: 'G2', level: 'L1', category: 'Oficial 1ª' },
          { id: 'e2', company_id: 'co-1', status: 'active', professional_group: 'G2', level: 'L1', category: 'Oficial 1ª' },
        ],
        contracts: [
          { id: 'c1', employee_id: 'e1', company_id: 'co-1', is_active: true, start_date: '2024-01-01', base_salary_monthly: 1500, base_salary_annual: 1500 * 14 },
          { id: 'c2', employee_id: 'e2', company_id: 'co-1', is_active: true, start_date: '2024-01-01', base_salary_monthly: 1600, base_salary_annual: 1600 * 14 },
        ],
      }),
    );
    expect(r.summary.employees_scanned).toBe(2);
    expect(r.summary.total_monthly_delta).toBe(300 + 200);
  });

  it('ranking sorts by risk_score desc', () => {
    const ps = [
      { risk_score: 10, delta_monthly: 100 } as any,
      { risk_score: 80, delta_monthly: 50 } as any,
      { risk_score: 50, delta_monthly: 200 } as any,
    ];
    const ranked = rankAffectedEmployeesByRisk(ps);
    expect(ranked.map((p) => p.risk_score)).toEqual([80, 50, 10]);
  });

  it('output deterministic across runs', () => {
    const a = computeAgreementImpactPreview(baseInput());
    const b = computeAgreementImpactPreview(baseInput());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('does not throw on incomplete input; returns blockers', () => {
    expect(() =>
      computeAgreementImpactPreview(
        baseInput({
          agreement: baseAgreement({ ready_for_payroll: false, salary_tables_loaded: false }),
          salaryTables: [],
          runtimeSettings: [],
        }),
      ),
    ).not.toThrow();
  });

  it('summarizeAgreementImpact handles empty', () => {
    const s = summarizeAgreementImpact([]);
    expect(s.employees_scanned).toBe(0);
  });
});
