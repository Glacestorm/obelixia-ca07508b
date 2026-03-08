/**
 * CaseGasTab - Gas contracts and invoices within a case
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, FileText, FileSignature, Plus, Loader2, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  caseId: string;
}

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, invoicesRes] = await Promise.all([
        supabase.from('energy_contracts').select('id, supplier, tariff_name, start_date, end_date, gas_tariff, gas_annual_consumption_kwh, distributor, energy_type')
          .eq('case_id', caseId).eq('energy_type', 'gas').order('start_date', { ascending: false }),
        supabase.from('energy_invoices').select('id, billing_start, billing_end, gas_fixed_cost, gas_variable_cost, gas_consumption_kwh, total_amount, energy_type')
          .eq('case_id', caseId).eq('energy_type', 'gas').order('billing_start', { ascending: false }),
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

  const fmtDate = (d: string | null) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '—';
  const fmtCurrency = (v: number | null) => v != null ? `${v.toFixed(2)} €` : '—';

  const totalGasConsumption = invoices.reduce((s, i) => s + (i.gas_consumption_kwh || 0), 0);
  const totalGasCost = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const avgGasPrice = totalGasConsumption > 0 ? totalGasCost / totalGasConsumption * 100 : 0;

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Contratos gas', value: contracts.length, icon: FileSignature, color: 'text-blue-500' },
          { label: 'Facturas gas', value: invoices.length, icon: FileText, color: 'text-blue-400' },
          { label: 'Consumo total', value: `${totalGasConsumption.toFixed(0)} kWh`, icon: Flame, color: 'text-orange-500' },
          { label: 'Precio medio', value: `${avgGasPrice.toFixed(2)} c€/kWh`, icon: TrendingDown, color: 'text-emerald-500' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}><CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${kpi.color}`} />
                <div><p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p><p className="text-sm font-bold">{kpi.value}</p></div>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs">Contratos ({contracts.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Facturas ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          {contracts.length === 0 && invoices.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center">
              <Flame className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No hay datos de gas registrados en este expediente</p>
              <p className="text-xs text-muted-foreground mt-1">Añade contratos o facturas de gas para comenzar</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen Gas</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Contratos activos:</span><span className="font-medium">{contracts.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Facturas analizadas:</span><span className="font-medium">{invoices.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consumo total:</span><span className="font-medium">{totalGasConsumption.toFixed(0)} kWh</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Coste total:</span><span className="font-medium font-semibold text-emerald-600">{totalGasCost.toFixed(2)} €</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Precio medio:</span><span className="font-medium">{avgGasPrice.toFixed(2)} c€/kWh</span></div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-3">
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
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</span>
                        {c.distributor && <span>Dist: {c.distributor}</span>}
                        {c.gas_annual_consumption_kwh && <span>{c.gas_annual_consumption_kwh.toFixed(0)} kWh/año</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

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
    </div>
  );
}

export default CaseGasTab;
