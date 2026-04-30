/**
 * B13.2 — Static guards on the Document Intake panel UI.
 *
 * We assert structural / textual guarantees rather than full DOM
 * rendering, to avoid coupling to provider setup.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PANEL = readFileSync(
  resolve(
    process.cwd(),
    'src/components/erp/hr/collective-agreements/curated/AgreementDocumentIntakePanel.tsx',
  ),
  'utf8',
);

describe('B13.2 — Document Intake panel static guards', () => {
  it('1. shows the safety banner copy', () => {
    expect(PANEL).toContain(
      'Intake documental — clasifica fuentes oficiales. No extrae tablas ni activa nómina.',
    );
  });

  it('2. renders a documents table', () => {
    expect(PANEL).toMatch(/<Table>/);
    expect(PANEL).toMatch(/Documento/);
    expect(PANEL).toMatch(/Estado/);
    expect(PANEL).toMatch(/Clasificación/);
  });

  it('3. has no forbidden CTAs', () => {
    const forbidden = [
      'Activar convenio',
      'Usar en nómina',
      'ready_for_payroll',
      'Aplicar payroll',
      'Ejecutar nómina',
      'Saltar validación',
      'Ejecutar OCR',
      'Extraer tablas ahora',
    ];
    for (const f of forbidden) {
      expect(PANEL).not.toContain(f);
    }
  });

  it('4. handles unauthenticated state without throwing', () => {
    expect(PANEL).toMatch(/authRequired/);
  });

  it('5. all mutations go through the hook, not the DB client', () => {
    expect(PANEL).not.toMatch(/from\(['"][^'"]+['"]\)\.(insert|update|delete|upsert)/);
    expect(PANEL).not.toMatch(/supabase\.from\(/);
    expect(PANEL).toMatch(/useAgreementDocumentIntake/);
  });

  it('6. promote_to_extraction button does not say "Ejecutar OCR" or "Extraer"', () => {
    const idx = PANEL.indexOf('Promover a extracción');
    expect(idx).toBeGreaterThan(0);
    // Surrounding region of the button label
    const around = PANEL.slice(Math.max(0, idx - 400), idx + 400);
    expect(around).not.toMatch(/Ejecutar OCR/);
    expect(around).not.toMatch(/Extraer tablas/);
    // Tooltip / title clarifies it is status-only
    expect(around).toMatch(/No ejecuta extracción/);
  });
});