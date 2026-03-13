/**
 * DocAlertsSummaryBar — Barra compacta de resumen de alertas documentales
 * V2-ES.4 Paso 1: Contadores de vencidos/próximos/vigentes
 * Componente puro — recibe docs por prop, sin fetch.
 */
import { AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeDocAlertSummary, type DocAlertSummary } from './documentStatusEngine';

interface DocAlertsSummaryBarProps {
  docs: Array<{ document_type: string; expiry_date: string | null }>;
  className?: string;
}

export function DocAlertsSummaryBar({ docs, className }: DocAlertsSummaryBarProps) {
  if (docs.length === 0) return null;

  const summary = computeDocAlertSummary(docs);

  // Don't render if everything is fine and no expiry tracking
  if (summary.needsAttention === 0 && summary.valid === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg border text-xs',
      summary.worstLight === 'red'
        ? 'bg-red-500/5 border-red-500/20'
        : summary.worstLight === 'amber'
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-emerald-500/5 border-emerald-500/20',
      className,
    )}>
      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {summary.expired > 0 && (
        <span className="flex items-center gap-1 text-red-700">
          <AlertTriangle className="h-3 w-3" />
          {summary.expired} vencido{summary.expired !== 1 ? 's' : ''}
        </span>
      )}

      {summary.expiring > 0 && (
        <span className="flex items-center gap-1 text-amber-700">
          <Clock className="h-3 w-3" />
          {summary.expiring} próximo{summary.expiring !== 1 ? 's' : ''}
        </span>
      )}

      {summary.valid > 0 && (
        <span className="flex items-center gap-1 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          {summary.valid} vigente{summary.valid !== 1 ? 's' : ''}
        </span>
      )}

      {summary.noExpiry > 0 && (
        <span className="text-muted-foreground">
          {summary.noExpiry} sin vencimiento
        </span>
      )}
    </div>
  );
}
