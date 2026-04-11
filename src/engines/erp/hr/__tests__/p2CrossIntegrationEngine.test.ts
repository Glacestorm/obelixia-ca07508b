import { describe, it, expect } from 'vitest';
import {
  deriveOffboardingPayrollSignals,
  deriveITPayrollSignals,
  deriveSEPAPaymentSignals,
  deriveOffboardingSEPASignals,
  buildP2IntegrationStatus,
} from '@/engines/erp/hr/p2CrossIntegrationEngine';

describe('deriveOffboardingPayrollSignals', () => {
  it('warns when settlement exists but no payroll adjustment', () => {
    const signals = deriveOffboardingPayrollSignals({
      offboardingState: 'settlement_generated',
      hasSettlement: true,
      periodStatus: 'open',
      periodHasTerminationAdjustment: false,
    });
    expect(signals.some(s => s.id === 'off_payroll_no_adjustment')).toBe(true);
  });

  it('no warning when payroll has adjustment', () => {
    const signals = deriveOffboardingPayrollSignals({
      offboardingState: 'settlement_generated',
      hasSettlement: true,
      periodStatus: 'closed',
      periodHasTerminationAdjustment: true,
    });
    expect(signals.filter(s => s.severity === 'warning')).toHaveLength(0);
  });
});

describe('deriveITPayrollSignals', () => {
  it('warns when IT active without payroll reflection', () => {
    const signals = deriveITPayrollSignals({
      itState: 'active',
      affectedDays: 15,
      fdiGenerated: false,
      payrollReflectsIT: false,
    });
    expect(signals.some(s => s.id === 'it_payroll_no_deduction')).toBe(true);
    expect(signals.some(s => s.id === 'it_payroll_no_fdi')).toBe(true);
  });

  it('no deduction warning when payroll reflects IT', () => {
    const signals = deriveITPayrollSignals({
      itState: 'active',
      affectedDays: 10,
      fdiGenerated: true,
      payrollReflectsIT: true,
    });
    expect(signals.filter(s => s.id === 'it_payroll_no_deduction')).toHaveLength(0);
  });
});

describe('deriveSEPAPaymentSignals', () => {
  it('warns when SEPA exported but payment not confirmed', () => {
    const signals = deriveSEPAPaymentSignals({
      batchStatus: 'exported',
      batchTotalAmount: 15000,
      paymentPhase: 'pending',
      periodTotalNet: 15000,
    });
    expect(signals.some(s => s.id === 'sepa_payment_exported_unpaid')).toBe(true);
  });

  it('detects amount mismatch', () => {
    const signals = deriveSEPAPaymentSignals({
      batchStatus: 'generated',
      batchTotalAmount: 14500,
      paymentPhase: 'pending',
      periodTotalNet: 15000,
    });
    expect(signals.some(s => s.id === 'sepa_payment_amount_mismatch')).toBe(true);
  });
});

describe('deriveOffboardingSEPASignals', () => {
  it('warns when settlement pending but not in SEPA batch', () => {
    const signals = deriveOffboardingSEPASignals({
      offboardingState: 'pending_payment',
      settlementAmount: 5000,
      sepaIncludesSettlement: false,
    });
    expect(signals.some(s => s.id === 'off_sepa_no_settlement')).toBe(true);
  });
});

describe('buildP2IntegrationStatus', () => {
  it('reports 100% readiness when all resolved', () => {
    const status = buildP2IntegrationStatus([
      { id: 's1', domain: 'a', affectedDomain: 'b', severity: 'info', message: 'ok', resolved: true },
    ]);
    expect(status.readinessScore).toBe(100);
    expect(status.allResolved).toBe(true);
  });

  it('counts unresolved warnings and criticals', () => {
    const status = buildP2IntegrationStatus([
      { id: 's1', domain: 'a', affectedDomain: 'b', severity: 'warning', message: 'w', resolved: false },
      { id: 's2', domain: 'a', affectedDomain: 'b', severity: 'critical', message: 'c', resolved: false },
      { id: 's3', domain: 'a', affectedDomain: 'b', severity: 'info', message: 'i', resolved: true },
    ]);
    expect(status.warningCount).toBe(1);
    expect(status.criticalCount).toBe(1);
    expect(status.allResolved).toBe(false);
    expect(status.readinessScore).toBe(33);
  });
});
