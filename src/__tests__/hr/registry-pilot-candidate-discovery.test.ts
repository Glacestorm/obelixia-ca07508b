import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildPilotCandidateDiscoveryReport,
  RECOMMENDATION_DOMINANCE_MARGIN,
} from '@/engines/erp/hr/registryPilotCandidateDiscovery';
import type { RegistryPilotCandidate } from '@/engines/erp/hr/registryPilotCandidatePreflight';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
} from '@/engines/erp/hr/registryPilotGate';
import { HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL } from '@/engines/erp/hr/registryShadowFlag';

const DISCOVERY_SOURCE = readFileSync(
  resolve(__dirname, '../../engines/erp/hr/registryPilotCandidateDiscovery.ts'),
  'utf8',
);
const HOOK_SOURCE = readFileSync(
  resolve(__dirname, '../../hooks/erp/hr/useRegistryPilotCandidateDiscovery.ts'),
  'utf8',
);
const UI_SOURCE = readFileSync(
  resolve(
    __dirname,
    '../../components/erp/hr/collective-agreements/pilot-monitor/RegistryPilotCandidateDiscoveryPanel.tsx',
  ),
  'utf8',
);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
const DISCOVERY_CODE = stripComments(DISCOVERY_SOURCE);
const HOOK_CODE = stripComments(HOOK_SOURCE);
const UI_CODE = stripComments(UI_SOURCE);

function cand(
  status: RegistryPilotCandidate['status'],
  score: number,
  id: string,
  blockers: string[] = [],
  warnings: string[] = [],
): RegistryPilotCandidate {
  return {
    company_id: `co-${id}`,
    employee_id: `emp-${id}`,
    contract_id: `ct-${id}`,
    target_year: 2026,
    mapping_id: `map-${id}`,
    runtime_setting_id: `rs-${id}`,
    registry_agreement_id: `ag-${id}`,
    registry_version_id: `ver-${id}`,
    readiness_score: score,
    status,
    blockers,
    warnings,
    evidence: {},
  };
}

describe('B10F.5C — pilot candidate discovery (functional)', () => {
  it('groups by ready / needs_review / blocked', () => {
    const r = buildPilotCandidateDiscoveryReport([
      cand('ready', 100, 'a'),
      cand('blocked', 40, 'b', ['mapping_missing']),
      cand('needs_review', 90, 'c', [], ['comparison_report_missing']),
    ]);
    expect(r.summary).toEqual({ total: 3, ready: 1, needsReview: 1, blocked: 1 });
    expect(r.ready[0].company_id).toBe('co-a');
    expect(r.needsReview[0].company_id).toBe('co-c');
    expect(r.blocked[0].company_id).toBe('co-b');
  });

  it('recommends when there is exactly 1 ready', () => {
    const r = buildPilotCandidateDiscoveryReport([
      cand('ready', 100, 'only'),
      cand('blocked', 50, 'b'),
    ]);
    expect(r.recommendedCandidate?.company_id).toBe('co-only');
    expect(r.recommendationReason).toBe('single_ready');
  });

  it('does not recommend on tie of ready candidates', () => {
    const r = buildPilotCandidateDiscoveryReport([
      cand('ready', 100, 'a'),
      cand('ready', 100, 'b'),
    ]);
    expect(r.recommendedCandidate).toBeUndefined();
    expect(r.recommendationReason).toBe('tie_no_recommendation');
  });

  it('recommends when top exceeds second by >= margin', () => {
    const r = buildPilotCandidateDiscoveryReport([
      cand('ready', 100, 'a'),
      cand('ready', 100 - RECOMMENDATION_DOMINANCE_MARGIN, 'b'),
    ]);
    expect(r.recommendedCandidate?.company_id).toBe('co-a');
    expect(r.recommendationReason).toBe('top_score_dominates');
  });

  it('does not recommend when top exceeds second by less than margin', () => {
    const r = buildPilotCandidateDiscoveryReport([
      cand('ready', 100, 'a'),
      cand('ready', 100 - RECOMMENDATION_DOMINANCE_MARGIN + 1, 'b'),
    ]);
    expect(r.recommendedCandidate).toBeUndefined();
    expect(r.recommendationReason).toBe('tie_no_recommendation');
  });

  it('deterministic order across runs (sorted by score desc, then stable key)', () => {
    const input = [
      cand('ready', 80, 'z'),
      cand('ready', 100, 'a'),
      cand('ready', 80, 'm'),
    ];
    const r1 = buildPilotCandidateDiscoveryReport(input);
    const r2 = buildPilotCandidateDiscoveryReport(input);
    expect(r1.ready.map((c) => c.company_id)).toEqual(r2.ready.map((c) => c.company_id));
    expect(r1.ready.map((c) => c.company_id)).toEqual(['co-a', 'co-m', 'co-z']);
  });

  it('handles empty input', () => {
    const r = buildPilotCandidateDiscoveryReport([]);
    expect(r.summary).toEqual({ total: 0, ready: 0, needsReview: 0, blocked: 0 });
    expect(r.recommendedCandidate).toBeUndefined();
    expect(r.recommendationReason).toBe('no_ready');
  });

  it('does not mutate input array', () => {
    const input = [cand('ready', 80, 'b'), cand('ready', 100, 'a')];
    const snapshot = input.map((c) => c.company_id);
    buildPilotCandidateDiscoveryReport(input);
    expect(input.map((c) => c.company_id)).toEqual(snapshot);
  });
});

describe('B10F.5C — discovery static guards', () => {
  it('discovery: no DB writes / rpc / supabase / fetch / Deno / env / service_role', () => {
    expect(DISCOVERY_CODE).not.toMatch(/\.insert\s*\(/);
    expect(DISCOVERY_CODE).not.toMatch(/\.update\s*\(/);
    expect(DISCOVERY_CODE).not.toMatch(/\.delete\s*\(/);
    expect(DISCOVERY_CODE).not.toMatch(/\.upsert\s*\(/);
    expect(DISCOVERY_CODE).not.toMatch(/\.rpc\s*\(/);
    expect(DISCOVERY_CODE).not.toMatch(/\bfrom\s*\(\s*['"]/);
    expect(DISCOVERY_CODE).not.toContain('@supabase');
    expect(DISCOVERY_CODE).not.toContain('integrations/supabase');
    expect(DISCOVERY_CODE).not.toMatch(/\bfetch\s*\(/);
    expect(DISCOVERY_CODE).not.toContain('Deno.');
    expect(DISCOVERY_CODE).not.toContain('process.env');
    expect(DISCOVERY_CODE).not.toContain('localStorage');
    expect(DISCOVERY_CODE).not.toContain('sessionStorage');
    expect(DISCOVERY_CODE).not.toContain('service_role');
    expect(DISCOVERY_CODE).not.toContain('SERVICE_ROLE');
  });

  it('discovery: no forbidden imports', () => {
    const forbidden = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'registryPilotGate',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
      'registryRuntimeBridgeDecision',
      'registryPilotBridgeDecision',
    ];
    for (const id of forbidden) {
      expect(DISCOVERY_CODE).not.toContain(id);
    }
  });

  it('discovery: does not reference operative table erp_hr_collective_agreements (without _registry suffix)', () => {
    expect(DISCOVERY_CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('hook: no writes / rpc / functions.invoke / service_role', () => {
    expect(HOOK_CODE).not.toMatch(/\.insert\s*\(/);
    expect(HOOK_CODE).not.toMatch(/\.update\s*\(/);
    expect(HOOK_CODE).not.toMatch(/\.delete\s*\(/);
    expect(HOOK_CODE).not.toMatch(/\.upsert\s*\(/);
    expect(HOOK_CODE).not.toMatch(/\.rpc\s*\(/);
    expect(HOOK_CODE).not.toContain('functions.invoke');
    expect(HOOK_CODE).not.toContain('service_role');
    expect(HOOK_CODE).not.toContain('SERVICE_ROLE');
    expect(HOOK_CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
  });

  it('hook: no forbidden imports', () => {
    const forbidden = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'registryPilotGate',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
      'registryRuntimeBridgeDecision',
      'registryPilotBridgeDecision',
    ];
    for (const id of forbidden) {
      expect(HOOK_CODE).not.toContain(id);
    }
  });

  it('UI: no forbidden CTAs (activate, allow-list, apply, run payroll, change flag)', () => {
    const forbiddenCtas = [
      /activar piloto/i,
      /a[ñn]adir a allow-list/i,
      /aplicar registry/i,
      /ejecutar n[oó]mina/i,
      /cambiar flag/i,
      /activar ahora/i,
    ];
    for (const re of forbiddenCtas) {
      expect(UI_CODE).not.toMatch(re);
    }
  });

  it('UI: no DB writes, no service_role, no payroll/bridge imports', () => {
    expect(UI_CODE).not.toMatch(/\.insert\s*\(/);
    expect(UI_CODE).not.toMatch(/\.update\s*\(/);
    expect(UI_CODE).not.toMatch(/\.delete\s*\(/);
    expect(UI_CODE).not.toMatch(/\.upsert\s*\(/);
    expect(UI_CODE).not.toMatch(/\.rpc\s*\(/);
    expect(UI_CODE).not.toContain('service_role');
    expect(UI_CODE).not.toContain('functions.invoke');
    expect(UI_CODE).not.toMatch(/erp_hr_collective_agreements(?!_registry)/);
    const forbidden = [
      'useESPayrollBridge',
      'registryShadowFlag',
      'registryPilotGate',
      'agreementSalaryResolver',
      'salaryNormalizer',
      'payrollEngine',
      'payslipEngine',
      'agreementSafetyGate',
      'registryRuntimeBridgeDecision',
      'registryPilotBridgeDecision',
    ];
    for (const id of forbidden) {
      expect(UI_CODE).not.toContain(id);
    }
  });

  it('UI: contains read-only banner', () => {
    expect(UI_CODE).toMatch(/Discovery read-only/i);
  });

  it('flags remain off and allow-list remains empty', () => {
    expect(HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL).toBe(false);
    expect(HR_REGISTRY_PILOT_MODE).toBe(false);
    expect(REGISTRY_PILOT_SCOPE_ALLOWLIST.length).toBe(0);
  });
});