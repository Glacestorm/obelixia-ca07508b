import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

interface InvoiceRow {
  id: string;
  case_title: string;
  billing_start: string | null;
  billing_end: string | null;
  days: number | null;
  consumption_total_kwh: number | null;
  energy_cost: number | null;
  power_cost: number | null;
  total_amount: number | null;
  is_validated: boolean | null;
}

export function ElectricalFacturasPanel({ companyId }: Props) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases').select('id, title').eq('company_id', companyId);
      if (!cases || cases.length === 0) { setInvoices([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: invData } = await supabase
        .from('energy_invoices').select('*').in('case_id', caseIds).order('billing_start', { ascending: false });

      const rows: InvoiceRow[] = (invData || []).map((inv: any) => ({
        id: inv.id,
        case_title: cases.find(c => c.id === inv.case_id)?.title || '—',
        billing_start: inv.billing_start, billing_end: inv.billing_end, days: inv.days,
        consumption_total_kwh: inv.consumption_total_kwh,
        energy_cost: inv.energy_cost, power_cost: inv.power_cost,
        total_amount: inv.total_amount, is_validated: inv.is_validated,
      }));
      setInvoices(rows);
    } catch (err) {
      console.error('[ElectricalFacturasPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const s = search.toLowerCase();
    return invoices.filter(r => r.case_title.toLowerCase().includes(s));
  }, [invoices, search]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yy', { locale: es }); } catch { return '—'; }
  };
  const fmtNum = (v: number | null) => v != null ? v.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—';

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Facturas" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" /> Facturas Eléctricas
          </h2>
          <p className="text-sm text-muted-foreground">{invoices.length} facturas registradas en todos los expedientes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por expediente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Facturas registradas</CardTitle>
          <CardDescription>Vista global de todas las facturas de la empresa</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.5fr_0.8fr_0.7fr_0.7fr_0.8fr_0.4fr] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Expediente</span><span>Inicio</span><span>Fin</span><span>Días</span>
                <span>kWh total</span><span>€ Energía</span><span>€ Potencia</span><span>Total</span><span>Valid.</span>
              </div>
              {loading && invoices.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando facturas...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay facturas registradas. Añade facturas desde un expediente.
                </div>
              ) : filtered.map(inv => (
                <div key={inv.id} className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.5fr_0.8fr_0.7fr_0.7fr_0.8fr_0.4fr] gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 text-sm items-center">
                  <span className="font-medium truncate">{inv.case_title}</span>
                  <span className="text-muted-foreground">{fmtDate(inv.billing_start)}</span>
                  <span className="text-muted-foreground">{fmtDate(inv.billing_end)}</span>
                  <span className="text-muted-foreground">{inv.days ?? '—'}</span>
                  <span className="font-mono text-xs">{fmtNum(inv.consumption_total_kwh)}</span>
                  <span>{fmtNum(inv.energy_cost)} €</span>
                  <span>{fmtNum(inv.power_cost)} €</span>
                  <span className="font-semibold">{fmtNum(inv.total_amount)} €</span>
                  <span>{inv.is_validated ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalFacturasPanel;
