/**
 * B13.7 — Global static hardening audit for the Curated Agreements module.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const FILE_TARGETS = [
  'src/hooks/erp/hr/useAgreementSourceWatch.ts',
  'src/hooks/erp/hr/useAgreementDocumentIntake.ts',
  'src/hooks/erp/hr/useAgreementExtractionRunner.ts',
  'src/hooks/erp/hr/useAgreementImpactPreviews.ts',
  'src/engines/erp/hr/agreementConceptLiteralExtractor.ts',
  'src/engines/erp/hr/agreementFindingToStagingMapper.ts',
  'src/engines/erp/hr/agreementImpactEngine.ts',
];

const DIR_TARGETS = ['src/components/erp/hr/collective-agreements/curated'];

const EDGE_TARGETS = [
  'supabase/functions/erp-hr-agreement-source-watcher/index.ts',
  'supabase/functions/erp-hr-agreement-document-intake/index.ts',
  'supabase/functions/erp-hr-agreement-extraction-runner/index.ts',
  'supabase/functions/erp-hr-agreement-impact-engine/index.ts',
];

function walk(dir: string): string[] {
  const abs = path.resolve(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.relative(ROOT, full)));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let FRONTEND_SRC = '';
let EDGE_SRC = '';
let UI_SRC = '';

beforeAll(() => {
  const frontFiles = [
    ...FILE_TARGETS.map((p) => path.resolve(ROOT, p)),
    ...DIR_TARGETS.flatMap((d) => walk(d)),
  ].filter((p) => fs.existsSync(p));
  FRONTEND_SRC = frontFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n/* file */\n');
  EDGE_SRC = EDGE_TARGETS
    .map((p) => fs.readFileSync(path.resolve(ROOT, p), 'utf8'))
    .join('\n/* file */\n');
  UI_SRC = DIR_TARGETS.flatMap((d) => walk(d))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n/* file */\n');
});

describe('B13.7 — frontend hardening', () => {
  const banned: Array<[string, RegExp]> = [
    ['useESPayrollBridge import', /(import|from)[^\n]*useESPayrollBridge/],
    ['payrollEngine import', /(import|from)[^\n]*payrollEngine/],
    ['payslipEngine import', /(import|from)[^\n]*payslipEngine/],
    ['salaryNormalizer import', /(import|from)[^\n]*salaryNormalizer/],
    ['agreementSalaryResolver import', /(import|from)[^\n]*agreementSalaryResolver/],
    ['agreementSafetyGate import', /(import|from)[^\n]*agreementSafetyGate/],
    ['legacy operative table', /erp_hr_collective_agreements(?!_)/],
    ['from().insert', /\.from\(['"][^'"]+['"]\)\s*\.insert\(/],
    ['from().update', /\.from\(['"][^'"]+['"]\)\s*\.update\(/],
    ['from().delete', /\.from\(['"][^'"]+['"]\)\s*\.delete\(/],
    ['from().upsert', /\.from\(['"][^'"]+['"]\)\s*\.upsert\(/],
    ['service_role', /service_role/],
    ['SUPABASE_SERVICE_ROLE_KEY', /SUPABASE_SERVICE_ROLE_KEY/],
    ['flag mutation HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL', /HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL\s*=[^=]/],
    ['flag mutation HR_REGISTRY_PILOT_MODE', /HR_REGISTRY_PILOT_MODE\s*=[^=]/],
    ['flag mutation REGISTRY_PILOT_SCOPE_ALLOWLIST', /REGISTRY_PILOT_SCOPE_ALLOWLIST\s*=[^=]/],
    ['ready_for_payroll = true', /ready_for_payroll\s*[:=]\s*true/],
    ['salary_tables_loaded = true', /salary_tables_loaded\s*[:=]\s*true/],
    ['data_completeness human_validated', /data_completeness\s*[:=]\s*['"]human_validated['"]/],
  ];
  for (const [label, re] of banned) {
    it('forbidden: ' + label, () => {
      expect(FRONTEND_SRC).not.toMatch(re);
    });
  }

  const dangerousCtas: Array<[string, RegExp]> = [
    ['Aplicar nomina', /Aplicar n[oó]mina/i],
    ['Ejecutar nomina', /Ejecutar n[oó]mina/i],
    ['Usar en nomina', /Usar en n[oó]mina/i],
    ['Activar convenio', /Activar convenio/i],
    ['Activar para nomina', /Activar para n[oó]mina/i],
    ['Crear mapping automatico', /Crear mapping autom[aá]tico/i],
    ['Crear runtime automatico', /Crear runtime autom[aá]tico/i],
    ['Aplicar payroll', /Aplicar payroll/i],
    ['Cambiar flag', /Cambiar flag/i],
    ['Activar flag', /Activar flag/i],
    ['Generar CRA', /Generar CRA/i],
    ['Generar SILTRA', /Generar SILTRA/i],
    ['Generar SEPA', /Generar SEPA/i],
    ['Generar asiento contable', /Generar asiento contable/i],
    ['Marcar listo para nomina', /Marcar listo para n[oó]mina/i],
    ['Saltar validacion', /Saltar validaci[oó]n/i],
  ];
  for (const [label, re] of dangerousCtas) {
    it('UI forbidden CTA: ' + label, () => {
      expect(UI_SRC).not.toMatch(re);
    });
  }

  it('no auto-create mapping/runtime helpers', () => {
    expect(FRONTEND_SRC).not.toMatch(/createMappingAutomatically|autoCreateMapping/);
    expect(FRONTEND_SRC).not.toMatch(/createRuntimeAutomatically|autoCreateRuntime/);
  });
});

describe('B13.7 — edge hardening', () => {
  it('all B13 edges have verify_jwt=true and FORBIDDEN_PAYLOAD_KEYS', () => {
    const cfg = fs.readFileSync(path.resolve(ROOT, 'supabase/config.toml'), 'utf8');
    for (const e of [
      'erp-hr-agreement-source-watcher',
      'erp-hr-agreement-document-intake',
      'erp-hr-agreement-extraction-runner',
      'erp-hr-agreement-impact-engine',
    ]) {
      expect(cfg).toMatch(new RegExp('\\[functions\\.' + e + '\\][\\s\\S]*?verify_jwt\\s*=\\s*true'));
    }
    expect((EDGE_SRC.match(/FORBIDDEN_PAYLOAD_KEYS/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('no edge imports payroll/bridge/normalizer/resolver', () => {
    for (const f of ['payrollEngine', 'payslipEngine', 'useESPayrollBridge', 'salaryNormalizer', 'agreementSalaryResolver']) {
      expect(EDGE_SRC).not.toMatch(new RegExp('(import|from)[^\\n]*' + f));
    }
  });

  it('no edge writes ready_for_payroll/salary_tables_loaded=true/human_validated', () => {
    expect(EDGE_SRC).not.toMatch(/ready_for_payroll\s*:\s*(true|false)/);
    expect(EDGE_SRC).not.toMatch(/salary_tables_loaded\s*:\s*true/);
    expect(EDGE_SRC).not.toMatch(/data_completeness\s*:\s*['"]human_validated['"]/);
  });

  it('no edge generates CRA/SILTRA/SEPA/accounting', () => {
    expect(EDGE_SRC).not.toMatch(/generateCRA|generateSILTRA|generateSEPA|generateAccountingEntr/i);
  });

  it('no DELETE in B13 edges', () => {
    expect(EDGE_SRC).not.toMatch(/\.delete\(/);
  });
});
