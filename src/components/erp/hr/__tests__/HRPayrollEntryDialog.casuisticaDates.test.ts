/**
 * CASUISTICA-FECHAS-01 Fase B — Tests del helper puro `calculateInclusiveDays`
 * y `isInvertedRange` exportados desde HRPayrollEntryDialog.
 *
 * Estos tests validan SÓLO la lógica aritmética del helper. NO tocan motor de
 * nómina, normalizer, agreement resolver, BD ni edge functions.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateInclusiveDays,
  isInvertedRange,
} from '../HRPayrollEntryDialog';

describe('calculateInclusiveDays', () => {
  it('devuelve 1 cuando inicio y fin son el mismo día', () => {
    expect(calculateInclusiveDays('2026-03-01', '2026-03-01')).toBe(1);
  });

  it('devuelve 31 para un mes completo de marzo 2026', () => {
    expect(calculateInclusiveDays('2026-03-01', '2026-03-31')).toBe(31);
  });

  it('devuelve 28 para febrero 2026 completo', () => {
    expect(calculateInclusiveDays('2026-02-01', '2026-02-28')).toBe(28);
  });

  it('cubre cambio de mes: 28/02/2026 a 02/03/2026 = 3 días', () => {
    expect(calculateInclusiveDays('2026-02-28', '2026-03-02')).toBe(3);
  });

  it('cubre cambio de año: 30/12/2025 a 02/01/2026 = 4 días', () => {
    expect(calculateInclusiveDays('2025-12-30', '2026-01-02')).toBe(4);
  });

  it('devuelve null si fechaHasta < fechaDesde', () => {
    expect(calculateInclusiveDays('2026-03-31', '2026-03-01')).toBeNull();
  });

  it('devuelve null si falta alguna fecha', () => {
    expect(calculateInclusiveDays('', '2026-03-31')).toBeNull();
    expect(calculateInclusiveDays('2026-03-01', '')).toBeNull();
    expect(calculateInclusiveDays(null, null)).toBeNull();
    expect(calculateInclusiveDays(undefined, undefined)).toBeNull();
  });

  it('devuelve null si el formato no es YYYY-MM-DD estricto', () => {
    expect(calculateInclusiveDays('2026/03/01', '2026/03/31')).toBeNull();
    expect(calculateInclusiveDays('01-03-2026', '31-03-2026')).toBeNull();
    expect(calculateInclusiveDays('not-a-date', '2026-03-31')).toBeNull();
  });
});

describe('isInvertedRange', () => {
  it('detecta rango invertido', () => {
    expect(isInvertedRange('2026-03-31', '2026-03-01')).toBe(true);
  });

  it('no marca como invertido un rango válido o de un solo día', () => {
    expect(isInvertedRange('2026-03-01', '2026-03-31')).toBe(false);
    expect(isInvertedRange('2026-03-01', '2026-03-01')).toBe(false);
  });

  it('devuelve false si falta alguna fecha (no debe disparar warning prematuro)', () => {
    expect(isInvertedRange('', '2026-03-01')).toBe(false);
    expect(isInvertedRange('2026-03-01', '')).toBe(false);
    expect(isInvertedRange(null, null)).toBe(false);
  });

  it('devuelve false si formato inválido (no se puede determinar fiable)', () => {
    expect(isInvertedRange('2026/03/01', '2026/03/31')).toBe(false);
  });
});