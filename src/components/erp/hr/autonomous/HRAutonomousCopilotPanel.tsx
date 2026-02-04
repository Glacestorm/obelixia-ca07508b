/**
 * HRAutonomousCopilotPanel
 * Panel del Copiloto IA Autónomo para RRHH
 * Fase 5: Copilotos IA Autónomos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  AlertTriangle, 
  Bell, 
  Calendar, 
  Users, 
  TrendingUp, 
  Settings,
  Zap,
  Shield,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  Loader2,
  ChevronRight,
  Activity
} from 'lucide-react';
import { 
  useHRAutonomousCopilot, 
  AutonomyLevel, 
  ProactiveAlert,
  Prediction,
  Optimization
} from '@/hooks/admin/hr/useHRAutonomousCopilot';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const AUTONOMY_LEVELS: { value: AutonomyLevel; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'advisory', 
    label: 'Asesor', 
    description: 'Solo sugerencias, requiere aprobación',
    icon: <Brain className="h-4 w-4" />
  },
  { 
    value: 'semi-autonomous', 
    label: 'Semi-Autónomo', 
    description: 'Ejecuta acciones de bajo riesgo',
    icon: <Zap className="h-4 w-4" />
  },
  { 
    value: 'fully-autonomous', 
    label: 'Autónomo', 
    description: 'Control total con supervisión',
    icon: <Bot className="h-4 w-4" />
  },
];

export function HRAutonomousCopilotPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMonitoring, setIsMonitoring] = useState(false);

  const {
    isLoading,
    autonomyLevel,
    alerts,
    predictions,
    optimizations,
    setAutonomyLevel,
    fetchProactiveAlerts,
    getPredictions,
    getOptimizations,
    startAlertMonitoring,
    stopAlertMonitoring,
  } = useHRAutonomousCopilot();

  // Toggle monitoring
  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopAlertMonitoring();
      setIsMonitoring(false);
    } else {
      startAlertMonitoring();
      setIsMonitoring(true);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchProactiveAlerts();
    getPredictions({ employees: 50, departments: 5 });
    getOptimizations({ currentProcesses: true });
  }, []);

  const getAlertIcon = (type: ProactiveAlert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <Bell className="h-4 w-4 text-amber-600" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
  };

  const getAlertBadge = (type: ProactiveAlert['type']) => {
    switch (type) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Crítico</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Advertencia</Badge>;
      case 'opportunity':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Oportunidad</Badge>;
    }
  };

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const opportunityCount = alerts.filter(a => a.type === 'opportunity').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Copiloto IA Autónomo</h2>
            <p className="text-sm text-muted-foreground">
              Gestión proactiva e inteligente de RRHH
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            className="gap-2"
            onClick={toggleMonitoring}
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isMonitoring ? 'Detener' : 'Iniciar'} Monitoreo
          </Button>
          {isMonitoring && (
            <Badge variant="outline" className="gap-1 animate-pulse">
              <Activity className="h-3 w-3" />
              Activo
            </Badge>
          )}
        </div>
      </div>

      {/* Autonomy Level Selector */}
      <Card className="border-2 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Nivel de Autonomía:</span>
            </div>
            <div className="flex gap-2">
              {AUTONOMY_LEVELS.map((level) => (
                <Button
                  key={level.value}
                  variant={autonomyLevel === level.value ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setAutonomyLevel(level.value)}
                >
                  {level.icon}
                  {level.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-right">
            {AUTONOMY_LEVELS.find(l => l.value === autonomyLevel)?.description}
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={cn(criticalCount > 0 && "border-red-500/50 bg-red-500/5")}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Críticas</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Advertencias</p>
                <p className="text-3xl font-bold text-amber-600">{warningCount}</p>
              </div>
              <Bell className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Oportunidades</p>
                <p className="text-3xl font-bold text-green-600">{opportunityCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Predicciones</p>
                <p className="text-3xl font-bold">{predictions.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-1">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1">
            <Bell className="h-4 w-4" />
            Alertas
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-1">
            <Target className="h-4 w-4" />
            Predicciones
          </TabsTrigger>
          <TabsTrigger value="optimizations" className="gap-1">
            <Sparkles className="h-4 w-4" />
            Optimizaciones
          </TabsTrigger>
        </TabsList>

        {/* === DASHBOARD === */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Recent Alerts */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Alertas Recientes</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => fetchProactiveAlerts()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mb-2 opacity-50" />
                      <p>Sin alertas activas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.slice(0, 5).map((alert) => (
                        <div 
                          key={alert.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        >
                          {getAlertIcon(alert.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{alert.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {alert.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Top Predictions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Predicciones Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {predictions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Target className="h-10 w-10 mb-2 opacity-50" />
                      <p>Cargando predicciones...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {predictions.slice(0, 4).map((pred, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{pred.type}</span>
                            <Badge variant="outline">
                              {pred.probability}% prob.
                            </Badge>
                          </div>
                          <Progress value={pred.confidence} className="h-1.5 mb-2" />
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {pred.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Acciones Rápidas del Copiloto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Programar Automático</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Delegación Inteligente</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xs">Análisis Predictivo</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-xs">Optimizar Procesos</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ALERTS === */}
        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Alertas Proactivas</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fetchProactiveAlerts()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">Todo en orden</p>
                    <p className="text-sm">No hay alertas que requieran atención</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <Card key={alert.id} className={cn(
                        "transition-all hover:shadow-md",
                        alert.type === 'critical' && "border-red-500/50",
                        alert.type === 'warning' && "border-amber-500/50",
                        alert.type === 'opportunity' && "border-green-500/50"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium">{alert.title}</h4>
                                {getAlertBadge(alert.type)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {alert.description}
                              </p>
                              
                              {alert.suggestedActions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Acciones sugeridas:
                                  </p>
                                  {alert.suggestedActions.map((action, idx) => (
                                    <div 
                                      key={idx}
                                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                                    >
                                      <span className="text-sm">{action.action}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {action.priority}
                                        </Badge>
                                        {action.canAutoExecute && (
                                          <Button size="sm" variant="ghost" className="h-7 gap-1">
                                            <Zap className="h-3 w-3" />
                                            Auto
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PREDICTIONS === */}
        <TabsContent value="predictions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Predicciones Avanzadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {predictions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mb-4 opacity-50" />
                    <p>Cargando predicciones...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {predictions.map((pred, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{pred.type}</h4>
                              <p className="text-sm text-muted-foreground">
                                Horizonte: {pred.timeframe}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                {pred.probability}%
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Probabilidad
                              </p>
                            </div>
                          </div>

                          <Progress value={pred.confidence} className="h-2 mb-3" />
                          
                          <p className="text-sm mb-3">{pred.description}</p>

                          {pred.recommendedActions.length > 0 && (
                            <>
                              <Separator className="my-3" />
                              <div className="space-y-2">
                                <p className="text-xs font-medium">Acciones preventivas:</p>
                                {pred.recommendedActions.slice(0, 2).map((action, aIdx) => (
                                  <div 
                                    key={aIdx}
                                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                                  >
                                    <div>
                                      <p className="text-sm">{action.action}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {action.timing}
                                      </p>
                                    </div>
                                    {action.canAutoExecute && autonomyLevel !== 'advisory' && (
                                      <Button size="sm" className="gap-1">
                                        <Zap className="h-3 w-3" />
                                        Ejecutar
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {pred.costOfInaction && (
                            <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                              <p className="text-xs font-medium text-red-700 mb-1">
                                Coste de inacción:
                              </p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                {pred.costOfInaction.financial && (
                                  <span>💰 {pred.costOfInaction.financial}</span>
                                )}
                                {pred.costOfInaction.risk && (
                                  <span>⚠️ Riesgo: {pred.costOfInaction.risk}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === OPTIMIZATIONS === */}
        <TabsContent value="optimizations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Optimizaciones Continuas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {optimizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Settings className="h-12 w-12 mb-4 opacity-50" />
                    <p>Analizando procesos...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {optimizations.map((opt, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{opt.area}</h4>
                            <Badge className="bg-green-500/20 text-green-700">
                              +{opt.projectedImprovement} mejora
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-muted/50">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Actual</p>
                              <p className="text-lg font-bold">{opt.currentState.value}</p>
                            </div>
                            <div className="text-center flex items-center justify-center">
                              <ArrowRight className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Benchmark</p>
                              <p className="text-lg font-bold text-primary">
                                {opt.currentState.benchmark}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {opt.proposedChanges.slice(0, 3).map((change, cIdx) => (
                              <div 
                                key={cIdx}
                                className="flex items-center justify-between p-2 rounded border"
                              >
                                <div className="flex-1">
                                  <p className="text-sm">{change.change}</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      Impacto: {change.impact}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      Esfuerzo: {change.effort}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs text-green-600">
                                      ROI: {change.roi}
                                    </Badge>
                                  </div>
                                </div>
                                {change.autoImplementable && autonomyLevel === 'fully-autonomous' && (
                                  <Button size="sm" variant="ghost" className="gap-1">
                                    <Zap className="h-3 w-3" />
                                    Auto
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRAutonomousCopilotPanel;
