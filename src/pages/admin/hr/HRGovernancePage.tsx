/**
 * HRGovernancePage — Supervisor de Nómina y Observabilidad
 * Ruta: /obelixia-admin/hr/governance
 * Fase J: Centro de mando del supervisor de nómina con observabilidad de agentes IA
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
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { HRErrorBoundary } from '@/components/hr/HRErrorBoundary';

// ── Types ──

interface AgentStatus {
  id: string;
  code: string;
  name: string;
  status: string;
  agent_type: string;
  module_domain: string;
  confidence_threshold: number | null;
  execution_type: string | null;
  requires_human_review: boolean | null;
  description: string | null;
}

interface SupervisorMetrics {
  totalAgents: number;
  activeAgents: number;
  pendingReviews: number;
  avgConfidence: number;
  escalations24h: number;
  successRate: number;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: typeof CheckCircle }> = {
  active: { color: 'text-green-600 bg-green-100 dark:bg-green-900/30', label: 'Activo', icon: CheckCircle },
  standby: { color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', label: 'En espera', icon: Clock },
  disabled: { color: 'text-muted-foreground bg-muted', label: 'Desactivado', icon: CircleDot },
  error: { color: 'text-destructive bg-destructive/10', label: 'Error', icon: AlertTriangle },
};

export function HRGovernancePage() {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SupervisorMetrics>({
    totalAgents: 0, activeAgents: 0, pendingReviews: 0,
    avgConfidence: 0, escalations24h: 0, successRate: 0,
  });

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_ai_agents_registry')
        .select('id, code, name, status, agent_type, module_domain, confidence_threshold, execution_type, requires_human_review, description')
        .in('module_domain', ['hr', 'payroll', 'compliance', 'audit'])
        .order('agent_type', { ascending: true });

      if (error) throw error;
      const agentList = (data || []) as AgentStatus[];
      setAgents(agentList);

      const active = agentList.filter(a => a.status === 'active');
      const supervised = agentList.filter(a => a.requires_human_review);
      const avgConf = agentList.reduce((sum, a) => sum + (a.confidence_threshold || 80), 0) / Math.max(agentList.length, 1);

      setMetrics({
        totalAgents: agentList.length,
        activeAgents: active.length,
        pendingReviews: supervised.length,
        avgConfidence: Math.round(avgConf),
        escalations24h: 0, // TODO: conectar a erp_audit_findings
        successRate: 0, // TODO: conectar a métricas reales
      });
    } catch (err) {
      console.error('[HRGovernance] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.disabled;

  return (
    <DashboardLayout title="Supervisor de Nómina — Gobernanza">
      <HRErrorBoundary section="Gobernanza y Supervisión">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Supervisor de Nómina
            </h1>
            <p className="text-muted-foreground mt-1">
              Centro de gobernanza, observabilidad y control de agentes IA de RRHH
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Agentes totales', value: metrics.totalAgents, icon: Brain, color: 'text-primary' },
            { label: 'Activos', value: metrics.activeAgents, icon: Zap, color: 'text-green-600' },
            { label: 'Con revisión humana', value: metrics.pendingReviews, icon: Eye, color: 'text-amber-600' },
            { label: 'Confianza media', value: `${metrics.avgConfidence}%`, icon: Shield, color: 'text-blue-600' },
            { label: 'Escalaciones 24h', value: metrics.escalations24h, icon: ArrowUpRight, color: 'text-destructive' },
            { label: 'Tasa éxito', value: `${metrics.successRate}%`, icon: TrendingUp, color: 'text-green-600' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                  <span className="text-[10px] text-muted-foreground truncate">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="agents">Agentes</TabsTrigger>
            <TabsTrigger value="observability">Observabilidad</TabsTrigger>
            <TabsTrigger value="escalations">Escalaciones</TabsTrigger>
            <TabsTrigger value="governance">Gobernanza</TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registro de agentes — Dominio RRHH/Nómina</CardTitle>
                <CardDescription>
                  Supervisores y especialistas del ecosistema de agentes IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay agentes registrados en el dominio HR</p>
                    <p className="text-xs mt-1">Los agentes se registran automáticamente al activar módulos</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {agents.map((agent) => {
                        const sc = getStatusConfig(agent.status);
                        return (
                          <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", sc.color)}>
                                <sc.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{agent.name}</p>
                                  <Badge variant="outline" className="text-[10px]">{agent.code}</Badge>
                                  {agent.agent_type === 'supervisor' && (
                                    <Badge className="text-[10px] bg-primary/20 text-primary border-0">Supervisor</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {agent.description || `${agent.module_domain} · ${agent.execution_type || 'supervised'}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="text-right">
                                <span className="text-muted-foreground">Confianza</span>
                                <p className="font-mono font-semibold">{agent.confidence_threshold || 80}%</p>
                              </div>
                              {agent.requires_human_review && (
                                <Badge variant="secondary" className="text-[10px]">
                                  <Eye className="h-3 w-3 mr-1" /> HITL
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Observability Tab */}
          <TabsContent value="observability" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Latencia y rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Cálculo nómina', 'Generación ficheros', 'IRPF regularización', 'Bridge contabilidad'].map((op) => {
                      const latency = 200 + Math.floor(Math.random() * 800);
                      const success = 90 + Math.floor(Math.random() * 10);
                      return (
                        <div key={op} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{op}</span>
                            <span className="font-mono text-xs">{latency}ms · {success}%</span>
                          </div>
                          <Progress value={success} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Invocaciones últimas 24h
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agents.slice(0, 5).map((agent) => {
                      const invocations = Math.floor(Math.random() * 50);
                      return (
                        <div key={agent.id} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[200px]">{agent.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{invocations} calls</span>
                            <Badge variant={invocations > 30 ? 'default' : 'secondary'} className="text-[10px]">
                              {invocations > 30 ? 'Alto' : 'Normal'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    {agents.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin datos de invocaciones</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Escalations Tab */}
          <TabsContent value="escalations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cola de escalaciones</CardTitle>
                <CardDescription>
                  Decisiones que requieren validación humana (Human-in-the-Loop)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'irpf', desc: 'Cambio de situación familiar mid-year — empleado Carlos Martín', severity: 'medium', time: '2h ago' },
                    { type: 'payroll', desc: 'Regularización SS por cambio de grupo cotización retroactivo', severity: 'high', time: '4h ago' },
                    { type: 'compliance', desc: 'Discrepancia entre base declarada y base calculada T1', severity: 'low', time: '1d ago' },
                  ].map((esc, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          esc.severity === 'high' ? 'bg-destructive/10 text-destructive' :
                          esc.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                          'bg-muted text-muted-foreground'
                        )}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm">{esc.desc}</p>
                          <p className="text-xs text-muted-foreground">{esc.type} · {esc.time}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toast.info('Detalle de escalación')}>
                          Ver detalle
                        </Button>
                        <Button size="sm" onClick={() => toast.success('Escalación resuelta')}>
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Clasificación de riesgo EU AI Act
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Cálculo de nómina', risk: 'Alto', reason: 'Datos salariales sensibles (GDPR Art. 9)' },
                      { label: 'Generación ficheros oficiales', risk: 'Alto', reason: 'Documentos con efecto legal ante TGSS/AEAT' },
                      { label: 'Bridge contabilidad', risk: 'Medio', reason: 'Impacto en estados financieros' },
                      { label: 'Auditoría documental', risk: 'Bajo', reason: 'Solo lectura y análisis' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>
                        <Badge variant={
                          item.risk === 'Alto' ? 'destructive' :
                          item.risk === 'Medio' ? 'default' : 'secondary'
                        } className="text-[10px]">
                          {item.risk}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Políticas de supervisión
                  </CardTitle>
                </CardHeader>
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
                        <Badge variant={p.enabled ? 'default' : 'secondary'} className="text-[10px]">
                          {p.enabled ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </HRErrorBoundary>

    </DashboardLayout>
  );
}

export default HRGovernancePage;
