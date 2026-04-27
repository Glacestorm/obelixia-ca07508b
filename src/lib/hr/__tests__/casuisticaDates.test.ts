/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Tests de helpers puros de fechas. Sin red, sin Supabase, sin motor.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateInclusiveDays,
  isInvertedRange,
  getPeriodBounds,
  getDateIntersectionDays,
} from '../casuisticaDates';

describe('calculateInclusiveDays', () => {
  it('mismo día = 1', () => {
    expect(calculateInclusiveDays('2026-03-01', '2026-03-01')).toBe(1);
  });

  it('marzo 2026 completo = 31', () => {
    expect(calculateInclusiveDays('2026-03-01', '2026-03-31')).toBe(31);
  });

  it('rango invertido devuelve null', () => {
    expect(calculateInclusiveDays('2026-03-31', '2026-03-01')).toBeNull();
  });

  it('formato inválido devuelve null', () => {
    expect(calculateInclusiveDays('2026/03/01', '2026/03/31')).toBeNull();
    expect(calculateInclusiveDays('not-a-date', '2026-03-31')).toBeNull();
  });

  it('faltan fechas devuelve null', () => {
    expect(calculateInclusiveDays('', '2026-03-31')).toBeNull();
    expect(calculateInclusiveDays(null, null)).toBeNull();
  });
});

describe('isInvertedRange', () => {
  it('detecta inversión', () => {
    expect(isInvertedRange('2026-03-31', '2026-03-01')).toBe(true);
  });
  it('rango válido = false', () => {
    expect(isInvertedRange('2026-03-01', '2026-03-31')).toBe(false);
  });
  it('falta fecha = false', () => {
    expect(isInvertedRange('', '2026-03-01')).toBe(false);
  });
});

describe('getPeriodBounds', () => {
  it('marzo 2026', () => {
    expect(getPeriodBounds(2026, 3)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    });
  });
  it('febrero 2026 (no bisiesto)', () => {
    expect(getPeriodBounds(2026, 2)).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });
  it('abril 2026 (30 días)', () => {
    expect(getPeriodBounds(2026, 4)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });
});

describe('getDateIntersectionDays', () => {
  const ps = '2026-03-01';
  const pe = '2026-03-31';

  it('sin solape = 0', () => {
    expect(getDateIntersectionDays('2026-01-01', '2026-01-15', ps, pe)).toBe(0);
    expect(getDateIntersectionDays('2026-04-01', '2026-04-15', ps, pe)).toBe(0);
  });

  it('cruce previo: 28/02 → 05/03 dentro de marzo = 5 días', () => {
    expect(getDateIntersectionDays('2026-02-28', '2026-03-05', ps, pe)).toBe(5);
  });

  it('cruce posterior: 28/03 → 05/04 dentro de marzo = 4 días', () => {
    expect(getDateIntersectionDays('2026-03-28', '2026-04-05', ps, pe)).toBe(4);
  });

  it('rango contenido = días inclusivos', () => {
    expect(getDateIntersectionDays('2026-03-10', '2026-03-12', ps, pe)).toBe(3);
  });

  it('mes completo = 31', () => {
    expect(getDateIntersectionDays('2026-03-01', '2026-03-31', ps, pe)).toBe(31);
  });

  it('rango abierto (to=null) se cierra en periodEnd', () => {
    expect(getDateIntersectionDays('2026-03-15', null, ps, pe)).toBe(17);
  });

  it('falta from = 0', () => {
    expect(getDateIntersectionDays(null, '2026-03-31', ps, pe)).toBe(0);
  });
});
