import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Shield, DollarSign, Scale, Heart } from 'lucide-react';
import { type PAAlert, type PADomain } from '@/hooks/erp/hr/usePeopleAnalytics';

interface Props {
  alerts: PAAlert[];
}

const domainIcons: Record<PADomain, React.ElementType> = {
  hr: AlertTriangle,
  payroll: DollarSign,
  compliance: Shield,
  equity: Scale,
  wellbeing: Heart,
};

const severityColors: Record<string, string> = {
  critical: 'bg-destructive/10 border-destructive/30',
  high: 'bg-amber-500/10 border-amber-500/30',
  medium: 'bg-primary/10 border-primary/30',
  low: 'bg-muted border-border',
};

export function PAAlertsFeed({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay alertas activas — todo bajo control</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Feed de Alertas ({alerts.length})</h3>
      </div>

      {alerts.map(alert => {
        const Icon = domainIcons[alert.domain] || AlertTriangle;
        return (
          <Card key={alert.id} className={severityColors[alert.severity]}>
            <CardContent className="p-3 flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'secondary'} className="text-[9px]">
                    {alert.severity}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">{alert.domain}</Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
