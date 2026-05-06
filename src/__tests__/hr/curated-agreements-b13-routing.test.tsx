/**
 * B13.7 — Routing/UI wiring audit for the Curated Agreements module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';

const invokeMock = vi.fn();
const getSessionMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSessionMock(...a),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import { CuratedAgreementsPanel } from '@/components/erp/hr/collective-agreements/curated/shell/CuratedAgreementsPanel';

function read(rel: string) {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

describe('B13.7 — routing & menu wiring', () => {
  const lazy = read('src/components/erp/hr/HRModuleLazy.tsx');
  const mod = read('src/components/erp/hr/HRModule.tsx');
  const menu = read('src/components/erp/hr/HRNavigationMenu.tsx');

  it('HRModuleLazy exports LazyCuratedAgreementsPanel', () => {
    expect(lazy).toContain('LazyCuratedAgreementsPanel');
  });
  it('HRModule has activeModule branch for curated-agreements', () => {
    expect(mod).toContain("activeModule === 'curated-agreements'");
  });
  it('HRNavigationMenu still has curated-agreements entry', () => {
    expect(menu).toContain("id: 'curated-agreements'");
  });
  it('preserves existing menu entries', () => {
    for (const id of [
      'agreement-hub',
      'collective-agreements',
      'registry-master',
      'registry-validation',
      'registry-mapping',
      'registry-runtime-apply',
      'registry-pilot-discovery',
      'registry-pilot-monitor',
    ]) {
      expect(menu).toContain("id: '" + id + "'");
    }
  });
});

describe('B13.7 — shell behaviour', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    invokeMock.mockResolvedValue({ data: null, error: null });
  });

  it('renders all six pipeline tabs and the no-auto-apply banner', () => {
    render(<CuratedAgreementsPanel />);
    for (const label of [
      'Fuentes detectadas',
      'Documentos pendientes',
      'Extracción',
      'Revisión humana',
      'Impacto económico',
      'Aplicación controlada',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('curated-no-auto-apply-banner')).toBeInTheDocument();
  });

  it('Aplicación controlada tab does not invoke any edge', async () => {
    render(<CuratedAgreementsPanel defaultTab="apply" />);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
