/**
 * IntegrationsHubDashboard — KPIs + alertas del hub de integraciones
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Send, CheckCircle, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import type { HubStats, OfficialSubmission, IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface Props {
  stats: HubStats;
  submissions: OfficialSubmission[];
  adapters: IntegrationAdapter[];
  onRefresh: () => void;
  isLoading: boolean;
}

const STAT_CARDS = [
  { key: 'total' as const, label: 'Total envíos', icon: FileText, color: 'text-primary' },
  { key: 'draft' as const, label: 'Borradores', icon: Clock, color: 'text-muted-foreground' },
  { key: 'sent' as const, label: 'Enviados', icon: Send, color: 'text-blue-500' },
  { key: 'accepted' as const, label: 'Aceptados', icon: CheckCircle, color: 'text-green-500' },
  { key: 'rejected' as const, label: 'Rechazados', icon: XCircle, color: 'text-destructive' },
  { key: 'overdue' as const, label: 'Vencidos', icon: AlertTriangle, color: 'text-amber-500' },
];

export function IntegrationsHubDashboard({ stats, submissions, adapters, onRefresh, isLoading }: Props) {
  const recentSubmissions = submissions.slice(0, 8);
  const activeAdapters = adapters.filter(a => a.is_active);
  const alertSubmissions = submissions.filter(s =>
    s.status === 'rejected' || s.status === 'correction_required' ||
    (s.response_deadline && new Date(s.response_deadline) < new Date() && !['accepted', 'cancelled'].includes(s.status))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Hub de Integraciones Oficiales</h3>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-2xl font-bold">{stats[key]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas ({alertSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {alertSubmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Sin alertas activas</p>
            ) : alertSubmissions.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                <div>
                  <span className="font-medium">{s.submission_type}</span>
                  {s.submission_subtype && <span className="text-muted-foreground"> — {s.submission_subtype}</span>}
                </div>
                <Badge variant={s.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {s.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Adapters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Conectores activos ({activeAdapters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {activeAdapters.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                <div>
                  <span className="font-medium">{a.adapter_name}</span>
                  <span className="text-muted-foreground ml-1.5">{a.country_code}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{a.adapter_type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
          {recentSubmissions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Sin envíos registrados</p>
          ) : recentSubmissions.map(s => (
            <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
              <span>{s.submission_type}{s.submission_subtype ? ` — ${s.submission_subtype}` : ''}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString('es-ES')}</span>
                <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
