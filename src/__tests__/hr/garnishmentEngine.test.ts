import { describe, it, expect } from 'vitest';
import { calculateGarnishment, SMI_MENSUAL_2026 } from '@/lib/hr/garnishmentEngine';

describe('garnishmentEngine — Art. 607 LEC', () => {
  it('SMI correcto 2026 = 1184', () => {
    expect(SMI_MENSUAL_2026).toBe(1184.00);
  });

  it('salario = SMI -> embargo 0', () => {
    const r = calculateGarnishment({
      netSalary: 1184, hasExtraPay: false,
      isArt608Alimentos: false, cargasFamiliares: 0, conceptosEmbargables100: false,
    });
    expect(r.totalGarnished).toBe(0);
  });

  it('salario < SMI -> embargo 0', () => {
    const r = calculateGarnishment({
      netSalary: 900, hasExtraPay: false,
      isArt608Alimentos: false, cargasFamiliares: 0, conceptosEmbargables100: false,
    });
    expect(r.totalGarnished).toBe(0);
  });

  it('con paga extra -> umbral = 2 x SMI', () => {
    const r = calculateGarnishment({
      netSalary: 1184, hasExtraPay: true,
      isArt608Alimentos: false, cargasFamiliares: 0, conceptosEmbargables100: false,
    });
    expect(r.inembargableLimit).toBe(1184 * 2);
    expect(r.totalGarnished).toBe(0);
  });

  it('art 608 alimentos -> bypass SMI', () => {
    const r = calculateGarnishment({
      netSalary: 900, hasExtraPay: false,
      isArt608Alimentos: true, cargasFamiliares: 0, conceptosEmbargables100: false,
    });
    expect(r.art608Applied).toBe(true);
    expect(r.totalGarnished).toBeGreaterThan(0);
  });

  it('pluripercepcion acumula todos los ingresos', () => {
    const r = calculateGarnishment({
      netSalary: 800, hasExtraPay: false,
      isArt608Alimentos: false, cargasFamiliares: 0, conceptosEmbargables100: false,
      otherIncomes: 500,
    });
    expect(r.pluripercepcionApplied).toBe(true);
  });
});
