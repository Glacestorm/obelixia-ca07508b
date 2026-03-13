/**
 * useHRDocumentCatalog — Hook para acceder al catálogo de tipos documentales HR
 * V2-ES.4 Paso 1: Lectura del catálogo desde BD con cache y fallback estático
 *
 * REGLAS:
 * - Una sola query cacheada con staleTime alto (catálogo casi estático)
 * - Fallback al catálogo estático (documentCatalogES.ts) si BD no disponible
 * - Utilidades de lookup, normalización y compatibilidad con docs legacy
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCatalogEntry, type DocumentCatalogEntry } from '@/components/erp/hr/shared/documentCatalogES';

// ─── Types (DB-backed) ──────────────────────────────────────────────────────

export interface HRDocumentType {
  id: string;
  code: string;
  name: string;
  category: string;
  organism: string | null;
  description: string | null;
  is_mandatory_default: boolean;
  supports_versions: boolean;
  supports_external_response: boolean;
  retention_years: number;
  renewable: boolean;
  default_expiry_months: number | null;
  alert_before_days: number;
  legal_basis: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Categorías del catálogo documental HR España */
export type HRDocumentCategory =
  | 'afiliacion_tgss'
  | 'contratacion_sepe'
  | 'nomina'
  | 'cotizacion'
  | 'cra'
  | 'irpf'
  | 'it'
  | 'accidente_trabajo'
  | 'nacimiento_cuidado'
  | 'baja_finiquito'
  | 'compliance';

export const HR_DOC_CATEGORY_LABELS: Record<HRDocumentCategory, string> = {
  afiliacion_tgss: 'Afiliación TGSS',
  contratacion_sepe: 'Contratación SEPE',
  nomina: 'Nómina',
  cotizacion: 'Cotización',
  cra: 'CRA',
  irpf: 'IRPF',
  it: 'Incapacidad Temporal',
  accidente_trabajo: 'Accidente de Trabajo',
  nacimiento_cuidado: 'Nacimiento y Cuidado',
  baja_finiquito: 'Baja / Finiquito',
  compliance: 'Compliance / PRL',
};

// ─── Normalización ───────────────────────────────────────────────────────────

/**
 * Normaliza un document_type legacy para intentar match con el catálogo DB.
 * Estrategia: uppercase, trim, elimina tildes, reemplaza espacios por _
 */
export function normalizeToCode(docType: string): string {
  return docType
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRDocumentCatalog() {
  const { data: catalogTypes = [], isLoading } = useQuery({
    queryKey: ['erp-hr-document-types'],
    queryFn: async (): Promise<HRDocumentType[]> => {
      const { data, error } = await supabase
        .from('erp_hr_document_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[useHRDocumentCatalog] DB query failed, using static fallback:', error.message);
        return [];
      }
      return (data ?? []) as HRDocumentType[];
    },
    staleTime: 10 * 60 * 1000, // 10 min — catálogo casi estático
    gcTime: 30 * 60 * 1000,
  });

  // Build lookup index
  const _index = new Map<string, HRDocumentType>();
  for (const t of catalogTypes) {
    _index.set(t.code, t);
  }

  /**
   * Busca un tipo documental por code exacto o normalizado.
   * Fallback al catálogo estático si no encuentra en BD.
   */
  function lookupDocType(docTypeOrCode: string): HRDocumentType | DocumentCatalogEntry | null {
    // Try exact match
    const exact = _index.get(docTypeOrCode);
    if (exact) return exact;

    // Try normalized match
    const normalized = normalizeToCode(docTypeOrCode);
    const normalizedMatch = _index.get(normalized);
    if (normalizedMatch) return normalizedMatch;

    // Fallback to static catalog (V2-ES.3 compat)
    return getCatalogEntry(docTypeOrCode);
  }

  /**
   * Obtiene los tipos documentales de una categoría.
   */
  function getByCategory(category: HRDocumentCategory): HRDocumentType[] {
    return catalogTypes.filter(t => t.category === category);
  }

  /**
   * Obtiene los tipos documentales obligatorios por defecto.
   */
  function getMandatoryDefaults(): HRDocumentType[] {
    return catalogTypes.filter(t => t.is_mandatory_default);
  }

  /**
   * Obtiene los tipos documentales renovables.
   */
  function getRenewables(): HRDocumentType[] {
    return catalogTypes.filter(t => t.renewable);
  }

  return {
    catalogTypes,
    isLoading,
    lookupDocType,
    getByCategory,
    getMandatoryDefaults,
    getRenewables,
    normalizeToCode,
    categoryLabels: HR_DOC_CATEGORY_LABELS,
  };
}
