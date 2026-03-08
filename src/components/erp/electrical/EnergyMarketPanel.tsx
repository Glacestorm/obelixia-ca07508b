/**
 * EnergyMarketPanel - Premium energy market visualization
 * 7 chart tabs + 8 KPIs + alerts + CSV export + prediction + period comparison
 * Reusable: <EnergyMarketPanel compact defaultType="gas" />
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, Activity, Loader2, BarChart3, Clock,
  Zap, Flame, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight,
  GitCompareArrows, Minus, Info, Download, Bell, BrainCircuit, Sparkles
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  ComposedChart, ReferenceLine
} from 'recharts';
import { useEnergyMarketPrices, MarketTimeRange, MarketEnergyType } from '@/hooks/erp/useEnergyMarketPrices';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EnergyMarketPanelProps {
  compact?: boolean;
  defaultType?: MarketEnergyType;
  defaultRange?: MarketTimeRange;
  className?: string;
}

export function EnergyMarketPanel({ compact = false, defaultType = 'electricity', defaultRange = '7d', className }: EnergyMarketPanelProps) {
  const {
    prices, loading, source, predictions, alerts, predictionLoading,
    fetchPrices, fetchPredictions, fetchAlerts,
    computeStats, getDailyAverages, getHeatmapData, getPriceColor, getPriceHex,
    getHourlyProfile, getWeeklyAverages, getMonthlyAverages, exportCSV,
  } = useEnergyMarketPrices();

  const [timeRange, setTimeRange] = useState<MarketTimeRange>(defaultRange);
  const [energyType, setEnergyType] = useState<MarketEnergyType>(defaultType);
  const [activeChart, setActiveChart] = useState('heatmap');
  const [compareEnabled, setCompareEnabled] = useState(false);

  const { prices: comparePrices, fetchPrices: fetchComparePrices, computeStats: computeCompareStats } = useEnergyMarketPrices();

  const getDateRange = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    switch (timeRange) {
      case 'today': return { start: today, end: today };
      case 'yesterday': return { start: yesterday, end: yesterday };
      case '7d': return { start: format(subDays(new Date(), 7), 'yyyy-MM-dd'), end: today };
      case '30d': return { start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: today };
      case 'month': return { start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: today };
      default: return { start: today, end: today };
    }
  }, [timeRange]);

  const getCompareRange = useCallback(() => {
    const { start, end } = getDateRange();
    const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) || 1;
    return {
      start: format(subDays(new Date(start), days), 'yyyy-MM-dd'),
      end: format(subDays(new Date(start), 1), 'yyyy-MM-dd'),
    };
  }, [getDateRange]);

  useEffect(() => {
    const { start, end } = getDateRange();
    fetchPrices(start, end, energyType);
    if (compareEnabled) {
      const cmp = getCompareRange();
      fetchComparePrices(cmp.start, cmp.end, energyType);
    }
  }, [timeRange, energyType, compareEnabled, getDateRange, getCompareRange, fetchPrices, fetchComparePrices]);

  const stats = computeStats(prices);
  const compareStatsData = compareEnabled ? computeCompareStats(comparePrices) : null;
  const dailyAvgs = getDailyAverages(prices);
  const heatmapData = getHeatmapData(prices);
  const hourlyProfile = getHourlyProfile(prices);
  const weeklyData = getWeeklyAverages(prices);
  const monthlyData = getMonthlyAverages(prices);

  const hourlyData = useMemo(() => {
    const targetDate = timeRange === 'yesterday'
      ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
    return prices
      .filter(p => p.price_date === targetDate)
      .map(p => ({ hour: `${p.hour}h`, precio: p.price_eur_mwh ?? 0, kwh: p.price_eur_kwh ?? 0 }));
  }, [prices, timeRange]);

  const compareHourlyData = useMemo(() => {
    if (!compareEnabled || comparePrices.length === 0) return [];
    const dates = [...new Set(comparePrices.map(p => p.price_date))].sort();
    const lastDate = dates[dates.length - 1];
    return comparePrices.filter(p => p.price_date === lastDate).map(p => ({
      hour: `${p.hour}h`, precio: p.price_eur_mwh ?? 0,
    }));
  }, [comparePrices, compareEnabled]);

  const uniqueDates = [...new Set(heatmapData.map(d => d.date))].sort();

  const priceDelta = useMemo(() => {
    if (!stats || !compareStatsData) return null;
    const diff = stats.avg - compareStatsData.avg;
    const pct = compareStatsData.avg > 0 ? Math.round((diff / compareStatsData.avg) * 100) : 0;
    return { diff: Math.round(diff * 100) / 100, pct, direction: diff > 0 ? 'up' : 'down' as const };
  }, [stats, compareStatsData]);

  const distribution = useMemo(() => {
    if (prices.length === 0) return [];
    const buckets = [
      { label: '0-30', min: 0, max: 30, count: 0, color: '#10b981' },
      { label: '30-60', min: 30, max: 60, count: 0, color: '#34d399' },
      { label: '60-100', min: 60, max: 100, count: 0, color: '#eab308' },
      { label: '100-150', min: 100, max: 150, count: 0, color: '#f97316' },
      { label: '150+', min: 150, max: 9999, count: 0, color: '#ef4444' },
    ];
    prices.forEach(p => {
      const v = p.price_eur_mwh ?? 0;
      const b = buckets.find(b => v >= b.min && v < b.max);
      if (b) b.count++;
    });
    const total = prices.length;
    return buckets.map(b => ({ ...b, pct: Math.round((b.count / total) * 1000) / 10 }));
  }, [prices]);

  // Prediction chart data
  const predictionChartData = useMemo(() => {
    if (predictions.length === 0) return [];
    return predictions.map(p => ({
      hour: `${p.hour}h`,
      prediccion: Math.round(p.predicted_price * 100) / 100,
      confianza: Math.round(p.confidence * 100),
    }));
  }, [predictions]);

  const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };
  const TrendIcon = stats?.trend === 'up' ? TrendingUp : stats?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats?.trend === 'up' ? 'text-red-500' : stats?.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground';

  return (
    <div className={cn("space-y-4", className)}>
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {energyType === 'electricity' ? <Zap className="h-5 w-5 text-amber-500" /> : <Flame className="h-5 w-5 text-blue-500" />}
          <h2 className="text-lg font-semibold">Mercado Energético</h2>
          <Badge variant={source === 'mock' ? 'outline' : 'default'} className="text-xs">
            {source === 'mock' ? 'Datos simulados' : source.toUpperCase()}
          </Badge>
          {stats && (
            <Badge variant="outline" className={cn("text-xs gap-1", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {stats.trendPct > 0 ? '+' : ''}{stats.trendPct}%
            </Badge>
          )}
          {priceDelta && (
            <Badge variant={priceDelta.direction === 'up' ? 'destructive' : 'default'} className="text-xs gap-1">
              {priceDelta.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {priceDelta.pct > 0 ? '+' : ''}{priceDelta.pct}% vs anterior
            </Badge>
          )}
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <Bell className="h-3 w-3" />{alerts.length} alertas
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={energyType} onValueChange={(v) => setEnergyType(v as MarketEnergyType)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="electricity">⚡ Electricidad</SelectItem>
              <SelectItem value="gas">🔥 Gas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as MarketTimeRange)}>
            <SelectTrigger className="w-[135px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="month">Mes actual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={compareEnabled ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1" onClick={() => setCompareEnabled(!compareEnabled)}>
            <GitCompareArrows className="h-3.5 w-3.5" />
            {compareEnabled ? 'Comparando' : 'Comparar'}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => exportCSV(prices)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Exportar CSV</TooltipContent>
            </UITooltip>
          </TooltipProvider>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchAlerts(energyType)}>
                  <Bell className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Verificar alertas</TooltipContent>
            </UITooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            const { start, end } = getDateRange();
            fetchPrices(start, end, energyType);
          }}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ===== KPI STRIP ===== */}
      {stats && (
        <div className={cn("grid gap-2", compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-8")}>
          {[
            { label: 'Media', value: `${stats.avg}`, unit: '€/MWh', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', compare: compareStatsData?.avg },
            { label: 'Mediana', value: `${stats.median}`, unit: '€/MWh', icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-500/10', compare: compareStatsData?.median },
            { label: 'Mínimo', value: `${stats.min}`, unit: '€/MWh', icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-500/10', compare: compareStatsData?.min },
            { label: 'Máximo', value: `${stats.max}`, unit: '€/MWh', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-500/10', compare: compareStatsData?.max },
            { label: 'P10', value: `${stats.p10}`, unit: '€/MWh', icon: ArrowDownRight, color: 'text-teal-500', bg: 'bg-teal-500/10' },
            { label: 'P90', value: `${stats.p90}`, unit: '€/MWh', icon: ArrowUpRight, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Volatilidad', value: `${stats.volatilityPct}%`, unit: '', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10', compare: compareStatsData?.volatilityPct },
            { label: 'Rango', value: `${Math.round((stats.max - stats.min) * 100) / 100}`, unit: '€/MWh', icon: GitCompareArrows, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map(kpi => {
            const Icon = kpi.icon;
            const delta = kpi.compare != null ? Math.round((parseFloat(kpi.value) - kpi.compare) * 100) / 100 : null;
            return (
              <Card key={kpi.label} className="border-border/50">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg shrink-0", kpi.bg)}><Icon className={cn("h-3.5 w-3.5", kpi.color)} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-sm font-bold truncate">{kpi.value} <span className="text-[10px] text-muted-foreground font-normal">{kpi.unit}</span></p>
                      {delta != null && (
                        <p className={cn("text-[9px] font-medium", delta > 0 ? 'text-red-500' : 'text-emerald-500')}>
                          {delta > 0 ? '+' : ''}{delta}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== HOURS + ALERTS STRIP ===== */}
      {stats && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Baratas:</span>
            {stats.cheapestHours.map(h => (
              <Badge key={h} variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">{h}:00</Badge>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-muted-foreground">Caras:</span>
            {stats.expensiveHours.map(h => (
              <Badge key={h} variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30">{h}:00</Badge>
            ))}
          </div>
          {alerts.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              {alerts.slice(0, 3).map((a, i) => (
                <Badge key={i} variant={a.type === 'high_price' ? 'destructive' : 'outline'} className="text-[10px]">
                  {a.message}
                </Badge>
              ))}
            </>
          )}
        </div>
      )}

      {/* ===== CHARTS ===== */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Cargando precios del mercado...</p>
        </div>
      ) : (
        <Tabs value={activeChart} onValueChange={setActiveChart}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="heatmap" className="text-xs">🌡️ Heatmap</TabsTrigger>
            <TabsTrigger value="hourly" className="text-xs">📈 Horario</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs">🕐 Perfil</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">📊 Diario</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">📅 Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">📆 Mensual</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">📦 Distribución</TabsTrigger>
            <TabsTrigger value="prediction" className="text-xs">🔮 Predicción</TabsTrigger>
          </TabsList>

          {/* HEATMAP */}
          <TabsContent value="heatmap" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Mapa de calor horario — {energyType === 'electricity' ? 'Electricidad' : 'Gas'}</CardTitle>
                  <span className="text-[10px] text-muted-foreground">{uniqueDates.length} días · {prices.length} registros</span>
                </div>
              </CardHeader>
              <CardContent>
                {uniqueDates.length === 0 ? (
                  <EmptyState message="Sin datos de precios para este periodo" />
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      <div className="flex gap-[2px] mb-1">
                        <div className="w-24 shrink-0" />
                        {Array.from({ length: 24 }, (_, i) => (
                          <div key={i} className="flex-1 text-center text-[9px] font-mono text-muted-foreground">{String(i).padStart(2, '0')}</div>
                        ))}
                        <div className="w-14 shrink-0 text-center text-[9px] text-muted-foreground font-semibold">Avg</div>
                      </div>
                      {uniqueDates.slice(-21).map(date => {
                        const dayPrices = heatmapData.filter(d => d.date === date);
                        const dayAvg = dayPrices.length > 0 ? dayPrices.reduce((s, d) => s + d.value, 0) / dayPrices.length : 0;
                        const dow = new Date(date).getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                          <div key={date} className="flex gap-[2px] mb-[2px]">
                            <div className={cn("w-24 shrink-0 text-[10px] flex items-center font-mono", isWeekend ? 'text-muted-foreground/50 italic' : 'text-muted-foreground')}>
                              {format(new Date(date), 'EEE dd/MM', { locale: es })}
                            </div>
                            {Array.from({ length: 24 }, (_, hour) => {
                              const point = dayPrices.find(d => d.hour === hour);
                              const value = point?.value ?? 0;
                              return (
                                <div key={hour}
                                  className={cn("flex-1 h-6 rounded-[3px] flex items-center justify-center text-[8px] font-mono transition-all hover:scale-110 hover:z-10 cursor-default", getPriceColor(value))}
                                  title={`${format(new Date(date), 'EEEE dd MMM', { locale: es })} ${hour}:00 → ${value.toFixed(1)} €/MWh`}
                                >
                                  {uniqueDates.length <= 10 ? value.toFixed(0) : ''}
                                </div>
                              );
                            })}
                            <div className="w-14 shrink-0 text-[10px] font-mono font-semibold flex items-center justify-center text-muted-foreground">
                              {dayAvg.toFixed(1)}
                            </div>
                          </div>
                        );
                      })}
                      <HeatmapLegend />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HOURLY */}
          <TabsContent value="hourly" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Precio horario — {timeRange === 'yesterday' ? 'Ayer' : 'Hoy'}</CardTitle></CardHeader>
              <CardContent>
                {hourlyData.length === 0 ? <EmptyState message="Sin datos horarios para hoy" /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={hourlyData}>
                      <defs>
                        <linearGradient id="priceGradM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="precio" stroke="hsl(var(--primary))" fill="url(#priceGradM)" name="€/MWh" strokeWidth={2} />
                      <Bar dataKey="precio" name="Precio" radius={[3, 3, 0, 0]} fillOpacity={0.6}>
                        {hourlyData.map((entry, i) => <Cell key={i} fill={getPriceHex(entry.precio)} />)}
                      </Bar>
                      {stats && <ReferenceLine y={stats.avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `Media: ${stats.avg}`, position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />}
                      {compareEnabled && compareHourlyData.length > 0 && (
                        <Line type="monotone" dataKey="precio" data={compareHourlyData} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Anterior" strokeWidth={1.5} dot={false} />
                      )}
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Perfil horario medio del periodo</CardTitle>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs">Media, mín y máx por hora agregados sobre {uniqueDates.length} días</TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={hourlyProfile}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={h => `${h}h`} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={h => `${h}:00`} />
                    <Area type="monotone" dataKey="max" stroke="transparent" fill="hsl(0,84%,60%)" fillOpacity={0.07} name="Máximo" />
                    <Area type="monotone" dataKey="min" stroke="transparent" fill="hsl(142,71%,45%)" fillOpacity={0.07} name="Mínimo" />
                    <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2.5} name="Media €/MWh" dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                    <Line type="monotone" dataKey="min" stroke="hsl(142,71%,45%)" strokeWidth={1} strokeDasharray="4 4" name="Mín" dot={false} />
                    <Line type="monotone" dataKey="max" stroke="hsl(0,84%,60%)" strokeWidth={1} strokeDasharray="4 4" name="Máx" dot={false} />
                    {stats && <ReferenceLine y={stats.avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" />}
                    <Legend />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DAILY */}
          <TabsContent value="daily" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución diaria — media, rango y spread</CardTitle></CardHeader>
              <CardContent>
                {dailyAvgs.length === 0 ? <EmptyState message="Sin datos diarios" /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={dailyAvgs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => format(new Date(d), 'dd/MM')} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={d => format(new Date(d), 'EEEE dd MMM yyyy', { locale: es })} />
                      <Area type="monotone" dataKey="max" stroke="transparent" fill="hsl(0, 84%, 60%)" fillOpacity={0.06} name="Máximo" />
                      <Area type="monotone" dataKey="min" stroke="transparent" fill="hsl(142, 71%, 45%)" fillOpacity={0.06} name="Mínimo" />
                      <Bar dataKey="spread" name="Spread" fill="hsl(var(--primary))" fillOpacity={0.12} radius={[2, 2, 0, 0]} />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" name="Media €/MWh" strokeWidth={2.5} dot={dailyAvgs.length < 15} />
                      <Line type="monotone" dataKey="min" stroke="hsl(142,71%,45%)" name="Mín" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="max" stroke="hsl(0,84%,60%)" name="Máx" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      {stats && <ReferenceLine y={stats.avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" />}
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEEKLY */}
          <TabsContent value="weekly" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Media semanal con rango</CardTitle></CardHeader>
              <CardContent>
                {weeklyData.length === 0 ? <EmptyState message="Necesita al menos 7 días de datos" /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="weekLabel" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="avg" name="Media €/MWh" radius={[4, 4, 0, 0]}>
                        {weeklyData.map((entry, i) => <Cell key={i} fill={getPriceHex(entry.avg)} />)}
                      </Bar>
                      <Line type="monotone" dataKey="min" stroke="hsl(142,71%,45%)" name="Mín" strokeWidth={1.5} dot />
                      <Line type="monotone" dataKey="max" stroke="hsl(0,84%,60%)" name="Máx" strokeWidth={1.5} dot />
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MONTHLY */}
          <TabsContent value="monthly" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución mensual</CardTitle></CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? <EmptyState message="Selecciona un rango mayor (30 días+) para ver datos mensuales" /> : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="monthLabel" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="avg" name="Media €/MWh" radius={[4, 4, 0, 0]}>
                          {monthlyData.map((entry, i) => <Cell key={i} fill={getPriceHex(entry.avg)} />)}
                        </Bar>
                        <Line type="monotone" dataKey="min" stroke="hsl(142,71%,45%)" name="Mín" strokeWidth={1.5} dot />
                        <Line type="monotone" dataKey="max" stroke="hsl(0,84%,60%)" name="Máx" strokeWidth={1.5} dot />
                        <Legend />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {monthlyData.map(m => (
                        <div key={m.month} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                          <span className="font-medium">{m.monthLabel}</span>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>Avg: <strong className="text-foreground">{m.avg}</strong></span>
                            <span className="text-emerald-500">{m.min}</span>
                            <span className="text-red-500">{m.max}</span>
                            <span>{m.days}d</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DISTRIBUTION */}
          <TabsContent value="distribution" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Distribución de precios por franja</CardTitle>
                  <span className="text-[10px] text-muted-foreground">{prices.length} registros</span>
                </div>
              </CardHeader>
              <CardContent>
                {distribution.length === 0 ? <EmptyState message="Sin datos" /> : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={distribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                        <YAxis dataKey="label" type="category" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={50} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Frecuencia']} />
                        <Bar dataKey="pct" name="% horas" radius={[0, 4, 4, 0]}>
                          {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {stats && (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: 'P10', value: stats.p10 },
                          { label: 'Mediana', value: stats.median },
                          { label: 'P90', value: stats.p90 },
                        ].map(p => (
                          <div key={p.label} className="p-2 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground">{p.label}</p>
                            <p className="text-sm font-bold">{p.value} <span className="text-[10px] font-normal text-muted-foreground">€/MWh</span></p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREDICTION */}
          <TabsContent value="prediction" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Predicción de precios (próximas 24h)
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fetchPredictions(energyType)} disabled={predictionLoading}>
                    {predictionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <BrainCircuit className="h-3 w-3" />}
                    Generar predicción
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {predictionChartData.length === 0 ? (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center gap-3">
                    <BrainCircuit className="h-10 w-10 text-muted-foreground/30" />
                    <div>
                      <p className="text-sm text-muted-foreground">Predicción no generada</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Pulsa "Generar predicción" para obtener una estimación IA de las próximas 24h basada en datos históricos</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={predictionChartData}>
                        <defs>
                          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis yAxisId="price" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis yAxisId="conf" orientation="right" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area yAxisId="price" type="monotone" dataKey="prediccion" stroke="#a855f7" fill="url(#predGrad)" name="Predicción €/MWh" strokeWidth={2.5} />
                        <Line yAxisId="conf" type="monotone" dataKey="confianza" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" name="Confianza %" strokeWidth={1} dot={false} />
                        <Legend />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-muted-foreground text-center">⚠️ Predicción generada por IA — orientativa, no vinculante para decisiones comerciales</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center text-center gap-2">
      <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
      <span>€/MWh:</span>
      {[
        { label: '≤30', cls: 'bg-emerald-500/80' },
        { label: '31-60', cls: 'bg-emerald-400/70' },
        { label: '61-100', cls: 'bg-yellow-400/80' },
        { label: '101-150', cls: 'bg-orange-400/80' },
        { label: '>150', cls: 'bg-red-500/80' },
      ].map(l => (
        <div key={l.label} className="flex items-center gap-0.5">
          <div className={`w-5 h-3 rounded-sm ${l.cls}`} />
          <span>{l.label}</span>
        </div>
      ))}
    </div>
  );
}

export default EnergyMarketPanel;
