import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Shield, FileText, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { type PAComplianceRisks } from '@/hooks/erp/hr/usePeopleAnalytics';

interface Props {
  data: PAComplianceRisks | null;
  isLoading: boolean;
}

export function PAComplianceDashboard({ data, isLoading }: Props) {
  if (isLoading && !data) {
    return <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>;
  }

  if (!data) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Sin datos de compliance disponibles</CardContent></Card>;
  }

  const riskColor = data.riskScore > 70 ? 'text-destructive' : data.riskScore > 40 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="space-y-4">
      {/* Risk score */}
      <Card className={data.riskScore > 50 ? 'border-destructive/30 bg-destructive/5' : 'border-border/50'}>
        <CardContent className="p-6 text-center">
          <Shield className={`h-8 w-8 mx-auto mb-2 ${riskColor}`} />
          <p className="text-sm text-muted-foreground">Índice de Riesgo de Cumplimiento</p>
          <p className={`text-4xl font-bold ${riskColor}`}>{data.riskScore}/100</p>
          <Progress value={data.riskScore} className="h-2 mt-3 max-w-xs mx-auto" />
        </CardContent>
      </Card>

      {/* Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Docs Expirados', value: data.expiredDocuments, icon: FileText, color: data.expiredDocuments > 0 ? 'text-destructive' : 'text-emerald-500' },
          { label: 'Consentimientos', value: data.pendingConsents, icon: CheckCircle, color: data.pendingConsents > 0 ? 'text-amber-500' : 'text-emerald-500' },
          { label: 'Envíos Rechazados', value: data.rejectedSubmissions, icon: AlertTriangle, color: data.rejectedSubmissions > 0 ? 'text-destructive' : 'text-emerald-500' },
          { label: 'SLA Incumplido', value: data.slaBreach, icon: Clock, color: data.slaBreach > 0 ? 'text-destructive' : 'text-emerald-500' },
          { label: 'Tareas Vencidas', value: data.overdueTasks, icon: AlertTriangle, color: data.overdueTasks > 0 ? 'text-amber-500' : 'text-emerald-500' },
        ].map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk items */}
      {data.items.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Riesgos Identificados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md border text-xs">
                  <Badge variant={item.severity === 'high' ? 'destructive' : 'secondary'} className="text-[9px] shrink-0 mt-0.5">
                    {item.severity}
                  </Badge>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-muted-foreground capitalize">{item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
