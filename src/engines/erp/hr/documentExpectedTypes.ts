/**
 * documentExpectedTypes — Mapa estático de request_type → document_type[] esperados
 * V2-ES.3 Paso 4: Checklist documental informativo
 * V2-ES.4 Paso 1: Enriquecido con referencia al catálogo documental España
 *
 * REGLAS:
 * - Todos los valores de document_type están en lowercase normalizado
 * - El matching se hace con normalizeDocType() para evitar falsos faltantes
 * - Este mapa es informativo, NO bloquea workflows
 * - `catalogKey` permite lookup al catálogo para metadata adicional (retención, vencimiento)
 */

import type { AdminRequestType } from '@/hooks/admin/hr/useAdminPortal';
import { getCatalogEntry, type DocumentCatalogEntry } from './documentCatalogES';

export interface ExpectedDocType {
  /** Valor normalizado (lowercase, sin tildes) para matching */
  type: string;
  /** Etiqueta legible para UI */
  label: string;
  /** Clave del catálogo para metadata enriquecida (opcional, defaults to type) */
  catalogKey?: string;
}

/**
 * Obtiene la entrada del catálogo para un ExpectedDocType.
 * Usa catalogKey si existe, si no usa type.
 */
export function getExpectedDocCatalogEntry(expected: ExpectedDocType): DocumentCatalogEntry | null {
  return getCatalogEntry(expected.catalogKey ?? expected.type);
}

/**
 * Mapa de tipos de solicitud → documentos esperados.
 * Solo incluye request_types con expectativas documentales claras.
 */
export const EXPECTED_DOCS_BY_REQUEST_TYPE: Partial<Record<AdminRequestType, ExpectedDocType[]>> = {
  employee_registration: [
    { type: 'contrato', label: 'Contrato de trabajo' },
    { type: 'dni', label: 'DNI/NIE' },
    { type: 'ss', label: 'Documento Seguridad Social' },
  ],
  contract_modification: [
    { type: 'contrato', label: 'Nuevo contrato / Anexo' },
  ],
  salary_change: [
    { type: 'contrato', label: 'Anexo salarial' },
  ],
  sick_leave: [
    { type: 'justificante', label: 'Parte de baja (IT)' },
  ],
  work_accident: [
    { type: 'justificante', label: 'Parte de accidente' },
    { type: 'medico', label: 'Informe médico' },
  ],
  termination: [
    { type: 'contrato', label: 'Carta de despido / baja voluntaria' },
    { type: 'certificado', label: 'Certificado de empresa' },
  ],
  settlement: [
    { type: 'contrato', label: 'Documento de finiquito' },
  ],
  birth_leave: [
    { type: 'justificante', label: 'Certificado de nacimiento' },
  ],
  document_submission: [
    { type: 'evidencia', label: 'Documento adjunto' },
  ],
};

/**
 * Normaliza un document_type para matching consistente:
 * - lowercase
 * - trim
 * - elimina tildes/diacríticos
 */
export function normalizeDocType(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula el estado de completitud documental.
 * Compara los tipos esperados con los documentos existentes.
 */
export function computeDocCompleteness(
  requestType: string | undefined | null,
  existingDocs: Array<{ document_type: string }>,
): {
  expected: ExpectedDocType[];
  present: string[];
  missing: string[];
  total: number;
  completed: number;
  percentage: number;
} | null {
  if (!requestType) return null;

  const expected = EXPECTED_DOCS_BY_REQUEST_TYPE[requestType as AdminRequestType];
  if (!expected || expected.length === 0) return null;

  const existingNormalized = new Set(
    existingDocs.map(d => normalizeDocType(d.document_type)),
  );

  const present: string[] = [];
  const missing: string[] = [];

  for (const exp of expected) {
    if (existingNormalized.has(normalizeDocType(exp.type))) {
      present.push(exp.type);
    } else {
      missing.push(exp.type);
    }
  }

  const total = expected.length;
  const completed = present.length;

  return {
    expected,
    present,
    missing,
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
  };
}
