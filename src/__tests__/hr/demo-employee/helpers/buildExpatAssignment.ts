/**
 * Helper interno de tests — Construye un MobilityAssignment determinista
 * para el empleado DEMO Carlos Ruiz Martín.
 *
 * Reglas:
 *  - No usa DB, no usa red.
 *  - No invoca código de producción de UI/hooks.
 *  - Sólo construye un objeto que cumple el shape de MobilityAssignment.
 *  - Pensado para alimentar evaluateExpatriateSupervisor en tests E2E.
 */

import type { MobilityAssignment } from '@/hooks/erp/hr/useGlobalMobility';

export type ExpatVariant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface VariantSpec {
  id: ExpatVariant;
  label: string;
  host: string;
  assignmentType: MobilityAssignment['assignment_type'];
  daysInHost: number;
  splitPayroll: boolean;
  shadowPayroll: boolean;
  peRiskFlag: boolean;
  stockOptionsActive: boolean;
  expectsCorridorPack: boolean;
}

export const EXPAT_VARIANTS: Record<ExpatVariant, VariantSpec> = {
  A: { id: 'A', label: 'Base ES→FR', host: 'FR', assignmentType: 'short_term', daysInHost: 120, splitPayroll: false, shadowPayroll: false, peRiskFlag: false, stockOptionsActive: false, expectsCorridorPack: true },
  B: { id: 'B', label: 'Split payroll ES→DE', host: 'DE', assignmentType: 'long_term', daysInHost: 120, splitPayroll: true, shadowPayroll: false, peRiskFlag: false, stockOptionsActive: false, expectsCorridorPack: true },
  C: { id: 'C', label: 'Shadow payroll ES→US', host: 'US', assignmentType: 'long_term', daysInHost: 120, splitPayroll: false, shadowPayroll: true, peRiskFlag: false, stockOptionsActive: false, expectsCorridorPack: true },
  D: { id: 'D', label: 'PE risk ES→FR', host: 'FR', assignmentType: 'short_term', daysInHost: 120, splitPayroll: false, shadowPayroll: false, peRiskFlag: true, stockOptionsActive: false, expectsCorridorPack: true },
  E: { id: 'E', label: 'Equity overlap ES→DE', host: 'DE', assignmentType: 'long_term', daysInHost: 120, splitPayroll: false, shadowPayroll: false, peRiskFlag: false, stockOptionsActive: true, expectsCorridorPack: true },
  F: { id: 'F', label: 'Sin pack ES→JP', host: 'JP', assignmentType: 'long_term', daysInHost: 200, splitPayroll: false, shadowPayroll: false, peRiskFlag: false, stockOptionsActive: false, expectsCorridorPack: false },
};

export function buildExpatAssignment(variant: ExpatVariant): MobilityAssignment {
  const v = EXPAT_VARIANTS[variant];
  const startDate = '2026-04-01';
  // end_date approx start + days_in_host
  const start = new Date(startDate);
  const end = new Date(start.getTime() + v.daysInHost * 86400000);
  const endDate = end.toISOString().slice(0, 10);

  return {
    id: `mob-carlos-variant-${v.id}`,
    company_id: 'demo-company-1',
    employee_id: 'emp-carlos-ruiz',
    assignment_type: v.assignmentType,
    status: 'active',
    home_country_code: 'ES',
    host_country_code: v.host,
    home_legal_entity_id: null,
    host_legal_entity_id: null,
    payroll_country_code: v.splitPayroll ? v.host : 'ES',
    tax_residence_country: 'ES',
    ss_regime_country: 'ES',
    start_date: startDate,
    end_date: endDate,
    actual_end_date: null,
    currency_code: 'EUR',
    compensation_approach: 'tax_equalization',
    split_payroll: v.splitPayroll,
    shadow_payroll: v.shadowPayroll,
    hypothetical_tax: null,
    allowance_package: { housing: 1200, cola: 300, relocation: 4000 },
    total_monthly_cost: 5800,
    risk_level: v.peRiskFlag ? 'high' : 'medium',
    job_title_host: 'Senior Engineer (host)',
    reporting_to: null,
    assignment_letter_ref: 'LETTER-DEMO-001',
    days_in_host: v.daysInHost,
    pe_risk_flag: v.peRiskFlag,
    metadata: {
      stock_options_active: v.stockOptionsActive,
      equity_grants_active: v.stockOptionsActive,
      work_permit_required: ['US', 'JP', 'CH', 'GB'].includes(v.host),
    },
  } as unknown as MobilityAssignment;
}

/** Lista variantes para iterar en describe.each */
export const ALL_VARIANTS: VariantSpec[] = Object.values(EXPAT_VARIANTS);