/**
 * HRLaborDigitalTwinPanel — V2-RRHH-FASE-8B
 * MVP panel for workforce what-if simulations connected to real HR data.
 * 8B: Added data quality indicators (real / estimated / unavailable).
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Layers, RefreshCw, Play, Sparkles, TrendingUp, TrendingDown,
  AlertTriangle, Clock, UserPlus, Heart, Gift, Info, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, FileText, Database, HelpCircle,
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp';
import { useWorkforceSimulation, SCENARIO_CATALOG } from '@/hooks/erp/hr/useWorkforceSimulation';
import type { SimulationResult, SimulationScenarioType, DataQualityLevel } from '@/hooks/erp/hr/useWorkforceSimulation';
import { cn } from '@/lib/utils';

// Icon mapping for scenario types
const SCENARIO_ICONS: Record<string, React.ElementType> = {
  TrendingUp, UserPlus, Clock, AlertTriangle, Gift, Heart,
};

function getScenarioIcon(iconName: string) {
  return SCENARIO_ICONS[iconName] || Layers;
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n.toLocaleString()}`;
}

function DeltaBadge({ value, unit = '€' }: { value: number; unit?: string }) {
  if (value === 0) return <Badge variant="outline" className="text-xs gap-1"><Minus className="h-3 w-3" /> Sin cambio</Badge>;
  const positive = value > 0;
  return (
    <Badge variant={positive ? 'destructive' : 'default'} className="text-xs gap-1">
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {unit === '€' ? formatCurrency(Math.abs(value)) : `${Math.abs(value).toFixed(1)}%`}
    </Badge>
  );
}

/** 8B: data quality indicator */
function QualityDot({ level }: { level?: DataQualityLevel }) {
  if (!level || level === 'real') {
    return <span title="Dato real del sistema" className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />;
  }
  if (level === 'estimated') {
    return <span title="Estimación" className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />;
  }
  return <span title="No disponible" className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />;
}

export function HRLaborDigitalTwinPanel() {
  const { currentCompany } = useERPContext();
  const companyId = currentCompany?.id || '';

  const {
    baseline, results, isLoadingBaseline, isSimulating,
    aiNarrative, isLoadingNarrative,
    fetchBaseline, simulate, requestNarrative, clearResults,
    scenarioCatalog,
  } = useWorkforceSimulation(companyId);

  const [selectedScenario, setSelectedScenario] = useState<SimulationScenarioType | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [activeResult, setActiveResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (companyId) fetchBaseline();
  }, [companyId, fetchBaseline]);

  useEffect(() => {
    if (!selectedScenario) return;
    const catalog = scenarioCatalog.find(s => s.type === selectedScenario);
    if (catalog) {
      const defaults: Record<string, number> = {};
      catalog.parameters.forEach(p => { defaults[p.key] = p.defaultValue; });
      setParams(defaults);
    }
  }, [selectedScenario, scenarioCatalog]);

  const handleSimulate = useCallback(async () => {
    if (!selectedScenario) return;
    const catalog = scenarioCatalog.find(s => s.type === selectedScenario);
    if (!catalog) return;

    const result = await simulate({
      scenarioType: selectedScenario,
      label: catalog.label,
      parameters: params,
    });
    if (result) setActiveResult(result);
  }, [selectedScenario, params, simulate, scenarioCatalog]);

  if (!companyId) {
    return (
      <Card className="border-dashed"><CardContent className="py-12 text-center">
        <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground">Selecciona una empresa para usar el Gemelo Digital</p>
      </CardContent></Card>
    );
  }

  const selectedCatalog = scenarioCatalog.find(s => s.type === selectedScenario);
  const dq = baseline?.dataQuality || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gemelo Digital Laboral</h2>
            <p className="text-sm text-muted-foreground">Simulación de escenarios sobre datos reales · {currentCompany?.name}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchBaseline()} disabled={isLoadingBaseline}>
          <RefreshCw className={cn("h-4 w-4 mr-1", isLoadingBaseline && "animate-spin")} />
          Actualizar datos
        </Button>
      </div>

      {/* Baseline KPIs with quality indicators */}
      {baseline && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Empleados', value: baseline.activeEmployees.toString(), sub: `de ${baseline.headcount} total`, quality: 'real' as DataQualityLevel },
              { label: 'Salario medio', value: formatCurrency(baseline.avgSalary), sub: `Mediana: ${formatCurrency(baseline.medianSalary)}`, quality: dq.avgSalary },
              { label: 'Coste empresa/mes', value: formatCurrency(baseline.totalEmployerMonthlyCost), sub: `Bruto: ${formatCurrency(baseline.totalGrossMonthlyCost)}`, quality: dq.totalEmployerMonthlyCost },
              { label: 'Absentismo', value: `${baseline.absenteeismRate}%`, sub: `${baseline.totalDaysLostMonth} días/mes (90d)`, quality: dq.absenteeismRate },
              { label: 'Rotación anual', value: `${baseline.turnoverRate}%`, sub: 'ventana 12 meses', quality: dq.turnoverRate },
            ].map((kpi, i) => (
              <Card key={i} className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <QualityDot level={kpi.quality} />
                  </div>
                  <p className="text-lg font-bold">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 8B: Data quality legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
            <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Dato real</span>
            <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" /> Estimación</span>
            <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> No disponible</span>
            {dq.avgWorkingHoursWeek === 'estimated' && (
              <span className="ml-auto opacity-70">Jornada: {baseline.avgWorkingHoursWeek}h/sem (defecto convenio)</span>
            )}
            {dq.avgWorkingHoursWeek === 'real' && (
              <span className="ml-auto opacity-70">Jornada: {baseline.avgWorkingHoursWeek}h/sem (contratos)</span>
            )}
          </div>
        </>
      )}

      {!baseline && isLoadingBaseline && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
          Cargando datos base del sistema...
        </CardContent></Card>
      )}

      {/* Scenario selector + Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Scenario list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Escenarios de Simulación</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {scenarioCatalog.map(sc => {
                const Icon = getScenarioIcon(sc.icon);
                const isActive = selectedScenario === sc.type;
                return (
                  <button
                    key={sc.type}
                    onClick={() => setSelectedScenario(sc.type)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", isActive && "text-primary")}>{sc.label}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{sc.description}</p>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/30")} />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right: Config + Results */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCatalog && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    {selectedCatalog.label}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={handleSimulate}
                    disabled={isSimulating || !baseline}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  >
                    {isSimulating ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                    Simular
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{selectedCatalog.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCatalog.parameters.map(param => (
                  <div key={param.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">{param.label}</label>
                      <span className="text-sm font-bold text-primary">
                        {params[param.key] ?? param.defaultValue} {param.unit}
                      </span>
                    </div>
                    <Slider
                      value={[params[param.key] ?? param.defaultValue]}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      onValueChange={([v]) => setParams(prev => ({ ...prev, [param.key]: v }))}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{param.min} {param.unit}</span>
                      <span>{param.max} {param.unit}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!selectedCatalog && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Selecciona un escenario para comenzar la simulación</p>
              </CardContent>
            </Card>
          )}

          {/* Active result */}
          {activeResult && (
            <Card className="border-cyan-500/30">
              <CardHeader className="pb-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Resultado: {activeResult.input.label}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestNarrative(activeResult)}
                    disabled={isLoadingNarrative}
                  >
                    <Sparkles className={cn("h-4 w-4 mr-1", isLoadingNarrative && "animate-pulse")} />
                    {isLoadingNarrative ? 'Analizando...' : 'Análisis IA'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-3">
                {/* Impact summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Δ Coste Empresa/Mes</p>
                    <DeltaBadge value={activeResult.impact.deltaEmployerMonthlyCost} />
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Δ Coste Anual</p>
                    <DeltaBadge value={activeResult.impact.deltaAnnualCost} />
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Variación %</p>
                    <DeltaBadge value={activeResult.impact.percentChangeEmployer} unit="%" />
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Nuevo Sal. Medio</p>
                    <span className="text-sm font-bold">{formatCurrency(activeResult.impact.newAvgSalary)}</span>
                  </div>
                </div>

                {/* Before / After */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium text-muted-foreground mb-2">ANTES</p>
                    <p className="text-sm">Coste empresa/mes: <strong>{formatCurrency(activeResult.baseline.totalEmployerMonthlyCost)}</strong></p>
                    <p className="text-sm">Coste anual: <strong>{formatCurrency(activeResult.baseline.totalEmployerMonthlyCost * 12)}</strong></p>
                    <p className="text-sm">Plantilla: <strong>{activeResult.baseline.activeEmployees}</strong></p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card border-cyan-500/30">
                    <p className="text-xs font-medium text-cyan-600 mb-2">DESPUÉS</p>
                    <p className="text-sm">Coste empresa/mes: <strong>{formatCurrency(activeResult.impact.newTotalMonthlyCost)}</strong></p>
                    <p className="text-sm">Coste anual: <strong>{formatCurrency(activeResult.impact.newAnnualCost)}</strong></p>
                    <p className="text-sm">Plantilla: <strong>{activeResult.baseline.activeEmployees + activeResult.impact.deltaHeadcount}</strong></p>
                  </div>
                </div>

                {/* Risks */}
                {activeResult.impact.operationalRisks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Riesgos Operativos
                    </p>
                    <div className="space-y-1">
                      {activeResult.impact.operationalRisks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs p-2 rounded border">
                          <Badge variant={r.severity === 'high' ? 'destructive' : r.severity === 'medium' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                            {r.severity}
                          </Badge>
                          <div>
                            <span className="font-medium">{r.label}:</span> {r.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assumptions */}
                <div>
                  <p className="text-xs font-medium mb-1 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Supuestos Aplicados
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {activeResult.impact.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-muted-foreground/50">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" /> Limitaciones
                  </p>
                  <ul className="text-[11px] text-amber-700/80 dark:text-amber-400/80 space-y-0.5">
                    {activeResult.impact.limitations.map((l, i) => (
                      <li key={i}>• {l}</li>
                    ))}
                  </ul>
                </div>

                {/* AI Narrative */}
                {(aiNarrative || isLoadingNarrative) && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Análisis IA
                    </p>
                    {isLoadingNarrative && !aiNarrative && (
                      <p className="text-xs text-muted-foreground animate-pulse">Generando análisis...</p>
                    )}
                    {aiNarrative && (
                      <div className="text-xs prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                        {aiNarrative}
                        {isLoadingNarrative && <span className="inline-block w-1.5 h-3.5 bg-primary/50 animate-pulse ml-0.5" />}
                      </div>
                    )}
                  </div>
                )}

                {/* Data sources */}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Database className="h-3 w-3" />
                  <span>Fuentes:</span>
                  {activeResult.impact.dataSourcesUsed.map(ds => (
                    <Badge key={ds} variant="outline" className="text-[9px]">{ds}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {results.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Historial de Simulaciones ({results.length})</CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearResults}>Limpiar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setActiveResult(r)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors",
                          activeResult?.id === r.id ? "bg-primary/10" : "hover:bg-muted/50",
                        )}
                      >
                        <div>
                          <span className="font-medium">{r.input.label}</span>
                          <span className="text-muted-foreground ml-2">
                            {Object.entries(r.input.parameters).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </span>
                        </div>
                        <DeltaBadge value={r.impact.deltaAnnualCost} />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          <strong>Modo preparatorio.</strong> Las simulaciones son estimaciones basadas en datos actuales del sistema.
          No constituyen asesoramiento legal, fiscal ni laboral vinculante. Los costes de Seguridad Social
          son aproximaciones estándar para España y pueden variar según convenio colectivo y legislación vigente.
          Las simulaciones se registran para trazabilidad interna.
        </span>
      </div>
    </div>
  );
}
