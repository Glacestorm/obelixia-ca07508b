/**
 * HRCCOfficialIntegrationsCard — Phase 2C
 *
 * Read-only readiness view of official HR connectors. The card NEVER shows
 * `accepted` / `submitted` / `official_ready` unless the snapshot's
 * degradation rules permit it (evidence + official response + production
 * certificate where applicable). No submission / no export actions.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { OfficialIntegrationsSnapshot } from '@/hooks/erp/hr/useOfficialIntegrationsSnapshot';

const STATE_LABELS: Record<string, string> = {
  not_configured: 'no configurado',
  credentials_pending: 'credenciales pendientes',
  certificate_pending: 'certificado pendiente',
  sandbox_ready: 'sandbox listo',
  uat_in_progress: 'UAT en curso',
  uat_passed: 'UAT superado',
  official_ready: 'official_ready',
  submitted: 'submitted',
  accepted: 'accepted',
  rejected: 'rechazado',
  correction_required: 'corrección requerida',
};

function globalBadgeVariant(level: string): 'success' | 'warning' | 'destructive' | 'muted' {
  if (level === 'green') return 'success';
  if (level === 'amber') return 'warning';
  if (level === 'red') return 'destructive';
  return 'muted';
}

function globalBadgeLabel(level: string, label: string): string {
  if (level === 'gray') return 'Sin datos oficiales';
  if (level === 'red') return 'Incidencia oficial';
  if (level === 'amber') return 'Revisión oficial';
  if (level === 'green') return 'Readiness operativo';
  return label;
}

function itemBadgeVariant(state: string): 'success' | 'warning' | 'destructive' | 'muted' {
  if (state === 'accepted') return 'success';
  if (state === 'rejected') return 'destructive';
  if (state === 'correction_required') return 'warning';
  if (state === 'official_ready' || state === 'submitted' || state === 'uat_passed') {
    return 'warning';
  }
  return 'muted';
}

interface Props {
  snapshot: OfficialIntegrationsSnapshot;
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
          <Badge
            variant={globalBadgeVariant(snapshot.level)}
            data-testid="hr-cc-officials-global-badge"
          >
            {globalBadgeLabel(snapshot.level, snapshot.label)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p
          className="text-xs text-muted-foreground"
          data-testid="hr-cc-officials-disclaimer"
        >
          {snapshot.disclaimer}
        </p>

        <ul className="space-y-1 text-xs">
          {snapshot.items.map((item) => (
            <li
              key={item.key}
              className="rounded-md border bg-muted/20 px-2 py-1"
              data-testid={`hr-cc-official-row-${item.key}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-1">
                  {item.hasEvidence && (
                    <ShieldCheck
                      className="h-3 w-3 text-success"
                      aria-label="evidencia archivada"
                      data-testid={`hr-cc-official-evidence-${item.key}`}
                    />
                  )}
                  <Badge
                    variant={itemBadgeVariant(item.displayedState)}
                    className="text-[10px]"
                    data-testid="hr-cc-official-state"
                  >
                    {STATE_LABELS[item.displayedState] ?? item.displayedState}
                  </Badge>
                </div>
              </div>
              {item.degraded && (
                <div
                  className="mt-1 flex items-start gap-1 text-[10px] text-warning"
                  data-testid={`hr-cc-official-warning-${item.key}`}
                >
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    {item.warning}
                    {' · '}
                    <span className="text-muted-foreground">
                      raw: {STATE_LABELS[item.rawState] ?? item.rawState}
                    </span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenIntegrations}
          disabled={!onOpenIntegrations}
          title={
            onOpenIntegrations
              ? undefined
              : 'Navegación no disponible en esta vista'
          }
        >
          Configurar integraciones
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCOfficialIntegrationsCard;