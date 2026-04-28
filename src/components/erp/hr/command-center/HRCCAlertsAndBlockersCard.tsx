/**
 * HRCCAlertsAndBlockersCard — Phase 3
 *
 * Renders the aggregated alerts snapshot: top 5 risks, top 5 actions,
 * upcoming deadlines and counts. Read-only; CTAs delegate to host callbacks.
 * Legal / official actions display a "Revisión humana" chip.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { HRCommandCenterData } from '@/hooks/erp/hr/useHRCommandCenter';
import type {
  HRCommandCenterAction,
  HRCommandCenterRisk,
  HRCtaTarget,
  HRRiskSeverity,
} from '@/hooks/erp/hr/hrCommandCenterAlerts';

interface Props {
  data: HRCommandCenterData;
  onOpenAlerts?: () => void;
  onOpenPayroll?: () => void;
  onOpenExpedient?: () => void;
  onOpenCompliance?: () => void;
  onOpenVPT?: () => void;
  onOpenIntegrations?: () => void;
}

const SEVERITY_VARIANT: Record<HRRiskSeverity, 'destructive' | 'warning' | 'muted'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'warning',
  low: 'muted',
};

const SEVERITY_LABEL: Record<HRRiskSeverity, string> = {
  critical: 'crítico',
  high: 'alto',
  medium: 'medio',
  low: 'bajo',
};

function callbackFor(
  target: HRCtaTarget | undefined,
  cbs: Pick<Props, 'onOpenPayroll' | 'onOpenExpedient' | 'onOpenCompliance' | 'onOpenVPT' | 'onOpenIntegrations' | 'onOpenAlerts'>,
): (() => void) | undefined {
  switch (target) {
    case 'payroll':      return cbs.onOpenPayroll;
    case 'expedient':    return cbs.onOpenExpedient;
    case 'compliance':   return cbs.onOpenCompliance;
    case 'vpt':          return cbs.onOpenVPT;
    case 'integrations': return cbs.onOpenIntegrations;
    case 'employees':    return undefined;
    default:             return cbs.onOpenAlerts;
  }
}

export function HRCCAlertsAndBlockersCard(props: Props) {
  const { data } = props;
  const alerts = data.alerts;
  const totalBlockers = alerts.criticalCount;
  const totalWarnings = alerts.warningCount;

  const isEmpty =
    alerts.topRisks.length === 0 && alerts.topActions.length === 0;

  return (
    <Card data-testid="hr-cc-alerts">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Alertas & bloqueos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={totalBlockers > 0 ? 'destructive' : 'muted'}>
              {totalBlockers} bloqueos
            </Badge>
            <Badge variant={totalWarnings > 0 ? 'warning' : 'muted'}>
              {totalWarnings} avisos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p
          className="text-xs text-muted-foreground"
          data-testid="hr-cc-alerts-disclaimer"
        >
          {alerts.disclaimer}
        </p>

        {isEmpty ? (
          <div
            className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground"
            data-testid="hr-cc-alerts-empty"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Sin bloqueos críticos detectados.</span>
          </div>
        ) : (
          <>
            {/* Top risks */}
            <div data-testid="hr-cc-alerts-top-risks">
              <p className="text-[11px] uppercase text-muted-foreground mb-1">
                Top 5 riesgos del mes
              </p>
              <ul className="space-y-1">
                {alerts.topRisks.map((r: HRCommandCenterRisk) => (
                  <li
                    key={r.id}
                    className="rounded-md border bg-muted/10 px-2 py-1.5"
                    data-testid="hr-cc-alerts-risk-row"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={SEVERITY_VARIANT[r.severity]}
                            className="text-[10px]"
                          >
                            {SEVERITY_LABEL[r.severity]}
                          </Badge>
                          {r.isOfficial && (
                            <Badge variant="muted" className="text-[10px]">
                              oficial
                            </Badge>
                          )}
                          {r.isInternalOnly && (
                            <Badge variant="muted" className="text-[10px]">
                              internal_ready
                            </Badge>
                          )}
                          {r.evidenceRequired && (
                            <Badge variant="warning" className="text-[10px]">
                              evidencia requerida
                            </Badge>
                          )}
                          <span className="text-xs font-medium">{r.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {r.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top actions */}
            <div data-testid="hr-cc-alerts-top-actions">
              <p className="text-[11px] uppercase text-muted-foreground mb-1">
                Top 5 acciones recomendadas
              </p>
              <ul className="space-y-1">
                {alerts.topActions.map((a: HRCommandCenterAction) => {
                  const cb = callbackFor(a.ctaTarget, props);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-2 rounded-md border bg-muted/10 px-2 py-1.5"
                      data-testid="hr-cc-alerts-action-row"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="muted" className="text-[10px]">
                            #{a.priority}
                          </Badge>
                          {a.blocksClose && (
                            <Badge variant="destructive" className="text-[10px]">
                              bloquea cierre
                            </Badge>
                          )}
                          {a.requiresHumanReview && (
                            <Badge
                              variant="warning"
                              className="text-[10px] flex items-center gap-1"
                              data-testid="hr-cc-alerts-action-human-review"
                            >
                              <ShieldAlert className="h-3 w-3" />
                              revisión humana
                            </Badge>
                          )}
                          <span className="text-xs font-medium">{a.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {a.reason}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={cb}
                        disabled={!cb}
                        title={
                          cb
                            ? a.ctaLabel
                            : 'Navegación no disponible en esta vista'
                        }
                      >
                        {a.ctaLabel}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Deadlines */}
            {alerts.nextDeadlines.length > 0 && (
              <div data-testid="hr-cc-alerts-deadlines">
                <p className="text-[11px] uppercase text-muted-foreground mb-1">
                  Próximos deadlines
                </p>
                <ul className="space-y-1 text-[11px]">
                  {alerts.nextDeadlines.map((r) => (
                    <li
                      key={`dl-${r.id}`}
                      className="flex items-center justify-between"
                    >
                      <span className="text-muted-foreground">{r.dueDate}</span>
                      <span>{r.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={props.onOpenAlerts}
          disabled={!props.onOpenAlerts}
          title={
            props.onOpenAlerts
              ? undefined
              : 'Navegación no disponible en esta vista'
          }
        >
          Ver detalle
        </Button>
      </CardContent>
    </Card>
  );
}

export default HRCCAlertsAndBlockersCard;