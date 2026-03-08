/**
 * EnergyMarketPanel - Premium market price visualization
 * Hourly, daily, weekly, monthly charts + heatmap + stats
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, Activity, Loader2, BarChart3, Clock,
  Zap, Flame, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useEnergyMarketPrices, MarketTimeRange, MarketEnergyType } from '@/hooks/erp/useEnergyMarketPrices';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function EnergyMarketPanel() {
  const { prices, loading, source, fetchPrices, computeStats, getDailyAverages, getHeatmapData, getPriceColor } = useEnergyMarketPrices();
  const [timeRange, setTimeRange] = useState<MarketTimeRange>('today');
  const [energyType, setEnergyType] = useState<MarketEnergyType>('electricity');
  const [activeChart, setActiveChart] = useState('hourly');

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

  useEffect(() => {
    const { start, end } = getDateRange();
    fetchPrices(start, end, energyType);
  }, [timeRange, energyType, getDateRange, fetchPrices]);

  const stats = computeStats(prices);
  const dailyAvgs = getDailyAverages(prices);
  const heatmapData = getHeatmapData(prices);

  // Hourly data for today/yesterday
  const hourlyData = prices
    .filter(p => p.price_date === (timeRange === 'yesterday' ? format(subDays(new Date(), 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')))
    .map(p => ({
      hour: `${p.hour}h`,
      precio: p.price_eur_mwh ?? 0,
      kwh: p.price_eur_kwh ?? 0,
    }));

  // Heatmap grid (unique dates × 24 hours)
  const uniqueDates = [...new Set(heatmapData.map(d => d.date))].sort();

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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const { start, end } = getDateRange(); fetchPrices(start, end, energyType); }}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Media', value: `${stats.avg} €/MWh`, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Mínimo', value: `${stats.min} €/MWh`, icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Máximo', value: `${stats.max} €/MWh`, icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Volatilidad', value: `${stats.volatility}`, icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Horas baratas', value: stats.cheapestHours.map(h => `${h}h`).join(', '), icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Horas caras', value: stats.expensiveHours.map(h => `${h}h`).join(', '), icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${kpi.bg}`}><Icon className={`h-4 w-4 ${kpi.color}`} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                      <p className="text-sm font-bold truncate">{kpi.value}</p>
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
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                      <Area type="monotone" dataKey="precio" stroke="hsl(var(--primary))" fill="url(#priceGrad)" name="€/MWh" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Media diaria</CardTitle></CardHeader>
              <CardContent>
                {dailyAvgs.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyAvgs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => format(new Date(d), 'dd/MM')} />
                      <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" name="Media €/MWh" strokeWidth={2} dot={dailyAvgs.length < 15} />
                      <Line type="monotone" dataKey="min" stroke="hsl(142,71%,45%)" name="Mínimo" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="max" stroke="hsl(0,84%,60%)" name="Máximo" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    </LineChart>
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
                          <div className="w-20 text-[9px] text-muted-foreground flex items-center">{format(new Date(date), 'dd/MM', { locale: es })}</div>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const point = heatmapData.find(d => d.date === date && d.hour === hour);
                            const value = point?.value ?? 0;
                            return (
                              <div
                                key={hour}
                                className={cn("flex-1 h-5 rounded-sm flex items-center justify-center text-[8px] font-mono", getPriceColor(value))}
                                title={`${date} ${hour}h: ${value.toFixed(1)} €/MWh`}
                              >
                                {uniqueDates.length <= 7 ? value.toFixed(0) : ''}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2 text-[9px] text-muted-foreground">
                        <span>Bajo</span>
                        <div className="flex gap-px">
                          {['bg-emerald-500/80', 'bg-emerald-400/70', 'bg-yellow-400/80', 'bg-orange-400/80', 'bg-red-500/80'].map((c, i) => (
                            <div key={i} className={`w-4 h-3 rounded-sm ${c}`} />
                          ))}
                        </div>
                        <span>Alto</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bars" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Precio por hora (barras)</CardTitle></CardHeader>
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
                      <Bar dataKey="precio" name="€/MWh" radius={[4, 4, 0, 0]}>
                        {hourlyData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.precio <= 60 ? 'hsl(142,71%,45%)' : entry.precio <= 100 ? 'hsl(45,93%,47%)' : entry.precio <= 150 ? 'hsl(25,95%,53%)' : 'hsl(0,84%,60%)'}
                          />
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
