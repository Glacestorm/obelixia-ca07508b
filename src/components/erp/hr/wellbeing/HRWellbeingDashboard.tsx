/**
 * HRWellbeingDashboard - Panel principal de bienestar laboral
 * Fase 3: Employee Experience & Wellbeing
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heart,
  Brain,
  Activity,
  Smile,
  Frown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Users,
  ClipboardList,
  Target,
  Shield,
  Loader2,
  RefreshCw,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useHRWellbeing } from '@/hooks/admin/hr/useHRWellbeing';
import { cn } from '@/lib/utils';

interface HRWellbeingDashboardProps {
  companyId?: string;
  className?: string;
}

export function HRWellbeingDashboard({ companyId, className }: HRWellbeingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const {
    isLoading,
    wellbeingScore,
    burnoutAnalysis,
    programRecommendations,
    analyzeWellbeing,
    predictBurnout,
    recommendPrograms,
  } = useHRWellbeing();

  const handleAnalyzeCompany = async () => {
    await analyzeWellbeing({
      company_context: { company_id: companyId },
      metrics: {
        avg_overtime_hours: 12,
        vacation_usage_rate: 0.65,
        sick_leave_rate: 0.03,
        turnover_rate: 0.08,
        engagement_score: 72
      }
    });
  };

  const handlePredictBurnout = async () => {
    await predictBurnout({
      metrics: {
        workload_index: 78,
        overtime_trend: 'increasing',
        vacation_pending_days: 15,
        last_break_days_ago: 45
      }
    });
  };

  const handleRecommendPrograms = async () => {
    await recommendPrograms({
      metrics: {
        top_issues: ['stress', 'work_life_balance', 'physical_health'],
        budget_tier: 'medium'
      },
      company_context: {
        industry: 'technology',
        size: 'medium',
        remote_percentage: 60
      }
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500 bg-green-500/10';
      case 'medium': case 'moderate': return 'text-yellow-500 bg-yellow-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'critical': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Bienestar y Employee Experience</h2>
            <p className="text-sm text-muted-foreground">
              Análisis de bienestar, encuestas de clima y programas de wellness
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAnalyzeCompany} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Analizar
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-pink-500 to-rose-600">
            <Sparkles className="h-4 w-4 mr-2" />
            Lanzar Encuesta
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Bienestar</p>
                <p className={cn("text-3xl font-bold", getScoreColor(wellbeingScore?.wellbeing_score || 75))}>
                  {wellbeingScore?.wellbeing_score || 75}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <Smile className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              +3% vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement</p>
                <p className="text-3xl font-bold text-blue-500">72%</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
              <Activity className="h-3 w-3" />
              Participación activa
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Riesgo Burnout</p>
                <p className="text-3xl font-bold text-orange-500">
                  {burnoutAnalysis?.burnout_analysis?.risk_score || 23}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/20">
                <Brain className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-2">
              <Badge className={getRiskColor(burnoutAnalysis?.burnout_analysis?.overall_risk || 'low')}>
                {burnoutAnalysis?.burnout_analysis?.overall_risk || 'Bajo'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">eNPS</p>
                <p className="text-3xl font-bold text-purple-500">+32</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <Target className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
              <TrendingUp className="h-3 w-3" />
              Promotores: 48%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="h-4 w-4 mr-1" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="surveys" className="text-xs">
            <ClipboardList className="h-4 w-4 mr-1" />
            Encuestas
          </TabsTrigger>
          <TabsTrigger value="burnout" className="text-xs">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Burnout
          </TabsTrigger>
          <TabsTrigger value="programs" className="text-xs">
            <Heart className="h-4 w-4 mr-1" />
            Programas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs">
            <Calendar className="h-4 w-4 mr-1" />
            Calendario
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wellbeing Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Factores de Bienestar
                </CardTitle>
                <CardDescription>Análisis por dimensión</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {(wellbeingScore?.factors || [
                      { factor: 'Equilibrio vida-trabajo', score: 68, status: 'warning' as const, details: 'Tendencia a horas extra' },
                      { factor: 'Ambiente laboral', score: 82, status: 'healthy' as const, details: 'Buen clima de equipo' },
                      { factor: 'Desarrollo profesional', score: 71, status: 'healthy' as const, details: 'Oportunidades de crecimiento' },
                      { factor: 'Reconocimiento', score: 55, status: 'warning' as const, details: 'Mejorar feedback' },
                      { factor: 'Bienestar físico', score: 78, status: 'healthy' as const, details: 'Programa activo' },
                      { factor: 'Salud mental', score: 64, status: 'warning' as const, details: 'Atención requerida' },
                    ]).map((factor, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{factor.factor}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-bold", getScoreColor(factor.score))}>
                              {factor.score}%
                            </span>
                            <Badge variant={
                              factor.status === 'healthy' ? 'default' :
                              factor.status === 'warning' ? 'secondary' : 'destructive'
                            } className="text-xs">
                              {factor.status === 'healthy' ? '✓' : factor.status === 'warning' ? '!' : '✗'}
                            </Badge>
                          </div>
                        </div>
                        <Progress 
                          value={factor.score} 
                          className={cn(
                            "h-2",
                            factor.status === 'healthy' ? '[&>div]:bg-green-500' :
                            factor.status === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                          )}
                        />
                        <p className="text-xs text-muted-foreground">{factor.details}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Recomendaciones IA
                </CardTitle>
                <CardDescription>Acciones prioritarias para mejorar el bienestar</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {(wellbeingScore?.recommendations || [
                      { priority: 'high' as const, action: 'Implementar política de desconexión digital', expected_impact: 'Reducir estrés 15%', timeline: '2 semanas' },
                      { priority: 'high' as const, action: 'Programa de reconocimiento mensual', expected_impact: 'Mejorar engagement 10%', timeline: '1 mes' },
                      { priority: 'medium' as const, action: 'Sesiones de mindfulness semanales', expected_impact: 'Reducir burnout 20%', timeline: '3 semanas' },
                      { priority: 'medium' as const, action: 'Flexibilidad horaria adicional', expected_impact: 'Mejorar conciliación', timeline: '1 mes' },
                      { priority: 'low' as const, action: 'Encuesta de pulso quincenal', expected_impact: 'Detección temprana', timeline: '2 semanas' },
                    ]).map((rec, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3 rounded-lg border",
                          rec.priority === 'high' ? 'border-red-500/30 bg-red-500/5' :
                          rec.priority === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' :
                          'border-green-500/30 bg-green-500/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{rec.action}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Impacto: {rec.expected_impact}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {rec.timeline}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Encuestas Activas</CardTitle>
                <CardDescription>Encuestas de clima y pulso en curso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Encuesta Clima Q1 2026', type: 'climate', status: 'active', participation: 78, deadline: '2026-02-15' },
                    { name: 'Pulse Check Semanal', type: 'pulse', status: 'active', participation: 92, deadline: '2026-02-07' },
                    { name: 'Evaluación Onboarding', type: 'wellbeing', status: 'scheduled', participation: 0, deadline: '2026-02-20' },
                  ].map((survey, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          survey.status === 'active' ? 'bg-green-500/20' : 'bg-muted'
                        )}>
                          <ClipboardList className={cn(
                            "h-5 w-5",
                            survey.status === 'active' ? 'text-green-500' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{survey.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{survey.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Cierra: {new Date(survey.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold">{survey.participation}%</p>
                          <p className="text-xs text-muted-foreground">participación</p>
                        </div>
                        <Button variant="outline" size="sm">Ver</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Crear Encuesta</CardTitle>
                <CardDescription>Genera encuestas con IA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Pulse (Rápida)', 'Clima Laboral', 'Engagement', 'Bienestar', 'Exit Interview'].map((type, idx) => (
                  <Button key={idx} variant="outline" className="w-full justify-start" size="sm">
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    {type}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Burnout Tab */}
        <TabsContent value="burnout" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-orange-500" />
                    Análisis de Burnout
                  </CardTitle>
                  <CardDescription>Modelo Maslach de agotamiento laboral</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handlePredictBurnout} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Dimensions */}
                  <div className="space-y-4">
                    {[
                      { name: 'Agotamiento Emocional', value: burnoutAnalysis?.burnout_analysis?.dimensions?.emotional_exhaustion || 35, icon: Frown },
                      { name: 'Despersonalización', value: burnoutAnalysis?.burnout_analysis?.dimensions?.depersonalization || 22, icon: Users },
                      { name: 'Realización Personal', value: 100 - (burnoutAnalysis?.burnout_analysis?.dimensions?.reduced_accomplishment || 28), icon: Target },
                    ].map((dim, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <dim.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{dim.name}</span>
                          </div>
                          <span className={cn("text-sm font-bold", getScoreColor(100 - dim.value))}>
                            {dim.value}%
                          </span>
                        </div>
                        <Progress 
                          value={dim.value} 
                          className={cn(
                            "h-2",
                            dim.value < 30 ? '[&>div]:bg-green-500' :
                            dim.value < 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Stage Indicator */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground">Etapa actual:</p>
                    <p className="text-lg font-bold capitalize">
                      {burnoutAnalysis?.burnout_analysis?.stage || 'Ninguna detectada'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Plan de Intervención
                </CardTitle>
                <CardDescription>Acciones preventivas y correctivas</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-red-500">Acciones Inmediatas</h4>
                      <ul className="space-y-2">
                        {(burnoutAnalysis?.intervention_plan?.immediate_actions || [
                          'Redistribuir carga de trabajo',
                          'Reunión 1:1 con manager',
                          'Evaluar horas extra últimas 4 semanas'
                        ]).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2 text-yellow-500">Corto Plazo</h4>
                      <ul className="space-y-2">
                        {(burnoutAnalysis?.intervention_plan?.short_term_actions || [
                          'Programa de coaching individual',
                          'Flexibilidad horaria temporal',
                          'Vacaciones pendientes obligatorias'
                        ]).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <TrendingDown className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2 text-green-500">Prevención Largo Plazo</h4>
                      <ul className="space-y-2">
                        {(burnoutAnalysis?.intervention_plan?.long_term_prevention || [
                          'Revisión de carga de trabajo trimestral',
                          'Programa de bienestar continuo',
                          'Política de desconexión digital'
                        ]).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Programas de Wellness Recomendados</h3>
              <Button variant="outline" size="sm" onClick={handleRecommendPrograms} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generar Recomendaciones
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(programRecommendations?.recommended_programs || [
                { program_name: 'Mindfulness & Meditación', category: 'Salud mental', priority: 'high' as const, estimated_cost_per_employee: 15, expected_benefits: ['Reducir estrés', 'Mejorar concentración'], implementation_complexity: 'low' as const },
                { program_name: 'Gimnasio Corporativo', category: 'Salud física', priority: 'medium' as const, estimated_cost_per_employee: 35, expected_benefits: ['Mejorar salud', 'Team building'], implementation_complexity: 'medium' as const },
                { program_name: 'Coaching Individual', category: 'Desarrollo', priority: 'high' as const, estimated_cost_per_employee: 80, expected_benefits: ['Desarrollo liderazgo', 'Reducir burnout'], implementation_complexity: 'low' as const },
                { program_name: 'Flexibilidad Horaria Plus', category: 'Conciliación', priority: 'high' as const, estimated_cost_per_employee: 0, expected_benefits: ['Mejor conciliación', 'Mayor productividad'], implementation_complexity: 'medium' as const },
                { program_name: 'Team Building Trimestral', category: 'Social', priority: 'medium' as const, estimated_cost_per_employee: 50, expected_benefits: ['Cohesión equipo', 'Comunicación'], implementation_complexity: 'low' as const },
                { program_name: 'Educación Financiera', category: 'Financiero', priority: 'low' as const, estimated_cost_per_employee: 10, expected_benefits: ['Reducir estrés financiero', 'Planificación'], implementation_complexity: 'low' as const },
              ]).map((program, idx) => (
                <Card key={idx} className={cn(
                  "border-l-4",
                  program.priority === 'high' ? 'border-l-red-500' :
                  program.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{program.program_name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{program.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Coste/empleado</span>
                        <span className="font-medium">{program.estimated_cost_per_employee}€/mes</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Beneficios esperados:</p>
                        <div className="flex flex-wrap gap-1">
                          {program.expected_benefits.map((b, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{b}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Implementar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendario de Bienestar</CardTitle>
              <CardDescription>Actividades y eventos programados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2026-02-05', event: 'Sesión de Mindfulness', type: 'wellness', time: '13:00' },
                  { date: '2026-02-07', event: 'Cierre Pulse Check', type: 'survey', time: '18:00' },
                  { date: '2026-02-10', event: 'Taller Gestión del Estrés', type: 'training', time: '10:00' },
                  { date: '2026-02-14', event: 'Team Building Departamental', type: 'social', time: '16:00' },
                  { date: '2026-02-15', event: 'Cierre Encuesta Clima Q1', type: 'survey', time: '23:59' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                    <div className="text-center min-w-[50px]">
                      <p className="text-2xl font-bold">{new Date(item.date).getDate()}</p>
                      <p className="text-xs text-muted-foreground uppercase">
                        {new Date(item.date).toLocaleDateString('es', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.event}</p>
                      <p className="text-sm text-muted-foreground">{item.time}</p>
                    </div>
                    <Badge variant={
                      item.type === 'wellness' ? 'default' :
                      item.type === 'survey' ? 'secondary' :
                      item.type === 'training' ? 'outline' : 'default'
                    }>
                      {item.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRWellbeingDashboard;
