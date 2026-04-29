/**
 * B12.2 — Wiring tests: menu + module routing for the Centro de Convenios.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const moduleLazy = readFileSync(
  resolve(process.cwd(), 'src/components/erp/hr/HRModuleLazy.tsx'),
  'utf8',
);
const moduleFile = readFileSync(
  resolve(process.cwd(), 'src/components/erp/hr/HRModule.tsx'),
  'utf8',
);
const navFile = readFileSync(
  resolve(process.cwd(), 'src/components/erp/hr/HRNavigationMenu.tsx'),
  'utf8',
);

describe('B12.2 — Hub wiring', () => {
  it('HRModuleLazy exports LazyAgreementHubPanel', () => {
    expect(moduleLazy).toMatch(/LazyAgreementHubPanel/);
    expect(moduleLazy).toMatch(/hub\/AgreementHubPanel/);
  });

  it('HRModule renders agreement-hub when activeModule matches', () => {
    expect(moduleFile).toMatch(/activeModule === 'agreement-hub'/);
    expect(moduleFile).toMatch(/LazyAgreementHubPanel/);
  });

  it('HRNavigationMenu contains the agreement-hub entry', () => {
    expect(navFile).toMatch(/'agreement-hub'/);
    expect(navFile).toMatch(/Centro de Convenios/);
  });

  it('HRNavigationMenu still contains collective-agreements', () => {
    expect(navFile).toMatch(/'collective-agreements'/);
  });

  for (const id of [
    'registry-master',
    'registry-validation',
    'registry-mapping',
    'registry-runtime-apply',
    'registry-pilot-discovery',
    'registry-pilot-monitor',
  ]) {
    it(`HRNavigationMenu still contains ${id}`, () => {
      expect(navFile).toMatch(new RegExp(`'${id}'`));
    });
  }
});