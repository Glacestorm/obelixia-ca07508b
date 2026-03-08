import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw, Brain, DollarSign, TrendingUp, FileText, Calculator,
  Sparkles, Zap, BarChart3, Receipt, AlertTriangle
} from 'lucide-react';
import { useAIUsagePricing, type AIUsagePricingRule } from '@/hooks/admin/useAIUsagePricing';
import { type Installation } from '@/hooks/admin/useInstallationManager';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AIUsagePricingPanelProps {
  installation: Installation;
}

export function AIUsagePricingPanel({ installation }: AIUsagePricingPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [simDecisions, setSimDecisions] = useState(100);
  const [simTokens, setSimTokens] = useState(500);
  const [simType, setSimType] = useState('general_assistant');

  const {
    isLoading, pricingRules, usageSummary, invoices, simulation,
    fetchUsageSummary, fetchPricingRules, generateInvoice, fetchInvoices, simulateCost,
  } = useAIUsagePricing();

  useEffect(() => {
    fetchUsageSummary(installation.id);
    fetchPricingRules();
    fetchInvoices(installation.id);
  }, [installation.id]);

  const handleSimulate = useCallback(() => {
    simulateCost({ decisions_per_month: simDecisions, avg_tokens_per_decision: simTokens, decision_type: simType });
  }, [simDecisions, simTokens, simType, simulateCost]);

  const formatCurrency = (amount: number, currency = 'EUR') =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);

  const chartColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

  const moduleIcons: Record<string, string> = {
    fiscal: '🏛️', hr: '👥', accounting: '📊', legal: '⚖️', sales: '💼',
    inventory: '📦', crm: '🤝', esg: '🌱', ai: '🤖', core: '⚙️',
  };

  return (
    <div className="space-y-4">
      {/* Hero Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-700 bg-gradient-to-br from-violet-500/10 to-purple-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-violet-400" />
            <span className="text-[10px] text-slate-400 uppercase">Decisiones IA</span>
          </div>
          <p className="text-xl font-bold text-white">{usageSummary?.totals.decisions || 0}</p>
          <p className="text-[10px] text-slate-400">este mes</p>
        </div>
        <div className="p-3 rounded-xl border border-slate-700 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] text-slate-400 uppercase">Tokens</span>
          </div>
          <p className="text-xl font-bold text-white">{((usageSummary?.totals.tokens || 0) / 1000).toFixed(1)}K</p>
          <p className="text-[10px] text-slate-400">consumidos</p>
        </div>
        <div className="p-3 rounded-xl border border-slate-700 bg-gradient-to-br from-emerald-500/10 to-green-500/10">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] text-slate-400 uppercase">Coste</span>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(usageSummary?.totals.amount || 0)}</p>
          <p className="text-[10px] text-slate-400">facturado</p>
        </div>
        <div className="p-3 rounded-xl border border-slate-700 bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] text-slate-400 uppercase">Coste/Decisión</span>
          </div>
          <p className="text-xl font-bold text-white">
            {usageSummary?.totals.decisions
              ? formatCurrency((usageSummary.totals.amount || 0) / usageSummary.totals.decisions)
              : '—'}
          </p>
          <p className="text-[10px] text-slate-400">media</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-3">
          <TabsTrigger value="overview" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Resumen</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Precios</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs gap-1"><Calculator className="h-3 w-3" /> Simulador</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs gap-1"><Receipt className="h-3 w-3" /> Facturas</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Daily Chart */}
            {usageSummary?.by_day && usageSummary.by_day.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Decisiones IA por Día
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={usageSummary.by_day}>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [v, 'Decisiones']}
                        labelFormatter={l => `Día: ${l}`}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {usageSummary.by_day.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* By Decision Type */}
            {usageSummary?.by_decision && Object.keys(usageSummary.by_decision).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-300">Desglose por Tipo de Decisión</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {Object.entries(usageSummary.by_decision).map(([dt, stats]) => {
                      const rule = pricingRules.find(r => r.decision_type === dt);
                      return (
                        <div key={dt} className="flex items-center justify-between p-2 rounded-lg border border-slate-700 bg-slate-800/30">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-violet-400" />
                            <span className="text-xs text-white">{rule?.display_name || dt}</span>
                            <Badge variant="outline" className="text-[10px]">{stats.count}x</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span>{(stats.tokens / 1000).toFixed(1)}K tok</span>
                            <span className="font-medium text-emerald-400">{formatCurrency(stats.total)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* By Module */}
            {usageSummary?.by_module && Object.keys(usageSummary.by_module).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-300">Consumo por Módulo</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(usageSummary.by_module).map(([mod, stats]) => (
                    <div key={mod} className="p-2 rounded-lg border border-slate-700 bg-slate-800/50 text-center">
                      <span className="text-lg">{moduleIcons[mod] || '📦'}</span>
                      <p className="text-[10px] text-slate-400 capitalize mt-1">{mod}</p>
                      <p className="text-xs font-medium text-white">{stats.count} decisiones</p>
                      <p className="text-[10px] text-emerald-400">{formatCurrency(stats.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!usageSummary?.totals.decisions && (
              <div className="text-center py-8 text-slate-500">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin consumo IA este período</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pricing Rules */}
        <TabsContent value="pricing">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {pricingRules.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Cargando reglas de pricing...</p>
                </div>
              ) : (
                pricingRules.map(rule => (
                  <div key={rule.id} className="p-3 rounded-lg border border-slate-700 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{moduleIcons[rule.module_key || ''] || '🤖'}</span>
                        <div>
                          <span className="text-sm font-medium text-white">{rule.display_name}</span>
                          {rule.description && (
                            <p className="text-[10px] text-slate-400">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{rule.module_key}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-1.5 rounded bg-slate-900/50">
                        <span className="text-[10px] text-slate-400">Precio/Unidad</span>
                        <p className="text-xs font-medium text-emerald-400">{formatCurrency(rule.base_price_per_unit)}</p>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/50">
                        <span className="text-[10px] text-slate-400">Precio/1K Tokens</span>
                        <p className="text-xs font-medium text-cyan-400">{formatCurrency(rule.price_per_1k_tokens)}</p>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/50">
                        <span className="text-[10px] text-slate-400">Free Tier</span>
                        <p className="text-xs font-medium text-amber-400">{rule.free_tier_units} uds</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Cost Simulator */}
        <TabsContent value="simulator">
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Simulador de Costes IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Tipo de Decisión</Label>
                    <Select value={simType} onValueChange={setSimType}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingRules.map(r => (
                          <SelectItem key={r.decision_type} value={r.decision_type} className="text-xs">
                            {r.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Decisiones/Mes</Label>
                    <Input
                      type="number"
                      value={simDecisions}
                      onChange={e => setSimDecisions(Number(e.target.value))}
                      className="bg-slate-900 border-slate-600 text-white h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Tokens/Decisión (media)</Label>
                    <Input
                      type="number"
                      value={simTokens}
                      onChange={e => setSimTokens(Number(e.target.value))}
                      className="bg-slate-900 border-slate-600 text-white h-8 text-xs"
                    />
                  </div>
                </div>
                <Button size="sm" className="gap-1" onClick={handleSimulate} disabled={isLoading}>
                  <Calculator className="h-3 w-3" /> Simular
                </Button>
              </CardContent>
            </Card>

            {simulation && (
              <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30">
                <CardContent className="pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    Resultado de Simulación
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-slate-900/50">
                      <span className="text-[10px] text-slate-400">Decisiones facturables</span>
                      <p className="text-sm font-medium text-white">
                        {simulation.monthly.billable_decisions} / {simulation.monthly.total_decisions}
                      </p>
                      <span className="text-[10px] text-emerald-400">
                        {simulation.monthly.free_tier_used} gratis
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/50">
                      <span className="text-[10px] text-slate-400">Tokens totales</span>
                      <p className="text-sm font-medium text-white">
                        {(simulation.monthly.total_tokens / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <div className="p-2 rounded bg-slate-900/50">
                      <span className="text-[10px] text-slate-400">Coste decisiones</span>
                      <p className="text-sm font-medium text-emerald-400">
                        {formatCurrency(simulation.monthly.decision_cost)}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-slate-900/50">
                      <span className="text-[10px] text-slate-400">Coste tokens</span>
                      <p className="text-sm font-medium text-cyan-400">
                        {formatCurrency(simulation.monthly.token_cost)}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-600">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Subtotal</span>
                      <span>{formatCurrency(simulation.monthly.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-300 mt-1">
                      <span>IVA (21%)</span>
                      <span>{formatCurrency(simulation.monthly.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white mt-2 pt-2 border-t border-slate-600">
                      <span>Total Mensual</span>
                      <span className="text-emerald-400">{formatCurrency(simulation.monthly.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Estimación Anual</span>
                      <span>{formatCurrency(simulation.annual_estimate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-slate-300">Facturas de Consumo IA</h4>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => generateInvoice(installation.id)}
                disabled={isLoading}
              >
                <FileText className="h-3 w-3" /> Generar Factura Mes Actual
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin facturas generadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="p-3 rounded-lg border border-slate-700 bg-slate-800/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-white">{inv.invoice_number}</span>
                        </div>
                        <Badge className={cn(
                          'text-[10px]',
                          inv.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          inv.status === 'draft' ? 'bg-slate-500/20 text-slate-400' :
                          'bg-amber-500/20 text-amber-400'
                        )}>
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div>
                          <span className="text-slate-400">Período</span>
                          <p className="text-white">{inv.period_start.slice(5)} → {inv.period_end.slice(5)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Decisiones</span>
                          <p className="text-white">{inv.total_decisions}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Tokens</span>
                          <p className="text-white">{(inv.total_tokens / 1000).toFixed(1)}K</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Total</span>
                          <p className="text-emerald-400 font-medium">{formatCurrency(inv.total_amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchUsageSummary(installation.id)}
          disabled={isLoading}
          className="gap-1 text-xs"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>
    </div>
  );
}

export default AIUsagePricingPanel;
