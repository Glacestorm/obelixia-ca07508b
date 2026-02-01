/**
 * HRAdvancedAnalyticsPanel - Fase 8
 * KPIs Predictivos Avanzados y Métricas Internacionales
 * Time-to-Hire, Cost-per-Hire, Quality of Hire, Flight Risk, eNPS, Compa-Ratio, 9-Box
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  DollarSign,
  Star,
  AlertTriangle,
  ThumbsUp,
  Users,
  Target,
  BarChart3,
  Brain,
  RefreshCw,
  ArrowRight,
  Shield,
  Sparkles,
  Award,
  Activity,
  Send,
  FileDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HRENPSSurveyDialog, HRFlightRiskActionDialog } from './dialogs';

interface HRAdvancedAnalyticsPanelProps {
  companyId: string;
}

interface KPIData {
  code: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  achievement: number;
  trend: 'improving' | 'stable' | 'declining';
  benchmark: number;
  vsBenchmark: string;
}

interface FlightRiskEmployee {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  mainDrivers: string[];
  recommendedActions: string[];
}

interface ENPSData {
  score: number;
  breakdown: {
    promoters: number;
    passives: number;
    detractors: number;
    totalResponses: number;
    responseRate: number;
  };
  trend: {
    current: number;
    previous: number;
    change: string;
    direction: 'improving' | 'stable' | 'declining';
  };
}

interface NineBoxCell {
  position: string;
  label: string;
  count: number;
  color: string;
}

export function HRAdvancedAnalyticsPanel({ companyId }: HRAdvancedAnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [flightRisks, setFlightRisks] = useState<FlightRiskEmployee[]>([]);
  const [enpsData, setEnpsData] = useState<ENPSData | null>(null);
  const [nineBoxData, setNineBoxData] = useState<NineBoxCell[]>([]);
  
  // Dialog states
  const [showENPSDialog, setShowENPSDialog] = useState(false);
  const [showFlightRiskDialog, setShowFlightRiskDialog] = useState(false);
  const [selectedFlightRiskEmployee, setSelectedFlightRiskEmployee] = useState<FlightRiskEmployee | null>(null);

  // Datos demo para visualización inicial
  const demoKPIs: KPIData[] = [
    { code: 'time_to_hire', name: 'Time-to-Hire', value: 32, unit: 'días', target: 28, achievement: 87.5, trend: 'improving', benchmark: 35, vsBenchmark: '+8.6%' },
    { code: 'cost_per_hire', name: 'Cost-per-Hire', value: 3200, unit: '€', target: 3000, achievement: 93.8, trend: 'stable', benchmark: 3500, vsBenchmark: '+8.6%' },
    { code: 'quality_of_hire', name: 'Quality of Hire', value: 78, unit: '%', target: 80, achievement: 97.5, trend: 'improving', benchmark: 72, vsBenchmark: '+8.3%' },
    { code: 'turnover_rate', name: 'Rotación Voluntaria', value: 12, unit: '%', target: 10, achievement: 83.3, trend: 'improving', benchmark: 18, vsBenchmark: '+33%' },
    { code: 'enps', name: 'eNPS', value: 35, unit: '', target: 40, achievement: 87.5, trend: 'improving', benchmark: 25, vsBenchmark: '+40%' },
    { code: 'compa_ratio', name: 'Compa-Ratio Medio', value: 0.95, unit: '', target: 1.0, achievement: 95, trend: 'stable', benchmark: 0.92, vsBenchmark: '+3.3%' },
  ];

  const demoFlightRisks: FlightRiskEmployee[] = [
    { employeeId: '1', employeeName: 'María García', riskScore: 82, riskLevel: 'high', confidence: 85, mainDrivers: ['3 años sin promoción', 'Salario 12% bajo mercado'], recommendedActions: ['Reunión 1:1', 'Revisar compensación'] },
    { employeeId: '2', employeeName: 'Carlos López', riskScore: 75, riskLevel: 'high', confidence: 78, mainDrivers: ['Carga de trabajo alta', 'Manager rotó'], recommendedActions: ['Redistribuir carga', 'Mentoring'] },
    { employeeId: '3', employeeName: 'Ana Martínez', riskScore: 58, riskLevel: 'medium', confidence: 72, mainDrivers: ['Perfil muy demandado'], recommendedActions: ['Plan de desarrollo', 'Proyectos innovadores'] },
    { employeeId: '4', employeeName: 'Pedro Sánchez', riskScore: 45, riskLevel: 'medium', confidence: 68, mainDrivers: ['Engagement decreciente'], recommendedActions: ['Encuesta 1:1', 'Formación'] },
  ];

  const demoENPS: ENPSData = {
    score: 35,
    breakdown: { promoters: 45, passives: 35, detractors: 20, totalResponses: 42, responseRate: 89 },
    trend: { current: 35, previous: 28, change: '+7', direction: 'improving' }
  };

  // Demo 9-Box Grid data
  const demoNineBoxData: NineBoxCell[] = [
    { position: 'high-low', label: 'Enigma', count: 3, color: 'bg-amber-500' },
    { position: 'high-medium', label: 'Potencial', count: 8, color: 'bg-blue-500' },
    { position: 'high-high', label: 'Estrella', count: 5, color: 'bg-green-500' },
    { position: 'medium-low', label: 'Inconsistente', count: 4, color: 'bg-orange-500' },
    { position: 'medium-medium', label: 'Core', count: 15, color: 'bg-blue-400' },
    { position: 'medium-high', label: 'Alto Rendimiento', count: 7, color: 'bg-green-400' },
    { position: 'low-low', label: 'Bajo Rendimiento', count: 2, color: 'bg-red-500' },
    { position: 'low-medium', label: 'Especialista', count: 4, color: 'bg-blue-300' },
    { position: 'low-high', label: 'Profesional', count: 6, color: 'bg-green-300' },
  ];

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch KPIs and 9-Box data from edge function
      const { data, error } = await supabase.functions.invoke('erp-hr-analytics-agent', {
        body: {
          action: 'calculate_kpis',
          context: { companyId, period: 'Q4 2026' }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.kpis) {
        setKpis(data.data.kpis);
      } else {
        setKpis(demoKPIs);
      }

      // Load 9-Box Grid data from performance evaluations
      const nineBoxResponse = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'get_ninebox_distribution',
          context: { companyId }
        }
      });

      if (nineBoxResponse.data?.success && nineBoxResponse.data?.data?.nineBox) {
        setNineBoxData(nineBoxResponse.data.data.nineBox);
      } else {
        setNineBoxData(demoNineBoxData);
      }

      toast.success('Analytics actualizados');
    } catch (error) {
      console.error('Error loading analytics:', error);
      setKpis(demoKPIs);
      setFlightRisks(demoFlightRisks);
      setEnpsData(demoENPS);
      setNineBoxData(demoNineBoxData);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadge = (level: string) => {
    const variants: Record<string, string> = {
      low: 'bg-green-500/10 text-green-500 border-green-500/20',
      medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      critical: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return <Badge className={cn('text-xs', variants[level] || variants.medium)}>{level.toUpperCase()}</Badge>;
  };

  const displayKPIs = kpis.length > 0 ? kpis : demoKPIs;
  const displayFlightRisks = flightRisks.length > 0 ? flightRisks : demoFlightRisks;
  const displayENPS = enpsData || demoENPS;
  const displayNineBox = nineBoxData.length > 0 ? nineBoxData : demoNineBoxData;

  // Helper function to get count for a specific 9-Box position
  const getBoxCount = (position: string): number => {
    const cell = displayNineBox.find(item => item.position === position);
    return cell?.count ?? 0;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics Avanzado HR
          </h2>
          <p className="text-sm text-muted-foreground">
            KPIs predictivos, benchmarks sectoriales y métricas internacionales
          </p>
        </div>
        <Button onClick={loadAnalytics} disabled={isLoading} size="sm">
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {displayKPIs.slice(0, 6).map((kpi) => (
          <Card key={kpi.code} className="bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{kpi.name}</span>
                {getTrendIcon(kpi.trend)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{kpi.value}</span>
                <span className="text-xs text-muted-foreground">{kpi.unit}</span>
              </div>
              <Progress value={kpi.achievement} className="h-1 mt-2" />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">vs benchmark</span>
                <span className={kpi.vsBenchmark.startsWith('+') ? 'text-green-500' : 'text-red-500'}>
                  {kpi.vsBenchmark}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs gap-1">
            <Activity className="h-3 w-3" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="flight-risk" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            Flight Risk
          </TabsTrigger>
          <TabsTrigger value="enps" className="text-xs gap-1">
            <ThumbsUp className="h-3 w-3" />
            eNPS
          </TabsTrigger>
          <TabsTrigger value="9box" className="text-xs gap-1">
            <Target className="h-3 w-3" />
            9-Box
          </TabsTrigger>
          <TabsTrigger value="compa-ratio" className="text-xs gap-1">
            <DollarSign className="h-3 w-3" />
            Compa-Ratio
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recruitment Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Métricas de Reclutamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Time-to-Hire</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">32 días</span>
                      <Badge variant="outline" className="text-xs text-green-500">-3d</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost-per-Hire</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">€3,200</span>
                      <Badge variant="outline" className="text-xs text-green-500">-€200</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Offer Acceptance</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">78%</span>
                      <Badge variant="outline" className="text-xs text-amber-500">+2%</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Quality of Hire (12m)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">78/100</span>
                      <Badge variant="outline" className="text-xs text-green-500">+5</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Retention Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Métricas de Retención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rotación Voluntaria</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">12%</span>
                      <Badge variant="outline" className="text-xs text-green-500">-2%</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rotación Primer Año</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">8%</span>
                      <Badge variant="outline" className="text-xs text-green-500">-1%</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Empleados Alto Riesgo</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-500">4</span>
                      <Badge variant="outline" className="text-xs text-orange-500">Atención</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. Antigüedad</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">4.2 años</span>
                      <Badge variant="outline" className="text-xs text-green-500">+0.3</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Insights IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Fortaleza</span>
                  </div>
                  <p className="text-sm">La rotación está 33% por debajo del benchmark del sector</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-500">Atención</span>
                  </div>
                  <p className="text-sm">4 empleados clave en departamento Tech con riesgo alto de fuga</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-500">Recomendación</span>
                  </div>
                  <p className="text-sm">Revisar compensación en perfiles tech para alinearse con mercado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flight Risk Tab */}
        <TabsContent value="flight-risk" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Flight Risk - Predicción de Rotación
              </CardTitle>
              <CardDescription>
                Empleados con mayor probabilidad de abandono basado en análisis predictivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Confianza</TableHead>
                      <TableHead>Factores principales</TableHead>
                      <TableHead>Acciones recomendadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayFlightRisks.map((employee) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium">{employee.employeeName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={employee.riskScore} className="w-16 h-2" />
                            <span className="text-sm font-bold">{employee.riskScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getRiskBadge(employee.riskLevel)}</TableCell>
                        <TableCell>{employee.confidence}%</TableCell>
                        <TableCell>
                          <ul className="text-xs text-muted-foreground">
                            {employee.mainDrivers.slice(0, 2).map((driver, i) => (
                              <li key={i}>• {driver}</li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFlightRiskEmployee(employee);
                              setShowFlightRiskDialog(true);
                            }}
                          >
                            <Target className="h-3 w-3 mr-1" />
                            Plan Acción
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* eNPS Tab */}
        <TabsContent value="enps" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowENPSDialog(true)} className="gap-2">
              <Send className="h-4 w-4" />
              Lanzar Encuesta eNPS
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">eNPS Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">+{displayENPS.score}</span>
                      <p className="text-xs text-muted-foreground">de -100 a +100</p>
                    </div>
                  </div>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle 
                      cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" 
                      strokeDasharray={`${((displayENPS.score + 100) / 200) * 352} 352`}
                      className="text-primary"
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(displayENPS.trend.direction)}
                  <span className="text-sm text-green-500">{displayENPS.trend.change} vs anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Desglose de Respuestas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        Promotores (9-10)
                      </span>
                      <span className="font-bold">{displayENPS.breakdown.promoters}%</span>
                    </div>
                    <Progress value={displayENPS.breakdown.promoters} className="h-2 bg-muted [&>div]:bg-green-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        Pasivos (7-8)
                      </span>
                      <span className="font-bold">{displayENPS.breakdown.passives}%</span>
                    </div>
                    <Progress value={displayENPS.breakdown.passives} className="h-2 bg-muted [&>div]:bg-amber-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        Detractores (0-6)
                      </span>
                      <span className="font-bold">{displayENPS.breakdown.detractors}%</span>
                    </div>
                    <Progress value={displayENPS.breakdown.detractors} className="h-2 bg-muted [&>div]:bg-red-500" />
                  </div>
                  <div className="pt-2 border-t flex justify-between text-sm text-muted-foreground">
                    <span>Tasa de respuesta: {displayENPS.breakdown.responseRate}%</span>
                    <span>Total respuestas: {displayENPS.breakdown.totalResponses}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 9-Box Tab */}
        <TabsContent value="9box" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    9-Box Grid - Mapa de Talento
                  </CardTitle>
                  <CardDescription>
                    Distribución de empleados por potencial (vertical) y rendimiento (horizontal)
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    toast.success('Exportando 9-Box Grid a Excel...');
                    const displayData = displayNineBox;
                    const csvData = displayData.map(item => 
                      `${item.label},${item.count},${item.position}`
                    ).join('\n');
                    const blob = new Blob([`Categoría,Empleados,Posición\n${csvData}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '9box-grid-export.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
                {/* High Potential Row */}
                <div className="p-4 rounded-lg bg-amber-500/20 border border-amber-500/30 text-center">
                  <p className="text-xs font-medium text-amber-600">Enigma</p>
                  <p className="text-2xl font-bold">{getBoxCount('high-low')}</p>
                  <p className="text-xs text-muted-foreground">Alto Pot. / Bajo Rend.</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/30 text-center">
                  <p className="text-xs font-medium text-blue-600">Potencial</p>
                  <p className="text-2xl font-bold">{getBoxCount('high-medium')}</p>
                  <p className="text-xs text-muted-foreground">Alto Pot. / Medio Rend.</p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
                  <p className="text-xs font-medium text-green-600">Estrella ⭐</p>
                  <p className="text-2xl font-bold">{getBoxCount('high-high')}</p>
                  <p className="text-xs text-muted-foreground">Alto Pot. / Alto Rend.</p>
                </div>

                {/* Medium Potential Row */}
                <div className="p-4 rounded-lg bg-orange-500/20 border border-orange-500/30 text-center">
                  <p className="text-xs font-medium text-orange-600">Inconsistente</p>
                  <p className="text-2xl font-bold">{getBoxCount('medium-low')}</p>
                  <p className="text-xs text-muted-foreground">Medio Pot. / Bajo Rend.</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-400/20 border border-blue-400/30 text-center">
                  <p className="text-xs font-medium text-blue-500">Core Player</p>
                  <p className="text-2xl font-bold">{getBoxCount('medium-medium')}</p>
                  <p className="text-xs text-muted-foreground">Medio Pot. / Medio Rend.</p>
                </div>
                <div className="p-4 rounded-lg bg-green-400/20 border border-green-400/30 text-center">
                  <p className="text-xs font-medium text-green-500">Alto Rendimiento</p>
                  <p className="text-2xl font-bold">{getBoxCount('medium-high')}</p>
                  <p className="text-xs text-muted-foreground">Medio Pot. / Alto Rend.</p>
                </div>

                {/* Low Potential Row */}
                <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-center">
                  <p className="text-xs font-medium text-red-600">Riesgo</p>
                  <p className="text-2xl font-bold">{getBoxCount('low-low')}</p>
                  <p className="text-xs text-muted-foreground">Bajo Pot. / Bajo Rend.</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-300/20 border border-blue-300/30 text-center">
                  <p className="text-xs font-medium text-blue-400">Especialista</p>
                  <p className="text-2xl font-bold">{getBoxCount('low-medium')}</p>
                  <p className="text-xs text-muted-foreground">Bajo Pot. / Medio Rend.</p>
                </div>
                <div className="p-4 rounded-lg bg-green-300/20 border border-green-300/30 text-center">
                  <p className="text-xs font-medium text-green-400">Profesional</p>
                  <p className="text-2xl font-bold">{getBoxCount('low-high')}</p>
                  <p className="text-xs text-muted-foreground">Bajo Pot. / Alto Rend.</p>
                </div>
              </div>

              <div className="flex justify-center gap-8 mt-6 text-xs text-muted-foreground">
                <span>← Bajo Rendimiento | Alto Rendimiento →</span>
              </div>
              <div className="flex justify-center mt-2 text-xs text-muted-foreground">
                <span>↑ Alto Potencial | Bajo Potencial ↓</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compa-Ratio Tab */}
        <TabsContent value="compa-ratio" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Distribución Compa-Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span className="text-sm flex-1">Crítico (&lt;0.80)</span>
                    <span className="font-bold">3</span>
                    <span className="text-xs text-muted-foreground">6%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-orange-500" />
                    <span className="text-sm flex-1">Bajo mercado (0.80-0.90)</span>
                    <span className="font-bold">9</span>
                    <span className="text-xs text-muted-foreground">19%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className="text-sm flex-1">En mercado (0.90-1.10)</span>
                    <span className="font-bold">28</span>
                    <span className="text-xs text-muted-foreground">60%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span className="text-sm flex-1">Sobre mercado (&gt;1.10)</span>
                    <span className="font-bold">7</span>
                    <span className="text-xs text-muted-foreground">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Impacto Presupuestario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Coste para alcanzar mediana mercado</p>
                    <p className="text-2xl font-bold">€45,000</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Coste para alcanzar percentil 75</p>
                    <p className="text-2xl font-bold">€85,000</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-sm text-orange-500 font-medium">Riesgo estimado de fuga</p>
                    <p className="text-2xl font-bold text-orange-500">€120,000</p>
                    <p className="text-xs text-muted-foreground">Si no se ajustan 12 empleados críticos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <HRENPSSurveyDialog
        open={showENPSDialog}
        onOpenChange={setShowENPSDialog}
        companyId={companyId}
        onLaunched={() => {
          toast.success('Encuesta eNPS lanzada correctamente');
          loadAnalytics();
        }}
      />

      <HRFlightRiskActionDialog
        open={showFlightRiskDialog}
        onOpenChange={setShowFlightRiskDialog}
        companyId={companyId}
        employee={selectedFlightRiskEmployee}
        onPlanCreated={() => {
          toast.success('Plan de retención creado');
          setShowFlightRiskDialog(false);
        }}
      />
    </div>
  );
}

export default HRAdvancedAnalyticsPanel;