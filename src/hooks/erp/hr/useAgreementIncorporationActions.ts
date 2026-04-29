/**
 * B12.3 — Pure routing actions for the incorporation wizard.
 *
 * Each function takes a UnifiedAgreementRow and returns a plain
 * { targetTab, filters, blockers? } descriptor used by the Hub to switch
 * tabs and pre-apply filters. NO database access. NO edge invokes.
 * NO writes of any kind.
 */
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

export type WizardTargetTab =
  | 'registry'
  | 'validation'
  | 'mapping'
  | 'runtime'
  | 'missing';

export interface WizardActionResult {
  targetTab: WizardTargetTab;
  filters: Record<string, unknown>;
  blockers?: string[];
}

function internalCode(row: UnifiedAgreementRow): string | undefined {
  // The Hub key already prefers internal_code when available.
  return row.key;
}

export function openInRegistryMaster(row: UnifiedAgreementRow): WizardActionResult {
  return {
    targetTab: 'registry',
    filters: { internal_code: internalCode(row) },
  };
}

export function openValidation(row: UnifiedAgreementRow): WizardActionResult {
  const blockers: string[] = [];
  if (!row.registry?.id) blockers.push('Falta agreement_id en Registry');
  return {
    targetTab: 'validation',
    filters: {
      agreement_id: row.registry?.id,
      internal_code: internalCode(row),
    },
    blockers: blockers.length ? blockers : undefined,
  };
}

export function openMapping(row: UnifiedAgreementRow): WizardActionResult {
  const blockers: string[] = [];
  if (!row.registry?.id) blockers.push('Falta registry_agreement_id');
  return {
    targetTab: 'mapping',
    filters: {
      registry_agreement_id: row.registry?.id,
      internal_code: internalCode(row),
    },
    blockers: blockers.length ? blockers : undefined,
  };
}

export function openRuntimeApply(row: UnifiedAgreementRow): WizardActionResult {
  const blockers: string[] = [];
  if (!row.registry?.id) blockers.push('Falta registry_agreement_id');
  if (row.registry?.ready_for_payroll !== true) {
    blockers.push('Registry no está ready_for_payroll');
  }
  return {
    targetTab: 'runtime',
    filters: {
      registry_agreement_id: row.registry?.id,
      internal_code: internalCode(row),
    },
    blockers: blockers.length ? blockers : undefined,
  };
}

export function prepareOfficialSourceChecklist(
  row: UnifiedAgreementRow,
): WizardActionResult {
  return {
    targetTab: 'registry',
    filters: { internal_code: internalCode(row), checklist: 'official_source' },
  };
}

export function prepareParserChecklist(
  row: UnifiedAgreementRow,
): WizardActionResult {
  return {
    targetTab: 'registry',
    filters: { internal_code: internalCode(row), checklist: 'parser' },
  };
}

export function useAgreementIncorporationActions() {
  return {
    openInRegistryMaster,
    openValidation,
    openMapping,
    openRuntimeApply,
    prepareOfficialSourceChecklist,
    prepareParserChecklist,
  };
}

export default useAgreementIncorporationActions;
