/**
 * HRCCVPTReadinessCard — Phase 1 placeholder.
 * VPT/S9 stays internal_ready. Disclaimer of non-official status is mandatory.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';
import type { PlaceholderSnapshot } from '@/hooks/erp/hr/useHRCommandCenter';

interface Props {
  snapshot: PlaceholderSnapshot;
  onOpenVPT?: () => void;
}

export function HRCCVPTReadinessCard({ snapshot, onOpenVPT }: Props) {
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
        <p className="text-xs text-muted-foreground" data-testid="hr-cc-vpt-disclaimer">
          {snapshot.disclaimer}
        </p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• % puestos valorados — pendiente Fase 2</li>
          <li>• VPT aprobadas con version_id — pendiente Fase 2</li>
          <li>• Brechas detectadas — pendiente Fase 2</li>
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenVPT}
          disabled={!onOpenVPT}
          title={onOpenVPT ? undefined : 'Navegación no disponible en esta vista'}
        >
          Abrir S9 VPT Workspace
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCVPTReadinessCard;