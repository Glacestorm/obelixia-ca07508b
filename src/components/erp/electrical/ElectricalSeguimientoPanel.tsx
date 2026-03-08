import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, RefreshCw, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

interface TrackingOverview {
  case_id: string;
  case_title: string;
  cups: string | null;
  closure_status: string;
  observed_real_savings: number | null;
  proposal_sent_date: string | null;
  supplier_change_date: string | null;
}

const CLOSURE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'En curso', variant: 'outline' },
  success: { label: 'Éxito', variant: 'default' },
  partial: { label: 'Parcial', variant: 'secondary' },
  failed: { label: 'Fallido', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

export function ElectricalSeguimientoPanel({ companyId }: Props) {
  const [trackings, setTrackings] = useState<TrackingOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, totalSavings: 0, avgPrecision: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch cases with tracking data
      const { data: cases } = await supabase
        .from('energy_cases')
        .select('id, title, cups, estimated_monthly_savings')
        .eq('company_id', companyId);

      if (!cases || cases.length === 0) {
        setTrackings([]);
        setLoading(false);
        return;
      }

      const caseIds = cases.map(c => c.id);
      const { data: trackingData } = await supabase
        .from('energy_tracking')
        .select('*')
        .in('case_id', caseIds);

      const items: TrackingOverview[] = (trackingData || []).map((t: any) => {
        const c = cases.find(cs => cs.id === t.case_id);
        return {
          case_id: t.case_id,
          case_title: c?.title || '—',
          cups: c?.cups || null,
          closure_status: t.closure_status || 'open',
          observed_real_savings: t.observed_real_savings,
          proposal_sent_date: t.proposal_sent_date,
          supplier_change_date: t.supplier_change_date,
        };
      });

      setTrackings(items);

      const totalSavings = items.reduce((s, i) => s + (i.observed_real_savings || 0), 0);

      // Calculate real precision: ratio of observed savings vs estimated
      let avgPrecision = 0;
      const withBoth = items.filter(i => {
        const c = cases.find(cs => cs.id === i.case_id);
        return i.observed_real_savings && c?.estimated_monthly_savings;
      });
      if (withBoth.length > 0) {
        const totalPrecision = withBoth.reduce((s, i) => {
          const c = cases.find(cs => cs.id === i.case_id);
          const estimated = c?.estimated_monthly_savings || 1;
          const ratio = Math.min((i.observed_real_savings || 0) / estimated, 1.5);
          return s + ratio * 100;
        }, 0);
        avgPrecision = Math.round(totalPrecision / withBoth.length);
      }

      setStats({
        total: items.length,
        totalSavings,
        avgPrecision,
      });
    } catch (err) {
      console.error('[ElectricalSeguimientoPanel] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Seguimiento" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Seguimiento Posterior
          </h2>
          <p className="text-sm text-muted-foreground">Control de implementación y verificación de ahorros reales vs estimados.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">En seguimiento</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Ahorro verificado</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.totalSavings.toLocaleString('es-ES')} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><CheckCircle2 className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Precisión</p>
                <p className="text-2xl font-bold">{stats.avgPrecision}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expedientes en seguimiento</CardTitle>
          <CardDescription>Verificación de ahorro real tras la implementación de cambios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Expediente</span>
              <span>CUPS</span>
              <span>Propuesta</span>
              <span>Cambio</span>
              <span>Ahorro real</span>
              <span>Estado</span>
            </div>
            {trackings.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hay expedientes en fase de seguimiento.
              </div>
            ) : (
              trackings.map(t => {
                const closureInfo = CLOSURE_LABELS[t.closure_status] || CLOSURE_LABELS.open;
                return (
                  <div key={t.case_id} className="grid grid-cols-6 gap-4 p-3 border-b last:border-0 text-sm items-center hover:bg-muted/30 transition-colors">
                    <span className="font-medium truncate">{t.case_title}</span>
                    <span className="text-muted-foreground font-mono text-xs truncate">{t.cups || '—'}</span>
                    <span className="text-muted-foreground">{fmtDate(t.proposal_sent_date)}</span>
                    <span className="text-muted-foreground">{fmtDate(t.supplier_change_date)}</span>
                    <span className="font-semibold text-emerald-600">
                      {t.observed_real_savings ? `${t.observed_real_savings.toLocaleString('es-ES')} €/mes` : '—'}
                    </span>
                    <Badge variant={closureInfo.variant} className="text-[10px] w-fit">{closureInfo.label}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ElectricalSeguimientoPanel;
