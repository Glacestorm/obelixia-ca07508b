/**
 * HRCCLegalComplianceCard — Phase 1 placeholder.
 * No legal/compliance data is wired yet — Phase 2.
 * Disclaimer: "sin evidencia oficial archivada".
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';
import type { PlaceholderSnapshot } from '@/hooks/erp/hr/useHRCommandCenter';

interface Props {
  snapshot: PlaceholderSnapshot;
  onOpenCompliance?: () => void;
}

export function HRCCLegalComplianceCard({ snapshot, onOpenCompliance }: Props) {
  return (
    <Card data-testid="hr-cc-legal">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-primary" />
            Legal · Compliance
          </CardTitle>
          <Badge variant="muted">Sin datos</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground" data-testid="hr-cc-legal-disclaimer">
          {snapshot.disclaimer}
        </p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Canal denuncias — pendiente Fase 2</li>
          <li>• Plan de igualdad — pendiente Fase 2</li>
          <li>• Registro retributivo — pendiente Fase 2</li>
          <li>• PRL / desconexión digital — pendiente Fase 2</li>
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenCompliance}
          disabled={!onOpenCompliance}
          title={onOpenCompliance ? undefined : 'Navegación no disponible en esta vista'}
        >
          Abrir compliance
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCLegalComplianceCard;