import { describe, it, expect } from 'vitest';
import {
  createOnboardingWorkflow,
  calculateOnboardingProgress,
  recordItemEvidence,
  getItemDeadline,
  getCategoryLabel,
  getOnboardingTemplate,
  generateOnboardingSummary,
  type EmployeeContext,
  type OnboardingEvidence,
} from '../legalOnboardingEngine';

const baseCtx: EmployeeContext = {
  employeeId: 'emp-001',
  employeeName: 'Ana García López',
  hireDate: '2026-04-15',
  headcount: 120,
  hasWhistleblowerChannel: true,
  hasEqualityPlan: true,
};

describe('legalOnboardingEngine', () => {
  describe('getOnboardingTemplate', () => {
    it('returns 10 template items', () => {
      expect(getOnboardingTemplate()).toHaveLength(10);
    });
  });

  describe('createOnboardingWorkflow', () => {
    it('creates workflow with all items pending for large company', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      expect(wf.employeeId).toBe('emp-001');
      expect(wf.items.length).toBe(10);
      const pending = wf.items.filter(i => i.status === 'pending');
      expect(pending.length).toBe(10); // all applicable for ≥50
    });

    it('marks conditional items as not_applicable for small company', () => {
      const wf = createOnboardingWorkflow({
        ...baseCtx,
        headcount: 30,
        hasWhistleblowerChannel: false,
        hasEqualityPlan: false,
      });
      const na = wf.items.filter(i => i.status === 'not_applicable');
      expect(na.length).toBe(2);
      expect(na.map(i => i.code).sort()).toEqual(['EQUALITY_PLAN', 'WHISTLEBLOWER']);
    });

    it('keeps whistleblower if channel exists even for small company', () => {
      const wf = createOnboardingWorkflow({
        ...baseCtx,
        headcount: 30,
        hasWhistleblowerChannel: true,
        hasEqualityPlan: false,
      });
      const wb = wf.items.find(i => i.code === 'WHISTLEBLOWER');
      expect(wb?.status).toBe('pending');
    });

    it('includes timestamps', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      expect(wf.createdAt).toBeTruthy();
      expect(wf.updatedAt).toBeTruthy();
    });
  });

  describe('calculateOnboardingProgress', () => {
    it('returns 0% for fresh workflow', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const p = calculateOnboardingProgress(wf);
      expect(p.percentage).toBe(0);
      expect(p.completed).toBe(0);
      expect(p.isComplete).toBe(false);
    });

    it('detects overdue items', () => {
      const wf = createOnboardingWorkflow({
        ...baseCtx,
        hireDate: '2025-01-01',
      });
      const p = calculateOnboardingProgress(wf, '2026-04-12');
      expect(p.overdue.length).toBeGreaterThan(0);
    });

    it('returns 100% when all accepted', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      wf.items = wf.items.map(i => ({
        ...i,
        status: i.status === 'not_applicable' ? 'not_applicable' : 'accepted',
      }));
      const p = calculateOnboardingProgress(wf);
      expect(p.percentage).toBe(100);
      expect(p.isComplete).toBe(true);
    });

    it('counts not_applicable correctly', () => {
      const wf = createOnboardingWorkflow({
        ...baseCtx,
        headcount: 20,
        hasWhistleblowerChannel: false,
        hasEqualityPlan: false,
      });
      const p = calculateOnboardingProgress(wf);
      expect(p.notApplicable).toBe(2);
      expect(p.total).toBe(8);
    });
  });

  describe('recordItemEvidence', () => {
    it('sets accepted for digital acceptance', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const item = wf.items[0];
      const ev: OnboardingEvidence = {
        type: 'digital_acceptance',
        acceptedBy: 'emp-001',
        method: 'Portal click aceptar',
      };
      const updated = recordItemEvidence(item, ev);
      expect(updated.status).toBe('accepted');
      expect(updated.evidence?.type).toBe('digital_acceptance');
      expect(updated.evidence?.timestamp).toBeTruthy();
    });

    it('sets generated for system_generated if requires acceptance', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const item = wf.items.find(i => i.requiresEmployeeAcceptance)!;
      const ev: OnboardingEvidence = {
        type: 'system_generated',
        method: 'Auto-generado por sistema',
      };
      const updated = recordItemEvidence(item, ev);
      expect(updated.status).toBe('generated');
    });

    it('sets accepted for system_generated if no acceptance needed', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const item = wf.items.find(i => !i.requiresEmployeeAcceptance)!;
      const ev: OnboardingEvidence = {
        type: 'system_generated',
        method: 'AFI generado automáticamente',
      };
      const updated = recordItemEvidence(item, ev);
      expect(updated.status).toBe('accepted');
    });
  });

  describe('getItemDeadline', () => {
    it('computes deadline correctly', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const prl = wf.items.find(i => i.code === 'PRL_INFO')!;
      const deadline = getItemDeadline(prl, '2026-04-15');
      expect(deadline.toISOString()).toContain('2026-04-18');
    });

    it('returns hire date for 0-day items', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const contract = wf.items.find(i => i.code === 'CONTRACT')!;
      const deadline = getItemDeadline(contract, '2026-04-15');
      expect(deadline.toISOString()).toContain('2026-04-15');
    });
  });

  describe('getCategoryLabel', () => {
    it('returns Spanish labels', () => {
      expect(getCategoryLabel('contractual')).toBe('Contractual');
      expect(getCategoryLabel('prl')).toBe('Prevención Riesgos Laborales');
    });
  });

  describe('generateOnboardingSummary', () => {
    it('includes employee name and progress', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      const summary = generateOnboardingSummary(wf);
      expect(summary).toContain('Ana García');
      expect(summary).toContain('0%');
    });

    it('shows completion when all done', () => {
      const wf = createOnboardingWorkflow(baseCtx);
      wf.items = wf.items.map(i => ({ ...i, status: 'accepted' as const }));
      const summary = generateOnboardingSummary(wf);
      expect(summary).toContain('completado');
    });
  });
});
