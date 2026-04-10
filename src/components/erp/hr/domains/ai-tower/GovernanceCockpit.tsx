/**
 * GovernanceCockpit — 4 tabs: Agentes, Observabilidad, Escalaciones, Gobernanza
 * Absorbed from HRGovernancePage.tsx standalone (S8.5)
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Brain, Activity, Shield, AlertTriangle, CheckCircle, Clock,
  RefreshCw, Eye, Zap, BarChart3, Users, TrendingUp,
  CircleDot, ArrowUpRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentStatus {
  id: string; code: string; name: string; status: string; agent_type: string;
  module_domain: string; confidence_threshold: number | null;
  execution_type: string | null; requires_human_review: boolean | null; description: string | null;
}

interface SupervisorMetrics {
  totalAgents: number; activeAgents: number; pendingReviews: number;
  avgConfidence: number; escalations24h: number; successRate: number;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: typeof CheckCircle }> = {
  active: { color: 'text-green-600 bg-green-100 dark:bg-green-900/30', label: 'Activo', icon: CheckCircle },
  standby: { color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', label: 'En espera', icon: Clock },
  disabled: { color: 'text-muted-foreground bg-muted', label: 'Desactivado', icon: CircleDot },
  error: { color: 'text-destructive bg-destructive/10', label: 'Error', icon: AlertTriangle },
};

interface GovernanceCockpitProps { companyId?: string; }

export function GovernanceCockpit({ companyId }: GovernanceCockpitProps) {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SupervisorMetrics>({ totalAgents: 0, activeAgents: 0, pendingReviews: 0, avgConfidence: 0, escalations24h: 0, successRate: 0 });
  const [escalations, setEscalations] = useState<Array<{id: string; title: string; severity: string; created_at: string; status: string}>>([]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('erp_ai_agents_registry')
        .select('id, code, name, status, agent_type, module_domain, confidence_threshold, execution_type, requires_human_review, description')
        .in('module_domain', ['hr', 'payroll', 'compliance', 'audit'])
        .order('agent_type', { ascending: true });
      if (error) throw error;
      const agentList = (data || []) as AgentStatus[];
      setAgents(agentList);
      const active = agentList.filter(a => a.status === 'active');
      const supervised = agentList.filter(a => a.requires_human_review);
      const avgConf = agentList.reduce((sum, a) => sum + (a.confidence_threshold || 80), 0) / Math.max(agentList.length, 1);
      setMetrics({ totalAgents: agentList.length, activeAgents: active.length, pendingReviews: supervised.length, avgConfidence: Math.round(avgConf), escalations24h: 0, successRate: 0 });
    } catch (err) { if (import.meta.env.DEV) console.error('[GovernanceCockpit]', err); }
    finally { setLoading(false); }
  }, []);

  const fetchEscalations = useCallback(async () => {
    try {
      const { data } = await supabase.from('erp_audit_findings').select('id, title, severity, created_at, status').eq('status', 'open').order('created_at', { ascending: false }).limit(10);
      setEscalations(data ?? []);
    } catch (err) { if (import.meta.env.DEV) console.error('[GovernanceCockpit] escalations', err); }
  }, []);

  useEffect(() => { fetchAgents(); fetchEscalations(); }, [fetchAgents, fetchEscalations]);

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.disabled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />Supervisor de Nómina</h2>
          <p className="text-muted-foreground text-sm mt-1">Centro de gobernanza, observabilidad y control de agentes IA de RRHH</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading}><RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Agentes totales', value: metrics.totalAgents, icon: Brain, color: 'text-primary' },
          { label: 'Activos', value: metrics.activeAgents, icon: Zap, color: 'text-green-600' },
          { label: 'Con revisión humana', value: metrics.pendingReviews, icon: Eye, color: 'text-amber-600' },
          { label: 'Confianza media', value: `${metrics.avgConfidence}%`, icon: Shield, color: 'text-blue-600' },
          { label: 'Escalaciones 24h', value: metrics.escalations24h, icon: ArrowUpRight, color: 'text-destructive' },
          { label: 'Tasa éxito', value: `${metrics.successRate}%`, icon: TrendingUp, color: 'text-green-600' },
        ].map((kpi) => (
          <Card key={kpi.label}><CardContent className="p-3"><div className="flex items-center gap-1.5 mb-1"><kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} /><span className="text-[10px] text-muted-foreground truncate">{kpi.label}</span></div><p className="text-xl font-bold">{kpi.value}</p></CardContent></Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="observability">Observabilidad</TabsTrigger>
          <TabsTrigger value="escalations">Escalaciones</TabsTrigger>
          <TabsTrigger value="governance">Gobernanza</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Registro de agentes — Dominio RRHH/Nómina</CardTitle><CardDescription>Supervisores y especialistas del ecosistema de agentes IA</CardDescription></CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Brain className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No hay agentes registrados en el dominio HR</p></div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {agents.map((agent) => {
                      const sc = getStatusConfig(agent.status);
                      return (
                        <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", sc.color)}><sc.icon className="h-4 w-4" /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{agent.name}</p>
                                <Badge variant="outline" className="text-[10px]">{agent.code}</Badge>
                                {agent.agent_type === 'supervisor' && <Badge className="text-[10px] bg-primary/20 text-primary border-0">Supervisor</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{agent.description || `${agent.module_domain} · ${agent.execution_type || 'supervised'}`}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <div className="text-right"><span className="text-muted-foreground">Confianza</span><p className="font-mono font-semibold">{agent.confidence_threshold || 80}%</p></div>
                            {agent.requires_human_review && <Badge variant="secondary" className="text-[10px]"><Eye className="h-3 w-3 mr-1" /> HITL</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          <SupervisionLinesCard agents={agents} />
        </TabsContent>

        <TabsContent value="observability" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Latencia y rendimiento</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Cálculo nómina', 'Generación ficheros', 'IRPF regularización', 'Bridge contabilidad'].map((op) => (
                    <div key={op} className="space-y-1">
                      <div className="flex justify-between text-sm"><span>{op}</span><span className="font-mono text-xs">0ms · 0%</span></div>
                      <Progress value={0} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Invocaciones últimas 24h</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.slice(0, 5).map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{agent.name}</span>
                      <Badge variant="secondary" className="text-[10px]">Sin datos</Badge>
                    </div>
                  ))}
                  {agents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin datos de invocaciones</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="escalations" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cola de escalaciones</CardTitle><CardDescription>Decisiones que requieren validación humana (Human-in-the-Loop)</CardDescription></CardHeader>
            <CardContent>
              {escalations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Sin escalaciones pendientes</p></div>
              ) : (
                <div className="space-y-3">
                  {escalations.map((esc) => (
                    <div key={esc.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", esc.severity === 'critical' ? 'bg-destructive/10 text-destructive' : esc.severity === 'major' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-muted text-muted-foreground')}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div><p className="text-sm">{esc.title}</p><p className="text-xs text-muted-foreground">{esc.severity} · {formatDistanceToNow(new Date(esc.created_at), { locale: es, addSuffix: true })}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Clasificación de riesgo EU AI Act</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Cálculo de nómina', risk: 'Alto', reason: 'Datos salariales sensibles (GDPR Art. 9)' },
                    { label: 'Generación ficheros oficiales', risk: 'Alto', reason: 'Documentos con efecto legal ante TGSS/AEAT' },
                    { label: 'Bridge contabilidad', risk: 'Medio', reason: 'Impacto en estados financieros' },
                    { label: 'Auditoría documental', risk: 'Bajo', reason: 'Solo lectura y análisis' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                      <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.reason}</p></div>
                      <Badge variant={item.risk === 'Alto' ? 'destructive' : item.risk === 'Medio' ? 'default' : 'secondary'} className="text-[10px]">{item.risk}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Políticas de supervisión</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { policy: 'Cierre de nómina requiere aprobación', enabled: true },
                    { policy: 'Ficheros oficiales requieren doble validación', enabled: true },
                    { policy: 'Regularización IRPF notifica al supervisor', enabled: true },
                    { policy: 'Bridge auto-sync sin aprobación (< 1.000€)', enabled: false },
                    { policy: 'Alertas a RR.HH. por embargos nuevos', enabled: true },
                  ].map((p) => (
                    <div key={p.policy} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">{p.policy}</span>
                      <Badge variant={p.enabled ? 'default' : 'secondary'} className="text-[10px]">{p.enabled ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupervisionLinesCard({ agents }: { agents: AgentStatus[] }) {
  const [filter, setFilter] = useState<'current' | 'all'>('current');
  const [supervisorOnly, setSupervisorOnly] = useState(false);

  const filtered = agents.filter(a => {
    if (filter === 'current' && a.status !== 'active') return false;
    if (supervisorOnly && a.agent_type !== 'supervisor') return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Líneas de Supervisión</CardTitle>
        <CardDescription>Funciones y supervisores activos en el dominio RRHH/Nómina</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex rounded-lg border overflow-hidden">
            <Button variant={filter === 'current' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs h-8" onClick={() => setFilter('current')}>Solo actuales</Button>
            <Button variant={filter === 'all' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs h-8" onClick={() => setFilter('all')}>En toda la relación</Button>
          </div>
          <Button variant={supervisorOnly ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setSupervisorOnly(!supervisorOnly)}><Eye className="h-3 w-3 mr-1" />Ver supervisores</Button>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay agentes que coincidan con el filtro</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b"><th className="text-left p-2 text-xs font-medium text-muted-foreground">Función</th><th className="text-left p-2 text-xs font-medium text-muted-foreground">Denominación</th><th className="text-left p-2 text-xs font-medium text-muted-foreground">Desde</th><th className="text-left p-2 text-xs font-medium text-muted-foreground">Hasta</th><th className="text-left p-2 text-xs font-medium text-muted-foreground">Línea</th></tr></thead>
              <tbody>
                {filtered.map(agent => (
                  <tr key={agent.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 font-mono text-xs">{agent.code}</td>
                    <td className="p-2">{agent.name}</td>
                    <td className="p-2 text-muted-foreground">—</td>
                    <td className="p-2 text-muted-foreground">—</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{agent.module_domain}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GovernanceCockpit;
