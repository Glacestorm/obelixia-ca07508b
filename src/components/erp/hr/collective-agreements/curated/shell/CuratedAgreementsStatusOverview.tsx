/**
 * B13.6 — Read-only status overview for the curated shell.
 *
 * Displays counters from existing auth-safe hooks. When data is not
 * available (auth required, hook errored, etc.) shows "N/D" without
 * breaking. Performs no DB writes and no `.from()` calls directly.
 */
import { Card, CardContent } from '@/components/ui/card';

export interface CuratedAgreementsStatusOverviewProps {
  counts?: Partial<{
    sourcesPending: number;
    documentsInIntake: number;
    extractionRuns: number;
    findingsPending: number;
    stagingPending: number;
    agreementsReady: number;
    impactPreviews: number;
    blockers: number;
  }>;
}

const CARDS: Array<{
  key: keyof NonNullable<CuratedAgreementsStatusOverviewProps['counts']>;
  label: string;
}> = [
  { key: 'sourcesPending', label: 'Fuentes pendientes' },
  { key: 'documentsInIntake', label: 'Documentos en intake' },
  { key: 'extractionRuns', label: 'Runs de extracción' },
  { key: 'findingsPending', label: 'Findings pendientes' },
  { key: 'stagingPending', label: 'Staging pendiente' },
  { key: 'agreementsReady', label: 'Convenios ready_for_payroll' },
  { key: 'impactPreviews', label: 'Previews de impacto' },
  { key: 'blockers', label: 'Bloqueos / riesgos' },
];

function fmt(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/D';
  return String(value);
}

export function CuratedAgreementsStatusOverview({
  counts,
}: CuratedAgreementsStatusOverviewProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2 md:grid-cols-4"
      aria-label="curated-status-overview"
    >
      {CARDS.map((c) => (
        <Card key={c.key} className="border-muted">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {fmt(counts?.[c.key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default CuratedAgreementsStatusOverview;