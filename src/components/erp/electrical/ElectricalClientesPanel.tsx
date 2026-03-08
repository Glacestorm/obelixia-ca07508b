import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, Search, RefreshCw } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';

interface Props { companyId: string; }

interface ClientRow {
  name: string;
  customerId: string | null;
  casesCount: number;
  cups: string[];
  statuses: string[];
}

export function ElectricalClientesPanel({ companyId }: Props) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_cases')
        .select('id, title, customer_id, current_supplier, cups, address, status')
        .eq('company_id', companyId);
      if (error) throw error;

      const grouped = new Map<string, ClientRow>();
      (data || []).forEach((c: any) => {
        const key = c.customer_id || c.current_supplier || c.title || 'Sin cliente';
        const existing = grouped.get(key);
        if (existing) {
          existing.casesCount++;
          if (c.cups && !existing.cups.includes(c.cups)) existing.cups.push(c.cups);
          if (!existing.statuses.includes(c.status)) existing.statuses.push(c.status);
        } else {
          grouped.set(key, {
            name: c.customer_id || c.current_supplier || c.title,
            customerId: c.customer_id,
            casesCount: 1,
            cups: c.cups ? [c.cups] : [],
            statuses: [c.status],
          });
        }
      });
      setClients(Array.from(grouped.values()));
    } catch (err) {
      console.error('[ElectricalClientesPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.cups.some(cup => cup.toLowerCase().includes(s))
    );
  }, [clients, search]);

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Clientes Energéticos" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Clientes Energéticos
          </h2>
          <p className="text-sm text-muted-foreground">
            {clients.length} clientes extraídos de los expedientes activos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchClients} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente o CUPS..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Directorio de clientes</CardTitle>
          <CardDescription>Agrupación automática por cliente/comercializadora desde expedientes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[1.5fr_0.6fr_1.2fr_1fr] gap-4 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Cliente / Razón social</span>
                <span>Expedientes</span>
                <span>CUPS asociados</span>
                <span>Estados</span>
              </div>
              {loading && filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando clientes...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay clientes energéticos vinculados a expedientes.
                </div>
              ) : filtered.map((c, i) => (
                <div key={i} className="grid grid-cols-[1.5fr_0.6fr_1.2fr_1fr] gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors text-sm items-center">
                  <span className="font-medium">{c.name}</span>
                  <span><Badge variant="secondary" className="text-xs">{c.casesCount}</Badge></span>
                  <span className="text-muted-foreground font-mono text-xs truncate">{c.cups.length > 0 ? c.cups.join(', ') : '—'}</span>
                  <div className="flex flex-wrap gap-1">
                    {c.statuses.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalClientesPanel;
