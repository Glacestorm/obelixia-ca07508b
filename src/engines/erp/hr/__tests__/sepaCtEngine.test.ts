import { describe, it, expect } from 'vitest';
import {
  validateIBAN,
  validateBatch,
  generateSEPACTXml,
  canTransition,
  evaluateValidationReadiness,
  computeBatchSummary,
  type SEPACTBatch,
  type SEPACTCompanyInfo,
  type SEPACTLine,
} from '@/engines/erp/hr/sepaCtEngine';

const mockCompany: SEPACTCompanyInfo = {
  name: 'Empresa Test S.L.',
  cif: 'B12345678',
  iban: 'ES9121000418450200051332', // Valid Spanish IBAN
  bic: 'CAIXESBBXXX',
};

function makeLine(overrides?: Partial<SEPACTLine>): SEPACTLine {
  return {
    id: 'line-001',
    employeeId: 'emp-001',
    employeeName: 'García, Ana',
    iban: 'ES7921000813610123456789', // Valid Spanish IBAN
    amount: 1850.45,
    currency: 'EUR',
    concept: 'Nómina 2026-06',
    sourceType: 'payroll',
    sourceId: 'rec-001',
    excluded: false,
    ...overrides,
  };
}

function makeBatch(lines: SEPACTLine[], overrides?: Partial<SEPACTBatch>): SEPACTBatch {
  const active = lines.filter(l => !l.excluded);
  return {
    id: 'batch-001',
    companyId: 'comp-001',
    status: 'draft',
    periodLabel: '2026-06',
    requestedExecutionDate: '2026-06-28',
    lines,
    totalAmount: active.reduce((s, l) => s + l.amount, 0),
    lineCount: active.length,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── IBAN Validation ────────────────────────────────────────────

describe('validateIBAN', () => {
  it('accepts valid Spanish IBAN', () => {
    expect(validateIBAN('ES9121000418450200051332')).toBe(true);
  });

  it('accepts IBAN with spaces', () => {
    expect(validateIBAN('ES91 2100 0418 4502 0005 1332')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateIBAN('')).toBe(false);
  });

  it('rejects too short', () => {
    expect(validateIBAN('ES91210004')).toBe(false);
  });

  it('rejects invalid checksum', () => {
    expect(validateIBAN('ES0021000418450200051332')).toBe(false);
  });

  it('accepts valid German IBAN', () => {
    expect(validateIBAN('DE89370400440532013000')).toBe(true);
  });

  it('accepts valid French IBAN', () => {
    expect(validateIBAN('FR7630006000011234567890189')).toBe(true);
  });
});

// ─── Batch Validation ───────────────────────────────────────────

describe('validateBatch', () => {
  it('returns no errors for valid batch', () => {
    const batch = makeBatch([makeLine()]);
    const issues = validateBatch(batch, mockCompany);
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('detects missing employee IBAN', () => {
    const batch = makeBatch([makeLine({ iban: '' })]);
    const issues = validateBatch(batch, mockCompany);
    expect(issues.some(i => i.field === 'iban' && i.severity === 'error')).toBe(true);
  });

  it('detects invalid employee IBAN', () => {
    const batch = makeBatch([makeLine({ iban: 'ES0000000000000000000000' })]);
    const issues = validateBatch(batch, mockCompany);
    expect(issues.some(i => i.field === 'iban' && i.message.includes('inválido'))).toBe(true);
  });

  it('detects zero/negative amount', () => {
    const batch = makeBatch([makeLine({ amount: 0 })]);
    const issues = validateBatch(batch, mockCompany);
    expect(issues.some(i => i.field === 'amount')).toBe(true);
  });

  it('detects duplicate sources', () => {
    const line1 = makeLine({ id: 'l1' });
    const line2 = makeLine({ id: 'l2' }); // same sourceType + sourceId
    const batch = makeBatch([line1, line2]);
    const issues = validateBatch(batch, mockCompany);
    expect(issues.some(i => i.field === 'source')).toBe(true);
  });

  it('skips excluded lines in validation', () => {
    const batch = makeBatch([makeLine({ excluded: true, iban: '' })]);
    const issues = validateBatch(batch, mockCompany);
    // Only the "no active lines" error should be present
    expect(issues.some(i => i.field === 'lines')).toBe(true);
    expect(issues.some(i => i.field === 'iban')).toBe(false);
  });

  it('detects invalid company IBAN', () => {
    const batch = makeBatch([makeLine()]);
    const issues = validateBatch(batch, { ...mockCompany, iban: 'INVALID' });
    expect(issues.some(i => i.field === 'company_iban')).toBe(true);
  });
});

// ─── XML Generation ─────────────────────────────────────────────

describe('generateSEPACTXml', () => {
  it('generates valid XML structure', () => {
    const batch = makeBatch([makeLine()]);
    const xml = generateSEPACTXml(batch, mockCompany);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('pain.001.001.03');
    expect(xml).toContain('<CstmrCdtTrfInitn>');
    expect(xml).toContain('<NbOfTxs>1</NbOfTxs>');
    expect(xml).toContain('<PmtMtd>TRF</PmtMtd>');
    expect(xml).toContain('<Cd>SEPA</Cd>');
    expect(xml).toContain('<ChrgBr>SLEV</ChrgBr>');
  });

  it('includes company IBAN in DbtrAcct', () => {
    const batch = makeBatch([makeLine()]);
    const xml = generateSEPACTXml(batch, mockCompany);
    expect(xml).toContain(`<IBAN>${mockCompany.iban}</IBAN>`);
  });

  it('includes employee data in CdtTrfTxInf', () => {
    const line = makeLine({ employeeName: 'López, Carlos' });
    const batch = makeBatch([line]);
    const xml = generateSEPACTXml(batch, mockCompany);
    expect(xml).toContain('López, Carlos');
    expect(xml).toContain(line.iban);
    expect(xml).toContain('1850.45');
  });

  it('excludes excluded lines from XML', () => {
    const batch = makeBatch([
      makeLine({ id: 'l1', employeeName: 'Incluido' }),
      makeLine({ id: 'l2', employeeName: 'Excluido', excluded: true, sourceId: 'rec-002' }),
    ]);
    const xml = generateSEPACTXml(batch, mockCompany);
    expect(xml).toContain('Incluido');
    expect(xml).not.toContain('Excluido');
    expect(xml).toContain('<NbOfTxs>1</NbOfTxs>');
  });

  it('handles BIC correctly', () => {
    const batch = makeBatch([makeLine({ bic: 'BBVAESMMXXX' })]);
    const xml = generateSEPACTXml(batch, mockCompany);
    expect(xml).toContain('<BIC>BBVAESMMXXX</BIC>');
  });
});

// ─── State Machine ──────────────────────────────────────────────

describe('canTransition', () => {
  it('allows draft → validated', () => {
    expect(canTransition('draft', 'validated').allowed).toBe(true);
  });

  it('allows validated → generated', () => {
    expect(canTransition('validated', 'generated').allowed).toBe(true);
  });

  it('allows generated → exported', () => {
    expect(canTransition('generated', 'exported').allowed).toBe(true);
  });

  it('allows exported → paid', () => {
    expect(canTransition('exported', 'paid').allowed).toBe(true);
  });

  it('blocks draft → paid', () => {
    const result = canTransition('draft', 'paid');
    expect(result.allowed).toBe(false);
  });

  it('blocks paid → anything', () => {
    expect(canTransition('paid', 'draft').allowed).toBe(false);
    expect(canTransition('paid', 'cancelled').allowed).toBe(false);
  });

  it('allows cancel from any non-terminal state', () => {
    expect(canTransition('draft', 'cancelled').allowed).toBe(true);
    expect(canTransition('validated', 'cancelled').allowed).toBe(true);
    expect(canTransition('generated', 'cancelled').allowed).toBe(true);
    expect(canTransition('exported', 'cancelled').allowed).toBe(true);
  });
});

// ─── Batch Summary ──────────────────────────────────────────────

describe('computeBatchSummary', () => {
  it('computes correct summary for mixed batch', () => {
    const lines: SEPACTLine[] = [
      makeLine({ id: 'l1', sourceId: 'r1', amount: 1000 }),
      makeLine({ id: 'l2', sourceId: 'r2', amount: 2000, sourceType: 'settlement' }),
      makeLine({ id: 'l3', sourceId: 'r3', amount: 500, excluded: true }),
    ];
    const batch = makeBatch(lines);
    const summary = computeBatchSummary(batch, mockCompany);

    expect(summary.totalLines).toBe(3);
    expect(summary.activeLines).toBe(2);
    expect(summary.excludedLines).toBe(1);
    expect(summary.totalAmount).toBe(3000);
    expect(summary.payrollLines).toBe(1);
    expect(summary.settlementLines).toBe(1);
    expect(summary.payrollAmount).toBe(1000);
    expect(summary.settlementAmount).toBe(2000);
  });
});

// ─── Validation Readiness ───────────────────────────────────────

describe('evaluateValidationReadiness', () => {
  it('allows validation for clean batch', () => {
    const batch = makeBatch([makeLine()]);
    const result = evaluateValidationReadiness(batch, mockCompany);
    expect(result.allowed).toBe(true);
  });

  it('blocks validation when errors exist', () => {
    const batch = makeBatch([makeLine({ iban: '' })]);
    const result = evaluateValidationReadiness(batch, mockCompany);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });
});
