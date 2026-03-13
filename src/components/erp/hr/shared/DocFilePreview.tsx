/**
 * DocFilePreview — Previsualización y descarga de archivo físico HR
 * V2-ES.4 Paso 3.4
 *
 * - PDF: iframe inline
 * - Imágenes: img inline
 * - Otros: botón de descarga
 * - Sin archivo: estado informativo
 */
import { useState, useCallback, useMemo } from 'react';
import {
  FileText, Image as ImageIcon, Download, ExternalLink,
  AlertTriangle, Loader2, Eye, FileQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useHRDocumentStorage,
  isPreviewableMime,
  formatFileSize,
  type FileAttachmentStatus,
} from '@/hooks/erp/hr/useHRDocumentStorage';

interface DocFilePreviewProps {
  companyId: string;
  documentId: string;
  storagePath: string | null | undefined;
  fileName: string | null | undefined;
  mimeType: string | null | undefined;
  fileSizeBytes: number | null | undefined;
  fileStatus: FileAttachmentStatus;
  className?: string;
}

export function DocFilePreview({
  companyId,
  documentId,
  storagePath,
  fileName,
  mimeType,
  fileSizeBytes,
  fileStatus,
  className,
}: DocFilePreviewProps) {
  const { getDownloadUrl, downloadFile, isDownloading, logFileAudit } = useHRDocumentStorage(companyId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPreview = isPreviewableMime(mimeType) && fileStatus === 'attached';
  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  const auditMeta = { file_name: fileName ?? undefined, mime_type: mimeType ?? undefined, file_size_bytes: fileSizeBytes ?? undefined, storage_path: storagePath ?? undefined };

  // ── Load preview URL ──
  const handlePreview = useCallback(async () => {
    if (!storagePath) return;
    setLoadingPreview(true);
    setError(null);

    const result = await getDownloadUrl(storagePath);
    if (result.ok) {
      setPreviewUrl(result.data);
      setPreviewOpen(true);
      logFileAudit('file_preview', documentId, true, auditMeta);
    } else {
      const err = result as { ok: false; error: { message: string } };
      setError(err.error.message);
      logFileAudit('file_preview', documentId, false, { ...auditMeta, error_message: err.error.message });
    }
    setLoadingPreview(false);
  }, [storagePath, getDownloadUrl, documentId, logFileAudit, auditMeta]);

  // ── Trigger download ──
  const handleDownload = useCallback(async () => {
    if (!storagePath) return;
    setError(null);
    const result = await downloadFile(storagePath, fileName ?? undefined);
    if (result.ok) {
      logFileAudit('file_download', documentId, true, auditMeta);
    } else {
      const err = result as { ok: false; error: { message: string } };
      logFileAudit('file_download', documentId, false, { ...auditMeta, error_message: err.error.message });
    }
  }, [storagePath, fileName, downloadFile, documentId, logFileAudit, auditMeta]);

  // ── No file states ──
  if (fileStatus === 'missing') {
    return (
      <div className={cn('rounded-lg border border-dashed p-3 text-center', className)}>
        <FileQuestion className="h-5 w-5 mx-auto mb-1 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Sin archivo físico asociado</p>
      </div>
    );
  }

  if (fileStatus === 'legacy') {
    return (
      <div className={cn('rounded-lg border border-dashed p-3 text-center', className)}>
        <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Documento legacy — sin archivo en storage</p>
      </div>
    );
  }

  // ── Attached file ──
  return (
    <div className={cn('space-y-2', className)}>
      {/* Action buttons */}
      <div className="flex gap-2">
        {canPreview && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handlePreview}
            disabled={loadingPreview}
          >
            {loadingPreview
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Eye className="h-3.5 w-3.5" />}
            Previsualizar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Download className="h-3.5 w-3.5" />}
          Descargar
          {fileSizeBytes ? ` (${formatFileSize(fileSizeBytes)})` : ''}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Inline preview */}
      {previewOpen && previewUrl && (
        <div className="rounded-lg border overflow-hidden bg-muted/30">
          <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/50">
            <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {isImage ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {fileName ?? 'archivo'}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => window.open(previewUrl, '_blank')}
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setPreviewOpen(false); setPreviewUrl(null); }}
                title="Cerrar preview"
              >
                ✕
              </Button>
            </div>
          </div>

          {isPdf && (
            <iframe
              src={previewUrl}
              className="w-full h-[350px] border-0"
              title={fileName ?? 'Preview PDF'}
            />
          )}

          {isImage && (
            <div className="p-2 flex justify-center">
              <img
                src={previewUrl}
                alt={fileName ?? 'Preview'}
                className="max-h-[300px] max-w-full object-contain rounded"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
