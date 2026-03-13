/**
 * useDocumentFileVersions — Consulta y gestión de versiones de archivo
 * V2-ES.4 Paso 4.2
 *
 * Responsabilidades:
 *  - Consultar versiones de un documento
 *  - Insertar nueva versión al subir/reemplazar archivo
 *  - Marcar versión anterior como no actual
 *  - Calcular next version_number
 *  - Graceful degradation: 0 versiones = sin historial, sin error
 *
 * NO duplica metadata del documento padre.
 * NO reemplaza useHRDocumentStorage (lo complementa).
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentFileVersion {
  id: string;
  company_id: string;
  document_id: string;
  version_number: number;
  is_current: boolean;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  checksum: string | null;
  storage_path: string;
  storage_bucket: string;
  storage_provider: string;
  uploaded_by: string | null;
  uploaded_at: string;
  replace_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateVersionParams {
  companyId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  storagePath: string;
  uploadedBy?: string | null;
  replaceReason?: string | null;
}

export interface VersioningResult {
  version: DocumentFileVersion;
  previousVersionId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determine if a document has any version history worth showing.
 * A single current version means "no history to display".
 */
export function hasVersionHistory(versions: DocumentFileVersion[]): boolean {
  return versions.length > 1;
}

/**
 * Get the current version from a list.
 */
export function getCurrentVersion(
  versions: DocumentFileVersion[],
): DocumentFileVersion | null {
  return versions.find(v => v.is_current) ?? null;
}

/**
 * Get previous (non-current) versions, ordered by version_number desc.
 */
export function getPreviousVersions(
  versions: DocumentFileVersion[],
): DocumentFileVersion[] {
  return versions
    .filter(v => !v.is_current)
    .sort((a, b) => b.version_number - a.version_number);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDocumentFileVersions(documentId: string | null | undefined) {
  const [versions, setVersions] = useState<DocumentFileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all versions for this document, ordered by version_number desc.
   */
  const fetchVersions = useCallback(async () => {
    if (!documentId) {
      setVersions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('erp_hr_document_file_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (fetchError) {
        console.error('[useDocumentFileVersions] fetch error:', fetchError);
        setError('Error al cargar historial de versiones');
        setVersions([]);
        return;
      }

      setVersions((data as DocumentFileVersion[]) ?? []);
    } catch (err) {
      console.error('[useDocumentFileVersions] unexpected error:', err);
      setError('Error inesperado');
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  /**
   * Register a new file version. Handles:
   *  1. Query next version_number
   *  2. Mark previous current as not current
   *  3. Insert new version as current
   *
   * Returns the new version and previous version id (if any).
   */
  const registerVersion = useCallback(async (
    params: CreateVersionParams,
  ): Promise<VersioningResult | null> => {
    try {
      // 1. Get current max version_number for this document
      const { data: existing } = await (supabase as any)
        .from('erp_hr_document_file_versions')
        .select('id, version_number')
        .eq('document_id', params.documentId)
        .eq('is_current', true)
        .maybeSingle();

      const previousVersionId = existing?.id ?? null;
      const nextVersionNumber = existing ? (existing.version_number as number) + 1 : 1;

      // 2. If there's a current version, mark it as not current
      if (previousVersionId) {
        await (supabase as any)
          .from('erp_hr_document_file_versions')
          .update({ is_current: false })
          .eq('id', previousVersionId);
      }

      // 3. Insert new version
      const { data: newVersion, error: insertError } = await (supabase as any)
        .from('erp_hr_document_file_versions')
        .insert({
          company_id: params.companyId,
          document_id: params.documentId,
          version_number: nextVersionNumber,
          is_current: true,
          file_name: params.fileName,
          mime_type: params.mimeType,
          file_size_bytes: params.fileSizeBytes,
          checksum: params.checksum,
          storage_path: params.storagePath,
          storage_bucket: 'hr-documents',
          storage_provider: 'supabase',
          uploaded_by: params.uploadedBy ?? null,
          replace_reason: params.replaceReason ?? null,
        })
        .select()
        .single();

      if (insertError || !newVersion) {
        console.error('[useDocumentFileVersions] registerVersion insert error:', insertError);
        // Rollback: restore previous as current if we changed it
        if (previousVersionId) {
          await (supabase as any)
            .from('erp_hr_document_file_versions')
            .update({ is_current: true })
            .eq('id', previousVersionId);
        }
        return null;
      }

      // 4. Update local state
      setVersions(prev => {
        const updated = prev.map(v => v.id === previousVersionId ? { ...v, is_current: false } : v);
        return [newVersion as DocumentFileVersion, ...updated];
      });

      return {
        version: newVersion as DocumentFileVersion,
        previousVersionId,
      };
    } catch (err) {
      console.error('[useDocumentFileVersions] registerVersion error:', err);
      return null;
    }
  }, []);

  return {
    versions,
    isLoading,
    error,
    fetchVersions,
    registerVersion,
    // Computed
    hasHistory: hasVersionHistory(versions),
    currentVersion: getCurrentVersion(versions),
    previousVersions: getPreviousVersions(versions),
  };
}
