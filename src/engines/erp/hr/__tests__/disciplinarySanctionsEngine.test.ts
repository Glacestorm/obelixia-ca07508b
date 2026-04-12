import { describe, it, expect } from 'vitest';
import {
  getSanctionTypes,
  getSanctionTypesBySeverity,
  getSanctionTypeByCode,
  checkPrescription,
  createDossier,
  transitionDossier,
  addEvidence,
  generateSanctionLetter,
  getSeverityLabel,
  getStatusLabel,
  getValidTransitions,
  getPrescriptionRules,
} from '../disciplinarySanctionsEngine';

describe('disciplinarySanctionsEngine', () => {
  describe('getSanctionTypes', () => {
    it('returns full catalog with 11 types', () => {
      expect(getSanctionTypes()).toHaveLength(11);
    });

    it('filters by severity', () => {
      expect(getSanctionTypesBySeverity('leve')).toHaveLength(3);
      expect(getSanctionTypesBySeverity('grave')).toHaveLength(4);
      expect(getSanctionTypesBySeverity('muy_grave')).toHaveLength(4);
    });

    it('finds by code', () => {
      const t = getSanctionTypeByCode('MG03');
      expect(t?.severity).toBe('muy_grave');
      expect(t?.legalBasis).toContain('54.2.d');
    });
  });

  describe('checkPrescription', () => {
    it('leve prescribes in 10 days from knowledge', () => {
      const p = checkPrescription('leve', '2026-04-01', '2026-04-05', '2026-04-05');
      expect(p.prescriptionDaysFromKnowledge).toBe(10);
      expect(p.daysRemaining).toBe(10);
      expect(p.isExpired).toBe(false);
      expect(p.urgencyLevel).toBe('ok');
    });

    it('grave prescribes in 20 days from knowledge', () => {
      const p = checkPrescription('grave', '2026-04-01', '2026-04-05', '2026-04-05');
      expect(p.prescriptionDaysFromKnowledge).toBe(20);
      expect(p.daysRemaining).toBe(20);
    });

    it('muy_grave prescribes in 60 days from knowledge', () => {
      const p = checkPrescription('muy_grave', '2026-04-01', '2026-04-05', '2026-04-05');
      expect(p.prescriptionDaysFromKnowledge).toBe(60);
    });

    it('detects expired prescription', () => {
      const p = checkPrescription('leve', '2025-01-01', '2025-01-05', '2026-04-12');
      expect(p.isExpired).toBe(true);
      expect(p.urgencyLevel).toBe('expired');
    });

    it('detects critical urgency', () => {
      const p = checkPrescription('leve', '2026-04-01', '2026-04-10', '2026-04-18');
      expect(p.daysRemaining).toBe(2);
      expect(p.urgencyLevel).toBe('critical');
    });

    it('uses absolute deadline when earlier', () => {
      // Facts 5 months ago, knowledge today → absolute (6mo) may be earlier than knowledge+60d
      const p = checkPrescription('muy_grave', '2025-10-15', '2026-04-10', '2026-04-10');
      // Absolute = 2026-04-15, knowledge+60 = 2026-06-09 → absolute wins
      expect(p.effectiveDeadline.getTime()).toBe(p.absoluteDeadline.getTime());
    });
  });

  describe('createDossier', () => {
    it('creates dossier with draft status', () => {
      const d = createDossier({
        employeeId: 'e1',
        employeeName: 'Test',
        severity: 'grave',
        sanctionTypeCode: 'G01',
        factsDescription: 'Faltas de asistencia',
        factsDate: '2026-04-01',
        knowledgeDate: '2026-04-05',
      });
      expect(d.status).toBe('draft');
      expect(d.timeline).toHaveLength(1);
      expect(d.evidence).toHaveLength(0);
      expect(d.hearingRequired).toBe(false);
    });

    it('requires hearing for muy_grave', () => {
      const d = createDossier({
        employeeId: 'e1',
        employeeName: 'Test',
        severity: 'muy_grave',
        sanctionTypeCode: 'MG01',
        factsDescription: 'Reiteración faltas',
        factsDate: '2026-04-01',
        knowledgeDate: '2026-04-05',
      });
      expect(d.hearingRequired).toBe(true);
    });
  });

  describe('transitionDossier', () => {
    const base = createDossier({
      employeeId: 'e1', employeeName: 'Test', severity: 'grave',
      sanctionTypeCode: 'G01', factsDescription: 'Test',
      factsDate: '2026-04-01', knowledgeDate: '2026-04-05',
    });

    it('allows valid transition draft → investigation', () => {
      const { success, dossier } = transitionDossier(base, 'investigation');
      expect(success).toBe(true);
      expect(dossier.status).toBe('investigation');
      expect(dossier.timeline).toHaveLength(2);
    });

    it('rejects invalid transition draft → executed', () => {
      const { success, error } = transitionDossier(base, 'executed');
      expect(success).toBe(false);
      expect(error).toContain('no válida');
    });

    it('records notifiedAt on notification', () => {
      let d = base;
      d = transitionDossier(d, 'investigation').dossier;
      d = transitionDossier(d, 'proposed').dossier;
      d = transitionDossier(d, 'notified').dossier;
      expect(d.notifiedAt).toBeTruthy();
    });

    it('records resolvedAt on execution', () => {
      let d = base;
      d = transitionDossier(d, 'investigation').dossier;
      d = transitionDossier(d, 'proposed').dossier;
      d = transitionDossier(d, 'notified').dossier;
      d = transitionDossier(d, 'executed').dossier;
      expect(d.resolvedAt).toBeTruthy();
    });
  });

  describe('addEvidence', () => {
    it('adds evidence and timeline entry', () => {
      const d = createDossier({
        employeeId: 'e1', employeeName: 'Test', severity: 'leve',
        sanctionTypeCode: 'L01', factsDescription: 'Test',
        factsDate: '2026-04-01', knowledgeDate: '2026-04-05',
      });
      const updated = addEvidence(d, {
        type: 'document',
        title: 'Registro de control horario',
        attachedBy: 'admin',
      });
      expect(updated.evidence).toHaveLength(1);
      expect(updated.timeline).toHaveLength(2);
    });
  });

  describe('generateSanctionLetter', () => {
    it('generates letter with all fields', () => {
      const letter = generateSanctionLetter({
        employeeName: 'Juan Pérez',
        companyName: 'Acme SL',
        severity: 'grave',
        factsDescription: 'Ausencias injustificadas los días 1, 2 y 3 de abril.',
        factsDate: '01/04/2026',
        legalBasis: 'Art. 54.2.a ET',
        proposedSanction: 'Suspensión de empleo y sueldo de 5 días',
        notificationDate: '10/04/2026',
      });
      expect(letter).toContain('Juan Pérez');
      expect(letter).toContain('FALTA GRAVE');
      expect(letter).toContain('Art. 114 LRJS');
      expect(letter).toContain('Requiere revisión jurídica');
    });
  });

  describe('helpers', () => {
    it('getSeverityLabel returns Spanish', () => {
      expect(getSeverityLabel('muy_grave')).toBe('Muy grave');
    });
    it('getStatusLabel returns Spanish', () => {
      expect(getStatusLabel('hearing')).toBe('Audiencia');
    });
    it('getValidTransitions returns correct transitions', () => {
      expect(getValidTransitions('draft')).toContain('investigation');
      expect(getValidTransitions('executed')).toHaveLength(0);
    });
    it('getPrescriptionRules returns all severities', () => {
      const r = getPrescriptionRules();
      expect(r.leve.daysFromKnowledge).toBe(10);
      expect(r.grave.daysFromKnowledge).toBe(20);
      expect(r.muy_grave.daysFromKnowledge).toBe(60);
    });
  });
});
