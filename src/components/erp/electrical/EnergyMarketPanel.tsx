/**
 * EnergyMarketPanel - Premium market price visualization
 * Hourly, daily, weekly, monthly charts + heatmap + period comparison + stats
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, Activity, Loader2, BarChart3, Clock,
  Zap, Flame, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight,
  CalendarDays, GitCompareArrows
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  ComposedChart, ReferenceLine
} from 'recharts';
import { useEnergyMarketPrices, MarketTimeRange, MarketEnergyType } from '@/hooks/erp/useEnergyMarketPrices';
import { format, subDays, startOfMonth, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function EnergyMarketPanel() {
  const { prices, loading, source, fetchPrices, computeStats, getDailyAverages, getHeatmapData, getPriceColor } = useEnergyMarketPrices();
  const [timeRange, setTimeRange] = useState<MarketTimeRange>('7d');
  const [energyType, setEnergyType] = useState<MarketEnergyType>('electricity');
  const [activeChart, setActiveChart] = useState('hourly');
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Comparison data (previous period)
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

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    if (dailyAvgs.length < 7) return [];
    const weeks: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    dailyAvgs.forEach(d => {
      const weekStart = format(startOfWeek(new Date(d.date), { weekStartsOn: 1 }), 'dd/MM');
      if (!weeks[weekStart]) weeks[weekStart] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      weeks[weekStart].sum += d.avg;
      weeks[weekStart].count++;
      weeks[weekStart].min = Math.min(weeks[weekStart].min, d.min);
      weeks[weekStart].max = Math.max(weeks[weekStart].max, d.max);
    });
    return Object.entries(weeks).map(([week, v]) => ({
      week: `Sem ${week}`,
      avg: Math.round((v.sum / v.count) * 100) / 100,
      min: v.min,
      max: v.max,
    }));
  }, [dailyAvgs]);

  // Hourly data for single-day views
  const hourlyData = useMemo(() => {
    const targetDate = timeRange === 'yesterday'
      ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
    return prices
      .filter(p => p.price_date === targetDate)
      .map(p => ({ hour: `${p.hour}h`, precio: p.price_eur_mwh ?? 0, kwh: p.price_eur_kwh ?? 0 }));
  }, [prices, timeRange]);

  // Compare hourly
  const compareHourlyData = useMemo(() => {
    if (!compareEnabled || comparePrices.length === 0) return [];
    const dates = [...new Set(comparePrices.map(p => p.price_date))].sort();
    const lastDate = dates[dates.length - 1];
    return comparePrices.filter(p => p.price_date === lastDate).map(p => ({
      hour: `${p.hour}h`, precio: p.price_eur_mwh ?? 0,
    }));
  }, [comparePrices, compareEnabled]);

  const uniqueDates = [...new Set(heatmapData.map(d => d.date))].sort();

  // Delta calculation for comparison
  const priceDelta = useMemo(() => {
    if (!stats || !compareStatsData) return null;
    const diff = stats.avg - compareStatsData.avg;
    const pct = compareStatsData.avg > 0 ? Math.round((diff / compareStatsData.avg) * 100) : 0;
    return { diff: Math.round(diff * 100) / 100, pct, direction: diff > 0 ? 'up' : 'down' };
  }, [stats, compareStatsData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {energyType === 'electricity' ? <Zap className="h-5 w-5 text-amber-500" /> : <Flame className="h-5 w-5 text-blue-500" />}
          <h2 className="text-lg font-semibold">Mercado Energético</h2>
          <Badge variant={source === 'mock' ? 'outline' : 'default'} className="text-xs">
            {source === 'mock' ? 'Datos simulados' : source.toUpperCase()}
          </Badge>
          {priceDelta && (
            <Badge variant={priceDelta.direction === 'up' ? 'destructive' : 'default'} className="text-xs gap-1">
              {priceDelta.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {priceDelta.pct > 0 ? '+' : ''}{priceDelta.pct}% vs periodo anterior
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={energyType} onValueChange={(v) => setEnergyType(v as MarketEnergyType)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="electricity">⚡ Electricidad</SelectItem>
              <SelectItem value="gas">🔥 Gas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as MarketTimeRange)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="month">Mes actual</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={compareEnabled ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1"
            onClick={() => setCompareEnabled(!compareEnabled)}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            {compareEnabled ? 'Comparando' : 'Comparar'}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            const { start, end } = getDateRange();
            fetchPrices(start, end, energyType);
          }}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Media', value: `${stats.avg}`, unit: '€/MWh', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', compare: compareStatsData?.avg },
            { label: 'Mínimo', value: `${stats.min}`, unit: '€/MWh', icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-500/10', compare: compareStatsData?.min },
            { label: 'Máximo', value: `${stats.max}`, unit: '€/MWh', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-500/10', compare: compareStatsData?.max },
            { label: 'Volatilidad', value: `${stats.volatility}`, unit: '', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10', compare: compareStatsData?.volatility },
            { label: 'Horas baratas', value: stats.cheapestHours.map(h => `${h}h`).join(', '), unit: '', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Horas caras', value: stats.expensiveHours.map(h => `${h}h`).join(', '), unit: '', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          ].map(kpi => {
            const Icon = kpi.icon;
            const delta = kpi.compare != null ? Math.round((parseFloat(kpi.value) - kpi.compare) * 100) / 100 : null;
            return (
              <Card key={kpi.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                      <p className="text-sm font-bold truncate">{kpi.value} <span className="text-[10px] text-muted-foreground font-normal">{kpi.unit}</span></p>
                      {delta != null && (
                        <p className={cn("text-[9px] font-medium", delta > 0 ? 'text-red-500' : 'text-emerald-500')}>
                          {delta > 0 ? '+' : ''}{delta} vs anterior
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

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Cargando precios...</p>
        </div>
      ) : (
        <Tabs value={activeChart} onValueChange={setActiveChart}>
          <TabsList>
            <TabsTrigger value="hourly" className="text-xs">Horario</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">Diario</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Semanal</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs">Mapa de calor</TabsTrigger>
            <TabsTrigger value="bars" className="text-xs">Barras</TabsTrigger>
          </TabsList>

          <TabsContent value="hourly" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Precio horario ({energyType === 'electricity' ? 'Electricidad' : 'Gas'})</CardTitle>
              </CardHeader>
              <CardContent>
                {hourlyData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos para este periodo</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={hourlyData}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="precio" stroke="hsl(var(--primary))" fill="url(#priceGrad)" name="€/MWh (actual)" strokeWidth={2} />
                      {stats && <ReferenceLine y={stats.avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `Media: ${stats.avg}`, position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />}
                      {compareEnabled && compareHourlyData.length > 0 && (
                        <Line type="monotone" dataKey="precio" data={compareHourlyData} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="€/MWh (anterior)" strokeWidth={1.5} dot={false} />
                      )}
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Media diaria con rango min-max</CardTitle></CardHeader>
              <CardContent>
                {dailyAvgs.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={dailyAvgs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => format(new Date(d), 'dd/MM')} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} labelFormatter={d => format(new Date(d), 'dd MMM yyyy', { locale: es })} />
                      <Area type="monotone" dataKey="max" stroke="transparent" fill="hsl(0, 84%, 60%)" fillOpacity={0.08} name="Máximo" />
                      <Area type="monotone" dataKey="min" stroke="transparent" fill="hsl(142, 71%, 45%)" fillOpacity={0.08} name="Mínimo" />
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

          <TabsContent value="weekly" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Media semanal</CardTitle></CardHeader>
              <CardContent>
                {weeklyData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Necesita al menos 7 días de datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="avg" name="Media €/MWh" radius={[4, 4, 0, 0]}>
                        {weeklyData.map((entry, i) => (
                          <Cell key={i} fill={entry.avg <= 60 ? 'hsl(142,71%,45%)' : entry.avg <= 100 ? 'hsl(45,93%,47%)' : entry.avg <= 150 ? 'hsl(25,95%,53%)' : 'hsl(0,84%,60%)'} />
                        ))}
                      </Bar>
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mapa de calor horario</CardTitle></CardHeader>
              <CardContent>
                {uniqueDates.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="flex gap-px mb-1">
                        <div className="w-20 text-[9px] text-muted-foreground" />
                        {Array.from({ length: 24 }, (_, i) => (
                          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{i}</div>
                        ))}
                      </div>
                      {uniqueDates.slice(-14).map(date => (
                        <div key={date} className="flex gap-px mb-px">
                          <div className="w-20 text-[9px] text-muted-foreground flex items-center">{format(new Date(date), 'EEE dd/MM', { locale: es })}</div>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const point = heatmapData.find(d => d.date === date && d.hour === hour);
                            const value = point?.value ?? 0;
                            return (
                              <div key={hour} className={cn("flex-1 h-5 rounded-sm flex items-center justify-center text-[8px] font-mono", getPriceColor(value))}
                                title={`${date} ${hour}h: ${value.toFixed(1)} €/MWh`}>
                                {uniqueDates.length <= 7 ? value.toFixed(0) : ''}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2 text-[9px] text-muted-foreground">
                        <span>≤30</span>
                        {['bg-emerald-500/80', 'bg-emerald-400/70', 'bg-yellow-400/80', 'bg-orange-400/80', 'bg-red-500/80'].map((c, i) => (
                          <div key={i} className={`w-6 h-3 rounded-sm ${c}`} />
                        ))}
                        <span>≥150 €/MWh</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bars" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Precio por hora (barras con escala cromática)</CardTitle></CardHeader>
              <CardContent>
                {hourlyData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      {stats && <ReferenceLine y={stats.avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `Media`, position: 'right', fontSize: 9 }} />}
                      <Bar dataKey="precio" name="€/MWh" radius={[4, 4, 0, 0]}>
                        {hourlyData.map((entry, i) => (
                          <Cell key={i} fill={entry.precio <= 30 ? 'hsl(142,71%,45%)' : entry.precio <= 60 ? 'hsl(142,50%,55%)' : entry.precio <= 100 ? 'hsl(45,93%,47%)' : entry.precio <= 150 ? 'hsl(25,95%,53%)' : 'hsl(0,84%,60%)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default EnergyMarketPanel;
