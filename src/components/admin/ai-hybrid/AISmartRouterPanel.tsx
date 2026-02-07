import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { 
  ShieldCheck, 
  Wallet, 
  Zap, 
  BrainCircuit, 
  Lock,
  Globe,
  Ban
} from 'lucide-react';
import { useAISmartRouter, RoutingDecision } from '@/hooks/admin/ai-hybrid/useAISmartRouter';
import { cn } from '@/lib/utils';

export function AISmartRouterPanel() {
  const { routingHistory, getRoutingStats, weights } = useAISmartRouter();
  const [stats, setStats] = useState(getRoutingStats());

  useEffect(() => {
    setStats(getRoutingStats());
  }, [routingHistory]);

  const COLORS = ['#10b981', '#3b82f6', '#ef4444']; // Local, External, Blocked

  const pieData = [
    { name: 'Local', value: stats.localUsage },
    { name: 'Cloud', value: stats.externalUsage },
    { name: 'Bloqueado', value: (stats.blockedCount / stats.totalDecisions) * 100 || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <div className="text-sm font-medium text-primary">Decisiones Totales</div>
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.totalDecisions}</div>
            <p className="text-xs text-muted-foreground">Solicitudes enrutadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <div className="text-sm font-medium text-emerald-600">Ahorro Estimado</div>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">${stats.totalCostSaved.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">vs uso 100% cloud</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <div className="text-sm font-medium text-blue-600">Latencia Media</div>
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{stats.averageLatency}ms</div>
            <p className="text-xs text-muted-foreground">Tiempo de respuesta</p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <div className="text-sm font-medium text-destructive">Bloqueos Seguridad</div>
              <ShieldCheck className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold">{stats.blockedCount}</div>
            <p className="text-xs text-muted-foreground">Solicitudes denegadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Charts */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Distribución de Tráfico</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500" /> Local
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" /> Cloud
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" /> Bloqueado
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weights Config */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pesos del Algoritmo de Decisión</CardTitle>
            <CardDescription>Factores utilizados para calcular el proveedor óptimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Seguridad</span>
                    <span className="font-bold">{(weights.security * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${weights.security * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Prioridad máxima. Bloquea proveedores inseguros para datos sensibles.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Coste</span>
                    <span className="font-bold">{(weights.cost * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${weights.cost * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Optimización económica. Prioriza IA local gratuita.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Latencia</span>
                    <span className="font-bold">{(weights.latency * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${weights.latency * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Capacidad</span>
                    <span className="font-bold">{(weights.capability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${weights.capability * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Decisiones (Últimas 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routingHistory.slice(0, 10).map((decision, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    decision.wasBlocked ? "bg-red-100 text-red-600" :
                    decision.providerType === 'local' ? "bg-emerald-100 text-emerald-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {decision.wasBlocked ? <Ban className="h-4 w-4" /> :
                     decision.providerType === 'local' ? <Lock className="h-4 w-4" /> :
                     <Globe className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {decision.wasBlocked ? 'Solicitud Bloqueada' : decision.selectedProviderName}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      <span>{decision.selectedModel}</span>
                      <span>•</span>
                      <span>Score: {decision.scores.total.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {decision.wasBlocked ? (
                    <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>
                  ) : (
                    <div className="flex flex-col items-end">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {decision.estimatedLatencyMs}ms
                      </Badge>
                      <span className="text-xs text-emerald-600 font-medium">
                        ${decision.estimatedCost.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {routingHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay decisiones registradas aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
