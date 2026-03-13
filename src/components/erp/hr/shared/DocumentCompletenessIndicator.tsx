/**
 * DocumentCompletenessIndicator — Compact sidebar indicator
 * V2-ES.3 Paso 5: Resumen documental en sidebar
 * Receives docs by prop (no independent fetch).
 */
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { computeDocCompleteness } from './documentExpectedTypes';

interface Props {
  managementType?: string | null;
  docs: Array<{ document_type: string }>;
}

export function DocumentCompletenessIndicator({ managementType, docs }: Props) {
  const completeness = computeDocCompleteness(managementType, docs);
  if (!completeness) return null;

  const isComplete = completeness.percentage === 100;

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        Documentos
      </span>
      {isComplete ? (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Completo
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs gap-1">
          <AlertCircle className="h-3 w-3" />
          {completeness.completed}/{completeness.total}
        </Badge>
      )}
    </div>
  );
}
