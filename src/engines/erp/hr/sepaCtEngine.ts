/**
 * sepaCtEngine.ts — P2.3
 * SEPA Credit Transfer (SCT) domain engine.
 * Generates ISO 20022 pain.001.001.03 XML for payroll / settlement payments.
 *
 * Pure domain logic — no Supabase, no side-effects.
 *
 * AUTOMATION BOUNDARY:
 *   - XML generation is deterministic and safe to automate.
 *   - Banking upload/reconciliation is OUT OF SCOPE (requires manual bank portal).
 *   - IBAN validation uses MOD-97 (ISO 13616). BIC is optional per SEPA regulation.
 */

// ─── Batch States ───────────────────────────────────────────────

export type SEPACTBatchStatus =
  | 'draft'        // Lines being assembled
  | 'validated'    // All lines pass validation
  | 'generated'    // XML produced
  | 'exported'     // Downloaded / sent to bank
  | 'paid'         // Confirmed by treasury
  | 'cancelled';   // Voided

export const SEPACT_VALID_TRANSITIONS: Record<SEPACTBatchStatus, SEPACTBatchStatus[]> = {
  draft:     ['validated', 'cancelled'],
  validated: ['generated', 'draft', 'cancelled'],
  generated: ['exported', 'draft', 'cancelled'],
  exported:  ['paid', 'cancelled'],
  paid:      [],
  cancelled: [],
};

export const SEPACT_STATUS_LABELS: Record<SEPACTBatchStatus, string> = {
  draft:     'Borrador',
  validated: 'Validado',
  generated: 'XML Generado',
  exported:  'Exportado',
  paid:      'Pagado',
  cancelled: 'Anulado',
};

// ─── Data Models ────────────────────────────────────────────────

export interface SEPACTCompanyInfo {
  name: string;
  cif: string;
  iban: string;
  bic?: string;
}

export interface SEPACTLine {
  id: string;
  employeeId: string;
  employeeName: string;
  iban: string;
  bic?: string;
  amount: number;           // Net amount in EUR (cents avoided — decimal)
  currency: string;         // Always 'EUR' for SEPA
  concept: string;          // Remittance info (e.g. "Nómina 2026-06")
  sourceType: 'payroll' | 'settlement';
  sourceId: string;         // payroll_record_id or termination_id
  excluded: boolean;
  exclusionReason?: string;
}

export interface SEPACTBatch {
  id: string;
  companyId: string;
  status: SEPACTBatchStatus;
  periodLabel: string;      // e.g. "2026-06"
  requestedExecutionDate: string; // ISO date
  lines: SEPACTLine[];
  totalAmount: number;
  lineCount: number;
  createdAt: string;
  createdBy?: string;
  validatedAt?: string;
  generatedAt?: string;
  exportedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  xmlContent?: string;
}

// ─── Validation ─────────────────────────────────────────────────

export interface SEPACTValidationIssue {
  lineId: string;
  employeeName: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Validate IBAN using MOD-97 (ISO 13616).
 * Returns true for structurally valid IBANs.
 */
export function validateIBAN(iban: string): boolean {
  if (!iban) return false;
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;

  // Move first 4 chars to end, convert letters to numbers
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  // MOD-97 on large number (process in chunks)
  let remainder = '';
  for (const digit of numeric) {
    remainder += digit;
    const num = parseInt(remainder, 10);
    remainder = String(num % 97);
  }

  return parseInt(remainder, 10) === 1;
}

/**
 * Validate all lines in a batch. Returns issues found.
 */
export function validateBatch(
  batch: SEPACTBatch,
  company: SEPACTCompanyInfo,
): SEPACTValidationIssue[] {
  const issues: SEPACTValidationIssue[] = [];
  const seenSources = new Set<string>();

  // Company-level checks
  if (!company.iban || !validateIBAN(company.iban)) {
    issues.push({
      lineId: '__company__',
      employeeName: company.name,
      field: 'company_iban',
      severity: 'error',
      message: 'IBAN de empresa ausente o inválido',
    });
  }

  const activeLines = batch.lines.filter(l => !l.excluded);

  if (activeLines.length === 0) {
    issues.push({
      lineId: '__batch__',
      employeeName: '',
      field: 'lines',
      severity: 'error',
      message: 'El lote no tiene líneas activas',
    });
  }

  for (const line of activeLines) {
    // IBAN
    if (!line.iban) {
      issues.push({
        lineId: line.id,
        employeeName: line.employeeName,
        field: 'iban',
        severity: 'error',
        message: 'Empleado sin IBAN',
      });
    } else if (!validateIBAN(line.iban)) {
      issues.push({
        lineId: line.id,
        employeeName: line.employeeName,
        field: 'iban',
        severity: 'error',
        message: `IBAN inválido: ${line.iban}`,
      });
    }

    // Amount
    if (line.amount <= 0) {
      issues.push({
        lineId: line.id,
        employeeName: line.employeeName,
        field: 'amount',
        severity: 'error',
        message: `Importe neto <= 0 (${line.amount.toFixed(2)} €)`,
      });
    }

    // Duplicate source
    const sourceKey = `${line.sourceType}:${line.sourceId}`;
    if (seenSources.has(sourceKey)) {
      issues.push({
        lineId: line.id,
        employeeName: line.employeeName,
        field: 'source',
        severity: 'error',
        message: 'Duplicidad de pago — mismo origen ya incluido en el lote',
      });
    }
    seenSources.add(sourceKey);

    // Concept
    if (!line.concept || line.concept.length < 3) {
      issues.push({
        lineId: line.id,
        employeeName: line.employeeName,
        field: 'concept',
        severity: 'warning',
        message: 'Concepto de pago vacío o muy corto',
      });
    }
  }

  return issues;
}

// ─── XML Generation (pain.001.001.03) ───────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function formatDateTime(iso: string): string {
  return iso.replace(/\.\d{3}Z$/, 'Z').replace(/Z$/, '') || new Date().toISOString().replace(/\.\d{3}Z$/, '');
}

/**
 * Generate ISO 20022 pain.001.001.03 XML.
 * Returns the full XML string.
 *
 * IMPORTANT: This produces structurally valid SEPA CT XML.
 * Bank-specific extensions or national practices may require adjustments.
 */
export function generateSEPACTXml(
  batch: SEPACTBatch,
  company: SEPACTCompanyInfo,
): string {
  const activeLines = batch.lines.filter(l => !l.excluded);
  const totalAmount = activeLines.reduce((s, l) => s + l.amount, 0);
  const msgId = `MSG-${batch.id.slice(0, 8)}-${Date.now()}`;
  const pmtInfId = `PMT-${batch.id.slice(0, 8)}`;
  const creationDateTime = formatDateTime(new Date().toISOString());

  const creditTransferLines = activeLines.map((line, idx) => {
    const endToEndId = `E2E-${line.id.slice(0, 12)}-${idx + 1}`;
    return `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${escapeXml(line.currency)}">${formatAmount(line.amount)}</InstdAmt>
        </Amt>
        ${line.bic ? `<CdtrAgt><FinInstnId><BIC>${escapeXml(line.bic)}</BIC></FinInstnId></CdtrAgt>` : ''}
        <Cdtr>
          <Nm>${escapeXml(line.employeeName.slice(0, 70))}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${escapeXml(line.iban.replace(/\s/g, ''))}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(line.concept.slice(0, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${activeLines.length}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(company.name.slice(0, 70))}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${escapeXml(company.cif)}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${activeLines.length}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${formatDate(batch.requestedExecutionDate)}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(company.name.slice(0, 70))}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${escapeXml(company.cif)}</Id>
            </Othr>
          </OrgId>
        </Id>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${escapeXml(company.iban.replace(/\s/g, ''))}</IBAN>
        </Id>
      </DbtrAcct>
      ${company.bic ? `<DbtrAgt><FinInstnId><BIC>${escapeXml(company.bic)}</BIC></FinInstnId></DbtrAgt>` : '<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>'}
      <ChrgBr>SLEV</ChrgBr>${creditTransferLines}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

// ─── Transition Guards ──────────────────────────────────────────

export interface SEPACTTransitionResult {
  allowed: boolean;
  reason?: string;
}

export function canTransition(
  from: SEPACTBatchStatus,
  to: SEPACTBatchStatus,
): SEPACTTransitionResult {
  const valid = SEPACT_VALID_TRANSITIONS[from] || [];
  if (!valid.includes(to)) {
    return {
      allowed: false,
      reason: `Transición no permitida: ${SEPACT_STATUS_LABELS[from]} → ${SEPACT_STATUS_LABELS[to]}`,
    };
  }
  return { allowed: true };
}

/**
 * Evaluate whether a batch can move to 'validated'.
 */
export function evaluateValidationReadiness(
  batch: SEPACTBatch,
  company: SEPACTCompanyInfo,
): SEPACTTransitionResult {
  const issues = validateBatch(batch, company);
  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    return {
      allowed: false,
      reason: `${errors.length} error(es) de validación pendiente(s): ${errors[0].message}`,
    };
  }
  return { allowed: true };
}

// ─── Batch Summary ──────────────────────────────────────────────

export interface SEPACTBatchSummary {
  totalLines: number;
  activeLines: number;
  excludedLines: number;
  totalAmount: number;
  payrollLines: number;
  settlementLines: number;
  payrollAmount: number;
  settlementAmount: number;
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
}

export function computeBatchSummary(
  batch: SEPACTBatch,
  company: SEPACTCompanyInfo,
): SEPACTBatchSummary {
  const active = batch.lines.filter(l => !l.excluded);
  const excluded = batch.lines.filter(l => l.excluded);
  const payroll = active.filter(l => l.sourceType === 'payroll');
  const settlement = active.filter(l => l.sourceType === 'settlement');
  const issues = validateBatch(batch, company);
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return {
    totalLines: batch.lines.length,
    activeLines: active.length,
    excludedLines: excluded.length,
    totalAmount: active.reduce((s, l) => s + l.amount, 0),
    payrollLines: payroll.length,
    settlementLines: settlement.length,
    payrollAmount: payroll.reduce((s, l) => s + l.amount, 0),
    settlementAmount: settlement.reduce((s, l) => s + l.amount, 0),
    hasErrors: errors.length > 0,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}
