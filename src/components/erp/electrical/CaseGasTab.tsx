/**
 * CaseGasTab - Professional gas management within a case
 * Contracts, invoices, consumption charts, cost analysis, KPIs
 * Now with real MIBGAS market data integration
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  Flame, FileText, FileSignature, Plus, Loader2, TrendingDown,
  TrendingUp, Activity, BarChart3, Save, X, AlertTriangle, Calendar,
  RefreshCw, Globe, Clock
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, ReferenceLine
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEnergyMibgas } from '@/hooks/erp/useEnergyMibgas';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props { caseId: string; }

interface GasContract {
  id: string;
  supplier: string | null;
  tariff_name: string | null;
  start_date: string | null;
  end_date: string | null;
  gas_tariff: string | null;
  gas_annual_consumption_kwh: number | null;
  distributor: string | null;
  energy_type: string;
  has_permanence: boolean | null;
  permanence_end_date: string | null;
  penalties: string | null;
}

interface GasInvoice {
  id: string;
  billing_start: string | null;
  billing_end: string | null;
  gas_fixed_cost: number | null;
  gas_variable_cost: number | null;
  gas_consumption_kwh: number | null;
  total_amount: number | null;
  energy_type: string;
}

export function CaseGasTab({ caseId }: Props) {
  const [contracts, setContracts] = useState<GasContract[]>([]);
  const [invoices, setInvoices] = useState<GasInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddContract, setShowAddContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    supplier: '', gas_tariff: '', distributor: '',
    start_date: '', end_date: '', gas_annual_consumption_kwh: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, invoicesRes] = await Promise.all([
        (supabase.from('energy_contracts') as any)
          .select('id, supplier, tariff_name, start_date, end_date, gas_tariff, gas_annual_consumption_kwh, distributor, energy_type, has_permanence, permanence_end_date, penalties')
          .eq('case_id', caseId).eq('energy_type', 'gas').order('start_date', { ascending: false }),
        (supabase.from('energy_invoices') as any)
          .select('id, billing_start, billing_end, gas_fixed_cost, gas_variable_cost, gas_consumption_kwh, total_amount, energy_type')
          .eq('case_id', caseId).eq('energy_type', 'gas').order('billing_start', { ascending: true }),
      ]);
      setContracts((contractsRes.data || []) as GasContract[]);
      setInvoices((invoicesRes.data || []) as GasInvoice[]);
    } catch (err) {
      console.error('[CaseGasTab] error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddContract = async () => {
    try {
      const { error } = await supabase.from('energy_contracts').insert([{
        case_id: caseId,
        energy_type: 'gas',
        supplier: contractForm.supplier || null,
        gas_tariff: contractForm.gas_tariff || null,
        distributor: contractForm.distributor || null,
        start_date: contractForm.start_date || null,
        end_date: contractForm.end_date || null,
        gas_annual_consumption_kwh: contractForm.gas_annual_consumption_kwh ? parseFloat(contractForm.gas_annual_consumption_kwh) : null,
      }] as any);
      if (error) throw error;
      toast.success('Contrato de gas añadido');
      setShowAddContract(false);
      setContractForm({ supplier: '', gas_tariff: '', distributor: '', start_date: '', end_date: '', gas_annual_consumption_kwh: '' });
      fetchData();
    } catch (err) {
      toast.error('Error al crear contrato');
    }
  };

  const fmtDate = (d: string | null) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '—';
  const fmtCurrency = (v: number | null) => v != null ? `${v.toFixed(2)} €` : '—';

  const totalGasConsumption = invoices.reduce((s, i) => s + (i.gas_consumption_kwh || 0), 0);
  const totalGasCost = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalFixed = invoices.reduce((s, i) => s + (i.gas_fixed_cost || 0), 0);
  const totalVariable = invoices.reduce((s, i) => s + (i.gas_variable_cost || 0), 0);
  const avgGasPrice = totalGasConsumption > 0 ? (totalGasCost / totalGasConsumption) * 100 : 0;

  // Consumption evolution chart
  const consumptionChart = useMemo(() => {
    return invoices
      .filter(i => i.billing_start)
      .map(i => ({
        period: i.billing_start ? format(new Date(i.billing_start), 'MMM yy', { locale: es }) : '',
        consumo: i.gas_consumption_kwh || 0,
        coste: i.total_amount || 0,
        fijo: i.gas_fixed_cost || 0,
        variable: i.gas_variable_cost || 0,
        precio: i.gas_consumption_kwh ? ((i.total_amount || 0) / i.gas_consumption_kwh * 100) : 0,
      }));
  }, [invoices]);

  // Cost breakdown chart
  const costBreakdown = useMemo(() => {
    if (totalFixed === 0 && totalVariable === 0) return [];
    return [
      { name: 'T. fijo', value: Math.round(totalFixed * 100) / 100 },
      { name: 'T. variable', value: Math.round(totalVariable * 100) / 100 },
      { name: 'Otros', value: Math.round(Math.max(0, totalGasCost - totalFixed - totalVariable) * 100) / 100 },
    ].filter(d => d.value > 0);
  }, [totalFixed, totalVariable, totalGasCost]);

  // Contract expiry alert
  const expiringContracts = contracts.filter(c => {
    if (!c.end_date) return false;
    return differenceInDays(new Date(c.end_date), new Date()) <= 90;
  });

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Expiry alert */}
      {expiringContracts.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              {expiringContracts.length} contrato{expiringContracts.length > 1 ? 's' : ''} de gas próximo{expiringContracts.length > 1 ? 's' : ''} a vencer
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Contratos', value: contracts.length, icon: FileSignature, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Facturas', value: invoices.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Consumo total', value: `${(totalGasConsumption / 1000).toFixed(1)} MWh`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Coste total', value: `${totalGasCost.toFixed(0)} €`, icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Precio medio', value: `${avgGasPrice.toFixed(2)} c€/kWh`, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("p-1.5 rounded-lg", kpi.bg)}><Icon className={cn("h-4 w-4", kpi.color)} /></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p><p className="text-sm font-bold">{kpi.value}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="consumption" className="text-xs">Consumo</TabsTrigger>
          <TabsTrigger value="costs" className="text-xs">Costes</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs">Contratos ({contracts.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Facturas ({invoices.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-3">
          {contracts.length === 0 && invoices.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center">
              <Flame className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No hay datos de gas registrados en este expediente</p>
              <p className="text-xs text-muted-foreground mt-1">Añade contratos o facturas de gas para comenzar</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddContract(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir contrato de gas
              </Button>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen Gas</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Contratos activos:</span><span className="font-medium">{contracts.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Facturas analizadas:</span><span className="font-medium">{invoices.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consumo total:</span><span className="font-medium">{(totalGasConsumption / 1000).toFixed(1)} MWh</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Coste total:</span><span className="font-semibold text-foreground">{totalGasCost.toFixed(2)} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Precio medio:</span><span className="font-medium">{avgGasPrice.toFixed(2)} c€/kWh</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">T. fijo acumulado:</span><span className="font-medium">{totalFixed.toFixed(2)} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">T. variable acumulado:</span><span className="font-medium">{totalVariable.toFixed(2)} €</span></div>
                </CardContent>
              </Card>
              {costBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Desglose de coste</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={costBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis dataKey="name" type="category" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={70} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => [`${v.toFixed(2)} €`]} />
                        <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} name="€" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Consumption chart */}
        <TabsContent value="consumption" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-500" /> Evolución del consumo de gas</CardTitle></CardHeader>
            <CardContent>
              {consumptionChart.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de consumo</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={consumptionChart}>
                    <defs>
                      <linearGradient id="gasConsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis yAxisId="left" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis yAxisId="right" orientation="right" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    <Area yAxisId="left" type="monotone" dataKey="consumo" stroke="hsl(217, 91%, 60%)" fill="url(#gasConsGrad)" name="Consumo (kWh)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="precio" stroke="hsl(25, 95%, 53%)" name="Precio (c€/kWh)" strokeWidth={2} dot={{ r: 3 }} />
                    <Legend />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs chart */}
        <TabsContent value="costs" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-500" /> Evolución del coste</CardTitle></CardHeader>
            <CardContent>
              {consumptionChart.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sin datos de coste</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={consumptionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v.toFixed(2)} €`]} />
                    <Bar dataKey="fijo" stackId="cost" fill="hsl(217, 91%, 60%)" name="T. fijo" />
                    <Bar dataKey="variable" stackId="cost" fill="hsl(45, 93%, 47%)" name="T. variable" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts */}
        <TabsContent value="contracts" className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Contratos de gas</h3>
            <Button size="sm" onClick={() => setShowAddContract(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Nuevo</Button>
          </div>
          <div className="space-y-2">
            {contracts.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-6 text-center text-sm text-muted-foreground">Sin contratos de gas</CardContent></Card>
            ) : contracts.map(c => (
              <Card key={c.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">{c.supplier || 'Sin comercializadora'}</span>
                        {c.gas_tariff && <Badge variant="outline" className="text-xs">{c.gas_tariff}</Badge>}
                        {c.has_permanence && <Badge variant="destructive" className="text-xs">Permanencia</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</span>
                        {c.distributor && <span>Dist: {c.distributor}</span>}
                        {c.gas_annual_consumption_kwh && <span>{(c.gas_annual_consumption_kwh / 1000).toFixed(1)} MWh/año</span>}
                      </div>
                    </div>
                    {c.end_date && differenceInDays(new Date(c.end_date), new Date()) <= 30 && (
                      <Badge variant="destructive" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Vence pronto</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-3">
          <div className="space-y-2">
            {invoices.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-6 text-center text-sm text-muted-foreground">Sin facturas de gas</CardContent></Card>
            ) : invoices.map(inv => (
              <Card key={inv.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium">{fmtDate(inv.billing_start)} — {fmtDate(inv.billing_end)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Consumo: {inv.gas_consumption_kwh?.toFixed(0) || '—'} kWh</span>
                        <span>T. fijo: {fmtCurrency(inv.gas_fixed_cost)}</span>
                        <span>T. variable: {fmtCurrency(inv.gas_variable_cost)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold">{fmtCurrency(inv.total_amount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add contract dialog */}
      <Dialog open={showAddContract} onOpenChange={setShowAddContract}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo contrato de gas</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            <div><Label className="text-xs">Comercializadora</Label><Input value={contractForm.supplier} onChange={e => setContractForm(f => ({ ...f, supplier: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Tarifa gas</Label><Input value={contractForm.gas_tariff} onChange={e => setContractForm(f => ({ ...f, gas_tariff: e.target.value }))} placeholder="RL.1, RL.2..." className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Distribuidora</Label><Input value={contractForm.distributor} onChange={e => setContractForm(f => ({ ...f, distributor: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Consumo anual (kWh)</Label><Input type="number" value={contractForm.gas_annual_consumption_kwh} onChange={e => setContractForm(f => ({ ...f, gas_annual_consumption_kwh: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Fecha inicio</Label><Input type="date" value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Fecha fin</Label><Input type="date" value={contractForm.end_date} onChange={e => setContractForm(f => ({ ...f, end_date: e.target.value }))} className="h-8 text-sm" /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={handleAddContract}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseGasTab;
