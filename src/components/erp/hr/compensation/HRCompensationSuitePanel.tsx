/**
 * HRCompensationSuitePanel - Dashboard principal Compensation Suite
 * Tabs: Merit Cycles, Bonus, Pay Equity, Salary Letters, Total Rewards
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, TrendingUp, Award, FileText, BarChart3, 
  RefreshCw, Sparkles, Database, Users, AlertTriangle,
  CheckCircle, Clock, Target, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useHRCompensationSuite, MeritCycle, BonusCycle, PayEquitySnapshot } from '@/hooks/admin/hr/useHRCompensationSuite';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  open: { label: 'Abierto', variant: 'default' },
  in_review: { label: 'En Revisión', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  closed: { label: 'Cerrado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  paid: { label: 'Pagado', variant: 'default' },
};

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

export function HRCompensationSuitePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    loading, stats, meritCycles, bonusCycles, payEquitySnapshots, salaryLetters,
    fetchStats, fetchMeritCycles, fetchBonusCycles, fetchPayEquitySnapshots,
    fetchSalaryLetters, runPayEquityAnalysis, seedData
  } = useHRCompensationSuite();

  useEffect(() => {
    fetchStats(companyId);
    fetchMeritCycles(companyId);
    fetchBonusCycles(companyId);
    fetchPayEquitySnapshots(companyId);
    fetchSalaryLetters(companyId);
  }, [companyId]);

  const latestEquity = payEquitySnapshots[0] || stats?.latestEquity;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Compensation Suite</h2>
            <p className="text-sm text-muted-foreground">Merit cycles, bonus, pay equity y total rewards</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => seedData(companyId)} disabled={loading}>
            <Database className="h-4 w-4 mr-1" /> Seed Demo
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchStats(companyId)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Merit Cycles</p>
                <p className="text-lg font-bold">{meritCycles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Bonus Cycles</p>
                <p className="text-lg font-bold">{bonusCycles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cartas Salariales</p>
                <p className="text-lg font-bold">{salaryLetters.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Gender Gap</p>
                <p className="text-lg font-bold">
                  {latestEquity?.gender_gap_percent != null ? `${latestEquity.gender_gap_percent}%` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Anomalías</p>
                <p className="text-lg font-bold">{latestEquity?.anomalies_detected || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
              <TabsTrigger value="merit" className="text-xs">Merit Cycles</TabsTrigger>
              <TabsTrigger value="bonus" className="text-xs">Bonus</TabsTrigger>
              <TabsTrigger value="equity" className="text-xs">Pay Equity</TabsTrigger>
              <TabsTrigger value="letters" className="text-xs">Cartas</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Active Merit Cycles */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" /> Merit Cycles Activos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {meritCycles.filter(c => c.status !== 'closed' && c.status !== 'cancelled').length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Sin ciclos activos</p>
                    ) : (
                      <div className="space-y-3">
                        {meritCycles.filter(c => c.status !== 'closed' && c.status !== 'cancelled').slice(0, 3).map(cycle => (
                          <div key={cycle.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{cycle.name}</p>
                              <p className="text-xs text-muted-foreground">Budget: {cycle.budget_percent}%</p>
                            </div>
                            <Badge variant={STATUS_CONFIG[cycle.status]?.variant || 'outline'}>
                              {STATUS_CONFIG[cycle.status]?.label || cycle.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Active Bonus Cycles */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4" /> Bonus Cycles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bonusCycles.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Sin ciclos de bonus</p>
                    ) : (
                      <div className="space-y-3">
                        {bonusCycles.slice(0, 3).map(cycle => (
                          <div key={cycle.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{cycle.name}</p>
                              <p className="text-xs text-muted-foreground">Pool: {formatCurrency(cycle.target_pool)}</p>
                            </div>
                            <Badge variant={STATUS_CONFIG[cycle.status]?.variant || 'outline'}>
                              {STATUS_CONFIG[cycle.status]?.label || cycle.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Latest Pay Equity */}
              {latestEquity && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Último Análisis Pay Equity
                      <span className="text-xs text-muted-foreground font-normal ml-auto">
                        {new Date(latestEquity.analysis_date).toLocaleDateString('es-ES')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Gender Gap</p>
                        <p className={cn("text-2xl font-bold", (latestEquity.gender_gap_percent || 0) > 5 ? "text-destructive" : "text-emerald-600")}>
                          {latestEquity.gender_gap_percent ?? '—'}%
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Gap Ajustado</p>
                        <p className="text-2xl font-bold">{latestEquity.gender_gap_adjusted ?? '—'}%</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Compresión</p>
                        <p className="text-2xl font-bold">{latestEquity.salary_compression_score ?? '—'}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Empleados</p>
                        <p className="text-2xl font-bold">{latestEquity.total_employees_analyzed || 0}</p>
                      </div>
                    </div>
                    {latestEquity.ai_narrative && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">Análisis IA</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{latestEquity.ai_narrative}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* MERIT CYCLES */}
            <TabsContent value="merit">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {meritCycles.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No hay ciclos de revisión salarial</p>
                      <p className="text-xs text-muted-foreground mt-1">Usa "Seed Demo" para crear datos de ejemplo</p>
                    </div>
                  ) : meritCycles.map(cycle => (
                    <Card key={cycle.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{cycle.name}</h3>
                              <Badge variant={STATUS_CONFIG[cycle.status]?.variant || 'outline'}>
                                {STATUS_CONFIG[cycle.status]?.label || cycle.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Año fiscal: {cycle.fiscal_year} · Budget: {cycle.budget_percent}%
                              {cycle.budget_amount && ` (${formatCurrency(cycle.budget_amount)})`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(cycle.start_date).toLocaleDateString('es-ES')} → {new Date(cycle.end_date).toLocaleDateString('es-ES')}
                              {cycle.effective_date && ` · Efectivo: ${new Date(cycle.effective_date).toLocaleDateString('es-ES')}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4 mr-1" /> Propuestas
                            </Button>
                          </div>
                        </div>
                        {cycle.guidelines && typeof cycle.guidelines === 'object' && Object.keys(cycle.guidelines).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(cycle.guidelines).map(([key, val]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key.replace(/_/g, ' ')}: {String(val)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* BONUS */}
            <TabsContent value="bonus">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {bonusCycles.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No hay ciclos de bonus</p>
                    </div>
                  ) : bonusCycles.map(cycle => (
                    <Card key={cycle.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{cycle.name}</h3>
                              <Badge variant={STATUS_CONFIG[cycle.status]?.variant || 'outline'}>
                                {STATUS_CONFIG[cycle.status]?.label || cycle.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{cycle.bonus_type}</Badge>
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>Pool objetivo: {formatCurrency(cycle.target_pool)}</span>
                              {cycle.actual_pool && <span>Pool real: {formatCurrency(cycle.actual_pool)}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Periodo: {new Date(cycle.period_start).toLocaleDateString('es-ES')} → {new Date(cycle.period_end).toLocaleDateString('es-ES')}
                              {cycle.payment_date && ` · Pago: ${new Date(cycle.payment_date).toLocaleDateString('es-ES')}`}
                            </p>
                          </div>
                        </div>
                        {cycle.target_pool && cycle.actual_pool && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Ejecución del pool</span>
                              <span>{((cycle.actual_pool / cycle.target_pool) * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={(cycle.actual_pool / cycle.target_pool) * 100} className="h-2" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* PAY EQUITY */}
            <TabsContent value="equity" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Análisis de Equidad Retributiva</h3>
                <Button onClick={() => runPayEquityAnalysis(companyId)} disabled={loading} size="sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {loading ? 'Analizando...' : 'Nuevo Análisis IA'}
                </Button>
              </div>

              {payEquitySnapshots.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No hay análisis de equidad</p>
                  <p className="text-xs text-muted-foreground mt-1">Ejecuta un análisis con IA para comenzar</p>
                </div>
              ) : (
                <ScrollArea className="h-[450px]">
                  <div className="space-y-4">
                    {payEquitySnapshots.map(snapshot => (
                      <Card key={snapshot.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              Análisis {new Date(snapshot.analysis_date).toLocaleDateString('es-ES')}
                            </span>
                            <Badge variant="outline">{snapshot.total_employees_analyzed} empleados</Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Gender Gap</p>
                              <p className={cn("text-xl font-bold", (snapshot.gender_gap_percent || 0) > 5 ? "text-destructive" : "text-emerald-600")}>
                                {snapshot.gender_gap_percent ?? '—'}%
                              </p>
                            </div>
                            <div className="text-center p-2 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Compresión</p>
                              <p className="text-xl font-bold">{snapshot.salary_compression_score ?? '—'}</p>
                            </div>
                            <div className="text-center p-2 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Anomalías</p>
                              <p className={cn("text-xl font-bold", snapshot.anomalies_detected > 0 ? "text-amber-500" : "text-emerald-600")}>
                                {snapshot.anomalies_detected}
                              </p>
                            </div>
                          </div>

                          {snapshot.recommendations && snapshot.recommendations.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium">Recomendaciones:</p>
                              {snapshot.recommendations.map((rec, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <CheckCircle className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                  <span>{rec}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {snapshot.ai_narrative && (
                            <div className="p-2 bg-primary/5 rounded border border-primary/10">
                              <p className="text-xs text-muted-foreground">{snapshot.ai_narrative}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* SALARY LETTERS */}
            <TabsContent value="letters">
              <ScrollArea className="h-[500px]">
                {salaryLetters.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No hay cartas salariales</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {salaryLetters.map(letter => (
                      <div key={letter.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{letter.employee_name || 'Empleado'}</p>
                            <p className="text-xs text-muted-foreground">
                              {letter.letter_type.replace(/_/g, ' ')} · Efectiva: {new Date(letter.effective_date).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(letter.new_salary)}</p>
                            {letter.change_percent && (
                              <p className={cn("text-xs flex items-center justify-end gap-0.5",
                                letter.change_percent > 0 ? "text-emerald-600" : "text-destructive")}>
                                {letter.change_percent > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {letter.change_percent}%
                              </p>
                            )}
                          </div>
                          <Badge variant={STATUS_CONFIG[letter.status]?.variant || 'outline'} className="text-xs">
                            {STATUS_CONFIG[letter.status]?.label || letter.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRCompensationSuitePanel;
