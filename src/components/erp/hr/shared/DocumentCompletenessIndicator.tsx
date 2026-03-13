/**
 * DocumentCompletenessIndicator — Compact sidebar indicator
 * V2-ES.3 Paso 5 + V2-ES.4 Paso 1 parte 4: Enriched with mandatory/optional
 * Receives docs by prop (no independent fetch).
 */
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, FileText, ShieldAlert } from 'lucide-react';
import { useHRProcessDocRequirements } from '@/hooks/erp/hr/useHRProcessDocRequirements';

interface Props {
  managementType?: string | null;
  docs: Array<{ document_type: string }>;
}

export function DocumentCompletenessIndicator({ managementType, docs }: Props) {
  const { getCompleteness } = useHRProcessDocRequirements();
  const completeness = getCompleteness(managementType, docs);
  if (!completeness) return null;

  const isComplete = completeness.percentage === 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
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
      {!completeness.mandatoryComplete && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Obligatorios</span>
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 text-[10px] gap-0.5 h-4">
            <ShieldAlert className="h-2.5 w-2.5" />
            {completeness.mandatoryMissing.length} faltante{completeness.mandatoryMissing.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}
    </div>
  );
}
