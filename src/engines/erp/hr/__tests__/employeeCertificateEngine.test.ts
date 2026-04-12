/**
 * Tests — employeeCertificateEngine (C6)
 */
import { describe, it, expect } from 'vitest';
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_DISCLAIMER,
  generateVerificationCode,
  computeSeniority,
  generateCertificateContent,
  emitCertificate,
  validateCertificateRequest,
  type CertificateRequest,
  type EmployeeData,
} from '../employeeCertificateEngine';

const mockEmployee: EmployeeData = {
  id: 'emp-1',
  firstName: 'María',
  lastName: 'García López',
  nationalId: '12345678Z',
  hireDate: '2020-03-15',
  jobTitle: 'Analista Senior',
  department: 'Tecnología',
  baseSalary: 3200,
  contractType: 'Indefinido',
  companyName: 'Acme Corp S.L.',
  companyCif: 'B12345678',
  status: 'active',
};

function makeRequest(type: CertificateRequest['type'], overrides?: Partial<EmployeeData>): CertificateRequest {
  return {
    type,
    employee: { ...mockEmployee, ...overrides },
    requestedAt: new Date().toISOString(),
    requestedBy: 'user-1',
  };
}

describe('employeeCertificateEngine', () => {
  describe('CERTIFICATE_TYPES', () => {
    it('defines exactly 4 certificate types', () => {
      expect(CERTIFICATE_TYPES).toHaveLength(4);
    });

    it('each type has required fields list', () => {
      for (const t of CERTIFICATE_TYPES) {
        expect(t.requiredFields.length).toBeGreaterThan(0);
        expect(t.label.length).toBeGreaterThan(5);
      }
    });
  });

  describe('generateVerificationCode', () => {
    it('produces CERT-XXXX-XXXX-XXXX format', () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^CERT-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, generateVerificationCode));
      expect(codes.size).toBe(100);
    });

    it('excludes ambiguous characters (0, O, 1, I)', () => {
      const codes = Array.from({ length: 50 }, generateVerificationCode).join('');
      expect(codes).not.toMatch(/[01OI]/);
    });
  });

  describe('computeSeniority', () => {
    it('computes correct years/months/days', () => {
      const result = computeSeniority('2020-01-01', '2023-06-15');
      expect(result.years).toBe(3);
      expect(result.months).toBe(5);
      expect(result.days).toBe(14);
    });

    it('handles same-day hire', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = computeSeniority(today);
      expect(result.totalDays).toBe(0);
      expect(result.formatted).toContain('0 días');
    });

    it('returns formatted string', () => {
      const result = computeSeniority('2020-01-01', '2022-07-10');
      expect(result.formatted).toContain('año');
      expect(result.formatted).toContain('mes');
    });
  });

  describe('generateCertificateContent', () => {
    it('generates seniority certificate with correct title', () => {
      const content = generateCertificateContent(makeRequest('seniority'));
      expect(content.title).toBe('CERTIFICADO DE ANTIGÜEDAD');
      expect(content.bodyParagraphs.length).toBeGreaterThan(2);
      expect(content.bodyParagraphs.some(p => p.includes('antigüedad'))).toBe(true);
    });

    it('generates employment status certificate', () => {
      const content = generateCertificateContent(makeRequest('employment_status'));
      expect(content.title).toBe('CERTIFICADO DE SITUACIÓN LABORAL');
      expect(content.bodyParagraphs.some(p => p.includes('alta'))).toBe(true);
    });

    it('generates annual compensation certificate', () => {
      const content = generateCertificateContent(makeRequest('annual_compensation'));
      expect(content.title).toBe('CERTIFICADO DE RETRIBUCIONES ANUALES');
      expect(content.bodyParagraphs.some(p => p.includes('retribución'))).toBe(true);
    });

    it('generates general employment certificate', () => {
      const content = generateCertificateContent(makeRequest('general_employment'));
      expect(content.title).toBe('CERTIFICADO LABORAL DE EMPRESA');
    });

    it('includes company CIF when available', () => {
      const content = generateCertificateContent(makeRequest('seniority'));
      expect(content.bodyParagraphs[0]).toContain('CIF: B12345678');
    });

    it('includes disclaimer', () => {
      const content = generateCertificateContent(makeRequest('seniority'));
      expect(content.disclaimer).toBe(CERTIFICATE_DISCLAIMER);
      expect(content.disclaimer).toContain('NO constituye un certificado oficial');
    });
  });

  describe('emitCertificate', () => {
    it('produces a complete emission with seal', async () => {
      const emission = await emitCertificate(makeRequest('seniority'));
      expect(emission.id).toBeTruthy();
      expect(emission.verificationCode).toMatch(/^CERT-/);
      expect(emission.sealHash).toHaveLength(64);
      expect(emission.content.title).toBe('CERTIFICADO DE ANTIGÜEDAD');
      expect(emission.metadata.engineVersion).toBe('1.0.0');
      expect(emission.metadata.generationMs).toBeGreaterThanOrEqual(0);
    });

    it('generates unique ids per emission', async () => {
      const e1 = await emitCertificate(makeRequest('seniority'));
      const e2 = await emitCertificate(makeRequest('seniority'));
      expect(e1.id).not.toBe(e2.id);
      expect(e1.verificationCode).not.toBe(e2.verificationCode);
      expect(e1.sealHash).not.toBe(e2.sealHash);
    });
  });

  describe('validateCertificateRequest', () => {
    it('passes for complete request', () => {
      const result = validateCertificateRequest(makeRequest('seniority'));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for missing name', () => {
      const result = validateCertificateRequest(makeRequest('seniority', { firstName: '' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Nombre'))).toBe(true);
    });

    it('fails for missing nationalId', () => {
      const result = validateCertificateRequest(makeRequest('seniority', { nationalId: '' }));
      expect(result.valid).toBe(false);
    });

    it('fails for compensation cert without salary', () => {
      const result = validateCertificateRequest(makeRequest('annual_compensation', { baseSalary: undefined }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Salario'))).toBe(true);
    });

    it('fails for unknown certificate type', () => {
      const req = makeRequest('seniority');
      (req as any).type = 'unknown_type';
      const result = validateCertificateRequest(req);
      expect(result.valid).toBe(false);
    });
  });
});
