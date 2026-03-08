import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gauge, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props { companyId: string; }

interface SupplyData {
  id: string;
  case_title: string;
  cups: string | null;
  contracted_power_p1: number | null;
  contracted_power_p2: number | null;
  max_demand_p1: number | null;
  max_demand_p2: number | null;
}

export function ElectricalPotenciaPanel({ companyId }: Props) {
  const [supplies, setSupplies] = useState<SupplyData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases').select('id, title, cups').eq('company_id', companyId);
      if (!cases || cases.length === 0) { setSupplies([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: supplyData } = await supabase
        .from('energy_supplies').select('*').in('case_id', caseIds);

      const rows: SupplyData[] = (supplyData || []).map((s: any) => {
        const c = cases.find(cs => cs.id === s.case_id);
        return {
          id: s.id, case_title: c?.title || '—', cups: c?.cups || null,
          contracted_power_p1: s.contracted_power_p1, contracted_power_p2: s.contracted_power_p2,
          max_demand_p1: s.max_demand_p1, max_demand_p2: s.max_demand_p2,
        };
      });
      setSupplies(rows);
    } catch (err) {
      console.error('[ElectricalPotenciaPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const chartData = useMemo(() => {
    return supplies.map(s => ({
      name: s.case_title.substring(0, 20),
      'Contratada P1': s.contracted_power_p1 || 0,
      'Máx. Demandada P1': s.max_demand_p1 || 0,
      'Contratada P2': s.contracted_power_p2 || 0,
      'Máx. Demandada P2': s.max_demand_p2 || 0,
    }));
  }, [supplies]);

  const excesses = useMemo(() => {
    return supplies.filter(s =>
      (s.max_demand_p1 && s.contracted_power_p1 && s.max_demand_p1 > s.contracted_power_p1) ||
      (s.max_demand_p2 && s.contracted_power_p2 && s.max_demand_p2 > s.contracted_power_p2)
    );
  }, [supplies]);

  const fmtPower = (v: number | null) => v != null ? `${v} kW` : '—';

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Análisis" subsection="Potencia" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-purple-500" /> Análisis de Potencia
          </h2>
          <p className="text-sm text-muted-foreground">Comparativa de potencia contratada vs máxima demandada. {supplies.length} suministros.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {supplies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gauge className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay datos de suministro. Añade datos de potencia desde un expediente.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Potencia contratada vs demandada</CardTitle>
                <CardDescription>Comparativa P1 por expediente</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Contratada P1" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Máx. Demandada P1" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Excesos y alertas</CardTitle>
                <CardDescription>{excesses.length} suministros con posibles excesos</CardDescription>
              </CardHeader>
              <CardContent>
                {excesses.length === 0 ? (
                  <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm text-muted-foreground">No se detectan excesos de potencia</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[220px]">
                    <div className="space-y-2">
                      {excesses.map(s => {
                        const excessP1 = (s.max_demand_p1 || 0) - (s.contracted_power_p1 || 0);
                        const excessP2 = (s.max_demand_p2 || 0) - (s.contracted_power_p2 || 0);
                        return (
                          <div key={s.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                              <span className="text-sm font-medium">{s.case_title}</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {excessP1 > 0 && <p>P1: exceso de {excessP1.toFixed(1)} kW ({fmtPower(s.max_demand_p1)} vs {fmtPower(s.contracted_power_p1)})</p>}
                              {excessP2 > 0 && <p>P2: exceso de {excessP2.toFixed(1)} kW ({fmtPower(s.max_demand_p2)} vs {fmtPower(s.contracted_power_p2)})</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalle por suministro</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-6 gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                    <span>Expediente</span><span>CUPS</span><span>Cont. P1</span><span>Máx. P1</span><span>Cont. P2</span><span>Máx. P2</span>
                  </div>
                  {supplies.map(s => {
                    const hasExcess = (s.max_demand_p1 && s.contracted_power_p1 && s.max_demand_p1 > s.contracted_power_p1) ||
                      (s.max_demand_p2 && s.contracted_power_p2 && s.max_demand_p2 > s.contracted_power_p2);
                    return (
                      <div key={s.id} className={`grid grid-cols-6 gap-2 px-4 py-2.5 border-b last:border-0 text-sm items-center ${hasExcess ? 'bg-destructive/5' : 'hover:bg-muted/30'}`}>
                        <span className="font-medium truncate">{s.case_title}</span>
                        <span className="text-muted-foreground font-mono text-xs truncate">{s.cups || '—'}</span>
                        <span className="font-mono text-xs">{fmtPower(s.contracted_power_p1)}</span>
                        <span className={`font-mono text-xs ${s.max_demand_p1 && s.contracted_power_p1 && s.max_demand_p1 > s.contracted_power_p1 ? 'text-destructive font-semibold' : ''}`}>
                          {fmtPower(s.max_demand_p1)}
                        </span>
                        <span className="font-mono text-xs">{fmtPower(s.contracted_power_p2)}</span>
                        <span className={`font-mono text-xs ${s.max_demand_p2 && s.contracted_power_p2 && s.max_demand_p2 > s.contracted_power_p2 ? 'text-destructive font-semibold' : ''}`}>
                          {fmtPower(s.max_demand_p2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default ElectricalPotenciaPanel;
