/**
 * ClientPortalView - Energy 360 Multi-Energy read-only portal for end clients
 * Secure token access + case-scoped data with download, solar, gas, contracts
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Shield, Clock, Layers, Zap, Flame, Sun, AlertTriangle,
  CheckCircle2, FileText, FileSignature, TrendingDown, Activity, RefreshCw,
  Download, ExternalLink, BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// === INTERFACES ===
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
  signed_document_url: string | null;
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
  document_url: string | null;
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
  reports: Array<{ id: string; report_type: string | null; version: number | null; pdf_url: string | null; summary: string | null; created_at: string; updated_at: string }>;
  invoiceYoY: Array<{ month: string; current: number; previous: number }> | null;
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

const lineLabels: Record<string, string> = { electricidad: 'Electricidad', gas: 'Gas', solar: 'Solar' };
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];
const LINE_ICONS: Record<string, typeof Zap> = { electricidad: Zap, gas: Flame, solar: Sun };

export function ClientPortalView() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [tabEnteredAt, setTabEnteredAt] = useState<number>(Date.now());

  // === SECTION-LEVEL AUDIT TRACKING ===
  const logPortalEvent = useCallback(async (action: string, details: Record<string, unknown> = {}) => {
    if (!portalToken) return;
    try {
      await supabase.functions.invoke('energy-client-portal', {
        body: { portalToken, action: 'audit', auditAction: action, details },
      });
    } catch { /* silent */ }
  }, [portalToken]);

  // Track tab changes with time spent
  const handleTabChange = useCallback((newTab: string) => {
    const timeSpent = Math.round((Date.now() - tabEnteredAt) / 1000);
    if (timeSpent > 2) {
      logPortalEvent('portal_time_spent', { section: activeTab, seconds: timeSpent });
    }
    logPortalEvent('portal_section_viewed', { section: newTab });
    setTabEnteredAt(Date.now());
    setActiveTab(newTab);
  }, [activeTab, tabEnteredAt, logPortalEvent]);

  const loadPortalData = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal_token');
    setPortalToken(token);

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

  useEffect(() => { loadPortalData(); }, [loadPortalData]);

  // === DOWNLOAD HANDLER ===
  const handleDownload = useCallback(async (filePath: string | null, fileName: string) => {
    if (!filePath || !portalToken) return;
    setDownloading(filePath);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('energy-client-portal', {
        body: { portalToken, action: 'download', filePath },
      });
      if (fnError) throw fnError;
      if (fnData?.signedUrl) {
        const a = document.createElement('a');
        a.href = fnData.signedUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Descarga iniciada');
      } else {
        toast.error('No se pudo generar el enlace de descarga');
      }
    } catch {
      toast.error('Error al descargar el documento');
    } finally {
      setDownloading(null);
    }
  }, [portalToken]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };
  const fmtDateTime = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }); } catch { return '—'; }
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
        date, avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        min: Math.round(Math.min(...prices) * 100) / 100, max: Math.round(Math.max(...prices) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.marketPrices]);

  const gasTrend = useMemo(() => {
    if (!data?.invoices?.length) return [];
    return data.invoices
      .filter(i => i.energy_type === 'gas' || i.gas_consumption_kwh != null)
      .filter(i => i.billing_start)
      .map(i => ({
        period: i.billing_start ? format(new Date(i.billing_start), 'MMM yy', { locale: es }) : '—',
        consumo: i.gas_consumption_kwh || 0, coste: i.total_amount || 0,
      }))
      .reverse();
  }, [data?.invoices]);

  // === LOADING / ERROR / EXPIRED STATES ===
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
            <Button variant="outline" onClick={loadPortalData}><RefreshCw className="h-4 w-4 mr-1" /> Reintentar</Button>
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

  const savingsBreakdown = data.savingsLines.filter(s => s.estimated > 0).map(s => ({ name: lineLabels[s.line], value: s.estimated }));

  const EnergyIcon = c.energy_type === 'gas' ? Flame : c.energy_type === 'solar' ? Sun : c.energy_type === 'mixed' ? Layers : Zap;

  const marketStats = marketDaily.length
    ? { avg: Math.round((marketDaily.reduce((acc, d) => acc + d.avg, 0) / marketDaily.length) * 100) / 100, min: Math.min(...marketDaily.map(d => d.min)), max: Math.max(...marketDaily.map(d => d.max)) }
    : null;

  const elecContracts = data.contracts.filter(ct => ct.energy_type === 'electricity' || (!ct.energy_type && !ct.gas_tariff));
  const gasContracts = data.contracts.filter(ct => ct.energy_type === 'gas' || ct.gas_tariff);
  const solarContracts = data.contracts.filter(ct => ct.energy_type === 'solar');
  const hasGas = c.energy_type === 'gas' || c.energy_type === 'mixed' || gasContracts.length > 0 || (data.gasSummary.contracts_count > 0);
  const hasSolar = c.energy_type === 'solar' || c.energy_type === 'mixed' || solarContracts.length > 0 || (data.solarInstallations?.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Portal del Cliente · Energía 360</h1>
            {data.clientName && <p className="text-muted-foreground">Hola, {data.clientName}</p>}
          </div>
        </div>

        {/* Case header */}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">CUPS</span><p className="font-mono text-xs">{c.cups || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Dirección</span><p className="text-xs">{c.address || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Comercializadora</span><p className="text-xs">{c.current_supplier || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Fin contrato</span><p className="text-xs">{fmtDate(c.contract_end_date)}</p></div>
              <div><span className="text-xs text-muted-foreground">Tipo energía</span><p className="text-xs capitalize">{c.energy_type}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Ahorro estimado</p><p className="text-lg font-bold text-emerald-600">{fmtCurrency(estimatedTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Ahorro validado</p><p className="text-lg font-bold text-green-600">{fmtCurrency(validatedTotal)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Contratos</p><p className="text-lg font-bold">{data.contracts.length}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Facturas</p><p className="text-lg font-bold">{data.invoices.length}</p></CardContent></Card>
        </div>

        {/* Savings by line */}
        {data.savingsLines.some(s => s.estimated > 0 || s.validated > 0) && (
          <div className="grid grid-cols-3 gap-3">
            {data.savingsLines.map(s => {
              const Icon = LINE_ICONS[s.line] || Zap;
              return (
                <Card key={s.line}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">{lineLabels[s.line]}</span>
                    </div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Estimado</span><span>{fmtCurrency(s.estimated)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Validado</span><span className="text-emerald-600">{fmtCurrency(s.validated)}</span></div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="ahorro" className="text-xs">Ahorro</TabsTrigger>
            <TabsTrigger value="contratos" className="text-xs">Contratos</TabsTrigger>
            <TabsTrigger value="facturas" className="text-xs">Facturas</TabsTrigger>
            {hasGas && <TabsTrigger value="gas" className="text-xs">Gas</TabsTrigger>}
            {hasSolar && <TabsTrigger value="solar" className="text-xs">Solar</TabsTrigger>}
            {data.proposals.length > 0 && <TabsTrigger value="propuestas" className="text-xs">Propuestas</TabsTrigger>}
            {(data.reports?.length > 0 || data.invoiceYoY) && <TabsTrigger value="informe" className="text-xs">Informe</TabsTrigger>}
            <TabsTrigger value="alertas" className="text-xs">Alertas</TabsTrigger>
            {marketApplicable && <TabsTrigger value="mercado" className="text-xs">Precio luz</TabsTrigger>}
          </TabsList>

          {/* RESUMEN */}
          <TabsContent value="resumen" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen del expediente</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Propuestas</p><p className="text-base font-semibold">{data.proposals.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Último cambio</p><p className="text-base font-semibold">{fmtDate(data.workflowChangedAt)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Tipo</p><p className="text-base font-semibold capitalize">{c.energy_type}</p></div>
              </CardContent>
            </Card>
            {savingsBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución de ahorro</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={savingsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} label={({ name, value }) => `${name}: ${Math.round(value)}€`}>
                        {savingsBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AHORRO */}
          <TabsContent value="ahorro" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" />Ahorro por línea</CardTitle></CardHeader>
              <CardContent>
                {data.savingsLines.every(item => item.estimated === 0 && item.validated === 0) ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Sin datos de ahorro</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.savingsLines.map(s => ({ linea: lineLabels[s.line], estimado: s.estimated, validado: s.validated }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="linea" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                      <Bar dataKey="estimado" name="Estimado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="validado" name="Validado" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTRATOS */}
          <TabsContent value="contratos" className="mt-4 space-y-3">
            {data.contracts.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay contratos cargados.</CardContent></Card>
            ) : data.contracts.map(contract => (
              <Card key={contract.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-primary" />
                      <span className="font-medium">{contract.supplier || 'Sin comercializadora'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{contract.energy_type || 'electricity'}</Badge>
                      {contract.signed_document_url && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(contract.signed_document_url, `contrato-${contract.id}.pdf`)} disabled={downloading === contract.signed_document_url}>
                          {downloading === contract.signed_document_url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
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

          {/* FACTURAS */}
          <TabsContent value="facturas" className="mt-4 space-y-3">
            {data.invoices.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay facturas cargadas.</CardContent></Card>
            ) : data.invoices.map(invoice => (
              <Card key={invoice.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{fmtDate(invoice.billing_start)} → {fmtDate(invoice.billing_end)}</span>
                      <Badge variant="outline" className="capitalize">{invoice.energy_type || 'electricity'}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmtCurrency(invoice.total_amount)}</span>
                      {invoice.is_validated ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Badge variant="secondary">Pendiente</Badge>}
                      {invoice.document_url && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(invoice.document_url, `factura-${invoice.id}.pdf`)} disabled={downloading === invoice.document_url}>
                          {downloading === invoice.document_url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-2 mt-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">Días</span><p>{invoice.days ?? '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Consumo eléctrico</span><p>{fmtNumber(invoice.consumption_total_kwh)} kWh</p></div>
                    {invoice.gas_consumption_kwh != null && <div><span className="text-xs text-muted-foreground">Consumo gas</span><p>{fmtNumber(invoice.gas_consumption_kwh)} kWh</p></div>}
                    <div><span className="text-xs text-muted-foreground">Coste energía</span><p>{fmtCurrency(invoice.energy_cost)}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* GAS */}
          {hasGas && (
            <TabsContent value="gas" className="mt-4 space-y-4">
              {data.gasSummary.contracts_count === 0 && data.gasSummary.invoices_count === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay datos de gas para este expediente.</CardContent></Card>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Contratos gas</p><p className="text-lg font-bold">{data.gasSummary.contracts_count}</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Facturas gas</p><p className="text-lg font-bold">{data.gasSummary.invoices_count}</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Consumo total</p><p className="text-lg font-bold">{fmtNumber(data.gasSummary.total_consumption_kwh)} kWh</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Coste medio</p><p className="text-lg font-bold">{data.gasSummary.avg_cost_eur_kwh != null ? `${data.gasSummary.avg_cost_eur_kwh.toLocaleString('es-ES', { maximumFractionDigits: 4 })} €/kWh` : '—'}</p></CardContent></Card>
                  </div>
                  {gasTrend.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Evolución gas</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={gasTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <Tooltip />
                            <Line yAxisId="left" type="monotone" dataKey="consumo" name="kWh" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="coste" name="€" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {/* SOLAR */}
          {hasSolar && (
            <TabsContent value="solar" className="mt-4 space-y-4">
              {(!data.solarInstallations || data.solarInstallations.length === 0) && solarContracts.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay datos de autoconsumo/solar para este expediente.</CardContent></Card>
              ) : (
                <>
                  {data.solarInstallations?.map((inst: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sun className="h-4 w-4 text-orange-500" />Instalación solar</CardTitle></CardHeader>
                      <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-xs text-muted-foreground">Potencia instalada</span><p className="font-semibold">{inst.installed_power_kwp ? `${inst.installed_power_kwp} kWp` : '—'}</p></div>
                        <div><span className="text-xs text-muted-foreground">Generación estimada</span><p className="font-semibold">{inst.estimated_annual_generation_kwh ? `${fmtNumber(inst.estimated_annual_generation_kwh)} kWh/año` : '—'}</p></div>
                        <div><span className="text-xs text-muted-foreground">Estado</span><p className="font-semibold capitalize">{inst.status || '—'}</p></div>
                      </CardContent>
                    </Card>
                  ))}
                  {solarContracts.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Contratos solar</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {solarContracts.map(ct => (
                          <div key={ct.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                            <div>
                              <p className="font-medium">{ct.supplier || '—'}</p>
                              <p className="text-xs text-muted-foreground">{fmtDate(ct.start_date)} → {fmtDate(ct.end_date)}</p>
                            </div>
                            {ct.signed_document_url && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(ct.signed_document_url, `contrato-solar-${ct.id}.pdf`)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {/* PROPUESTAS */}
          {data.proposals.length > 0 && (
            <TabsContent value="propuestas" className="mt-4 space-y-3">
              {data.proposals.map((p: any, idx: number) => (
                <Card key={p.id || idx}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.proposed_supplier || 'Propuesta'} — {p.proposed_tariff || '—'}</p>
                        <p className="text-xs text-muted-foreground">Estado: {p.status || '—'} · {fmtDate(p.created_at)}</p>
                      </div>
                      <Badge variant={p.status === 'accepted' ? 'default' : 'secondary'}>{p.status || 'draft'}</Badge>
                    </div>
                    {(p.estimated_savings || p.estimated_annual_savings) && (
                      <p className="text-xs mt-1">Ahorro estimado: <span className="font-semibold text-emerald-600">{fmtCurrency(p.estimated_savings || p.estimated_annual_savings)}</span></p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}

          {/* INFORME */}
          {(data.reports?.length > 0 || data.invoiceYoY) && (
            <TabsContent value="informe" className="mt-4 space-y-4">
              {/* Reports */}
              {data.reports && data.reports.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Informes del expediente</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {data.reports.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{r.report_type || 'Informe'} — v{r.version || 1}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                          {r.summary && <p className="text-xs text-muted-foreground mt-1">{r.summary}</p>}
                        </div>
                        {r.pdf_url && (
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(r.pdf_url, `informe-v${r.version || 1}.pdf`)} disabled={downloading === r.pdf_url}>
                            {downloading === r.pdf_url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* YoY comparison */}
              {data.invoiceYoY && data.invoiceYoY.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Comparativa interanual (YoY)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.invoiceYoY}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €`} />
                        <Bar dataKey="previous" name="Año anterior" fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="current" name="Año actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground mt-2 text-center">Coste total mensual por factura — año actual vs anterior</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="alertas" className="mt-4 space-y-3">
            {data.alerts.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay alertas relevantes.</CardContent></Card>
            ) : data.alerts.map(alert => (
              <Card key={alert.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message || 'Sin detalle'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{fmtDateTime(alert.created_at)}</p>
                        {alert.energy_type && <Badge variant="outline" className="text-[10px] capitalize">{alert.energy_type}</Badge>}
                      </div>
                    </div>
                    <Badge variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'secondary'}>{alert.severity}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* MERCADO */}
          {marketApplicable && (
            <TabsContent value="mercado" className="mt-4 space-y-4">
              {marketDaily.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin datos de mercado eléctrico disponibles.</CardContent></Card>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Media</p><p className="text-lg font-bold">{marketStats?.avg.toLocaleString('es-ES')} €/MWh</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Mínimo</p><p className="text-lg font-bold">{marketStats?.min.toLocaleString('es-ES')} €/MWh</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Máximo</p><p className="text-lg font-bold">{marketStats?.max.toLocaleString('es-ES')} €/MWh</p></CardContent></Card>
                  </div>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución diaria del precio</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={marketDaily.map(d => ({ ...d, fecha: format(new Date(d.date), 'dd/MM', { locale: es }) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="fecha" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => `${v.toLocaleString('es-ES')} €/MWh`} />
                          <Line type="monotone" dataKey="avg" name="Media" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Access traceability */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Trazabilidad de acceso</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Enlace generado</span><p>{fmtDateTime(data.tokenTrace.created_at)}</p></div>
            <div><span className="text-xs text-muted-foreground">Caduca</span><p>{fmtDateTime(data.tokenTrace.expires_at)}</p></div>
            <div><span className="text-xs text-muted-foreground">Último acceso</span><p>{fmtDateTime(data.tokenTrace.last_accessed_at)}</p></div>
          </CardContent>
        </Card>

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Acceso seguro por token · Solo lectura · Separación por expediente · Energía 360</p>
        </div>
      </div>
    </div>
  );
}

export default ClientPortalView;
