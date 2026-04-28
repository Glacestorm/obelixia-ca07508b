/**
 * HRCCDocumentaryCard — Phase 1.
 * Real stats from useHRDocumentExpedient.getExpedientStats().
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import type { DocumentarySnapshot, ReadinessLevel } from '@/hooks/erp/hr/useHRCommandCenter';

const variantMap: Record<ReadinessLevel, 'success' | 'warning' | 'destructive' | 'muted'> = {
  green: 'success', amber: 'warning', red: 'destructive', gray: 'muted',
};
const labelMap: Record<ReadinessLevel, string> = {
  green: 'Listo', amber: 'Revisión', red: 'Bloqueado', gray: 'Sin datos',
};

interface Props {
  snapshot: DocumentarySnapshot;
  onOpenExpedient?: () => void;
}

export function HRCCDocumentaryCard({ snapshot, onOpenExpedient }: Props) {
  const fmt = (v: number | null) => (v === null ? '—' : v.toString());
  return (
    <Card data-testid="hr-cc-documentary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            Expediente documental
          </CardTitle>
          <Badge variant={variantMap[snapshot.level]}>{labelMap[snapshot.level]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Total" value={fmt(snapshot.total)} />
          <Metric label="Vencen pronto" value={fmt(snapshot.expiringSoon)} />
          <Metric label="Sin verificar" value={fmt(snapshot.unverified)} />
          <Metric label="Consentim." value={fmt(snapshot.activeConsents)} />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenExpedient}
          disabled={!onOpenExpedient}
          title={onOpenExpedient ? undefined : 'Navegación no disponible en esta vista'}
        >
          Abrir expediente
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md border bg-muted/20 p-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}

export default HRCCDocumentaryCard;