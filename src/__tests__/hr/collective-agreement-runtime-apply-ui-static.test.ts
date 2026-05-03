/**
 * B10D.4 — Static contract checks for the runtime-apply UI.
 *
 * Verifies the source files in
 *   src/components/erp/hr/collective-agreements/runtime-apply/
 * and the actions hook
 *   src/hooks/erp/hr/useCompanyAgreementRuntimeApplyActions.ts
 * for forbidden imports, forbidden CTAs, no direct DB writes, no
 * service_role, no payroll touch points, and required banner text.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UI_DIR = path.join(
  ROOT,
  'src/components/erp/hr/collective-agreements/runtime-apply',
);
const HOOK_FILE = path.join(
  ROOT,
  'src/hooks/erp/hr/useCompanyAgreementRuntimeApplyActions.ts',
);
const PANEL_FILE = path.join(UI_DIR, 'RuntimeApplyRequestPanel.tsx');
const SECOND_APPROVAL_FILE = path.join(
  UI_DIR,
  'RuntimeApplySecondApprovalDialog.tsx',
);
const ROLLBACK_FILE = path.join(UI_DIR, 'RuntimeRollbackDialog.tsx');
const INVARIANTS_FILE = path.join(UI_DIR, 'RuntimeApplyInvariantsCard.tsx');

function listFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => path.join(dir, f));
}

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const FORBIDDEN_CTA_STRINGS = [
  'Aplicar en nómina ya',
  'Activar payroll global',
  'Activar flag global',
  'Cambiar nómina ahora',
  'Usar registry en nómina ahora',
  'Ejecutar nómina con registry',
  'Activar nómina registry',
];

const FORBIDDEN_IDENTIFIERS = [
  'useESPayrollBridge',
  'registryShadowFlag',
  'agreementSalaryResolver',
  'salaryNormalizer',
  'payrollEngine',
  'payslipEngine',
  'agreementSafetyGate',
];

const FORBIDDEN_PAYLOAD_KEYS = [
  'second_approved_by',
  'second_approved_at',
  'is_current',
  'activation_run_id',
  'rollback_run_id',
  'request_status',
  'use_registry_for_payroll',
  'ready_for_payroll',
  'requires_human_review',
  'data_completeness',
  'salary_tables_loaded',
  'source_quality',
  'HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL',
  'persisted_priority_apply',
  'C3B3C2',
  'signature_hash',
  'run_signature_hash',
  'executed_by',
  'executed_at',
  'activated_by',
  'activated_at',
];

describe('B10D.4 — Runtime apply UI static contract', () => {
  const uiFiles = listFiles(UI_DIR);
  const allFiles = [...uiFiles, HOOK_FILE];

  it('UI directory has expected components', () => {
    const names = uiFiles.map((f) => path.basename(f));
    expect(names).toContain('RuntimeApplyRequestPanel.tsx');
    expect(names).toContain('RuntimeApplyStatusBadge.tsx');
    expect(names).toContain('RuntimeApplyInvariantsCard.tsx');
    expect(names).toContain('RuntimeApplyComparisonReportCard.tsx');
    expect(names).toContain('RuntimeApplyImpactPreviewCard.tsx');
    expect(names).toContain('RuntimeApplySecondApprovalDialog.tsx');
    expect(names).toContain('RuntimeApplyHistoryList.tsx');
    expect(names).toContain('RuntimeRollbackDialog.tsx');
  });

  it('Panel includes the mandatory permanent banner text', () => {
    const src = read(PANEL_FILE);
    expect(src).toMatch(
      /Activación interna del registry por scope — el bridge sigue desactivado globalmente\./,
    );
    expect(src).toMatch(/B10E/);
  });

  it.each(FORBIDDEN_CTA_STRINGS)(
    'UI files do not contain forbidden CTA "%s"',
    (cta) => {
      for (const f of uiFiles) {
        const src = stripComments(read(f));
        // Allow the FORBIDDEN_CTA_STRINGS array literal in the panel itself.
        const filtered = src.replace(
          /FORBIDDEN_CTA_STRINGS[\s\S]*?\](\s*as\s*const)?\s*;/,
          '',
        );
        expect(
          filtered.includes(cta),
          `${path.basename(f)} contains forbidden CTA "${cta}"`,
        ).toBe(false);
      }
    },
  );

  it('UI/hook files do not import or reference payroll runtime identifiers', () => {
    for (const f of allFiles) {
      const src = stripComments(read(f));
      for (const id of FORBIDDEN_IDENTIFIERS) {
        expect(
          src.includes(id),
          `${path.basename(f)} references forbidden identifier "${id}"`,
        ).toBe(false);
      }
    }
  });

  it('UI/hook files do not reference HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL or ready_for_payroll as text', () => {
    for (const f of allFiles) {
      let src = stripComments(read(f));
      // The hook lists FORBIDDEN_PAYLOAD_KEYS — that's allowed as a guard, not as UI text.
      src = src.replace(/FORBIDDEN_PAYLOAD_KEYS[\s\S]*?\]\s*as\s*const;/, '');
      // The invariants card mirrors the server-side gate name
      // `registry_ready_for_payroll` — allowed as an internal gate id,
      // not as user-facing payroll-touching CTA.
      src = src.replace(/registry_ready_for_payroll/g, '');
      expect(src.includes('HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL')).toBe(false);
      expect(src.includes('ready_for_payroll')).toBe(false);
    }
  });

  it('UI/hook files have no direct .from(...).insert/.update/.upsert/.delete calls', () => {
    const banned = [
      /\.from\([^)]+\)\s*\.insert\(/,
      /\.from\([^)]+\)\s*\.update\(/,
      /\.from\([^)]+\)\s*\.upsert\(/,
      /\.from\([^)]+\)\s*\.delete\(/,
    ];
    for (const f of allFiles) {
      const src = stripComments(read(f));
      for (const re of banned) {
        expect(re.test(src), `${path.basename(f)} matches ${re}`).toBe(false);
      }
    }
  });

  it('UI/hook do not reference operative table erp_hr_collective_agreements without _registry', () => {
    const operative =
      /erp_hr_collective_agreements(?!_registry|_registry_versions|_registry_sources|_registry_validations|_company_agreement_registry_mappings|_company_agreement_registry_apply_requests|_company_agreement_registry_apply_runs|_company_agreement_registry_runtime_settings)/;
    for (const f of allFiles) {
      const src = stripComments(read(f));
      expect(
        operative.test(src),
        `${path.basename(f)} references operative agreement table`,
      ).toBe(false);
    }
  });

  it('UI/hook do not use service_role', () => {
    for (const f of allFiles) {
      const src = stripComments(read(f));
      expect(src.includes('service_role')).toBe(false);
      expect(src.includes('SERVICE_ROLE_KEY')).toBe(false);
    }
  });

  it('Hook routes all writes through the runtime-apply edge function', () => {
    const src = read(HOOK_FILE);
    expect(src).toMatch(/erp-hr-company-agreement-runtime-apply/);
    // Auth-safe invocation: token, getSession and Authorization header are
    // now centralized in the shared `authSafeInvoke` helper.
    expect(src).toMatch(/authSafeInvoke/);
    for (const action of [
      'create_request',
      'submit_for_second_approval',
      'second_approve',
      'reject',
      'activate',
      'rollback',
      'list',
    ]) {
      expect(src).toMatch(new RegExp(`'${action}'`));
    }
  });

  it('Hook declares forbidden payload keys and sanitizes them', () => {
    const src = read(HOOK_FILE);
    for (const k of FORBIDDEN_PAYLOAD_KEYS) {
      expect(src.includes(`'${k}'`)).toBe(true);
    }
    expect(src).toMatch(/function sanitize/);
  });

  it('Second-approval dialog requires the 4 acknowledgements', () => {
    const src = read(SECOND_APPROVAL_FILE);
    for (const ack of [
      'understands_runtime_enable',
      'reviewed_comparison_report',
      'reviewed_payroll_impact',
      'confirms_rollback_available',
    ]) {
      expect(src.includes(ack)).toBe(true);
    }
    expect(src).toMatch(/no puede realizarla el mismo usuario\s+solicitante/i);
  });

  it('Rollback / reject dialog enforces reason >= 10', () => {
    const src = read(ROLLBACK_FILE);
    expect(src).toMatch(/reason\.trim\(\)\.length\s*>=\s*10/);
  });

  it('Invariants card declares the 14 gate keys', () => {
    const src = read(INVARIANTS_FILE);
    for (const k of [
      'mapping_exists',
      'mapping_status_approved_internal',
      'mapping_is_current',
      'mapping_approved_by_present',
      'mapping_approved_at_present',
      'registry_ready_for_payroll',
      'registry_no_human_review_pending',
      'registry_data_completeness_human_validated',
      'registry_source_quality_official',
      'registry_version_is_current',
      'comparison_no_critical_diffs',
      'second_approver_distinct_from_requester',
      'second_approver_role_allowed',
      'four_acknowledgements_present',
    ]) {
      expect(src.includes(k)).toBe(true);
    }
  });

  it('Bridge and shadow flag files are intact (not modified by this Build)', () => {
    const bridge = read(path.join(ROOT, 'src/hooks/erp/hr/useESPayrollBridge.ts'));
    expect(bridge.length).toBeGreaterThan(0);
    const flag = read(path.join(ROOT, 'src/engines/erp/hr/registryShadowFlag.ts'));
    expect(flag).toMatch(/HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=\s*false/);
  });
});