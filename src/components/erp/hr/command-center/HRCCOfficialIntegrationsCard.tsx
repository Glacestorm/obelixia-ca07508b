/**
 * HRCCOfficialIntegrationsCard — Phase 1 placeholder.
 * SAFETY: connectors NEVER show accepted / official_ready / submitted in Phase 1.
 * All entries default to "not_configured" until Phase 2 wires real readiness data
 * and only with archived evidence + official response.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import type { PlaceholderSnapshot } from '@/hooks/erp/hr/useHRCommandCenter';

const CONNECTORS = [
  'TGSS / Afiliación',
  'SILTRA / RLC / RNT',
  'CRA',
  'SEPE Contrat@',
  'Certific@2',
  'AEAT 111 / 190',
  'DELT@',
] as const;

interface Props {
  snapshot: PlaceholderSnapshot;
  onOpenIntegrations?: () => void;
}

export function HRCCOfficialIntegrationsCard({ snapshot, onOpenIntegrations }: Props) {
  return (
    <Card data-testid="hr-cc-officials">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4 text-primary" />
            Integraciones oficiales
          </CardTitle>
          <Badge variant="muted">Sin evidencia</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground" data-testid="hr-cc-officials-disclaimer">
          {snapshot.disclaimer}
        </p>
        <ul className="space-y-1 text-xs">
          {CONNECTORS.map((c) => (
            <li key={c} className="flex items-center justify-between rounded-md border bg-muted/20 px-2 py-1">
              <span className="text-muted-foreground">{c}</span>
              <Badge variant="muted" className="text-[10px]" data-testid="hr-cc-official-state">
                not_configured
              </Badge>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenIntegrations}
          disabled={!onOpenIntegrations}
          title={onOpenIntegrations ? undefined : 'Navegación no disponible en esta vista'}
        >
          Configurar conector
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCOfficialIntegrationsCard;