/**
 * CRMRealTimeMetrics - Métricas en tiempo real para agentes CRM
 * Incluye gráficos de rendimiento, tasas de éxito y alertas automáticas
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subHours, subMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// === TIPOS ===
interface AgentMetricPoint {
  timestamp: string;
  time: string;
  successRate: number;
  responseTime: number;
  tasksCompleted: number;
  errors: number;
  confidence: number;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  successRate: number;
  successRateTrend: 'up' | 'down' | 'stable';
  avgResponseTime: number;
  responseTimeTrend: 'up' | 'down' | 'stable';
  tasksCompleted: number;
  tasksInQueue: number;
  errorRate: number;
  lastActivity: Date;
  healthScore: number;
}

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  agentId?: string;
  agentName?: string;
  timestamp: Date;
  acknowledged: boolean;
  value?: number;
  threshold?: number;
}

interface CRMRealTimeMetricsProps {
  agentPerformances: AgentPerformance[];
  onAlertAction?: (alertId: string, action: 'acknowledge' | 'dismiss' | 'investigate') => void;
  refreshInterval?: number;
  className?: string;
}

// === COLORES ===
const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6'
};

const PIE_COLORS = [CHART_COLORS.success, CHART_COLORS.info, CHART_COLORS.warning, CHART_COLORS.purple];

// === GENERADORES DE DATOS MOCK ===
function generateTimeSeriesData(points: number = 24): AgentMetricPoint[] {
  const now = new Date();
  return Array.from({ length: points }, (_, i) => {
    const timestamp = subHours(now, points - 1 - i);
    const baseSuccess = 85 + Math.random() * 10;
    const variation = Math.sin(i * 0.5) * 5;
    
    return {
      timestamp: timestamp.toISOString(),
      time: format(timestamp, 'HH:mm'),
      successRate: Math.min(100, Math.max(70, baseSuccess + variation)),
      responseTime: 150 + Math.random() * 200 + Math.sin(i * 0.3) * 50,
      tasksCompleted: Math.floor(10 + Math.random() * 30),
      errors: Math.floor(Math.random() * 3),
      confidence: 75 + Math.random() * 20
    };
  });
}

function generateRealtimePoint(): AgentMetricPoint {
  const now = new Date();
  return {
    timestamp: now.toISOString(),
    time: format(now, 'HH:mm:ss'),
    successRate: 85 + Math.random() * 12,
    responseTime: 150 + Math.random() * 200,
    tasksCompleted: Math.floor(5 + Math.random() * 15),
    errors: Math.floor(Math.random() * 2),
    confidence: 80 + Math.random() * 15
  };
}

// === COMPONENTE PRINCIPAL ===
export function CRMRealTimeMetrics({
  agentPerformances,
  onAlertAction,
  refreshInterval = 5000,
  className
}: CRMRealTimeMetricsProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<AgentMetricPoint[]>(() => generateTimeSeriesData(24));
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeChart, setActiveChart] = useState<'line' | 'area' | 'bar'>('area');
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Actualización en tiempo real
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newPoint = generateRealtimePoint();
      
      setTimeSeriesData(prev => {
        const updated = [...prev.slice(1), newPoint];
        
        // Detectar alertas automáticas
        if (alertsEnabled) {
          // Alert: Success rate bajo
          if (newPoint.successRate < 80) {
            const alert: SystemAlert = {
              id: `alert-${Date.now()}-success`,
              type: newPoint.successRate < 70 ? 'critical' : 'warning',
              title: 'Tasa de éxito baja',
              message: `La tasa de éxito ha caído a ${newPoint.successRate.toFixed(1)}%`,
              timestamp: new Date(),
              acknowledged: false,
              value: newPoint.successRate,
              threshold: 80
            };
            setAlerts(prev => [alert, ...prev.slice(0, 19)]);
            
            if (soundEnabled) {
              toast.warning(alert.title, { description: alert.message });
            }
          }

          // Alert: Response time alto
          if (newPoint.responseTime > 350) {
            const alert: SystemAlert = {
              id: `alert-${Date.now()}-response`,
              type: 'warning',
              title: 'Tiempo de respuesta elevado',
              message: `Respuesta promedio: ${newPoint.responseTime.toFixed(0)}ms`,
              timestamp: new Date(),
              acknowledged: false,
              value: newPoint.responseTime,
              threshold: 350
            };
            setAlerts(prev => [alert, ...prev.slice(0, 19)]);
          }

          // Alert: Errores
          if (newPoint.errors >= 2) {
            const alert: SystemAlert = {
              id: `alert-${Date.now()}-errors`,
              type: 'critical',
              title: 'Múltiples errores detectados',
              message: `${newPoint.errors} errores en el último intervalo`,
              timestamp: new Date(),
              acknowledged: false,
              value: newPoint.errors,
              threshold: 2
            };
            setAlerts(prev => [alert, ...prev.slice(0, 19)]);
          }
        }
        
        return updated;
      });
      
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLive, alertsEnabled, soundEnabled, refreshInterval]);

  // Generar alertas basadas en performance de agentes
  useEffect(() => {
    if (!alertsEnabled || !agentPerformances.length) return;

    agentPerformances.forEach(agent => {
      if (agent.errorRate > 5) {
        const existingAlert = alerts.find(a => 
          a.agentId === agent.agentId && 
          a.type === 'warning' && 
          !a.acknowledged &&
          Date.now() - a.timestamp.getTime() < 60000
        );
        
        if (!existingAlert) {
          const alert: SystemAlert = {
            id: `alert-${Date.now()}-${agent.agentId}`,
            type: agent.errorRate > 10 ? 'critical' : 'warning',
            title: `${agent.agentName}: Error rate elevado`,
            message: `Tasa de error: ${agent.errorRate.toFixed(1)}%`,
            agentId: agent.agentId,
            agentName: agent.agentName,
            timestamp: new Date(),
            acknowledged: false,
            value: agent.errorRate,
            threshold: 5
          };
          setAlerts(prev => [alert, ...prev.slice(0, 19)]);
        }
      }

      if (agent.healthScore < 70) {
        const existingAlert = alerts.find(a => 
          a.agentId === agent.agentId && 
          a.title.includes('Health score') && 
          !a.acknowledged
        );
        
        if (!existingAlert) {
          const alert: SystemAlert = {
            id: `alert-${Date.now()}-health-${agent.agentId}`,
            type: agent.healthScore < 50 ? 'critical' : 'warning',
            title: `${agent.agentName}: Health score bajo`,
            message: `Score actual: ${agent.healthScore}%`,
            agentId: agent.agentId,
            agentName: agent.agentName,
            timestamp: new Date(),
            acknowledged: false,
            value: agent.healthScore,
            threshold: 70
          };
          setAlerts(prev => [alert, ...prev.slice(0, 19)]);
        }
      }
    });
  }, [agentPerformances, alertsEnabled, alerts]);

  // Métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!timeSeriesData.length) return null;
    
    const latest = timeSeriesData[timeSeriesData.length - 1];
    const previous = timeSeriesData[timeSeriesData.length - 2];
    
    const avgSuccessRate = timeSeriesData.reduce((sum, p) => sum + p.successRate, 0) / timeSeriesData.length;
    const avgResponseTime = timeSeriesData.reduce((sum, p) => sum + p.responseTime, 0) / timeSeriesData.length;
    const totalTasks = timeSeriesData.reduce((sum, p) => sum + p.tasksCompleted, 0);
    const totalErrors = timeSeriesData.reduce((sum, p) => sum + p.errors, 0);
    
    return {
      currentSuccessRate: latest.successRate,
      successRateTrend: (latest.successRate > (previous?.successRate || 0) ? 'up' : 
                        latest.successRate < (previous?.successRate || 0) ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      avgSuccessRate,
      currentResponseTime: latest.responseTime,
      responseTimeTrend: (latest.responseTime < (previous?.responseTime || 0) ? 'up' : 
                         latest.responseTime > (previous?.responseTime || 0) ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      avgResponseTime,
      totalTasks,
      totalErrors,
      errorRate: totalErrors / totalTasks * 100 || 0,
      avgConfidence: latest.confidence,
      unacknowledgedAlerts: alerts.filter(a => !a.acknowledged).length
    };
  }, [timeSeriesData, alerts]);

  // Handlers
  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
    onAlertAction?.(alertId, 'acknowledge');
  }, [onAlertAction]);

  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    onAlertAction?.(alertId, 'dismiss');
  }, [onAlertAction]);

  const handleClearAllAlerts = useCallback(() => {
    setAlerts([]);
    toast.success('Todas las alertas han sido limpiadas');
  }, []);

  // Datos para gráfico de distribución por agente
  const agentDistributionData = useMemo(() => {
    return agentPerformances.slice(0, 6).map(agent => ({
      name: agent.agentName.replace('Agente ', '').substring(0, 12),
      tasks: agent.tasksCompleted,
      success: agent.successRate
    }));
  }, [agentPerformances]);

  // Datos para gráfico radial
  const radialData = useMemo(() => {
    if (!aggregatedMetrics) return [];
    return [
      { name: 'Éxito', value: aggregatedMetrics.avgSuccessRate, fill: CHART_COLORS.success },
      { name: 'Confianza', value: aggregatedMetrics.avgConfidence, fill: CHART_COLORS.info },
      { name: 'Salud', value: 100 - aggregatedMetrics.errorRate, fill: CHART_COLORS.purple }
    ];
  }, [aggregatedMetrics]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <ArrowUpRight className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <ArrowDownRight className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const AlertIcon = ({ type }: { type: SystemAlert['type'] }) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Métricas en Tiempo Real</h3>
            <p className="text-xs text-muted-foreground">
              Última actualización: {format(lastUpdate, 'HH:mm:ss', { locale: es })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch 
              checked={isLive} 
              onCheckedChange={setIsLive}
              className="data-[state=checked]:bg-green-500"
            />
            <span className="text-xs">
              {isLive ? (
                <span className="flex items-center gap-1 text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              ) : 'Pausado'}
            </span>
          </div>
          
          <div className="flex items-center gap-1 border-l pl-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setAlertsEnabled(!alertsEnabled)}
            >
              {alertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-green-600">
                  {aggregatedMetrics?.currentSuccessRate.toFixed(1)}%
                </p>
              </div>
              <div className="flex flex-col items-end">
                <TrendIcon trend={aggregatedMetrics?.successRateTrend || 'stable'} />
                <Target className="h-8 w-8 text-green-500/30 mt-1" />
              </div>
            </div>
            <Progress 
              value={aggregatedMetrics?.currentSuccessRate || 0} 
              className="h-1 mt-2 bg-green-200/30" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tiempo Respuesta</p>
                <p className="text-2xl font-bold text-blue-600">
                  {aggregatedMetrics?.currentResponseTime.toFixed(0)}ms
                </p>
              </div>
              <div className="flex flex-col items-end">
                <TrendIcon trend={aggregatedMetrics?.responseTimeTrend || 'stable'} />
                <Clock className="h-8 w-8 text-blue-500/30 mt-1" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Promedio: {aggregatedMetrics?.avgResponseTime.toFixed(0)}ms
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tareas Completadas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {aggregatedMetrics?.totalTasks || 0}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500/30" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              En las últimas 24h
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br border",
          (aggregatedMetrics?.unacknowledgedAlerts || 0) > 0 
            ? "from-red-500/10 to-orange-500/5 border-red-500/20" 
            : "from-amber-500/10 to-yellow-500/5 border-amber-500/20"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alertas Activas</p>
                <p className={cn(
                  "text-2xl font-bold",
                  (aggregatedMetrics?.unacknowledgedAlerts || 0) > 0 ? "text-red-600" : "text-amber-600"
                )}>
                  {aggregatedMetrics?.unacknowledgedAlerts || 0}
                </p>
              </div>
              <AlertTriangle className={cn(
                "h-8 w-8",
                (aggregatedMetrics?.unacknowledgedAlerts || 0) > 0 
                  ? "text-red-500/50 animate-pulse" 
                  : "text-amber-500/30"
              )} />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {alerts.length} total registradas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de serie temporal */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Rendimiento en Tiempo Real</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={activeChart === 'area' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setActiveChart('area')}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={activeChart === 'line' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setActiveChart('line')}
                >
                  <LineChartIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={activeChart === 'bar' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setActiveChart('bar')}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'area' ? (
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis yAxisId="left" domain={[60, 100]} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 500]} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="successRate" 
                      name="Éxito (%)"
                      stroke={CHART_COLORS.success} 
                      fill="url(#successGradient)"
                      strokeWidth={2}
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="responseTime" 
                      name="Respuesta (ms)"
                      stroke={CHART_COLORS.info} 
                      fill="url(#responseGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : activeChart === 'line' ? (
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" domain={[60, 100]} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 500]} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="successRate" 
                      name="Éxito (%)"
                      stroke={CHART_COLORS.success} 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="responseTime" 
                      name="Respuesta (ms)"
                      stroke={CHART_COLORS.info} 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={timeSeriesData.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="tasksCompleted" name="Tareas" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="errors" name="Errores" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Panel de alertas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas
                {(aggregatedMetrics?.unacknowledgedAlerts || 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5">
                    {aggregatedMetrics?.unacknowledgedAlerts}
                  </Badge>
                )}
              </CardTitle>
              {alerts.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClearAllAlerts}>
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <AnimatePresence mode="popLayout">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <CheckCircle className="h-10 w-10 text-green-500/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Sin alertas activas</p>
                    <p className="text-xs text-muted-foreground">El sistema funciona correctamente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={cn(
                          "p-2 rounded-lg border text-xs",
                          alert.acknowledged ? "opacity-50" : "",
                          alert.type === 'critical' ? "bg-red-500/5 border-red-500/20" :
                          alert.type === 'warning' ? "bg-amber-500/5 border-amber-500/20" :
                          alert.type === 'success' ? "bg-green-500/5 border-green-500/20" :
                          "bg-blue-500/5 border-blue-500/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <AlertIcon type={alert.type} />
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-muted-foreground">{alert.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(alert.timestamp, 'HH:mm:ss', { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!alert.acknowledged && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleDismissAlert(alert.id)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribución por agente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tareas por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentDistributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="tasks" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores radiales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Indicadores de Salud</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="30%" 
                  outerRadius="100%" 
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Legend 
                    iconSize={8} 
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CRMRealTimeMetrics;
