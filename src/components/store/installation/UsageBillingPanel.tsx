import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DollarSign, TrendingUp, BarChart3, AlertTriangle, Receipt,
  Plus, Save, RefreshCw, CreditCard, Zap
} from 'lucide-react';
import { useUsageBilling, type BillingRule } from '@/hooks/admin/useUsageBilling';
import { type Installation, ERP_MODULES } from '@/hooks/admin/useInstallationManager';
import { cn } from '@/lib/utils';

interface UsageBillingPanelProps {
  installation: Installation;
}

export function UsageBillingPanel({ installation }: UsageBillingPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingRule, setEditingRule] = useState<Partial<BillingRule> | null>(null);

  const {
    events,
    summary,
    rules,
    isLoading,
    monthlyTotal,
    fetchEvents,
    fetchSummary,
    fetchRules,
    saveRule,
  } = useUsageBilling();

  useEffect(() => {
    fetchEvents(installation.id);
    fetchSummary(installation.id);
    fetchRules();
  }, [installation.id, fetchEvents, fetchSummary, fetchRules]);

  const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <Card className="bg-slate-900/80 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Facturación por Uso</CardTitle>
              <CardDescription className="capitalize">{currentMonth}</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              fetchEvents(installation.id);
              fetchSummary(installation.id);
            }}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs gap-1">
              <Receipt className="h-3 w-3" /> Eventos
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs gap-1">
              <CreditCard className="h-3 w-3" /> Reglas
            </TabsTrigger>
          </TabsList>

          {/* === OVERVIEW TAB === */}
          <TabsContent value="overview">
            {/* Monthly Total */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total Mes Actual</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    €{monthlyTotal.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-400 opacity-50" />
              </div>
            </div>

            {/* Per-Module Breakdown */}
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {summary.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm text-slate-500">Sin consumo este mes</p>
                  </div>
                ) : (
                  summary.map((s, i) => {
                    const mod = ERP_MODULES.find(m => m.key === s.module_key);
                    const rule = rules.find(r => r.module_key === s.module_key && r.event_type === s.event_name);
                    const freeLimit = rule?.free_tier_limit || 0;
                    const usedPercent = freeLimit > 0 ? Math.min((s.total_quantity / freeLimit) * 100, 100) : 100;
                    const overFree = s.total_quantity > freeLimit;

                    return (
                      <div key={i} className="p-3 rounded-lg border border-slate-700 bg-slate-800/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{mod?.icon || '📦'}</span>
                            <div>
                              <span className="text-sm font-medium text-white">{mod?.name || s.module_key}</span>
                              <span className="text-xs text-slate-400 ml-2">{s.event_name}</span>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-emerald-400">
                            €{Number(s.total_amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>{s.total_quantity} unidades × {rule ? `€${rule.unit_price}` : 'N/A'}</span>
                          {freeLimit > 0 && (
                            <span className={overFree ? 'text-amber-400' : 'text-slate-500'}>
                              {freeLimit} gratis
                            </span>
                          )}
                        </div>
                        {freeLimit > 0 && (
                          <Progress value={usedPercent} className="h-1.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === EVENTS TAB === */}
          <TabsContent value="events">
            <ScrollArea className="h-[350px]">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm text-slate-500">Sin eventos registrados</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {events.map(evt => {
                    const mod = ERP_MODULES.find(m => m.key === evt.module_key);
                    return (
                      <div key={evt.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{mod?.icon || '📦'}</span>
                          <div>
                            <span className="text-xs text-white">{evt.event_name}</span>
                            <span className="text-[10px] text-slate-500 ml-2">
                              ×{evt.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400">
                            €{Number(evt.total_amount).toFixed(2)}
                          </span>
                          <Badge
                            className={cn(
                              'text-[10px]',
                              evt.billed ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
                            )}
                          >
                            {evt.billed ? 'Facturado' : 'Pendiente'}
                          </Badge>
                          <span className="text-[10px] text-slate-600">
                            {new Date(evt.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* === RULES TAB === */}
          <TabsContent value="rules">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Reglas de Facturación</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1" onClick={() => setEditingRule({
                    module_key: 'hr',
                    event_type: 'payroll_generated',
                    unit_price: 0.50,
                    currency: 'EUR',
                    free_tier_limit: 0,
                    is_active: true,
                  })}>
                    <Plus className="h-3 w-3" /> Nueva Regla
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Regla de Facturación</DialogTitle>
                  </DialogHeader>
                  {editingRule && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Módulo</Label>
                          <Input
                            value={editingRule.module_key || ''}
                            onChange={e => setEditingRule({ ...editingRule, module_key: e.target.value })}
                            placeholder="hr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo Evento</Label>
                          <Input
                            value={editingRule.event_type || ''}
                            onChange={e => setEditingRule({ ...editingRule, event_type: e.target.value })}
                            placeholder="payroll_generated"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Precio Unitario (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editingRule.unit_price || 0}
                            onChange={e => setEditingRule({ ...editingRule, unit_price: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Moneda</Label>
                          <Input
                            value={editingRule.currency || 'EUR'}
                            onChange={e => setEditingRule({ ...editingRule, currency: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gratis (uds)</Label>
                          <Input
                            type="number"
                            value={editingRule.free_tier_limit || 0}
                            onChange={e => setEditingRule({ ...editingRule, free_tier_limit: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Input
                          value={(editingRule as any).description || ''}
                          onChange={e => setEditingRule({ ...editingRule, description: e.target.value })}
                          placeholder="€0.50 por nómina generada por empleado"
                        />
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={async () => {
                          if (editingRule.module_key && editingRule.event_type) {
                            await saveRule(editingRule as any);
                            setEditingRule(null);
                          }
                        }}
                      >
                        <Save className="h-4 w-4" /> Guardar Regla
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[300px]">
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm text-slate-500">Sin reglas configuradas</p>
                  <p className="text-xs text-slate-600 mt-1">Añade reglas para activar la facturación por uso</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map(rule => {
                    const mod = ERP_MODULES.find(m => m.key === rule.module_key);
                    return (
                      <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/30">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{mod?.icon || '📦'}</span>
                          <div>
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                              {mod?.name || rule.module_key}
                              <Badge variant="outline" className="text-[10px]">{rule.event_type}</Badge>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              €{rule.unit_price}/unidad
                              {rule.free_tier_limit > 0 && ` • ${rule.free_tier_limit} gratis`}
                              {rule.description && ` • ${rule.description}`}
                            </div>
                          </div>
                        </div>
                        <Badge className={cn(
                          'text-[10px]',
                          rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
                        )}>
                          {rule.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Example billing rules */}
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Ejemplos de Reglas
              </h4>
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>• <strong>RRHH</strong>: payroll_generated → €0.50/nómina/empleado/mes</p>
                <p>• <strong>Facturación</strong>: invoice_created → €0.10/factura</p>
                <p>• <strong>IA</strong>: ai_query → €0.02/consulta (50 gratis/mes)</p>
                <p>• <strong>Almacenamiento</strong>: storage_gb → €0.05/GB/mes</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
