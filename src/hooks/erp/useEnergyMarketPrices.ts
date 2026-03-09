/**
 * useEnergyMarketPrices - Hook for energy market price data
 * Real OMIE/REE via edge function → DB cache → mock fallback
 * Features: stats, profiles, monthly, CSV export, alerts, prediction
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfWeek, startOfMonth } from 'date-fns';
import { toast } from 'sonner';

export type EnergyMarketSource = 'omie' | 'ree' | 'esios' | 'mibgas' | 'mock';
export type MarketEnergyType = 'electricity' | 'gas';
export type MarketTimeRange = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

export interface MarketPrice {
  id: string;
  price_date: string;
  hour: number;
  energy_type: MarketEnergyType;
  market_source: EnergyMarketSource;
  price_eur_mwh: number | null;
  price_eur_kwh: number | null;
  zone: string;
}

export interface MarketStats {
  avg: number;
  min: number;
  max: number;
  median: number;
  p10: number;
  p90: number;
  volatility: number;
  volatilityPct: number;
  cheapestHours: number[];
  expensiveHours: number[];
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  totalRecords: number;
}

export interface HourlyProfile {
  hour: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface MonthlyAggregate {
  month: string;
  monthLabel: string;
  avg: number;
  min: number;
  max: number;
  days: number;
}

export interface PricePrediction {
  hour: number;
  predicted_price: number;
  confidence: number;
}

export interface PriceAlert {
  type: 'high_price' | 'low_price';
  hour: number;
  price: number;
  message: string;
}

export interface MarketProvider {
  id: EnergyMarketSource;
  name: string;
  status: 'connected' | 'stub' | 'error';
  energyType: MarketEnergyType;
  description: string;
}

const PROVIDERS: MarketProvider[] = [
  { id: 'omie', name: 'OMIE', status: 'stub', energyType: 'electricity', description: 'Operador del Mercado Ibérico de Energía — precios diarios del pool' },
  { id: 'ree', name: 'REE / ESIOS', status: 'stub', energyType: 'electricity', description: 'Red Eléctrica de España — indicadores PVPC y mercado libre' },
  { id: 'mibgas', name: 'MIBGAS', status: 'connected', energyType: 'gas', description: 'Mercado Ibérico del Gas — precios reales PVB via Firecrawl' },
];

function generateMockPrices(dateStr: string, energyType: MarketEnergyType): MarketPrice[] {
  const basePrice = energyType === 'electricity' ? 85 : 35;
  const variation = energyType === 'electricity' ? 60 : 15;
  const seed = dateStr.split('-').reduce((a, b) => a + parseInt(b), 0);
  const dow = new Date(dateStr).getDay();
  const dowFactor = dow === 0 || dow === 6 ? 0.82 : 1.0;
  // Seasonal: summer higher, winter moderate
  const monthNum = parseInt(dateStr.split('-')[1]);
  const seasonFactor = monthNum >= 6 && monthNum <= 9 ? 1.15 : monthNum >= 11 || monthNum <= 2 ? 1.05 : 0.95;

  return Array.from({ length: 24 }, (_, hour) => {
    const hourFactor = energyType === 'electricity'
      ? (hour >= 8 && hour <= 12 ? 1.4 : hour >= 18 && hour <= 22 ? 1.5 : hour >= 0 && hour <= 6 ? 0.5 : 0.9)
      : (hour >= 6 && hour <= 9 ? 1.3 : hour >= 18 && hour <= 21 ? 1.2 : 0.85);
    const noise = Math.sin(seed * hour * 0.7) * variation * 0.3;
    const dayNoise = Math.cos(seed * 0.13) * variation * 0.15;
    const price = Math.max(5, (basePrice + dayNoise) * hourFactor * dowFactor * seasonFactor + noise);
    return {
      id: `mock-${dateStr}-${hour}-${energyType}`,
      price_date: dateStr,
      hour,
      energy_type: energyType,
      market_source: 'mock' as EnergyMarketSource,
      price_eur_mwh: Math.round(price * 100) / 100,
      price_eur_kwh: Math.round(price / 1000 * 10000) / 10000,
      zone: 'peninsula',
    };
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function useEnergyMarketPrices() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<EnergyMarketSource>('mock');
  const [predictions, setPredictions] = useState<PricePrediction[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const fetchPrices = useCallback(async (
    startDate: string,
    endDate: string,
    energyType: MarketEnergyType = 'electricity'
  ) => {
    setLoading(true);
    try {
      // Try DB first
      const { data, error } = await supabase
        .from('energy_market_prices')
        .select('*')
        .eq('energy_type', energyType)
        .gte('price_date', startDate)
        .lte('price_date', endDate)
        .order('price_date', { ascending: true })
        .order('hour', { ascending: true });

      if (!error && data && data.length > 0) {
        setPrices(data as MarketPrice[]);
        setSource((data[0] as any).market_source as EnergyMarketSource);
        return data as MarketPrice[];
      }

      // Try edge function to fetch from OMIE
      try {
        const { data: fnData } = await supabase.functions.invoke('energy-market-prices', {
          body: { action: 'fetch_omie', start_date: startDate, energy_type: energyType },
        });
        if (fnData?.success && fnData?.source === 'omie') {
          // Re-fetch from DB after insert
          const { data: freshData } = await supabase
            .from('energy_market_prices')
            .select('*')
            .eq('energy_type', energyType)
            .gte('price_date', startDate)
            .lte('price_date', endDate)
            .order('price_date', { ascending: true })
            .order('hour', { ascending: true });
          if (freshData && freshData.length > 0) {
            setPrices(freshData as MarketPrice[]);
            setSource('omie');
            return freshData as MarketPrice[];
          }
        }
      } catch (fnErr) {
        console.warn('[useEnergyMarketPrices] Edge function unavailable, using mock:', fnErr);
      }

      // Fallback to mock
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = eachDayOfInterval({ start, end });
      const mockData = days.flatMap(d => generateMockPrices(format(d, 'yyyy-MM-dd'), energyType));
      setPrices(mockData);
      setSource('mock');
      return mockData;
    } catch (err) {
      console.error('[useEnergyMarketPrices] error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPredictions = useCallback(async (energyType: MarketEnergyType = 'electricity') => {
    setPredictionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-market-prices', {
        body: { action: 'predict', energy_type: energyType },
      });
      if (!error && data?.success && data?.data?.predictions) {
        setPredictions(data.data.predictions);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useEnergyMarketPrices] prediction error:', err);
      toast.error('Error al generar predicción');
      return null;
    } finally {
      setPredictionLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async (
    energyType: MarketEnergyType = 'electricity',
    thresholds = { high: 150, low: 30 }
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('energy-market-prices', {
        body: { action: 'alerts', energy_type: energyType, alert_thresholds: thresholds },
      });
      if (!error && data?.success) {
        setAlerts(data.alerts || []);
        return data.alerts;
      }
      return [];
    } catch (err) {
      console.error('[useEnergyMarketPrices] alerts error:', err);
      return [];
    }
  }, []);

  const computeStats = useCallback((data: MarketPrice[]): MarketStats | null => {
    if (data.length === 0) return null;
    const values = data.map(p => p.price_eur_mwh ?? 0).filter(v => v > 0);
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = percentile(sorted, 50);
    const p10 = percentile(sorted, 10);
    const p90 = percentile(sorted, 90);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);
    const volatilityPct = avg > 0 ? (volatility / avg) * 100 : 0;

    const hourAvg: Record<number, { sum: number; count: number }> = {};
    data.forEach(p => {
      if (!hourAvg[p.hour]) hourAvg[p.hour] = { sum: 0, count: 0 };
      hourAvg[p.hour].sum += p.price_eur_mwh ?? 0;
      hourAvg[p.hour].count++;
    });
    const hourPrices = Object.entries(hourAvg).map(([h, v]) => ({ hour: +h, avg: v.sum / v.count }));
    hourPrices.sort((a, b) => a.avg - b.avg);
    const cheapestHours = hourPrices.slice(0, 3).map(h => h.hour);
    const expensiveHours = hourPrices.slice(-3).reverse().map(h => h.hour);

    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : avg;
    const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : avg;
    const trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
    const trend = trendPct > 3 ? 'up' : trendPct < -3 ? 'down' : 'stable';

    return {
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      median: Math.round(median * 100) / 100,
      p10: Math.round(p10 * 100) / 100,
      p90: Math.round(p90 * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      volatilityPct: Math.round(volatilityPct * 10) / 10,
      cheapestHours,
      expensiveHours,
      trend,
      trendPct: Math.round(trendPct * 10) / 10,
      totalRecords: values.length,
    };
  }, []);

  const getDailyAverages = useCallback((data: MarketPrice[]) => {
    const byDate: Record<string, number[]> = {};
    data.forEach(p => {
      if (!byDate[p.price_date]) byDate[p.price_date] = [];
      byDate[p.price_date].push(p.price_eur_mwh ?? 0);
    });
    return Object.entries(byDate).map(([date, vals]) => ({
      date,
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      min: Math.round(Math.min(...vals) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
      spread: Math.round((Math.max(...vals) - Math.min(...vals)) * 100) / 100,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const getHeatmapData = useCallback((data: MarketPrice[]) => {
    return data.map(p => ({ date: p.price_date, hour: p.hour, value: p.price_eur_mwh ?? 0 }));
  }, []);

  const getHourlyProfile = useCallback((data: MarketPrice[]): HourlyProfile[] => {
    const byHour: Record<number, number[]> = {};
    data.forEach(p => {
      if (!byHour[p.hour]) byHour[p.hour] = [];
      byHour[p.hour].push(p.price_eur_mwh ?? 0);
    });
    return Array.from({ length: 24 }, (_, h) => {
      const vals = byHour[h] || [0];
      return {
        hour: h,
        avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
        min: Math.round(Math.min(...vals) * 100) / 100,
        max: Math.round(Math.max(...vals) * 100) / 100,
        count: vals.length,
      };
    });
  }, []);

  const getWeeklyAverages = useCallback((data: MarketPrice[]) => {
    const byWeek: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    data.forEach(p => {
      const wk = format(startOfWeek(new Date(p.price_date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!byWeek[wk]) byWeek[wk] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      const v = p.price_eur_mwh ?? 0;
      byWeek[wk].sum += v;
      byWeek[wk].count++;
      byWeek[wk].min = Math.min(byWeek[wk].min, v);
      byWeek[wk].max = Math.max(byWeek[wk].max, v);
    });
    return Object.entries(byWeek).map(([week, v]) => ({
      week,
      weekLabel: `Sem ${format(new Date(week), 'dd/MM')}`,
      avg: Math.round((v.sum / v.count) * 100) / 100,
      min: v.min === Infinity ? 0 : Math.round(v.min * 100) / 100,
      max: v.max === -Infinity ? 0 : Math.round(v.max * 100) / 100,
    })).sort((a, b) => a.week.localeCompare(b.week));
  }, []);

  const getMonthlyAverages = useCallback((data: MarketPrice[]): MonthlyAggregate[] => {
    const byMonth: Record<string, { sum: number; count: number; min: number; max: number; dates: Set<string> }> = {};
    data.forEach(p => {
      const m = format(startOfMonth(new Date(p.price_date)), 'yyyy-MM');
      if (!byMonth[m]) byMonth[m] = { sum: 0, count: 0, min: Infinity, max: -Infinity, dates: new Set() };
      const v = p.price_eur_mwh ?? 0;
      byMonth[m].sum += v;
      byMonth[m].count++;
      byMonth[m].min = Math.min(byMonth[m].min, v);
      byMonth[m].max = Math.max(byMonth[m].max, v);
      byMonth[m].dates.add(p.price_date);
    });
    return Object.entries(byMonth).map(([month, v]) => ({
      month,
      monthLabel: format(new Date(month + '-01'), 'MMM yyyy', { locale: undefined }),
      avg: Math.round((v.sum / v.count) * 100) / 100,
      min: v.min === Infinity ? 0 : Math.round(v.min * 100) / 100,
      max: v.max === -Infinity ? 0 : Math.round(v.max * 100) / 100,
      days: v.dates.size,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, []);

  const exportCSV = useCallback((data: MarketPrice[], filename?: string) => {
    if (data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const header = 'Fecha,Hora,Precio €/MWh,Precio €/kWh,Tipo,Fuente,Zona\n';
    const rows = data.map(p =>
      `${p.price_date},${p.hour},${p.price_eur_mwh ?? ''},${p.price_eur_kwh ?? ''},${p.energy_type},${p.market_source},${p.zone}`
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `precios_mercado_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportados ${data.length} registros`);
  }, []);

  const getPriceColor = useCallback((priceEurMwh: number): string => {
    if (priceEurMwh <= 30) return 'bg-emerald-500/80 text-white';
    if (priceEurMwh <= 60) return 'bg-emerald-400/70 text-white';
    if (priceEurMwh <= 100) return 'bg-yellow-400/80 text-foreground';
    if (priceEurMwh <= 150) return 'bg-orange-400/80 text-white';
    return 'bg-red-500/80 text-white';
  }, []);

  const getPriceHex = useCallback((priceEurMwh: number): string => {
    if (priceEurMwh <= 30) return '#10b981';
    if (priceEurMwh <= 60) return '#34d399';
    if (priceEurMwh <= 100) return '#eab308';
    if (priceEurMwh <= 150) return '#f97316';
    return '#ef4444';
  }, []);

  return {
    prices, loading, source, predictions, alerts, predictionLoading,
    providers: PROVIDERS,
    fetchPrices, fetchPredictions, fetchAlerts,
    computeStats, getDailyAverages, getHeatmapData, getPriceColor, getPriceHex,
    getHourlyProfile, getWeeklyAverages, getMonthlyAverages, exportCSV,
  };
}
