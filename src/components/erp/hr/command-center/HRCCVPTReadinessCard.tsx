/**
 * HRCCVPTReadinessCard — Phase 1 placeholder.
 * VPT/S9 stays internal_ready. Disclaimer of non-official status is mandatory.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VPTSnapshot, ReadinessLevel } from '@/hooks/erp/hr/useHRCommandCenter';

interface Props {
  snapshot: VPTSnapshot;
  onOpenVPT?: () => void;
}

const levelToLabel: Record<ReadinessLevel, string> = {
  green: 'Operativo',
  amber: 'Revisión',
  red: 'Bloqueado',
  gray: 'Sin datos',
};

const levelToClass: Record<ReadinessLevel, string> = {
  green: 'bg-success/15 text-success border-success/30',
  amber: 'bg-warning/15 text-warning border-warning/30',
  red: 'bg-destructive/15 text-destructive border-destructive/30',
  gray: 'bg-muted text-muted-foreground border-muted',
};

export function HRCCVPTReadinessCard({ snapshot, onOpenVPT }: Props) {
  const {
    level,
    score,
    totalPositions,
    valuatedPositions,
    coverage,
    approvedCount,
    approvedWithVersionId,
    approvedWithoutVersionId,
    incoherencesCount,
  } = snapshot;
  const fmt = (v: number | null) => (v === null || v === undefined ? '—' : String(v));

  return (
    <Card data-testid="hr-cc-vpt">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-primary" />
            VPT · S9
          </CardTitle>
          <Badge variant="info" data-testid="hr-cc-vpt-badge">internal_ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span
            className={cn('rounded-md border px-2 py-0.5 text-xs', levelToClass[level])}
            data-testid="hr-cc-vpt-level"
          >
            {levelToLabel[level]} · {score === null ? '—' : score}
          </span>
          <span className="text-xs text-muted-foreground" data-testid="hr-cc-vpt-coverage">
            cobertura {coverage === null ? '—' : `${coverage}%`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="hr-cc-vpt-disclaimer">
          {snapshot.disclaimer}
        </p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li data-testid="hr-cc-vpt-total-positions">
            • Puestos: {fmt(totalPositions)}
          </li>
          <li data-testid="hr-cc-vpt-valuated-positions">
            • Puestos valorados: {fmt(valuatedPositions)}
          </li>
          <li data-testid="hr-cc-vpt-approved">
            • Aprobadas: {fmt(approvedCount)}
          </li>
          <li data-testid="hr-cc-vpt-with-version">
            • Con version_id: {fmt(approvedWithVersionId)}
          </li>
          <li
            data-testid="hr-cc-vpt-without-version"
            className={cn(approvedWithoutVersionId && approvedWithoutVersionId > 0 && 'text-destructive')}
          >
            • Sin version_id: {fmt(approvedWithoutVersionId)}
          </li>
          <li data-testid="hr-cc-vpt-incoherences">
            • Incoherencias: {fmt(incoherencesCount)}
          </li>
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenVPT}
          disabled={!onOpenVPT}
          title={onOpenVPT ? undefined : 'Navegación no disponible en esta vista'}
          data-testid="hr-cc-vpt-open"
        >
          Abrir VPT / S9
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCVPTReadinessCard;