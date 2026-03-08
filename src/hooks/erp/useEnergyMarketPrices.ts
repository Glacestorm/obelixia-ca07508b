/**
 * useEnergyMarketPrices - Hook for energy market price data (OMIE, REE, gas)
 * Supports real API integration or mock data fallback
 * Enhanced: distribution analysis, percentiles, trend detection
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfWeek } from 'date-fns';

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
}

export interface HourlyProfile {
  hour: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface MarketProvider {
  id: EnergyMarketSource;
  name: string;
  status: 'connected' | 'stub' | 'error';
  energyType: MarketEnergyType;
  description: string;
}

const PROVIDERS: MarketProvider[] = [
  { id: 'omie', name: 'OMIE', status: 'stub', energyType: 'electricity', description: 'Operador del Mercado Ibérico de Energía' },
  { id: 'ree', name: 'REE / ESIOS', status: 'stub', energyType: 'electricity', description: 'Red Eléctrica de España' },
  { id: 'mibgas', name: 'MIBGAS', status: 'stub', energyType: 'gas', description: 'Mercado Ibérico del Gas' },
];

function generateMockPrices(dateStr: string, energyType: MarketEnergyType): MarketPrice[] {
  const basePrice = energyType === 'electricity' ? 85 : 35;
  const variation = energyType === 'electricity' ? 60 : 15;
  const seed = dateStr.split('-').reduce((a, b) => a + parseInt(b), 0);
  // Day-of-week factor for realism
  const dow = new Date(dateStr).getDay();
  const dowFactor = dow === 0 || dow === 6 ? 0.82 : 1.0;

  return Array.from({ length: 24 }, (_, hour) => {
    const hourFactor = energyType === 'electricity'
      ? (hour >= 8 && hour <= 12 ? 1.4 : hour >= 18 && hour <= 22 ? 1.5 : hour >= 0 && hour <= 6 ? 0.5 : 0.9)
      : (hour >= 6 && hour <= 9 ? 1.3 : hour >= 18 && hour <= 21 ? 1.2 : 0.85);
    const noise = Math.sin(seed * hour * 0.7) * variation * 0.3;
    const dayNoise = Math.cos(seed * 0.13) * variation * 0.15;
    const price = Math.max(5, (basePrice + dayNoise) * hourFactor * dowFactor + noise);
    return {
      id: `mock-${dateStr}-${hour}-${energyType}`,
      price_date: dateStr,
      hour,
      energy_type: energyType,
      market_source: 'mock' as EnergyMarketSource,
      price_eur_mwh: Math.round(price * 100) / 100,
      price_eur_kwh: Math.round(price / 10) / 100,
      zone: 'peninsula',
    };
  });
}

function percentile(sorted: number[], p: number): number {
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

  const fetchPrices = useCallback(async (
    startDate: string,
    endDate: string,
    energyType: MarketEnergyType = 'electricity'
  ) => {
    setLoading(true);
    try {
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
        setSource(data[0].market_source as EnergyMarketSource);
        return data as MarketPrice[];
      }

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

    // Hour aggregates
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

    // Trend: compare first half vs second half
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
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
    return data.map(p => ({
      date: p.price_date,
      hour: p.hour,
      value: p.price_eur_mwh ?? 0,
    }));
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
    const byWeek: Record<string, { sum: number; count: number; min: number; max: number; vals: number[] }> = {};
    data.forEach(p => {
      const wk = format(startOfWeek(new Date(p.price_date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!byWeek[wk]) byWeek[wk] = { sum: 0, count: 0, min: Infinity, max: -Infinity, vals: [] };
      const v = p.price_eur_mwh ?? 0;
      byWeek[wk].sum += v;
      byWeek[wk].count++;
      byWeek[wk].min = Math.min(byWeek[wk].min, v);
      byWeek[wk].max = Math.max(byWeek[wk].max, v);
      byWeek[wk].vals.push(v);
    });
    return Object.entries(byWeek).map(([week, v]) => ({
      week,
      weekLabel: `Sem ${format(new Date(week), 'dd/MM')}`,
      avg: Math.round((v.sum / v.count) * 100) / 100,
      min: v.min === Infinity ? 0 : Math.round(v.min * 100) / 100,
      max: v.max === -Infinity ? 0 : Math.round(v.max * 100) / 100,
    })).sort((a, b) => a.week.localeCompare(b.week));
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
    prices, loading, source,
    providers: PROVIDERS,
    fetchPrices, computeStats, getDailyAverages, getHeatmapData, getPriceColor, getPriceHex,
    getHourlyProfile, getWeeklyAverages,
  };
}
