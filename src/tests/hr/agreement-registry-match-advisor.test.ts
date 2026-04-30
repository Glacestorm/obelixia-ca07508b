/**
 * B12.3B — Unit tests for the read-only deterministic registry match advisor.
 */
import { describe, it, expect } from 'vitest';
import {
  suggestRegistryMatches,
  normalizeText,
  type RegistryCandidateInput,
} from '@/lib/hr/agreementRegistryMatchAdvisor';

const TIC_NAC: RegistryCandidateInput = {
  id: 'reg-tic-nac',
  internal_code: 'TIC-NAC',
  official_name:
    'XIX Convenio colectivo estatal de empresas de consultoría, tecnologías de la información y estudios de mercado y de la opinión pública',
  jurisdiction_code: 'ES',
  data_completeness: 'metadata_only',
  source_quality: 'medium',
  ready_for_payroll: false,
};

const OP_CONSULTORIAS = {
  agreementCode: 'CONSULTORIAS_ESTATAL_2026',
  name: 'Convenio Colectivo Estatal de Empresas de Consultoría y Estudios de Mercado y de la Opinión Pública',
  jurisdiction: 'ES',
};

describe('B12.3B — agreementRegistryMatchAdvisor', () => {
  it('normalizeText strips diacritics and punctuation deterministically', () => {
    expect(normalizeText('Consultoría, Tecnologías!')).toBe('consultoria tecnologias');
    expect(normalizeText('  Opinión   Pública  ')).toBe('opinion publica');
  });

  it('returns a candidate when name is very similar', () => {
    const out = suggestRegistryMatches({
      operative: { name: 'Convenio Estatal de Hostelería', agreementCode: 'X' },
      registryCandidates: [
        { id: 'r1', internal_code: 'HOSTELERIA-ESTATAL', official_name: 'Convenio Estatal de Hosteleria' },
      ],
    });
    expect(out.length).toBe(1);
    expect(out[0].score).toBeGreaterThanOrEqual(50);
  });

  it('CONSULTORIAS_ESTATAL_2026 suggests TIC-NAC with score >= 50 and warnings', () => {
    const out = suggestRegistryMatches({
      operative: OP_CONSULTORIAS,
      registryCandidates: [TIC_NAC],
    });
    expect(out.length).toBe(1);
    const c = out[0];
    expect(c.internalCode).toBe('TIC-NAC');
    expect(c.score).toBeGreaterThanOrEqual(50);
    // No automatic linking warning is always present.
    expect(c.warnings.some((w) => /NO crea v[ií]nculo/i.test(w))).toBe(true);
    // metadata_only warning.
    expect(c.warnings.some((w) => /metadata_only/i.test(w))).toBe(true);
    // ready_for_payroll=false warning.
    expect(c.warnings.some((w) => /ready_for_payroll/i.test(w))).toBe(true);
  });

  it('different codes do NOT block suggestion when name/sector match', () => {
    const out = suggestRegistryMatches({
      operative: OP_CONSULTORIAS,
      registryCandidates: [TIC_NAC],
    });
    expect(out.length).toBe(1);
    const codeSignal = out[0].signals.find((s) => s.key === 'exact_code');
    expect(codeSignal?.matched).toBe(false);
  });

  it('returns no candidate when score < 50', () => {
    const out = suggestRegistryMatches({
      operative: { name: 'Convenio de Panaderia Local', agreementCode: 'PAN-LOC' },
      registryCandidates: [
        { id: 'r1', internal_code: 'METAL-NAC', official_name: 'Convenio Metal Nacional' },
      ],
    });
    expect(out.length).toBe(0);
  });

  it('orders multiple candidates by score desc deterministically', () => {
    const out = suggestRegistryMatches({
      operative: OP_CONSULTORIAS,
      registryCandidates: [
        TIC_NAC,
        {
          id: 'reg-other',
          internal_code: 'CONSULTORIAS-ESTATAL-2026',
          official_name:
            'Convenio Colectivo Estatal de Empresas de Consultoria y Estudios de Mercado y de la Opinion Publica',
          jurisdiction_code: 'ES',
          ready_for_payroll: true,
          data_completeness: 'human_validated',
        },
      ],
    });
    expect(out.length).toBe(2);
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });

  it('does not auto-select when there are multiple candidates (returns all)', () => {
    const out = suggestRegistryMatches({
      operative: OP_CONSULTORIAS,
      registryCandidates: [
        TIC_NAC,
        { ...TIC_NAC, id: 'reg-tic-nac-2', internal_code: 'TIC-NAC-ALT' },
      ],
    });
    expect(out.length).toBe(2);
    // Helper never marks anything as "selected"; consumers must choose.
    for (const c of out) {
      expect(c).not.toHaveProperty('selected');
    }
  });

  it('emits warning when registry is metadata_only', () => {
    const out = suggestRegistryMatches({
      operative: OP_CONSULTORIAS,
      registryCandidates: [TIC_NAC],
    });
    expect(out[0].warnings.some((w) => /metadata_only/i.test(w))).toBe(true);
  });

  it('emits warning when ready_for_payroll=false', () => {
    const out = suggestRegistryMatches({
      operative: OP_CONSULTORIAS,
      registryCandidates: [{ ...TIC_NAC, data_completeness: 'human_validated', ready_for_payroll: false }],
    });
    expect(out[0].warnings.some((w) => /ready_for_payroll/i.test(w))).toBe(true);
  });

  it('is deterministic across repeated calls', () => {
    const a = suggestRegistryMatches({ operative: OP_CONSULTORIAS, registryCandidates: [TIC_NAC] });
    const b = suggestRegistryMatches({ operative: OP_CONSULTORIAS, registryCandidates: [TIC_NAC] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
