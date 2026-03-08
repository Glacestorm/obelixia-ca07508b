import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

interface InvoiceData {
  id: string;
  case_title: string;
  billing_start: string | null;
  consumption_p1_kwh: number | null;
  consumption_p2_kwh: number | null;
  consumption_p3_kwh: number | null;
  consumption_total_kwh: number | null;
  total_amount: number | null;
}

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export function ElectricalConsumoPanel({ companyId }: Props) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases').select('id, title').eq('company_id', companyId);
      if (!cases || cases.length === 0) { setInvoices([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: invData } = await supabase
        .from('energy_invoices').select('*').in('case_id', caseIds).order('billing_start', { ascending: true });

      const rows: InvoiceData[] = (invData || []).map((inv: any) => ({
        id: inv.id,
        case_title: cases.find(c => c.id === inv.case_id)?.title || '—',
        billing_start: inv.billing_start,
        consumption_p1_kwh: inv.consumption_p1_kwh, consumption_p2_kwh: inv.consumption_p2_kwh,
        consumption_p3_kwh: inv.consumption_p3_kwh, consumption_total_kwh: inv.consumption_total_kwh,
        total_amount: inv.total_amount,
      }));
      setInvoices(rows);
    } catch (err) {
      console.error('[ElectricalConsumoPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pieData = useMemo(() => {
    const totalP1 = invoices.reduce((s, i) => s + (i.consumption_p1_kwh || 0), 0);
    const totalP2 = invoices.reduce((s, i) => s + (i.consumption_p2_kwh || 0), 0);
    const totalP3 = invoices.reduce((s, i) => s + (i.consumption_p3_kwh || 0), 0);
    if (totalP1 + totalP2 + totalP3 === 0) return [];
    return [
      { name: 'P1 (Punta)', value: Math.round(totalP1) },
      { name: 'P2 (Llano)', value: Math.round(totalP2) },
      { name: 'P3 (Valle)', value: Math.round(totalP3) },
    ];
  }, [invoices]);

  const barData = useMemo(() => {
    return invoices
      .filter(i => i.billing_start)
      .map(i => ({
        periodo: i.billing_start ? format(new Date(i.billing_start), 'MMM yy', { locale: es }) : '—',
        kWh: i.consumption_total_kwh || 0,
      }));
  }, [invoices]);

  const fmtNum = (v: number | null) => v != null ? v.toLocaleString('es-ES', { maximumFractionDigits: 0 }) : '—';
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'MMM yyyy', { locale: es }); } catch { return '—'; }
  };
  const avgPriceKwh = (total: number | null, kwh: number | null) => {
    if (!total || !kwh || kwh === 0) return '—';
    return (total / kwh).toFixed(4);
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Análisis de Consumo" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" /> Análisis de Consumo
          </h2>
          <p className="text-sm text-muted-foreground">Consumo desglosado por periodos tarifarios desde {invoices.length} facturas.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay facturas registradas. Añade facturas desde un expediente para ver análisis de consumo.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribución por periodos</CardTitle>
                <CardDescription>Porcentaje acumulado P1/P2/P3</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sin desglose P1/P2/P3</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolución mensual</CardTitle>
                <CardDescription>Consumo total (kWh) por periodo de facturación</CardDescription>
              </CardHeader>
              <CardContent>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="periodo" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} kWh`} />
                      <Bar dataKey="kWh" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de evolución</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalle de facturas analizadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-7 gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                    <span>Expediente</span><span>Periodo</span><span>kWh P1</span><span>kWh P2</span>
                    <span>kWh P3</span><span>Total kWh</span><span>€/kWh medio</span>
                  </div>
                  {invoices.map(inv => (
                    <div key={inv.id} className="grid grid-cols-7 gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 text-sm items-center">
                      <span className="font-medium truncate">{inv.case_title}</span>
                      <span className="text-muted-foreground">{fmtDate(inv.billing_start)}</span>
                      <span className="font-mono text-xs">{fmtNum(inv.consumption_p1_kwh)}</span>
                      <span className="font-mono text-xs">{fmtNum(inv.consumption_p2_kwh)}</span>
                      <span className="font-mono text-xs">{fmtNum(inv.consumption_p3_kwh)}</span>
                      <span className="font-mono text-xs font-semibold">{fmtNum(inv.consumption_total_kwh)}</span>
                      <span className="font-mono text-xs">{avgPriceKwh(inv.total_amount, inv.consumption_total_kwh)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default ElectricalConsumoPanel;
