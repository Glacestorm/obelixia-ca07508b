/**
 * HRAnalyticsIntelligencePanel
 * Fase 7: HR Analytics Predictivos y Workforce Intelligence
 * Dashboard de inteligencia predictiva para RRHH
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Shield,
  Gauge,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { useHRAnalyticsIntelligence } from '@/hooks/admin/hr/useHRAnalyticsIntelligence';
import { cn } from '@/lib/utils';

export function HRAnalyticsIntelligencePanel() {
  const [activeTab, setActiveTab] = useState('turnover');

  const {
    isLoading,
    error,
    turnoverAnalysis,
    workforcePlan,
    salaryBenchmark,
    talentForecast,
    successionRisk,
    productivityInsights,
    engagementPrediction,
    skillsGapForecast,
    predictTurnover,
    generateWorkforcePlan,
    analyzeSalaryBenchmark,
    forecastTalentDemand,
    analyzeSuccessionRisk,
    analyzeProductivity,
    predictEngagement,
    forecastSkillsGap,
  } = useHRAnalyticsIntelligence();

  // Mock data para demo
  const mockEmployees = [
    { id: '1', name: 'María García', department: 'Tecnología', tenure: 3, salary: 45000 },
    { id: '2', name: 'Carlos López', department: 'Ventas', tenure: 5, salary: 38000 },
    { id: '3', name: 'Ana Martínez', department: 'RRHH', tenure: 2, salary: 35000 },
  ];

  const handleRunAnalysis = async (type: string) => {
    switch (type) {
      case 'turnover':
        await predictTurnover({
          employees: mockEmployees,
          engagement: { avgScore: 72, trend: 'stable' },
          salaryData: { avgSalary: 40000, marketMedian: 42000 },
        });
        break;
      case 'workforce':
        await generateWorkforcePlan(
          { workforce: { totalHeadcount: 150, departments: 8 } },
          { planningHorizon: '12 meses', scenarios: ['moderate', 'aggressive'] }
        );
        break;
      case 'salary':
        await analyzeSalaryBenchmark({
          salaryData: mockEmployees,
          sector: 'Tecnología',
          region: 'España',
          companySize: 'PYME'
        });
        break;
      case 'talent':
        await forecastTalentDemand(
          { sector: 'Tecnología', currentRoles: ['Developer', 'Designer', 'PM'] },
          { horizon: '24 meses' }
        );
        break;
      case 'succession':
        await analyzeSuccessionRisk({
          leadershipPositions: [{ title: 'CTO', incumbent: 'Juan Pérez' }],
          talentData: mockEmployees,
        });
        break;
      case 'productivity':
        await analyzeProductivity({
          operationalData: { revenue: 5000000, headcount: 150 },
          kpis: { utilizationRate: 78, overtimeRate: 12 },
        });
        break;
      case 'engagement':
        await predictEngagement({
          surveyResults: { overallScore: 72, eNPS: 25, participation: 85 },
          historicalData: [{ date: '2025-01', score: 70 }],
        });
        break;
      case 'skills':
        await forecastSkillsGap(
          { currentSkills: ['React', 'Python', 'SQL'], roleRequirements: [] },
          { horizon: '18 meses' }
        );
        break;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Analytics Intelligence</h2>
            <p className="text-muted-foreground">
              Predicción y planificación estratégica de workforce
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="h-3 w-3 mr-1" />
          Fase 7: Predictive Analytics
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs de análisis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="turnover" className="text-xs">
            <TrendingDown className="h-3 w-3 mr-1" />
            Rotación
          </TabsTrigger>
          <TabsTrigger value="workforce" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Workforce
          </TabsTrigger>
          <TabsTrigger value="salary" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            Salarios
          </TabsTrigger>
          <TabsTrigger value="talent" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Talento
          </TabsTrigger>
          <TabsTrigger value="succession" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Sucesión
          </TabsTrigger>
          <TabsTrigger value="productivity" className="text-xs">
            <Gauge className="h-3 w-3 mr-1" />
            Productividad
          </TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">
            <GraduationCap className="h-3 w-3 mr-1" />
            Skills
          </TabsTrigger>
        </TabsList>

        {/* Tab: Predicción de Rotación */}
        <TabsContent value="turnover" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Predicción de Rotación
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('turnover')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Analizar</span>
              </Button>
            </CardHeader>
            <CardContent>
              {turnoverAnalysis ? (
                <div className="space-y-4">
                  {/* Métricas agregadas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border">
                      <p className="text-xs text-muted-foreground">Riesgo General</p>
                      <p className={cn("text-2xl font-bold", getScoreColor(100 - turnoverAnalysis.aggregateMetrics.overallRiskScore))}>
                        {turnoverAnalysis.aggregateMetrics.overallRiskScore}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Empleados en Riesgo</p>
                      <p className="text-2xl font-bold">{turnoverAnalysis.aggregateMetrics.employeesAtRisk}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Coste Estimado</p>
                      <p className="text-lg font-bold">{turnoverAnalysis.aggregateMetrics.estimatedCostOfTurnover}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Tendencia</p>
                      <div className="flex items-center gap-1">
                        {turnoverAnalysis.trendAnalysis.direction === 'improving' ? (
                          <ArrowDownRight className="h-5 w-5 text-green-500" />
                        ) : turnoverAnalysis.trendAnalysis.direction === 'deteriorating' ? (
                          <ArrowUpRight className="h-5 w-5 text-red-500" />
                        ) : (
                          <Activity className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="font-medium capitalize">{turnoverAnalysis.trendAnalysis.direction}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de predicciones */}
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {turnoverAnalysis.predictions.map((pred, idx) => (
                        <div key={idx} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{pred.employeeName}</p>
                              <p className="text-sm text-muted-foreground">{pred.department}</p>
                            </div>
                            <Badge className={getRiskColor(pred.riskLevel)}>
                              {pred.riskScore}% - {pred.riskLevel}
                            </Badge>
                          </div>
                          <Progress value={pred.riskScore} className="h-2 mb-2" />
                          <div className="flex flex-wrap gap-1 mb-2">
                            {pred.topFactors.slice(0, 3).map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {f.factor}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Timeframe: {pred.predictedTimeframe} • Confianza: {pred.confidenceScore}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Ejecuta el análisis para predecir riesgo de rotación</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Workforce Planning */}
        <TabsContent value="workforce" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Strategic Workforce Planning
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('workforce')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Generar Plan</span>
              </Button>
            </CardHeader>
            <CardContent>
              {workforcePlan ? (
                <div className="space-y-4">
                  {/* Estado actual */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-xs text-muted-foreground">Headcount Actual</p>
                      <p className="text-2xl font-bold">{workforcePlan.currentState.totalHeadcount}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">FTEs Equivalentes</p>
                      <p className="text-2xl font-bold">{workforcePlan.currentState.ftesEquivalent}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Antigüedad Media</p>
                      <p className="text-lg font-bold">{workforcePlan.currentState.avgTenure}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Departamentos</p>
                      <p className="text-2xl font-bold">{workforcePlan.currentState.departmentBreakdown.length}</p>
                    </div>
                  </div>

                  {/* Proyecciones */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Proyecciones
                    </h4>
                    {workforcePlan.projections.map((proj, idx) => (
                      <div key={idx} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{proj.timeframe}</Badge>
                            <Badge className="bg-blue-100 text-blue-700">{proj.scenario}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{proj.projectedHeadcount}</p>
                            <p className={cn("text-sm", proj.netChange >= 0 ? "text-green-600" : "text-red-600")}>
                              {proj.netChange >= 0 ? '+' : ''}{proj.netChange}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>Contrataciones: <strong>{proj.hiringNeeds}</strong></span>
                          <span>Bajas esperadas: <strong>{proj.expectedAttrition}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Áreas de riesgo */}
                  {workforcePlan.riskAreas.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Áreas de Riesgo
                      </h4>
                      {workforcePlan.riskAreas.map((risk, idx) => (
                        <Alert key={idx} variant={risk.severity === 'high' ? 'destructive' : 'default'}>
                          <AlertDescription>
                            <strong>{risk.area}</strong>: {risk.mitigation}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Genera un plan estratégico de workforce</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Salary Benchmarking */}
        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Salary Benchmarking
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('salary')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Analizar</span>
              </Button>
            </CardHeader>
            <CardContent>
              {salaryBenchmark ? (
                <div className="space-y-4">
                  {/* Posicionamiento de mercado */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border">
                      <p className="text-xs text-muted-foreground">Percentil de Mercado</p>
                      <p className="text-2xl font-bold">{salaryBenchmark.marketPositioning.overallPercentile}%</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Posición</p>
                      <Badge className={
                        salaryBenchmark.marketPositioning.positioningLabel === 'above_market' 
                          ? 'bg-green-100 text-green-700'
                          : salaryBenchmark.marketPositioning.positioningLabel === 'at_market'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }>
                        {salaryBenchmark.marketPositioning.positioningLabel.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Competitividad</p>
                      <p className="text-2xl font-bold">{salaryBenchmark.marketPositioning.competitivenessScore}/100</p>
                    </div>
                  </div>

                  {/* Equity Analysis */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-3">Análisis de Equidad</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Gender Pay Gap</p>
                        <p className={cn("text-xl font-bold", 
                          salaryBenchmark.equityAnalysis.genderPayGap > 5 ? 'text-red-600' : 'text-green-600'
                        )}>
                          {salaryBenchmark.equityAnalysis.genderPayGap}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Problemas de Compresión</p>
                        <p className="text-xl font-bold">{salaryBenchmark.equityAnalysis.compressionIssues.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Comparación por rol */}
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {salaryBenchmark.roleComparison.map((role, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                          <div>
                            <p className="font-medium">{role.role}</p>
                            <p className="text-sm text-muted-foreground">
                              Actual: €{role.currentSalary.toLocaleString()} | Mercado P50: €{role.marketP50.toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">P{role.currentPercentile}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Analiza la competitividad salarial vs. mercado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Talent Demand */}
        <TabsContent value="talent" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Talent Demand Forecast
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('talent')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Forecast</span>
              </Button>
            </CardHeader>
            <CardContent>
              {talentForecast ? (
                <div className="space-y-4">
                  {/* Market trends */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                      <p className="text-xs text-muted-foreground">Outlook de Mercado</p>
                      <Badge className={
                        talentForecast.marketTrends.overallOutlook === 'positive' ? 'bg-green-100 text-green-700' :
                        talentForecast.marketTrends.overallOutlook === 'challenging' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {talentForecast.marketTrends.overallOutlook}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Escasez de Talento</p>
                      <Badge className={getRiskColor(talentForecast.marketTrends.talentScarcity)}>
                        {talentForecast.marketTrends.talentScarcity}
                      </Badge>
                    </div>
                  </div>

                  {/* Emerging skills */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Skills Emergentes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {talentForecast.emergingSkills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="bg-green-50">
                          {skill.skill} (+{skill.growthRate})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Demand forecast */}
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {talentForecast.demandForecast.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.role}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.projectedDemand}</Badge>
                              {item.projectedDemand === 'surging' && (
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.recommendedAction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Genera un forecast de demanda de talento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Succession Risk */}
        <TabsContent value="succession" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Succession Risk Analysis
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('succession')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Analizar</span>
              </Button>
            </CardHeader>
            <CardContent>
              {successionRisk ? (
                <div className="space-y-4">
                  {/* Overall score */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-xs text-muted-foreground">Riesgo Global</p>
                      <p className={cn("text-2xl font-bold", getScoreColor(100 - successionRisk.overallRiskScore))}>
                        {successionRisk.overallRiskScore}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Sin Sucesor</p>
                      <p className="text-2xl font-bold text-red-600">
                        {successionRisk.gapAnalysis.positionsWithoutSuccessor}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Pipeline Débil</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {successionRisk.gapAnalysis.positionsWithWeakPipeline}
                      </p>
                    </div>
                  </div>

                  {/* Critical positions */}
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {successionRisk.criticalPositions.map((pos, idx) => (
                        <div key={idx} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{pos.position}</p>
                              <p className="text-sm text-muted-foreground">{pos.incumbent}</p>
                            </div>
                            <Badge className={getRiskColor(pos.riskLevel)}>
                              {pos.riskLevel}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              Readiness: {pos.successionReadiness.replace('_', ' ')}
                            </Badge>
                            {pos.yearsToRetirement && (
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {pos.yearsToRetirement}y to retire
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Analiza el riesgo de sucesión en posiciones clave</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Productivity */}
        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-5 w-5 text-cyan-500" />
                Productivity Insights
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('productivity')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Analizar</span>
              </Button>
            </CardHeader>
            <CardContent>
              {productivityInsights ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-100">
                      <p className="text-xs text-muted-foreground">Score Global</p>
                      <p className="text-xl font-bold">{productivityInsights.organizationalMetrics.overallProductivityScore}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Revenue/Emp</p>
                      <p className="text-sm font-bold">{productivityInsights.organizationalMetrics.revenuePerEmployee}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Utilización</p>
                      <p className="text-xl font-bold">{productivityInsights.organizationalMetrics.utilizationRate}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Overtime</p>
                      <p className="text-xl font-bold">{productivityInsights.organizationalMetrics.overtimeRate}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Absentismo</p>
                      <p className="text-xl font-bold">{productivityInsights.organizationalMetrics.absenteeismRate}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Profit/Emp</p>
                      <p className="text-sm font-bold">{productivityInsights.organizationalMetrics.profitPerEmployee}</p>
                    </div>
                  </div>

                  {/* Optimization opportunities */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Oportunidades de Optimización</h4>
                    {productivityInsights.optimizationOpportunities.slice(0, 5).map((opp, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div>
                          <p className="font-medium">{opp.opportunity}</p>
                          <p className="text-sm text-green-600">Ganancia: {opp.potentialGain}</p>
                        </div>
                        <Badge variant="outline">
                          Esfuerzo: {opp.effort}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Gauge className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Analiza insights de productividad organizacional</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Engagement */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-pink-500" />
                Engagement Prediction
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('engagement')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Predecir</span>
              </Button>
            </CardHeader>
            <CardContent>
              {engagementPrediction ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-pink-50 border border-pink-100">
                      <p className="text-xs text-muted-foreground">Score Actual</p>
                      <p className="text-2xl font-bold">{engagementPrediction.currentEngagement.overallScore}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">eNPS</p>
                      <p className={cn("text-2xl font-bold",
                        engagementPrediction.currentEngagement.eNPS > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {engagementPrediction.currentEngagement.eNPS > 0 ? '+' : ''}{engagementPrediction.currentEngagement.eNPS}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Participación</p>
                      <p className="text-2xl font-bold">{engagementPrediction.currentEngagement.participationRate}%</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Tendencia</p>
                      <div className="flex items-center">
                        {engagementPrediction.currentEngagement.trend === 'improving' ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : engagementPrediction.currentEngagement.trend === 'declining' ? (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        ) : (
                          <Activity className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Predictions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <h4 className="font-medium mb-2">Predicción 3 meses</h4>
                      <p className="text-3xl font-bold">{engagementPrediction.predictions['3monthOutlook'].predictedScore}</p>
                      <p className="text-sm text-muted-foreground">
                        Confianza: {engagementPrediction.predictions['3monthOutlook'].confidence}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <h4 className="font-medium mb-2">Predicción 6 meses</h4>
                      <p className="text-3xl font-bold">{engagementPrediction.predictions['6monthOutlook'].predictedScore}</p>
                      <p className="text-sm text-muted-foreground">
                        Confianza: {engagementPrediction.predictions['6monthOutlook'].confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Predice la evolución del engagement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Skills Gap */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                Skills Gap Forecast
              </CardTitle>
              <Button
                size="sm"
                onClick={() => handleRunAnalysis('skills')}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span className="ml-1">Forecast</span>
              </Button>
            </CardHeader>
            <CardContent>
              {skillsGapForecast ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                      <p className="text-xs text-muted-foreground">Skills Tracked</p>
                      <p className="text-2xl font-bold">{skillsGapForecast.currentCapabilities.totalSkillsTracked}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Proficiencia Media</p>
                      <p className="text-2xl font-bold">{skillsGapForecast.currentCapabilities.averageProficiency}%</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Cobertura</p>
                      <p className="text-2xl font-bold">{skillsGapForecast.currentCapabilities.skillCoverage}%</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">Skills Críticas</p>
                      <Badge className={getRiskColor(
                        skillsGapForecast.currentCapabilities.criticalSkillsStatus === 'adequate' ? 'low' :
                        skillsGapForecast.currentCapabilities.criticalSkillsStatus === 'at_risk' ? 'medium' : 'high'
                      )}>
                        {skillsGapForecast.currentCapabilities.criticalSkillsStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Skills inventory */}
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {skillsGapForecast.skillsInventory.map((skill, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{skill.skill}</span>
                              <Badge variant="outline" className="text-xs">{skill.category}</Badge>
                            </div>
                            <Badge className={getRiskColor(skill.priority)}>
                              {skill.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Actual: {skill.currentLevel}%</span>
                                <span>Requerido: {skill.requiredLevel}%</span>
                              </div>
                              <Progress value={skill.currentLevel} className="h-2" />
                            </div>
                            <Badge variant={skill.gap > 20 ? 'destructive' : 'outline'}>
                              Gap: {skill.gap}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Automation impact */}
                  {skillsGapForecast.automationImpact.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{skillsGapForecast.automationImpact.length} skills</strong> con riesgo de automatización identificadas
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Genera un forecast de gaps de competencias</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRAnalyticsIntelligencePanel;
