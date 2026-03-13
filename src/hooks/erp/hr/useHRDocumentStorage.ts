/**
 * useHRDocumentStorage — Storage real para expediente documental HR
 * V2-ES.4 Paso 3.2
 *
 * Responsabilidades:
 *  - Upload inicial con checksum SHA-256
 *  - Reemplazo seguro de archivo existente
 *  - Download / acceso seguro (signed URLs)
 *  - Delete controlado
 *  - Actualización de metadata en erp_hr_employee_documents
 *  - Validación de MIME y tamaño
 *  - Fallback seguro cuando no hay archivo físico
 *
 * NO hace fetch de documentos (eso lo hace useHRDocumentExpedient).
 * NO crea rutas ni menús.
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────────────

export const HR_DOC_BUCKET = 'hr-documents';

export const HR_DOC_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const HR_DOC_ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'application/msword',        // .doc
  'application/vnd.ms-excel',  // .xls
]);

export const HR_DOC_ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.xlsx', '.doc', '.xls',
]);

// ─── Error types ─────────────────────────────────────────────────────────────

export type StorageErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'INVALID_EXTENSION'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'METADATA_UPDATE_FAILED'
  | 'CHECKSUM_FAILED'
  | 'NO_FILE_ATTACHED'
  | 'UNKNOWN';

export interface StorageError {
  code: StorageErrorCode;
  message: string;
  details?: unknown;
}

function createStorageError(code: StorageErrorCode, message: string, details?: unknown): StorageError {
  return { code, message, details };
}

// ─── Result type ─────────────────────────────────────────────────────────────

export type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StorageError };

function ok<T>(data: T): StorageResult<T> {
  return { ok: true, data };
}

function fail<T>(error: StorageError): StorageResult<T> {
  return { ok: false, error };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build canonical storage path.
 * Convention: {company_id}/{employee_id}/{document_id}/{sanitized_filename}
 */
export function buildStoragePath(
  companyId: string,
  employeeId: string,
  documentId: string,
  fileName: string,
): string {
  const sanitized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-zA-Z0-9._-]/g, '_') // safe chars only
    .replace(/_{2,}/g, '_')
    .toLowerCase();
  return `${companyId}/${employeeId}/${documentId}/${sanitized}`;
}

/**
 * Compute SHA-256 checksum of a File (browser-native crypto).
 */
export async function computeFileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract file extension from name (lowercase, with dot).
 */
function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

/**
 * Validate file against allowed MIME types, extensions, and size.
 */
export function validateFile(file: File): StorageError | null {
  if (file.size > HR_DOC_MAX_SIZE_BYTES) {
    const maxMB = (HR_DOC_MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return createStorageError(
      'FILE_TOO_LARGE',
      `El archivo excede el tamaño máximo permitido (${maxMB} MB)`,
    );
  }

  if (!HR_DOC_ALLOWED_MIME_TYPES.has(file.type)) {
    return createStorageError(
      'INVALID_MIME_TYPE',
      `Tipo de archivo no permitido: ${file.type || 'desconocido'}`,
    );
  }

  const ext = getFileExtension(file.name);
  if (ext && !HR_DOC_ALLOWED_EXTENSIONS.has(ext)) {
    return createStorageError(
      'INVALID_EXTENSION',
      `Extensión no permitida: ${ext}`,
    );
  }

  return null;
}

/**
 * Format bytes to human-readable string.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check if a MIME type supports inline preview (PDF or images).
 */
export function isPreviewableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return mime === 'application/pdf' || mime.startsWith('image/');
}

/**
 * Determine physical file status from document metadata.
 */
export type FileAttachmentStatus = 'attached' | 'missing' | 'legacy';

export function getFileAttachmentStatus(doc: {
  storage_path?: string | null;
  storage_bucket?: string | null;
  file_url?: string | null;
}): FileAttachmentStatus {
  if (doc.storage_path && doc.storage_bucket) return 'attached';
  if (doc.file_url) return 'legacy';
  return 'missing';
}

// ─── Storage metadata for erp_hr_employee_documents ──────────────────────────

interface StorageMetadataUpdate {
  storage_path: string;
  storage_bucket: string;
  storage_provider: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  checksum: string;
  uploaded_at: string;
  last_action_at: string;
}

function buildMetadataFromUpload(
  storagePath: string,
  file: File,
  checksum: string,
): StorageMetadataUpdate {
  return {
    storage_path: storagePath,
    storage_bucket: HR_DOC_BUCKET,
    storage_provider: 'supabase',
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type,
    checksum,
    uploaded_at: new Date().toISOString(),
    last_action_at: new Date().toISOString(),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  storagePath: string;
  checksum: string;
  fileSize: number;
  mimeType: string;
}

export function useHRDocumentStorage(companyId: string) {
  const qc = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Invalidate document queries after metadata change.
   */
  const invalidateDocs = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['hr-documents', companyId] });
  }, [qc, companyId]);

  /**
   * Log file storage audit event to erp_hr_document_access_log.
   * Best-effort — never blocks or fails the parent operation.
   */
  const logFileAudit = useCallback(async (
    action: 'file_upload' | 'file_replace' | 'file_download' | 'file_preview' | 'file_delete',
    documentId: string,
    success: boolean,
    meta?: {
      employee_id?: string;
      file_name?: string;
      mime_type?: string;
      file_size_bytes?: number;
      storage_path?: string;
      checksum?: string;
      error_message?: string;
    },
  ) => {
    try {
      await (supabase as any)
        .from('erp_hr_document_access_log')
        .insert({
          company_id: companyId,
          document_id: documentId,
          document_table: 'erp_hr_employee_documents',
          action,
          user_agent: navigator.userAgent,
          metadata: {
            ...meta,
            success,
            storage_provider: 'supabase',
            storage_bucket: HR_DOC_BUCKET,
          },
        });
    } catch (e) {
      console.warn('[useHRDocumentStorage] audit log failed (non-blocking):', e);
    }
  }, [companyId]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  /**
   * Upload a file and update document metadata.
   * V2-ES.4 Paso 4: on replace, old file is PRESERVED in storage for version history.
   */
  const uploadFile = useCallback(async (
    documentId: string,
    employeeId: string,
    file: File,
    existingStoragePath?: string | null,
    /** V2-ES.4 Paso 4: optional reason for replacement (stored in version history) */
    replaceReason?: string | null,
  ): Promise<StorageResult<UploadResult>> => {
    // 1. Validate
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError.message);
      return fail(validationError);
    }

    setIsUploading(true);
    setUploadProgress(10);

    const isReplace = !!existingStoragePath;
    try {
      // 2. Compute checksum
      const checksum = await computeFileChecksum(file);
      setUploadProgress(30);

      // 3. Build path
      const storagePath = buildStoragePath(companyId, employeeId, documentId, file.name);

      // 4. On replace: do NOT delete old file — it stays in storage for version history.
      //    If same path, upload with upsert will overwrite (the old version was already
      //    snapshotted in erp_hr_document_file_versions before this point if applicable).

      setUploadProgress(50);

      // 5. Upload to storage (upsert to handle same-path replace)
      const { error: uploadError } = await supabase.storage
        .from(HR_DOC_BUCKET)
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        logFileAudit(isReplace ? 'file_replace' : 'file_upload', documentId, false, {
          employee_id: employeeId, file_name: file.name, mime_type: file.type,
          file_size_bytes: file.size, error_message: 'Upload to storage failed',
        });
        return fail(createStorageError('UPLOAD_FAILED', 'Error al subir el archivo', uploadError));
      }

      setUploadProgress(80);

      // 6. Update document metadata (source of truth for current file)
      const metadata = buildMetadataFromUpload(storagePath, file, checksum);
      const { error: updateError } = await supabase
        .from('erp_hr_employee_documents')
        .update(metadata as any)
        .eq('id', documentId)
        .eq('company_id', companyId);

      if (updateError) {
        // Rollback: remove uploaded file
        await supabase.storage.from(HR_DOC_BUCKET).remove([storagePath]);
        logFileAudit(isReplace ? 'file_replace' : 'file_upload', documentId, false, {
          employee_id: employeeId, file_name: file.name, mime_type: file.type,
          file_size_bytes: file.size, error_message: 'Metadata update failed, file rolled back',
        });
        return fail(createStorageError('METADATA_UPDATE_FAILED', 'Error al actualizar metadata', updateError));
      }

      setUploadProgress(90);

      // 7. V2-ES.4 Paso 4: Register file version (best-effort, non-blocking)
      //    Get current user for uploaded_by
      let uploadedBy: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        uploadedBy = user?.id ?? null;
      } catch { /* ignore */ }

      try {
        // Inline version registration to avoid circular dependency
        // 7a. Find current version
        const { data: currentVer } = await (supabase as any)
          .from('erp_hr_document_file_versions')
          .select('id, version_number')
          .eq('document_id', documentId)
          .eq('is_current', true)
          .maybeSingle();

        const previousVersionId = currentVer?.id ?? null;
        const nextVersion = currentVer ? (currentVer.version_number as number) + 1 : 1;

        // 7b. Mark previous as not current
        if (previousVersionId) {
          await (supabase as any)
            .from('erp_hr_document_file_versions')
            .update({ is_current: false })
            .eq('id', previousVersionId);
        }

        // 7c. Insert new version
        await (supabase as any)
          .from('erp_hr_document_file_versions')
          .insert({
            company_id: companyId,
            document_id: documentId,
            version_number: nextVersion,
            is_current: true,
            file_name: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            checksum,
            storage_path: storagePath,
            storage_bucket: HR_DOC_BUCKET,
            storage_provider: 'supabase',
            uploaded_by: uploadedBy,
            replace_reason: isReplace ? (replaceReason || null) : null,
          });

        // 7d. Audit version event
        logFileAudit(
          isReplace ? 'file_replace' : 'file_upload',
          documentId,
          true,
          {
            employee_id: employeeId,
            file_name: file.name,
            mime_type: file.type,
            file_size_bytes: file.size,
            storage_path: storagePath,
            checksum,
          },
        );
      } catch (versionErr) {
        // Version registration is best-effort — upload itself succeeded
        console.warn('[useHRDocumentStorage] version registration failed (non-blocking):', versionErr);
        // Still audit the upload success without version info
        logFileAudit(isReplace ? 'file_replace' : 'file_upload', documentId, true, {
          employee_id: employeeId, file_name: file.name, mime_type: file.type,
          file_size_bytes: file.size, storage_path: storagePath, checksum,
        });
      }

      setUploadProgress(100);
      invalidateDocs();
      toast.success(isReplace ? 'Archivo reemplazado correctamente' : 'Archivo subido correctamente');

      return ok({
        storagePath,
        checksum,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (err) {
      logFileAudit(isReplace ? 'file_replace' : 'file_upload', documentId, false, {
        employee_id: employeeId, file_name: file.name, mime_type: file.type,
        error_message: 'Unexpected error',
      });
      return fail(createStorageError('UPLOAD_FAILED', 'Error inesperado durante la subida', err));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  }, [companyId, invalidateDocs]);

  // ── Download ───────────────────────────────────────────────────────────────

  /**
   * Get a signed download URL (valid 60 min). Returns null for legacy/missing files.
   */
  const getDownloadUrl = useCallback(async (
    storagePath: string | null | undefined,
  ): Promise<StorageResult<string>> => {
    if (!storagePath) {
      return fail(createStorageError('NO_FILE_ATTACHED', 'Este documento no tiene archivo físico asociado'));
    }

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(HR_DOC_BUCKET)
        .createSignedUrl(storagePath, 3600); // 60 min

      if (error || !data?.signedUrl) {
        return fail(createStorageError('DOWNLOAD_FAILED', 'No se pudo generar enlace de descarga', error));
      }

      return ok(data.signedUrl);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  /**
   * Trigger browser download of a stored file.
   */
  const downloadFile = useCallback(async (
    storagePath: string | null | undefined,
    fileName?: string,
  ): Promise<StorageResult<void>> => {
    const urlResult = await getDownloadUrl(storagePath);
    if (urlResult.ok === false) {
      toast.error(urlResult.error.message);
      return fail(urlResult.error);
    }

    // Open in new tab / trigger download
    const a = document.createElement('a');
    a.href = urlResult.data;
    a.download = fileName || storagePath?.split('/').pop() || 'documento';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return ok(undefined);
  }, [getDownloadUrl]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Remove file from storage and clear metadata on the document record.
   * The document record itself is NOT deleted — only the physical file reference.
   */
  const deleteFile = useCallback(async (
    documentId: string,
    storagePath: string | null | undefined,
  ): Promise<StorageResult<void>> => {
    if (!storagePath) {
      return fail(createStorageError('NO_FILE_ATTACHED', 'No hay archivo asociado para eliminar'));
    }

    setIsDeleting(true);
    try {
      // 1. Remove from storage
      const { error: removeError } = await supabase.storage
        .from(HR_DOC_BUCKET)
        .remove([storagePath]);

      if (removeError) {
        logFileAudit('file_delete', documentId, false, { storage_path: storagePath, error_message: 'Storage remove failed' });
        return fail(createStorageError('DELETE_FAILED', 'Error al eliminar archivo', removeError));
      }

      // 2. Clear metadata on document
      const clearMetadata = {
        storage_path: null,
        storage_bucket: null,
        file_name: null,
        file_size_bytes: null,
        mime_type: null,
        checksum: null,
        uploaded_at: null,
        last_action_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('erp_hr_employee_documents')
        .update(clearMetadata as any)
        .eq('id', documentId)
        .eq('company_id', companyId);

      if (updateError) {
        logFileAudit('file_delete', documentId, false, { storage_path: storagePath, error_message: 'Metadata cleanup failed' });
        return fail(createStorageError('METADATA_UPDATE_FAILED', 'Archivo eliminado pero error al limpiar metadata', updateError));
      }

      invalidateDocs();
      logFileAudit('file_delete', documentId, true, { storage_path: storagePath });
      toast.success('Archivo eliminado');
      return ok(undefined);
    } finally {
      setIsDeleting(false);
    }
  }, [companyId, invalidateDocs]);

  // ── State helpers ──────────────────────────────────────────────────────────

  const isOperating = useMemo(
    () => isUploading || isDownloading || isDeleting,
    [isUploading, isDownloading, isDeleting],
  );

  return {
    // Operations
    uploadFile,
    getDownloadUrl,
    downloadFile,
    deleteFile,
    // Audit (exposed for UI components to log preview/download with full context)
    logFileAudit,
    // State
    isUploading,
    uploadProgress,
    isDownloading,
    isDeleting,
    isOperating,
    // Re-exported helpers
    validateFile,
  };
}
