/**
 * HRAnalyticsIntelligencePanel
 * Fase 7: HR Analytics Predictivos y Workforce Intelligence
 * Refactored: Uses real employee data from Supabase
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain, TrendingUp, TrendingDown, Users, DollarSign, Target,
  AlertTriangle, Activity, Zap, RefreshCw, ArrowUpRight, ArrowDownRight,
  Clock, Sparkles, Shield, Gauge, UserCheck, GraduationCap
} from 'lucide-react';
import { useHRAnalyticsIntelligence } from '@/hooks/admin/hr/useHRAnalyticsIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function HRAnalyticsIntelligencePanel({ companyId }: { companyId: string }) {
  const [activeTab, setActiveTab] = useState('turnover');
  const [employeeData, setEmployeeData] = useState<any[]>([]);

  const {
    isLoading, error, turnoverAnalysis, workforcePlan, salaryBenchmark,
    talentForecast, successionRisk, productivityInsights, engagementPrediction,
    skillsGapForecast, predictTurnover, generateWorkforcePlan, analyzeSalaryBenchmark,
    forecastTalentDemand, analyzeSuccessionRisk, analyzeProductivity,
    predictEngagement, forecastSkillsGap,
  } = useHRAnalyticsIntelligence();

  // Fetch real employee data
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, position, base_salary, hire_date, status, erp_hr_departments!erp_hr_employees_department_id_fkey(name)')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .limit(100);

      if (data) {
        setEmployeeData(data.map((e: any) => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          department: e.erp_hr_departments?.name || 'N/A',
          tenure: e.hire_date ? Math.floor((Date.now() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
          salary: e.base_salary || 0,
          position: e.position || 'N/A',
        })));
      }
    };
    fetchEmployees();
  }, [companyId]);

  const handleRunAnalysis = async (type: string) => {
    const avgSalary = employeeData.length > 0 ? employeeData.reduce((s, e) => s + e.salary, 0) / employeeData.length : 30000;

    switch (type) {
      case 'turnover':
        await predictTurnover({
          employees: employeeData,
          engagement: { avgScore: 72, trend: 'stable' },
          salaryData: { avgSalary, marketMedian: avgSalary * 1.05 },
        });
        break;
      case 'workforce':
        await generateWorkforcePlan(
          { workforce: { totalHeadcount: employeeData.length, departments: new Set(employeeData.map(e => e.department)).size } },
          { planningHorizon: '12 meses', scenarios: ['moderate', 'aggressive'] }
        );
        break;
      case 'salary':
        await analyzeSalaryBenchmark({
          salaryData: employeeData,
          sector: 'General',
          region: 'España',
          companySize: employeeData.length > 100 ? 'Grande' : 'PYME'
        });
        break;
      case 'talent':
        await forecastTalentDemand(
          { sector: 'General', currentRoles: [...new Set(employeeData.map(e => e.position))] },
          { horizon: '24 meses' }
        );
        break;
      case 'succession':
        await analyzeSuccessionRisk({
          leadershipPositions: employeeData.filter(e => e.position?.toLowerCase().includes('director')).map(e => ({ title: e.position, incumbent: e.name })),
          talentData: employeeData,
        });
        break;
      case 'productivity':
        await analyzeProductivity({
          operationalData: { revenue: avgSalary * employeeData.length * 3, headcount: employeeData.length },
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
          { currentSkills: [...new Set(employeeData.map(e => e.position))], roleRequirements: [] },
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

  const AnalysisButton = ({ type, label }: { type: string; label: string }) => (
    <Button size="sm" onClick={() => handleRunAnalysis(type)} disabled={isLoading || employeeData.length === 0}>
      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      <span className="ml-1">{label}</span>
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Analytics Intelligence</h2>
            <p className="text-muted-foreground">
              {employeeData.length} empleados cargados • Predicción y planificación estratégica
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="h-3 w-3 mr-1" />Predictive Analytics
        </Badge>
      </div>

      {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {employeeData.length === 0 && (
        <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>No hay empleados cargados. Genera datos demo desde Herramientas → Datos Demo.</AlertDescription></Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="turnover" className="text-xs"><TrendingDown className="h-3 w-3 mr-1" />Rotación</TabsTrigger>
          <TabsTrigger value="workforce" className="text-xs"><Users className="h-3 w-3 mr-1" />Workforce</TabsTrigger>
          <TabsTrigger value="salary" className="text-xs"><DollarSign className="h-3 w-3 mr-1" />Salarios</TabsTrigger>
          <TabsTrigger value="talent" className="text-xs"><Target className="h-3 w-3 mr-1" />Talento</TabsTrigger>
          <TabsTrigger value="succession" className="text-xs"><Shield className="h-3 w-3 mr-1" />Sucesión</TabsTrigger>
          <TabsTrigger value="productivity" className="text-xs"><Gauge className="h-3 w-3 mr-1" />Productividad</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs"><UserCheck className="h-3 w-3 mr-1" />Engagement</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs"><GraduationCap className="h-3 w-3 mr-1" />Skills</TabsTrigger>
        </TabsList>

        {/* Tab: Turnover */}
        <TabsContent value="turnover" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" />Predicción de Rotación</CardTitle>
              <AnalysisButton type="turnover" label="Analizar" />
            </CardHeader>
            <CardContent>
              {turnoverAnalysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border"><p className="text-xs text-muted-foreground">Riesgo General</p><p className={cn("text-2xl font-bold", getScoreColor(100 - turnoverAnalysis.aggregateMetrics.overallRiskScore))}>{turnoverAnalysis.aggregateMetrics.overallRiskScore}%</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">En Riesgo</p><p className="text-2xl font-bold">{turnoverAnalysis.aggregateMetrics.employeesAtRisk}</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">Coste Estimado</p><p className="text-lg font-bold">{turnoverAnalysis.aggregateMetrics.estimatedCostOfTurnover}</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">Tendencia</p>
                      <div className="flex items-center gap-1">
                        {turnoverAnalysis.trendAnalysis.direction === 'improving' ? <ArrowDownRight className="h-5 w-5 text-green-500" /> : turnoverAnalysis.trendAnalysis.direction === 'deteriorating' ? <ArrowUpRight className="h-5 w-5 text-red-500" /> : <Activity className="h-5 w-5 text-yellow-500" />}
                        <span className="font-medium capitalize">{turnoverAnalysis.trendAnalysis.direction}</span>
                      </div>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {turnoverAnalysis.predictions.map((pred, idx) => (
                        <div key={idx} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <div><p className="font-medium">{pred.employeeName}</p><p className="text-sm text-muted-foreground">{pred.department}</p></div>
                            <Badge className={getRiskColor(pred.riskLevel)}>{pred.riskScore}% - {pred.riskLevel}</Badge>
                          </div>
                          <Progress value={pred.riskScore} className="h-2 mb-2" />
                          <div className="flex flex-wrap gap-1">{pred.topFactors.slice(0, 3).map((f, i) => <Badge key={i} variant="outline" className="text-xs">{f.factor}</Badge>)}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>Ejecuta el análisis para predecir riesgo de rotación</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Workforce */}
        <TabsContent value="workforce" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" />Workforce Planning</CardTitle>
              <AnalysisButton type="workforce" label="Generar Plan" />
            </CardHeader>
            <CardContent>
              {workforcePlan ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100"><p className="text-xs text-muted-foreground">Headcount</p><p className="text-2xl font-bold">{workforcePlan.currentState.totalHeadcount}</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">FTEs</p><p className="text-2xl font-bold">{workforcePlan.currentState.ftesEquivalent}</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">Antigüedad</p><p className="text-lg font-bold">{workforcePlan.currentState.avgTenure}</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">Departamentos</p><p className="text-2xl font-bold">{workforcePlan.currentState.departmentBreakdown.length}</p></div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    {workforcePlan.projections.map((proj, idx) => (
                      <div key={idx} className="p-4 rounded-lg border bg-card mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex gap-2"><Badge variant="outline">{proj.timeframe}</Badge><Badge className="bg-blue-100 text-blue-700">{proj.scenario}</Badge></div>
                          <div className="text-right"><p className="font-bold">{proj.projectedHeadcount}</p><p className={cn("text-sm", proj.netChange >= 0 ? "text-green-600" : "text-red-600")}>{proj.netChange >= 0 ? '+' : ''}{proj.netChange}</p></div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>Genera un plan estratégico de workforce</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Salary */}
        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" />Salary Benchmarking</CardTitle>
              <AnalysisButton type="salary" label="Analizar" />
            </CardHeader>
            <CardContent>
              {salaryBenchmark ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border"><p className="text-xs text-muted-foreground">Percentil Mercado</p><p className="text-2xl font-bold">{salaryBenchmark.marketPositioning.overallPercentile}%</p></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">Posición</p><Badge>{salaryBenchmark.marketPositioning.positioningLabel.replace('_', ' ')}</Badge></div>
                    <div className="p-4 rounded-lg bg-muted/50 border"><p className="text-xs text-muted-foreground">Competitividad</p><p className="text-2xl font-bold">{salaryBenchmark.marketPositioning.competitivenessScore}/100</p></div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    {salaryBenchmark.roleComparison.map((role, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between mb-2">
                        <div><p className="font-medium">{role.role}</p><p className="text-sm text-muted-foreground">Actual: €{role.currentSalary.toLocaleString()} | P50: €{role.marketP50.toLocaleString()}</p></div>
                        <Badge variant="outline">P{role.currentPercentile}</Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>Analiza la competitividad salarial</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remaining tabs: simplified pattern */}
        {['talent', 'succession', 'productivity', 'engagement', 'skills'].map(tab => {
          const tabConfig: Record<string, { icon: React.ElementType; title: string; color: string; data: any; emptyText: string }> = {
            talent: { icon: Target, title: 'Talent Demand Forecast', color: 'text-purple-500', data: talentForecast, emptyText: 'Genera un forecast de demanda de talento' },
            succession: { icon: Shield, title: 'Succession Risk', color: 'text-amber-500', data: successionRisk, emptyText: 'Analiza el riesgo de sucesión' },
            productivity: { icon: Gauge, title: 'Productivity Insights', color: 'text-cyan-500', data: productivityInsights, emptyText: 'Analiza productividad organizacional' },
            engagement: { icon: UserCheck, title: 'Engagement Prediction', color: 'text-pink-500', data: engagementPrediction, emptyText: 'Predice engagement de empleados' },
            skills: { icon: GraduationCap, title: 'Skills Gap Forecast', color: 'text-indigo-500', data: skillsGapForecast, emptyText: 'Forecast de gaps de competencias' },
          };
          const cfg = tabConfig[tab];
          const TabIcon = cfg.icon;
          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><TabIcon className={cn("h-5 w-5", cfg.color)} />{cfg.title}</CardTitle>
                  <AnalysisButton type={tab} label="Analizar" />
                </CardHeader>
                <CardContent>
                  {cfg.data ? (
                    <div className="p-4 rounded-lg border bg-card">
                      <pre className="text-xs text-muted-foreground overflow-auto max-h-[400px]">
                        {JSON.stringify(cfg.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground"><TabIcon className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>{cfg.emptyText}</p></div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default HRAnalyticsIntelligencePanel;
