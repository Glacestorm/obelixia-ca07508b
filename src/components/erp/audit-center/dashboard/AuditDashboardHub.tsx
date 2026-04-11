/**
 * AuditDashboardHub — Dashboard principal con KPIs reales de auditoría
 */
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, ShieldCheck, FileText, Activity, TrendingDown, TrendingUp,
  Bot, Link2, Clock, Eye,
} from 'lucide-react';
import { useUnifiedAudit } from '@/hooks/erp/audit';
import { useAuditAgents } from '@/hooks/erp/audit';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function AuditDashboardHub() {
  const { kpis, events, isLoading, fetchUnifiedEvents } = useUnifiedAudit();
  const { stats, agents, fetchAuditAgents } = useAuditAgents();

  useEffect(() => {
    fetchUnifiedEvents();
    fetchAuditAgents();
  }, []);

  // Compute real agent hierarchy counts from agents array
  const internalAgentCount = agents.filter(a => 
    a.agent_code?.startsWith('AUDIT-AGT') || a.module_domain === 'audit'
  ).length;
  const externalAgentCount = agents.filter(a => 
    a.agent_code?.startsWith('AUDIT-EXT') || a.module_domain === 'audit_external'
  ).length;

  const kpiCards = [
    { label: 'Eventos totales', value: kpis.totalEvents, icon: Activity, color: 'text-blue-500' },
    { label: 'Alertas críticas', value: kpis.criticalAlerts, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Revisiones pendientes (est.)', value: kpis.pendingReviews, icon: Eye, color: 'text-amber-500' },
    { label: 'Resueltos hoy', value: kpis.resolvedToday, icon: ShieldCheck, color: 'text-emerald-500' },
    { label: 'Score compliance (est.)', value: `${kpis.complianceScore}%`, icon: FileText, color: 'text-primary' },
    { label: 'Agentes activos', value: kpis.activeAgents, icon: Bot, color: 'text-violet-500' },
    { label: 'Score riesgo (est.)', value: kpis.riskScore, icon: kpis.riskScore > 50 ? TrendingUp : TrendingDown, color: kpis.riskScore > 50 ? 'text-destructive' : 'text-emerald-500' },
    { label: 'Blockchain entries (est.)', value: kpis.blockchainEntries, icon: Link2, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${kpi.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Risk & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={kpis.complianceScore} className="h-3 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium text-foreground">{kpis.complianceScore}%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mapa de Riesgo por Dominio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['ERP', 'RRHH', 'IA', 'Compliance', 'General'].map((domain) => {
                const domainEvents = events.filter(e => e.module === domain);
                const risk = Math.min(100, domainEvents.filter(e => e.severity === 'critical').length * 15 + 10);
                return (
                  <div key={domain} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{domain}</span>
                    <Progress value={risk} className="h-2 flex-1" />
                    <Badge variant={risk > 60 ? 'destructive' : risk > 30 ? 'secondary' : 'outline'} className="text-[10px] h-5">
                      {risk}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Últimos Eventos de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Cargando eventos...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay eventos de auditoría registrados</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {events.slice(0, 15).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.severity === 'critical' ? 'bg-destructive animate-pulse' :
                    event.severity === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{event.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {event.module} · {event.source} · {formatDistanceToNow(new Date(event.created_at), { locale: es, addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={
                    event.severity === 'critical' ? 'destructive' :
                    event.severity === 'warning' ? 'secondary' : 'outline'
                  } className="text-[10px] h-5 flex-shrink-0">
                    {event.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Hierarchy Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" /> Jerarquía de Agentes de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* SuperSupervisor */}
            <div className="p-3 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 text-center">
              <Bot className="h-6 w-6 mx-auto text-amber-500 mb-1" />
              <p className="text-xs font-bold">SuperSupervisor</p>
              <p className="text-[10px] text-muted-foreground">AUDIT-SS-001</p>
              <Badge variant="outline" className="mt-1 text-[10px]">Nivel 3</Badge>
            </div>
            {/* Supervisors */}
            <div className="space-y-2">
              <div className="p-2 rounded-lg border border-blue-500/30 bg-blue-500/5 text-center">
                <p className="text-xs font-medium">Supervisor Interno</p>
                <p className="text-[10px] text-muted-foreground">{internalAgentCount > 0 ? `${internalAgentCount} agentes` : 'Sin datos (est.)'} · AUDIT-SUP-INT-001</p>
              </div>
              <div className="p-2 rounded-lg border border-green-500/30 bg-green-500/5 text-center">
                <p className="text-xs font-medium">Supervisor Externo</p>
                <p className="text-[10px] text-muted-foreground">{externalAgentCount > 0 ? `${externalAgentCount} agentes` : 'Sin datos (est.)'} · AUDIT-SUP-EXT-001</p>
              </div>
            </div>
            {/* Stats */}
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-xs font-medium mb-2">Métricas globales</p>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Total agentes</span><span className="font-medium">{stats.totalAgents}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tasa éxito</span><span className="font-medium">{stats.successRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Escalaciones</span><span className="font-medium">{stats.escalationRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Confianza media</span><span className="font-medium">{stats.avgConfidence}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
