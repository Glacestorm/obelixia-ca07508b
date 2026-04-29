/**
 * B7A tests — Rules parser.
 * Conservative detection. No invented values.
 */
import { describe, it, expect } from 'vitest';
import { parseAgreementRulesFromText } from '@/engines/erp/hr/collectiveAgreementRulesParser';
import { boibRulesText } from './fixtures/collective-agreements/b7-boib-parser/boib-rules-text.fixture';

describe('B7A — parseAgreementRulesFromText', () => {
  it('detects jornada anual 1.776 horas', () => {
    const r = parseAgreementRulesFromText('La jornada anual será de 1.776 horas.');
    expect(r.jornadaAnualHours).toBe(1776);
  });

  it('detects vacaciones 30 días naturales', () => {
    const r = parseAgreementRulesFromText('Vacaciones: 30 días naturales por año trabajado.');
    expect(r.vacacionesDays).toBe(30);
  });

  it('detects dos pagas extraordinarias', () => {
    const r = parseAgreementRulesFromText('Se abonarán dos pagas extraordinarias en julio y diciembre.');
    expect(r.extraPaymentsCount).toBe(2);
  });

  it('14 pagas → infers 2 extras', () => {
    const r = parseAgreementRulesFromText('Salario en 14 pagas anuales.');
    expect(r.extraPaymentsCount).toBe(2);
  });

  it('detects nocturnidad 25%', () => {
    const r = parseAgreementRulesFromText('Plus de nocturnidad del 25% sobre salario base.');
    expect(r.nocturnidadPercent).toBe(25);
  });

  it('detects permisos with days', () => {
    const r = parseAgreementRulesFromText(
      'En caso de matrimonio, 15 días naturales. Por nacimiento, 2 días.',
    );
    expect(r.permisosRules?.length).toBeGreaterThanOrEqual(2);
    const matrimonio = r.permisosRules?.find((p) => p.kind === 'matrimonio');
    expect(matrimonio?.days).toBe(15);
    expect(matrimonio?.sourceExcerpt.length).toBeGreaterThan(0);
  });

  it('complex antigüedad text kept as literal (no interpretation)', () => {
    const r = parseAgreementRulesFromText(
      'La antigüedad se calculará mediante trienios complejos según escala anexa al convenio.',
    );
    expect(r.antiguedadFormula).toBeDefined();
    expect(r.antiguedadFormula).toMatch(/antig/i);
  });

  it('full BOIB-like text → multiple rules detected', () => {
    const r = parseAgreementRulesFromText(boibRulesText);
    expect(r.jornadaAnualHours).toBe(1776);
    expect(r.vacacionesDays).toBe(30);
    expect(r.extraPaymentsCount).toBe(2);
    expect(r.nocturnidadPercent).toBe(25);
    expect(r.preavisoDays).toBe(15);
    expect(r.permisosRules?.length).toBeGreaterThanOrEqual(2);
  });

  it('empty text → warning, no fabricated rules', () => {
    const r = parseAgreementRulesFromText('');
    expect(r.warnings).toContain('EMPTY_TEXT');
    expect(r.jornadaAnualHours).toBeUndefined();
    expect(r.vacacionesDays).toBeUndefined();
  });
});