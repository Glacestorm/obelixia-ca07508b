import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Lightbulb, Search, RefreshCw } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';

interface Props { companyId: string; }

interface RecRow {
  id: string;
  case_title: string;
  recommended_supplier: string | null;
  recommended_tariff: string | null;
  recommended_power_p1: number | null;
  recommended_power_p2: number | null;
  monthly_savings_estimate: number | null;
  annual_savings_estimate: number | null;
  risk_level: string | null;
  confidence_score: number | null;
}

const RISK_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  low: { label: 'Bajo', variant: 'default' },
  medium: { label: 'Medio', variant: 'secondary' },
  high: { label: 'Alto', variant: 'destructive' },
};

export function ElectricalRecomendacionesPanel({ companyId }: Props) {
  const [recs, setRecs] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cases } = await supabase
        .from('energy_cases').select('id, title').eq('company_id', companyId);
      if (!cases || cases.length === 0) { setRecs([]); setLoading(false); return; }

      const caseIds = cases.map(c => c.id);
      const { data: recData } = await supabase
        .from('energy_recommendations').select('*').in('case_id', caseIds);

      const rows: RecRow[] = (recData || []).map((r: any) => ({
        id: r.id,
        case_title: cases.find(c => c.id === r.case_id)?.title || '—',
        recommended_supplier: r.recommended_supplier,
        recommended_tariff: r.recommended_tariff,
        recommended_power_p1: r.recommended_power_p1,
        recommended_power_p2: r.recommended_power_p2,
        monthly_savings_estimate: r.monthly_savings_estimate,
        annual_savings_estimate: r.annual_savings_estimate,
        risk_level: r.risk_level,
        confidence_score: r.confidence_score,
      }));
      setRecs(rows);
    } catch (err) {
      console.error('[ElectricalRecomendacionesPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return recs;
    const s = search.toLowerCase();
    return recs.filter(r =>
      r.case_title.toLowerCase().includes(s) ||
      (r.recommended_supplier || '').toLowerCase().includes(s)
    );
  }, [recs, search]);

  const fmtCurrency = (v: number | null) => v != null ? `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €` : '—';
  const fmtPower = (v: number | null) => v != null ? `${v} kW` : '—';

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Recomendaciones" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" /> Recomendaciones
          </h2>
          <p className="text-sm text-muted-foreground">{recs.length} recomendaciones generadas.</p>
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
          <CardTitle className="text-base">Recomendaciones generadas</CardTitle>
          <CardDescription>Resultado del análisis de consumo, potencia y comparación de mercado</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_0.6fr_0.6fr_0.8fr_0.6fr_0.5fr] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Expediente</span><span>Comercializadora</span><span>Tarifa</span>
                <span>Pot. P1</span><span>Pot. P2</span><span>Ahorro/mes</span><span>Riesgo</span><span>Conf.</span>
              </div>
              {loading && recs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Cargando recomendaciones...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No hay recomendaciones. Genera recomendaciones desde el análisis de un expediente.
                </div>
              ) : filtered.map(r => {
                const riskInfo = RISK_LABELS[r.risk_level || ''] || { label: r.risk_level || '—', variant: 'secondary' as const };
                return (
                  <div key={r.id} className="grid grid-cols-[1.5fr_1fr_1fr_0.6fr_0.6fr_0.8fr_0.6fr_0.5fr] gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 text-sm items-center">
                    <span className="font-medium truncate">{r.case_title}</span>
                    <span className="truncate">{r.recommended_supplier || '—'}</span>
                    <span className="truncate text-muted-foreground">{r.recommended_tariff || '—'}</span>
                    <span className="font-mono text-xs">{fmtPower(r.recommended_power_p1)}</span>
                    <span className="font-mono text-xs">{fmtPower(r.recommended_power_p2)}</span>
                    <span className="font-semibold text-emerald-600">{fmtCurrency(r.monthly_savings_estimate)}</span>
                    <Badge variant={riskInfo.variant} className="text-[10px] w-fit">{riskInfo.label}</Badge>
                    <span className="font-mono text-xs">{r.confidence_score != null ? `${r.confidence_score}%` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalRecomendacionesPanel;
