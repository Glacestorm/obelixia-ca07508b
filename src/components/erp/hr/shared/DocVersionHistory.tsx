/**
 * DocVersionHistory — Historial de versiones de archivo físico
 * V2-ES.4 Paso 4.4
 *
 * Muestra versiones de archivo (no versiones lógicas del documento).
 * Graceful: sin versiones → mensaje informativo; 1 versión → "sin historial previo".
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  History, Download, Eye, ChevronDown, ChevronRight,
  FileText, Loader2, Clock, User, Replace,
} from 'lucide-react';
import { useDocumentFileVersions, type DocumentFileVersion } from '@/hooks/erp/hr/useDocumentFileVersions';
import { useHRDocumentStorage, formatFileSize, isPreviewableMime } from '@/hooks/erp/hr/useHRDocumentStorage';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DocVersionHistoryProps {
  companyId: string;
  documentId: string;
  className?: string;
}

export function DocVersionHistory({ companyId, documentId, className }: DocVersionHistoryProps) {
  const { versions, isLoading, fetchVersions, previousVersions, hasHistory } = useDocumentFileVersions(documentId);
  const { getDownloadUrl, downloadFile, logFileAudit } = useHRDocumentStorage(companyId);
  const [expanded, setExpanded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // No render if loading or no versions at all
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground py-2', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Cargando historial…</span>
      </div>
    );
  }

  // No versions = legacy or no file ever uploaded
  if (versions.length === 0) return null;

  // Only 1 version (current) = no history to show
  if (!hasHistory) return null;

  const versionAuditMeta = (v: DocumentFileVersion) => ({
    file_name: v.file_name,
    mime_type: v.mime_type ?? undefined,
    file_size_bytes: v.file_size_bytes ?? undefined,
    storage_path: v.storage_path,
    checksum: v.checksum ?? undefined,
  });

  const handlePreview = async (version: DocumentFileVersion) => {
    if (!isPreviewableMime(version.mime_type)) return;
    setLoadingPreview(true);
    const result = await getDownloadUrl(version.storage_path);
    if (result.ok) {
      setPreviewUrl(result.data);
      setPreviewVersion(version.id);
      logFileAudit('file_preview', documentId, true, versionAuditMeta(version));
    } else {
      logFileAudit('file_preview', documentId, false, { ...versionAuditMeta(version), error_message: 'Failed to get URL' });
    }
    setLoadingPreview(false);
  };

  const handleDownload = async (version: DocumentFileVersion) => {
    const result = await downloadFile(version.storage_path, version.file_name);
    logFileAudit('file_download', documentId, result.ok, versionAuditMeta(version));
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs font-medium text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <History className="h-3.5 w-3.5" />
          Historial de archivo ({previousVersions.length} versión{previousVersions.length !== 1 ? 'es' : ''} anterior{previousVersions.length !== 1 ? 'es' : ''})
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ScrollArea className={previousVersions.length > 3 ? 'max-h-[240px]' : ''}>
          <div className="space-y-1.5 pt-1.5 pl-1">
            {previousVersions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                onPreview={() => handlePreview(v)}
                onDownload={() => handleDownload(v)}
                isPreviewable={isPreviewableMime(v.mime_type)}
                previewUrl={previewVersion === v.id ? previewUrl : null}
                loadingPreview={loadingPreview && previewVersion === v.id}
                onClosePreview={() => { setPreviewUrl(null); setPreviewVersion(null); }}
              />
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Version Row ─────────────────────────────────────────────────────────────

interface VersionRowProps {
  version: DocumentFileVersion;
  onPreview: () => void;
  onDownload: () => void;
  isPreviewable: boolean;
  previewUrl: string | null;
  loadingPreview: boolean;
  onClosePreview: () => void;
}

function VersionRow({
  version: v,
  onPreview,
  onDownload,
  isPreviewable,
  previewUrl,
  loadingPreview,
  onClosePreview,
}: VersionRowProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-2.5 space-y-1.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              v{v.version_number}
            </Badge>
            <span className="text-xs truncate" title={v.file_name}>
              {v.file_name}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isPreviewable && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPreview} disabled={loadingPreview}>
                {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDownload}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(v.uploaded_at), 'dd MMM yyyy HH:mm', { locale: es })}
          </span>
          {v.mime_type && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {v.mime_type.split('/').pop()}
            </span>
          )}
          {v.file_size_bytes != null && (
            <span>{formatFileSize(v.file_size_bytes)}</span>
          )}
          {v.checksum && (
            <code className="bg-muted px-1 py-0.5 rounded text-[10px]" title={v.checksum}>
              {v.checksum.slice(0, 12)}…
            </code>
          )}
        </div>

        {/* Replace reason */}
        {v.replace_reason && (
          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <Replace className="h-3 w-3 shrink-0 mt-0.5" />
            <span>{v.replace_reason}</span>
          </div>
        )}

        {/* Inline preview */}
        {previewUrl && (
          <div className="rounded border overflow-hidden mt-1">
            <div className="flex justify-end px-1.5 py-0.5 bg-muted/50 border-b">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClosePreview}>✕</Button>
            </div>
            {v.mime_type === 'application/pdf' ? (
              <iframe src={previewUrl} className="w-full h-[200px] border-0" title={`Preview v${v.version_number}`} />
            ) : v.mime_type?.startsWith('image/') ? (
              <div className="p-1.5 flex justify-center">
                <img src={previewUrl} alt={v.file_name} className="max-h-[180px] max-w-full object-contain rounded" />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
