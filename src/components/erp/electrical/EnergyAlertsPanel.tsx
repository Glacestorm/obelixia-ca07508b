import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, Bell, Clock, FileText, RefreshCw, ArrowRight,
  FileWarning, Eye
} from 'lucide-react';
import { useEnergyAlerts, EnergyAlert } from '@/hooks/erp/useEnergyAlerts';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  onNavigateToCase?: (caseId: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-500', badge: 'destructive' as const, text: 'text-red-600' },
  high: { color: 'bg-orange-500', badge: 'destructive' as const, text: 'text-orange-600' },
  medium: { color: 'bg-amber-500', badge: 'secondary' as const, text: 'text-amber-600' },
  low: { color: 'bg-blue-500', badge: 'outline' as const, text: 'text-blue-600' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  contract_expiry: Clock,
  proposal_stale: FileText,
  missing_docs: FileWarning,
  workflow_stalled: AlertTriangle,
  pending_review: Eye,
};

export function EnergyAlertsPanel({ companyId, onNavigateToCase }: Props) {
  const { alerts, loading, refresh } = useEnergyAlerts(companyId);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Alertas operativas
            </CardTitle>
            <CardDescription>
              {alerts.length === 0
                ? 'Sin alertas pendientes'
                : `${alerts.length} alertas${criticalCount > 0 ? ` (${criticalCount} críticas)` : ''}`
              }
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} className="h-8 w-8">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
            <p className="text-sm text-muted-foreground">Todo en orden. No hay alertas activas.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {alerts.map(alert => {
                const config = SEVERITY_CONFIG[alert.severity];
                const Icon = TYPE_ICONS[alert.type] || AlertTriangle;
                return (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
                    <div className={cn("p-1.5 rounded-full shrink-0", config.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <Badge variant={config.badge} className="text-[10px] shrink-0">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
                    </div>
                    {onNavigateToCase && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() => onNavigateToCase(alert.caseId)}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default EnergyAlertsPanel;
