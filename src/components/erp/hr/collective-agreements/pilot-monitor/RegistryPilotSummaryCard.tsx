/**
 * B10F.5 — Read-only summary card.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RegistryPilotMonitorSummary, PilotDecisionLogRow } from '@/hooks/erp/hr/useRegistryPilotMonitor';

interface Props {
  summary: RegistryPilotMonitorSummary;
  mostRecent: PilotDecisionLogRow | null;
}

export function RegistryPilotSummaryCard({ summary, mostRecent }: Props) {
  return (
    <Card data-testid="pilot-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Resumen decisiones piloto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex gap-2">
          <Badge variant="default" data-testid="summary-applied">applied: {summary.applied}</Badge>
          <Badge variant="destructive" data-testid="summary-blocked">blocked: {summary.blocked}</Badge>
          <Badge variant="secondary" data-testid="summary-fallback">fallback: {summary.fallback}</Badge>
        </div>
        <div className="text-muted-foreground">
          {mostRecent ? (
            <span data-testid="most-recent">
              Más reciente: {mostRecent.decision_outcome} — {mostRecent.decided_at}
            </span>
          ) : (
            <span>Sin decisiones registradas.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RegistryPilotSummaryCard;