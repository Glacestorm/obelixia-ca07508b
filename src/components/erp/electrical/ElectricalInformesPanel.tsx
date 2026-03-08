import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileBarChart, Search, RefreshCw } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

interface ReportRow {
  id: string;
  case_title: string;
  report_type: string | null;
  version: number | null;
  summary: string | null;
  pdf_url: string | null;
  created_at: string;
}

export function ElectricalInformesPanel({ companyId }: Props) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases').select('id, title').eq('company_id', companyId);
      if (!cases || cases.length === 0) { setReports([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: reportData } = await supabase
        .from('energy_reports').select('*').in('case_id', caseIds).order('created_at', { ascending: false });

      const rows: ReportRow[] = (reportData || []).map((r: any) => ({
        id: r.id,
        case_title: cases.find(c => c.id === r.case_id)?.title || '—',
        report_type: r.report_type, version: r.version,
        summary: r.summary, pdf_url: r.pdf_url, created_at: r.created_at,
      }));
      setReports(rows);
    } catch (err) {
      console.error('[ElectricalInformesPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return reports;
    const s = search.toLowerCase();
    return reports.filter(r => r.case_title.toLowerCase().includes(s) || (r.summary || '').toLowerCase().includes(s));
  }, [reports, search]);

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }); } catch { return '—'; }
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Informes" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-rose-500" /> Informes de Optimización
          </h2>
          <p className="text-sm text-muted-foreground">{reports.length} informes generados.</p>
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
          <CardTitle className="text-base">Informes generados</CardTitle>
          <CardDescription>Documentos PDF de optimización</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[1.5fr_0.8fr_0.5fr_2fr_1fr] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Expediente</span><span>Tipo</span><span>Versión</span><span>Resumen</span><span>Fecha</span>
              </div>
              {loading && reports.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando informes...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay informes generados. Genera informes desde la pestaña de informe de un expediente.
                </div>
              ) : filtered.map(r => (
                <div key={r.id} className="grid grid-cols-[1.5fr_0.8fr_0.5fr_2fr_1fr] gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 text-sm items-center">
                  <span className="font-medium truncate">{r.case_title}</span>
                  <Badge variant="outline" className="text-[10px] w-fit">{r.report_type || 'general'}</Badge>
                  <span className="font-mono text-xs">v{r.version || 1}</span>
                  <span className="text-muted-foreground truncate text-xs">{r.summary || '—'}</span>
                  <span className="text-muted-foreground text-xs">{fmtDate(r.created_at)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalInformesPanel;
