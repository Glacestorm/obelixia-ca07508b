import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Zap, Search, RefreshCw } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';

interface Props { companyId: string; }

interface SupplyRow {
  id: string;
  case_id: string;
  case_title: string;
  cups: string | null;
  distributor: string | null;
  tariff_access: string | null;
  contracted_power_p1: number | null;
  contracted_power_p2: number | null;
  max_demand_p1: number | null;
  max_demand_p2: number | null;
}

export function ElectricalSuministrosPanel({ companyId }: Props) {
  const [supplies, setSupplies] = useState<SupplyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, title, cups')
        .eq('company_id', companyId);
      if (!cases || cases.length === 0) { setSupplies([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: supplyData } = await supabase
        .from('energy_supplies')
        .select('*')
        .in('case_id', caseIds);

      const rows: SupplyRow[] = (supplyData || []).map((s: any) => {
        const c = cases.find(cs => cs.id === s.case_id);
        return {
          id: s.id, case_id: s.case_id,
          case_title: c?.title || '—',
          cups: c?.cups || null,
          distributor: s.distributor, tariff_access: s.tariff_access,
          contracted_power_p1: s.contracted_power_p1, contracted_power_p2: s.contracted_power_p2,
          max_demand_p1: s.max_demand_p1, max_demand_p2: s.max_demand_p2,
        };
      });
      setSupplies(rows);
    } catch (err) {
      console.error('[ElectricalSuministrosPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return supplies;
    const s = search.toLowerCase();
    return supplies.filter(r =>
      (r.cups || '').toLowerCase().includes(s) ||
      (r.distributor || '').toLowerCase().includes(s) ||
      r.case_title.toLowerCase().includes(s)
    );
  }, [supplies, search]);

  const fmtPower = (v: number | null) => v != null ? `${v} kW` : '—';

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Suministros & CUPS" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Suministros & CUPS
          </h2>
          <p className="text-sm text-muted-foreground">{supplies.length} puntos de suministro registrados.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por CUPS, distribuidora..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Puntos de suministro</CardTitle>
          <CardDescription>Datos de suministro vinculados a expedientes activos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-7 gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Expediente</span><span>CUPS</span><span>Distribuidora</span>
                <span>Tarifa acceso</span><span>Pot. P1</span><span>Pot. P2</span><span>Máx. P1</span>
              </div>
              {loading && supplies.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando suministros...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay suministros registrados. Añade datos de suministro desde un expediente.
                </div>
              ) : filtered.map(s => (
                <div key={s.id} className="grid grid-cols-7 gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors text-sm items-center">
                  <span className="font-medium truncate">{s.case_title}</span>
                  <span className="text-muted-foreground font-mono text-xs truncate">{s.cups || '—'}</span>
                  <span className="truncate">{s.distributor || '—'}</span>
                  <Badge variant="outline" className="text-[10px] w-fit">{s.tariff_access || '—'}</Badge>
                  <span className="font-mono text-xs">{fmtPower(s.contracted_power_p1)}</span>
                  <span className="font-mono text-xs">{fmtPower(s.contracted_power_p2)}</span>
                  <span className="font-mono text-xs">{fmtPower(s.max_demand_p1)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalSuministrosPanel;
