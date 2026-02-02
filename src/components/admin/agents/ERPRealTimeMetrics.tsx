/**
 * ERPRealTimeMetrics - Métricas en tiempo real para agentes ERP
 * Incluye gráficos de rendimiento, tasas de éxito y alertas automáticas
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Brain,
  Bell,
  BellOff,
  RefreshCw,
  AlertCircle,
  Target,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DomainAgent, AgentDomain, SupervisorInsight } from '@/hooks/admin/agents/erpAgentTypes';
import { DOMAIN_CONFIG } from '@/hooks/admin/agents/useERPModuleAgents';

// Tipos
interface MetricDataPoint {
  timestamp: string;
  time: string;
  value: number;
  domain?: AgentDomain;
}

interface DomainMetrics {
  domain: AgentDomain;
  name: string;
  successRate: number;
  avgResponseTime: number;
  totalActions: number;
  activeAgents: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface ERPAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'opportunity' | 'risk' | 'anomaly' | 'performance' | 'compliance';
  title: string;
  message: string;
  domain: AgentDomain;
  agentId?: string;
  timestamp: string;
  acknowledged: boolean;
  value?: number;
  threshold?: number;
}

interface ERPRealTimeMetricsProps {
  domainAgents?: DomainAgent[];
  insights?: SupervisorInsight[];
  onAlertClick?: (alert: ERPAlert) => void;
  refreshInterval?: number;
}

// Colores para dominios
const DOMAIN_COLORS: Record<AgentDomain, string> = {
  financial: '#10b981',
  crm_cs: '#3b82f6',
  compliance: '#8b5cf6',
  operations: '#f59e0b',
  hr: '#ec4899',
  analytics: '#06b6d4',
  legal: '#6366f1'
};

// Generador de datos mock realistas
const generateMockMetrics = (): MetricDataPoint[] => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    return {
      timestamp: time.toISOString(),
      time: `${time.getHours().toString().padStart(2, '0')}:00`,
      value: Math.floor(70 + Math.random() * 25 + Math.sin(i / 3) * 10)
    };
  });
};

const generateDomainPerformance = (): MetricDataPoint[] => {
  const now = new Date();
  const domains: AgentDomain[] = ['financial', 'crm_cs', 'compliance', 'operations', 'hr', 'analytics', 'legal'];
  
  return Array.from({ length: 12 }, (_, i) => {
    const time = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
    const baseValues: Record<AgentDomain, number> = {
      financial: 92,
      crm_cs: 88,
      compliance: 95,
      operations: 85,
      hr: 90,
      analytics: 87,
      legal: 94
    };
    
    return domains.map(domain => ({
      timestamp: time.toISOString(),
      time: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`,
      value: Math.floor(baseValues[domain] + (Math.random() - 0.5) * 10),
      domain
    }));
  }).flat();
};

const generateMockAlerts = (): ERPAlert[] => [
  {
    id: 'alert_1',
    type: 'critical',
    category: 'opportunity',
    title: 'Oportunidad de Venta Alta',
    message: 'Cliente ABC Corp muestra señales de compra inmediata. Pipeline valorado en €125,000',
    domain: 'crm_cs',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    acknowledged: false,
    value: 125000
  },
  {
    id: 'alert_2',
    type: 'warning',
    category: 'risk',
    title: 'Riesgo de Churn Detectado',
    message: 'Cliente XYZ Solutions no ha interactuado en 45 días. Probabilidad de churn: 78%',
    domain: 'crm_cs',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    acknowledged: false,
    value: 78,
    threshold: 70
  },
  {
    id: 'alert_3',
    type: 'warning',
    category: 'anomaly',
    title: 'Anomalía en Transacciones',
    message: 'Detectado patrón inusual en transacciones del módulo contable. Requiere revisión.',
    domain: 'financial',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    acknowledged: true
  },
  {
    id: 'alert_4',
    type: 'critical',
    category: 'compliance',
    title: 'Incumplimiento GDPR Potencial',
    message: 'Datos de cliente sin consentimiento explícito detectados. Acción inmediata requerida.',
    domain: 'compliance',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    acknowledged: false
  },
  {
    id: 'alert_5',
    type: 'info',
    category: 'performance',
    title: 'Optimización de Inventario',
    message: 'Agente detecta posibilidad de reducir costes de almacenamiento en 15%',
    domain: 'operations',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    acknowledged: true,
    value: 15
  }
];

export function ERPRealTimeMetrics({
  domainAgents = [],
  insights = [],
  onAlertClick,
  refreshInterval = 30000
}: ERPRealTimeMetricsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'alerts'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estado de métricas
  const [performanceData, setPerformanceData] = useState<MetricDataPoint[]>([]);
  const [domainPerformance, setDomainPerformance] = useState<MetricDataPoint[]>([]);
  const [alerts, setAlerts] = useState<ERPAlert[]>([]);

  // Generar métricas de dominio desde domainAgents o mock
  const domainMetrics = useMemo((): DomainMetrics[] => {
    if (domainAgents.length > 0) {
      return domainAgents.map(d => ({
        domain: d.domain,
        name: d.name,
        successRate: d.metrics.successRate || Math.floor(85 + Math.random() * 12),
        avgResponseTime: d.metrics.avgResponseTime || Math.floor(150 + Math.random() * 200),
        totalActions: d.metrics.totalActions || Math.floor(Math.random() * 500),
        activeAgents: d.moduleAgents.filter(a => a.status === 'active' || a.status === 'analyzing').length,
        trend: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
        trendValue: Math.floor(Math.random() * 15)
      }));
    }
    
    // Mock data si no hay domainAgents
    return Object.entries(DOMAIN_CONFIG).map(([key, config]) => ({
      domain: key as AgentDomain,
      name: config.name,
      successRate: Math.floor(85 + Math.random() * 12),
      avgResponseTime: Math.floor(150 + Math.random() * 200),
      totalActions: Math.floor(Math.random() * 500),
      activeAgents: Math.floor(2 + Math.random() * 4),
      trend: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      trendValue: Math.floor(Math.random() * 15)
    }));
  }, [domainAgents]);

  // Inicialización y actualización
  useEffect(() => {
    setPerformanceData(generateMockMetrics());
    setDomainPerformance(generateDomainPerformance());
    setAlerts(generateMockAlerts());
    
    const interval = setInterval(() => {
      setPerformanceData(generateMockMetrics());
      setDomainPerformance(generateDomainPerformance());
      setLastUpdate(new Date());
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPerformanceData(generateMockMetrics());
    setDomainPerformance(generateDomainPerformance());
    setLastUpdate(new Date());
    await new Promise(r => setTimeout(r, 500));
    setIsRefreshing(false);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  }, []);

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.type === 'critical' && !a.acknowledged).length;

  // Datos para gráfico de distribución
  const distributionData = domainMetrics.map(d => ({
    name: d.name,
    value: d.totalActions,
    color: DOMAIN_COLORS[d.domain]
  }));

  // KPIs globales
  const globalSuccessRate = Math.round(domainMetrics.reduce((sum, d) => sum + d.successRate, 0) / domainMetrics.length);
  const totalActions = domainMetrics.reduce((sum, d) => sum + d.totalActions, 0);
  const avgResponseTime = Math.round(domainMetrics.reduce((sum, d) => sum + d.avgResponseTime, 0) / domainMetrics.length);
  const totalActiveAgents = domainMetrics.reduce((sum, d) => sum + d.activeAgents, 0);

  return (
    <div className="space-y-6">
      {/* Header con KPIs */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Métricas en Tiempo Real
          </h3>
          <p className="text-sm text-muted-foreground">
            Actualizado {formatDistanceToNow(lastUpdate, { locale: es, addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bell className={cn("h-4 w-4", alertsEnabled ? "text-primary" : "text-muted-foreground")} />
            <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hora</SelectItem>
              <SelectItem value="6h">6 horas</SelectItem>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPIs Globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalSuccessRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de Éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Acciones Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgResponseTime}ms</p>
                <p className="text-xs text-muted-foreground">Tiempo Respuesta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(criticalCount > 0 && "border-destructive/50")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", criticalCount > 0 ? "bg-destructive/10" : "bg-muted")}>
                <AlertTriangle className={cn("h-5 w-5", criticalCount > 0 ? "text-destructive" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-2xl font-bold">{unacknowledgedCount}</p>
                <p className="text-xs text-muted-foreground">
                  Alertas Activas {criticalCount > 0 && <span className="text-destructive">({criticalCount} críticas)</span>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Rendimiento
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Por Dominio
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unacknowledgedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico de rendimiento temporal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tasa de Éxito Global</CardTitle>
                <CardDescription>Últimas 24 horas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[60, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="url(#successGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por dominio */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribución de Acciones</CardTitle>
                <CardDescription>Por dominio</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Métricas por dominio (barras) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tasa de Éxito por Dominio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={domainMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[70, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="successRate" radius={[4, 4, 0, 0]}>
                    {domainMetrics.map((entry, index) => (
                      <Cell key={index} fill={DOMAIN_COLORS[entry.domain]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Dominios */}
        <TabsContent value="domains" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domainMetrics.map((domain) => (
              <Card key={domain.domain} className="overflow-hidden">
                <CardHeader 
                  className="pb-2 text-white"
                  style={{ backgroundColor: DOMAIN_COLORS[domain.domain] }}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{domain.name}</CardTitle>
                    <Badge className="bg-white/20 text-white hover:bg-white/30">
                      {domain.activeAgents} activos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tasa de éxito</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{domain.successRate}%</span>
                      {domain.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {domain.trend === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  <Progress value={domain.successRate} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{domain.totalActions}</p>
                      <p className="text-xs text-muted-foreground">Acciones</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{domain.avgResponseTime}ms</p>
                      <p className="text-xs text-muted-foreground">Respuesta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Alertas */}
        <TabsContent value="alerts" className="space-y-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No hay alertas activas</p>
                </div>
              ) : (
                alerts
                  .sort((a, b) => {
                    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
                    const priority = { critical: 0, warning: 1, info: 2 };
                    return priority[a.type] - priority[b.type];
                  })
                  .map((alert) => (
                    <Card
                      key={alert.id}
                      className={cn(
                        "transition-all cursor-pointer hover:shadow-md",
                        alert.acknowledged && "opacity-60",
                        alert.type === 'critical' && !alert.acknowledged && "border-destructive/50 bg-destructive/5",
                        alert.type === 'warning' && !alert.acknowledged && "border-amber-500/50 bg-amber-500/5"
                      )}
                      onClick={() => {
                        if (!alert.acknowledged) acknowledgeAlert(alert.id);
                        onAlertClick?.(alert);
                      }}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            alert.type === 'critical' && "bg-destructive/10",
                            alert.type === 'warning' && "bg-amber-500/10",
                            alert.type === 'info' && "bg-blue-500/10"
                          )}>
                            {alert.type === 'critical' && <AlertCircle className="h-5 w-5 text-destructive" />}
                            {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                            {alert.type === 'info' && <Sparkles className="h-5 w-5 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: DOMAIN_COLORS[alert.domain], color: DOMAIN_COLORS[alert.domain] }}
                              >
                                {DOMAIN_CONFIG[alert.domain]?.name || alert.domain}
                              </Badge>
                              {alert.acknowledged && (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Revisada
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(alert.timestamp), { locale: es, addSuffix: true })}
                              </span>
                              {alert.value !== undefined && (
                                <Badge variant="secondary" className="text-xs">
                                  {alert.category === 'opportunity' && `€${alert.value.toLocaleString()}`}
                                  {alert.category === 'risk' && `${alert.value}% probabilidad`}
                                  {alert.category === 'performance' && `${alert.value}% mejora`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPRealTimeMetrics;
