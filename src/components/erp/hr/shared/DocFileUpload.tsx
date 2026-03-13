/**
 * DocFileUpload — Componente de subida de archivo para documentos HR
 * V2-ES.4 Paso 3.3
 *
 * Soporta drag & drop + click, validación, progreso y feedback.
 * Desacoplado del proveedor de storage (usa useHRDocumentStorage).
 */
import { useState, useCallback, useRef, type DragEvent } from 'react';
import { Upload, FileUp, CheckCircle2, AlertTriangle, Loader2, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  useHRDocumentStorage,
  validateFile,
  formatFileSize,
  HR_DOC_MAX_SIZE_BYTES,
  HR_DOC_ALLOWED_EXTENSIONS,
} from '@/hooks/erp/hr/useHRDocumentStorage';

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

interface DocFileUploadProps {
  companyId: string;
  employeeId: string;
  documentId: string;
  /** If file is already attached, show replace mode */
  hasExistingFile?: boolean;
  existingFileName?: string | null;
  existingStoragePath?: string | null;
  onUploadComplete?: () => void;
  className?: string;
}

export function DocFileUpload({
  companyId,
  employeeId,
  documentId,
  hasExistingFile = false,
  existingFileName,
  existingStoragePath,
  onUploadComplete,
  className,
}: DocFileUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replaceReason, setReplaceReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { uploadFile } = useHRDocumentStorage(companyId);

  const allowedExtsLabel = Array.from(HR_DOC_ALLOWED_EXTENSIONS).join(', ');
  const maxSizeLabel = formatFileSize(HR_DOC_MAX_SIZE_BYTES);

  // ── Validate & stage file ──
  const stageFile = useCallback((file: File) => {
    setErrorMessage('');
    setState('validating');

    const validationError = validateFile(file);
    if (validationError) {
      setState('error');
      setErrorMessage(validationError.message);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setState('idle');
  }, []);

  // ── Execute upload ──
  const executeUpload = useCallback(async () => {
    if (!selectedFile) return;

    setState('uploading');
    setProgress(10);

    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 85));
    }, 300);

    try {
      const result = await uploadFile(documentId, employeeId, selectedFile, existingStoragePath, hasExistingFile ? (replaceReason || null) : null);

      clearInterval(progressTimer);

      if (result.ok) {
        setProgress(100);
        setState('success');
        onUploadComplete?.();
      } else {
        const err = result as { ok: false; error: { message: string } };
        setState('error');
        setErrorMessage(err.error.message);
        setProgress(0);
      }
    } catch {
      clearInterval(progressTimer);
      setState('error');
      setErrorMessage('Error inesperado al subir el archivo');
      setProgress(0);
    }
  }, [selectedFile, documentId, employeeId, existingStoragePath, uploadFile, onUploadComplete, hasExistingFile, replaceReason]);

  // ── Reset ──
  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage('');
    setProgress(0);
    setSelectedFile(null);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  // ── Drag handlers ──
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) stageFile(file);
  }, [stageFile]);

  // ── File input handler ──
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
  }, [stageFile]);

  // ── Success state ──
  if (state === 'success') {
    return (
      <div className={cn('rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3', className)}>
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">Archivo subido correctamente</span>
        </div>
        <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={reset}>
          Subir otro archivo
        </Button>
      </div>
    );
  }

  // ── Uploading state ──
  if (state === 'uploading') {
    return (
      <div className={cn('rounded-lg border p-3 space-y-2', className)}>
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground">Subiendo archivo…</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
      </div>
    );
  }

  // ── File staged (ready to upload) ──
  if (selectedFile && state === 'idle') {
    return (
      <div className={cn('rounded-lg border p-3 space-y-2', className)}>
        <div className="flex items-center gap-2">
          <File className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {hasExistingFile && (
          <div className="space-y-1.5">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Esto reemplazará el archivo actual{existingFileName ? ` (${existingFileName})` : ''}
            </p>
            <textarea
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
              placeholder="Motivo del reemplazo (opcional)"
              className="w-full text-xs rounded border border-input bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              maxLength={500}
            />
          </div>
        )}
        <Button size="sm" className="w-full gap-1.5 h-8" onClick={executeUpload}>
          <FileUp className="h-3.5 w-3.5" />
          {hasExistingFile ? 'Reemplazar archivo' : 'Subir archivo'}
        </Button>
      </div>
    );
  }

  // ── Default: drop zone ──
  return (
    <div className={cn('space-y-1', className)}>
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={cn(
          'rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors',
          'hover:border-primary/50 hover:bg-accent/50',
          dragOver && 'border-primary bg-accent',
          state === 'error' && 'border-destructive/50 bg-destructive/5',
        )}
      >
        <Upload className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {hasExistingFile ? 'Arrastra para reemplazar' : 'Arrastra o haz clic'}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {allowedExtsLabel} · máx. {maxSizeLabel}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={Array.from(HR_DOC_ALLOWED_EXTENSIONS).join(',')}
        onChange={handleInputChange}
      />

      {state === 'error' && errorMessage && (
        <div className="flex items-start gap-1.5 text-xs text-destructive mt-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
