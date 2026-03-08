import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileSignature, Search, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

interface ContractRow {
  id: string;
  case_title: string;
  supplier: string | null;
  tariff_name: string | null;
  start_date: string | null;
  end_date: string | null;
  has_permanence: boolean | null;
  has_renewal: boolean | null;
  signed_document_url: string | null;
}

export function ElectricalContratosPanel({ companyId }: Props) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases').select('id, title').eq('company_id', companyId);
      if (!cases || cases.length === 0) { setContracts([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: contractData } = await supabase
        .from('energy_contracts').select('*').in('case_id', caseIds).order('end_date', { ascending: true });

      const rows: ContractRow[] = (contractData || []).map((c: any) => ({
        id: c.id,
        case_title: cases.find(cs => cs.id === c.case_id)?.title || '—',
        supplier: c.supplier, tariff_name: c.tariff_name,
        start_date: c.start_date, end_date: c.end_date,
        has_permanence: c.has_permanence, has_renewal: c.has_renewal,
        signed_document_url: c.signed_document_url,
      }));
      setContracts(rows);
    } catch (err) {
      console.error('[ElectricalContratosPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return contracts;
    const s = search.toLowerCase();
    return contracts.filter(r =>
      r.case_title.toLowerCase().includes(s) ||
      (r.supplier || '').toLowerCase().includes(s)
    );
  }, [contracts, search]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Contratos" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-500" /> Contratos de Suministro
          </h2>
          <p className="text-sm text-muted-foreground">{contracts.length} contratos registrados.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar contrato..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contratos activos</CardTitle>
          <CardDescription>Vista global de contratos de suministro eléctrico</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.4fr] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Expediente</span><span>Comercializadora</span><span>Tarifa</span>
                <span>Inicio</span><span>Fin</span><span>Perm.</span><span>Renov.</span><span>PDF</span>
              </div>
              {loading && contracts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando contratos...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay contratos registrados. Añade contratos desde un expediente.
                </div>
              ) : filtered.map(c => (
                <div key={c.id} className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.4fr] gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 text-sm items-center">
                  <span className="font-medium truncate">{c.case_title}</span>
                  <span className="truncate">{c.supplier || '—'}</span>
                  <span className="truncate text-muted-foreground">{c.tariff_name || '—'}</span>
                  <span className="text-muted-foreground">{fmtDate(c.start_date)}</span>
                  <span className="text-muted-foreground">{fmtDate(c.end_date)}</span>
                  <span>{c.has_permanence ? <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />Sí</Badge> : <span className="text-muted-foreground text-xs">No</span>}</span>
                  <span className="text-xs text-muted-foreground">{c.has_renewal ? 'Sí' : 'No'}</span>
                  <span>
                    {c.signed_document_url ? (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(c.signed_document_url!, '_blank')}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalContratosPanel;
