/**
 * ElectricalIndexedPricesPanel - Visor de precios indexados OMIE/Peajes/PVPC
 * Inspirado en CarlosCodina: tabla horaria con colores por rango de precio,
 * selector de fecha (ayer/hoy/mañana), medias del día.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap, ChevronLeft, ChevronRight, Calendar, TrendingUp, Info, AlertTriangle
} from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { useEnergyIndexedPrices } from '@/hooks/erp/useEnergyIndexedPrices';
import { cn } from '@/lib/utils';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function ElectricalIndexedPricesPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { prices, loading, fetchPrices, getPriceColor, getAveragePrice } = useEnergyIndexedPrices();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchPrices(dateStr);
  }, [dateStr, fetchPrices]);

  const goDay = useCallback((dir: -1 | 1) => {
    setSelectedDate(prev => dir === -1 ? subDays(prev, 1) : addDays(prev, 1));
  }, []);

  const setToday = useCallback(() => setSelectedDate(new Date()), []);

  const omieAvg = getAveragePrice('omie_price');
  const pvpcAvg = getAveragePrice('pvpc_price');

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Precios Indexados" />
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Precios Indexados
        </h2>
        <p className="text-sm text-muted-foreground">
          Precios horarios OMIE, peajes y PVPC del mercado eléctrico español.
        </p>
      </div>

      {/* Date selector */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateStr}
                onChange={e => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                className="w-auto h-8"
              />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => goDay(-1)}>Ayer</Button>
              <Button variant="default" size="sm" className="h-8 text-xs" onClick={setToday}>Hoy</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => goDay(1)}>Mañana</Button>
            </div>
          </div>
          <p className="text-center text-sm font-medium mt-2 text-foreground">
            {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </CardContent>
      </Card>

      {/* Averages */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Media OMIE</p>
            <p className="text-xl font-bold">{omieAvg !== null ? `${omieAvg}` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">c€/kWh</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Media Peajes</p>
            <p className="text-xl font-bold">{getAveragePrice('peajes_price') !== null ? `${getAveragePrice('peajes_price')}` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">c€/kWh</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Media PVPC</p>
            <p className="text-xl font-bold">{pvpcAvg !== null ? `${pvpcAvg}` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">c€/kWh</p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Precios por hora</CardTitle>
          <CardDescription>Precios en céntimos de euro por kWh</CardDescription>
        </CardHeader>
        <CardContent>
          {prices.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Zap className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No hay datos de precios para esta fecha.
              </p>
              <p className="text-xs text-muted-foreground">
                Los precios se pueden importar manualmente o conectar con fuentes externas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground w-12">Hora</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground" colSpan={2}>OMIE</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground" colSpan={2}>Peajes</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground" colSpan={2}>PVPC</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map(p => (
                    <tr key={p.hour} className="border-b border-border/30">
                      <td className="p-2 text-xs font-mono text-muted-foreground">{p.hour}</td>
                      <td className="p-1 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium min-w-[48px]", getPriceColor(p.omie_price))}>
                          {p.omie_price !== null ? p.omie_price.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="p-1 text-center text-xs text-muted-foreground">{p.hour}</td>
                      <td className="p-1 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium min-w-[48px]", getPriceColor(p.peajes_price))}>
                          {p.peajes_price !== null ? p.peajes_price.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="p-1 text-center text-xs text-muted-foreground">{p.hour}</td>
                      <td className="p-1 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium min-w-[48px]", getPriceColor(p.pvpc_price))}>
                          {p.pvpc_price !== null ? p.pvpc_price.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="w-0" />
                    </tr>
                  ))}
                  {/* Average row */}
                  <tr className="border-t-2 font-medium">
                    <td className="p-2 text-xs">X̄</td>
                    <td className="p-1 text-center">
                      <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-bold min-w-[48px]", getPriceColor(omieAvg))}>
                        {omieAvg !== null ? omieAvg.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="p-1 text-center text-xs">X̄</td>
                    <td className="p-1 text-center">
                      <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-bold min-w-[48px]", getPriceColor(getAveragePrice('peajes_price')))}>
                        {getAveragePrice('peajes_price')?.toFixed(1) ?? '—'}
                      </span>
                    </td>
                    <td className="p-1 text-center text-xs">X̄</td>
                    <td className="p-1 text-center">
                      <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-bold min-w-[48px]", getPriceColor(pvpcAvg))}>
                        {pvpcAvg !== null ? pvpcAvg.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimers */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Los precios se muestran en céntimos de euro sin Impuesto Eléctrico ni IVA. Son precios normalizados con FNEE, GdO y Tasa Municipal aplicados.
          </p>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Los precios de mañana se empiezan a conocer a partir de las 13h, cuando se publican los precios base de la energía en OMIE.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ElectricalIndexedPricesPanel;
