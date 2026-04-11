/**
 * StockOptionsPanel — P1.7B-RB
 * Dashboard for equity compensation: plans, grants, vesting timeline, exercise simulator.
 * Honest classification: supported_production | supported_with_review | out_of_scope.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, Calendar, DollarSign, AlertTriangle,
  CheckCircle, Shield, Info, Play, Calculator,
  FileText, Clock, Award
} from 'lucide-react';
import { useStockOptions } from '@/hooks/erp/hr/useStockOptions';
import {
  PLAN_TYPE_LABELS,
  GRANT_STATUS_LABELS,
  SUPPORT_LEVEL_LABELS,
  type EquityPlan,
  type EquityGrant,
  type ExerciseSimulation,
  type SupportLevel,
} from '@/engines/erp/hr/stockOptionsEngine';
import { cn } from '@/lib/utils';

interface StockOptionsPanelProps {
  companyId?: string;
}

const supportBadgeVariant: Record<SupportLevel, 'default' | 'secondary' | 'destructive'> = {
  supported_production: 'default',
  supported_with_review: 'secondary',
  out_of_scope: 'destructive',
};

const supportBadgeColor: Record<SupportLevel, string> = {
  supported_production: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  supported_with_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  out_of_scope: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function formatCurrency(val: number): string {
  return val.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function StockOptionsPanel({ companyId }: StockOptionsPanelProps) {
  const {
    plans, grants, loading, loadEquityData,
    classify, simulate, getVestingSchedule, getVested, getPreflightStatus, addDemoGrant,
  } = useStockOptions(companyId || '');

  const [activeTab, setActiveTab] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState<EquityPlan | null>(null);
  const [selectedGrant, setSelectedGrant] = useState<EquityGrant | null>(null);
  const [marketPrice, setMarketPrice] = useState<number>(15);
  const [simulation, setSimulation] = useState<ExerciseSimulation | null>(null);

  useEffect(() => {
    if (companyId) loadEquityData();
  }, [companyId, loadEquityData]);

  // Pre-compute preflight
  const preflight = useMemo(() => getPreflightStatus(), [getPreflightStatus]);

  const handleSimulate = useCallback(() => {
    if (!selectedGrant || !selectedPlan) return;
    const result = simulate(selectedPlan.id, selectedGrant, marketPrice);
    setSimulation(result);
  }, [selectedGrant, selectedPlan, marketPrice, simulate]);

  const handleAddDemoGrant = useCallback((planId: string) => {
    addDemoGrant('demo-employee-1', planId);
  }, [addDemoGrant]);

  if (!companyId) {
    return (
      <Card className="border-dashed opacity-60">
        <CardContent className="py-8 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Seleccione una empresa para ver equity compensation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Stock Options & Equity Compensation
                  <Badge variant="outline" className="text-xs">P1.7B-RB</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gestión de planes de equity, vesting y simulación fiscal española
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-xs', supportBadgeColor[preflight.worstSupportLevel])}>
                {SUPPORT_LEVEL_LABELS[preflight.worstSupportLevel]}
              </Badge>
              {preflight.reviewRequired && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Revisión requerida
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-4 gap-3">
            <MiniKPI label="Planes activos" value={plans.length} icon={FileText} />
            <MiniKPI label="Grants activos" value={grants.filter(g => !['cancelled', 'expired', 'exercised'].includes(g.status)).length} icon={Award} />
            <MiniKPI label="Ejercicio pendiente" value={preflight.pendingExerciseCount} icon={Clock} />
            <MiniKPI label="Revisión requerida" value={preflight.reviewRequired ? 'Sí' : 'No'} icon={Shield} />
          </div>
        </CardContent>
      </Card>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans" className="text-xs">Planes</TabsTrigger>
          <TabsTrigger value="grants" className="text-xs">Grants</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs">Simulador</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Reglas Fiscales</TabsTrigger>
        </TabsList>

        {/* Plans tab */}
        <TabsContent value="plans">
          <div className="grid gap-3">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                grantsCount={grants.filter(g => g.planId === plan.id).length}
                onSelect={() => { setSelectedPlan(plan); setActiveTab('grants'); }}
                onAddDemo={() => handleAddDemoGrant(plan.id)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Grants tab */}
        <TabsContent value="grants">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {grants.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    No hay grants registrados. Use "Añadir demo" en un plan para crear un ejemplo.
                  </CardContent>
                </Card>
              )}
              {grants.map(grant => {
                const plan = plans.find(p => p.id === grant.planId);
                if (!plan) return null;
                const classification = classify(grant.planId, grant);
                const vested = getVested(grant.planId, grant);
                const vestPct = grant.totalShares > 0 ? Math.round((vested / grant.totalShares) * 100) : 0;

                return (
                  <Card key={grant.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => { setSelectedGrant(grant); setSelectedPlan(plan); setActiveTab('simulator'); }}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{plan.planName}</span>
                          <Badge variant="outline" className="text-xs">{PLAN_TYPE_LABELS[plan.planType]}</Badge>
                          <Badge variant="outline" className="text-xs">{GRANT_STATUS_LABELS[grant.status]}</Badge>
                        </div>
                        {classification && (
                          <Badge className={cn('text-xs', supportBadgeColor[classification.supportLevel])}>
                            {classification.supportLabel}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                        <span>Total: {grant.totalShares.toLocaleString()} acciones</span>
                        <span>Strike: {grant.strikePrice}€</span>
                        <span>Vested: {vested.toLocaleString()}</span>
                        <span>Ejercitadas: {grant.exercisedShares.toLocaleString()}</span>
                      </div>
                      <Progress value={vestPct} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">{vestPct}% consolidado</p>
                      {classification && classification.reviewPoints.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {classification.reviewPoints.slice(0, 2).map((rp, i) => (
                            <div key={i} className="flex items-start gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{rp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Simulator tab */}
        <TabsContent value="simulator">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Simulador de Ejercicio
                <Badge variant="outline" className="text-xs">Estimado</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Cálculo fiscal estimado. Los tipos reales pueden variar según la situación personal del empleado.
                Consulte con un asesor fiscal antes de tomar decisiones.
              </p>
            </CardHeader>
            <CardContent>
              {!selectedGrant || !selectedPlan ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Seleccione un grant en la pestaña "Grants" para simular el ejercicio
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50">
                    <div>
                      <Label className="text-xs">Plan</Label>
                      <p className="text-sm font-medium">{selectedPlan.planName}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Acciones disponibles</Label>
                      <p className="text-sm font-medium">
                        {(getVested(selectedPlan.id, selectedGrant) - selectedGrant.exercisedShares).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Precio de ejercicio</Label>
                      <p className="text-sm font-medium">{selectedGrant.strikePrice}€</p>
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">Precio de mercado (€)</Label>
                      <Input
                        type="number"
                        value={marketPrice}
                        onChange={e => setMarketPrice(Number(e.target.value))}
                        step={0.5}
                        min={0}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleSimulate} className="gap-1">
                      <Play className="h-4 w-4" /> Simular
                    </Button>
                  </div>

                  {simulation && <SimulationResults simulation={simulation} />}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax rules tab */}
        <TabsContent value="rules">
          <TaxRulesReference />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function MiniKPI({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function PlanCard({
  plan, grantsCount, onSelect, onAddDemo,
}: {
  plan: EquityPlan; grantsCount: number; onSelect: () => void; onAddDemo: () => void;
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <span className="font-medium">{plan.planName}</span>
            <Badge variant="outline" className="text-xs">{PLAN_TYPE_LABELS[plan.planType]}</Badge>
            {plan.isStartup && <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Startup</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onAddDemo} className="text-xs h-7">
              + Añadir demo
            </Button>
            <Button variant="outline" size="sm" onClick={onSelect} className="text-xs h-7">
              Ver grants ({grantsCount})
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
          <span>Pool: {plan.totalPool.toLocaleString()} uds</span>
          <span>Cliff: {plan.cliffMonths} meses</span>
          <span>Vesting: {plan.vestingMonths} meses</span>
          <span>Aprobado: {plan.approvalDate}</span>
        </div>
        {plan.notes && <p className="text-xs text-muted-foreground mt-1 italic">{plan.notes}</p>}
      </CardContent>
    </Card>
  );
}

function SimulationResults({ simulation }: { simulation: ExerciseSimulation }) {
  return (
    <div className="space-y-3 mt-4">
      <Separator />

      {/* Support level banner */}
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-lg',
        simulation.supportLevel === 'supported_production' && 'bg-green-50 dark:bg-green-900/10',
        simulation.supportLevel === 'supported_with_review' && 'bg-amber-50 dark:bg-amber-900/10',
        simulation.supportLevel === 'out_of_scope' && 'bg-red-50 dark:bg-red-900/10',
      )}>
        {simulation.supportLevel === 'supported_production' && <CheckCircle className="h-4 w-4 text-green-600" />}
        {simulation.supportLevel === 'supported_with_review' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        {simulation.supportLevel === 'out_of_scope' && <Shield className="h-4 w-4 text-red-600" />}
        <span className="text-sm font-medium">
          {SUPPORT_LEVEL_LABELS[simulation.supportLevel]}
        </span>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 gap-3">
        <ResultRow label="Acciones a ejercitar" value={simulation.sharesToExercise.toLocaleString()} />
        <ResultRow label="Precio ejercicio" value={`${simulation.strikePrice}€`} />
        <ResultRow label="Precio mercado" value={`${simulation.marketPrice}€`} />
        <ResultRow label="Beneficio bruto" value={formatCurrency(simulation.grossBenefit)} highlight />
        <ResultRow label="Exención general (Art. 42.3.f)" value={formatCurrency(simulation.generalExemption)} />
        <ResultRow label="Exención startup (Ley 28/2022)" value={formatCurrency(simulation.startupExemption)} />
        <ResultRow label="Reducción irregular (Art. 18.2)" value={formatCurrency(simulation.irregularReduction)} />
        <ResultRow label="Base imponible neta (est.)" value={formatCurrency(simulation.netTaxableAfterExemptions)} />
        <ResultRow label="IRPF estimado" value={formatCurrency(simulation.estimatedIRPF)} negative />
        <ResultRow label="Cotización SS estimada" value={formatCurrency(simulation.ssCost)} negative />
        <ResultRow label="Beneficio neto estimado" value={formatCurrency(simulation.netBenefit)} highlight />
      </div>

      {/* Review points */}
      {simulation.reviewPoints.length > 0 && (
        <div className="space-y-1 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Puntos de revisión obligatoria
          </p>
          {simulation.reviewPoints.map((rp, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-300 ml-4">• {rp}</p>
          ))}
        </div>
      )}

      {/* Notes */}
      {simulation.notes.length > 0 && (
        <div className="space-y-1 p-3 rounded-lg bg-muted/50">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Notas
          </p>
          {simulation.notes.map((n, i) => (
            <p key={i} className="text-xs text-muted-foreground ml-4">• {n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value, highlight, negative }: {
  label: string; value: string; highlight?: boolean; negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn(
        'text-sm font-medium',
        highlight && 'text-primary font-bold',
        negative && 'text-destructive',
      )}>
        {value}
      </span>
    </div>
  );
}

function TaxRulesReference() {
  const rules = [
    {
      title: 'Exención general — Art. 42.3.f LIRPF',
      level: 'supported_production' as SupportLevel,
      description: 'Exención hasta 12.000€/año si: (1) oferta generalizada a trabajadores, (2) mantenimiento 3 años, (3) participación ≤ 5%.',
      legalRef: 'LIRPF Art. 42.3.f',
    },
    {
      title: 'Exención startup — Ley 28/2022',
      level: 'supported_with_review' as SupportLevel,
      description: 'Exención hasta 50.000€ para empresas emergentes (< 5-7 años, facturación < 10M€). Diferimiento posible hasta liquidez.',
      legalRef: 'Ley 28/2022, Art. 3',
    },
    {
      title: 'Renta irregular — Art. 18.2 LIRPF',
      level: 'supported_production' as SupportLevel,
      description: 'Reducción 30% si generación > 2 años y no se ha aplicado en los 5 ejercicios anteriores. Máximo 300.000€.',
      legalRef: 'LIRPF Art. 18.2',
    },
    {
      title: 'RSU (Restricted Stock Units)',
      level: 'supported_with_review' as SupportLevel,
      description: 'Tributación como rendimiento del trabajo en la entrega. Momento exacto de tributación requiere revisión.',
      legalRef: 'LIRPF Art. 17.1',
    },
    {
      title: 'Phantom Shares',
      level: 'out_of_scope' as SupportLevel,
      description: 'Rendimiento dinerario sin entrega de acciones. Valoración contable especializada requerida. Sin exención general.',
      legalRef: 'LIRPF Art. 17.1 + contabilidad',
    },
    {
      title: 'Cotización a la Seguridad Social',
      level: 'supported_production' as SupportLevel,
      description: 'El beneficio por ejercicio de stock options cotiza a la SS en la nómina del mes de ejercicio.',
      legalRef: 'LGSS Art. 147',
    },
  ];

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3">
        {rules.map((rule, i) => (
          <Card key={i}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium">{rule.title}</h4>
                <Badge className={cn('text-xs', supportBadgeColor[rule.level])}>
                  {SUPPORT_LEVEL_LABELS[rule.level]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{rule.description}</p>
              <p className="text-xs text-primary mt-1">Ref: {rule.legalRef}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export default StockOptionsPanel;
