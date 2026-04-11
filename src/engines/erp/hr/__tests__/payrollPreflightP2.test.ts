import { describe, it, expect } from 'vitest';
import { buildPreflightResult, type PreflightInput } from '@/engines/erp/hr/payrollPreflightEngine';

function baseInput(overrides?: Partial<PreflightInput>): PreflightInput {
  return {
    periodStatus: 'open',
    periodId: 'period-001',
    incidentCounts: { total: 0, pending: 0, validated: 0, applied: 0 },
    latestRunStatus: null,
    preCloseBlockers: 0,
    preCloseWarnings: 0,
    paymentPhase: 'pending',
    fanGenerated: false,
    fanSubmitted: false,
    rlcConfirmed: false,
    rntConfirmed: false,
    craGenerated: false,
    craSubmitted: false,
    ssAllConfirmed: false,
    modelo145Updated: false,
    irpfCalculated: false,
    modelo111Generated: false,
    modelo111Submitted: false,
    modelo190Generated: false,
    closurePackageCreated: false,
    hasTerminations: false,
    regulatoryDeadlines: [],
    now: new Date('2026-06-15'),
    ...overrides,
  };
}

describe('buildPreflightResult — P2 substeps', () => {
  it('injects SEPA CT substep when active batch exists', () => {
    const input = baseInput({
      activeSEPACT: {
        hasPendingBatch: true,
        batchStatus: 'generated',
        totalAmount: 12000,
        lineCount: 5,
        hasErrors: false,
        summary: '5 transferencias por 12.000 €',
      },
    });
    const result = buildPreflightResult(input);
    const sepaStep = result.steps.find(s => s.id === 'sepa_ct_batch');
    expect(sepaStep).toBeDefined();
    expect(sepaStep?.label).toBe('SEPA CT');
    expect(sepaStep?.status).toBe('pending');
  });

  it('blocks SEPA CT substep when batch has errors', () => {
    const input = baseInput({
      activeSEPACT: {
        hasPendingBatch: true,
        batchStatus: 'draft',
        totalAmount: 8000,
        lineCount: 3,
        hasErrors: true,
        summary: 'Errores en validación',
      },
    });
    const result = buildPreflightResult(input);
    const sepaStep = result.steps.find(s => s.id === 'sepa_ct_batch');
    expect(sepaStep?.status).toBe('blocked');
    expect(sepaStep?.semaphore).toBe('red');
  });

  it('injects offboarding pipeline substep when active cases', () => {
    const input = baseInput({
      activeOffboarding: {
        activeCases: 2,
        pendingSettlements: 1,
        pendingCertificates: 0,
        pendingPayments: 1,
        summary: '2 casos de baja activos',
      },
    });
    const result = buildPreflightResult(input);
    const offStep = result.steps.find(s => s.id === 'offboarding_pipeline');
    expect(offStep).toBeDefined();
    expect(offStep?.label).toBe('Pipeline de baja');
    expect(offStep?.status).toBe('in_progress');
  });

  it('does not inject substeps when no P2 data present', () => {
    const result = buildPreflightResult(baseInput());
    expect(result.steps.find(s => s.id === 'sepa_ct_batch')).toBeUndefined();
    expect(result.steps.find(s => s.id === 'offboarding_pipeline')).toBeUndefined();
  });

  it('marks SEPA CT as completed when paid', () => {
    const input = baseInput({
      activeSEPACT: {
        hasPendingBatch: false,
        batchStatus: 'paid',
        totalAmount: 10000,
        lineCount: 4,
        hasErrors: false,
        summary: 'Pagado',
      },
    });
    const result = buildPreflightResult(input);
    const sepaStep = result.steps.find(s => s.id === 'sepa_ct_batch');
    expect(sepaStep?.status).toBe('completed');
    expect(sepaStep?.semaphore).toBe('green');
  });
});
