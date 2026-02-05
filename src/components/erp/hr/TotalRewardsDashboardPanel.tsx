/**
 * TotalRewardsDashboardPanel
 * Fase 7: Total Rewards - Compensation, Benefits & Recognition Dashboard
 * Enterprise HR Module
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  Heart,
  Award,
  Users,
  PieChart,
  BarChart3,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  FileText,
  Scale
} from 'lucide-react';
import { useHRTotalRewards, type TotalRewardsContext } from '@/hooks/erp/hr/useHRTotalRewards';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface TotalRewardsDashboardPanelProps {
  companyId: string;
  employeeId?: string;
  className?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function TotalRewardsDashboardPanel({
  companyId,
  employeeId,
  className
}: TotalRewardsDashboardPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, unknown> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const context: TotalRewardsContext = useMemo(() => ({
    companyId,
    employeeId
  }), [companyId, employeeId]);

  const {
    isLoading,
    lastRefresh,
    salaryBands,
    compensations,
    benefitsPlans,
    enrollments,
    recognitions,
    programs,
    statements,
    analytics,
    totalBenefitsCost,
    totalRecognitionValue,
    averageSalary,
    fetchAll,
    analyzeCompensation,
    generateRewardsStatement
  } = useHRTotalRewards();

  useEffect(() => {
    if (companyId) {
      fetchAll(context);
    }
  }, [companyId, employeeId]);

  const handleRefresh = useCallback(async () => {
    await fetchAll(context);
  }, [fetchAll, context]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    const result = await analyzeCompensation(context, 'benchmark');
    if (result) {
      setAiAnalysis(result);
    }
    setIsAnalyzing(false);
  }, [analyzeCompensation, context]);

  const handleGenerateStatement = useCallback(async () => {
    await generateRewardsStatement(context, new Date().getFullYear());
  }, [generateRewardsStatement, context]);

  // Datos para gráficos
  const benefitsByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    benefitsPlans.forEach(plan => {
      const type = plan.plan_type || 'other';
      grouped[type] = (grouped[type] || 0) + (plan.annual_cost || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [benefitsPlans]);

  const compensationDistribution = useMemo(() => {
    if (compensations.length === 0) return [];
    
    const ranges = [
      { range: '< 30K', min: 0, max: 30000, count: 0 },
      { range: '30-50K', min: 30000, max: 50000, count: 0 },
      { range: '50-70K', min: 50000, max: 70000, count: 0 },
      { range: '70-100K', min: 70000, max: 100000, count: 0 },
      { range: '> 100K', min: 100000, max: Infinity, count: 0 }
    ];

    compensations.forEach(comp => {
      const salary = comp.base_salary || 0;
      const range = ranges.find(r => salary >= r.min && salary < r.max);
      if (range) range.count++;
    });

    return ranges.map(r => ({ name: r.range, empleados: r.count }));
  }, [compensations]);

  const recognitionsByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    recognitions.forEach(rec => {
      const type = rec.recognition_type || 'other';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [recognitions]);

  const latestAnalytics = analytics[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para ver Total Rewards</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Total Rewards
                <Badge variant="outline" className="text-xs">Fase 7</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Cargando datos...'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* KPIs Summary */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-card/60 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Salario Medio
            </div>
            <div className="text-lg font-bold">{formatCurrency(averageSalary)}</div>
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              +3.2% vs mercado
            </div>
          </div>
          <div className="bg-card/60 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Heart className="h-3.5 w-3.5" />
              Coste Beneficios
            </div>
            <div className="text-lg font-bold">{formatCurrency(totalBenefitsCost)}</div>
            <div className="text-xs text-muted-foreground">
              {benefitsPlans.length} planes activos
            </div>
          </div>
          <div className="bg-card/60 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Award className="h-3.5 w-3.5" />
              Reconocimientos
            </div>
            <div className="text-lg font-bold">{recognitions.length}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(totalRecognitionValue)} entregados
            </div>
          </div>
          <div className="bg-card/60 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Scale className="h-3.5 w-3.5" />
              Pay Equity
            </div>
            <div className="text-lg font-bold">
              {latestAnalytics?.equity_score?.toFixed(0) || 'N/A'}%
            </div>
            <div className="text-xs text-muted-foreground">
              Gap: {latestAnalytics?.gender_pay_gap?.toFixed(1) || 'N/A'}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-180px)]" : "")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="overview" className="text-xs">
              <PieChart className="h-3.5 w-3.5 mr-1" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="compensation" className="text-xs">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Compensación
            </TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs">
              <Heart className="h-3.5 w-3.5 mr-1" />
              Beneficios
            </TabsTrigger>
            <TabsTrigger value="recognition" className="text-xs">
              <Award className="h-3.5 w-3.5 mr-1" />
              Reconocimiento
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              IA Analytics
            </TabsTrigger>
          </TabsList>

          <ScrollArea className={isExpanded ? "h-[calc(100vh-350px)]" : "h-[400px]"}>
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Distribución de Beneficios */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Coste de Beneficios por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {benefitsByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPie>
                          <Pie
                            data={benefitsByType}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {benefitsByType.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Sin datos de beneficios
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Distribución Salarial */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Distribución Salarial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {compensationDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={compensationDistribution}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" fontSize={11} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Bar dataKey="empleados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Sin datos de compensación
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bandas Salariales */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Bandas Salariales Activas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {salaryBands.slice(0, 5).map((band) => (
                      <div key={band.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{band.band_code}</Badge>
                          <div>
                            <p className="text-sm font-medium">{band.band_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {band.job_family} • {band.level}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(band.min_salary)} - {formatCurrency(band.max_salary)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mid: {formatCurrency(band.mid_salary)} • P{band.market_percentile}
                          </p>
                        </div>
                      </div>
                    ))}
                    {salaryBands.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No hay bandas salariales configuradas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compensation Tab */}
            <TabsContent value="compensation" className="mt-0 space-y-4">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={handleGenerateStatement}>
                  <FileText className="h-4 w-4 mr-1" />
                  Generar Statement
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Registros de Compensación Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {compensations.slice(0, 10).map((comp) => (
                      <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {formatCurrency(comp.base_salary)}
                              {comp.pay_frequency === 'monthly' ? '/mes' : '/año'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Efectivo desde: {format(new Date(comp.effective_from), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {comp.change_type && (
                            <Badge variant={comp.change_type === 'promotion' ? 'default' : 'outline'} className="text-xs">
                              {comp.change_type}
                            </Badge>
                          )}
                          {comp.change_percent && (
                            <p className="text-xs text-emerald-600 mt-1">
                              +{comp.change_percent.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {compensations.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No hay registros de compensación
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {benefitsPlans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-2 rounded-lg",
                            plan.plan_type === 'health' && "bg-red-100 dark:bg-red-900/30",
                            plan.plan_type === 'retirement' && "bg-blue-100 dark:bg-blue-900/30",
                            plan.plan_type === 'life' && "bg-purple-100 dark:bg-purple-900/30",
                            !['health', 'retirement', 'life'].includes(plan.plan_type) && "bg-gray-100 dark:bg-gray-800"
                          )}>
                            <Heart className={cn(
                              "h-4 w-4",
                              plan.plan_type === 'health' && "text-red-600",
                              plan.plan_type === 'retirement' && "text-blue-600",
                              plan.plan_type === 'life' && "text-purple-600"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{plan.plan_name}</p>
                            <Badge variant="outline" className="text-xs mt-1">{plan.plan_type}</Badge>
                          </div>
                        </div>
                        <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                          {plan.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        {plan.provider_name && (
                          <p className="text-muted-foreground">Proveedor: {plan.provider_name}</p>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coste Empresa:</span>
                          <span className="font-medium">{formatCurrency(plan.employer_contribution || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coste Empleado:</span>
                          <span className="font-medium">{formatCurrency(plan.employee_contribution || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {benefitsPlans.length === 0 && (
                  <Card className="col-span-2">
                    <CardContent className="py-8 text-center">
                      <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No hay planes de beneficios configurados</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Recognition Tab */}
            <TabsContent value="recognition" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Reconocimientos por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recognitionsByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <RechartsPie>
                          <Pie
                            data={recognitionsByType}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {recognitionsByType.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                        Sin reconocimientos
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Programas de Reconocimiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {programs.map((program) => (
                        <div key={program.id} className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{program.program_name}</p>
                            <Badge variant="outline" className="text-xs">{program.program_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Presupuesto: {formatCurrency(program.annual_budget || 0)}
                          </p>
                        </div>
                      ))}
                      {programs.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No hay programas configurados
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Reconocimientos Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recognitions.slice(0, 8).map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <Award className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{rec.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {rec.category} • {format(new Date(rec.award_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {rec.monetary_value && (
                            <p className="text-sm font-medium text-emerald-600">
                              {formatCurrency(rec.monetary_value)}
                            </p>
                          )}
                          {rec.points_awarded > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {rec.points_awarded} puntos
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Analytics Tab */}
            <TabsContent value="ai" className="mt-0 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Análisis IA de Compensación
                </h3>
                <Button 
                  size="sm" 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Analizar Compensación
                    </>
                  )}
                </Button>
              </div>

              {aiAnalysis && (
                <div className="space-y-4">
                  {/* Analysis Summary */}
                  {aiAnalysis.analysis && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Resumen del Análisis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {(aiAnalysis.analysis as Record<string, unknown>)?.summary as string || 'Análisis completado'}
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <p className="text-2xl font-bold">
                              {((aiAnalysis.analysis as Record<string, unknown>)?.compa_ratio_avg as number)?.toFixed(0) || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">Compa-Ratio Medio</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <p className="text-2xl font-bold">
                              {((aiAnalysis.analysis as Record<string, unknown>)?.pay_equity_score as number)?.toFixed(0) || 'N/A'}%
                            </p>
                            <p className="text-xs text-muted-foreground">Score Equidad</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted">
                            <Badge variant={
                              (aiAnalysis.analysis as Record<string, unknown>)?.compression_risk === 'high' ? 'destructive' :
                              (aiAnalysis.analysis as Record<string, unknown>)?.compression_risk === 'medium' ? 'secondary' : 'default'
                            }>
                              {(aiAnalysis.analysis as Record<string, unknown>)?.compression_risk as string || 'N/A'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">Riesgo Compresión</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Insights */}
                  {Array.isArray(aiAnalysis.insights) && aiAnalysis.insights.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(aiAnalysis.insights as Array<{type: string; title: string; description: string; priority: string}>).map((insight, idx) => (
                            <div key={idx} className="p-3 rounded-lg border">
                              <div className="flex items-center gap-2 mb-1">
                                {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                {insight.type === 'opportunity' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                                {insight.type === 'strength' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                                {insight.type === 'gap' && <Target className="h-4 w-4 text-amber-500" />}
                                <span className="font-medium text-sm">{insight.title}</span>
                                <Badge variant={
                                  insight.priority === 'high' ? 'destructive' : 
                                  insight.priority === 'medium' ? 'secondary' : 'outline'
                                } className="ml-auto text-xs">
                                  {insight.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{insight.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {Array.isArray(aiAnalysis.recommendations) && aiAnalysis.recommendations.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Recomendaciones</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(aiAnalysis.recommendations as Array<{action: string; rationale: string; timeline: string; cost_estimate?: number}>).map((rec, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-muted/50">
                              <p className="font-medium text-sm">{rec.action}</p>
                              <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="text-muted-foreground">
                                  Plazo: <span className="font-medium">{rec.timeline}</span>
                                </span>
                                {rec.cost_estimate && (
                                  <span className="text-muted-foreground">
                                    Coste: <span className="font-medium">{formatCurrency(rec.cost_estimate)}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {!aiAnalysis && !isAnalyzing && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-purple-400" />
                    <p className="text-muted-foreground mb-4">
                      Usa la IA para analizar tu estructura de compensación
                    </p>
                    <Button onClick={handleAnalyze}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Iniciar Análisis IA
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TotalRewardsDashboardPanel;
