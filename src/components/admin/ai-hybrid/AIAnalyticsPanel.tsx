/**
 * AIAnalyticsPanel - Panel de Analytics para Sistema IA Híbrida
 * Visualiza: uso temporal, distribución proveedores, top modelos, ahorro, privacidad
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Shield,
  DollarSign,
  Activity,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Server,
  Cloud,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAIAnalytics, AnalyticsPeriod } from '@/hooks/admin/ai-hybrid/useAIAnalytics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AIAnalyticsPanelProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const CLASSIFICATION_COLORS: Record<string, string> = {
  public: '#10b981',
  internal: '#06b6d4',
  confidential: '#f59e0b',
  restricted: '#ef4444',
};

export function AIAnalyticsPanel({
  className,
  autoRefresh = true,
  refreshInterval = 60000,
}: AIAnalyticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');

  const {
    isLoading,
    dashboard,
    providerStats,
    modelStats,
    privacySummary,
    error,
    lastRefresh,
    fetchAllData,
    startAutoRefresh,
    stopAutoRefresh,
  } = useAIAnalytics();

  // Initial load and auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh(period, refreshInterval);
    } else {
      fetchAllData(period);
    }
    return () => stopAutoRefresh();
  }, [period, autoRefresh, refreshInterval]);

  const handleRefresh = useCallback(() => {
    fetchAllData(period);
  }, [fetchAllData, period]);

  const handlePeriodChange = useCallback((newPeriod: string) => {
    setPeriod(newPeriod as AnalyticsPeriod);
  }, []);

  // Calculate key metrics
  const totalRequests = dashboard?.provider_distribution?.reduce((sum, p) => sum + p.requests, 0) || 0;
  const localPercentage = dashboard?.privacy_stats?.local_usage_rate || 0;
  const externalPercentage = 100 - localPercentage;
  const totalSavings = dashboard?.savings_estimate?.estimated_savings_usd || 0;
  const totalCost = dashboard?.savings_estimate?.external_cost_usd || 0;

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                AI Analytics
                <Badge variant="outline" className="text-xs">
                  {period === 'hour' ? '1h' : period === 'day' ? '24h' : period === 'week' ? '7d' : '30d'}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">1 hora</SelectItem>
                <SelectItem value="day">24 horas</SelectItem>
                <SelectItem value="week">7 días</SelectItem>
                <SelectItem value="month">30 días</SelectItem>
              </SelectContent>
            </Select>
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
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        {error ? (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {error}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-3">
              <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
              <TabsTrigger value="usage" className="text-xs">Uso</TabsTrigger>
              <TabsTrigger value="providers" className="text-xs">Proveedores</TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs">Privacidad</TabsTrigger>
            </TabsList>

            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    icon={Activity}
                    label="Solicitudes"
                    value={totalRequests.toLocaleString()}
                    trend={null}
                    color="violet"
                  />
                  <MetricCard
                    icon={Clock}
                    label="Latencia Avg"
                    value={`${dashboard?.latency_trend?.[dashboard.latency_trend.length - 1]?.avg_latency_ms || 0}ms`}
                    trend={null}
                    color="cyan"
                  />
                  <MetricCard
                    icon={DollarSign}
                    label="Coste Total"
                    value={`$${totalCost.toFixed(4)}`}
                    trend={null}
                    color="amber"
                  />
                  <MetricCard
                    icon={Zap}
                    label="Ahorro Local"
                    value={`$${totalSavings.toFixed(4)}`}
                    trend={localPercentage}
                    color="emerald"
                  />
                </div>

                {/* Usage Over Time Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Uso Temporal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboard?.usage_over_time || []}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="requests"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.3}
                            name="Solicitudes"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Provider Distribution */}
                <div className="grid md:grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Local vs Externo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-sm">Local (Ollama)</span>
                          </div>
                          <span className="font-medium">{localPercentage}%</span>
                        </div>
                        <Progress value={localPercentage} className="h-2" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-violet-500" />
                            <span className="text-sm">Externo (Cloud)</span>
                          </div>
                          <span className="font-medium">{externalPercentage}%</span>
                        </div>
                        <Progress value={externalPercentage} className="h-2 [&>div]:bg-violet-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Top Modelos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(dashboard?.model_ranking || []).slice(0, 5).map((model, i) => (
                          <div key={model.model} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs w-5 h-5 p-0 justify-center">
                                {i + 1}
                              </Badge>
                              <span className="text-xs truncate max-w-32">{model.model}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {model.requests} req
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Usage Tab */}
              <TabsContent value="usage" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tokens Consumidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard?.usage_over_time || []}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="tokens" fill="#06b6d4" name="Tokens" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Latencia Promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboard?.latency_trend || []}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} unit="ms" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avg_latency_ms"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            name="Latencia (ms)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Costes Acumulados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboard?.usage_over_time || []}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Coste']}
                          />
                          <Area
                            type="monotone"
                            dataKey="cost_usd"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.3}
                            name="Coste USD"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Providers Tab */}
              <TabsContent value="providers" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Distribución por Proveedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={dashboard?.provider_distribution || []}
                            dataKey="requests"
                            nameKey="provider"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            label={({ provider, percentage }) => `${provider}: ${percentage}%`}
                            labelLine={false}
                          >
                            {(dashboard?.provider_distribution || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Estadísticas por Proveedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {providerStats.map((provider, i) => (
                        <div
                          key={provider.provider}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              />
                              <span className="font-medium text-sm">{provider.provider}</span>
                            </div>
                            <Badge
                              variant={provider.success_rate >= 95 ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {provider.success_rate}% éxito
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="block font-medium text-foreground">
                                {provider.total_requests}
                              </span>
                              <span>Solicitudes</span>
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">
                                {(provider.total_tokens / 1000).toFixed(1)}k
                              </span>
                              <span>Tokens</span>
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">
                                {provider.avg_latency_ms}ms
                              </span>
                              <span>Latencia</span>
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">
                                ${provider.total_cost_usd.toFixed(4)}
                              </span>
                              <span>Coste</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ranking de Modelos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {modelStats.slice(0, 10).map((model, i) => (
                        <div
                          key={model.model}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-6 h-6 p-0 justify-center text-xs">
                              {i + 1}
                            </Badge>
                            <span className="text-sm">{model.model}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{model.total_requests} req</span>
                            <span>{(model.total_tokens / 1000).toFixed(1)}k tok</span>
                            <span>{model.avg_latency_ms}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Privacy Tab */}
              <TabsContent value="privacy" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    icon={Shield}
                    label="Datos Bloqueados"
                    value={privacySummary?.total_blocked?.toString() || '0'}
                    trend={null}
                    color="red"
                  />
                  <MetricCard
                    icon={EyeOff}
                    label="Anonimizados"
                    value={privacySummary?.total_anonymized?.toString() || '0'}
                    trend={null}
                    color="amber"
                  />
                  <MetricCard
                    icon={Server}
                    label="Uso Local"
                    value={`${dashboard?.privacy_stats?.local_usage_rate || 0}%`}
                    trend={null}
                    color="emerald"
                  />
                  <MetricCard
                    icon={Eye}
                    label="Tasa Anonimización"
                    value={`${dashboard?.privacy_stats?.anonymization_rate || 0}%`}
                    trend={null}
                    color="cyan"
                  />
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Clasificación de Datos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(dashboard?.privacy_stats?.by_classification || []).map((item) => (
                        <div key={item.classification}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    CLASSIFICATION_COLORS[item.classification] || '#64748b',
                                }}
                              />
                              <span className="text-sm capitalize">{item.classification}</span>
                            </div>
                            <span className="text-sm font-medium">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <Progress
                            value={item.percentage}
                            className="h-2"
                            style={
                              {
                                '--progress-color':
                                  CLASSIFICATION_COLORS[item.classification] || '#64748b',
                              } as React.CSSProperties
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Incidentes de Privacidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(privacySummary?.total_incidents || 0) === 0 ? (
                      <div className="flex items-center gap-2 p-4 bg-emerald-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        <span className="text-sm">No hay incidentes de privacidad en este período</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(privacySummary?.by_classification || {}).map(
                          ([classification, count]) => (
                            <div
                              key={classification}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    classification === 'restricted' ? 'destructive' : 'secondary'
                                  }
                                  className="text-xs capitalize"
                                >
                                  {classification}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium">{count} solicitudes</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      Ahorro por IA Local
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
                        <div className="text-2xl font-bold text-emerald-500">
                          ${totalSavings.toFixed(4)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ahorro estimado por uso de modelos locales
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg border">
                          <div className="font-medium">
                            {dashboard?.savings_estimate?.local_requests || 0}
                          </div>
                          <div className="text-muted-foreground">Solicitudes locales</div>
                        </div>
                        <div className="p-3 rounded-lg border">
                          <div className="font-medium">
                            {((dashboard?.savings_estimate?.local_tokens || 0) / 1000).toFixed(1)}k
                          </div>
                          <div className="text-muted-foreground">Tokens procesados</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// === METRIC CARD COMPONENT ===
interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: number | null;
  color: 'violet' | 'cyan' | 'emerald' | 'amber' | 'red';
}

function MetricCard({ icon: Icon, label, value, trend, color }: MetricCardProps) {
  const colorClasses = {
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
  };

  const iconColorClasses = {
    violet: 'text-violet-500',
    cyan: 'text-cyan-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-gradient-to-br',
        colorClasses[color]
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', iconColorClasses[color])} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{value}</span>
        {trend !== null && (
          <Badge variant="outline" className="text-xs">
            {trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trend}%
          </Badge>
        )}
      </div>
    </div>
  );
}

export default AIAnalyticsPanel;
