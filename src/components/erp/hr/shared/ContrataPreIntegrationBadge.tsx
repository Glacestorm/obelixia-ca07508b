/**
 * ContrataPreIntegrationBadge — Compact pre-integration status for contract panel
 * V2-ES.6 Paso 2: Shows unified preparation status with consistency details
 *
 * Mirrors TGSSPreIntegrationBadge.tsx pattern (alta/afiliación).
 * Pure component — receives computed summary by prop.
 */
import { AlertTriangle, AlertOctagon, CheckCircle2, Shield, XCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContrataPreIntegrationSummary, ContrataPreIntegrationStatus } from './contrataPreIntegrationReadiness';

interface Props {
  summary: ContrataPreIntegrationSummary;
  /** Show detail rows (consistency issues, next steps) */
  showDetails?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<ContrataPreIntegrationStatus, { icon: typeof Shield; color: string; bg: string }> = {
  contrata_prepared:      { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  ready_internal:         { icon: Shield, color: 'text-blue-700', bg: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  blocked_by_consistency: { icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-500/10 text-red-700 border-red-500/30' },
  format_errors:          { icon: XCircle, color: 'text-orange-700', bg: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  incomplete:             { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
};

export function ContrataPreIntegrationBadge({ summary, showDetails = false, className }: Props) {
  const style = STATUS_STYLES[summary.status];
  const Icon = style.icon;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Status badge row */}
      <div className="flex items-center gap-2">
        <Shield className="h-3 w-3 shrink-0 text-primary" />
        <span className="text-[10px] text-muted-foreground">Pre-integración Contrat@:</span>
        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 gap-1', style.bg)}>
          <Icon className="h-2.5 w-2.5" />
          {summary.statusLabel}
          {summary.payload.readinessPercent > 0 && ` (${summary.payload.readinessPercent}%)`}
        </Badge>
      </div>

      {/* Detail rows */}
      {showDetails && (
        <div className="space-y-0.5 pl-5">
          {/* Consistency errors */}
          {summary.consistency.errors.map((msg, i) => (
            <div key={`e-${i}`} className="flex items-start gap-1 text-[10px] text-red-600">
              <XCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
          {/* Consistency warnings */}
          {summary.consistency.warnings.map((msg, i) => (
            <div key={`w-${i}`} className="flex items-start gap-1 text-[10px] text-amber-600">
              <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
          {/* Info items (only if no errors/warnings) */}
          {summary.consistency.errorCount === 0 && summary.consistency.warningCount === 0 &&
            summary.consistencyResult.infos.length > 0 && (
            summary.consistencyResult.infos.slice(0, 2).map((info, i) => (
              <div key={`i-${i}`} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                <span>{info.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
