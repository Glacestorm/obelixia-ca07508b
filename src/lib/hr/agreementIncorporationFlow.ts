/**
 * B12.3 — Pure helper that derives the "next safe step" for an agreement
 * found in the Centro de Convenios.
 *
 * STRICTLY READ-ONLY. NO database, NO edge invokes, NO bridge / payroll /
 * resolver / safety-gate imports. NO mutation of flags or allow-list.
 */
import type { UnifiedAgreementRow } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

export type AgreementIncorporationState =
  | 'LEGACY_ONLY'
  | 'REGISTRY_METADATA_ONLY'
  | 'REGISTRY_PARSED_PARTIAL'
  | 'REGISTRY_READY'
  | 'UNKNOWN';

export type StepStatus = 'pending' | 'active' | 'done' | 'blocked';

export interface IncorporationStep {
  key: string;
  label: string;
  description: string;
  status: StepStatus;
}

export interface IncorporationFlow {
  state: AgreementIncorporationState;
  ctaLabel: string | null;
  steps: IncorporationStep[];
  blockers: string[];
}

const CTA_BY_STATE: Record<AgreementIncorporationState, string | null> = {
  LEGACY_ONLY: 'Preparar incorporación',
  REGISTRY_METADATA_ONLY: 'Completar fuente oficial',
  REGISTRY_PARSED_PARTIAL: 'Enviar a validación humana',
  REGISTRY_READY: 'Preparar mapping',
  UNKNOWN: null,
};

function legacySteps(): IncorporationStep[] {
  return [
    { key: 'confirm_origin', label: 'Confirmar convenio operativo origen', description: 'Identificar el convenio en la fuente operativa actual.', status: 'active' },
    { key: 'find_official_source', label: 'Buscar / introducir fuente oficial', description: 'BOE, REGCON o boletín oficial autonómico.', status: 'pending' },
    { key: 'scope_territorial', label: 'Confirmar ámbito territorial y funcional', description: 'CCAA / provincia / sector / ámbito funcional.', status: 'pending' },
    { key: 'cnae', label: 'Confirmar CNAE si aplica', description: 'Códigos CNAE asociados.', status: 'pending' },
    { key: 'attach_doc', label: 'Adjuntar BOE / REGCON / boletín', description: 'Documento oficial archivado.', status: 'pending' },
    { key: 'prepare_parser', label: 'Preparar parser B7', description: 'Verificar formato, encoding y tablas detectadas.', status: 'pending' },
    { key: 'mark_candidate', label: 'Marcar como candidato pendiente de carga', description: 'Visual. No persiste en B12.3.', status: 'pending' },
  ];
}

function metadataOnlySteps(): IncorporationStep[] {
  return [
    { key: 'official_source', label: 'Fuente oficial', description: 'Confirmar URL, PDF y hash del documento oficial.', status: 'active' },
    { key: 'parser_b7', label: 'Parser B7A', description: 'Preparar y ejecutar parsing en su panel técnico.', status: 'pending' },
    { key: 'writer_b7b', label: 'Writer B7B', description: 'Persistir el resultado parseado en Registry.', status: 'pending' },
    { key: 'validation_b8a', label: 'Validación humana B8A', description: 'Validar y firmar internamente.', status: 'pending' },
    { key: 'activation_b9', label: 'Activación B9', description: 'Sujeto a B11.2 y allow-list. No se ejecuta aquí.', status: 'pending' },
  ];
}

function parsedPartialSteps(blockers: string[]): IncorporationStep[] {
  return [
    { key: 'verify_ids', label: 'Verificar agreement_id, version_id y source_id', description: 'Necesarios para abrir validación humana.', status: blockers.length ? 'blocked' : 'active' },
    { key: 'open_validation', label: 'Abrir panel de validación humana B8A', description: 'No firma automáticamente. Requiere revisor + aprobador humanos.', status: 'pending' },
  ];
}

function readySteps(): IncorporationStep[] {
  return [
    { key: 'readiness', label: 'Resumen de readiness Registry', description: 'Mostrar data_completeness, salary_tables_loaded, requires_human_review, ready_for_payroll.', status: 'active' },
    { key: 'open_mapping', label: 'Preparar mapping empresa / contrato', description: 'Abrir panel Mapping con filtros preaplicados. El mapping no activa nómina.', status: 'pending' },
  ];
}

export function deriveIncorporationFlow(row: UnifiedAgreementRow): IncorporationFlow {
  const blockers: string[] = [];
  let state: AgreementIncorporationState = 'UNKNOWN';
  let steps: IncorporationStep[] = [];

  const reg = row.registry;

  if (reg && reg.ready_for_payroll === true) {
    state = 'REGISTRY_READY';
    steps = readySteps();
  } else if (reg && reg.salary_tables_loaded === true && reg.ready_for_payroll !== true) {
    state = 'REGISTRY_PARSED_PARTIAL';
    if (!reg.id) blockers.push('Falta agreement_id en Registry');
    // version_id y source_id no están en el row del Hub: se validan en el panel B8A.
    // Aquí solo señalamos la verificación pendiente.
    steps = parsedPartialSteps(blockers);
  } else if (reg && reg.data_completeness === 'metadata_only') {
    state = 'REGISTRY_METADATA_ONLY';
    steps = metadataOnlySteps();
  } else if (!reg && row.origin === 'operative' && row.operative) {
    state = 'LEGACY_ONLY';
    steps = legacySteps();
  } else if (reg) {
    // Registry presente pero no encaja en ninguna categoría conocida.
    state = 'UNKNOWN';
    blockers.push('Estado Registry no clasificable');
  } else {
    state = 'UNKNOWN';
  }

  return {
    state,
    ctaLabel: CTA_BY_STATE[state],
    steps,
    blockers,
  };
}

export default deriveIncorporationFlow;
