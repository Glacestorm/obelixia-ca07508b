/**
 * ElectricalComparadorPanel - Simulador y comparador de tarifas eléctricas
 * Inspirado en CarlosCodina: simulaciones con nombre, ranking por coste total,
 * input de consumos/potencias, comparación visual de resultados.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  GitCompareArrows, Plus, Play, Trash2, Eye, Zap, TrendingDown,
  Award, AlertTriangle, Info, Loader2, ChevronRight
} from 'lucide-react';
import { ElectricalBreadcrumb } from './ElectricalBreadcrumb';
import { useEnergySimulations, SimulationConsumptionData, SimulationPowerData, SimulationResult } from '@/hooks/erp/useEnergySimulations';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; caseId?: string; }

const ACCESS_TARIFFS = [
  { value: '2.0TD', label: '2.0TD (≤15kW)' },
  { value: '3.0TD', label: '3.0TD (>15kW)' },
  { value: '6.1TD', label: '6.1TD (Alta tensión)' },
  { value: 'all', label: 'Todas las tarifas' },
];

export function ElectricalComparadorPanel({ companyId }: Props) {
  const { simulations, loading, createSimulation, deleteSimulation, runSimulation } = useEnergySimulations(companyId);
  
  const [activeTab, setActiveTab] = useState('simulations');
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [newSimName, setNewSimName] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Simulation form state
  const [consumption, setConsumption] = useState<SimulationConsumptionData>({
    consumption_p1_kwh: 100, consumption_p2_kwh: 80, consumption_p3_kwh: 50,
  });
  const [power, setPower] = useState<SimulationPowerData>({
    power_p1_kw: 4.6, power_p2_kw: 4.6,
  });
  const [billingDays, setBillingDays] = useState(30);
  const [accessTariff, setAccessTariff] = useState('2.0TD');
  const [currentCost, setCurrentCost] = useState(0);

  const activeSim = useMemo(() =>
    simulations.find(s => s.id === selectedSim), [simulations, selectedSim]);

  const handleCreate = useCallback(async () => {
    if (!newSimName.trim()) return;
    const sim = await createSimulation(newSimName.trim());
    if (sim) {
      setSelectedSim(sim.id);
      setActiveTab('configure');
      setShowNewDialog(false);
      setNewSimName('');
    }
  }, [newSimName, createSimulation]);

  const handleRun = useCallback(async () => {
    if (!selectedSim) return;
    setIsRunning(true);
    const results = await runSimulation(selectedSim, consumption, power, billingDays, accessTariff, currentCost);
    setIsRunning(false);
    if (results) setActiveTab('results');
  }, [selectedSim, consumption, power, billingDays, accessTariff, currentCost, runSimulation]);

  const handleViewResults = useCallback((sim: typeof simulations[0]) => {
    setSelectedSim(sim.id);
    setConsumption(sim.consumption_data);
    setPower(sim.power_data);
    setBillingDays(sim.billing_days);
    setAccessTariff(sim.access_tariff);
    setCurrentCost(sim.current_cost);
    setActiveTab(sim.status === 'completed' ? 'results' : 'configure');
  }, []);

  return (
    <div className="space-y-4">
      <ElectricalBreadcrumb section="Comparador de Tarifas" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-primary" />
            Simulador y Comparador de Tarifas
          </h2>
          <p className="text-sm text-muted-foreground">
            Introduce los datos de consumo y compara tarifas del mercado eléctrico ordenadas por coste total.
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Crear simulación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Simulación</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <Label>Nombre de la simulación</Label>
              <Input
                placeholder="Ej: Diciembre 2025, Cliente Acme..."
                value={newSimName}
                onChange={e => setNewSimName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  La simulación comparará los datos de consumo que introduzcas con todas las tarifas activas del catálogo.
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancelar</Button>
              </DialogClose>
              <Button size="sm" onClick={handleCreate} disabled={!newSimName.trim()}>
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="simulations" className="text-xs">Simulaciones</TabsTrigger>
          <TabsTrigger value="configure" className="text-xs" disabled={!selectedSim}>Configurar</TabsTrigger>
          <TabsTrigger value="results" className="text-xs" disabled={!activeSim || activeSim.status !== 'completed'}>
            Resultados
          </TabsTrigger>
        </TabsList>

        {/* === LIST === */}
        <TabsContent value="simulations">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : simulations.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <GitCompareArrows className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No hay simulaciones todavía.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowNewDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Crear primera simulación
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {simulations.map(sim => (
                    <div
                      key={sim.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedSim === sim.id ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      )}
                      onClick={() => handleViewResults(sim)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          sim.status === 'completed' ? "bg-emerald-500/10" : "bg-muted"
                        )}>
                          {sim.status === 'completed' ? (
                            <Award className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Zap className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{sim.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sim.created_at), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sim.status === 'completed' && (
                          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                            {(sim.results as any)?.length || 0} tarifas
                          </Badge>
                        )}
                        {sim.status === 'completed' && sim.savings > 0 && (
                          <Badge className="text-xs bg-emerald-500 text-white">
                            −{sim.savings.toFixed(2)} €
                          </Badge>
                        )}
                        {sim.status !== 'completed' && (
                          <Badge variant="outline" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Pendiente
                          </Badge>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={e => { e.stopPropagation(); deleteSimulation(sim.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CONFIGURE === */}
        <TabsContent value="configure">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Consumption */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" /> Consumos (kWh)
                </CardTitle>
                <CardDescription>Datos del periodo de facturación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">P1 (Punta)</Label>
                    <Input type="number" step="0.1" value={consumption.consumption_p1_kwh}
                      onChange={e => setConsumption(p => ({ ...p, consumption_p1_kwh: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">P2 (Llano)</Label>
                    <Input type="number" step="0.1" value={consumption.consumption_p2_kwh}
                      onChange={e => setConsumption(p => ({ ...p, consumption_p2_kwh: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">P3 (Valle)</Label>
                    <Input type="number" step="0.1" value={consumption.consumption_p3_kwh}
                      onChange={e => setConsumption(p => ({ ...p, consumption_p3_kwh: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Total: {(consumption.consumption_p1_kwh + consumption.consumption_p2_kwh + consumption.consumption_p3_kwh).toFixed(1)} kWh
                </div>
              </CardContent>
            </Card>

            {/* Power + config */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" /> Potencias contratadas (kW)
                </CardTitle>
                <CardDescription>Potencias actuales del suministro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">P1 (Punta)</Label>
                    <Input type="number" step="0.1" value={power.power_p1_kw}
                      onChange={e => setPower(p => ({ ...p, power_p1_kw: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">P2 (Valle)</Label>
                    <Input type="number" step="0.1" value={power.power_p2_kw}
                      onChange={e => setPower(p => ({ ...p, power_p2_kw: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Días factura</Label>
                    <Input type="number" value={billingDays}
                      onChange={e => setBillingDays(parseInt(e.target.value) || 30)} />
                  </div>
                  <div>
                    <Label className="text-xs">Peaje</Label>
                    <Select value={accessTariff} onValueChange={setAccessTariff}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACCESS_TARIFFS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Coste actual (€)</Label>
                    <Input type="number" step="0.01" value={currentCost}
                      onChange={e => setCurrentCost(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleRun} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Comparar Tarifas
            </Button>
          </div>
        </TabsContent>

        {/* === RESULTS === */}
        <TabsContent value="results">
          {activeSim && activeSim.results.length > 0 ? (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Mejor tarifa</p>
                    <p className="text-lg font-bold text-foreground">{activeSim.results[0]?.supplier}</p>
                    <p className="text-xs text-muted-foreground">{activeSim.results[0]?.tariff_name}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Mejor coste</p>
                    <p className="text-2xl font-bold text-emerald-600">{activeSim.best_cost.toFixed(2)} €</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Ahorro vs actual</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      activeSim.savings > 0 ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      {activeSim.savings > 0 ? `−${activeSim.savings.toFixed(2)} €` : '—'}
                    </p>
                    {activeSim.current_cost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        vs {activeSim.current_cost.toFixed(2)} € actual
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Ranked results */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ranking de Tarifas</CardTitle>
                  <CardDescription>
                    {activeSim.results.length} tarifas comparadas · ordenadas por coste total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {activeSim.results.map((result, idx) => (
                        <ResultCard key={result.tariff_id} result={result} rank={idx + 1} isBest={idx === 0} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Sin resultados. Ejecuta una simulación primero.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultCard({ result, rank, isBest }: { result: SimulationResult; rank: number; isBest: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-colors",
      isBest ? "border-emerald-500/40 bg-emerald-500/5" : "hover:bg-muted/30"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          isBest ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
        )}>
          {rank}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{result.supplier}</p>
          <p className="text-xs text-muted-foreground truncate">{result.tariff_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {result.has_permanence && (
          <Badge variant="outline" className="text-[10px] border-orange-400/50 text-orange-500">
            Permanencia
          </Badge>
        )}
        <div className="text-right">
          <p className="text-sm font-bold">{result.total_cost.toFixed(2)} €</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>E: {result.energy_cost.toFixed(2)}€</span>
            <span>·</span>
            <span>P: {result.power_cost.toFixed(2)}€</span>
          </div>
        </div>
        {result.savings_vs_current > 0 && (
          <Badge className="text-xs bg-emerald-500 text-white shrink-0">
            <TrendingDown className="h-3 w-3 mr-0.5" />
            −{result.savings_vs_current.toFixed(2)}€
          </Badge>
        )}
      </div>
    </div>
  );
}

export default ElectricalComparadorPanel;
