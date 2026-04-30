/**
 * B11.2C.3 — Pure visual compliance helper.
 *
 * Detects whether a row's `payslip_label` preserves the relevant agreement
 * keyword present in `concept_literal_from_agreement`. This mirrors the
 * server-side enforcement (trigger `enforce_staging_approval_rules`) so the
 * reviewer sees the blocker BEFORE submitting an approval.
 *
 * No imports from payroll bridge / payroll engine / payslip engine /
 * salary normalizer / agreement salary resolver.
 */

export const AGREEMENT_KEYWORDS = [
  'transporte',
  'nocturnidad',
  'festivo',
  'antigüedad',
  'antiguedad',
  'dieta',
  'kilomet',
  'responsabilidad',
  'convenio',
] as const;

function normalize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

export interface PayslipLabelBlocker {
  hasBlocker: boolean;
  missingKeywords: string[];
  message: string;
}

export function checkPayslipLabelPreservesLiteral(
  conceptLiteral: string | null | undefined,
  payslipLabel: string | null | undefined,
): PayslipLabelBlocker {
  const concept = normalize(conceptLiteral);
  const label = normalize(payslipLabel);
  const missing: string[] = [];
  for (const kw of AGREEMENT_KEYWORDS) {
    if (concept.includes(kw) && !label.includes(kw)) {
      missing.push(kw);
    }
  }
  return {
    hasBlocker: missing.length > 0,
    missingKeywords: missing,
    message:
      missing.length > 0
        ? 'La etiqueta de nómina debe conservar el literal relevante del convenio.'
        : '',
  };
}