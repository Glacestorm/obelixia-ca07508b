/**
 * DocAutoGenerateButton — Botón para generar expediente documental automático
 * V2-ES.4 Paso 5.3: Integración UI ligera en detalle de solicitud
 *
 * REGLAS:
 * - Solo visible si hay reglas para el request_type Y hay docs pendientes de crear
 * - Preview antes de ejecutar (dry-run)
 * - Idempotente: no duplica documentos existentes
 * - No invasivo: desaparece si todo está generado
 * - Compatible con LinkedDocumentsSection y checklist
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileStack, Check, Loader2 } from 'lucide-react';
import { useHRDocumentGenerator, type GenerationContext, type GenerationResult } from '@/hooks/erp/hr/useHRDocumentGenerator';
import { cn } from '@/lib/utils';

interface DocAutoGenerateButtonProps {
  companyId: string;
  employeeId: string;
  employeeName?: string;
  requestType: string;
  requestId: string;
  /** Callback after generation to refresh document lists */
  onGenerated?: (result: GenerationResult) => void;
  className?: string;
}

export function DocAutoGenerateButton({
  companyId,
  employeeId,
  employeeName,
  requestType,
  requestId,
  onGenerated,
  className,
}: DocAutoGenerateButtonProps) {
  const { generateDocuments, previewGeneration, isGenerating, isLoading } = useHRDocumentGenerator();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);

  const context: GenerationContext = {
    companyId,
    employeeId,
    employeeName,
    requestType,
    relatedEntityType: 'admin_request',
    relatedEntityId: requestId,
  };

  // Preview on mount to determine visibility
  useEffect(() => {
    let cancelled = false;

    async function checkPending() {
      const preview = await previewGeneration(context);
      if (!cancelled) {
        const toCreate = preview.filter(d => d.status === 'created').length;
        setPendingCount(toCreate);
      }
    }

    if (!isLoading) {
      checkPending();
    }

    return () => { cancelled = true; };
  }, [requestType, requestId, employeeId, isLoading]);

  const handleGenerate = useCallback(async () => {
    const result = await generateDocuments(context);
    setLastResult(result);
    setPendingCount(0);
    onGenerated?.(result);
  }, [generateDocuments, context, onGenerated]);

  // Don't render if loading, no pending docs, or already generated
  if (isLoading || pendingCount === null) return null;

  // Already all generated
  if (pendingCount === 0 && !lastResult) {
    return null;
  }

  // Show success state briefly after generation
  if (lastResult && lastResult.generated > 0) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-green-600', className)}>
        <Check className="h-3.5 w-3.5" />
        <span>{lastResult.generated} borrador{lastResult.generated > 1 ? 'es' : ''} generado{lastResult.generated > 1 ? 's' : ''}</span>
      </div>
    );
  }

  if (pendingCount === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1.5 text-xs', className)}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileStack className="h-3.5 w-3.5" />
            )}
            Generar expediente
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {pendingCount}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          Crear {pendingCount} documento{pendingCount > 1 ? 's' : ''} esperado{pendingCount > 1 ? 's' : ''} como borrador
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
