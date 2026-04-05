import { describe, it, expect } from 'vitest';
import { getSubsidyPercentage, calculateMilestones } from '@/lib/hr/it-engine';

describe('it-engine — LGSS Arts. 169-176', () => {
  it('EC dias 1-3 -> porcentaje 0 (a cargo empresa sin prestacion SS)', () => {
    const r = getSubsidyPercentage('EC', 1);
    expect(r.percentage).toBe(0);
  });

  it('EC dia 10 -> 60% empresa (pago delegado)', () => {
    const r = getSubsidyPercentage('EC', 10);
    expect(r.percentage).toBe(60);
  });

  it('EC dia 21 -> 75% SS', () => {
    const r = getSubsidyPercentage('EC', 21);
    expect(r.percentage).toBe(75);
  });

  it('AT desde dia 1 -> 75%', () => {
    const r = getSubsidyPercentage('AT', 1);
    expect(r.percentage).toBe(75);
  });

  it('MAT -> 100% SS', () => {
    const r = getSubsidyPercentage('MAT', 1);
    expect(r.percentage).toBe(100);
  });

  it('milestone 365 correcto', () => {
    const m = calculateMilestones('2024-01-01');
    expect(m.milestone365).toBe('2024-12-31');
  });
});
