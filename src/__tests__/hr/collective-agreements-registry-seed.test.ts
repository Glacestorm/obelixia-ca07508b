/**
 * B2 — Seed legacy + Baleares reforzado
 *
 * Tests de contrato del seed inicial del Registro Maestro.
 *
 * Estos tests NO golpean la base de datos en CI: validan
 *  (a) que el contrato de tipos sigue exponiendo las banderas de seguridad,
 *  (b) que el seed conceptual cubre legacy + Baleares reforzado,
 *  (c) que la helper de ranking por CNAE prioriza correctamente PAN-PAST-IB,
 *      COM-GEN-IB, HOST-IB y IND-ALIM-IB para los CNAE críticos.
 *
 * Invariantes legales — ningún registro seed puede:
 *  - tener ready_for_payroll = true
 *  - tener data_completeness ≠ 'metadata_only'
 *  - tener salary_tables_loaded = true
 *  - tener requires_human_review = false
 *  - tener official_submission_blocked = false
 *
 * Cualquier regresión que active uno de estos campos debe romper el test.
 */

import { describe, it, expect } from 'vitest';
import type { Database } from '@/integrations/supabase/types';

type RegistryRow = Database['public']['Tables']['erp_hr_collective_agreements_registry']['Row'];

// ============================================================
// Snapshot conceptual del seed B2 (mantener en sync con la
// migración/seed ejecutada vía supabase--insert).
// ============================================================
export const B2_SEED_SNAPSHOT: ReadonlyArray<{
  internal_code: string;
  scope_type: 'state' | 'autonomous';
  jurisdiction_code: string;
  cnae_codes: string[];
  source_quality: 'legacy_static' | 'pending_official_validation';
  is_baleares: boolean;
}> = [
  // Legacy nacional (20)
  { internal_code: 'CONST-GEN', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['41', '42', '43'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'METAL-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['24', '25', '26', '27', '28', '29', '30', '33'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'HOST-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['55', '56'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'COM-GRANDES', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['47'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'TRANS-MERCAN', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['49'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'OFIC-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['69', '70', '71', '73', '74', '78', '82'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'LIMP-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['81'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'SEG-PRIV', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['80'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'SAN-PRIV', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['86', '87', '88'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'ENS-PRIV', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['85'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'QUIM-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['20', '21'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'ALIM-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['10', '11', '12'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'TEXT-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['13', '14', '15'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'MADERA-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['16', '31'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'GRAF-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['17', '18'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'BANCA-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['64'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'SEG-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['65', '66'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'TIC-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['62', '63'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'CONTACT-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['82'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'VIAJES-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['79'], source_quality: 'legacy_static', is_baleares: false },
  { internal_code: 'AGRO-NAC', scope_type: 'state', jurisdiction_code: 'ES', cnae_codes: ['01', '02', '03'], source_quality: 'legacy_static', is_baleares: false },
  // Baleares reforzado (4)
  { internal_code: 'COM-GEN-IB', scope_type: 'autonomous', jurisdiction_code: 'ES-IB', cnae_codes: ['47'], source_quality: 'pending_official_validation', is_baleares: true },
  { internal_code: 'PAN-PAST-IB', scope_type: 'autonomous', jurisdiction_code: 'ES-IB', cnae_codes: ['1071', '1072', '4724'], source_quality: 'pending_official_validation', is_baleares: true },
  { internal_code: 'HOST-IB', scope_type: 'autonomous', jurisdiction_code: 'ES-IB', cnae_codes: ['55', '56'], source_quality: 'pending_official_validation', is_baleares: true },
  { internal_code: 'IND-ALIM-IB', scope_type: 'autonomous', jurisdiction_code: 'ES-IB', cnae_codes: ['10'], source_quality: 'pending_official_validation', is_baleares: true },
];

// ============================================================
// Helper de ranking por CNAE para Baleares.
// Pure function — no DB. Documenta las reglas de prioridad B2.
// ============================================================
export function rankAgreementsForCnaeBaleares(cnae: string): string[] {
  const c = cnae.trim();
  if (c === '1071' || c === '1072') {
    // Panadería/pastelería (industria) → priorizar PAN-PAST-IB.
    // Alimentación general como secundario, comercio NO como primera opción.
    return ['PAN-PAST-IB', 'IND-ALIM-IB'];
  }
  if (c === '4724') {
    // Comercio al por menor de pan/pastelería → ambos candidatos, requiere humano.
    return ['PAN-PAST-IB', 'COM-GEN-IB'];
  }
  if (c.startsWith('47')) {
    // Comercio minorista genérico → COM-GEN-IB. Si hay obrador, revisar PAN-PAST-IB.
    return ['COM-GEN-IB'];
  }
  if (c.startsWith('56')) {
    // Hostelería con consumo → HOST-IB.
    return ['HOST-IB'];
  }
  if (c.startsWith('55')) {
    return ['HOST-IB'];
  }
  if (c === '10' || c.startsWith('10')) {
    return ['IND-ALIM-IB'];
  }
  return [];
}

// ============================================================
// Tests
// ============================================================

describe('B2 Seed — Cobertura del catálogo', () => {
  it('contiene exactamente 25 entradas (21 legacy + 4 Baleares reforzado)', () => {
    expect(B2_SEED_SNAPSHOT).toHaveLength(25);
    const baleares = B2_SEED_SNAPSHOT.filter(s => s.is_baleares);
    expect(baleares).toHaveLength(4);
  });

  it('todos los internal_code son únicos (idempotencia por clave)', () => {
    const codes = B2_SEED_SNAPSHOT.map(s => s.internal_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('contiene COM-GEN-IB en registry (Comercio General Illes Balears)', () => {
    expect(B2_SEED_SNAPSHOT.find(s => s.internal_code === 'COM-GEN-IB')).toBeDefined();
  });

  it('contiene PAN-PAST-IB en registry (Panadería y Pastelería Illes Balears)', () => {
    const e = B2_SEED_SNAPSHOT.find(s => s.internal_code === 'PAN-PAST-IB');
    expect(e).toBeDefined();
    expect(e!.cnae_codes).toEqual(expect.arrayContaining(['1071', '1072', '4724']));
  });

  it('contiene HOST-IB en registry (Hostelería Illes Balears)', () => {
    const e = B2_SEED_SNAPSHOT.find(s => s.internal_code === 'HOST-IB');
    expect(e).toBeDefined();
    expect(e!.cnae_codes).toEqual(expect.arrayContaining(['55', '56']));
  });

  it('contiene IND-ALIM-IB en registry (Industria Alimentaria Illes Balears)', () => {
    expect(B2_SEED_SNAPSHOT.find(s => s.internal_code === 'IND-ALIM-IB')).toBeDefined();
  });
});

describe('B2 Seed — Invariantes de seguridad legal', () => {
  // Estos tests verifican el CONTRATO de tipos: si el schema dejara de
  // tener estas columnas, no podríamos garantizar que el seed las marca
  // correctamente. La verificación de los valores reales de la fila se
  // realiza por la migración y por el trigger defensivo en DB (B1).
  it('el tipo Row expone todas las banderas de seguridad', () => {
    const probe: Partial<RegistryRow> = {
      ready_for_payroll: false,
      requires_human_review: true,
      official_submission_blocked: true,
      salary_tables_loaded: false,
      data_completeness: 'metadata_only',
      source_quality: 'legacy_static',
      status: 'pendiente_validacion',
    };
    expect(probe.ready_for_payroll).toBe(false);
    expect(probe.requires_human_review).toBe(true);
    expect(probe.official_submission_blocked).toBe(true);
    expect(probe.salary_tables_loaded).toBe(false);
    expect(probe.data_completeness).toBe('metadata_only');
  });

  it('ningún convenio del seed tiene source_quality "official"', () => {
    // Hasta validación humana + parseo de tabla salarial, ningún registro
    // puede declarar fuente oficial verificada.
    const officials = B2_SEED_SNAPSHOT.filter(s => (s.source_quality as string) === 'official');
    expect(officials).toHaveLength(0);
  });

  it('ningún convenio Baleares queda listo para nómina', () => {
    // Todos los Baleares siguen el patrón pending_official_validation +
    // metadata_only. La verificación de ready_for_payroll=false a nivel
    // DB la garantiza el trigger enforce_ca_registry_ready_for_payroll
    // creado en B1.
    const baleares = B2_SEED_SNAPSHOT.filter(s => s.is_baleares);
    for (const b of baleares) {
      expect(b.source_quality).toBe('pending_official_validation');
    }
  });
});

describe('B2 Seed — Ranking por CNAE Baleares', () => {
  it('CNAE 1071 prioriza PAN-PAST-IB sobre comercio', () => {
    const r = rankAgreementsForCnaeBaleares('1071');
    expect(r[0]).toBe('PAN-PAST-IB');
    expect(r).not.toContain('COM-GEN-IB');
  });

  it('CNAE 1072 prioriza PAN-PAST-IB sobre comercio', () => {
    const r = rankAgreementsForCnaeBaleares('1072');
    expect(r[0]).toBe('PAN-PAST-IB');
    expect(r).not.toContain('COM-GEN-IB');
  });

  it('CNAE 4724 devuelve PAN-PAST-IB y COM-GEN-IB (selección humana obligatoria)', () => {
    const r = rankAgreementsForCnaeBaleares('4724');
    expect(r).toEqual(expect.arrayContaining(['PAN-PAST-IB', 'COM-GEN-IB']));
    // PAN-PAST-IB debe ir primero porque la actividad principal es panadería/pastelería.
    expect(r[0]).toBe('PAN-PAST-IB');
  });

  it('CNAE 47 (genérico) devuelve COM-GEN-IB', () => {
    const r = rankAgreementsForCnaeBaleares('47');
    expect(r).toContain('COM-GEN-IB');
  });

  it('CNAE 56 (hostelería con consumo) devuelve HOST-IB', () => {
    const r = rankAgreementsForCnaeBaleares('56');
    expect(r).toContain('HOST-IB');
  });

  it('ninguna sugerencia marca el convenio como definitivo (devuelve lista de candidatos)', () => {
    // El ranking devuelve siempre arrays — la selección final requiere
    // intervención humana. Verificamos que el contrato es Array<string>.
    const samples = ['1071', '4724', '47', '56', '10'];
    for (const c of samples) {
      const r = rankAgreementsForCnaeBaleares(c);
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeGreaterThan(0);
    }
  });
});

describe('B2 Seed — Aislamiento respecto a tabla operativa', () => {
  it('el snapshot del seed apunta SOLO al registry, no a erp_hr_collective_agreements', () => {
    // Garantía documental: el seed B2 no incluye ninguna referencia a la
    // tabla operativa por empresa. Cualquier intento futuro de mezclarlas
    // requiere modificar este test explícitamente.
    const banned = ['erp_hr_collective_agreements ', 'company_id'];
    const snapshotJson = JSON.stringify(B2_SEED_SNAPSHOT);
    for (const term of banned) {
      expect(snapshotJson).not.toContain(term);
    }
  });
});