/**
 * DocReconciliationBadge — Indicador compacto de conciliación documental
 * V2-ES.4 Paso 1 (subfase): Flags manuales de reconciliación
 *
 * Solo se muestra para tipos documentales relevantes (nómina, RLC, RNT, CRA, modelo_111, finiquito).
 * Componente puro — recibe datos por prop.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link2, Link2Off } from 'lucide-react';
/**
 * @migration Sprint 4 — isReconcilableDocType and getApplicableChannels moved to
 * src/engines/erp/hr/docReconciliationRules.ts. Re-exported here for compatibility.
 */
import { isReconcilableDocType, getApplicableChannels as _getApplicableChannels } from '@/engines/erp/hr/docReconciliationRules';
export { isReconcilableDocType } from '@/engines/erp/hr/docReconciliationRules';

interface ReconciliationFlags {
  reconciled_with_payroll: boolean;
  reconciled_with_social_security: boolean;
  reconciled_with_tax: boolean;
  reconciliation_notes?: string | null;
}

export type ReconciliationChannel = 'payroll' | 'social_security' | 'tax';

const CHANNEL_LABELS: Record<ReconciliationChannel, string> = {
  payroll: 'Nómina',
  social_security: 'Seg. Social',
  tax: 'Fiscal',
};

const CHANNEL_KEYS: Record<ReconciliationChannel, keyof ReconciliationFlags> = {
  payroll: 'reconciled_with_payroll',
  social_security: 'reconciled_with_social_security',
  tax: 'reconciled_with_tax',
};

/**
 * Returns which reconciliation channels apply to a given doc type.
 */
export function getApplicableChannels(docType: string): ReconciliationChannel[] {
  return _getApplicableChannels(docType);
}

interface DocReconciliationBadgeProps {
  documentType: string;
  flags: ReconciliationFlags;
  className?: string;
}

export function DocReconciliationBadge({ documentType, flags, className }: DocReconciliationBadgeProps) {
  if (!isReconcilableDocType(documentType)) return null;

  const channels = getApplicableChannels(documentType);
  if (channels.length === 0) return null;

  const reconciled = channels.filter(ch => flags[CHANNEL_KEYS[ch]]);
  const allReconciled = reconciled.length === channels.length;
  const noneReconciled = reconciled.length === 0;

  const tooltipLines = channels.map(ch => {
    const ok = flags[CHANNEL_KEYS[ch]];
    return `${ok ? '✓' : '○'} ${CHANNEL_LABELS[ch]}`;
  });

  if (flags.reconciliation_notes) {
    tooltipLines.push(`Nota: ${flags.reconciliation_notes}`);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 gap-0.5 cursor-default',
              allReconciled
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                : noneReconciled
                  ? 'bg-muted text-muted-foreground border-border'
                  : 'bg-amber-500/10 text-amber-700 border-amber-500/30',
              className,
            )}
          >
            {allReconciled ? (
              <Link2 className="h-2.5 w-2.5" />
            ) : (
              <Link2Off className="h-2.5 w-2.5" />
            )}
            {reconciled.length}/{channels.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs whitespace-pre-line">
          <p className="font-medium mb-0.5">Conciliación</p>
          {tooltipLines.join('\n')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
