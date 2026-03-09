/**
 * ClientPortalView - Energy 360 read-only portal for end clients
 * Access by secure token + case-scoped data only
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Loader2, Shield, Clock, Layers, Zap, Flame, Sun, AlertTriangle,
  CheckCircle2, FileText, FileSignature, TrendingDown, Activity, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PortalCase {
  id: string;
  title: string;
  status: string;
  cups: string | null;
  address: string | null;
  current_supplier: string | null;
  contract_end_date: string | null;
  energy_type: string;
  estimated_annual_savings: number | null;
  estimated_gas_savings: number | null;
  estimated_solar_savings: number | null;
  validated_annual_savings: number | null;
  validated_gas_savings: number | null;
  validated_solar_savings: number | null;
}

interface PortalContract {
  id: string;
  supplier: string | null;
  tariff_name: string | null;
  start_date: string | null;
  end_date: string | null;
  has_renewal: boolean | null;
  has_permanence: boolean | null;
  early_exit_penalty_text: string | null;
  notes: string | null;
  energy_type: string;
  gas_tariff: string | null;
  gas_annual_consumption_kwh: number | null;
  distributor: string | null;
  updated_at: string;
}

interface PortalInvoice {
  id: string;
  billing_start: string | null;
  billing_end: string | null;
  days: number | null;
  consumption_total_kwh: number | null;
  energy_cost: number | null;
  power_cost: number | null;
  total_amount: number | null;
  is_validated: boolean | null;
  energy_type: string;
  gas_consumption_kwh: number | null;
  gas_fixed_cost: number | null;
  gas_variable_cost: number | null;
  created_at: string;
}

interface PortalNotification {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  created_at: string;
  energy_type: string | null;
}

interface PortalMarketPrice {
  id: string;
  price_date: string;
  hour: number;
  price_eur_mwh: number | null;
  price_eur_kwh: number | null;
  market_source: string;
}

interface SavingsLine {
  line: 'electricidad' | 'gas' | 'solar';
  estimated: number;
  validated: number;
}

interface PortalData {
  case: PortalCase | null;
  workflowStatus: string | null;
  workflowChangedAt: string | null;
  expired: boolean;
  clientName: string | null;
  proposals: Array<Record<string, any>>;
  solarInstallations: Array<Record<string, any>>;
  contracts: PortalContract[];
  invoices: PortalInvoice[];
  alerts: PortalNotification[];
  marketPrices: PortalMarketPrice[];
  savingsLines: SavingsLine[];
  gasSummary: {
    contracts_count: number;
    invoices_count: number;
    total_consumption_kwh: number;
    total_cost_eur: number;
    avg_cost_eur_kwh: number | null;
  };
  tokenTrace: {
    created_at: string;
    expires_at: string;
    last_accessed_at: string | null;
  };
}

const WORKFLOW_LABELS: Record<string, string> = {
  pendiente_propuesta: 'Pendiente de propuesta',
  propuesta_enviada: 'Propuesta enviada',
  propuesta_aceptada: 'Propuesta aceptada',
  documentacion_completa: 'Documentación completa',
  enviada_comercializadora: 'Enviada a comercializadora',
  en_validacion: 'En validación',
  subsanacion_requerida: 'Subsanación requerida',
  cambio_confirmado: 'Cambio confirmado',
  primera_factura_recibida: 'Primera factura recibida',
  cerrado: 'Cerrado',
};

const lineLabels: Record<string, string> = {
  electricidad: 'Electricidad',
  gas: 'Gas',
  solar: 'Solar',
};

export function ClientPortalView() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resumen');

  const loadPortalData = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal_token');

    if (!token) {
      setError('Token de acceso no proporcionado. Revisa el enlace que te han enviado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('energy-client-portal', {
        body: { portalToken: token },
      });

      if (fnError) throw fnError;
      if (!fnData?.success) {
        setError(fnData?.error || 'No se pudo validar el acceso al portal.');
        setLoading(false);
        return;
      }

      setData(fnData.data as PortalData);
    } catch (err) {
      console.error('[ClientPortalView] loadPortalData error:', err);
      setError('Error al cargar el portal. Intenta recargar o contacta con tu consultor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'dd/MM/yyyy', { locale: es });
    } catch {
      return '—';
    }
  };

  const fmtDateTime = (d: string | null) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return '—';
    }
  };

  const fmtCurrency = (v: number | null) =>
    v != null ? `${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €` : '—';

  const fmtNumber = (v: number | null) =>
    v != null ? v.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—';

  const marketDaily = useMemo(() => {
    if (!data?.marketPrices?.length) return [];
    const grouped: Record<string, number[]> = {};

    for (const p of data.marketPrices) {
      if (p.price_eur_mwh == null) continue;
      if (!grouped[p.price_date]) grouped[p.price_date] = [];
      grouped[p.price_date].push(p.price_eur_mwh);
    }

    return Object.entries(grouped)
      .map(([date, prices]) => ({
        date,
        avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        min: Math.round(Math.min(...prices) * 100) / 100,
        max: Math.round(Math.max(...prices) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.marketPrices]);

  const gasTrend = useMemo(() => {
    if (!data?.invoices?.length) return [];

    return data.invoices
      .filter(i => i.energy_type === 'gas' || i.gas_consumption_kwh != null || i.gas_fixed_cost != null || i.gas_variable_cost != null)
      .filter(i => i.billing_start)
      .map(i => ({
        period: i.billing_start ? format(new Date(i.billing_start), 'MMM yy', { locale: es }) : '—',
        consumo: i.gas_consumption_kwh || 0,
        coste: i.total_amount || 0,
      }))
      .reverse();
  }, [data?.invoices]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando portal del cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md border-destructive/50">
          <CardContent className="py-8 text-center space-y-3">
            <Shield className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Acceso no disponible</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={loadPortalData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center space-y-2">
            <Clock className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-lg font-semibold">Enlace caducado</h2>
            <p className="text-sm text-muted-foreground">
              {data.clientName ? `Hola ${data.clientName}, ` : ''}este enlace ha expirado. Contacta con tu consultor para recibir uno nuevo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.case) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No se encontró información de este expediente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = data.case;
  const estimatedTotal = data.savingsLines.reduce((acc, item) => acc + (item.estimated || 0), 0);
  const validatedTotal = data.savingsLines.reduce((acc, item) => acc + (item.validated || 0), 0);
  const marketApplicable = ['electricity', 'mixed', 'solar'].includes(c.energy_type);

  const savingsBreakdown = data.savingsLines
    .filter(s => s.estimated > 0)
    .map(s => ({ name: lineLabels[s.line], value: s.estimated }));

  const energyIcon = c.energy_type === 'gas' ? Flame : c.energy_type === 'solar' ? Sun : c.energy_type === 'mixed' ? Layers : Zap;
  const EnergyIcon = energyIcon;

  const marketStats = marketDaily.length
    ? {
        avg: Math.round((marketDaily.reduce((acc, d) => acc + d.avg, 0) / marketDaily.length) * 100) / 100,
        min: Math.min(...marketDaily.map(d => d.min)),
        max: Math.max(...marketDaily.map(d => d.max)),
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Portal del Cliente · Energía 360</h1>
            {data.clientName && <p className="text-muted-foreground">Hola, {data.clientName}</p>}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <EnergyIcon className="h-5 w-5 text-primary" />
                {c.title}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Ahorro estimado</p><p className="text-lg font-bold">{fmtCurrency(estimatedTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Ahorro validado</p><p className="text-lg font-bold">{fmtCurrency(validatedTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Contratos</p><p className="text-lg font-bold">{data.contracts.length}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Facturas</p><p className="text-lg font-bold">{data.invoices.length}</p></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="ahorro" className="text-xs">Ahorro</TabsTrigger>
            <TabsTrigger value="contratos" className="text-xs">Contratos</TabsTrigger>
            <TabsTrigger value="facturas" className="text-xs">Facturas</TabsTrigger>
            <TabsTrigger value="gas" className="text-xs">Gas</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs">Alertas</TabsTrigger>
            <TabsTrigger value="mercado" className="text-xs">Precio luz</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumen del expediente</CardTitle>
                <CardDescription>
                  Información en solo lectura por expediente y acceso seguro por token.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Propuestas</p>
                  <p className="text-base font-semibold">{data.proposals.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Último cambio de estado</p>
                  <p className="text-base font-semibold">{fmtDate(data.workflowChangedAt)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Tipo energético</p>
                  <p className="text-base font-semibold capitalize">{c.energy_type}</p>
                </div>
              </CardContent>
            </Card>

            {savingsBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de ahorro estimado</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={savingsBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={3}
                        label={({ name, value }) => `${name}: ${Math.round(value)}€`}
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--secondary))" />
                        <Cell fill="hsl(var(--accent))" />
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ahorro" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  Ahorro por línea energética
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.savingsLines.every(item => item.estimated === 0 && item.validated === 0) ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Sin datos de ahorro para este expediente.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.savingsLines.map(s => ({
                      linea: lineLabels[s.line],
                      estimado: s.estimated,
                      validado: s.validated,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="linea" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                      <Bar dataKey="estimado" name="Estimado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="validado" name="Validado" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contratos" className="mt-4 space-y-3">
            {data.contracts.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay contratos cargados en este expediente.</CardContent></Card>
            ) : data.contracts.map(contract => (
              <Card key={contract.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-primary" />
                      <span className="font-medium">{contract.supplier || 'Sin comercializadora'}</span>
                    </div>
                    <Badge variant="outline" className="capitalize">{contract.energy_type}</Badge>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">Tarifa</span><p>{contract.tariff_name || contract.gas_tariff || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Periodo</span><p>{fmtDate(contract.start_date)} → {fmtDate(contract.end_date)}</p></div>
                    <div><span className="text-xs text-muted-foreground">Distribuidora</span><p>{contract.distributor || '—'}</p></div>
                  </div>
                  {(contract.has_permanence || contract.has_renewal) && (
                    <div className="flex items-center gap-2 text-xs">
                      {contract.has_renewal && <Badge variant="secondary">Renovación</Badge>}
                      {contract.has_permanence && <Badge variant="destructive">Permanencia</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="facturas" className="mt-4 space-y-3">
            {data.invoices.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay facturas cargadas en este expediente.</CardContent></Card>
            ) : data.invoices.map(invoice => (
              <Card key={invoice.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{fmtDate(invoice.billing_start)} → {fmtDate(invoice.billing_end)}</span>
                      <Badge variant="outline" className="capitalize">{invoice.energy_type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmtCurrency(invoice.total_amount)}</span>
                      {invoice.is_validated ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Badge variant="secondary">Pendiente</Badge>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-2 mt-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">Días</span><p>{invoice.days ?? '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Consumo eléctrico</span><p>{fmtNumber(invoice.consumption_total_kwh)} kWh</p></div>
                    <div><span className="text-xs text-muted-foreground">Consumo gas</span><p>{fmtNumber(invoice.gas_consumption_kwh)} kWh</p></div>
                    <div><span className="text-xs text-muted-foreground">Coste energía</span><p>{fmtCurrency(invoice.energy_cost)}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="gas" className="mt-4 space-y-4">
            {data.gasSummary.contracts_count === 0 && data.gasSummary.invoices_count === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay datos de gas para este expediente.</CardContent></Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Contratos gas</p><p className="text-lg font-bold">{data.gasSummary.contracts_count}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Facturas gas</p><p className="text-lg font-bold">{data.gasSummary.invoices_count}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Consumo gas</p><p className="text-lg font-bold">{fmtNumber(data.gasSummary.total_consumption_kwh)} kWh</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Coste medio</p><p className="text-lg font-bold">{data.gasSummary.avg_cost_eur_kwh != null ? `${data.gasSummary.avg_cost_eur_kwh.toLocaleString('es-ES', { maximumFractionDigits: 4 })} €/kWh` : '—'}</p></CardContent></Card>
                </div>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Evolución consumo y coste gas</CardTitle></CardHeader>
                  <CardContent>
                    {gasTrend.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Sin histórico suficiente de facturas de gas.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={gasTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <Tooltip />
                          <Line yAxisId="left" type="monotone" dataKey="consumo" name="Consumo kWh" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="coste" name="Coste €" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="alertas" className="mt-4 space-y-3">
            {data.alerts.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay alertas relevantes para este expediente.</CardContent></Card>
            ) : data.alerts.map(alert => (
              <Card key={alert.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message || 'Sin detalle adicional'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(alert.created_at)}</p>
                    </div>
                    <Badge variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mercado" className="mt-4 space-y-4">
            {!marketApplicable ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  La evolución del precio de la luz no aplica para este tipo de expediente.
                </CardContent>
              </Card>
            ) : marketDaily.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Sin datos de mercado eléctrico disponibles en este momento.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Media</p><p className="text-lg font-bold">{marketStats?.avg.toLocaleString('es-ES')} €/MWh</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Mínimo</p><p className="text-lg font-bold">{marketStats?.min.toLocaleString('es-ES')} €/MWh</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Máximo</p><p className="text-lg font-bold">{marketStats?.max.toLocaleString('es-ES')} €/MWh</p></CardContent></Card>
                </div>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución diaria del precio de la luz</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={marketDaily.map(d => ({
                        ...d,
                        fecha: format(new Date(d.date), 'dd/MM', { locale: es }),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="fecha" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €/MWh`} />
                        <Line type="monotone" dataKey="avg" name="Media diaria" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trazabilidad de acceso</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Enlace generado</span><p>{fmtDateTime(data.tokenTrace.created_at)}</p></div>
            <div><span className="text-xs text-muted-foreground">Caduca</span><p>{fmtDateTime(data.tokenTrace.expires_at)}</p></div>
            <div><span className="text-xs text-muted-foreground">Último acceso registrado</span><p>{fmtDateTime(data.tokenTrace.last_accessed_at)}</p></div>
          </CardContent>
        </Card>

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Acceso seguro por token · Solo lectura · Separación por expediente</p>
        </div>
      </div>
    </div>
  );
}

export default ClientPortalView;
