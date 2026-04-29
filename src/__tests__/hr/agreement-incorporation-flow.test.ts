import { describe, it, expect } from 'vitest';
import {
  deriveIncorporationFlow,
  type AgreementIncorporationState,
} from '@/lib/hr/agreementIncorporationFlow';
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

function base(): UnifiedAgreementRow {
  return {
    key: 'X',
    display_name: 'X',
    origin: 'operative',
    mappings_count: 0,
    runtime_settings_count: 0,
    badges: [],
  };
}

describe('B12.3 — deriveIncorporationFlow', () => {
  it('LEGACY_ONLY when only operative is present', () => {
    const row: UnifiedAgreementRow = { ...base(), origin: 'operative', operative: { id: 'op-1' } };
    const f = deriveIncorporationFlow(row);
    expect(f.state).toBe<AgreementIncorporationState>('LEGACY_ONLY');
    expect(f.ctaLabel).toBe('Preparar incorporación');
    expect(f.steps.length).toBeGreaterThan(0);
  });

  it('REGISTRY_METADATA_ONLY when registry data_completeness=metadata_only', () => {
    const row: UnifiedAgreementRow = {
      ...base(),
      origin: 'registry',
      registry: { id: 'r-1', data_completeness: 'metadata_only', ready_for_payroll: false },
    };
    const f = deriveIncorporationFlow(row);
    expect(f.state).toBe('REGISTRY_METADATA_ONLY');
    expect(f.ctaLabel).toBe('Completar fuente oficial');
  });

  it('REGISTRY_PARSED_PARTIAL when salary_tables_loaded=true and ready_for_payroll!=true', () => {
    const row: UnifiedAgreementRow = {
      ...base(),
      origin: 'registry',
      registry: { id: 'r-2', salary_tables_loaded: true, ready_for_payroll: false },
    };
    const f = deriveIncorporationFlow(row);
    expect(f.state).toBe('REGISTRY_PARSED_PARTIAL');
    expect(f.ctaLabel).toBe('Enviar a validación humana');
  });

  it('REGISTRY_READY when ready_for_payroll=true', () => {
    const row: UnifiedAgreementRow = {
      ...base(),
      origin: 'both',
      operative: { id: 'op-3' },
      registry: { id: 'r-3', ready_for_payroll: true },
    };
    const f = deriveIncorporationFlow(row);
    expect(f.state).toBe('REGISTRY_READY');
    expect(f.ctaLabel).toBe('Preparar mapping');
  });

  it('UNKNOWN when nothing classifiable', () => {
    const row: UnifiedAgreementRow = { ...base(), origin: 'candidate' };
    const f = deriveIncorporationFlow(row);
    expect(f.state).toBe('UNKNOWN');
    expect(f.ctaLabel).toBeNull();
  });

  it('output is deterministic for the same input', () => {
    const row: UnifiedAgreementRow = {
      ...base(),
      origin: 'registry',
      registry: { id: 'r-1', data_completeness: 'metadata_only' },
    };
    expect(deriveIncorporationFlow(row)).toEqual(deriveIncorporationFlow(row));
  });

  it('blockers reported when registry id missing in parsed_partial', () => {
    const row: UnifiedAgreementRow = {
      ...base(),
      origin: 'registry',
      registry: { id: '', salary_tables_loaded: true, ready_for_payroll: false },
    };
    const f = deriveIncorporationFlow(row);
    expect(f.state).toBe('REGISTRY_PARSED_PARTIAL');
    expect(f.blockers.length).toBeGreaterThan(0);
  });
});
