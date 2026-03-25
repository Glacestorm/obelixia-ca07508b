/**
 * AICostEconomicsPanel — Phase 4: AI Economics & Budgets
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  BarChart3,
  Bot,
  AlertTriangle,
  CheckCircle,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAICostEconomics } from '@/hooks/erp/ai-center/useAICostEconomics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

export function AICostEconomicsPanel() {
  const {
    agentCosts,
    costTrends,
    budgetStatus,
    kpis,
    loading,
    dateRange,
    setDateRange,
    refresh,
    fetchCostData,
  } = useAICostEconomics();

  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const from = new Date(now.getTime() - days * 86400000);
    setDateRange({ from, to: now });
    fetchCostData(from, now);
  }, [period, fetchCostData, setDateRange]);

  const budgetColor = budgetStatus?.status === 'exceeded' ? 'text-destructive' :
    budgetStatus?.status === 'warning' ? 'text-yellow-600' : 'text-emerald-600';

  const budgetBg = budgetStatus?.status === 'exceeded' ? 'bg-destructive/10' :
    budgetStatus?.status === 'warning' ? 'bg-yellow-500/10' : 'bg-emerald-500/10';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Economía IA</h2>
          <Badge variant="outline" className="text-[10px]">Fase 4</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1 text-xs transition-colors',
                  period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gasto Total</p>
              <p className="text-xl font-bold">{kpis.totalSpend.toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">{kpis.totalInvocations} invocaciones</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ahorro vs Manual</p>
              <p className={cn('text-xl font-bold', kpis.costSavingsVsManual > 0 ? 'text-emerald-600' : 'text-destructive')}>
                {kpis.costSavingsVsManual > 0 ? '+' : ''}{kpis.costSavingsVsManual.toFixed(0)}€
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {kpis.costSavingsVsManual > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                ROI positivo
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coste/Llamada</p>
              <p className="text-xl font-bold">{kpis.avgCostPerCall.toFixed(3)}€</p>
              <p className="text-[10px] text-muted-foreground">media por invocación</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Agente</p>
              <p className="text-sm font-bold truncate">{kpis.topCostAgent}</p>
              <p className="text-[10px] text-muted-foreground">mayor consumo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Gauge */}
      {budgetStatus && (
        <Card className={cn('border', budgetBg)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className={cn('h-4 w-4', budgetColor)} />
                <span className="text-sm font-medium">Presupuesto Mensual</span>
              </div>
              <Badge variant={budgetStatus.status === 'exceeded' ? 'destructive' : budgetStatus.status === 'warning' ? 'secondary' : 'default'} className="text-[10px]">
                {budgetStatus.status === 'exceeded' ? 'Excedido' : budgetStatus.status === 'warning' ? 'Alerta' : 'En rango'}
              </Badge>
            </div>
            <Progress value={Math.min(budgetStatus.consumedPercentage, 100)} className="h-3 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{budgetStatus.consumed.toFixed(2)}€ de {budgetStatus.monthlyBudget}€</span>
              <span>{budgetStatus.consumedPercentage}%</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Proyección: {budgetStatus.projectedEnd.toFixed(2)}€
              </span>
              <span className="flex items-center gap-1">
                {budgetStatus.status === 'on_track' ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                {budgetStatus.daysRemaining}d restantes
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="text-xs">Por Agente</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Tendencia</TabsTrigger>
          <TabsTrigger value="roi" className="text-xs">ROI</TabsTrigger>
        </TabsList>

        {/* Per-Agent Costs */}
        <TabsContent value="agents" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" /> Coste por Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentCosts.length > 0 ? (
                <>
                  <div className="h-[220px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentCosts.slice(0, 10)} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="agentName" type="category" tick={{ fontSize: 9 }} width={120} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(3)}€`} />
                        <Bar dataKey="estimatedCost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {agentCosts.map(agent => (
                        <div key={agent.agentCode} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-[8px] shrink-0">{agent.domain}</Badge>
                            <span className="font-medium truncate">{agent.agentName}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground">{agent.invocations} calls</span>
                            <span className="font-mono font-medium">{agent.estimatedCost.toFixed(2)}€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos de coste en el período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Trends */}
        <TabsContent value="trends" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Tendencia de Costes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {costTrends.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis yAxisId="cost" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line yAxisId="cost" type="monotone" dataKey="totalCost" stroke="hsl(var(--primary))" name="Coste (€)" strokeWidth={2} dot={false} />
                      <Line yAxisId="count" type="monotone" dataKey="invocations" stroke="hsl(var(--accent-foreground))" name="Invocaciones" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos de tendencia</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Analysis */}
        <TabsContent value="roi" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> ROI por Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {agentCosts.filter(a => a.roi > 0).sort((a, b) => b.roi - a.roi).map(agent => (
                    <div key={agent.agentCode} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{agent.agentName}</span>
                        <Badge className={cn(
                          'text-[10px]',
                          agent.roi > 10 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
                          agent.roi > 5 ? 'bg-primary/10 text-primary border-primary/30' :
                          'bg-muted text-muted-foreground'
                        )}>
                          ROI {agent.roi}x
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                        <div>
                          <span className="block font-medium text-foreground">{agent.estimatedCost.toFixed(2)}€</span>
                          coste IA
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">{((agent.successRate / 100) * agent.invocations * 12).toFixed(0)}€</span>
                          valor equiv.
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">{agent.successRate}%</span>
                          éxito
                        </div>
                      </div>
                    </div>
                  ))}
                  {agentCosts.filter(a => a.roi > 0).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin datos de ROI</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AICostEconomicsPanel;
