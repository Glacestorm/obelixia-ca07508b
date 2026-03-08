/**
 * useEnergyMarketPrices - Hook for energy market price data (OMIE, REE, gas)
 * Supports real API integration or mock data fallback
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval } from 'date-fns';

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
  volatility: number;
  cheapestHours: number[];
  expensiveHours: number[];
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
  
  return Array.from({ length: 24 }, (_, hour) => {
    const hourFactor = energyType === 'electricity'
      ? (hour >= 8 && hour <= 12 ? 1.4 : hour >= 18 && hour <= 22 ? 1.5 : hour >= 0 && hour <= 6 ? 0.5 : 0.9)
      : (hour >= 6 && hour <= 9 ? 1.3 : hour >= 18 && hour <= 21 ? 1.2 : 0.85);
    const noise = Math.sin(seed * hour * 0.7) * variation * 0.3;
    const price = Math.max(5, basePrice * hourFactor + noise);
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
      // Try real data first
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

  const computeStats = useCallback((data: MarketPrice[]): MarketStats | null => {
    if (data.length === 0) return null;
    const values = data.map(p => p.price_eur_mwh ?? 0).filter(v => v > 0);
    if (values.length === 0) return null;
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Cheapest/expensive hours (aggregate by hour)
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

    return {
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      cheapestHours,
      expensiveHours,
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
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const getHeatmapData = useCallback((data: MarketPrice[]) => {
    return data.map(p => ({
      date: p.price_date,
      hour: p.hour,
      value: p.price_eur_mwh ?? 0,
    }));
  }, []);

  const getPriceColor = useCallback((priceEurMwh: number): string => {
    if (priceEurMwh <= 30) return 'bg-emerald-500/80 text-white';
    if (priceEurMwh <= 60) return 'bg-emerald-400/70 text-white';
    if (priceEurMwh <= 100) return 'bg-yellow-400/80 text-foreground';
    if (priceEurMwh <= 150) return 'bg-orange-400/80 text-white';
    return 'bg-red-500/80 text-white';
  }, []);

  return {
    prices, loading, source,
    providers: PROVIDERS,
    fetchPrices, computeStats, getDailyAverages, getHeatmapData, getPriceColor,
  };
}
