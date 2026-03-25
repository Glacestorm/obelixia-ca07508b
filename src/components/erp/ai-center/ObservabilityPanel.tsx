import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Gauge,
  Eye,
  Bot,
  GitBranch,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useObservabilityData, type InvocationRecord, type AgentPerformance, type EscalationEdge } from '@/hooks/erp/ai-center/useObservabilityData';
import { SemaphoreIndicator } from './SemaphoreIndicator';

/* ─── KPI Card ─── */
function ObsKPI({ icon: Icon, label, value, subtitle, color = 'text-primary' }: {
  icon: React.ElementType; label: string; value: string | number; subtitle?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium truncate">{label}</p>
            <p className={cn('text-xl font-bold mt-0.5', color)}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('p-1.5 rounded-lg bg-muted shrink-0', color)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Invocation Timeline ─── */
function InvocationTimeline({ invocations }: { invocations: InvocationRecord[] }) {
  if (invocations.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Sin invocaciones en este período</p>
      </div>
    );
  }

  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    if (s === 'error' || s === 'failure') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-1 pr-2">
        {invocations.map((inv) => (
          <div key={inv.id} className="flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-xs">
            <div className="pt-0.5">{statusIcon(inv.outcome_status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-semibold text-foreground">{inv.agent_code}</span>
                {inv.supervisor_code && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    via {inv.supervisor_code}
                  </Badge>
                )}
                {inv.escalated_to && (
                  <Badge className="text-[9px] h-4 px-1 bg-yellow-500/15 text-yellow-700 border-yellow-500/30">
                    → {inv.escalated_to}
                  </Badge>
                )}
              </div>
              {inv.input_summary && (
                <p className="text-muted-foreground truncate mt-0.5">{inv.input_summary}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                {inv.confidence_score != null && (
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" />
                    {inv.confidence_score}%
                  </span>
                )}
                {inv.execution_time_ms != null && (
                  <span className="flex items-center gap-0.5">
                    <Gauge className="h-3 w-3" />
                    {inv.execution_time_ms}ms
                  </span>
                )}
                <span>{format(new Date(inv.created_at), 'HH:mm:ss dd/MM', { locale: es })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/* ─── Agent Performance Table ─── */
function AgentPerformanceTable({ data }: { data: AgentPerformance[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Rendimiento por Agente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="text-left px-3 py-2 font-medium">Agente</th>
                <th className="text-right px-3 py-2 font-medium">Inv.</th>
                <th className="text-right px-3 py-2 font-medium">Éxito</th>
                <th className="text-right px-3 py-2 font-medium">Conf.</th>
                <th className="text-right px-3 py-2 font-medium">Lat.</th>
                <th className="text-right px-3 py-2 font-medium">Esc.</th>
              </tr>
            </thead>
            <tbody>
              {data.map((agent) => (
                <tr key={agent.agentCode} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono font-semibold">{agent.agentCode}</td>
                  <td className="text-right px-3 py-2">{agent.invocations}</td>
                  <td className="text-right px-3 py-2">
                    <span className={cn(
                      agent.successRate >= 90 ? 'text-emerald-600' : agent.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {agent.successRate}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-2">{agent.avgConfidence}%</td>
                  <td className="text-right px-3 py-2">{agent.avgLatency}ms</td>
                  <td className="text-right px-3 py-2">
                    {agent.escalations > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{agent.escalations}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ─── Escalation Map ─── */
function EscalationMap({ edges }: { edges: EscalationEdge[] }) {
  if (edges.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Mapa de Escalaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <GitBranch className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs">Sin escalaciones en este período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...edges.map(e => e.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Mapa de Escalaciones
          <Badge variant="secondary" className="text-[9px]">{edges.length} flujos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[230px]">
          <div className="space-y-2">
            {edges.map((edge, i) => (
              <div key={i} className="p-2 rounded-lg border bg-card space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-foreground">{edge.from}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono font-semibold text-foreground">{edge.to}</span>
                  <Badge className="ml-auto text-[9px] h-4 px-1.5">{edge.count}×</Badge>
                </div>
                <Progress value={(edge.count / maxCount) * 100} className="h-1" />
                {edge.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {edge.reasons.slice(0, 3).map((r, j) => (
                      <Badge key={j} variant="outline" className="text-[8px] h-4 px-1">{r}</Badge>
                    ))}
                    {edge.reasons.length > 3 && (
                      <Badge variant="outline" className="text-[8px] h-4 px-1">+{edge.reasons.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ─── Main Panel ─── */
const RANGE_OPTIONS = [
  { value: '1d', label: 'Hoy', days: 1 },
  { value: '7d', label: '7 días', days: 7 },
  { value: '30d', label: '30 días', days: 30 },
  { value: '90d', label: '90 días', days: 90 },
];

export function ObservabilityPanel() {
  const { invocations, kpis, agentPerformance, escalationEdges, loading, fetchInvocations } = useObservabilityData();
  const [range, setRange] = useState('7d');
  const [agentFilter, setAgentFilter] = useState('all');

  const agentCodes = Array.from(new Set(invocations.map(i => i.agent_code))).sort();

  useEffect(() => {
    const days = RANGE_OPTIONS.find(r => r.value === range)?.days || 7;
    const from = new Date(Date.now() - days * 86400000);
    fetchInvocations(from, new Date(), agentFilter !== 'all' ? agentFilter : undefined);
  }, [range, agentFilter, fetchInvocations]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold">Observabilidad y Trazabilidad</h2>
            <p className="text-[11px] text-muted-foreground">Timeline de invocaciones, rendimiento y escalaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos los agentes</SelectItem>
              {agentCodes.map(c => (
                <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => {
            const days = RANGE_OPTIONS.find(r => r.value === range)?.days || 7;
            fetchInvocations(new Date(Date.now() - days * 86400000), new Date(), agentFilter !== 'all' ? agentFilter : undefined);
          }} disabled={loading} className="h-8">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <ObsKPI icon={Activity} label="Invocaciones" value={kpis.totalInvocations} />
          <ObsKPI icon={CheckCircle} label="Tasa Éxito" value={`${kpis.successRate}%`} color={kpis.successRate >= 90 ? 'text-emerald-500' : 'text-yellow-500'} />
          <ObsKPI icon={TrendingUp} label="Confianza" value={`${kpis.avgConfidence}%`} color={kpis.avgConfidence >= 80 ? 'text-emerald-500' : 'text-yellow-500'} />
          <ObsKPI icon={Gauge} label="Latencia Media" value={`${kpis.avgLatency}ms`} />
          <ObsKPI icon={Gauge} label="P95 Latencia" value={`${kpis.p95Latency}ms`} color={kpis.p95Latency > 5000 ? 'text-red-500' : 'text-foreground'} />
          <ObsKPI icon={AlertTriangle} label="Escalaciones" value={`${kpis.escalationRate}%`} color={kpis.escalationRate > 20 ? 'text-yellow-500' : 'text-foreground'} />
          <ObsKPI icon={Zap} label="Autónomas" value={kpis.autonomousDecisions} subtitle="Sin revisión" />
          <ObsKPI icon={Eye} label="Rev. Humana" value={kpis.humanReviews} subtitle="Escaladas" />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Timeline de Invocaciones
                <Badge variant="secondary" className="text-[9px]">{invocations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvocationTimeline invocations={invocations} />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <EscalationMap edges={escalationEdges} />
          <AgentPerformanceTable data={agentPerformance} />
        </div>
      </div>
    </div>
  );
}

export default ObservabilityPanel;
