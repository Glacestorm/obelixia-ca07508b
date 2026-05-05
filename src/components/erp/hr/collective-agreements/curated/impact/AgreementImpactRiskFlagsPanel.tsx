/**
 * B13.5C — Renders risk flags / blockers / warnings as chip lists.
 */
import { Badge } from '@/components/ui/badge';

interface Props {
  riskFlags?: unknown[];
  blockers?: unknown[];
  warnings?: unknown[];
}

function toLabel(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const r = v as { code?: string; message?: string };
    return r.code ?? r.message ?? JSON.stringify(v);
  }
  return String(v);
}

export function AgreementImpactRiskFlagsPanel({ riskFlags = [], blockers = [], warnings = [] }: Props) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <div className="text-xs font-medium text-muted-foreground">Risk flags</div>
        <div className="flex flex-wrap gap-1">
          {riskFlags.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            riskFlags.map((r, i) => (
              <Badge key={`rf-${i}`} variant="outline">
                {toLabel(r)}
              </Badge>
            ))
          )}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Blockers</div>
        <div className="flex flex-wrap gap-1">
          {blockers.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            blockers.map((r, i) => (
              <Badge key={`bl-${i}`} variant="destructive">
                {toLabel(r)}
              </Badge>
            ))
          )}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">Warnings</div>
        <div className="flex flex-wrap gap-1">
          {warnings.length === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : (
            warnings.map((r, i) => (
              <Badge key={`wn-${i}`} variant="secondary">
                {toLabel(r)}
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AgreementImpactRiskFlagsPanel;