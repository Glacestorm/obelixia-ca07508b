/**
 * B13.6 — Wiring tests for the curated agreements shell entry-point.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('B13.6 — Curated Agreements UI wiring', () => {
  const lazy = read('src/components/erp/hr/HRModuleLazy.tsx');
  const mod = read('src/components/erp/hr/HRModule.tsx');
  const menu = read('src/components/erp/hr/HRNavigationMenu.tsx');

  it('HRModuleLazy exports LazyCuratedAgreementsPanel', () => {
    expect(lazy).toContain('export const LazyCuratedAgreementsPanel');
    expect(lazy).toContain("collective-agreements/curated/shell/CuratedAgreementsPanel");
  });

  it('HRModule has activeModule branch for curated-agreements', () => {
    expect(mod).toContain("activeModule === 'curated-agreements'");
    expect(mod).toContain('LazyCuratedAgreementsPanel');
  });

  it('HRNavigationMenu registers curated-agreements id and label', () => {
    expect(menu).toContain("'curated-agreements'");
    expect(menu).toContain("id: 'curated-agreements'");
    expect(menu).toContain('Convenios Curados');
  });

  it('preserves existing entries (hub, legacy, registry, mapping, runtime)', () => {
    for (const id of [
      'agreement-hub',
      'collective-agreements',
      'registry-master',
      'registry-mapping',
      'registry-runtime-apply',
    ]) {
      expect(menu).toContain(`id: '${id}'`);
    }
  });
});