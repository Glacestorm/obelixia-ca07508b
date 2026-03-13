/**
 * documentStatusEngine — Motor de estados documentales y semáforos
 * V2-ES.4 Paso 1: Computación de estado, alertas y vencimientos
 *
 * REGLAS:
 * - Los estados son derivados (computed), no almacenados en BD
 * - Se basan en expiry_date del documento y alertBeforeDays del catálogo
 * - El semáforo usa 3 niveles: green (vigente), amber (próximo vencimiento), red (vencido)
 * - null expiry_date → siempre green (documento sin vencimiento)
 */

import { getCatalogEntry, type DocumentCatalogEntry } from './documentCatalogES';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocTrafficLight = 'green' | 'amber' | 'red';

export type DocOperationalStatus =
  | 'valid'        // Vigente, sin alertas
  | 'expiring'     // Próximo a vencer (dentro del umbral de alerta)
  | 'expired'      // Vencido
  | 'no_expiry'    // Sin fecha de vencimiento (siempre válido)
  | 'missing'      // Esperado pero no existe
  | 'unknown';     // Sin información de catálogo

export interface DocStatusResult {
  status: DocOperationalStatus;
  light: DocTrafficLight;
  /** Días hasta vencimiento (negativo = ya vencido, null = sin vencimiento) */
  daysUntilExpiry: number | null;
  /** Etiqueta legible para UI */
  label: string;
  /** Entrada del catálogo (null si tipo no reconocido) */
  catalogEntry: DocumentCatalogEntry | null;
  /** ¿Es urgente? (vence en < 15 días o ya vencido) */
  isUrgent: boolean;
}

export interface DocAlertSummary {
  expired: number;
  expiring: number;
  valid: number;
  noExpiry: number;
  total: number;
  /** Peor semáforo del conjunto */
  worstLight: DocTrafficLight;
  /** Documentos que necesitan atención (expired + expiring) */
  needsAttention: number;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Computa el estado operacional de un documento basado en su tipo y fecha de vencimiento.
 */
export function computeDocStatus(
  documentType: string,
  expiryDate: string | null | undefined,
  referenceDate: Date = new Date(),
): DocStatusResult {
  const catalogEntry = getCatalogEntry(documentType);
  const alertDays = catalogEntry?.alertBeforeDays ?? 30;

  // Sin fecha de vencimiento
  if (!expiryDate) {
    return {
      status: 'no_expiry',
      light: 'green',
      daysUntilExpiry: null,
      label: 'Sin vencimiento',
      catalogEntry,
      isUrgent: false,
    };
  }

  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - referenceDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Vencido
  if (diffDays < 0) {
    return {
      status: 'expired',
      light: 'red',
      daysUntilExpiry: diffDays,
      label: `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`,
      catalogEntry,
      isUrgent: true,
    };
  }

  // Próximo a vencer
  if (diffDays <= alertDays) {
    return {
      status: 'expiring',
      light: 'amber',
      daysUntilExpiry: diffDays,
      label: diffDays === 0
        ? 'Vence hoy'
        : `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
      catalogEntry,
      isUrgent: diffDays <= 15,
    };
  }

  // Vigente
  return {
    status: 'valid',
    light: 'green',
    daysUntilExpiry: diffDays,
    label: 'Vigente',
    catalogEntry,
    isUrgent: false,
  };
}

/**
 * Computa un resumen de alertas para un conjunto de documentos.
 * Útil para dashboards y contadores de semáforo.
 */
export function computeDocAlertSummary(
  docs: Array<{ document_type: string; expiry_date: string | null }>,
  referenceDate: Date = new Date(),
): DocAlertSummary {
  let expired = 0;
  let expiring = 0;
  let valid = 0;
  let noExpiry = 0;

  for (const doc of docs) {
    const result = computeDocStatus(doc.document_type, doc.expiry_date, referenceDate);
    switch (result.status) {
      case 'expired': expired++; break;
      case 'expiring': expiring++; break;
      case 'valid': valid++; break;
      case 'no_expiry': noExpiry++; break;
    }
  }

  const worstLight: DocTrafficLight = expired > 0 ? 'red' : expiring > 0 ? 'amber' : 'green';

  return {
    expired,
    expiring,
    valid,
    noExpiry,
    total: docs.length,
    worstLight,
    needsAttention: expired + expiring,
  };
}

/**
 * Filtra documentos que requieren atención (vencidos o próximos a vencer).
 */
export function getDocsNeedingAttention(
  docs: Array<{ document_type: string; expiry_date: string | null; id: string }>,
  referenceDate: Date = new Date(),
): Array<{ doc: typeof docs[number]; status: DocStatusResult }> {
  return docs
    .map(doc => ({
      doc,
      status: computeDocStatus(doc.document_type, doc.expiry_date, referenceDate),
    }))
    .filter(({ status }) => status.status === 'expired' || status.status === 'expiring')
    .sort((a, b) => (a.status.daysUntilExpiry ?? 999) - (b.status.daysUntilExpiry ?? 999));
}
