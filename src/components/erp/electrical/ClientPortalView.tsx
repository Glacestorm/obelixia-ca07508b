/**
 * ClientPortalView - Energy 360 read-only portal for end clients
 * Shows multi-energy data: case status, proposals, savings by type, contracts, market prices
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Zap, FileText, TrendingDown, CheckCircle2, Clock, Shield, AlertTriangle,
  Loader2, Flame, Sun, Layers, Target, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PortalData {
  case: {
    title: string; status: string; cups: string | null; address: string | null;
    current_supplier: string | null; estimated_annual_savings: number | null;
    estimated_gas_savings: number | null; estimated_solar_savings: number | null;
    validated_annual_savings: number | null; validated_gas_savings: number | null;
    validated_solar_savings: number | null;
    contract_end_date: string | null; energy_type: string;
  } | null;
  proposals: any[];
  workflowStatus: string | null;
  expired: boolean;
  clientName: string | null;
  solarInstallations: any[];
}

const WORKFLOW_LABELS: Record<string, string> = {
  pendiente_propuesta: 'Pendiente de propuesta', propuesta_enviada: 'Propuesta enviada',
  propuesta_aceptada: 'Propuesta aceptada', documentacion_completa: 'Documentación completa',
  enviada_comercializadora: 'Enviada a comercializadora', en_validacion: 'En validación',
  subsanacion_requerida: 'Subsanación requerida', cambio_confirmado: 'Cambio confirmado',
  primera_factura_recibida: 'Primera factura recibida', cerrado: 'Cerrado',
};

const CHART_COLORS = ['hsl(45, 93%, 47%)', 'hsl(217, 91%, 60%)', 'hsl(25, 95%, 53%)'];

export function ClientPortalView() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resumen');

  const loadPortalData = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal_token');
    if (!token) { setError('Token de acceso no proporcionado'); setLoading(false); return; }

    try {
      const { data: tokenData, error: tokenErr } = await supabase
        .from('energy_client_portal_tokens').select('*').eq('token', token).eq('is_active', true).single();

      if (tokenErr || !tokenData) { setError('Enlace inválido o revocado'); setLoading(false); return; }
      if (new Date(tokenData.expires_at) < new Date()) {
        setData({ case: null, proposals: [], workflowStatus: null, expired: true, clientName: tokenData.client_name, solarInstallations: [] });
        setLoading(false); return;
      }

      await supabase.from('energy_client_portal_tokens').update({ last_accessed_at: new Date().toISOString() } as any).eq('id', tokenData.id);

      const [caseRes, proposalsRes, wfRes, solarRes] = await Promise.all([
        supabase.from('energy_cases').select('title, status, cups, address, current_supplier, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings, contract_end_date, energy_type').eq('id', tokenData.case_id).single(),
        supabase.from('energy_proposals').select('*').eq('case_id', tokenData.case_id).in('status', ['issued', 'sent', 'accepted']).order('version', { ascending: false }),
        supabase.from('energy_workflow_states').select('status').eq('case_id', tokenData.case_id).order('changed_at', { ascending: false }).limit(1),
        supabase.from('energy_solar_installations').select('installed_power_kwp, modality, has_battery, annual_self_consumption_kwh, annual_surplus_kwh, annual_compensation_eur, grid_dependency_pct, monthly_estimated_savings, monthly_real_savings').eq('case_id', tokenData.case_id),
      ]);

      setData({
        case: caseRes.data || null,
        proposals: proposalsRes.data || [],
        workflowStatus: wfRes.data?.[0]?.status || null,
        expired: false,
        clientName: tokenData.client_name,
        solarInstallations: solarRes.data || [],
      });
    } catch (err) {
      setError('Error al cargar datos del portal');
      console.error('[ClientPortalView] error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPortalData(); }, [loadPortalData]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };
  const fmtCurrency = (v: number | null) => v != null ? `${v.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €` : '—';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando portal del cliente...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md border-destructive/50"><CardContent className="py-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-3 text-destructive" />
        <h2 className="text-lg font-semibold mb-1">Acceso no disponible</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </CardContent></Card>
    </div>
  );

  if (data?.expired) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md"><CardContent className="py-8 text-center">
        <Clock className="h-12 w-12 mx-auto mb-3 text-amber-500" />
        <h2 className="text-lg font-semibold mb-1">Enlace caducado</h2>
        <p className="text-sm text-muted-foreground">
          {data.clientName ? `Hola ${data.clientName}, e` : 'E'}ste enlace ha expirado. Contacta con tu consultor.
        </p>
      </CardContent></Card>
    </div>
  );

  if (!data?.case) return null;

  const c = data.case;
  const elecSavings = c.estimated_annual_savings || 0;
  const gasSavings = c.estimated_gas_savings || 0;
  const solarSavings = c.estimated_solar_savings || 0;
  const totalSavings = elecSavings + gasSavings + solarSavings;
  const totalValidated = (c.validated_annual_savings || 0) + (c.validated_gas_savings || 0) + (c.validated_solar_savings || 0);

  const savingsBreakdown = [
    { name: 'Electricidad', value: elecSavings },
    { name: 'Gas', value: gasSavings },
    { name: 'Solar', value: solarSavings },
  ].filter(d => d.value > 0);

  const EnergyIcon = c.energy_type === 'gas' ? Flame : c.energy_type === 'solar' ? Sun : c.energy_type === 'mixed' ? Layers : Zap;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Portal del Cliente · Energía 360</h1>
            {data.clientName && <p className="text-muted-foreground">Hola, {data.clientName}</p>}
          </div>
        </div>

        {/* Case Hero */}
        <Card className="bg-gradient-to-r from-primary/5 via-background to-accent/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <EnergyIcon className="h-5 w-5 text-primary" /> {c.title}
              </CardTitle>
              <Badge variant="secondary">{WORKFLOW_LABELS[data.workflowStatus || ''] || 'Pendiente'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">CUPS</span><p className="font-mono text-xs">{c.cups || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Dirección</span><p className="text-xs">{c.address || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Comercializadora</span><p className="text-xs">{c.current_supplier || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Fin contrato</span><p className="text-xs">{fmtDate(c.contract_end_date)}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Target, label: 'Ahorro total estimado', value: fmtCurrency(totalSavings), color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { icon: CheckCircle2, label: 'Ahorro validado', value: fmtCurrency(totalValidated), color: 'text-green-600', bg: 'bg-green-500/10' },
            { icon: Zap, label: 'Electricidad', value: fmtCurrency(elecSavings), color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { icon: Flame, label: 'Gas', value: fmtCurrency(gasSavings), color: 'text-blue-500', bg: 'bg-blue-500/10' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}><CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p><p className="text-sm font-bold">{kpi.value}</p></div>
                </div>
              </CardContent></Card>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="propuestas" className="text-xs">Propuestas</TabsTrigger>
            {data.solarInstallations.length > 0 && <TabsTrigger value="solar" className="text-xs">Solar</TabsTrigger>}
          </TabsList>

          <TabsContent value="resumen" className="mt-4">
            {savingsBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Desglose del ahorro</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={savingsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={3} label={({ name, value }) => `${name}: ${value.toLocaleString()}€`}>
                        {savingsBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="propuestas" className="mt-4 space-y-3">
            {data.proposals.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Sin propuestas disponibles</CardContent></Card>
            ) : data.proposals.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Propuesta v{p.version}</span>
                    <Badge variant={p.status === 'accepted' ? 'default' : 'secondary'}>
                      {p.status === 'accepted' ? 'Aceptada' : p.status === 'issued' ? 'Emitida' : 'Enviada'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">Tarifa</span><p className="font-medium">{p.recommended_tariff || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Comercializadora</span><p className="font-medium">{p.recommended_supplier || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Coste estimado</span><p>{fmtCurrency(p.estimated_annual_cost)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Ahorro estimado</span><p className="font-semibold text-emerald-600">{fmtCurrency(p.estimated_annual_savings)}</p></div>
                  </div>
                  {p.status === 'accepted' && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-sm text-emerald-700">Aceptada el {fmtDate(p.accepted_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {data.solarInstallations.length > 0 && (
            <TabsContent value="solar" className="mt-4 space-y-3">
              {data.solarInstallations.map((s: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sun className="h-5 w-5 text-orange-400" />
                      <span className="font-semibold">{s.installed_power_kwp} kWp</span>
                      <Badge variant="outline" className="text-xs">{s.modality === 'with_surplus' ? 'Con excedentes' : 'Sin excedentes'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-muted-foreground">Autoconsumo</span><p className="font-medium">{s.annual_self_consumption_kwh?.toFixed(0) || '—'} kWh/año</p></div>
                      <div><span className="text-muted-foreground">Excedentes</span><p className="font-medium">{s.annual_surplus_kwh?.toFixed(0) || '—'} kWh/año</p></div>
                      <div><span className="text-muted-foreground">Compensación</span><p className="font-medium">{s.annual_compensation_eur?.toFixed(0) || '—'} €/año</p></div>
                      <div><span className="text-muted-foreground">Dep. red</span><p className="font-medium">{s.grid_dependency_pct || '—'}%</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Acceso seguro · Solo lectura · Consultoría Energética 360</p>
        </div>
      </div>
    </div>
  );
}

export default ClientPortalView;
