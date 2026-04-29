/**
 * B12.1 — UI wiring tests for the Registry Master entry-points.
 * Static checks only. No runtime, no DB.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const LAZY_EXPORTS = [
  'LazyRegistryMasterPanel',
  'LazyCollectiveAgreementValidationPanel',
  'LazyCompanyAgreementRegistryMappingPanel',
  'LazyRuntimeApplyRequestPanel',
  'LazyRegistryPilotCandidateDiscoveryPanel',
  'LazyRegistryPilotMonitorPanel',
];

const MODULE_BRANCHES = [
  "activeModule === 'registry-master'",
  "activeModule === 'registry-validation'",
  "activeModule === 'registry-mapping'",
  "activeModule === 'registry-runtime-apply'",
  "activeModule === 'registry-pilot-discovery'",
  "activeModule === 'registry-pilot-monitor'",
];

const MENU_IDS = [
  "id: 'registry-master'",
  "id: 'registry-validation'",
  "id: 'registry-mapping'",
  "id: 'registry-runtime-apply'",
  "id: 'registry-pilot-discovery'",
  "id: 'registry-pilot-monitor'",
];

const MENU_LABELS = [
  'Registro Maestro',
  'Validación humana',
  'Mapping empresa/contrato',
  'Runtime Apply',
  'Discovery candidatos piloto',
  'Monitor piloto',
];

describe('B12.1 — Registry UI wiring', () => {
  const lazy = read('src/components/erp/hr/HRModuleLazy.tsx');
  const mod = read('src/components/erp/hr/HRModule.tsx');
  const menu = read('src/components/erp/hr/HRNavigationMenu.tsx');

  it('HRModuleLazy exports the 6 new Lazy* symbols', () => {
    for (const name of LAZY_EXPORTS) {
      expect(lazy).toContain(`export const ${name}`);
    }
  });

  it('HRModule contains the 6 activeModule branches', () => {
    for (const branch of MODULE_BRANCHES) {
      expect(mod).toContain(branch);
    }
  });

  it('HRNavigationMenu registers the 6 ids in mvpItems', () => {
    for (const id of [
      'registry-master',
      'registry-validation',
      'registry-mapping',
      'registry-runtime-apply',
      'registry-pilot-discovery',
      'registry-pilot-monitor',
    ]) {
      expect(menu).toContain(`'${id}'`);
    }
  });

  it('HRNavigationMenu lists the 6 menu items', () => {
    for (const id of MENU_IDS) {
      expect(menu).toContain(id);
    }
    for (const label of MENU_LABELS) {
      expect(menu).toContain(label);
    }
  });

  it('legacy collective-agreements entry remains intact', () => {
    expect(menu).toContain("id: 'collective-agreements'");
    expect(menu).toContain('Convenios Colectivos');
    expect(mod).toContain("activeModule === 'collective-agreements'");
    expect(lazy).toContain('LazyHRCollectiveAgreementPanel');
  });
});